/* ====== BANC « LE ROUGE ARRIVE SANS PASSER PAR LE GRIS » (v321) ======
   « Lorsqu'il y a le remplissage rouge qui s'effectue, je veux qu'il n'y ait
     pas le petit effet grisé au moment où l'animation se fait. »
   Le libellé d'une puce qu'on choisit doit passer de l'encre au blanc D'UN
   COUP, à l'instant où l'encre rouge le couvre (delaiLibelle). La puce est
   encore enfoncée (:active) quand le clic l'allume : la règle d'appui des
   boutons lui imposait une transition de 90 ms, et le libellé fondait du
   sombre au blanc en passant par le gris (rgb(166,164,161), filmé).
   Ce banc touche de VRAIS doigts (événements tactiles) sur une puce de
   chacune des trois rangées du Solo (Durée, Chrono, Testament), fige les
   animations et les avance d'une image (1/60 s) à la fois. À chaque image,
   le libellé de la puce choisie doit être SOIT l'encre, SOIT le blanc —
   jamais une couleur de passage. Sur iPhone et sur Android.
   Usage : node banc-essai/remplissage-net.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL || 'http://127.0.0.1:8099/index.html';
const UAS = {
  iPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  Android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
};
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

async function telephone(nav, ua) {
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.clock.install({ time: new Date('2026-10-14T19:40:00') });
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  await p.goto(URL);
  for (let k = 0; k < 300; k++) { if (await p.evaluate(() => { try { return state.screen === 'mode'; } catch (e) { return false; } })) break; await p.clock.runFor(100); }
  return { ctx, p, errs };
}
/* Les animations figées, avancées à la main : l'image n est exactement le jeu au temps n/60. */
async function figer(p, cdp) {
  await p.clock.pauseAt(await p.evaluate(() => Date.now()) + 500);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await p.evaluate(() => { window.__vus = new WeakMap(); window.__tv = 0; });
}
async function image(p) {
  await p.clock.runFor(1000 / 60);
  await p.evaluate(() => {
    window.__tv += 1000 / 60;
    for (const a of document.getAnimations()) {
      if (!window.__vus.has(a)) window.__vus.set(a, window.__tv - (a.currentTime || 0));
      try { a.currentTime = window.__tv - window.__vus.get(a); } catch (e) {}
    }
  });
}
/* Toucher une puce, puis relever la couleur de son libellé image par image. */
async function relever(p, cdp, sel) {
  const c = await p.evaluate((sel) => { const b = document.querySelector(sel); const r = b.getBoundingClientRect(); window.__puce = b;
    return { x: r.left + r.width * 0.3, y: r.top + r.height / 2 }; }, sel);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [c] });
  await image(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const vus = [];
  for (let k = 0; k < 40; k++) {
    await image(p);
    vus.push(await p.evaluate(() => { const b = window.__puce; const t = b.querySelector('.pl-mot, .sub') ? b : b;
      return { c: getComputedStyle(b).color, s: (b.querySelector('.sub') ? getComputedStyle(b.querySelector('.sub')).color : '') }; }));
  }
  return vus;
}
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const encre = (v) => v.every(x => x < 70);
const blanc = (v) => v.every(x => x > 245);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    for (const [nom, ua] of Object.entries(UAS)) {
      const { ctx, p, errs } = await telephone(nav, ua);
      await p.evaluate(() => selectMode('solo'));
      await p.clock.runFor(2000);
      const cdp = await ctx.newCDPSession(p);
      await figer(p, cdp);
      const ICI = '#app > .screen:not(.screen-exit) ';
      const cibles = [['Durée « Courte »', ICI + '.chip[data-group="len"][data-k="courte"]'], ['Chrono « 15 s »', ICI + '.chip[data-group="tmr"][data-k="15"]'], ['Testament « Ancien »', ICI + '.chip[data-group="theme"][data-k="at"]']];
      for (const [quoi, sel] of cibles) {
        const existe = await p.evaluate((sel) => !!document.querySelector(sel), sel);
        if (!existe) { dit(nom + ' · ' + quoi + ' : la puce existe', false, sel); continue; }
        const vus = await relever(p, cdp, sel);
        const passages = vus.filter(v => [v.c, v.s].filter(Boolean).some(s => { const c = rgb(s); return !encre(c) && !blanc(c); }));
        const fin = vus[vus.length - 1];
        dit(nom + ' · ' + quoi + ' : le libellé passe de l\'encre au blanc sans couleur de passage', passages.length === 0 && blanc(rgb(fin.c)),
          passages.length ? passages.length + ' image(s) de passage, ex. ' + passages[0].c : 'encre puis blanc, ' + vus.length + ' images');
        for (let k = 0; k < 30; k++) await image(p);
      }
      dit(nom + ' · aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally { await nav.close().catch(() => {}); }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le rouge arrive, le libellé bascule d\'un coup : plus aucun gris de passage');
  process.exit(ko ? 1 : 0);
})();
