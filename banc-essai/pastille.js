/* LA PASTILLE D'UN JOUEUR NE DÉPEND PAS DE SA PLACE.

   « Vérifie que le profil des joueurs reste le même en tout temps et qu'il ne
   change pas en fonction de qui est sur le podium — la petite photo bouge
   légèrement selon qui gagne, et ça je n'aime pas. »

   C'était vrai : le premier avait une ombre à lui, qui REMPLAÇAIT celle des
   autres au lieu de s'y ajouter. Il perdait donc le reflet intérieur du haut —
   celui qui donne son galbe à la pastille — et son ombre portée, contre un
   halo doré. Le même joueur n'était pas dessiné pareil selon qu'il gagnait.

   ON NE COMPARE PAS DES PIXELS. La pastille du premier et celle du deuxième ne
   tombent jamais au même endroit de l'écran : le décor derrière elles diffère,
   et même en découpant au flottant il reste un quart de pixel de décalage sur
   le glyphe. On compare donc ce qui doit VRAIMENT être identique — la taille,
   la bordure, l'ombre, la police — sur toutes les places, dans plusieurs
   répartitions de score.

       node pastille.js        (jeu servi en HTTP sur 8099)
       node pastille.js <url>  (pour comparer une autre version) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
/* Le même joueur, à toutes les places possibles. */
const PARTIES = [
  ['Taylor premier',            [30, 10, 0]],
  ['Taylor deuxième',           [10, 30, 0]],
  ['Taylor dernier',            [0, 30, 10]],
  ['tout le monde à égalité',   [20, 20, 20]],
  ['tout le monde à zéro',      [0, 0, 0]],
];
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
  await p.evaluate(() => { state.mode='group'; state.teams=[{name:'Taylor'},{name:'Bea'},{name:'Chris'}]; state.screen='setup'; render(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { startGame(); });
  await p.waitForTimeout(500);

  const releves = [];
  for (const [nom, scores] of PARTIES) {
    await p.evaluate((s) => { state.scores = s; state.screen='end'; render(); }, scores);
    await p.waitForTimeout(1400);
    const r = await p.evaluate(() => {
      const lire = (a, ou, joueur, rang) => { const cs = getComputedStyle(a), b = a.getBoundingClientRect();
        return { ou, joueur, rang,
          style: [Math.round(b.width*10)/10, Math.round(b.height*10)/10, cs.borderTopWidth, cs.borderTopColor,
                  cs.boxShadow, cs.fontSize, cs.fontWeight, cs.borderRadius, cs.transform].join(' | ') }; };
      const o = [];
      /* le podium */
      [...document.querySelectorAll('.podium-col')].forEach(c => {
        const a = c.querySelector('.podium-avatar');
        o.push(lire(a, 'podium', (c.querySelector('.podium-name')||{}).textContent.trim(),
          (c.querySelector('.podium-bar')||{}).textContent));
      });
      /* et la liste dessous, où le MÊME joueur réapparaît : sa pastille ne doit
         pas non plus changer selon la ligne. Le médaillon de rang, lui, a le
         droit d'être doré ou argenté — c'est son rôle, pas celui du joueur. */
      [...document.querySelectorAll('.rank-row')].forEach(c => {
        const a = c.querySelector('.avatar, .team-token'); if (!a) return;
        o.push(lire(a, 'liste', (c.querySelector('.rank-name')||{}).textContent.trim(),
          (c.querySelector('.rank-badge')||{}).textContent));
      });
      return o;
    });
    releves.push([nom, r]);
  }
  await ctx.close();

  /* Toutes les pastilles, toutes parties confondues, doivent avoir LE MÊME style. */
  /* Le podium et la liste n'ont pas la même TAILLE de pastille — c'est une
     différence de contexte, pas de rang. On compare donc chaque endroit avec
     lui-même. */
  const styles = new Map();
  releves.forEach(([nom, r]) => r.forEach(x => {
    const cle = x.ou + ' :: ' + x.style;
    if (!styles.has(cle)) styles.set(cle, []);
    styles.get(cle).push(nom + ' / ' + x.joueur + ' (place ' + x.rang + ')');
  }));
  console.log('  ' + releves.length + ' répartitions de score, ' +
    releves.reduce((n, r) => n + r[1].length, 0) + ' pastilles relevées\n');
  let i = 0;
  for (const [st, qui] of styles) {
    i++;
    const [ou, det] = st.split(' :: ');
    console.log('  ' + ou + ' — ' + qui.length + ' pastille(s), un seul style');
    console.log('     ' + det.split(' | ').slice(0, 5).join('  '));
    if (styles.size > 2) console.log('     ' + qui.slice(0, 6).join(', '));
  }
  const ok = styles.size === 2 && !errs.length;   // un style pour le podium, un pour la liste
  if (errs.length) console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,2).join(' | '));
  console.log(ok ? '\n  OK — la pastille est la même à toutes les places'
                 : '\n  ECHEC : ' + styles.size + ' styles au lieu de 2 (podium, liste)');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
