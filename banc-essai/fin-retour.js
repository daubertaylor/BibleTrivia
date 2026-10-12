/* ====== LA PARTIE FINIE, ON REVIENT DANS SON MODE (v315) ======
   « Lorsque je suis dans un mode, une fois la partie terminée, ce serait bien
     de revenir dans le mode en question plutôt que de retourner à la page
     d'accueil. »

   Chaque sortie est touchée AU DOIGT, sur son vrai bouton :
     1. Solo, fin de partie, « Quitter »      -> l'écran du Solo, avec la durée
                                                 choisie ;
     2. Groupe, fin de partie, « Quitter »    -> l'écran du Groupe, avec ses
                                                 joueurs ;
     3. Solo, EN COURS, la flèche, « Quitter » -> l'écran du Solo ;
     4. une révision partie d'« À revoir »    -> « À revoir » ;
     5. une révision partie de l'écran du Solo (« Réviser la dernière
        partie »)                             -> l'écran du Solo ;
     6. « Rejouer » une révision quand il ne reste rien à revoir -> « À
        revoir », pas l'accueil ;
     7. En ligne, fin du duel, « Quitter »    -> l'écran En ligne ;
     8. En ligne, EN COURS, la flèche, « Quitter » -> l'écran En ligne ;
   et toujours : la partie sauvegardée est effacée (une partie finie ne se
   « reprend » pas au prochain lancement), la progression n'a rien perdu, et
   aucune erreur.
   Les six premiers tournent sur l'URL donnée ; les deux derniers sur un
   salon LOCAL (hub.js, port 8245) : aucun vrai joueur n'est dérangé.
   Usage : node banc-essai/fin-retour.js [url]   (défaut : http://127.0.0.1:8099/index.html) */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends = (ms) => new Promise(r => setTimeout(r, ms));
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    /* ================= SOLO, GROUPE, À REVOIR ================= */
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(600);

    const ou = () => p.evaluate(() => ({ ecran: state.screen, mode: state.mode, revision: !!state.revision,
      equipes: (state.teams || []).map(t => t.name).join(','), duree: state.lengthKey,
      sauvee: localStorage.getItem('bt_game') !== null }));
    /* Jouer jusqu'au bout, juste ou faux, par les fonctions du jeu (la partie
       elle-même n'est pas ce qu'on mesure ici). */
    const jouer = (juste) => p.evaluate(async (juste) => {
      for (let t = 0; t < 80 && state.screen === 'play'; t++) {
        const q = currentQ(); if (!q) break;
        if (state.mode === 'group') revealAnswer();
        else {
          const faux = q.shuffledOptions.findIndex(o => o !== q.correct);
          soloAnswer(juste ? q.shuffledOptions.indexOf(q.correct) : faux);
        }
        saveState();
        nextQuestion();
        await new Promise(r => setTimeout(r, 15));
      }
      return state.screen;
    }, juste);
    const toucher = async (sel) => { await p.locator(sel).first().tap(); await p.waitForTimeout(700); };
    const ecranSolo = async () => { await p.evaluate(() => { state.mode = 'solo'; state.screen = 'setup'; render(); }); await p.waitForTimeout(600); };

    const parties0 = await p.evaluate(() => loadStats().games | 0);

    /* ---- 1. Solo, fin de partie ---- */
    await ecranSolo();
    await toucher('.chip[data-group="len"]:last-of-type');
    const duree = (await ou()).duree;
    await toucher('.btn-primary');
    const fin1 = await jouer(false);
    await toucher('.end-actions .btn-quit');
    let o = await ou();
    dit('Solo, fin de partie, « Quitter » : retour à l\'écran du Solo', fin1 === 'end' && o.ecran === 'setup' && o.mode === 'solo' && !o.revision, JSON.stringify(o));
    dit('  la durée choisie est gardée', o.duree === duree, o.duree + ' / ' + duree);
    dit('  la partie finie n\'est plus sauvegardée', !o.sauvee, '');

    /* ---- 2. Groupe, fin de partie ---- */
    await p.evaluate(() => { state.mode = 'group'; state.teams = [{ name: 'Anna' }, { name: 'Bruno' }, { name: 'Chloé' }]; state.screen = 'setup'; render(); });
    await p.waitForTimeout(600);
    await toucher('.btn-primary');
    const fin2 = await jouer(true);
    await toucher('.end-actions .btn-quit');
    o = await ou();
    dit('Groupe, fin de partie, « Quitter » : retour à l\'écran du Groupe', fin2 === 'end' && o.ecran === 'setup' && o.mode === 'group', JSON.stringify(o));
    dit('  avec ses joueurs', o.equipes === 'Anna,Bruno,Chloé', o.equipes);
    dit('  la partie finie n\'est plus sauvegardée', !o.sauvee, '');

    /* ---- 3. Solo, en cours ---- */
    await ecranSolo();
    await toucher('.btn-primary');
    await p.evaluate(() => { const q = currentQ(); soloAnswer(q.shuffledOptions.indexOf(q.correct)); saveState(); nextQuestion(); saveState(); });
    await p.waitForTimeout(400);
    const avant3 = await ou();
    await toucher('.app-header .icon-btn[onclick*="confirmLeaveGame"]');
    await toucher('#modalOk');
    o = await ou();
    dit('Solo, en cours, la flèche puis « Quitter » : retour à l\'écran du Solo', avant3.ecran === 'play' && avant3.sauvee && o.ecran === 'setup' && o.mode === 'solo', JSON.stringify(avant3) + ' -> ' + JSON.stringify(o));
    dit('  la partie abandonnée n\'est plus sauvegardée', !o.sauvee, '');

    /* ---- 4. Révision depuis « À revoir » ---- */
    const aRevoir = await p.evaluate(() => fileDeRevision().length);
    await p.evaluate(() => { ouvrirRevoir(); });
    await p.waitForTimeout(700);
    await toucher('.rv-go');
    const dedans4 = await ou();
    const fin4 = await jouer(false);
    await toucher('.end-actions .btn-quit');
    o = await ou();
    dit('révision partie d\'« À revoir » : retour à « À revoir »', aRevoir > 0 && dedans4.revision && fin4 === 'end' && o.ecran === 'revoir', aRevoir + ' à revoir ; ' + JSON.stringify(o));

    /* ---- 5. Révision depuis l'écran du Solo ---- */
    await ecranSolo();
    const bouton5 = await p.evaluate(() => !!document.querySelector('.btn-review[onclick*="startRevision"]'));
    await toucher('.btn-review[onclick*="startRevision"]');
    const dedans5 = await ou();
    const fin5 = await jouer(true);
    await toucher('.end-actions .btn-quit');
    o = await ou();
    dit('révision partie de l\'écran du Solo : retour à l\'écran du Solo', bouton5 && dedans5.revision && fin5 === 'end' && o.ecran === 'setup' && o.mode === 'solo' && !o.revision, JSON.stringify(o));

    /* ---- 6. « Rejouer » quand il ne reste rien à revoir ---- */
    await p.evaluate(() => { ouvrirRevoir(); });
    await p.waitForTimeout(700);
    await toucher('.rv-go');
    const fin6 = await jouer(false);
    /* Tout est maîtrisé entre-temps (le carnet est vidé à la main) : il n'y a
       plus rien à rejouer. */
    const carnet = await p.evaluate(() => { const c = localStorage.getItem('bt_errbook'); localStorage.setItem('bt_errbook', '[]'); return c; });
    await toucher('.end-actions .btn-replay');
    o = await ou();
    dit('« Rejouer » sans rien à revoir : retour à « À revoir », pas à l\'accueil', fin6 === 'end' && o.ecran === 'revoir', JSON.stringify(o));
    await p.evaluate((c) => { if (c) localStorage.setItem('bt_errbook', c); }, carnet);

    /* La progression n'a rien perdu : trois parties comptées de plus (Solo,
       Groupe, Solo abandonnée exclue). */
    const parties1 = await p.evaluate(() => loadStats().games | 0);
    dit('la progression n\'a rien perdu', parties1 >= parties0 + 1, parties0 + ' -> ' + parties1 + ' parties');
    dit('aucune erreur (Solo, Groupe, À revoir)', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await ctx.close();

    /* ================= EN LIGNE ================= */
    await new Promise(r => serveur.listen(8245, r));
    const ouvre = async (nom, couleur) => {
      const c = await nav.newContext({ viewport: { width: 402, height: 874 }, userAgent: AND, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      const pg = await c.newPage(); const errs = [];
      pg.on('pageerror', e => errs.push(nom + ': ' + e.message.slice(0, 110)));
      await pg.addInitScript(([n, col]) => { localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: col })); localStorage.setItem('bt_fs_hint', '1'); }, [nom, couleur]);
      await pg.goto('http://localhost:8245/');
      await pg.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      return { c, p: pg, errs };
    };
    const A = await ouvre('Taylor', '#4C86E8'), B = await ouvre('Sarah', '#E8734C');
    const duel = async () => {
      for (const j of [A, B]) await j.p.evaluate(() => { if (state.screen !== 'online') openOnline(); });
      await attends(1500);
      const code = await A.p.evaluate(() => { createRoomFlow(); return new Promise(r => setTimeout(() => r(net.code), 1600)); });
      await B.p.evaluate((k) => { joinRoom(k, false); }, code);
      await attends(2200);
      await A.p.evaluate(() => hostStart());
      await attends(2200);
      return code;
    };
    const finir = (j) => j.p.evaluate(async () => {
      for (let t = 0; t < 40 && !net.myDone; t++) { const q = net.deck[net.idx]; if (!q) break;
        onlineAnswer(Math.max(0, q.shuffledOptions.indexOf(q.correct))); await new Promise(r => setTimeout(r, 40));
        onlineNext(); await new Promise(r => setTimeout(r, 40)); }
    });
    const ouEnLigne = (j) => j.p.evaluate(() => ({ ecran: state.screen, salon: net.code || null, hall: !!net.lobby }));

    /* ---- 7. Fin du duel ---- */
    const code7 = await duel();
    await Promise.all([finir(A), finir(B)]);
    await attends(2500);
    const fin7 = await ouEnLigne(A);
    await A.p.locator('.btn-quit').first().tap();
    await attends(900);
    let e = await ouEnLigne(A);
    dit('En ligne, fin du duel, « Quitter » : retour à l\'écran En ligne', !!code7 && fin7.ecran === 'online-end' && e.ecran === 'online' && !e.salon && e.hall, JSON.stringify(fin7) + ' -> ' + JSON.stringify(e));
    await B.p.locator('.btn-quit').first().tap();
    await attends(900);

    /* ---- 8. En cours de duel ---- */
    const code8 = await duel();
    const jeu8 = await ouEnLigne(A);
    await A.p.locator('.app-header .icon-btn[onclick*="quitDuel"]').first().tap();
    await attends(600);
    await A.p.locator('#modalOk').tap();
    await attends(900);
    e = await ouEnLigne(A);
    dit('En ligne, en cours, la flèche puis « Quitter » : retour à l\'écran En ligne', !!code8 && jeu8.ecran === 'online-play' && e.ecran === 'online' && !e.salon && e.hall, JSON.stringify(jeu8) + ' -> ' + JSON.stringify(e));
    const errs = A.errs.concat(B.errs);
    dit('aucune erreur (En ligne)', errs.length === 0, errs.slice(0, 3).join(' | '));
    await A.c.close(); await B.c.close();
  } catch (err) {
    console.log('  KO  le banc s\'est arrêté : ' + (err.stack || err).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    try { serveur.close(); } catch (e) {}
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la partie finie, on revient dans son mode (Solo, Groupe, À revoir, En ligne)');
  process.exit(ko ? 1 : 0);
})();
