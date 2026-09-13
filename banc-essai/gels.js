/* ================== BANC « LES GELS DE SÉRIE » ==================
   « Pour les utilisateurs vraiment réguliers qui viennent à perdre leur
   flamme, on pourra leur donner un gel pour garder leur motivation. Mais
   attention, pas de façon trop abusive. »
   Le banc joue de VRAIES journées dans le vrai code du jeu : il écrit
   bt_daily, avance l'horloge du navigateur d'un jour à l'autre, et relit ce
   que le jeu affiche. Il vérifie les deux moitiés de la demande —
   la générosité (un joueur régulier est protégé) ET la retenue (on ne peut
   pas s'acheter des vacances) — plus la règle absolue du projet : aucune
   progression ne repart jamais à zéro.
   Usage : node banc-essai/gels.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

let ko = 0;
function verifier(nom, obtenu, attendu){
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if(!bon) ko++;
  console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(52) + (bon ? '' : '  obtenu ' + JSON.stringify(obtenu) + ', attendu ' + JSON.stringify(attendu)));
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  /* Boîte à outils dans la page : poser un état, jouer un défi, lire. */
  await p.evaluate(() => {
    window.__cle = (dec)=>{ const d = new Date(Date.now() + dec*86400000), p = n=>String(n).padStart(2,'0');
      return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); };
    window.__poser = (o)=>{ localStorage.setItem('bt_daily', JSON.stringify(o)); };
    window.__lire  = ()=> JSON.parse(localStorage.getItem('bt_daily')||'{}');
    /* Jouer le défi du jour = ce que fait recordDailyResult, avec un score. */
    window.__jouer = ()=>{ state.soloCorrect = 7; state.questions = new Array(9); recordDailyResult(); };
  });

  const ev = (f, ...a) => p.evaluate(f, ...a);

  // ---------- 1. UN JOUEUR D'AVANT LES GELS NE PERD RIEN ----------
  await ev(()=>{ __poser({ last: __cle(0), streak: 6, score: 5, total: 9 }); });
  verifier("ancien joueur : sa série s'affiche telle quelle",
    await ev(()=> dailyStreakShown()), 6);
  verifier("ancien joueur : ses 6 jours restent cochés",
    await ev(()=> joursFaits().size), 6);
  verifier("ancien joueur : aucun gel inventé",
    await ev(()=> loadDaily().gels), 0);

  // ---------- 2. LA GÉNÉROSITÉ : UN GEL TOUS LES DIX JOURS, DEUX AU PLUS ----------
  await ev(()=>{ __poser({ last: __cle(-1), streak: 9, jours:[], geles:[], gels:0, palier:0 }); __jouer(); });
  verifier("dixième jour d'affilée : un gel gagné",
    await ev(()=> [loadDaily().streak, loadDaily().gels]), [10, 1]);
  await ev(()=>{ __poser({ last: __cle(-1), streak: 19, jours:[], geles:[], gels:1, palier:10 }); __jouer(); });
  verifier("vingtième jour : le deuxième gel",
    await ev(()=> [loadDaily().streak, loadDaily().gels]), [20, 2]);
  await ev(()=>{ __poser({ last: __cle(-1), streak: 29, jours:[], geles:[], gels:2, palier:20 }); __jouer(); });
  verifier("trentième jour : la réserve reste plafonnée à deux",
    await ev(()=> [loadDaily().streak, loadDaily().gels]), [30, 2]);
  await ev(()=>{ __poser({ last: __cle(-1), streak: 4, jours:[], geles:[], gels:0, palier:0 }); __jouer(); });
  verifier("cinquième jour : rien, c'est trop tôt",
    await ev(()=> loadDaily().gels), 0);

  // ---------- 3. LA PROTECTION : UN JOUR MANQUÉ NE TUE PLUS LA FLAMME ----------
  await ev(()=>{ __poser({ last: __cle(-2), streak: 12, jours:[__cle(-2)], geles:[], gels:1, palier:10 }); reglerFlamme(); });
  verifier("un jour manqué avec un gel : la flamme tient",
    await ev(()=> dailyStreakShown()), 12);
  verifier("le gel a bien été dépensé",
    await ev(()=> loadDaily().gels), 0);
  verifier("le jour manqué est marqué GELÉ",
    await ev(()=> loadDaily().geles), [await ev(()=>__cle(-1))]);
  verifier("le joueur en est averti",
    await ev(()=> loadDaily().annonce), await ev(()=>__cle(-1)));
  await ev(()=>{ __jouer(); });
  verifier("il rejoue : la série avance de UN, le gel n'en donne pas",
    await ev(()=> loadDaily().streak), 13);

  // ---------- 4. LA RETENUE : ON N'ACHÈTE PAS DE VACANCES ----------
  await ev(()=>{ __poser({ last: __cle(-3), streak: 25, jours:[__cle(-3)], geles:[], gels:2, palier:20 }); reglerFlamme(); });
  verifier("deux jours de suite : la flamme s'éteint malgré deux gels",
    await ev(()=> dailyStreakShown()), 0);
  verifier("et AUCUN gel n'a été brûlé pour rien",
    await ev(()=> loadDaily().gels), 2);
  await ev(()=>{ __poser({ last: __cle(-2), streak: 30, jours:[__cle(-2)], geles:[], gels:0, palier:30 }); reglerFlamme(); });
  verifier("un jour manqué sans gel : la flamme s'éteint",
    await ev(()=> dailyStreakShown()), 0);
  verifier("sans réserve, rien ne s'invente",
    await ev(()=> loadDaily().geles.length), 0);

  // ---------- 5. RIEN NE REPART JAMAIS À ZÉRO ----------
  await ev(()=>{
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12}, totalCorrect:360, ach:{'premiers-pas':1} }));
    __poser({ last: __cle(-9), streak: 40, jours:[__cle(-9)], geles:[], gels:2, palier:40 });
    reglerFlamme();
  });
  verifier("neuf jours d'absence : la progression est intacte",
    await ev(()=> { const q = JSON.parse(localStorage.getItem('bt_progress')); return [q.totalCorrect, q.books['Genèse']]; }), [360, 12]);
  verifier("le meilleur reste écrit dans bt_daily (streak jamais effacé)",
    await ev(()=> loadDaily().streak), 40);
  await ev(()=>{ __jouer(); });
  verifier("il revient : une nouvelle série repart à un",
    await ev(()=> loadDaily().streak), 1);
  verifier("et ses deux gels l'attendent toujours",
    await ev(()=> loadDaily().gels), 2);

  // ---------- 6. CE QUE LE JOUEUR VOIT ----------
  await ev(()=>{ __poser({ last: __cle(0), streak: 5, jours:[__cle(0),__cle(-1),__cle(-3),__cle(-4)], geles:[__cle(-2)], gels:1, palier:0 }); });
  const sem = await ev(()=>{ const h = semaineHtml(); return [ (h.match(/sj fait/g)||[]).length, (h.match(/sj gele/g)||[]).length ]; });
  verifier("la bande des sept jours : 4 jours joués, 1 jour gelé", sem, [4, 1]);
  const feuille = await ev(()=>{
    ouvrirFlamme();
    const l = document.querySelectorAll('#flammeVeil .flam-row');
    const etats = Array.from(l).map(r=>r.querySelector('.fr-e').textContent);
    const res = { n:l.length, etats, gele:(document.querySelector('#flammeVeil .ft-g')||{}).textContent };
    closeFlamme();
    return res;
  });
  verifier("la feuille liste les cinq jours, dans l'ordre", feuille.etats, ["Joué","Joué","Gelé","Joué","Joué"]);
  verifier("elle dit la réserve", (feuille.gele||'').trim(), "1 gel en réserve");

  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' règle(s) en défaut');
  process.exit(ko === 0 ? 0 : 1);
})();
