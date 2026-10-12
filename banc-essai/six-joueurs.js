/* ====== SIX JOUEURS, UN SEUL ÉCRAN (v315) ======
   « Il faut que ça prenne en compte les six joueurs de la façon la plus
     optimale possible, tout en gardant le jeu cohérent. »
   Mesuré avant la v315, réponse révélée : 344 px à faire défiler sur un
   iPhone SE à six joueurs, 291 sur un iPhone 15, et déjà 177 à deux — deux
   listes des mêmes joueurs l'une sous l'autre (« Qui a trouvé ? », puis le
   tableau des scores).

   De deux à six joueurs, sur un iPhone SE, un iPhone 15 et un Android, avec
   des noms longs (Marie-Madeleine, Jean-Christophe) et la question la plus
   longue du jeu, dans les deux temps du tour (la question, puis la réponse) :
     1. le tour tient sur l'écran : rien à faire défiler ;
     2. question posée : chaque joueur a sa case de score, entière à l'écran,
        avec ses deux boutons − et + ;
     3. réponse révélée : un bouton « Qui a trouvé ? » par joueur, entier à
        l'écran, d'au moins 44 px de haut (la cible d'un doigt), sans
        chevauchement ; deux colonnes jusqu'à quatre joueurs (deux et deux,
        jamais trois plus un seul), trois à cinq et six ;
     4. chaque bouton porte le score de son joueur, et il suit dès qu'on le
        touche ;
     5. un nom court se lit en entier, un nom long garde au moins ses six
        premières lettres ;
     6. « Question suivante » est entière à l'écran ;
     7. la bonne réponse garde toute la largeur, en tête ; les trois autres
        tiennent sur UNE rangée dessous, entières (aucun mot ne dépasse de
        sa pastille) ;
     8. aucune erreur.
   Usage : node banc-essai/six-joueurs.js [url]   (défaut : http://127.0.0.1:8099/index.html) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const NOMS = ['Taylor', 'Marie-Madeleine', 'Sam', 'Jean-Christophe', 'Lee', 'Bénédicte'];
let ko = 0;
const dit = (quoi, bon, detail) => { if (!bon) { ko++; console.log('    KO  ' + quoi + (detail ? '  (' + detail + ')' : '')); } return bon; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    for (const [appareil, W, H, ua] of [['iPhone SE', 375, 667, IOS], ['iPhone 15', 393, 852, IOS], ['Android', 412, 915, AND]]) {
      console.log('  ' + appareil);
      const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, userAgent: ua, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      const p = await ctx.newPage(); const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });

      for (let n = 2; n <= 6; n++) {
        /* La question la plus longue du jeu, et son fait le plus long : le
           pire cas réel, pas un texte inventé. */
        await p.evaluate(([n, noms]) => {
          state.mode = 'group'; state.teams = noms.slice(0, n).map(x => ({ name: x }));
          state.screen = 'setup'; render(); startGame();
          /* Le niveau n'est pas dans la question, c'est la clé de sa corbeille. */
          const tous = ['facile', 'moyen', 'difficile'].flatMap(t => BANK[t].map(x => Object.assign({}, x, { tier: t })));
          const q = tous.sort((a, b) => (texteQuestion(b).length + texteFait(b).length) - (texteQuestion(a).length + texteFait(a).length))[0];
          state.questions = state.questions.map(() => ({ q: q.q, options: q.options, correct: q.correct, fact: q.fact, tier: q.tier, shuffledOptions: q.options.slice() }));
          state.scores = state.teams.map((_, i) => i * 10);
          state.currentIndex = 0; state.revealed = false; state.awarded = []; render();
        }, [n, NOMS]);
        await p.waitForTimeout(1000);
        const q = await p.evaluate(() => {
          const app = document.getElementById('app');
          const panes = [...document.querySelectorAll('.score-strip .score-pane')].map(e => {
            const r = e.getBoundingClientRect(); const b = [...e.querySelectorAll('.adj-btn')].map(x => x.getBoundingClientRect());
            return { haut: r.top, bas: r.bottom, g: r.left, d: r.right, btn: b.length, btnDedans: b.every(x => x.bottom <= innerHeight && x.right <= innerWidth && x.left >= 0) };
          });
          return { defile: app.scrollHeight - app.clientHeight, panes, ih: innerHeight, iw: innerWidth };
        });
        let bon = true;
        bon = dit(n + ' joueurs, question : le tour tient sur l\'écran', q.defile <= 1, q.defile + ' px à faire défiler') && bon;
        bon = dit(n + ' joueurs, question : une case de score par joueur, entière, avec − et +',
          q.panes.length === n && q.panes.every(x => x.haut >= 0 && x.bas <= q.ih && x.g >= 0 && x.d <= q.iw && x.btn === 2 && x.btnDedans), JSON.stringify(q.panes[0])) && bon;

        await p.evaluate(() => { revealAnswer(); });
        await p.waitForTimeout(1200);
        const r = await p.evaluate(() => {
          const app = document.getElementById('app');
          const grille = document.querySelector('.award-grid');
          const cols = grille ? getComputedStyle(grille).gridTemplateColumns.split(' ').length : 0;
          const btns = [...document.querySelectorAll('.award-grid .award-btn')].map((e, i) => {
            const r = e.getBoundingClientRect(); const nm = e.querySelector('.aw-name'); const sc = e.querySelector('.aw-sc');
            /* Les lettres VRAIMENT visibles : un Range mesure chaque lettre
               posée ; celles qui passent sous les points de suspension
               sortent de la boîte du nom. */
            let vues = 0;
            if (nm && nm.firstChild) {
              const boite = nm.getBoundingClientRect(); const t = nm.firstChild; const rg = document.createRange();
              for (let k = 0; k < t.length; k++) { rg.setStart(t, k); rg.setEnd(t, k + 1); const b = rg.getBoundingClientRect(); if (b.right <= boite.right + 0.5) vues++; else break; }
            }
            return { i, haut: r.top, bas: r.bottom, g: r.left, d: r.right, h: r.height, nom: nm ? nm.textContent : '', vues, sc: sc ? sc.textContent.trim() : null };
          });
          const ops = [...document.querySelectorAll('.options-grid .option-btn')].map(e => {
            const r = e.getBoundingClientRect(), t = e.querySelector('.opt-text');
            return { bonne: e.classList.contains('correct'), haut: Math.round(r.top), g: r.left, d: r.right, l: r.width,
              deborde: t ? t.scrollWidth > t.clientWidth + 1 : false };
          });
          const suivante = document.querySelector('.btn-next'); const s = suivante ? suivante.getBoundingClientRect() : null;
          return { defile: app.scrollHeight - app.clientHeight, cols, btns, ops, ih: innerHeight, iw: innerWidth, scores: state.scores.slice(),
            suivante: s && s.top >= 0 && s.bottom <= innerHeight, bandeau: !!document.querySelector('.score-strip') };
        });
        bon = dit(n + ' joueurs, réponse : le tour tient sur l\'écran', r.defile <= 1, r.defile + ' px à faire défiler') && bon;
        const colsAttendues = n >= 5 ? 3 : 2;
        bon = dit(n + ' joueurs, réponse : ' + colsAttendues + ' colonnes', r.cols === colsAttendues, r.cols + ' colonne(s)') && bon;
        const dehors = r.btns.filter(b => b.haut < 0 || b.bas > r.ih || b.g < 0 || b.d > r.iw);
        const petits = r.btns.filter(b => b.h < 44);
        let chevauche = 0;
        for (const a of r.btns) for (const b of r.btns) if (a.i < b.i && a.g < b.d - 0.5 && b.g < a.d - 0.5 && a.haut < b.bas - 0.5 && b.haut < a.bas - 0.5) chevauche++;
        bon = dit(n + ' joueurs, réponse : un bouton par joueur, entier, ≥ 44 px, sans chevauchement',
          r.btns.length === n && !dehors.length && !petits.length && !chevauche,
          r.btns.length + ' boutons, ' + dehors.length + ' dehors, ' + petits.length + ' trop bas (' + Math.round(Math.min(...r.btns.map(b => b.h))) + ' px), ' + chevauche + ' chevauchement(s)') && bon;
        bon = dit(n + ' joueurs, réponse : chaque bouton porte le score de son joueur', r.btns.every(b => b.sc === String(r.scores[b.i])), r.btns.map(b => b.sc).join(',') + ' / ' + r.scores.join(',')) && bon;
        const coupes = r.btns.filter(b => b.nom.length <= 9 ? b.vues < b.nom.length : b.vues < 6);
        bon = dit(n + ' joueurs, réponse : les noms se lisent', !coupes.length, coupes.map(b => b.nom + ' : ' + b.vues + ' lettres').join(', ')) && bon;
        bon = dit(n + ' joueurs, réponse : « Question suivante » entière à l\'écran', r.suivante, '') && bon;
        bon = dit(n + ' joueurs, réponse : une seule liste de joueurs (pas de tableau des scores dessous)', !r.bandeau, '') && bon;
        const bonne = r.ops.find(o => o.bonne), autres = r.ops.filter(o => !o.bonne);
        bon = dit(n + ' joueurs, réponse : la bonne en tête, pleine largeur ; les trois autres sur une rangée',
          !!bonne && autres.length === 3 && autres.every(o => o.haut === autres[0].haut && o.haut > bonne.haut) && bonne.l > 2.5 * autres[0].l,
          JSON.stringify(r.ops.map(o => [o.bonne ? 'bonne' : 'autre', o.haut, Math.round(o.l)]))) && bon;
        bon = dit(n + ' joueurs, réponse : aucun mot ne dépasse de sa pastille', r.ops.every(o => !o.deborde), '') && bon;

        /* Toucher le premier bouton : son score suit tout de suite. */
        const avant = r.scores[0];
        await p.locator('.award-grid .award-btn').first().tap();
        await p.waitForTimeout(500);
        const apres = await p.evaluate(() => ({ s: state.scores[0], aff: (document.querySelector('.award-grid .award-btn .aw-sc') || {}).textContent }));
        bon = dit(n + ' joueurs : le score du bouton suit quand on le touche', apres.s > avant && String(apres.s) === (apres.aff || '').trim(), avant + ' -> ' + apres.s + ', affiché ' + apres.aff) && bon;
        console.log('    ' + (bon ? 'OK  ' : '--  ') + n + ' joueurs (' + (r.cols) + ' colonnes, boutons de ' + Math.round(Math.min(...r.btns.map(b => b.h))) + ' px)');
      }
      dit(appareil + ' : aucune erreur', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 400)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — de deux à six joueurs, le tour tient sur un seul écran, et chaque joueur a sa place');
  process.exit(ko ? 1 : 0);
})();
