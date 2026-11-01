/* ====== BANC « LES BOUTONS D'ANDROID ARRIVENT AVEC LE CLAVIER » (v345) ======
   « Sur Android, l'écran saute à cause des boutons du téléphone qui
     apparaissent en même temps que le clavier, et il y a toujours la barre
     au-dessus qui cache la barre d'écriture. Refais ça bien, il faut
     absolument que ce soit parfait. »
   En plein écran, Android range ses boutons ; quand le clavier monte, il les
   fait revenir, SOUS lui. Ce que le jeu en reçoit, reproduit ici au plus
   près (marge sûre du bas réellement changée dans le navigateur, par
   Emulation.setSafeAreaInsetsOverride) :
     — la marge sûre du bas grandit d'un coup de la hauteur des boutons
       (48 px), AVANT que le clavier ne soit annoncé ;
     — Chrome annonce un clavier qui ne compte pas ces boutons, posé au bas
       d'une fenêtre qui, elle, n'a PAS rétréci ;
     — (témoin) la même chose quand la fenêtre rétrécit EN PLUS d'autant :
       rien ne doit être compté deux fois.
   Exigé, dans une discussion de groupe, sur deux Android :
     1. RIEN NE SAUTE quand les boutons arrivent : l'en-tête, la barre
        d'écriture et le bas de l'écran restent au pixel près ;
     2. la barre d'écriture ENTIÈREMENT au-dessus du vrai haut du clavier
        (boutons compris), et JUSTE au-dessus (24 px au plus) ;
     3. le clavier rangé et les boutons repartis, tout revient à sa place,
        la marge rendue au téléphone ;
     4. un champ ailleurs (le nom du profil) : la barre du bas ne saute pas
        non plus quand les boutons arrivent ;
     5. le relevé du clavier est écrit (pour la Modération), et aucune erreur.
   Usage : node banc-essai/clavier-boutons-android.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const TEL = [['Pixel 9', 412, 915, 330], ['Petit Android', 360, 740, 290]];
const BOUTONS = 48;
const CAS = [['plein écran : la fenêtre ne bouge pas, le clavier annoncé sans les boutons', false],
             ['témoin : la fenêtre rétrécit en plus de la hauteur des boutons', true]];
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

/* La doublure du navigateur : exactement celle de clavier-android-discussion.js. */
const FAUX = (mode) => {
  const ev = new EventTarget();
  const etat = { kb: 0 };
  const redim = () => { const m = document.querySelector('meta[name="viewport"]'); return !!m && /resizes-visual/.test(m.getAttribute('content') || ''); };
  const fauxVV = {
    get width(){ return innerWidth; }, get height(){ return (redim() && mode !== 'aveugle') ? innerHeight - etat.kb : innerHeight; },
    /* (v330) « pan » : dans le mode ordinaire, la zone visible glisse vers le
       bas pour montrer le champ touché, posé au bas de la page. */
    get offsetTop(){ return (mode === 'pan' && redim() && etat.kb > 0) ? Math.round(etat.kb * 0.8) : 0; },
    get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  const vk = new EventTarget();
  let rect = new DOMRect(0, 0, 0, 0);
  vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
  Object.defineProperty(vk, 'boundingRect', { get(){ return rect; } });
  if (mode !== 'absent') Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
  /* h : la hauteur du clavier ; y : la position qu'il annonce (null = la juste). */
  window.__clavier = (h, y) => {
    etat.kb = h;
    if (mode !== 'muet' && mode !== 'absent' && mode !== 'pan' && mode !== 'aveugle' && vk.overlaysContent !== false) {
      rect = h > 0 ? new DOMRect(0, y == null ? innerHeight - h : y, innerWidth, h) : new DOMRect(0, 0, 0, 0);
      vk.dispatchEvent(new Event('geometrychange'));
    }
    if (redim()) fauxVV.dispatchEvent(new Event('resize'));
  };
  /* L'en-tête change : la zone visible suit aussitôt. */
  document.addEventListener('DOMContentLoaded', () => {
    const m = document.querySelector('meta[name="viewport"]');
    if (m) new MutationObserver(() => fauxVV.dispatchEvent(new Event('resize'))).observe(m, { attributes: true });
  });
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [tel, W, H, KB] of TEL) {
    for (const [nomCas, retrecit] of CAS) {
      const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(FAUX, null);
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
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
        return { tete: Math.round(t.top), compoBas: Math.round(c.bottom), compoHaut: Math.round(c.top),
          pad: getComputedStyle(document.getElementById('app')).paddingBottom, fige: document.documentElement.classList.contains('sab-fige') };
      });
      const repos = await pose();
      await p.locator('#compoTexte').tap();
      await p.waitForTimeout(150);
      /* 1. Les boutons arrivent (avant le clavier, comme sur le téléphone). */
      await boutons(BOUTONS);
      if (retrecit) await p.setViewportSize({ width: W, height: H - BOUTONS });
      await p.waitForTimeout(120);
      const boutonsLa = await pose();
      dire(boutonsLa.tete === repos.tete && boutonsLa.compoBas === repos.compoBas && boutonsLa.pad === repos.pad,
        tel + ', ' + nomCas + ' : rien ne saute quand les boutons arrivent (en-tête ' + repos.tete + '→' + boutonsLa.tete + ', barre ' + repos.compoBas + '→' + boutonsLa.compoBas + ', marge ' + repos.pad + '→' + boutonsLa.pad + ')');
      /* 2. Le clavier monte, annoncé sans les boutons, au bas de la fenêtre telle qu'elle est. */
      for (const f of [0.25, 0.5, 0.75, 1]) { await p.evaluate((h) => window.__clavier(h, null), Math.round(KB * f)); await p.waitForTimeout(40); }
      await p.waitForTimeout(900);
      const ouvert = await pose();
      const vraiHaut = H - KB - BOUTONS;
      dire(ouvert.compoBas <= vraiHaut + 1 && ouvert.compoBas >= vraiHaut - 24 && ouvert.tete >= 0,
        '   … la barre d\'écriture juste au-dessus du vrai haut du clavier (bas ' + ouvert.compoBas + ', clavier boutons compris à ' + vraiHaut + '), l\'en-tête entier (' + ouvert.tete + ')');
      const releve = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_clavier_diag') || '[]')[0] || null; } catch (e) { return null; } });
      dire(!!releve && releve.ouvert && releve.ouvert.sab === BOUTONS && releve.repos.sab === 0 && releve.ouvert.clavier && releve.ouvert.clavier.h === KB,
        '   … le relevé du clavier est écrit (marge ' + (releve ? releve.repos.sab + '→' + releve.ouvert.sab : '—') + ', clavier ' + (releve && releve.ouvert.clavier ? releve.ouvert.clavier.h : '—') + ')');
      /* 3. Le clavier se range, le champ est quitté, les boutons repartent un peu après. */
      for (const f of [0.66, 0.33, 0]) { await p.evaluate((h) => window.__clavier(h, null), Math.round(KB * f)); await p.waitForTimeout(40); }
      await p.evaluate(() => { const z = document.getElementById('compoTexte'); if (z) z.blur(); });
      await p.waitForTimeout(200);
      await boutons(0);
      if (retrecit) await p.setViewportSize({ width: W, height: H });
      await p.waitForTimeout(1900);
      const apres = await pose();
      dire(!apres.fige && apres.tete === repos.tete && Math.abs(apres.compoBas - repos.compoBas) <= 1 && apres.pad === repos.pad,
        '   … clavier rangé, boutons repartis : tout est à sa place, la marge rendue (barre ' + apres.compoBas + ' / ' + repos.compoBas + ', figée : ' + apres.fige + ')');
      /* 4. Un champ ailleurs : le nom du profil, avec la barre du bas à l'écran. */
      if (!retrecit) {
        await p.evaluate(() => { state.screen = 'mode'; render(); });
        await p.waitForTimeout(900);
        const barre = () => p.evaluate(() => { const b = document.querySelector('.barre-bas'); return b ? Math.round(b.getBoundingClientRect().bottom) : null; });
        const b0 = await barre();
        const champ = await p.evaluate(() => {
          const i = document.createElement('input'); i.id = '__champ'; i.style.cssText = 'position:fixed;top:120px;left:20px;width:200px;height:30px;z-index:99';
          document.body.appendChild(i); return true; });
        await p.locator('#__champ').tap();
        await p.waitForTimeout(120);
        await boutons(BOUTONS);
        await p.waitForTimeout(150);
        const b1 = await barre();
        dire(b0 !== null && b1 === b0, '   … ailleurs, un champ en main : la barre du bas ne saute pas quand les boutons arrivent (' + b0 + '→' + b1 + ')');
        await p.evaluate(() => { const i = document.getElementById('__champ'); if (i) { i.blur(); i.remove(); } });
        await boutons(0);
      }
      if (errs.length) dire(false, '   erreurs : ' + errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  }
  await nav.close();
  console.log(ko ? `\n  ${ko} défaut(s)` : '\n  OK — les boutons d\'Android arrivent sans rien faire sauter, et la barre d\'écriture reste au-dessus du clavier');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
