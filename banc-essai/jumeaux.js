/* LE MÊME JEU POUR TOUT LE MONDE — MÊME ÉCRAN, DEUX TÉLÉPHONES.

   Règle de Taylor : « le jeu doit être toujours le même pour tout le monde,
   peu importe leur réglage ». Le moteur de verre est déjà unique (gl-xf
   partout), mais le fichier lit encore l'appareil à plusieurs endroits :
   notifications, plein écran, avance du reflet au défilement. Aucun de ces
   embranchements ne doit déplacer quoi que ce soit.

   Le banc ouvre EXACTEMENT le même écran, à la même taille, une fois avec
   l'identité d'un iPhone et une fois avec celle d'un Android, et compare
   toutes les boîtes une à une.

       node jumeaux.js            (jeu servi en HTTP sur 8099)
       TEMOIN=1 node jumeaux.js   (fabrique un écart, doit ÉCHOUER)

   Repère : zéro déplacement. LA FEUILLE DES RÉGLAGES est la seule exception,
   et tout ce qui s'ouvre DEDANS avec elle. Deux choses y diffèrent
   légitimement, et c'est leur raison d'être :
     - le guide d'installation ne dit pas la même chose des deux côtés ;
     - la ligne « Rappel de série » n'existe pas sur un iPhone tant que le jeu
       n'est pas posé sur l'écran d'accueil : iOS y refuserait la permission
       d'office, et un refus est définitif. Une ligne de plus d'un côté
       décale tout ce qui la suit dans la feuille — y compris la liste des
       versions, qui s'ouvre à l'intérieur.
   Rien de tout cela ne concerne les quatorze autres écrans, qui doivent rester
   identiques au dixième de pixel. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const TEMOIN = process.env.TEMOIN === '1';
/* Les Réglages et le guide disent volontairement autre chose selon le
   téléphone : on les relève, on ne les compte pas comme un défaut. */
const EXCEPTIONS = new Set(['reglages', 'versions', 'guide']);
const ECRANS = [
  ["accueil",     "state.screen='mode'; render(); var v=document.getElementById('homeVerse'); if(v) v.textContent='Verset fige pour la mesure';"],
  ["groupe",      "state.mode='group'; state.teams=[{name:'Taylor'},{name:'Bea'}]; state.screen='setup'; render();"],
  ["solo",        "state.mode='solo'; state.screen='setup'; render();"],
  ["jeu",         "state.mode='solo'; startGame(); state.questions=state.questions.map(function(q,i){ return {q:'Question figee numero '+i+' ?', options:['Reponse A','Reponse B','Reponse C','Reponse D'], shuffledOptions:['Reponse A','Reponse B','Reponse C','Reponse D'], correct:'Reponse A', fact:'Anecdote figee.', tier:'moyen'}; }); state.currentIndex=0; state.revealed=false; render();"],
  ["reponse",     "state.revealed=true; render();"],
  ["fin",         "state.screen='end'; state.soloScore=80; state.soloCorrect=3; state.soloBestStreak=2; state.soloMissed=[{q:'a',correct:'b',chosen:'c',fact:'d'}]; render();"],
  ["erreurs",     "openMissedReview();"],
  ["progression", "closeMissedReview(); state.screen='parcours'; render();"],
  ["profil",      "state.screen='profile'; render();"],
  ["reglages",    "state.screen='mode'; render(); openSettings();"],
  ["versions",    "openBibles();"],
  ["guide",       "closeBibles(); openFsGuide();"],
  ["enligne",     "document.querySelectorAll('.modal-back,.modal-veil').forEach(function(m){m.remove();}); closeSettings(); state.screen='online'; render();"],
  ["salon",       "net.isHost=true; net.code='42CJ'; net.joueurs={}; majAdversaire(); state.screen='online-room'; render();"],
];

async function lire(b, ua, android) {
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:ua, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12,'Exode':8}, correct:126 }));
  });
  if (TEMOIN && android) {
    /* Un écart fabriqué exprès, du seul côté Android : le banc DOIT le voir. */
    await p.addInitScript(() => {
      addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = '.mode-card{ margin-left: 7px; }';
        document.head.appendChild(s);
      });
    });
  }
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  const tout = {};
  for (const [nom, prep] of ECRANS) {
    try { await p.evaluate((q) => { new Function(q)(); }, prep); } catch(e){}
    await p.waitForTimeout(650);
    tout[nom] = await p.evaluate(() => {
      const o = {}; let i = 0;
      document.querySelectorAll('#app *, .settings-sheet *, .modal-card *, .bible-sheet *').forEach(e => {
        if (e.closest('.gs, .glass-rim')) return;
        const b = e.getBoundingClientRect();
        if (b.width < 1 && b.height < 1) return;
        const cl = (typeof e.className === 'string' ? e.className.trim().split(/\s+/).slice(0,2).join('.') : '');
        o[(i++) + '|' + e.tagName + '.' + cl] =
          [Math.round(b.left*10)/10, Math.round(b.top*10)/10, Math.round(b.width*10)/10, Math.round(b.height*10)/10];
      });
      return o;
    });
  }
  const ident = await p.evaluate(() => ({ ios: (typeof IS_IOS!=='undefined') && IS_IOS,
    android: (typeof IS_ANDROID!=='undefined') && IS_ANDROID,
    tel: (typeof IS_PHONE!=='undefined') && IS_PHONE,
    moteur: document.documentElement.className }));
  await ctx.close();
  return { tout, ident };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const a = await lire(b, IOS, false);
  const c = await lire(b, AND, true);
  console.log('  iPhone  : IS_IOS=' + a.ident.ios + ' IS_ANDROID=' + a.ident.android + ' IS_PHONE=' + a.ident.tel + '  <html class="' + a.ident.moteur + '">');
  console.log('  Android : IS_IOS=' + c.ident.ios + ' IS_ANDROID=' + c.ident.android + ' IS_PHONE=' + c.ident.tel + '  <html class="' + c.ident.moteur + '">\n');
  let fautes = 0, boites = 0;
  for (const ecran of Object.keys(a.tout)) {
    let pire = 0, ou = '', absents = 0;
    for (const k of Object.keys(a.tout[ecran])) {
      boites++;
      const A = a.tout[ecran][k], B = c.tout[ecran] && c.tout[ecran][k];
      if (!B) { absents++; continue; }
      for (let i = 0; i < 4; i++) { const d = Math.abs(A[i] - B[i]); if (d > pire) { pire = d; ou = k; } }
    }
    const exception = EXCEPTIONS.has(ecran);
    const mauvais = (pire > 0.6 || absents > 0) && !exception;
    if (mauvais) fautes++;
    console.log('   ' + ecran.padEnd(13) + String(Object.keys(a.tout[ecran]).length).padStart(4) + ' boîtes  écart ' +
      pire.toFixed(1).padStart(6) + ' px' + (absents ? '  ' + absents + ' absente(s)' : '') +
      (mauvais ? '   <-- PAS LE MÊME JEU  (' + ou + ')' : (exception && (pire > 0.6 || absents) ? '   (écart admis : feuille des Réglages)' : '')));
  }
  console.log('\n  ' + boites + ' boîtes comparées sur ' + Object.keys(a.tout).length + ' écrans');
  const ok = fautes === 0;
  console.log(ok ? '  OK — même jeu sur les deux téléphones' : '  ECHEC : ' + fautes + ' écran(s) différent(s)');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
