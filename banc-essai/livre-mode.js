/* ====== UN LIVRE, DEPUIS L'ÉCRAN DU MODE (v320) ======
   « Pour jouer directement dans un livre précis, est-ce qu'il ne serait pas
     mieux de passer par le mode Solo ou le mode Groupe directement, plutôt
     que par les testaments, ce qui paraît un peu bizarre ? » (Taylor)
   La carte Testament du Solo et du Groupe reçoit la puce « Un livre », comme
   l'En ligne. Ce banc vérifie, en touchant comme un joueur :
     1. Solo : quatre puces dans la carte Testament, la dernière dit « Un livre
        · Au choix » ;
     2. la toucher ouvre la page des livres, chaque tuile avec son nombre de
        questions ;
     3. toucher la Genèse : la page se referme, la puce se remplit et porte
        « Genèse », les testaments se vident ;
     4. Commencer : TOUTES les questions viennent de la Genèse, autant que la
        durée en demande (Normale : 15) ;
     5. Courte : 9 questions, toujours de la Genèse ;
     6. un livre plus court que la partie se joue en entier, et rien d'autre ;
     7. « Quitter » ramène au Solo, le livre toujours choisi ; « Rejouer »
        rejoue ce livre ;
     8. toucher « Ancien » rend le livre : la puce redit « Un livre · Au
        choix », et la partie suivante vient de tout l'Ancien Testament ;
     9. Mode Groupe : la même puce, et la partie sur le livre ;
    10. Progression : toucher un livre dans la page d'un testament mène au
        Solo, ce livre déjà choisi — rien n'est lancé ;
    11. aucune erreur.
   Usage : node banc-essai/livre-mode.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    const cdp = await ctx.newCDPSession(p);
    /* Un vrai toucher, au centre de l'élément. */
    const toucher = async (sel, attente) => {
      const pos = await p.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
      if (!pos) return false;
      await p.waitForTimeout(250);
      const p2 = await p.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p2.x, y: p2.y }] });
      await p.waitForTimeout(60);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(attente || 900);
      return true;
    };
    const puce = () => p.evaluate(() => { const c = document.querySelector('#app > .screen:not(.screen-exit) [data-group="theme"][data-k="bk"]');
      return c ? { mot: c.querySelector('.pl-mot').textContent.trim(), sous: c.querySelector('.sub').textContent.trim(), active: c.classList.contains('active'),
        testaments: [...document.querySelectorAll('#app > .screen:not(.screen-exit) [data-group="theme"]:not([data-k="bk"]).active')].map(x => x.dataset.k) } : null; });
    const partie = () => p.evaluate(() => ({ ecran: state.screen, n: state.questions.length, livres: [...new Set(state.questions.map(q => bookOf(q)))],
      at: state.questions.every(q => qTestament(q) === 'at'), livre: state.livre || null }));

    /* ---- 1 ---- */
    await p.evaluate(() => { state.livre = null; state.themeKey = 'tout'; state.lengthKey = 'normale'; selectMode('solo'); });
    await p.waitForTimeout(1300);
    const n1 = await p.evaluate(() => document.querySelectorAll('#app > .screen:not(.screen-exit) [data-group="theme"]').length);
    const c1 = await puce();
    dit('1. Solo : quatre puces dans la carte Testament, la dernière « Un livre · Au choix »', n1 === 4 && !!c1 && c1.mot === 'Un livre' && c1.sous === 'Au choix' && !c1.active,
      n1 + ' puces, ' + (c1 ? c1.mot + ' · ' + c1.sous : 'pas de puce'));
    /* ---- 2 ---- */
    await toucher('#app > .screen:not(.screen-exit) [data-group="theme"][data-k="bk"]', 1200);
    const page = await p.evaluate(() => { const v = document.getElementById('livreVeil'); if (!v) return null;
      const t = [...v.querySelectorAll('.bk-choix')]; return { tuiles: t.length, jouables: t.filter(x => !x.disabled).length,
        genese: (t.find(x => x.dataset.i === '0') || {}).textContent }; });
    dit('2. la puce ouvre la page des livres, chaque tuile avec son nombre de questions', !!page && page.tuiles === 66 && page.jouables > 40 && /\d/.test(page.genese || ''),
      page ? page.tuiles + ' tuiles, ' + page.jouables + ' jouables, Genèse « ' + page.genese + ' »' : 'pas de page');
    /* ---- 3 ---- */
    await toucher('#livreVeil .bk-choix[data-i="0"]', 1400);
    const c3 = await puce();
    const ouverte = await p.evaluate(() => !!document.getElementById('livreVeil'));
    dit('3. toucher la Genèse : la page se referme, la puce se remplit et porte « Genèse », les testaments se vident',
      !ouverte && !!c3 && c3.active && /Gen/.test(c3.mot) && c3.sous === 'Un livre' && c3.testaments.length === 0,
      'page ' + (ouverte ? 'encore ouverte' : 'refermée') + ', puce « ' + (c3 ? c3.mot + ' · ' + c3.sous : '?') + ' », testaments choisis : ' + (c3 ? c3.testaments.join(',') || 'aucun' : '?'));
    /* ---- 4 ---- */
    await toucher('#app > .screen:not(.screen-exit) .btn-primary', 1300);
    const g4 = await partie();
    dit('4. Commencer : toutes les questions viennent de la Genèse, quinze en Normale', g4.ecran === 'play' && g4.n === 15 && g4.livres.length === 1 && g4.livres[0] === 'Genèse',
      g4.ecran + ', ' + g4.n + ' questions, livres : ' + g4.livres.join(', '));
    /* ---- 7 (Quitter, puis Rejouer depuis la fin) ---- */
    await p.evaluate(() => { stopQTimer(); retourAuMode(); });
    await p.waitForTimeout(1200);
    const c7 = await puce();
    const e7 = await p.evaluate(() => ({ ecran: state.screen, mode: state.mode }));
    await p.evaluate(() => { startGame(); state.screen = 'end'; render(); });
    await p.waitForTimeout(900);
    await p.evaluate(() => replayGame());
    await p.waitForTimeout(900);
    const g7 = await partie();
    dit('7. « Quitter » ramène au Solo, le livre choisi ; « Rejouer » rejoue ce livre',
      e7.ecran === 'setup' && e7.mode === 'solo' && !!c7 && c7.active && /Gen/.test(c7.mot) && g7.ecran === 'play' && g7.livres.length === 1 && g7.livres[0] === 'Genèse',
      e7.ecran + '/' + e7.mode + ', puce « ' + (c7 ? c7.mot : '?') + ' », rejouer : ' + g7.livres.join(', '));
    /* ---- 5 ---- */
    await p.evaluate(() => { stopQTimer(); retourAuMode(); });
    await p.waitForTimeout(1200);
    await toucher('#app > .screen:not(.screen-exit) [data-group="len"][data-k="courte"]');
    await toucher('#app > .screen:not(.screen-exit) .btn-primary', 1300);
    const g5 = await partie();
    dit('5. Courte : neuf questions, toujours de la Genèse', g5.n === 9 && g5.livres.length === 1 && g5.livres[0] === 'Genèse', g5.n + ' questions, ' + g5.livres.join(', '));
    /* ---- 6 ---- */
    const court = await p.evaluate(() => { const b = BIBLE_BOOKS.filter(x => (BOOK_TOTALS[x] || 0) > 0 && BOOK_TOTALS[x] < 9).sort((a, c) => BOOK_TOTALS[a] - BOOK_TOTALS[c]); return b.length ? { nom: b[0], n: BOOK_TOTALS[b[0]], i: BIBLE_BOOKS.indexOf(b[0]) } : null; });
    if (court) {
      await p.evaluate(() => { stopQTimer(); retourAuMode(); });
      await p.waitForTimeout(1200);
      await toucher('#app > .screen:not(.screen-exit) [data-group="theme"][data-k="bk"]', 1200);
      await toucher('#livreVeil .bk-choix[data-i="' + court.i + '"]', 1400);
      await toucher('#app > .screen:not(.screen-exit) .btn-primary', 1300);
      const g6 = await partie();
      dit('6. un livre plus court que la partie se joue en entier, et rien d\'autre', g6.n === court.n && g6.livres.length === 1 && g6.livres[0] === court.nom,
        court.nom + ' (' + court.n + ' questions) : ' + g6.n + ' jouées, livres ' + g6.livres.join(', '));
    } else dit('6. un livre plus court que la partie se joue en entier', true, 'aucun livre de moins de 9 questions dans la banque');
    /* ---- 8 ---- */
    await p.evaluate(() => { stopQTimer(); retourAuMode(); });
    await p.waitForTimeout(1200);
    await toucher('#app > .screen:not(.screen-exit) [data-group="theme"][data-k="at"]', 1300);
    const c8 = await puce();
    await toucher('#app > .screen:not(.screen-exit) .btn-primary', 1300);
    const g8 = await partie();
    dit('8. « Ancien » rend le livre : la puce redit « Un livre · Au choix », la partie vient de tout l\'Ancien Testament',
      !!c8 && !c8.active && c8.mot === 'Un livre' && c8.sous === 'Au choix' && c8.testaments.join() === 'at' && g8.at && g8.livres.length > 3 && !g8.livre,
      'puce « ' + (c8 ? c8.mot + ' · ' + c8.sous : '?') + ' », ' + g8.livres.length + ' livres, tous AT : ' + g8.at);
    /* ---- 9 ---- */
    await p.evaluate(() => { stopQTimer(); retourAuMode(); state.teams = [{ name: 'Anne' }, { name: 'Benoît' }]; state.mode = 'group'; state.screen = 'setup'; render(); });
    await p.waitForTimeout(1300);
    await toucher('#app > .screen:not(.screen-exit) [data-group="theme"][data-k="bk"]', 1200);
    await toucher('#livreVeil .bk-choix[data-i="' + (await p.evaluate(() => BIBLE_BOOKS.indexOf('Jean'))) + '"]', 1400);
    const c9 = await puce();
    await toucher('#app > .screen:not(.screen-exit) .btn-primary', 1300);
    const g9 = await partie();
    dit('9. Mode Groupe : la même puce, et la partie sur le livre', !!c9 && c9.active && c9.mot === 'Jean' && g9.ecran === 'play' && g9.livres.length === 1 && g9.livres[0] === 'Jean',
      'puce « ' + (c9 ? c9.mot : '?') + ' », ' + g9.n + ' questions, livres ' + g9.livres.join(', '));
    /* ---- 10 ---- */
    await p.evaluate(() => { stopQTimer(); state.livre = null; state.screen = 'parcours'; state.mode = null; render(); });
    await p.waitForTimeout(1200);
    await p.evaluate(() => ouvrirTestament('nt'));
    await p.waitForTimeout(1200);
    await toucher('#tstVeil .bk[onclick*="(' + (await p.evaluate(() => BIBLE_BOOKS.indexOf('Marc'))) + ')"]', 1600);
    const e10 = await p.evaluate(() => ({ ecran: state.screen, mode: state.mode, livre: state.livre, page: !!document.getElementById('tstVeil'), n: state.questions.length }));
    const c10 = await puce();
    dit('10. Progression : toucher Marc mène au Solo, Marc déjà choisi, rien n\'est lancé',
      e10.ecran === 'setup' && e10.mode === 'solo' && e10.livre === 'Marc' && !e10.page && !!c10 && c10.active && c10.mot === 'Marc',
      JSON.stringify(e10) + ', puce « ' + (c10 ? c10.mot : '?') + ' »');
    await ctx.close();
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  }
  dit('11. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un livre se choisit dans l\'écran du mode, et la partie le suit');
  process.exit(ko ? 1 : 0);
})();
