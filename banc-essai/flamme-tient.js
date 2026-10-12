/* ====== BANC « LA FLAMME, MOIS PAR MOIS, DANS UNE PAGE QUI DÉFILE » (v315) ======
   « J'ai pas l'impression d'avoir une page déroulante. Je veux voir toutes
     mes flammes : sur un mois, deux mois, six mois, un an. »

   Jusqu'à la v314, l'histoire de la flamme vivait dans une fenêtre de quatre
   semaines, à hauteur fixe, qui défilait À L'INTÉRIEUR d'une feuille — un
   défilement dans un autre, et rien au-delà de quatre-vingt-dix jours joués.
   C'est maintenant une page : une carte par mois, le mois en cours en haut,
   les plus anciens en descendant.

   CE QUE CE BANC EXIGE, à 3, 7, 17, 45, 120 et 300 jours de série :
     1. le mois EN COURS est la première carte, et il est visible sans geste ;
     2. une carte par mois, du mois en cours jusqu'à celui de la première
        trace — ni un de plus, ni un de moins ;
     3. une flamme par jour joué : rien n'est perdu, même à trois cents jours
        (la mémoire est passée de 90 à 400 jours joués) ;
     4. aucun « manqué » avant la première trace — des mois de reproches à
        quelqu'un qui vient d'arriver, jamais ;
     5. c'est LA PAGE qui défile, pas une fenêtre dedans ; et la plus vieille
        carte s'atteint en faisant défiler ;
     6. chaque carte porte ses sept jours, dans l'ordre du calendrier.
   Usage : node banc-essai/flamme-tient.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SERIES = [3, 7, 17, 45, 120, 300];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('    ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(56) + (det || '')); };

  for (const [nom, w, h] of [['iPhone 15', 393, 852], ['iPhone SE', 375, 667]]) {
    console.log('  ' + nom);
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2,
      userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });

    for (const n of SERIES) {
      /* Une série de N jours d'affilée finissant aujourd'hui, dans la vraie
         forme du stockage (« jours » est un TABLEAU). */
      const r = await p.evaluate((n) => new Promise(res => {
        document.querySelectorAll('.sheet-veil').forEach(x => x.remove());
        const jours = []; for (let i = 0; i < n; i++) jours.push(dayKey(-i));
        localStorage.setItem('bt_daily', JSON.stringify({ last: dayKey(0), streak: n, jours, geles: [], gels: 0 }));
        ouvrirFlamme();
        setTimeout(() => {
          const v = document.getElementById('flammeVeil');
          const corps = v.querySelector('.settings-sheet');
          const cartes = [...v.querySelectorAll('.flam-mois')];
          const titres = cartes.map(c => c.querySelector('.fm-tete b').textContent.trim());
          const premiere = cartes[0] ? cartes[0].getBoundingClientRect() : null;
          const liste = v.querySelector('.flam-list');
          const lettres = cartes.every(c => c.querySelectorAll('.fg-sem span').length === 7);
          const fait = v.querySelectorAll('.flam-mois .fj.fait').length;
          const reproches = [...v.querySelectorAll('.flam-mois .fj')].filter(c => /manqué|missed|perdido/.test(c.getAttribute('aria-label') || '')).length;
          /* Le mois attendu de la plus vieille trace, et le nombre de mois. */
          const auj = new Date(), vieux = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - (n - 1));
          const attendus = (auj.getFullYear() - vieux.getFullYear()) * 12 + (auj.getMonth() - vieux.getMonth()) + 1;
          const nomMois = (d) => (T(MOIS_FR[d.getMonth()]) + ' ' + d.getFullYear()).toLowerCase();
          corps.scrollTop = corps.scrollHeight;
          setTimeout(() => {
            const derniere = cartes[cartes.length - 1].getBoundingClientRect();
            res({ titres, attendus, premiereHaut: premiere && premiere.top, premiereBas: premiere && premiere.bottom, ih: innerHeight,
              moisCourant: nomMois(auj), moisVieux: nomMois(vieux), fait, reproches, lettres,
              defilePage: corps.scrollHeight - corps.clientHeight, defileListe: liste.scrollHeight - liste.clientHeight,
              derniereVue: derniere.top < innerHeight && derniere.bottom > 0 });
          }, 120);
        }, 900);
      }), n);
      console.log('   ' + String(n).padStart(3) + ' jours : ' + r.titres.length + ' mois (' + r.titres[0] + ' … ' + r.titres[r.titres.length - 1] + ')');
      v('le mois en cours est la première carte', (r.titres[0] || '').toLowerCase() === r.moisCourant, r.titres[0] + ' / ' + r.moisCourant);
      v('  et il se voit sans geste', r.premiereHaut !== null && r.premiereHaut < r.ih && r.premiereHaut > 0, 'haut à ' + Math.round(r.premiereHaut) + ' px');
      v('une carte par mois jusqu\'à la première trace', r.titres.length === r.attendus && (r.titres[r.titres.length - 1] || '').toLowerCase() === r.moisVieux,
        r.titres.length + ' / ' + r.attendus + ', dernière « ' + r.titres[r.titres.length - 1] + ' »');
      v('une flamme par jour joué', r.fait === n, r.fait + ' / ' + n);
      v('aucun « manqué »', r.reproches === 0, r.reproches + ' reproche(s)');
      v('chaque carte porte ses sept jours', r.lettres, '');
      v('c\'est la page qui défile, pas une fenêtre dedans', r.defileListe <= 1, 'liste ' + r.defileListe + ' px, page ' + r.defilePage + ' px');
      v('la plus vieille carte s\'atteint en défilant', r.derniereVue, '');
    }
    if (errs.length) { ko++; console.log('    KO erreurs : ' + [...new Set(errs)].slice(0, 2).join(' | ')); }
    await ctx.close();
  }
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — toute l\'histoire de la flamme, mois par mois, dans une page qui défile');
  process.exit(ko ? 1 : 0);
})();
