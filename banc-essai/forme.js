/* ===================== BANC « FORME DE L'ONDE » =====================
   « Lorsque je reste appuyé sur une croix, le petit truc rosé apparaît en
   carré. »
   L'onde d'appui est un ::before à border-radius:inherit : elle a donc
   EXACTEMENT la forme du bouton. Un bouton sans arrondi donne une tache
   carrée sous le doigt — et la croix de retrait était le seul du jeu dans ce
   cas, au milieu d'une ligne, elle, arrondie.
   Le banc parcourt les écrans, prend chaque bouton qui peint réellement une
   onde (certains la neutralisent, comme la poignée des feuilles) et vérifie
   deux choses : le bouton a un arrondi, et l'onde porte le même.
   Usage : node banc-essai/forme.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

const ECRANS = [
  ['accueil',     "state.screen='mode'; render();"],
  ['groupe',      "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'},{name:'D'}]; state.screen='setup'; render();"],
  ['jeu solo',    "state.mode='solo'; startGame();"],
  ['progression', "state.screen='parcours'; render();"],
  ['profil',      "state.screen='profile'; render();"],
  ['réglages',    "state.screen='mode'; render(); openSettings();"],
  ['en ligne',    "closeSettings(); state.screen='online'; render();"],
  ['résultats',   "state.mode='group'; state.teams=[{name:'Taylor',score:20},{name:'B',score:5},{name:'C',score:0}]; state.screen='results'; render();"],
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  const vus = new Map();
  for (const [nom, prep] of ECRANS) {
    try { await p.evaluate((s) => { new Function(s)(); }, prep); } catch(e){ console.log('  (' + nom + ' injoignable)'); continue; }
    await p.waitForTimeout(900);
    const l = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('button, .mode-card').forEach(e => {
        const b = e.getBoundingClientRect();
        if (b.width < 3 || b.height < 3) return;
        const cs = getComputedStyle(e), av = getComputedStyle(e, '::before');
        /* L'onde peint-elle vraiment ? Certains boutons remplacent ce ::before
           par un agrandisseur de zone tactile, transparent. */
        const fond = av.backgroundColor || '';
        const m = fond.match(/rgba?\(([^)]+)\)/);
        const alpha = m ? (m[1].split(',')[3] === undefined ? 1 : parseFloat(m[1].split(',')[3])) : 0;
        if (!(alpha > 0.02)) return;
        out.push({
          cls: (e.className||'').toString().split(' ').filter(Boolean).slice(0,2).join('.') || e.tagName.toLowerCase(),
          w: Math.round(b.width), h: Math.round(b.height),
          rb: +(parseFloat(cs.borderTopLeftRadius)||0).toFixed(1),
          ro: +(parseFloat(av.borderTopLeftRadius)||0).toFixed(1),
        });
      });
      return out;
    });
    for (const e of l) { const k = e.cls + '|' + e.w + 'x' + e.h; if (!vus.has(k)) vus.set(k, { ...e, ecran:nom }); }
  }
  await nav.close();

  const fautifs = [...vus.values()].filter(e => e.rb < 2 || Math.abs(e.rb - e.ro) > 0.6);
  console.log('  boutons qui peignent une onde : ' + vus.size + '\n');
  console.log('  écran         bouton                      taille   arrondi   onde');
  for (const e of [...vus.values()].sort((a,b) => a.rb - b.rb).slice(0, fautifs.length ? 999 : 6)) {
    const mauvais = e.rb < 2 || Math.abs(e.rb - e.ro) > 0.6;
    console.log('  ' + e.ecran.padEnd(13) + e.cls.padEnd(27) + (e.w + '×' + e.h).padStart(8) +
      (e.rb + ' px').padStart(10) + (e.ro + ' px').padStart(9) +
      (mauvais ? (e.rb < 2 ? '   <-- ONDE CARRÉE' : '   <-- L ONDE N A PAS LA FORME DU BOUTON') : ''));
  }
  if (!fautifs.length) console.log('  …' + Math.max(0, vus.size - 6) + ' autres, tous arrondis');
  console.log(fautifs.length ? '\n  ÉCHEC' : '\n  OK — chaque onde a la forme de son bouton');
  process.exit(fautifs.length ? 1 : 0);
})();
