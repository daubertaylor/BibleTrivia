/* ====== BANC « LA PROGRESSION, AU PIXEL » (v335) ======
   « Ici aussi, vérifie dans le mode progression l'espacement des différents
     éléments pour que tout soit vraiment parfait. J'aime beaucoup d'ailleurs
     ce mode-là. » Sur un iPhone SE, un iPhone 15 et un Android, en français,
   en anglais et en espagnol, une progression en cours puis une progression
   finie :
     1. les deux barres des testaments commencent au même pixel et finissent
        au même pixel, et les deux compteurs se terminent l'un sous l'autre
        (avant : la barre du Nouveau Testament, au nom plus long, partait
        16 px plus à droite) ;
     2. les objectifs : dans chaque rangée, les « Débloqué » / « 3 / 10 »
        sont alignés ; et sous un nom d'une ligne, le chiffre est à la même
        distance de son nom que le nom de son icône — plus de ligne vide
        réservée dans une rangée où aucun nom ne passe à la ligne ;
     3. entre deux rangées d'objectifs, toujours le même espace ;
     4. rien ne déborde de l'écran, aucune erreur.
   Usage : node banc-essai/progression-espaces.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const TELS = [['iPhone SE', 375, 667, IOS], ['iPhone 15', 393, 852, IOS], ['Android', 412, 915, AND]];
let ko = 0;
const fautes = { barres: [], chiffres: [], rangees: [], ecran: [] };
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 500) + ')' : '')); };

const MESURE = () => {
  const r = (e) => e.getBoundingClientRect();
  const heads = [...document.querySelectorAll('.tst-head')];
  const barres = heads.map(h => { const b = r(h.querySelector('.tst-bar')), c = r(h.querySelector('.tst-count > span') || h.querySelector('.tst-count'));
    return { g: b.left, d: b.right, c: c.right }; });
  const tuiles = [...document.querySelectorAll('.ach-grid .ach')].map(a => {
    const t = r(a.querySelector('.ach-tile')), n = r(a.querySelector('.ach-nm > span')), p = r(a.querySelector('.ach-prog'));
    const lh = parseFloat(getComputedStyle(a.querySelector('.ach-nm')).lineHeight) || 12;
    return { tileTop: t.top, tileBas: t.bottom, nomHaut: n.top, nomBas: n.bottom, lignes: Math.round(n.height / lh), progHaut: p.top, progBas: p.bottom,
      ecart: parseFloat(getComputedStyle(a).rowGap) || 0 };
  });
  const rangees = [];
  for (const t of tuiles) { let rg = rangees.find(x => Math.abs(x.y - t.tileTop) < 2); if (!rg) { rg = { y: t.tileTop, t: [] }; rangees.push(rg); } rg.t.push(t); }
  const deborde = [...document.querySelectorAll('.tst-head, .ach-card, .parcours-sum')].some(e => { const b = r(e); return b.left < -0.5 || b.right > innerWidth + 0.5; });
  return { barres, rangees, deborde };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [tel, w, h, ua] of TELS) {
      for (const lg of ['fr', 'en', 'es']) {
        for (const fini of [false, true]) {
          const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
          const p = await ctx.newPage();
          p.on('pageerror', e => erreurs.push(tel + ' : ' + e.message));
          await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
          await p.addInitScript(([lg]) => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_langue', lg); }, [lg]);
          await p.goto(URL);
          await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
          await p.evaluate(([lg, fini]) => {
            const books = {};
            BIBLE_BOOKS.forEach((b, i) => { if (fini || i % 7 === 0) books[b] = 40; });
            saveProgress({ books, totalCorrect: fini ? 1114 : 140, bestStreak: fini ? 21 : 9, flawless: 2, ach: {} });
            openParcours();
          }, [lg, fini]);
          await p.waitForTimeout(1300);
          const m = await p.evaluate(MESURE);
          const cas = tel + ' ' + lg + (fini ? ' fini' : ' en cours');
          /* 1 */
          const [a, b] = m.barres;
          if (!a || !b || Math.abs(a.g - b.g) > 0.6 || Math.abs(a.d - b.d) > 0.6 || Math.abs(a.c - b.c) > 0.6)
            fautes.barres.push(cas + ' : barres ' + (a && a.g.toFixed(1)) + '/' + (b && b.g.toFixed(1)) + ' → ' + (a && a.d.toFixed(1)) + '/' + (b && b.d.toFixed(1)) + ', compteurs ' + (a && a.c.toFixed(1)) + '/' + (b && b.c.toFixed(1)));
          /* 2 */
          for (const [i, rg] of m.rangees.entries()) {
            const ys = rg.t.map(t => t.progHaut);
            if (Math.max(...ys) - Math.min(...ys) > 0.6) fautes.chiffres.push(cas + ' rangée ' + (i + 1) + ' : chiffres à ' + ys.map(y => y.toFixed(1)).join('/'));
            const uneLigne = rg.t.filter(t => t.lignes === 1);
            for (const t of uneLigne) {
              const iconeNom = t.nomHaut - t.tileBas, nomChiffre = t.progHaut - t.nomBas;
              const deux = rg.t.some(x => x.lignes === 2);
              /* sous un nom d'une ligne : chiffre aussi près que l'icône ;
                 dans une rangée où un voisin passe à la ligne, le nom est
                 centré (les deux écarts s'égalisent à l'œil) */
              if (!deux && Math.abs(nomChiffre - iconeNom) > 1.2) fautes.chiffres.push(cas + ' rangée ' + (i + 1) + ' : icône→nom ' + iconeNom.toFixed(1) + ', nom→chiffre ' + nomChiffre.toFixed(1));
              /* une rangée de noms courts est serrée : rien que l'écart de la tuile */
              if (!deux && Math.abs(iconeNom - t.ecart) > 1.2) fautes.chiffres.push(cas + ' rangée ' + (i + 1) + ' : une ligne vide réservée (icône→nom ' + iconeNom.toFixed(1) + ' au lieu de ' + t.ecart.toFixed(1) + ')');
              if (deux && Math.abs(nomChiffre - iconeNom) > 1.2) fautes.chiffres.push(cas + ' rangée ' + (i + 1) + ' (nom centré) : ' + iconeNom.toFixed(1) + ' / ' + nomChiffre.toFixed(1));
            }
          }
          /* 3 */
          const ecarts = [];
          for (let i = 1; i < m.rangees.length; i++) ecarts.push(m.rangees[i].y - Math.max(...m.rangees[i - 1].t.map(t => t.progBas)));
          if (ecarts.length && Math.max(...ecarts) - Math.min(...ecarts) > 1.2) fautes.rangees.push(cas + ' : ' + ecarts.map(e => e.toFixed(1)).join(' / '));
          if (m.deborde) fautes.ecran.push(cas);
          await ctx.close();
        }
      }
    }
    dit('1. les barres des deux testaments commencent et finissent au même pixel, les compteurs l\'un sous l\'autre (3 téléphones × 3 langues × 2 états)', !fautes.barres.length, fautes.barres.slice(0, 4).join(' · '));
    dit('2. les chiffres d\'une rangée alignés, et pas de ligne vide sous un nom court', !fautes.chiffres.length, fautes.chiffres.slice(0, 4).join(' · '));
    dit('3. entre deux rangées d\'objectifs, toujours le même espace', !fautes.rangees.length, fautes.rangees.slice(0, 4).join(' · '));
    dit('4. rien ne déborde, aucune erreur', !fautes.ecran.length && !erreurs.length, fautes.ecran.concat(erreurs).slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la Progression tombe juste, au pixel, partout');
  process.exit(ko ? 1 : 0);
})();
