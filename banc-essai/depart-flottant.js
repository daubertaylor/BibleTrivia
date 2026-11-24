/* ====== BANC « QUELQU'UN S'EN VA : UN AVIS PAR-DESSUS, RIEN NE BOUGE » (v380) ======
   « Dans une partie, lorsqu'une personne termine ou quitte la partie, je
     veux que l'animation soit agréable et pas que ça fasse un décalage
     direct dans notre partie : ça nous trouble en pleine partie. »
   « X a quitté la partie » était une carte posée DANS l'écran : les scores,
   la question et les réponses descendaient à son arrivée, et remontaient six
   secondes plus tard. L'avis vient maintenant par-dessus. Sur trois iPhone :
     1. l'adversaire s'en va : l'avis arrive (moins de 0,3 s), posé en haut
        par-dessus l'écran (position fixe), « Duel » et « Sam a quitté la
        partie. », le visage de Sam ;
     2. il tient entre la flèche et la roue de l'en-tête (on peut toujours
        quitter), au-dessus de la ligne des scores ;
     3. RIEN NE BOUGE dans l'écran — scores, chips, question, réponses —, à
        aucune image, pendant tout son passage (arrivée, séjour, départ) ;
     4. il s'en va de lui-même (vers 6 s) ; la ligne des scores dit
        toujours « Sam · a quitté » ;
     5. le toucher le range tout de suite ;
     6. à plusieurs, tous partis : « Les autres joueurs ont quitté la
        partie. », une silhouette ;
     7. mes questions finies : pas d'avis, l'écran de fin le dit ;
     8. quitter la partie emporte l'avis ;
     9. en anglais : « Sam has left the game. » ;
    10. aucune erreur.
   Usage : node banc-essai/depart-flottant.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const IPHONES = [['iPhone 16 Pro', 402, 874], ['iPhone 15', 393, 852], ['iPhone 13 mini', 375, 812]];
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };
const DUEL = "net.oppPresent=true; net.opp={ id:'b', name:'Sam', color:'#E8574C', vu:Date.now() }; net.joueurs={ b:net.opp }; net.deck = seededDeck(12345, '9', null); net.timerKey='30'; net.score=50; net.oppScore=30; net.oppGone=false; net.idx=0; net.myDone=false; net.selected=null; net.revealed=false; net.isHost=false;";
const SELS = ['.duel-scorebar', '.play-meta', '.progress-track', '.question-card', '.options-grid'];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  const page = async (l, w, h) => {
    const ctx = await nav.newContext({ viewport: { width: w || 393, height: h || 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await ctx.route('**/*.supabase.co/**', r => r.abort());
    await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript((lg) => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Toi', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); if (lg) localStorage.setItem('bt_langue', lg); }, l || '');
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    return { ctx, p };
  };
  const duel = async (p, extra) => {
    await p.evaluate(([D, X]) => { eval(D); if (X) eval(X); state.screen = 'online-play'; render(); }, [DUEL, extra || '']);
    await p.waitForTimeout(1400);
  };
  /* Le guetteur : chaque image, l'écart de chaque morceau de l'écran à sa place de départ, et la vie de l'avis. */
  const guetter = (p, ms) => p.evaluate(([S, ms]) => new Promise((fin) => {
    const scr = () => document.querySelector('#app > .screen:not(.screen-exit)');
    const ref = S.map(s => { const e = scr().querySelector(s); return e ? e.getBoundingClientRect().top : null; });
    let pire = 0, quoi = '', vu = null, parti = null, images = 0; const t0 = performance.now();
    const tic = () => {
      images++;
      S.forEach((s, i) => { const e = scr() && scr().querySelector(s); if (e && ref[i] != null) { const d = Math.abs(e.getBoundingClientRect().top - ref[i]); if (d > pire) { pire = d; quoi = s; } } });
      const b = document.getElementById('avisDepart');
      if (b && b.classList.contains('vu') && vu == null) vu = Math.round(performance.now() - t0);
      if (b && vu != null && !b.classList.contains('vu') && parti == null) parti = Math.round(performance.now() - t0);
      if (performance.now() - t0 < ms) requestAnimationFrame(tic); else fin({ pire: Math.round(pire * 100) / 100, quoi, vu, parti, images, morceaux: ref.filter(x => x != null).length });
    };
    requestAnimationFrame(tic);
    markOppGone();
  }), [SELS, ms]);
  const avis = (p) => p.evaluate(() => {
    const b = document.getElementById('avisDepart'); if (!b) return null;
    const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const scr = document.querySelector('#app > .screen:not(.screen-exit)');
    const btns = [...scr.querySelectorAll('.app-header .icon-btn')].map(R).filter(r => r.r > r.l);
    const sb = scr.querySelector('.duel-scorebar');
    return { vu: b.classList.contains('vu'), pos: getComputedStyle(b).position, titre: (b.querySelector('b') || {}).textContent, ligne: (b.querySelector('small') || {}).textContent,
      visage: !!b.querySelector('.avatar'), silhouette: !!b.querySelector('.ad-ico'), r: R(b), btns, scores: sb ? R(sb) : null, op: +getComputedStyle(b).opacity };
  });

  try {
    /* 1 à 5, sur trois iPhone */
    for (const [nom, w, h] of IPHONES) {
      const { ctx, p } = await page('', w, h);
      await duel(p);
      const g = await guetter(p, 7600);
      const a = await avis(p);
      dit(nom + ' · 1. l\'avis arrive par-dessus (' + g.vu + ' ms), « Duel » / « Sam a quitté la partie. », le visage de Sam', g.vu != null && g.vu < 300 && a && a.pos === 'fixed' && a.titre === 'Duel' && a.ligne === 'Sam a quitté la partie.' && a.visage, JSON.stringify(a && { titre: a.titre, ligne: a.ligne, pos: a.pos }));
      /* sa place, mesurée pendant qu'il est là : on le rejoue */
      await p.evaluate(() => { net.oppGone = false; }); await p.evaluate(() => markOppGone()); await p.waitForTimeout(700);
      const a2 = await avis(p);
      const gauche = a2 ? a2.btns.filter(b => b.r <= w / 2) : [], droite = a2 ? a2.btns.filter(b => b.l >= w / 2) : [];
      const libre = !!a2 && gauche.every(b => a2.r.l >= b.r) && droite.every(b => a2.r.r <= b.l) && gauche.length >= 1;
      dit(nom + ' · 2. il tient entre la flèche et la roue, au-dessus des scores', libre && !!a2.scores && a2.r.b <= a2.scores.t + 0.5,
        a2 ? JSON.stringify({ avis: [Math.round(a2.r.l), Math.round(a2.r.r), Math.round(a2.r.b)], boutons: a2.btns.map(b => [Math.round(b.l), Math.round(b.r)]), scores: a2.scores && Math.round(a2.scores.t) }) : 'pas d\'avis');
      dit(nom + ' · 3. rien ne bouge dans l\'écran, à aucune image (' + g.images + ' images, ' + g.morceaux + ' morceaux suivis)', g.pire < 0.5 && g.morceaux === SELS.length && g.images > 100, 'pire ' + g.pire + ' px' + (g.quoi ? ' (' + g.quoi + ')' : ''));
      const barre = await p.evaluate(() => (document.querySelector('#app > .screen:not(.screen-exit) .ds-side:not(.me) .ds-name') || {}).textContent);
      dit(nom + ' · 4. il s\'en va de lui-même (' + g.parti + ' ms) ; la ligne des scores dit « ' + barre + ' »', g.parti != null && g.parti > 5500 && g.parti < 6800 && barre === 'Sam · a quitté');
      /* 5. le toucher */
      const t = await p.evaluate(async () => {
        const b = document.getElementById('avisDepart'); if (!b) return { range: false, ecran: state.screen, rien: true };
        const r = b.getBoundingClientRect();
        const ev = (k) => b.dispatchEvent(new PointerEvent(k, { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 3, pointerType: 'touch' }));
        ev('pointerdown'); ev('pointerup');
        await new Promise(f => setTimeout(f, 400));
        return { range: !b.classList.contains('vu'), ecran: state.screen };
      });
      dit(nom + ' · 5. le toucher le range tout de suite', t.range && t.ecran === 'online-play', JSON.stringify(t));
      await ctx.close();
    }

    const { ctx, p } = await page();
    /* 6. à plusieurs */
    await duel(p, "net.joueurs={ b:{ id:'b', name:'Sam', color:'#E8574C', vu:Date.now() }, c:{ id:'c', name:'Lee', color:'#4CE88A', vu:Date.now() } }; net.opp = net.joueurs.b;");
    await p.evaluate(() => markOppGone()); await p.waitForTimeout(700);
    const a6 = await avis(p);
    dit('6. à plusieurs, tous partis : « ' + (a6 && a6.ligne) + ' », une silhouette', a6 && a6.vu && a6.ligne === 'Les autres joueurs ont quitté la partie.' && a6.silhouette && !a6.visage);
    /* 8. quitter emporte l'avis */
    await p.evaluate(() => { state.screen = 'online'; render(); }); await p.waitForTimeout(600);
    const a8 = await avis(p);
    dit('8. quitter la partie emporte l\'avis', a8 && !a8.vu, JSON.stringify(a8 && { vu: a8.vu }));
    /* 7. mes questions finies */
    await p.evaluate(() => { const b = document.getElementById('avisDepart'); if (b) b.remove(); });
    await duel(p, 'net.idx = net.deck.length; net.myDone = true;');
    await p.evaluate(() => markOppGone()); await p.waitForTimeout(700);
    const a7 = await avis(p), e7 = await p.evaluate(() => state.screen);
    dit('7. mes questions finies : pas d\'avis, l\'écran de fin (' + e7 + ')', !(a7 && a7.vu) && e7 === 'online-end');
    await ctx.close();

    /* 9. en anglais */
    const { ctx: c9, p: p9 } = await page('en');
    await duel(p9);
    await p9.evaluate(() => markOppGone()); await p9.waitForTimeout(700);
    const a9 = await avis(p9);
    dit('9. en anglais : « ' + (a9 && a9.ligne) + ' »', a9 && a9.vu && a9.ligne === 'Sam has left the game.');
    await c9.close();

    dit('10. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko === 0 ? '\n  OK — quelqu\'un s\'en va : l\'avis passe par-dessus, et la partie ne bouge pas d\'un pixel' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
