/* ====== ANDROID : LE PLEIN ÉCRAN S'INSTALLE ENTRE DEUX ÉCRANS (v312, v319) ======
   « Sur Android, “30 s par question” clignote légèrement » ; « à certains
     moments l'écran peut venir à clignoter, quand j'appuie partout. » (v312)
   « Sur Android, lorsque j'ajoute ou que je retire des joueurs, ça ne fait
     pas comme sur iOS, et en plus ça clignote bizarrement. » (v319)
   Dans Chrome (le jeu ouvert dans le navigateur, pas installé), le jeu passe
   en plein écran. Deux défauts, l'un après l'autre :
     — v312 : chaque entrée ou sortie du plein écran appelait render() — TOUT
       l'écran détruit et recréé ;
     — v319 : le plein écran se demandait à CHAQUE toucher tant qu'on n'y
       était pas, puces et croix comprises. Sorti du plein écran, le joueur y
       était renvoyé par la puce suivante : la fenêtre grandissait, la marge
       du haut passait de 6 à 58 px, et tout l'écran glissait au milieu du
       geste. Mesuré sur la v318 : trois puces touchées, trois demandes.
   Il ne se demande plus qu'au CHANGEMENT D'ÉCRAN. Un téléphone Android,
   Chrome, le mode Groupe :
     1. on touche « Courte », puis la croix d'un joueur : la puce est prise,
        le joueur part, et le plein écran n'est PAS demandé — rien ne change
        d'écran, rien ne doit bouger ;
     2. on touche la flèche du retour : l'accueil arrive, et le plein écran
        s'installe avec lui ;
     3. le plein écran ne refait pas l'écran : un seul rendu (celui du
        retour), et l'accueil reste le même objet une fois la fenêtre agrandie ;
     4. la marge du haut du plein écran s'applique ;
     5. on sort du plein écran : toujours les mêmes objets, la marge revient,
        aucun rendu ;
     6. on rouvre le Mode Groupe : le plein écran revient AVEC l'écran ;
     7. on en sort de nouveau, puis on touche une puce : il ne revient PAS ;
     8. premier toucher sur la croix d'un joueur (autre téléphone) : c'est CE
        joueur qui part (sur la v311 : on touchait Chloé, Benoît partait — la
        page avait glissé sous le doigt), la carte se replie sans être
        reconstruite ni rebondir, et aucune demande de plein écran ;
     9. aucune erreur.
   Usage : node banc-essai/plein-ecran.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

/* Les demandes de plein écran sont comptées, et elles passent quand même. */
const preparer = () => {
  localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
  window.__demandes = 0;
  const o = Element.prototype.requestFullscreen;
  Element.prototype.requestFullscreen = function () { window.__demandes++; return o.apply(this, arguments); };
};
const centre = (p, sel, n) => p.evaluate(([s, i]) => { const el = document.querySelectorAll(s)[i || 0]; if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, [sel, n || 0]);
const toucher = async (cdp, p, pos, attente) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pos.x, y: pos.y }] });
  await p.waitForTimeout(70);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(attente || 900);
};
const etat = (p) => p.evaluate(() => { const a = document.getElementById('app'); return {
  fs: !!document.fullscreenElement, cls: document.documentElement.classList.contains('is-fs'),
  demandes: window.__demandes, rendus: window.__rendus, ecran: state.screen,
  meme: !!window.__ecran && document.contains(window.__ecran), haut: parseFloat(getComputedStyle(a).paddingTop) }; });

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, userAgent: UA, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(preparer);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.evaluate(() => { state.teams = [{ name: 'Anne' }, { name: 'Benoît' }, { name: 'Chloé' }]; selectMode('group'); });
    await p.waitForTimeout(1800);
    await p.evaluate(() => { window.__rendus = 0; const r0 = window.render; window.render = function () { window.__rendus++; return r0.apply(this, arguments); }; });
    const cdp = await ctx.newCDPSession(p);
    /* ---- 1 ---- */
    await toucher(cdp, p, await centre(p, '[data-group="len"][data-k="courte"]'));
    await toucher(cdp, p, await centre(p, '#teamCard .team-remove', 2));
    const e1 = await etat(p);
    const pris = await p.evaluate(() => ({ courte: state.lengthKey, noms: state.teams.map(t => t.name).join(',') }));
    dit('1. une puce et une croix : choisies, retirée — et aucune demande de plein écran', pris.courte === 'courte' && pris.noms === 'Anne,Benoît' && e1.demandes === 0 && !e1.fs,
      'durée ' + pris.courte + ', joueurs ' + pris.noms + ', demandes ' + e1.demandes + ', plein écran ' + e1.fs);
    /* ---- 2-4 ---- */
    await p.evaluate(() => { document.addEventListener('fullscreenchange', () => { window.__ecran = document.querySelector('#app > .screen:not(.screen-exit)'); }); window.__rendus = 0; });
    await toucher(cdp, p, await centre(p, '.app-header .icon-btn'), 1200);
    const e2 = await etat(p);
    dit('2. la flèche du retour : l\'accueil arrive, et le plein écran avec lui', e2.ecran === 'mode' && e2.fs && e2.cls && e2.demandes === 1,
      JSON.stringify({ ecran: e2.ecran, fs: e2.fs, cls: e2.cls, demandes: e2.demandes }));
    dit('3. … sans refaire l\'écran : un seul rendu, et le même accueil après l\'agrandissement', e2.rendus === 1 && e2.meme, 'rendus ' + e2.rendus + ', même objet ' + e2.meme);
    dit('4. … la marge du haut du plein écran s\'applique', e2.haut >= 3.4 * 16 * 0.9, e2.haut.toFixed(1) + ' px');
    /* ---- 5 ---- */
    await p.evaluate(() => { window.__ecran = document.querySelector('#app > .screen:not(.screen-exit)'); window.__rendus = 0; return document.exitFullscreen(); });
    await p.waitForTimeout(900);
    const e3 = await etat(p);
    dit('5. on sort du plein écran : mêmes objets, la marge revient, aucun rendu', !e3.fs && !e3.cls && e3.meme && e3.rendus === 0 && e3.haut < e2.haut,
      JSON.stringify({ fs: e3.fs, cls: e3.cls, meme: e3.meme, rendus: e3.rendus, haut: +e3.haut.toFixed(1) }));
    /* ---- 6 ---- */
    await toucher(cdp, p, await centre(p, '.mode-card[onclick*="group"]'), 1500);
    const e4 = await etat(p);
    dit('6. on rouvre le Mode Groupe : le plein écran revient avec l\'écran', e4.ecran === 'setup' && e4.fs && e4.demandes === 2, JSON.stringify({ ecran: e4.ecran, fs: e4.fs, demandes: e4.demandes }));
    /* ---- 7 ---- */
    await p.evaluate(() => document.exitFullscreen());
    await p.waitForTimeout(900);
    await toucher(cdp, p, await centre(p, '[data-group="len"][data-k="longue"]'));
    const e5 = await etat(p);
    const longue = await p.evaluate(() => state.lengthKey);
    dit('7. sorti du plein écran, une puce ne le redemande pas', longue === 'longue' && !e5.fs && e5.demandes === 2, 'durée ' + longue + ', plein écran ' + e5.fs + ', demandes ' + e5.demandes);
    await ctx.close();

    /* ---- 8 : le premier toucher est la croix d'un joueur ---- */
    const ctx2 = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, userAgent: UA, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const q = await ctx2.newPage();
    q.on('pageerror', e => errs.push(e.message));
    await q.addInitScript(preparer);
    await q.goto(URL);
    await q.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await q.evaluate(() => { state.teams = [{ name: 'Anne' }, { name: 'Benoît' }, { name: 'Chloé' }, { name: 'Damien' }]; selectMode('group'); });
    await q.waitForTimeout(1800);
    const c2 = await ctx2.newCDPSession(q);
    const croix = await q.evaluate(() => { window.__carte = document.getElementById('teamCard'); const b = document.querySelectorAll('#teamCard .team-remove')[2].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    /* le film de la carte pendant le repli : sa hauteur, image par image */
    const film = q.evaluate(() => new Promise(res => { const l = []; const t0 = performance.now(); const tic = () => { const c = document.getElementById('teamCard'); l.push(c ? c.getBoundingClientRect().height : -1); if (performance.now() - t0 < 1400) requestAnimationFrame(tic); else res(l); }; requestAnimationFrame(tic); }));
    await c2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: croix.x, y: croix.y }] });
    await q.waitForTimeout(70);
    await c2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const h = await film;
    const fin = await q.evaluate(() => ({ meme: document.contains(window.__carte), noms: state.teams.map(t => t.name).join(','), lignes: document.querySelectorAll('#teamCard .team-row:not([data-partie])').length, fs: !!document.fullscreenElement, demandes: window.__demandes }));
    let remonte = 0; for (let i = 1; i < h.length; i++) if (h[i] > h[i - 1] + 0.5) remonte = Math.max(remonte, h[i] - h[i - 1]);
    dit('8. premier toucher sur la croix d\'un joueur : CE joueur part, la carte se replie sans être reconstruite ni rebondir, sans plein écran',
      fin.noms === 'Anne,Benoît,Damien' && fin.lignes === 3 && fin.meme && remonte === 0 && !fin.fs && fin.demandes === 0,
      fin.noms + ', même carte ' + fin.meme + ', plus grand rebond ' + remonte.toFixed(1) + ' px, demandes ' + fin.demandes);
    await ctx2.close();
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 400)); ko++;
  }
  dit('9. aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — le plein écran d\'Android s\'installe entre deux écrans, jamais pendant un geste');
  process.exit(ko ? 1 : 0);
})();
