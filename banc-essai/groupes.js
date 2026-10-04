/* ====== LES GROUPES, DE BOUT EN BOUT, À DEUX TÉLÉPHONES ======
   Pas un faux serveur qui imiterait les règles : un VRAI PostgreSQL, avec
   comptes/table.sql et groupes/table.sql tels qu'ils partiront chez Supabase
   (voir faux-serveur-groupes.js). Deux joueurs, deux téléphones, et tout ce
   qu'un joueur fait vraiment, au doigt :

     1. tant que les groupes sont fermés, la barre n'apparaît pas — sauf pour
        le modérateur ; ouverts, elle est là dès le premier dessin ;
     2. l'onglet glisse de côté (vers la droite, puis retour à gauche) ;
     3. un nouveau venu passe les règles et les 13 ans, puis entre ;
     4. Taylor crée un groupe privé, le code d'invitation s'affiche ;
     5. Benoît entre avec ce code, écrit — et Taylor le reçoit EN DIRECT ;
     6. sur l'accueil, la pastille des non-lus compte le message ;
     7. un mot interdit est refusé, le message ne part pas, le texte revient ;
     8. Taylor lance une partie ; Benoît la rejoint depuis la discussion ;
     9. Benoît signale un message ; le bouclier de Taylor porte une pastille,
        et l'onglet Groupes la compte ; Taylor masque le message depuis la
        modération, la pastille s'éteint, Benoît voit « Message masqué » ;
    10. Benoît bloque Taylor : ses messages disparaissent ;
    11. Benoît supprime son compte : il n'existe plus sur le serveur, et sa
        progression locale n'a pas bougé d'un octet ;
    12. aucune erreur dans la page, aucun texte français en anglais.

   Usage : node banc-essai/groupes.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2';

let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8252, 5438);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    await m.compte(A, 'taylor@essai'); await m.compte(B, 'benoit@essai');
    await m.rpc(A, 'poser_profil', { p_nom: 'Taylor', p_couleur: '#4C86E8' });
    await m.rpc(A, 'accepter_regles', { p_version: 1, p_age_ok: true });
    await m.moderateur(A);
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 6000 }).then(() => true).catch(() => false);

    /* Un téléphone : un contexte à lui, son joueur, sa session rangée. */
    const telephone = async (moi, nom) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, nom]) => {
        if (!localStorage.getItem('bt_profile')) localStorage.setItem('bt_profile', JSON.stringify({ name: nom, color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1');
        if (!sessionStorage.getItem('essai_sorti')) { localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1'); }
      }, [moi, nom]);
      await p.goto(m.url);
      await accueil(p);
      return p;
    };
    const accueil = (p) => p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    const barreVisible = (p) => p.evaluate(() => { const b = document.getElementById('barreBas'); return !!b && !b.classList.contains('cachee'); });

    /* ---- 1. fermés : la barre n'est que pour le modérateur ---- */
    const pb = await telephone(B, 'Benoît');
    await pb.waitForTimeout(4200);
    dit('fermés : pas de barre chez Benoît', !(await barreVisible(pb)));
    const pa = await telephone(A, 'Taylor');
    dit('fermés : la barre chez Taylor, modérateur', await attendre(pa, () => { const b = document.getElementById('barreBas'); return !!b && !b.classList.contains('cachee'); }, null, 9000));
    await m.ouvrir(true);
    await pb.evaluate(() => sonderGroupes(true));
    await pb.reload(); await accueil(pb);
    dit('ouverts : chez Benoît, la barre est là dès le premier dessin', await barreVisible(pb));

    /* ---- 2. l'onglet glisse de côté ---- */
    await pb.evaluate(() => allerOnglet('groupes'));
    dit('l\'onglet Groupes arrive par la droite', await pb.evaluate(() => !!document.querySelector('#app > .screen.groupes-ecran.vers-droite')));
    await pb.waitForTimeout(700);
    await pb.evaluate(() => allerOnglet('accueil'));
    dit('… et l\'accueil revient par la gauche', await pb.evaluate(() => !!document.querySelector('#app > .screen.accueil.vers-gauche')));
    dit('avec la barre, les sept jours ont quitté l\'accueil', await pb.evaluate(() => !document.querySelector('.accueil .semaine') && !!document.querySelector('.parcours-card .pc-feu')));
    await pb.waitForTimeout(700);

    /* ---- 3. la première fois : le nom, les règles, les 13 ans ---- */
    await pb.evaluate(() => allerOnglet('groupes'));
    dit('Benoît voit les règles et les 13 ans', await attendre(pb, () => !!document.querySelector('.grp-bienvenue'), null, 8000));
    await pb.evaluate(() => document.querySelector('.grp-bienvenue .btn-primary').click());
    dit('… entrer sans confirmer est refusé', await attendre(pb, () => /confirmer/.test((document.getElementById('gbMot') || {}).textContent || '')));
    await pb.evaluate(() => document.querySelectorAll('.grp-bienvenue .switch').forEach(s => s.click()));
    await pb.evaluate(() => document.querySelector('.grp-bienvenue .btn-primary').click());
    dit('… puis il entre', await attendre(pb, () => !!document.getElementById('grpMes'), null, 8000));
    dit('… sous son nom, sur le serveur', (await m.sql("select nom from public.profils where id = '" + B + "'")) === 'Benoît');

    /* ---- 4. Taylor crée un groupe privé ---- */
    await pa.evaluate(() => allerOnglet('groupes'));
    await attendre(pa, () => !!document.getElementById('grpMes'), null, 8000);
    await pa.evaluate(() => ouvrirCreation());
    await pa.waitForTimeout(600);
    await pa.fill('#grpNom', 'Les amis du jeudi');
    await pa.evaluate(() => document.querySelector('#grpCreerVeil .btn-primary').click());
    dit('Taylor crée un groupe privé : le code d\'invitation s\'affiche', await attendre(pa, () => {
      const c = document.querySelector('#grpInfosVeil .gc-code'); return !!c && /^[A-Z0-9]{6}$/.test(c.textContent); }, null, 9000));
    const code = await pa.evaluate(() => document.querySelector('#grpInfosVeil .gc-code').textContent);
    const gid = await m.sql("select id from public.groupes where nom = 'Les amis du jeudi'");
    await pa.evaluate(() => fermerFeuilleGroupe('grpInfosVeil'));
    await pa.waitForTimeout(500);

    /* ---- 5. Benoît entre avec le code, écrit — Taylor le reçoit en direct ---- */
    await pb.evaluate(() => ouvrirCode());
    await pb.waitForTimeout(500);
    await pb.fill('#grpCode', code);
    dit('Benoît voit l\'aperçu du groupe avant d\'entrer', await attendre(pb, () => /jeudi/.test((document.getElementById('grpApercu') || {}).textContent || '')));
    await pb.evaluate(() => document.getElementById('grpCodeGo').click());
    dit('… entre, et la discussion s\'ouvre', await attendre(pb, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000));
    await pb.fill('#compoTexte', 'Bonjour à tous !');
    await pb.evaluate(() => envoyerMessageGroupe());
    dit('Taylor reçoit le message EN DIRECT', await attendre(pa, () => [...document.querySelectorAll('.b-eux .b-bulle')].some(b => /Bonjour à tous/.test(b.textContent)), null, 8000));
    dit('… avec le nom de Benoît au-dessus', await pa.evaluate(() => [...document.querySelectorAll('.b-eux .b-nom')].some(n => /Benoît/.test(n.textContent))));

    /* ---- 6. sur l'accueil, la pastille compte les non-lus ---- */
    await pa.evaluate(() => retourGroupes());
    await pa.waitForTimeout(500);
    await pa.evaluate(() => allerOnglet('accueil'));
    await pb.waitForTimeout(1100);
    await pb.fill('#compoTexte', 'Tu es là ?');
    await pb.evaluate(() => envoyerMessageGroupe());
    dit('sur l\'accueil de Taylor, la pastille compte le message', await attendre(pa, () => {
      const p = document.querySelector('#barreBas .bb-pastille'); return !!p && !p.hidden && +p.textContent >= 1; }, null, 8000));

    /* ---- 7. un mot interdit ne part pas, et le texte revient ---- */
    await pb.waitForTimeout(1100);
    await pb.fill('#compoTexte', 'espèce de connard');
    await pb.evaluate(() => envoyerMessageGroupe());
    dit('un mot interdit est refusé : le texte revient dans le champ', await attendre(pb, () => document.getElementById('compoTexte').value === 'espèce de connard'));
    dit('… et rien n\'est arrivé sur le serveur', (await m.sql("select count(*) from public.messages where texte like '%connard%'")) === '0');
    await pb.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = ''; surSaisie(t); });

    /* ---- 8. jouer ensemble : Taylor lance, Benoît rejoint depuis la discussion ---- */
    await pa.evaluate((id) => ouvrirGroupe(id), gid);
    await attendre(pa, () => state.screen === 'groupe' && !!document.querySelector('.compo-jeu'), null, 8000);
    await pa.waitForTimeout(1100);
    await pa.evaluate(() => document.querySelector('.compo-jeu').click());
    dit('Taylor lance une partie : son salon s\'ouvre', await attendre(pa, () => state.screen === 'online-room', null, 10000));
    const salon = await pa.evaluate(() => net.code);
    dit('Benoît voit l\'invitation dans la discussion', await attendre(pb, () => !!document.querySelector('.b-partie .grp-pill'), null, 8000));
    await pb.evaluate(() => document.querySelector('.b-partie .grp-pill').click());
    dit('… la touche, et entre dans le salon de Taylor', await attendre(pb, (c) => state.screen === 'online-room' && net.code === c, salon, 10000));
    dit('… où Taylor le voit arriver', await attendre(pa, () => net.oppPresent === true, null, 10000));
    await pa.evaluate(() => { try { leaveRoomToOnline(); } catch (e) {} });
    await pb.evaluate(() => { try { leaveRoomToOnline(); } catch (e) {} });
    await pa.waitForTimeout(500);

    /* ---- 9. signaler, masquer depuis la modération ---- */
    await m.sql("update public.messages set cree_le = cree_le - interval '3 seconds'");
    await m.rpc(A, 'envoyer_message', { p_groupe: (await m.sql("select id from public.groupes where nom = 'Les amis du jeudi'")), p_texte: 'un message à signaler', p_genre: 'texte', p_donnees: null });
    await pb.evaluate((id) => ouvrirGroupe(id), await m.sql("select id from public.groupes where nom = 'Les amis du jeudi'"));
    dit('Benoît voit le message de Taylor', await attendre(pb, () => [...document.querySelectorAll('.b-eux .b-bulle')].some(b => /signaler/.test(b.textContent)), null, 8000));
    await pb.evaluate(() => { const b = [...document.querySelectorAll('.b-eux .b-bulle')].find(x => /signaler/.test(x.textContent)); b.click(); });
    await pb.waitForTimeout(500);
    await pb.evaluate(() => { const l = [...document.querySelectorAll('#grpActionsVeil .grp-act-l')].find(x => /Signaler/.test(x.textContent)); l.click(); });
    await pb.waitForTimeout(700);
    await pb.evaluate(() => { document.querySelector('#grpSignalerVeil .grp-act-l').click(); });
    dit('le signalement est remercié', await attendre(pb, () => !!document.querySelector('#grpSignalerVeil .grp-merci')));
    /* Le signalement arrive jusqu'au modérateur : Taylor revient sur
       l'accueil, puis entre dans les groupes comme un joueur le ferait. */
    await pa.evaluate(() => { state.screen = 'mode'; render(); allerOnglet('groupes'); });
    dit('le bouclier de Taylor porte la pastille « 1 »', await attendre(pa, () => { const p = document.querySelector('.grp-modo .bb-pastille'); return !!p && !p.hidden && p.textContent === '1'; }));
    /* Entière : hors du rond de verre (qui découpe ce qu'il contient), et
       dans l'en-tête, qui découpe aussi. */
    dit('… entière, hors du rond de verre et dans l\'en-tête', await pa.evaluate(() => {
      const e = document.querySelector('.grp-modo .bb-pastille'), p = e.getBoundingClientRect();
      const h = document.querySelector('.grp-entete').getBoundingClientRect();
      return !document.querySelector('.grp-modo .icon-btn').contains(e)
        && p.top >= h.top && p.left >= h.left && p.right <= h.right && p.bottom <= h.bottom;
    }));
    dit('… et l\'onglet Groupes la compte', await pa.evaluate(() => { const p = document.querySelector('#barreBas .bb-pastille'); return !!p && !p.hidden && +p.textContent >= 1; }));
    await pa.evaluate(() => ouvrirModeration());
    dit('Taylor le voit dans la modération', await attendre(pa, () => !!document.querySelector('.mod-carte')));
    await pa.evaluate(() => { const b = [...document.querySelectorAll('.mod-carte .grp-pill')].find(x => /Masquer/.test(x.textContent)); b.click(); });
    dit('… le masque, et la file se vide', await attendre(pa, () => !document.querySelector('.mod-carte')));
    await pa.evaluate(() => retourGroupes());
    dit('… et la pastille du bouclier s\'éteint', await attendre(pa, () => { const p = document.querySelector('.grp-modo .bb-pastille'); return !!p && p.hidden; }));
    dit('Benoît voit « Message masqué » en direct', await attendre(pb, () => [...document.querySelectorAll('.b-vide')].some(b => /masqué/.test(b.textContent)), null, 8000));

    /* ---- 10. bloquer ---- */
    await pb.evaluate(() => { const b = [...document.querySelectorAll('.b-eux .b-bulle')][0]; b.click(); });
    await pb.waitForTimeout(500);
    await pb.evaluate(() => { const l = [...document.querySelectorAll('#grpActionsVeil .grp-act-l')].find(x => /Bloquer/.test(x.textContent)); l.click(); });
    await pb.waitForTimeout(500);
    await pb.evaluate(() => document.getElementById('modalOk').click());
    dit('Benoît bloque Taylor : plus aucune bulle de Taylor', await attendre(pb, () => !document.querySelector('.b-eux')));

    /* ---- 11. supprimer son compte ---- */
    const avant = await pb.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => /^bt_/.test(k) && k !== 'bt_groupes_sonde').sort().map(k => [k, localStorage.getItem(k)])));
    await pb.evaluate(() => { state.screen = 'mode'; render(); openProfile(); });
    await pb.waitForTimeout(900);
    dit('le profil propose « Supprimer mon compte »', await attendre(pb, () => !!document.querySelector('.compte-supprimer')));
    await pb.evaluate(() => document.querySelector('.compte-supprimer').click());
    await pb.waitForTimeout(400);
    await pb.evaluate(() => { sessionStorage.setItem('essai_sorti', '1'); document.getElementById('modalOk').click(); });
    dit('le compte n\'existe plus sur le serveur', await (async () => { for (let i = 0; i < 30; i++) { if ((await m.sql("select count(*) from auth.users where id = '" + B + "'")) === '0') return true; await pb.waitForTimeout(200); } return false; })());
    dit('… ses messages non plus', (await m.sql("select count(*) from public.messages where auteur = '" + B + "'")) === '0');
    const apres = await pb.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => /^bt_/.test(k) && k !== 'bt_groupes_sonde').sort().map(k => [k, localStorage.getItem(k)])));
    dit('la progression sur le téléphone n\'a pas bougé', avant === apres);
    dit('le jeu le dit au joueur', await attendre(pb, () => /supprimé/.test((document.querySelector('.compte-mot') || {}).textContent || '')));

    /* ---- 12. en anglais, plus un mot de français ---- */
    await pa.evaluate(() => { LANGUE = 'en'; state.screen = 'groupes'; render(); ouvrirGroupes(); majBarre(); });
    await pa.waitForTimeout(1200);
    const francais = await pa.evaluate(() => {
      const t = document.body.innerText;
      return ['Groupes', 'Mes groupes', 'Découvrir', 'Créer un groupe', 'Rechercher', 'Accueil', 'membres'].filter(m => t.includes(m));
    });
    dit('en anglais, l\'écran des groupes ne garde aucun mot français', !francais.length, francais.join(', '));
  } catch (e) { console.log('  KO  le banc s\'est arrêté : ' + (e && e.message)); ko++; }
  dit('aucune erreur dans les pages', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  await nav.close();
  await m.arreter();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — les groupes tiennent de bout en bout');
  process.exit(ko ? 1 : 0);
})();