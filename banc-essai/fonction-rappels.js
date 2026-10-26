/* ====== LA VRAIE FONCTION « rappels », BRANCHÉE SUR UN VRAI POSTGRESQL (v329) ======
   Pour les bancs qui suivent un message de groupe jusqu'à l'envoi push.
   notifications/rappels.ts est TRANSPILÉE et exécutée telle quelle (comme
   dans rappels.js) ; ses deux dépendances sont remplacées :
     - le client Supabase lit et écrit la VRAIE base, avec les droits de
       service_role (aucune règle d'accès ne s'applique — comme chez
       Supabase) ;
     - l'envoi push note ce qu'on lui confie ; un appareil marqué « disparu »
       répond 410, comme un abonnement que le téléphone a perdu.
   Et l'imitation de pg_net : même signature que chez Supabase, elle note
   chaque appel (net.recu) au lieu de l'envoyer.
   (v338) Les jetons d'arrivée s'écrivent (insert), les filtres « plus petit
   que » existent (lt), et ce que la fonction poserait sur l'API de diffusion
   de Supabase (le signal « lu ») est noté (diffusions) au lieu de partir.
   Ce n'est PAS un banc (voir tous.sh, PAS_DES_BANCS). */
const fs = require('fs'), path = require('path');
const ts = require('/opt/node22/lib/node_modules/typescript');

const lit = (v) => { const s = String(v); let t = 'q'; while (s.includes('$' + t + '$')) t += 'x'; return '$' + t + '$' + s + '$' + t + '$'; };
const COL = /^[a-z_][a-z0-9_]*$/;

/* Le décor de Supabase qui manque à un PostgreSQL nu : le rôle de la
   fonction, et pg_net. */
const DECOR_SUPABASE = `
  do $r$ begin if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls; end if; end $r$;
  grant usage on schema public to service_role;
  create schema if not exists net;
  create table if not exists net._http_response (id bigserial primary key, status_code int, content_type text, headers jsonb,
    content text, timed_out boolean, error_msg text, created timestamptz not null default now());
  create table if not exists net.recu (n bigserial primary key, url text, headers jsonb, body jsonb, delai int);
  create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
      headers jsonb default '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds int default 5000)
    returns bigint language plpgsql as $f$
    declare i bigint; begin insert into net.recu (url, headers, body, delai) values (url, headers, body, timeout_milliseconds) returning n into i; return i; end $f$;`;

