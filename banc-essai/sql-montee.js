/* ====== LA MISE À JOUR DU SERVEUR, DEPUIS N'IMPORTE QUELLE VERSION (v322) ======
   Taylor colle groupes/table.sql dans Supabase de temps en temps, pas à
   chaque version : la base en ligne avait encore celle d'avant les photos
   (v311), sans « photo_maj ». La consigne qu'on lui donne est donc toujours
   la même — « colle le fichier d'aujourd'hui et lance-le » — et elle doit
   marcher QUELLE QUE SOIT la version déjà en place.
   Ce banc rejoue l'histoire : pour CHAQUE version passée de groupes/table.sql
   (avec les comptes/table.sql et notifications/table.sql de la même époque),
   une base neuve, des joueurs, un groupe, des messages écrits avec les
   fonctions d'alors ; puis les fichiers d'aujourd'hui, collés par-dessus
   (notifications/verrouiller.sql compris, avant et après). Il exige :
     - aucune erreur (ON_ERROR_STOP : la première erreur arrête tout) ;
     - rien de perdu : le groupe, ses membres, ses messages ;
     - les nouveautés en place (photo_maj, logo à 0 — l'initiale) ;
     - EXACTEMENT la base d'une installation neuve : mêmes fonctions (noms et
       paramètres), mêmes colonnes, mêmes règles d'accès, mêmes droits ;
     - et un état qui annonce photos et logos au jeu.
   Usage : node banc-essai/sql-montee.js */
const fs = require('fs'), path = require('path'), os = require('os');
const { execFile, execFileSync } = require('child_process');
const RACINE = path.resolve(__dirname, '..');
const BIN = '/usr/lib/postgresql/16/bin';
const PORT = 5618;
let ko = 0; const dit = (q, b, d) => { console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '  (' + String(d).slice(0, 300) + ')' : '')); if (!b) ko++; };
const sh = (cmd, args, opts) => new Promise((res, rej) => execFile(cmd, args, Object.assign({ maxBuffer: 64 << 20 }, opts || {}),
  (e, out, err) => e ? rej(Object.assign(e, { stderr: err, stdout: out })) : res({ out, err })));
const git = (args) => execFileSync('git', ['-C', RACINE].concat(args), { encoding: 'utf8', maxBuffer: 64 << 20 });
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2';

