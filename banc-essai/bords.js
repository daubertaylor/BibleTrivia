/* L'ONDE D'APPUI PREND-ELLE TOUS LES BORDS ?

   « On voit que le petit aura de couleur rose s'applique, mais il ne prend
   pas tous les bords. » Toutes les surfaces du jeu portent un
   « border:1px solid transparent » — un reste utile, qui garde la géométrie
   en border-box quoi qu'il arrive. Or l'onde est un enfant en position
   absolue avec inset:0, et un enfant absolu se cale sur la boîte de PADDING :
   il s'arrête donc un pixel avant le bord, tout autour. Il reste un anneau
   d'un pixel à la couleur du bouton, bien visible quand l'onde est franche.

   Le test PRESSE chaque famille de boutons, compare l'image pressée à
   l'image au repos, et regarde jusqu'où vont les pixels qui ont changé.

   UN PIÈGE, DÉJÀ PAYÉ UNE FOIS DANS CE PROJET : sous le doigt, le bouton
   s'ENFONCE aussi (transform:scale). Tout bouge alors, et la comparaison ne
   dit plus rien sur l'onde. On neutralise donc l'enfoncement — mais surtout
   PAS avec « transform:none » : c'est ce transform qui crée le contexte
   d'empilement grâce auquel l'onde (z-index:-1) passe devant le fond du
   bouton. Sans lui, l'onde disparaît entièrement et le test mesurerait un
   bouton qui ne s'allume pas. « translateZ(0) scale(1) » garde le contexte
   et fige la géométrie.

   Les deux relevés :

     anneau   px non peints entre le bord du bouton et le début de l'onde
     halo     px peints AU-DELÀ du bord (le défaut inverse, si l'onde
              déborde sur un bouton sans bordure)

       node bords.js        (jeu servi en HTTP sur 8099)

   ET LE MÊME PIXEL AILLEURS. Un balayage de tout le jeu n'a trouvé qu'UN
   autre enfant absolu calé sur 0 dans un parent bordé : le remplissage de la
   barre de progression. Sur une piste de 8 px, il n'en couvrait que 6 — 75 %
   de la hauteur, avec un anneau pâle tout autour du corail. Le test le
   vérifie aussi, en fin de course.

   Repères : anneau = 0, halo = 0, remplissage à 100 % de sa piste. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const D = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const S = 3;   // deviceScaleFactor

/* Un bouton par famille, sur l'écran où il vit. */
const CIBLES = [
  ['accueil',      "state.screen='mode'; render();",                                                          '.mode-card'],
  ['accueil',      "",                                                                                        '.daily-card'],
  ['accueil',      "",                                                                                        '.parcours-card'],
  ['groupe',       "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'}]; state.screen='setup'; render();", '.chip'],
  ['groupe',       "",                                                                                        '.chip.active'],
  ['groupe',       "",                                                                                        '.add-team'],
  ['groupe',       "",                                                                                        '.btn-primary'],
  ['jeu',          "state.mode='solo'; startGame();",                                                          '.option-btn'],
  ['progression',  "state.screen='parcours'; render();",                                                       '.tst-head'],
  ['profil',       "state.screen='profile'; render();",                                                        '.color-dot'],
  /* CHAQUE CIBLE D'UNE FEUILLE ROUVRE LA FEUILLE. On relâche le doigt AILLEURS
     pour ne pas déclencher le clic du bouton — mais un relâchement sur le voile
     produit un clic sur le voile, qui REFERME la feuille. La cible suivante ne
     trouvait donc plus rien. */
  ['réglages',     "state.screen='mode'; render(); openSettings();",                                            '.switch'],
  ['réglages',     "closeSettings(); openSettings();",                                                          '.set-go'],
  ['réglages',     "closeSettings(); openSettings();",                                                          '.share-btn'],
  ['en-tête',      "closeSettings(); state.screen='parcours'; render();",                                      '.icon-btn'],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:S,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12}, correct:126 }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.addStyleTag({ content: 'button:active, .mode-card:active{ transform:translateZ(0) scale(1) !important; }' });

  const lignes = [];
  for (const [ecran, prep, sel] of CIBLES) {
    if (prep) { await p.evaluate((prep) => { new Function(prep)(); }, prep); await p.waitForTimeout(800); }
    const r = await p.evaluate((sel) => {
      const e = document.querySelector(sel); if (!e) return null;
      /* on l'amène dans l'écran : plusieurs de ces boutons sont sous le pli */
      const app = document.getElementById('app');
      const b0 = e.getBoundingClientRect();
      if (b0.bottom > innerHeight - 20 || b0.top < 60) {
        app.scrollTop += b0.top - innerHeight * 0.45;
      }
      const b = e.getBoundingClientRect();
      /* Un bouton qui porte une OMBRE PORTÉE (filter:drop-shadow) voit sa
         silhouette d'ombre changer en même temps que l'onde : des pixels
         bougent alors DEHORS sans que l'onde y soit pour quelque chose. Le
         relevé du halo n'a pas de sens dans ce cas, on le dit au lieu de
         faire semblant. */
      const ombre = /drop-shadow/.test(getComputedStyle(e).filter || '');
      /* la BOÎTE DE BORDURE : c'est jusque-là que l'onde doit aller */
      return { x:b.left, y:b.top, w:b.width, h:b.height, ombre };
    }, sel);
    if (!r || r.w < 4 || r.h < 4 || r.x < 7 || r.y < 7 || r.y + r.h > 845) {
      lignes.push([sel, null, r ? ('boîte ' + JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.w),h:Math.round(r.h)})) : 'aucun élément']);
      continue;
    }
    await p.waitForTimeout(400);
    /* on regarde 6 px autour, de quoi voir l'anneau comme le halo */
    const M = 6;
    const clip = { x:Math.max(0, r.x - M), y:Math.max(0, r.y - M), width:r.w + 2*M, height:r.h + 2*M };
    await p.screenshot({ path: D + 'bord-repos.png', clip });
    await p.mouse.move(r.x + r.w/2, r.y + r.h/2);
    await p.mouse.down();
    await p.waitForTimeout(460);                    // l'onde met 0,38 s a s'ouvrir
    await p.screenshot({ path: D + 'bord-presse.png', clip });
    await p.mouse.move(1, 1); await p.mouse.up();   // on relache AILLEURS : pas de clic
    await p.waitForTimeout(260);
    fs.writeFileSync(D + 'bord.json', JSON.stringify({ marge:M, S, w:r.w, h:r.h }));
    const out = execSync('python3 ' + __dirname + '/bords.py').toString().trim().split(' ').map(Number);
    lignes.push([sel, out, r.ombre]);   // [anneau, halo, change]
  }

  let ok = true;
  console.log('  famille                      anneau non peint   halo hors bord');
  for (const [sel, o] of lignes) {
    if (!o) { console.log('  ' + sel.padEnd(28) + ' HORS CHAMP — ' + (lignes.find(l=>l[0]===sel)[2]||'')); ok = false; continue; }
    const [anneau, halo, change] = o;
    const ombre = lignes.find(l => l[0] === sel)[2];
    if (change < 30) { console.log('  ' + sel.padEnd(28) + ' onde invisible (rien ne change)'); ok = false; continue; }
    const mauvais = anneau > 0.4 || (!ombre && halo > 0.4);
    if (mauvais) ok = false;
    console.log('  ' + sel.padEnd(28) + anneau.toFixed(2).padStart(10) + ' px' +
      (ombre ? '     (ombre portée)' : halo.toFixed(2).padStart(15) + ' px') +
      (anneau > 0.4 ? '   <-- L ONDE N ATTEINT PAS LE BORD' : (!ombre && halo > 0.4 ? '   <-- L ONDE DEBORDE' : '')));
  }
  /* ===== LES REMPLISSAGES ===== */
  const barres = await p.evaluate(() => {
    state.mode = 'solo'; startGame();
    return new Promise(res => setTimeout(() => {
      const out = [];
      const paires = [['.progress-track', '.progress-fill'], ['.progress-track', '.progress-ghost']];
      for (const [cs_, fs_] of paires) {
        const t = document.querySelector(cs_);
        if (!t) { out.push([fs_, null]); continue; }
        let f = t.querySelector(fs_);
        /* le repère des autres joueurs n'existe qu'en ligne : on le pose dans
           la vraie piste pour éprouver la règle qui le peint. */
        if (!f && fs_ === '.progress-ghost') { f = document.createElement('div'); f.className = 'progress-ghost'; t.appendChild(f); }
        if (!f) { out.push([fs_, null]); continue; }
        f.style.transition = 'none'; f.style.width = '60%';
        const rt = t.getBoundingClientRect(), rf = f.getBoundingClientRect();
        out.push([fs_, { couv: rf.height / rt.height, haut: rf.top - rt.top, gauche: rf.left - rt.left }]);
      }
      res(out);
    }, 900));
  });
  console.log('');
  for (const [nom, m] of barres) {
    if (!m) { console.log('  ' + nom.padEnd(28) + ' INTROUVABLE'); ok = false; continue; }
    const bon = m.couv > 0.995 && Math.abs(m.haut) < 0.4 && Math.abs(m.gauche) < 0.4;
    if (!bon) ok = false;
    console.log('  ' + nom.padEnd(28) + 'couvre ' + (100*m.couv).toFixed(1).padStart(5) + ' % de sa piste' +
      '   écart haut ' + m.haut.toFixed(2) + ' px, gauche ' + m.gauche.toFixed(2) + ' px' +
      (bon ? '' : '   <-- NE REMPLIT PAS SA PISTE'));
  }
  if (errs.length) { console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); ok = false; }
  console.log(ok ? '\n  OK — l\'onde et les remplissages prennent tous les bords' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
