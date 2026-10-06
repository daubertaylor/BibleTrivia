/* ====== LE CLAVIER DANS UNE DISCUSSION (v312) ======
   « Lorsque j'ouvre le clavier, ça va très vite et ça fait un peu mal de
     tête — notamment dans les discussions : c'est même un peu saccadé. »
   « Je parle en message, puis j'appuie sur le i : vérifie que la
     superposition est bonne. »
   Un téléphone de la taille d'un iPhone 16 Pro, un clavier de 346 px que le
   VRAI module du clavier voit monter (visualViewport réduit, puis resize) :
     1. clavier ouvert, l'EN-TÊTE NE BOUGE PAS (il sortait par le haut) ;
     2. le champ est posé au-dessus du clavier, et le dernier message reste
        sous les yeux ;
     3. la page elle-même ne défile pas (#app.scrollTop = 0) ;
     4. on touche « i », clavier ouvert — que le champ perde le foyer avant le
        toucher (Android) ou après (iOS) : la feuille monte d'UN SEUL
        mouvement, du bas de l'écran, sans jamais redescendre ;
     5. aucune erreur.
   Usage : node banc-essai/clavier-discussion.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const W = 402, H = 874, KB = 346;
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'ok   ' : 'KO   ') + q + (d ? '   (' + d + ')' : '')); };

async function telephone(nav){
  const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 62, bottom: 34, left: 0, right: 0 } });
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.evaluate(() => {
    document.documentElement.classList.add('is-standalone');
    compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
    grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: true };
    grp.liste = [{ id: 'g1', nom: 'Les amis du jeudi', teinte: 2, non_lus: 0, nb_membres: 2, code: '7UHF5T', role: 'proprietaire' }];
    grp.membres = { g1: [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null }, { membre: 'u-2', role: 'membre', muet_jusqu: null }] };
    grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' } };
    const t = Date.now(), msgs = [];
    for (let i = 1; i <= 24; i++) msgs.push({ id: i, groupe: 'g1', auteur: i % 3 ? 'u-2' : 'moi-0', genre: 'texte', texte: (i === 24 ? 'Le dernier message' : 'Message numéro ' + i), cree_le: new Date(t - (30 - i) * 60000).toISOString() });
    grp.fils = { g1: { charge: true, tout: true, messages: msgs } };
    grp.courant = 'g1'; state.screen = 'groupe'; render();
  });
  await p.waitForTimeout(1300);
  await p.evaluate(([kb, h]) => {
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => (window.__kb ? h - kb : h) });
  }, [KB, H]);
  return { p, ctx, errs };
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ---- 1 à 3 : le clavier s'ouvre dans la discussion ---- */
  {
    const { p, ctx, errs } = await telephone(nav);
    const avant = await p.evaluate(() => Math.round(document.querySelector('.grp-fil-tete').getBoundingClientRect().top));
    /* L'en-tête, image par image, pendant que le clavier monte (en paliers, comme iOS) */
    const trajet = await p.evaluate(([kb, h]) => new Promise(res => {
      const hauts = [];
      document.getElementById('compoTexte').focus({ preventScroll: true });
      let n = 0;
      const palier = () => { n++; window.__kb = true; Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => h - Math.round(kb * Math.min(1, n / 5)) });
        window.visualViewport.dispatchEvent(new Event('resize')); if (n < 5) setTimeout(palier, 22); };
      setTimeout(palier, 30);
      const t0 = performance.now();
      const pas = () => { hauts.push(Math.round(document.querySelector('.grp-fil-tete').getBoundingClientRect().top)); if (performance.now() - t0 < 900) requestAnimationFrame(pas); else res(hauts); };
      requestAnimationFrame(pas);
    }), [KB, H]);
    const bouge = Math.max(...trajet.map(v => Math.abs(v - avant)));
    dit('clavier ouvert : l\'en-tête de la discussion ne bouge pas', bouge <= 1, 'écart max ' + bouge + ' px');
    const r = await p.evaluate((bord) => {
      const c = document.getElementById('compoTexte').getBoundingClientRect();
      const z = document.getElementById('fil');
      const der = [...z.querySelectorAll('.b-bulle')].pop().getBoundingClientRect();
      const fz = z.getBoundingClientRect();
      return { champ: Math.round(c.bottom), bord, dernier: Math.round(der.bottom), filBas: Math.round(fz.bottom), app: document.getElementById('app').scrollTop };
    }, H - KB);
    dit('le champ est au-dessus du clavier', r.champ <= r.bord, 'bas du champ ' + r.champ + ' / bord ' + r.bord);
    dit('… et le dernier message reste sous les yeux', r.dernier <= r.filBas + 1, 'dernier ' + r.dernier + ' / bas du fil ' + r.filBas);
    dit('la page ne défile pas', r.app === 0, 'scrollTop ' + r.app);
    if (errs.length) dit('aucune erreur', false, errs.slice(0, 2).join(' | '));
    await ctx.close();
  }

  /* ---- 4 : « i », clavier ouvert, dans les deux ordres ---- */
  for (const [nom, avantToucher] of [['iOS : le champ garde le foyer', false], ['Android : le champ perd le foyer d\'abord', true]]) {
    const { p, ctx, errs } = await telephone(nav);
    await p.evaluate(() => { window.__kb = true; document.getElementById('compoTexte').focus({ preventScroll: true }); window.visualViewport.dispatchEvent(new Event('resize')); });
    await p.waitForTimeout(800);
    const hauts = await p.evaluate((avantToucher) => new Promise(res => {
      const h = [];
      if (avantToucher) document.getElementById('compoTexte').blur();
      ouvrirInfosGroupe();
      setTimeout(() => { window.__kb = false; window.visualViewport.dispatchEvent(new Event('resize')); }, 80);
      const t0 = performance.now();
      const pas = () => { const f = document.querySelector('#grpInfosVeil .settings-sheet'); if (f) h.push(Math.round(f.getBoundingClientRect().top)); if (performance.now() - t0 < 950) requestAnimationFrame(pas); else res(h); };
      requestAnimationFrame(pas);
    }), avantToucher);
    let recul = 0; for (let i = 1; i < hauts.length; i++) if (hauts[i] > hauts[i - 1]) recul = Math.max(recul, hauts[i] - hauts[i - 1]);
    dit(nom + ' : la feuille monte d\'un seul mouvement', recul <= 1, 'plus grand recul ' + recul + ' px');
    dit(nom + ' : … depuis le bas de l\'écran', hauts[0] >= H - 2, 'départ à ' + hauts[0] + ' px');
    if (errs.length) dit('aucune erreur', false, errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — le clavier ne fait plus bouger la discussion, et la feuille monte d\'un trait');
  process.exit(ko ? 1 : 0);
})();
