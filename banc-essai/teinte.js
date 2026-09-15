/* ========= BANC « L'ONDE NE CHANGE PAS DE COULEUR EN PLEIN VOL » =========
   « Lors du remplissage des boutons avec le rouge, il y a un petit truc à la
   fin. » Relevé image par image sur une puce de réglage :
       104 ms   onde rgb(236,60,26)          à 62 % de sa course
       121 ms   onde rgba(255,255,255,0.34)  à 72 %
   Au milieu du remplissage, la puce devenait SÉLECTIONNÉE — et une surface
   déjà corail reçoit une onde BLANCHE, sinon un appui ne s'y verrait pas. La
   règle est juste ; c'est son moment qui ne l'était pas. L'onde finissait sa
   course en voile blanc, puis ce voile s'effaçait : un petit éclair pâle à la
   fin du geste.

   CE QU'ON VÉRIFIE, ET POURQUOI C'EST STRUCTUREL. On ne mesure pas « est-ce
   que ça clignote sur cet écran-là » : on vérifie une propriété qui doit être
   vraie de tout bouton, partout, pour toujours — la couleur de l'onde est
   celle de ce qu'on a TOUCHÉ, et elle ne bouge plus jusqu'à la fin du geste.
   Un bouton peut très bien changer d'état pendant qu'on appuie (c'est même le
   but d'un bouton) ; l'onde, elle, appartient au geste, pas à l'état.

   On presse donc des boutons qui CHANGENT D'ÉTAT sous le doigt, et on relève
   la teinte à chaque image jusqu'à la fin de l'effacement.
   Usage : node banc-essai/teinte.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CAS = [
  ['durée : Longue',   "state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render();", /^Longue/],
  ['chrono : 15 s',    "state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render();", /^15/],
  ['testament : Nouveau', "state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render();", /^Nouveau/],
];
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  let ko = 0;
  for (const [nom, prep, motif] of CAS) {
    await p.evaluate(s=>{ new Function(s)(); }, prep);
    await p.waitForTimeout(900);
    const pos = await p.evaluate((src)=>{
      const re = new RegExp(src);
      const e = [...document.querySelectorAll('button')].find(x=>re.test((x.textContent||'').trim()));
      if(!e) return null;
      e.setAttribute('data-teinte','1');
      const r = e.getBoundingClientRect();
      return { x:r.x+r.width/2, y:r.y+r.height/2 };
    }, motif.source);
    if(!pos){ console.log('  ' + nom + ' : bouton introuvable'); ko++; continue; }
    const cap = p.evaluate(()=> new Promise(res=>{
      const rel=[]; const t0=performance.now();
      const tic=()=>{
        const e=document.querySelector('[data-teinte]');
        if(e){
          const av=getComputedStyle(e,'::before');
          rel.push([+(performance.now()-t0).toFixed(0), av.backgroundColor, +av.opacity, e.className]);
        }
        if(performance.now()-t0 < 900) requestAnimationFrame(tic); else res(rel);
      };
      requestAnimationFrame(tic);
    }));
    await p.mouse.move(pos.x, pos.y); await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up();
    const rel = await cap;
    /* On ne regarde QUE les images où l'onde se voit : ailleurs, sa couleur ne
       veut rien dire (elle est à opacité nulle, hors de tout geste). */
    const vues = rel.filter(r => r[2] > 0.02 && /onde/.test(r[3]));
    if(!vues.length){ console.log('  ' + nom.padEnd(22) + ' : aucune onde visible'); ko++; continue; }
    const couleurs = [...new Set(vues.map(r=>r[1]))];
    const change = couleurs.length > 1;
    if(change) ko++;
    console.log('  ' + (change ? 'KO ' : 'OK ') + nom.padEnd(22)
      + vues.length + ' images d\'onde, ' + couleurs.length + ' couleur(s) : ' + couleurs.join(' → '));
    if(change){
      const i = vues.findIndex(r=>r[1] !== vues[0][1]);
      console.log('           ↳ elle change à ' + vues[i][0] + ' ms, à ' + Math.round(100*i/vues.length) + ' % de sa course');
    }
    await p.evaluate(()=>{ const e=document.querySelector('[data-teinte]'); if(e) e.removeAttribute('data-teinte'); });
    await p.waitForTimeout(400);
  }
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,2).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
