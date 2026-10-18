/* ====== BANC « LES RAPPELS, TOUT LE SERVEUR EN UN SEUL COLLAGE » (v326) ======
   « Les notifications ne marchent toujours pas. » Relevé le 18/10/2026 sur la
   vraie base : pas de push_enregistrer, pas de colonne « revoir », une tâche
   qui demandait de recopier la clé service_role à la main. La consigne
   devient UN fichier, notifications/installer.sql, collé une fois dans
   l'éditeur SQL. Ce banc le colle dans un vrai PostgreSQL 16 — avec le vrai
   pg_cron quand la machine l'a, une imitation sinon ; pg_net, qui n'existe
   que chez Supabase, est imité (même signature, même table des réponses) :
     1. par-dessus le serveur tel qu'il est en ligne (vieille table ouverte,
        un abonnement avec une série de 12 jours, la vieille tâche horaire
        à la clé service_role), deux fois de suite, sans une erreur ;
     2. rien de perdu : la série, l'abonnement ;
     3. la porte fermée : ni la table ni la clé interne ne se lisent de
        l'extérieur ; service_role (la fonction) lit les deux ;
     4. UNE tâche « rappels », toutes les cinq minutes, qui porte la clé
        interne et plus aucune clé à recopier — exécutée telle que pg_cron
        l'exécutera ;
     5. la clé interne ne change pas quand on recolle ;
     6. rappels_etat() dit au jeu ce qu'il faut, et jamais la clé ;
     7. une base neuve, sans pg_cron ni pg_net : tout le reste s'installe
        quand même, et rappels_etat() le dit.
   Usage : node banc-essai/installer-sql.js */
const fs = require('fs'), path = require('path'), os = require('os');
const { execFile, execFileSync } = require('child_process');
const RACINE = path.resolve(__dirname, '..');
const BIN = '/usr/lib/postgresql/16/bin';
const PORT = 5642;
const INSTALLEUR = fs.readFileSync(path.join(RACINE, 'notifications/installer.sql'), 'utf8');
/* CRON_IMITE=1 éprouve l'imitation même là où le vrai pg_cron est installé. */
const VRAI_CRON = fs.existsSync('/usr/share/postgresql/16/extension/pg_cron.control') && !process.env.CRON_IMITE;
let ko = 0; const dit = (q, b, d) => { console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d !== undefined ? '  (' + String(d).slice(0, 200) + ')' : '')); if (!b) ko++; };
const sh = (cmd, args) => new Promise((res, rej) => execFile(cmd, args, { maxBuffer: 64 << 20 },
  (e, out, err) => e ? rej(Object.assign(e, { stderr: err, stdout: out })) : res({ out, err })));

