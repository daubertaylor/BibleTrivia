/* ====== LA BARRE DU BAS : POUR TOUT LE MONDE, ET LA PASTILLE RESTE À SA PLACE (v314) ======
   « Je veux absolument que l'Accueil et les Messages soient présents, même
     pour les joueurs qui ne sont pas connectés. » « Vérifie qu'elle s'affiche
     correctement, même au lancement de l'app, et que lorsqu'elle est sur
     Messages elle reste bien sur Messages — et inversement sur Accueil. »

   Un téléphone SANS COMPTE, des groupes installés mais pas encore ouverts au
   public (l'état du serveur aujourd'hui). On relève, image par image, la
   barre et sa pastille corail :
     1. la barre est là dès la première image de l'accueil — pas d'arrivée
        en retard sur un accueil déjà posé ;
     2. l'écran des groupes dit « arrivent bientôt » et propose le compte ;
     3. la pastille glisse d'un onglet à l'autre quand on change d'onglet,
        barre visible ;
     4. Groupes -> Profil -> Groupes : la pastille ne quitte JAMAIS l'onglet
        Groupes, ni quand la barre s'en va, ni quand elle revient (avant la
        v314, elle filait vers Accueil en partant, et revenait en glissant) ;
     5. une discussion et la modération sont dans la section Groupes ;
     6. Groupes -> Progression -> Accueil : la barre revient avec la pastille
        DÉJÀ sur Accueil — elle ne glisse pas pendant que la barre arrive ;
     7. aucune erreur.
   Usage : node banc-essai/barre-tous.js [url]   (défaut : http://127.0.0.1:8099/index.html) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  /* Pas de vrai Supabase : le souvenir de la sonde suffit à dire « installés,
     pas encore ouverts », et le banc ne dépend pas du réseau. */
  await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: false, version: 1, modo: false, quand: Date.now() }));
    /* … et celui de la sonde des comptes : la carte « Se connecter » existe. */
    localStorage.setItem('bt_compte_ok', JSON.stringify({ ok: true, quand: Date.now() }));
    /* Le relevé, image par image : l'écran, la barre (visible ou non), son
       onglet, et la position de la pastille. */
    window.__rel = [];
    const t0 = performance.now();
    const tic = () => {
      let ecran = ''; try { ecran = state.screen; } catch (e) {}
      const b = document.getElementById('barreBas');
      if (b) {
        const c = b.querySelector('.bb-curseur');
        const x = c ? new DOMMatrixReadOnly(getComputedStyle(c).transform).m41 : 0;
        const op = parseFloat(getComputedStyle(b).opacity);
        const r = b.getBoundingClientRect();
        window.__rel.push({ t: performance.now() - t0, ecran, vue: !b.classList.contains('cachee') && op > 0.02 && r.top < innerHeight, o: b.dataset.o, x });
      } else window.__rel.push({ t: performance.now() - t0, ecran, vue: false, o: null, x: 0 });
      requestAnimationFrame(tic);
    };
    requestAnimationFrame(tic);
  });
  const vider = () => p.evaluate(() => { const r = window.__rel; window.__rel = []; return r; });
  try {
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.waitForTimeout(1500);

    /* ---- 1 ---- */
    let rel = await vider();
    const premiere = rel.find(r => r.ecran === 'mode');
    dit('sans compte, la barre est là dès la première image de l\'accueil',
      !!premiere && rel.filter(r => r.ecran === 'mode').every(r => r.o === 'accueil') &&
      !!(await p.evaluate(() => { const b = document.getElementById('barreBas'); return b && !b.classList.contains('cachee') && document.documentElement.classList.contains('avec-barre'); })) &&
      rel.find(r => r.ecran === 'mode' && r.o !== null) === premiere,
      premiere ? 'barre posée à la 1re image (' + Math.round(premiere.t) + ' ms)' : 'pas d\'accueil');

    /* ---- 2 ---- */
    await p.evaluate(() => allerOnglet('groupes'));
    await p.waitForTimeout(900);
    const ecranG = await p.evaluate(() => ({ titre: (document.querySelector('.groupes-ecran .grp-intro > b:not(.glass-rim)') || {}).textContent || '',
      compte: !!document.querySelector('.groupes-ecran .compte-carte') }));
    dit('l\'écran des groupes dit qu\'ils arrivent bientôt, et propose le compte', /bientôt/.test(ecranG.titre) && ecranG.compte, JSON.stringify(ecranG));

    /* ---- 3 ---- */
    rel = await vider();
    const xs = rel.filter(r => r.vue).map(r => r.x);
    const fin = xs[xs.length - 1] || 0;
    const glisse = xs.filter(x => x > 1 && x < fin - 1).length;
    dit('changer d\'onglet, barre visible : la pastille glisse jusqu\'à Groupes', fin > 100 && glisse >= 3, glisse + ' images en route, arrivée à ' + Math.round(fin) + ' px');

    /* ---- 4 ---- */
    await p.evaluate(() => openProfile());
    await p.waitForTimeout(900);
    await p.evaluate(() => document.querySelector('.app-header [onclick*="saveProfileAndBack"]').click());
    await p.waitForTimeout(1100);
    rel = await vider();
    const ecrans = [...new Set(rel.map(r => r.ecran))].join(' > ');
    const vues = rel.filter(r => r.vue);
    const hors = vues.filter(r => Math.abs(r.x - fin) > 0.5 || r.o !== 'groupes');
    dit('Groupes > Profil > Groupes : la pastille ne quitte jamais l\'onglet Groupes', ecrans.includes('profile') && /groupes$/.test(ecrans) && vues.length > 10 && hors.length === 0,
      ecrans + ' ; ' + vues.length + ' images barre visible, ' + hors.length + ' hors de Groupes' + (hors.length ? ' (1re : ' + JSON.stringify(hors[0]) + ')' : ''));

    /* ---- 5 ---- */
    const sect = await p.evaluate(() => {
      const r = [];
      for (const e of ['groupe', 'moderation']) { state.screen = e; try { majBarre(); } catch (err) {} r.push(e + '=' + document.getElementById('barreBas').dataset.o); }
      state.screen = 'groupes'; render();
      return r.join(' ');
    });
    dit('une discussion et la modération sont dans la section Groupes', sect === 'groupe=groupes moderation=groupes', sect);
    await p.waitForTimeout(900);

    /* ---- 6 ---- */
    await p.evaluate(() => { state.screen = 'parcours'; render(); });
    await p.waitForTimeout(900);
    await vider();
    await p.evaluate(() => { state.screen = 'mode'; render(); });
    await p.waitForTimeout(1100);
    rel = await vider();
    const v6 = rel.filter(r => r.vue);
    const bouge = v6.filter(r => r.x > 0.5);
    dit('Progression > Accueil : la barre revient avec la pastille déjà sur Accueil', v6.length > 10 && bouge.length === 0 && v6.every(r => r.o === 'accueil'),
      v6.length + ' images barre visible, ' + bouge.length + ' avec la pastille ailleurs');

    /* ---- 7 ---- */
    dit('aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 400)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la barre est là pour tout le monde, et sa pastille reste à sa place');
  process.exit(ko ? 1 : 0);
})();
