/* ====== BANC « LA PUCE SE REMPLIT EN ENTIER, D'UN SEUL COUP » (v383) ======
   « Au niveau de la durée de la partie, le remplissage : lorsque je passe de
     Courte à Normale, il se fait parfaitement, mais ensuite il remplit la
     partie basse, et ça ne doit pas arriver : ça doit se remplir en
     intégralité d'un coup. Et s'il y a ce problème-là ailleurs, pareil, il
     doit être corrigé. »
   Filmé image par image avant la v383 (écran d'un iPhone, trois pixels
   d'écran par point) :
     — une puce qu'on reprend pendant qu'elle se vide (Normale, Courte, puis
       Normale de nouveau, vite) repartait avec l'ellipse de son retrait : le
       haut était rouge, et le LISERÉ DU BAS ne le devenait que deux ou trois
       images après ;
     — même un remplissage ordinaire finissait son liseré du bas une image
       après le reste : la goutte était calculée sur la taille de la puce
       arrondie au pixel entier, et une puce ne l'est presque jamais ;
     — puis, une demi-seconde après, l'encre s'en allait et le fond de la
       puce revenait dessous : deux couches qui échangent leur place quand
       tout a déjà l'air plein.
   On exige, sur les puces des modes de jeu :
     1. remplissage ordinaire (Courte → Normale) : le liseré du bas devient
        rouge dans la MÊME image que le haut de la puce ;
     2. reprise en plein retrait (Normale, Courte, Normale) : elle repart avec
        la goutte à la forme de la puce, et le liseré du bas devient rouge
        dans la même image que le haut ;
     3. ailleurs aussi : la même reprise sur le chrono (15 s, 30 s), et dans
        une page (privé / public), repart avec la goutte à la forme de la puce ;
     4. une fois pleine, plus rien ne bouge dans la puce : l'encre reste
        posée, immobile, et le fond ne revient pas dessous (aucune relève) ;
     5. la goutte couvre la VRAIE puce, au demi-pixel près, sur des écrans de
        360 à 430 points : sa boîte, à l'échelle où elle la couvre, la
        dépasse d'un demi-pixel au moins de chaque côté ;
     6. la puce qu'on quitte se vide en entier (plus d'encre au repos) ;
     7. aucune erreur.
   Usage : node banc-essai/puce-dun-coup.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 360) + ')' : '')); };
const LEN = (k) => `.screen .chip[data-group="len"][data-k="${k}"]`;
const TMR = (k) => `.screen [data-group="tmr"][data-k="${k}"]`;

async function ouvrir(nav, largeur) {
  const ctx = await nav.newContext({ viewport: { width: largeur || 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  const p = await ctx.newPage();
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); });
  return { ctx, p };
}
async function solo(p, errs, nom) {
  p.on('pageerror', e => errs.push(nom + ' : ' + e.message));
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  await p.evaluate(() => { document.documentElement.requestFullscreen = null; state.lengthKey = 'courte'; state.timerKey = '15'; selectMode('solo'); });
  await p.waitForTimeout(1500);
}
const centre = (p, s) => p.evaluate((s) => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, s);
const boite = (p, s) => p.evaluate((s) => { const e = document.querySelector(s), r = e.getBoundingClientRect(); const lettres = [];
  const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) { if (!t.nodeValue.trim()) continue; const g = document.createRange(); g.selectNodeContents(t); for (const q of g.getClientRects()) lettres.push([q.left - 2, q.top - 2, q.right + 2, q.bottom + 2]); }
  return { x: r.left, y: r.top, w: r.width, h: r.height, R: parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0, lettres }; }, s);

/* Image par image : la part de rouge dans le haut de la puce et dans son
   liseré du bas (ses deux derniers points), lettres et coins exclus. Un
   rouge voilé de blanc (l'onde d'appui) reste du rouge. */
const BANDES = (p, images, b, t0) => p.evaluate(async ([imgs, b, t0]) => {
  const lit = async (s) => { const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
  const out = [];
  for (const im of imgs) {
    const ms = Math.round((im.t - t0) * 1000); if (ms < -40) continue;
    const D = await lit(im.d), k = D.width / innerWidth;
    const part = (ya, yb) => { let n = 0, t = 0;
      for (let Y = Math.ceil(ya * k); Y < yb * k; Y++) for (let X = Math.ceil((b.x + b.R) * k); X < (b.x + b.w - b.R) * k; X += 2) {
        const x = (X + 0.5) / k, y = (Y + 0.5) / k;
        if (b.lettres.some(q => x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3])) continue;
        const i = (Y * D.width + X) * 4, r = D.data[i], g = D.data[i + 1], bl = D.data[i + 2];
        t++; if (r > 190 && r - g > 90 && r - bl > 100) n++; }
      return t ? n / t : 0; };
    out.push({ ms, haut: part(b.y + 3, b.y + b.h / 3), rimH: part(b.y + 0.34, b.y + 2), lis: part(b.y + b.h - 2, b.y + b.h - 0.34) });
  }
  return out;
}, [images, b, t0]);

