/* ====== BANC « UNE PAGE QU'ON TIRE MONTRE TOUJOURS L'ÉCRAN DU DESSOUS » (v335) ======
   « À certains moments, lorsque je ferme la page, ça fait ça : corrige. »
   (capture de Taylor : « Les règles de la communauté » qui part vers la
   droite, et à gauche le désert nu — l'écran des groupes n'était plus là.)
   Une page posée cache l'écran du dessous (html.sous-page : il ne se peint
   plus) ; on le rend dès qu'on la tire du bord. Mais deux minuteurs le
   recachaient EN RETARD : le filet de l'arrivée, et le retour en place d'une
   page lâchée trop tôt. Tirer la page pendant l'un d'eux, et le désert
   apparaissait sous le doigt. Sur un iPhone et sur un Android, de vrais
   doigts (événements tactiles), depuis l'écran des groupes :
     1. « Les règles » posée : les groupes, dessous, ne se peignent plus ;
     2. tirée du bord : les groupes se voient sous elle, elle suit le doigt ;
        lâchée loin, elle part, et les groupes restent là jusqu'au bout ;
     3. tirée AUSSITÔT ouverte (avant la fin de son arrivée), et tenue plus
        longtemps que le filet de l'arrivée : les groupes se voient tout du
        long, jusqu'à ce qu'elle parte ;
     4. lâchée trop tôt (elle revient), puis reprise AUSSITÔT : les groupes se
        voient tout du long, et la page reste sous le doigt — elle ne saute
        pas en place quand le retour, annulé, aurait dû finir ;
     5. lâchée trop tôt et laissée revenir : posée à sa place, elle recache
        les groupes ;
     6. une page sur une page (la Confidentialité sur les Réglages) : en la
        tirant, ce sont les Réglages qu'on voit dessous ; partie, les Réglages
        couvrent l'accueil, qui ne se peint plus ;
     7. aucune erreur.
   Avant la v335 : 3 et 4 rouges (le désert sous le doigt), et 6 (l'accueil
   se peignait encore, pour rien, sous les Réglages).
   Usage : node banc-essai/page-dessous.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

/* L'écran des groupes, posé à la main (comme photo-groupe-grand). */
const DECOR = () => {
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  compte.dispo = true; profile.name = 'Taylor';
  compte.session = { user: { id: 'moi-0', email: 'joueur@exemple.net' } }; compte.etape = 'connecte';
  grp.installe = true; grp.ouverts = true; grp.message = '';
  grp.etat = { participe: 'ok', moderateur: false, ouverts: true, photos: true, logos: true };
  grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' } };
  grp.liste = [{ id: 'g-1', nom: 'Teste', teinte: 2, logo: 3, ouvert: false, code: 'ABC234', nb_membres: 1, non_lus: 0, dernier_message: il(0.1), apercu: null }];
  grp.publics = [];
  grp.courant = null; state.screen = 'groupes'; render();
};
/* Ce qu'on voit, à l'instant : l'écran du dessous, et la page. */
const ETAT = (id) => {
  const v = document.getElementById(id);
  const app = document.getElementById('app');
  const x = v ? new DOMMatrix(getComputedStyle(v).transform).m41 : null;
  return { cache: document.documentElement.classList.contains('sous-page'), app: getComputedStyle(app).visibility,
    page: v ? { posee: v.classList.contains('posee'), tiree: v.classList.contains('tiree'), part: v.classList.contains('closing'), x: Math.round(x) } : null };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(DECOR);
      await p.waitForTimeout(1200);
      const cdp = await ctx.newCDPSession(p);
      const Y = 420;
      const doigt = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: Y }] });
      /* Tirer jusqu'à x, par pas de 18 px, une image par pas (ou plus lentement). */
      const tirer = async (de, a, pause) => { for (let x = de + 18; x <= a; x += 18) { await doigt('touchMove', x); await p.waitForTimeout(pause || 16); } };
      const etat = (id) => p.evaluate(ETAT, id || 'grpReglesVeil');
      const vu = (e) => !e.cache && e.app === 'visible';
      const ouvrir = () => p.evaluate(() => ouvrirRegles());
      const partie = async () => { await p.waitForTimeout(800); return p.evaluate(() => !document.getElementById('grpReglesVeil')); };

      /* 1 */
      await ouvrir();
      await p.waitForTimeout(1200);
      const e1 = await etat();
      dit('1. ' + tel + ' : « Les règles » posée, les groupes dessous ne se peignent plus', e1.cache && e1.app === 'hidden' && e1.page.posee, JSON.stringify(e1));

      /* 2 */
      await doigt('touchStart', 6); await tirer(6, 114);
      const e2a = await etat();
      await tirer(114, 330);
      await doigt('touchEnd');
      const e2b = await etat();
      const finie2 = await partie();
      const e2c = await etat();
      dit('2. ' + tel + ' : tirée, les groupes se voient sous elle et elle suit le doigt ; lâchée loin, elle part sur les groupes',
        vu(e2a) && e2a.page.tiree && e2a.page.x > 80 && vu(e2b) && e2b.page.part && finie2 && vu(e2c), JSON.stringify({ e2a, e2b, e2c }));

      /* 3 : saisie AVANT la fin de son arrivée — dès que son bord touche
         celui de l'écran, le doigt peut la prendre, dans le dernier dixième
         de seconde de sa course — et tenue plus longtemps que le filet de
         l'arrivée. On s'assure que l'arrivée n'a pas eu le temps de finir
         (sinon on recommence : le cas n'aurait pas été joué). */
      let e3a = null, e3b = null, e3c = null, finie3 = false, joue = false;
      for (let essai = 0; essai < 4 && !joue; essai++) {
        await ouvrir();
        await p.evaluate(() => { window.__arrivee = false; document.getElementById('grpReglesVeil').addEventListener('animationend', (e) => { if (e.animationName === 'pageIn') window.__arrivee = true; }); });
        await p.waitForFunction(() => { const v = document.getElementById('grpReglesVeil'); return !!v && new DOMMatrix(getComputedStyle(v).transform).m41 <= 2; }, null, { polling: 'raf', timeout: 3000 });
        await doigt('touchStart', 1);
        await tirer(1, 91, 70);                                  /* ≈ 0,35 s */
        joue = await p.evaluate(() => !window.__arrivee);
        if (!joue) { await doigt('touchEnd'); await p.evaluate(() => fermerFeuilleGroupe('grpReglesVeil')); await p.waitForTimeout(900); continue; }
        e3a = await etat();
        const filet = await p.evaluate(() => msPli() + 180);
        await p.waitForTimeout(filet);                           /* le filet est tombé, le doigt toujours là */
        await doigt('touchMove', 100);
        e3b = await etat();
        await tirer(100, 340);
        await doigt('touchEnd');
        e3c = await etat();
        finie3 = await partie();
      }
      dit('3. ' + tel + ' : saisie avant la fin de son arrivée et tenue : les groupes se voient tout du long, jusqu\'à ce qu\'elle parte',
        joue && vu(e3a) && e3a.page.tiree && vu(e3b) && e3b.page.tiree && e3b.page.x > 80 && vu(e3c) && e3c.page.part && finie3, JSON.stringify({ joue, e3a, e3b, e3c }));

      /* 4 : lâchée trop tôt, puis reprise aussitôt */
      await ouvrir();
      await p.waitForTimeout(1200);
      await doigt('touchStart', 6); await tirer(6, 78, 60); await doigt('touchEnd');
      const e4a = await etat();
      await p.waitForTimeout(110);
      await doigt('touchStart', 6); await tirer(6, 96, 30);
      await p.waitForTimeout(420);                               /* le retour annulé aurait fini ici */
      await doigt('touchMove', 100);
      await p.waitForTimeout(40);
      const e4b = await etat();
      await tirer(100, 340);
      await doigt('touchEnd');
      const e4c = await etat();
      const finie4 = await partie();
      dit('4. ' + tel + ' : lâchée trop tôt puis reprise aussitôt : les groupes se voient tout du long, la page reste sous le doigt',
        vu(e4a) && vu(e4b) && e4b.page.tiree && e4b.page.x > 70 && vu(e4c) && e4c.page.part && finie4, JSON.stringify({ e4a, e4b, e4c }));

      /* 5 : lâchée trop tôt et laissée revenir */
      await ouvrir();
      await p.waitForTimeout(1200);
      await doigt('touchStart', 6); await tirer(6, 78, 60); await doigt('touchEnd');
      const e5a = await etat();
      await p.waitForTimeout(600);
      const e5b = await etat();
      dit('5. ' + tel + ' : laissée revenir, elle se repose à sa place et recache les groupes',
        vu(e5a) && e5b.cache && e5b.app === 'hidden' && !e5b.page.tiree && e5b.page.x === 0, JSON.stringify({ e5a, e5b }));
      await p.evaluate(() => fermerFeuilleGroupe('grpReglesVeil'));
      await p.waitForTimeout(800);

      /* 6 : une page sur une page */
      await p.evaluate(() => { state.screen = 'mode'; render(); });
      await p.waitForTimeout(700);
      await p.evaluate(() => openSettings());
      await p.waitForTimeout(1200);
      await p.evaluate(() => ouvrirConfidentialite());
      await p.waitForTimeout(1200);
      await doigt('touchStart', 6); await tirer(6, 150);
      const e6a = await p.evaluate(() => { const el = document.elementFromPoint(40, 420); return { dessous: !!(el && el.closest('#settingsVeil')), quoi: el ? (el.id || el.className || el.tagName) : null }; });
      await tirer(150, 340);
      await doigt('touchEnd');
      await p.waitForTimeout(800);
      const e6b = await etat('settingsVeil');
      const plusConf = await p.evaluate(() => !document.getElementById('confidentialiteVeil'));
      dit('6. ' + tel + ' : la Confidentialité tirée montre les Réglages dessous ; partie, les Réglages cachent l\'accueil',
        e6a.dessous && plusConf && e6b.cache && e6b.app === 'hidden' && e6b.page.posee, JSON.stringify({ e6a, e6b, plusConf }));
      await ctx.close();
    }
    dit('7. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — une page qu\'on tire montre toujours l\'écran du dessous');
  process.exit(ko ? 1 : 0);
})();
