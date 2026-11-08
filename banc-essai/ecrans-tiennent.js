/* ====== TROIS ÉCRANS QUI TIENNENT DANS LE TÉLÉPHONE (v350) ======
   « Le bouton pour lancer la partie n'est pas dans l'écran. » — « Sur la
     progression c'est pareil : sur certains téléphones c'est bien ajusté, sur
     d'autres comme le mien je dois swipe. » — « Sur l'écran des résultats en
     mode groupe, je veux que je n'aie pas à glisser vers le bas si c'est
     possible. »
   Avec les VRAIES zones sûres (Emulation.setSafeAreaInsetsOverride : un
   navigateur sans tête les met à zéro, et l'on mesure alors un téléphone qui
   n'existe pas), sur l'iPhone de Taylor (17 Pro), un 13 mini, un Pro Max et
   un SE, installés :
     1. le Mode Groupe tient, à 3 comme à 6 joueurs : rien ne défile, et
        « Commencer la partie » est entier à l'écran ;
     2. ses six places gardent la même hauteur, et rien de ce qu'elles
        portent n'est rogné — même un nom sur deux lignes ;
     3. ses puces (durée, chrono, testament) ont exactement la taille de
        celles du Solo ;
     4. les résultats du Groupe tiennent, à 4 joueurs partout, à 5 sur les
        téléphones à encoche ; « Rejouer » et « Quitter » sont entiers à
        l'écran, et le trophée garde au moins 60 % de sa taille ;
     5. la Progression tient ;
     6. un écran qui tient déjà ne bouge pas d'un pixel (le Solo, sur les
        téléphones à encoche) ;
   (« Entier à l'écran » : à un pixel près — la boîte d'un bouton tombe sur
   des fractions de pixel, celle du Solo comme les autres.)
     7. aucune erreur.
   Usage : node banc-essai/ecrans-tiennent.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const TELS = [
  ['iPhone 17 Pro', 402, 874, 62, 34, true],
  ['iPhone 13 mini', 375, 812, 50, 34, true],
  ['iPhone 15 Pro Max', 430, 932, 59, 34, true],
  ['iPhone SE', 375, 667, 20, 0, false],
];
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

async function page(nav, W, H, HT, BS) {
  const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: HT, bottom: BS, left: 0, right: 0 } });
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(() => {
    if (!/^http/.test(location.protocol)) return;
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.evaluate(() => document.documentElement.classList.add('is-standalone'));
  await p.waitForTimeout(600);
  return p;
}
/* Pose un écran comme le jeu le pose, attend qu'il soit arrivé, puis lit. */
async function poser(p, js) {
  await p.evaluate(js);
  await p.waitForFunction(() => document.querySelectorAll('#app > .screen').length === 1 && !document.querySelector('#app > .arrivee'), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(900);
  await p.evaluate(() => { try { fitScroll(); } catch (e) {} });
  await p.waitForTimeout(150);
}
const lire = (p, sel) => p.evaluate((sel) => {
  const a = document.getElementById('app'), cs = getComputedStyle(a);
  const s = document.querySelector('#app > .screen');
  const fond = a.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom);
  const bs = sel ? [...s.querySelectorAll(sel)] : [];
  const pire = bs.length ? Math.max(...bs.map(b => b.getBoundingClientRect().bottom - fond)) : null;
  return { d: Math.round(a.scrollHeight - a.clientHeight), ov: a.style.overflowY, bouton: pire == null ? null : Math.round(pire * 10) / 10, n: bs.length, serre: !!s._serre };
}, sel || null);
const equipes = (n, long) => `state.teams=[]; for(let i=0;i<${n};i++) state.teams.push({ name: i===0 ? 'Taylor' : (${long ? 'i===1' : 'false'} ? 'Les Apôtres de Jean' : 'Joueur '+(i+1)) });`;
const GROUPE = (n, long) => `state.mode='group'; state.revision=false; ${equipes(n, long)} state.screen='setup'; render();`;
const FIN = (n) => `state.mode='group'; state.revision=false; ${equipes(n, false)} state.scores=state.teams.map((t,i)=>120-i*20); state.screen='end'; render();`;
const PROGRESSION = `state.screen='mode'; render(); openParcours();`;
const SOLO = `state.mode='solo'; state.revision=false; state.screen='setup'; render();`;

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const f = { groupe: [], places: [], puces: [], fin: [], medaille: [], prog: [], solo: [], err: [] };
  try {
    for (const [nom, W, H, HT, BS, encoche] of TELS) {
      const p = await page(nav, W, H, HT, BS);
      /* 1 */
      for (const n of [3, 6]) {
        await poser(p, GROUPE(n, false));
        const r = await lire(p, '.btn-primary');
        if (!(r.d <= 2 && r.ov === 'hidden' && r.n === 1 && r.bouton <= 1)) f.groupe.push(nom + ' à ' + n + ' ' + JSON.stringify(r));
      }
      /* 2 : les places, à 3 joueurs (dont un nom sur deux lignes) */
      for (const long of [false, true]) {
        await poser(p, GROUPE(3, long));
        const r = await p.evaluate(() => {
          const bs = [...document.querySelectorAll('#app > .screen .pl-btn')];
          const hs = bs.map(b => b.getBoundingClientRect().height);
          let rogne = [];
          bs.forEach((b, i) => { const rb = b.getBoundingClientRect();
            [...b.children].forEach(c => { const rc = c.getBoundingClientRect();
              if (rc.height && (rc.top < rb.top - 0.5 || rc.bottom > rb.bottom + 0.5)) rogne.push(i + ':' + c.className); });
            const nm = b.querySelector('.pl-nom'); if (nm && nm.scrollHeight > nm.clientHeight + 1) rogne.push(i + ':nom coupé'); });
          return { n: bs.length, ecart: Math.round((Math.max(...hs) - Math.min(...hs)) * 10) / 10, h: Math.round(Math.min(...hs)), rogne };
        });
        if (!(r.n === 6 && r.ecart <= 0.5 && !r.rogne.length)) f.places.push(nom + (long ? ' (nom long) ' : ' ') + JSON.stringify(r));
      }
      /* 3 : les puces du Groupe et du Solo, une à une */
      const puces = async () => p.evaluate(() => [...document.querySelectorAll('#app > .screen .chip')].map(c => { const r = c.getBoundingClientRect(); return Math.round(r.width * 10) / 10 + 'x' + Math.round(r.height * 10) / 10; }));
      await poser(p, GROUPE(3, false)); const pg = await puces();
      await poser(p, SOLO); const ps = await puces();
      if (!(pg.length >= 7 && pg.join() === ps.join())) f.puces.push(nom + ' groupe ' + pg.join(' ') + ' | solo ' + ps.join(' '));
      /* 6 : le Solo (vient d'être posé) tient sans qu'on y touche — sur les
         téléphones à encoche ; le SE, lui, le resserrait déjà avant la v350. */
      if (encoche) { const r = await lire(p, '.btn-primary');
        const style = await p.evaluate(() => [...document.querySelectorAll('#app > .screen, #app > .screen *')].filter(e => /margin|padding|height|gap|width/.test(e.getAttribute('style') || '') && !e.classList.contains('ins')).map(e => e.className + ':' + e.getAttribute('style')).slice(0, 3));
        if (!(r.d <= 2 && !r.serre && r.bouton <= 1)) f.solo.push(nom + ' ' + JSON.stringify(r) + ' ' + style.join(' | ')); }
      /* 4 */
      for (const n of (encoche ? [4, 5] : [4])) {
        await poser(p, FIN(n));
        const r = await lire(p, '.end-actions button');
        const m = await p.evaluate(() => { const e = document.querySelector('#app > .screen .end-medal'); if (!e) return null;
          const vu = e.getBoundingClientRect().width; const avant = e.style.width; e.style.width = ''; const plein = e.getBoundingClientRect().width; e.style.width = avant; return Math.round(vu / plein * 100); });
        if (!(r.d <= 2 && r.ov === 'hidden' && r.n === 2 && r.bouton <= 1)) f.fin.push(nom + ' à ' + n + ' ' + JSON.stringify(r));
        if (!(m >= 60)) f.medaille.push(nom + ' à ' + n + ' : ' + m + ' %');
      }
      /* 5 */
      await poser(p, PROGRESSION);
      { const r = await lire(p, null); if (!(r.d <= 2 && r.ov === 'hidden')) f.prog.push(nom + ' ' + JSON.stringify(r)); }
      if (p._errs.length) f.err.push(nom + ' : ' + [...new Set(p._errs)].slice(0, 2).join(' | '));
      await p.context().close();
    }
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('1. le Mode Groupe tient, à 3 comme à 6 joueurs : rien ne défile, « Commencer la partie » entier à l\'écran', !f.groupe.length, f.groupe.join(' | ') || TELS.map(t => t[0]).join(', '));
  dit('2. ses six places gardent la même hauteur, et rien de ce qu\'elles portent n\'est rogné — même un nom sur deux lignes', !f.places.length, f.places.join(' | '));
  dit('3. ses puces ont exactement la taille de celles du Solo', !f.puces.length, f.puces.join(' | '));
  dit('4. les résultats du Groupe tiennent (4 joueurs partout, 5 sur les téléphones à encoche), « Rejouer » et « Quitter » entiers', !f.fin.length, f.fin.join(' | '));
  dit('   …et le trophée garde au moins 60 % de sa taille', !f.medaille.length, f.medaille.join(' | '));
  dit('5. la Progression tient', !f.prog.length, f.prog.join(' | '));
  dit('6. un écran qui tient déjà ne bouge pas d\'un pixel (le Solo)', !f.solo.length, f.solo.join(' | '));
  dit('7. aucune erreur', !f.err.length, f.err.join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le Mode Groupe, ses résultats et la Progression tiennent dans le téléphone');
  process.exit(ko ? 1 : 0);
})();
