/* ============ BANC « CHANGER DE LANGUE REDÉMARRE LE JEU » ============
   « Au changement de langue, je veux un jeu qui redémarre totalement, avec un
   écran de chargement. »

   AVANT : on repeignait les écrans en place. La langue changeait sous les
   yeux, ce qui était joli — et incomplet : tout ce qui n'est pas peint par
   render() restait dans l'ancienne langue ou dans l'ancien état (la pioche
   déjà tirée, les minuteries en cours, la feuille des réglages elle-même).
   APRÈS : la page recharge. Rien ne survit, donc rien ne peut rester derrière.

   ON VÉRIFIE QUATRE CHOSES, DANS L'ORDRE OÙ LE JOUEUR LES VIT :
     1. un voile couvre l'écran AVANT le rechargement — sinon iOS montre un
        blanc franc au milieu d'une action volontaire ;
     2. la page recharge vraiment (une fois, pas deux) ;
     3. le jeu repasse par son écran de chargement ;
     4. il revient dans la NOUVELLE langue, jusque sur l'accueil.

   Usage : node banc-essai/langue-redemarre.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let charges = 0; p.on('load', () => { charges++; });
  /* On ne pose le français QU'AU PREMIER chargement : celui qui suit doit
     retrouver ce que le JEU a écrit, pas ce que le banc réécrirait. */
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    if (!localStorage.getItem('bt_langue')) localStorage.setItem('bt_langue', 'fr');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return typeof render === 'function' && state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(600);

  const soucis = [];
  const avantLangue = await p.evaluate(() => LANGUE);
  const avantTitre = await p.evaluate(() => { const t = document.querySelector('.mode-title'); return t ? t.textContent.trim() : null; });
  if (avantLangue !== 'fr') soucis.push('le banc ne démarre pas en français (' + avantLangue + ')');
  const chargesAvant = charges;

  await p.evaluate(() => { openSettings(); });
  await p.waitForTimeout(450);
  await p.evaluate(() => { openLangues(); });
  await p.waitForTimeout(450);
  await p.evaluate(() => { setLangue('en'); });
  await p.waitForTimeout(110);

  /* 1. le voile */
  const voile = await p.evaluate(() => {
    const v = document.getElementById('redemVeil');
    if (!v) return null;
    const cs = getComputedStyle(v);
    const r = v.getBoundingClientRect();
    return { opacite: parseFloat(cs.opacity), fond: cs.backgroundColor, z: parseInt(cs.zIndex, 10),
      couvre: r.width >= innerWidth - 1 && r.height >= innerHeight - 1, colombe: !!v.querySelector('img') };
  });
  if (!voile) soucis.push('aucun voile pendant le redémarrage : le joueur voit un blanc');
  else {
    if (!voile.couvre) soucis.push('le voile ne couvre pas tout l\'écran');
    if (voile.z < 1000) soucis.push('le voile passe sous quelque chose (z-index ' + voile.z + ')');
    if (!voile.colombe) soucis.push('le voile n\'a pas la colombe de l\'écran de chargement');
    if (!(voile.opacite > 0)) soucis.push('le voile est invisible (opacité ' + voile.opacite + ')');
  }

  await p.waitForTimeout(2600);
  /* 2. le rechargement */
  const n = charges - chargesAvant;
  if (n !== 1) soucis.push('la page a rechargé ' + n + ' fois au lieu d\'une');

  /* 3. l'écran de chargement */
  const apres = await p.evaluate(() => ({ langue: LANGUE, ecran: state.screen }));
  if (apres.ecran !== 'splash') soucis.push('le jeu ne repasse pas par l\'écran de chargement (écran « ' + apres.ecran + ' »)');
  if (apres.langue !== 'en') soucis.push('la langue n\'a pas suivi le redémarrage (' + apres.langue + ')');

  /* 4. l'accueil, dans la nouvelle langue */
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(500);
  const apresTitre = await p.evaluate(() => { const t = document.querySelector('.mode-title'); return t ? t.textContent.trim() : null; });
  if (!apresTitre) soucis.push('pas de carte de mode après le redémarrage');
  else if (apresTitre === avantTitre) soucis.push('l\'accueil est resté en français (« ' + apresTitre + ' »)');

  if (errs.length) soucis.push('erreurs JS : ' + [...new Set(errs)].slice(0, 2).join(' | '));
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('  OK — « ' + avantTitre +' » → voile → rechargement → écran de chargement → « ' + apresTitre + ' »');
})();
