/* ====== BANC « RIEN N'APPARAÎT APRÈS » (v361) ======
   « Les transitions sont parfaites, juste certains affichages apparaissent
     trop tard. » Quand l'écran de jeu glissait, la question et ses quatre
   réponses faisaient EN PLUS leur propre entrée, en partant invisibles, en
   cascade, sur le ressort (qui part de l'arrêt) : à mi-glissement, la
   troisième et la quatrième réponse étaient encore à 0 %.
   Ce banc suit, image par image, l'opacité RÉELLE (celle de l'élément et de
   tous ses parents) et le décalage propre de chaque pièce. Il exige :
     1. la partie commence : pendant tout le glissement, la question et les
        réponses sont entières (100 %) et à leur place dans l'écran ;
     2. la question suivante (sur place) : la carte et les quatre réponses
        apparaissent ENSEMBLE (écart ≤ 3 %), à moitié ~60 ms après leur
        première image, entières avant 200 ms ;
     3. la réponse révélée : « Le savais-tu ? » et « Question suivante » à
        moitié ~60 ms après leur première image ;
     4. un jeu commence (onglet Jeux) : la consigne et la zone de jeu sont
        entières pendant tout le glissement ;
     5. les résultats solo : la médaille est entière, à sa taille, pendant
        tout le glissement ;
     6. les résultats du Mode Groupe : les marches du podium sont sur leur
        socle et la couronne entière, dès la première image ;
     7. la colombe de l'Accueil est décodée d'avance (et peinte
        « decoding=sync »), la photo de profil aussi ;
     8. aucune erreur.
   Usage : node banc-essai/apparitions.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
    localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() }));
    /* Le jour est déjà joué : pas de fête de la flamme au milieu du banc. */
    { const d = new Date(), z = n => String(n).padStart(2, '0'), k = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
      localStorage.setItem('bt_daily', JSON.stringify({ last: k, streak: 1, score: 0, total: 0, jours: [k], geles: [], palier: 0 })); }
  });
  await p.goto(URL);
  const pret = () => p.waitForFunction(() => { try { return state.screen === 'mode' && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 25000 });
  await pret();
  /* Une photo de profil, comme celles du jeu. */
  await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#3a6'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#fc4'; g.beginPath(); g.arc(256, 220, 120, 0, 7); g.fill();
    localStorage.setItem('bt_photo', c.toDataURL('image/jpeg', 0.8));
  });
  await p.reload(); await pret();
  await p.waitForTimeout(1200);

  /* Le film d'un geste : pour chaque image, la translation de l'écran qui
     arrive, et pour chaque pièce son opacité réelle et son décalage propre
     (sa place moins celle de son écran, comparée à sa place une fois posé). */
  const filmer = (geste, sel, duree) => p.evaluate(({ geste, sel, duree }) => new Promise(res => {
    const t0 = performance.now();
    new Function(geste)();
    const pp = typeof passage !== 'undefined' ? passage : null;
    const opa = (el) => { let o = 1; for (let x = el; x && x !== document.documentElement; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return o; };
    const l = [];
    const tic = () => {
      const t = performance.now() - t0;
      const e = (pp && pp.entrant && pp.entrant.isConnected) ? pp.entrant : document.querySelector('#app > .screen:not(.screen-exit)');
      const v = e ? getComputedStyle(e).translate : 'none';
      const x = (!v || v === 'none') ? 0 : parseFloat(v);
      const re = e ? e.getBoundingClientRect() : { left: 0, top: 0 };
      const pieces = e ? [...e.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(); return { o: opa(el), dx: r.left - re.left, dy: r.top - re.top, w: r.width }; }) : [];
      l.push({ t, x, pieces });
      if (t < duree) requestAnimationFrame(tic); else res(l);
    };
    requestAnimationFrame(tic);
  }), { geste, sel, duree });
  /* Pendant le glissement (l'écran pas encore posé), tout est-il entier et
     à sa place ? On compare chaque image à la dernière (posée). */
  const entierPendant = (film) => {
    const fin = film[film.length - 1];
    let pire = 1, ecart = 0, images = 0;
    for (const im of film) {
      if (Math.abs(im.x) < 0.5 || !im.pieces.length) continue;
      images++;
      im.pieces.forEach((q, i) => { pire = Math.min(pire, q.o); const f = fin.pieces[i];
        if (f) ecart = Math.max(ecart, Math.abs(q.dy - f.dy), Math.abs(q.w - f.w)); });
    }
    return { images, pire: Math.round(pire * 1000) / 10, ecart: Math.round(ecart * 10) / 10 };
  };

  /* ---- 1 ---- la partie commence */
  await p.evaluate(() => { state.mode = 'solo'; state.screen = 'setup'; render(); });
  await p.waitForTimeout(1100);
  const f1 = await filmer('startGame()', '.question-card, .options-grid > .option-btn', 900);
  const r1 = entierPendant(f1);
  dit('1. la partie commence : la question et les réponses sont entières et à leur place pendant tout le glissement',
    r1.images >= 8 && r1.pire >= 99.9 && r1.ecart <= 0.5, r1.images + ' images en glissement, opacité la plus basse ' + r1.pire + ' %, plus grand décalage propre ' + r1.ecart + ' px');

  /* ---- 3 ---- la réponse révélée (avant 2 : on répond d'abord) */
  await p.waitForTimeout(400);
  const f3 = await filmer('soloAnswer(0)', '.fact-card, .btn-next', 500);
  /* On compte depuis la PREMIÈRE IMAGE où elles existent : ce qui précède,
     c'est le temps de faire l'écran, pas celui de son apparition. */
  const n3 = (f3.find(im => im.pieces.length) || { t: 0 }).t;
  const a60 = f3.find(im => im.t >= n3 + 55 && im.pieces.length) || {};
  const o3 = (a60.pieces || []).map(q => Math.round(q.o * 100));
  dit('3. la réponse révélée : « Le savais-tu ? » et « Question suivante » à moitié ~60 ms après leur première image',
    o3.length === 2 && o3.every(o => o >= 45), 'première image à ' + Math.round(n3) + ' ms ; ' + Math.round((a60.t || 0) - n3) + ' ms plus tard : ' + o3.join(' % / ') + ' %');

  /* ---- 2 ---- la question suivante */
  await p.waitForTimeout(700);
  const f2 = await filmer('nextQuestion()', '.question-card, .options-grid > .option-btn', 500);
  const n2 = (f2.find(im => im.pieces.length) || { t: 0 }).t;
  const i60 = f2.find(im => im.t >= n2 + 55 && im.pieces.length) || { pieces: [] };
  const i200 = f2.find(im => im.t >= n2 + 190 && im.pieces.length) || { pieces: [] };
  let ecart2 = 0;
  for (const im of f2) { if (im.pieces.length < 2) continue; const os = im.pieces.slice(1).map(q => q.o); ecart2 = Math.max(ecart2, Math.max(...os) - Math.min(...os)); }
  const o60 = i60.pieces.map(q => Math.round(q.o * 100)), o200 = i200.pieces.map(q => Math.round(q.o * 100));
  dit('2. la question suivante : la carte et les quatre réponses ensemble, à moitié ~60 ms après leur première image, entières avant 200 ms',
    o60.length === 5 && o60.every(o => o >= 45) && o200.every(o => o >= 95) && ecart2 <= 0.03,
    '+' + Math.round((i60.t || 0) - n2) + ' ms : ' + o60.join('/') + ' % ; +' + Math.round((i200.t || 0) - n2) + ' ms : ' + o200.join('/') + ' % ; écart entre réponses ' + Math.round(ecart2 * 100) + ' %');

  /* ---- 5 ---- les résultats solo */
  await p.waitForTimeout(700);
  await p.evaluate(() => { state.currentIndex = state.questions.length - 1; state.revealed = false; render(); });
  await p.waitForTimeout(700);
  await p.evaluate(() => soloAnswer(0));
  await p.waitForTimeout(800);
  const f5 = await filmer('nextQuestion()', '.end-medal, .end-trophy', 900);
  const r5 = entierPendant(f5);
  const echelle5 = await p.evaluate(() => { const m = document.querySelector('#app > .screen:not(.screen-exit) .end-medal, #app > .screen:not(.screen-exit) .end-trophy'); return m ? getComputedStyle(m).animationName : null; });
  dit('5. les résultats solo : la médaille est entière, à sa taille, pendant tout le glissement',
    r5.images >= 8 && r5.pire >= 99.9 && r5.ecart <= 0.5, r5.images + ' images en glissement, opacité la plus basse ' + r5.pire + ' %, plus grand écart ' + r5.ecart + ' px, animation ' + echelle5);
  await p.evaluate(() => { try { stopQTimer(); } catch (e) {} try { clearSavedGame(); } catch (e) {} document.querySelectorAll('.confetti, #confetti, canvas.confetti').forEach(c => c.remove()); });

  /* ---- 6 ---- les résultats du Mode Groupe */
  await p.evaluate(() => { state.mode = 'group'; state.teams = [{ name: 'Taylor' }, { name: 'Ana' }, { name: 'Léo' }]; startGame(); state.screen = 'play'; render(); });
  await p.waitForTimeout(1200);
  const f6 = await p.evaluate(() => new Promise(res => {
    state.scores = [120, 80, 40]; state.screen = 'end'; render();
    const pp = passage; const l = []; const t0 = performance.now();
    const opa = (el) => { let o = 1; for (let x = el; x && x !== document.documentElement; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return o; };
    const tic = () => {
      const e = pp && pp.entrant;
      const v = e ? getComputedStyle(e).translate : 'none';
      const x = (!v || v === 'none') ? 0 : parseFloat(v);
      const bars = e ? [...e.querySelectorAll('.podium-bar')].map(b => b.getBoundingClientRect().top - b.parentElement.getBoundingClientRect().top) : [];
      const k = e ? e.querySelector('.podium-crown:not([style*="hidden"])') : null;
      l.push({ x, bars, couronne: k ? opa(k) : null });
      if (performance.now() - t0 < 900) requestAnimationFrame(tic); else res(l);
    };
    requestAnimationFrame(tic);
  }));
  const g6 = f6.filter(im => Math.abs(im.x) >= 0.5 && im.bars.length);
  const marche = g6.length ? Math.max(...g6.flatMap(im => im.bars.map(Math.abs))) : 99;
  const couronne = g6.length ? Math.min(...g6.map(im => im.couronne === null ? 0 : im.couronne)) : 0;
  dit('6. les résultats du Mode Groupe : les marches sont sur leur socle et la couronne entière, dès la première image',
    g6.length >= 8 && marche <= 0.5 && couronne >= 0.999, g6.length + ' images en glissement, marche la plus loin de son socle ' + marche.toFixed(1) + ' px, couronne au plus bas ' + Math.round(couronne * 100) + ' %');
  await p.evaluate(() => { try { stopQTimer(); } catch (e) {} try { clearSavedGame(); } catch (e) {} goToModeSelect(); });
  await p.waitForTimeout(1000);

  /* ---- 4 ---- un jeu commence */
  await p.evaluate(() => allerOnglet('jeux'));
  await p.waitForTimeout(1100);
  const f4 = await filmer("lancerJeu('erreur')", '.question-card, .jx-zone', 900);
  const r4 = entierPendant(f4);
  dit('4. un jeu commence : la consigne et la zone de jeu sont entières et à leur place pendant tout le glissement',
    r4.images >= 8 && r4.pire >= 99.9 && r4.ecart <= 0.5, r4.images + ' images en glissement, opacité la plus basse ' + r4.pire + ' %, plus grand décalage propre ' + r4.ecart + ' px');

  /* ---- 7 ---- les images prêtes */
  const im = await p.evaluate(async () => {
    const pretes = typeof IMAGES_PRETES !== 'undefined' ? IMAGES_PRETES : null;
    const col = pretes && pretes.colombe, ph = pretes && pretes.photo;
    if (col && col.decode) { try { await col.decode(); } catch (e) {} }
    return { colombe: !!(col && col.complete && col.naturalWidth > 0 && col._src === DOVE_ICON),
             photo: !!(ph && ph.complete && ph.naturalWidth > 0 && ph._src === photoProfil()) };
  });
  await p.evaluate(() => goToModeSelect());
  await p.waitForTimeout(1100);
  const sync = await p.evaluate(() => { const i = document.querySelector('#app > .screen:not(.screen-exit) img.hero-icon'); return i ? i.getAttribute('decoding') : null; });
  dit('7. la colombe et la photo de profil sont décodées d\'avance, la colombe peinte « decoding=sync »',
    im.colombe && im.photo && sync === 'sync', 'colombe ' + im.colombe + ', photo ' + im.photo + ', decoding ' + sync);

  dit('8. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — rien n\'apparaît après : ce qui arrive avec son écran est là, ce qui apparaît sur place apparaît vite');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
