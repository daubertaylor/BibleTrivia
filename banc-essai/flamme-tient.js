/* ====== BANC « LA FEUILLE DES FLAMMES NE MONTE PAS AVEC LA SÉRIE » ======
   « Ici aussi, lorsque les flammes sont beaucoup, il ne faut pas que ça fasse
     monter le menu. » (Taylor, capture de la feuille de la flamme.)

   LE DÉFAUT ÉTAIT UNE RÉCOMPENSE QUI PUNIT. La grille montait à mesure qu'on
   tenait sa flamme : le haut de la feuille passait de 456 px à 190 px sur un
   iPhone 15 entre trois jours de série et quarante-cinq, de 310 à 116 sur un
   SE. Un plafond (max-height) n'est pas une hauteur : il laissait la grille
   pousser librement jusqu'à lui.

   CE QUE CE BANC EXIGE :
     1. le haut de la feuille est LE MÊME à 3, 7, 17, 45, 120 et 300 jours ;
     2. la fenêtre montre exactement QUATRE semaines, toujours ;
     3. un joueur de trois jours n'a RIEN à défiler — une fenêtre fixe qu'on
        ne remplit pas, c'est troquer une feuille qui grandit contre une
        feuille à moitié vide ;
     4. un joueur de cent vingt jours défile DANS la fenêtre, et la page, elle,
        ne déborde pas ;
     5. aucun « manqué » avant la première trace : trente reproches à
        quelqu'un qui vient d'installer le jeu, jamais ;
     6. l'en-tête des jours ne défile pas avec la grille — un calendrier garde
        son en-tête ;
     7. la feuille s'ouvre sur AUJOURD'HUI, qui doit être visible sans geste.
   Usage : node banc-essai/flamme-tient.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SERIES = [3, 7, 17, 45, 120, 300];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('    ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(52) + (det || '')); };

  for (const [nom, w, h] of [['iPhone 15', 393, 852], ['iPhone SE', 375, 667]]) {
    console.log('  ' + nom);
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2,
      userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });

    /* Une série de N jours d'affilée, finissant aujourd'hui, écrite dans la
       vraie forme du stockage (jours est un TABLEAU : un objet retomberait sur
       l'ancienne dérivation et on ne mesurerait pas ce qu'on croit). */
    const ouvre = (jours) => p.evaluate(async (jours) => {
      const veil = document.getElementById('flammeVeil'); if (veil) veil.remove();
      const cle = (d) => { const t = new Date(); t.setDate(t.getDate() - d);
        const q = n => String(n).padStart(2, '0');
        return t.getFullYear() + '-' + q(t.getMonth() + 1) + '-' + q(t.getDate()); };
      const faits = []; for (let k = 0; k < jours; k++) faits.push(cle(k));
      localStorage.setItem('bt_daily', JSON.stringify({ streak: jours, last: cle(0), jours: faits, geles: [], gels: 2 }));
      ouvrirFlamme();
      await new Promise(r => setTimeout(r, 800));
      const f = document.querySelector('.flam-sheet');
      const l = document.querySelector('.flam-list');
      const tete = document.querySelector('.fg-sem');
      const cases = [...l.querySelectorAll('.fj')];
      const rl = l.getBoundingClientRect();
      /* Une rangée réelle, mesurée sur deux cases de colonnes voisines : on ne
         recopie pas les nombres du CSS, on les lit. */
      const c0 = cases[0].getBoundingClientRect(), c7 = cases[7] ? cases[7].getBoundingClientRect() : null;
      const pas = c7 ? (c7.top - c0.top) : c0.height;
      const ecart = pas - c0.height;   /* quatre cases et TROIS écarts : sans le
                                          rattrapage, quatre rangées se lisent 3,9 */
      /* L'en-tête bouge-t-il quand la grille défile ? */
      const teteBas = tete.getBoundingClientRect().top;
      const gardeScroll = l.scrollTop; l.scrollTop = 0;
      const teteHaut = tete.getBoundingClientRect().top;
      const auj = l.querySelector('.fj.auj');
      l.scrollTop = gardeScroll;
      const q = auj ? auj.getBoundingClientRect() : null;
      return {
        haut: Math.round(f.getBoundingClientRect().top),
        hauteur: Math.round(f.getBoundingClientRect().height),
        liste: Math.round(rl.height),
        rangeesVues: Math.round((rl.height + ecart) / pas * 100) / 100,
        defile: Math.max(0, l.scrollHeight - l.clientHeight),
        teteDedans: l.contains(tete),
        teteFixe: Math.abs(teteBas - teteHaut) < 1,
        manques: cases.filter(c => / manqué|Manqué/.test(c.getAttribute('aria-label') || '')).length,
        horschamp: cases.filter(c => c.classList.contains('horschamp')).length,
        aujVisible: !!q && q.top >= rl.top - 1 && q.bottom <= rl.bottom + 1,
        pageDeborde: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        /* LA FEUILLE DÉBORDE PAR CONSTRUCTION, et ce n'est pas un défaut : elle
           porte 238 px de coussin sous son dernier élément pour qu'un tiré vers
           le bas ne découvre jamais la page derrière. Ma première version
           mesurait f.bottom et tombait rouge sur les DEUX téléphones — y
           compris sur la feuille des Réglages, que je n'avais pas touchée. Le
           banc avait tort, pas le jeu. Ce qui doit tenir à l'écran, c'est le
           CONTENU : la légende est le dernier élément qu'on doit pouvoir lire. */
        basDansEcran: Math.round(f.querySelector('.flam-leg').getBoundingClientRect().bottom) <= window.innerHeight,
      };
    }, jours);

    const mesures = {};
    for (const j of SERIES) {
      mesures[j] = await ouvre(j);
      const m = mesures[j];
      console.log('    ' + String(j).padStart(3) + ' jours : haut ' + String(m.haut).padStart(4)
        + ' px, fenêtre ' + String(m.liste).padStart(3) + ' px (' + m.rangeesVues + ' rangées, '
        + String(m.defile).padStart(4) + ' à défiler)');
    }

    const hauts = SERIES.map(j => mesures[j].haut);
    const ecart = Math.max(...hauts) - Math.min(...hauts);
    v('le haut de la feuille ne bouge pas de 3 à 300 jours', ecart <= 2,
      ecart + ' px d\'écart (' + Math.min(...hauts) + ' à ' + Math.max(...hauts) + ')');

    const listes = SERIES.map(j => mesures[j].liste);
    v('  et la fenêtre de la grille non plus', Math.max(...listes) - Math.min(...listes) <= 2,
      (Math.max(...listes) - Math.min(...listes)) + ' px d\'écart');

    v('la fenêtre montre exactement quatre semaines',
      SERIES.every(j => Math.abs(mesures[j].rangeesVues - 4) < 0.05),
      SERIES.map(j => mesures[j].rangeesVues).join(' / '));

    v('trois jours de série : rien à défiler', mesures[3].defile === 0,
      mesures[3].defile + ' px');
    v('  et la grille est pleine, pas à moitié vide', mesures[3].horschamp > 0,
      mesures[3].horschamp + ' case(s) hors champ pour remplir le mois');
    v('  sans un seul « manqué » avant la première trace', mesures[3].manques === 0,
      mesures[3].manques + ' reproche(s)');

    v('cent vingt jours : ça défile DANS la fenêtre', mesures[120].defile > 0,
      mesures[120].defile + ' px');
    v('  et la page, elle, ne déborde pas', mesures[120].pageDeborde === 0,
      mesures[120].pageDeborde + ' px de débord');
    v('  tout le contenu de la feuille reste lisible', SERIES.every(j => mesures[j].basDansEcran), '');

    v('l\'en-tête des jours est hors de la fenêtre',
      SERIES.every(j => !mesures[j].teteDedans), '');
    v('  et ne bouge pas quand la grille défile',
      SERIES.every(j => mesures[j].teteFixe), '');

    v('la feuille s\'ouvre sur aujourd\'hui', SERIES.every(j => mesures[j].aujVisible),
      SERIES.filter(j => !mesures[j].aujVisible).map(j => j + 'j').join(' ') || 'toutes les séries');

    if (errs.length) { ko++; console.log('    erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | ')); }
    await ctx.close();
  }

  await nav.close();
  console.log(ko === 0
    ? '\n  OK — la feuille a la même taille au premier jour et au trois centième'
    : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
