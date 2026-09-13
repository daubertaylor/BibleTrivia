/* ========= BANC « LE RECADRAGE À L'OUVERTURE DU CLAVIER » =========
   « Quand le clavier s'ouvre et que la caméra s'ajuste au clavier, fais en
   sorte que ce soit ultra fluide ; là ça saccade un tout petit peu. »
   UN DÉFILEUR NE CONNAÎT QUE LES PIXELS ENTIERS — vérifié dans le moteur :
   app.scrollTop = 10,25 donne 10 ; 10,5 donne 11. Une courbe d'arrivée passe
   son dernier tiers à parcourir moins d'un pixel par image : le défileur ne
   peut alors qu'alterner « un pixel » et « rien ». C'est ça, la saccade — et
   elle ne se voit pas dans la durée totale, seulement dans les IMAGES MORTES,
   celles où rien ne bouge alors que le mouvement n'est pas fini.
   Relevé sur la carte des joueurs, 54 px de course :
     avant  3 6 4 4 4 3 4 3 2 3 2 3 2 1 2 1 0 1 0 1 0 1   (6 images mortes)
     après  6 9 12 8 6 6 3 2 1 1                          (0)
   Usage : node banc-essai/camera.js [url] [bridage]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const BRIDE = Number(process.argv[3] || 4);
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CAS = [
  ['groupe', "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'},{name:'D'},{name:'E'}]; state.screen='setup'; render();", '.team-row input'],
  ['plein',  "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'},{name:'D'},{name:'E'},{name:'F'},{name:'G'},{name:'H'}]; state.screen='setup'; render();", '.team-row:last-of-type input'],
];
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: BRIDE });
  let ko = 0;
  for (const [nom, prep, sel] of CAS) {
    await p.setViewportSize({ width:393, height:852 });
    await p.evaluate(s=>{ new Function(s)(); }, prep);
    await p.waitForTimeout(1300);
    const trouve = await p.evaluate((s)=>{ const e=document.querySelector(s); if(!e) return false; e.focus(); return true; }, sel);
    if(!trouve){ console.log('  ' + nom + ' : pas de champ'); ko++; continue; }
    await p.waitForTimeout(150);
    const cap = p.evaluate(()=> new Promise(res=>{
      const app = document.getElementById('app');
      const rel = []; const t0 = performance.now();
      const tic = ()=>{ rel.push([+(performance.now()-t0).toFixed(1), +app.scrollTop.toFixed(2)]);
        if(performance.now()-t0 < 1700) requestAnimationFrame(tic); else res(rel); };
      requestAnimationFrame(tic);
    }));
    await p.setViewportSize({ width:393, height:516 });
    const rel = await cap;
    /* On découpe en MOUVEMENTS : des suites d'images où la page bouge, séparées
       par au moins 100 ms d'immobilité. Chacun se juge à part — un recadrage
       puis une petite correction, ce sont deux gestes, pas un. */
    const mouv = [];
    let cur = null;
    for (let i=1;i<rel.length;i++){
      const d = Math.abs(rel[i][1]-rel[i-1][1]);
      if (d > 0.01){ if(!cur){ cur = { i0:i-1, i1:i, pas:[] }; mouv.push(cur); } cur.i1 = i; cur.pas.push(d); }
      else if (cur && rel[i][0] - rel[cur.i1][0] > 100) cur = null;
    }
    if(!mouv.length){ console.log('  ' + nom.padEnd(7) + ' : la page ne bouge pas'); continue; }
    let mortes = 0, total = 0, pire = 0;
    for (const m of mouv){
      const course = Math.abs(rel[m.i1][1] - rel[m.i0][1]);
      const duree = rel[m.i1][0] - rel[m.i0][0];
      /* images mortes = images SANS mouvement à l'intérieur du geste */
      let mm = 0;
      for (let i=m.i0+1;i<=m.i1;i++) if (Math.abs(rel[i][1]-rel[i-1][1]) < 0.01) mm++;
      mortes += mm; total++;
      if (mm > pire) pire = mm;
      console.log('  ' + nom.padEnd(7) + ' geste ' + total + ' : ' + course.toFixed(0) + ' px en ' + duree.toFixed(0) + 'ms'
        + ' | images mortes ' + mm
        + ' | pas ' + m.pas.slice(0,16).map(x=>x.toFixed(0)).join(' '));
    }
    /* UNE SEULE IMAGE MORTE EN PLEIN GESTE SE VOIT. On en tolère une (le hasard
       du calage sur la grille de pixels), pas deux. */
    if (pire > 1){ ko++; console.log('           ↳ ça bégaie : ' + pire + ' images sans mouvement dans un même geste'); }
    await p.waitForTimeout(500);
  }
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
