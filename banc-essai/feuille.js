/* ============ BANC « LA FEUILLE EST FINIE AVANT DE BOUGER » ============
   « Lorsque j'ouvre les réglages je trouve légèrement que la page s'affiche
   en même temps que l'ouverture. »
   La feuille partait vers le haut à l'instant même de son insertion : la
   toute première image de l'animation était aussi la première image où le
   navigateur devait la peindre. Sur un téléphone chargé, le décor finissait
   donc d'arriver PENDANT la montée.
   Le banc bride le processeur (comme un téléphone occupé), ouvre chaque
   feuille et relève image par image : la position de la feuille, son verre
   (couche .gs + rebord) et la fenêtre d'ouverture du moteur de verre.
   Il exige quatre choses :
     1. la feuille ne part qu'une fois RELÂCHÉE (classe « monte ») : elle ne
        bouge donc jamais avant d'être finie ;
     2. à la première image qui bouge, le verre est déjà posé ;
     3. la fenêtre d'ouverture du verre couvre TOUTE la montée — sinon le
        moteur change de calage en plein vol ;
     4. le décor ne saute pas d'un pixel DANS la feuille pendant la montée.
   Mesuré sur la version d'avant, processeur bridé seize fois : le décor
   sautait de 12 px dans les Réglages, 371 ms après le départ.
   Usage : node banc-essai/feuille.js [url] [bridage]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const BRIDE = Number(process.argv[3] || 10);

/* [nom, mise en place (puis on laisse tout se poser), ouverture, fermeture].
   La mise en place est SÉPARÉE de l'ouverture : ouvrir deux feuilles dans la
   même tâche JavaScript n'arrive jamais sous le doigt, et fausse la mesure. */
