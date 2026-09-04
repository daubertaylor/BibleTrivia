/* DEUX VRAIS JOUEURS, UN VRAI DUEL. Client A cree un salon, client B rejoint
   avec le code, ils jouent, l'un finit avant l'autre, puis l'un quitte. On
   observe ce que CHACUN voit a chaque etape. */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends = (ms)=>new Promise(r=>setTimeout(r,ms));
(async () => {
  await new Promise(r=>serveur.listen(8240,r));
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ouvre = async (nom, couleur) => {
    const ctx = await b.newContext({ viewport:{width:402,height:874}, userAgent:AND });
    const p = await ctx.newPage(); const errs=[];
    p.on('pageerror', e=>errs.push(nom+': '+e.message.slice(0,110)));
    await p.addInitScript(([n,c]) => { localStorage.setItem('bt_profile', JSON.stringify({name:n,color:c}));
      localStorage.setItem('bt_fs_hint','1'); }, [nom,couleur]);
    await p.goto('http://localhost:8240/');
    await p.waitForFunction(() => { try { return state.screen==='mode'; } catch(e){ return false; } }, null, { timeout:20000 });
    return { ctx, p, errs, nom };
  };
  const etat = (c) => c.p.evaluate(() => ({
    ecran: state.screen, salon: net.code, hote: net.isHost,
    adversaire: net.opp && net.opp.name, present: net.oppPresent, parti: net.oppGone,
    monScore: net.score, sonScore: net.oppScore, maQuestion: net.idx, saQuestion: net.oppIndex,
    jAiFini: net.myDone, ilAFini: net.oppDone, cartes: net.deck ? net.deck.length : 0,
    connectes: net.connected,
  }));
  const A = await ouvre('Taylor', '#4C86E8');
  const B = await ouvre('Sarah',  '#E8734C');
  console.log('deux joueurs prets\n');

  await A.p.evaluate(()=>openOnline()); await B.p.evaluate(()=>openOnline());
  await attends(2500);
  console.log('1. les deux ouvrent le mode en ligne');
  console.log('   Taylor voit ' + (await etat(A)).connectes + ' connecte(s), Sarah en voit ' + (await etat(B)).connectes);

  const code = await A.p.evaluate(()=>{ createRoomFlow(); return new Promise(r=>setTimeout(()=>r(net.code),1500)); });
  console.log('\n2. Taylor cree un salon : code ' + code);
  console.log('   Taylor : ' + JSON.stringify(await etat(A)));

  await B.p.evaluate((c)=>{ joinRoom(c, false); }, code);
  await attends(3000);
  console.log('\n3. Sarah rejoint avec le code');
  console.log('   Taylor voit : ' + JSON.stringify(await etat(A)));
  console.log('   Sarah  voit : ' + JSON.stringify(await etat(B)));

  await A.p.evaluate(()=>hostStart());
  await attends(2500);
  console.log('\n4. Taylor lance le duel');
  console.log('   Taylor : ecran=' + (await etat(A)).ecran + '   Sarah : ecran=' + (await etat(B)).ecran);
  const memeJeu = await Promise.all([A,B].map(c=>c.p.evaluate(()=>({
    n: net.deck.length, premiere: net.deck[0] && net.deck[0].q.slice(0,44),
    derniere: net.deck[net.deck.length-1] && net.deck[net.deck.length-1].q.slice(0,30) }))));
  console.log('   memes questions ? ' + (JSON.stringify(memeJeu[0])===JSON.stringify(memeJeu[1]) ? 'OUI' : 'NON  <- PROBLEME'));
  console.log('     ' + JSON.stringify(memeJeu[0]));

  /* 5. Taylor repond a tout, Sarah reste en arriere */
  await A.p.evaluate(async () => {
    for(let tour=0; tour<40 && !net.myDone; tour++){
      const q = net.deck[net.idx]; if(!q) break;
      const bon = q.shuffledOptions.indexOf(q.correct);
      onlineAnswer(bon >= 0 ? bon : 0);
      await new Promise(r=>setTimeout(r,90));
      onlineNext();
      await new Promise(r=>setTimeout(r,90));
    }
  });
  await attends(3000);
  console.log('\n5. Taylor termine tout le duel, Sarah n a pas joue');
  console.log('   Taylor : ' + JSON.stringify(await etat(A)));
  console.log('   Sarah  : ' + JSON.stringify(await etat(B)));

  /* 6. Sarah ferme son onglet : Taylor doit s'en apercevoir */
  await B.ctx.close();
  await attends(4000);
  console.log('\n6. Sarah quitte brutalement (onglet ferme)');
  const apres = await etat(A);
  console.log('   Taylor voit : adversaire present=' + apres.present + ', parti=' + apres.parti + ', ecran=' + apres.ecran);

  console.log('\n  erreurs : ' + [...A.errs, ...B.errs].slice(0,6).join('\n            '));
  await A.ctx.close(); await b.close();
  await new Promise(r=>serveur.close(r));
})();
