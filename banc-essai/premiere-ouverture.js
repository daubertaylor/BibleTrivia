/* ===== LA PREMIÈRE OUVERTURE DES RÉGLAGES, COMME LES AUTRES =====
   « Vérifie l'ouverture des réglages, la première ouverture lors d'une
   session : je la trouve bizarre. »
   La première ouverture d'une session payait un travail que les suivantes ne
   refont jamais : des règles de style découvertes, des mots mis en forme pour
   la première fois à ces tailles-là. prechaufferReglages() fait ce travail à
   la place du joueur, quand l'accueil est au repos.

   Le banc relève, processeur bridé, le TRAVAIL DU FIL PRINCIPAL pendant les
   400 ms qui suivent l'ouverture (la somme des tâches, lue dans la trace du
   navigateur), pour la première ouverture et les deux suivantes, dans la même
   session. Il le fait dans deux situations :
     — TÉMOIN : on ouvre dès l'arrivée sur l'accueil, AVANT le préchauffage.
       La première ouverture doit y être nettement plus lourde que les
       suivantes. Sinon le banc ne sait pas voir le défaut, et son vert ne
       voudrait rien dire ;
     — ESSAI : on ouvre une fois le préchauffage fait. La première ouverture
       doit coûter comme les suivantes.
   Chaque situation est jouée dans plusieurs sessions neuves, et on compare
   des médianes : une mesure de temps isolée ment trop souvent pour qu'on la
   croie seule.

   L'ouverture est appelée directement (openSettings), sans toucher l'écran :
   le premier toucher d'une session réveille aussi le son, et c'est un autre
   travail, qu'on ne veut pas mêler à celui-ci.

   Usage : node banc-essai/premiere-ouverture.js [url] [bridage] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const BRIDE = Number(process.argv[3] || 4);
const SESSIONS = 4;
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const mediane = (l) => { const t = [...l].sort((a, b) => a - b); const m = t.length >> 1; return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2; };

async function session(nav, temoin) {
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:3,
    isMobile:true, hasTouch:true, userAgent:IOS, serviceWorkers:'block' });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  let chaud = false;
  if (temoin) {
    /* Juste après l'arrivée : l'accueil a fini d'entrer, le préchauffage
       n'a pas encore eu lieu (il attend que tout soit au repos). */
    await p.waitForTimeout(700);
    chaud = await p.evaluate(() => reglagesChauds);
  } else {
    await p.waitForFunction(() => { try { return reglagesChauds === true; } catch(e){ return false; } }, null, { timeout:20000 })
      .then(() => { chaud = true; }, () => { chaud = false; });
    await p.waitForTimeout(800);
  }
  const cdp = await ctx.newCDPSession(p);
  if (BRIDE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate:BRIDE });
  const travail = [], pages = [];
  for (let n = 0; n < 3; n++) {
    const evts = [];
    cdp.removeAllListeners('Tracing.dataCollected');
    cdp.on('Tracing.dataCollected', d => evts.push(...d.value));
    const fin = new Promise(r => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.start', { categories:'toplevel,devtools.timeline,blink.user_timing,__metadata', transferMode:'ReportEvents' });
    await p.waitForTimeout(150);
    await p.evaluate(() => { performance.mark('ouverture'); openSettings(); });
    await p.waitForTimeout(650);
    await cdp.send('Tracing.end');
    await fin;
    /* Le fil principal de la page : « CrRendererMain » du processus qui porte
       le plus de travail (il n'y a qu'une page). */
    const noms = evts.filter(e => e.ph === 'M' && e.name === 'thread_name' && e.args && e.args.name === 'CrRendererMain');
    let fil = null, max = -1;
    for (const m of noms) {
      const s = evts.filter(e => e.pid === m.pid && e.tid === m.tid && e.name === 'ThreadControllerImpl::RunTask' && e.ph === 'X')
        .reduce((a, e) => a + e.dur, 0);
      if (s > max) { max = s; fil = m; }
    }
    const taches = evts.filter(e => fil && e.pid === fil.pid && e.tid === fil.tid && e.name === 'ThreadControllerImpl::RunTask' && e.ph === 'X');
    /* La fenêtre part du repère posé juste avant l'appel, et on compte le
       travail de chaque tâche pour la part qui tombe dedans. */
    const marque = evts.find(e => e.name === 'ouverture' && (e.ph === 'R' || e.ph === 'I' || e.ph === 'i' || e.ph === 'n' || e.ph === 'b'));
    const t0 = marque ? marque.ts : Math.min(...taches.map(e => e.ts)) + 150000;
    const t1 = t0 + 400000;
    const dedans = taches.map(e => Math.max(0, Math.min(e.ts + e.dur, t1) - Math.max(e.ts, t0)));
    /* Et, dedans, la MISE EN PAGE seule : c'est elle qui porte le travail de
       la première fois (des mots mis en forme pour la première fois à ces
       tailles-là). Le reste du travail d'une ouverture — le moteur de verre
       qui suit la feuille à chaque image — est le même à chaque fois, et son
       bruit noierait la différence. */
    const miseEnPage = evts.filter(e => fil && e.pid === fil.pid && e.tid === fil.tid && e.name === 'Layout' && e.ph === 'X'
      && e.ts >= t0 - 20000 && e.ts < t1).reduce((a, e) => a + e.dur, 0) / 1000;
    pages.push(miseEnPage);
    if (!marque) travail.repereManquant = true;
    travail.push(dedans.reduce((a, d) => a + d, 0) / 1000);
    await p.evaluate(() => closeSettings());
    await p.waitForTimeout(1200);
  }
  await ctx.close();
  return { chaud, travail, pages, erreurs };
}

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const res = { temoin:[], essai:[] };
  for (let s = 0; s < SESSIONS; s++) {
    for (const cas of ['temoin', 'essai']) {
      const r = await session(nav, cas === 'temoin');
      res[cas].push(r);
      console.log('  ' + (cas === 'temoin' ? 'témoin' : 'essai ') + ' session ' + (s + 1) + ' : préchauffé ' + (r.chaud ? 'oui' : 'non')
        + ' — mise en page ' + r.pages.map(x => x.toFixed(0)).join(' / ') + ' ms'
        + ' · travail ' + r.travail.map(x => x.toFixed(0)).join(' / ') + ' ms'
        + (r.erreurs.length ? '  ERREURS ' + JSON.stringify(r.erreurs) : ''));
    }
  }
  await nav.close();
  /* Le surcoût de la PREMIÈRE ouverture : sa valeur, moins celle des deux
     suivantes de la même session. Médiane sur les sessions. */
  const surcout = (l, cle) => mediane(l.map(r => r[cle][0] - mediane([r[cle][1], r[cle][2]])));
  const pT = surcout(res.temoin, 'pages'), pE = surcout(res.essai, 'pages');
  const tT = surcout(res.temoin, 'travail'), tE = surcout(res.essai, 'travail');
  console.log('\n  surcoût médian de la 1re ouverture (bridé x' + BRIDE + ') :'
    + '\n    mise en page — témoin ' + pT.toFixed(1) + ' ms, essai ' + pE.toFixed(1) + ' ms'
    + '\n    travail total — témoin ' + tT.toFixed(0) + ' ms, essai ' + tE.toFixed(0) + ' ms (pour information : le verre en fait varier le bruit)');
  const ko = [];
  if (res.temoin.some(r => r.chaud)) ko.push('le témoin était déjà préchauffé : il ne témoigne de rien');
  if (res.essai.some(r => !r.chaud)) ko.push('le préchauffage n\'a jamais eu lieu dans une session d\'essai');
  /* Le témoin doit montrer le défaut : sinon le banc est aveugle. */
  if (pT < 12) ko.push('le témoin ne montre pas de surcoût de mise en page (' + pT.toFixed(1) + ' ms) : le banc ne sait pas voir le défaut');
  /* L'essai : la première ouverture met en page comme les suivantes, au
     bruit près — et en tout cas bien moins que le témoin. */
  if (pE > Math.max(6, pT * 0.3)) ko.push('la 1re ouverture met encore en page plus que les suivantes (' + pE.toFixed(1) + ' ms de plus)');
  const errs = [...res.temoin, ...res.essai].flatMap(r => r.erreurs);
  if (errs.length) ko.push('erreurs dans la page : ' + JSON.stringify(errs.slice(0, 3)));
  console.log(ko.length ? '\n  ÉCHEC :\n    ' + ko.join('\n    ') : '\n  OK — la première ouverture des Réglages ne fait plus le travail des premières fois');
  process.exit(ko.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
