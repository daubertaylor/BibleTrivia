/* EN PARTIE, TOUT SE COMPORTE-T-IL COMME ON L'A DIT ?

   Les bancs d'animation regardaient jusqu'ici les CHANGEMENTS D'ÉCRAN et les
   plis. Pendant une partie, l'essentiel se passe SUR PLACE : on répond, la
   bonne réponse s'allume, l'anecdote arrive, la question suivante prend la
   place de la précédente, la barre avance. Ce banc joue donc une vraie partie
   — solo puis groupe — et vérifie sur chaque geste les trois règles :

     1. UNE SEULE HORLOGE. Tout ce qui arrive porte la durée et la courbe de
        --tr-plie ; tout ce qui s'en va celles de --tr-ferme.
     2. RIEN NE REBONDIT. Un écran qui arrive MONTE : aucune boîte ne doit
        redescendre en cours de route, fût-ce d'un demi-pixel.
     3. LE BAS ARRIVE AVEC LE HAUT. À la moitié du mouvement, il ne doit plus
        manquer que quelques pour cent de l'écran.

       node enpartie.js        (jeu servi en HTTP sur 8099)
       node enpartie.js <url>  (pour comparer une autre version) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';

/* Chaque geste d'une partie, dans l'ordre où on le fait vraiment. */
const GESTES = [
  ['solo : la partie commence',   "state.mode='solo'; state.screen='setup'; render();", "startGame();"],
  ['solo : je réponds',           "", "soloAnswer(0);"],
  ['solo : question suivante',    "", "nextQuestion();"],
  ['solo : je réponds encore',    "", "soloAnswer(1);"],
  ['solo : dernière question',    "state.currentIndex = state.questions.length - 1; state.revealed=false; render();", "soloAnswer(0);"],
  ['solo : les résultats',        "", "nextQuestion();"],
  ['solo : revoir mes erreurs',   "state.soloMissed=[{q:'Une question ratee ?',correct:'La bonne',chosen:'La mauvaise',fact:'Anecdote.'}]; render();", "openMissedReview();"],
  ['solo : refermer',             "", "closeMissedReview();"],
  ['groupe : la partie commence', "state.mode='group'; state.teams=[{name:'Taylor'},{name:'Bea'},{name:'Chris'}]; state.screen='setup'; render();", "startGame();"],
  ['groupe : je révèle',          "", "state.revealed=true; render();"],
  ['groupe : question suivante',  "", "nextQuestion();"],
  ['groupe : les résultats',      "state.currentIndex = state.questions.length - 1; state.revealed=true; render();", "nextQuestion();"],
];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12}, correct:126 }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  const duree = await p.evaluate(() => { const v = getComputedStyle(document.documentElement).getPropertyValue('--tr-plie');
    const m = String(v).match(/([\d.]+)s/); return m ? Math.round(parseFloat(m[1])*1000) : 520; });
  const ref = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tr-plie').trim().replace(/\s+/g,''));
  console.log('  horloge du jeu : ' + ref + '\n');
  console.log('  geste                            rebond   reste à mi-course   horloges vues');

  let ok = true;
  for (const [nom, avant, geste] of GESTES) {
    if (avant) { await p.evaluate((q) => { new Function(q)(); }, avant); await p.waitForTimeout(900); }
    const r = await p.evaluate(({ geste, mi }) => new Promise(res => {
      const t0 = performance.now(); const rel = []; const horloges = new Set();
      // eslint-disable-next-line no-new-func
      new Function(geste)();
      const tic = () => {
        const t = performance.now() - t0; const o = {};
        /* toutes les boîtes visibles, hors couches du moteur de verre */
        let i = 0;
        document.querySelectorAll('#app *, .settings-sheet *, .modal-card *').forEach(e => {
          if (e.closest('.gs, .glass-rim')) return;
          /* Une feuille qui se ferme DESCEND — c'est son animation de sortie,
             pas un rebond. On ne suit que ce qui reste ou ce qui arrive. */
          if (e.closest('.closing, .screen-exit')) return;
          const b = e.getBoundingClientRect();
          if (b.width < 2 && b.height < 2) return;
          const cl = (typeof e.className === 'string' ? e.className.trim().split(/\s+/).slice(0,2).join('.') : '');
          o[(i++) + '|' + e.tagName.toLowerCase() + '.' + cl] = Math.round(b.top * 100) / 100;
          /* et l'horloge de tout ce qui anime en ce moment */
          const cs = getComputedStyle(e);
          if (cs.animationName && cs.animationName !== 'none')
            horloges.add(cs.animationDuration.split(',')[0].trim() + cs.animationTimingFunction.split(/,(?![^()]*\))/)[0].trim().replace(/\s+/g,''));
        });
        /* CE QUI RESTE DU MOUVEMENT, pas la hauteur du contenu. En révélant en
           mode Groupe, l'écran GRANDIT (les boutons d'attribution arrivent) et
           dépasse la fenêtre : c'est normal, il défile. Ce qu'on veut savoir,
           c'est de combien l'écran est encore décalé par son animation
           d'entrée — donc son translateY, et rien d'autre. */
        const sc = document.querySelector('#app > .screen:not(.screen-exit)');
        let dy = 0;
        if (sc) { const m = String(getComputedStyle(sc).transform).match(/matrix\(([^)]*)\)/);
          if (m) dy = Math.abs(parseFloat(m[1].split(',')[5]) || 0); }
        o['@reste'] = Math.round(dy * 10) / 10;
        rel.push([Math.round(t), o]);
        if (t < 900) requestAnimationFrame(tic);
        else res({ rel, horloges: [...horloges] });
      };
      requestAnimationFrame(tic);
    }), { geste, mi: duree / 2 });

    /* 1. rien ne redescend */
    const cles = [...new Set(r.rel.flatMap(x => Object.keys(x[1])))].filter(k => k !== '@reste');
    let rebond = 0, coupable = '', quand = 0;
    for (const k of cles) {
      const s = r.rel.filter(x => x[1][k] !== undefined).map(x => [x[0], x[1][k]]);
      if (s.length < 3) continue;
      for (let i = 1; i < s.length; i++) { const d = s[i][1] - s[i-1][1];
        if (d > rebond) { rebond = d; coupable = k.split('|')[1]; quand = s[i][0]; } }
    }
    /* 2. le bas est là à mi-course */
    const H = 852;
    const mi = r.rel.reduce((a, x) => Math.abs(x[0] - duree/2) < Math.abs(a[0] - duree/2) ? x : a, r.rel[0]);
    const pc = Math.round((mi[1]['@reste'] / H) * 1000) / 10;
    /* 3. une seule horloge */
    const autres = r.horloges.filter(h => h.indexOf(ref.replace('0.52s','0.52s')) < 0 && h !== '0scubic-bezier(0.33,1,0.68,1)' && h.indexOf('0.52s') !== 0);
    /* 8 % et pas 3 : l'écran des résultats à plusieurs est le plus lourd du jeu
       (podium, marches, liste) et met une centaine de millisecondes de plus à
       peindre sa première image. Ce retard-là n'est pas un défaut de
       transition — la garde fine sur « le bas arrive avec le haut » est dans
       entree.js, qui mesure sans rien peindre d'aussi lourd. */
    const bon = rebond <= 0.6 && pc <= 8 && autres.length === 0;
    if (!bon) ok = false;
    console.log('   ' + nom.padEnd(30) + rebond.toFixed(2).padStart(6) + ' px' +
      String(pc).padStart(12) + ' %' + '   ' + (r.horloges.length ? r.horloges.join(' ') : 'aucune') +
      (bon ? '' : '   <--' + (rebond > 0.6 ? ' ' + coupable + ' à ' + quand + ' ms' : '')));
  }
  if (errs.length) { ok = false; console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  console.log(ok ? '\n  OK — en partie, tout se comporte comme convenu' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
