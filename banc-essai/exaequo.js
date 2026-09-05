/* Trois joueurs a egalite : partagent-ils le rang ? Et ma ligne est-elle
   distinguee des autres ? */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends=(ms)=>new Promise(r=>setTimeout(r,ms));
const NOMS=[['Taylor','#4C86E8'],['Sarah','#E8734C'],['Jonas','#2FA36B'],['Myriam','#9B5DE5']];
(async()=>{
  await new Promise(r=>serveur.listen(8243,r));
  const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ouvre=async(n,c)=>{ const ctx=await b.newContext({viewport:{width:402,height:874},userAgent:AND});
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(n+': '+e.message.slice(0,110)));
    await p.addInitScript(([n,c])=>{localStorage.setItem('bt_profile',JSON.stringify({name:n,color:c}));localStorage.setItem('bt_fs_hint','1');},[n,c]);
    await p.goto('http://localhost:8243/');
    await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:25000});
    return {ctx,p,nom:n,errs}; };
  const J=[]; for(const [n,c] of NOMS) J.push(await ouvre(n,c));
  for(const c of J) await c.p.evaluate(()=>openOnline());
  await attends(1500);
  const code=await J[0].p.evaluate(()=>{createRoomFlow();return new Promise(r=>setTimeout(()=>r(net.code),1600));});
  for(const c of J.slice(1)){ await c.p.evaluate(k=>{joinRoom(k,false);},code); await attends(800); }
  await attends(2000);
  await J[0].p.evaluate(()=>hostStart()); await attends(2200);
  /* trois a 15/15, un a 12/15 -> trois ex aequo en tete */
  const bonnes=[15,15,15,12];
  for(let i=0;i<J.length;i++){
    await J[i].p.evaluate(async(n)=>{const d=m=>new Promise(r=>setTimeout(r,m));
      for(let t=0;t<40&&!net.myDone;t++){const q=net.deck[net.idx];if(!q)break;
        const opt=(t<n)?q.correct:(q.shuffledOptions.find(o=>o!==q.correct)||q.correct);
        onlineAnswer(q.shuffledOptions.indexOf(opt)); await d(35); onlineNext(); await d(35);} }, bonnes[i]);
    await attends(500);
  }
  await attends(2500);
  const vu = await J[0].p.evaluate(()=>({
    titre:(document.querySelector('.end-title')||{}).textContent,
    rangs:[...document.querySelectorAll('.rank-online .rank-row')].map(e=>({
      txt:e.textContent.replace(/\s+/g,' ').trim(),
      moi:e.classList.contains('moi'),
      rebord:(()=>{const r=e.querySelector(':scope > .glass-rim');return r?getComputedStyle(r).boxShadow.slice(-46):'?';})() })),
  }));
  console.log('titre : ' + vu.titre);
  vu.rangs.forEach(r=>console.log('  ' + (r.moi?'[MOI] ':'      ') + r.txt.padEnd(30) + ' rebord…' + r.rebord));
  const errs=J.flatMap(c=>c.errs);
  console.log('erreurs : ' + (errs.length?errs.join(' / '):'AUCUNE'));
  await b.close(); serveur.close(); process.exit(0);
})();
