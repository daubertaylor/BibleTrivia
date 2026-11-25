/* ====== L'OMBRE DU COFFRE, SOUS LUI (v381) ======
   « Quand je slide, l'ombre ne bouge pas, elle fait très fixe. Si tu dois la
     retirer ou faire en sorte qu'elle agisse en fonction du décor, fais comme
     tu penses le mieux, mais règle ça. »
     1. les images du coffre ne portent plus d'ombre peinte : à droite de la
        caisse, plus un pixel (fermé, prêt, ouvert) ;
     2. la caisse est au milieu de son image (plus de décalage à compenser) ;
     3. sur le chemin, une ombre de contact sous la caisse : centrée sur elle,
        à sa base, transparente (elle assombrit le décor, quel qu'il soit) ;
     4. le coffre prêt respire depuis sa base, et son ombre avec lui, au même
        rythme et au même instant ; au loin, éteint, son ombre est pâle ;
     5. aucune erreur.
   Usage : node banc-essai/coffre-ombre.js [url du jeu] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await ctx.route(/supabase\.co|googlesyndication|doubleclick/, r => r.abort());
    await ctx.addInitScript(() => { if (!/^http/.test(location.protocol)) return; localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });

    /* 1 et 2 : les images elles-mêmes */
    const img = await p.evaluate(async () => {
      const out = {};
      for (const k of ['ferme', 'pret', 'ouvert']) {
        const im = new Image(); im.src = COFFRE_IMG[k]; await im.decode();
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        /* la caisse : ses pixels pleins ; l'ombre : ce qui est visible plus de 6 px à sa droite, dans le bas de l'image */
        let gauche = c.width, droite = 0;
        for (let y = Math.round(c.height * 0.55); y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 250) { gauche = Math.min(gauche, x); droite = Math.max(droite, x); }
        let ombre = 0;
        for (let y = Math.round(c.height * 0.55); y < c.height; y++) for (let x = droite + 7; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 12) ombre++;
        out[k] = { w: c.width, gauche, droite, milieu: (gauche + droite) / 2, ombre };
      }
      return out;
    });
    dit('1. les images du coffre ne portent plus d\'ombre peinte (fermé, prêt, ouvert)', ['ferme', 'pret', 'ouvert'].every(k => img[k].ombre === 0), JSON.stringify(img));
    dit('2. la caisse est au milieu de son image', ['ferme', 'pret', 'ouvert'].every(k => Math.abs(img[k].milieu - img[k].w / 2) <= 2.5), JSON.stringify(Object.fromEntries(Object.entries(img).map(([k, v]) => [k, v.milieu + ' / ' + v.w]))));

    /* 3 et 4 : sur le chemin — le coffre de la Genèse prêt, les autres éteints */
    await p.evaluate(() => {
      const f = {}; for (let l = 0; l < LECONS_PAR_UNITE; l++) f[cleLecon(0, l)] = '2026-11-01';
      localStorage.setItem('bt_parcours', JSON.stringify({ faites: f }));
      ouvrirChemin();
    });
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const c = document.querySelector('.ch-coffre.pret'), x = document.querySelector('.ch-coffre.ferme');
      if (!c || !x) return { manque: true };
      c.scrollIntoView({ block: 'center' });
      const b = c.querySelector('.ch-coffre-btn'), im = c.querySelector('.cf-img'), o = c.querySelector('.cf-ombre');
      const rb = b.getBoundingClientRect(), ri = im.getBoundingClientRect(), ro = o.getBoundingClientRect();
      const cs = getComputedStyle(o), ci = getComputedStyle(im);
      const ai = im.getAnimations().find(a => a.animationName === 'chCoffreSouffle'), ao = o.getAnimations().find(a => a.animationName === 'chOmbreSouffle');
      const ox = x.querySelector('.cf-ombre');
      return {
        centre: Math.round(Math.abs((ro.left + ro.width / 2) - (ri.left + ri.width / 2)) * 10) / 10,
        base: Math.round((ri.top + ri.height * 0.94) - (ro.top + ro.height / 2)),
        fond: cs.backgroundImage.slice(0, 40), translate: ci.translate, origine: Math.round(parseFloat(ci.transformOrigin.split(' ')[1]) / im.offsetHeight * 100),
        btnAnime: b.getAnimations().length,
        souffle: ai && ao ? { di: ai.effect.getTiming().duration, do: ao.effect.getTiming().duration, ecart: Math.round(Math.abs(ai.currentTime - ao.currentTime)) } : null,
        eteinte: ox ? +getComputedStyle(ox).opacity : null
      };
    });
    dit('3. une ombre de contact sous la caisse : centrée sur elle, à sa base, transparente',
      !r.manque && r.centre <= 2 && Math.abs(r.base) <= 6 && /radial-gradient/.test(r.fond) && (r.translate === 'none' || r.translate === '0px'), JSON.stringify(r));
    dit('4. le coffre prêt respire depuis sa base, son ombre avec lui (même rythme, même instant) ; éteint, son ombre est pâle',
      !r.manque && r.souffle && r.souffle.di === r.souffle.do && r.souffle.ecart <= 50 && r.origine === 94 && r.btnAnime === 0 && r.eteinte === 0.5, JSON.stringify(r));
    await ctx.close();
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('5. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le coffre n\'a plus d\'ombre peinte : son ombre est sous lui, et elle respire avec lui');
  process.exit(ko ? 1 : 0);
})();
