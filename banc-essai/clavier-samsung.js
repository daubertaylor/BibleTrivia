/* ====== BANC « LES BOUTONS D'ANDROID, SOUS UN CLAVIER QUE SEULE LA ZONE VISIBLE DIT » (v362) ======
   « Pour le clavier, c'est à cause des boutons retour natifs d'Android qui
     s'affichent en même temps que le clavier. »
   Le Galaxy de Taylor a Yada installé par Samsung Internet, qui ne dit pas
   son clavier au jeu : seule sa zone visible rétrécit — de la hauteur du
   clavier SANS les boutons ■ ● qu'Android fait revenir avec lui. La marge
   sûre du bas, elle, grandit de leur hauteur (réellement changée dans le
   navigateur, par Emulation.setSafeAreaInsetsOverride).
   Exigé, dans une discussion de groupe, sur deux téléphones :
     1. Samsung Internet, zone visible rétrécie SANS les boutons, marge qui
        grandit : la barre d'écriture entièrement au-dessus du vrai haut du
        clavier (boutons compris), et juste au-dessus (24 px au plus) ;
     2. Samsung Internet, témoin : zone visible rétrécie AVEC les boutons,
        marge qui ne bouge pas — même place, rien de compté deux fois ;
     3. Samsung Internet sans boutons (navigation par gestes) : zone visible
        rétrécie du clavier, marge qui ne bouge pas — barre sur le clavier ;
     4. Chrome au mode ordinaire en plein écran (zone visible mesurée sur ce
        qui reste libre, boutons compris) ET marge qui grandit : la barre
        reste sur le clavier, les boutons ne sont pas retirés deux fois ;
     5. rien ne saute quand les boutons arrivent, tout revient à sa place
        quand le clavier se range ; aucune erreur.
   Usage : node banc-essai/clavier-samsung.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const TEL = [['Galaxy S23', 360, 780, 300], ['Galaxy A', 384, 854, 320]];
const BOUTONS = 48;
/* [nom, navigateur, la zone visible rétrécit de (clavier + boutons ?), la marge grandit ?, il y a des boutons ?, mode ordinaire déjà retenu ?] */
const CAS = [
  ['Samsung Internet : zone visible sans les boutons, marge qui grandit', SAMSUNG, false, true, true, false],
  ['Samsung Internet, témoin : zone visible avec les boutons, marge immobile', SAMSUNG, true, false, true, false],
  ['Samsung Internet, navigation par gestes : pas de boutons', SAMSUNG, false, false, false, false],
  ['Chrome au mode ordinaire : zone visible avec les boutons ET marge qui grandit', CHROME, true, true, true, true],
];
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

/* La doublure du navigateur : une zone visible qui rétrécit du clavier, que
   la page le demande « par-dessus » ou non (Samsung Internet n'écoute pas),
   et un navigator.virtualKeyboard présent mais MUET. */
const FAUX = () => {
  const ev = new EventTarget();
  const etat = { kb: 0 };
  const fauxVV = {
    get width(){ return innerWidth; }, get height(){ return innerHeight - etat.kb; },
    get offsetTop(){ return 0; }, get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  const vk = new EventTarget();
  vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
  Object.defineProperty(vk, 'boundingRect', { get(){ return new DOMRect(0, 0, 0, 0); } });
  Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
  window.__clavier = (h) => { etat.kb = h; fauxVV.dispatchEvent(new Event('resize')); };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [tel, W, H, KB] of TEL) {
    for (const [nomCas, ua, zoneAvecBoutons, margeGrandit, aBoutons, ordinaire] of CAS) {
      const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(FAUX);
      await p.addInitScript((ordinaire) => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        if (ordinaire) localStorage.setItem('bt_clavier_redim', '1'); }, ordinaire);
      const cdp = await ctx.newCDPSession(p);
      const boutons = (b) => cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, right: 0, bottom: b } });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.waitForTimeout(600);
      await p.evaluate(() => {
        grp.etat = { participe: 'ok' };
        grp.liste = [{ id: 'g1', nom: 'Les amis', teinte: 2, nb_membres: 3, notifs: 'tout', non_lus: 0, mentions: 0 }];
        grp.membres.g1 = [];
        grp.profils.u2 = { nom: 'Benoît', couleur: '#E8734C' };
        const t0 = Date.now() - 3600e3;
        grp.fils.g1 = { charge: true, tout: true, lu: 0, messages: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, groupe: 'g1', auteur: i % 3 ? 'u2' : 'moi', genre: 'texte',
          texte: 'Message numéro ' + (i + 1), donnees: {}, cree_le: new Date(t0 + i * 60e3).toISOString(), masque: false, supprime_le: null })) };
        grp.courant = 'g1'; state.screen = 'groupe'; render();
      });
      await p.waitForTimeout(900);
      const pose = () => p.evaluate(() => {
        const c = document.getElementById('compo').getBoundingClientRect();
        const t = document.querySelector('.grp-fil-tete').getBoundingClientRect();
        return { tete: Math.round(t.top), compoBas: Math.round(c.bottom), pad: getComputedStyle(document.getElementById('app')).paddingBottom };
      });
      const repos = await pose();
      await p.locator('#compoTexte').tap();
      await p.waitForTimeout(150);
      /* Les boutons arrivent avec le clavier : la marge grandit (ou pas). */
      if (margeGrandit) await boutons(BOUTONS);
      await p.waitForTimeout(120);
      const boutonsLa = await pose();
      /* Le clavier monte : la zone visible rétrécit du clavier, avec ou sans les boutons. */
      const reduit = KB + (zoneAvecBoutons ? BOUTONS : 0);
      for (const f of [0.25, 0.5, 0.75, 1]) { await p.evaluate((h) => window.__clavier(h), Math.round(reduit * f)); await p.waitForTimeout(40); }
      await p.waitForTimeout(1200);
      const ouvert = await pose();
      const vraiHaut = H - KB - (aBoutons ? BOUTONS : 0);
      dire(ouvert.compoBas <= vraiHaut + 1 && ouvert.compoBas >= vraiHaut - 24 && ouvert.tete >= 0,
        tel + ', ' + nomCas + ' : la barre d\'écriture juste au-dessus du vrai haut du clavier (bas ' + ouvert.compoBas + ', clavier' + (aBoutons ? ' boutons compris' : '') + ' à ' + vraiHaut + ')');
      /* Le clavier se range, les boutons repartent. */
      for (const f of [0.66, 0.33, 0]) { await p.evaluate((h) => window.__clavier(h), Math.round(reduit * f)); await p.waitForTimeout(40); }
      await p.evaluate(() => { const z = document.getElementById('compoTexte'); if (z) z.blur(); });
      await p.waitForTimeout(200);
      if (margeGrandit) await boutons(0);
      await p.waitForTimeout(1900);
      const apres = await pose();
      dire(boutonsLa.tete === repos.tete && boutonsLa.compoBas === repos.compoBas && apres.tete === repos.tete && Math.abs(apres.compoBas - repos.compoBas) <= 1 && apres.pad === repos.pad && errs.length === 0,
        '   … rien ne saute quand les boutons arrivent (barre ' + repos.compoBas + '→' + boutonsLa.compoBas + '), tout revient à sa place ensuite (' + apres.compoBas + '), aucune erreur' + (errs.length ? ' : ' + errs[0] : ''));
      await ctx.close();
    }
  }
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — sous Samsung Internet aussi, la barre d\'écriture se pose sur le vrai haut du clavier, boutons compris');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
