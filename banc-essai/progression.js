/* LA PROGRESSION NE DOIT JAMAIS RECULER. C'est la règle numéro un de Taylor :
   « fais attention à ne jamais remettre à zéro la progression des joueurs,
   jamais ». Le code s'en défend déjà (copie de secours, fusion au maximum à
   chaque écriture, refus d'écraser par du vide) — mais rien ne le VÉRIFIAIT.

   Le banc part d'une progression riche, joue tous les gestes qui pourraient
   la toucher, et relit après chacun. Un seul verdict : aucun compteur n'a
   baissé, aucun livre n'a perdu de terrain, aucun objectif n'a disparu.

       node progression.js          (jeu servi en HTTP sur 8099)
       TEMOIN=1 node progression.js (prouve que le banc sait voir un recul)

   Le témoin court-circuite la fusion (saveProgress écrit tel quel) puis
   enregistre une progression vide : le banc DOIT le voir. Un banc qui ne
   trouve rien doit d'abord prouver qu'il sait trouver. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const TEMOIN = process.env.TEMOIN === '1';

/* Une progression de joueur assidu : des livres entamés, un maîtrisé, une
   série, des sans-faute, des objectifs débloqués. */
const DEPART = {
  books: { 'Genèse': 24, 'Exode': 12, 'Marc': 30, 'Jean': 8, 'Apocalypse': 3 },
  totalCorrect: 412, bestStreak: 21, flawless: 5,
  ach: { 'premiers-pas': 1, 'centurion': 1, 'premier-livre': 1 },
};

/* Chaque geste que le joueur peut faire et qui approche la progression. */
const GESTES = [
  ['ouvrir la progression',   "state.screen='parcours'; render();"],
  ['déplier un testament',    "var t=document.querySelector('.tst-head'); if(t) t.click();"],
  ['ouvrir le profil',        "state.screen='profile'; render();"],
  ['changer de nom',          "profile.name='Taylor-2'; saveProfile(); render();"],
  ['changer de couleur',      "profile.color='#EE4A28'; saveProfile(); render();"],
  ['ouvrir les Réglages',     "state.screen='mode'; render(); openSettings();"],
  ['changer de Bible',        "settings.bible=(BIBLES[1]||BIBLES[0]).id; saveSettings(); render();"],
  ['fermer les Réglages',     "closeSettings();"],
  ['jouer une partie ratée',  "state.mode='solo'; startGame(); state.questions.forEach(function(){}); state.currentIndex=state.questions.length-1; state.soloScore=0; state.soloCorrect=0; state.revealed=true; render();"],
  ['finir sur zéro',          "state.screen='end'; state.soloScore=0; state.soloCorrect=0; state.soloBestStreak=0; state.soloMissed=[]; render();"],
  ['quitter en cours',        "state.mode='solo'; startGame(); state.screen='mode'; render();"],
  ['mode groupe',             "state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render();"],
  ['aller en ligne',          "state.screen='online'; render();"],
  ['revenir à l accueil',     "state.screen='mode'; render();"],
  ['défi du jour',            "try{ startDaily(); }catch(e){}"],
  ['retour accueil',          "state.screen='mode'; render();"],
];

const lire = (p) => p.evaluate(() => {
  const r = { brut: localStorage.getItem('bt_progress'), bak: localStorage.getItem('bt_progress_bak') };
  try { r.p = loadProgress(); } catch(e){ r.p = null; }
  return r;
});