const FEUILLES = [
  ['réglages', "state.screen='mode'; render();",                 "openSettings();", "closeSettings();"],
  ['bibles',   "state.screen='mode'; render(); openSettings();",  "openBibles();",   "closeBibles(); closeSettings();"],
  ['erreurs',  "state.screen='mode'; render();",                  "openMissedReview([{q:{q:'Qui a construit l\\'arche ?',a:['Noé','Moïse','Abraham','David'],c:0},donnee:1}]);", "closeMissedReview();"],
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: BRIDE });
  console.log('  processeur bridé x' + BRIDE + '\n');

  let ko = 0;
  for (const [nom, mise, ouvre, ferme] of FEUILLES) {
    try { await p.evaluate((s) => { new Function(s)(); }, mise); }
    catch(e){ console.log('  ' + nom + ' : mise en place impossible'); ko++; continue; }
    await p.waitForTimeout(1400);          // tout est posé, rien ne bouge plus
    /* La sonde démarre AVANT l'ouverture : la toute première image compte. */
    await p.evaluate(() => {
      window.__releve = [];
      window.__sonde = true;
      /* COMBIEN DE FEUILLES AVANT L'OUVERTURE. Les versions s'ouvrent
         PAR-DESSUS les réglages : sans ce compte de départ, la sonde
         commencerait par relever la feuille du dessous — celle qui ne bouge
         pas — et le premier mouvement mesuré serait l'apparition de l'autre. */
      const sel = '.sheet-veil:not(.closing) .settings-sheet';
      window.__n0 = document.querySelectorAll(sel).length;
      const boucle = () => {
        if (!window.__sonde) return;
        const t = document.querySelectorAll(sel);
        const f = t.length > window.__n0 ? t[t.length - 1] : null;
        if (f) {
          const r = f.getBoundingClientRect();
          window.__releve.push({
            t: +performance.now().toFixed(1),
            y: +r.top.toFixed(1),
            verre: f.classList.contains('has-gs') ? 1 : 0,
            gs: f.querySelector(':scope > .gs') ? 1 : 0,
            rim: f.querySelector(':scope > .glass-rim') ? 1 : 0,
            m: f.classList.contains('monte') ? 1 : 0,
            /* Où en est le FLOU de la feuille ? Tant que le moteur le cale sur
               la position de mise en page, ce nombre ne bouge pas d'un poil :
               le décor est peint sur la vitre et monte avec elle. S'il se met
               à changer en plein vol, c'est que le moteur a basculé en suivi
               écran — et le décor glisse alors DANS la feuille qui monte. */
            gy: (function(){
              const gs = f.querySelector(':scope > .gs');
              if(!gs) return null;
              const m = new DOMMatrixReadOnly(getComputedStyle(gs).transform);
              return +m.f.toFixed(1);
            })(),
            /* glassSheetOpenUntil est un « let » de premier niveau : il vit dans
               la portée lexicale globale, PAS sur window. */
            fen: +(((typeof glassSheetOpenUntil === 'number' ? glassSheetOpenUntil : 0)) - performance.now()).toFixed(1),
          });
        }
        requestAnimationFrame(boucle);
      };
      requestAnimationFrame(boucle);
    });
    try { await p.evaluate((s) => { new Function(s)(); }, ouvre); }
    catch(e){ console.log('  ' + nom + ' : injoignable (' + e.message.slice(0,60) + ')'); ko++; continue; }
    await p.waitForTimeout(1600);
    const rel = await p.evaluate(() => { window.__sonde = false; return window.__releve; });
    try { await p.evaluate((s) => { new Function(s)(); }, ferme); } catch(e){}
    await p.waitForTimeout(700);

    if (rel.length < 4) { console.log('  ' + nom.padEnd(9) + ' : relevé vide (' + rel.length + ' images)'); ko++; continue; }
    const y0 = rel[0].y;
    let iBouge = rel.findIndex(e => Math.abs(e.y - y0) > 0.5);
    const yFin = rel[rel.length - 1].y;
    /* Images figées AVANT le premier mouvement : la feuille existe, complète,
       et le navigateur a tout le temps de la peindre. */
    const figees = iBouge < 0 ? rel.length : iBouge;
    const prem = iBouge < 0 ? null : rel[iBouge];
    /* Dernière image encore en mouvement : la fenêtre de verre doit tenir. */
    let iDernier = -1;
    for (let i = rel.length - 1; i > 0; i--) { if (Math.abs(rel[i].y - rel[i-1].y) > 0.5) { iDernier = i; break; } }
    const fenFin = iDernier < 0 ? 0 : rel[iDernier].fen;
    const iMonte = rel.findIndex(e => e.m === 1);
    const duree = (iMonte < 0 || iDernier < 0) ? 0 : rel[iDernier].t - rel[iMonte].t;
    /* LE SAUT DU DÉCOR PENDANT LA MONTÉE. Zéro = le flou est peint sur la
       vitre du début à la fin. Tout le reste se voit. */
    let saut = 0, sautT = 0;
    if (iBouge >= 0 && iDernier > iBouge) {
      for (let i = iBouge + 1; i <= iDernier + 1 && i < rel.length; i++) {
        if (rel[i].gy === null || rel[i-1].gy === null) continue;
        const d = Math.abs(rel[i].gy - rel[i-1].gy);
        if (d > saut) { saut = d; sautT = rel[i].t - rel[iBouge].t; }
      }
    }

    /* « Relâchée » = la classe monte est posée AVANT le premier mouvement. */
    const okFigees = iMonte >= 0 && (iBouge < 0 || iBouge >= iMonte);
    const okVerre  = !prem || (prem.verre === 1 && prem.gs === 1 && prem.rim === 1);
    const okFen    = iDernier < 0 || fenFin > 0;
    const okSaut   = saut <= 1.5;
    const bon = okFigees && okVerre && okFen && okSaut;
    if (!bon) ko++;
    console.log('  ' + nom.padEnd(9) + ' ' + (bon ? 'OK ' : 'KO ') +
      ' images figées avant le départ=' + figees +
      ' | 1re image mobile : verre=' + (prem ? prem.verre + '/' + prem.gs + '/' + prem.rim : '—') +
      ' | fenêtre restante en fin de montée=' + fenFin.toFixed(0) + 'ms' +
      ' | course ' + y0.toFixed(0) + '→' + yFin.toFixed(0) + ' en ' + duree.toFixed(0) + 'ms' +
      ' | saut du décor=' + saut.toFixed(1) + 'px');
    if (!okFigees) console.log(iMonte < 0
      ? '             ↳ la feuille part sans être relâchée : elle bouge dès son insertion'
      : '             ↳ la feuille bouge AVANT d\'être relâchée');
    if (!okVerre)  console.log('             ↳ elle se met en marche AVANT que le verre soit posé');
    if (!okFen)    console.log('             ↳ la fenêtre de verre expire pendant la montée');
    if (!okSaut)   console.log('             ↳ le décor saute de ' + saut.toFixed(1) + 'px DANS la feuille, ' + sautT.toFixed(0) + 'ms après le départ');
  }

  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' feuille(s) en défaut');
  process.exit(ko === 0 ? 0 : 1);
})();
