/* ====== « REJOUER » PART TOUT DE SUITE (v364) ======
   « Le bouton Rejouer prend du temps à se lancer lorsque je clique dessus. »
   Depuis la v349, quitter l'écran des résultats demande une annonce à Google
   (adBreak). Tant que Google n'a pas ouvert ses annonces au compte, il ne
   répond JAMAIS : le jeu attendait une seconde et demie, à chaque fois.
   Google dit lui-même quand il est prêt (adConfig, onReady). Une fausse file
   de Google joue ici ses trois humeurs :
     1. GOOGLE PAS PRÊT (le cas de Yada aujourd'hui) : Rejouer, Quitter,
        Autres jeux partent tout de suite (moins de 0,3 s), et aucune
        annonce n'est même demandée ;
     2. GOOGLE PRÊT : l'annonce est demandée en quittant les résultats, comme
        avant (le reste est vérifié par pub-fin.js) ;
     3. le jeu a bien demandé à Google de prévenir quand il serait prêt
        (adConfig avec onReady), une seule fois, au lancement ;
     4. aucune erreur.
   Usage : node banc-essai/rejouer-vite.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

/* La fausse file : elle note tout ; « prete » dit si Google appelle onReady. */
const FAUX = (prete) => {
  if (!/^http/.test(location.protocol)) return;
  localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
  localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
  window.__pubBanc = true; window.__pauses = []; window.__configs = [];
  const file = [];
  file.push = function (o) {
    /* Pas prêt, Google ne répond pas du tout à une demande d'annonce (c'est ce
       qui faisait attendre le jeu) ; prêt, il dit tout de suite qu'il n'a rien. */
    if (o && o.type) { window.__pauses.push(o.type); if (prete) setTimeout(() => { o.adBreakDone && o.adBreakDone({ breakStatus: 'frequencyCapped' }); }, 30); return 0; }
    if (o && (o.preloadAdBreaks || o.sound || o.onReady)) { window.__configs.push({ onReady: typeof o.onReady === 'function', preload: o.preloadAdBreaks || null });
      if (prete && typeof o.onReady === 'function') setTimeout(() => o.onReady(), 40); return 0; }
    return Array.prototype.push.call(this, o);
  };
  window.adsbygoogle = file;
};
const FINIR = async (p, quoi) => {
  await p.evaluate((quoi) => {
    document.querySelectorAll('#modalVeil').forEach(e => e.remove());
    if (quoi === 'solo') { state.mode = 'solo'; state.revision = false; startGame(); state.soloScore = 120; state.soloCorrect = 9; partieFinie(); state.screen = 'end'; render(); }
    else if (quoi === 'groupe') { state.revision = false; state.mode = 'group'; state.teams = [{ name: 'Taylor' }, { name: 'Benoît' }]; state.scores = [40, 30]; partieFinie(); state.screen = 'end'; render(); }
    else { jeu = null; state.screen = 'jeux'; render(); lancerJeu(quoi); jeu.pct = 80; jeu.bons = jeu.manches.length - 1; jeu.points = 50; jeu.meilleure = 3; jeu.nouveau = false; jeu.record = 60; partieFinie(); state.screen = 'jeu-fin'; render(); }
  }, quoi);
  await p.waitForFunction(() => document.querySelectorAll('#app > .screen').length === 1, null, { timeout: 6000 }).catch(() => {});
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('#modalVeil').forEach(e => e.remove()));
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const prete of [false, true]) {
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
      await p.addInitScript(FAUX, prete);
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
      await p.waitForTimeout(700);
      const mesures = [];
      for (const [fin, bouton, apres] of [['solo', '.end-actions .btn-replay', 'play'], ['groupe', '.end-actions .btn-quit', 'setup'], ['combien', '.jx-rejouer', 'jeu']]) {
        await FINIR(p, fin);
        const avant = await p.evaluate(() => window.__pauses.length);
        const t = Date.now();
        await p.locator(bouton).first().tap();
        await p.waitForFunction((apres) => state.screen === apres, apres, { timeout: 4000 }).catch(() => {});
        mesures.push({ fin, ms: Date.now() - t, ecran: await p.evaluate(() => state.screen), demandes: (await p.evaluate(() => window.__pauses.length)) - avant });
        await p.evaluate(() => { try { jeu = null; } catch (e) {} state.screen = 'mode'; render(); });
        await p.waitForTimeout(400);
      }
      const configs = await p.evaluate(() => window.__configs);
      if (!prete) {
        dit('1. Google pas prêt : Rejouer, Quitter, Rejouer un jeu partent tout de suite (moins de 0,3 s), sans demander d\'annonce',
          mesures.every(m => m.ms < 300 && m.demandes === 0) && mesures.map(m => m.ecran).join() === 'play,setup,jeu', JSON.stringify(mesures));
        dit('3. le jeu demande à Google de prévenir quand il est prêt (onReady), une fois, au lancement',
          configs.length >= 1 && configs[0].onReady === true && configs[0].preload === 'on' && configs.filter(c => c.onReady).length === 1, JSON.stringify(configs));
      } else {
        dit('2. Google prêt : l\'annonce est demandée en quittant les résultats, puis l\'on arrive là où l\'on allait',
          mesures.every(m => m.demandes === 1) && mesures.map(m => m.ecran).join() === 'play,setup,jeu', JSON.stringify(mesures));
      }
      await ctx.close();
    }
  } catch (e) { errs.push('banc : ' + e.message); }
  dit('4. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — Rejouer part tout de suite tant que Google n\'a pas d\'annonce à montrer');
  process.exit(ko ? 1 : 0);
})();
