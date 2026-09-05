/* CINQ JOUEURS DANS UN MEME SALON. On verifie ce qui ne pouvait pas exister
   avant : que tout le monde entre, que tout le monde recoive les MEMES
   questions, que chaque score remonte a chacun, que le classement final soit
   juste, et qu'un depart en pleine partie ne fasse pas passer les autres pour
   partis. */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends = (ms)=>new Promise(r=>setTimeout(r,ms));
const NOMS = [['Taylor','#4C86E8'],['Sarah','#E8734C'],['Jonas','#2FA36B'],['Myriam','#9B5DE5'],['Élie','#F1B24A']];

(async () => {
  await new Promise(r=>serveur.listen(8241,r));
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ouvre = async (nom, couleur) => {
    const ctx = await b.newContext({ viewport:{width:402,height:874}, userAgent:AND });
    const p = await ctx.newPage(); const errs=[];
    p.on('pageerror', e=>errs.push(nom+': '+e.message.slice(0,120)));
    await p.addInitScript(([n,c]) => { localStorage.setItem('bt_profile', JSON.stringify({name:n,color:c}));
      localStorage.setItem('bt_fs_hint','1'); }, [nom,couleur]);
    await p.goto('http://localhost:8241/');
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

  await J[0].p.evaluate(()=>hostStart());
  await attends(2500);
  console.log('\n3. lancement');
  const jeux = await Promise.all(J.map(c=>c.p.evaluate(()=>({ n:net.deck.length, q1:(net.deck[0]||{}).q }))));
  console.log('   tout le monde en jeu : ' + J.every(async c=>(await etat(c)).ecran==='online-play'));
  console.log('   memes questions pour les cinq ? ' + (jeux.every(x=>JSON.stringify(x)===JSON.stringify(jeux[0])) ? 'OUI' : 'NON <- PROBLEME'));
  console.log('   ' + jeux[0].n + ' questions, la premiere : ' + String(jeux[0].q1).slice(0,52));

  /* chacun repond, avec un taux de reussite different -> des scores distincts */
  for(let i=0;i<J.length;i++){
    await J[i].p.evaluate(async (bonnes) => {
      const dodo=ms=>new Promise(r=>setTimeout(r,ms));
      for(let t=0; t<60 && !net.myDone; t++){
        const q = net.deck[net.idx]; if(!q) break;
        const juste = t < bonnes;
        const opt = juste ? q.correct : (q.shuffledOptions.find(o=>o!==q.correct) || q.correct);
        onlineAnswer(q.shuffledOptions.indexOf(opt)); await dodo(45); onlineNext(); await dodo(45);
      }
    }, 15 - i*2);
    await attends(700);
  }
  await attends(2500);
  console.log('\n4. tout le monde a joue');
  for(const c of J){ const e = await etat(c); console.log('   ' + c.nom.padEnd(8) + ' ecran=' + e.ecran + '  score=' + e.monScore + '  voit : ' + e.table.join(', ')); }

  const classe = await J[0].p.evaluate(()=>classement().map((j,i)=>(i+1)+'. '+j.name+' '+(j.score|0)));
  console.log('\n5. classement vu par ' + J[0].nom + ' :');
  classe.forEach(l=>console.log('      ' + l));
  const memeClassement = await Promise.all(J.map(c=>c.p.evaluate(()=>classement().map(j=>j.name+':'+(j.score|0)).join('|'))));
  console.log('   les cinq voient le meme classement ? ' + (memeClassement.every(x=>x===memeClassement[0]) ? 'OUI' : 'NON <- PROBLEME'));
  memeClassement.forEach((x,i)=>{ if(x!==memeClassement[0]) console.log('      ' + J[i].nom + ' : ' + x); });

  const vuFin = await J[0].p.evaluate(()=>({
    rangs:[...document.querySelectorAll('.rank-online .rank-row')].map(e=>e.textContent.replace(/\s+/g,' ').trim()),
    duel: !!document.querySelector('.duel-result'), titre:(document.querySelector('.end-title')||{}).textContent }));
  console.log('   ecran de fin : ' + vuFin.rangs.length + ' rangees, face-a-face VS : ' + vuFin.duel + ', titre : ' + vuFin.titre);
  vuFin.rangs.forEach(x=>console.log('      ' + x));

  /* 6. un joueur ferme son onglet en pleine partie suivante */
  await J[0].p.evaluate(()=>relancerPartie()); await attends(2200);
  console.log('\n6. l\'hote relance ; tout le monde repart : ' +
    (await Promise.all(J.map(async c=>(await etat(c)).ecran))).join(' '));
  await J[4].ctx.close(); await attends(11000);
  const apres = await Promise.all(J.slice(0,4).map(async c=>{ const e=await etat(c); return c.nom+' voit '+e.joueurs+' joueurs'; }));
  console.log('   ' + J[4].nom + ' ferme son onglet -> ' + apres.join(' | '));

  const errs = J.flatMap(c=>c.errs);
  console.log('\nerreurs de page : ' + (errs.length ? errs.join('\n   ') : 'AUCUNE'));
  await b.close(); serveur.close(); process.exit(0);
})();
