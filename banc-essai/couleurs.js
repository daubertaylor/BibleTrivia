/* CHASSE AUX BORDURES DE COULEUR — la règle absolue du jeu : il n'en veut
   nulle part. Le test lit, sur chaque élément visible, les quatre bordures,
   les anneaux « 0 0 0 Npx » du box-shadow et l'outline, et signale toute
   teinte saturée. Il doit rapporter 0.

   POURQUOI IL A DÉJÀ MENTI. Sa première version ne visitait que des écrans AU
   REPOS. Or les quatre dernières bordures colorées du jeu vivaient toutes dans
   un ÉTAT : la bonne réponse une fois révélée (vert), la mauvaise (rouge), le
   vainqueur d'un duel en ligne (or), le champ de saisie actif (corail) — plus
   la vignette de fond retenue, invisible tant qu'il n'y a qu'un décor. Le test
   annonçait « 0 » pendant que quatre liserés vivaient dans le jeu.
   Un écran au repos n'est pas un écran : il faut ALLER DANS L'ÉTAT.

       node couleurs.js                       (jeu servi en HTTP sur 8099)
       node couleurs.js http://.../index.html */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL=process.argv[2]||'http://127.0.0.1:8099/index.html';
const ECRANS=[
 ['accueil',  ()=>{state.screen='mode';render();}],
 ['verset',   ()=>{state.screen='mode';render();showHeroVerse();}],
 ['solo',     ()=>{state.mode='solo';state.screen='setup';render();}],
 ['groupe',   ()=>{state.mode='group';state.teams=[{name:'Taylor'},{name:'Joueur 2'}];state.screen='setup';render();}],
 ['jeu',      ()=>{state.mode='solo';startGame();state.screen='play';render();}],
 ['fin',      ()=>{state.screen='end';state.soloScore=110;state.soloCorrect=7;state.soloBestStreak=3;state.questions=new Array(15);state.soloMissed=new Array(8);render();}],
 ['ligne',    ()=>{state.screen='online';render();}],
 ['parcours', ()=>{state.screen='parcours';render();}],
 ['testament',()=>{state.screen='parcours';render();const t=document.querySelector('.tst-head');t&&t.click();}],
 ['profil',   ()=>{state.screen='profile';render();}],
 ['reglages', ()=>{state.screen='mode';render();openSettings();}],
 ['sortie',   ()=>{state.mode='solo';startGame();state.screen='play';render();confirmLeaveGame();}],
 /* LES ÉTATS, pas seulement les écrans — c'est là que se cachaient les quatre
    derniers liserés colorés. */
 ['repondu',  ()=>{state.mode='solo';startGame();state.screen='play';render();
                   const q=state.questions[state.currentIndex];
                   soloAnswer(q.shuffledOptions.findIndex(o=>o!==q.correct));}],
 ['duel-gagne',()=>{net.isHost=true;net.code='42CJ';net.score=300;net.oppScore=180;net.missed=[];
                   net.joueurs={a:{id:'a',name:'Sogane',color:'#E8734C',score:180,idx:15,done:true,gone:false,vu:Date.now()}};
                   majAdversaire();state.screen='online-end';render();}],
 ['champ-actif',()=>{state.screen='profile';render();
                   setTimeout(()=>{const i=document.querySelector('.text-input');i&&i.focus();},250);}],
 ['bibles',   ()=>{state.screen='mode';render();openSettings();setTimeout(()=>openBibles(),300);}],
 /* SCENES n'a qu'un décor aujourd'hui, donc la rangée des fonds ne s'affiche
    pas : on en ajoute un second pour que la vignette RETENUE soit testée. */
 ['fonds',    ()=>{if(SCENES.length<2) SCENES.push({key:'essai',name:'Essai',thumb:SCENES[0].thumb,full:SCENES[0].full});
                   state.screen='mode';render();openSettings();
                   setTimeout(()=>{const e=document.querySelector('.scene-row');e&&e.scrollIntoView({block:'center'});},300);}],
];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,userAgent:IOS,hasTouch:true});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8',isCreator:true}));localStorage.setItem('bt_fs_hint','1');
    localStorage.setItem('bt_progress',JSON.stringify({books:{Genèse:12,Exode:8},correct:337,streakBest:21,achievements:['premiers-pas']}));});
  await p.goto(URL);
  await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:20000});
  const total={};
  for(const [nom,aller] of ECRANS){
    try{ await p.evaluate(`(${aller.toString()})()`); }catch(e){ console.log('  !! '+nom+' : '+e.message); continue; }
    await p.waitForTimeout(900);
    const r=await p.evaluate(()=>{
      const lire=(c)=>{ const m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c||''); if(!m) return null;
        const v=[+m[1],+m[2],+m[3]], a=m[4]===undefined?1:+m[4];
        return {sat:Math.max(...v)-Math.min(...v), a, txt:c}; };
      const out=[];
      document.querySelectorAll('*').forEach(n=>{
        const bb=n.getBoundingClientRect(); if(bb.width<6||bb.height<6) return;
        const s=getComputedStyle(n);
        const cls=(n.className||'').toString().split(' ').filter(c=>c&&!/has-gs|screen-enter|arrivee/.test(c)).slice(0,2).join('.')||n.tagName;
        ['Top','Right','Bottom','Left'].forEach(cote=>{
          const w=parseFloat(s['border'+cote+'Width'])||0; if(w<0.5) return;
          const c=lire(s['border'+cote+'Color']); if(!c||c.a<0.06||c.sat*c.a<=8) return;
          out.push(cls+'  border-'+cote.toLowerCase()+' '+c.txt);
        });
        // anneaux : « 0 0 0 Npx couleur » dans box-shadow (hors inset)
        (s.boxShadow||'').split(/,(?![^(]*\))/).forEach(seg=>{
          if(/inset/.test(seg)) return;
          const m=/^\s*(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px/.exec(seg.trim());
          if(!m) return; const c=lire(m[1]); if(!c||c.a<0.06||c.sat*c.a<=8) return;
          out.push(cls+'  anneau '+m[2]+'px '+c.txt);
        });
        (['outlineColor'].forEach(k=>{ const w=parseFloat(s.outlineWidth)||0; if(w<0.5||s.outlineStyle==='none') return;
          const c=lire(s[k]); if(!c||c.a<0.06||c.sat*c.a<=8) return; out.push(cls+'  outline '+c.txt); }));
      });
      return [...new Set(out)];
    });
    console.log('\n=== '+nom+(r.length?'':'   — rien de coloré'));
    r.forEach(x=>{ console.log('   '+x); total[x]=1; });
    await p.evaluate(()=>{document.querySelectorAll('.modal-veil,.sheet-veil').forEach(n=>n.remove());document.documentElement.classList.remove('show-verse');});
  }
  console.log('\n  TOTAL rebords colorés distincts : '+Object.keys(total).length);
  console.log('  erreurs : '+(errs.length?errs[0]:'AUCUNE'));
  await b.close();
})();
