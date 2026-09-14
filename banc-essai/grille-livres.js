/* ============ BANC « LA GRILLE DES LIVRES À REVOIR » ============
   Sur la capture de Taylor — 200 erreurs au carnet, une soixantaine de livres —
   la grille était arrêtée en plein milieu d'une rangée : une tranche de
   pastilles en haut, sans rien pour l'expliquer. Ce n'est pas « il y en a plus
   au-dessus », c'est « c'est cassé ».
   Et il y avait pire, invisible sur une image : la feuille porte
   « touch-action:none » (sans quoi on ne peut pas la fermer au doigt sur
   Android), ce qui vaut pour toute sa descendance. La grille ne POUVAIT PAS
   défiler — les livres du bas étaient hors d'atteinte.
   LA v221 A CHANGÉ LA RÉPONSE. Plutôt que de mieux contenir la grille dans la
   feuille, elle lui a donné son ÉCRAN : la feuille mélangeait trois décisions
   (on touche, on joue) et une exploration (parcourir soixante livres, comparer
   des nombres), et ce mélange forçait un compromis qui a montré ses deux
   défauts opposés coup sur coup — feuille trop haute, puis grille trop petite.
   Le banc suit : il vérifie désormais que la feuille propose une PORTE, que
   l'écran derrière montre TOUS les livres sans rien couper ni tronquer, qu'on
   peut y lancer une révision, et que rien ne déborde.
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
  let ok = true;
  const dire = (bon, txt) => { console.log('  ' + (bon ? 'OK ' : 'KO ') + txt); if(!bon) ok = false; };

  /* 1. LA FEUILLE : quatre rangées, dont la porte vers les livres, et une
        hauteur qui la remet dans la famille des autres feuilles. */
  const f = await p.evaluate(()=>{
    const s=document.querySelector('.revoir-sheet').getBoundingClientRect();
    return { vue: Math.round(Math.min(s.bottom, innerHeight) - s.top),
      lignes: [...document.querySelectorAll('.rv-choix')].map(b=>b.querySelector('.oa-txt b').textContent),
      grilleDedans: !!document.querySelector('.revoir-sheet .bk-grid') };
  });
  dire(f.lignes.length === 4, 'la feuille propose quatre chemins : ' + f.lignes.join(' / '));
  dire(!f.grilleDedans, 'la grille des livres n\'est plus DANS la feuille');
  dire(f.vue <= 560, 'la feuille est revenue dans la famille : ' + f.vue + ' px vus (les autres font 516 à 526)');

  /* 2. LA PORTE MÈNE À L'ÉCRAN. */
  await p.evaluate(()=>document.querySelectorAll('.rv-choix')[3].click());
  await p.waitForTimeout(1400);
  const e = await p.evaluate(()=>{
    const app=document.getElementById('app');
    const noms=[...document.querySelectorAll('.rvl-card .bk-nm')];
    const g=document.querySelector('.rvl-card .bk-grid');
    return { ecran: state.screen, livres: noms.length,
      colonnes: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      tronques: noms.filter(n=>n.scrollWidth > n.clientWidth + 1).map(n=>n.textContent),
      debord: app.scrollHeight - app.clientHeight,
      attendus: (()=>{ try{ return livresDuCarnet().length; }catch(x){ return -1; } })() };
  });
  dire(e.ecran === 'revoir-livres', 'la porte mène à l\'écran des livres');
  dire(e.livres === e.attendus && e.livres > 0, 'TOUS les livres du carnet y sont : ' + e.livres + ' sur ' + e.attendus);
  dire(e.tronques.length === 0, 'aucun nom tronqué' + (e.tronques.length ? ' — ' + e.tronques.join(', ') : ''));
  dire(e.colonnes === 3, e.colonnes + ' colonnes (trois, pour que les noms tiennent)');
  dire(e.debord <= 0 || e.livres > 24, 'rien ne déborde inutilement (débord ' + e.debord + ' px)');

  /* 3. ET ON PEUT JOUER. */
  const nom = await p.evaluate(()=>{ const b=document.querySelector('.rvl-card .bk'); const n=b.dataset.livre; b.click(); return n; });
  await p.waitForTimeout(1000);
  const j = await p.evaluate(()=>({ ecran: state.screen, n: state.questions.length, rev: state.revision }));
  dire(j.ecran === 'play' && j.n > 0 && j.rev, 'toucher « ' + nom + ' » lance la révision de ce livre (' + j.n + ' questions)');

  if(errs.length){ ok=false; console.log('  ERREURS : ' + [...new Set(errs)].join(' | ')); }
  await nav.close();
  console.log(ok ? '\n  OK — la feuille décide, l\'écran explore' : '\n  ÉCHEC');
  process.exit(ok?0:1);
})();
