/* ====== BANC « UN MESSAGE PRÉVIENT QUI DOIT L'ÊTRE, ET PERSONNE D'AUTRE » (v329) ======
   « Je veux aussi que tu fasses les notifications des messages. » Tout le
   chemin du serveur, pour de vrai : un VRAI PostgreSQL 16 avec les groupes
   (comptes/table.sql, groupes/table.sql) et notifications/installer.sql collé
   par-dessus — pg_net imité (même signature, il note ce qu'on lui confie) —,
   puis la VRAIE fonction (notifications/rappels.ts, transpilée), qui lit la
   base comme service_role et dont l'envoi push est une doublure qui note.
   Un groupe de huit : Taylor écrit ; Benoît (Tout, trois appareils dont un
   disparu), Jean Paul (Mentions), Dora (Muet), Éli (a bloqué Taylor), Fanny
   (un jeu d'avant la v329), Gaby (déconnectée de son téléphone), Hugo (a la
   discussion ouverte).
     1. collé deux fois par-dessus les groupes, sans erreur ; le déclencheur
        est posé, une fois ;
     2. chaque téléphone sait à quel compte il appartient ; un jeu d'avant la
        v329 ne dit rien des messages (vide), une déconnexion détache ;
     3. les lignes du jeu (X a rejoint, X est parti) n'appellent personne ;
     4. un message appelle la fonction, une fois, avec la clé interne ;
     5. (v331) la fonction écrit TOUT DE SUITE — plus d'attente — et en
        priorité haute ; Hugo a le jeu à l'écran (son téléphone l'a dit) :
        il n'est pas prévenu ; elle n'écrit qu'à Benoît — à ses deux
        appareils vivants ; l'appareil disparu (410) est retiré de la table ;
        personne d'autre, ni l'auteur ;
     6. ce qui part : le groupe, son nom, l'auteur, le texte — rien d'autre ;
     7. une mention : Jean Paul (Mentions) est prévenu, « mention » vraie ;
        Dora (Muet) jamais, même nommée ;
     8. « @tout le monde » : Jean Paul aussi, sans « mention » ;
     9. un long texte sur plusieurs lignes : une ligne, 140 caractères ;
    10. une partie lancée : « partie », sans texte ;
    11. masqué avant l'envoi, groupe supprimé : personne ;
    12. un appareil où le jeu est à l'écran ne reçoit rien ; s'il ne l'a
        plus redit depuis 45 s (fermé sans avoir pu le dire), il est prévenu ;
        un appareil qui a COUPÉ les messages n'est jamais prévenu, même sans
        nouvelles depuis longtemps ;
    13. sans la clé interne : refusé, rien ne part ;
    14. pg_net en panne : le message part quand même ;
    15. rappels_etat : version 329, téléphones rattachés, déclencheur posé,
        et la réponse du dernier message lue à part de celle de la tâche ;
    16. (v334) la modération écrit de l'extérieur : les membres sont
        prévenus, la charge porte « moderation » et pas le nom de la personne
        qui modère (le téléphone signe « La modération ») ; un message
        ordinaire, lui, part avec exactement les mêmes champs qu'avant (6).
   Usage : node banc-essai/messages-serveur.js [rappels.ts] */
const path = require('path');
const { execFile } = require('child_process');
const { demarrerPG } = require('./faux-serveur-groupes.js');
const { brancherFonction, DECOR_SUPABASE, lit } = require('./fonction-rappels.js');
const RACINE = path.resolve(__dirname, '..');
const SRC = process.argv[2] || path.join(RACINE, 'notifications', 'rappels.ts');
const BIN = '/usr/lib/postgresql/16/bin';
let ko = 0;
const dit = (q, b, d) => { console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d !== undefined ? '  (' + String(d).slice(0, 220) + ')' : '')); if (!b) ko++; };

const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2', C = 'cccccccc-0000-4000-8000-0000000000c3',
      D = 'dddddddd-0000-4000-8000-0000000000d4', E = 'eeeeeeee-0000-4000-8000-0000000000e5', F = 'ffffffff-0000-4000-8000-0000000000f6',
      G = '99999999-0000-4000-8000-000000000097', H = '88888888-0000-4000-8000-000000000088';
const NOMS = [[A, 'Taylor'], [B, 'Benoît'], [C, 'Jean Paul'], [D, 'Dora'], [E, 'Éli'], [F, 'Fanny'], [G, 'Gaby'], [H, 'Hugo']];
const EP = (x) => 'https://push.exemple/appareil-' + x;

