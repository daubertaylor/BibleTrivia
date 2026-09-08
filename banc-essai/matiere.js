/* LA MATIÈRE SUFFIT-ELLE ?  C'est le test qui a permis de retirer le filet.
   Pour chaque surface de chaque écran, il compare la luminance mesurée
   6 à 12 px À L'INTÉRIEUR de la boîte à celle mesurée 6 à 12 px À L'EXTÉRIEUR
   — donc en sautant l'anneau d'un pixel où se peindrait un bord. L'écart
   qui reste, c'est ce que la MATIÈRE seule délimite.

   Repère : sous ~12, l'œil ne sépare plus les deux fonds et la surface a
   besoin d'autre chose (une ombre, un écart, une ligne). Au-dessus, un bord
   dessiné ne délimite rien de plus : il pose un trait sur une frontière qui
   se lit déjà.

       cd banc-essai
       node matiere.js /tmp/mesure mat        # capture
       python3 matiere.py /tmp/mesure mat     # mesure

   Le jeu doit être servi en HTTP (les polices ne se chargent pas en file://).
   Relevé de la v167 : 71 surfaces, minimum 27,8, médiane 110,6, aucune sous 12. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const D = process.argv[2] || '/tmp/mesure', TAG = process.argv[3] || 'mat';
const URL = process.argv[4] || 'http://127.0.0.1:8099/index.html';
const VUES = [
  ['accueil',   () => { state.screen='mode'; render(); }],
  ['solo',      () => { state.mode='solo'; state.screen='setup'; render(); }],
  ['groupe',    () => { state.mode='group'; state.teams=[{name:'Taylor'},{name:'Ana'}]; state.screen='setup'; render(); }],
  ['jeu',       () => { state.mode='solo'; startGame(); state.screen='play'; render(); }],
  ['fin',       () => { state.screen='end'; state.soloScore=110; state.soloCorrect=7; state.soloBestStreak=3;
                        state.questions=new Array(15); state.soloMissed=new Array(8); render(); }],
  ['ligne',     () => { state.screen='online'; render(); }],
  ['parcours',  () => { state.screen='parcours'; render(); }],
  ['profil',    () => { state.screen='profile'; render(); }],
  ['reglages',  () => { state.screen='mode'; render(); openSettings(); }],
  ['bibles',    () => { state.screen='mode'; render(); openSettings(); setTimeout(()=>openBibles(),300); }],
];
/* Toutes les surfaces du système : celles qui portent un rôle de rebord,
   plus toute surface de verre (.has-gs) — aucune ne doit échapper au test. */
const SEL = '.has-gs,.app-header,.icon-btn,.card,.mode-card,.question-card,.fact-card,.solo-summary,.solo-score-bar,.score-pane,.option-btn,.info-card,.rules,.btn-review,.daily-card,.parcours-card,.parcours-sum,.tst-head,.presence-card,.searching-card,.waiting-card,.waiting-note,.online-action,.btn-ghost,.btn-newgame,.share-btn,.btn-invite,.award-btn,.leave-banner,.modal-btn,.chip,.len-chip,.q-counter,.timer-chip,.tier-chip,.streak-chip,.rev-item,.bible-item,.me-row,.vs-row,.rank-row,.team-row,.add-team,.text-input,.code-input,.bk,.dc-streak,.adj-btn,.sj,.btn-primary,.btn-next,.btn-replay,.btn-reveal,.sheet-done,.set-go';
(async () => {
  fs.mkdirSync(D, { recursive: true });
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  /* serviceWorkers:'block' — sinon le worker reprend la main et renvoie au splash. */
  const ctx = await b.newContext({ viewport:{width:402,height:874}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8',isCreator:true})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen==='mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  const tout = {};
  for (const [nom, aller] of VUES) {
    try { await p.evaluate(`(${aller.toString()})()`); } catch(e) { console.log('  !! ' + nom + ' : ' + e.message); continue; }
    await p.waitForTimeout(1100);
    const boites = await p.evaluate((sel) => {
      const dedans = (el, x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t===el || el.contains(t)); };
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 14) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.95) continue;
        /* une surface cachée par un ancêtre translucide donnerait un faux écart */
        let a = el, cache = false;
        while (a && a !== document.body) { if (parseFloat(getComputedStyle(a).opacity) < 0.95) cache = true; a = a.parentElement; }
        if (cache) continue;
        /* on sonde le bord gauche à mi-hauteur : jamais dans les coins arrondis */
        const rad = parseFloat(cs.borderTopLeftRadius) || 0;
        if (r.height < 2*rad + 6) continue;
        const yM = Math.round(r.top + r.height/2);
        if (!dedans(el, Math.round(r.left)+5, yM)) continue;   /* occultée : on passe */
        if (dedans(el, Math.round(r.left)-5, yM)) continue;    /* le dehors, c'est encore nous */
        out.push({ cls: el.className.split(' ').filter(c=>c && !/^(has-gs|sel|active|hot|primary|keep|ok|cancel|off|on)$/.test(c))[0] || el.className,
                   x: r.left, y: r.top, w: r.width, h: r.height, yM });
      }
      return out;
    }, SEL);
    await p.screenshot({ path: `${D}/${TAG}-${nom}.png` });
    tout[nom] = boites;
    console.log('  ' + nom.padEnd(10) + boites.length + ' surfaces mesurables');
  }
  fs.writeFileSync(`${D}/${TAG}.json`, JSON.stringify(tout));
  console.log('erreurs : ' + (errs.length ? JSON.stringify([...new Set(errs)].filter(e=>!/supabase|jsdelivr/i.test(e))) : 'aucune'));
  await ctx.close(); await b.close();
})();
