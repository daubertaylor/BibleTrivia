/* ============ REVUE GÉNÉRALE : CHAQUE ÉCRAN, CHAQUE FORMAT ============
   « Une vérification de tout pour savoir si tout est absolument parfait :
   visuel, taille, affichage, bug. »
   On ne REGARDE pas des captures, on MESURE. Cinq défauts, sur tous les écrans
   du jeu et six formats de téléphone :

     1. DÉBORDEMENT HORIZONTAL. Toujours un défaut, sans exception : rien ne
        doit pouvoir se faire pousser sur le côté.
     2. UN ÉLÉMENT QUI SORT DE L'ÉCRAN. Un bord gauche négatif ou un bord droit
        au-delà de la largeur : quelque chose est coupé, et personne ne le voit
        tant qu'on ne teste pas ce format-là.
     3. UN TEXTE COUPÉ. Une boîte qui rogne son propre contenu — le mot qui
        finit en « … » ou pire, qui disparaît.
     4. UNE CIBLE TACTILE TROP PETITE. Sous quarante pixels, un doigt rate.
        Signalé plutôt que condamné : certaines pastilles sont décoratives et
        ne se touchent pas.
     5. UNE ERREUR JS, n'importe où dans le parcours.

   Usage : node banc-essai/revue.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const FORMATS = [
  ['petit Android',   360, 640],
  ['iPhone SE',       375, 667],
  ['iPhone 15',       393, 852],
  ['Xiaomi',          393, 873],
  ['iPhone Pro Max',  430, 932],
  ['écran très court',393, 560],
];

/* Chaque écran : un nom, le chemin pour y aller, et s'il a le DROIT de défiler
   verticalement. L'accueil, non : il doit tenir. */
const ECRANS = [
  ['accueil',        "state.screen='mode'; render();", false],
  ['jeu (question)', "state.mode='solo'; state.daily=false; startGame();", true],
  ['jeu (révélé)',   "state.revealed=false; state.soloSelected=null; soloAnswer(0);", true],
  ['résultats',      "state.currentIndex=state.questions.length-1; state.revealed=true; nextQuestion();", true],
  ['progression',    "state.screen='mode'; render(); openParcours();", true],
  ['à revoir',       "state.screen='mode'; render(); ouvrirRevoir();", true],
  ['en ligne',       "state.screen='online'; render();", true],
  ['groupe (mise en place)', "state.screen='setup'; render();", true],
  ['profil',         "state.screen='profile'; render();", true],
  ['flamme',         "state.screen='mode'; render(); ouvrirFlamme();", true],
  ['réglages',       "state.screen='mode'; render(); openSettings();", true],
  ['versions',       "openBibles();", true],
];

