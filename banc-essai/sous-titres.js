/* ============ BANC « AUCUN SOUS-TITRE NE DÉBORDE » ============
   Les cartes de l'accueil portent un sous-titre qui change avec l'état du
   joueur. Deux façons de rater, et j'ai fait les deux dans la même journée :
   le laisser se REPLIER — la carte devient plus haute que les cinq autres et
   la colonne se casse (photo de Taylor, « 143 questions pour aujourd'hui ») —
   ou le ROGNER avec une ellipse, ce qui perd un mot sans prévenir (« Série de
   365 jours à garder », 164 px demandés pour 137 disponibles).
   Aucune des deux n'est acceptable : le texte doit TENIR. Et la règle qui s'en
   dégage, deux fois de suite : ne jamais répéter dans la phrase un nombre qui
   est déjà sur la pastille, à trente pixels de là.
   On éprouve donc CHAQUE état possible sur les deux largeurs les plus
   étroites — un joueur sans série, avec deux jours, avec trois cent
   soixante-cinq, une partie en cours, un défi réussi, un carnet vide, un
   carnet plein dû aujourd'hui, un carnet plein dû plus tard.
   Usage : node banc-essai/sous-titres.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ETATS = [
  ['défi jamais joué',      { streak:0, parties:0, done:false, prog:false, err:0 }],
  ['défi série de 2',       { streak:2, parties:5, done:false, prog:false, err:0 }],
  ['défi série de 365',     { streak:365, parties:900, done:false, prog:false, err:0 }],
  ['défi en cours',         { streak:9, parties:20, done:false, prog:true,  err:0 }],
  ['défi réussi',           { streak:9, parties:20, done:true,  prog:false, err:0 }],
  ['carnet vide',           { streak:3, parties:9, done:false, prog:false, err:0 }],
  ['carnet 143 à revoir',   { streak:3, parties:9, done:false, prog:false, err:143 }],
  ['carnet 143 en attente', { streak:3, parties:9, done:false, prog:false, err:143, plusTard:true }],
];
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  let ko = 0;
  for(const [w] of [[360],[375]]){
    console.log('\n  === largeur ' + w + ' px ===');
    for(const [nom, e] of ETATS){
      const ctx = await b.newContext({ viewport:{width:w,height:800}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
      const p = await ctx.newPage();
      await p.addInitScript((e)=>{
        localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'}));
        localStorage.setItem('bt_fs_hint','1');
        localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':14}, totalCorrect:1505, ach:{premier:1} }));
        const k=(x)=>{const d=new Date(Date.now()-x*86400000),z=y=>String(y).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());};
        localStorage.setItem('bt_daily', JSON.stringify({ last: e.done ? k(0) : k(1), streak:e.streak, jours:[k(1)], geles:[], gels:1, parties:e.parties, score:9, total:9 }));
        window.__e = e;
      }, e);
      await p.goto('http://127.0.0.1:8099/index.html');
      await p.waitForFunction(()=>{ try{ return typeof render==='function'; }catch(e){ return false; } }, null, {timeout:20000});
      await p.evaluate(()=>{
        const e = window.__e;
        const t=[]; ['facile','moyen','difficile'].forEach(x=>(BANK[x]||[]).forEach(q=>t.push(Object.assign({},q,{tier:x}))));
        localStorage.setItem('bt_errbook', JSON.stringify(t.slice(0, e.err).map(q=>({k:qKey(q),n:1,p:0,du: e.plusTard ? dayKey(3) : dayKey(-1),maj:Date.now(),q:q.q,options:q.options,correct:q.correct,fact:q.fact,tier:q.tier}))));
        if(e.prog){ localStorage.setItem('bt_daily_prog', JSON.stringify({ day:dayKey(0), soloMissed:[], idx:2 })); }
        state.screen='mode'; render();
      });
      await p.waitForTimeout(800);
      const r = await p.evaluate(()=>[...document.querySelectorAll('.daily-card .dc-txt small')].map(x=>
        [x.textContent.trim(), x.scrollWidth, x.clientWidth]));
      for(const [t, sw, cw] of r){
        const bon = sw <= cw + 1;
        if(!bon) ko++;
        console.log('    ' + (bon?'· ':'✗ ') + String(sw).padStart(4) + '/' + String(cw).padEnd(4) + '  ' + nom.padEnd(22) + '« ' + t + ' »');
      }
      await ctx.close();
    }
  }
  await b.close();
  console.log(ko ? '\n  ' + ko + ' sous-titre(s) qui ne tiennent pas' : '\n  tous tiennent');
  process.exit(ko?1:0);
})();
