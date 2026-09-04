/* LES CHEMINS OU LES BUGS SE CACHENT.
   A. appariement aleatoire (le salon est LOCAL ici : aucun vrai joueur risque
      d'etre derange) ;
   B. les deux terminent — les deux doivent voir l'ecran de fin ;
   C. revanche ;
   D. l'invite s'en va AVANT le lancement. */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends = (ms)=>new Promise(r=>setTimeout(r,ms));
(async () => {
  await new Promise(r=>serveur.listen(8241,r));
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const tousErrs = [];
  const ouvre = async (nom, couleur) => {
    const ctx = await b.newContext({ viewport:{width:402,height:874}, userAgent:AND });
    const p = await ctx.newPage();
    p.on('pageerror', e=>tousErrs.push(nom+': '+e.message.slice(0,110)));
    await p.addInitScript(([n,c]) => { localStorage.setItem('bt_profile', JSON.stringify({name:n,color:c}));
      localStorage.setItem('bt_fs_hint','1'); }, [nom,couleur]);
    await p.goto('http://localhost:8241/');
    await p.waitForFunction(() => { try { return state.screen==='mode'; } catch(e){ return false; } }, null, { timeout:20000 });
    return { ctx, p, nom };
  };
  const etat = (c) => c.p.evaluate(() => ({ ecran: state.screen, salon: net.code, hote: net.isHost,
    adv: net.opp && net.opp.name, present: net.oppPresent, parti: net.oppGone,
    moi: net.score, lui: net.oppScore, fini: net.myDone, luiFini: net.oppDone, cherche: net.searching }));
  const joue = (c) => c.p.evaluate(async () => {
    for(let t=0;t<40 && !net.myDone;t++){ const q=net.deck[net.idx]; if(!q) break;
      const i=q.shuffledOptions.indexOf(q.correct); onlineAnswer(i>=0?i:0);
      await new Promise(r=>setTimeout(r,70)); onlineNext(); await new Promise(r=>setTimeout(r,70)); }
  });

  /* ---------- A. appariement aleatoire ---------- */
  const A = await ouvre('Taylor','#4C86E8'), B = await ouvre('Sarah','#E8734C');
  await A.p.evaluate(()=>openOnline()); await B.p.evaluate(()=>openOnline());
  await attends(1500);
  await A.p.evaluate(()=>setSearching(true));
  await attends(800);
  await B.p.evaluate(()=>setSearching(true));
  await attends(7000);
  const a1=await etat(A), b1=await etat(B);
  console.log('A. APPARIEMENT ALEATOIRE');
  console.log('   Taylor : ecran=' + a1.ecran + ' salon=' + a1.salon + ' hote=' + a1.hote + ' adversaire=' + a1.adv);
  console.log('   Sarah  : ecran=' + b1.ecran + ' salon=' + b1.salon + ' hote=' + b1.hote + ' adversaire=' + b1.adv);
  console.log('   -> ' + (a1.salon && a1.salon===b1.salon && a1.hote!==b1.hote && a1.adv && b1.adv
      ? 'apparies, un seul hote, chacun voit l autre : OK' : 'ECHEC'));

  /* ---------- B. les deux terminent ---------- */
  const hote = a1.hote ? A : B;
  await hote.p.evaluate(()=>hostStart());
  await attends(2000);
  await Promise.all([joue(A), joue(B)]);
  await attends(2500);
  const a2=await etat(A), b2=await etat(B);
  console.log('\nB. LES DEUX TERMINENT');
  console.log('   Taylor : ecran=' + a2.ecran + ' score=' + a2.moi + ' (il voit ' + a2.lui + ' chez l autre)');
  console.log('   Sarah  : ecran=' + b2.ecran + ' score=' + b2.moi + ' (elle voit ' + b2.lui + ' chez l autre)');
  console.log('   -> ' + (a2.ecran==='online-end' && b2.ecran==='online-end' && a2.moi===b2.lui && b2.moi===a2.lui
      ? 'les deux sur l ecran de fin, scores concordants : OK' : 'ECHEC'));

  /* ---------- C. revanche ---------- */
  const rev = await A.p.evaluate(()=>typeof onlineRematch==='function' ? 'onlineRematch' : null);
  console.log('\nC. REVANCHE   (fonction detectee : ' + rev + ')');
  if(rev){
    await A.p.evaluate(()=>onlineRematch());
    await attends(1500);
    const mi = await Promise.all([A,B].map(c=>c.p.evaluate(()=>({ moi:net.iWantReplay, lui:net.oppWantReplay, e:state.screen }))));
    console.log('   apres la demande de Taylor : Taylor ' + JSON.stringify(mi[0]) + '  Sarah ' + JSON.stringify(mi[1]));
    console.log('   -> ' + (mi[1].lui ? 'Sarah voit la demande : OK' : 'Sarah ne voit RIEN  <- PROBLEME'));
    await B.p.evaluate(()=>onlineRematch());
    await attends(3000);
    const a3=await etat(A), b3=await etat(B);
    console.log('   Taylor : ecran=' + a3.ecran + ' score=' + a3.moi + '   Sarah : ecran=' + b3.ecran + ' score=' + b3.moi);
    console.log('   -> ' + (a3.ecran==='online-play' && b3.ecran==='online-play' ? 'nouveau duel lance des deux cotes : OK' : 'les deux ne repartent pas ensemble  <- PROBLEME'));
  }

  /* ---------- D. l invite part AVANT le lancement ---------- */
  const C1 = await ouvre('Marc','#7BC86B'), D1 = await ouvre('Lea','#D48BE8');
  await C1.p.evaluate(()=>openOnline()); await D1.p.evaluate(()=>openOnline());
  await attends(1200);
  const code = await C1.p.evaluate(()=>{ createRoomFlow(); return new Promise(r=>setTimeout(()=>r(net.code),1500)); });
  await D1.p.evaluate((c)=>joinRoom(c,false), code);
  await attends(2500);
  const avant = await etat(C1);
  await D1.ctx.close();
  await attends(5000);
  const apres = await etat(C1);
  console.log('\nD. L INVITE PART AVANT LE LANCEMENT');
  console.log('   avant : adversaire=' + avant.adv + ' present=' + avant.present);
  console.log('   apres : adversaire=' + apres.adv + ' present=' + apres.present + ' parti=' + apres.parti + ' ecran=' + apres.ecran);
  console.log('   -> ' + (apres.present===false ? 'depart detecte : OK' : 'ECHEC : l hote croit encore l adversaire present'));

  console.log('\nerreurs JS : ' + (tousErrs.length ? '\n  ' + [...new Set(tousErrs)].slice(0,8).join('\n  ') : 'AUCUNE'));
  await A.ctx.close(); await B.ctx.close(); await C1.ctx.close();
  await b.close(); await new Promise(r=>serveur.close(r));
})();
