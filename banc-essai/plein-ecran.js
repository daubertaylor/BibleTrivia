/* ====== ANDROID : LE PLEIN ÉCRAN NE REFAIT PAS L'ÉCRAN (v312) ======
   « Sur Android, “30 s par question” clignote légèrement » ; « à certains
     moments l'écran peut venir à clignoter, quand j'appuie partout. »
   Dans Chrome (le jeu ouvert dans le navigateur, pas installé), le premier
   toucher fait passer en plein écran, et chaque entrée ou sortie du plein
   écran appelait render() : TOUT l'écran détruit et recréé — puces, cartes,
   couches de verre —, une image à repeindre, sur Android seulement (iOS n'a
   pas ce plein écran). Un téléphone Android, Chrome, le mode Groupe :
     1. on touche « Courte » : le jeu passe bien en plein écran ;
     2. l'écran et ses puces sont LES MÊMES objets qu'avant (rien recréé) ;
     3. la marge du haut du plein écran s'applique, l'écran tient toujours ;
     4. on sort du plein écran : toujours les mêmes objets, la marge revient ;
     5. le toucher a bien choisi « Courte » ;
     6. aucune erreur.
   Usage : node banc-essai/plein-ecran.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, userAgent: UA, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.evaluate(() => selectMode('group'));
  await p.waitForTimeout(1800);
  await p.evaluate(() => {
    window.__ecran = document.querySelector('#app > .screen:not(.screen-exit)');
    window.__puce = document.querySelector('[data-group="tmr"][data-k="30"]');
    window.__rendus = 0; const r0 = window.render; window.render = function(){ window.__rendus++; return r0.apply(this, arguments); };
  });
  const cdp = await ctx.newCDPSession(p);
  const pos = await p.evaluate(() => { const c = document.querySelector('[data-group="len"][data-k="courte"]'); const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pos.x, y: pos.y }] });
  await p.waitForTimeout(70);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(900);
  const e1 = await p.evaluate(() => { const a = document.getElementById('app'); return { fs: !!document.fullscreenElement, cls: document.documentElement.classList.contains('is-fs'), meme: document.contains(window.__ecran) && document.contains(window.__puce), rendus: window.__rendus, haut: parseFloat(getComputedStyle(a).paddingTop), deb: a.scrollHeight - a.clientHeight, courte: state.lengthKey }; });
  dit('un toucher dans Chrome fait passer en plein écran', e1.fs && e1.cls, JSON.stringify({ fs: e1.fs, cls: e1.cls }));
  dit('… sans recréer l\'écran ni ses puces', e1.meme && e1.rendus === 0, 'mêmes objets : ' + e1.meme + ', rendus : ' + e1.rendus);
  dit('… la marge du haut du plein écran s\'applique', e1.haut >= 3.4 * 16 * 0.9, e1.haut.toFixed(1) + ' px');
  dit('le toucher a bien choisi « Courte »', e1.courte === 'courte' && await p.evaluate(() => document.querySelector('[data-group="len"][data-k="courte"]').classList.contains('active')));
  await p.evaluate(() => document.exitFullscreen());
  await p.waitForTimeout(900);
  const e2 = await p.evaluate(() => { const a = document.getElementById('app'); return { fs: !!document.fullscreenElement, cls: document.documentElement.classList.contains('is-fs'), meme: document.contains(window.__ecran) && document.contains(window.__puce), rendus: window.__rendus, haut: parseFloat(getComputedStyle(a).paddingTop) }; });
  dit('on sort du plein écran : toujours les mêmes objets, la marge revient', !e2.fs && !e2.cls && e2.meme && e2.rendus === 0 && e2.haut < e1.haut, JSON.stringify(e2));
  dit('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — le plein écran d\'Android ne refait plus l\'écran');
  process.exit(ko ? 1 : 0);
})();
