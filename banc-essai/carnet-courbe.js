/* ====== BANC « LE CARNET NE DÉBORDE PAS, SUR LA DURÉE » ======
   « Oui d'accord, mais il ne faut pas accumuler les questions à l'infini
     comme ça. » (Taylor, carnet de 391 entrées dont 296 sur la première
     marche.)

   MA PREMIÈRE SIMULATION ÉTAIT FAUSSE, ET JE LE LUI AI DIT. Elle enchaînait
   trois cents parties SANS FAIRE AVANCER LE TEMPS : une question bien
   répondue est replanifiée à trois, sept ou seize jours — dans une journée
   unique elle n'était donc plus JAMAIS due, la sortie du carnet était bouchée
   par construction, et le plafond de six cents tombait quelle que soit la
   part réservée à la révision. Une simulation qui ne peut pas montrer l'effet
   qu'on cherche ne mesure rien.

   LE TEMPS AVANCE ICI. Entre deux journées, chaque échéance du carnet recule
   d'un jour : pour le jeu, c'est exactement demain. Tout le reste est le VRAI
   code — buildQuestions pour le tirage, errbookAdd/errbookRemove pour
   l'échelle, fileDeRevision pour la séance. On ne réimplémente rien, sinon on
   mesurerait sa propre copie.

   LE JOUEUR EST MODÉLISÉ, ET C'EST ASSUMÉ. Il répond juste avec une
   probabilité qui part de « base » et monte de dix points à chaque bonne
   réponse donnée À CETTE QUESTION-LÀ (plafond 95 %), et redescend d'un cran
   quand il se trompe. C'est grossier, mais ça a la seule propriété qui
   compte : une question qu'on retravaille finit par être sue, et une question
   jamais revue ne l'est jamais.

   CE QUE CE BANC EXIGE, au réglage livré (PART_REVOIR) et sur quatre mois :
     1. le carnet ne touche JAMAIS le plafond de six cents — le plafond jette
        du travail, il ne doit pas être dans le chemin ;
     2. il se STABILISE : sa taille au 120e jour ne dépasse pas celle du 60e ;
     3. des questions sont ACQUISES — l'échelle va jusqu'au bout ;
     4. tout ne s'entasse pas sur la première marche.
   Et il l'exige DU JOUEUR QUI NE RÉVISE JAMAIS, celui qui ne touche pas à
   « À revoir » : c'est le cas de Taylor sur sa capture, et le pire des cas.

   Usage : node banc-essai/carnet-courbe.js [url] [jours] [parties/jour]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const JOURS = +(process.argv[3] || 120);
const PARTIES = +(process.argv[4] || 2);
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/* Les parts mises en regard. 0 est le TÉMOIN : c'est le jeu d'avant, celui qui
   n'injectait rien dans les parties ordinaires. Sans lui, on ne saurait pas si
   la part y est pour quelque chose. */
