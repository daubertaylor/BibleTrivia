/* ====== BANC « LA SÉRIE SE FINIT AVEC ELLE » (v378) ======
   « Lorsque mes quinze questions vont être terminées, ça s'arrête à
     quatorze. Et ensuite ça vient me dire que j'ai oublié une question,
     comme si je ne l'avais pas faite. »
   Rejoué avant la v378 : quinze erreurs récentes, trois séances de cinq, une
   seule réponse fausse dans la troisième — « 14 rattrapées sur 15 », puis
   une quatrième séance d'une seule question.
   Sur un iPhone, en jouant pour de vrai chaque séance jusqu'à ses résultats :
     1. quinze erreurs, tout juste : trois séances de cinq, « Tout est
        rattrapé ! » à la troisième, 15 rattrapées sur 15 ;
     2. une réponse fausse dans la troisième séance : la question revient une
        fois en fin de séance (6/6, « Encore une fois »), juste cette fois,
        elle compte — « Tout est rattrapé ! », 15 sur 15, pas de quatrième
        séance ;
     3. fausse deux fois : elle reste à rattraper (14 sur 15), et ne revient
        pas une troisième fois dans la même séance ;
     4. douze erreurs : une séance de cinq, puis les sept qui restent
        ensemble — plus de séance d'une ou deux questions à la traîne ; la
        pastille de l'accueil annonce la même taille que la séance ;
     5. une leçon du Parcours garde sa règle : la question rejouée en fin de
        leçon ne fait pas monter le carnet ;
     6. aucune erreur.
   Usage : node banc-essai/revoir-serie.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

async function page(nav) {
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
  });
  const p = await ctx.newPage();
  p.__erreurs = [];
  p.on('pageerror', e => p.__erreurs.push(e.message));
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  return { ctx, p };
}
/* n erreurs récentes, la plus fraîche d'abord, à une heure d'écart. */
const poser = (p, n) => p.evaluate((n) => {
  const t = Date.now(); const qs = [].concat(BANK.facile, BANK.moyen, BANK.difficile).slice(0, n);
  localStorage.setItem('bt_errbook', JSON.stringify(qs.map((q, i) => ({ k: qKey(q), n: 1, p: 0, du: dayKey(1), maj: t - i * 3600e3, rate: t - i * 3600e3,
    q: q.q, options: q.options, correct: q.correct, fact: q.fact, tier: q.tier || 'moyen' }))));
}, n);
const ecran = (p) => p.evaluate(() => { state.screen = 'revoir'; render();
  return { reste: aRattraper().length, faites: rattrapees().length, seance: fileDeRevision().length }; });
/* Une séance jouée jusqu'à ses résultats. fautes : numéros (1, 2…) des
   réponses à donner fausses dans CETTE séance. */
