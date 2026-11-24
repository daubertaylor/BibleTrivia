/* ====== TOUT LE BORD D'UNE PUCE SE REMPLIT AU MÊME INSTANT (v379) ======
   « Lorsque je change le curseur, ça se remplit, mais pas en entier d'un
     coup : la petite barre qui reste en bas, elle se remplit après. Il faut
     que le bas et tout l'icône se remplissent en entier, tout en même temps,
     sans décalage. » (IMG_4343 : « Normale », Mode Solo.)
   La goutte était une ellipse : elle touchait le milieu des quatre bords,
   puis mettait encore une centaine de millisecondes à couvrir les coins et
   les bandes qui y mènent — en bas, contre l'ombre de la puce, la « petite
   barre ». Elle est maintenant la puce elle-même, agrandie depuis le doigt :
   elle atteint tout son bord dans la même image.
   On filme à vitesse réelle (chaque image composée), sous un vrai doigt posé
   là où un iPhone le situe (au cinquième de la hauteur), sur les puces des
   modes de jeu, et on relève, pour soixante-dix points tout autour de la
   puce (bords, bandes et coins, à 2,5 px du bord), l'instant où chacun
   devient rouge pour de bon :
     1. tout le bord devient rouge en 40 ms au plus (deux images et demie) —
        l'ellipse en mettait plus de soixante ;
     2. la bande du BAS n'arrive pas après le reste du bord (une image au
        plus) ;
     3. la puce est entièrement rouge, bord compris, avant 0,45 s ;
     4. aucune erreur.
   Usage : node banc-essai/puce-bord.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 700) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  const cdp = await ctx.newCDPSession(p);
  let images = [];
  cdp.on('Page.screencastFrame', async (f) => { images.push({ t: f.metadata.timestamp, d: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  const res = [];
  const cas = [
    ['Solo · durée (Courte → Normale)', 'solo', 'len', 'courte', 'normale', 'setLength'],
    ['Solo · chrono', 'solo', 'tmr', null, 1, null],
    ['Solo · testament', 'solo', 'theme', null, 1, null],
    ['Groupe · durée', 'group', 'len', 'courte', 'longue', 'setLength'],
  ];
  for (const [nom, mode, g, depart, cible] of cas) {
    await p.evaluate((m) => { state.screen = 'mode'; render(); selectMode(m); }, mode);
    await p.waitForTimeout(1300);
    await p.evaluate(([g, d]) => { const q = [...document.querySelectorAll('.chip[data-group="' + g + '"]')]; const c = typeof d === 'string' ? q.find(x => x.dataset.k === d) : q[0]; if (c && !c.classList.contains('active')) c.click(); }, [g, depart]);
    await p.waitForTimeout(1200);
    const b = await p.evaluate(([g, c]) => { const q = [...document.querySelectorAll('.chip[data-group="' + g + '"]')]; const el = typeof c === 'string' ? q.find(x => x.dataset.k === c) : q[c]; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, R: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 }; }, [g, cible]);
    await p.waitForTimeout(300);
    images = [];
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    await p.waitForTimeout(150);
    const t0 = Date.now() / 1000;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.w / 2, y: b.y + b.h * 0.2 }] });
    await p.waitForTimeout(90);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(900);
    await cdp.send('Page.stopScreencast');
    const r = await p.evaluate(async ([imgs, b, t0]) => {
      const e = 2.5, R = Math.max(e + 1, b.R);
      const pts = [];
      for (let i = 0; i < 30; i++) { const x = b.x + R + (b.w - 2 * R) * i / 29; pts.push(['haut', x, b.y + e], ['bas', x, b.y + b.h - e]); }
      for (let i = 0; i < 4; i++) { const y = b.y + R + (b.h - 2 * R) * i / 3; pts.push(['côté', b.x + e, y], ['côté', b.x + b.w - e, y]); }
      for (const [cx, cy, a0] of [[b.x + R, b.y + R, 180], [b.x + b.w - R, b.y + R, 270], [b.x + b.w - R, b.y + b.h - R, 0], [b.x + R, b.y + b.h - R, 90]])
        for (let k = 1; k < 4; k++) { const a = (a0 + 90 * k / 4) * Math.PI / 180; pts.push(['coin', cx + (R - e) * Math.cos(a), cy + (R - e) * Math.sin(a)]); }
      const quand = pts.map(() => null);
      for (const im of imgs) {
        const img = new Image(); img.src = 'data:image/png;base64,' + im.d; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
        const k = img.width / innerWidth, ms = Math.round((im.t - t0) * 1000);
        pts.forEach((pt, i) => { const d = g.getImageData(Math.round(pt[1] * k), Math.round(pt[2] * k), 1, 1).data; const rouge = d[1] < 120 && d[0] > 180;
          if (rouge && quand[i] === null) quand[i] = ms; if (!rouge) quand[i] = null; });
      }
      const zone = (z) => quand.filter((q, i) => pts[i][0] === z);
      const tous = quand.filter(q => q !== null);
      return { n: pts.length, rouges: tous.length, premier: Math.min(...tous), dernier: Math.max(...tous), bas: Math.max(...zone('bas').map(q => q === null ? 1e9 : q)), reste: Math.max(...quand.filter((q, i) => pts[i][0] !== 'bas').map(q => q === null ? 1e9 : q)) };
    }, [images, b, t0]);
    res.push({ nom, ...r });
  }
  for (const r of res) console.log('    ' + r.nom.padEnd(32) + ' bord rouge de ' + r.premier + ' à ' + r.dernier + ' ms (' + r.rouges + '/' + r.n + ' points) — bas ' + r.bas + ', reste ' + r.reste);
  dit('1. tout le bord devient rouge en 40 ms au plus', res.length === cas.length && res.every(r => r.rouges === r.n && r.dernier - r.premier <= 40), res.map(r => r.nom + ' : ' + (r.dernier - r.premier) + ' ms').join(' · '));
  dit('2. la bande du bas n\'arrive pas après le reste du bord (une image au plus)', res.every(r => r.bas <= r.reste + 17), res.map(r => r.nom + ' : bas ' + r.bas + ' / reste ' + r.reste).join(' · '));
  dit('3. la puce est entièrement rouge, bord compris, avant 0,45 s', res.every(r => r.dernier < 450), res.map(r => r.dernier).join(', '));
  dit('4. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le bas se remplit avec le reste, d\'un seul coup');
  process.exit(ko ? 1 : 0);
})();
