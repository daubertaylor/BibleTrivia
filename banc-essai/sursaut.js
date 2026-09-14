/* ============ BANC « ÇA S'OUVRE BIEN, PUIS ÇA SAUTE » ============
   « Il y a toujours le saut lorsque j'ouvre les réglages : en fait ça s'ouvre
   parfaitement bien puis ensuite ça saute, et ça fait ça à certains endroits
   où il y a un menu déroulant. »
   Le défaut n'est donc PAS dans la montée — elle est propre — mais APRÈS. On
   relève donc la position de la feuille et celle de son contenu image par
   image pendant deux secondes, et on ne juge que ce qui se passe UNE FOIS LA
   MONTÉE FINIE : à partir de là, plus rien ne doit bouger, pas d'un pixel.
   Usage : node sursaut.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/* Ce qu'on suit : le haut de la feuille, et le haut de son PREMIER contenu
   (le titre). Si la feuille est immobile mais que le titre glisse, c'est le
   contenu qui a sauté — et c'est ce qu'on voit. */
const suivre = (ms) => new Promise((res) => {
  const t0 = performance.now(); const rel = [];
  const tic = () => {
    const t = performance.now() - t0;
    const f = document.querySelector('.sheet-veil:not(.closing) .settings-sheet');
    if (f) {
      const b = f.getBoundingClientRect();
      const ti = f.querySelector('.sheet-title, .set-row, .rv-choix, .fs-row');
      const bt = ti ? ti.getBoundingClientRect() : null;
      const gs = f.querySelector(':scope > .gs');
      const bg = gs ? gs.getBoundingClientRect() : null;
      rel.push({ t: Math.round(t),
        f: Math.round(b.top * 10) / 10, h: Math.round(b.height * 10) / 10,
        c: bt ? Math.round(bt.top * 10) / 10 : null,
        g: bg ? Math.round(bg.top * 10) / 10 : null });
    }
    if (t < ms) requestAnimationFrame(tic); else res(rel);
  };
  requestAnimationFrame(tic);
});

function bouge(rel, cle, apres){
  let pire = 0, quand = 0, base = null;
  for (const e of rel) {
    if (e.t < apres || e[cle] === null) continue;
    if (base === null) { base = e[cle]; continue; }
    const d = Math.abs(e[cle] - base);
    if (d > pire) { pire = d; quand = e.t; }
  }
  return [pire, quand];
}

const CAS = [
  ['réglages',   "openSettings()",                       "closeSettings()"],
  ['versions',   "openSettings(); setTimeout(()=>{ try{ openBibles(); }catch(e){} }, 700)", "try{closeBibles()}catch(e){}; closeSettings()"],
  ['flamme',     "ouvrirFlamme()",                       "closeFlamme()"],
  /* « À revoir » n'est plus une feuille depuis la v221 : c'est un écran. Il
     n'a donc plus rien à faire dans un banc qui juge des feuilles — il est
     éprouvé par revoir.js, qui le juge en tant qu'écran. */
];
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    const k = (n)=>{ const d=new Date(Date.now()-n*86400000); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
    localStorage.setItem('bt_daily', JSON.stringify({ last:k(1), streak:5, jours:[k(1),k(2),k(3)], geles:[], gels:1, parties:12 }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  /* un carnet non vide, pour que la feuille « à revoir » ait du contenu */
  await p.evaluate(() => {
    const tous = []; ['facile','moyen','difficile'].forEach(t=>(BANK[t]||[]).forEach(q=>tous.push(Object.assign({}, q, {tier:t}))));
    const pris = tous.filter(q=>bookOf(q)).slice(0, 9);
    localStorage.setItem('bt_errbook', JSON.stringify(pris.map(q=>({ k:qKey(q), n:1, p:0, du:dayKey(-1), q:q.q, options:q.options, correct:q.correct, fact:q.fact, tier:q.tier }))));
    render();
  });
  await p.waitForTimeout(600);
  const pli = await p.evaluate(()=>msPli());
  const apres = pli + 90;   // marge : la montée est finie, largement
  let ok = true;
  console.log('  (montée = ' + pli + ' ms ; on ne juge que ce qui bouge APRÈS ' + apres + ' ms)\n');
  console.log('  feuille        la feuille     son contenu     sa couche de verre');
  for (const [nom, ouvrir, fermer] of CAS) {
    const attente = /openBibles/.test(ouvrir) ? 900 : 0;
    const cap = p.evaluate(suivre, 2000 + attente);
    await p.evaluate((c)=>{ new Function(c)(); }, ouvrir);
    const rel = await cap;
    const [df, tf] = bouge(rel, 'f', apres + attente);
    const [dc, tc] = bouge(rel, 'c', apres + attente);
    const [dg, tg] = bouge(rel, 'g', apres + attente);
    const mauvais = df > 0.6 || dc > 0.6 || dg > 0.6;
    if (mauvais) ok = false;
    console.log('  ' + nom.padEnd(14)
      + (df.toFixed(1) + ' px').padStart(9) + (df > 0.6 ? ' @' + tf : '   ')
      + (dc.toFixed(1) + ' px').padStart(12) + (dc > 0.6 ? ' @' + tc : '   ')
      + (dg.toFixed(1) + ' px').padStart(15) + (dg > 0.6 ? ' @' + tg : '')
      + (mauvais ? '   <-- SAUT' : ''));
    await p.evaluate((c)=>{ new Function(c)(); }, fermer);
    await p.waitForTimeout(700);
  }
  if (errs.length) { ok = false; console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ok ? '\n  OK — une fois ouverte, la feuille ne bouge plus' : '\n  ÉCHEC');
  process.exit(ok ? 0 : 1);
})();
