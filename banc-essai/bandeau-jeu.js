/* ====== BANC « DANS LE JEU, UN BANDEAU — ET LE SON DU JEU » (v331, v335) ======
   « Fais en sorte que le téléphone ne sonne pas lorsqu'on est sur le jeu. »
   (v335) « Je reviens sur ce que j'ai dit : je veux le son des notifications
   à l'intérieur du jeu, comme Telegram. » Le téléphone se tait toujours ;
   c'est le JEU qui sonne, de son propre son (sonMessage, et une goutte dans
   la discussion ouverte — sonGoutte) : chaque étape dit aussi ce qui a
   sonné.
   « Quand je lance une partie, la personne doit le voir rapidement. » Le jeu
   à l'écran, le serveur ne prévient plus le téléphone : ce qui arrive dans
   un AUTRE groupe se pose en haut de l'écran, sans bruit. Le décor de
   groupes.js — un VRAI PostgreSQL, le vrai direct. Taylor écrit ; Benoît a
   le jeu ouvert.
     1. Benoît sur l'accueil : le bandeau arrive (moins de 2 s) — le groupe,
        « Taylor : … » —, entier sur l'écran, sans aucun trait ; et le jeu
        sonne (v335) ;
     2. il s'en va de lui-même ;
     3. une partie lancée : « Taylor a lancé une partie » ;
     4. le toucher ouvre la discussion du groupe ;
     5. dans cette discussion : pas de bandeau (le message est sous ses yeux),
        une goutte (v335) ;
     6. dans la discussion d'un AUTRE groupe : le bandeau ;
     7. sur la liste des groupes : pas de bandeau (elle le montre déjà), le
        son seul (v335) ;
     8. un groupe en Muet : rien, pas un son ; en Mentions : rien, sauf quand
        on le nomme (« Taylor te mentionne : … »), et là il sonne ;
     9. pendant une partie : rien, pas un son ;
    10. poussé vers le haut, il se range (sans ouvrir la discussion) ;
    11. un rattrapage (retour sur l'app) ne déballe rien ; quelqu'un de
        bloqué non plus ;
    12. un succès à l'écran : le bandeau attend qu'il parte ;
    13. en anglais, les mots de l'anglais ;
   (v380) « Lorsqu'une personne lance une partie, lorsque je suis sur le jeu
     ou autre, je dois bien être notifié. »
    14. l'app fermée pendant le lancement : à l'ouverture, il se dit (une
        partie encore ouverte, récente, pas lue) ;
    15. en Mentions, une partie lancée se dit (elle appelle tout le monde,
        comme « @tout le monde »), et sonne ; en Muet, rien ;
    16. PENDANT UNE PARTIE SOLO : elle se dit, et sonne — le bandeau porte la
        manette, tient entre la flèche et la roue de l'en-tête, au-dessus du
        chrono ; le toucher demande de quitter la partie, puis ouvre la
        discussion, où l'invitation attend ;
    17. pendant une partie de GROUPE : rien, pas un son ;
    18. l'app cachée pendant le lancement : au retour, il se dit — une fois ;
        fermé entre-temps, rien ;
    19. aucune erreur.
   Usage : node banc-essai/bandeau-jeu.js [dossier des captures] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const CAPT = process.argv[2] || null;
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000f1', B = 'bbbbbbbb-0000-4000-8000-0000000000f2', C = 'cccccccc-0000-4000-8000-0000000000f3';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8487, 5689);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const groupe = async (nom, teinte) => {
      const g = (await m.rpc(A, 'creer_groupe', { p_nom: nom, p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: teinte })).data;
      const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
      await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
      await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
      return g;
    };
    const amis = await groupe('Les amis', 2), bible = await groupe('Bible ensemble', 4), priere = await groupe('Prière du soir', 1), chorale = await groupe('Chorale', 6);
    await m.rpc(B, 'regler_notifs', { p_groupe: priere.id, p_notifs: 'rien' });
    await m.rpc(B, 'regler_notifs', { p_groupe: chorale.id, p_notifs: 'mentions' });
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'; update public.membres set rejoint_le = rejoint_le - interval '1 minute'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const ecrit = async (qui, g, texte, donnees, genre) => {
      await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
      const r = await m.rpc(qui, 'envoyer_message', { p_groupe: g.id, p_texte: texte, p_genre: genre || 'texte', p_donnees: donnees || {} });
      if (!r.data || !r.data.ok) throw new Error('envoi refusé : ' + JSON.stringify(r));
      return r.data.id;
    };
    const telephone = async (langue) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(e.message));
      await p.addInitScript(([moi, l]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: 'Benoît', color: '#E8734C' }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
        if (l) localStorage.setItem('bt_langue', l);
      }, [B, langue || '']);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok') && !!grp.canal && grp.direct === 'SUBSCRIBED' && (grp.liste || []).length === 4; } catch (e) { return false; } }, null, { timeout: 25000 });
      return { ctx, p };
    };
    const bandeau = (p) => p.evaluate(() => {
      const b = document.getElementById('bandeauMsg');
      if (!b || !b.classList.contains('vu')) return null;
      const r = b.getBoundingClientRect(), s = getComputedStyle(b);
      return { groupe: b.querySelector('b').textContent, ligne: b.querySelector('small').textContent, haut: Math.round(r.top), bas: Math.round(r.bottom), gauche: Math.round(r.left), droite: Math.round(r.right),
        largeur: innerWidth, trait: s.borderTopWidth + ' ' + s.borderBottomWidth, g: b.dataset.g, manette: !!b.querySelector('.bm-manette') };
    });
    /* (v380) Une partie de plus : celles de Taylor encore ouvertes se
       ferment d'abord (une à la fois), et cinq secondes passent (la règle
       du serveur). */
    const relancer = async (g, code) => {
      await m.sql("update public.messages set cree_le = cree_le - interval '6 seconds' where genre = 'partie'");
      const ouvertes = String(await m.sql("select coalesce(string_agg(id::text, ','), '') from public.messages where genre = 'partie' and auteur = '" + A + "' and supprime_le is null and not coalesce((donnees->>'fermee')::boolean, false)") || '').split(',').filter(Boolean);
      for (const id of ouvertes) await m.rpc(A, 'fermer_partie', { p_message: +id }).catch(() => {});
      return ecrit(A, g, '', { code }, 'partie');
    };
    const vient = (p, ms) => attendre(p, () => { const b = document.getElementById('bandeauMsg'); return !!b && b.classList.contains('vu') && +getComputedStyle(b).opacity > 0.95; }, null, ms || 4000);
    const aucun = async (p, ms) => { await p.waitForTimeout(ms || 1500); return !(await bandeau(p)); };
    const ranger = (p) => p.evaluate(() => { try { cacherBandeau(); } catch (e) {} });

    const { ctx, p } = await telephone();
    await p.waitForTimeout(600);
    /* (v335) Ce qui sonne : on note chaque son, et l'on vérifie qu'il passe
       vraiment par la carte son du jeu (des oscillateurs créés). */
    await p.evaluate(() => {
      window.__sons = []; window.__osc = 0;
      const a = window.sonMessage, b = window.sonGoutte;
      /* un son ne compte que s'il a vraiment créé ses oscillateurs (une
         rafale ne sonne qu'une fois : l'appel muet se note à part) */
      const note = (nom, f) => function(){ const n0 = window.__osc; const r = f.apply(this, arguments); __sons.push(window.__osc > n0 ? nom : nom + '(muet)'); return r; };
      window.sonMessage = note('message', a);
      window.sonGoutte = note('goutte', b);
      const P = (window.AudioContext || window.webkitAudioContext).prototype, o = P.createOscillator;
      P.createOscillator = function(){ window.__osc++; return o.apply(this, arguments); };
      audioUnlocked = true;
    });
    const sons = () => p.evaluate(() => ({ l: window.__sons.splice(0) }));

    /* 1 */
    let t0 = Date.now();
    await ecrit(A, amis, 'On joue ce soir ?');
    const v1 = await vient(p);
    const d1 = Date.now() - t0;
    const b1 = await bandeau(p);
    dit('1. Benoît sur l\'accueil : le bandeau arrive en moins de 2 s', v1 && d1 < 2000 && b1 && b1.groupe === 'Les amis' && b1.ligne === 'Taylor : On joue ce soir ?', d1 + ' ms · ' + JSON.stringify(b1));
    dit('   entier sur l\'écran, en haut, sans aucun trait', b1 && b1.haut >= 0 && b1.haut < 90 && b1.gauche >= 0 && b1.droite <= b1.largeur && b1.trait === '0px 0px', JSON.stringify(b1));
    const s1 = await sons();
    dit('   et le jeu sonne, de son propre son (v335)', s1.l.join() === 'message', JSON.stringify(s1));
    if (CAPT) await p.screenshot({ path: CAPT + '/bandeau-accueil.png' });

    /* 2 */
    const parti = await attendre(p, () => { const b = document.getElementById('bandeauMsg'); return !!b && !b.classList.contains('vu'); }, null, 8000);
    dit('2. il s\'en va de lui-même', parti);

    /* 3 */
    await ecrit(A, amis, '', { code: 'ABCD12' }, 'partie');
    await vient(p);
    const b3 = await bandeau(p);
    dit('3. une partie lancée : « Taylor a lancé une partie » — (v380) avec la manette', b3 && b3.ligne === 'Taylor a lancé une partie' && b3.groupe === 'Les amis' && b3.manette, JSON.stringify(b3));

    /* 4 */
    await p.locator('#bandeauMsg').tap();
    const ouvert = await attendre(p, (g) => state.screen === 'groupe' && grp.courant === g && !!document.getElementById('compoTexte'), amis.id, 6000);
    dit('4. le toucher ouvre la discussion du groupe', ouvert && !(await bandeau(p)), await p.evaluate(() => state.screen + ' · ' + grp.courant));
    await p.waitForTimeout(600);

    /* 5 */
    await ecrit(A, amis, 'Tu es là ?');
    await attendre(p, () => [...document.querySelectorAll('#fil .b-bulle')].some(b => /Tu es là/.test(b.textContent)), null, 5000);
    /* (deux messages à moins d'une seconde ne font qu'un son : on laisse
       passer la goutte du précédent) */
    await p.waitForTimeout(1100);
    await sons();
    await ecrit(A, amis, 'Et maintenant ?');
    await attendre(p, () => [...document.querySelectorAll('#fil .b-bulle')].some(b => /Et maintenant/.test(b.textContent)), null, 5000);
    const sansBandeau5 = await aucun(p, 1200), s5 = await sons();
    dit('5. dans cette discussion : pas de bandeau (le message est sous ses yeux), une goutte', sansBandeau5 && s5.l.join() === 'goutte', JSON.stringify(s5));

    /* 6 */
    await p.evaluate(() => retourGroupes());
    await p.waitForTimeout(500);
    await p.evaluate((id) => ouvrirGroupe(id), bible.id);
    await attendre(p, (g) => state.screen === 'groupe' && grp.courant === g, bible.id, 6000);
    await p.waitForTimeout(600);
    await ecrit(A, amis, 'Rejoins-nous dans Les amis');
    const v6 = await vient(p);
    const b6 = await bandeau(p);
    dit('6. dans la discussion d\'un AUTRE groupe : le bandeau', v6 && b6 && b6.groupe === 'Les amis', JSON.stringify(b6));
    if (CAPT) await p.screenshot({ path: CAPT + '/bandeau-autre-groupe.png' });
    await ranger(p);

    /* 7 */
    await p.evaluate(() => retourGroupes());
    await attendre(p, () => state.screen === 'groupes', null, 4000);
    await p.waitForTimeout(500);
    await p.waitForTimeout(2100);
    await sons();
    await ecrit(A, amis, 'Et sur la liste ?');
    const sansBandeau7 = await aucun(p), s7 = await sons();
    dit('7. sur la liste des groupes : pas de bandeau (elle le montre déjà), le son seul', sansBandeau7 && s7.l.join() === 'message', JSON.stringify(s7));

    /* 8 */
    await p.evaluate(() => { state.screen = 'mode'; render(); });
    await p.waitForTimeout(2200);
    await sons();
    await ecrit(A, priere, 'Prions ensemble');
    const muet = await aucun(p);
    await ecrit(A, chorale, 'Répétition jeudi');
    const sansNom = await aucun(p);
    const s8a = await sons();
    await ecrit(A, chorale, '@Benoît tu chantes avec nous ?', { mentions: [B] });
    const v8 = await vient(p);
    const b8 = await bandeau(p);
    const s8b = await sons();
    dit('8. un groupe en Muet : rien, pas un son ; en Mentions : rien, sauf quand on le nomme — et là il sonne', muet && sansNom && !s8a.l.length && v8 && b8 && b8.ligne === 'Taylor te mentionne : @Benoît tu chantes avec nous ?' && s8b.l.join() === 'message',
      'muet ' + muet + ' · mentions sans nom ' + sansNom + ' · sons ' + JSON.stringify([s8a.l, s8b.l]) + ' · ' + JSON.stringify(b8 && b8.ligne));
    await ranger(p);
    await p.waitForTimeout(500);

    /* 9 */
    await p.waitForTimeout(2200);
    await sons();
    await p.evaluate(() => { window.__ecran = state.screen; state.screen = 'play'; });
    await ecrit(A, amis, 'Pendant ta partie');
    const pendant = await aucun(p);
    const s9 = await sons();
    await p.evaluate(() => { state.screen = window.__ecran; });
    dit('9. pendant une partie : rien, pas un son', pendant && !s9.l.length, JSON.stringify(s9));

    /* 10 */
    await ecrit(A, amis, 'Encore moi');
    await vient(p);
    const r10 = await p.evaluate(async () => {
      const b = document.getElementById('bandeauMsg'), r = b.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const ev = (t, yy) => b.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: yy, pointerId: 1, pointerType: 'touch' }));
      ev('pointerdown', y); ev('pointermove', y - 15); ev('pointermove', y - 40); ev('pointerup', y - 40);
      b.click();          // le clic qui suit un glissé ne doit rien ouvrir
      await new Promise(f => setTimeout(f, 500));
      return { range: !b.classList.contains('vu'), ecran: state.screen };
    });
    dit('10. poussé vers le haut, il se range — sans ouvrir la discussion', r10.range && r10.ecran === 'mode', JSON.stringify(r10));

    /* 11 — (le direct du décor livre en une demi-seconde : on laisse partir
       ce qui est en route avant chaque « rien ».) */
    await p.waitForTimeout(1000); await ranger(p); await p.waitForTimeout(400);
    const rattrape = await p.evaluate(async ([g, a]) => {
      /* Ce que la relève apporte au retour sur l'app : sans « direct ». */
      const id = 900000 + Math.floor(Math.random() * 1000);
      await surMessageDirect({ id, groupe: g, auteur: a, genre: 'texte', texte: 'Ancien message', donnees: {}, cree_le: new Date().toISOString(), masque: false, supprime_le: null }, 'INSERT');
      await new Promise(f => setTimeout(f, 600));
      const b = document.getElementById('bandeauMsg');
      return !(b && b.classList.contains('vu'));
    }, [amis.id, A]);
    await p.evaluate((c) => { grp.bloques = grp.bloques || new Set(); grp.bloques.add(c); }, C);
    await ecrit(C, amis, 'Coucou de Chloé');
    const bloque = await aucun(p);
    const vuBloque = await bandeau(p);
    await p.evaluate((c) => grp.bloques.delete(c), C);
    dit('11. un rattrapage ne déballe rien ; quelqu\'un de bloqué non plus', rattrape && bloque, 'rattrapage ' + rattrape + ' · bloqué ' + bloque + (vuBloque ? ' · ' + vuBloque.ligne : ''));

    /* 12 */
    await p.waitForTimeout(600); await ranger(p); await p.waitForTimeout(400);
    await p.evaluate(() => { const e = document.createElement('div'); e.className = 'ach-toast show'; e.id = 'succesEssai'; e.textContent = 'Objectif débloqué'; document.body.appendChild(e); });
    await ecrit(A, amis, 'Après ton succès');
    const pendantSucces = await aucun(p, 1500);
    await p.evaluate(() => document.getElementById('succesEssai').remove());
    const apres = await vient(p, 2500);
    const b12 = await bandeau(p);
    dit('12. un succès à l\'écran : le bandeau attend qu\'il parte', pendantSucces && apres && b12 && b12.ligne === 'Taylor : Après ton succès', 'pendant ' + pendantSucces + ' · après ' + apres + ' · ' + (b12 && b12.ligne));
    await ranger(p);
    await ctx.close();

    /* 13 */
    const { ctx: c13, p: p13 } = await telephone('en');
    await p13.waitForTimeout(600);
    await m.sql("update public.messages set cree_le = cree_le - interval '6 seconds' where genre = 'partie'");
    await m.rpc(A, 'fermer_partie', { p_message: +(await m.sql("select max(id) from public.messages where genre = 'partie'")) }).catch(() => {});
    await ecrit(A, amis, '', { code: 'WXYZ34' }, 'partie');
    await vient(p13);
    const b13 = await bandeau(p13);
    if (CAPT) await p13.screenshot({ path: CAPT + '/bandeau-anglais.png' });
    dit('13. en anglais : « ' + (b13 && b13.ligne) + ' »', b13 && b13.ligne === 'Taylor started a game');
    await c13.close();

    /* ===== (v380) UNE PARTIE LANCÉE SE DIT TOUJOURS ===== */
    /* 14 — la partie de 13 a été lancée pendant que ce téléphone-ci était
       fermé : à l'ouverture, elle se dit. */
    const { ctx: c2, p: p2 } = await telephone();
    const v14 = await vient(p2, 6000);
    const b14 = await bandeau(p2);
    dit('14. l\'app fermée pendant le lancement : à l\'ouverture, il se dit', v14 && b14 && b14.ligne === 'Taylor a lancé une partie' && b14.groupe === 'Les amis' && b14.manette, JSON.stringify(b14));
    await ranger(p2);
    await p2.evaluate(() => {
      window.__sons = []; window.__osc = 0;
      const a = window.sonMessage, b = window.sonGoutte;
      const note = (nom, f) => function(){ const n0 = window.__osc; const r = f.apply(this, arguments); __sons.push(window.__osc > n0 ? nom : nom + '(muet)'); return r; };
      window.sonMessage = note('message', a); window.sonGoutte = note('goutte', b);
      const P = (window.AudioContext || window.webkitAudioContext).prototype, o = P.createOscillator;
      P.createOscillator = function(){ window.__osc++; return o.apply(this, arguments); };
      audioUnlocked = true;
    });
    const sons2 = () => p2.evaluate(() => ({ l: window.__sons.splice(0) }));
    await p2.waitForTimeout(2200); await sons2();

    /* 15 — en Mentions (la Chorale), en Muet (la Prière du soir) */
    await relancer(chorale, 'CHOR15');
    const v15 = await vient(p2);
    const b15 = await bandeau(p2), s15 = await sons2();
    await ranger(p2); await p2.waitForTimeout(2200); await sons2();
    await relancer(priere, 'PRIE15');
    const muet15 = await aucun(p2), s15b = await sons2();
    dit('15. en Mentions, une partie lancée se dit (comme « @tout le monde »), et sonne ; en Muet, rien', v15 && b15 && b15.groupe === 'Chorale' && b15.ligne === 'Taylor a lancé une partie' && s15.l.join() === 'message' && muet15 && !s15b.l.length,
      JSON.stringify({ b15: b15 && b15.groupe, s15: s15.l, muet: muet15, s15b: s15b.l }));

    /* 16 — pendant une partie solo */
    await p2.evaluate(() => startGame());
    await attendre(p2, () => state.screen === 'play' && !!document.querySelector('#app > .screen:not(.screen-exit) .question-card'), null, 6000);
    await p2.waitForTimeout(1600); await sons2();
    await relancer(amis, 'SOLO16');
    const v16 = await vient(p2);
    const b16 = await bandeau(p2), s16 = await sons2();
    const place16 = await p2.evaluate(() => {
      const scr = document.querySelector('#app > .screen:not(.screen-exit)'), b = document.getElementById('bandeauMsg').getBoundingClientRect();
      const btns = [...scr.querySelectorAll('.app-header .icon-btn')].map(x => x.getBoundingClientRect()).filter(r => r.width > 0);
      const ch = scr.querySelector('.timer-chip').getBoundingClientRect(), q = scr.querySelector('.question-card').getBoundingClientRect();
      const gauche = btns.filter(r => r.right <= innerWidth / 2), droite = btns.filter(r => r.left >= innerWidth / 2);
      return { ok: gauche.length > 0 && gauche.every(r => b.left >= r.right) && droite.every(r => b.right <= r.left) && b.bottom <= ch.top && b.bottom <= q.top,
        bandeau: [Math.round(b.left), Math.round(b.right), Math.round(b.bottom)], boutons: btns.map(r => [Math.round(r.left), Math.round(r.right)]), chrono: Math.round(ch.top) };
    });
    dit('16. pendant une partie solo : elle se dit, avec la manette, et sonne — entre la flèche et la roue, au-dessus du chrono',
      v16 && b16 && b16.ligne === 'Taylor a lancé une partie' && b16.manette && s16.l.join() === 'message' && place16.ok, JSON.stringify({ s16: s16.l, place16 }));
    await p2.locator('#bandeauMsg').tap();
    const fenetre16 = await attendre(p2, () => !!document.querySelector('.modal-veil:not(.closing) .modal-btn.ok'), null, 3000);
    const encore16 = await p2.evaluate(() => state.screen);
    await p2.locator('.modal-veil:not(.closing) .modal-btn.ok').tap();
    const ouvert16 = await attendre(p2, (g) => state.screen === 'groupe' && grp.courant === g && [...document.querySelectorAll('#fil .b-partie')].some(x => !x.classList.contains('finie')), amis.id, 8000);
    dit('    le toucher demande de quitter la partie, puis ouvre la discussion, où l\'invitation attend', fenetre16 && encore16 === 'play' && ouvert16,
      'fenêtre ' + fenetre16 + ' · avant : ' + encore16 + ' · après : ' + (await p2.evaluate(() => state.screen + ' / ' + grp.courant + ' / ' + document.querySelectorAll('#fil .b-partie').length)));
    await p2.evaluate(() => retourGroupes());
    await attendre(p2, () => state.screen === 'groupes', null, 4000);
    await p2.evaluate(() => { state.screen = 'mode'; render(); });
    await p2.waitForTimeout(2200); await sons2();

    /* 17 — pendant une partie de groupe */
    await p2.evaluate(() => { window.__ecran = state.screen; state.screen = 'online-play'; });
    await relancer(amis, 'GRP17');
    const rien17 = await aucun(p2), s17 = await sons2();
    await p2.evaluate(() => { state.screen = window.__ecran; });
    dit('17. pendant une partie de groupe : rien, pas un son', rien17 && !s17.l.length, JSON.stringify(s17));
    await m.rpc(A, 'fermer_partie', { p_message: +(await m.sql("select max(id) from public.messages where genre = 'partie'")) }).catch(() => {});
    await p2.waitForTimeout(1200);

    /* 18 — l'app cachée pendant le lancement, puis revenue */
    await p2.evaluate(() => { window.__cache = false; Object.defineProperty(document, 'hidden', { configurable: true, get(){ return window.__cache === true; } }); window.__cache = true; });
    await relancer(amis, 'CACH18');
    const cache18 = await aucun(p2, 1500);
    await p2.evaluate(() => { window.__cache = false; chargerListes(); });
    const v18 = await vient(p2, 5000);
    const b18 = await bandeau(p2);
    await ranger(p2); await p2.waitForTimeout(600);
    await p2.evaluate(() => chargerListes());
    const une18 = await aucun(p2, 2000);
    await p2.evaluate(() => { window.__cache = true; });
    const ferme = await relancer(amis, 'FERM18');
    await m.rpc(A, 'fermer_partie', { p_message: +ferme }).catch(() => {});
    await p2.waitForTimeout(1200);
    await p2.evaluate(() => { window.__cache = false; chargerListes(); });
    const ferme18 = await aucun(p2, 2500);
    dit('18. l\'app cachée pendant le lancement : au retour, il se dit — une fois ; fermé entre-temps, rien',
      cache18 && v18 && b18 && b18.ligne === 'Taylor a lancé une partie' && une18 && ferme18, JSON.stringify({ cache18, b18: b18 && b18.ligne, une18, ferme18 }));
    await c2.close();

    dit('19. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — dans le jeu, ce qui arrive ailleurs se pose en haut de l\'écran, avec le son du jeu' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
