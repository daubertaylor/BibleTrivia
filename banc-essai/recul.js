/* ============ BANC « UNE PAGE SUR UNE PAGE » (v315) ============
   Jusqu'à la v314, ce banc suivait la couche de verre d'une FEUILLE qui
   reculait (elle rétrécissait à 0,935 sous la feuille des versions) : le décor
   vu à travers ne devait pas glisser. Depuis la v315, les feuilles sont des
   PAGES pleines, sans verre (voir LES VOLETS DEVIENNENT DES PAGES) : il n'y a
   plus de décor à travers, donc plus rien à retenir. Ce qui compte quand une
   page s'ouvre par-dessus une autre (la Version de la Bible ou la
   Confidentialité depuis les Réglages), c'est :
     1. la page du dessous GLISSE vers la gauche (-22 %) et revient, d'un
        mouvement régulier — pas de bond d'une image à l'autre ;
     2. chaque page PEINT un fond plein : rien de l'accueil ne la traverse ;
     3. l'accueil, dessous, ne se peint plus tant qu'une page le couvre
        (html.sous-page), et réapparaît dès que la dernière page commence à
        partir — pas avant, pas après.
   Usage : node banc-essai/recul.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK ' : 'KO ') + quoi + (detail ? '   (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route('**/supabase-js@2*', (route) => route.fulfill({ status:200, contentType:'application/javascript', body:'' }));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.waitForTimeout(500);

  /* Le relevé : la position à l'écran du corps des Réglages, image par image,
     pendant qu'une action se joue. */
  const sonde = (action) => p.evaluate((a) => new Promise(res => {
    const f = document.querySelector('#settingsVeil .settings-sheet');
    if (!f) return res(null);
    const rel = []; const t0 = performance.now();
    const tic = () => {
      rel.push(+f.getBoundingClientRect().left.toFixed(1));
      if (performance.now() - t0 < 900) requestAnimationFrame(tic); else res(rel);
    };
    requestAnimationFrame(tic);
    setTimeout(() => { new Function(a)(); }, 60);
  }), action);
  const juge = (nom, rel, cible) => {
    if (!rel || rel.length < 8) { dit(nom + ' : relevé', false, 'vide'); return; }
    let saut = 0;
    for (let i = 1; i < rel.length; i++) saut = Math.max(saut, Math.abs(rel[i] - rel[i - 1]));
    const fin = rel[rel.length - 1];
    dit(nom, Math.abs(fin - cible) <= 1.5 && saut <= 30, 'arrivée ' + fin + ' px pour ' + cible + ', plus grand pas ' + saut.toFixed(1) + ' px/image');
  };
  const fond = (sel) => p.evaluate((s) => {
    const v = document.querySelector(s); if (!v) return null;
    const c = getComputedStyle(v).backgroundColor;
    const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null;
    const parts = m[1].split(',').map(x => parseFloat(x));
    return { c, a: parts.length > 3 ? parts[3] : 1 };
  }, sel);
  const sousPage = () => p.evaluate(() => ({ classe: document.documentElement.classList.contains('sous-page'),
    app: getComputedStyle(document.getElementById('app')).visibility }));

  await p.evaluate(() => openSettings());
  await p.waitForTimeout(1300);
  const f0 = await fond('#settingsVeil');
  dit('la page des Réglages peint un fond plein', !!f0 && f0.a >= 0.999, f0 ? f0.c : 'introuvable');
  const s0 = await sousPage();
  dit('posée, elle cache l\'accueil (il ne se peint plus)', s0.classe && s0.app === 'hidden', JSON.stringify(s0));
  const largeur = await p.evaluate(() => innerWidth);

  for (const [nom, ouvrir, fermer, id] of [['Version de la Bible', 'openBibles()', 'closeBibles()', '#biblesVeil'],
                                           ['Confidentialité', 'ouvrirConfidentialite()', "fermerFeuilleGroupe('confidentialiteVeil')", '#confidentialiteVeil']]) {
    juge(nom + ' : les Réglages glissent à gauche', await sonde(ouvrir), Math.round(-0.22 * largeur * 10) / 10);
    const f1 = await fond(id);
    dit(nom + ' : la page du dessus peint un fond plein', !!f1 && f1.a >= 0.999, f1 ? f1.c : 'introuvable');
    const s1 = await sousPage();
    dit(nom + ' : l\'accueil reste caché sous les deux pages', s1.classe && s1.app === 'hidden', JSON.stringify(s1));
    juge(nom + ' : … et reviennent à leur place', await sonde(fermer), 0);
    await p.waitForTimeout(400);
    const s2 = await sousPage();
    dit(nom + ' : une page reste : l\'accueil reste caché', s2.classe && s2.app === 'hidden', JSON.stringify(s2));
  }

  /* La dernière page part : l'accueil réapparaît DÈS le départ. */
  const auDepart = await p.evaluate(() => new Promise(res => {
    closeSettings();
    requestAnimationFrame(() => res({ classe: document.documentElement.classList.contains('sous-page'),
      app: getComputedStyle(document.getElementById('app')).visibility }));
  }));
  dit('la dernière page qui part découvre l\'accueil dès son départ', !auDepart.classe && auDepart.app === 'visible', JSON.stringify(auDepart));
  await p.waitForTimeout(600);
  dit('aucune erreur', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — une page sur une page : elle glisse, elle couvre, et l\'accueil revient au bon moment');
  process.exit(ko ? 1 : 0);
})();
