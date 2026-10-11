/* ====== VERSET OUVERT : RIEN DERRIÈRE, ET AUCUNE OMBRE ROGNÉE (v314) ======
   « Lorsque j'ouvre un verset, je ne dois pas avoir l'icône de réseau
     derrière. » « Ici il ne doit pas y avoir cette sorte de rectangle
     transparent, et même partout ailleurs. »
     1. connexion faible : l'icône réseau est là ; on ouvre le verset — elle
        s'efface (son animation d'arrivée ne la retient plus) ;
     2. l'accueil et le salon d'un groupe : aucun texte dont l'ombre serait
        coupée net par une boîte (le rectangle sombre autour du nom) ;
     3. aucune erreur.
   Usage : node banc-essai/verset-reseau.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  /* ---- 1 ---- */
  await p.evaluate(() => { Object.defineProperty(RESEAU, 'etat', { configurable: true, get: () => 'faible', set: () => {} }); majIndicateurReseau(); });
  await p.waitForTimeout(900);
  const avant = await p.evaluate(() => { const r = document.querySelector('.hero-reseau'); return r ? +getComputedStyle(r).opacity : -1; });
  await p.evaluate(() => showHeroVerse());
  await p.waitForTimeout(1200);
  const pendant = await p.evaluate(() => { const r = document.querySelector('.hero-reseau'); return r ? +getComputedStyle(r).opacity : -1; });
  dit('connexion faible : l\'icône réseau est là', avant === 1, String(avant));
  dit('… et le verset ouvert, elle s\'efface', pendant === 0, String(pendant));
  /* ---- 2 ---- */
  const rognees = (sel) => p.evaluate((sel) => {
    const res = [];
    document.querySelectorAll(sel).forEach(e => {
      const cs = getComputedStyle(e);
      if (cs.textShadow === 'none') return;
      let ext = 0; cs.textShadow.split(/,(?![^(]*\))/).forEach(sh => { const n = (sh.match(/-?[\d.]+px/g) || []).map(parseFloat); if (n.length >= 3) ext = Math.max(ext, n[2] + Math.max(Math.abs(n[0]), Math.abs(n[1]))); });
      if (ext < 2) return;
      let c = e; while (c && c !== document.body) { const o = getComputedStyle(c); if (o.overflow !== 'visible') break; c = c.parentElement; }
      if (!c || c === document.body) return;
      const cb = c.getBoundingClientRect(), rg = document.createRange(); let pire = 0;
      [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).forEach(n => { rg.selectNodeContents(n); [...rg.getClientRects()].forEach(r => { pire = Math.max(pire, cb.top - (r.top - ext), r.bottom + ext - cb.bottom, cb.left - (r.left - ext), r.right + ext - cb.right); }); });
      if (pire > 3) res.push((e.className || e.tagName) + ' ' + pire.toFixed(1) + ' px');
    });
    return res;
  }, sel);
  await p.evaluate(() => hideHeroVerse()); await p.waitForTimeout(700);
  const accueil = await rognees('#app *');
  await p.evaluate(() => { grp.liste = [{ id: 'g1', nom: 'La Modération 🛡️ et un nom long', teinte: 0, non_lus: 0, nb_membres: 3, code: '7UHF5T', role: 'proprietaire' }];
    net.depuisGroupe = 'g1'; net.code = 'ABCD'; net.isHost = true; net.joueurs = {}; state.screen = 'online-room'; render(); });
  await p.waitForTimeout(1200);
  const salon = await rognees('#app *');
  dit('accueil : aucune ombre de texte coupée net par une boîte', accueil.length === 0, accueil.join(', '));
  dit('salon d\'un groupe : pas de rectangle autour du nom', salon.length === 0, salon.join(', '));
  dit('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — rien derrière le verset, aucune ombre rognée');
  process.exit(ko ? 1 : 0);
})();
