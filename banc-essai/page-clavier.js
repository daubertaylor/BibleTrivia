/* ====== CLAVIER OUVERT, LA PAGE PASSE DESSOUS (v318) ======
   « Ici, bug d'affichage. » (capture de Taylor, iPhone sous iOS 26 :
     « Rejoindre avec un code », clavier ouvert — la page crème s'arrêtait
     au-dessus du clavier, et dessous on voyait le désert du jeu : sous la
     barre « ˄ ˅ ✓ » qui flotte, et aux coins arrondis du clavier.)
   La règle des feuilles ramenait le VOILE de la page à la hauteur visible.
   Le clavier d'iOS 26 n'est plus un bloc opaque collé au bas de l'écran : ce
   qui est derrière se voit. La page garde maintenant toute sa hauteur ; c'est
   son corps (ce qui défile) qui s'arrête au bord du clavier.
   Le clavier est simulé comme dans clavier-feuille.js : le VRAI module du
   clavier voit une hauteur visible réduite (visualViewport) et l'événement
   « resize ».
   CE QU'IL EXIGE, pour chaque champ de page, sur deux iPhone :
     1. clavier ouvert, la page couvre encore tout l'écran : sous le bord du
        clavier, aux coins comme au milieu, c'est la page qu'on touche — pas
        le décor ;
     2. le corps de la page s'arrête au bord du clavier, et le champ reste
        visible au-dessus ;
     3. clavier fermé, le corps reprend toute la hauteur ;
     4. le champ du code : (v332) touché vide, l'exemple « ABC234 »
        s'efface et le curseur se dessine, seul, au milieu — « je n'ai pas
        le petit trait qui me dit que je suis en train d'écrire » ; il reste
        à la première lettre (avant la v332 : le curseur caché tant que
        l'exemple restait affiché) ;
     5. aucune erreur.
   Usage : node banc-essai/page-clavier.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
/* nom, largeur, hauteur, zones sûres haut/bas, hauteur du clavier (barre de boutons comprise) */
const APPAREILS = [['iPhone 15', 393, 852, 59, 34, 386], ['iPhone SE', 375, 667, 20, 0, 260]];
const CHAMPS = [
  ['Créer · nom', "ouvrirCreation()", 'grpNom', 'grpCreerVeil'],
  ['Créer · description', "ouvrirCreation()", 'grpDesc', 'grpCreerVeil'],
  ['Rejoindre · code', "ouvrirCode()", 'grpCode', 'grpCodeVeil'],
];
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const [nom, W, H, HT, BS, KB] of APPAREILS) {
      console.log('\n  — ' + nom + ', clavier de ' + KB + ' px —');
      for (const [champNom, ouvrir, champ, voile] of CHAMPS) {
        const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
        const p = await ctx.newPage();
        p.on('pageerror', e => errs.push(champNom + ' : ' + e.message));
        const cdp = await ctx.newCDPSession(p);
        await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: HT, bottom: BS, left: 0, right: 0 } });
        await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
        await p.goto(URL);
        await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
        await p.evaluate(() => { document.documentElement.classList.add('is-standalone');
          compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
          grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false }; grp.liste = []; grp.publics = [];
          state.screen = 'groupes'; render(); majBarre(); });
        await p.waitForTimeout(800);
        await p.evaluate((o) => { new Function(o)(); }, ouvrir);
        await p.waitForTimeout(1300);
        /* Le clavier monte. */
        await p.evaluate(([c, kb, h]) => {
          Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => h - kb });
          document.getElementById(c).focus({ preventScroll: true });
          window.visualViewport.dispatchEvent(new Event('resize'));
        }, [champ, KB, H]);
        await p.waitForTimeout(1100);
        const r = await p.evaluate(([c, v, kb, h, w]) => {
          const veil = document.getElementById(v), corps = veil && veil.querySelector('.settings-sheet');
          const e = document.getElementById(c).getBoundingClientRect();
          /* Ce qu'on touche sous le bord du clavier : coins et milieu. */
          const points = [[6, h - kb + 8], [w / 2, h - kb + 30], [w - 6, h - kb + 8], [6, h - 6], [w - 6, h - 6]];
          const dessous = points.map(([x, y]) => { const el = document.elementFromPoint(x, y); return !!(el && veil && veil.contains(el)); });
          return { kb: document.documentElement.classList.contains('kb'), voileBas: Math.round(veil.getBoundingClientRect().bottom),
            corpsBas: Math.round(corps.getBoundingClientRect().bottom), champHaut: Math.round(e.top), champBas: Math.round(e.bottom),
            dessous: dessous.filter(Boolean).length + '/' + dessous.length, toutDessous: dessous.every(Boolean) };
        }, [champ, voile, KB, H, W]);
        dit(champNom + ' : 1. clavier ouvert, la page couvre encore tout l\'écran', r.kb && r.toutDessous && r.voileBas >= H - 1,
          'page jusqu\'à ' + r.voileBas + ' px sur ' + H + ', ' + r.dessous + ' points sous le clavier dans la page');
        dit(champNom + ' : 2. le corps s\'arrête au bord du clavier, le champ visible', Math.abs(r.corpsBas - (H - KB)) <= 1 && r.champBas <= H - KB && r.champHaut >= 0,
          'corps jusqu\'à ' + r.corpsBas + ' px, bord du clavier à ' + (H - KB) + ', champ ' + r.champHaut + '–' + r.champBas);
        if (champ === 'grpCode') {
          const lire = (c) => p.evaluate((c) => { const e = document.getElementById(c); return { curseur: getComputedStyle(e).caretColor, exemple: getComputedStyle(e, '::placeholder').color }; }, c);
          const avant = await lire(champ);
          await p.keyboard.type('A');
          await p.waitForTimeout(150);
          const apres = await lire(champ);
          const transparent = (x) => /rgba\(\d+, \d+, \d+, 0\)|transparent/.test(x);
          dit(champNom + ' : 4. touché vide, l\'exemple s\'efface et le curseur se voit ; il reste à la première lettre',
            transparent(avant.exemple) && !transparent(avant.curseur) && !transparent(apres.curseur),
            'exemple ' + avant.exemple + ', curseur ' + avant.curseur + ' -> ' + apres.curseur);
        }
        /* Le clavier redescend. */
        await p.evaluate(([c, h]) => {
          Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => h });
          document.getElementById(c).blur();
          window.visualViewport.dispatchEvent(new Event('resize'));
        }, [champ, H]);
        await p.waitForTimeout(1400);
        const f = await p.evaluate((v) => { const veil = document.getElementById(v), corps = veil && veil.querySelector('.settings-sheet');
          return { kb: document.documentElement.classList.contains('kb'), corpsBas: Math.round(corps.getBoundingClientRect().bottom), voileBas: Math.round(veil.getBoundingClientRect().bottom) }; }, voile);
        dit(champNom + ' : 3. clavier fermé, le corps reprend toute la hauteur', !f.kb && f.corpsBas >= H - 1 && f.voileBas >= H - 1, 'corps jusqu\'à ' + f.corpsBas + ' px, page jusqu\'à ' + f.voileBas);
        await ctx.close();
      }
    }
    console.log('');
    dit('5. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — clavier ouvert, la page passe dessous et son corps s\'arrête à son bord');
  process.exit(ko ? 1 : 0);
})();
