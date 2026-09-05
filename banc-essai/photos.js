/* Les trois ecrans a plusieurs, en image, sur le plus petit telephone. */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends=(ms)=>new Promise(r=>setTimeout(r,ms));
const NOMS=[['Taylor','#4C86E8'],['Sarah','#E8734C'],['Jonas','#2FA36B'],['Myriam','#9B5DE5'],['Élie','#F1B24A']];
(async()=>{
  await new Promise(r=>serveur.listen(8242,r));
  const b=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ouvre=async(n,c)=>{ const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:3,userAgent:AND});
    const p=await ctx.newPage();
    await p.addInitScript(([n,c])=>{localStorage.setItem('bt_profile',JSON.stringify({name:n,color:c}));localStorage.setItem('bt_fs_hint','1');},[n,c]);
    await p.goto('http://localhost:8242/');
    await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:25000});
    return {ctx,p,nom:n}; };
  const J=[]; for(const [n,c] of NOMS) J.push(await ouvre(n,c));
  for(const c of J) await c.p.evaluate(()=>openOnline());
  await attends(1500);
  const code=await J[0].p.evaluate(()=>{createRoomFlow();return new Promise(r=>setTimeout(()=>r(net.code),1600));});
  for(const c of J.slice(1)){ await c.p.evaluate(k=>{joinRoom(k,false);},code); await attends(800); }
  await attends(2200);
  await J[0].p.screenshot({path:'/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/multi-salon.png'});
  await J[0].p.evaluate(()=>hostStart()); await attends(2200);
  // quelques reponses pour que les scores different
  for(let i=0;i<J.length;i++){ await J[i].p.evaluate(async(n)=>{const d=m=>new Promise(r=>setTimeout(r,m));
      for(let t=0;t<n;t++){const q=net.deck[net.idx];if(!q)break;
        onlineAnswer(q.shuffledOptions.indexOf(t<n-1?q.correct:(q.shuffledOptions.find(o=>o!==q.correct)||q.correct)));
        await d(40); onlineNext(); await d(40);} },5-i>0?6-i:2); await attends(400); }
  await attends(1500);
  await J[0].p.screenshot({path:'/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/multi-jeu.png'});
  // tout le monde finit
  for(const c of J){ await c.p.evaluate(async()=>{const d=m=>new Promise(r=>setTimeout(r,m));
      for(let t=0;t<40&&!net.myDone;t++){const q=net.deck[net.idx];if(!q)break;
        onlineAnswer(q.shuffledOptions.indexOf(q.correct)); await d(35); onlineNext(); await d(35);} }); await attends(400); }
  await attends(2500);
  await J[0].p.screenshot({path:'/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/multi-fin.png'});
  console.log('multi-salon.png / multi-jeu.png / multi-fin.png');
  await b.close(); serveur.close(); process.exit(0);
})();
