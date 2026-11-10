/* ====== BANC « LE CLAVIER D'ANDROID EN PLEIN ÉCRAN » (v359) ======
   « Aussi regarde sur Android, le clavier a toujours le même problème » —
   photo : Gboard ouvert dans une discussion de groupe, la barre d'écriture
   cachée sous sa rangée d'outils, les boutons ■ ● d'Android sous le
   clavier. Et depuis la v356 : « si je glisse vers le haut sur la barre où
   j'écris, le clavier s'ajuste parfaitement ».
   Ce que fait Chrome, lu dans son code (CompositorViewHolder, Chrome 152) :
   en plein écran, l'ancien Chrome n'annonçait le clavier qu'au premier geste
   sur la page, et pas toujours boutons compris ; le jeu le prenait pour un
   navigateur muet et passait le téléphone, pour toujours, au mode ordinaire.
   Le Chrome d'aujourd'hui annonce aussitôt une hauteur BRUTE, boutons
   compris. Reproduit ici (doublures du navigateur, marge sûre du bas
   réellement changée par Emulation.setSafeAreaInsetsOverride), dans une
   discussion de groupe, sur un Android de 412 × 915 :
     1. Chrome 155 en plein écran : hauteur brute annoncée aussitôt, la marge
        du bas qui grandit des boutons — la barre d'écriture JUSTE au-dessus
        du vrai haut du clavier (24 px au plus), pas une hauteur de boutons
        trop haut (rien compté deux fois) ;
     2. Chrome 155 sur un téléphone mis au mode ordinaire autrefois
        (bt_clavier_redim) : il en revient — l'en-tête garde
        overlays-content, le clavier est demandé par-dessus, la barre se pose
        sur le clavier annoncé ;
     3. un navigateur dont on ne sait rien (Samsung Internet), en plein
        écran, qui oublie les boutons jusqu'au premier geste sur la page :
        a. le geste (un glissement sur la barre d'écriture) : la barre se
           remet en place, et la correction est apprise (48 px) ;
        b. à l'ouverture suivante, la barre se pose TOUT DE SUITE au-dessus
           du vrai clavier — sans geste ;
        c. puis le geste (la mesure juste arrive) : la barre ne bouge pas ;
        d. au lancement suivant, toujours juste, tout de suite ;
     4. la même erreur corrigée par le navigateur tout seul, sans toucher la
        page : rien n'est appris ;
     5. sur iPhone, un toucher suivi d'un clavier qui change : rien n'est
        appris ;
     6. le relevé du clavier dit la version, le navigateur, la sorte de
        mesure, et le geste (« geste », « apres-geste ») ; un appui long
        sur « Rapports de bug », dans les Réglages, le copie (clavier et ce
        qui a été appris) sans toucher à l'interrupteur ; un toucher bref ne
        copie rien ;
     7. aucune erreur.
   Usage : node banc-essai/clavier-plein-ecran.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const CHROME = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';
const SAMSUNG = 'Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const W = 412, H = 915, KB = 330, NAV = 48;
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

/* Le navigateur simulé.
   genre « brut »   : navigator.virtualKeyboard dit le clavier aussitôt, au bas
                      de la fenêtre (le Chrome d'aujourd'hui) ;
   genre « geste »  : l'interface existe mais ne dit rien ; au mode ordinaire
                      (resizes-visual), la zone visible rétrécit du clavier SANS
                      les boutons d'Android — jusqu'au premier toucher de la
                      page, 0,15 s après lequel elle les compte ;
   genre « seul »   : la même erreur, corrigée 2 s après, sans rien toucher ;
   genre « ios »    : pas d'interface ; la zone visible rétrécit du clavier, et
                      un toucher fait apparaître 44 px de suggestions. */
