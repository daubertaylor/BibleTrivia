/* ====== LE PLEIN ÉCRAN D'ANDROID ATTEND LA FIN DU GLISSEMENT (v319, v343, v359) ======
   « Sur Android, il y a le même problème que la dernière fois : l'écran qui
     clignote lorsque je clique à certains endroits. Là, c'est pour la barre
     du bas, Accueil, Parcours, Jeux et Groupes. Règle ça précisément. »
   Dans Chrome sur Android, le jeu passe en plein écran après un changement
   d'écran (voir tryAutoFullscreen) : la fenêtre grandit d'un coup, et tout
   se recale. Demandé pendant que l'écran glisse, ça se voit — c'était le
   défaut de la v343. Le délai fixe d'alors (0,56 s) ne suffisait plus au
   glissement de la v357, qui dure 0,52 s À PARTIR de sa première image.
   Chrome sans tête n'entre pas vraiment en plein écran : on espionne la
   demande (et l'on fait comme si le jeu n'y était jamais, pour qu'elle parte
   à chaque changement d'écran). Processeur ralenti six fois, comme un
   téléphone modeste, avec de vrais touchers sur la barre du bas :
     1. pour chaque onglet, la demande part une fois, et seulement quand le
        glissement est fini — plus aucun passage en cours, l'écran posé ;
     2. deux onglets touchés coup sur coup : une seule demande, après le
        second glissement ;
     3. toucher l'onglet où l'on est déjà ne demande rien ;
     4. aucune erreur.
   Usage : node banc-essai/plein-ecran-passage.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
    localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() })); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode' && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    window.__dem = []; window.__fins = [];
    fsAvailable = () => true; fsActive = () => false;
    toggleFullscreen = () => {
      const e = document.querySelector('#app > .screen:not(.screen-exit)'), v = e ? getComputedStyle(e).translate : 'none';
      __dem.push({ t: Math.round(performance.now()), passage: !!passage, x: (!v || v === 'none') ? 0 : Math.round(parseFloat(v)), sortants: document.querySelectorAll('#app > .screen.screen-exit').length, ecran: state.screen });
    };
    const f0 = finirPassage;
    finirPassage = function(fini){ if (passage) __fins.push({ t: Math.round(performance.now()), fini }); return f0(fini); };
  });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const vider = () => p.evaluate(() => { __dem.length = 0; __fins.length = 0; });
  const lire = () => p.evaluate(() => ({ dem: __dem.slice(), fins: __fins.slice(), ecran: state.screen }));

  /* 1 */
  const fautes = [], vus = [];
  for (const o of ['jeux', 'groupes', 'parcours', 'accueil']) {
    await vider();
    await p.tap('.bb-onglet[data-o="' + o + '"]');
    await p.waitForTimeout(3500);
    const r = await lire();
    const d = r.dem[0], derniere = r.fins.length ? r.fins[r.fins.length - 1] : null;
    vus.push(o + ' : demande ' + (d ? d.t - (derniere ? derniere.t : 0) + ' ms après la fin du glissement' : 'aucune'));
    if (r.dem.length !== 1 || !d || d.passage || d.x !== 0 || d.sortants !== 0 || !derniere || !derniere.fini || d.t < derniere.t) fautes.push(o + ' ' + JSON.stringify(r));
  }
  dit('1. pour chaque onglet, une seule demande de plein écran, et seulement une fois le glissement fini, l\'écran posé', !fautes.length, fautes[0] || vus.join(' · '));

  /* 2 */
  await vider();
  await p.tap('.bb-onglet[data-o="jeux"]');
  await p.waitForTimeout(250);
  await p.tap('.bb-onglet[data-o="groupes"]');
  await p.waitForTimeout(4000);
  let r = await lire();
  const derniere = r.fins.length ? r.fins[r.fins.length - 1] : null;
  dit('2. deux onglets touchés coup sur coup : une seule demande, après le second glissement',
    r.dem.length === 1 && !r.dem[0].passage && r.dem[0].ecran === 'groupes' && derniere && r.dem[0].t >= derniere.t, JSON.stringify(r));

  /* 3 */
  await vider();
  await p.tap('.bb-onglet[data-o="groupes"]');
  await p.waitForTimeout(2500);
  r = await lire();
  dit('3. toucher l\'onglet où l\'on est déjà ne demande rien', r.dem.length === 0, JSON.stringify(r));

  dit('4. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le plein écran ne tombe jamais en plein glissement');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
