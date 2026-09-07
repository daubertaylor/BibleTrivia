/* UNIFORMITÉ : cherche, sur TOUTES les surfaces de TOUS les écrans, un anneau
   d'un ou deux pixels au bord dont la luminance diffère à la fois de
   l'intérieur ET de l'extérieur — clair ou sombre, peu importe. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const D=process.argv[2], TAG=process.argv[3]||'x', CSS=process.argv[4]||'';
const VUES=[
 ['accueil',  ()=>{state.screen='mode';render();}],
 ['solo',     ()=>{state.mode='solo';state.screen='setup';render();}],
 ['groupe',   ()=>{state.mode='group';state.teams=[{name:'Taylor'},{name:'Ana'}];state.screen='setup';render();}],
 ['jeu',      ()=>{state.mode='solo';startGame();state.screen='play';render();}],
 ['fin',      ()=>{state.mode='solo';startGame();state.screen='end';state.soloScore=110;state.soloCorrect=7;state.soloBestStreak=3;render();}],
 ['ligne',    ()=>{state.screen='online';render();}],
 ['parcours', ()=>{state.screen='parcours';render();}],
 ['profil',   ()=>{state.screen='profile';render();}],
 ['reglages', ()=>{state.screen='mode';render();openSettings();}],
 ['bibles',   ()=>{state.screen='mode';render();openSettings();setTimeout(()=>openBibles(),250);}],
 ['objectif', ()=>{state.screen='parcours';render();setTimeout(()=>openAchInfo('pas'),250);}],
 ['sortie',   ()=>{state.mode='solo';startGame();state.screen='play';render();confirmLeaveGame();}],
];
const SEL='.app-header,.card,.mode-card,.question-card,.solo-summary,.solo-score-bar,.score-pane,.option-btn,.btn-primary,.btn-next,.btn-replay,.fact-card,.tier-chip,.q-counter,.streak-chip,.chip,.icon-btn,.btn-reveal,.btn-newgame,.award-btn,.presence-card,.me-row,.online-action,.info-card,.vs-row,.len-chip,.timer-chip,.rank-row,.text-input,.code-input,.modal-card,.btn-ghost,.settings-sheet,.hero-verse-card,.modal-btn,.end-medal,.adj-btn,.rules,.btn-review,.daily-card,.dc-streak,.btn-invite,.creator-badge,.set-go,.share-btn,.rev-item,.bible-item,.parcours-card,.parcours-sum,.tst-head,.bk,.sj,.team-row,.add-team,.ach-tile,.set-ico';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const out=[];
  for(const [nom,go] of VUES){
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:393,height:852},deviceScaleFactor:4,userAgent:IOS,hasTouch:true});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#3E8EE0',isCreator:true}));localStorage.setItem('bt_fs_hint','1');
    localStorage.setItem('bt_progress',JSON.stringify({books:{'Genèse':12,'Exode':12},totalCorrect:349,bestStreak:21,flawless:1,ach:{pas:1}}));
    localStorage.setItem('bt_daily',JSON.stringify({last:new Date().toISOString().slice(0,10),streak:4}));});
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.waitForFunction(()=>{try{return state.screen==='mode' && !document.querySelector('.splash-screen');}catch(e){return false;}},null,{timeout:40000});
  await p.evaluate(go);
  await p.waitForTimeout(1500);
  if(CSS){ await p.addStyleTag({content:CSS}); await p.waitForTimeout(400); }
  const bs=await p.evaluate((S)=>[...document.querySelectorAll(S)].map(e=>{
    const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
    // surfaces PLATES et bien visibles seulement : un cercle ou une pastille
    // n'a pas d'arête droite au milieu de ses côtés, la sonde y traverse le
    // vide. Et un élément à opacité réduite (carte de verset repliée) n'est
    // pas à l'écran : le mesurer n'a aucun sens.
    if(r.width<80||r.height<36) return null;
    if(parseFloat(cs.opacity) < 0.95) return null;
    let n=e, cache=false;
    while(n && n!==document.body){ const c=getComputedStyle(n);
      if(parseFloat(c.opacity)<0.95 || c.visibility==='hidden') { cache=true; break; } n=n.parentElement; }
    if(cache) return null;
    const rad=Math.max(parseFloat(cs.borderTopLeftRadius)||0, parseFloat(cs.borderTopRightRadius)||0);
    if(rad > Math.min(r.width,r.height)*0.42) return null;   // galet / cercle
    return {c:e.className.split(' ').filter(x=>!/has-gs|animate|reveal-in|screen-enter/.test(x)).slice(0,2).join('.')||e.tagName.toLowerCase(),
      x:r.left,y:r.top,w:r.width,h:r.height, gs:e.classList.contains('has-gs')};}).filter(Boolean), SEL);
  const f=D+'/an-'+TAG+'-'+nom+'.png';
  await p.screenshot({path:f});
  out.push({vue:nom, boites:bs, f, err:errs[0]||null});
  await ctx.close();
  }
  fs.writeFileSync(D+'/anneau-'+TAG+'.json', JSON.stringify(out));
  console.log('captures : '+out.map(o=>o.vue+':'+o.boites.length).join('  '));
  const e=out.filter(o=>o.err); if(e.length) console.log('ERREURS', e.map(o=>o.vue+' '+o.err).join(' | '));
  await b.close();
})();
