/* ===================== BANC « PASTILLE DE JOUEUR » =====================
   « Je veux que le logo ressemble à ça partout, exactement comme ça. »
   Taylor a montré SA pastille de profil : couleur pleine, anneau clair de
   2 px, initiale en gras, ombre douce. C'est le modèle. Le rond qui porte
   l'initiale d'un joueur apparaît à six endroits et dans quatre tailles ; il
   doit être partout la MÊME matière, à la taille près.
   Le banc ne recopie aucune valeur : il RELÈVE la pastille du profil, puis
   exige des cinq autres exactement la même chose. Si le modèle change un
   jour, tout doit changer avec lui — et c'est ce banc qui le dira.
   Usage : node banc-essai/jeton.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

const MODELE = ['accueil', "state.screen='mode'; render();", '.hero-profile .avatar'];
const CIBLES = [
  ['profil',     "state.screen='profile'; render();",                                                                       '.profile-card .avatar'],
  ['groupe',     "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'}]; state.screen='setup'; render();", '.team-token'],
  ['points',     "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'}]; startGame(); state.revealed=true; render();", '.aw-token'],
  ['résultats',  "state.mode='group'; state.scores=[20,5,0]; state.screen='results'; render();",                             '.podium-avatar'],
  ['résultats',  '',                                                                                                        '.rank-token'],
];

const RELEVE = (sel) => {
  const e = document.querySelector(sel); if (!e) return null;
  const cs = getComputedStyle(e), b = e.getBoundingClientRect();
  return {
    taille: Math.round(b.width) + '×' + Math.round(b.height),
    fond:   cs.backgroundImage === 'none' ? 'plein' : 'dégradé',
    anneau: (parseFloat(cs.borderTopWidth)||0).toFixed(0) + ' px ' + cs.borderTopColor,
    ombre:  cs.boxShadow,
    gras:   cs.fontWeight,
    rond:   cs.borderTopLeftRadius,
  };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' })); });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  await p.evaluate((s) => { new Function(s)(); }, MODELE[1]);
  await p.waitForTimeout(900);
  const ref = await p.evaluate(RELEVE, MODELE[2]);
  if (!ref) { console.log('  la pastille de référence est introuvable'); process.exit(1); }
  console.log('  LE MODÈLE — ' + MODELE[0] + ' ' + MODELE[2] + ' (' + ref.taille + ')');
  console.log('    fond ' + ref.fond + '   anneau ' + ref.anneau + '   gras ' + ref.gras + '   rond ' + ref.rond);
  console.log('    ombre ' + ref.ombre + '\n');

  let ok = true;
  console.log('  écran        pastille                taille   fond      anneau                       gras  rond');
  for (const [ecran, prep, sel] of CIBLES) {
    if (prep) { try { await p.evaluate((s) => { new Function(s)(); }, prep); } catch(e){} await p.waitForTimeout(900); }
    const r = await p.evaluate(RELEVE, sel);
    if (!r) { console.log('  ' + ecran.padEnd(12) + sel.padEnd(24) + ' INTROUVABLE'); ok = false; continue; }
    const ecarts = ['fond','anneau','ombre','gras','rond'].filter(k => r[k] !== ref[k]);
    if (ecarts.length) ok = false;
    console.log('  ' + ecran.padEnd(12) + sel.padEnd(24) + r.taille.padStart(8) + '   ' + r.fond.padEnd(9) +
      r.anneau.padEnd(29) + r.gras.padEnd(6) + r.rond +
      (ecarts.length ? '   <-- PAS LE MÊME : ' + ecarts.join(', ') : ''));
    for (const k of ecarts) console.log('        ' + k + ' : « ' + r[k] +' »  au lieu de  « ' + ref[k] + ' »');
  }
  await nav.close();
  console.log(ok ? '\n  OK — une seule pastille de joueur, partout' : '\n  ÉCHEC');
  process.exit(ok ? 0 : 1);
})();