/* Ce qui recule entre deux relevés. */
function reculs(av, ap) {
  const out = [];
  if (!ap || !ap.p) return ['la progression est devenue illisible'];
  const a = av.p, b = ap.p;
  for (const k of ['totalCorrect', 'bestStreak', 'flawless'])
    if ((b[k] | 0) < (a[k] | 0)) out.push(k + ' : ' + a[k] + ' -> ' + b[k]);
  for (const livre in (a.books || {}))
    if ((+b.books[livre] || 0) < (+a.books[livre] || 0))
      out.push('livre ' + livre + ' : ' + a.books[livre] + ' -> ' + (b.books[livre] | 0));
  for (const o in (a.ach || {}))
    if (a.ach[o] && !(b.ach || {})[o]) out.push('objectif « ' + o +' » perdu');
  return out;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  /* ===== ON NE SÈME QU'UNE FOIS =====
     addInitScript se rejoue à CHAQUE navigation, rechargement compris. Sans
     ce garde-fou, le rechargement du test réécrivait lui-même la progression
     de départ par-dessus celle du joueur : le banc accusait le jeu d'avoir
     perdu quatre objectifs qu'il avait parfaitement enregistrés. Le geste que
     l'on veut mesurer ne doit jamais être celui de l'instrument. */
  await p.addInitScript((d) => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    if (localStorage.getItem('banc_seme')) return;
    localStorage.setItem('banc_seme', '1');
    localStorage.setItem('bt_progress', JSON.stringify(d));
    localStorage.setItem('bt_progress_bak', JSON.stringify(d));
  }, DEPART);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  if (TEMOIN) {
    /* On coupe le filet : saveProgress écrit désormais tel quel. */
    await p.evaluate(() => { window.saveProgress = function(x){
      try{ localStorage.setItem('bt_progress', JSON.stringify(x)); localStorage.setItem('bt_progress_bak', JSON.stringify(x)); }catch(e){} }; });
  }

  let ref = await lire(p);
  console.log('  départ : ' + ref.p.totalCorrect + ' bonnes réponses, ' + Object.keys(ref.p.books).length +
    ' livres, série ' + ref.p.bestStreak + ', ' + Object.keys(ref.p.ach).length + ' objectif(s)\n');
  let fautes = 0;
  for (const [nom, geste] of GESTES) {
    try { await p.evaluate((q) => { new Function(q)(); }, geste); } catch(e){}
    await p.waitForTimeout(420);
    if (TEMOIN && nom === 'changer de Bible') {
      /* le geste qui, sans filet, effacerait tout */
      await p.evaluate(() => saveProgress({ books:{}, totalCorrect:0, bestStreak:0, flawless:0, ach:{} }));
      await p.waitForTimeout(120);
    }
    const ap = await lire(p);
    const r = reculs(ref, ap);
    if (r.length) { fautes += r.length;
      console.log('   ' + nom.padEnd(24) + ' <-- RECUL : ' + r.join(' | ')); }
    else console.log('   ' + nom.padEnd(24) + ' ' + ap.p.totalCorrect + ' / série ' + ap.p.bestStreak +
      ' / ' + Object.keys(ap.p.books).length + ' livres / ' + Object.keys(ap.p.ach).length + ' obj.');
    ref = ap;
  }

  /* ===== LES DEUX ACCIDENTS : mémoire abîmée, et rechargement ===== */
  console.log('');
  const avantChoc = ref;
  await p.evaluate(() => { try{ localStorage.setItem('bt_progress', '{ceci n est pas du JSON'); }catch(e){} });
  await p.reload();
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.waitForTimeout(500);
  let ap = await lire(p);
  let r = reculs(avantChoc, ap);
  if (r.length) { fautes += r.length; console.log('   mémoire abîmée + rechargement  <-- RECUL : ' + r.join(' | ')); }
  else console.log('   mémoire abîmée + rechargement  réparée depuis la copie de secours : ' + ap.p.totalCorrect + ' bonnes réponses');

  const avantVide = ap;
  await p.evaluate(() => { try{ saveProgress({ books:{}, totalCorrect:0, bestStreak:0, flawless:0, ach:{} }); }catch(e){} });
  await p.waitForTimeout(200);
  ap = await lire(p);
  r = reculs(avantVide, ap);
  if (r.length) { fautes += r.length; console.log('   enregistrement d une progression vide  <-- RECUL : ' + r.join(' | ')); }
  else console.log('   enregistrement d une progression vide  refusé : ' + ap.p.totalCorrect + ' bonnes réponses');

  if (errs.length) console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | '));
  const ok = fautes === 0 && !errs.length;
  console.log(ok ? '\n  OK — la progression n a reculé nulle part'
                 : '\n  ECHEC : ' + fautes + ' recul(s)');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
