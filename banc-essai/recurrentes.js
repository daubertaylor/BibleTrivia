/* ====== BANC « ON RÉVISE CE QUI RÉSISTE, PAS CE QUI TOMBE SOUS LA MAIN » ======
   « Fais aussi en sorte de pas seulement revoir les erreurs une par une, mais
   plutôt les erreurs récurrentes, pour vraiment cibler le joueur. »

   CE QUE LE CARNET SAVAIT SANS S'EN SERVIR. Chaque entrée compte ses échecs
   dans « n », incrémenté à chaque faute. Ce nombre n'était lu NULLE PART : ni
   pour choisir quoi jouer, ni pour ordonner. Le tirage était un mélange pur —
   une question ratée sept fois passait en dernier aussi souvent qu'une ratée
   une seule. Réviser au hasard, c'est réviser ce qu'on sait déjà aussi souvent
   que ce qu'on ne sait pas.

   DEUX EXIGENCES, ET ELLES VONT ENSEMBLE :
     — une PORTE qui ne joue que ce qui a résisté au moins deux fois, et qui
       annonce le bon compte ;
     — un ORDRE, dans TOUTES les portes, où ce qui résiste le plus passe
       devant. C'est celle-là qui compte vraiment : elle s'applique même quand
       le joueur n'a rien demandé de particulier.
   Usage : node banc-essai/recurrentes.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/* Un carnet témoin : douze questions, des entêtements de 1 à 5, toutes dues
   aujourd'hui pour que rien d'autre que l'ordre ne puisse expliquer le résultat. */
const CARNET = Array.from({length:12}, (_,i)=>({
  k:'q'+i, n:(i%5)+1, p:0, du:'2000-01-01', maj:Date.now(),
  q:'Question '+i, options:['a','b','c','d'], correct:'a', fact:'', tier:'moyen',
}));

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript((c)=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
    localStorage.setItem('bt_errbook', JSON.stringify(c));
  }, CARNET);
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});

  let ko = 0;
  const v = (nom, bon, det)=>{ if(!bon) ko++; console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(50) + det); };

  /* 1. la porte annonce ce qu'elle jouera */
  await p.evaluate(()=>{ ouvrirRevoir(); });
  await p.waitForTimeout(700);
  const porte = await p.evaluate(()=>{
    const b = [...document.querySelectorAll('.rv-choix')].find(x=>/résistent/i.test(x.textContent));
    if(!b) return null;
    return { txt: b.querySelector('b').textContent, n: +b.querySelector('.rv-cnt').textContent };
  });
  const attendu = CARNET.filter(x=>x.n>=2).length;
  v("une porte « ce qui résiste », au bon compte", !!porte && porte.n === attendu,
    porte ? (porte.n + ' annoncé, ' + attendu + ' attendu') : 'porte absente');

  /* 2. elle ne joue QUE ce qui a résisté */
  if(porte){
    await p.evaluate(()=>{ startRevision('tetues'); });
    await p.waitForTimeout(500);
    const jouees = await p.evaluate(()=> state.questions.map(q=>q.q));
    const unefois = CARNET.filter(x=>x.n<2).map(x=>x.q);
    const fuite = jouees.filter(q=>unefois.includes(q));
    v("elle ne joue que ce qui a résisté 2 fois ou plus", fuite.length===0 && jouees.length===attendu,
      jouees.length + ' jouées, ' + fuite.length + ' qui n\'avaient rien à y faire');
  }

  /* 3. L'ORDRE, dans une porte qui n'a rien demandé de particulier. */
  await p.evaluate(()=>{ startRevision('tout'); });
  await p.waitForTimeout(500);
  const ordre = await p.evaluate((c)=>{
    const par = {}; c.forEach(x=>{ par[x.q] = x.n; });
    return state.questions.map(q=>par[q.q]);
  }, CARNET);
  let decroissant = true;
  for(let i=1;i<ordre.length;i++) if(ordre[i] > ordre[i-1]) { decroissant = false; break; }
  v("ce qui résiste le plus passe devant", decroissant, 'entêtements joués : ' + ordre.join(' '));

  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
