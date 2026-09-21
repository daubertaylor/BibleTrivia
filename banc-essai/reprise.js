/* ====== BANC « UNE PARTIE SAUVEGARDÉE REPREND, MÊME CELLE D'AVANT » ======
   Le jeu sauvegarde la partie en cours (bt_game) et la reprend au démarrage :
   c'est ce qui fait qu'une mise en arrière-plan ne coûte rien au joueur. Ce
   paquet-là survit aux versions — celui qu'un téléphone porte aujourd'hui a pu
   être écrit il y a six mois, par un jeu qui n'avait pas les mêmes champs.

   Ce banc vérifie les deux bouts :
     1. UNE PARTIE ENTIÈRE, de la première question à l'écran de fin : la
        journée est marquée (c'est elle qui allume la flamme), le bandeau de
        fin dit ce qu'il faut, et rien ne lève.
     2. UNE PARTIE SAUVEGARDÉE PAR L'ANCIEN MONDE, avec le champ « daily:true »
        du Défi du jour, mode retiré depuis. Elle doit reprendre là où elle en
        était, s'afficher comme une partie ordinaire, et aller jusqu'au bout.
        « Je veux que tu fasses attention à ne jamais remettre à zéro la
        progression des joueurs, jamais. »

   Usage : node banc-essai/reprise.js       (le serveur 8099 doit tourner)
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
let f = 0;
const dit = (ok, ...r) => { if(!ok) f++; console.log((ok?'  ok  ':'FAUTE '), ...r); };
(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });

  /* ===== 1. UNE PARTIE SOLO ENTIÈRE, JUSQU'AU BOUT ===== */
  {
    const ctx = await nav.newContext({ viewport:{width:390,height:844}, serviceWorkers:'block', isMobile:true, hasTouch:true });
    const p = await ctx.newPage();
    const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
    await p.goto(URL, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => typeof state !== 'undefined' && state.screen === 'mode', null, { timeout:25000 });
    const r = await p.evaluate(async () => {
      state.mode = 'solo'; startGame();
      let tours = 0;
      while(state.screen === 'play' && tours < 60){
        if(!state.revealed) soloAnswer(0);
        nextQuestion();
        tours++;
      }
      let d = {}; try{ d = JSON.parse(localStorage.getItem('bt_daily')||'{}'); }catch(e){}
      const eyebrow = document.querySelector('.end-eyebrow');
      return { ecran:state.screen, tours, jour:d.last, serie:d.streak,
               titre:eyebrow ? eyebrow.textContent : 'PAS D’ÉCRAN DE FIN',
               flamme:(document.querySelector('.sem-flamme b')||{}).textContent };
    });
    const auj = new Date(); const p2 = n => String(n).padStart(2,'0');
    const cle = auj.getFullYear()+'-'+p2(auj.getMonth()+1)+'-'+p2(auj.getDate());
    dit(r.ecran === 'end', `une partie solo entière : écran « ${r.ecran} » après ${r.tours} tours`);
    dit(r.titre.indexOf('Partie terminée') >= 0 || r.titre.indexOf('record') >= 0, `le bandeau de fin dit « ${r.titre} »`);
    dit(r.jour === cle, `la journée est marquée (${r.jour}) et la série vaut ${r.serie}`);
    dit(!erreurs.length, 'aucune erreur JS' + (erreurs.length ? ' : ' + erreurs[0] : ''));
    await ctx.close();
  }

  /* ===== 2. UNE PARTIE SAUVEGARDÉE DE L'ANCIEN MONDE ===== */
  {
    const ctx = await nav.newContext({ viewport:{width:390,height:844}, serviceWorkers:'block', isMobile:true, hasTouch:true });
    const p = await ctx.newPage();
    const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
    /* Le paquet exact qu'écrivait la version du Défi du jour, « daily:true »
       compris, avec deux questions et un score en cours. */
    await p.addInitScript(() => {
      const q = (n) => ({ q:'Question '+n+' ?', options:['A','B','C','D'], correct:'A', fact:'Un fait.', tier:'facile', shuffledOptions:['A','B','C','D'] });
      localStorage.setItem('bt_game', JSON.stringify({ v:1, screen:'play', mode:'solo', lengthKey:'courte', timerKey:'30',
        teams:[], scores:[], soloScore:40, soloStreak:2, soloBestStreak:2, soloCorrect:2, soloSelected:null,
        soloMissed:[], themeKey:'tout', daily:true, revision:false,
        questions:[q(1), q(2), q(3)], currentIndex:2, revealed:false, awarded:[] }));
      localStorage.setItem('bt_daily_prog', JSON.stringify({ day:'2020-01-01', soloMissed:[] }));
    });
    await p.goto(URL, { waitUntil:'domcontentloaded' });
    await p.waitForFunction(() => typeof state !== 'undefined' && state.screen === 'play', null, { timeout:25000 });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({
      ecran:state.screen, score:state.soloScore, index:state.currentIndex,
      titre:(document.querySelector('.app-header .title, .app-header b, .app-header span')||{}).textContent || '',
      entete:(document.querySelector('.app-header')||{}).textContent || '',
      question:(document.querySelector('.question-card')||{}).textContent || '',
    }));
    dit(r.ecran === 'play' && r.score === 40 && r.index === 2,
        `la partie d'avant reprend où elle en était : écran ${r.ecran}, ${r.score} pts, question ${r.index+1}`);
    dit(r.entete.indexOf('Défi') < 0, `l'en-tête ne parle plus du Défi : « ${r.entete.trim().slice(0,40)} »`);
    dit(!erreurs.length, 'aucune erreur JS' + (erreurs.length ? ' : ' + erreurs[0] : ''));
    /* et elle va jusqu'au bout */
    const fin = await p.evaluate(() => { let t = 0;
      while(state.screen === 'play' && t < 30){ if(!state.revealed) soloAnswer(0); nextQuestion(); t++; }
      return state.screen; });
    dit(fin === 'end', `et elle se termine normalement (écran « ${fin} »)`);
    await ctx.close();
  }

  await nav.close();
  console.log(f ? `\n  ${f} FAUTES\n` : '\n  OK — une partie reprend où elle en était, même celle d\'une version d\'avant\n');
  process.exit(f ? 1 : 0);
})();
