/* ============ BANC « UN VIEIL APPAREIL » ============
   « Ma mère a un vieux Xiaomi, j'ai l'impression que ça bug. »

   ON NE PLAFONNE PAS LES IMAGES PAR SECONDE. Un plafond ne rend rien plus
   fluide : il jette des images que l'appareil savait faire. Ce qui sauve un
   vieux téléphone, c'est de lui donner MOINS DE TRAVAIL PAR IMAGE.
   Encore faut-il savoir où part le travail.

   CE BANC A MESURÉ LE VIDE PENDANT DES SEMAINES. Il relevait le TEMPS ENTRE
   DEUX IMAGES, et rendait 16,7 ms partout — sur les quatre écrans, dans les
   quatre configurations, y compris avec le fil principal freiné six fois.
   C'est logique et c'était inutile : tant que le travail TIENT dans l'image,
   l'intervalle ne bouge pas d'un cheveu. Un écran qui consomme 2 ms par image
   et un autre qui en consomme 15 rendent exactement le même chiffre — et
   pourtant le second tombera le premier sur un appareil lent.
   ON MESURE DONC LE TRAVAIL, PAS L'INTERVALLE : le temps passé à exécuter du
   script, à recalculer les styles et à refaire la mise en page, relevé par le
   moteur lui-même. C'est cette réserve-là qui dit ce qu'un vieux téléphone
   peut encaisser, et c'est elle qu'il faut alléger.
   Ce banc freine donc le fil principal (le compositeur, lui, ne ralentit pas —
   comme sur un vrai appareil dont le processeur est lent mais l'écran normal)
   et relève, sur chaque écran, dans quatre configurations :

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
  const detail = [];
  for(const frein of [1, 6]){
    console.log('\n  ===== fil principal freiné x' + frein + '  —  millisecondes de travail par seconde =====');
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
        await cdp.send('Performance.enable');
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: frein });
        /* On relève le compteur du moteur, on laisse tourner deux secondes en
           SOLLICITANT la page comme un doigt le ferait (le verre ne travaille
           que quand quelque chose bouge), puis on relève à nouveau. La
           différence est le travail réellement fait. */
        const lire = async ()=>{
          const m = (await cdp.send('Performance.getMetrics')).metrics;
          const g = (n)=>{ const e = m.find(x=>x.name===n); return e ? e.value : 0; };
          return { script:g('ScriptDuration'), style:g('RecalcStyleDuration'),
                   pose:g('LayoutDuration'), total:g('TaskDuration'), t:g('Timestamp') };
        };
        const a0 = await lire();
        await p.evaluate(()=> new Promise(res=>{
          const app=document.getElementById('app'); const t0=performance.now(); let k=0;
          const tic=()=>{ k++;
            if(app) app.scrollTop = (k%2) ? 1 : 0;   // le doigt qui bouge : le verre se recale
            try{ if(typeof queueGlassSync==='function') queueGlassSync(); }catch(e){}
            if(performance.now()-t0 < 2000) requestAnimationFrame(tic); else res();
          };
          requestAnimationFrame(tic);
        }));
        const a1 = await lire();
        const sec = Math.max(0.001, a1.t - a0.t);
        /* En millisecondes de travail PAR SECONDE de jeu : au-delà de 1000, il
           n'y a plus de réserve du tout. */
        ligne.push(+(1000 * (a1.total - a0.total) / sec).toFixed(1));
        detail.push([nomE, nomC,
          +(1000*(a1.script - a0.script)/sec).toFixed(1),
          +(1000*(a1.style  - a0.style )/sec).toFixed(1),
          +(1000*(a1.pose   - a0.pose  )/sec).toFixed(1)]);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        await ctx.close();
      }
      console.log('  ' + nomE.padEnd(14) + ligne.map(v=>(v + ' ms').padStart(15)).join(''));
    }
  }
  console.log('\n  ===== le détail, pour savoir QUOI alléger (ms/s) =====');
  console.log('  écran          config              script     styles     mise en page');
  for(const [e,c,sc,st,po] of detail){
    console.log('  ' + e.padEnd(14) + c.padEnd(18) + (sc+'').padStart(8) + (st+'').padStart(11) + (po+'').padStart(15));
  }
  await nav.close();
})();
