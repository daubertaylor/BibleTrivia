/* ============ BANC « LA BIBLE SUIT LA LANGUE » ============
   « Pense bien à mettre les bonnes versions de Bible en fonction des langues
   correspondantes. »

   Proposer Louis Segond, Darby et Ostervald à quelqu'un qui lit l'anglais n'a
   pas de sens : ce sont des Bibles françaises. Le panneau ne montre donc que
   les versions de la langue en cours, et le verset affiché vient de la version
   choisie DANS cette langue.

   ON VÉRIFIE, DANS LES DEUX LANGUES :
     1. la liste ne contient que des versions de la bonne langue ;
     2. la version active en fait partie ;
     3. chaque version rend un texte DIFFÉRENT des autres — une version qui
        retomberait sur le français, ou sur sa voisine, ne serait pas un choix ;
     4. en anglais, aucun verset ne contient de caractère accentué : c'est le
        signe le plus simple et le plus sûr qu'aucun texte français n'a fui ;
     5. et le verset de l'accueil change de langue avec le reste.

   Usage : node banc-essai/bibles-langue.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const ACCENT = /[àâäéèêëîïôöùûüÿçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇŒÆ]/;
const ATTENDU = { fr: ['LSG','JND','OST','BA','MAR'], en: ['KJV','ASV','WEB'] };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const soucis = [];
  const vu = {};
  for (const lg of ['fr', 'en']) {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
      userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((l) => {
      localStorage.setItem('bt_langue', l);
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor' }));
      localStorage.setItem('bt_fs_hint', '1');
    }, lg);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof render === 'function' && state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(600);
    /* UNE VERSION QUI N'A PAS ENCORE LA FONCTION N'EST PAS UNE PANNE DU BANC.
       Sur la version d'avant, biblesDeLaLangue() n'existe pas : le banc doit
       le DIRE, pas s'écrouler avec une trace de pile. */
    const r = await p.evaluate(() => {
      if (typeof biblesDeLaLangue !== 'function') return { absente: true, langue: LANGUE };
      const liste = biblesDeLaLangue();
      const garde = settings.bible;
      const textes = {};
      /* On relève QUELQUES références, pas une : deux versions peuvent
         coïncider sur un verset court et différer partout ailleurs. */
      const refs = ["Psaume 23:1", "Jean 3:16", "Psaume 34:18", "Ésaïe 64:8"];
      for (const b of liste) {
        settings.bible = b.cle;
        textes[b.sigle] = refs.map(x => texteVerset(x, "(défaut)"));
      }
      settings.bible = garde;
      return { langue: LANGUE, sigles: liste.map(b => b.sigle), active: bibleActive().sigle,
        accueil: texteAccueil(), textes };
    });
    vu[lg] = r;
    if (r.absente) {
      soucis.push(lg + ' : la liste des versions ne suit pas la langue (biblesDeLaLangue absente)');
      await ctx.close();
      continue;
    }
    /* 1. la bonne liste */
    if (r.sigles.join(',') !== ATTENDU[lg].join(','))
      soucis.push(lg + ' : versions proposées ' + r.sigles.join('/') + ' au lieu de ' + ATTENDU[lg].join('/'));
    /* 2. la version active en fait partie */
    if (!r.sigles.includes(r.active))
      soucis.push(lg + ' : la version active (' + r.active + ') n\'est pas dans la liste');
    /* 3. chacune dit quelque chose qui lui est propre */
    const empreintes = {};
    for (const s of r.sigles) empreintes[s] = r.textes[s].join(' ¦ ');
    const paires = r.sigles;
    for (let i = 0; i < paires.length; i++)
      for (let j = i + 1; j < paires.length; j++)
        if (empreintes[paires[i]] === empreintes[paires[j]])
          soucis.push(lg + ' : ' + paires[i] + ' et ' + paires[j] + ' rendent exactement le même texte');
    /* 4. en anglais, pas un accent */
    if (lg === 'en') {
      for (const s of r.sigles)
        for (const t of r.textes[s])
          if (ACCENT.test(t)) soucis.push('en : ' + s + ' laisse passer du français — « ' + t.slice(0, 60) + ' »');
      if (ACCENT.test(r.accueil)) soucis.push('en : le verset de l\'accueil est resté français — « ' + r.accueil.slice(0, 60) + ' »');
    }
    if (errs.length) soucis.push(lg + ' : erreurs JS — ' + [...new Set(errs)].slice(0, 2).join(' | '));
    await ctx.close();
  }
  /* 5. l'accueil change bien de langue */
  if (vu.fr && vu.en && !vu.fr.absente && !vu.en.absente && vu.fr.accueil === vu.en.accueil)
    soucis.push('le verset de l\'accueil est le même dans les deux langues');
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('  OK — fr : ' + vu.fr.sigles.join(' ') + ' (active ' + vu.fr.active + ')');
  console.log('       en : ' + vu.en.sigles.join(' ') + ' (active ' + vu.en.active + '), aucun accent');
  console.log('       accueil : « ' + vu.fr.accueil.slice(0, 44) + '… » / « ' + vu.en.accueil.slice(0, 44) + '… »');
})();
