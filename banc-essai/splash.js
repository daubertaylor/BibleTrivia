/* ============ BANC « LE NOM S'ASSEMBLE, ET ON A LE TEMPS DE LE VOIR » ============
   « Au niveau de l'animation du nom du jeu lors du chargement, je trouve qu'il
   va trop vite, on n'a pas trop le temps de le voir. »
   Le but n'est pas que les lettres arrivent — elles y arrivaient déjà — c'est
   qu'on ait le temps de les voir arriver. Deux bornes, donc, et elles vont en
   sens contraire : assez lent pour être vu, assez rapide pour que le mot soit
   entier bien avant la fin des quatre secondes de l'écran de chargement.
   On lit la durée dans les animations elles-mêmes (getTiming), on ne la
   recopie pas : deux copies d'un même nombre finissent toujours par diverger.
   Les photographies servent à REGARDER l'assemblage, pas à le juger.
   Usage : node banc-essai/splash.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const D='/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
(async()=>{
  const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await nav.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:25000});
  await p.evaluate(()=>{ state.screen='splash'; render(); });
  await p.waitForTimeout(200);
  const fin = await p.evaluate(()=>{
    let f = 0;
    document.querySelectorAll('.splash-l').forEach(e=>{
      e.getAnimations().forEach(a=>{ const t=a.effect.getTiming();
        const d = (typeof t.delay==='number'?t.delay:0) + (typeof t.duration==='number'?t.duration:0);
        if(d>f) f=d; });
    });
    return Math.round(f);
  });
  /* Le mouvement VISIBLE : du départ de la première lettre à la pose de la
     dernière. C'est ce qu'on regarde, pas la durée d'une lettre seule. */
  const debut = await p.evaluate(()=>{
    let d = 1e9;
    document.querySelectorAll('.splash-l').forEach(e=>e.getAnimations().forEach(a=>{
      const t = a.effect.getTiming(); const x = (typeof t.delay==='number'?t.delay:0);
      if(x < d) d = x; }));
    return Math.round(d);
  });
  const visible = fin - debut;
  console.log('  dernière lettre posée à ' + fin + ' ms, mouvement visible ' + visible + ' ms'
    + "  (l'écran de chargement dure 4000 ms)");
  /* Assez lent pour se voir, assez rapide pour laisser le mot entier à l'écran
     au moins une seconde et demie. La v218 faisait 730 ms de mouvement : trop
     vite, c'est le défaut signalé. */
  const bon = visible >= 1100 && fin <= 2400;
  if(!bon){
    console.log(visible < 1100 ? '  KO — trop rapide : on n\'a pas le temps de le voir'
                               : '  KO — trop long : le mot n\'est pas posé assez tôt');
  }
  for(const ms of [0, 300, 600, 900, 1300, 1900]){
    await p.evaluate((ms)=>{ document.querySelectorAll('.splash-l, .splash-dove, .splash-dove-wrap').forEach(e=>{
      e.getAnimations().forEach(a=>{ a.pause(); a.currentTime = ms; }); });
      const w=document.querySelector('.splash-dove-wrap');
      if(w) w.getAnimations({subtree:true}).forEach(a=>{ a.pause(); a.currentTime = ms; });
    }, ms);
    await p.waitForTimeout(120);
    await p.screenshot({ path: D+'splash-'+ms+'.png', clip:{x:0,y:180,width:393,height:420} });
  }
  await nav.close();
  console.log(bon ? '\n  OK — le nom s\'assemble à un rythme qu\'on peut suivre' : '\n  ÉCHEC');
  process.exit(bon ? 0 : 1);
})();
