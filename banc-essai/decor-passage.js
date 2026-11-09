/* ====== LE DÉCOR NE BOUGE PAS, LES ÉCRANS SONT CÔTE À CÔTE (v348, v356, v357) ======
   v348 : « Corrige ça : je t'ai mis un trait rouge, lors d'une fermeture ou
     d'une ouverture » — le bord de la copie du décor qui glissait avec la
     page. v356 : « Je veux un truc qui soit clean, qui fonctionne
     parfaitement sur tout type d'appareil sans faire bugger. » v357 : « ça
     saute brusquement » ; « Je veux une vraie animation qui soit cohérente
     avec le reste du jeu, qui passe bien. »
   Les écrans sont côte à côte (voir LES ÉCRANS SONT CÔTE À CÔTE) : celui qui
   arrive pousse celui qu'on quitte, les deux glissent ensemble, sur
   l'horloge des pages. Le décor, le même derrière tous les écrans, ne bouge
   jamais. Ce que ce banc exige, passage figé à plusieurs instants, à l'aller
   comme au retour, sur iPhone et sur Android :
     1. LE DÉCOR EST CONTINU. Écrans et barre masqués : ce qu'on voit
        pendant le passage est, au pixel près, le décor au repos ;
     2. CÔTE À CÔTE : aucune copie du décor ; les deux écrans glissent
        (propriété « translate » seule : ni échelle, ni « transform », ni
        opacité), du bon côté — à l'aller l'écran qui arrive vient de la
        droite, au retour de la gauche —, toujours exactement à une largeur
        l'un de l'autre, et sur l'horloge des pages (--tr-ouvre) ;
     3. JAMAIS L'UN SUR L'AUTRE, JAMAIS VIDE : les deux écrans ne se
        recouvrent jamais, et à eux deux ils remplissent l'écran (il n'y a
        entre eux que leurs marges) ; le verre de chaque carte reste face au
        décor, y compris celui d'une carte dessinée plus petite (le verset de
        l'accueil, à 82 %) : 0,5 px au plus sur l'écran qui arrive ; 1 px au
        plus sur celui qui part — sorti du flux, il change de repère, et le
        moteur du verre, qui cale au pixel entier, peut tomber sur l'arrondi
        voisin (l'écart réel avec le décor reste sous le pixel) ;
     4. L'ÉCRAN QUITTÉ NE BOUGE PAS AU DÉPART : au premier instant, ses
        cartes sont exactement où elles étaient (l'accueil perdait sa
        hauteur et ses cartes sautaient de 26 à 116 px vers le haut) ;
     5. LA BARRE DU BAS : de l'Accueil au Profil, elle part avec l'accueil,
        collée à lui ; du Profil aux Jeux, elle arrive avec sa page ; entre
        deux onglets, elle ne bouge pas d'un pixel ; jamais de mouvement
        vertical ;
     6. REPRIS EN ROUTE : un rendu sur place pendant l'arrivée — le nœud neuf
        reprend le glissement où il en était ; un retour demandé avant la fin
        — l'écran repart d'où il est, sans saut, et celui où l'on revient
        arrive collé à lui ;
     7. après les passages : aucune animation, aucune translation, opacité
        ni origine laissées sur les écrans, le verre ou la barre ; aucune
        erreur.
   Usage : node banc-essai/decor-passage.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

const OUTILS = () => {
  /* Fige tout ce qui bouge à la fraction f du passage en cours. */
  window.__fige = (f) => { const d = passage ? passage.duree : 0;
    document.getAnimations().forEach(a => { try { a.pause(); if (f !== undefined) a.currentTime = d * f; } catch (e) {} }); };
  window.__lache = () => document.getAnimations().forEach(a => { try { a.play(); } catch (e) {} });
  window.__dors = (ms) => new Promise(ok => setTimeout(ok, ms));
  window.__image = () => new Promise(ok => requestAnimationFrame(ok));
  window.__n = window.__n || 0;
  window.__ecranVif = () => document.querySelector('#app > .screen:not(.screen-exit)');
  window.__tr = (el) => { if (!el) return [0, 0]; const v = getComputedStyle(el).translate; if (!v || v === 'none') return [0, 0]; const n = v.split(/\s+/).map(parseFloat); return [n[0] || 0, n[1] || 0]; };
  /* Où est, à l'écran, chaque couche de verre (qui montre le décor). */
  window.__verre = (ecran) => {
    const o = {};
    if (!ecran) return o;
    ecran.querySelectorAll('.gs:not(.gs-plein)').forEach(g => {
      if (getComputedStyle(g).display === 'none') return;
      if (!g.dataset.ident) g.dataset.ident = 'g' + (++window.__n);
      const r = g.getBoundingClientRect(); o[g.dataset.ident] = [r.left, r.top];
    });
    return o;
  };
  window.__ecart = (a, b) => { let pire = 0, n = 0;
    for (const k in a) { if (!b[k]) continue; n++; pire = Math.max(pire, Math.abs(a[k][0] - b[k][0]), Math.abs(a[k][1] - b[k][1])); }
    return { pire: Math.round(pire * 100) / 100, n }; };
  /* Les cartes d'un écran (ce qui porte du verre), et leur place. */
  window.__places = (ecran) => {
    const o = {};
    if (!ecran) return o;
    ecran.querySelectorAll('.has-gs').forEach(c => {
      if (!c.dataset.place) c.dataset.place = 'c' + (++window.__n);
      const r = c.getBoundingClientRect(), t = __tr(ecran);
      o[c.dataset.place] = [r.left - t[0], r.top - t[1]];
    });
    return o;
  };
  /* L'état du passage : les deux écrans (glissement, transform, opacité,
     boîte), la copie du décor, l'horloge. */
  window.__etat = () => {
    const p = passage; if (!p) return null;
    const lit = (el) => { if (!el || !el.isConnected) return null; const cs = getComputedStyle(el), m = new DOMMatrixReadOnly(cs.transform), r = el.getBoundingClientRect();
      return { op: +cs.opacity, sc: m.a, sy: m.d, mx: m.m41, my: m.m42, x: __tr(el)[0], y: __tr(el)[1], g: r.left, d: r.right }; };
    return { e: lit(p.entrant), s: lit(p.sortant), W: p.W, retour: p.genre === 'retour', duree: p.duree, courbe: p.courbe,
      fonds: document.querySelectorAll('.fond-pousse').length, vw: innerWidth };
  };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const ouvrir = async (ua, vp) => {
    const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 1, userAgent: ua, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() })); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(OUTILS);
    await p.waitForTimeout(1500);
    return { ctx, p };
  };
  const appareils = [['iPhone', IOS, { width: 402, height: 874 }], ['Android', ANDROID, { width: 412, height: 915 }]];
  const FRACTIONS = [0.04, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9];
  const GROUPE = "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'}]; state.screen='setup'; render();";
  const PASSAGES = [
    ['Accueil → Jeux', "allerOnglet('jeux')", "allerOnglet('mode')"],
    ['Accueil → Progression', 'openParcours()', 'goToModeSelect()'],
    ['Accueil → Mode Groupe', GROUPE, 'goToModeSelect()'],
  ];
  for (const [nomA, ua, vp] of appareils) {
    console.log('— ' + nomA + ' (' + vp.width + ' × ' + vp.height + ')');
    /* ---- 1. le décor est continu ---- */
    {
      const { ctx, p } = await ouvrir(ua, vp);
      await p.addStyleTag({ content: '#app > .screen, #barreBas{ visibility:hidden !important; }' });
      await p.waitForTimeout(400);
      const repos = await p.screenshot();
      const comparer = async (img) => p.evaluate(async ([a, b]) => {
        const charge = (s) => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s; });
        const [ia, ib] = await Promise.all([charge(a), charge(b)]);
        const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
        const x = c.getContext('2d'); x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
        x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
        let pire = 0, somme = 0;
        for (let i = 0; i < da.length; i += 4) { const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])); somme += d; if (d > pire) pire = d; }
        return { pire, moyen: Math.round(somme / (da.length / 4) * 100) / 100 };
      }, [repos.toString('base64'), img.toString('base64')]);
      for (const [nomP, aller, retour] of PASSAGES) {
        let pire = 0, moyen = 0, vus = 0;
        for (const f of [0.1, 0.4]) {
          for (const geste of [aller, retour]) {
            const ok = await p.evaluate(([g, f]) => { new Function(g)(); if (!passage) return false; __fige(f); return true; }, [geste, f]);
            if (ok) {
              await p.waitForTimeout(120);
              const r = await comparer(await p.screenshot());
              vus++; pire = Math.max(pire, r.pire); moyen = Math.max(moyen, r.moyen);
            }
            await p.evaluate(() => __lache()); await p.waitForTimeout(900);
          }
        }
        dit(nomP + ' : 1. le décor reste le décor pendant tout le passage (aller et retour, ' + vus + ' instants)',
          vus === 4 && pire <= 10 && moyen <= 1.5, 'écart max ' + pire + ' niveaux, moyen ' + moyen);
      }
      await ctx.close();
    }
    /* ---- 2, 3 et 4. côte à côte, jamais l'un sur l'autre, le verre, le départ ---- */
    {
      const { ctx, p } = await ouvrir(ua, vp);
      const horloge = await p.evaluate(() => ({ ms: msPli(), courbe: courbeDe('--tr-ouvre', '?') }));
      for (const [nomP, aller, retour] of PASSAGES) {
        const releves = [];
        let verreE = { pire: 0, n: 0 }, verreS = { pire: 0, n: 0 }, depart = { pire: 0, n: 0 };
        for (const geste of [aller, retour]) {
          /* Le retour part de la destination : on y va d'abord. */
          if (geste === retour) { await p.evaluate((g) => new Function(g)(), aller); await p.waitForTimeout(900); }
          for (const f of FRACTIONS) {
            const r = await p.evaluate(([g, f]) => {
              const avant = __verre(__ecranVif()), placesAvant = __places(__ecranVif());
              new Function(g)();
              /* Le premier instant : avant tout glissement, l'écran quitté est où il était. */
              __fige(0);
              const placesDepart = __places(passage && passage.sortant);
              __fige(f);
              return { avant, placesAvant, placesDepart, e: __etat(), vE: __verre(passage && passage.entrant), vS: __verre(passage && passage.sortant) };
            }, [geste, f]);
            await p.evaluate(() => __lache()); await p.waitForTimeout(900);
            const posee = await p.evaluate(() => __verre(__ecranVif()));
            const eE = await p.evaluate(([a, b]) => __ecart(a, b), [r.vE, posee]);
            const eS = await p.evaluate(([a, b]) => __ecart(a, b), [r.vS, r.avant]);
            const eD = await p.evaluate(([a, b]) => __ecart(a, b), [r.placesDepart, r.placesAvant]);
            verreE = { pire: Math.max(verreE.pire, eE.pire), n: verreE.n + eE.n };
            verreS = { pire: Math.max(verreS.pire, eS.pire), n: verreS.n + eS.n };
            depart = { pire: Math.max(depart.pire, eD.pire), n: depart.n + eD.n };
            if (r.e) releves.push(Object.assign({ f, aller: geste === aller }, r.e));
            /* retour à l'écran de départ, pour la mesure suivante */
            await p.evaluate((g) => new Function(g)(), geste === aller ? retour : aller); await p.waitForTimeout(900);
          }
          if (geste === retour) { await p.evaluate((g) => new Function(g)(), retour); await p.waitForTimeout(900); }
        }
        /* 2. côte à côte, du bon côté, sur l'horloge des pages */
        const fautes2 = [];
        let enRoute = 0;
        releves.forEach(x => {
          const net = (s) => s && Math.abs(s.mx) < 0.05 && Math.abs(s.my) < 0.05 && Math.abs(s.sc - 1) < 1e-4 && Math.abs(s.sy - 1) < 1e-4 && Math.abs(s.y) < 0.05 && s.op === 1;
          if (!net(x.e) || !net(x.s) || x.fonds) { fautes2.push('écran ' + JSON.stringify({ f: x.f, e: x.e, s: x.s, fonds: x.fonds })); return; }
          const d = x.retour ? 1 : -1;
          if (Math.abs((x.s.x - x.e.x) - d * x.W) > 0.5) fautes2.push('écart ' + (x.s.x - x.e.x).toFixed(2) + ' au lieu de ' + (d * x.W) + ' à ' + x.f);
          const bonCote = x.retour ? (x.e.x <= 0.05 && x.e.x >= -x.W - 0.05) : (x.e.x >= -0.05 && x.e.x <= x.W + 0.05);
          if (!bonCote) fautes2.push('côté ' + JSON.stringify({ f: x.f, retour: x.retour, x: x.e.x }));
          if (Math.abs(x.e.x) > 5 && Math.abs(x.e.x) < x.W - 5) enRoute++;
          if (x.duree !== horloge.ms || x.courbe.replace(/\s+/g, '') !== horloge.courbe.replace(/\s+/g, '')) fautes2.push('horloge ' + x.duree + ' ' + x.courbe);
        });
        /* l'avancée, d'un instant à l'autre : jamais en arrière */
        [true, false].forEach(sens => {
          const l = releves.filter(x => x.aller === sens).map(x => Math.abs(x.e.x));
          for (let i = 1; i < l.length; i++) if (l[i] > l[i - 1] + 0.05) fautes2.push('recule à ' + FRACTIONS[i]);
        });
        dit(nomP + ' : 2. les deux écrans glissent ensemble, collés, du bon côté, sur l\'horloge des pages (' + horloge.ms + ' ms) — ni copie, ni échelle, ni fondu',
          releves.length === FRACTIONS.length * 2 && !fautes2.length && enRoute >= 6,
          releves.length + ' instants, ' + enRoute + ' en plein glissement' + (fautes2.length ? ' · ' + fautes2.length + ' faute(s), ex. ' + fautes2[0] : ''));
        /* 3. jamais l'un sur l'autre, jamais vide, le verre face au décor */
        const fautes3 = [];
        releves.forEach(x => {
          const recouvre = Math.max(0, Math.min(x.e.d, x.s.d) - Math.max(x.e.g, x.s.g));
          if (recouvre > 0.5) fautes3.push('recouvrement de ' + recouvre.toFixed(1) + ' px à ' + x.f);
          const vu = (b) => Math.max(0, Math.min(b.d, x.vw) - Math.max(b.g, 0));
          const plein = vu(x.e) + vu(x.s);
          if (plein < x.vw - 2 * 13) fautes3.push('vide : ' + plein.toFixed(0) + ' px couverts sur ' + x.vw + ' à ' + x.f);
        });
        dit(nomP + ' : 3. jamais l\'un sur l\'autre, jamais vide, et le verre des cartes reste face au décor',
          !fautes3.length && verreE.pire <= 0.5 && verreS.pire <= 1 && verreE.n >= FRACTIONS.length * 2 && verreS.n >= FRACTIONS.length * 2,
          (fautes3.length ? fautes3.slice(0, 2).join(' · ') + ' · ' : '') + 'verre de l\'écran qui arrive : ' + verreE.pire + ' px au plus sur ' + verreE.n + ' relevés ; de celui qui part : ' + verreS.pire + ' px sur ' + verreS.n);
        dit(nomP + ' : 4. au premier instant, les cartes de l\'écran quitté sont exactement où elles étaient',
          depart.n >= FRACTIONS.length * 2 && depart.pire <= 0.5, depart.pire + ' px au plus sur ' + depart.n + ' cartes');
      }
      /* ---- 5. la barre du bas ---- */
      {
        const film = (geste, avant) => p.evaluate(async ([geste, avant]) => {
          if (avant) { new Function(avant)(); await __dors(900); }
          const b = document.getElementById('barreBas'), r0 = b.getBoundingClientRect();
          const l = [];
          new Function(geste)();
          const pp = passage;
          for (let i = 0; i < 40 && pp && passage === pp; i++) {
            const rb = b.getBoundingClientRect(), cs = getComputedStyle(b);
            l.push({ bx: __tr(b)[0], by: rb.top - r0.top, vis: !b.classList.contains('cachee') && cs.visibility !== 'hidden', ex: __tr(pp.entrant)[0], sx: __tr(pp.sortant)[0] });
            await __image();
          }
          await __dors(700);
          return { l, fin: { x: __tr(b)[0], cachee: b.classList.contains('cachee'), cls: b.className } };
        }, [geste, avant]);
        /* De l'Accueil au Profil : elle part avec l'accueil. */
        let r = await film('openProfile()', "allerOnglet('mode')");
        let vus = r.l.filter(x => x.vis);
        let ecart = vus.length ? Math.max(...vus.map(x => Math.abs(x.bx - x.sx))) : 99;
        let vertical = vus.length ? Math.max(...vus.map(x => Math.abs(x.by))) : 99;
        let enRoute = vus.filter(x => Math.abs(x.sx) > 5).length;
        dit('5. de l\'Accueil au Profil, la barre part avec l\'accueil, collée à lui, sans bouger verticalement, puis se range',
          enRoute >= 3 && ecart <= 0.5 && vertical <= 0.5 && r.fin.cachee, enRoute + ' images en route · écart avec l\'accueil ' + ecart.toFixed(2) + ' px · vertical ' + vertical.toFixed(2) + ' · ' + JSON.stringify(r.fin));
        /* Du Profil aux Jeux : elle arrive avec sa page. */
        r = await film("allerOnglet('jeux')", null);
        vus = r.l.filter(x => x.vis);
        ecart = vus.length ? Math.max(...vus.map(x => Math.abs(x.bx - x.ex))) : 99;
        vertical = vus.length ? Math.max(...vus.map(x => Math.abs(x.by))) : 99;
        enRoute = vus.filter(x => Math.abs(x.ex) > 5).length;
        dit('5. du Profil aux Jeux, la barre arrive avec sa page, collée à elle, sans bouger verticalement, et finit à sa place',
          enRoute >= 3 && ecart <= 0.5 && !r.fin.cachee && Math.abs(r.fin.x) < 0.05, enRoute + ' images en route · écart avec la page ' + ecart.toFixed(2) + ' px · ' + JSON.stringify(r.fin));
        /* Entre deux onglets : elle ne bouge pas. */
        r = await film("allerOnglet('groupes')", null);
        const bouge = r.l.length ? Math.max(...r.l.map(x => Math.max(Math.abs(x.bx), Math.abs(x.by)))) : 99;
        dit('5. des Jeux aux Groupes, la barre ne bouge pas d\'un pixel', r.l.length >= 5 && bouge <= 0.05 && r.l.every(x => x.vis), r.l.length + ' images · ' + bouge.toFixed(2) + ' px');
        await p.evaluate(async () => { allerOnglet('mode'); await __dors(900); });
      }
      /* ---- 6. repris en route ---- */
      {
        const r = await p.evaluate(async () => {
          allerOnglet('jeux');
          await __dors(120);
          const vieux = passage && passage.entrant, x0 = __tr(vieux)[0];
          render();                                   // un rendu sur place pendant l'arrivée
          const neuf = passage && passage.entrant;
          const suite = [];
          for (let i = 0; i < 6; i++) { await __image(); suite.push(neuf && neuf.isConnected ? __tr(neuf)[0] : null); }
          await __dors(800);
          return { repris: !!(vieux && neuf && vieux !== neuf), x0, suite, fin: neuf ? __tr(neuf)[0] : null };
        });
        const pas = r.suite.every((x, i) => x !== null && x <= (i ? r.suite[i - 1] : r.x0) + 0.05);
        dit('6. un rendu sur place pendant l\'arrivée : le nœud neuf reprend le glissement où il en était, puis se pose',
          r.repris && r.x0 > 5 && r.suite[0] <= r.x0 + 0.05 && pas && r.fin === 0, JSON.stringify({ x0: Math.round(r.x0), suite: r.suite.map(x => Math.round(x)), fin: r.fin }));
        const q = await p.evaluate(async () => {
          allerOnglet('mode'); await __dors(900);
          allerOnglet('jeux');
          await __dors(170);
          const jeux = passage && passage.entrant, x0 = __tr(jeux)[0];
          allerOnglet('mode');                        // demi-tour avant la fin
          const pp = passage, suite = [];
          for (let i = 0; i < 10; i++) { await __image(); suite.push({ j: jeux.isConnected ? __tr(jeux)[0] : null, a: pp && pp.entrant ? __tr(pp.entrant)[0] : null }); }
          await __dors(800);
          return { x0, W: pp ? pp.W : 0, suite, fin: { ecran: state.screen, x: __tr(__ecranVif())[0], jeux: jeux.isConnected } };
        });
        const premier = q.suite[0];
        const continu = premier && Math.abs(premier.j - q.x0) < 0.25 * q.W;
        const colle = q.suite.every(s => s.j === null || s.a === null || Math.abs((s.j - s.a) - q.W) <= 0.5);
        const versDroite = q.suite.every((s, i) => s.j === null || s.j >= (i ? q.suite[i - 1].j : q.x0) - 0.05);
        dit('6. un retour demandé avant la fin : l\'écran repart d\'où il est, sans saut, et l\'accueil arrive collé à lui',
          q.x0 > 5 && continu && colle && versDroite && q.fin.ecran === 'mode' && q.fin.x === 0 && !q.fin.jeux,
          'au demi-tour ' + Math.round(q.x0) + ' px · ensuite ' + q.suite.slice(0, 5).map(s => Math.round(s.j) + '/' + Math.round(s.a)).join(' ') + ' · ' + JSON.stringify(q.fin));
      }
      /* ---- 7. après ---- */
      {
        await p.waitForTimeout(600);
        const r = await p.evaluate(() => ({
          copies: document.querySelectorAll('.fond-pousse').length,
          anims: document.getAnimations().filter(a => { const t = a.effect && a.effect.target; return a.constructor === Animation && t && (t.id === 'barreBas' || !!t.closest('#app') || !!t.closest('#barreBas')); }).length,
          passage: !!passage,
          traces: [...document.querySelectorAll('#app > .screen'), document.getElementById('barreBas')].filter(e => e && (e.style.opacity !== '' || e.style.transformOrigin !== '' || e.style.translate)).length,
          translations: [...document.querySelectorAll('#app *, #barreBas *')].filter(e => e.style && e.style.translate).length }));
        dit('7. après les passages : aucune animation, aucune translation, opacité ni origine laissées sur les écrans, le verre ou la barre',
          r.copies === 0 && r.anims === 0 && !r.passage && r.traces === 0 && r.translations === 0, JSON.stringify(r));
      }
      await ctx.close();
    }
  }
  dit('aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n' + ko + ' ÉCHEC(S)' : '\nTOUT EST VERT — le décor ne bouge pas, les écrans glissent côte à côte');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
