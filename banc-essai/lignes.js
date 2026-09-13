/* ============ BANC « LES LIGNES DE JOUEURS » ============
   « Lorsque j'ajoute un joueur, que je le retire, ou que je touche le champ
   pour ouvrir le clavier, ça saute — une sorte de clignotement. »
   Trois gestes, et trois façons de sauter :
     ajout    la carte grandit — le mouvement doit être monotone, sans retour ;
     retrait  la carte rétrécit, puis la ligne QUITTE le DOM. Ce dernier instant
              ne doit rien changer du tout. Il changeait 2 px : en border-box,
              une boîte qui porte 1 px de bordure en haut et en bas ne descend
              pas sous 2 px, le repli s'arrêtait donc là et les 2 px partaient
              d'un coup avec le noeud ;
     clavier  la fenêtre rétrécit et le champ doit se dégager. Le défilement
              était POSÉ (scrollTop = cible) : 45 px avalés en une image.
   On vérifie aussi qu'aucune couche de verre n'est détruite puis recréée — une
   surface qui perd son verre une image apparaît nue, et c'est un clignotement
   que la géométrie ne montre pas.
   Usage : node banc-essai/lignes.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const suivre = (ms) => new Promise((res) => {
  const app = document.getElementById('app');
  const t0 = performance.now(); const rel = [];
  const tic = () => {
    const t = performance.now() - t0;
    const c = document.getElementById('teamCard');
    const b = c ? c.getBoundingClientRect() : null;
    rel.push({ t: Math.round(t),
      haut: b ? Math.round(b.top * 10) / 10 : null,
      haute: b ? Math.round(b.height * 10) / 10 : null,
      n: c ? c.querySelectorAll('.team-row').length : 0,
      st: Math.round(app.scrollTop * 10) / 10 });
    if (t < ms) requestAnimationFrame(tic); else res(rel);
  };
  requestAnimationFrame(tic);
});

/* Le plus grand retour en arrière d'une suite : un mouvement qui repart dans
   l'autre sens, c'est ce que l'oeil lit comme un clignotement. */
function retour(rel, cle) {
  let sens = 0, pire = 0, quand = 0;
  for (let i = 1; i < rel.length; i++) {
    if (rel[i][cle] === null || rel[i-1][cle] === null) continue;
    const d = rel[i][cle] - rel[i-1][cle];
    if (Math.abs(d) < 0.15) continue;
    const ns = Math.sign(d);
    if (sens && ns !== sens && Math.abs(d) > pire) { pire = Math.abs(d); quand = rel[i].t; }
    sens = ns;
  }
  return [pire, quand];
}
/* Le plus grand pas d'une seule image. */
function pas(rel, cle) {
  let pire = 0, quand = 0;
  for (let i = 1; i < rel.length; i++) {
    if (rel[i][cle] === null || rel[i-1][cle] === null) continue;
    const d = Math.abs(rel[i][cle] - rel[i-1][cle]);
    if (d > pire) { pire = d; quand = rel[i].t; }
  }
  return [pire, quand];
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.evaluate(() => { state.mode = 'group'; state.teams = [{name:'Taylor'},{name:'Bea'},{name:'Chris'}]; state.screen = 'setup'; render(); });
  await p.waitForTimeout(1200);

  const sceller = () => {
    window.__n = window.__n || 0;
    document.querySelectorAll('.gs, .glass-rim').forEach(e => { if (!e.dataset.sceau) e.dataset.sceau = 's' + (++window.__n); });
    return [...document.querySelectorAll('.gs, .glass-rim')].map(e => e.dataset.sceau);
  };

  let ok = true;
  console.log('  geste                retour en arrière   marche au retrait   plus grand pas   verre recréé');

  /* ---------- AJOUT ---------- */
  let avant = await p.evaluate(sceller);
  let cap = p.evaluate(suivre, 1300);
  await p.evaluate(() => addTeam());
  let rel = await cap;
  let apres = await p.evaluate(sceller);
  let recrees = avant.filter(s => !apres.includes(s)).length;
  let [r1] = retour(rel, 'haute');
  let mauvais = r1 > 0.6 || recrees > 0;
  if (mauvais) ok = false;
  console.log('  ' + 'ajouter'.padEnd(20) + (r1.toFixed(1) + ' px').padStart(14) + '                 ' +
    '—'.padStart(6) + '        ' + recrees + (mauvais ? '   <-- CLIGNOTEMENT' : ''));
  await p.waitForTimeout(500);

  /* ---------- RETRAIT ---------- */
  avant = await p.evaluate(sceller);
  cap = p.evaluate(suivre, 1300);
  await p.evaluate(() => { removeTeam(document.querySelectorAll('.team-remove')[1]); });
  rel = await cap;
  apres = await p.evaluate(sceller);
  /* Une ligne qui part emporte légitimement SA couche et son rebord : deux. */
  recrees = Math.max(0, avant.filter(s => !apres.includes(s)).length - 2);
  const [r2] = retour(rel, 'haute');
  let marche = 0, quandM = 0;
  for (let i = 1; i < rel.length; i++) {
    if (rel[i].n !== rel[i-1].n && rel[i].haute !== null && rel[i-1].haute !== null) {
      const d = Math.abs(rel[i].haute - rel[i-1].haute);
      if (d > marche) { marche = d; quandM = rel[i].t; }
    }
  }
  mauvais = r2 > 0.6 || marche > 0.6 || recrees > 0;
  if (mauvais) ok = false;
  console.log('  ' + 'retirer'.padEnd(20) + (r2.toFixed(1) + ' px').padStart(14) +
    (marche.toFixed(1) + ' px').padStart(20) + '        ' + '—'.padStart(6) + '        ' + recrees +
    (mauvais ? '   <-- ' + (marche > 0.6 ? 'MARCHE À ' + quandM + ' MS' : 'CLIGNOTEMENT') : ''));
  await p.waitForTimeout(500);

  /* ---------- CLAVIER ---------- */
  await p.evaluate(() => { document.querySelector('.team-row input').focus(); });
  await p.waitForTimeout(200);
  cap = p.evaluate(suivre, 1400);
  await p.setViewportSize({ width:393, height:516 });   // le clavier monte, et reste
  rel = await cap;
  const [r3] = retour(rel, 'haut');
  const [p3, quandP] = pas(rel, 'haut');
  mauvais = r3 > 0.6 || p3 > 20;
  if (mauvais) ok = false;
  console.log('  ' + 'clavier'.padEnd(20) + (r3.toFixed(1) + ' px').padStart(14) + '                 ' +
    '—'.padStart(6) + (p3.toFixed(0) + ' px').padStart(9) + '        —' +
    (mauvais ? '   <-- ' + (p3 > 20 ? 'SAUT DE ' + p3.toFixed(0) + ' PX À ' + quandP + ' MS' : 'CLIGNOTEMENT') : ''));

  if (errs.length) { ok = false; console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ok ? '\n  OK — les lignes de joueurs ne sautent plus' : '\n  ÉCHEC');
  process.exit(ok ? 0 : 1);
})();
