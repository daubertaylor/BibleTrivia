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
/* LES GROUPES (v302), sans serveur : le décor de doigt.js, copié tel quel,
   posé dans la page une fois chargée. Une règle absolue vaut aussi pour les
   écrans neufs — et un champ actif y compte comme ailleurs. */
const GRP_DECOR = `window.__grpDecor = () => {
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  compte.dispo = true;
  compte.session = { user:{ id:'moi-0', email:'joueur@exemple.net' } }; compte.etape = 'connecte';
  grp.installe = true; grp.ouverts = true; grp.message = '';
  grp.etat = { participe:'ok', moderateur:true, ouverts:true, a_traiter:2 };
  grp.profils = { 'moi-0':{ nom:'Taylor', couleur:'#4C86E8' }, 'u-2':{ nom:'Sam', couleur:'#E8574C' },
                  'u-3':{ nom:'Lee', couleur:'#4CE88A' }, 'u-4':{ nom:'Kim', couleur:'#E8C84C' } };
  grp.liste = [
    { id:'g-1', nom:'Lee', teinte:2, ouvert:false, code:'ABC234', nb_membres:4, non_lus:2, dernier_message:il(1),
      apercu:{ id:9, auteur:'u-2', genre:'texte', texte:'Amen', nom:'Sam', le:il(1) } },
    { id:'g-2', nom:'Sam', teinte:0, ouvert:true, code:'DEF567', nb_membres:2, non_lus:0, dernier_message:il(26),
      apercu:{ id:7, auteur:'moi-0', genre:'texte', texte:'Amen', nom:'Taylor', le:il(26) } } ];
  grp.publics = [ { id:'g-2', nom:'Sam', description:'', nb_membres:2, teinte:0, membre:true },
                  { id:'g-5', nom:'Ruth', description:'', nb_membres:1, teinte:3, membre:false } ];
  grp.membres = { 'g-1':[ { membre:'moi-0', role:'proprietaire', muet_jusqu:null },
                          { membre:'u-2', role:'admin', muet_jusqu:null },
                          { membre:'u-4', role:'membre', muet_jusqu:null } ] };
  const m = (id, auteur, genre, texte, extra) => Object.assign({ id, groupe:'g-1', auteur, genre, texte, donnees:{},
    cree_le:il(0.5), masque:false, supprime_le:null }, extra || {});
  grp.fils = { 'g-1':{ charge:true, tout:false, messages:[
    m(1, null, 'systeme', 'cree', { donnees:{ nom:'Taylor' } }),
    m(7, 'u-2', 'texte', 'Amen'),
    m(10, 'u-2', 'partie', '', { donnees:{ code:'ABCD' } }),
    m(12, 'moi-0', 'texte', 'Amen') ] } };
  grp.courant = null; grp.nonLus = 2; moderation = null;
};`;
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
 ['barre',      ()=>{__grpDecor();state.screen='mode';render();majBarre();}],
 ['groupes',    ()=>{__grpDecor();state.screen='groupes';render();majBarre();}],
 ['grp-dehors', ()=>{__grpDecor();compte.session=null;compte.etape='repos';grp.etat=null;state.screen='groupes';render();}],
 ['grp-entree', ()=>{__grpDecor();grp.etat={participe:'regles',moderateur:false};state.screen='groupes';render();}],
 ['grp-entree-ok',()=>{__grpDecor();grp.etat={participe:'regles',moderateur:false};grp.ageOk=true;grp.reglesOk=true;state.screen='groupes';render();}],
 ['discussion', ()=>{__grpDecor();grp.courant='g-1';state.screen='groupe';render();majCompo();}],
 ['compo-actif',()=>{__grpDecor();grp.courant='g-1';state.screen='groupe';render();majCompo();
                   setTimeout(()=>{const t=document.querySelector('#compo textarea,#compo input');t&&t.focus();},250);}],
 ['grp-infos',  ()=>{__grpDecor();grp.courant='g-1';state.screen='groupe';render();ouvrirInfosGroupe(true);}],
 ['grp-membre', ()=>{ouvrirMembre('u-4');}],
 ['grp-message',()=>{actionsMessage('7');}],
 ['grp-signaler',()=>{signalerMessage('7');}],
 ['grp-creer',  ()=>{__grpDecor();state.screen='groupes';render();ouvrirCreation();}],
 ['grp-code-actif',()=>{ouvrirCode();setTimeout(()=>{const i=document.getElementById('grpCode');i&&i.focus();},250);}],
 ['grp-regles', ()=>{ouvrirRegles();}],
 ['moderation', ()=>{__grpDecor();window.__lg=window.__lg||listeGroupe;
                   listeGroupe=async(n,a)=>n==='moderation_ouverte'?[{id:1,raison:'harcelement',details:'',le:new Date().toISOString(),
                     groupe:'g-1',groupe_nom:'Lee',message:7,texte:'Amen',cible:'u-2',cible_nom:'Sam',par_nom:'Lee',nb:2}]:__lg(n,a);
                   state.screen='groupes';render();ouvrirModeration();}],
 ['compte',     ()=>{__grpDecor();state.screen='profile';render();}],
 ['confidentialite',()=>{state.screen='mode';render();openSettings();setTimeout(()=>ouvrirConfidentialite(),300);}],
];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,userAgent:IOS,hasTouch:true});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8',isCreator:true}));localStorage.setItem('bt_fs_hint','1');
    localStorage.setItem('bt_progress',JSON.stringify({books:{Genèse:12,Exode:8},correct:337,streakBest:21,achievements:['premiers-pas']}));});
  await p.goto(URL);
  await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:20000});
  await p.evaluate(GRP_DECOR);
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
        /* UNE BORDURE SOUS UNE SURFACE DE VERRE, MÊME TRANSPARENTE, EST UN
           TRAIT (v304). Le verre s'arrête à l'intérieur de la bordure, l'ombre
           portée commence à l'extérieur : entre les deux, un pixel de photo
           nue — sur des rochers, un trait sombre au bas de la carte. « J'ai
           l'impression de voir une bordure » : elle y était. Le pixel se porte
           dans le rembourrage (règle de la v189). Seule exception, voulue : le
           liseré blanc de la médaille de fin, celui des avatars. */
        if(n.classList.contains('has-gs') && !n.classList.contains('end-medal')){
          const bw=['Top','Right','Bottom','Left'].map(k=>parseFloat(s['border'+k+'Width'])||0);
          if(bw.some(v=>v>=0.5)) out.push(cls+'  bordure de '+Math.max(...bw)+' px sous le verre (anneau de photo nue)');
        }
      });
      return [...new Set(out)];
    });
    console.log('\n=== '+nom+(r.length?'':'   — rien de coloré'));
    r.forEach(x=>{ console.log('   '+x); total[x]=1; });
    await p.evaluate(()=>{document.querySelectorAll('.modal-veil,.sheet-veil').forEach(n=>n.remove());document.documentElement.classList.remove('show-verse');});
  }
  const n=Object.keys(total).length;
  console.log('\n  TOTAL rebords colorés distincts : '+n);
  console.log('  erreurs : '+(errs.length?errs[0]:'AUCUNE'));
  await b.close();
  /* IL DOIT RAPPORTER 0 — et le dire par son code de sortie. Jusqu'à la
     v302 il affichait son total et sortait toujours en vert : un liseré
     revenu n'aurait fait rougir aucune suite. */
  console.log(n||errs.length ? '\n  ÉCHEC' : '\n  OK — aucun rebord coloré, nulle part');
  process.exit(n||errs.length ? 1 : 0);
})();
