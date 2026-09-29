/* ====== BANC « UN LIVRE MAÎTRISÉ LE RESTE, MÊME QUAND LA BANQUE GRANDIT » ======
   « Fais attention de ne jamais restaurer à zéro la progression des joueurs,
     jamais. » (Taylor — la règle numéro un.)

   LE DÉFAUT QUE CE BANC EMPÊCHE. La maîtrise d'un livre était recalculée à
   chaque affichage — bonnes réponses du livre >= sa cible — et la cible se
   déduit du nombre de questions du livre. Ajouter six questions au Deutéronome
   faisait passer sa cible de 3 à 5 : un joueur qui l'avait maîtrisé à 3 le
   voyait redevenir « commencé », « 3 sur 5 ». Rien d'effacé, et la
   progression reculait pourtant sous ses yeux.

   ON SIMULE LA BANQUE QUI GRANDIT : bookTarget est remplacée par « la cible
   réelle plus deux », exactement ce que feront les prochaines questions — sans
   rien emprunter au correctif, pour que le banc puisse tourner sur la version
   d'avant et y voir le défaut. Puis on exige :
     1. un livre maîtrisé AVANT l'enregistrement des maîtrises le reste (la
        transition, par la table figée CIBLES_V296) ;
     2. il se lit « 3 sur 3 », jamais « 3 sur 5 », et garde son style maîtrisé ;
     3. un livre maîtrisé SOUS LES RÈGLES NOUVELLES est enregistré au moment
        même, et reste maîtrisé quand la cible grandit ensuite ;
     4. la transition n'invente rien : 2 bonnes réponses sous une cible de 3
        ne deviennent pas une maîtrise ;
     5. elle ne sert qu'UNE fois : une progression déjà marquée n'est plus
        relue avec la table figée ;
     6. un compte synchronisé depuis un vieux téléphone apporte ses maîtrises
        à la fusion (progMergeMax), au lieu de les perdre.
   Usage : node banc-essai/maitrise-reste.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(60) + (det || '')); };

  const page = async (progres) => {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((pr) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor' }));
      localStorage.setItem('bt_fs_hint', '1');
      if (pr) { localStorage.setItem('bt_progress', JSON.stringify(pr)); localStorage.setItem('bt_progress_bak', JSON.stringify(pr)); }
    }, progres);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    /* LA BANQUE A GRANDI : chaque cible monte de deux. */
    await p.evaluate(() => { const vraie = bookTarget; window.__vraieCible = vraie;
      bookTarget = function (b) { return vraie(b) + 2; }; });
    return { p, ctx, errs };
  };
  const tuile = (p, livre) => p.evaluate((livre) => {
    state.screen = 'parcours'; render();
    const b = [...document.querySelectorAll('.bk')].find(x => (x.getAttribute('aria-label') || '').indexOf(livre) >= 0);
    return b ? { maitrise: b.classList.contains('mastered'), dit: b.getAttribute('aria-label') } : null;
  }, livre);

  /* 1 et 2 : un joueur d'avant, Deutéronome maîtrisé à 3 sous la cible de 3. */
  {
    const { p, ctx, errs } = await page({ books: { 'Deutéronome': 3, 'Genèse': 4 }, totalCorrect: 7, bestStreak: 3, flawless: 0, ach: {} });
    const r = await p.evaluate(() => { const pr = loadProgress(); const d = progressDerived(pr);
      return { maitrise: !!d.set['Deutéronome'], cible: bookTarget('Deutéronome'), enregistre: !!(pr.maitrises && pr.maitrises['Deutéronome']) }; });
    v('un livre maîtrisé avant le changement le reste', r.maitrise, 'cible devenue ' + r.cible + ', maîtrisé : ' + r.maitrise);
    v('  la transition l\'a enregistré', r.enregistre, '');
    const t = await tuile(p, 'Deutéronome');
    v('  sa tuile garde le style maîtrisé', t && t.maitrise, t ? t.dit : 'tuile introuvable');
    v('  et ne se lit jamais « 3 sur 5 »', t && /3 sur 3/.test(t.dit), t ? t.dit : '');
    /* 4 : la Genèse était à 4 sous une cible de 9 : rien à inventer. */
    const g = await p.evaluate(() => !!progressDerived(loadProgress()).set['Genèse']);
    v('la transition n\'invente aucune maîtrise', g === false, 'Genèse à 4 sous une cible de 9 : ' + (g ? 'MAÎTRISÉE À TORT' : 'non maîtrisée'));
    if (errs.length) { ko++; console.log('  erreurs JS : ' + errs.slice(0, 2).join(' | ')); }
    await ctx.close();
  }

  /* 3 : maîtrisé sous les règles NOUVELLES, puis la cible grandit encore. */
  {
    const { p, ctx, errs } = await page(null);
    const r = await p.evaluate(() => {
      const t = bookTarget('Ruth');                    // la cible « grandie »
      const pr = loadProgress(); pr.books['Ruth'] = t; saveProgress(pr);
      const enregistre = !!(loadProgress().maitrises || {})['Ruth'];
      const avant = bookTarget; bookTarget = function (b) { return avant(b) + 3; };   // elle grandit ENCORE
      const reste = !!progressDerived(loadProgress()).set['Ruth'];
      return { t, enregistre, reste };
    });
    v('une maîtrise atteinte aujourd\'hui est enregistrée aussitôt', r.enregistre, 'Ruth à ' + r.t);
    v('  et survit quand la cible grandit encore', r.reste, '');
    if (errs.length) { ko++; console.log('  erreurs JS : ' + errs.slice(0, 2).join(' | ')); }
    await ctx.close();
  }

  /* 5 : la table figée ne sert qu'une fois. */
  {
    const { p, ctx, errs } = await page({ books: { 'Deutéronome': 3 }, totalCorrect: 3, bestStreak: 0, flawless: 0, ach: {}, maitrises: {}, cibles: 1 });
    const r = await p.evaluate(() => !!progressDerived(loadProgress()).set['Deutéronome']);
    v('une progression déjà marquée n\'est plus relue avec la table figée', r === false,
      r ? 'MAÎTRISÉ PAR LA TABLE' : '3 sous une cible de 5 : non maîtrisé, comme il se doit');
    if (errs.length) { ko++; console.log('  erreurs JS : ' + errs.slice(0, 2).join(' | ')); }
    await ctx.close();
  }

  /* 6 : la fusion d'un compte venu d'un vieux téléphone. */
  {
    const { p, ctx, errs } = await page(null);
    const r = await p.evaluate(() => {
      const nuage = { books: { 'Deutéronome': 3 }, totalCorrect: 3, bestStreak: 0, flawless: 0, ach: {} };   // pas de marque
      const local = progNormalize({ books: { 'Marc': 2 }, totalCorrect: 2, bestStreak: 0, flawless: 0, ach: {}, maitrises: {}, cibles: 1 });
      const f = progMergeMax(progNormalize(nuage), local);
      return { deut: !!(f.maitrises || {})['Deutéronome'], marc: f.books['Marc'], marque: f.cibles };
    });
    v('un vieux téléphone apporte ses maîtrises à la fusion', r.deut, 'Deutéronome : ' + r.deut + ', Marc gardé : ' + r.marc);
    if (errs.length) { ko++; console.log('  erreurs JS : ' + errs.slice(0, 2).join(' | ')); }
    await ctx.close();
  }

  await nav.close();
  console.log(ko === 0 ? '\n  OK — ce qu\'un joueur a atteint reste atteint, même quand la banque grandit' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
