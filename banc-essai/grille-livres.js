/* ============ BANC « LA GRILLE DES LIVRES À REVOIR » ============
   Sur la capture de Taylor — 200 erreurs au carnet, une soixantaine de livres —
   la grille était arrêtée en plein milieu d'une rangée : une tranche de
   pastilles en haut, sans rien pour l'expliquer. Ce n'est pas « il y en a plus
   au-dessus », c'est « c'est cassé ».
   Et il y avait pire, invisible sur une image : la feuille porte
   « touch-action:none » (sans quoi on ne peut pas la fermer au doigt sur
   Android), ce qui vaut pour toute sa descendance. La grille ne POUVAIT PAS
   défiler — les livres du bas étaient hors d'atteinte.
   LA v221 A CHANGÉ LA RÉPONSE, DEUX FOIS. D'abord en donnant aux livres leur
   écran, la feuille gardant les trois décisions et une porte. Puis en
   supprimant la feuille : « je parle de toute la page entière qui doit être
   ici ». Réviser n'est pas une question courte à laquelle on répond dans une
   parenthèse — on arrive avec une intention vague, on regarde ce qu'on a, on
   compare, on choisit. C'est un LIEU.
   Le banc juge donc un ÉCRAN : les portes avec leurs comptes, TOUS les
   livres sans un nom tronqué, et une révision qui part.
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
  /* On y va comme le joueur : par la carte de l'accueil. */
  await p.evaluate(()=>document.querySelector('.revoir-card').click());
  await p.waitForTimeout(1300);
  let ok = true;
  const dire = (bon, txt) => { console.log('  ' + (bon ? 'OK ' : 'KO ') + txt); if(!bon) ok = false; };

  /* 1. C'EST UN ÉCRAN, PAS UNE FEUILLE. */
  const f = await p.evaluate(()=>({
    feuille: !!document.querySelector('.sheet-veil'),
    portes: [...document.querySelectorAll('.rv-choix')].map(b=>b.querySelector('.oa-txt b').textContent),
  }));
  dire(!f.feuille, 'aucune feuille glissante sur ce chemin');
  /* ON NOMME LES PORTES, ON NE LES COMPTE PLUS. Le banc exigeait « exactement
     trois », et il a refusé le jour où une quatrième est arrivée — « Celles
     qui me résistent », qui joue les questions ratées plusieurs fois. Il avait
     raison de le voir : c'est bien un changement d'écran. Mais compter n'était
     pas la bonne exigence — ce qui compte, c'est que CHAQUE porte promise soit
     là, et qu'aucune ne se perde en chemin. On les nomme donc. Le jour où on
     en ajoute une cinquième, il faudra l'écrire ici : c'est voulu. */
  const ATTENDUES = ['Celles qui me résistent', 'Les échéances du jour',
                     'Tout mon carnet', 'Ma dernière partie'];
  const manquantes = ATTENDUES.filter(x => !f.portes.some(p => p.trim() === x));
  dire(manquantes.length === 0 && f.portes.length === ATTENDUES.length,
       'les quatre portes : ' + f.portes.join(' / ')
       + (manquantes.length ? '  MANQUE : ' + manquantes.join(', ') : ''));
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
  dire(e.ecran === 'revoir', 'la carte de l\'accueil mène droit à l\'écran « À revoir »');
  dire(e.livres === e.attendus && e.livres > 0, 'TOUS les livres du carnet y sont : ' + e.livres + ' sur ' + e.attendus);
  dire(e.tronques.length === 0, 'aucun nom tronqué' + (e.tronques.length ? ' — ' + e.tronques.join(', ') : ''));
  dire(e.colonnes === 3, e.colonnes + ' colonnes (trois, pour que les noms tiennent)');
  /* SUR UNE PAGE, DÉFILER EST NORMAL — c'est même tout l'intérêt d'avoir
     quitté la feuille. Ce qu'on vérifie, c'est qu'aucune pastille ne soit
     COUPÉE par un cadre : il n'y en a plus, donc la dernière doit être
     entièrement dans la page une fois qu'on est allé au bout. */
  const bout = await p.evaluate(()=> new Promise(res=>{
    const a=document.getElementById('app'); a.scrollTop = a.scrollHeight;
    setTimeout(()=>{ const l=[...document.querySelectorAll('.rvl-card .bk')];
      const d=l[l.length-1].getBoundingClientRect();
      res({ vu: d.top >= -1 && d.bottom <= innerHeight + 1, haut: Math.round(d.top), bas: Math.round(d.bottom) }); }, 450);
  }));
  dire(bout.vu, 'le dernier livre se voit entièrement en bas de page (y ' + bout.haut + '..' + bout.bas + ')');

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