const FAUX = ({ genre, pe, redimMemo }) => {
  if (redimMemo) localStorage.setItem('bt_clavier_redim', '1');
  if (pe) Object.defineProperty(Document.prototype, 'fullscreenElement', { configurable: true, get(){ return document.documentElement; } });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copie = t; return Promise.resolve(); } } });
  const ev = new EventTarget();
  const etat = { kb: 0, corrige: false, plus: 0 };
  const redim = () => { const m = document.querySelector('meta[name="viewport"]'); return !!m && /resizes-visual/.test(m.getAttribute('content') || ''); };
  const cache = () => etat.kb > 0 ? etat.kb + (etat.corrige ? 48 : 0) + etat.plus : 0;
  const fauxVV = {
    get width(){ return innerWidth; },
    get height(){ return genre === 'ios' ? innerHeight - cache() : (redim() ? innerHeight - cache() : innerHeight); },
    get offsetTop(){ return 0; }, get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  const vk = new EventTarget();
  let rect = new DOMRect(0, 0, 0, 0);
  vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
  Object.defineProperty(vk, 'boundingRect', { get(){ return rect; } });
  if (genre !== 'ios') Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
  const prevenir = () => { fauxVV.dispatchEvent(new Event('resize')); };
  window.__clavier = (h) => {
    etat.kb = h;
    if (h === 0) { etat.corrige = false; etat.plus = 0; }
    if (genre === 'brut' && vk.overlaysContent !== false) {
      rect = h > 0 ? new DOMRect(0, innerHeight - h, innerWidth, h) : new DOMRect(0, 0, 0, 0);
      vk.dispatchEvent(new Event('geometrychange'));
    }
    prevenir();
  };
  window.__corrigerSeul = () => { if (etat.kb > 0) { etat.corrige = true; prevenir(); } };
  window.addEventListener('pointerdown', () => {
    if (!(etat.kb > 0)) return;
    if (genre === 'geste') setTimeout(() => { if (etat.kb > 0 && !etat.corrige) { etat.corrige = true; prevenir(); } }, 150);
    if (genre === 'ios') setTimeout(() => { if (etat.kb > 0 && !etat.plus) { etat.plus = 44; prevenir(); } }, 150);
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    const m = document.querySelector('meta[name="viewport"]');
    if (m) new MutationObserver(prevenir).observe(m, { attributes: true });
  });
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
    await p.addInitScript(FAUX, faux);
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    const cdp = await ctx.newCDPSession(p);
    const lancer = async () => {
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.waitForTimeout(600);
      await p.evaluate(DISCUSSION);
      await p.waitForTimeout(900);
    };
    await lancer();
    const marge = (b) => cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, right: 0, bottom: b } });
    const monter = async (h) => { for (const f of [0.25, 0.5, 0.75, 1]) { await p.evaluate((x) => window.__clavier(x), Math.round(h * f)); await p.waitForTimeout(40); } };
    const descendre = async () => { for (const f of [0.5, 0]) { await p.evaluate((x) => window.__clavier(x), Math.round(KB * f)); await p.waitForTimeout(40); } };
    const barre = () => p.evaluate(() => { const c = document.getElementById('compo').getBoundingClientRect(); const t = document.querySelector('.grp-fil-tete').getBoundingClientRect();
      return { bas: Math.round(c.bottom), cx: Math.round(c.left + c.width / 2), cy: Math.round(c.top + c.height / 2), tete: Math.round(t.top) }; });
    /* Le geste de Taylor : un glissement vers le haut sur la barre d'écriture. */
    const geste = async () => {
      const b = await barre();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.cx, y: b.cy }] });
      for (let i = 1; i <= 4; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.cx, y: b.cy - i * 10 }] }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const appris = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_clavier_appris') || '[]'); } catch (e) { return 'illisible'; } });
    return { ctx, p, cdp, lancer, marge, monter, descendre, barre, geste, appris };
  };
  const juste = (bas, haut) => bas <= haut + 1 && bas >= haut - 24;

  /* 1. Chrome 155 en plein écran : hauteur brute, marge qui grandit */
  {
    const t = await ouvrir(CHROME, { genre: 'brut', pe: true });
    await t.p.locator('#compoTexte').tap();
    await t.p.waitForTimeout(120);
    await t.marge(NAV);
    await t.monter(KB + NAV);
    await t.p.waitForTimeout(900);
    const b = await t.barre();
    const vrai = H - KB - NAV;
    const memo = await t.p.evaluate(() => localStorage.getItem('bt_clavier_redim'));
    dire(juste(b.bas, vrai) && b.tete >= 0 && memo !== '1',
      '1. Chrome 155 en plein écran, hauteur brute annoncée, marge des boutons qui grandit : la barre JUSTE au-dessus du vrai clavier (bas ' + b.bas + ', clavier à ' + vrai + ' — ' + (vrai - b.bas) + ' px au-dessus), en-tête à ' + b.tete);
    await t.ctx.close();
  }

  /* 2. Chrome 155, mis au mode ordinaire autrefois : il en revient */
  {
    const t = await ouvrir(CHROME, { genre: 'brut', pe: false, redimMemo: true });
    await t.p.locator('#compoTexte').tap();
    await t.p.waitForTimeout(120);
    await t.monter(KB);
    await t.p.waitForTimeout(1500);
    const b = await t.barre();
    const etat = await t.p.evaluate(() => ({ meta: (document.querySelector('meta[name="viewport"]').getAttribute('content').match(/interactive-widget=[a-z-]+/) || [''])[0],
      par: navigator.virtualKeyboard.overlaysContent }));
    dire(etat.meta === 'interactive-widget=overlays-content' && etat.par === true && juste(b.bas, H - KB),
      '2. Chrome 155 mis au mode ordinaire autrefois : il en revient (' + etat.meta + ', clavier par-dessus : ' + etat.par + '), la barre sur le clavier annoncé (bas ' + b.bas + ', clavier à ' + (H - KB) + ')');
    await t.ctx.close();
  }

  /* 3. Un navigateur dont on ne sait rien, qui oublie les boutons jusqu'au geste */
  {
    const t = await ouvrir(SAMSUNG, { genre: 'geste', pe: true });
    const vrai = H - KB - NAV;
    await t.p.locator('#compoTexte').tap();
    await t.p.waitForTimeout(120);
    await t.monter(KB);
    await t.p.waitForTimeout(1700);
    const avant = await t.barre();
    await t.geste();
    await t.p.waitForTimeout(1600);
    const apres = await t.barre();
    const a = await t.appris();
    dire(juste(apres.bas, vrai) && Array.isArray(a) && a.length === 1 && a[0].d === NAV,
      '3a. Samsung Internet en plein écran, barre d\'abord trop basse (bas ' + avant.bas + ', vrai clavier à ' + vrai + ') ; le geste : elle se remet en place (' + apres.bas + ') et la correction est apprise (' + JSON.stringify(Array.isArray(a) ? a.map(x => x.d) : a) + ')');
    await t.descendre();
    await t.p.evaluate(() => { const z = document.getElementById('compoTexte'); if (z) z.blur(); });
    await t.p.waitForTimeout(900);
    await t.p.locator('#compoTexte').tap();
    await t.p.waitForTimeout(120);
    await t.monter(KB);
    await t.p.waitForTimeout(700);
    const ensuite = await t.barre();
    dire(juste(ensuite.bas, vrai) && ensuite.tete >= 0,
      '3b. … à l\'ouverture suivante, la barre se pose TOUT DE SUITE au-dessus du vrai clavier, sans geste (bas ' + ensuite.bas + ', clavier à ' + vrai + ')');
    await t.geste();
    await t.p.waitForTimeout(1600);
    const encore = await t.barre();
    const a2 = await t.appris();
    dire(Math.abs(encore.bas - ensuite.bas) <= 2 && juste(encore.bas, vrai) && Array.isArray(a2) && a2.length === 1,
      '3c. … puis le geste, la mesure juste arrivée : la barre ne bouge pas (' + ensuite.bas + ' → ' + encore.bas + '), rien de compté deux fois');
    /* 6. Le relevé, vu de ce téléphone */
    const rel = await t.p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_clavier_diag') || '[]'); } catch (e) { return []; } });
    const version = await t.p.evaluate(() => VERSION_JEU);
    const quoi = rel.map(r => r.quoi);
    const r0 = rel[0] || {};
    dire(rel.length >= 3 && rel.length <= 6 && quoi.includes('geste') && quoi.includes('apres-geste') && r0.v === version && r0.chrome === 0 && typeof r0.sorte === 'string' && typeof r0.mesure === 'number',
      '6a. le relevé du clavier : ' + rel.length + ' relevés (' + quoi.join(', ') + '), version ' + r0.v + ', sorte « ' + r0.sorte + ' », mesure ' + r0.mesure + ', visible ' + r0.visible + ', correction ' + r0.appris);
    await t.descendre();
    await t.p.evaluate(() => { const z = document.getElementById('compoTexte'); if (z) z.blur(); });
    await t.p.waitForTimeout(500);
    /* 3d. Au lancement suivant */
    await t.lancer();
    await t.p.locator('#compoTexte').tap();
    await t.p.waitForTimeout(120);
    await t.monter(KB);
    await t.p.waitForTimeout(800);
    const relance = await t.barre();
    dire(juste(relance.bas, vrai),
      '3d. … au lancement suivant, toujours juste, tout de suite (bas ' + relance.bas + ', clavier à ' + vrai + ')');
    await t.descendre();
    await t.p.evaluate(() => { const z = document.getElementById('compoTexte'); if (z) z.blur(); });
    await t.p.waitForTimeout(600);
    /* 6b. L'appui long sur « Rapports de bug » */
    await t.p.evaluate(() => { window.__copie = null; openSettings(); });
    await t.p.waitForTimeout(900);
    const rangee = await t.p.evaluate(() => { const s = document.getElementById('swRapport'); const r = s.closest('.set-row').getBoundingClientRect(); return { x: Math.round(r.left + 30), y: Math.round(r.top + r.height / 2), on: s.classList.contains('on') }; });
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rangee.x, y: rangee.y }] });
    await t.p.waitForTimeout(150);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await t.p.waitForTimeout(300);
    const bref = await t.p.evaluate(() => window.__copie);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rangee.x, y: rangee.y }] });
    await t.p.waitForTimeout(850);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await t.p.waitForTimeout(400);
    const copie = await t.p.evaluate(() => ({ t: window.__copie, on: document.getElementById('swRapport').classList.contains('on') }));
    let lu = null; try { lu = JSON.parse(copie.t || 'null'); } catch (e) {}
    dire(bref === null && !!lu && Array.isArray(lu.clavier) && lu.clavier.length >= 3 && Array.isArray(lu.appris) && lu.appris.length === 1 && lu.version === version && copie.on === rangee.on,
      '6b. appui long sur « Rapports de bug » : le relevé copié (' + (lu ? lu.clavier.length + ' relevés, ' + lu.appris.length + ' correction apprise, ' + lu.version : 'rien') + '), l\'interrupteur intact ; un toucher bref ne copie rien (' + (bref === null ? 'rien' : 'copié !') + ')');
    await t.ctx.close();
  }

  /* 4. Corrigé par le navigateur tout seul : rien n'est appris */
  {
    const t = await ouvrir(SAMSUNG, { genre: 'seul', pe: true });
    await t.p.locator('#compoTexte').tap();
    await t.p.waitForTimeout(120);
    await t.monter(KB);
    await t.p.waitForTimeout(2000);
    await t.p.evaluate(() => window.__corrigerSeul());
    await t.p.waitForTimeout(1500);
    const a = await t.appris();
    const b = await t.barre();
    dire(Array.isArray(a) && a.length === 0 && juste(b.bas, H - KB - NAV),
      '4. la même erreur corrigée par le navigateur tout seul, sans toucher la page : la barre suit (' + b.bas + ') et rien n\'est appris (' + JSON.stringify(a) + ')');
    await t.ctx.close();
  }

  /* 5. iPhone : rien n'est appris */
  {
    const t = await ouvrir(IOS, { genre: 'ios', pe: false });
    await t.p.locator('#compoTexte').tap();
    await t.p.waitForTimeout(120);
    await t.monter(KB);
    await t.p.waitForTimeout(1500);
    await t.geste();
    await t.p.waitForTimeout(1600);
    const a = await t.appris();
    dire(Array.isArray(a) && a.length === 0, '5. sur iPhone, un toucher suivi d\'un clavier qui change de 44 px : rien n\'est appris (' + JSON.stringify(a) + ')');
    await t.ctx.close();
  }

  dire(!errs.length, '7. aucune erreur' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await nav.close();
  console.log(ko ? `\n  ${ko} défaut(s)` : '\n  OK — en plein écran, la barre d\'écriture se pose sur le vrai haut du clavier d\'Android, boutons compris');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