async function brancherFonction(sql, src){
  const envois = [], disparus = new Set();
  const webpush = {
    setVapidDetails(){},
    sendNotification(abo, corps, options){
      if (disparus.has(abo.endpoint)) { const e = new Error('gone'); e.statusCode = 410; return Promise.reject(e); }
      envois.push({ qui: abo.endpoint, charge: JSON.parse(corps), options: options || null }); return Promise.resolve();
    },
  };
  const executer = async (e) => {
    if (!COL.test(e.table)) return { data: null, error: { message: 'table invalide' } };
    if (!e.filtres.every(([c]) => COL.test(c))) return { data: null, error: { message: 'colonne invalide' } };
    const where = e.filtres.map(([c, op, v]) => op === 'in' ? c + '::text in (' + (v.length ? v.map(lit).join(',') : 'null') + ')'
                                              : op === 'lt' ? c + ' < ' + lit(v) : c + '::text = ' + lit(v));
    const w = where.length ? ' where ' + where.join(' and ') : '';
    try {
      if (e.op === 'delete') { await sql('delete from public.' + e.table + w); return { data: null, error: null }; }
      if (e.op === 'insert') {
        if (!e.lignes.length) return { data: null, error: null };
        const cols = Object.keys(e.lignes[0]);
        if (!cols.every(x => COL.test(x))) return { data: null, error: { message: 'colonne invalide' } };
        const val = (v) => v === null || v === undefined ? 'null' : lit(typeof v === 'object' ? JSON.stringify(v) : v);
        await sql('insert into public.' + e.table + ' (' + cols.join(', ') + ') values ' + e.lignes.map(l => '(' + cols.map(c => val(l[c])).join(', ') + ')').join(', '));
        return { data: null, error: null };
      }
      if (e.op === 'update') {
        const set = Object.entries(e.valeurs).map(([k, v]) => k + ' = ' + (v === null ? 'null' : lit(typeof v === 'object' ? JSON.stringify(v) : v))).join(', ');
        await sql('update public.' + e.table + ' set ' + set + w); return { data: null, error: null };
      }
      const cols = String(e.cols || '*').split(',').map(x => x.trim()).filter(Boolean);
      if (!cols.every(x => x === '*' || COL.test(x))) return { data: null, error: { message: 'colonne invalide' } };
      return { data: JSON.parse(await sql('select coalesce(jsonb_agg(to_jsonb(x)), \'[]\'::jsonb) from (select ' + cols.join(', ') + ' from public.' + e.table + w + ') x')), error: null };
    } catch (x) { return { data: null, error: { message: String(x.stderr || x.message).split('\n')[0] } }; }
  };
  const createClient = () => ({ from(table){
    const e = { table, op: 'select', cols: '*', filtres: [] };
    const q = {
      select(c){ e.cols = c || '*'; return q; }, delete(){ e.op = 'delete'; return q; }, update(v){ e.op = 'update'; e.valeurs = v; return q; },
      eq(c, v){ e.filtres.push([c, 'eq', v]); return q; }, in(c, l){ e.filtres.push([c, 'in', l]); return q; },
      lt(c, v){ e.filtres.push([c, 'lt', v]); return q; }, insert(l){ e.op = 'insert'; e.lignes = Array.isArray(l) ? l : [l]; return q; },
      then(res, rej){ return executer(e).then(res, rej); },
    };
    return q;
  } });
  const SECRETS = {};
  let handler = null;
  globalThis.Deno = { env: { get: (k) => SECRETS[k] }, serve: (fn) => { handler = fn; } };
  const source = fs.readFileSync(src || path.join(__dirname, '..', 'notifications', 'rappels.ts'), 'utf8').replace(/^import .*$/gm, '');
  const diffusions = [];
  const fauxFetch = async (url, init) => { let corps = null; try { corps = JSON.parse((init && init.body) || 'null'); } catch (x) {}
    diffusions.push({ url: String(url), entetes: (init && init.headers) || {}, corps }); return { ok: true, status: 202, json: async () => ({}) }; };
  new Function('createClient', 'webpush', 'fetch', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(createClient, webpush, fauxFetch);
  /* Une VRAIE paire de clés, fabriquée ici : rien de secret n'entre dans le dépôt. */
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const b64 = (u) => Buffer.from(u).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  Object.assign(SECRETS, { VAPID_SUJET: 'mailto:yada@exemple.fr', VAPID_PUBLIQUE: b64(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))),
    VAPID_PRIVEE: (await crypto.subtle.exportKey('jwk', kp.privateKey)).d, SUPABASE_URL: 'https://laboratoire.exemple', SUPABASE_SERVICE_ROLE_KEY: 'cle-de-laboratoire' });
  /* Ce que pg_net enverrait : les en-têtes et le corps qu'il a notés. */
  const servir = async (recu, plus) => {
    const r = await handler({ method: 'POST', headers: new Headers(recu.headers || {}), json: () => Promise.resolve(Object.assign({}, recu.body, plus || {})) });
    return { st: r.status, c: await r.json() };
  };
  let vus = 0;
  const recus = async () => JSON.parse(await sql("select coalesce(jsonb_agg(to_jsonb(x) order by n), '[]'::jsonb) from (select n, url, headers, body, delai from net.recu) x"));
  const nouveaux = async () => { const l = await recus(); const n = l.slice(vus); vus = l.length; return n; };
  const version = +(source.match(/const VERSION = (\d+);/) || [, 0])[1];
  return { servir, envois, disparus, recus, nouveaux, version, diffusions };
}

module.exports = { brancherFonction, DECOR_SUPABASE, lit };
