/* LE TROU D'UN PIXEL AU BORD D'UNE FEUILLE.
   Toutes les surfaces gardent un « border:1px solid transparent ». Or
   overflow:clip découpe à la boîte de PADDING : ce pixel est HORS de la
   découpe, et la couche de verre (.gs), qui est un enfant, n'y peint pas. Il
   reste un pixel transparent — on voit droit à travers.

   Sur une carte posée sur la photo, personne ne le remarque : la photo est
   lisse. Sur une FEUILLE, ce qu'il y a derrière c'est l'application, donc du
   TEXTE — et on voyait le haut des lettres traverser l'arête.

   overflow-clip-margin:1px règle le cas là où il est honoré. Ce test le
   NEUTRALISE volontairement, pour mesurer ce que voit un navigateur qui ne
   l'honore pas : c'est le seul moyen de reproduire ce que Taylor a photographié.

       node fuite.js sansmarge "html.gl-xf .has-gs{ overflow-clip-margin:0px !important; }"
       python3 fuite.py sansmarge

   Repère : la variation locale DANS la feuille doit rester sous ~1. Relevé
   avec le trou : 23,69. Sans : 0,69. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const D='/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/';
const TAG=process.argv[2]||'a', CSS=process.argv[3]||'';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'}));localStorage.setItem('bt_fs_hint','1');});
 await p.goto('http://127.0.0.1:8099/index.html');
 await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:20000});
 if(CSS) await p.addStyleTag({content:CSS});
 await p.evaluate(()=>{ state.screen='mode'; render(); openSettings(); });
 await p.waitForTimeout(1900);
 /* on glisse une bande de texte tres contraste JUSTE derriere le bord haut :
    du contenu ORDINAIRE de l'app, pose dans le flux normal, rien de truque. */
 const r=await p.evaluate(()=>{
   const f=document.querySelector('.settings-sheet'); const b=f.getBoundingClientRect();
   const t=document.createElement('div');
   t.id='sonde-texte';
   t.style.cssText='position:fixed;left:0;right:0;top:'+(b.top-9)+'px;height:26px;'
     +'font:900 22px/26px Arial,sans-serif;color:#000;background:#fff;letter-spacing:1px;'
     +'text-align:center;white-space:nowrap;overflow:hidden;';
   t.textContent='IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII';
   /* dans #app, donc DERRIERE la feuille comme n'importe quelle carte */
   document.getElementById('app').appendChild(t);
   return {left:Math.round(b.left), top:Math.round(b.top), right:Math.round(b.right)};
 });
 await p.waitForTimeout(500);
 await p.screenshot({ path:D+'f2-'+TAG+'.png' });
 fs.writeFileSync(D+'f2-'+TAG+'.json', JSON.stringify(r));
 console.log('  feuille : ' + JSON.stringify(r) + '   erreurs : ' + (errs.length?JSON.stringify([...new Set(errs)]):'aucune'));
 await ctx.close(); await b.close(); })();
