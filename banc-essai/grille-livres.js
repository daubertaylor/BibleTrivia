/* ============ BANC « LA GRILLE DES LIVRES À REVOIR » ============
   Sur la capture de Taylor — 200 erreurs au carnet, une soixantaine de livres —
   la grille était arrêtée en plein milieu d'une rangée : une tranche de
   pastilles en haut, sans rien pour l'expliquer. Ce n'est pas « il y en a plus
   au-dessus », c'est « c'est cassé ».
   Et il y avait pire, invisible sur une image : la feuille porte
   « touch-action:none » (sans quoi on ne peut pas la fermer au doigt sur
   Android), ce qui vaut pour toute sa descendance. La grille ne POUVAIT PAS
   défiler — les livres du bas étaient hors d'atteinte.
   Quatre exigences, donc :
     elle défile vraiment (touch-action:pan-y) ;
     le cran la pose sur une rangée entière ;
     le voile fond les deux bouts tant qu'il reste quelque chose au-delà ;
     et un doigt qui la défile ne tire PAS la feuille sous elle.
   Usage : node banc-essai/grille-livres.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const D='/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/';
(async()=>{
  const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await nav.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html');
  await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:25000});
  await p.evaluate(()=>{
    const t=[]; ['facile','moyen','difficile'].forEach(k=>(BANK[k]||[]).forEach(q=>t.push(Object.assign({},q,{tier:k}))));
    const pris=t.filter(q=>bookOf(q)).slice(0,200);
    localStorage.setItem('bt_errbook', JSON.stringify(pris.map((q,i)=>({k:qKey(q),n:1,p:0,du:dayKey(i<3?-1:5),q:q.q,options:q.options,correct:q.correct,fact:q.fact,tier:q.tier}))));
    render();
  });
  await p.waitForTimeout(500);
  await p.evaluate(()=>ouvrirRevoir());
  await p.waitForTimeout(1200);
  const av = await p.evaluate(()=>{ const l=document.querySelector('.rv-livres');
    return { n:l.children.length, st:l.scrollTop, defile:l.scrollHeight>l.clientHeight+1,
      ta:getComputedStyle(l).touchAction, vh:l.style.getPropertyValue('--voile-h'), vb:l.style.getPropertyValue('--voile-b') }; });
  console.log('  ' + av.n + ' livres, défile : ' + av.defile + ', touch-action : ' + av.ta);
  console.log('  au repos : voile haut ' + (av.vh||'0px') + ', voile bas ' + (av.vb||'0px'));
  await p.screenshot({ path: D+'grille-haut.png' });
  const yf = await p.evaluate(()=>{ const b=document.querySelector('.rv-livres').getBoundingClientRect(); return { x:b.left+b.width/2, y:b.top+b.height*0.6, ftop:document.querySelector('.settings-sheet').getBoundingClientRect().top }; });
  /* ON DÉFILE LA GRILLE. La souris de Playwright ne respecte pas
     « touch-action » et ne produit pas de défilement natif : c'est la molette
     qui joue le rôle du doigt ici. Le vrai geste tactile, lui, est éprouvé
     juste après — on vérifie qu'il ne tire pas la feuille. */
  await p.mouse.move(yf.x, yf.y);
  await p.mouse.wheel(0, 140);
  await p.waitForTimeout(500);
  const ap = await p.evaluate(()=>{ const l=document.querySelector('.rv-livres');
    const f=document.querySelector('.settings-sheet');
    return { st:Math.round(l.scrollTop), ftop:f?Math.round(f.getBoundingClientRect().top):null,
      vh:l.style.getPropertyValue('--voile-h'), vb:l.style.getPropertyValue('--voile-b'),
      /* UNE RANGÉE COUPÉE, C'EST UNE PASTILLE À CHEVAL SUR LE BORD : une
         partie dedans, une partie dehors. Ce n'est PAS « la première pastille
         n'est pas au ras du bord » — avec scroll-padding-top, une rangée bien
         posée se trouve volontairement SOUS le voile. On mesure donc le
         nombre de pixels d'une pastille cachés au-dessus du bord haut. */
      coupe:(()=>{ const zb=l.getBoundingClientRect(); let m=0;
        for(const e of l.children){ const b=e.getBoundingClientRect();
          if(b.bottom <= zb.top + 1 || b.top >= zb.top - 1) continue;   // dehors, ou entière
          m = Math.max(m, Math.round(zb.top - b.top)); }
        return m; })(),
      voileMax: Math.round(parseFloat(getComputedStyle(l).getPropertyValue('--voile-max')) || 26) }; });
  console.log('  après un défilement au doigt : scrollTop=' + ap.st + ', voiles ' + ap.vh + ' / ' + ap.vb);
  console.log('  la feuille a-t-elle bougé ? ' + (Math.abs(ap.ftop - Math.round(yf.ftop)) < 1 ? 'non' : 'OUI de ' + Math.abs(ap.ftop-Math.round(yf.ftop)) + ' px'));
  /* UNE RANGÉE QUI DÉPASSE SOUS LE FONDU N'EST PAS UNE RANGÉE COUPÉE — c'est
     l'inverse : scroll-padding-top la laisse volontairement paraître sous le
     voile, et c'est ainsi qu'on voit qu'il y en a au-dessus. Ce qui serait
     mauvais, c'est qu'elle dépasse AU-DELÀ du fondu, en pleine lumière : là
     elle est tranchée net, et c'est ce que Taylor a photographié. */
  console.log('  rangée sous le voile : ' + ap.coupe + ' px, pour un fondu de ' + ap.voileMax + ' px'
    + (ap.coupe <= ap.voileMax ? '  (elle reste dans le fondu)' : '  <-- TRANCHÉE EN PLEINE LUMIÈRE'));
  await p.screenshot({ path: D+'grille-defilee.png' });
  /* ET LE VRAI GESTE : un doigt qui remonte de 84 px dans la grille. Il ne
     doit PAS tirer la feuille — c'est tout l'objet de « neutre ». */
  const avantDoigt = await p.evaluate(()=>Math.round(document.querySelector('.settings-sheet').getBoundingClientRect().top));
  await p.mouse.move(yf.x, yf.y); await p.mouse.down();
  for(let i=1;i<=6;i++){ await p.mouse.move(yf.x, yf.y - i*14); await p.waitForTimeout(16); }
  await p.mouse.up(); await p.waitForTimeout(600);
  const apresDoigt = await p.evaluate(()=>{ const f=document.querySelector('.sheet-veil:not(.closing) .settings-sheet');
    return f ? Math.round(f.getBoundingClientRect().top) : null; });
  const tiree = apresDoigt === null || Math.abs(apresDoigt - avantDoigt) > 1;
  console.log('  un doigt qui défile la grille tire la feuille ? ' + (tiree ? 'OUI' : 'non'));

  /* LE DERNIER LIVRE DOIT RESTER ATTEIGNABLE. Un cran « mandatory » qui
     empêcherait d'arriver au bout serait pire que la rangée coupée. */
  const bout = await p.evaluate(()=> new Promise(res=>{
    const l=document.querySelector('.rv-livres');
    l.scrollTop = l.scrollHeight;
    setTimeout(()=>{ const zb=l.getBoundingClientRect();
      const d=l.children[l.children.length-1].getBoundingClientRect();
      res({ vu: d.bottom <= zb.bottom + 1 && d.top >= zb.top - 1, reste: Math.round(l.scrollHeight - l.clientHeight - l.scrollTop) });
    }, 400);
  }));
  console.log('  le dernier livre est atteignable : ' + (bout.vu ? 'oui' : 'NON') + ' (il reste ' + bout.reste + ' px de course)');

  const ok = av.defile && av.ta === 'pan-y' && ap.st > 20 && bout.vu && Math.abs(ap.ftop - Math.round(yf.ftop)) < 1 && ap.coupe <= ap.voileMax && !tiree && !errs.length;
  if(errs.length) console.log('  ERREURS : ' + [...new Set(errs)].join(' | '));
  await nav.close();
  console.log(ok ? '\n  OK — la grille défile, se pose net, et ne tire pas la feuille' : '\n  ÉCHEC');
  process.exit(ok?0:1);
})();
