/* ====== LE TESTAMENT S'OUVRE EN PAGE, ET LA PROGRESSION NE BOUGE PLUS (v316) ======
   Jusqu'à la v315, ce banc s'appelait « LE PLI DOIT GLISSER, ET SON VERRE DOIT
   SUIVRE » : déplier un testament poussait la carte des Objectifs de 354 px,
   et il fallait que ce mouvement glisse (courbe de pli, départ immédiat) et
   que le verre le suive au pixel. Trois défauts réels y avaient été trouvés
   et corrigés.
   « Penses-tu qu'il serait bien de supprimer les volets déroulants et de
     mettre les testaments fixes sur une page ? »
   Le pli est parti : chaque testament ouvre maintenant SA page (voir LES
   TESTAMENTS DEVIENNENT DES PAGES). Le nom du banc reste — c'est le même
   geste, toucher un testament —, ce qu'il exige change :
     1. toucher « Ancien Testament » ouvre une page, et la Progression
        dessous NE BOUGE PAS d'un pixel, image après image ;
     2. la page range les 39 livres en 5 sections, le Nouveau Testament ses
        27 en 3 — chaque livre une seule fois, dans l'ordre de la Bible ;
     3. chaque tuile dit où l'on en est : « c/t », ou une coche quand le livre
        est maîtrisé ;
     4. toucher un livre ferme la page et mène au Solo, CE livre déjà choisi
        — depuis la v320, on ne lance plus la partie d'un coup : on la règle
        d'abord (durée, chrono), comme pour tout le reste ;
     5. « Commencer » joue ce livre et lui seul, « Rejouer » le rejoue,
        « Quitter » ramène au Solo, le livre toujours choisi ;
     6. le retour de la page rend la Progression telle qu'elle était ;
     7. aucune erreur.
   Usage : node banc-essai/pli.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, userAgent: IOS, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_progress', JSON.stringify({ books: { 'Genèse': 9, 'Exode': 3, 'Matthieu': 10, 'Jonas': 2 }, totalCorrect: 360, bestStreak: 21, flawless: 1, ach: { 'premiers-pas': 1 } }));
  });
  try {
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => { state.screen = 'parcours'; render(); });
    await p.waitForTimeout(1500);

    /* ---- 1 ---- la carte des Objectifs, image par image, pendant l'ouverture */
    const avant = await p.evaluate(() => Math.round(document.querySelector('.ach-card').getBoundingClientRect().top * 10) / 10);
    const rel = p.evaluate(() => new Promise(res => {
      const c = document.querySelector('.ach-card'); const out = []; const t0 = performance.now();
      const tic = () => { out.push(Math.round(c.getBoundingClientRect().top * 10) / 10); if (performance.now() - t0 < 900) requestAnimationFrame(tic); else res(out); };
      requestAnimationFrame(tic);
    }));
    await p.waitForTimeout(40);
    await p.locator('.tst-head').first().tap();
    const tops = await rel;
    await p.waitForTimeout(500);
    const page = await p.evaluate(() => { const v = document.getElementById('tstVeil'); return { page: !!v && v.classList.contains('page'), posee: !!v && v.classList.contains('posee'), titre: v ? (v.querySelector('.sheet-title') || {}).textContent.trim() : '' }; });
    const bouge = Math.max(...tops.map(t => Math.abs(t - avant)));
    dit('toucher « Ancien Testament » ouvre sa page', page.page && page.posee && /Ancien Testament/.test(page.titre), JSON.stringify(page));
    dit('… et la Progression dessous ne bouge pas d\'un pixel', bouge <= 0.5, tops.length + ' images, écart max ' + bouge + ' px');

    /* ---- 2 & 3 ---- */
    const at = await p.evaluate(() => {
      const v = document.getElementById('tstVeil');
      const tuiles = [...v.querySelectorAll('.tp-carte .bk')];
      return { sections: v.querySelectorAll('.tp-carte').length, noms: tuiles.map(t => t.querySelector('.bk-nm').textContent),
        ordre: BIBLE_BOOKS.slice(0, BIBLE_AT_COUNT).map(x => livreCourt(x)),
        etats: tuiles.map(t => ({ m: t.classList.contains('mastered'), pr: (t.querySelector('.bk-pr') || {}).textContent || '', coche: !!(t.querySelector('.bk-pr svg')) })) };
    });
    dit('l\'Ancien Testament : 39 livres en 5 sections, dans l\'ordre de la Bible', at.sections === 5 && JSON.stringify(at.noms) === JSON.stringify(at.ordre), at.sections + ' sections, ' + at.noms.length + ' livres');
    const lisibles = at.etats.every(e => e.m ? e.coche : /^\d+\/\d+$|^–$/.test(e.pr));
    dit('chaque tuile dit où l\'on en est (« c/t » ou une coche)', lisibles && at.etats[0].m && at.etats[0].coche && at.etats[1].pr === '3/' + at.etats[1].pr.split('/')[1], at.etats.slice(0, 3).map(e => e.m ? '✓' : e.pr).join(' '));

    /* ---- 6 ---- le retour */
    await p.locator('#tstVeil .page-tete .sheet-grab').tap();
    await p.waitForTimeout(900);
    const retour = await p.evaluate(() => ({ page: !!document.getElementById('tstVeil'), ecran: state.screen, top: Math.round(document.querySelector('.ach-card').getBoundingClientRect().top * 10) / 10,
      app: getComputedStyle(document.getElementById('app')).visibility }));
    dit('le retour rend la Progression telle qu\'elle était', !retour.page && retour.ecran === 'parcours' && Math.abs(retour.top - avant) <= 0.5 && retour.app === 'visible', JSON.stringify(retour));

    /* Le Nouveau Testament */
    await p.locator('.tst-head').nth(1).tap();
    await p.waitForTimeout(1200);
    const nt = await p.evaluate(() => { const v = document.getElementById('tstVeil'); return { sections: v.querySelectorAll('.tp-carte').length,
      noms: [...v.querySelectorAll('.tp-carte .bk .bk-nm')].map(t => t.textContent), ordre: BIBLE_BOOKS.slice(BIBLE_AT_COUNT).map(x => livreCourt(x)) }; });
    dit('le Nouveau Testament : 27 livres en 3 sections, dans l\'ordre', nt.sections === 3 && JSON.stringify(nt.noms) === JSON.stringify(nt.ordre), nt.sections + ' sections, ' + nt.noms.length + ' livres');

    /* ---- 4 ---- toucher Matthieu : le Solo, Matthieu déjà choisi (v320) */
    const i = await p.evaluate(() => BIBLE_BOOKS.indexOf('Matthieu'));
    await p.locator('#tstVeil .bk[onclick*="(' + i + ')"]').tap();
    await p.waitForTimeout(1200);
    const puceLivre = () => p.evaluate(() => { const c = document.querySelector('#app > .screen:not(.screen-exit) .puce-livre');
      return c ? { active: c.classList.contains('active'), mot: (c.querySelector('.pl-mot') || {}).textContent || '' } : null; });
    const solo = await p.evaluate(() => ({ page: !!document.getElementById('tstVeil'), ecran: state.screen, mode: state.mode, livre: state.livre,
      app: getComputedStyle(document.getElementById('app')).visibility }));
    const c4 = await puceLivre();
    dit('toucher un livre ferme la page et mène au Solo, CE livre déjà choisi', !solo.page && solo.ecran === 'setup' && solo.mode === 'solo' && solo.livre === 'Matthieu'
      && !!c4 && c4.active && /Matthieu/.test(c4.mot) && solo.app === 'visible', JSON.stringify(solo) + ', puce « ' + (c4 ? c4.mot : '?') + ' »');
    await p.locator('#app > .screen:not(.screen-exit) .btn-primary').tap();
    await p.waitForTimeout(1200);
    const jeu = await p.evaluate(() => ({ ecran: state.screen, livres: [...new Set(state.questions.map(q => bookOf(q)))], n: state.questions.length }));
    dit('« Commencer » joue ce livre, et lui seul', jeu.ecran === 'play' && jeu.livres.length === 1 && jeu.livres[0] === 'Matthieu', JSON.stringify(jeu));

    /* ---- 5 ---- Rejouer, puis Quitter */
    await p.evaluate(async () => {
      for (let t = 0; t < 20 && state.screen === 'play'; t++) { const q = currentQ(); soloAnswer(q.shuffledOptions.indexOf(q.correct)); nextQuestion(); await new Promise(r => setTimeout(r, 20)); }
    });
    await p.waitForTimeout(600);
    await p.locator('.end-actions .btn-replay').tap();
    await p.waitForTimeout(900);
    const rejoue = await p.evaluate(() => ({ ecran: state.screen, livres: [...new Set(state.questions.map(q => bookOf(q)))] }));
    dit('« Rejouer » rejoue le même livre', rejoue.ecran === 'play' && rejoue.livres.length === 1 && rejoue.livres[0] === 'Matthieu', JSON.stringify(rejoue));
    await p.locator('.app-header .icon-btn[onclick*="confirmLeaveGame"]').tap();
    await p.waitForTimeout(600);
    await p.locator('#modalOk').tap();
    await p.waitForTimeout(900);
    const fin = await p.evaluate(() => ({ ecran: state.screen, mode: state.mode, livre: state.livre }));
    const c5 = await puceLivre();
    dit('« Quitter » ramène au Solo, Matthieu toujours choisi', fin.ecran === 'setup' && fin.mode === 'solo' && fin.livre === 'Matthieu' && !!c5 && c5.active,
      JSON.stringify(fin) + ', puce « ' + (c5 ? c5.mot : '?') + ' »');

    dit('aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await b.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un testament s\'ouvre en page, et la Progression ne bouge plus');
  process.exit(ko ? 1 : 0);
})();
