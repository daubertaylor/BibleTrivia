/* LA RÈGLE DES 44 PX — MESURÉE LÀ OÙ LE DOIGT TOMBE.

   Apple demande 44 points dans les deux sens pour tout ce qui se touche. Le
   jeu s'en réclame déjà (« la zone tactile est bien plus grande que le trait
   visible », dit le commentaire de la poignée des feuilles) — encore
   faut-il le vérifier.

   ET LA BOÎTE NE SUFFIT PAS À LE DIRE. Un bouton peut être plus petit que sa
   zone (un pseudo-élément l'étend), ou plus GRAND qu'elle (un parent qui
   découpe à overflow:hidden coupe aussi le test de survol). On ne mesure donc
   pas getBoundingClientRect : on demande à la page, point par point, QUI
   reçoit le toucher — elementFromPoint respecte les pseudo-éléments, les
   découpes et les recouvrements, exactement comme un vrai doigt.

   Pour chaque cible on part du centre et on s'éloigne dans les quatre
   directions tant que le toucher revient au bouton : la somme donne la
   largeur et la hauteur RÉELLEMENT touchables.

       node doigt.js        (jeu servi en HTTP sur 8099)

   Repère : 44 px dans les deux sens. Deux exceptions documentées plus bas. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const MIN = 44;
/* CE QUE LE JEU ASSUME, ET POURQUOI. Une exception doit s'écrire, sinon
   c'est un défaut qu'on a oublié. */
const TOLERE = {
  '.switch':  'interrupteur — 51x31, la taille exacte d\'un UISwitch iOS',
  '.icon-btn': 'rond d\'en-tête, 39 px : il porte du verre, donc une découpe, donc\n' +
               '                          seule sa boîte pourrait grandir — et l\'en-tête entier grandirait\n' +
               '                          de 5,8 px sur TOUS les écrans. Cinq pixels de zone ne valent pas ça.',
  'input':     'champ de texte, 40 px : on le vise sur toute sa largeur (238 px),\n' +
               '                          et le clavier s\'ouvre au moindre contact.',
  '.set-go':   'bouton Guide / version, 34 px : porté à 44, il devenait une grosse\n' +
               '                          pastille corail pour une action secondaire. Il porte du verre, donc une\n' +
               '                          découpe : ni pseudo-élément ni bordure transparente ne peuvent agrandir\n' +
               '                          la zone sans grossir le dessin ou détacher son ombre. Le dessin gagne.',
};
const ECRANS = [
  ['accueil',      "state.screen='mode'; render();"],
  ['solo',         "state.mode='solo'; state.screen='setup'; render();"],
  ['groupe',       "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'}]; state.screen='setup'; render();"],
  ['jeu',          "state.mode='solo'; startGame();"],
  ['fin',          "state.screen='end'; state.soloScore=80; state.soloCorrect=3; state.soloBestStreak=2; state.soloMissed=[{q:'a',correct:'b',chosen:'c',fact:'d'}]; render();"],
  ['erreurs',      "openMissedReview();"],
  ['progression',  "closeMissedReview(); state.screen='parcours'; render();"],
  ['profil',       "state.screen='profile'; render();"],
  ['réglages',     "state.screen='mode'; render(); openSettings();"],
  ['versions',     "openBibles();"],
  ['en ligne',     "closeBibles(); closeSettings(); state.screen='online'; render();"],
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
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  const vus = {};
  for (const [nom, prep] of ECRANS) {
    try { await p.evaluate((q) => { new Function(q)(); }, prep); }
    catch(e){ console.log('  (' + nom + ' injoignable)'); continue; }
    await p.waitForTimeout(650);
    const r = await p.evaluate(() => {
      const out = [];
      const cibles = [...document.querySelectorAll('button, [onclick], a, input, .switch, .mode-card')];
      for (const e of cibles) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || e.disabled) continue;
        const b = e.getBoundingClientRect();
        if (b.width < 1 || b.height < 1) continue;
        if (b.top < 4 || b.bottom > innerHeight - 4 || b.left < 4 || b.right > innerWidth - 4) continue;
        const cx = b.left + b.width/2, cy = b.top + b.height/2;
        /* le point central doit d'abord revenir au bouton, sinon quelque
           chose le recouvre et la mesure ne veut rien dire */
        const au = (x,y) => { const t = document.elementFromPoint(x,y); return t && (t === e || e.contains(t) || (t.parentElement && t.parentElement === e)); };
        if (!au(cx, cy)) continue;
        const porte = (dx, dy) => { let d = 0; while (d < 40 && au(cx + dx*(d+1), cy + dy*(d+1))) d++; return d; };
        const w = porte(1,0) + porte(-1,0) + 1, h = porte(0,1) + porte(0,-1) + 1;
        const fam = (e.className && typeof e.className === 'string')
          ? '.' + e.className.trim().split(/\s+/).slice(0,2).join('.') : e.tagName.toLowerCase();
        out.push({ fam, w, h, boite: Math.round(b.width) + 'x' + Math.round(b.height), aria: e.getAttribute('aria-label') || '' });
      }
      return out;
    });
    r.forEach(x => { const k = x.fam; if (!vus[k] || Math.min(x.w,x.h) < Math.min(vus[k].w,vus[k].h)) vus[k] = { ...x, ecran: nom }; });
  }
  const l = Object.values(vus);
  const petits = l.filter(x => (x.w < MIN || x.h < MIN) && !Object.keys(TOLERE).some(t => x.fam.startsWith(t)));
  const tolerees = l.filter(x => (x.w < MIN || x.h < MIN) && Object.keys(TOLERE).some(t => x.fam.startsWith(t)));
  petits.sort((a,b) => Math.min(a.w,a.h) - Math.min(b.w,b.h));
  console.log('  ' + l.length + ' cibles mesurées au doigt, ' + petits.length + ' sous ' + MIN + ' px\n');
  petits.forEach(x => console.log('   ' + String(x.w).padStart(4) + ' x ' + String(x.h).padStart(4) +
    '   (boîte ' + x.boite.padEnd(10) + ') ' + x.fam.padEnd(26) + ' [' + x.ecran + ']' + (x.aria ? '  « ' + x.aria + ' »' : '')));
  tolerees.forEach(x => console.log('   ' + String(x.w).padStart(4) + ' x ' + String(x.h).padStart(4) +
    '   ' + x.fam.padEnd(38) + ' ADMIS : ' + (TOLERE[Object.keys(TOLERE).find(t => x.fam.startsWith(t))])));
  if (errs.length) { console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  const ok = petits.length === 0 && !errs.length;
  console.log(ok ? '\n  OK — tout ce qui se touche fait au moins ' + MIN + ' px' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
