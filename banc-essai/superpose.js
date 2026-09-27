/* ====== BANC « LE VERRE DE LA FEUILLE DU DESSOUS NE SAUTE PAS » ======
   « Au moment que j'ouvre par exemple les versions de Bible, l'effet de verre
   sur la page réglage change d'affichage, en fait ça saute d'un coup alors que
   ça doit pas arriver. » (Taylor, capture à l'appui : la feuille LANGUE posée
   par-dessus la feuille Réglages.)

   L'INVARIANT. Quand une feuille en recouvre une autre, celle du dessous
   recule : scale(0,935). Sa couche de décor (.gs) reçoit alors un contre-zoom
   scale(1/0,935) pour que le paysage flouté garde sa VRAIE taille à l'écran.
   Donc, à chaque instant : échelle de la feuille x échelle du verre = 1.
   Pas seulement pendant le mouvement — TANT QUE la feuille reste en retrait.

   CE QU'IL A TROUVÉ, ET CE QUE MES QUATRE MESURES PRÉCÉDENTES ONT MANQUÉ.
   J'ai mesuré la position du calque, puis son échelle, puis le produit — mais
   TOUJOURS pendant l'animation, et TOUJOURS sur la feuille des versions. Or
   la fenêtre de compensation du moteur ne connaissait qu'un seul identifiant,
   « biblesVeil ». Avec la feuille des LANGUES par-dessus, la fenêtre se
   refermait au bout de msPli()+200 et le contre-zoom disparaissait d'un coup,
   feuille toujours en retrait :
       +600 ms   feuille 0,935   verre scale(1,06952)     (juste)
       +760 ms   feuille 0,935   verre — plus d'échelle    (le décor saute)
   Un saut de 6,5 % sur le paysage, 760 ms après le geste, alors que plus rien
   ne bouge à l'écran. C'est exactement ce que Taylor décrit.

   Ce banc vérifie l'invariant sur TOUTES les feuilles qui se superposent, à
   l'aller, longtemps après la fin de l'animation, ET pendant tout le retour —
   car au retour la classe « feuille-recule » part dès la première ligne de la
   fermeture alors que l'échelle met un pli entier à revenir.
   Usage : node banc-essai/superpose.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const TOLERANCE = 0.005;                 // 0,5 % — au-delà, l'œil voit le décor changer de taille
const INSTANTS = [300, 600, 780, 1000, 1500, 2400];

(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'T',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.waitForTimeout(600);

  const lire = ()=>p.evaluate(()=>{
    const f = document.querySelector('#settingsVeil .settings-sheet');
    if(!f) return null;
    const m = new DOMMatrixReadOnly(getComputedStyle(f).transform);
    let v = 1;
    if(f._gs){ const g = /scale\(([\d.]+)\)/.exec(f._gs.style.transform || ''); if(g) v = parseFloat(g[1]); }
    return { feuille:m.a, verre:v };
  });

  let ko = 0;
  for (const [nom, ouvrir, fermer] of [
    ['Version de la Bible', 'openBibles',  'closeBibles'],
    ['Langue',              'openLangues', 'closeLangues'],
  ]){
    await p.evaluate(()=>{ ['biblesVeil','languesVeil','settingsVeil'].forEach(i=>{ const e=document.getElementById(i); if(e) e.remove(); }); });
    await p.evaluate(()=>{ openSettings(); }); await p.waitForTimeout(1300);
    await p.evaluate((o)=>{ window[o](); }, ouvrir);
    let t = 0, pire = 0, tPire = 0, dernier = null, saut = 0, tSaut = 0;
    for (const ms of INSTANTS){
      await p.waitForTimeout(ms - t); t = ms;
      const r = await lire(); if(!r) continue;
      const prod = r.feuille * r.verre;                       // doit valoir 1
      const ecart = Math.abs(prod - 1);
      if(ecart > pire){ pire = ecart; tPire = ms; }
      if(dernier !== null && Math.abs(prod - dernier) > saut){ saut = Math.abs(prod - dernier); tSaut = ms; }
      dernier = prod;
    }
    const vert = pire <= TOLERANCE;
    if(!vert) ko++;
    console.log('%s  %s  pire ecart feuille x verre %s%% a %d ms | plus grand saut %s%% a %d ms',
      vert ? 'OK  ' : 'ECHEC', nom.padEnd(20), (pire*100).toFixed(2), tPire, (saut*100).toFixed(2), tSaut);
    /* LE RETOUR, MESURÉ LUI AUSSI. */
    await p.evaluate((f)=>{ window[f](); }, fermer);
    let tr = 0, pireR = 0, tPireR = 0;
    for (const ms of [60, 160, 300, 460, 620, 900, 1400]){
      await p.waitForTimeout(ms - tr); tr = ms;
      const r = await lire(); if(!r) continue;
      const e = Math.abs(r.feuille * r.verre - 1);
      if(e > pireR){ pireR = e; tPireR = ms; }
    }
    const vertR = pireR <= TOLERANCE;
    if(!vertR) ko++;
    console.log('%s  %s  retour : pire ecart %s%% a %d ms',
      vertR ? 'OK  ' : 'ECHEC', nom.padEnd(20), (pireR*100).toFixed(2), tPireR);
    await p.waitForTimeout(400);
  }
  if(errs.length){ console.log('ERREURS JS :', errs.slice(0,3).join(' | ')); ko++; }
  console.log(ko ? 'ECHEC — le decor de la feuille du dessous change de taille tout seul' : 'OK — le decor reste a sa vraie taille sous toutes les feuilles superposees');
  await b.close();
  process.exit(ko ? 1 : 0);
})();