const PARTS = [0, 0.2, 0.35];
const PROFILS = [
  { nom: 'ne révise jamais', revision: 0 },
  { nom: 'révise 1 jour sur 2', revision: 2 },
];

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
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });

  const simule = (o) => p.evaluate(async (o) => {
    /* Un hasard REPRODUCTIBLE : deux réglages comparés doivent l'être sur la
       même suite de tirages, sinon on compare deux chances. */
    let g = o.graine >>> 0;
    const alea = () => { g = (g + 0x6D2B79F5) >>> 0; let t = g;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    localStorage.setItem('bt_errbook', '[]');
    localStorage.setItem('bt_acquises', '{}');
    localStorage.setItem('bt_seen', '[]');
    localStorage.setItem('bt_lastmiss', '[]');
    PART_REVOIR = o.part;

    const force = {};                       // clé -> bonnes réponses d'affilée
    const repond = (q) => {
      const k = qKey(q);
      const m = force[k] || 0;
      const chance = Math.min(0.95, o.base + 0.10 * m);
      if (alea() < chance) { force[k] = m + 1; errbookRemove(q); return true; }
      force[k] = Math.max(0, m - 1); errbookAdd(q); return false;
    };
    /* LE JOUR D'APRÈS. Reculer toutes les échéances d'un jour, c'est
       exactement avancer l'horloge d'un jour pour le carnet — et le carnet est
       la seule chose que ce banc mesure. */
    const demain = () => {
      const a = loadErrbook();
      for (const e of a) {
        if (!e.du) continue;
        const t = dateDeCle(e.du); if (!t) continue;
        t.setDate(t.getDate() - 1); e.du = cleDeDate(t);
      }
      saveErrbook(a);
    };

    const courbe = [];
    let plafondTouche = 0;
    for (let j = 1; j <= o.jours; j++) {
      for (let g2 = 0; g2 < o.parties; g2++) {
        state.mode = 'solo'; state.revision = false;
        state.lengthKey = 'normale'; state.themeKey = 'tout';
        buildQuestions();
        const rates = [];
        for (const q of state.questions) { if (!repond(q)) rates.push(qKey(q)); }
        localStorage.setItem('bt_lastmiss', JSON.stringify(rates));
      }
      if (o.revision && j % o.revision === 0) {
        const file = fileDeRevision('auj');
        for (const x of file) repond({ q: x.q, options: x.options, correct: x.correct, tier: x.tier });
      }
      if (loadErrbook().length >= CARNET_MAX) plafondTouche++;
      if (j % 10 === 0 || j === o.jours) courbe.push([j, loadErrbook().length]);
      demain();
    }
    const a = loadErrbook();
    const marches = [0, 0, 0, 0];
    for (const e of a) marches[Math.max(0, Math.min(3, e.p | 0))]++;
    return { courbe, taille: a.length, plafondTouche,
             acquises: Object.keys(loadAcquises()).length, marches,
             sur1re: a.length ? Math.round(marches[0] / a.length * 100) : 0 };
  }, o);

  /* La valeur LIVRÉE, lue avant que la première simulation ne la remplace :
     c'est elle que la preuve doit porter, pas celle de la dernière boucle. */
  const livree = await p.evaluate(() => PART_REVOIR);

  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(54) + (det || '')); };
  const resultats = {};

  for (const prof of PROFILS) {
    console.log('\n  Joueur qui ' + prof.nom + ' — ' + PARTIES + ' partie(s) de 15 questions par jour, '
      + JOURS + ' jours, réussite de départ 70 %');
    console.log('    part   ' + [10, 30, 60, 90, 120].filter(j => j <= JOURS).map(j => ('j' + j).padStart(6)).join('')
      + '   acquises   1re marche   plafond');
    for (const part of PARTS) {
      const r = await simule({ part, jours: JOURS, parties: PARTIES, base: 0.70,
        revision: prof.revision, graine: 20260929 });
      resultats[prof.nom + '|' + part] = r;
      const pts = {}; r.courbe.forEach(([j, n]) => { pts[j] = n; });
      console.log('    ' + String(Math.round(part * 100) + '%').padStart(4)
        + '   ' + [10, 30, 60, 90, 120].filter(j => j <= JOURS).map(j => String(pts[j] === undefined ? '' : pts[j]).padStart(6)).join('')
        + '   ' + String(r.acquises).padStart(8)
        + '   ' + String(r.sur1re + ' %').padStart(10)
        + '   ' + String(r.plafondTouche ? r.plafondTouche + ' jours' : 'jamais').padStart(7));
    }
  }

  /* LA PREUVE PORTE SUR LE RÉGLAGE LIVRÉ, ET SUR LE PIRE DES CAS. */
  console.log('\n  Réglage livré : ' + Math.round(livree * 100) + ' %');
  const dur = resultats['ne révise jamais|' + livree];
  if (!dur) { console.log('  (le réglage livré n\'est pas dans les parts mesurées : ' + PARTS.join(', ') + ')'); ko++; }
  else {
    const pts = {}; dur.courbe.forEach(([j, n]) => { pts[j] = n; });
    v('le carnet ne touche jamais le plafond de 600', dur.plafondTouche === 0,
      dur.plafondTouche ? dur.plafondTouche + ' jours au plafond' : 'jamais, max ' + Math.max(...dur.courbe.map(c => c[1])));
    if (JOURS >= 120) v('  et il se stabilise (120e jour <= 60e)', pts[120] <= pts[60],
      pts[60] + ' au 60e, ' + pts[120] + ' au 120e');
    v('  des questions sont acquises', dur.acquises > 0, dur.acquises + ' acquise(s)');
    v('  tout ne s\'entasse pas sur la première marche', dur.sur1re < 80,
      dur.sur1re + ' % sur la 1re marche, marches ' + dur.marches.join('/'));
  }

  if (errs.length) { ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | ')); }
  await nav.close();
  console.log(ko === 0
    ? '\n  OK — le seau fuit plus vite qu\'il ne se remplit, même sans jamais réviser'
    : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
