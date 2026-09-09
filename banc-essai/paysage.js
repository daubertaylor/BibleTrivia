/* ===================== BANC « PAYSAGE » =====================
   Ce qu'on vérifie : téléphone couché, on ne doit RIEN voir de l'app.
   Le voile « Tourne l'écran » est un fond plein, mais depuis qu'il arrive
   avec l'horloge du jeu (0,52 s) il y a une demi-seconde où l'on voit au
   travers. Et ce qu'on voyait, c'était la colonne figée à 393 px collée à
   gauche d'un écran de 852 : l'écran coupé en deux.
   Trois mesures, sur trois téléphones :
     1. le voile est levé ET l'app est invisible (les deux conditions du
        style doivent tomber ensemble) ;
     2. à voile transparent, aucune couture verticale au bord de la colonne
        (on compare avec la plus forte couture ailleurs dans la photo, qui
        sert de témoin) ;
     3. redressé, l'app est de nouveau visible tout de suite.
   Usage : node banc-essai/paysage.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const D = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/';
const S = 2;                       /* échelle : 2 px physiques par px CSS */

const TELS = [
  ['iPhone 15',      393, 852],
  ['Pixel / Xiaomi', 412, 915],
  ['grand pliant',   500, 1023],
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ok = true;
  console.log('  téléphone         voile   app couchée   couture au bord   témoin ailleurs   retour');
  for (const [nom, w, h] of TELS) {
    const ctx = await nav.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:S,
      isMobile:true, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil:'networkidle' });
    await p.waitForTimeout(1200);

    await p.setViewportSize({ width:h, height:w });   /* on couche le téléphone */
    await p.waitForTimeout(150);

    const e = await p.evaluate(() => {
      const rl = document.getElementById('rotate-lock');
      const app = document.getElementById('app');
      return {
        voile: getComputedStyle(rl).display !== 'none',
        vis:   getComputedStyle(app).visibility,
        bord:  app.getBoundingClientRect().right,
      };
    });

    /* Voile rendu transparent : on regarde exactement ce que l'oeil voit à
       la première image de son arrivée. */
    await p.evaluate(() => {
      const rl = document.getElementById('rotate-lock');
      rl.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; });
      document.querySelectorAll('#rotate-lock *').forEach(el =>
        el.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }));
    });
    await p.waitForTimeout(80);
    await p.screenshot({ path: D + 'paysage.png' });
    fs.writeFileSync(D + 'paysage.json', JSON.stringify({ echelle:S, bord:e.bord }));
    const [dans, hors] = execSync('python3 ' + __dirname + '/paysage.py').toString().trim().split(' ').map(Number);

    /* On redresse : l'app doit revenir sans attendre. */
    await p.setViewportSize({ width:w, height:h });
    await p.waitForTimeout(120);
    const retour = await p.evaluate(() => getComputedStyle(document.getElementById('app')).visibility);

    const mauvais = !e.voile || e.vis !== 'hidden' || dans > Math.max(8, hors + 4) || retour !== 'visible';
    if (mauvais) ok = false;
    console.log('  ' + nom.padEnd(17) + (e.voile ? 'levé ' : 'ABSENT').padStart(6) +
      e.vis.padStart(14) + (dans.toFixed(1) + ' %').padStart(18) +
      (hors.toFixed(1) + ' %').padStart(18) + retour.padStart(9) +
      (mauvais ? '   <-- ' + (!e.voile ? 'PAS DE VOILE' : e.vis !== 'hidden' ? 'APP VISIBLE COUCHÉE'
        : retour !== 'visible' ? 'APP RESTÉE INVISIBLE' : 'ÉCRAN COUPÉ EN DEUX') : ''));
    await ctx.close();
  }
  await nav.close();
  console.log(ok ? '\n  OK' : '\n  ÉCHEC');
  process.exit(ok ? 0 : 1);
})();
