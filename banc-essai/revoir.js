/* La révision espacée, de bout en bout. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let ko=0;
function v(nom, a, b){ const bon=JSON.stringify(a)===JSON.stringify(b); if(!bon) ko++;
  console.log('  '+(bon?'OK ':'KO ')+nom.padEnd(54)+(bon?'':'  obtenu '+JSON.stringify(a)+', attendu '+JSON.stringify(b))); }
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  const ev=(f,...a)=>p.evaluate(f,...a);
  await ev(()=>{ window.__q = BANK.facile[0]; localStorage.setItem('bt_errbook','[]'); });

  await ev(()=>{ errbookAdd(__q); });
  v("une erreur : palier 0, à revoir demain", await ev(()=>{ const e=loadErrbook()[0]; return [e.p, e.du===dayKey(1)]; }), [0, true]);
  v("elle n'est PAS à revoir aujourd'hui", await ev(()=>aRevoir().length), 0);
  await ev(()=>{ const a=loadErrbook(); a[0].du=dayKey(0); saveErrbook(a); });
  v("le lendemain, elle revient", await ev(()=>aRevoir().length), 1);
  await ev(()=>{ errbookRemove(__q); });
  v("bonne réponse : promue au palier 1, dans 3 jours", await ev(()=>{ const e=loadErrbook()[0]; return [e.p, e.du===dayKey(3)]; }), [1, true]);
  await ev(()=>{ errbookRemove(__q); });
  v("puis palier 2, dans 7 jours", await ev(()=>{ const e=loadErrbook()[0]; return [e.p, e.du===dayKey(7)]; }), [2, true]);
  await ev(()=>{ errbookRemove(__q); });
  v("puis palier 3, dans 16 jours", await ev(()=>{ const e=loadErrbook()[0]; return [e.p, e.du===dayKey(16)]; }), [3, true]);
  await ev(()=>{ errbookRemove(__q); });
  v("au bout de l'échelle : acquise, elle quitte le carnet", await ev(()=>loadErrbook().length), 0);

  /* une erreur au palier 2 ramène tout en bas */
  await ev(()=>{ errbookAdd(__q); const a=loadErrbook(); a[0].p=2; a[0].du=dayKey(7); saveErrbook(a); errbookAdd(__q); });
  v("se tromper à nouveau ramène au palier 0, dès demain",
    await ev(()=>{ const e=loadErrbook()[0]; return [e.p, e.du===dayKey(1), e.n]; }), [0, true, 2]);

  /* une entrée d'AVANT l'échelle est à revoir tout de suite */
  await ev(()=>{ localStorage.setItem('bt_errbook', JSON.stringify([{k:'vieux', n:1, q:'Q ?', options:['a','b'], correct:'a', fact:'F', tier:'moyen'}])); });
  v("une entrée d'avant la mise à jour est à revoir tout de suite", await ev(()=>aRevoir().length), 1);

  /* la carte de l'accueil */
  await ev(()=>{ state.screen='mode'; render(); });
  await p.waitForTimeout(600);
  v("la carte « À revoir » apparaît", await ev(()=>!!document.querySelector('.revoir-card')), true);
  v("et elle dit combien", await ev(()=>{ const e=document.querySelector('.rv-n'); return e?e.textContent:''; }), "1");
  /* ===== LA CARTE NE PART PLUS, MÊME À VIDE (v219) =====
     Le banc exigeait ici l'inverse : « rien à revoir, pas de carte ». C'était
     la règle jusqu'à ce que Taylor demande le contraire, et pour une raison de
     fond — « je veux qu'il reste en continu, je ne veux pas qu'il disparaisse
     même si j'ai rempli toutes mes erreurs ». Un accueil dont les cartes vont
     et viennent n'a pas de forme : on apprend où sont les choses en les
     retrouvant à la même place, et une porte qui n'est là qu'un jour sur trois
     ne s'apprend pas.
     Ce qui change alors, c'est le SOUS-TITRE, pas la présence — exactement
     comme la carte du Défi, qui reste qu'on ait joué ou non. Trois états, et
     le banc les vérifie tous les trois. */
  await ev(()=>{ localStorage.setItem('bt_errbook','[]'); state.screen='mode'; render(); });
  await p.waitForTimeout(500);
  v("carnet vide : la carte reste", await ev(()=>!!document.querySelector('.revoir-card')), true);
  v("  et elle le dit", await ev(()=>{ const e=document.querySelector('.revoir-card .dc-txt small'); return e?e.textContent:''; }), "Tes erreurs reviendront ici");
  v("  sans pastille", await ev(()=>!!document.querySelector('.revoir-card .rv-n')), false);
  /* Rien pour AUJOURD'HUI, mais le carnet n'est pas vide : troisième état. */
  await ev(()=>{ localStorage.setItem('bt_errbook', JSON.stringify([
    {k:'plustard', n:1, p:1, du:dayKey(3), q:'Q ?', options:['a','b'], correct:'a', fact:'F', tier:'moyen'}]));
    state.screen='mode'; render(); });
  await p.waitForTimeout(500);
  v("rien pour aujourd'hui, mais le carnet n'est pas vide", await ev(()=>{ const e=document.querySelector('.revoir-card .dc-txt small'); return e?e.textContent:''; }), "Rien pour aujourd'hui");
  /* LE COMPTE A QUITTÉ LA PHRASE POUR LA PASTILLE. « Rien aujourd'hui · 143 en
     attente » demandait 193 px de large pour 155 disponibles sur un petit
     Android : la phrase était rognée. Le nombre est sur la pastille calme, à
     trente pixels — le répéter, c'était le dire deux fois ET déborder. */
  v("  la pastille est calme", await ev(()=>{ const e=document.querySelector('.revoir-card .rv-n'); return e ? e.classList.contains('calme') : false; }), true);
  /* ===== ET L'ÉCRAN S'OUVRE DANS TOUS LES CAS =====
     La v221 a remplacé la feuille glissante par un ÉCRAN — « je parle de toute
     la page entière qui doit être ici ». Réviser n'est pas une question courte
     à laquelle on répond dans une parenthèse : on arrive avec une intention
     vague, on regarde ce qu'on a, on choisit. C'est un lieu.
     Carnet vide, on doit quand même pouvoir y aller : les trois portes s'y
     trouvent, ÉTEINTES et non absentes — une porte fermée qui annonce « 0 »
     est plus honnête qu'une porte qui a disparu. */
  await ev(()=>{ localStorage.setItem('bt_errbook','[]'); state.screen='mode'; render(); });
  await p.waitForTimeout(400);
  await ev(()=>document.querySelector('.revoir-card').click());
  await p.waitForTimeout(900);
  v("carnet vide : l'écran « À revoir » s'ouvre quand même", await ev(()=>state.screen), "revoir");
  v("  aucune feuille glissante sur ce chemin", await ev(()=>!!document.querySelector('.sheet-veil')), false);
  v("  et ses trois portes sont éteintes, pas absentes", await ev(()=>{
    const l=[...document.querySelectorAll('.rv-choix')]; return l.length===3 && l.every(b=>b.disabled); }), true);
  v("  pas de grille de livres quand le carnet est vide", await ev(()=>document.querySelectorAll('.rvl-card .bk').length), 0);
  await ev(()=>{ state.screen='mode'; render(); });
  await p.waitForTimeout(500);

  // ---------- DE BOUT EN BOUT : UNE VRAIE PARTIE ----------
  /* On joue pour de vrai : deux mauvaises réponses, une bonne. On vérifie
     ensuite les CINQ sorties du système — le carnet, la feuille « Revoir mes
     erreurs », le bouton « Réviser la dernière partie », la carte « À revoir »
     et la promotion en révision. */
  const partie = await ev(()=> new Promise(res=>{
    localStorage.setItem('bt_errbook','[]');
    localStorage.removeItem('bt_lastmiss');
    state.mode='solo'; state.daily=false; startGame();
    const faux = [];
    /* trois questions : on rate les deux premières, on réussit la troisième */
    for(let i=0;i<3;i++){
      state.currentIndex = i;
      const q = state.questions[i];
      const bonIdx = q.shuffledOptions.indexOf(q.correct);
      const idx = (i < 2) ? (bonIdx === 0 ? 1 : 0) : bonIdx;
      if(i < 2) faux.push(qKey(q));
      state.revealed = false; state.soloSelected = null;
      soloAnswer(idx);
    }
    /* fin de partie : c'est nextQuestion qui écrit bt_lastmiss */
    state.currentIndex = state.questions.length - 1; state.revealed = true;
    nextQuestion();
    setTimeout(()=>res({ faux, carnet: loadErrbook().map(x=>x.k),
      rates: state.soloMissed.length,
      lastmiss: JSON.parse(localStorage.getItem('bt_lastmiss')||'[]'),
      derniere: lastMissEntries().length }), 60);
  }));
  v("les deux ratées sont au carnet", partie.carnet.length >= 2, true);
  v("et la bonne n'y est pas", partie.carnet.indexOf(partie.faux[0]) >= 0 && partie.carnet.length === 2, true);
  v("la feuille « Revoir mes erreurs » a de quoi montrer", partie.rates >= 2, true);
  v("« Réviser la dernière partie » retrouve les mêmes", partie.derniere, 2);

  /* la révision les rejoue, et une bonne réponse promeut */
  const rev = await ev(()=> new Promise(res=>{
    startRevision();
    const n = state.questions.length;
    const q = state.questions[0];
    const bonIdx = q.shuffledOptions.indexOf(q.correct);
    state.currentIndex = 0; state.revealed = false; state.soloSelected = null;
    soloAnswer(bonIdx);
    setTimeout(()=>res({ n, revision: state.revision,
      promue: (loadErrbook().find(x=>x.k===qKey(q))||{}).p,
      duPromue: (loadErrbook().find(x=>x.k===qKey(q))||{}).du === dayKey(3) }), 60);
  }));
  v("la révision rejoue les erreurs", rev.n, 2);
  v("elle est bien marquée « révision »", rev.revision, true);
  v("une bonne réponse en révision promeut au palier 1", [rev.promue, rev.duPromue], [1, true]);

  /* et une mauvaise, en révision, ramène tout en bas */
  const rechute = await ev(()=> new Promise(res=>{
    const q = state.questions[0];
    const bonIdx = q.shuffledOptions.indexOf(q.correct);
    state.currentIndex = 0; state.revealed = false; state.soloSelected = null;
    soloAnswer(bonIdx === 0 ? 1 : 0);
    setTimeout(()=>res((loadErrbook().find(x=>x.k===qKey(q))||{})), 60);
  }));
  v("se retromper en révision ramène au palier 0, dès demain",
    [rechute.p, rechute.du === await ev(()=>dayKey(1))], [0, true]);

  if(errs.length){ ko++; console.log('  erreurs : '+[...new Set(errs)].slice(0,3).join(' | ')); }
  await b.close();
  console.log(ko===0 ? '\n  OK' : '\n  '+ko+' défaut(s)');
  process.exit(ko===0?0:1);
})();
