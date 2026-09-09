/* LE VERROU PAYSAGE ARRIVE ET S'EN VA COMME LE RESTE DU JEU.

   Il apparaissait et disparaissait NET — la seule surface du jeu à le faire.
   Il porte maintenant l'horloge d'ouverture quand le téléphone se couche, et
   celle de fermeture quand il se redresse.

   LE BANC SUIT L'OPACITÉ IMAGE PAR IMAGE, dans les deux sens. Une première
   version ne regardait que deux instants (60 ms, puis posé) : elle a laissé
   passer un CLIGNOTEMENT complet. iOS relit les angles trois fois par
   rotation, et chaque relecture retirait puis remettait la classe de sortie —
   ce qui relance une animation. Le verrou s'effaçait, redevenait opaque,
   s'effaçait encore. Une courbe qui doit descendre ne doit JAMAIS remonter :
   c'est ça qu'on mesure.

       node verrou.js        (jeu servi en HTTP sur 8099)
       node verrou.js <url>  (pour comparer une autre version) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  let ok = true;
  const dire = (bon, txt) => { if (!bon) ok = false; console.log('   ' + (bon ? '   ' : '<-- ') + txt); };

  /* On relève l'opacité à chaque image pendant 900 ms. */
  const suivre = () => p.evaluate(() => new Promise(res => {
    const rl = document.getElementById('rotate-lock');
    const t0 = performance.now(); const out = [];
    const tic = () => { const t = performance.now() - t0; const cs = getComputedStyle(rl);
      out.push([Math.round(t), cs.display === 'none' ? -1 : Math.round((parseFloat(cs.opacity)||0)*1000)/1000]);
      if (t < 900) requestAnimationFrame(tic); else res(out); };
    requestAnimationFrame(tic);
  }));
  /* Une courbe monotone : elle ne doit jamais repartir dans l'autre sens. */
  const monotone = (serie, sens) => {
    let pire = 0, quand = 0;
    const v = serie.filter(x => x[1] >= 0);
    for (let i = 1; i < v.length; i++) {
      const d = (v[i][1] - v[i-1][1]) * sens;   // sens -1 : on veut que ça baisse
      if (d > pire) { pire = d; quand = v[i][0]; }
    }
    return { pire: Math.round(pire*1000)/1000, quand };
  };

  /* ===== le téléphone se couche ===== */
  const pIn = suivre();
  await p.setViewportSize({ width:852, height:393 });
  const sIn = await pIn;
  const vIn = sIn.filter(x => x[1] >= 0);
  const remonte = monotone(sIn, -1);   // à l'arrivée l'opacité MONTE : on cherche une baisse
  const monte = monotone(sIn, 1);
  console.log('  le téléphone se couche');
  dire(vIn.length > 5, 'le verrou apparaît (' + vIn.length + ' images)');
  dire(monte.pire > 0.05, 'son opacité monte franchement (+' + monte.pire + ' au plus fort)');
  dire(remonte.pire <= 0.02, 'elle ne redescend jamais en route (pire recul ' + remonte.pire + ')');
  dire(vIn[vIn.length-1][1] > 0.98, 'elle finit pleine (' + vIn[vIn.length-1][1] + ')');
  const anim = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('rotate-lock'));
    return cs.animationName + ' ' + cs.animationDuration + ' ' + cs.animationTimingFunction; });
  const ref = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tr-plie').trim().replace(/\s+/g,''));
  dire(anim.replace(/\s+/g,'').indexOf(ref) >= 0, 'sur l\'horloge d\'ouverture : ' + anim);

  /* ===== le téléphone se redresse ===== */
  await p.waitForTimeout(500);
  const pOut = suivre();
  await p.setViewportSize({ width:393, height:852 });
  const sOut = await pOut;
  const vOut = sOut.filter(x => x[1] >= 0);
  const rebond = monotone(sOut, 1);    // au départ l'opacité BAISSE : on cherche une remontée
  console.log('\n  le téléphone se redresse');
  dire(vOut.length > 3, 'le verrou s\'efface progressivement (' + vOut.length + ' images)');
  dire(rebond.pire <= 0.02, 'son opacité ne remonte JAMAIS en route (pire rebond ' +
    rebond.pire + (rebond.pire > 0.02 ? ' à ' + rebond.quand + ' ms — IL CLIGNOTE' : '') + ')');
  const fin = sOut[sOut.length-1];
  dire(fin[1] === -1, 'il a bien disparu à la fin');

  /* ===== six bascules rapides : il ne doit jamais rester en travers ===== */
  for (let i = 0; i < 3; i++) {
    await p.setViewportSize({ width:852, height:393 }); await p.waitForTimeout(90);
    await p.setViewportSize({ width:393, height:852 }); await p.waitForTimeout(90);
  }
  await p.waitForTimeout(900);
  const etat = await p.evaluate(() => ({ d: getComputedStyle(document.getElementById('rotate-lock')).display,
    r: document.documentElement.className }));
  console.log('');
  dire(etat.d === 'none' && etat.r.indexOf('rl-sort') < 0,
    'après six bascules rapides, rien ne reste en travers (' + etat.d + ', « ' + etat.r + ' »)');
  if (errs.length) dire(false, 'ERREURS JS : ' + [...new Set(errs)].slice(0,2).join(' | '));
  console.log(ok ? '\n  OK — le verrou arrive et s\'en va comme le reste du jeu' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
