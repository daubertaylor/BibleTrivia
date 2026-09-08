/* LA TYPOGRAPHIE FRANÇAISE, SUR TOUT CE QUI S'AFFICHE.

   En français, les ponctuations DOUBLES — ! ? ; : et les guillemets « » —
   veulent une espace INSÉCABLE, pas une espace ordinaire : sinon le signe
   peut se retrouver seul en début de ligne. Le jeu la respecte presque
   partout (160 occurrences), ce qui rend les exceptions d'autant plus
   visibles : Taylor avait déjà repéré un espace manquant sur un verset.

   Le test ne relit pas le code — il regarde CE QUI S'AFFICHE :

     - toute la banque de questions (énoncés, réponses, anecdotes), les
       versets de l'accueil, les objectifs, les noms de livres : lus dans les
       données de la page, donc à 100 %, sans dépendre du tirage au sort ;
     - le texte réellement rendu sur douze écrans, pour tout ce qui est écrit
       dans le HTML et non dans les données.

   Ce qu'il refuse :
     espace ORDINAIRE devant ! ? ; : ou »        (doit être insécable)
     guillemet ouvrant « collé au mot suivant
     ponctuation ! ou ? collée au mot qui précède (il faut une espace)

   Ce qu'il laisse passer : « Jean 3:16 » et « 8:39 » — deux-points sans
   espace entre chiffres, c'est la règle pour les références et les heures.
   Et l'intérieur des guillemets : le texte biblique du jeu est la Segond
   1910, dont la typographie d'époque colle le point d'exclamation au mot
   (« ne lui dites pas: Salut! »). Corriger cela réécrirait la citation.

   ENFIN, LA CONSÉQUENCE. La règle ne vaut que par ce qu'elle évite : un « ? »
   tombé SEUL en début de ligne. Le test le compte pour de vrai — il écrit
   chaque énoncé dans le vrai bloc de texte de la carte, par le vrai chemin
   d'affichage, et demande au navigateur où il coupe ses lignes.

   ATTENTION AU CONTENANT. Une première version écrivait dans la CARTE et non
   dans son bloc de texte : cela refaisait la mise en page dans un conteneur
   flex centré, plus large, avec d'autres points de coupure — et annonçait 78
   orphelins qui n'existaient pas. Dans le vrai bloc, il y en a ZÉRO, avant
   comme après. Le relevé reste, en garde-fou pour le contenu à venir ; il
   n'est pas la justification du correctif, qui est une affaire de cohérence.
   (Le détecteur, lui, a été éprouvé sur un cas fabriqué exprès : il voit bien
   une dernière ligne de 9,3 px.)

       node typo.js        (jeu servi en HTTP sur 8099) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const ECRANS = [
  ['accueil',      "state.screen='mode'; render();"],
  ['solo',         "state.mode='solo'; state.screen='setup'; render();"],
  ['groupe',       "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'}]; state.screen='setup'; render();"],
  ['jeu',          "state.mode='solo'; startGame();"],
  ['fin',          "state.screen='end'; state.soloScore=80; state.soloCorrect=3; state.soloBestStreak=2; state.soloMissed=[]; render();"],
  ['progression',  "state.screen='parcours'; render();"],
  ['profil',       "state.screen='profile'; render();"],
  ['réglages',     "state.screen='mode'; render(); openSettings();"],
  ['versions',     "openBibles();"],
  ['en ligne',     "closeBibles(); closeSettings(); state.screen='online'; render();"],
  ['rejoindre',    "state.screen='online-join'; render();"],
  ['salon',        "net.isHost=true; net.code='42CJ'; net.joueurs={}; majAdversaire(); state.screen='online-room'; render();"],
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
    localStorage.setItem('bt_stats', JSON.stringify({ bestScore:900, bestPct:100, games:85 }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  /* Les règles, écrites une fois et appliquées aux deux sources. */
  const REGLES = `
    const N = String.fromCharCode(160), F = String.fromCharCode(8239);
    function fautes(t){
      const r = [];
      if(!t || typeof t !== 'string') return r;
      let m;
      const re1 = /[^\\s]( )([!?;:»])/g;
      while((m = re1.exec(t)) !== null) r.push(['espace ordinaire devant « ' + m[2] + ' »', t]);
      const re2 = /«[^\\s]/g;
      while((m = re2.exec(t)) !== null) r.push(['guillemet ouvrant collé', t]);
      /* UNE CITATION SE REPRODUIT TELLE QUELLE. Le texte biblique du jeu est
         la Segond 1910, dont la typographie d'époque colle le point
         d'exclamation au mot (« ne lui dites pas: Salut! »). Corriger cela
         reviendrait à réécrire la citation — ce qui est exclu. On ne
         reproche donc l'absence d'espace qu'HORS des guillemets. */
      const horsCitation = t.replace(/«[^»]*»?/g, ' ');
      const re3 = /[a-zà-öø-ÿA-ZÀ-ÖØ-Þ0-9)]([!?])/g;
      while((m = re3.exec(horsCitation)) !== null) r.push(['aucune espace devant « ' + m[1] + ' »', t]);
      return r;
    }
  `;

  /* ===== 1. les DONNÉES : toute la banque, d'un coup ===== */
  const surDonnees = await p.evaluate((REGLES) => {
    new Function(REGLES + '; window.__fautes = fautes;')();
    const out = [];
    /* ON LIT CE QUI S'AFFICHE, PAS CE QUI EST ÉCRIT. Les 1545 questions sont
       stockées avec des espaces ordinaires ; c'est escapeHtml qui pose les
       insécables au moment du rendu (voir typoFr). Passer par lui, c'est
       éprouver le vrai chemin — et laisser passer ce que la donnée seule
       aurait signalé à tort. */
    const voir = (t, ou) => {
      if (typeof t !== 'string') return;
      (window.__fautes(escapeHtml(t)) || []).forEach(f => out.push([ou, f[0], f[1]]));
    };
    let nb = 0;
    try { Object.keys(BANK).forEach(k => BANK[k].forEach(q => {
      nb++; voir(q.q, 'question'); voir(q.correct, 'réponse'); voir(q.fact, 'anecdote');
      (q.options || []).forEach(o => voir(o, 'option'));
    })); } catch(e){}
    try { HERO_VERSES.forEach(v => { voir(v.t || v.texte || v[0], 'verset'); voir(v.r || v.ref || v[1], 'référence'); }); } catch(e){}
    try { ACHIEVEMENTS.forEach(a => { voir(a.t, 'objectif'); voir(a.d, 'objectif'); }); } catch(e){}
    try { BIBLE_BOOKS.forEach(l => voir(typeof l === 'string' ? l : l.n, 'livre')); } catch(e){}
    try { BIBLES.forEach(v => { voir(v.nom, 'version'); voir(v.desc, 'version'); }); } catch(e){}
    return { out, nb };
  }, REGLES);

  /* ===== 2. le TEXTE RENDU, écran par écran ===== */
  const surEcran = [];
  for (const [nom, prep] of ECRANS) {
    try { await p.evaluate((prep) => { new Function(prep)(); }, prep); }
    catch(e){ surEcran.push([nom, 'ÉCRAN INJOIGNABLE', e.message.slice(0,50)]); continue; }
    await p.waitForTimeout(650);
    const r = await p.evaluate((REGLES) => {
      new Function(REGLES + '; window.__fautes = fautes;')();
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue; if (!t || !t.trim()) continue;
        const par = n.parentElement; if (!par) continue;
        const cs = getComputedStyle(par);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        (window.__fautes(t) || []).forEach(f => out.push([f[0], t.trim().slice(0, 70)]));
      }
      return out;
    }, REGLES);
    r.forEach(x => surEcran.push([nom, x[0], x[1]]));
  }

  /* Les données du jeu servent aussi à peupler les écrans : on ne compte pas
     deux fois la même phrase. */
  const vues = new Set();
  const lignes = [];
  surDonnees.out.forEach(([ou, quoi, t]) => { const k = quoi + '|' + t; if (!vues.has(k)) { vues.add(k); lignes.push([ou, quoi, t]); } });
  surEcran.forEach(([ou, quoi, t]) => { const k = quoi + '|' + t; if (!vues.has(k)) { vues.add(k); lignes.push([ou, quoi, t]); } });

  console.log('  banque relue : ' + surDonnees.nb + ' questions, plus versets, objectifs, livres et versions');
  console.log('  écrans relus : ' + ECRANS.length + '\n');
  if (!lignes.length) console.log('  aucune faute');
  lignes.forEach(([ou, quoi, t]) => console.log('   [' + String(ou).padEnd(12) + '] ' + quoi.padEnd(34) + ' | ' + t.slice(0, 74)));
  /* ===== 3. la conséquence : des ponctuations orphelines ===== */
  console.log('');
  let orphelins = 0;
  for (const [w, h, nomEcran] of [[375, 667, 'iPhone SE'], [393, 852, 'iPhone 15']]) {
    await p.setViewportSize({ width: w, height: h });
    await p.evaluate(() => { state.mode = 'solo'; startGame(); });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const el = document.querySelector('.question-card .qtext') || document.querySelector('.question-card');
      if (!el) return null;
      const toutes = []; Object.keys(BANK).forEach(k => BANK[k].forEach(q => toutes.push(q)));
      const garde = el.innerHTML;
      const dispo = el.getBoundingClientRect().width;
      let seuls = 0, large = 0, pire = '';
      for (const q of toutes) {
        el.innerHTML = escapeHtml(q.q);          // le VRAI chemin d'affichage
        const rg = document.createRange(); rg.selectNodeContents(el);
        const boites = [...rg.getClientRects()].filter(b => b.width > 0.5);
        for (const b of boites) if (b.width > large) { large = b.width; pire = q.q; }
        if (boites.length > 1 && boites[boites.length - 1].width < 14) seuls++;
      }
      el.innerHTML = garde;
      return { n: toutes.length, seuls, large: Math.round(large * 10) / 10, dispo: Math.round(dispo * 10) / 10, pire };
    });
    if (!r) { console.log('  ' + nomEcran + ' : carte de question introuvable'); continue; }
    orphelins += r.seuls;
    const deborde = r.large > r.dispo + 1;
    if (deborde) orphelins += 1000;
    console.log('  ' + nomEcran.padEnd(12) + ' : ' + String(r.seuls).padStart(3) + ' énoncé(s) sur ' + r.n +
      ' finissent par une ponctuation seule sur sa ligne   |   ligne la plus large ' +
      r.large + ' px pour ' + r.dispo + (deborde ? '   <-- DÉBORDE : ' + r.pire : ''));
  }
  if (errs.length) console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | '));
  const ok = lignes.length === 0 && orphelins === 0 && !errs.length;
  console.log(ok ? '\n  OK — typographie française respectée partout, aucune ponctuation orpheline'
                 : '\n  ECHEC : ' + lignes.length + ' cas d\'écriture, ' + orphelins + ' orphelin(s)');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
