/* ====== BANC « LE JEU NE SUIT PAS LE MODE SOMBRE DU TÉLÉPHONE » (v335) ======
   « Sur Android, le jeu ne doit pas être en mode sombre en fonction du
     téléphone : le jeu ne doit pas changer. » Un Android, quatre écrans
   (l'accueil, le profil, les réglages, les groupes), photographiés trois
   fois :
     — téléphone en mode clair ;
     — téléphone en mode sombre ;
     — téléphone en mode sombre ET l'assombrissement automatique des sites
       (celui de Chrome, « Thème sombre pour les sites ») ;
     1. les trois photos de chaque écran sont les mêmes (au scintillement
        des étoiles du logo près : 0,3 % des pixels au plus) ;
     2. le jeu déclare son schéma partout où les navigateurs le cherchent :
        la balise color-scheme, la racine en CSS avec « only », et la règle
        « styles sombres » que Samsung Internet cherche avant de forcer —
        qui redit la même chose ;
     3. aucune autre règle du jeu ne lit le mode du téléphone ;
     4. aucune erreur.
   Avant la v335 : 1 vert (Chrome s'abstenait déjà), 2 rouge — rien pour
   Samsung Internet.
   Usage : node banc-essai/sombre-android.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };
const ECRANS = [
  ['accueil', () => {}],
  ['profil', () => { state.screen = 'profile'; render(); }],
  ['réglages', () => openSettings()],
  ['groupes', () => allerOnglet('groupes')],
];

(async () => {
  const photos = {}, erreurs = [];
  let decl = null;
  try {
    for (const [cond, args, schema] of [['clair', [], 'light'], ['sombre', [], 'dark'], ['assombri', ['--blink-settings=forceDarkModeEnabled=true'], 'dark']]) {
      const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args });
      try {
        for (const [nom, aller] of ECRANS) {
          const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: AND, colorScheme: schema, serviceWorkers: 'block' });
          const p = await ctx.newPage();
          p.on('pageerror', e => erreurs.push(cond + '/' + nom + ' : ' + e.message));
          await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
          await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
          await p.goto(URL);
          await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
          await p.waitForTimeout(900);
          await p.evaluate(aller);
          await p.waitForTimeout(1600);
          photos[cond + '/' + nom] = await p.screenshot();
          if (!decl && cond === 'clair') decl = await p.evaluate(() => {
            const meta = (document.querySelector('meta[name="color-scheme"]') || {}).content || '';
            const racine = getComputedStyle(document.documentElement).colorScheme;
            const regles = [];
            const fouille = (liste) => { for (const r of liste) {
              if (r.media && /prefers-color-scheme/.test(r.conditionText || r.media.mediaText)) regles.push({ m: r.conditionText || r.media.mediaText, t: [...r.cssRules].map(x => x.cssText).join(' ') });
              else if (r.cssRules) fouille(r.cssRules);
            } };
            for (const s of document.styleSheets) { try { fouille(s.cssRules); } catch (e) {} }
            return { meta, racine, regles };
          });
          await ctx.close();
        }
      } finally { await nav.close(); }
    }
    /* 1. comparer, pixel à pixel, dans une page vierge */
    const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const p = await (await nav.newContext()).newPage();
    const ecart = (a, b) => p.evaluate(async ([a, b]) => {
      const lit = async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      const da = await lit(a), db = await lit(b);
      let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > 24) n++;
      return n / (da.length / 4);
    }, [a.toString('base64'), b.toString('base64')]);
    const det = [];
    let bon = true;
    for (const [nom] of ECRANS) {
      const s = await ecart(photos['clair/' + nom], photos['sombre/' + nom]);
      const f = await ecart(photos['clair/' + nom], photos['assombri/' + nom]);
      if (s > 0.003 || f > 0.003) bon = false;
      det.push(nom + ' : sombre ' + (100 * s).toFixed(2) + ' %, assombri ' + (100 * f).toFixed(2) + ' %');
    }
    await nav.close();
    dit('1. clair, sombre, assombri d\'office : le même jeu, écran par écran', bon, det.join(' · '));
    /* 2 et 3 */
    const r = (decl && decl.regles) || [];
    const samsung = r.filter(x => /prefers-color-scheme:\s*dark/.test(x.m));
    dit('2. le schéma déclaré partout : balise, racine « only dark », et la règle sombre qui redit la même chose',
      /* (Chromium écrit « dark only » : l'ordre des deux mots ne compte pas.) */
      decl && /\bdark\b/.test(decl.meta) && /^(only dark|dark only)$/.test(decl.racine) && samsung.length === 1
        && /^:root\s*\{\s*color-scheme:\s*(only dark|dark only);\s*\}$/.test(samsung[0].t.trim()),
      JSON.stringify(decl));
    dit('3. aucune autre règle ne lit le mode du téléphone', r.length === samsung.length, r.map(x => x.m).join(' | '));
    dit('4. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — sur Android, le jeu garde son visage, que le téléphone soit clair ou sombre');
  process.exit(ko ? 1 : 0);
})();
