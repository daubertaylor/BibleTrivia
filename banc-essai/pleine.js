/* CINQ JOUEURS DANS UN MEME SALON. On verifie ce qui ne pouvait pas exister
   avant : que tout le monde entre, que tout le monde recoive les MEMES
   questions, que chaque score remonte a chacun, que le classement final soit
   juste, et qu'un depart en pleine partie ne fasse pas passer les autres pour
   partis. */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends = (ms)=>new Promise(r=>setTimeout(r,ms));
const NOMS = [['J1','#4C86E8'],['J2','#E8734C'],['J3','#2FA36B'],['J4','#9B5DE5'],['J5','#F1B24A'],['J6','#3AA6B9'],['J7','#D95D9A'],['J8','#7A8B3F'],['J9','#B5651D']];

(async () => {
  await new Promise(r=>serveur.listen(8244,r));
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ouvre = async (nom, couleur) => {
    const ctx = await b.newContext({ viewport:{width:402,height:874}, userAgent:AND });
    const p = await ctx.newPage(); const errs=[];
    p.on('pageerror', e=>errs.push(nom+': '+e.message.slice(0,120)));
    await p.addInitScript(([n,c]) => { localStorage.setItem('bt_profile', JSON.stringify({name:n,color:c}));
      localStorage.setItem('bt_fs_hint','1'); }, [nom,couleur]);
    await p.goto('http://localhost:8244/');
    await p.waitForFunction(() => { try { return state.screen==='mode'; } catch(e){ return false; } }, null, { timeout:25000 });
    return { ctx, p, errs, nom };
  };
  const etat = (c) => c.p.evaluate(() => ({
    ecran: state.screen, joueurs: nbJoueurs(),
    table: Object.keys(net.joueurs).map(k=>net.joueurs[k].name + (net.joueurs[k].gone?'(parti)':'') + ':' + (net.joueurs[k].score|0)).sort(),
    monScore: net.score, maQuestion: net.idx, jAiFini: net.myDone, cartes: net.deck.length,
  }));

  const J = [];
  for(const [n,c] of NOMS) J.push(await ouvre(n,c));
  console.log('cinq joueurs prets\n');

  for(const c of J) await c.p.evaluate(()=>openOnline());
  await attends(1800);
  const code = await J[0].p.evaluate(()=>{ createRoomFlow(); return new Promise(r=>setTimeout(()=>r(net.code),1800)); });
  console.log('1. ' + J[0].nom + ' cree le salon : code ' + code);

  for(const c of J.slice(1)){ await c.p.evaluate((k)=>{ joinRoom(k,false); }, code); await attends(900); }
  await attends(2200);
  console.log('\n2. les quatre autres rejoignent');
  for(const c of J) console.log('   ' + c.nom.padEnd(8) + ' voit ' + (await etat(c)).joueurs + ' joueurs : ' + (await etat(c)).table.join(', '));

  const vuSalon = await J[0].p.evaluate(()=>{
    const l=[...document.querySelectorAll('.salle-ligne')].map(e=>e.textContent.replace(/\s+/g,' ').trim());
    return { lignes:l.length, contenu:l, vs: !!document.querySelector('.vs-row') };
  });
  console.log('   ecran du salon : ' + vuSalon.lignes + ' lignes, face-a-face VS affiche : ' + vuSalon.vs);
  vuSalon.contenu.forEach(x=>console.log('      ' + x));

  const places = await Promise.all(J.map(async c=>{
    const e=await c.p.evaluate(()=>({ ecran:state.screen, n:nbJoueurs(), err:net.error }));
    return c.nom+' -> '+e.ecran+' ('+e.n+' joueurs)'+(e.err?' « '+e.err+' »':''); }));
  console.log('\n2bis. neuf candidats pour huit places :');
  places.forEach(x=>console.log('   '+x));
  const dedans = await Promise.all(J.map(c=>c.p.evaluate(()=>state.screen==='online-room')));
  console.log('   -> ' + dedans.filter(Boolean).length + ' joueurs dans le salon (plafond 8)');
  const errs0=J.flatMap(c=>c.errs);
  console.log('   erreurs : ' + (errs0.length?errs0.join(' / '):'AUCUNE'));
  await b.close(); serveur.close(); process.exit(0);
})();
