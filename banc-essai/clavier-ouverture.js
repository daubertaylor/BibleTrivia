/* ====== BANC « LE CLAVIER D'ANDROID S'OUVRE D'UN SEUL MOUVEMENT » (v362) ======
   « Pour le clavier sur Android, c'est réglé, la barre d'écriture est bien
     placée. Mais lors de l'animation de l'ouverture, la barre d'écriture se
     comporte bizarrement, l'écran saute un peu. Fais en sorte que ça
     s'ouvre parfaitement, comme sur iOS. »
   Android annonce son clavier en plusieurs pas pendant qu'il monte (ici,
   huit pas en 0,32 s). Le Galaxy de Taylor (Samsung Internet) ne dit son
   clavier que par sa zone visible, sans les boutons ■ ● qui arrivent avec
   lui ; il avait APPRIS la correction (v359), attachée à l'annonce finale.
   On filme le bas de la barre d'écriture à chaque image, dans quatre cas :
     A. correction apprise avant la v361, marge qui grandit (les boutons
        se lisent) ;
     B. correction apprise, marge qui ne grandit pas ;
     C. rien d'appris, marge qui grandit ;
     D. iPhone : le clavier annoncé d'un coup ;
     E. (v371) Samsung, rien d'appris, marge qui grandit — et une image en
        retard au milieu (90 ms de calcul) : la marge du bas glissait sur sa
        propre horloge, la hauteur sur celle du clavier ; l'image en retard
        les désaccordait, et la barre redescendait (jusqu'à 4,7 px, au hasard
        des images, déjà sur la v365). Le retard rend le défaut plus probable,
        sans le garantir : c'est la répétition des passages qui le trouve.
   Exigé dans chaque cas :
     1. la barre finit juste au-dessus du vrai haut du clavier (boutons
        compris) — rien de compté deux fois ;
     2. elle ne redescend jamais en montant (pas d'à-coup en arrière) ;
     3. aucun saut tardif : 0,7 s après le dernier pas du clavier, elle est
        posée (moins d'un pixel de mouvement ensuite) ;
     4. aucune erreur.
   Usage : node banc-essai/clavier-ouverture.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const W = 384, H = 854, KB = 320, BOUTONS = 48;
/* [nom, ua, appris (correction apprise à l'ancienne), la marge grandit, pas (nombre d'annonces)] */
const CAS = [
  ['A. Samsung, correction apprise, marge qui grandit', SAMSUNG, true, true, 8],
  ['B. Samsung, correction apprise, marge immobile', SAMSUNG, true, false, 8],
  ['C. Samsung, rien d\'appris, marge qui grandit', SAMSUNG, false, true, 8],
  ['D. iPhone, clavier annoncé d\'un coup', IOS, false, false, 1],
  ['E. Samsung, une image en retard au milieu de l\'ouverture', SAMSUNG, false, true, 8, true],
];
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

const FAUX = () => {
  const ev = new EventTarget();
  const etat = { kb: 0 };
  const fauxVV = {
    get width(){ return innerWidth; }, get height(){ return innerHeight - etat.kb; },
    get offsetTop(){ return 0; }, get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  if (/Android/.test(navigator.userAgent)) {
    const vk = new EventTarget();
    vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
    Object.defineProperty(vk, 'boundingRect', { get(){ return new DOMRect(0, 0, 0, 0); } });
    Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
  }
  window.__clavier = (h) => { etat.kb = h; fauxVV.dispatchEvent(new Event('resize')); };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [nom, ua, appris, margeGrandit, pas, retard] of CAS) {
    const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(FAUX);
    /* La correction telle que la v359 l'apprenait sur ce téléphone : à l'annonce
       finale (zone visible = fenêtre − clavier sans les boutons), marge grandie
       ou non, il manquait les boutons. */
    const sabSig = margeGrandit ? BOUTONS : 0;
    await p.addInitScript(([appris, sig]) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      if (appris) localStorage.setItem('bt_clavier_appris', JSON.stringify([{ s: sig, d: 48, t: Date.now() - 86400e3 }]));
    }, [appris, ['zone', H - KB, W, H, sabSig].join(',')]);
    const cdp = await ctx.newCDPSession(p);
    const boutons = (b) => cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, right: 0, bottom: b } });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(600);
    await p.evaluate(() => {
      grp.etat = { participe: 'ok' };
      grp.liste = [{ id: 'g1', nom: 'Les amis', teinte: 2, nb_membres: 3, notifs: 'tout', non_lus: 0, mentions: 0 }];
      grp.membres.g1 = []; grp.profils.u2 = { nom: 'Benoît', couleur: '#E8734C' };
      const t0 = Date.now() - 3600e3;
      grp.fils.g1 = { charge: true, tout: true, lu: 0, messages: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, groupe: 'g1', auteur: i % 3 ? 'u2' : 'moi', genre: 'texte',
        texte: 'Message numéro ' + (i + 1), donnees: {}, cree_le: new Date(t0 + i * 60e3).toISOString(), masque: false, supprime_le: null })) };
      grp.courant = 'g1'; state.screen = 'groupe'; render();
    });
    await p.waitForTimeout(900);
    await p.locator('#compoTexte').tap();
    await p.waitForTimeout(120);
    if (margeGrandit) await boutons(BOUTONS);
    /* On filme le bas de la barre, image par image, pendant que le clavier monte. */
    const film = p.evaluate((ms) => new Promise(res => {
      const l = [], t0 = performance.now();
      const tic = () => { const c = document.getElementById('compo'); l.push([Math.round(performance.now() - t0), c ? c.getBoundingClientRect().bottom : null]);
        if (performance.now() - t0 < ms) requestAnimationFrame(tic); else res(l); };
      requestAnimationFrame(tic);
    }), 1700);
    const reduit = KB + (/Android/.test(ua) ? 0 : 0);
    const debut = Date.now();
    for (let i = 1; i <= pas; i++) {
      await p.evaluate((h) => window.__clavier(h), Math.round(reduit * i / pas));
      if (retard && i === 4) await p.evaluate(() => { const t = performance.now(); while (performance.now() - t < 90) {} });
      if (i < pas) await p.waitForTimeout(40);
    }
    const dernierPas = Date.now() - debut;
    const l = await film;
    const vraiHaut = H - KB - (/Android/.test(ua) ? BOUTONS : 0);
    const fin = l[l.length - 1][1];
    let recul = 0, tardif = 0;
    for (let i = 1; i < l.length; i++) {
      const d = l[i][1] - l[i - 1][1];
      if (d > recul) recul = d;                                   // la barre redescend
      if (l[i][0] > dernierPas + 700) tardif += Math.abs(d);      // elle bouge encore, longtemps après
    }
    dire(fin <= vraiHaut + 1 && fin >= vraiHaut - 24, nom + ' : la barre finit juste au-dessus du vrai haut du clavier (bas ' + Math.round(fin) + ', clavier à ' + vraiHaut + ')');
    dire(recul <= 0.5, '   … elle ne redescend jamais en montant (plus grand recul ' + recul.toFixed(1) + ' px)');
    dire(tardif <= 1, '   … aucun saut tardif : 0,7 s après le dernier pas du clavier, la barre est posée (elle bouge encore de ' + tardif.toFixed(1) + ' px)');
    dire(errs.length === 0, '   … aucune erreur' + (errs.length ? ' : ' + errs[0] : ''));
    await ctx.close();
  }
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le clavier s\'ouvre d\'un seul mouvement, la barre finit à sa place');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
