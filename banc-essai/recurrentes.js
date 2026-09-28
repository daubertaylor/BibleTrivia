/* ====== BANC « ON RÉVISE CE QUI RÉSISTE, PAS CE QUI TOMBE SOUS LA MAIN » ======
   « Fais aussi en sorte de pas seulement revoir les erreurs une par une, mais
   plutôt les erreurs récurrentes, pour vraiment cibler le joueur. »

   CE QUE LE CARNET SAVAIT SANS S'EN SERVIR. Chaque entrée compte ses échecs
   dans « n », incrémenté à chaque faute. Ce nombre n'était lu NULLE PART : ni
   pour choisir quoi jouer, ni pour ordonner. Le tirage était un mélange pur —
   une question ratée sept fois passait en dernier aussi souvent qu'une ratée
   une seule. Réviser au hasard, c'est réviser ce qu'on sait déjà aussi souvent
   que ce qu'on ne sait pas.

   CE QUI A CHANGÉ DEPUIS, ET CE QUI N'A PAS BOUGÉ. Le banc jugeait une PORTE —
   « Celles qui me résistent » — parmi quatre, et l'ordre dans une autre porte.
   Les portes ont disparu : « je veux qu'il revoie de manière beaucoup plus
   simple, vraiment les erreurs qui persistent, et pas si compliqué que ça ».
   Il n'y a plus rien à choisir, donc plus rien à nommer ici. L'EXIGENCE DE
   FOND, elle, n'a pas bougé d'un pouce — elle est même devenue la règle
   générale au lieu d'être une porte parmi quatre :
     — ce qui résiste le plus passe DEVANT, toujours ;
     — l'écran annonce un nombre, et le bouton joue EXACTEMENT ce nombre ;
     — quand quelque chose est dû aujourd'hui, on ne joue que ça.
   Usage : node banc-essai/recurrentes.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/* Un carnet témoin : vingt questions, des entêtements de 1 à 5. Les douze
   premières sont DUES (date au passé), les huit autres ne le sont pas — de
   quoi voir si la file respecte l'échéance en plus de l'entêtement. Vingt,
   c'est deux fois le lot : on verra donc aussi le plafond faire son travail. */
