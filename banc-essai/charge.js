/* ========= BANC « LE MOTEUR DE VERRE NE PAIE PAS POUR RIEN » =========
   Une feuille ouverte ne doit pas rendre la boucle du verre plus chère qu'elle
   ne l'est déjà. La v214 lisait getComputedStyle sur chaque feuille ouverte à
   CHAQUE image — pour connaître l'échelle d'un recul qui, la plupart du temps,
   n'a pas lieu. Un getComputedStyle force un recalcul de style AU MILIEU de la
   boucle : mesuré, bridage six fois, l'image passait de 2,9 à 3,6 ms avec les
   Réglages ouverts, et de 3,0 à 4,5 ms avec les versions par-dessus.
   Le banc ne chronomètre pas (trop bruyant d'une machine à l'autre) : il
   COMPTE les lectures de style forcées pendant UNE passe du moteur. C'est
   déterministe, et c'est la cause, pas le symptôme.
   Usage : node banc-essai/charge.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.evaluate(()=>{
    const vrai = window.getComputedStyle;
    window.__gcs = 0;
    window.getComputedStyle = function(){ window.__gcs++; return vrai.apply(window, arguments); };
  });
  const passe = ()=>p.evaluate(()=>{ window.__gcs = 0; try{ queueGlassSync(); }catch(e){} return window.__gcs; });
  let ko = 0;
  const dire = (nom, n, max)=>{
    const bon = n <= max;
    if(!bon) ko++;
    console.log('  ' + nom.padEnd(22) + (bon?'OK ':'KO ') + n + ' lecture(s) de style forcée(s) (max ' + max + ')');
  };
  await p.waitForTimeout(900);
  dire('accueil seul', await passe(), 0);
  await p.evaluate(()=>{ openSettings(); }); await p.waitForTimeout(1500);
  /* AUCUNE feuille ne recule ici : le moteur ne doit RIEN lire. */
  dire('réglages ouverts', await passe(), 0);
  await p.evaluate(()=>{ openBibles(); }); await p.waitForTimeout(1500);
  /* Les versions sont posées : l'échelle est connue, elle est en cache. */
  dire('versions posées', await passe(), 0);
  /* Pendant le recul, en revanche, on relit — c'est là que ça sert. */
  await p.evaluate(()=>{ closeBibles(); }); await p.waitForTimeout(60);
  const enVol = await passe();
  const bon = enVol > 0 && enVol <= 4;
  if(!bon) ko++;
  console.log('  ' + 'pendant le recul'.padEnd(22) + (bon?'OK ':'KO ') + enVol + ' lecture(s) — il en faut, mais pas plus de 4');
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