const RELEVE = (toleranceDefilement) => {
  const app = document.getElementById('app');
  const L = document.documentElement.clientWidth;
  const hors = [], coupes = [], petites = [];
  const voile = document.querySelector('.sheet-veil:not(.closing)');
  const racine = voile || app;
  const tous = racine.querySelectorAll('*');
  for (const el of tous) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const nom = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    /* 2. sortie d'écran — on ignore ce qui est volontairement hors champ
       (position fixe négative, couches de verre, éléments décoratifs). */
    const decor = el.classList.contains('gs') || el.classList.contains('glass-rim')
      || el.classList.contains('glass-refl') || cs.position === 'fixed';
    if (!decor && (r.left < -1 || r.right > L + 1)) {
      hors.push(nom + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + '] hors de 0..' + L);
    }
    /* 3. texte coupé par sa propre boîte */
    if (cs.overflow !== 'visible' && el.children.length === 0 && (el.textContent || '').trim()) {
      if (el.scrollWidth > el.clientWidth + 1) coupes.push(nom + ' « ' + el.textContent.trim().slice(0, 34) + ' »');
    }
    /* 4. cible tactile */
    const cliquable = el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.hasAttribute('onclick');
    if (cliquable && !el.disabled && (r.width < 40 || r.height < 40)) {
      petites.push(nom + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  return {
    debordH: app.scrollWidth - app.clientWidth,
    debordV: app.scrollHeight - app.clientHeight,
    hors, coupes, petites,
  };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const defauts = [], signales = [];
  for (const [nomF, w, h] of FORMATS) {
    const ctx = await nav.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:2,
      userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8', isCreator:true }));
      localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':14,'Jean':9,'Psaumes':22}, totalCorrect:505, bestStreak:22, flawless:3, ach:{premier:1,torah:1} }));
      localStorage.setItem('bt_stats', JSON.stringify({ bestScore:980, bestPct:92, games:61 }));
      const k=(n)=>{const d=new Date(Date.now()-n*86400000),z=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());};
      localStorage.setItem('bt_daily', JSON.stringify({ last:k(1), streak:5, jours:[k(1),k(2),k(3),k(4)], geles:[k(5)], gels:1, parties:12 }));
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof render === 'function' && typeof state === 'object'; } catch(e){ return false; } }, null, { timeout:20000 });
    /* un carnet bien rempli : c'est là que les textes s'allongent */
    await p.evaluate(() => {
      const tous=[]; ['facile','moyen','difficile'].forEach(t=>(BANK[t]||[]).forEach(q=>tous.push(Object.assign({},q,{tier:t}))));
      localStorage.setItem('bt_errbook', JSON.stringify(tous.slice(0,143).map(q=>({ k:qKey(q), n:2, p:0, du:dayKey(-1), maj:Date.now(), q:q.q, options:q.options, correct:q.correct, fact:q.fact, tier:q.tier }))));
      state.screen='mode'; render();
    });
    await p.waitForTimeout(1200);
    for (const [nomE, chemin, peutDefiler] of ECRANS) {
      try { await p.evaluate((c) => { new Function(c)(); }, chemin); }
      catch(e){ defauts.push(nomF + ' / ' + nomE + ' : impossible d\'y aller — ' + String(e.message).slice(0,70)); continue; }
      await p.waitForTimeout(700);
      const r = await p.evaluate(RELEVE, peutDefiler);
      const ou = nomF + ' / ' + nomE;
      if (r.debordH > 0) defauts.push(ou + ' : DÉBORDEMENT HORIZONTAL de ' + r.debordH + ' px');
      if (!peutDefiler && r.debordV > 0) defauts.push(ou + ' : débordement vertical de ' + r.debordV + ' px (cet écran doit tenir)');
      for (const x of r.hors.slice(0, 3)) defauts.push(ou + ' : sort de l\'écran — ' + x);
      for (const x of r.coupes.slice(0, 3)) defauts.push(ou + ' : texte coupé — ' + x);
      for (const x of [...new Set(r.petites)].slice(0, 4)) signales.push(ou + ' : cible ' + x);
    }
    if (errs.length) for (const e of [...new Set(errs)].slice(0,2)) defauts.push(nomF + ' : ERREUR JS — ' + e.slice(0,90));
    await ctx.close();
    console.log('  ' + nomF.padEnd(18) + w + 'x' + h + '  balayé');
  }
  await nav.close();
  console.log('');
  if (signales.length) {
    console.log('  À JUGER — cibles tactiles sous 40 px (' + signales.length + ') :');
    for (const s of [...new Set(signales)].slice(0, 12)) console.log('    · ' + s);
    console.log('');
  }
  if (defauts.length) {
    console.log('  DÉFAUTS (' + defauts.length + ') :');
    for (const d of defauts) console.log('    ✗ ' + d);
    console.log('\n  ÉCHEC');
    process.exit(1);
  }
  console.log('  OK — ' + FORMATS.length + ' formats × ' + ECRANS.length + ' écrans : rien ne déborde, rien n\'est coupé, aucune erreur');
})();
