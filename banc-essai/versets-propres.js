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
     1. aucun débris de page web : lien, adresse, image, « Retournez au
        Début », ligne de « = », balise ou entité HTML — « Retournez » tout
        court est aussi un mot de la Bible (« retournez à l'Éternel », Joël
        2:13) : le premier essai du lot de v299 l'avait pris pour un débris ;
     2. aucun crochet d'appareil critique — le jeu garde les mots suppléés et
        retire les crochets, pour toutes les versions ;
     3. aucune césure mal recollée (« Jésus- Christ ») ;
     4. aucun des mots collés déjà relevés (« suisdoux », « etla vérité ») ni
        des coquilles des sources (« aujourd’hu1 », un chiffre pour un i) ;
     5. aucun texte vide, aucune ponctuation collée au mot qui suit (« je
        vous dis :Demandez », Luc 11:9 — l'espace manquait dans la source) ;
     6. aucune lettre d'acrostiche en tête (« Scin. La grâce trompe… ») ;
     7. AUCUN VERSET VOISIN SOUS L'ÉTIQUETTE. Trouvé le 30/09/2026 : lue au
        même numéro que le Segond, l'Ostervald montrait le verset d'à côté dans
        dix psaumes (« Psaume 46:10 » -> « Cessez, dit-il… »). Chaque texte
        français doit partager assez de racines avec AU MOINS UNE autre version
        française du même verset. Deux traductions fidèles se ressemblent
        toujours un peu ; un verset voisin ne ressemble à aucune. C'est un
        garde-fou grossier — le contrôle exact, source par source, est le
        témoin de bibles/ajoute_versets.py.
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
      ['débris de page web', /https?:|www\.|\.gif|\.png|\.jpg|Website|Hosted|Retournez au D[ée]but|={3,}|<\/?[a-z][^>]*>|&[a-z]+;/i],
      ['crochet d\'appareil critique', /[\[\]]/],
      ['césure mal recollée', /[A-Za-zÀ-ÿ]- [A-Za-zÀ-ÿ]/],
      ['mot collé déjà relevé', /suisdoux|servirDieu|\betla|aujourd[’']hu1/],
      ['ponctuation collée au mot suivant', /[:;!?…][A-Za-zÀ-ÖØ-öø-ÿ]/],
    ];
    const FR = ['Segond (recueil)', 'martin1744', 'darby', 'ostervald', 'ba'];
    const LETTRE = /^(?:Aleph|Beth|Guimel|Daleth|Vau|Zaïn|Heth|Teth|Jod|Caph|Lamed|Nun|Samech|Hajin|Tsadé|Koph|Resch|Scin|Schin|Thau)\.?\s+(?=[A-ZÀ-Ý])/;
    const fautes = [];
    textes.forEach(([ou, ref, t]) => {
      if (!t || !String(t).trim()) { fautes.push(['texte vide', ou, ref, '']); return; }
      regles.forEach(([nom, re]) => { const m = String(t).match(re);
        if (m) fautes.push([nom, ou, ref, String(t).slice(Math.max(0, m.index - 30), m.index + 40)]); });
      if (FR.includes(ou) && LETTRE.test(String(t))) fautes.push(['lettre d\'acrostiche en tête', ou, ref, String(t).slice(0, 50)]);
    });
    /* 7. Les racines : cinq premières lettres des mots de plus de trois lettres,
       sans accents, comme le score du Martin (bibles/martin.py). */
    const VIDES = new Set('mais dans avec pour vous nous leur leurs votre notre cette celui celle ceux point comme tout tous toute toutes elle elles sont sera seront etait avait fait dont quand ainsi alors aussi meme'.split(' '));
    const rac = (t) => new Set((String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]+/g) || [])
      .filter(w => w.length > 3 && !VIDES.has(w)).map(w => w.slice(0, 5)));
    const proche = (a, b) => { const A = rac(a), B = rac(b); if (!A.size || !B.size) return 0;
      let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return n / Math.min(A.size, B.size); };
    let plusBas = 1;
    HERO_VERSES.forEach(v => {
      const parVersion = { 'Segond (recueil)': v.t };
      ['martin1744', 'darby', 'ostervald', 'ba'].forEach(k => { const x = (VERSETS_ALT[k] || {})[v.r]; if (x) parVersion[k] = x; });
      Object.keys(parVersion).forEach(k => {
        if (k === 'Segond (recueil)') return;
        const m = Math.max(...Object.keys(parVersion).filter(o => o !== k).map(o => proche(parVersion[k], parVersion[o])));
        plusBas = Math.min(plusBas, m);
        if (m < 0.25) fautes.push(['verset voisin sous l\'étiquette', k, v.r, String(parVersion[k]).slice(0, 60) + ' (' + m.toFixed(2) + ')']);
      });
    });
    return { n: textes.length, fautes, plusBas };
  });

  console.log('  ' + r.n + ' textes bibliques relus (recueil, dix versions, citations)');
  console.log('  la version française qui ressemble le moins aux autres : ' + r.plusBas.toFixed(2) + ' (seuil 0.25)');
  const parRegle = {};
  r.fautes.forEach(f => { (parRegle[f[0]] = parRegle[f[0]] || []).push(f); });
  let ko = 0;
  for (const nom of ['débris de page web', 'crochet d\'appareil critique', 'césure mal recollée', 'mot collé déjà relevé',
                     'ponctuation collée au mot suivant', 'texte vide',
                     'lettre d\'acrostiche en tête', 'verset voisin sous l\'étiquette']) {
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