async function seance(p, fautes) {
  await p.evaluate(() => lancerRevision());
  await p.waitForTimeout(300);
  const debut = await p.evaluate(() => state.questions.length);
  const vus = [];
  for (let i = 1; i <= 20; i++) {
    if ((await p.evaluate(() => state.screen)) !== 'play') break;
    vus.push(await p.evaluate(() => { const q = currentQ(); const c = document.querySelector('.play-meta .tier-chip'); return { relance: !!q.relance, puce: c ? c.textContent.trim() : '', compte: (document.querySelector('.play-meta .q-counter') || {}).textContent }; }));
    await p.evaluate((faux) => { const q = currentQ(); soloAnswer(q.shuffledOptions.findIndex(o => faux ? o !== q.correct : o === q.correct)); }, fautes.includes(i));
    await p.waitForTimeout(60);
    await p.evaluate(() => nextQuestion());
    await p.waitForTimeout(60);
  }
  await p.waitForTimeout(250);
  const fin = await p.evaluate(() => ({ titre: (document.querySelector('.screen:not(.screen-exit) .end-title') || {}).textContent, reste: (document.querySelector('.screen:not(.screen-exit) .end-best') || {}).textContent }));
  return { debut, joue: vus.length, vus, fin };
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    /* ---- 1 ---- */
    { const { ctx, p } = await page(nav); await poser(p, 15);
      const s = []; for (let k = 0; k < 4; k++) { const e = await ecran(p); if (!e.reste) break; s.push(await seance(p, [])); }
      const e = await ecran(p);
      dit('1. quinze erreurs, tout juste : trois séances de cinq, puis tout est rattrapé', s.length === 3 && s.every(x => x.debut === 5 && x.joue === 5) && e.faites === 15 && e.reste === 0 && /Tout est rattrapé/.test(s[2].fin.titre || ''),
        s.map(x => x.joue + ' « ' + x.fin.titre + ' »').join(' / ') + ` ; ${e.faites} rattrapées, ${e.reste} à rattraper`);
      erreurs.push(...p.__erreurs); await ctx.close(); }
    /* ---- 2 ---- */
    { const { ctx, p } = await page(nav); await poser(p, 15);
      const s = [await seance(p, []), await seance(p, []), await seance(p, [3])];
      const e = await ecran(p); const der = s[2].vus[s[2].vus.length - 1] || {};
      dit('2. une réponse fausse : elle revient en fin de séance, rattrapée, et la série finit à quinze', s[2].joue === 6 && der.relance && der.puce === 'Encore une fois' && der.compte === '6/6' && /Tout est rattrapé/.test(s[2].fin.titre || '') && e.faites === 15 && e.reste === 0,
        `séance 3 : ${s[2].joue} questions, dernière ${JSON.stringify(der)}, « ${s[2].fin.titre} » ; ${e.faites} rattrapées, ${e.reste} à rattraper`);
      erreurs.push(...p.__erreurs); await ctx.close(); }
    /* ---- 3 ---- */
    { const { ctx, p } = await page(nav); await poser(p, 5);
      const s = await seance(p, [2, 6]);
      const e = await ecran(p);
      dit('3. fausse deux fois : elle reste à rattraper, et ne revient pas une troisième fois', s.joue === 6 && e.faites === 4 && e.reste === 1 && /4 rattrapées sur 5/.test(s.fin.titre || '') && /1 encore à rattraper/.test(s.fin.reste || ''),
        `${s.joue} questions, « ${s.fin.titre} », « ${s.fin.reste} » ; ${e.faites} rattrapées, ${e.reste} à rattraper`);
      erreurs.push(...p.__erreurs); await ctx.close(); }
    /* ---- 4 ---- */
    { const { ctx, p } = await page(nav); await poser(p, 12);
      const e0 = await ecran(p);
      const badge = await p.evaluate(() => { state.screen = 'mode'; render(); const b = document.querySelector('.revoir-card .rv-n'); return b ? b.textContent : null; });
      const s1 = await seance(p, []); const e1 = await ecran(p); const s2 = await seance(p, []); const e2 = await ecran(p);
      dit('4. douze erreurs : cinq, puis les sept qui restent ensemble ; la pastille dit la taille de la séance', e0.seance === 5 && badge === '5' && s1.joue === 5 && e1.seance === 7 && s2.joue === 7 && e2.reste === 0,
        `séance 1 : ${s1.joue} (pastille ${badge}), séance 2 : ${s2.joue} (annoncée ${e1.seance}) ; reste ${e2.reste}`);
      erreurs.push(...p.__erreurs); await ctx.close(); }
    /* ---- 5 ---- une leçon du Parcours */
    { const { ctx, p } = await page(nav);
      const r = await p.evaluate(async () => {
        const q = Object.assign({}, BANK.facile[0], { tier: 'facile' });
        state.mode = 'solo'; state.revision = false; state.lecon = { u: 0, l: 0, n: 1, ok: 0 };
        state.questions = [Object.assign({}, q, { shuffledOptions: q.options.slice() })]; state.currentIndex = 0; state.revealed = false; state.soloMissed = [];
        state.soloScore = 0; state.soloStreak = 0; state.soloBestStreak = 0; state.soloCorrect = 0; state.screen = 'play'; render();
        soloAnswer(state.questions[0].shuffledOptions.findIndex(o => o !== q.correct));
        const apresFaute = state.questions.length;
        nextQuestion();
        soloAnswer(currentQ().shuffledOptions.findIndex(o => o === q.correct));
        const e = loadErrbook().find(x => x.k === qKey(q));
        state.lecon = null; state.screen = 'mode'; render();
        return { apresFaute, palier: e ? e.p : null };
      });
      dit('5. une leçon du Parcours : la question rejouée ne fait pas monter le carnet', r.apresFaute === 2 && r.palier === 0, JSON.stringify(r));
      erreurs.push(...p.__erreurs); await ctx.close(); }
  } catch (e) {
    dit('le banc a planté', false, e.stack || e.message);
  }
  dit('6. aucune erreur', erreurs.length === 0, erreurs.join(' | '));
  await nav.close();
  console.log(ko ? `\n${ko} échec(s)` : '\nTout est vert.');
  process.exit(ko ? 1 : 0);
})();
