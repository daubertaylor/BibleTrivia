/* LE PLI DOIT GLISSER, ET SON VERRE DOIT SUIVRE.
   Déplier un testament dans la Progression POUSSE tout ce qui est en dessous :
   la carte « Objectifs » parcourt 354 px. Deux choses peuvent mal se passer, et
   les deux se passaient mal.

   1. LE VERRE. Le moteur garde en cache la position de chaque surface et ne la
      relit qu'à la demande. Ici on la relisait à quatre instants (120, 300,
      520, 700 ms) pendant que la carte voyageait : mesuré image par image, la
      couche de décor restait immobile 130 ms puis se téléportait — jusqu'à
      257 px de retard À L'INTÉRIEUR de la carte. glassSuivre() demande une
      relecture par image, le temps de l'animation : retard ramené à 1 px.

   2. LE MOUVEMENT. Il empruntait --tr-ouvre, la courbe de ce qui ARRIVE, qui
      démarre très vite : des bonds de 57 px d'une image à l'autre, et 80 % du
      chemin fait en 144 ms. Sur une courbe de PLI (--tr-plie) : 32,6 px par
      image, 80 % à 239 ms.

   Le test relève les deux, image par image.

       node pli.js                  (jeu servi en HTTP sur 8099)
       node pli.js "<css d essai>"  (pour comparer une autre courbe)

   Repères : retard du verre <= 2 px, saut max <= 40 px/image. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const CSS=process.argv[2]||'';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'}));localStorage.setItem('bt_fs_hint','1');
   localStorage.setItem('bt_progress',JSON.stringify({books:{'Genèse':12,'Exode':8,'Matthieu':10},correct:360,streakBest:21,ach:{'premiers-pas':1}}));});
 await p.goto('http://127.0.0.1:8099/index.html');
 await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:20000});
 if(CSS) await p.addStyleTag({content:CSS});
 await p.evaluate(()=>{ state.screen='parcours'; render(); });
 await p.waitForTimeout(1500);
 const suite = await p.evaluate(()=> new Promise(res=>{
   const carte = document.querySelector('.ach-card');
   const tete  = document.querySelector('.tst-head');
   if(!carte || !tete) return res(null);
   const gs = carte.querySelector(':scope > .gs');
   const lire = ()=>{
     const r = carte.getBoundingClientRect();
     let gy = null;
     if(gs){ const m = new DOMMatrixReadOnly(getComputedStyle(gs).transform);
             gy = Math.round((gs.getBoundingClientRect().top - r.top)*10)/10; }
     return [Math.round(r.top*10)/10, gy];
   };
   const releve=[]; const t0=performance.now();
   toggleTst(tete);
   const tic=()=>{ const t=performance.now()-t0; const [y,g]=lire();
     releve.push([Math.round(t), y, g]);
     if(t<820) requestAnimationFrame(tic); else res(releve); };
   requestAnimationFrame(tic);
 }));
 if(!suite){ console.log('  elements introuvables'); await b.close(); return; }
 /* le decalage : de combien le verre est-il en retard sur sa carte ? */
 /* LE RETARD : si le verre compense exactement le deplacement de la carte,
    (y - y0) + (g - g0) vaut zero. Tout ecart est ce qu'on VOIT glisser. */
 const y0 = suite[0][1], g0 = suite[0][2];
 let pire = 0;

 for(const [t,y,g] of suite){
   const r = g===null ? 0 : Math.round(Math.abs((y-y0) + (g-g0))*10)/10;
   if(r > pire) pire = r;
   
 }
 /* et la brusquerie du mouvement lui-meme : px parcourus entre deux images */
 let saut=0, prev=null, t80=null;
 const total = Math.abs(suite[suite.length-1][1] - y0) || 1;
 for(const [t,y] of suite){
   if(prev!==null) saut = Math.max(saut, Math.abs(y-prev));
   if(t80===null && Math.abs(y-y0)/total > 0.8) t80 = t;
   prev=y;
 }
 console.log('  retard du verre : ' + pire + ' px   |   saut max : ' + Math.round(saut*10)/10
   + ' px/image   |   80 % du chemin en : ' + t80 + ' ms   (course ' + Math.round(total) + ' px)');
 const bon = pire <= 2 && saut <= 40;
 console.log('  ' + (bon ? 'LE PLI GLISSE, ET SON VERRE SUIT' : 'DEFAUT : ca saccade'));
 console.log('  erreurs : ' + (errs.length?JSON.stringify([...new Set(errs)]):'aucune'));
 await ctx.close(); await b.close();
 process.exit(bon?0:1); })();
