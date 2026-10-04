/* ====== UN SUPABASE DE POCHE, ADOSSÉ À UN VRAI POSTGRESQL ======
   Les groupes ne s'éprouvent pas avec un faux serveur écrit en JavaScript :
   tout ce qui compte vit dans le SQL — qui voit quel message, qui peut faire
   taire qui, ce qu'un bloqué cesse de voir. Un faux qui imiterait ces règles
   ne prouverait que l'imitation.
   Ce module monte donc un VRAI PostgreSQL 16 (comme groupes/essai.sh), y
   installe comptes/table.sql et groupes/table.sql tels qu'ils partiront chez
   Supabase, et parle au jeu la langue du client Supabase pour ce dont les
   groupes se servent :
     - rpc(fonction, arguments)       -> la VRAIE fonction, au nom du joueur ;
     - from(table).select()...        -> un vrai select, sous les VRAIES règles
                                         d'accès (RLS) du joueur ;
     - le direct (postgres_changes)   -> chaque changement de « messages » est
                                         relu AU NOM DE CHAQUE ABONNÉ, exactement
                                         comme Supabase le fait : un bloqué ou
                                         un non-membre ne reçoit rien.
   Le reste — présence et diffusion des salons en ligne — passe par hub.js.

   Ce n'est PAS un banc : tous.sh le tient à l'écart (PAS_DES_BANCS).
   PostgreSQL refuse de tourner en root : on le lance au nom de « postgres ». */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execFile, execFileSync } = require('child_process');
const RACINE = path.resolve(__dirname, '..');
const BIN = '/usr/lib/postgresql/16/bin';
const hub = require('./hub.js');

function sh(cmd, args, opts){
  return new Promise((res, rej) => execFile(cmd, args, Object.assign({ maxBuffer: 32 << 20 }, opts || {}),
    (e, out, err) => e ? rej(Object.assign(e, { stderr: err, stdout: out })) : res({ out, err })));
}

