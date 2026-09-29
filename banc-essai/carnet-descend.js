/* ====== BANC « LE CARNET NE S'ACCUMULE PAS À L'INFINI » ======
   « Oui d'accord, mais il ne faut pas accumuler les questions à l'infini
     comme ça. » (Taylor, carnet de 391 entrées dont 296 sur la première
     marche.)

   LA FUITE ÉTAIT STRUCTURELLE. Une erreur monte d'une marche quand on redonne
   la bonne réponse À CETTE QUESTION-LÀ. Or une partie ordinaire tire en
   priorité les questions JAMAIS VUES — voulu, pour ne pas radoter. Une
   question du carnet a forcément déjà été vue : elle passait donc en dernier,
   et sur 1 545 questions on ne la recroisait pratiquement jamais. L'échelle ne
   montait QUE dans « À revoir », pendant que chaque partie ajoutait des
   erreurs. Un seau qu'on remplit plus vite qu'il ne fuit finit par déborder —
   et le plafond de six cents le vidait en jetant du travail.

   CE QUE CE BANC EXIGE :
     1. une partie SOLO contient une part de questions dues au carnet ;
     2. elle garde EXACTEMENT sa longueur (une partie de quinze en fait
        quinze, pas dix-huit) ;
     3. bien répondre à l'une d'elles la fait monter d'une marche, sans qu'on
        soit passé par « À revoir » ;
     4. en GROUPE, rien n'est injecté — les questions sont pour des équipes,
        pas pour le propriétaire du téléphone ;
     5. EN LIGNE, le paquet reste celui de la graine partagée, au bit près :
        deux joueurs doivent voir les mêmes questions, et un carnet personnel
        n'a rien à y faire.
   Usage : node banc-essai/carnet-descend.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });

  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(56) + (det || '')); };

  /* Un carnet de soixante erreurs, toutes dues, prises dans la vraie banque —
     il faut que buildQuestions puisse les y retrouver. */
  const pose = () => p.evaluate(() => {
    const t = [];
    ['facile', 'moyen', 'difficile'].forEach(k => (BANK[k] || []).forEach(q => t.push(Object.assign({}, q, { tier: k }))));
    const pris = t.slice(0, 60);
    localStorage.setItem('bt_errbook', JSON.stringify(pris.map((q, i) => ({
      k: qKey(q), n: (i % 4) + 1, p: 0, du: dayKey(-1),
      q: q.q, options: q.options, correct: q.correct, fact: q.fact, tier: q.tier,
    }))));
    /* Toutes déjà vues : sans ça, le tirage « jamais vues » les éviterait pour
       une raison qui n'a rien à voir avec ce qu'on mesure. */
    localStorage.setItem('bt_seen', JSON.stringify(pris.map(q => qKey(q))));
    return pris.map(q => qKey(q));
  });
  const cles = await pose();

  /* ---- 1 et 2 : une partie solo contient du carnet, et garde sa longueur ---- */
  const solo = await p.evaluate((cles) => {
    const set = new Set(cles);
    state.mode = 'solo'; state.lengthKey = Object.keys(LENGTHS)[1]; state.themeKey = 'tout';
    startGame();
    const total = state.questions.length;
    const duCarnet = state.questions.filter(q => set.has(qKey(q))).length;
    return { total, duCarnet, attendu: LENGTHS[state.lengthKey] * 3,
             part: (typeof PART_REVOIR !== 'undefined') ? PART_REVOIR : -1 };
  }, cles);
  v('une partie solo pioche dans le carnet', solo.duCarnet > 0,
    solo.duCarnet + ' question(s) du carnet sur ' + solo.total);
  v('  et c\'est bien la part prévue', solo.duCarnet === Math.round(solo.attendu * solo.part),
    solo.duCarnet + ' pour ' + Math.round(solo.attendu * solo.part) + ' attendue(s)');
  v('  la partie garde EXACTEMENT sa longueur', solo.total === solo.attendu,
    solo.total + ' questions pour ' + solo.attendu + ' demandées');
  v('  et aucune question en double', await p.evaluate(() => {
    const vu = new Set(); return state.questions.every(q => { const k = qKey(q); if (vu.has(k)) return false; vu.add(k); return true; });
  }), '');

  /* ---- 3 : bien répondre en partie ORDINAIRE fait monter la marche ---- */
  const monte = await p.evaluate((cles) => {
    const set = new Set(cles);
    const i = state.questions.findIndex(q => set.has(qKey(q)));
    if (i < 0) return null;
    const q = state.questions[i];
    const k = qKey(q);
    const avant = (loadErrbook().find(x => x.k === k) || {}).p;
    state.currentIndex = i; state.revealed = false; state.soloSelected = null;
    soloAnswer(q.shuffledOptions.indexOf(q.correct));
    const e = loadErrbook().find(x => x.k === k) || {};
    return { avant, apres: e.p, du: e.du === dayKey(3), revision: !!state.revision };
  }, cles);
  v('bien répondre en partie ORDINAIRE fait monter la marche',
    monte && monte.avant === 0 && monte.apres === 1 && monte.du,
    monte ? ('palier ' + monte.avant + ' -> ' + monte.apres + ', revue dans 3 jours : ' + monte.du) : 'aucune question du carnet dans le paquet');
  v('  et ce n\'était pas une révision', monte && monte.revision === false, monte ? String(monte.revision) : '');

  /* ---- 4 : le mode GROUPE n'injecte rien ---- */
  await pose();
  const groupe = await p.evaluate((cles) => {
    const set = new Set(cles);
    state.mode = 'group'; state.teams = [{ name: 'A' }, { name: 'B' }];
    state.lengthKey = Object.keys(LENGTHS)[1]; state.themeKey = 'tout';
    startGame();
    return { total: state.questions.length, duCarnet: state.questions.filter(q => set.has(qKey(q))).length,
             attendu: LENGTHS[state.lengthKey] * 3 };
  }, cles);
  v('en groupe, rien du carnet personnel n\'est injecté', groupe.duCarnet === 0,
    groupe.duCarnet + ' question(s) du carnet');
  v('  et la longueur ne bouge pas non plus', groupe.total === groupe.attendu,
    groupe.total + ' pour ' + groupe.attendu);

  /* ---- 5 : en ligne, le paquet de la graine partagée est intact ---- */
  await pose();
  /* LA BONNE PROPRIÉTÉ N'EST PAS « AUCUNE QUESTION DU CARNET ». Ma première
     version l'exigeait, et le banc est tombé rouge sur une COÏNCIDENCE : le
     paquet partagé tire dans toute la banque, et l'une des soixante questions
     du carnet témoin s'y trouvait. Le banc avait tort, pas le jeu.
     Ce qu'il faut exiger, c'est que le paquet NE DÉPENDE PAS du carnet local :
     même graine, carnet plein ou carnet vide, exactement le même paquet. Sans
     ça, deux joueurs d'un même duel ne verraient pas les mêmes questions. */
  const enLigne = await p.evaluate(() => {
    const cle = Object.keys(LENGTHS)[1];
    const plein = seededDeck(987654, cle, 'tout').map(q => qKey(q));
    const garde = localStorage.getItem('bt_errbook');
    localStorage.setItem('bt_errbook', '[]');
    const vide = seededDeck(987654, cle, 'tout').map(q => qKey(q));
    localStorage.setItem('bt_errbook', garde);
    const deux = seededDeck(987654, cle, 'tout').map(q => qKey(q));
    return { memes: JSON.stringify(plein) === JSON.stringify(deux),
             insensible: JSON.stringify(plein) === JSON.stringify(vide), n: plein.length };
  });
  v('en ligne, deux joueurs tirent le MÊME paquet', enLigne.memes, enLigne.n + ' questions');
  v('  et il ne dépend pas du carnet local', enLigne.insensible,
    enLigne.insensible ? 'carnet plein ou vide : même paquet' : 'LE PAQUET CHANGE AVEC LE CARNET');

  /* ---- 6 : carnet vide, rien ne change ---- */
  const vide = await p.evaluate(() => {
    localStorage.setItem('bt_errbook', '[]');
    state.mode = 'solo'; state.lengthKey = Object.keys(LENGTHS)[1];
    startGame();
    return { total: state.questions.length, attendu: LENGTHS[state.lengthKey] * 3 };
  });
  v('carnet vide : la partie est celle d\'avant', vide.total === vide.attendu,
    vide.total + ' pour ' + vide.attendu);

  if (errs.length) { ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | ')); }
  await nav.close();
  console.log(ko === 0
    ? '\n  OK — le carnet descend en jouant, sans allonger la partie ni toucher au duel'
    : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
