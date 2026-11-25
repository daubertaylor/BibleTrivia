/* ====== BANC « À L'OUVERTURE, LA BARRE NE MONTE PLUS TROP HAUT » (v383) ======
   « Le clavier Android, il monte trop haut lors de l'ouverture, puis il
     redescend parfaitement à la bonne taille. »
   La place finale est juste ; c'est pendant la montée qu'une annonce
   passagère fait croire à un clavier plus haut. Reproduit ici sur un Android
   de 412 × 915, en plein écran, dans une discussion, sur un téléphone qui a
   appris autrefois (v359) que l'ancien Chrome oubliait les boutons d'Android
   (48 px) : Chrome annonce d'abord le clavier à l'ancienne (en haut de la
   fenêtre, sans les boutons) — la correction apprise s'y applique, la barre
   part 48 px trop haut — puis, 0,45 s après (le temps que la barre y arrive), l'annonce juste (au bas de la
   fenêtre, boutons compris) : la barre redescend.
     1. première ouverture (rien de retenu) : la barre finit juste au-dessus
        du vrai haut du clavier, comme avant ;
     2. la place posée est retenue pour cette fenêtre ; la correction apprise
        autrefois, qui n'a servi qu'en passant, est oubliée ;
     3. ouverture suivante, même annonce passagère : la barre ne monte
        JAMAIS plus haut que sa place (1 px au plus), et y finit ; et une
        autre annonce passagère (boutons compris, mais en haut de la
        fenêtre), sans rien d'appris : la place retenue borne la montée ;
     4. un clavier vraiment plus haut ensuite (les émojis, 60 px de plus) :
        la barre finit au-dessus de lui ;
     5. le relevé de l'ouverture part avec le relevé du clavier (le film de
        la montée, image par image) ;
     6. sur iPhone : rien n'est retenu, rien n'est borné ;
     7. aucune erreur.
   Usage : node banc-essai/clavier-trop-haut.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const CHROME = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const W = 412, H = 915, KB = 330, NAV = 48;
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

/* Le navigateur simulé : la zone visible ne bouge pas (le clavier est posé
   par-dessus) ; navigator.virtualKeyboard dit ce qu'on lui fait dire. Sur
   iPhone, pas d'interface : la zone visible rétrécit du clavier. */
