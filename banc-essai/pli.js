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

   3. LE DÉPART ET LA COURBE (v213). 0fr -> 1fr est commode, mais chronométré
      sur le rail lui-même il fait deux choses que personne n'a demandées :
      l'OUVERTURE reste immobile 67 ms après le tap là où la fermeture part en
      25, et les pas ACCÉLÈRENT (16,5 / 19,1 / 20,8 / 21,8 px) alors que
      --tr-plie ralentit. « Une marche qui bloque légèrement. » On épingle donc
      les deux bouts en pixels le temps de l'animation : départ 29 ms, pas
      32,3 / 30,2 / 28,1 / 25,9 px, et la fermeture devient son exact miroir.

   Le test relève tout ça, image par image.

       node pli.js                  (jeu servi en HTTP sur 8099)
       node pli.js "<css d essai>"  (pour comparer une autre courbe)

   Repères : retard du verre <= 2 px, saut max <= 40 px/image, l'ouverture ne
   part pas plus d'une image après la fermeture, et le premier pas est le plus
   grand (la courbe ralentit, elle n'accélère pas). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const CSS=process.argv[2]||'';
/* URL=... pour comparer une autre version (argv[2] est déjà pris par le CSS). */
const LIEN=process.env.URL||'http://127.0.0.1:8099/index.html';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'}));localStorage.setItem('bt_fs_hint','1');
   localStorage.setItem('bt_progress',JSON.stringify({books:{'Genèse':12,'Exode':8,'Matthieu':10},correct:360,streakBest:21,ach:{'premiers-pas':1}}));});
 await p.goto(LIEN);
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

 /* ===== LE DÉPART ET LA FORME DE LA COURBE, DANS LES DEUX SENS =====
    On relit le rail lui-même (grid-template-rows), pas la carte d'à côté :
    c'est LUI qu'on anime, et c'est lui qui partait en retard. */
 await p.waitForTimeout(1200);
 const sens = [];
 for (const quoi of ['fermeture','ouverture']) {   // il est ouvert : on ferme, puis on rouvre
   sens.push(await p.evaluate(()=> new Promise(res=>{
     const tete = document.querySelector('.tst-head');
     const corps = tete.closest('.tst').querySelector('.tst-body');
     const val = ()=> parseFloat(getComputedStyle(corps).gridTemplateRows) || 0;
     const rel = []; const t0 = performance.now(); let tap = null;
     const tic = ()=>{ rel.push([performance.now()-t0, val()]);
       if(performance.now()-t0 < 420) requestAnimationFrame(tic); else res({rel, tap}); };
     requestAnimationFrame(tic);
     setTimeout(()=>{ tap = performance.now()-t0; toggleTst(tete); }, 60);
   })));
   await p.waitForTimeout(1400);
 }
 const analyse = ({rel, tap})=>{
   const dep = rel.find(x=>x[0] >= tap);
   const v0 = dep ? dep[1] : rel[0][1];
   let iB = -1;
   for (let i=0;i<rel.length;i++){ if (rel[i][0] >= tap && Math.abs(rel[i][1]-v0) > 0.5){ iB = i; break; } }
   if (iB < 0) return { attente:9999, pas:[] };
   const pas = [];
   for (let i=iB;i<rel.length && pas.length<5;i++){ pas.push(Math.abs(rel[i][1] - rel[i-1][1])); }
   return { attente: rel[iB][0] - tap, pas };
 };
 const F = analyse(sens[0]), O = analyse(sens[1]);
 const dit = (n,a)=> '  ' + n + ' : part en ' + a.attente.toFixed(0) + 'ms, pas ' + a.pas.map(x=>x.toFixed(1)).join(' / ') + ' px';
 console.log(dit('fermeture', F));
 console.log(dit('ouverture', O));
 /* Une seule image d'écart admise entre les deux sens : au-delà, l'ouverture
    « bloque » et la fermeture non — c'est exactement ce que Taylor sentait. */
 const symetrique = (O.attente - F.attente) <= 20;
 const ralentit = (a)=> a.pas.length >= 3 && a.pas[0] >= a.pas[1] && a.pas[1] >= a.pas[2];
 const bon2 = symetrique && ralentit(F) && ralentit(O);
 if(!symetrique) console.log('  DEFAUT : l ouverture part ' + (O.attente-F.attente).toFixed(0) + 'ms apres la fermeture');
 if(!ralentit(O)) console.log('  DEFAUT : la courbe d ouverture ACCELERE au lieu de ralentir');
 if(!ralentit(F)) console.log('  DEFAUT : la courbe de fermeture ACCELERE au lieu de ralentir');
 console.log('  ' + (bon2 ? 'LE PLI PART TOUT DE SUITE, ET SUIT SA COURBE' : 'DEFAUT : le pli a une marche'));
 console.log('  erreurs : ' + (errs.length?JSON.stringify([...new Set(errs)]):'aucune'));
 await ctx.close(); await b.close();
 process.exit((bon && bon2)?0:1); })();
