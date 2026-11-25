/* ====== BANC « LE COMPTE NE GRANDIT PLUS EN ROUTE » (v382) ======
   « Le mode À revoir déconne des fois : il dit que la leçon est finie, mais
     il rajoute des questions. »
   Rejoué avant la v382 : une séance de sept, une faute à la première et une
   à la septième — « 1/7 » puis « 1/8 », « 7/8 » puis « 7/9 », et la barre
   reculait à chaque faute. Et une erreur corrigée en fin de leçon du
   Parcours restait « à rattraper » : la leçon finie, À revoir grossissait.
   Sur un iPhone, en jouant pour de vrai :
     1. À revoir, sept erreurs, fautes à la 1re et à la 7e : le compte des
        sept ne change jamais de total (1/7 … 7/7), celles qui reviennent se
        comptent à part (↺1/2, ↺2/2), et la barre ne recule jamais — pleine
        à la dernière ;
     2. une leçon du Parcours, une faute : « k/6 » sans changer de total,
        puis « ↺1/1 », barre jamais en arrière ;
     3. corrigée en fin de leçon, l'erreur n'est plus à rattraper (un palier
        de plus), et À revoir ne grossit pas ;
     4. ratée deux fois dans la leçon, elle reste à rattraper ;
     5. une partie de groupe compte comme avant (1/n … n/n) ;
     6. aucune erreur.
   Usage : node banc-essai/compte-fixe.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 360) + ')' : '')); if (!bon) ko++; };

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
/* Joue la partie en cours jusqu'aux résultats : fautes = numéros (1, 2…) des
   réponses données fausses. Relève, à chaque question, le compteur et la
   barre (avant et après la réponse). */
