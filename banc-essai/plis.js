/* TOUT LE JEU TOURNE-T-IL SUR LA MÊME HORLOGE ?

   Un PLI, c'est ce qui s'ouvre, se ferme ou se remplit SUR PLACE : un
   testament qui se déplie, une ligne de joueur qui naît ou s'en va, une barre
   de progression, l'anneau des résultats, un compteur qui monte.

   Ils tournaient sur SIX horloges : 0,26s le chevron, 0,34s la ligne de
   joueur, 0,52s le pli du testament, 0,55s la barre, 1s l'anneau, et
   0,6 / 0,9 / 1s les compteurs. Aucune raison, juste l'ordre d'écriture.

   PUIS TAYLOR A DEMANDÉ LE PLI PARTOUT : « les transitions de changement de
   page, comme pour les testaments, exactement pareil ». Ce qui ARRIVE — un
   écran, une carte de question, une réponse, une feuille, une fenêtre —
   tournait encore sur sa propre courbe, plus brutale au départ. Le banc
   vérifie donc AUSSI ces animations-là : elles doivent porter la durée et la
   courbe de --tr-plie, comme les plis.

   Le test lit la durée ET la courbe RÉELLEMENT appliquées à chacun, sur son
   propre écran, puis mesure image par image les deux seuls qui déplacent la
   mise en page (le testament et la ligne de joueur) : course, saut maximum
   par image, et instant où 80 % du chemin est fait.

       node plis.js        (jeu servi en HTTP sur 8099)

   Repères : une seule durée et une seule courbe pour toute la famille ;
   saut <= 40 px/image. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

/* La courbe telle que le navigateur la RÉÉCRIT (espaces normalisés). */
const norme = (s) => (s || '').replace(/\s+/g, '');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12,'Exode':8,'Matthieu':10}, correct:360, streakBest:21, ach:{'premiers-pas':1} }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  const releves = [];
  const lire = async (nom, prep, sel, prop, taille) => {
    if (taille) { await p.setViewportSize({ width: taille.w, height: taille.h }); await p.waitForTimeout(260); }
    const r = await p.evaluate(({ prep, sel, prop }) => {
      // eslint-disable-next-line no-new-func
      new Function(prep)();
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const props = cs.transitionProperty.split(',').map(s => s.trim());
      const durs = cs.transitionDuration.split(',').map(s => s.trim());
      const curs = cs.transitionTimingFunction.split(/,(?![^()]*\))/).map(s => s.trim());
      let i = props.indexOf(prop);
      if (i < 0) i = props.indexOf('all');
      if (i < 0) return { manquant: props.join('/') };
      return { d: durs[i % durs.length], c: curs[i % curs.length] };
    }, { prep, sel, prop });
    releves.push([nom, r]);
  };

  const attente = (ms) => p.waitForTimeout(ms);

  /* Ce qui ARRIVE est joué par une @keyframes, pas par une transition : on lit
     donc animation-duration / animation-timing-function, sur un élément qui
     porte VRAIMENT sa classe d'entrée au moment de la lecture. */
  const lireAnim = async (nom, prep, sel, taille) => {
    if (taille) { await p.setViewportSize({ width: taille.w, height: taille.h }); await p.waitForTimeout(260); }
    /* On laisse passer DEUX images : plusieurs classes d'entrée (.animate sur
       la carte de question, par exemple) ne sont posées qu'au rendu suivant.
       Lire trop tôt, c'est lire « aucune animation » sur une animation qui va
       très bien — le genre de faux négatif qui fait corriger le mauvais bout.
       Et on vise le nœud qui ARRIVE, jamais celui qui s'en va : pendant un
       demi-tour d'horloge ils coexistent tous les deux dans #app. */
    const r = await p.evaluate(({ prep, sel }) => new Promise(res => {
      // eslint-disable-next-line no-new-func
      new Function(prep)();
      setTimeout(() => {
        const el = document.querySelector(sel);
        if (!el) return res(null);
        const cs = getComputedStyle(el);
        if (!cs.animationName || cs.animationName === 'none') return res({ manquant: 'aucune animation' });
        res({ d: cs.animationDuration.split(',')[0].trim(),
              c: cs.animationTimingFunction.split(/,(?![^()]*\))/)[0].trim() });
      }, 120);
    }), { prep, sel });
    releves.push([nom, r]);
  };

  await lire('testament (le pli)', "state.screen='parcours'; render();", '.tst .tst-body', 'grid-template-rows');
  await lire('testament (chevron)', "", '.tst-chev', 'transform');
  await attente(200);
  /* On lance une VRAIE partie : fabriquer des questions à la main finit
     toujours par mentir sur la forme réelle des données. */
  await lire('barre de progression', "state.mode='solo'; startGame();", '.progress-fill', 'width');
  /* Le repère pâle des AUTRES joueurs n'existe qu'en ligne. On le pose dans
     la piste réelle de l'écran de jeu : c'est bien la règle du jeu qui le
     peint, appliquée à un vrai élément, pas une lecture de feuille de style. */
  await lire('barre (repère des autres)',
    "var t=document.querySelector('.progress-track'); if(t && !t.querySelector('.progress-ghost')){ var g=document.createElement('div'); g.className='progress-ghost'; t.appendChild(g); }",
    '.progress-ghost', 'width');
  await attente(200);
  await lire('anneau des résultats', "state.screen='end'; state.mode='solo'; state.soloScore=80; state.soloCorrect=3; state.soloBestStreak=2; state.soloMissed=[]; state.questions=new Array(9).fill(0).map((_,i)=>({q:'q'+i,tier:'moyen'})); render();", '.ring-fg', 'stroke-dashoffset');
  await attente(300);
  await lire('feuille qui recule', "openSettings();", '#settingsVeil .settings-sheet', 'transform');
  await p.evaluate(() => closeSettings());
  await attente(400);
  /* La ligne de joueur : son pli est posé en style EN LIGNE, au moment du geste. */
  const ligne = await p.evaluate(() => {
    state.screen = 'setup'; state.mode = 'group'; state.teams = [{name:'Taylor'},{name:'Sarah'}]; render();
    return new Promise(res => setTimeout(() => {
      addTeam();
      requestAnimationFrame(() => {
        const rows = document.querySelectorAll('.team-row');
        const r = rows[rows.length - 1];
        const cs = getComputedStyle(r);
        const i = cs.transitionProperty.split(',').map(s => s.trim()).indexOf('height');
        res(i < 0 ? { manquant: cs.transitionProperty } : {
          d: cs.transitionDuration.split(',')[i].trim(),
          c: cs.transitionTimingFunction.split(/,(?![^()]*\))/)[i].trim() });
      });
    }, 400));
  });
  releves.push(['ligne de joueur', ligne]);
  /* Les compteurs (points, pourcentage, scores du duel) sont animés en JS.
     Sur la version d'avant, msPli() n'existe pas : chaque appel portait sa
     propre durée écrite à la main. On le dit au lieu de planter. */
  const cpt = await p.evaluate(() => {
    try { return { ms: msPli() }; } catch(e){ return { ms: null }; }
  });

  /* ===== ce qui ARRIVE : même horloge que les plis ===== */
  await lireAnim("changement d'écran", "state.screen='parcours'; render();", '#app > .screen-enter:not(.screen-exit)');
  await attente(700);
  /* La carte ne s'anime que sur une question NEUVE (fresh) : une partie déjà
     lancée plus haut dans ce banc a laissé lastPlayedQ sur zéro, et la carte
     serait arrivée sans animation — un faux « INTROUVABLE ». On remet le
     compteur à moins un pour retrouver la vraie arrivée. */
  await lireAnim('carte de question', "state.screen='mode'; render(); state.mode='solo'; startGame(); lastPlayedQ=-1; render();", '.question-card.animate');
  await lireAnim('réponse (option)', "", '.options-grid.animate .option-btn');
  await attente(700);
  await lireAnim("retour à l'accueil", "state.screen='mode'; render();", '#app > .screen-enter:not(.screen-exit)');
  await attente(700);
  await lireAnim('fenêtre modale', "showModal({title:'Test', message:'Test.', okLabel:'Oui', cancelLabel:'Non'});", '.modal-card');
  await p.evaluate(() => { document.querySelectorAll('.modal-veil, .modal-back').forEach(m => m.remove()); });
  await attente(300);

  await lireAnim('verrou paysage (arrive)', "", '#rotate-lock', {w:852,h:393});
  await lire('logo qui s\'efface', "", '.hero-icon-wrap', 'transform', {w:393,h:852});
  await lire('verset qui arrive', "", '.hero-verse-card', 'transform');
  await attente(300);

  const ref = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tr-plie').trim());
  const refD = (ref.match(/([\d.]+)s/) || [,''])[1] + 's';
  const refC = norme_(ref.replace(/^[\d.]+s\s*/, ''));
  function norme_(s){ return s.replace(/\s+/g,''); }

  console.log('  --tr-plie = ' + ref + '   (msPli() = ' + cpt.ms + ' ms)\n');
  let ok = true;
  for (const [nom, r] of releves) {
    if (!r) { console.log('  ' + nom.padEnd(26) + ' INTROUVABLE'); ok = false; continue; }
    if (r.manquant) { console.log('  ' + nom.padEnd(26) + ' propriété non animée (' + r.manquant + ')'); ok = false; continue; }
    const bon = r.d === refD && norme(r.c) === norme(refC);
    if (!bon) ok = false;
    console.log('  ' + nom.padEnd(26) + r.d.padEnd(8) + norme(r.c).padEnd(34) + (bon ? '' : '  <-- AUTRE HORLOGE'));
  }
  const bonCpt = cpt.ms !== null && Math.abs(cpt.ms - Math.round(parseFloat(refD) * 1000)) <= 1;
  if (!bonCpt) ok = false;
  console.log('  ' + 'compteurs (JS)'.padEnd(26) + (cpt.ms === null ? 'chacun' : cpt.ms + 'ms').padEnd(8) +
    'easeOutCubic'.padEnd(34) + (bonCpt ? '' : '  <-- AUTRE HORLOGE'));

  /* ===== ET TOUT CE QUI S'EN VA : UNE SEULE HORLOGE AUSSI =====
     « Il faut que ce soit ultra cohérent », y compris pour revenir en arrière.
     Les fermetures sont plus courtes que les ouvertures, et c'est voulu : on
     regarde une chose qui arrive, on ne regarde pas une chose qui s'en va.
     Mais il n'en faut QU'UNE — le voile des feuilles s'effaçait sur sa propre
     courbe (ease) à côté de la nôtre, deux horloges pour un seul geste. */
  const fermetures = [];
  const lireFerme = async (nom, prep, sel) => {
    const r = await p.evaluate(({ prep, sel }) => new Promise(res => {
      // eslint-disable-next-line no-new-func
      new Function(prep)();
      setTimeout(() => {
        const el = document.querySelector(sel);
        if (!el) return res(null);
        const cs = getComputedStyle(el);
        if (!cs.animationName || cs.animationName === 'none') return res({ manquant:'aucune animation' });
        res({ d: cs.animationDuration.split(',')[0].trim(),
              c: cs.animationTimingFunction.split(/,(?![^()]*\))/)[0].trim() });
      }, 60);
    }), { prep, sel });
    fermetures.push([nom, r]);
  };
  await p.setViewportSize({ width:393, height:852 }); await attente(300);
  await p.evaluate(() => { state.screen='mode'; render(); }); await attente(700);
  /* L'écran QUI SORT n'a pas d'animation, et c'est voulu : sur les deux
     moteurs de verre il disparaît net (« display:none »), pour ne pas faire
     composer au navigateur les couches floutées de DEUX écrans à la fois.
     On le relève pour mémoire, sans le compter comme une horloge de plus. */
  const sortieEcran = await p.evaluate(() => new Promise(res => {
    state.screen = 'parcours'; render();
    setTimeout(() => { const e = document.querySelector('.screen-exit');
      res(e ? getComputedStyle(e).display + ' / ' + getComputedStyle(e).animationName : 'aucun'); }, 60);
  }));
  await attente(700);
  await p.evaluate(() => { showModal({title:'T',message:'T',okLabel:'Oui',hideCancel:true}); }); await attente(400);
  await lireFerme('fenêtre qui se ferme', "closeModal();", '.modal-veil.closing .modal-card');
  await lireFerme('voile de la fenêtre', "", '.modal-veil.closing');
  await attente(700);
  await p.evaluate(() => { state.screen='mode'; render(); }); await attente(600);
  await p.evaluate(() => { openSettings(); }); await attente(700);
  await lireFerme('feuille qui se ferme', "closeSettings();", '#settingsVeil.closing .settings-sheet');
  await lireFerme('voile de la feuille', "", '#settingsVeil.closing');
  await attente(700);
  /* Le verrou paysage : on le fait apparaître puis on redresse le téléphone. */
  await p.setViewportSize({ width:852, height:393 }); await attente(500);
  await p.setViewportSize({ width:393, height:852 }); await attente(40);
  await lireFerme('verrou paysage (s\'en va)', "", 'html.rl-sort #rotate-lock');
  await attente(700);

  const refF = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tr-ferme').trim());
  const refFD = (refF.match(/([\d.]+)s/) || [,''])[1] + 's';
  const refFC = norme(refF.replace(/^[\d.]+s\s*/, ''));
  console.log('\n  --tr-ferme = ' + refF + '   (msFerme() = ' + await p.evaluate(()=>{ try{ return msFerme(); }catch(e){ return null; } }) + ' ms)\n');
  console.log('  ' + 'écran qui sort'.padEnd(26) + 'disparaît net, sans animation : ' + sortieEcran + '  (voulu)');
  for (const [nom, r] of fermetures) {
    if (!r) { console.log('  ' + nom.padEnd(26) + ' INTROUVABLE'); ok = false; continue; }
    if (r.manquant) { console.log('  ' + nom.padEnd(26) + ' ' + r.manquant); ok = false; continue; }
    const bon = r.d === refFD && norme(r.c) === norme(refFC);
    if (!bon) ok = false;
    console.log('  ' + nom.padEnd(26) + r.d.padEnd(8) + norme(r.c).padEnd(34) + (bon ? '' : '  <-- AUTRE HORLOGE'));
  }

  /* ===== le profil image par image des deux plis qui DÉPLACENT la page ===== */
  const profil = async (nom, prep, cible) => {
    const suite = await p.evaluate(({ prep, cible }) => new Promise(res => {
      new Function(prep)();
      const el = document.querySelector(cible);
      if (!el) return res(null);
      const releve = []; const t0 = performance.now();
      const tic = () => { const t = performance.now() - t0;
        releve.push([Math.round(t), Math.round(el.getBoundingClientRect().top * 10) / 10]);
        if (t < 900) requestAnimationFrame(tic); else res(releve); };
      requestAnimationFrame(tic);
    }), { prep, cible });
    if (!suite) { console.log('  ' + nom + ' : cible introuvable'); ok = false; return; }
    const y0 = suite[0][1], y1 = suite[suite.length - 1][1];
    const course = Math.abs(y1 - y0);
    let saut = 0;
    for (let i = 1; i < suite.length; i++) saut = Math.max(saut, Math.abs(suite[i][1] - suite[i-1][1]));
    let t80 = 0;
    for (const [t, y] of suite) { if (Math.abs(y - y0) >= course * 0.8) { t80 = t; break; } }
    const bon = saut <= 40;
    if (!bon) ok = false;
    console.log('  ' + nom.padEnd(26) + 'course ' + String(Math.round(course)).padStart(4) + ' px  |  saut max ' +
      saut.toFixed(1).padStart(5) + ' px/image  |  80 % à ' + String(t80).padStart(4) + ' ms' + (bon ? '' : '   <-- SECOUSSE'));
  };
  console.log('');
  await p.evaluate(() => { state.screen = 'parcours'; render(); });
  await attente(700);
  await profil('pli du testament', "toggleTst(document.querySelector('.tst-head'));", '.ach-card');
  await attente(900);
  await p.evaluate(() => { state.screen = 'setup'; state.mode = 'group'; state.teams = [{name:'Taylor'},{name:'Sarah'}]; render(); });
  await attente(700);
  await profil('naissance d\'une ligne', "addTeam();", '.add-team');

  if (errs.length) { console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); ok = false; }
  console.log(ok ? '\n  OK — une seule horloge pour TOUT le jeu' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
