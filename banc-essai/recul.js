/* ============ BANC « LA FEUILLE QUI RECULE GARDE SON DÉCOR » ============
   Quand le choix des versions s'ouvre, la feuille des Réglages RECULE : elle
   rétrécit à 0,935 depuis son bord haut. Sa couche de verre (.gs) est un
   enfant : elle rétrécit avec elle, et le décor qu'on voit à travers le
   panneau part en glissade — « la page derrière bug au moment de reprendre sa
   place ».
   Le verre du jeu est une FENÊTRE sur un décor fixe : quelle que soit la
   position du panneau, ce qu'on voit à travers ne doit pas bouger d'un pixel
   à l'écran. Le banc relève donc, image par image, la position ÉCRAN de la
   couche .gs pendant le recul et pendant le retour. Tout écart est ce qu'on
   voit glisser.
   Il vérifie aussi que le panneau PEINT quelque chose : la v210 avait éteint
   la couche pour supprimer la glissade, et comme .has-gs retire son fond à la
   surface, le panneau devenait transparent — titre et interrupteurs flottant
   au-dessus de l'accueil.
   Usage : node banc-essai/recul.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

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
  await p.evaluate(()=>{ openSettings(); });
  await p.waitForTimeout(1400);

  const sonde = (action) => p.evaluate((a) => new Promise(res => {
    const f = document.querySelector('#settingsVeil .settings-sheet');
    const gs = f && f.querySelector(':scope > .gs');
    if(!gs) return res(null);
    const rel = [];
    const t0 = performance.now();
    const tic = ()=>{
      const g = gs.getBoundingClientRect(), r = f.getBoundingClientRect();
      rel.push([+(performance.now()-t0).toFixed(0), +g.left.toFixed(1), +g.top.toFixed(1), +r.top.toFixed(1), +r.width.toFixed(1)]);
      if(performance.now()-t0 < 900) requestAnimationFrame(tic); else res(rel);
    };
    requestAnimationFrame(tic);
    setTimeout(()=>{ new Function(a)(); }, 60);
  }), action);

  let ko = 0;
  const juge = (nom, rel)=>{
    if(!rel || rel.length < 6){ console.log('  ' + nom + ' : relevé vide'); ko++; return; }
    const l0 = rel[0][1], t0v = rel[0][2];
    let dl = 0, dt = 0;
    for(const e of rel){ dl = Math.max(dl, Math.abs(e[1]-l0)); dt = Math.max(dt, Math.abs(e[2]-t0v)); }
    const glisse = Math.max(dl, dt);
    const course = Math.abs(rel[rel.length-1][4] - rel[0][4]);
    const bon = glisse <= 3;
    if(!bon) ko++;
    console.log('  ' + nom.padEnd(9) + (bon ? ' OK ' : ' KO ')
      + ' le décor glisse de ' + glisse.toFixed(1) + ' px à l\'écran'
      + '  (le panneau, lui, se resserre de ' + course.toFixed(1) + ' px)');
  };

  /* ===== D'ABORD CONSTATER QUE LA FEUILLE RECULE VRAIMENT =====
     Ce banc mesure une COMPENSATION : que le décor reste fixe pendant que la
     feuille rétrécit. Pendant quatre versions, la feuille ne rétrécissait plus
     du tout — « both » sur son animation d'entrée battait la règle du recul —
     et le banc passait au vert en vérifiant une correction pour un mouvement
     qui n'existait pas. Photo à l'appui : deux feuilles à pleine largeur, l'une
     sur l'autre.
     Un banc qui vérifie une compensation doit donc TOUJOURS commencer par
     établir que la chose à compenser se produit. Sinon son vert ne veut rien
     dire. */
  juge('recul', await sonde('openBibles();'));
  {
    const e = await p.evaluate(()=>{ const f=document.querySelector('#settingsVeil .settings-sheet');
      if(!f) return null; return +(new DOMMatrixReadOnly(getComputedStyle(f).transform).a).toFixed(4); });
    const bon = e !== null && e > 0.90 && e < 0.97;
    if(!bon) ko++;
    console.log('  ' + (bon?'OK ':'KO ') + 'la feuille du dessous recule pour de bon'.padEnd(46)
      + 'échelle ' + e + (bon ? '' : '   attendu ~0,935 — SANS RECUL, TOUT CE BANC NE MESURE RIEN'));
  }
  await p.waitForTimeout(900);
  juge('retour', await sonde('closeBibles();'));
  await p.waitForTimeout(900);

  /* ET LE PANNEAU PEINT-IL SEULEMENT QUELQUE CHOSE ? */
  await p.evaluate(()=>{ openBibles(); });
  await p.waitForTimeout(1200);
  const fond = await p.evaluate(()=>{
    const f = document.querySelector('#settingsVeil .settings-sheet');
    const gs = f.querySelector(':scope > .gs');
    const cs = getComputedStyle(f);
    const og = gs ? parseFloat(getComputedStyle(gs).opacity) : 0;
    const surface = (cs.backgroundImage !== 'none') || !/, 0\)$/.test(cs.backgroundColor);
    return { peint: surface || (!!gs && og > 0.01), parLaSurface:surface, parLaCouche: !!gs && og > 0.01, og };
  });
  if(!fond.peint) ko++;
  console.log('  panneau   ' + (fond.peint ? 'OK ' : 'KO ')
    + ' il peint un fond (surface ' + (fond.parLaSurface?'oui':'non') + ', couche ' + (fond.parLaCouche?'oui':'non') + ')');
  if(!fond.peint) console.log('           ↳ la feuille du dessous est TRANSPARENTE : son contenu flotte sur l\'accueil');

  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
