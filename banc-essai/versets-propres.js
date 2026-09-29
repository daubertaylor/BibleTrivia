/* ====== BANC « RIEN QUE L'ÉCRITURE DANS LES VERSETS » ======
   Trouvé le 29/09/2026 en ajoutant des versets : trois versets de la Bible
   Martin étaient EN LIGNE avec un débris du module source collé à leur fin.
   Le pire, Matthieu 28:20, affichait sur la carte d'accueil :
       « …jusques à la fin du monde. Amen. Retournez au Début This Website is
         Hosted by ../../lilacsandbutterflies/images/EClilacsbanner.gif ====== »
   Une bannière d'hébergeur, présentée comme de l'Écriture — depuis le jour où
   la version a été ajoutée, sans qu'aucun banc ne regarde le TEXTE lui-même :
   verset.js mesurait sa hauteur, pas ce qu'il disait.

   CE QUE CE BANC EXIGE, pour chaque texte biblique du jeu — le recueil
   (HERO_VERSES), ses dix versions (VERSETS_ALT) et les extraits des
   explications (CITATIONS_ALT) :
     1. aucun débris de page web : lien, adresse, image, « Retournez »,
        ligne de « = », balise ou entité HTML ;
     2. aucun crochet d'appareil critique — le jeu garde les mots suppléés et
        retire les crochets, pour toutes les versions ;
     3. aucune césure mal recollée (« Jésus- Christ ») ;
     4. aucun des mots collés déjà relevés (« suisdoux ») ;
     5. aucun texte vide.
   Usage : node banc-essai/versets-propres.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await nav.newContext({ serviceWorkers: 'block' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });

  const r = await p.evaluate(() => {
    const textes = [];
    HERO_VERSES.forEach(v => textes.push(['Segond (recueil)', v.r, v.t]));
    Object.keys(VERSETS_ALT).forEach(cle => Object.entries(VERSETS_ALT[cle]).forEach(([ref, t]) => textes.push([cle, ref, t])));
    try {
      Object.keys(CITATIONS_ALT).forEach(cle => {
        const d = CITATIONS_ALT[cle];
        if (d && typeof d === 'object') Object.entries(d).forEach(([k, t]) => { if (typeof t === 'string') textes.push(['citation ' + cle, k.slice(0, 40), t]); });
      });
    } catch (e) {}
    const regles = [
      ['débris de page web', /https?:|www\.|\.gif|\.png|\.jpg|Website|Hosted|Retournez|={3,}|<\/?[a-z][^>]*>|&[a-z]+;/i],
      ['crochet d\'appareil critique', /[\[\]]/],
      ['césure mal recollée', /[A-Za-zÀ-ÿ]- [A-Za-zÀ-ÿ]/],
      ['mot collé déjà relevé', /suisdoux|servirDieu/],
    ];
    const fautes = [];
    textes.forEach(([ou, ref, t]) => {
      if (!t || !String(t).trim()) { fautes.push(['texte vide', ou, ref, '']); return; }
      regles.forEach(([nom, re]) => { const m = String(t).match(re);
        if (m) fautes.push([nom, ou, ref, String(t).slice(Math.max(0, m.index - 30), m.index + 40)]); });
    });
    return { n: textes.length, fautes };
  });

  console.log('  ' + r.n + ' textes bibliques relus (recueil, dix versions, citations)');
  const parRegle = {};
  r.fautes.forEach(f => { (parRegle[f[0]] = parRegle[f[0]] || []).push(f); });
  let ko = 0;
  for (const nom of ['débris de page web', 'crochet d\'appareil critique', 'césure mal recollée', 'mot collé déjà relevé', 'texte vide']) {
    const l = parRegle[nom] || [];
    if (l.length) ko++;
    console.log('  ' + (l.length ? 'KO ' : 'OK ') + nom.padEnd(30) + l.length);
    l.slice(0, 4).forEach(f => console.log('       ' + f[1] + ' · ' + f[2] + '  …' + f[3] + '…'));
  }
  if (errs.length) { ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK — rien que l\'Écriture, dans toutes les versions' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
