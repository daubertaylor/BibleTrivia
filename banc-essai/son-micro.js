/* ====== BANC « UNE AUTRE APP A PRIS LE MICRO, ET LE SON NE REVIENT PAS » ======
   « Le problème du son vient uniquement des applications que j'ai ouvertes
     avant : quand j'ouvre Claude et que le jeu est en arrière-plan, quand je
     retourne sur le jeu le son se coupe — ou d'autres applis comme ça qui
     utilisent le micro. » (Taylor)

   POURQUOI CELLE-LÀ ET PAS UNE AUTRE. Une app qui LIT du son prend la sortie
   et la rend. Une app qui ENREGISTRE change la catégorie de la session audio
   du téléphone entière (playAndRecord). Au retour, WebKit rend un contexte qui
   ment de deux façons que le jeu ne savait pas voir :

     A. il annonce « interrupted » — un état propre à iOS, que Chromium ne
        produit jamais, et que la moitié du code ne testait pas (on cherchait
        « suspended », mot à mot) ;
     B. il annonce « running » ET SON HORLOGE NE TOURNE PLUS. currentTime est
        figé : tout ce qui est programmé « dans 0,1 s » ne vient jamais. Tous
        les drapeaux sont au vert, l'oreille du guetteur entend la queue des
        notes déjà lancées, puis plus rien — et personne ne mesurait l'horloge.

   ET LE CAS QUI N'A AUCUN FILET : LES EFFETS SEULS. L'oreille du guetteur ne
   se branche que si la MUSIQUE est allumée (elle a besoin d'un son continu
   pour juger). Un joueur qui a coupé la musique et gardé les effets n'a donc
   AUCUN instrument au-dessus de lui : le contexte peut être mort depuis une
   heure, rien dans le jeu ne peut s'en apercevoir.

   CE BANC SIMULE, IL NE DEVINE PAS. On ne peut pas ouvrir une app de micro
   depuis un banc ; on peut en revanche reproduire EXACTEMENT ce qu'elle laisse
   derrière elle, en redéfinissant state et currentTime sur le contexte réel du
   jeu. C'est le modèle le plus fidèle qu'on puisse tenir ici, et il est déjà
   assez cruel : le jeu doit s'en sortir seul, sans que le joueur touche rien.
   Usage : node banc-essai/son-micro.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.mouse.click(196, 700);   // le geste qui ouvre l'audio sur iOS

  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(56) + (det || '')); };

  /* L'OREILLE DU BANC : passive, branchée sur le maître. On la rebranche à
     chaque fois, car le contexte peut avoir été reconstruit entre-temps. */
  const brancher = () => p.evaluate(() => {
    try {
      if (window.__oCtx === actx && window.__oreille) return true;
      const an = actx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0;
      masterGain.connect(an);
      const buf = new Float32Array(an.fftSize);
      window.__oCtx = actx;
      window.__oreille = () => { an.getFloatTimeDomainData(buf); let pic = 0;
        for (let i = 0; i < buf.length; i++) { const d = Math.abs(buf[i]); if (d > pic) pic = d; } return pic; };
      return true;
    } catch (e) { return false; }
  });
  const ecouter = async (ms) => {
    let pic = 0; const fin = Date.now() + ms;
    while (Date.now() < fin) {
      await brancher();
      pic = Math.max(pic, await p.evaluate(() => window.__oreille ? window.__oreille() : 0));
      await p.waitForTimeout(120);
    }
    return pic;
  };
  /* Un effet, joué comme le joueur le déclencherait, et on écoute s'il sort.
     C'est la seule mesure qui vaille pour un joueur sans musique. */
  const effetSort = async (ms) => {
    await brancher();
    await p.evaluate(() => { try { playCorrect(); } catch (e) {} });
    return await ecouter(ms);
  };

  const etat = () => p.evaluate(() => ({
    e: actx ? actx.state : 'aucun', t: actx ? actx.currentTime : -1,
    musique: !!musicPlaying, neuf: window.__ctxRef !== actx,
  }));
  await p.evaluate(() => { settings.music = true; settings.sfx = true;
    try { saveSettings(); } catch (e) {} try { startMusic(); } catch (e) {} });
  await p.waitForTimeout(2500);
  const depart = await etat();
  console.log('  départ : contexte ' + depart.e + ', musique ' + (depart.musique ? 'oui' : 'non'));

  /* ============ A. LE CONTEXTE DIT « INTERRUPTED » ET RESUME() MENT ============
     Exactement ce que laisse une app de micro : l'état iOS que Chromium ne
     produit jamais, et un resume() qui rend la main sans rien rétablir. */
  await p.evaluate(() => {
    window.__ctxRef = actx;
    const vrai = actx.resume.bind(actx);
    Object.defineProperty(actx, 'state', { get: () => 'interrupted', configurable: true });
    actx.resume = () => Promise.resolve();          // il répond, il ne fait rien
    window.__rendre = () => { try { delete actx.state; } catch (e) {} actx.resume = vrai; };
    actx.dispatchEvent(new Event('statechange'));
  });
  await p.waitForTimeout(9000);   // on ne touche à RIEN pendant neuf secondes
  let r = await etat();
  v('« interrupted » + resume() qui ment : le jeu refait un contexte',
    r.neuf && r.e === 'running', 'contexte ' + r.e + (r.neuf ? ', reconstruit' : ', LE MÊME'));
  let pic = await ecouter(2000);
  v('  et le son sort vraiment', pic > 1e-4, 'pic ' + pic.toExponential(2));

  /* ============ B. L'HORLOGE GELÉE, L'ÉTAT AU VERT ============
     Le contexte jure qu'il tourne, et son temps ne bouge plus d'un cil : tout
     ce qui est programmé « dans 0,1 s » n'arrivera jamais. */
  await p.evaluate(() => { settings.music = true; try { saveSettings(); } catch (e) {} });
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    window.__ctxRef = actx;
    const fige = actx.currentTime;
    Object.defineProperty(actx, 'currentTime', { get: () => fige, configurable: true });
  });
  const gele = await etat();
  v('l\'horloge est bien gelée pendant que l\'état dit « running »',
    gele.e === 'running', 'état ' + gele.e + ', t ' + gele.t.toFixed(2));
  await p.waitForTimeout(12000);  // toujours aucun geste
  r = await etat();
  v('horloge gelée : le jeu s\'en aperçoit et refait un contexte',
    r.neuf && r.e === 'running', r.neuf ? 'reconstruit' : 'AUCUNE RECONSTRUCTION');
  pic = await ecouter(2500);
  v('  et le son sort vraiment', pic > 1e-4, 'pic ' + pic.toExponential(2));

  /* ============ C. LE CAS SANS FILET : LES EFFETS SEULS ============
     Musique coupée par le joueur : l'oreille du guetteur ne peut plus juger
     un son continu. C'est là que le contexte pouvait rester mort pour
     toujours sans que rien dans le jeu ne le sache. */
  await p.evaluate(() => { settings.music = false; settings.sfx = true;
    try { saveSettings(); } catch (e) {} try { stopMusic(); } catch (e) {} });
  await p.waitForTimeout(2000);
  const avant = await effetSort(1200);
  v('musique coupée : un effet sort normalement', avant > 1e-4, 'pic ' + avant.toExponential(2));
  await p.evaluate(() => {
    window.__ctxRef = actx;
    const fige = actx.currentTime;
    Object.defineProperty(actx, 'currentTime', { get: () => fige, configurable: true });
  });
  await p.waitForTimeout(12000);  // aucun geste, aucune musique pour alerter
  r = await etat();
  v('sans musique non plus, le jeu ne reste pas muet',
    r.neuf && r.e === 'running', r.neuf ? 'reconstruit' : 'AUCUNE RECONSTRUCTION');
  const apres = await effetSort(2000);
  v('  et l\'effet sort de nouveau', apres > 1e-4, 'pic ' + apres.toExponential(2));

  /* ============ D. ET ON NE RÉPARE PAS CE QUI N'EST PAS CASSÉ ============
     Un guetteur qui se trompe dans l'autre sens reconstruirait le contexte
     toutes les dix secondes, pour tout le monde. */
  await p.evaluate(() => {
    settings.music = true; try { saveSettings(); } catch (e) {} try { startMusic(); } catch (e) {}
    window.__dur = 0; const d = window.reviveAudioHard;
    window.reviveAudioHard = function () { window.__dur++; return d.apply(this, arguments); };
  });
  await p.waitForTimeout(14000);
  const faux = await p.evaluate(() => window.__dur);
  v('en marche normale, aucune reconstruction intempestive', faux === 0, faux + ' reconstruction(s) en 14 s');

  if (errs.length) { ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | ')); }
  await nav.close();
  console.log(ko === 0
    ? '\n  OK — une app de micro ne laisse plus le jeu muet, avec ou sans musique'
    : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