async function base(){
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmontee-'));
  fs.chmodSync(D, 0o777);
  const pg = (args) => sh('runuser', ['-u', 'postgres', '--'].concat(args));
  await pg([BIN + '/initdb', '-D', D + '/data', '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C.UTF-8']);
  await pg([BIN + '/pg_ctl', '-D', D + '/data', '-o', '-k ' + D + ' -p ' + PORT + ' -c listen_addresses=', '-l', D + '/log', '-w', 'start']);
  const arret = () => { try { execFileSync('runuser', ['-u', 'postgres', '--', BIN + '/pg_ctl', '-D', D + '/data', '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch (e) {} try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {} };
  process.once('exit', arret);
  await sh(BIN + '/createdb', ['-h', D, '-p', String(PORT), '-U', 'postgres', 'essai']);
  const sql = async (q) => (await sh(BIN + '/psql', ['-h', D, '-p', String(PORT), '-U', 'postgres', '-d', 'essai', '-v', 'ON_ERROR_STOP=1', '-qtAX', '-c', q])).out.trim();
  const fichier = async (texte) => { const f = path.join(D, 'f.sql'); fs.writeFileSync(f, texte); fs.chmodSync(f, 0o644);
    return sh(BIN + '/psql', ['-h', D, '-p', String(PORT), '-U', 'postgres', '-d', 'essai', '-v', 'ON_ERROR_STOP=1', '-qX', '-f', f]); };
  /* Le décor que Supabase fournit (voir groupes/essai.sh). */
  await sql(`create schema if not exists auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('essai.moi', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public to anon, authenticated; grant usage on schema auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    create publication supabase_realtime;`);
  return { sql, fichier, arret };
}
const qui = (moi, q) => "begin; set local role authenticated; set local essai.moi = '" + moi + "'; " + q + '; commit;';
/* Ce qui fait une base : ses fonctions, ses colonnes, ses règles, ses droits. */
const PORTRAIT = {
  fonctions: "select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'",
  colonnes: "select table_name || '.' || column_name || ':' || data_type || ':' || coalesce(column_default, '') from information_schema.columns where table_schema = 'public'",
  regles: "select tablename || ':' || policyname || ':' || cmd || ':' || array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, '') from pg_policies where schemaname = 'public'",
  droits: "select p.oid::regprocedure::text || ':' || has_function_privilege('anon', p.oid, 'execute') || ':' || has_function_privilege('authenticated', p.oid, 'execute') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'",
  tables: "select table_name || ':' || privilege_type || ':' || grantee from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon','authenticated')",
  contraintes: "select conrelid::regclass || ':' || conname || ':' || pg_get_constraintdef(c.oid) from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public'"
};
/* Une ligne par objet, triées ici : l'ordre des oid n'est pas le même d'une base à l'autre. */
async function portrait(b){ const r = {}; for (const [k, q] of Object.entries(PORTRAIT)) r[k] = (await b.sql(q)).split('\n').filter(Boolean).sort().join(' | '); return r; }
function ecart(a, b){
  const x = new Set(a.split(' | ')), y = new Set(b.split(' | '));
  const moins = [...x].filter(v => !y.has(v)), plus = [...y].filter(v => !x.has(v));
  return (moins.length ? 'manque : ' + moins.slice(0, 4).join(' ; ') : '') + (plus.length ? ' en trop : ' + plus.slice(0, 4).join(' ; ') : '');
}
const AUJOURDHUI = { comptes: fs.readFileSync(path.join(RACINE, 'comptes/table.sql'), 'utf8'), groupes: fs.readFileSync(path.join(RACINE, 'groupes/table.sql'), 'utf8'),
                     notifs: fs.readFileSync(path.join(RACINE, 'notifications/table.sql'), 'utf8'),
                     verrou: fs.readFileSync(path.join(RACINE, 'notifications/verrouiller.sql'), 'utf8') };
/* Aujourd'hui, Taylor colle aussi notifications/verrouiller.sql (les rappels
   en ont besoin) : il doit passer AVANT comme APRÈS les autres. */
async function installer(b, v){ await b.fichier(v.notifs); if (v.verrou) await b.fichier(v.verrou); await b.fichier(v.comptes); await b.fichier(v.groupes); if (v.verrou) await b.fichier(v.verrou); }

(async () => {
  try {
    /* La référence : une installation neuve, le fichier d'aujourd'hui. */
    let b = await base();
    await installer(b, AUJOURDHUI);
    const neuve = await portrait(b);
    b.arret();
    dit('installation neuve : ' + neuve.fonctions.split(' | ').length + ' fonctions, ' + neuve.colonnes.split(' | ').length + ' colonnes', neuve.fonctions.length > 100);

    const versions = git(['log', '--format=%h', '--', 'groupes/table.sql']).trim().split('\n').reverse();
    for (const c of versions) {
      const lire = (f) => { try { return git(['show', c + ':' + f]); } catch (e) { return ''; } };
      const avant = { comptes: lire('comptes/table.sql'), groupes: lire('groupes/table.sql'), notifs: lire('notifications/table.sql') };
      const titre = git(['log', '-1', '--format=%ad %s', '--date=short', c]).trim().slice(0, 60);
      b = await base();
      try {
        await installer(b, avant);
        /* La vie d'avant : deux joueurs, un groupe, trois messages. */
        for (const [id, nom] of [[A, 'Taylor'], [B, 'Benoît']]) {
          await b.sql("insert into auth.users values ('" + id + "', '" + id + "@x')");
          await b.sql(qui(id, "select public.poser_profil(p_nom => '" + nom + "', p_couleur => '#4C86E8')"));
          await b.sql(qui(id, "select public.accepter_regles(p_version => 1, p_age_ok => true)"));
        }
        await b.sql('update public.reglages_jeu set groupes_ouverts = true');
        const g = JSON.parse((await b.sql(qui(A, "select to_jsonb(public.creer_groupe(p_nom => 'Les amis', p_description => 'avant', p_ouvert => false, p_langue => 'fr', p_teinte => 3))"))).split('\n').pop());
        const code = await b.sql("select code from public.groupes where id = '" + g.id + "'");
        await b.sql(qui(B, "select public.rejoindre_groupe(p_groupe => '" + g.id + "', p_code => '" + code + "')"));
        for (const [moi, t] of [[A, 'Bonjour'], [B, 'Salut'], [A, 'On joue ?']])
          await b.sql(qui(moi, "select public.envoyer_message(p_groupe => '" + g.id + "', p_texte => '" + t + "', p_genre => 'texte', p_donnees => null)"));
        const compter = async () => b.sql("select (select count(*) from public.groupes) || '/' || (select count(*) from public.membres) || '/' || (select count(*) from public.messages)");
        const vie = await compter();

        /* Le fichier d'aujourd'hui, collé par-dessus. */
        let erreur = '';
        try { await installer(b, AUJOURDHUI); } catch (e) { erreur = String(e.stderr || e.message || e).split('\n').filter(Boolean).slice(0, 2).join(' / '); }
        dit(c + ' (' + titre + ') : le fichier d\'aujourd\'hui passe sans erreur', !erreur, erreur);
        if (erreur) continue;
        const apres = await compter();
        dit(c + ' : rien de perdu (groupes/membres/messages ' + vie + ')', apres === vie, vie + ' → ' + apres);
        const neuf = await b.sql("select photo_maj || '/' || logo || '/' || teinte || '/' || nom from public.groupes where id = '" + g.id + "'");
        dit(c + ' : le groupe d\'avant a sa photo_maj, son logo (l\'initiale), sa couleur et son nom', neuf === '0/0/3/Les amis', neuf);
        const p = await portrait(b);
        for (const k of Object.keys(PORTRAIT)) dit(c + ' : ' + k + ' identiques à une installation neuve', p[k] === neuve[k], ecart(neuve[k], p[k]));
        const e = JSON.parse((await b.sql(qui(A, 'select to_jsonb(public.mon_etat_groupes())'))).split('\n').pop());
        dit(c + ' : l\'état annonce photos et logos', e.photos === true && e.logos === true, JSON.stringify(e).slice(0, 120));
      } finally { b.arret(); }
    }
  } catch (e) { console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e.stderr || e).toString().slice(0, 600)); ko++; }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le fichier d\'aujourd\'hui se colle par-dessus n\'importe quelle version passée, sans rien perdre');
  process.exit(ko ? 1 : 0);
})();
