/* ============ BANC « LA BARRE MONTE, ELLE NE SAUTE PAS » ============
   « Je veux que la barre de progression monte de façon fluide, pas par
   à-coups. » Deux défauts en un, et le premier explique le second : chaque
   question REFABRIQUE l'écran, donc une barre neuve — et une transition n'a
   rien à transitionner depuis. Ce qu'on prenait pour une montée saccadée était
   l'absence complète de montée : la barre apparaissait déjà à sa longueur.
   On vérifie donc qu'il y a bien un MOUVEMENT (plusieurs valeurs distinctes
   entre deux questions) et qu'il est continu (aucun pas plus grand que la
   moitié de la course).
   Usage : node banc-essai/barre.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
let ko = 0;
function v(nom, bon, detail){ if(!bon) ko++; console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(52) + (detail||'')); }
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.evaluate(()=>{ state.mode='solo'; state.daily=false; startGame(); });
  await p.waitForTimeout(900);

  /* On relève l'échelle horizontale de la barre à chaque image pendant qu'on
     passe à la question suivante. */
  const suite = await p.evaluate(()=> new Promise(res=>{
    const l=[]; const t0=performance.now();
    const tic=()=>{
      const f=document.querySelector('.progress-fill');
      if(f){ const m=new DOMMatrixReadOnly(getComputedStyle(f).transform); l.push(+m.a.toFixed(4)); }
      if(performance.now()-t0 < 1300) requestAnimationFrame(tic); else res(l);
    };
    requestAnimationFrame(tic);
    setTimeout(()=>{ state.revealed = true; nextQuestion(); }, 120);
  }));
  const vues = [...new Set(suite)];
  const depart = suite[0], arrivee = suite[suite.length-1];
  let pire = 0;
  for(let i=1;i<suite.length;i++){ const d = Math.abs(suite[i]-suite[i-1]); if(d > pire) pire = d; }
  const course = Math.abs(arrivee - depart);
  v("la barre avance bien d'une question à l'autre", course > 0.02, 'de ' + depart.toFixed(3) + ' à ' + arrivee.toFixed(3));
  /* CE QUI SÉPARE UNE MONTÉE D'UN SAUT : le nombre d'images intermédiaires.
     Un saut n'en a aucune — deux valeurs, avant et après. Une montée de la
     durée d'un pli en a une vingtaine. On en exige au moins huit. */
  v("elle passe par des valeurs intermédiaires", vues.length >= 8, vues.length + ' valeurs distinctes');
  v("et aucun pas ne fait plus du tiers de la course", course > 0 && pire <= course / 3,
    'plus grand pas ' + pire.toFixed(4) + ' pour une course de ' + course.toFixed(4));
  /* Et elle est portée par un transform, pas par une largeur : une longueur se
     recalcule à chaque image, une échelle se règle sur le compositeur. */
  v("elle est mue par une échelle, pas par une largeur", await p.evaluate(()=>{
    const f=document.querySelector('.progress-fill'); if(!f) return false;
    const cs=getComputedStyle(f);
    return cs.transitionProperty.indexOf('transform') >= 0 && cs.transitionProperty.indexOf('width') < 0;
  }), true);

  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await b.close();
  console.log(ko===0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko===0?0:1);
})();
