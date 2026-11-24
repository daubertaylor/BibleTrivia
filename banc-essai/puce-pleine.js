/* ====== UNE PUCE SE REMPLIT D'UN SEUL COUP, LE BAS COMPRIS (v364) ======
   « Quand je passe de Courte à Normale, l'affichage ne se remplit pas tout
     de suite : ça laisse une bordure en bas qui n'est pas remplie et qui se
     remplit après. » (iPhone ; « et sur Android aussi, s'il y a le même
     problème »)
   Un iPhone situe le toucher plus haut que le milieu du doigt : l'encre
   naissait près du haut de la puce, et le bas, le bord le plus lointain, se
   remplissait en dernier. Filmé tel que le moteur compose (Mode Solo,
   « Courte » puis « Normale »), toucher au cinquième, à la moitié et aux
   cinq sixièmes de la hauteur, iPhone et Android :
     1. la goutte part de la hauteur du milieu de la puce (à un dixième près
        du doigt), et toujours de l'endroit touché en largeur ;
     2. la bande du bas et celle du haut sont pleines ensemble (80 ms d'écart
        au plus), et le milieu avant elles ;
     3. la puce est entièrement pleine (haut, milieu, bas) avant 0,45 s ;
     4. (v377) la teinte pleine n'a plus d'heure : juste après le toucher, la
        puce choisie garde son crème (le jeu le tient tant que l'encre ne la
        couvre pas toute — voir remplissage.js, point 4) ; (v379) et elle se
        pose sous l'encre d'un coup, dans l'image où celle-ci finit de couvrir
        la puce (la goutte atteint maintenant tout le bord au même instant :
        voir banc-essai/puce-bord.js) ;
     5. aucune erreur.
   Usage : node banc-essai/puce-pleine.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 600) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [], origines = [], temps = [], tenues = [];
  let delai = null;
  try {
    for (const [tel, ua, vp] of [['iPhone', IOS, { width: 402, height: 874 }], ['Android', AND, { width: 412, height: 915 }]]) {
      for (const py of [0.18, 0.5, 0.85]) {
        const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
        const p = await ctx.newPage();
        p.on('pageerror', e => errs.push(e.message));
        await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
        await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
          localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); });
        await p.goto(URL);
        await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
        await p.evaluate(() => { document.documentElement.requestFullscreen = null; });
        await p.waitForTimeout(700);
        await p.tap('text=Mode Solo'); await p.waitForTimeout(1200);
        const courte = await p.locator('.chip', { hasText: 'Courte' }).first().boundingBox();
        await p.touchscreen.tap(courte.x + courte.width / 2, courte.y + courte.height / 2); await p.waitForTimeout(1300);
        const n = p.locator('.chip', { hasText: 'Normale' }).first(), b = await n.boundingBox();
        const cdp = await ctx.newCDPSession(p);
        const images = [];
        cdp.on('Page.screencastFrame', async (f) => { images.push({ t: f.metadata.timestamp, d: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
        await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: vp.width, maxHeight: vp.height });
        await p.waitForTimeout(250);
        const t0 = Date.now() / 1000;
        await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height * py);
        const o = await n.evaluate(el => ({ y: parseFloat(el.style.getPropertyValue('--encre-y')), x: parseFloat(el.style.getPropertyValue('--encre-x')), H: el.offsetHeight, W: el.offsetWidth,
          teinte: getComputedStyle(el).getPropertyValue('--glass-tint').trim(), choisie: el.classList.contains('active') }));
        tenues.push(o.choisie && /^rgb\(252, 248, 241\)$/.test(o.teinte) ? 'tenue' : o.teinte);
        await p.waitForTimeout(900);
        await cdp.send('Page.stopScreencast');
        /* (v379) La puce qu'on PREND porte la goutte à sa forme (goutte-puce) : c'est sous
           elle que la teinte doit se poser d'un coup. L'encre partie, la classe l'est aussi. */
        if (delai === null) delai = await n.evaluate(el => { el.classList.add('goutte-puce', 'remplit'); const s = getComputedStyle(el); const props = s.transitionProperty.split(',').map(x => x.trim()); const i = props.indexOf('--glass-tint'); const d = s.transitionDelay.split(',').map(x => x.trim()), u = s.transitionDuration.split(',').map(x => x.trim()); return i >= 0 ? d[i] + ' / ' + u[i] : null; });
        origines.push({ tel, py, ry: +(o.y / o.H).toFixed(3), rx: +(o.x / o.W).toFixed(3) });
        /* Le plus tôt où chaque bande (haut, milieu, bas) est rouge plein sur 95 % de sa largeur. */
        const rouge = await p.evaluate(async ([imgs, b, t0]) => {
          const plein = (d, y) => { let n = 0, t = 0; for (let x = Math.round(b.x + 10); x < b.x + b.width - 10; x++) { const i = (Math.round(y) * d.width + x) * 4; t++; if (d.data[i] > 225 && d.data[i + 1] < 90) n++; } return n / t; };
          const out = { haut: null, milieu: null, bas: null };
          for (const im of imgs) {
            const ms = Math.round((im.t - t0) * 1000); if (ms < 0) continue;
            const img = new Image(); img.src = 'data:image/png;base64,' + im.d; await img.decode();
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
            const d = g.getImageData(0, 0, c.width, c.height);
            for (const [k, y] of [['haut', b.y + 2.5], ['milieu', b.y + b.height / 2], ['bas', b.y + b.height - 2.5]]) if (out[k] === null && plein(d, y) >= 0.95) out[k] = ms;
          }
          return out;
        }, [images, b, t0]);
        temps.push({ tel, py, ...rouge });
        await ctx.close();
      }
    }
  } catch (e) { errs.push('banc : ' + e.message); }
  dit('1. la goutte part de la hauteur du milieu (à un dixième près du doigt), et de l\'endroit touché en largeur',
    origines.length === 6 && origines.every(o => Math.abs(o.ry - 0.5) <= 0.045 && Math.abs(o.rx - 0.5) <= 0.02), JSON.stringify(origines));
  dit('2. la bande du bas et celle du haut sont pleines ensemble (80 ms d\'écart au plus), le milieu avant elles',
    temps.length === 6 && temps.every(t => t.haut !== null && t.bas !== null && Math.abs(t.haut - t.bas) <= 80 && t.milieu <= Math.min(t.haut, t.bas)), JSON.stringify(temps));
  dit('3. la puce est entièrement pleine avant 0,45 s', temps.length === 6 && temps.every(t => Math.max(t.haut, t.milieu, t.bas) < 450), JSON.stringify(temps.map(t => Math.max(t.haut, t.milieu, t.bas))));
  dit('4. juste après le toucher, la puce choisie garde son crème ; sous l\'encre, la teinte se pose d\'un coup (0 s)',
    tenues.length === 6 && tenues.every(t => t === 'tenue') && delai === '0s / 0s', JSON.stringify(tenues) + ' — ' + delai);
  dit('5. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — une puce se remplit d\'un seul coup, le bas avec le haut');
  process.exit(ko ? 1 : 0);
})();