/* Le premier instant où le liseré du haut, puis celui du bas, rejoignent
   leur rouge final (et le gardent). La goutte qui a la forme de la puce les
   atteint dans la même image ; l'ellipse d'avant atteignait le milieu des
   bords d'abord, et le rouge plein ne se fondait dessous qu'ensuite. */
function rejoint(f) {
  const fin = f[f.length - 1];
  const prem = (k) => f.findIndex((m, i) => m.ms >= 0 && m[k] >= 0.995 * fin[k] && f.slice(i).every(n => n[k] >= 0.95 * fin[k]));
  const iH = prem('rimH'), iL = prem('lis');
  return { iH, iL, tH: iH >= 0 ? f[iH].ms : null, tL: iL >= 0 ? f[iL].ms : null, fin };
}
const fil = (f, r) => f.filter(m => m.ms >= 0 && m.ms <= Math.max(r.tL || 0, r.tH || 0) + 40).map(m => m.ms + ':' + m.rimH.toFixed(2) + '/' + m.haut.toFixed(2) + '/' + m.lis.toFixed(2)).join(' ');

async function filmer(p, ctx, b, geste) {
  const cdp = await ctx.newCDPSession(p);
  const images = [];
  cdp.on('Page.screencastFrame', async (fr) => { images.push({ t: fr.metadata.timestamp, d: fr.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: fr.sessionId }); } catch (e) {} });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  await p.waitForTimeout(300);
  const t0 = await geste();
  await p.waitForTimeout(1300);
  await cdp.send('Page.stopScreencast');
  return BANDES(p, images, b, t0);
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    /* 1 et 4 : un remplissage ordinaire, puis plus rien */
    {
      const { ctx, p } = await ouvrir(nav); await solo(p, errs, 'ordinaire');
      const b = await boite(p, LEN('normale')), c = await centre(p, LEN('normale'));
      /* L'encre et le fond de la puce, image par image, jusqu'à 1,2 s. */
      const etat = p.evaluate((s) => new Promise(res => { const l = []; const t0 = performance.now();
        const pas = () => { const e = document.querySelector(s), a = getComputedStyle(e, '::after');
          l.push({ t: Math.round(performance.now() - t0), cls: e.className, o: a.opacity, tr: a.transform, g: [a.left, a.top, a.width, a.height].join(' '), fond: getComputedStyle(e).backgroundColor });
          if (performance.now() - t0 < 1250) requestAnimationFrame(pas); else res(l); };
        requestAnimationFrame(pas); }), LEN('normale'));
      const f = await filmer(p, ctx, b, async () => { const t = Date.now() / 1000; await p.touchscreen.tap(c.x, c.y); return t; });
      const r = rejoint(f);
      dit('1. remplissage ordinaire : le liseré du bas devient rouge dans la même image que celui du haut',
        r.iH >= 0 && r.iL >= 0 && r.iL <= r.iH, 'liseré du haut à ' + r.tH + ' ms, du bas à ' + r.tL + ' ms (haut / dedans / bas) · ' + fil(f, r));
      const l = await etat;
      /* La fin du remplissage : la première image où l'encre est à l'échelle 1. */
      const i1 = l.findIndex(x => /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(x.tr) && +x.o === 1 && /active/.test(x.cls));
      const apres = i1 >= 0 ? l.slice(i1) : [];
      const change = apres.filter((x, i) => i > 0 && (x.o !== apres[i - 1].o || x.tr !== apres[i - 1].tr || x.g !== apres[i - 1].g || x.fond !== apres[i - 1].fond));
      const der = l[l.length - 1];
      dit('4. une fois pleine, plus rien ne bouge : l\'encre reste posée, le fond ne revient pas dessous',
        i1 >= 0 && change.length === 0 && /encre-posee/.test(der.cls) && +der.o === 1,
        i1 < 0 ? 'l\'encre n\'atteint jamais l\'échelle 1' : 'pleine à ' + l[i1].t + ' ms ; ' + change.length + ' changement(s) ensuite ' + JSON.stringify(change.slice(0, 2).map(x => ({ t: x.t, o: x.o, fond: x.fond, cls: x.cls.replace(/\b(chip|has-gs)\b/g, '').trim() }))));
      /* 6 : la puce quittée se vide en entier */
      const c2 = await centre(p, LEN('courte'));
      await p.touchscreen.tap(c2.x, c2.y); await p.waitForTimeout(1200);
      const quitte = await p.evaluate((s) => { const e = document.querySelector(s), a = getComputedStyle(e, '::after'); return { o: +a.opacity, cls: e.className }; }, LEN('normale'));
      const prise = await p.evaluate((s) => document.querySelector(s).className, LEN('courte'));
      dit('6. la puce qu\'on quitte se vide en entier (plus d\'encre au repos) ; celle qu\'on prend garde la sienne posée',
        quitte.o <= 0.01 && !/encre-posee|remplit|devide/.test(quitte.cls) && /encre-posee/.test(prise), JSON.stringify(quitte) + ' · ' + prise);
      await ctx.close();
    }
    /* 2 : la reprise en plein retrait */
    {
      const { ctx, p } = await ouvrir(nav); await solo(p, errs, 'reprise');
      const b = await boite(p, LEN('normale')), c = await centre(p, LEN('normale')), c2 = await centre(p, LEN('courte'));
      await p.touchscreen.tap(c.x, c.y); await p.waitForTimeout(1100);
      let forme = null;
      const f = await filmer(p, ctx, b, async () => {
        await p.touchscreen.tap(c2.x, c2.y); await p.waitForTimeout(90);
        const t = Date.now() / 1000; await p.touchscreen.tap(c.x, c.y);
        forme = await p.evaluate((s) => document.querySelector(s).className, LEN('normale'));
        return t; });
      const r = rejoint(f);
      dit('2. reprise en plein retrait : la goutte à la forme de la puce, et le liseré du bas rouge dans la même image que celui du haut',
        /goutte-puce|encre-posee/.test(forme || '') && r.iH >= 0 && r.iL >= 0 && r.iL <= r.iH,
        'classes ' + (forme || '').replace(/\b(chip|has-gs)\b/g, '').trim() + ' · liseré du haut à ' + r.tH + ' ms, du bas à ' + r.tL + ' ms (haut / dedans / bas) · ' + fil(f, r));
      await ctx.close();
    }
    /* 3 : ailleurs — le chrono, et une page */
    {
      const { ctx, p } = await ouvrir(nav); await solo(p, errs, 'ailleurs');
      const formes = {};
      const reprendre = async (de, vers, nom) => {
        const a = await centre(p, vers), d = await centre(p, de);
        await p.touchscreen.tap(a.x, a.y); await p.waitForTimeout(1100);
        await p.touchscreen.tap(d.x, d.y); await p.waitForTimeout(90);
        await p.touchscreen.tap(a.x, a.y);
        formes[nom] = await p.evaluate((s) => document.querySelector(s).className.replace(/\b(chip|len-chip|has-gs)\b/g, '').trim(), vers);
        await p.waitForTimeout(1100);
      };
      await reprendre(TMR('15'), TMR('30'), 'chrono');
      await p.evaluate(() => { compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
        grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: true }; grp.liste = []; grp.publics = [];
        state.screen = 'groupes'; render(); setTimeout(() => ouvrirCreation(), 600); });
      await p.waitForTimeout(1900);
      await reprendre('.len-chip[data-tgroup="type"]:nth-of-type(1)', '.len-chip[data-tgroup="type"]:nth-of-type(2)', 'page');
      dit('3. ailleurs aussi, une reprise repart avec la goutte à la forme de la puce (chrono, et dans une page)',
        /goutte-puce/.test(formes.chrono || '') && /goutte-puce|remplit/.test(formes.page || '') && /goutte-puce/.test(formes.page || ''), JSON.stringify(formes));
      await ctx.close();
    }
    /* 5 : la goutte couvre la vraie puce, de 360 à 430 points */
    {
      const vus = [];
      for (const L of [360, 375, 390, 402, 414, 430]) {
        const { ctx, p } = await ouvrir(nav, L); await solo(p, errs, 'largeur ' + L);
        const r = await p.evaluate((sels) => sels.map(s => { const c = document.querySelector(s); if (!c) return null;
          const cs = getComputedStyle(c), W = parseFloat(cs.width), H = parseFloat(cs.height);
          const x = c.offsetWidth * 0.5, y = c.offsetHeight * 0.5;
          const q = poserEncre(c, x, y), v = (n) => parseFloat(c.style.getPropertyValue(n));
          /* La boîte de la goutte à l'échelle p, autour de son origine. */
          const ox = v('--encre-l') + v('--encre-ox'), oy = v('--encre-t') + v('--encre-oy');
          const g = ox + (v('--encre-l') - ox) * q.p, d = ox + (v('--encre-l') + v('--encre-w') - ox) * q.p;
          const h = oy + (v('--encre-t') - oy) * q.p, b = oy + (v('--encre-t') + v('--encre-h') - oy) * q.p;
          return { s, W: +W.toFixed(3), H: +H.toFixed(3), marge: +Math.min(-g, d - W, -h, b - H).toFixed(2) }; }),
          ['.screen .chip[data-group="len"][data-k="normale"]', '.screen [data-group="tmr"][data-k="30"]', '.screen [data-group="theme"][data-k="at"]']);
        vus.push([L, r]);
        await ctx.close();
      }
      const pire = Math.min(...vus.flatMap(([, r]) => r.filter(Boolean).map(x => x.marge)));
      dit('5. la goutte couvre la vraie puce : un demi-pixel de marge au moins de chaque côté, de 360 à 430 points',
        pire >= 0.5, 'marge la plus courte ' + pire + ' px · ' + vus.map(([L, r]) => L + ' : ' + r.filter(Boolean).map(x => x.H + '→' + x.marge).join(', ')).join(' | '));
    }
  } catch (e) { errs.push('le banc s\'est arrêté : ' + (e.stack || e.message)); }
  dit('7. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko === 0 ? '\n  OK — la puce se remplit en entier, d\'un seul coup, et plus rien n\'y bouge ensuite' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
