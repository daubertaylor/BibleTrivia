/* ====== LE DÉCOR DANS LA BARRE DU BAS NE SAUTE PAS QUAND ELLE SE POSE (v319) ======
   « Lorsque je change de page, ici où je t'ai mis un crayon rouge, il y a un
     petit décalage dans l'image lorsque je quitte une page. » (capture de
     Taylor : l'accueil, la barre Accueil · Groupes entourée.)
   La barre revient de côté avec sa page, pendant que le moteur de verre est
   gelé. Sa position était lue au DÉPART de son mouvement : le décor vu à
   travers elle voyageait avec elle, puis sautait au dégel, une fois la barre
   posée. On suit, image par image, l'ÉCART du décor : de combien l'image
   floutée vue dans la barre est décalée par rapport au vrai décor, derrière
   (0 = juste). L'écart vaut le bord gauche de la barre, plus le décalage de
   sa couche de verre (.gs), plus la marge de la bande floutée (ox), comme le
   calcule le moteur.
   CE QU'IL EXIGE :
     1. au repos, sur l'accueil, le décor de la barre est juste (au pixel) ;
     2. retour de Progression : une fois la barre posée, le décor est juste
        et ne bouge plus — aucun saut après coup ;
     3. pendant qu'elle arrive, le décor ne fait jamais un pas plus grand que
        celui de la barre elle-même ;
     4. même chose au retour du Profil, sur l'onglet Groupes ;
     5. même chose au démarrage, quand elle monte du bas avec l'accueil ;
     6. aucune erreur.
   Usage : node banc-essai/barre-verre.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0 } }).catch(() => {});
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() }));
      /* Le film commence avec la page : on relève dès les premières images. */
      window.__film = [];
      window.__filmer = (ms) => {
        const t0 = performance.now();
        const tic = () => {
          const b = document.getElementById('barreBas'), gs = b && b.querySelector('.gs');
          if (b && gs && !b.classList.contains('cachee')) {
            const r = b.getBoundingClientRect(), m = new DOMMatrixReadOnly(getComputedStyle(gs).transform);
            const de = document.documentElement, w = de.clientWidth, h = de.clientHeight;
            const ox = Math.round((Math.round(w * 1.4) - w) / 2), oy = Math.round((Math.round(h * 2) - h) / 2);
            window.__film.push({ t: Math.round(performance.now() - t0), x: +r.left.toFixed(2), y: +r.top.toFixed(2),
              ex: +(r.left + m.m41 + ox).toFixed(2), ey: +(r.top + m.m42 + oy).toFixed(2) });
          }
          if (performance.now() - t0 < ms) requestAnimationFrame(tic);
        };
        requestAnimationFrame(tic);
      };
      /* L'écran de démarrage dure quatre secondes : le film en couvre neuf. */
      document.addEventListener('DOMContentLoaded', () => window.__filmer(9000));
    });
    /* Ce qu'on juge dans un film : l'écart une fois la barre posée, et le
       plus grand pas du décor comparé à celui de la barre. */
    const juger = (film) => {
      let dernier = 0;
      for (let i = 1; i < film.length; i++) if (Math.abs(film[i].x - film[i - 1].x) > 0.1 || Math.abs(film[i].y - film[i - 1].y) > 0.1) dernier = i;
      const apres = film.slice(dernier);
      const ecartApres = apres.length ? Math.max(...apres.map(f => Math.max(Math.abs(f.ex), Math.abs(f.ey)))) : 999;
      let pire = 0;
      for (let i = 1; i < film.length; i++) {
        const pasDecor = Math.hypot(film[i].ex - film[i - 1].ex, film[i].ey - film[i - 1].ey);
        const pasBarre = Math.hypot(film[i].x - film[i - 1].x, film[i].y - film[i - 1].y);
        pire = Math.max(pire, pasDecor - pasBarre);
      }
      return { images: film.length, bouge: dernier, pose: film[dernier] ? film[dernier].t : -1, ecartApres: +ecartApres.toFixed(2), pire: +pire.toFixed(2) };
    };

    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForFunction(() => window.__film.length && performance.now() > 9200, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(300);
    /* ---- 5 (le démarrage, filmé dès le chargement) ---- */
    const demarrage = juger(await p.evaluate(() => window.__film));
    /* ---- 1 ---- */
    const repos = await p.evaluate(() => { window.__film = []; window.__filmer(200); return new Promise(r => setTimeout(() => r(window.__film), 300)); });
    const ecartRepos = repos.length ? Math.max(...repos.map(f => Math.max(Math.abs(f.ex), Math.abs(f.ey)))) : 999;
    dit('1. au repos, sur l\'accueil, le décor de la barre est juste', repos.length > 3 && ecartRepos <= 1, 'écart ' + ecartRepos + ' px');
    /* ---- 2-3 ---- */
    await p.evaluate(() => openParcours());
    await p.waitForTimeout(1200);
    const retour = juger(await p.evaluate(() => { window.__film = []; window.__filmer(1600); goToModeSelect(); return new Promise(r => setTimeout(() => r(window.__film), 1750)); }));
    dit('2. retour de Progression : la barre posée, le décor est juste et ne bouge plus', retour.bouge > 3 && retour.ecartApres <= 1,
      retour.images + ' images, barre posée à ' + retour.pose + ' ms, écart ensuite jusqu\'à ' + retour.ecartApres + ' px');
    dit('3. pendant qu\'elle arrive, le décor ne fait jamais un pas plus grand que la barre', retour.pire <= 1, 'pire excès ' + retour.pire + ' px');
    /* ---- 4 ---- */
    await p.evaluate(() => allerOnglet('groupes'));
    await p.waitForTimeout(1200);
    await p.evaluate(() => openProfile());
    await p.waitForTimeout(1200);
    const profil = juger(await p.evaluate(() => { window.__film = []; window.__filmer(1600);
      const b = document.querySelector('.app-header [onclick*="saveProfileAndBack"]'); if (b) b.click(); return new Promise(r => setTimeout(() => r(window.__film), 1750)); }));
    dit('4. retour du Profil, sur Groupes : le décor juste une fois posée, sans pas de trop', profil.bouge > 3 && profil.ecartApres <= 1 && profil.pire <= 1,
      profil.images + ' images, posée à ' + profil.pose + ' ms, écart ensuite ' + profil.ecartApres + ' px, pire excès ' + profil.pire + ' px');
    dit('5. au démarrage, quand elle monte avec l\'accueil : même chose', demarrage.images > 10 && demarrage.ecartApres <= 1 && demarrage.pire <= 1,
      demarrage.images + ' images, posée à ' + demarrage.pose + ' ms, écart ensuite ' + demarrage.ecartApres + ' px, pire excès ' + demarrage.pire + ' px');
    dit('6. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le décor dans la barre ne saute pas quand elle se pose');
  process.exit(ko ? 1 : 0);
})();