const CARNET = Array.from({ length: 20 }, (_, i) => ({
  k: 'q' + i, n: (i % 5) + 1, p: 0,
  du: i < 12 ? '2000-01-01' : '2999-01-01', maj: Date.now(),
  q: 'Question ' + i, options: ['a', 'b', 'c', 'd'], correct: 'a', fact: '', tier: 'moyen',
}));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript((c) => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_errbook', JSON.stringify(c));
  }, CARNET);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });

  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(52) + det); };

  /* 1. L'ÉCRAN ANNONCE UN NOMBRE — et il n'y a rien d'autre à faire que d'y aller. */
  await p.evaluate(() => { ouvrirRevoir(); });
  await p.waitForTimeout(800);
  const ecran = await p.evaluate(() => ({
    annonce: +(document.querySelector('.rv-nb') || {}).textContent,
    bouton: !!document.querySelector('.rv-go:not([disabled])'),
    aChoisir: document.querySelectorAll('.rv-choix, .rvl-card .bk').length,
    lot: (typeof REVISION_LOT !== 'undefined') ? REVISION_LOT : -1,
    dus: aRevoir().length,
  }));
  v('rien à choisir : le jeu choisit', ecran.aChoisir === 0, ecran.aChoisir + ' chose(s) à décider');
  v('l\'écran annonce le lot, pas le catalogue',
    ecran.annonce === Math.min(ecran.lot, ecran.dus),
    ecran.annonce + ' annoncé, ' + ecran.dus + ' dues, lot de ' + ecran.lot);
  v('et le bouton est vivant', ecran.bouton, ecran.bouton ? 'oui' : 'éteint alors qu\'il y a à réviser');

  /* 2. LE BOUTON JOUE EXACTEMENT CE QUI EST ANNONCÉ.
     C'est la leçon du jour où l'écran affichait 209 et n'en jouait que neuf :
     une porte qui annonce un nombre doit tenir ce nombre. */
  await p.evaluate(() => { document.querySelector('.rv-go').click(); });
  await p.waitForTimeout(700);
  const joue = await p.evaluate((c) => {
    const par = {}; c.forEach(x => { par[x.q] = x; });
    return { n: state.questions.length, rev: state.revision,
             ent: state.questions.map(q => par[q.q].n),
             pasDues: state.questions.filter(q => par[q.q].du > '2100-01-01').length };
  }, CARNET);
  v('le bouton joue ce qui est annoncé', joue.n === ecran.annonce, joue.n + ' jouées pour ' + ecran.annonce + ' annoncées');
  v('c\'est bien une révision', joue.rev === true, String(joue.rev));

  /* 3. L'ORDRE — ce qui résiste le plus passe devant, sans que personne l'ait demandé. */
  let decroissant = true;
  for (let i = 1; i < joue.ent.length; i++) if (joue.ent[i] > joue.ent[i - 1]) { decroissant = false; break; }
  v('ce qui résiste le plus passe devant', decroissant, 'entêtements joués : ' + joue.ent.join(' '));

  /* 4. L'ÉCHÉANCE PASSE AVANT TOUT. Huit questions du carnet ne sont pas dues :
     tant qu'il reste du dû, elles n'ont rien à faire dans la file — même si
     l'une d'elles résiste plus que les autres. */
  v('rien qui ne soit pas dû ne se glisse dans la file', joue.pasDues === 0,
    joue.pasDues + ' question(s) jouée(s) avant leur tour');

  /* 5. CARNET SANS RIEN DE DÛ : on ne laisse pas le joueur devant un bouton
     mort — on lui donne ce qui résiste le plus, et réviser en avance fait
     monter la question comme d'habitude. */
  await p.evaluate(() => {
    const a = loadErrbook(); a.forEach(x => { x.du = '2999-01-01'; }); saveErrbook(a);
    ouvrirRevoir();
  });
  await p.waitForTimeout(700);
  const avance = await p.evaluate(() => ({
    annonce: +(document.querySelector('.rv-nb') || {}).textContent,
    vivant: !!document.querySelector('.rv-go:not([disabled])'),
    dus: aRevoir().length,
  }));
  v('rien de dû : l\'écran propose quand même ce qui résiste',
    avance.dus === 0 && avance.annonce > 0 && avance.vivant,
    avance.dus + ' due(s), ' + avance.annonce + ' proposée(s)');

  /* 6. CARNET VIDE : là, et là seulement, le bouton refuse de partir. */
  await p.evaluate(() => { localStorage.setItem('bt_errbook', '[]'); ouvrirRevoir(); });
  await p.waitForTimeout(700);
  const vide = await p.evaluate(() => ({
    annonce: (document.querySelector('.rv-nb') || {}).textContent,
    eteint: !!document.querySelector('.rv-go[disabled]'),
    ecran: state.screen,
  }));
  v('carnet vide : zéro, bouton éteint, écran quand même là',
    vide.annonce === '0' && vide.eteint && vide.ecran === 'revoir',
    vide.annonce + ' / ' + (vide.eteint ? 'éteint' : 'ALLUMÉ') + ' / ' + vide.ecran);

  /* 7. ET ÇA TIENT SUR LE PLUS PETIT ÉCRAN.
     C'est l'héritage de banc-essai/grille-livres.js, qui surveillait la grille
     des livres : sur la capture de Taylor elle s'arrêtait en plein milieu
     d'une rangée, « ce n'est pas il y en a plus au-dessus, c'est c'est cassé ».
     La grille a disparu avec les portes, mais la règle qu'elle défendait
     reste : sur un iPhone SE, l'écran « À revoir » se lit entier, sans rien de
     coupé et sans que la page glisse sous le doigt. */
  await p.setViewportSize({ width: 375, height: 667 });
  await p.evaluate((c) => { localStorage.setItem('bt_errbook', JSON.stringify(c)); ouvrirRevoir(); }, CARNET);
  await p.waitForTimeout(900);
  const petit = await p.evaluate(() => {
    const a = document.getElementById('app');
    const b = document.querySelector('.rv-go');
    return { debord: Math.max(0, a.scrollHeight - a.clientHeight),
             bouton: b ? Math.round(b.getBoundingClientRect().bottom) : -1, h: innerHeight };
  });
  v('sur un iPhone SE, tout tient sans défilement',
    petit.debord === 0 && petit.bouton > 0 && petit.bouton <= petit.h,
    petit.debord ? ('déborde de ' + petit.debord + ' px') : ('bouton à ' + petit.bouton + '/' + petit.h));

  if (errs.length) { ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
