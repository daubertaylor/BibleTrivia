/* ============ BANC « UN VIEIL APPAREIL » ============
   « Ma mère a un vieux Xiaomi, j'ai l'impression que ça bug. »

   ON NE PLAFONNE PAS LES IMAGES PAR SECONDE. Un plafond ne rend rien plus
   fluide : il jette des images que l'appareil savait faire. Ce qui sauve un
   vieux téléphone, c'est de lui donner MOINS DE TRAVAIL PAR IMAGE.
   Encore faut-il savoir où part le travail. Ce banc freine le fil principal
   (le compositeur, lui, ne ralentit pas — comme sur un vrai appareil dont le
   processeur est lent mais l'écran normal) et mesure le temps d'image médian
   sur chaque écran, dans quatre configurations :

     tout            l'état actuel
     sans le verre   la boucle du verre au repos
     sans les anims  les animations sans fin coupées (ce que perf-bas fait déjà)
     les deux        le plancher : ce que coûte le reste

   La différence entre « tout » et « sans le verre » est le prix du verre.
   Celle entre « tout » et « sans les anims » est le prix des animations. On
   saura alors quoi alléger, au lieu de le deviner.
   Usage : node banc-essai/vieux.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const ECRANS = [
  ['accueil',     "state.screen='mode'; render();"],
  ['en partie',   "state.mode='solo'; state.daily=false; startGame();"],
  ['progression', "state.screen='mode'; render(); openParcours();"],
  ['réglages',    "state.screen='mode'; render(); openSettings();"],
];
const CONFIGS = [
  ['tout',          ()=>{}],
  ['sans le verre', ()=>{ window.__verreOff = true; }],
  ['sans les anims',()=>{ document.documentElement.classList.add('perf-bas'); }],
  ['les deux',      ()=>{ window.__verreOff = true; document.documentElement.classList.add('perf-bas'); }],
];

(async()=>{
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  for(const frein of [1, 6]){
    console.log('\n  ===== fil principal freiné x' + frein + ' =====');
    console.log('  écran          ' + CONFIGS.map(c=>c[0].padStart(15)).join(''));
    for(const [nomE, chemin] of ECRANS){
      const ligne = [];
      for(const [nomC, prep] of CONFIGS){
        const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
        const p = await ctx.newPage();
        await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1');
          localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':14,'Jean':9}, totalCorrect:505, ach:{premier:1} })); });
        await p.goto(URL);
        await p.waitForFunction(()=>{ try{ return typeof render==='function'; }catch(e){ return false; } }, null, {timeout:20000});
        /* Le verre « éteint » : on empêche sa fenêtre d'activité de s'ouvrir.
           La boucle tourne toujours (elle mesure la vitesse), elle ne fait
           simplement plus de travail — c'est exactement ce qu'on veut chiffrer. */
        await p.evaluate(()=>{ const o = window.queueGlassSync;
          window.queueGlassSync = function(){ if(window.__verreOff) return; return o.apply(this, arguments); }; });
        await p.evaluate(prep);
        await p.evaluate((c)=>{ new Function(c)(); }, chemin);
        await p.waitForTimeout(900);
        const cdp = await p.context().newCDPSession(p);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: frein });
        const med = await p.evaluate(()=> new Promise(res=>{
          const l=[]; let t0=performance.now(), prec=t0;
          const tic=(now)=>{ l.push(now-prec); prec=now;
            if(now-t0 < 2200) requestAnimationFrame(tic);
            else { l.sort((a,b)=>a-b); res(+l[l.length>>1].toFixed(1)); } };
          requestAnimationFrame(tic);
        }));
        ligne.push(med);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        await ctx.close();
      }
      console.log('  ' + nomE.padEnd(14) + ligne.map(v=>(v + ' ms').padStart(15)).join(''));
    }
  }
  await nav.close();
})();