(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'pginstalleur-'));
  fs.chmodSync(D, 0o777);
  const pg = (args) => sh('runuser', ['-u', 'postgres', '--'].concat(args));
  const arret = () => { try { execFileSync('runuser', ['-u', 'postgres', '--', BIN + '/pg_ctl', '-D', D + '/data', '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch (e) {} try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {} };
  process.once('exit', arret);
  try {
    await pg([BIN + '/initdb', '-D', D + '/data', '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C.UTF-8']);
    await pg([BIN + '/pg_ctl', '-D', D + '/data', '-o', '-k ' + D + ' -p ' + PORT + ' -c listen_addresses='
      + (VRAI_CRON ? ' -c shared_preload_libraries=pg_cron -c cron.database_name=essai' : ''), '-l', D + '/log', '-w', 'start']);
    for (const b of ['essai', 'neuve']) await sh(BIN + '/createdb', ['-h', D, '-p', String(PORT), '-U', 'postgres', b]);
    const sql = async (q, base) => (await sh(BIN + '/psql', ['-h', D, '-p', String(PORT), '-U', 'postgres', '-d', base || 'essai', '-v', 'ON_ERROR_STOP=1', '-qtAX', '-c', q])).out.trim();
    const refus = async (q, base) => { try { await sql(q, base); return 'accepté'; } catch (e) { return /permission denied/.test(e.stderr || '') ? 'refusé' : String(e.stderr || e).trim().slice(0, 120); } };
    const coller = async (base) => { const f = path.join(D, 'installer.sql'); fs.writeFileSync(f, INSTALLEUR); fs.chmodSync(f, 0o644);
      const r = await sh(BIN + '/psql', ['-h', D, '-p', String(PORT), '-U', 'postgres', '-d', base || 'essai', '-v', 'ON_ERROR_STOP=1', '-qX', '-f', f]);
      return (r.err || '').split('\n').filter(l => /NOTICE:\s+(pg_cron|pg_net|pas de pg_cron)/.test(l)).map(l => l.replace(/^.*NOTICE:\s+/, '')); };
    /* Le décor de Supabase : ses trois rôles (service_role passe la sécurité
       des lignes, comme chez Supabase), et les droits par défaut. */
    await sql(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      grant usage on schema public to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated;`);
    console.log('  pg_cron : ' + (VRAI_CRON ? 'le vrai (extension 16)' : "imité (postgresql-16-cron n'est pas installé ici)") + ' ; pg_net : imité');

    /* ===== 1. LE SERVEUR TEL QU'IL EST EN LIGNE ===== */
    await sql(`create table public.push_subs (endpoint text primary key, abonnement jsonb not null, dernier date,
        serie int not null default 0, vu date, decalage int not null default 0, maj timestamptz not null default now());
      alter table public.push_subs enable row level security;
      create policy "un appareil gère son propre abonnement" on public.push_subs for all to anon, authenticated using (true) with check (true);
      grant all on public.push_subs to anon, authenticated;
      insert into public.push_subs (endpoint, abonnement, dernier, serie, vu) values
        ('https://fcm.exemple/abonnement-de-taylor-0001', '{"endpoint":"https://fcm.exemple/abonnement-de-taylor-0001"}', current_date - 1, 12, current_date - 1);
      create schema net;
      create table net._http_response (id bigserial primary key, status_code int, content_type text, headers jsonb,
        content text, timed_out boolean, error_msg text, created timestamptz not null default now());
      create table net.recu (url text, headers jsonb, body jsonb, delai int);
      create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
          headers jsonb default '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds int default 5000)
        returns bigint language plpgsql as $f$
        declare i bigint; begin
          insert into net.recu values (url, headers, body, timeout_milliseconds);
          insert into net._http_response (status_code, content) values (200, '{"version":326,"envoyes":0}') returning id into i;
          return i; end $f$;`);
    if (VRAI_CRON) await sql('create extension pg_cron with schema pg_catalog');
    else await sql(`create schema cron;
      create table cron.job (jobid bigserial primary key, schedule text, command text, jobname text unique, active boolean not null default true);
      create table cron.job_run_details (jobid bigint, runid bigserial, status text, return_message text, start_time timestamptz);
      create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $f$
        insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
        on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $f$;`);
    await sql(`select cron.schedule('rappels', '0 * * * *', $$ select net.http_post(url := 'https://chyuckryusxzssezesuw.supabase.co/functions/v1/rappels',
      headers := jsonb_build_object('Authorization', 'Bearer <CLÉ_SERVICE_ROLE>', 'Content-Type', 'application/json'), body := '{}'::jsonb); $$)`);

    let erreur = '';
    let avis = [];
    try { avis = await coller(); await coller(); } catch (e) { erreur = String(e.stderr || e.message || e).split('\n').filter(Boolean).slice(0, 2).join(' / '); }
    dit('collé deux fois par-dessus le serveur en ligne, sans une erreur', !erreur, erreur || (avis.length ? avis.join(' ; ') : 'aucun avis'));
    if (erreur) throw new Error('arrêt');
    const cle = await sql('select cle from public.rappels_reglage');
    await coller();
    dit('la clé interne : 64 caractères hexadécimaux, la même quand on recolle', /^[0-9a-f]{64}$/.test(cle) && cle === await sql('select cle from public.rappels_reglage'));

    /* ===== 2. RIEN DE PERDU ===== */
    dit('la série de Taylor et son abonnement sont intacts',
      await sql("select serie || ' ' || (dernier = current_date - 1) || ' ' || (abonnement->>'endpoint') from push_subs") === '12 true https://fcm.exemple/abonnement-de-taylor-0001');
    dit('les colonnes de la v326 sont là',
      await sql("select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_name = 'push_subs' and column_name in ('revoir','jeu','priere','lecture','jeu_le','priere_le','lecture_le','essai_le')")
        === 'essai_le,jeu,jeu_le,lecture,lecture_le,priere,priere_le,revoir');

    /* ===== 3. LA PORTE ===== */
    dit("l'ancienne règle ouverte est retirée", await sql("select count(*) from pg_policies where tablename = 'push_subs'") === '0');
    dit("de l'extérieur, la table ne se lit plus", await refus('set role anon; select count(*) from push_subs') === 'refusé');
    dit("de l'extérieur, la clé interne ne se lit pas", await refus('set role anon; select cle from rappels_reglage') === 'refusé'
      && await refus('set role authenticated; select cle from rappels_reglage') === 'refusé');
    dit('service_role (la fonction) lit la clé et les abonnements',
      await sql('set role service_role; select length(cle) from rappels_reglage') === '64' && await sql('set role service_role; select count(*) from push_subs') === '1');

    /* ===== 4. LA TÂCHE ===== */
    dit('UNE tâche « rappels », toutes les cinq minutes, active',
      await sql("select count(*) || ' ' || max(schedule) || ' ' || bool_and(active) from cron.job where jobname = 'rappels'") === '1 */5 * * * * true');
    dit('elle porte la clé interne, et plus aucune clé à recopier',
      await sql("select (command like '%x-rappels%')::text || ' ' || (command like '%CLÉ_SERVICE_ROLE%')::text || ' ' || (command like '%' || (select cle from rappels_reglage) || '%')::text from cron.job where jobname = 'rappels'") === 'true false false');
    await sql("do $x$ declare c text; begin select command into c from cron.job where jobname = 'rappels'; execute c; end $x$");
    dit('exécutée telle que pg_cron l\'exécutera : la bonne adresse, la clé interne en en-tête, 25 s de patience',
      await sql("select (headers->>'x-rappels' = (select cle from rappels_reglage))::text || ' ' || delai || ' ' || url from net.recu")
        === 'true 25000 https://chyuckryusxzssezesuw.supabase.co/functions/v1/rappels');

    /* ===== 5. L'INSCRIPTION : le jeu d'avant la v326, et celui d'aujourd'hui ===== */
    await sql("set role anon; select public.push_enregistrer(p_endpoint => 'https://fcm.exemple/abonnement-de-taylor-0001', p_serie => 12, p_dernier => current_date - 1, p_vu => current_date, p_decalage => 120)");
    await sql(`set role anon; select public.push_enregistrer(p_endpoint => 'https://web.push.apple.com/neuf-0002', p_abonnement => '{"endpoint":"https://web.push.apple.com/neuf-0002"}', p_jeu => true, p_priere => 420, p_lecture => -1, p_decalage => 120)`);
    dit("deux téléphones inscrits, l'abonnement de Taylor gardé",
      await sql("select count(*) || ' ' || max(case when endpoint like '%taylor%' then abonnement->>'endpoint' end) from push_subs") === '2 https://fcm.exemple/abonnement-de-taylor-0001');

    /* ===== 6. CE QUE LE JEU LIT ===== */
    const etat = JSON.parse(await sql("set role anon; select public.rappels_etat('https://web.push.apple.com/neuf-0002')"));
    dit('rappels_etat : version 326, 2 abonnés, ce téléphone inscrit, clé interne, pg_cron, pg_net',
      etat.version === 326 && etat.abonnes === 2 && etat.inscrit === true && etat.cle_interne === true && etat.cron === true && etat.net === true, JSON.stringify(etat).slice(0, 160));
    dit('rappels_etat : la tâche (*/5, active) et la dernière réponse de la fonction',
      etat.tache && etat.tache.schedule === '*/5 * * * *' && etat.tache.active === true && etat.reponse && etat.reponse.status_code === 200 && /"version":326/.test(etat.reponse.contenu));
    dit('rappels_etat ne dit jamais la clé', !JSON.stringify(etat).includes(cle));
    dit('rappels_etat : un inconnu n\'est pas inscrit', JSON.parse(await sql("set role anon; select public.rappels_etat('https://inconnu.exemple/zzzzzzzzzzzzzzzzzzzz')")).inscrit === false);

    /* ===== 7. UNE BASE NEUVE, SANS pg_cron NI pg_net ===== */
    await sql('grant usage on schema public to anon, authenticated, service_role', 'neuve');
    let avisNeuve = [];
    erreur = '';
    try { avisNeuve = await coller('neuve'); } catch (e) { erreur = String(e.stderr || e.message || e).split('\n').filter(Boolean).slice(0, 2).join(' / '); }
    dit('base neuve sans pg_cron ni pg_net : collé sans erreur, et il le dit', !erreur && avisNeuve.some(a => /pg_cron indisponible/.test(a)) && avisNeuve.some(a => /pg_net indisponible/.test(a)), erreur || avisNeuve.join(' ; '));
    await sql(`set role anon; select public.push_enregistrer(p_endpoint => 'https://fcm.exemple/abonnement-neuf-0003', p_abonnement => '{"endpoint":"x"}')`, 'neuve');
    dit("base neuve : l'inscription marche", await sql('select count(*) from push_subs', 'neuve') === '1');
    const e2 = JSON.parse(await sql('set role anon; select public.rappels_etat()', 'neuve'));
    dit('base neuve : rappels_etat dit « ni pg_cron, ni pg_net, pas de tâche »', e2.cron === false && e2.net === false && !e2.tache, JSON.stringify(e2));
  } catch (e) { if (e.message !== 'arrêt') { console.log('  KO  le banc s\'est arrêté : ' + String(e.stderr || e.stack || e).slice(0, 500)); ko++; } }
  arret();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un seul collage installe tout le serveur des rappels, sans rien perdre, et sans clé à recopier');
  process.exit(ko ? 1 : 0);
})();
