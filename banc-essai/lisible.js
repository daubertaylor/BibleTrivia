/* ====== BANC « LE LIBELLÉ NE DISPARAÎT JAMAIS EN CHANGEANT DE PUCE » ======
   « Lorsque je change de bouton, j'ai l'impression qu'il y a un petit effet
   bizarre, c'est léger. »

   CE QUE C'ÉTAIT, MESURÉ IMAGE PAR IMAGE. Sur la puce QUI PART, le texte va du
   blanc à l'encre pendant que son fond va du rouge au crème. Les deux courbes
   de clarté se croisent au milieu — et au croisement elles sont ÉGALES :
   texte rgb(168,166,163) sur fond rgb(243,137,114), contraste 1,00. Le mot
   n'est pas pâle, il n'existe plus. Deux images, juste assez pour qu'on sente
   « quelque chose de bizarre » sans pouvoir le nommer. La puce qui ARRIVE
   faisait la même chose à l'envers (1,07).

   ON NE PEUT PAS ÉVITER LE CROISEMENT — un texte clair sur fond sombre qui
   devient un texte sombre sur fond clair doit bien passer par là. On le
   FRANCHIT donc d'un coup, au bon instant, au lieu de s'y attarder.

   CE BANC MESURE LA SEULE CHOSE QUI COMPTE : le contraste du libellé contre
   son propre fond, à chaque image, pour les DEUX puces. Sous 1,5, le mot
   disparaît. Le seuil est à 3 — la limite de lisibilité d'un texte gras.
   Usage : node banc-essai/lisible.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SEUIL = 3.0;

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.evaluate(()=>{ state.mode='solo'; state.screen='setup'; render(); });
  await p.waitForTimeout(1300);

  const cap = p.evaluate(()=> new Promise(res=>{
    const chips=[...document.querySelectorAll('.chip')];
    const part   = chips.find(c=>c.classList.contains('active') && /30/.test(c.textContent));
    const arrive = chips.find(c=>/Sans/.test(c.textContent));
    const rel=[]; const t0=performance.now();
    const lum=(c)=>{ const m=(c.match(/[\d.]+/g)||[0,0,0]).map(Number);
      const f=(v)=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);};
      return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]); };
    const mes=(e)=>{ if(!e) return 99; const cs=getComputedStyle(e);
      const a=lum(cs.color), b=lum(cs.getPropertyValue('--glass-tint').trim() || cs.backgroundColor);
      return +(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05))).toFixed(2); };
    const tic=()=>{
      rel.push([ +(performance.now()-t0).toFixed(0), mes(part), mes(arrive) ]);
      if(performance.now()-t0<600) requestAnimationFrame(tic); else res(rel);
    };
    requestAnimationFrame(tic);
  }));
  await p.waitForTimeout(60);
  await p.evaluate(()=>{ const c=[...document.querySelectorAll('.chip')].find(x=>/Sans/.test(x.textContent)); if(c) c.click(); });
  const rel = await cap;

  let ko = 0;
  const creux = (k)=> Math.min(...rel.map(r=>r[k]).filter(v=>v>0 && v<90));
  const v = (nom, val)=>{ const bon = val >= SEUIL; if(!bon) ko++;
    console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(38) + 'creux ' + val.toFixed(2) + '  (minimum ' + SEUIL + ')'); };
  v("la puce qui PART reste lisible",   creux(1));
  v("la puce qui ARRIVE reste lisible", creux(2));
  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK — le mot reste lisible d\'un bout à l\'autre du changement'
                       : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