const FAUX = ({ ios }) => {
  Object.defineProperty(Document.prototype, 'fullscreenElement', { configurable: true, get(){ return ios ? null : document.documentElement; } });
  const ev = new EventTarget();
  const etat = { kb: 0 };
  const fauxVV = {
    get width(){ return innerWidth; }, get height(){ return ios ? innerHeight - etat.kb : innerHeight; },
    get offsetTop(){ return 0; }, get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  const vk = new EventTarget();
  let rect = new DOMRect(0, 0, 0, 0);
  vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
  Object.defineProperty(vk, 'boundingRect', { get(){ return rect; } });
  if (!ios) Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
  /* r : [y, h] annoncés ; « bas » : posé au bas de la fenêtre. */
  window.__annonce = (y, h) => {
    if (ios) { etat.kb = h; fauxVV.dispatchEvent(new Event('resize')); return; }
    rect = h > 0 ? new DOMRect(0, y === 'bas' ? innerHeight - h : y, innerWidth, h) : new DOMRect(0, 0, 0, 0);
    vk.dispatchEvent(new Event('geometrychange'));
    fauxVV.dispatchEvent(new Event('resize'));
  };
};
const DISCUSSION = () => {
  grp.etat = { participe: 'ok' };
  grp.liste = [{ id: 'g1', nom: 'Les amis', teinte: 2, nb_membres: 3, notifs: 'tout', non_lus: 0, mentions: 0 }];
  grp.membres.g1 = []; grp.profils.u2 = { nom: 'Kirens', couleur: '#E8734C' };
  const t0 = Date.now() - 3600e3;
  grp.fils.g1 = { charge: true, tout: true, lu: 0, messages: Array.from({ length: 16 }, (_, i) => ({ id: i + 1, groupe: 'g1', auteur: i % 3 ? 'u2' : 'moi', genre: 'texte',
    texte: 'Message numéro ' + (i + 1), donnees: {}, cree_le: new Date(t0 + i * 60e3).toISOString(), masque: false, supprime_le: null })) };
  grp.courant = 'g1'; state.screen = 'groupe'; render();
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const ouvrir = async (ua, faux) => {
    const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route('**/pagead2.googlesyndication.com/**', (r) => r.abort());
    await p.route('**/*.supabase.co/**', (r) => r.abort());
    await p.addInitScript(FAUX, faux);
    if (faux.appris) await p.addInitScript((a) => { if (!localStorage.getItem('bt_clavier_appris')) localStorage.setItem('bt_clavier_appris', JSON.stringify([a])); }, faux.appris);
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); });
    const cdp = await ctx.newCDPSession(p);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(600);
    await p.evaluate(DISCUSSION);
    await p.waitForTimeout(900);
    const marge = (b) => cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, right: 0, bottom: b } });
    return { ctx, p, marge };
  };
  /* Une ouverture : le doigt sur la barre, l'annonce passagère (ou pas),
     puis la juste ; on filme le bas de la barre à chaque image. */
  const ouverture = async (o, { passagere = 'sans', plus = 0, ios = false } = {}) => {
    const { p, marge } = o;
    const film = p.evaluate(() => new Promise(res => {
      const l = [], t0 = performance.now();
      const tic = () => { const c = document.getElementById('compo'); l.push([Math.round(performance.now() - t0), c ? c.getBoundingClientRect().bottom : null]);
        if (performance.now() - t0 < 2000) requestAnimationFrame(tic); else res(l); };
      requestAnimationFrame(tic);
    }));
    await p.locator('#compoTexte').tap();
    await p.waitForTimeout(30);
    if (ios) { for (const f of [0.5, 1]) { await p.evaluate((h) => window.__annonce('bas', h), Math.round((KB + plus) * f)); await p.waitForTimeout(40); } }
    else {
      await marge(NAV);
      if (passagere) { await p.evaluate((h) => window.__annonce(0, h), KB + plus + (passagere === 'avec' ? NAV : 0)); await p.waitForTimeout(450); }
      await p.evaluate((h) => window.__annonce('bas', h), KB + NAV + plus);
    }
    const l = await film;
    await p.waitForTimeout(1200);           // le relevé « pose » (0,9 s)
    return l;
  };
  const fermer = async (o) => {
    const { p, marge } = o;
    await p.evaluate(() => { document.activeElement && document.activeElement.blur(); });
    await p.evaluate(() => window.__annonce('bas', 0));
    await marge(0);
    await p.waitForTimeout(900);
  };
  try {
    /* Ce que ce téléphone a appris autrefois (v359), quand l'ancien Chrome
       annonçait son clavier en haut de la fenêtre et sans les boutons : il
       manquait 48 px — la correction est restée. */
    const o = await ouvrir(CHROME, { ios: false, appris: { s: ['annonce', KB, W, H, NAV].join(','), d: 48, c: 0, t: Date.now() - 86400e3 } });
    const vrai = H - KB - NAV;
    /* 1 */
    const l1 = await ouverture(o);
    const fin1 = l1[l1.length - 1][1], haut1 = Math.min(...l1.map(x => x[1]));
    dire(fin1 <= vrai + 1 && fin1 >= vrai - 24, '1. première ouverture : la barre finit juste au-dessus du vrai haut du clavier (bas ' + Math.round(fin1) + ', clavier à ' + vrai + ' ; montée passagère jusqu\'à ' + Math.round(haut1) + ', ' + Math.round(fin1 - haut1) + ' px trop haut — rien de retenu encore)');
    /* 2 */
    const retenu = await o.p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_clavier_fin') || 'null'); } catch (e) { return null; } });
    const r2 = retenu && retenu[W + 'x' + H + ':t'];
    dire(!!r2 && Math.abs(r2.v - (H - KB - NAV)) <= 1, '2. la place posée est retenue pour cette fenêtre et ce clavier (' + JSON.stringify(retenu) + ')');
    const appris = await o.p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_clavier_appris') || '[]'); } catch (e) { return null; } });
    dire(Array.isArray(appris) && appris.length === 0, '   … et la correction apprise autrefois, qui n\'a servi qu\'en passant (pas à la place posée), est oubliée (' + JSON.stringify(appris) + ')');
    await fermer(o);
    /* 3 */
    const l3 = await ouverture(o);
    const fin3 = l3[l3.length - 1][1], haut3 = Math.min(...l3.map(x => x[1]));
    dire(haut3 >= fin3 - 1 && Math.abs(fin3 - fin1) <= 1, '3. ouverture suivante, même annonce passagère : la barre ne monte jamais plus haut que sa place (plus haut ' + Math.round(haut3) + ', posée à ' + Math.round(fin3) + ' ; avant : ' + Math.round(fin1 - haut1) + ' px trop haut)');
    await fermer(o);
    /* 3b : une autre annonce passagère (boutons compris, mais en haut de la
       fenêtre), sans rien d'appris : la place retenue borne la montée. */
    const l3b = await ouverture(o, { passagere: 'avec' });
    const fin3b = l3b[l3b.length - 1][1], haut3b = Math.min(...l3b.map(x => x[1]));
    dire(haut3b >= fin3b - 1 && Math.abs(fin3b - fin1) <= 1, '   … une autre annonce passagère (boutons compris, en haut de la fenêtre) : pas plus haut non plus (plus haut ' + Math.round(haut3b) + ', posée à ' + Math.round(fin3b) + ')');
    /* 5 */
    const rel = await o.p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_clavier_diag') || '[]'); } catch (e) { return []; } });
    const avecFilm = rel.find(r => Array.isArray(r.ouverture));
    dire(!!avecFilm && avecFilm.ouverture.length >= 3 && avecFilm.ouverture.every(x => x.length === 12) && avecFilm.ouverture.some(x => Array.isArray(x[4])) && avecFilm.ouverture.some(x => x[8] > 0),
      '5. le film de l\'ouverture part avec le relevé du clavier (' + (avecFilm ? avecFilm.ouverture.length + ' images, la borne vue : ' + Math.max(...avecFilm.ouverture.map(x => x[8])) + ' px' : 'absent') + ')');
    await fermer(o);
    /* 4 */
    const l4 = await ouverture(o, { passagere: '', plus: 60 });
    const fin4 = l4[l4.length - 1][1];
    dire(fin4 <= vrai - 60 + 1 && fin4 >= vrai - 60 - 24, '4. un clavier vraiment plus haut (émojis, +60 px) : la barre finit au-dessus de lui (bas ' + Math.round(fin4) + ', clavier à ' + (vrai - 60) + ')');
    await o.ctx.close();
    /* 6 */
    const i = await ouvrir(IOS, { ios: true });
    const li = await ouverture(i, { ios: true });
    const fini = li[li.length - 1][1];
    const rien = await i.p.evaluate(() => localStorage.getItem('bt_clavier_fin'));
    dire(rien === null && fini <= H - KB + 1 && fini >= H - KB - 24, '6. sur iPhone : rien n\'est retenu ni borné (bas ' + Math.round(fini) + ', clavier à ' + (H - KB) + ')');
    await i.ctx.close();
  } catch (e) { dire(false, 'le banc a planté : ' + (e.stack || e.message)); }
  dire(errs.length === 0, '7. aucune erreur' + (errs.length ? ' : ' + errs.slice(0, 3).join(' | ') : ''));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — à l\'ouverture, la barre va droit à sa place');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