async function demarrerPG(port){
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'pggroupes-'));
  fs.chmodSync(D, 0o777);
  const pg = (args) => sh('runuser', ['-u', 'postgres', '--'].concat(args));
  await pg([BIN + '/initdb', '-D', D + '/data', '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C.UTF-8']);
  await pg([BIN + '/pg_ctl', '-D', D + '/data', '-o', '-k ' + D + ' -p ' + port + ' -c listen_addresses=', '-l', D + '/log', '-w', 'start']);
  const psql = (sql, base) => sh(BIN + '/psql', ['-h', D, '-p', String(port), '-U', 'postgres', '-d', base || 'essai',
    '-v', 'ON_ERROR_STOP=1', '-qtAX', '-c', sql]);
  await sh(BIN + '/createdb', ['-h', D, '-p', String(port), '-U', 'postgres', 'essai']);
  /* Le décor que Supabase fournit (voir groupes/essai.sh). */
  await psql(`
    create schema if not exists auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('essai.moi', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    create publication supabase_realtime;
    create table public.push_subs (endpoint text primary key);
    alter table public.push_subs enable row level security;`);
  for (const f of ['comptes/table.sql', 'groupes/table.sql']) {
    await sh(BIN + '/psql', ['-h', D, '-p', String(port), '-U', 'postgres', '-d', 'essai', '-v', 'ON_ERROR_STOP=1', '-qX',
      '-f', path.join(RACINE, f)]);
  }
  /* LE JOURNAL DU DIRECT. Supabase lit le journal de réplication ; on pose à
     la place un déclencheur qui note chaque insertion et mise à jour de
     « messages ». Le serveur le relit et le distribue. */
  await psql(`
    create table public.essai_journal (n bigserial primary key, op text not null, id bigint not null);
    create function public.essai_noter() returns trigger language plpgsql as $$
    begin insert into public.essai_journal (op, id) values (TG_OP, new.id); return new; end $$;
    create trigger essai_noter after insert or update on public.messages
      for each row execute function public.essai_noter();
    revoke all on public.essai_journal from anon, authenticated;`);
  /* La signature de chaque fonction : noms, types, ensemble ou valeur. */
  const sig = await psql(`select coalesce(jsonb_agg(jsonb_build_object(
      'nom', p.proname, 'noms', coalesce(p.proargnames, '{}'),
      'types', (select coalesce(jsonb_agg(format_type(t, null) order by o), '[]') from unnest(p.proargtypes) with ordinality u(t, o)),
      'ensemble', p.proretset, 'rend', format_type(p.prorettype, null))), '[]')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`);
  const fonctions = {};
  for (const f of JSON.parse(sig.out.trim())) fonctions[f.nom] = f;
  /* UN POSTGRESQL NE DOIT PAS SURVIVRE AU BANC. Un banc tué en route (le
     « timeout » de tous.sh, un Ctrl-C) laissait sa base tourner, son port
     pris : le banc suivant ne démarrait plus. On l'arrête à la sortie du
     processus, quelle qu'elle soit — en synchrone, puisqu'à cet instant plus
     aucune promesse ne s'exécutera. */
  const arretSync = () => {
    try { execFileSync('runuser', ['-u', 'postgres', '--', BIN + '/pg_ctl', '-D', D + '/data', '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch (e) {}
    try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  };
  process.once('exit', arretSync);
  for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => { arretSync(); process.exit(1); });
  return {
    D, port, psql, fonctions,
    arreter: async () => {
      try { await pg([BIN + '/pg_ctl', '-D', D + '/data', '-m', 'immediate', 'stop']); } catch (e) {}
      try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
    }
  };
}

/* Un littéral SQL sûr : entre dollars, avec une étiquette absente du texte. */
function lit(v){
  const s = String(v);
  let t = 'q';
  while (s.includes('$' + t + '$')) t += 'x';
  return '$' + t + '$' + s + '$' + t + '$';
}
const COL = /^[a-z_][a-z0-9_]*$/;
function enTantQue(moi, sql){
  if (!moi) return 'begin; set local role anon; ' + sql + '; commit;';
  if (!/^[0-9a-f-]{36}$/.test(moi)) throw new Error('identité invalide');
  return "begin; set local role authenticated; set local essai.moi = '" + moi + "'; " + sql + '; commit;';
}
/* Une erreur PostgreSQL, rendue comme PostgREST la rendrait. */
function erreurPG(e){
  const m = String((e && (e.stderr || e.message)) || '');
  const code = /permission denied/i.test(m) ? '42501' : (/does not exist/i.test(m) ? '42P01' : 'P0001');
  return { code, message: m.replace(/^psql:[^:]*:\d+: /gm, '').trim().split('\n')[0] };
}

function creerServeur(base){
  const abonnes = new Set();   // { moi, table, filtre, events, rs, depuis }
  let dernier = 0, relecture = null, enCours = false;

  async function rpc(moi, nom, args){
    const f = base.fonctions[nom];
    if (!f || nom.charAt(0) === '_') return { error: { code: 'PGRST202', message: 'fonction inconnue : ' + nom } };
    args = args || {};
    const parts = [];
    f.noms.forEach((n, i) => {
      if (!(n in args)) return;
      const t = f.types[i];
      const v = args[n];
      if (v === null || v === undefined) parts.push(n + ' => null::' + t);
      else if (t === 'jsonb') parts.push(n + ' => ' + lit(JSON.stringify(v)) + '::jsonb');
      else parts.push(n + ' => ' + lit(typeof v === 'object' ? JSON.stringify(v) : v) + '::' + t);
    });
    const appel = 'public.' + nom + '(' + parts.join(', ') + ')';
    let sql;
    if (f.ensemble) sql = 'select coalesce(jsonb_agg(x), \'[]\'::jsonb) from ' + appel + ' x';
    else if (f.rend === 'void') sql = 'select ' + appel + ', \'null\'';
    else sql = 'select to_jsonb(' + appel + ')';
    try {
      const r = await base.psql(enTantQue(moi, sql));
      const ligne = r.out.trim().split('\n').pop();
      if (f.rend === 'void') return { data: null, error: null };
      return { data: ligne === '' ? null : JSON.parse(ligne), error: null };
    } catch (e) { return { data: null, error: erreurPG(e) }; }
  }

  async function select(moi, q){
    if (!COL.test(q.table)) return { error: { code: '42P01', message: 'table invalide' } };
    const cols = String(q.cols || '*').split(',').map(c => c.trim()).filter(Boolean);
    if (!cols.every(c => c === '*' || COL.test(c))) return { error: { code: '42703', message: 'colonne invalide' } };
    const where = [];
    for (const [c, op, v] of (q.filtres || [])) {
      if (!COL.test(c)) return { error: { code: '42703', message: 'colonne invalide' } };
      const ops = { eq: '=', neq: '<>', lt: '<', lte: '<=', gt: '>', gte: '>=' };
      if (ops[op]) where.push(c + ' ' + ops[op] + ' ' + lit(v));
      else if (op === 'in') where.push(c + ' in (' + (v.length ? v.map(lit).join(',') : 'null') + ')');
      else if (op === 'is') where.push(c + ' is ' + (v === null ? 'null' : (v ? 'true' : 'false')));
      else return { error: { code: 'PGRST100', message: 'opérateur ' + op } };
    }
    let sql = 'select ' + cols.join(', ') + ' from public.' + q.table + (where.length ? ' where ' + where.join(' and ') : '');
    if (q.ordre && COL.test(q.ordre[0])) sql += ' order by ' + q.ordre[0] + (q.ordre[1] ? ' asc' : ' desc');
    if (q.limite) sql += ' limit ' + (q.limite | 0);
    try {
      const r = await base.psql(enTantQue(moi, 'select coalesce(jsonb_agg(t), \'[]\'::jsonb) from (' + sql + ') t'));
      const l = JSON.parse(r.out.trim().split('\n').pop());
      if (q.un) {
        if (l.length > 1) return { data: null, error: { code: 'PGRST116', message: 'plusieurs lignes' } };
        if (!l.length && q.un === 'exact') return { data: null, error: { code: 'PGRST116', message: 'aucune ligne' } };
        return { data: l[0] || null, error: null };
      }
      return { data: l, error: null };
    } catch (e) { return { data: null, error: erreurPG(e) }; }
  }

  /* LE DIRECT : on relit le journal, et chaque changement est relu AU NOM DE
     CHAQUE ABONNÉ — c'est ce que fait Supabase avec les règles d'accès. */
  /* DEUX DISTRIBUTIONS NE SE CROISENT JAMAIS. La relecture tombe toutes les
     120 ms et dure parfois plus : deux passes lisaient alors le même morceau
     du journal, et chaque message arrivait deux fois — un non-lu de trop à
     chaque fois. Et le journal avance même sans abonné : un téléphone qui
     s'abonne ne reçoit que ce qui arrive APRÈS lui (a.depuis), pas tout
     l'historique rejoué comme s'il était neuf. */
  async function distribuer(){
    if (enCours) return;
    enCours = true;
    try { await distribuerUneFois(); } finally { enCours = false; }
  }
  async function distribuerUneFois(){
    let lignes;
    try {
      const r = await base.psql('select coalesce(jsonb_agg(j order by n), \'[]\'::jsonb) from (select n, op, id from public.essai_journal where n > ' + dernier + ') j');
      lignes = JSON.parse(r.out.trim());
    } catch (e) { return; }
    for (const j of lignes) {
      dernier = Math.max(dernier, j.n);
      for (const a of abonnes) {
        if (j.n <= a.depuis) continue;
        if (a.table !== 'messages' || !a.events.includes(j.op === 'INSERT' ? 'INSERT' : 'UPDATE') && !a.events.includes('*')) continue;
        try {
          const r = await base.psql(enTantQue(a.moi, 'select to_jsonb(m) from public.messages m where id = ' + (j.id | 0)));
          const t = r.out.trim();
          if (!t) continue;
          const ligne = JSON.parse(t);
          if (a.filtre) {
            const m = /^([a-z_]+)=eq\.(.+)$/.exec(a.filtre);
            if (m && String(ligne[m[1]]) !== m[2]) continue;
          }
          a.rs.write('data: ' + JSON.stringify({ eventType: j.op === 'INSERT' ? 'INSERT' : 'UPDATE', new: ligne, old: {} }) + '\n\n');
        } catch (e) {}
      }
    }
  }
  relecture = setInterval(distribuer, 120);

  const corps = (rq) => new Promise(r => { let b = ''; rq.on('data', d => b += d); rq.on('end', () => { try { r(JSON.parse(b || '{}')); } catch (e) { r({}); } }); });
  const json = (rs, o, code) => { rs.writeHead(code || 200, { 'content-type': 'application/json' }); rs.end(JSON.stringify(o)); };
  const delegue = hub.serveur.listeners('request')[0];

  const serveur = http.createServer(async (rq, rs) => {
    const u = new URL(rq.url, 'http://x');
    const moi = rq.headers['x-moi'] || u.searchParams.get('moi') || '';
    try {
      if (u.pathname === '/faux/rpc') { const b = await corps(rq); return json(rs, await rpc(moi, b.nom, b.args)); }
      if (u.pathname === '/faux/select') { const b = await corps(rq); return json(rs, await select(moi, b)); }
      if (u.pathname === '/faux/sql') { const b = await corps(rq);          // pour le banc seulement : semer, relire
        try { const r = await base.psql(b.sql); return json(rs, { out: r.out }); }
        catch (e) { return json(rs, { erreur: String(e.stderr || e.message) }); } }
      if (u.pathname === '/faux/direct') {
        rs.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        rs.write('retry: 500\n\n');
        const a = { moi, table: u.searchParams.get('table'), filtre: u.searchParams.get('filtre') || '',
                    events: String(u.searchParams.get('events') || '*').split(','), rs, depuis: dernier };
        abonnes.add(a);
        rq.on('close', () => abonnes.delete(a));
        return;
      }
      if (u.pathname === '/shim-groupes.js') {
        rs.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
        return fs.createReadStream(path.join(__dirname, 'shim-groupes.js')).pipe(rs);
      }
      if (u.pathname === '/' || u.pathname === '/index.html') {
        const h = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8')
          .replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', '/shim-groupes.js');
        rs.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return rs.end(h);
      }
    } catch (e) { return json(rs, { error: { message: String(e.message) } }, 500); }
    return delegue(rq, rs);   // présence, diffusion, fichiers : hub.js
  });
  serveur.fermer = () => { clearInterval(relecture); for (const a of abonnes) { try { a.rs.end(); } catch (e) {} } abonnes.clear(); serveur.close(); };
  return serveur;
}

/* Tout monter d'un coup : la base, le serveur, et de quoi semer des comptes. */
async function monter(portHttp, portPG){
  const base = await demarrerPG(portPG || 5436);
  const serveur = creerServeur(base);
  await new Promise(r => serveur.listen(portHttp || 8250, '127.0.0.1', r));
  const sql = async (q) => (await base.psql(q)).out.trim();
  return {
    url: 'http://127.0.0.1:' + (portHttp || 8250) + '/index.html',
    sql,
    /* Un joueur qui existe côté serveur : son compte, et au besoin le reste. */
    compte: async (id, email) => sql("insert into auth.users values ('" + id + "', '" + (email || id + '@essai') + "') on conflict do nothing"),
    moderateur: async (id) => sql("insert into public.moderateurs values ('" + id + "') on conflict do nothing"),
    ouvrir: async (oui) => sql('update public.reglages_jeu set groupes_ouverts = ' + (oui === false ? 'false' : 'true')),
    rpc: async (moi, nom, args) => {
      const r = await fetch('http://127.0.0.1:' + (portHttp || 8250) + '/faux/rpc', { method: 'POST', headers: { 'x-moi': moi }, body: JSON.stringify({ nom, args }) });
      return r.json();
    },
    arreter: async () => { serveur.fermer(); await base.arreter(); }
  };
}
module.exports = { monter, demarrerPG, creerServeur };

if (require.main === module) {
  monter(8250, 5436).then(m => {
    console.log('faux Supabase des groupes sur ' + m.url);
    const fin = async () => { await m.arreter(); process.exit(0); };
    process.on('SIGINT', fin); process.on('SIGTERM', fin);
  }).catch(e => { console.error(e.stderr || e); process.exit(1); });
}
