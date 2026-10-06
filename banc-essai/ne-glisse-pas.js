/* ====== BANC « RIEN NE GLISSE SOUS LE DOIGT » ======
   « Adapte ta page pour qu'elle ne glisse plus lorsque je bouge mon doigt de
   haut en bas. Et pareil en ligne à deux joueurs : ça glisse un peu. Il faut
   que ça soit bien net et que ça ne bouge pas. »

   LE PREMIER BANC AVEC DE VRAIES ZONES SÛRES. Un navigateur sans tête met
   env(safe-area-inset-*) à zéro : on mesurait un téléphone qui n'existe pas.
   Chromium sait les simuler (Emulation.setSafeAreaInsetsOverride) : 62 px de
   Dynamic Island et 34 de barre d'accueil sur un iPhone 16 Pro installé.
   Mesuré ainsi, avant la correction : l'entrée des groupes dépassait de
   31 px, la réponse d'un duel de 91, celle du solo de 76 — et un écran qui
   dépasse se laisse tirer.

   Ce banc refuse, sur quatre iPhone à encoche :
   — un écran qui dépasse (donc qui défile) : entrée des groupes, salon à
     deux, question et réponse en duel, réponse en solo — pour la question du
     duel ET pour les vingt questions les plus longues du jeu ;
   — une réponse qui SAUTE quand on la touche : la question et les options
     doivent glisser jusqu'à leur nouvelle place (12 px par image au plus).

   Usage : node banc-essai/ne-glisse-pas.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONES = [ ['iPhone 16 Pro', 402, 874, 62, 34], ['iPhone 15', 393, 852, 59, 34], ['iPhone 13 mini', 375, 812, 50, 34], ['iPhone 15 Pro Max', 430, 932, 59, 34] ];
const DUEL = "net.oppPresent=true; net.opp={ id:'b', name:'Sam', color:'#E8574C' }; net.joueurs={ b:net.opp }; net.deck = seededDeck(12345, '9', null); net.timerKey='30'; net.score=50; net.oppScore=30; net.oppGone=false; net.idx=0; net.myDone=false; net.selected=null; net.revealed=false;";
const ECRANS = [
  ['entrée des groupes', "compte.dispo=true; compte.session={ user:{ id:'moi-0', email:'j@e.net' } }; compte.etape='connecte'; grp.installe=true; grp.ouverts=false; grp.etat={ participe:'regles', moderateur:true }; grp.modoMemo=true; grp.message=''; state.screen='groupes'; render(); majBarre();"],
  ['salon à deux', "net.isHost=true; net.code='42CJ'; net.joueurs={a:{id:'a',name:'Ana',color:'#E8734C',score:0,idx:0,done:false,gone:false,vu:Date.now()}}; majAdversaire(); state.screen='online-room'; render();"],
  ['duel · question', DUEL + " state.screen='online-play'; render();"],
  ['duel · réponse', DUEL + " net.selected=net.deck[0].correct; net.revealed=true; state.screen='online-play'; render();"],
];

let ko = 0;
const v = (nom, bon, detail) => { if(!bon) ko++; console.log('  ' + (bon ? 'ok   ' : 'KO   ') + nom + (detail ? '\n        ' + detail : '')); };

async function page(nav, W, H, HT, BS){
  const ctx = await nav.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:1, userAgent:IOS, hasTouch:true, isMobile:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p._errs = errs;
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets:{ top:HT, bottom:BS, left:0, right:0 } });
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' })); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.evaluate(() => document.documentElement.classList.add('is-standalone'));
  await p.waitForTimeout(600);
  return p;
}
const debord = (p) => p.evaluate(() => { const a = document.getElementById('app'); return { d: a.scrollHeight - a.clientHeight, ov: a.style.overflowY }; });

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  for (const [nom, W, H, HT, BS] of IPHONES) {
    console.log('\n  — ' + nom + ' (' + W + '×' + H + ', zones sûres ' + HT + '/' + BS + ') —');
    const p = await page(nav, W, H, HT, BS);
    for (const [ecran, js] of ECRANS) {
      await p.evaluate(js); await p.waitForTimeout(1300);
      const r = await debord(p);
      v(ecran + ' : tient, ne glisse pas', r.d <= 2 && r.ov === 'hidden', 'dépasse de ' + r.d + ' px, défilement ' + r.ov);
    }
    /* Les vingt questions les plus longues du jeu, révélées en solo. */
    const r = await p.evaluate(async () => {
      state.mode = 'solo'; startGame();
      await new Promise(z => setTimeout(z, 900));
      const banque = [].concat(...['facile','moyen','difficile'].map(t => BANK[t].map(x => Object.assign({ tier:t }, x))));
      const poids = x => texteQuestion(x).length * 2 + Math.max(...x.options.map(o => texteOption(x, o).length)) * 3 + texteFait(x).length;
      const longues = banque.sort((u, w) => poids(w) - poids(u)).slice(0, 20);
      const a = document.getElementById('app'), pires = [];
      for (const x of longues) {
        state.questions[0] = { q:x.q, options:x.options, correct:x.correct, fact:x.fact, tier:x.tier, shuffledOptions:x.options.slice() };
        state.currentIndex = 0; state.revealed = true; state.soloSelected = x.correct; render();
        const d = a.scrollHeight - a.clientHeight;
        if (d > 2) pires.push(d + ' px — « ' + texteQuestion(x).slice(0, 50) + '… »');
      }
      return pires;
    });
    v('solo · les 20 questions les plus longues tiennent', r.length === 0, r.slice(0, 3).join(' | '));
    if (p._errs.length) v('aucune erreur JS', false, [...new Set(p._errs)].slice(0, 2).join(' | '));
    await p.context().close();
  }

  /* La réponse glisse, elle ne saute pas. */
  console.log('\n  — toucher une réponse (iPhone 16 Pro) —');
  { const p = await page(nav, 402, 874, 62, 34);
    await p.evaluate(() => { state.mode = 'solo'; startGame(); }); await p.waitForTimeout(1500);
    const rel = await p.evaluate(() => new Promise(res => {
      const t0 = performance.now(), out = [];
      const lire = () => { const sc = document.querySelector('#app > .screen:not(.screen-exit)'); const q = sc.querySelector('.question-card');
        out.push(q ? q.getBoundingClientRect().top : null); };
      lire(); document.querySelector('.option-btn').click();
      const tic = () => { lire(); if (performance.now() - t0 < 900) requestAnimationFrame(tic); else res(out); };
      requestAnimationFrame(tic);
    }));
    let pire = 0; for (let i = 1; i < rel.length; i++) if (rel[i] != null && rel[i-1] != null) pire = Math.max(pire, Math.abs(rel[i] - rel[i-1]));
    const course = Math.abs(rel[rel.length-1] - rel[0]);
    const pose = Math.abs(rel[rel.length-1] - rel[rel.length-4]) < 0.5;
    v('la question glisse (≤ 12 px par image)', pire <= 12, 'pire : ' + pire.toFixed(1) + ' px, sur ' + course.toFixed(0) + ' px de course');
    v('…et se pose', pose);
    await p.context().close(); }

  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — rien ne glisse sous le doigt, et la réponse arrive sans saut');
  process.exit(ko ? 1 : 0);
})();