(async () => {
  const base = await demarrerPG(5695);
  const sql = async (q) => (await base.psql(q)).out.trim();
  const enTant = (moi, q) => moi ? "begin; set local role authenticated; set local essai.moi = '" + moi + "'; " + q + '; commit;'
                                 : 'begin; set local role anon; ' + q + '; commit;';
  const appel = async (moi, f) => { const o = (await base.psql(enTant(moi, 'select to_jsonb(public.' + f + ')'))).out.trim().split('\n').pop(); return o ? JSON.parse(o) : null; };
  const vide = async (moi, f) => base.psql(enTant(moi, 'select public.' + f));
  const coller = () => new Promise((res, rej) => execFile(BIN + '/psql', ['-h', base.D, '-p', String(base.port), '-U', 'postgres', '-d', 'essai', '-v', 'ON_ERROR_STOP=1', '-qX',
    '-f', path.join(RACINE, 'notifications', 'installer.sql')], { maxBuffer: 32 << 20 }, (e, out, err) => e ? rej(Object.assign(e, { stderr: err })) : res(err || '')));

  /* ---- la vraie fonction, branchée sur cette base (fonction-rappels.js) ---- */
  const fn = await brancherFonction(sql, SRC);
  const { servir, envois, nouveaux } = fn;
  fn.disparus.add(EP('B-ancien'));
  /* Taylor écrit (le serveur veut une seconde entre deux messages : on vieillit les précédents). */
  const ecrire = async (texte, donnees, genre) => {
    await sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
    const r = await appel(A, 'envoyer_message(p_groupe => ' + lit(G1) + '::uuid, p_texte => ' + lit(texte || '') + ', p_genre => ' + lit(genre || 'texte') + ', p_donnees => ' + lit(JSON.stringify(donnees || {})) + '::jsonb)');
    if (!r || !r.ok) throw new Error('envoi refusé : ' + JSON.stringify(r));
    return r.id;
  };
  const qui = () => envois.map(x => x.qui.replace('https://push.exemple/appareil-', '')).sort().join(',');
  let G1 = null;

  try {
    /* Le décor de Supabase qui manque au faux : service_role, pg_net imité
       (fonction-rappels.js). La table minimale du faux laisse place à celle
       de l'installateur. */
    await sql('drop table public.push_subs;' + DECOR_SUPABASE);

    /* ===== 1 ===== */
    let erreur = '';
    try { await coller(); await coller(); } catch (e) { erreur = String(e.stderr || e.message).split('\n').filter(Boolean).slice(0, 2).join(' / '); }
    dit('1. installer.sql collé deux fois par-dessus les groupes, sans erreur', !erreur, erreur || undefined);
    if (erreur) throw new Error('arrêt');
    dit('   le déclencheur des messages est posé, une fois', await sql("select count(*) from pg_trigger where tgname = 'messages_a_prevenir'") === '1');
    const cle = await sql('select cle from public.rappels_reglage');

    /* Les huit, le groupe, les réglages de chacun. */
    await sql('update public.reglages_jeu set groupes_ouverts = true');
    for (const [id, nom] of NOMS) {
      await sql("insert into auth.users values ('" + id + "', '" + id + "@essai')");
      await appel(id, 'poser_profil(p_nom => ' + lit(nom) + ", p_couleur => '#4C86E8')");
      await appel(id, 'accepter_regles(p_version => 1, p_age_ok => true)');
    }
    const g = await appel(A, "creer_groupe(p_nom => 'Les amis', p_description => '', p_ouvert => false, p_langue => 'fr', p_teinte => 1)");
    G1 = g.id;
    for (const [id] of NOMS.slice(1)) await appel(id, 'rejoindre_groupe(p_groupe => ' + lit(G1) + '::uuid, p_code => ' + lit(g.code) + ')');
    await appel(C, 'regler_notifs(p_groupe => ' + lit(G1) + "::uuid, p_notifs => 'mentions')");
    await appel(D, 'regler_notifs(p_groupe => ' + lit(G1) + "::uuid, p_notifs => 'rien')");
    await appel(E, 'bloquer(p_cible => ' + lit(A) + '::uuid)');

    /* ===== 2 : les téléphones ===== */
    /* « ecran » : le jeu est à l'écran sur ce téléphone (v331, dans l'abonnement). */
    const inscrire = (moi, x, messages, sans, ecran) => vide(moi, 'push_enregistrer(p_endpoint => ' + lit(EP(x)) + ', p_abonnement => '
      + lit(JSON.stringify(Object.assign({ endpoint: EP(x), keys: { p256dh: 'p', auth: 'a' } }, ecran == null ? {} : { ecran })))
      + '::jsonb, p_decalage => 120, p_jeu => true, p_priere => -1, p_lecture => -1' + (sans ? '' : ', p_messages => ' + messages) + ')');
    await inscrire(A, 'A', true);
    for (const x of ['B-tel', 'B-tablette', 'B-ancien']) await inscrire(B, x, true);
    await inscrire(C, 'C', true); await inscrire(D, 'D', true); await inscrire(E, 'E', true);
    await inscrire(H, 'H', true, false, true);           // (v331) Hugo a le jeu à l'écran : son téléphone le dit
    await inscrire(F, 'F', null, true);                  // le jeu d'avant la v329 : pas de p_messages
    await inscrire(G, 'G', true); await inscrire(null, 'G', true);   // Gaby se déconnecte : le téléphone s'inscrit sans compte
    const lignes = JSON.parse(await sql("select jsonb_object_agg(replace(endpoint, 'https://push.exemple/appareil-', ''), jsonb_build_object('m', membre, 'msg', messages, 'e', abonnement->'ecran')) from public.push_subs"));
    dit('2. chaque téléphone rattaché à son compte', lignes.A.m === A && lignes['B-tel'].m === B && lignes.C.m === C && lignes.H.m === H && lignes.A.msg === true && lignes.H.msg === true, JSON.stringify(lignes.A));
    dit('   « le jeu est à l\'écran » voyage dans l\'abonnement, le choix des messages reste le choix', lignes.H.e === true && lignes.A.e == null, JSON.stringify(lignes.H));
    dit('   un jeu d\'avant la v329 ne dit rien des messages (vide), une déconnexion détache', lignes.F.msg === null && lignes.F.m === F && lignes.G.m === null, 'F ' + JSON.stringify(lignes.F) + ' · G ' + JSON.stringify(lignes.G));

    /* ===== 3 : les lignes du jeu ===== */
    dit('3. les lignes du jeu (créé, sept « a rejoint ») n\'appellent personne', (await nouveaux()).length === 0,
      await sql("select count(*) from public.messages where genre = 'systeme'") + ' lignes du jeu');

    /* ===== 4 & 5 : un message ===== */
    const id1 = await ecrire('Salut tout le monde !');
    const r1 = await nouveaux();
    dit('4. un message appelle la fonction, une fois, avec la clé interne', r1.length === 1 && r1[0].body.message === id1 && r1[0].headers['x-rappels'] === cle
      && r1[0].url === 'https://chyuckryusxzssezesuw.supabase.co/functions/v1/rappels' && r1[0].delai === 25000, JSON.stringify(r1[0] && r1[0].body));
    /* (v331) Plus d'attente : Hugo a le jeu à l'écran, son téléphone l'a dit. */
    const t0 = Date.now();
    let rep = await servir(r1[0]);
    const attente = Date.now() - t0;
    dit('5. la fonction écrit tout de suite (plus d\'attente de 4 s)', attente < 1500, attente + ' ms');
    dit('   en priorité haute (urgency « high »), à livrer un jour au plus', envois.length > 0 && envois.every(x => x.options && x.options.urgency === 'high' && x.options.TTL === 86400),
      JSON.stringify(envois[0] && envois[0].options));
    dit('   et n\'écrit qu\'à Benoît — ses deux appareils vivants ; ni Hugo (jeu à l\'écran), ni l\'auteur, ni Mentions, Muet, bloqué, ancien jeu, déconnectée',
      qui() === 'B-tablette,B-tel' && rep.c.presents === 1, qui() + ' · présents ' + rep.c.presents);
    dit('   l\'appareil disparu (410) est retiré de la table', await sql("select count(*) from public.push_subs where endpoint = " + lit(EP('B-ancien'))) === '0' && rep.c.retires === 1);
    dit('   la réponse dit ce qui s\'est passé', rep.st === 200 && rep.c.sorte === 'message' && rep.c.envoyes === 2 && rep.c.version === fn.version && fn.version >= 329, JSON.stringify(rep.c));
    /* ===== 6 ===== */
    const ch = envois[0] && envois[0].charge;
    dit('6. ce qui part : le groupe, son nom, l\'auteur, le texte — rien d\'autre',
      ch && JSON.stringify(Object.keys(ch).sort()) === JSON.stringify(['de', 'decalage', 'genre', 'groupe', 'id', 'mention', 'nom', 'partie', 'texte'])
        && ch.genre === 'message' && ch.groupe === G1 && ch.nom === 'Les amis' && ch.de === 'Taylor' && ch.texte === 'Salut tout le monde !' && ch.mention === false && ch.partie === false && ch.decalage === 120,
      JSON.stringify(ch));

    /* ===== 7 : une mention ===== (Hugo a quitté le jeu : son téléphone l'a
       dit, il est prévenu des suivants, comme Benoît) */
    await inscrire(H, 'H', true);
    envois.length = 0;
    const id2 = await ecrire('@Jean Paul et @Dora vous venez ?', { mentions: [C, D] });
    rep = await servir((await nouveaux())[0], { sans_attente: true });
    const pourC = envois.find(x => x.qui === EP('C'));
    dit('7. une mention : Jean Paul (Mentions) prévenu, « mention » vraie ; Benoît et Hugo (discussion refermée) sans ; Dora (Muet) jamais, même nommée',
      qui() === 'B-tablette,B-tel,C,H' && pourC && pourC.charge.mention === true && envois.filter(x => x.qui !== EP('C')).every(x => x.charge.mention === false), qui());

    /* ===== 8 : @tout le monde ===== */
    envois.length = 0;
    await ecrire('@tout le monde ce soir 20 h', { tous: true });
    rep = await servir((await nouveaux())[0], { sans_attente: true });
    dit('8. « @tout le monde » (le propriétaire) : Jean Paul aussi, sans « mention » ; Dora non', qui() === 'B-tablette,B-tel,C,H' && envois.every(x => x.charge.mention === false), qui());

    /* ===== 9 : un long texte ===== */
    envois.length = 0;
    const long = 'Bonjour à tous,\n\nvoici le programme   de la semaine : ' + 'lecture, prière, partage. '.repeat(14);
    await ecrire(long.slice(0, 480));
    rep = await servir((await nouveaux())[0], { sans_attente: true });
    const tl = (envois[0] && envois[0].charge.texte) || '';
    dit('9. un long texte sur plusieurs lignes : une ligne, 140 caractères', tl.length === 140 && /…$/.test(tl) && !/\n|  /.test(tl), tl.length + ' · « ' + tl.slice(0, 50) + '… »');

    /* ===== 10 : une partie ===== */
    envois.length = 0;
    await ecrire('', { code: 'ABCD12' }, 'partie');
    rep = await servir((await nouveaux())[0], { sans_attente: true });
    dit('10. une partie lancée : « partie », sans texte', qui() === 'B-tablette,B-tel,H' && envois.every(x => x.charge.partie === true && x.charge.texte === ''), JSON.stringify(envois[0] && envois[0].charge));

    /* ===== 11 : masqué, groupe supprimé ===== */
    envois.length = 0;
    const id5 = await ecrire('un message signalé trois fois');
    const r5 = (await nouveaux())[0];
    await sql('select public._masquer(' + id5 + ')');
    rep = await servir(r5, { sans_attente: true });
    dit('11. masqué avant l\'envoi : personne', !envois.length && rep.c.envoyes === 0, JSON.stringify(rep.c));

    /* ===== 12 : le jeu à l'écran, puis sans nouvelles ===== */
    await inscrire(B, 'B-tablette', true, false, true);
    envois.length = 0;
    await ecrire('Et maintenant ?');
    rep = await servir((await nouveaux())[0], { sans_attente: true });
    dit('12. la tablette de Benoît a le jeu à l\'écran : seul son téléphone', qui() === 'B-tel,H', qui());
    await sql("update public.push_subs set maj = now() - interval '50 seconds' where endpoint = " + lit(EP('B-tablette')));
    envois.length = 0;
    await ecrire('Et là ?');
    rep = await servir((await nouveaux())[0], { sans_attente: true });
    dit('    plus de nouvelles depuis 45 s (jeu fermé sans avoir pu le dire) : la tablette est prévenue', qui() === 'B-tablette,B-tel,H', qui());
    await inscrire(B, 'B-tablette', false, false, false);
    await sql("update public.push_subs set maj = now() - interval '10 minutes' where endpoint = " + lit(EP('B-tablette')));
    envois.length = 0;
    await ecrire('Et sans les messages ?');
    rep = await servir((await nouveaux())[0], { sans_attente: true });
    dit('    la tablette coupe les messages : jamais prévenue, même sans nouvelles depuis 10 min', qui() === 'B-tel,H', qui());

    /* ===== 13 : sans la clé ===== */
    envois.length = 0;
    const id7 = await ecrire('Encore un');
    const r7 = (await nouveaux())[0];
    const sans = await servir({ headers: { authorization: 'Bearer sb_publishable_exemple' }, body: { message: id7, sans_attente: true } });
    dit('13. sans la clé interne : refusé, rien ne part', sans.st === 401 && !envois.length, sans.st + ' ' + JSON.stringify(sans.c).slice(0, 80));
    const mauvais = await servir(r7, { message: 'pas un nombre', sans_attente: true });
    dit('    un identifiant qui n\'en est pas un : refusé', mauvais.st === 400 && !envois.length, String(mauvais.st));

    /* ===== 16 : la modération écrit de l'extérieur (v334) ===== */
    const M = '77777777-0000-4000-8000-000000000077';
    await sql("insert into auth.users values ('" + M + "', 'modo@essai'); insert into public.moderateurs values ('" + M + "')");
    await appel(M, "poser_profil(p_nom => 'Modo', p_couleur => '#4C86E8')");
    await appel(M, 'accepter_regles(p_version => 1, p_age_ok => true)');
    await sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
    const rm = await appel(M, 'envoyer_message(p_groupe => ' + lit(G1) + "::uuid, p_texte => 'Merci de rester bienveillants', p_genre => 'texte', p_donnees => '{}'::jsonb)");
    envois.length = 0;
    rep = await servir((await nouveaux())[0], { sans_attente: true });
    const chm = envois[0] && envois[0].charge;
    dit('16. la modération écrit de l\'extérieur : les membres prévenus, « moderation » dans la charge, et pas son nom',
      rm && rm.ok === true && envois.length > 0 && envois.every(x => x.charge.moderation === true && x.charge.de === '' && x.charge.texte === 'Merci de rester bienveillants')
        && !JSON.stringify(envois.map(x => x.charge)).includes('Modo'),
      qui() + ' · ' + JSON.stringify(chm));

    /* Groupe supprimé entre le message et l'envoi */
    const id8 = await ecrire('Dernier message avant fermeture');
    const r8 = (await nouveaux())[0];

    /* ===== 14 : pg_net en panne ===== */
    await sql(`create or replace function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
        headers jsonb default '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds int default 5000)
      returns bigint language plpgsql as $f$ begin raise exception 'pg_net en panne'; end $f$`);
    let parti = null;
    try { parti = await ecrire('Malgré la panne'); } catch (e) { parti = null; }
    dit('14. pg_net en panne : le message part quand même', !!parti && await sql('select count(*) from public.messages where id = ' + (parti | 0)) === '1');

    await appel(A, 'supprimer_groupe(p_groupe => ' + lit(G1) + '::uuid)');
    envois.length = 0;
    rep = await servir(r8, { sans_attente: true });
    dit('11 bis. groupe supprimé avant l\'envoi : personne', !envois.length && rep.c.envoyes === 0, JSON.stringify(rep.c));

    /* ===== 15 : rappels_etat ===== */
    await sql(`insert into net._http_response (status_code, content) values (200, '{"version":329,"envoyes":3}');
      insert into net._http_response (status_code, content) values (200, '{"version":329,"sorte":"message","envoyes":2}')`);
    const etat = JSON.parse(await sql(enTant(null, 'select public.rappels_etat(' + lit(EP('B-tel')) + ')').replace(/^begin; set local role anon; /, '')));
    dit('15. rappels_etat : version 329, déclencheur posé, téléphones rattachés à un compte',
      etat.version === 329 && etat.messages_branches === true && etat.lies === +(await sql('select count(*) from public.push_subs where membre is not null')), JSON.stringify(etat).slice(0, 200));
    dit('    la réponse de la tâche et celle du dernier message, lues à part',
      etat.reponse && /"envoyes":3/.test(etat.reponse.contenu) && !/sorte/.test(etat.reponse.contenu) && etat.reponse_message && /"sorte":"message"/.test(etat.reponse_message.contenu));
    dit('    elle ne dit jamais la clé, ni à qui appartient un téléphone', !JSON.stringify(etat).includes(cle) && !JSON.stringify(etat).includes(B));
  } catch (e) { if (e.message !== 'arrêt') { console.log('  KO  le banc s\'est arrêté : ' + String(e.stderr || e.stack || e).slice(0, 600)); ko++; } }
  await base.arreter();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un message prévient ceux qui ne l\'ont pas lu, selon leur choix, et personne d\'autre');
  process.exit(ko ? 1 : 0);
})();
