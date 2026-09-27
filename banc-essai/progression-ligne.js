/* ====== BANC « UNE BONNE RÉPONSE EN LIGNE COMPTE COMME LES AUTRES » ======
   « Pour les joueurs qui jouent en mode en ligne, leur réponse doit
   s'enregistrer dans la progression, vu que le reste se compte. »

   IL AVAIT RAISON, ET C'ÉTAIT UNE OMISSION FRANCHE. Le duel créditait le
   score, le carnet d'erreurs et la flamme — marquerJoue() au départ,
   compterPartie() à l'arrivée — mais JAMAIS la Progression. Un joueur pouvait
   enchaîner vingt parties en ligne et lire « 0/66 livres · 0 bonne réponse ».
   La réponse est la même, la question vient de la même banque, le livre est le
   même : il n'y avait aucune raison, juste un appel manquant.

   CE BANC JOUE UN VRAI DUEL, sans serveur : on pose la donne, on répond, et on
   compare la Progression AVANT et APRÈS. Il vérifie les deux sens — ce qui doit
   monter monte, et ce qui ne doit pas monter ne monte pas.
   Usage : node banc-essai/progression-ligne.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

let ko = 0;
const v = (nom, bon, det)=>{ if(!bon) ko++; console.log('  ' + (bon?'ok   ':'KO   ') + nom.padEnd(50) + (det||'')); };

(async()=>{
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'}));
                              localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return typeof beginDuel === 'function'; }catch(e){ return false; } }, null, {timeout:20000});

  /* On pose un duel sans réseau : la donne est celle du jeu, le salon n'a pas
     besoin d'exister pour que les réponses comptent. */
  const poser = ()=> p.evaluate(()=>{
    net.room = null;                       // aucun envoi : on ne teste pas le transport
    beginDuel(12345, 'courte', 'sans', 'tout');
    return net.deck.length;
  });
  const photo = ()=> p.evaluate(()=>{
    const pr = loadProgress();
    return { total: pr.totalCorrect, livres: Object.keys(pr.books||{}).length,
             serie: pr.bestStreak, sansFaute: pr.flawless|0,
             somme: Object.keys(pr.books||{}).reduce((a,k)=>a+pr.books[k],0) };
  });

  const n = await poser();
  v("un duel est posé", n > 0, n + ' questions');
  const avant = await photo();

  /* ---------- TOUTES BONNES : tout doit monter ---------- */
  await p.evaluate(()=>{
    while(net.idx < net.deck.length){
      const q = net.deck[net.idx];
      const i = q.shuffledOptions.indexOf(q.correct);
      onlineAnswer(i);
      onlineNext();
    }
  });
  await p.waitForTimeout(400);
  const apres = await photo();
  v("le total des bonnes réponses a monté", apres.total === avant.total + n, avant.total + ' -> ' + apres.total + ' (attendu +' + n + ')');
  v("des livres ont été crédités", apres.livres > avant.livres, avant.livres + ' -> ' + apres.livres + ' livre(s)');
  v("la somme par livre suit le total", apres.somme === avant.somme + n, avant.somme + ' -> ' + apres.somme);
  v("la meilleure série a monté", apres.serie >= n, 'série ' + apres.serie + ' pour ' + n + ' bonnes d\'affilée');
  v("le sans-faute est acquis", apres.sansFaute === 1);

  /* ---------- TOUTES FAUSSES : rien ne doit monter ---------- */
  const n2 = await poser();
  const avant2 = await photo();
  await p.evaluate(()=>{
    while(net.idx < net.deck.length){
      const q = net.deck[net.idx];
      let i = q.shuffledOptions.findIndex(o=>o !== q.correct);
      onlineAnswer(i < 0 ? 0 : i);
      onlineNext();
    }
  });
  await p.waitForTimeout(400);
  const apres2 = await photo();
  v("une mauvaise réponse ne crédite RIEN", apres2.total === avant2.total && apres2.somme === avant2.somme,
    'total ' + avant2.total + ' -> ' + apres2.total + ', somme ' + avant2.somme + ' -> ' + apres2.somme);
  v("et elle ne donne pas le sans-faute", apres2.sansFaute === avant2.sansFaute);

  /* ---------- LA SÉRIE SE CASSE SUR UNE FAUTE ---------- */
  await poser();
  const serie = await p.evaluate(()=>{
    const q0 = net.deck[0]; onlineAnswer(q0.shuffledOptions.indexOf(q0.correct)); onlineNext();
    const q1 = net.deck[1]; onlineAnswer(q1.shuffledOptions.findIndex(o=>o!==q1.correct)); onlineNext();
    const apresFaute = net.streak;
    const q2 = net.deck[2]; onlineAnswer(q2.shuffledOptions.indexOf(q2.correct));
    return { apresFaute, apresBonne: net.streak };
  });
  v("la série retombe à zéro sur une faute", serie.apresFaute === 0, 'série = ' + serie.apresFaute);
  v("et repart à un ensuite", serie.apresBonne === 1, 'série = ' + serie.apresBonne);

  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? "\n  OK — ce qu'on gagne en ligne se retrouve dans la Progression"
                       : "\n  " + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
