/* ====== BANC « LE DÉCOR NE BOUGE PAS QUAND LE CLAVIER S'OUVRE » (v332) ======
   « Sur Android, lorsque j'ouvre ou que je ferme le clavier, le décor se
     décale. Je veux que ce soit exactement pareil qu'iOS. » (photo : la page
   des Groupes, la recherche touchée.) Trois façons, pour un navigateur
   Android, de faire de la place au clavier — et l'iPhone :
     — Chrome, qui DIT son clavier et pose tout par-dessus (rien ne bouge) ;
     — la zone visible qui rétrécit et GLISSE vers le bas (mode ordinaire) ;
     — la fenêtre entière qui RÉTRÉCIT (le comportement d'autrefois) ;
     — l'iPhone (la zone visible rétrécit, sans glisser).
   Pour chacun, sur le Profil (le nom) et sur les Groupes (la recherche) :
   la place du décor À L'ÉCRAN (glissement compris) et sa taille — avant le
   clavier, clavier ouvert, clavier rangé — sont les mêmes au pixel près.
   Aucune erreur.
   Usage : node banc-essai/decor-clavier.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const W = 412, H = 915, KB = 330;
const MODES = [['Chrome (le clavier dit, par-dessus)', 'chrome', AND], ['zone visible qui glisse', 'pan', AND], ['fenêtre qui rétrécit', 'contenu', AND], ['iPhone', 'ios', IOS]];
const PAGES = [['Profil · le nom', `state.screen='profile'; render();`, '#profileName'], ['Groupes · la recherche', `__grp(); state.screen='groupes'; render();`, '.grp-cherche']];
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

/* Le navigateur simulé (voir clavier-android-discussion.js). « contenu » : la
   vraie fenêtre rétrécit (le banc la redimensionne), rien à simuler ici. */
const FAUX = ([mode]) => {
  if (mode === 'contenu') return;
  if (mode === 'pan') localStorage.setItem('bt_clavier_redim', '1');
  const ev = new EventTarget();
  const etat = { kb: 0 };
  const fauxVV = {
    get width(){ return innerWidth; },
    get height(){ return mode === 'chrome' ? innerHeight : innerHeight - etat.kb; },
    get offsetTop(){ return (mode === 'pan' && etat.kb > 0) ? Math.round(etat.kb * 0.6) : 0; },
    get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  if (mode === 'chrome' || mode === 'pan') {
    const vk = new EventTarget();
    let rect = new DOMRect(0, 0, 0, 0);
    vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
    Object.defineProperty(vk, 'boundingRect', { get(){ return rect; } });
    Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
    window.__vk = (h) => { if (mode === 'chrome'){ rect = h > 0 ? new DOMRect(0, innerHeight - h, innerWidth, h) : new DOMRect(0, 0, 0, 0); vk.dispatchEvent(new Event('geometrychange')); } };
  }
  window.__clavier = (h) => { etat.kb = h; if (window.__vk) window.__vk(h); fauxVV.dispatchEvent(new Event('resize')); };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const [nomMode, mode, ua] of MODES) {
      console.log('  — ' + nomMode);
      for (const [nomPage, ouvrir, champ] of PAGES) {
        const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, userAgent: ua, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
        const p = await ctx.newPage();
        p.on('pageerror', e => errs.push(e.message));
        await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await p.addInitScript(FAUX, [mode]);
        await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
        await p.goto(URL);
        await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
        await p.evaluate(() => { window.__grp = () => { document.documentElement.classList.add('is-standalone');
          compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
          grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false }; grp.liste = []; grp.publics = []; }; });
        await p.evaluate((o) => { new Function(o)(); }, ouvrir);
        await p.waitForTimeout(1000);
        /* Le décor, À L'ÉCRAN : sa place moins le glissement de la zone visible. */
        const decor = () => p.evaluate(() => {
          const dv = (window.visualViewport && visualViewport.offsetTop) || 0;
          return ['bg-layer', 'bg-overlay', 'bg-grain'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return Math.round(r.top - dv) + '/' + Math.round(r.height); }).join(' ');
        });
        const repos = await decor();
        await p.locator(champ).tap();
        await p.waitForTimeout(120);
        const pendant = [];
        if (mode === 'contenu') {
          for (const f of [0.33, 0.66, 1]) { await p.setViewportSize({ width: W, height: H - Math.round(KB * f) }); await p.waitForTimeout(60); pendant.push(await decor()); }
        } else {
          for (const f of [0.25, 0.5, 0.75, 1]) { await p.evaluate((h) => window.__clavier(h), Math.round(KB * f)); await p.waitForTimeout(50); pendant.push(await decor()); }
        }
        await p.waitForTimeout(900);
        const ouvert = await decor();
        const kb = await p.evaluate(() => document.documentElement.classList.contains('kb'));
        if (mode === 'contenu') { for (const f of [0.66, 0.33, 0]) { await p.setViewportSize({ width: W, height: H - Math.round(KB * f) }); await p.waitForTimeout(60); pendant.push(await decor()); } }
        else { for (const f of [0.66, 0.33, 0]) { await p.evaluate((h) => window.__clavier(h), Math.round(KB * f)); await p.waitForTimeout(50); pendant.push(await decor()); } }
        await p.evaluate(() => document.activeElement && document.activeElement.blur());
        await p.waitForTimeout(800);
        const range = await decor();
        const bouge = pendant.filter(x => x !== repos);
        dit(nomPage + ' : le décor ne bouge pas d\'un pixel (clavier ' + (kb ? 'vu' : 'NON VU') + ')', kb && ouvert === repos && range === repos && !bouge.length,
          'repos ' + repos + ' · ouvert ' + ouvert + ' · rangé ' + range + (bouge.length ? ' · en route ' + bouge.slice(0, 2).join(' | ') : ''));
        await ctx.close();
      }
    }
    dit('aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — clavier ouvert ou rangé, Android comme iPhone : le décor ne bouge pas d\'un pixel');
  process.exit(ko ? 1 : 0);
})();
