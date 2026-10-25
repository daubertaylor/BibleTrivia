/* ====== BANC « LA PLACE LIBRE DU SALON A LE VERRE DES AUTRES » (v335) ======
   « À certains moments, il ne s'affiche pas pareil » — la ligne « En
   attente… · 7 places » du salon, entourée en rouge : un verre presque
   transparent, le désert net au travers, sous la ligne du joueur bien
   dépolie. La ligne était rendue à 55 % d'opacité, VERRE COMPRIS (le verre
   du jeu est une photo floutée peinte dans un calque, .gs) : le décor net
   passait au travers à 45 %. Sur un iPhone et un Android :
     1. l'hôte seul (le salon dessiné d'un coup) : la ligne d'attente est
        entière (opacité 1), son verre aussi, et seul son contenu (le « ? »,
        « En attente… », les places) est en retrait ;
     2. le décor NET ne passe plus au travers : les détails fins de la
        ligne (ce qui reste quand on retire le flou) ne ressemblent plus à
        ceux du décor qu'elle couvre — la corrélation des deux, pixel à
        pixel, la ligne cachée puis montrée ;
     3. le même salon quand l'autre joueur s'en va (la ligne recréée par
        majSalleListe, l'autre chemin) : même verre, même netteté ;
     4. un joueur parti (.rank-row.gone) : la même règle ;
     5. aucune erreur.
   Avant la v335 : tout rouge — le décor net retrouvé dans la ligne
   d'attente (corrélation 0,19, contre 0,01 derrière un verre entier), et
   le contenu à pleine opacité.
   Usage : node banc-essai/salon-place.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

/* La bande de la ligne où il n'y a pas de texte (entre le nom et
   l'étiquette). */
const ZONE = (sel) => {
  const l = document.querySelector(sel);
  if (!l) return null;
  const r = l.getBoundingClientRect();
  const nom = l.querySelector('.rank-name'), tag = l.querySelector('.salle-tag');
  const x0 = nom ? nom.getBoundingClientRect().right + 8 : r.left + r.width * 0.45;
  const x1 = tag && tag.textContent ? tag.getBoundingClientRect().left - 8 : r.left + r.width * 0.75;
  return { x: x0, y: r.top + r.height * 0.22, width: Math.max(10, x1 - x0), height: r.height * 0.56 };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  /* Ce qui reste d'une image quand on lui retire son flou (l'image moins
     sa moyenne 5×5) : les détails fins. Le verre dépoli n'en a pas ; le
     décor net, beaucoup. On compare ceux de la ligne à ceux du décor
     qu'elle couvre (la même zone, la ligne cachée). */
  const correlation = async (p, zone, sel) => {
    const avec = await p.screenshot({ clip: zone });
    await p.evaluate((s) => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
    await p.waitForTimeout(120);
    const sans = await p.screenshot({ clip: zone });
    await p.evaluate((s) => { document.querySelector(s).style.visibility = ''; }, sel);
    await p.waitForTimeout(120);
    const q = await p.context().newPage();
    const r = await q.evaluate(async ([a, b]) => {
      const lit = async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data, L = new Float32Array(c.width * c.height);
        for (let i = 0; i < L.length; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
        return { L, w: c.width, h: c.height }; };
      const fins = ({ L, w, h }) => { const o = []; for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        let m = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) m += L[(y + dy) * w + x + dx];
        o.push(L[y * w + x] - m / 25); } return o; };
      const A = fins(await lit(a)), B = fins(await lit(b));
      let sa = 0, sb = 0, sab = 0;
      for (let i = 0; i < A.length; i++) { sa += A[i] * A[i]; sb += B[i] * B[i]; sab += A[i] * B[i]; }
      return { corr: sab / Math.sqrt(sa * sb || 1), detailDecor: Math.sqrt(sb / B.length) };
    }, [avec.toString('base64'), sans.toString('base64')]);
    await q.close();
    return r;
  };
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      const etat = () => p.evaluate(() => {
        const v = document.querySelector('.salle-liste .salle-ligne.vide');
        if (!v) return null;
        const op = (e) => e ? +getComputedStyle(e).opacity : -1;
        const gs = v.querySelector('.gs');
        return { ligne: op(v), verre: op(gs), peint: !!gs && /url\(/.test(getComputedStyle(gs).backgroundImage),
          contenu: [...v.children].filter(c => !c.matches('.gs, .glass-rim')).map(op) };
      });
      const juger = async (titre, num) => {
        const e = await etat();
        const sel = '.salle-liste .salle-ligne.vide';
        const z = await p.evaluate(ZONE, sel);
        const c = z ? await correlation(p, z, sel) : { corr: 1, detailDecor: 0 };
        const entier = !!e && e.ligne === 1 && e.verre === 1 && e.peint && e.contenu.length >= 3 && e.contenu.every(o => Math.abs(o - 0.55) < 0.01);
        dit(num + '. ' + tel + ', ' + titre + ' : la ligne et son verre entiers, le contenu en retrait', entier, JSON.stringify(e));
        dit('   et le décor net ne passe plus au travers', c.detailDecor > 1.5 && c.corr < 0.1,
          'corrélation avec le décor ' + c.corr.toFixed(2) + ' (détail du décor ' + c.detailDecor.toFixed(1) + ')');
      };
      /* 1 et 2 : l'hôte seul, le salon dessiné d'un coup */
      await p.evaluate(() => { net.code = 'CHNW'; net.isHost = true; net.joueurs = {}; majAdversaire();
        net.lengthKey = Object.keys(LENGTHS)[1]; net.timerKey = Object.keys(TIMER_OPTS)[1]; net.themeKey = 'tout';
        state.screen = 'online-room'; render(); });
      await p.waitForTimeout(1800);
      await juger('l\'hôte seul', '1-2');
      /* 3 : un joueur arrive, puis s'en va (la ligne recréée en place) */
      await p.evaluate(() => { net.joueurs = { j1: { id:'j1', name:'Benoît', color:'#E8734C', score:0, idx:0, done:false, gone:false, vu:Date.now() } }; majAdversaire(); majSalleListe(); });
      await p.waitForTimeout(900);
      await p.evaluate(() => { delete net.joueurs.j1; majAdversaire(); majSalleListe(); });
      await p.waitForTimeout(1500);
      await juger('l\'autre joueur parti', '3');
      /* 4 : un joueur parti, ailleurs (classement) — la même règle */
      const g = await p.evaluate(() => {
        const r = document.createElement('div');
        r.className = 'rank-row gone';
        r.innerHTML = '<span class="avatar">B</span><span class="rank-name">Benoît</span>';
        document.querySelector('.salle-liste').appendChild(r);
        if (typeof glassGen !== 'undefined') glassGen++;
        return new Promise(ok => setTimeout(() => {
          const op = (e) => e ? +getComputedStyle(e).opacity : -1;
          const res = { ligne: op(r), verre: op(r.querySelector('.gs')), nom: op(r.querySelector('.rank-name')) };
          r.remove(); ok(res);
        }, 600));
      });
      dit('4. ' + tel + ', un joueur parti : la ligne entière, le contenu en retrait', g.ligne === 1 && (g.verre === 1 || g.verre === -1) && Math.abs(g.nom - 0.55) < 0.01, JSON.stringify(g));
      await ctx.close();
    }
    dit('5. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la place libre du salon a toujours le même verre dépoli que les joueurs');
  process.exit(ko ? 1 : 0);
})();
