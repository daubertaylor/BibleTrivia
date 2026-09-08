/* LE MOT DE LA FIN NE DOIT JAMAIS SE TROMPER DE JOUEUR.

   « Beau début ! Chaque partie t'apprend un peu plus. » s'affichait à
   quelqu'un qui en était à sa 85e partie avec 100 % de record — parce que le
   mot ne lisait QUE le score du jour. Et il ne lisait jamais autre chose :
   même palier, même phrase, à chaque fois.

   Le test balaie une grille de joueurs (nombre de parties x record x score
   du jour) et vérifie trois choses :

     justesse    aucune phrase de DÉBUTANT chez quelqu'un qui a de la
                 bouteille — c'est le défaut signalé ;
     variété     deux parties consécutives dans le même palier ne se disent
                 pas avec les mêmes mots ;
     stabilité   le même joueur, la même partie, redemandée dix fois, donne
                 dix fois le même texte (le jeu doit être identique pour tout
                 le monde, et un re-rendu ne doit rien changer).

       node motfin.js        (jeu servi en HTTP sur 8099) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
/* Les mots réservés à qui commence VRAIMENT. */
const DEBUTANT = ['Beau début', 'Premiers pas', 'Le début est toujours le plus raide'];
const PROFILS = [
  { nom:'toute première partie', games:1,  best:20 },
  { nom:'cinquième partie',      games:5,  best:45 },
  { nom:'dixième partie',        games:10, best:70 },
  { nom:'habitué (85e, 100 %)',  games:85, best:100 },
  { nom:'habitué modeste (40e)', games:40, best:38 },
];
const SCORES = [0, 15, 28, 44, 55, 70, 88, 100];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  let ok = true;
  for (const pr of PROFILS) {
    const lignes = await p.evaluate(({ pr, SCORES }) => {
      localStorage.setItem('bt_stats', JSON.stringify({ bestScore: 999, bestPct: pr.best, games: pr.games }));
      return SCORES.map(s => {
        const a = soloPerformanceMessage(s);
        /* stabilité : dix appels de suite doivent rendre le même texte */
        let stable = true;
        for (let k = 0; k < 10; k++) if (soloPerformanceMessage(s) !== a) stable = false;
        return [s, a, stable];
      });
    }, { pr, SCORES });
    console.log('\n  ' + pr.nom + '   (' + pr.games + ' parties, record ' + pr.best + ' %)');
    for (const [sc, txt, stable] of lignes) {
      const bebe = DEBUTANT.some(d => txt.indexOf(d) === 0 || txt.indexOf(d) >= 0);
      const faux = bebe && !(pr.games <= 5 && pr.best < 65);
      if (faux || !stable) ok = false;
      console.log('    ' + String(sc).padStart(3) + ' %  ' + txt +
        (faux ? '   <-- MOT DE DÉBUTANT' : '') + (stable ? '' : '   <-- INSTABLE'));
    }
  }
  /* La variété : trois parties de suite au même score, chez le même joueur. */
  console.log('\n  trois parties de suite à 28 % (85e, 86e, 87e) :');
  const suite = await p.evaluate(() => [85,86,87].map(g => {
    localStorage.setItem('bt_stats', JSON.stringify({ bestScore:999, bestPct:100, games:g }));
    return soloPerformanceMessage(28);
  }));
  suite.forEach((t,i) => console.log('    partie ' + (85+i) + ' : ' + t));
  const varie = new Set(suite).size === suite.length;
  if (!varie) ok = false;
  console.log('    -> ' + (varie ? 'trois textes différents' : 'IL SE RÉPÈTE'));

  if (errs.length) { console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); ok = false; }
  console.log(ok ? '\n  OK' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
