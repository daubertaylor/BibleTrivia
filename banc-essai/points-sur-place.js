/* ====== BANC « CHANGER LES POINTS NE REFAIT PAS L'ÉCRAN » (v321) ======
   « Ici vérifie les animations lorsque je modifie les points. » Chaque + ou −
   de la page des résultats refaisait toute la page : le trophée rejouait son
   entrée (et se voilait de gris), les couronnes s'éteignaient puis
   retombaient, le podium et le classement sautaient d'un coup.
   Ce banc exige, sur la page des résultats du Mode Groupe :
     1. après un +, la page n'a PAS été refaite : le trophée, la carte du
        podium, chaque rangée et chaque colonne sont les mêmes éléments ;
     2. aucune entrée ne se rejoue : ni trophyIn, ni la couronne d'un joueur
        déjà premier ;
     3. ce qu'on voit, une fois les mouvements finis, est EXACTEMENT ce qu'un
        rendu complet dessinerait : ordre et contenu des rangées, marches,
        couronnes, joueurs sur chaque marche, mot et titre du haut ;
     4. pendant le mouvement, la rangée touchée passe AU-DESSUS des autres ;
     5. un − à zéro ne change rien et ne refait rien (il fait non de la tête) ;
     6. tout le monde à égalité : la carte du podium se replie puis s'en va ;
        l'égalité rompue, elle revient ;
   et pendant la partie (tableau des scores, avant la révélation) :
     7. la case touchée change sur place, les cases se rangent dans le nouvel
        ordre, et la partie sauvegardée porte le nouveau score ;
     8. aucune erreur.
   Usage : node banc-essai/points-sur-place.js [url] */
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
  await p.clock.install({ time: new Date('2026-10-14T19:40:00') });
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  try {
    await p.goto(URL);
    for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { try { return state.screen === 'mode'; } catch (e) { return false; } })) break; await p.clock.runFor(100); }
    await p.clock.pauseAt(await p.evaluate(() => Date.now()) + 500);   // l'horloge s'arrête : elle n'avance plus que par runFor
    await p.evaluate(() => {
      state.teams = [{ name: 'Taylor' }, { name: 'Joueur 2' }, { name: 'Joueur 3' }, { name: 'Joueur 4' }];
      state.timerKey = 'off'; selectMode('group'); startGame();
      state.scores = [20, 20, 10, 0]; state.screen = 'end'; render();
    });
    await p.clock.runFor(2500);

    /* ce que la page montre, et ce qu'un rendu complet montrerait */
    const etat = () => p.evaluate(() => {
      const e = document.querySelector('#app > .screen:not(.screen-exit)');
      const live = {
        haut: [...e.querySelectorAll('.end-hero .end-eyebrow, .end-hero .end-title')].map(x => x.textContent.trim()).join(' | '),
        rangees: [...e.querySelectorAll('.rank-list > .rank-row')].map(r => r.querySelector('.rank-badge').className.replace('rank-badge', '').trim() + ':' + r.querySelector('.rank-badge').textContent + ' ' + r.querySelector('.rank-name').textContent + ' ' + r.querySelector('.rank-score').textContent),
        podium: [...e.querySelectorAll('.card.podium:not(.repliee) > .podium-col')].map(c => (c.querySelector('.podium-crown').style.visibility === 'hidden' ? '' : '♛') + c.querySelector('.podium-name').textContent + ' ' + c.querySelector('.podium-score').textContent + ' ' + c.querySelector('.podium-bar').className.replace('podium-bar', '').trim() + ':' + c.querySelector('.podium-bar').textContent)
      };
      const d = document.createElement('div'); d.innerHTML = renderEndGroup();
      const neuf = {
        haut: [...d.querySelectorAll('.end-hero .end-eyebrow, .end-hero .end-title')].map(x => x.textContent.trim()).join(' | '),
        rangees: [...d.querySelectorAll('.rank-list > .rank-row')].map(r => r.querySelector('.rank-badge').className.replace('rank-badge', '').trim() + ':' + r.querySelector('.rank-badge').textContent + ' ' + r.querySelector('.rank-name').textContent + ' ' + r.querySelector('.rank-score').textContent),
        podium: [...d.querySelectorAll('.card.podium > .podium-col')].map(c => (c.querySelector('.podium-crown').style.visibility === 'hidden' ? '' : '♛') + c.querySelector('.podium-name').textContent + ' ' + c.querySelector('.podium-score').textContent + ' ' + c.querySelector('.podium-bar').className.replace('podium-bar', '').trim() + ':' + c.querySelector('.podium-bar').textContent)
      };
      return { live, neuf };
    });
    /* on marque les éléments : un rendu complet les remplacerait */
    const marquer = () => p.evaluate(() => {
      const e = document.querySelector('#app > .screen:not(.screen-exit)');
      e.__marque = 1;
      e.querySelectorAll('.end-medal, .card.podium, .rank-row, .podium-col, .podium-crown').forEach(x => { x.__marque = 1; });
    });
    const marques = () => p.evaluate(() => {
      const e = document.querySelector('#app > .screen:not(.screen-exit)');
      const t = [...e.querySelectorAll('.end-medal, .card.podium:not(.repliee), .rank-row, .podium-col, .podium-crown')];
      return { ecran: !!e.__marque, total: t.length, gardes: t.filter(x => x.__marque).length };
    });
    const toucher = async (nom, signe) => {
      const c = await p.evaluate(([nom, signe]) => {
        const row = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .rank-row')].find(r => r.querySelector('.rank-name').textContent.trim() === nom);
        const bt = row.querySelectorAll('.adj-btn')[signe === '+' ? 1 : 0]; const r = bt.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, [nom, signe]);
      await p.touchscreen.tap(c.x, c.y);
    };

    /* ---- 1, 2, 3 ---- + sur Joueur 3 : trois à égalité en tête */
    await marquer();
    await toucher('Joueur 3', '+');
    await p.clock.runFor(40);
    const rejoue = await p.evaluate(() => document.getAnimations().filter(a => /trophyIn|crownPop/.test(a.animationName || '') && a.currentTime < 120)
      .map(a => a.animationName + ' ' + ((a.effect && a.effect.target && a.effect.target.closest('.podium-col')) ? a.effect.target.closest('.podium-col').querySelector('.podium-name').textContent : '')));
    await p.clock.runFor(1200);
    const m1 = await marques();
    dit('1. un + ne refait pas la page : trophée, podium, rangées, colonnes et couronnes sont les mêmes éléments', m1.ecran && m1.gardes === m1.total && m1.total >= 12, m1.gardes + '/' + m1.total + ' gardés');
    dit('2. aucune entrée ne se rejoue — seule la couronne GAGNÉE tombe (Joueur 3)', rejoue.length === 1 && /crownPop.*Joueur 3/.test(rejoue[0]), JSON.stringify(rejoue));
    let e1 = await etat();
    dit('3. une fois posé, l\'écran est exactement celui d\'un rendu complet (égalité à trois)', JSON.stringify(e1.live) === JSON.stringify(e1.neuf), JSON.stringify(e1.live.podium));

    /* ---- 4 ---- + encore : Joueur 3 passe devant ; pendant le glissement, sa rangée est au-dessus */
    await toucher('Joueur 3', '+');
    await p.clock.runFor(120);
    const dessus = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .rank-row')];
      const j3 = rows.find(r => r.querySelector('.rank-name').textContent.trim() === 'Joueur 3');
      const z = (r) => { const v = getComputedStyle(r).zIndex; return v === 'auto' ? 0 : +v; };
      return { j3: z(j3), autres: Math.max(...rows.filter(r => r !== j3).map(z)), bouge: getComputedStyle(j3).transform !== 'none' };
    });
    dit('4. la rangée touchée glisse AU-DESSUS des autres', dessus.bouge && dessus.j3 > dessus.autres, JSON.stringify(dessus));
    await p.clock.runFor(1200);
    const e2 = await etat();
    dit('   … et l\'écran posé est celui d\'un rendu complet (Joueur 3 vainqueur)', JSON.stringify(e2.live) === JSON.stringify(e2.neuf) && /Vainqueur \| Joueur 3/.test(e2.live.haut), e2.live.haut + ' · ' + JSON.stringify(e2.live.podium));

    /* ---- 5 ---- − sur Joueur 4, déjà à zéro */
    await marquer();
    await toucher('Joueur 4', '−');
    await p.clock.runFor(60);
    const non = await p.evaluate(() => { const row = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .rank-row')].find(r => r.querySelector('.rank-name').textContent.trim() === 'Joueur 4');
      return { cls: row.querySelector('.rank-score').className, sc: state.scores[3] }; });
    await p.clock.runFor(600);
    const m5 = await marques();
    dit('5. un − à zéro ne change rien, ne refait rien, et fait non de la tête', non.sc === 0 && /\bnon\b/.test(non.cls) && m5.gardes === m5.total, JSON.stringify(non) + ', ' + m5.gardes + '/' + m5.total);

    /* ---- 6 ---- tout le monde à égalité (Joueur 4 → 30, Taylor → 30, Joueur 2 → 30) : la carte se replie ; puis l'égalité se rompt */
    for (const [nom, n] of [['Joueur 4', 3], ['Taylor', 1], ['Joueur 2', 1]]) for (let k = 0; k < n; k++) { await toucher(nom, '+'); await p.clock.runFor(700); }
    await p.clock.runFor(800);
    const plie = await p.evaluate(() => ({ pod: document.querySelectorAll('#app > .screen:not(.screen-exit) .card.podium').length, scores: state.scores.join(',') }));
    const e6 = await etat();
    dit('6. tout le monde à égalité : la carte du podium se replie et s\'en va', plie.pod === 0 && JSON.stringify(e6.live) === JSON.stringify(e6.neuf), JSON.stringify(plie));
    await toucher('Taylor', '+');
    await p.clock.runFor(1300);
    const deplie = await p.evaluate(() => document.querySelectorAll('#app > .screen:not(.screen-exit) .card.podium').length);
    const e6b = await etat();
    dit('   … l\'égalité rompue, elle revient, juste', deplie === 1 && JSON.stringify(e6b.live) === JSON.stringify(e6b.neuf), JSON.stringify(e6b.live.podium));

    /* ---- 7 ---- pendant la partie */
    await p.evaluate(() => { state.scores = [20, 10, 10, 0]; state.currentIndex = 0; state.revealed = false; state.screen = 'play'; render(); });
    await p.clock.runFor(1500);
    await p.evaluate(() => { const e = document.querySelector('#app > .screen:not(.screen-exit)'); e.__marque = 1; e.querySelectorAll('.score-pane').forEach(x => { x.__marque = 1; }); });
    for (let k = 0; k < 3; k++) {
      const c = await p.evaluate(() => { const b = document.querySelector('#app > .screen:not(.screen-exit) .score-pane[data-t="3"]').querySelectorAll('.adj-btn')[1]; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.touchscreen.tap(c.x, c.y); await p.clock.runFor(700);
    }
    const jeu = await p.evaluate(() => {
      const e = document.querySelector('#app > .screen:not(.screen-exit)');
      const cases = [...e.querySelectorAll('.score-strip > .score-pane')];
      let sauve = null; try { sauve = JSON.parse(localStorage.getItem('bt_game') || 'null'); } catch (x) {}
      return { garde: !!e.__marque && cases.every(c => c.__marque), ordre: cases.map(c => c.dataset.t + ':' + c.querySelector('.sc').textContent).join(' '),
        voulu: rankedTeamIndices().map(i => i + ':' + state.scores[i]).join(' '), scores: state.scores.join(','), sauve: sauve && sauve.scores ? sauve.scores.join(',') : '?' };
    });
    dit('7. pendant la partie : la case change sur place, les cases se rangent, la partie sauvegardée suit', jeu.garde && jeu.ordre === jeu.voulu && jeu.scores === '20,10,10,30' && jeu.sauve === jeu.scores, JSON.stringify(jeu));

    dit('8. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await b.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — changer les points ne refait plus l\'écran : tout glisse, rien ne se rejoue');
  process.exit(ko ? 1 : 0);
})();
