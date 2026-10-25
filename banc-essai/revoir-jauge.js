/* ====== BANC « LA JAUGE D'À REVOIR : FIXE, OU ELLE AVANCE » (v335) ======
   « Lors de l'ouverture de cette page, j'ai la barre de progression qui se
     remplit. Fais en sorte que ça se passe de la meilleure façon : soit elle
     doit se remplir, soit elle doit rester fixe, un ou l'autre. » Elle
   repartait de zéro à chaque ouverture (et à chaque redessin), pendant que
   l'écran arrivait. Image par image, sur un iPhone et un Android :
     1. première visite, 12 rattrapées sur 15 : la jauge est à 80 % dès la
        première image, et n'en bouge pas ;
     2. on rouvre, rien n'a changé : fixe ;
     3. trois de plus rattrapées (15 sur 15), on rouvre : elle part de 80 %,
        y reste tant que l'écran arrive, puis avance jusqu'au bout, sans
        jamais reculer ;
     4. l'écran redessiné sur place : elle ne repart pas de zéro ;
     5. la semaine a glissé (des erreurs anciennes en sortent, 4 sur 8) :
        elle se pose à 50 %, sans reculer en mouvement ;
     6. aucune erreur.
   Avant la v335 : 1 à 5 rouges — elle repartait de zéro à chaque fois.
   Usage : node banc-essai/revoir-jauge.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

/* Le carnet, imité : n erreurs à rattraper, f déjà rattrapées cette semaine. */
const CARNET = ([n, f]) => {
  const e = (i) => ({ k: 'c' + i, q: 'Qui construisit l\'arche ? ' + i, options: ['Noé', 'Moïse', 'Abraham', 'David'], correct: 'Noé',
    fact: 'Noé fit une arche (Genèse 6:14).', tier: 'facile', n: 1, p: 0, maj: Date.now() - i * 60000, du: '2026-10-24' });
  aRattraper = () => Array.from({ length: n }, (_, i) => e(i));
  rattrapees = () => Array.from({ length: f }, (_, i) => e(100 + i));
};
/* Ouvre À revoir (depuis l'accueil) et relève la jauge à chaque image. */
const FILMER = (redessiner) => new Promise((ok) => {
  const t0 = performance.now(), etapes = [];
  if (redessiner) render(); else { state.screen = 'mode'; render(); setTimeout(() => {}, 0); ouvrirRevoir(); }
  /* la jauge de l'écran qui ARRIVE (celui qui part glisse encore un instant
     sous lui, avec la sienne) */
  const ecran = document.querySelector('#app > .screen:last-child');
  const pas = () => {
    const i = ecran && ecran.querySelector('.rv-jauge i');
    if (i) etapes.push([Math.round(performance.now() - t0), +new DOMMatrix(getComputedStyle(i).transform).a.toFixed(3),
      ecran ? ecran.getAnimations().filter(a => a.playState === 'running').length : 0]);
    if (performance.now() - t0 < 1500) requestAnimationFrame(pas); else ok(etapes);
  };
  requestAnimationFrame(pas);
});

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
      await p.waitForTimeout(900);
      const fixe = (e, v) => e.length > 10 && e.every(([, m]) => Math.abs(m - v) < 0.006);
      const montre = (e) => e.map(x => x[1]).filter((_, k) => k % 6 === 0).join(' ');

      /* 1 */
      await p.evaluate(CARNET, [3, 12]);
      const e1 = await p.evaluate(FILMER, false);
      dit('1. ' + tel + ', première visite (12 sur 15) : à 80 % dès la première image, et immobile', fixe(e1, 0.8), montre(e1));
      await p.waitForTimeout(300);
      /* 2 */
      const e2 = await p.evaluate(FILMER, false);
      dit('2. ' + tel + ', on rouvre sans rien changer : fixe', fixe(e2, 0.8), montre(e2));
      await p.waitForTimeout(300);
      /* 3 */
      await p.evaluate(CARNET, [0, 15]);
      const e3 = await p.evaluate(FILMER, false);
      const finArrivee = (e3.find(([, , a]) => a === 0) || [9999])[0];
      const departs = e3.filter(([t]) => t < finArrivee);
      const monotone = e3.every(([, m], k) => k === 0 || m >= e3[k - 1][1] - 0.001);
      const avance = departs.length >= 2 && departs.every(([, m]) => Math.abs(m - 0.8) < 0.006) && e3[e3.length - 1][1] === 1 && monotone
        && e3.some(([, m]) => m > 0.81 && m < 0.99);
      dit('3. ' + tel + ', trois de plus rattrapées : elle part de 80 %, attend l\'écran posé (' + finArrivee + ' ms), puis avance jusqu\'au bout', avance, montre(e3));
      await p.waitForTimeout(200);
      /* 4 */
      const e4 = await p.evaluate(FILMER, true);
      dit('4. ' + tel + ', l\'écran redessiné sur place : elle ne repart pas de zéro', fixe(e4, 1), montre(e4));
      /* 5 */
      await p.evaluate(CARNET, [4, 4]);
      const e5 = await p.evaluate(FILMER, false);
      dit('5. ' + tel + ', la semaine a glissé (4 sur 8) : posée à 50 %, sans reculer en mouvement', fixe(e5, 0.5), montre(e5));
      await ctx.close();
    }
    dit('6. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la jauge d\'À revoir est fixe, et n\'avance que quand on a avancé');
  process.exit(ko ? 1 : 0);
})();
