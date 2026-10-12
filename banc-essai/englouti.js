/* ====== « ÇA FAIT UN PEU ENGLOUTI. » — LA PAGE « REVOIR MES ERREURS » (v316) ======
   CE QUE CE BANC GARDAIT JUSQU'À LA V314. La feuille « Revoir mes erreurs »
   portait une LISTE bornée, qui défilait seule dans le bas de la feuille. Sur
   sept erreurs, elle s'arrêtait à 10 px du bord de l'écran et la troisième
   carte y était tranchée net, sous l'indicateur d'accueil de l'iPhone — les
   cartes avaient l'air avalées par le bas. Le banc mesurait donc la place
   sous la liste, la coupe au bord (une analyse d'image), le fondu, le cran
   d'un lancer au doigt, et le compteur du titre.
   CE QUI A CHANGÉ. Depuis la v315, la feuille est une PAGE PLEINE (voir LES
   VOLETS DEVIENNENT DES PAGES) : c'est la page entière qui défile, sous sa
   barre du haut, comme toutes les pages d'un téléphone. Plus de liste
   bornée, donc plus de bord où trancher, ni de fondu ni de cran à régler. Le
   banc d'avant cherchait encore ce bord — il le trouvait à 1117 px, hors de
   l'écran, et tombait sur une division par zéro.
   CE QUI DOIT TENIR MAINTENANT, sur sept erreurs, à l'écran d'un iPhone :
     1. c'est la page qui défile, et elle seule : aucune liste imbriquée qui
        défilerait dans la page (c'était ça, « englouti ») ;
     2. en haut, la première carte commence SOUS la barre, avec de l'air ;
     3. tout en bas, la dernière carte finit au-dessus du bord de l'écran,
        avec au moins 16 px de page dessous : rien n'est tranché ;
     4. la barre du haut reste en place pendant le défilement ;
     5. le compteur du titre dit le nombre d'erreurs, et ne bouge pas quand
        on défile ;
     6. aucune erreur.
   Usage : node banc-essai/englouti.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const FAUX = [
  ["Qui a reconstruit les murailles de Jérusalem après l'exil ?","Néhémie","Esdras","Néhémie obtint du roi Artaxerxès la permission de rentrer."],
  ["Quel compagnon de Daniel fut jeté dans la fournaise ?","Schadrak","Gédéon","Avec Méschak et Abed-Nego (Daniel 3)."],
  ["Combien de livres compte le Nouveau Testament ?","27","39","Vingt-sept livres, de Matthieu à l'Apocalypse."],
  ["Qui a écrit la majorité des Psaumes ?","David","Salomon","David en a composé environ la moitié."],
  ["Sur quelle montagne Moïse reçut-il les commandements ?","Sinaï","Carmel","Aussi appelée Horeb dans le Deutéronome."],
  ["Quel est le premier miracle de Jésus ?","L'eau changée en vin","La multiplication des pains","Aux noces de Cana, en Galilée (Jean 2)."],
  ["Qui a trahi Jésus pour trente pièces d'argent ?","Judas Iscariot","Pierre","Il le livra d'un baiser au jardin de Gethsémané."]
];
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, userAgent: IOS, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.evaluate((faux) => {
      state.screen = 'end'; state.mode = 'solo'; state.soloScore = 740; state.soloCorrect = 13;
      state.questions = new Array(20).fill(0).map((_, i) => ({ q: 'q' + i, tier: 'moyen' }));
      state.soloMissed = faux.map(f => ({ q: f[0], correct: f[1], chosen: f[2], fact: f[3] }));
      render();
    }, FAUX);
    await p.waitForTimeout(900);
    await p.evaluate(() => openMissedReview());
    await p.waitForTimeout(1200);

    const lire = () => p.evaluate(() => {
      const v = document.querySelector('.sheet-veil.page.posee'); if (!v) return null;
      const defilants = [...v.querySelectorAll('*')].filter(x => /(auto|scroll)/.test(getComputedStyle(x).overflowY) && x.scrollHeight > x.clientHeight + 2);
      const cartes = [...v.querySelectorAll('.rev-item')];
      const tete = v.querySelector('.page-tete');
      const r = (x) => x ? x.getBoundingClientRect() : null;
      return { id: v.id, defilants: defilants.map(x => x.className.split(' ').slice(0, 2).join('.')), n: cartes.length,
        tete: tete ? [Math.round(r(tete).top), Math.round(r(tete).bottom)] : null,
        premiere: cartes.length ? Math.round(r(cartes[0]).top) : null, derniere: cartes.length ? Math.round(r(cartes[cartes.length - 1]).bottom) : null,
        ecran: innerHeight, compteur: ((v.querySelector('.sheet-title small') || {}).textContent || '').trim() };
    });
    const haut = await lire();
    dit('la page « Revoir mes erreurs » s\'ouvre, sept cartes', haut && haut.n === 7, haut ? haut.id + ', ' + haut.n + ' cartes' : 'aucune page posée');
    dit('1. c\'est la page qui défile, et elle seule', haut && haut.defilants.length === 1 && /review-sheet|settings-sheet/.test(haut.defilants[0]), haut ? haut.defilants.join(' | ') : '');
    dit('2. la première carte commence sous la barre, avec de l\'air', haut && haut.tete && haut.premiere >= haut.tete[1] + 6, haut ? 'barre jusqu\'à ' + (haut.tete || [])[1] + ', carte à ' + haut.premiere : '');

    /* Tout en bas : on défile comme un doigt, jusqu'au bout. */
    await p.evaluate(() => { const v = document.querySelector('.sheet-veil.page.posee');
      const s = [...v.querySelectorAll('*')].find(x => /(auto|scroll)/.test(getComputedStyle(x).overflowY) && x.scrollHeight > x.clientHeight + 2);
      if (s) s.scrollTop = s.scrollHeight; });
    await p.waitForTimeout(700);
    const bas = await lire();
    const repos = bas ? bas.ecran - bas.derniere : -1;
    dit('3. tout en bas, la dernière carte finit au-dessus du bord, 16 px d\'air au moins', repos >= 16, repos + ' px sous la dernière carte');
    dit('4. la barre du haut reste en place', bas && bas.tete && haut.tete && bas.tete[0] === haut.tete[0], bas && bas.tete ? 'haut ' + haut.tete[0] + ' -> ' + bas.tete[0] : '');
    dit('5. le compteur dit le nombre d\'erreurs, et ne bouge pas', haut && bas && haut.compteur === '7' && bas.compteur === '7', '« ' + (haut || {}).compteur + ' » -> « ' + (bas || {}).compteur + ' »');
    dit('6. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await b.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — rien n\'est englouti : la page défile, la dernière erreur se lit en entier');
  process.exit(ko ? 1 : 0);
})();