async function jouer(p, fautes) {
  const vus = [];
  for (let i = 1; i <= 30; i++) {
    if ((await p.evaluate(() => state.screen)) !== 'play') break;
    const lire = () => p.evaluate(() => ({ c: (document.querySelector('.play-meta .q-counter') || {}).textContent || '', b: +((document.querySelector('.progress-fill') || { dataset: {} }).dataset.p || 0), rel: !!currentQ().relance }));
    const avant = await lire();
    await p.evaluate((faux) => { const q = currentQ(); soloAnswer(q.shuffledOptions.findIndex(o => faux ? o !== q.correct : o === q.correct)); }, fautes.includes(i));
    await p.waitForTimeout(40);
    const apres = await lire();
    vus.push({ avant, apres });
    await p.evaluate(() => nextQuestion());
    await p.waitForTimeout(60);
  }
  return vus;
}
const totaux = (vus) => [...new Set(vus.filter(v => !v.avant.rel).map(v => v.avant.c.split('/')[1]))];
const barres = (vus) => vus.flatMap(v => [v.avant.b, v.apres.b]);
const monte = (l) => l.every((x, i) => !i || x >= l[i - 1] - 1e-9);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    /* ---- 1 ---- */
    { const { ctx, p } = await page(nav);
      await p.evaluate(() => { const t = Date.now(); const qs = BANK.facile.slice(0, 7);
        localStorage.setItem('bt_errbook', JSON.stringify(qs.map((q, i) => ({ k: qKey(q), n: 1, p: 0, du: dayKey(1), maj: t - i * 3600e3, rate: t - i * 3600e3, q: q.q, options: q.options, correct: q.correct, fact: q.fact, tier: 'facile' })))); });
      await p.evaluate(() => { state.screen = 'revoir'; render(); lancerRevision(); });
      await p.waitForTimeout(300);
      const vus = await jouer(p, [1, 7]);
      const rel = vus.filter(v => v.avant.rel).map(v => v.avant.c);
      const b = barres(vus);
      dit('1. À revoir : le total des sept ne change jamais, celles qui reviennent se comptent à part, la barre ne recule pas', vus.length === 9 && totaux(vus).join() === '7' && vus.filter(v => !v.avant.rel).every(v => v.avant.c === v.apres.c) && rel.join(' ') === '↺1/2 ↺2/2' && monte(b) && Math.abs(b[b.length - 1] - 1) < 1e-6,
        vus.map(v => v.avant.c + '→' + v.apres.c).join(' ') + ' · barre ' + b.map(x => x.toFixed(2)).join(' '));
      erreurs.push(...p.__erreurs); await ctx.close(); }
    /* ---- 2, 3, 4 ---- */
    { const { ctx, p } = await page(nav);
      await p.evaluate(() => commencerLecon(0, 0));
      await p.waitForTimeout(400);
      const info = await p.evaluate(() => ({ ecran: state.screen, n: state.questions.length, lecon: !!state.lecon }));
      const q2 = await p.evaluate(() => qKey(state.questions[1]));
      const vus = await jouer(p, [2]);
      const b = barres(vus);
      const rel = vus.filter(v => v.avant.rel).map(v => v.avant.c);
      dit('2. une leçon du Parcours : « k/' + info.n + ' » sans changer de total, puis « ↺1/1 », barre jamais en arrière', info.ecran === 'play' && info.lecon && totaux(vus).join() === String(info.n) && rel.join(' ') === '↺1/1' && monte(b) && Math.abs(b[b.length - 1] - 1) < 1e-6,
        JSON.stringify(info) + ' · ' + vus.map(v => v.avant.c + '→' + v.apres.c).join(' ') + ' · barre ' + b.map(x => x.toFixed(2)).join(' '));
      const e3 = await p.evaluate((k) => { const e = loadErrbook().find(x => x.k === k); return { palier: e ? e.p : null, aRattraper: aRattraper().some(x => x.k === k) }; }, q2);
      dit('3. corrigée en fin de leçon : elle n\'est plus à rattraper (un palier de plus)', e3.palier === 1 && !e3.aRattraper, JSON.stringify(e3));
      await p.evaluate(() => { try { continuerParcours(); } catch (e) { state = etatNeuf(); state.screen = 'mode'; render(); } });
      await p.waitForTimeout(500);
      await p.evaluate(() => commencerLecon(0, 0));
      await p.waitForTimeout(400);
      const qa = await p.evaluate(() => qKey(state.questions[0]));
      const n0 = await p.evaluate(() => state.questions.length);
      await jouer(p, [1, n0 + 1]);   // la 1re fausse, et sa relance (la dernière) fausse aussi
      const e4 = await p.evaluate((k) => { const e = loadErrbook().find(x => x.k === k); return { palier: e ? e.p : null, aRattraper: aRattraper().some(x => x.k === k) }; }, qa);
      dit('4. ratée deux fois dans la leçon : elle reste à rattraper', e4.palier === 0 && e4.aRattraper, JSON.stringify(e4));
      erreurs.push(...p.__erreurs); await ctx.close(); }
    /* ---- 5 ---- */
    { const { ctx, p } = await page(nav);
      await p.evaluate(() => { state.mode = 'group'; state.teams = [{ name: 'A' }, { name: 'B' }]; state.scores = [0, 0]; state.lengthKey = state.lengthKey || 'court'; startGame(); });
      await p.waitForTimeout(500);
      const l = [];
      for (let i = 0; i < 4; i++) { l.push(await p.evaluate(() => (document.querySelector('.play-meta .q-counter') || {}).textContent || '')); await p.evaluate(() => { state.revealed = true; nextQuestion(); }); await p.waitForTimeout(60); }
      const n = await p.evaluate(() => state.questions.length);
      dit('5. une partie de groupe compte comme avant', l.join(' ') === [1, 2, 3, 4].map(k => k + '/' + n).join(' '), l.join(' ') + ' (sur ' + n + ')');
      erreurs.push(...p.__erreurs); await ctx.close(); }
  } catch (e) {
    dit('le banc a planté', false, e.stack || e.message);
  }
  dit('6. aucune erreur', erreurs.length === 0, erreurs.join(' | '));
  await nav.close();
  console.log(ko ? `\n${ko} échec(s)` : '\nTout est vert.');
  process.exit(ko ? 1 : 0);
})();
