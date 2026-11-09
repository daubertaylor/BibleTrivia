/* ============ BANC « QUI ? OÙ ? SE RELIE AU DOIGT » (v356) ============
   « Relier chaque personnage à son lieu, je préfère que ce soit un truc où
     on les prend, où on les relie à son lieu directement, au lieu de
     cliquer. »
   On prend un personnage, on le tire jusqu'à son lieu : un fil de sa
   couleur suit le doigt et s'accroche au lieu visé. Vérifié ici, au doigt
   (événements tactiles du navigateur), sur deux téléphones :
     1. LES PASTILLES SE FONT FACE : celle d'un personnage au bord droit de
        sa carte, celle d'un lieu au bord gauche ;
     2. TIRER UN PERSONNAGE JUSQU'À UN LIEU : pendant le geste, un fil de la
        couleur du personnage, accroché au lieu visé (éclairé), et la page
        ne défile pas ; lâché, le lien est fait, le lieu prend la couleur,
        le fil s'en va ;
     3. DANS L'AUTRE SENS, d'un lieu vers un personnage : le fil prend la
        couleur du personnage visé, et le lien est fait ;
     4. LÂCHÉ À CÔTÉ : rien ne change, et le fil se rembobine puis s'en va ;
     5. UN LIEN SE DÉPLACE (le même personnage tiré ailleurs) et UN LIEU
        CHANGE DE PERSONNAGE (un autre personnage tiré sur lui) ;
     6. TOUCHER MARCHE TOUJOURS (un personnage, puis son lieu ; un lieu
        relié touché se dénoue) ;
     7. UNE MANCHE ENTIÈRE AU DOIGT, puis « Valider » : juste ;
     8. À LA SOURIS aussi ;
     9. l'écran tient sans défiler, consigne comprise ; aucune erreur.
   Usage : node banc-essai/quiou-main.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const TEL = [['Pixel 8', 393, 852], ['petit téléphone', 320, 568]];
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 360) + ')' : '')); };

const ouvrir = async (nav, W, H, tactile) => {
  const ctx = await nav.newContext(tactile
    ? { viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' }
    : { viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(500);
  await p.evaluate(() => lancerJeu('quiou'));
  await p.waitForFunction(() => document.querySelector('#jxZone .jx-qui') && !document.querySelector('#app > .screen.screen-exit'), null, { timeout: 8000 });
  await p.waitForTimeout(700);
  return { ctx, p, errs };
};
const centre = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const etat = (p) => p.evaluate(() => { const m = mancheCourante(); return { liens: JSON.parse(JSON.stringify(m.liens)), choisi: m.choisi, revele: jeu.revele }; });
const fil = (p) => p.evaluate(() => { const f = document.querySelector('body > .jx-fil'); return f ? { cls: f.getAttribute('class'), d: f.querySelector('path').getAttribute('d') } : null; });

/* Un geste au doigt, d'un point à un autre, avec un relevé à mi-chemin et au bout. */
const tirer = async (p, cdp, a, b, opts = {}) => {
  const N = 12, rel = {};
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
  await p.waitForTimeout(30);
  for (let k = 1; k <= N; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * k / N, y: a.y + (b.y - a.y) * k / N }] });
    await p.waitForTimeout(16);
  }
  await p.waitForTimeout(40);
  rel.bout = await p.evaluate(() => {
    const f = document.querySelector('body > .jx-fil');
    return { fil: f ? f.getAttribute('class') : null, d: f ? f.querySelector('path').getAttribute('d') : null,
      vise: [...document.querySelectorAll('#jxZone .jx-vise')].map(e => e.dataset.l !== undefined ? 'l' + e.dataset.l : 'i' + e.dataset.i),
      scroll: document.getElementById('app').scrollTop, wy: window.scrollY };
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(opts.attente || 420);
  return rel;
};
const toucher = async (p, cdp, a) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
  await p.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(520);
};
/* Le bout du fil (dernier point du chemin) contre le centre d'une pastille. */
const boutSur = (d, c) => { if (!d || !c) return false; const n = d.trim().split(/[\sMQ]+/).filter(Boolean).map(Number); const x = n[n.length - 2], y = n[n.length - 1]; return Math.abs(x - c.x) < 1.5 && Math.abs(y - c.y) < 1.5; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [tel, W, H] of TEL) {
    const { ctx, p, errs } = await ouvrir(nav, W, H, true);
    const cdp = await ctx.newCDPSession(p);
    try {
      const QUI = (i) => `#jxZone .jx-qui[data-i="${i}"]`, OU = (l) => `#jxZone .jx-ou[data-l="${l}"]`;
      const couleurs = await p.evaluate(() => JX_LIENS.slice());
      /* 1 */
      const face = await p.evaluate(() => {
        const q = document.querySelector('#jxZone .jx-qui'), o = document.querySelector('#jxZone .jx-ou');
        const r = (e) => e.getBoundingClientRect();
        return { quiPoint: r(q.querySelector('.jx-point')).left > r(q.querySelector('.opt-text')).left, ouPoint: r(o.querySelector('.jx-point')).right < r(o.querySelector('.opt-text')).left + 2,
          sh: document.getElementById('app').scrollHeight, ch: document.getElementById('app').clientHeight };
      });
      dit(tel + ' — 1. les pastilles se font face (personnage : à droite ; lieu : à gauche), et l\'écran tient sans défiler', face.quiPoint && face.ouPoint && face.sh <= face.ch + 1, JSON.stringify(face));
      /* 2 */
      const pointOu0 = await centre(p, OU(0) + ' .jx-point');
      const r2 = await tirer(p, cdp, await centre(p, QUI(0)), await centre(p, OU(0)));
      const e2 = await etat(p), f2 = await fil(p);
      const coul2 = await p.evaluate((s) => document.querySelector(s).className, OU(0) + ' .jx-point');
      dit(tel + ' — 2. tirer un personnage jusqu\'à un lieu : un fil de sa couleur accroché au lieu visé, la page immobile ; lâché, le lien est fait',
        r2.bout.fil === 'jx-fil ' + couleurs[0] && boutSur(r2.bout.d, pointOu0) && r2.bout.vise.join() === 'l0' && r2.bout.scroll === 0 && r2.bout.wy === 0
        && e2.liens[0] === 0 && Object.keys(e2.liens).length === 1 && e2.choisi === null && !f2 && coul2.includes(couleurs[0]),
        JSON.stringify({ r2: r2.bout, e2, f2, coul2 }));
      /* 3 */
      const pointQui1 = await centre(p, QUI(1) + ' .jx-point');
      const r3 = await tirer(p, cdp, await centre(p, OU(1)), await centre(p, QUI(1)));
      const e3 = await etat(p);
      dit(tel + ' — 3. dans l\'autre sens, d\'un lieu vers un personnage : le fil prend sa couleur, et le lien est fait',
        r3.bout.fil === 'jx-fil ' + couleurs[1] && boutSur(r3.bout.d, pointQui1) && e3.liens[1] === 1 && e3.liens[0] === 0 && !(await fil(p)),
        JSON.stringify({ r3: r3.bout, e3 }));
      /* 4 */
      const zone = await p.evaluate(() => { const r = document.querySelector('.jx-consigne').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      const r4 = await tirer(p, cdp, await centre(p, QUI(2)), zone, { attente: 60 });
      const pendant4 = await fil(p);
      await p.waitForTimeout(600);
      const e4 = await etat(p);
      dit(tel + ' — 4. lâché à côté : rien ne change, le fil se rembobine puis s\'en va',
        r4.bout.fil === 'jx-fil ' + couleurs[2] && r4.bout.vise.length === 0 && !!pendant4 && !(await fil(p)) && JSON.stringify(e4.liens) === JSON.stringify(e3.liens) && e4.choisi === null,
        JSON.stringify({ r4: r4.bout, pendant4: !!pendant4, e4 }));
      /* 5 */
      await tirer(p, cdp, await centre(p, QUI(0)), await centre(p, OU(2)));
      const e5a = await etat(p);
      await tirer(p, cdp, await centre(p, QUI(3)), await centre(p, OU(1)));
      const e5b = await etat(p);
      const libres = await p.evaluate(() => [...document.querySelectorAll('#jxZone .jx-ou')].filter(b => !b.classList.contains('jx-relie')).map(b => +b.dataset.l).sort().join());
      dit(tel + ' — 5. un lien se déplace, et un lieu change de personnage',
        e5a.liens[0] === 2 && e5a.liens[1] === 1 && Object.keys(e5a.liens).length === 2
        && e5b.liens[3] === 1 && e5b.liens[1] === undefined && e5b.liens[0] === 2 && libres === '0,3',
        JSON.stringify({ e5a, e5b, libres }));
      /* 6 */
      await toucher(p, cdp, await centre(p, QUI(1)));
      const choisi6 = (await etat(p)).choisi;
      await toucher(p, cdp, await centre(p, OU(0)));
      const e6a = await etat(p);
      await toucher(p, cdp, await centre(p, OU(0)));
      const e6b = await etat(p);
      dit(tel + ' — 6. toucher marche toujours : un personnage puis son lieu ; un lieu relié touché se dénoue',
        choisi6 === 1 && e6a.liens[1] === 0 && e6a.choisi === null && e6b.liens[1] === undefined,
        JSON.stringify({ choisi6, e6a, e6b }));
      /* 7 */
      for (let i = 0; i < 4; i++) await tirer(p, cdp, await centre(p, QUI(i)), await centre(p, OU(i)));
      const e7 = await etat(p);
      const valider = await p.evaluate(() => !document.getElementById('jxValider').disabled);
      await toucher(p, cdp, await centre(p, '#jxValider'));
      await p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
      const r7 = await p.evaluate(() => ({ juste: jeu.juste, points: jeu.points, label: document.querySelector('.fact-card .fact-label').textContent }));
      dit(tel + ' — 7. une manche entière au doigt, puis « Valider » : juste',
        [0, 1, 2, 3].every(i => e7.liens[i] === i) && valider && r7.juste === true && r7.points > 0, JSON.stringify({ e7, valider, r7 }));
    } catch (e) { dit(tel + ' : le banc s\'est arrêté', false, e.message); }
    dit(tel + ' — 9. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  /* 8 : à la souris */
  {
    const { ctx, p, errs } = await ouvrir(nav, 0, 0, false);
    try {
      const a = await centre(p, '#jxZone .jx-qui[data-i="2"]'), b = await centre(p, '#jxZone .jx-ou[data-l="2"]');
      await p.mouse.move(a.x, a.y); await p.mouse.down();
      for (let k = 1; k <= 10; k++) { await p.mouse.move(a.x + (b.x - a.x) * k / 10, a.y + (b.y - a.y) * k / 10); await p.waitForTimeout(16); }
      const pendant = await fil(p);
      await p.mouse.up();
      await p.waitForTimeout(450);
      const e8 = await etat(p);
      dit('souris — 8. tirer à la souris relie aussi, sans que le clic qui suit défasse le lien', !!pendant && e8.liens[2] === 2 && e8.choisi === null && !(await fil(p)), JSON.stringify({ pendant, e8 }));
    } catch (e) { dit('souris : le banc s\'est arrêté', false, e.message); }
    dit('souris — 9. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — Qui ? Où ? se relie au doigt : on prend, on tire, le fil s\'accroche');
  process.exit(ko ? 1 : 0);
})();
