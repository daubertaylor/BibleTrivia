/* ===================== BANC « PASTILLE DE JOUEUR » =====================
   « Les photos de profil ne correspondent pas avec le profil ailleurs. C'est
   légèrement différent. »
   La pastille ronde qui porte l'initiale d'un joueur apparaît à sept endroits
   et dans quatre tailles. Elle doit être partout LA MÊME MATIÈRE : le dégradé
   à 150° (la couleur éclaircie de 68 % en haut à gauche), aucun anneau
   visible, un rond parfait. Deux d'entre elles vivaient à part — celle du
   podium et celle du profil : couleur à plat et anneau blanc de 2 px.
   Le banc relève la matière de chacune, sur son écran, et refuse la moindre
   divergence. Le tiret de la place VIDE (.waiting) est le seul trait admis :
   c'est ce qui dit « personne ici ».
   Usage : node banc-essai/jeton.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

const CIBLES = [
  ['accueil',    "state.screen='mode'; render();",                                                                                  '.hero-profile .avatar'],
  ['profil',     "state.screen='profile'; render();",                                                                               '.profile-card .avatar'],
  ['groupe',     "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'}]; state.screen='setup'; render();",         '.team-token'],
  /* Les jetons d'attribution vivent SUR l'écran de jeu, une fois la réponse
     révélée — il n'y a pas d'écran « points » à part. */
  ['points',     "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'}]; startGame(); state.revealed=true; render();", '.aw-token'],
  ['résultats',  "state.mode='group'; state.scores=[20,5,0]; state.screen='results'; render();",                                     '.podium-avatar'],
  ['résultats',  '',                                                                                                                '.rank-token'],
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' })); });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  let ok = true;
  console.log('  écran        pastille                taille   matière     anneau visible   rond');
  for (const [ecran, prep, sel] of CIBLES) {
    if (prep) { try { await p.evaluate((s) => { new Function(s)(); }, prep); } catch(e){} await p.waitForTimeout(900); }
    const r = await p.evaluate((sel) => {
      const e = document.querySelector(sel); if (!e) return null;
      const cs = getComputedStyle(e), b = e.getBoundingClientRect();
      /* Un anneau ne compte que s'il se VOIT : une bordure large mais
         entièrement transparente ne peint rien. */
      const l = parseFloat(cs.borderTopWidth) || 0;
      const m = (cs.borderTopColor || '').match(/rgba?\(([^)]+)\)/);
      const alpha = m ? (m[1].split(',')[3] === undefined ? 1 : parseFloat(m[1].split(',')[3])) : 0;
      return { taille: Math.round(b.width) + '×' + Math.round(b.height),
               degrade: /linear-gradient\(150deg/.test(cs.backgroundImage),
               anneau: (l > 0.5 && alpha > 0.02) ? (l.toFixed(0) + ' px') : 'aucun',
               rond: cs.borderTopLeftRadius };
    }, sel);
    if (!r) { console.log('  ' + ecran.padEnd(12) + sel.padEnd(24) + ' INTROUVABLE'); ok = false; continue; }
    const mauvais = !r.degrade || r.anneau !== 'aucun' || r.rond !== '50%';
    if (mauvais) ok = false;
    console.log('  ' + ecran.padEnd(12) + sel.padEnd(24) + r.taille.padStart(8) +
      (r.degrade ? '   dégradé' : '   À PLAT ').padEnd(12) + r.anneau.padStart(11) + r.rond.padStart(9) +
      (mauvais ? '   <-- ' + (!r.degrade ? 'PAS LA MÊME MATIÈRE' : r.anneau !== 'aucun' ? 'ANNEAU EN TROP' : 'PAS RONDE') : ''));
  }
  await nav.close();
  console.log(ok ? '\n  OK — une seule pastille de joueur, partout' : '\n  ÉCHEC');
  process.exit(ok ? 0 : 1);
})();
