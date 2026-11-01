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
    /* Jouer une partie = ce que fait marquerJourJoue, avec un score.
       (Anciennement recordDailyResult : depuis la v250, la journée est marquée
       par N'IMPORTE QUELLE partie, plus seulement par le Défi du jour.) */
    window.__jouer = ()=>{ state.soloCorrect = 7; state.questions = new Array(9); marquerJourJoue(); };
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
    /* La grille : une case par jour, du plus ancien au plus récent. Les cases
       « horschamp » ne sont que le calage des colonnes sur les jours de la
       semaine — elles ne comptent pas. */
    /* (v343) LES MOIS SONT AFFICHÉS DU PLUS RÉCENT AU PLUS ANCIEN. Cinq jours
       qui enjambent la fin d'un mois (le 1er novembre, par exemple) tombent
       dans DEUX cartes : on les relit de la plus ancienne à la plus récente.
       Et le calage des colonnes se vérifie carte par carte : les cases vides
       du début valent le jour de la semaine du 1er (le lundi en tête, en
       français) — la règle d'avant, « un multiple de sept », ne tenait que
       les mois où le compte tombait juste (octobre 2026 : 4 + 31 = 35). */
    const cartes = Array.from(document.querySelectorAll('#flammeVeil .flam-mois')).reverse();
    const l = [].concat(...cartes.map(m => Array.from(m.querySelectorAll('.fg-cases .fj'))))
      .filter(c => !c.classList.contains('horschamp'));
    const etats = l.map(c => c.classList.contains('fait') ? 'fait'
                          : c.classList.contains('gele') ? 'gele' : 'vide');
    const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const cales = cartes.map(m => {
      const nom = (m.querySelector('.fg-cases').getAttribute('aria-label') || '').split(' ');
      const premier = new Date(+nom[1], MOIS.indexOf(nom[0]), 1);
      const vides = Array.from(m.querySelectorAll('.fg-cases .fj')).findIndex(c => !(c.classList.contains('horschamp') && !c.querySelector('i')));
      return vides === (premier.getDay() + 6) % 7;
    });
    const res = { etats, auj: l.filter(c=>c.classList.contains('auj')).length,
      colonnes: getComputedStyle(document.querySelector('#flammeVeil .fg-cases')).gridTemplateColumns.split(' ').length,
      cales: cales.every(Boolean) && cales.length > 0,
      lundi: Array.from(document.querySelectorAll('#flammeVeil .flam-mois:first-child .fg-sem span, #flammeVeil .fg-sem span')).slice(0, 7).map(x => x.textContent).join(''),
      gele:(document.querySelector('#flammeVeil .ft-g')||{}).textContent,
      regle:(document.querySelector('#flammeVeil .flam-regle')||{}).textContent,
      dates: l.map(c=>c.getAttribute('aria-label')).filter(Boolean).length };
    closeFlamme();
    return res;
  });
  verifier("la grille : cinq jours, du plus ancien au plus récent", feuille.etats, ["fait","fait","gele","fait","fait"]);
  verifier("sept colonnes, une par jour de la semaine", feuille.colonnes, 7);
  verifier("les colonnes sont calées (le 1er sous son jour de la semaine)", feuille.cales, true);
  verifier("la semaine commence le lundi", feuille.lundi, "LMMJVSD");
  verifier("une seule case marquée aujourd'hui", feuille.auj, 1);
  verifier("chaque case garde sa date au toucher", feuille.dates, 5);
  verifier("elle dit la réserve", (feuille.gele||'').trim(), "1 gel en réserve");
  verifier("et la règle du gel est écrite", /un seul jour manqué/.test(feuille.regle||''), true);

  // ---------- 7. L'AUTRE VOIE : BEAUCOUP DE PARTIES ----------
  await ev(()=>{ __poser({ last:'', streak:0, jours:[], geles:[], gels:0, palier:0, parties:0, palierParties:0 });
                 for(let i=0;i<29;i++) compterPartie(); });
  verifier("vingt-neuf parties : rien encore",
    await ev(()=> [loadDaily().parties, loadDaily().gels]), [29, 0]);
  await ev(()=>{ compterPartie(); });
  verifier("la trentième : un gel offert",
    await ev(()=> [loadDaily().parties, loadDaily().gels]), [30, 1]);
  await ev(()=>{ for(let i=0;i<29;i++) compterPartie(); });
  verifier("vingt-neuf de plus : toujours un seul",
    await ev(()=> loadDaily().gels), 1);
  await ev(()=>{ compterPartie(); });
  verifier("la soixantième : le deuxième",
    await ev(()=> [loadDaily().parties, loadDaily().gels]), [60, 2]);
  await ev(()=>{ for(let i=0;i<30;i++) compterPartie(); });
  verifier("la quatre-vingt-dixième : la réserve reste à deux",
    await ev(()=> [loadDaily().parties, loadDaily().gels]), [90, 2]);
  verifier("et le palier a bien été consommé, pas mis de côté",
    await ev(()=> loadDaily().palierParties), 90);
  /* LE PLAFOND EST LE VRAI GARDE-FOU : quelle que soit la voie, on ne tient
     jamais plus de deux gels, et deux jours de suite tuent la flamme. */
  await ev(()=>{ const c=(d)=>__cle(d);
    __poser({ last:c(-3), streak:200, jours:[c(-3)], geles:[], gels:2, palier:200, parties:9000, palierParties:9000 });
    reglerFlamme(); });
  verifier("neuf mille parties ne rachètent pas deux jours d'absence",
    await ev(()=> dailyStreakShown()), 0);

  // ---------- 8. CE QUE YADA DIT AU JOUEUR ----------
  const bandeau = async (script)=>{
    await ev((s)=>{ achToastQueue.length = 0; new Function(s)(); }, script);
    return ev(()=>{ const a = achToastQueue[0]; return a ? { tete:a.tete, t:a.t } : null; });
  };
  const gagne = await bandeau("__poser({ last: __cle(-1), streak: 9, jours:[], geles:[], gels:0, palier:0 }); __jouer();");
  verifier("le gel gagné se dit, et Yada le donne", /Yada/.test((gagne&&gagne.tete)||''), true);
  verifier("et le bandeau dit sa limite", /UN jour manqué/.test((gagne&&gagne.t)||''), true);
  const parties = await bandeau("__poser({ last:'', streak:0, jours:[], geles:[], gels:0, palier:0, parties:29, palierParties:0 }); compterPartie();");
  verifier("le gel des parties se dit aussi", /Yada/.test((parties&&parties.tete)||''), true);
  verifier("et il dit POURQUOI", /30 parties/.test((parties&&parties.t)||''), true);
  const paye = await bandeau("__poser({ last: __cle(-2), streak: 12, jours:[__cle(-2)], geles:[], gels:1, palier:10 }); reglerFlamme(); annoncerGel();");
  verifier("le gel dépensé se dit, et Yada le fait", /Yada a gelé/.test((paye&&paye.tete)||''), true);
  verifier("et le bandeau dit ce qu'il reste", /plus aucun gel/.test((paye&&paye.t)||''), true);

  // ---------- 9. LE BANDEAU ARRIVE APRÈS LA PARTIE ----------
  /* « Cela doit apparaître qu'on a eu un gel de série APRÈS la partie. » Il
     partait à l'instant de la dernière question — donc pendant la transition
     d'écran, où personne ne le voit. */
  const quand = await p.evaluate(()=> new Promise(res=>{
    const c=(d)=>{ const t=new Date(Date.now()+d*86400000), z=n=>String(n).padStart(2,'0'); return t.getFullYear()+'-'+z(t.getMonth()+1)+'-'+z(t.getDate()); };
    localStorage.setItem('bt_daily', JSON.stringify({ last:c(-1), streak:3, jours:[c(-1)], geles:[], gels:0, palier:0, parties:29, palierParties:0 }));
    /* On repart d'une file propre : les essais précédents ont pu laisser un
       bandeau en cours (achToastBusy) qui bloquerait le suivant. */
    achToastQueue.length = 0; achToastBusy = false; achToastPause = false;
    document.querySelectorAll('.ach-toast').forEach(e=>e.remove());
    state.mode='solo'; startGame();
    state.currentIndex = state.questions.length - 1; state.revealed = true; state.soloSelected = 0;
    /* (v343) La première partie du jour allume la flamme, et la flamme se
       FÊTE après les résultats (feterFlamme) : le bandeau attend qu'on l'ait
       refermée. On la referme comme le joueur, 300 ms après son ouverture. */
    let tFin = null, tFete = null, tBandeau = null; const t0 = performance.now();
    const tic=()=>{
      if(tFin === null && state.screen === 'end') tFin = performance.now()-t0;
      if(tFete === null && document.querySelector('#modalVeil .fete-flamme')){
        tFete = performance.now()-t0;
        setTimeout(()=>{ const b = document.querySelector('#modalVeil .fete-flamme #modalOk'); if(b) b.click(); }, 300);
      }
      if(tBandeau === null && document.querySelector('.ach-toast')) tBandeau = performance.now()-t0;
      if(performance.now()-t0 < 4500) requestAnimationFrame(tic); else res({ tFin, tFete, tBandeau });
    };
    requestAnimationFrame(tic);
    setTimeout(()=>{ nextQuestion(); }, 80);
  }));
  verifier("la flamme du jour se fête après les résultats",
    !!(quand.tFete !== null && quand.tFin !== null && quand.tFete > quand.tFin + 400), true);
  verifier("le bandeau du gel attend les résultats, puis la fête",
    !!(quand.tBandeau !== null && quand.tFin !== null && quand.tBandeau > quand.tFin + 400 && quand.tBandeau > quand.tFete + 300), true);

  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' règle(s) en défaut');
  process.exit(ko === 0 ? 0 : 1);
})();
