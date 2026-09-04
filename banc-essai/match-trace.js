/* QUI FAIT QUOI, ET QUAND. On horodate chaque etape de l'appariement chez les
   deux joueurs pour distinguer un vrai defaut du jeu d'une lenteur de mon banc. */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends=(ms)=>new Promise(r=>setTimeout(r,ms));
(async () => {
  await new Promise(r=>serveur.listen(8242,r));
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const journal=[];
  const ouvre = async (nom) => {
    const ctx = await b.newContext({ viewport:{width:402,height:874}, userAgent:AND });
    const p = await ctx.newPage();
    await p.exposeFunction('trace', (q)=>journal.push({ t:Date.now(), nom, q }));
    await p.addInitScript((n)=>{ localStorage.setItem('bt_profile', JSON.stringify({name:n,color:'#4C86E8'}));
      localStorage.setItem('bt_fs_hint','1'); }, nom);
    await p.goto('http://localhost:8242/');
    await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, { timeout:20000 });
    /* on espionne les fonctions cles SANS changer leur comportement */
    await p.evaluate(() => {
      const esp = (n) => { const o = window[n]; if(typeof o!=='function') return;
        window[n] = function(){ try{ window.trace(n + '(' + Array.from(arguments).slice(0,2).join(',') + ')'); }catch(e){}
          return o.apply(this, arguments); }; };
      ['createRoom','joinRoom','cleanupRoom','setSearching','armMatchGuard','matchFromLookers','beginDuel'].forEach(esp);
      const g = window.armMatchGuard;
      /* on note aussi le declenchement effectif de la garde */
      const oldST = window.setTimeout;
    });
    return { ctx, p, nom };
  };
  const A = await ouvre('Taylor'), B = await ouvre('Sarah');
  const t0 = Date.now();
  await A.p.evaluate(()=>openOnline()); await B.p.evaluate(()=>openOnline());
  await attends(1500);
  await A.p.evaluate(()=>setSearching(true));
  await attends(600);
  await B.p.evaluate(()=>setSearching(true));
  for(let i=0;i<8;i++){
    await attends(1500);
    const [a,b2] = await Promise.all([A,B].map(c=>c.p.evaluate(()=>({
      e:state.screen, s:net.code, h:net.isHost, adv:net.opp&&net.opp.name, pres:net.oppPresent, ch:net.searching }))));
    journal.push({ t:Date.now(), nom:'--etat--', q:'A['+a.e+' '+(a.s||'-')+' hote='+a.h+' adv='+(a.adv||'-')+' pres='+a.pres+' cherche='+a.ch+']  B['+b2.e+' '+(b2.s||'-')+' hote='+b2.h+' adv='+(b2.adv||'-')+' pres='+b2.pres+' cherche='+b2.ch+']' });
  }
  journal.sort((x,y)=>x.t-y.t);
  journal.forEach(j=>console.log('  +' + String(j.t-t0).padStart(6) + 'ms  ' + j.nom.padEnd(9) + ' ' + j.q));
  await A.ctx.close(); await B.ctx.close(); await b.close(); await new Promise(r=>serveur.close(r));
})();
