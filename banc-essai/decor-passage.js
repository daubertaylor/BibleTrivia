/* ====== LE DÉCOR NE BOUGE PAS PENDANT QU'UNE PAGE GLISSE (v348) ======
   « Corrige ça : je t'ai mis un trait rouge, lors d'une fermeture ou d'une
     ouverture » (capture de Taylor, iPhone, de l'Accueil aux Jeux : le trait
     suit le bord gauche de l'écran qui arrive).
   Un écran est transparent : le décor du jeu (la photo, la vignette, le
   grain) est derrière tous les écrans. Pour arriver plein, comme une page,
   l'écran qui glisse a devant lui une copie du décor (.fond-pousse). Elle
   glissait AVEC lui : au bord de la page, deux photos décalées — la même
   falaise deux fois, et la vignette de la copie qui assombrissait le bord.
   Ce que ce banc exige, passage figé à plusieurs instants, à l'aller (la
   page arrive) comme au retour (elle repart), sur iPhone et sur Android :
     1. LE DÉCOR EST CONTINU. Écrans et barre masqués, ombre retirée : ce
        qu'on voit pendant le passage est, au pixel près, le décor au repos
        (la copie ne montre que ce qu'elle recouvre). v347 : jusqu'à 135
        niveaux d'écart.
     2. LA PAGE GLISSE QUAND MÊME : la boîte de la copie suit l'écran qui
        bouge (c'est elle qui couvre l'écran quitté et porte l'ombre), et ce
        qu'elle montre (.fp-decor) reste à zéro.
     3. LE VERRE DES CARTES QUI GLISSENT REGARDE LE DÉCOR IMMOBILE : chaque
        couche de verre (.gs, hors couches pleines) de l'écran qui bouge est,
        à l'écran, exactement où elle est au repos — elle montre le décor qui
        est derrière la carte, pas celui de sa place d'arrivée.
     4. Même chose pour un passage repris en route : un rendu sur place
        pendant que l'écran arrive (le nœud neuf reprend le mouvement), et un
        retour demandé avant l'arrivée (l'écran repart d'où il en est).
     5. La barre du bas qui ARRIVE avec sa page (du Profil aux Jeux) : elle
        glisse, son verre non.
     6. Après le passage : plus de copie, plus aucune animation sur le verre,
        et aucune erreur.
   Usage : node banc-essai/decor-passage.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

/* Outils posés dans la page. */
const OUTILS = () => {
  /* Fige tout ce qui bouge à la fraction f du passage en cours. */
  window.__fige = (f) => { const d = passage ? passage.duree : 0;
    document.getAnimations().forEach(a => { try { a.pause(); if (f !== undefined) a.currentTime = d * f; } catch (e) {} }); };
  window.__lache = () => document.getAnimations().forEach(a => { try { a.play(); } catch (e) {} });
  /* Les couches de verre d'un écran : leur coin, À L'ÉCRAN, avec leur
     identité (posée une fois). */
  window.__n = window.__n || 0;
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
  window.__bouge = () => passage ? (passage.genre === 'pousse' ? passage.entrant : passage.sortant) : null;
  /* L'écart le plus grand entre deux relevés du même verre. */
  window.__ecart = (a, b) => { let pire = 0, n = 0;
    for (const k in a) { if (!b[k]) continue; n++; pire = Math.max(pire, Math.abs(a[k][0] - b[k][0]), Math.abs(a[k][1] - b[k][1])); }
    return { pire: Math.round(pire * 10) / 10, n }; };
  /* Où en sont la boîte de la copie, ce qu'elle montre, et l'écran qui bouge. */
  window.__fenetre = () => { const f = document.querySelector('#app > .fond-pousse'); if (!f) return null;
    const d = f.querySelector('.fp-decor'); const e = window.__bouge();
    const tx = (el) => el ? new DOMMatrixReadOnly(getComputedStyle(el).transform).m41 : null;
    /* sans fenêtre (v347), ce que montre la copie, c'est la copie entière :
       elle glisse avec la boîte */
    return { boite: f.getBoundingClientRect().left, decor: (d || f).getBoundingClientRect().left, ecran: tx(e) }; };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const ouvrir = async (ua, vp) => {
    const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 1, userAgent: ua, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(OUTILS);
    await p.waitForTimeout(1500);
    return { ctx, p };
  };
  const appareils = [['iPhone', IOS, { width: 402, height: 874 }], ['Android', ANDROID, { width: 412, height: 915 }]];
  const FRACTIONS = [0.12, 0.35, 0.6, 0.85];
  /* Les passages : [nom, geste aller, geste retour]. */
  const PASSAGES = [
    ['Accueil → Jeux', "allerOnglet('jeux')", "allerOnglet('mode')"],
    ['Accueil → Progression', 'openParcours()', 'goToModeSelect()'],
  ];
  for (const [nomA, ua, vp] of appareils) {
    console.log('— ' + nomA + ' (' + vp.width + ' × ' + vp.height + ')');
    /* ---- 1. le décor est continu ---- */
    {
      const { ctx, p } = await ouvrir(ua, vp);
      await p.addStyleTag({ content: '#app > .screen, #barreBas{ visibility:hidden !important; } .fond-pousse{ box-shadow:none !important; }' });
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
        /* à chaque instant : l'aller (la page arrive), puis le retour (elle
           repart), et l'on est revenu au départ */
        for (const f of FRACTIONS) {
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
        dit(nomP + ' : le décor reste le décor pendant tout le passage (aller et retour, ' + vus + ' instants)',
          vus === FRACTIONS.length * 2 && pire <= 10 && moyen <= 1.5, 'écart max ' + pire + ' niveaux, moyen ' + moyen);
      }
      await ctx.close();
    }
    /* ---- 2 et 3. la boîte glisse, ce qu'elle montre non ; le verre non plus ---- */
    {
      const { ctx, p } = await ouvrir(ua, vp);
      for (const [nomP, aller, retour] of PASSAGES) {
        let fen = [], verre = { pire: 0, n: 0 }, boiteSuit = true, mesures = 0, chemin = 0;
        for (const f of FRACTIONS) {
          /* aller : le verre de l'écran qui arrive, figé, contre le même au repos */
          const fige = await p.evaluate(([g, f]) => { new Function(g)(); __fige(f); return { v: __verre(__bouge()), fen: __fenetre() }; }, [aller, f]);
          await p.evaluate(() => __lache()); await p.waitForTimeout(1000);
          const posee = await p.evaluate(() => __verre(document.querySelector('#app > .screen:not(.screen-exit)')));
          const e1 = await p.evaluate(([a, b]) => __ecart(a, b), [fige.v, posee]);
          /* retour : le verre de l'écran qui repart, au repos puis figé */
          const avant = await p.evaluate(() => __verre(document.querySelector('#app > .screen:not(.screen-exit)')));
          const fige2 = await p.evaluate(([g, f]) => { new Function(g)(); __fige(f); return { v: __verre(__bouge()), fen: __fenetre() }; }, [retour, f]);
          const e2 = await p.evaluate(([a, b]) => __ecart(a, b), [fige2.v, avant]);
          await p.evaluate(() => __lache()); await p.waitForTimeout(1000);
          for (const [e, fz] of [[e1, fige.fen], [e2, fige2.fen]]) {
            verre.pire = Math.max(verre.pire, e.pire); verre.n += e.n;
            if (fz) { fen.push(fz); mesures++; chemin = Math.max(chemin, fz.ecran);
              if (!(Math.abs(fz.boite - fz.ecran) <= 0.6)) boiteSuit = false; }
          }
        }
        const decorMax = fen.length ? Math.max(...fen.map(x => Math.abs(x.decor))) : 99;
        dit(nomP + ' : la page glisse — la boîte de la copie suit l\'écran qui bouge, à chaque instant', mesures === FRACTIONS.length * 2 && boiteSuit && chemin > 50,
          fen.map(x => Math.round(x.boite)).join(' / ') + ' px');
        dit(nomP + ' : … et ce qu\'elle montre ne bouge pas', mesures === FRACTIONS.length * 2 && decorMax <= 0.5, 'écart max ' + decorMax.toFixed(2) + ' px');
        dit(nomP + ' : le verre des cartes qui glissent reste face au décor (aller et retour)', verre.n >= FRACTIONS.length * 4 && verre.pire <= 1.5,
          verre.n + ' relevés, écart max ' + verre.pire + ' px');
      }
      /* ---- 4. repris en route ---- */
      {
        const r = await p.evaluate(async () => {
          allerOnglet('jeux');
          await new Promise(ok => setTimeout(ok, 160));
          const vieux = passage && passage.entrant;
          render();                                   // un rendu sur place pendant l'arrivée
          const neuf = passage && passage.entrant;
          await new Promise(ok => setTimeout(ok, 90));
          __fige();
          const v = __verre(__bouge()), fen = __fenetre();
          __lache();
          await new Promise(ok => setTimeout(ok, 1000));
          const posee = __verre(document.querySelector('#app > .screen:not(.screen-exit)'));
          return { repris: !!(vieux && neuf && vieux !== neuf), fen, e: __ecart(v, posee) };
        });
        dit('un rendu sur place pendant l\'arrivée : le nœud neuf reprend le passage, son verre reste face au décor',
          r.repris && r.fen && Math.abs(r.fen.decor) <= 0.5 && r.e.n >= 3 && r.e.pire <= 1.5,
          (r.repris ? 'repris' : 'PAS REPRIS') + ', décor ' + (r.fen ? r.fen.decor.toFixed(2) : '—') + ' px, verre ' + r.e.pire + ' px sur ' + r.e.n);
        const q = await p.evaluate(async () => {
          allerOnglet('mode'); await new Promise(ok => setTimeout(ok, 900));
          const avant = __verre(document.querySelector('#app > .screen:not(.screen-exit)'));
          allerOnglet('jeux');
          await new Promise(ok => setTimeout(ok, 200));
          allerOnglet('mode');                        // demi-tour avant l'arrivée
          const x0 = passage ? passage.x0 : -1;
          await new Promise(ok => setTimeout(ok, 50));
          __fige();
          const v = __verre(__bouge()), fen = __fenetre();
          __lache();
          await new Promise(ok => setTimeout(ok, 900));
          return { x0, fen, v };
        });
        /* l'écran qui repart est celui des Jeux, arrêté en route : son verre,
           au repos, est celui qu'on relève après une arrivée complète */
        const posee = await p.evaluate(async () => { allerOnglet('jeux'); await new Promise(ok => setTimeout(ok, 1000));
          const v = __verre(document.querySelector('#app > .screen:not(.screen-exit)')); allerOnglet('mode'); await new Promise(ok => setTimeout(ok, 900)); return v; });
        /* les identités ne sont pas les mêmes (nouveaux nœuds) : on compare
           par ordre, une couche à la fois */
        const a = Object.values(q.v), b = Object.values(posee);
        let pire = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) pire = Math.max(pire, Math.abs(a[i][0] - b[i][0]), Math.abs(a[i][1] - b[i][1]));
        dit('un retour demandé avant l\'arrivée : l\'écran repart d\'où il en est, décor et verre immobiles',
          q.x0 > 1 && q.fen && Math.abs(q.fen.decor) <= 0.5 && a.length >= 3 && a.length === b.length && pire <= 1.5,
          'départ ' + Math.round(q.x0) + ' px, décor ' + (q.fen ? q.fen.decor.toFixed(2) : '—') + ' px, verre ' + pire.toFixed(1) + ' px sur ' + a.length);
      }
      /* ---- 5. la barre qui arrive avec sa page ---- */
      {
        await p.evaluate(async () => { state.screen = 'profile'; render(); await new Promise(ok => setTimeout(ok, 900)); });
        const r = await p.evaluate(async () => {
          const b = document.getElementById('barreBas');
          state.screen = 'jeux'; render();
          __fige(0.2);
          const g = b && b._gs; const rb = b.getBoundingClientRect(); const rg = g ? g.getBoundingClientRect() : null;
          const plein = !!(g && g.classList.contains('gs-plein'));
          __lache();
          await new Promise(ok => setTimeout(ok, 1100));
          const rb2 = b.getBoundingClientRect(); const rg2 = g ? g.getBoundingClientRect() : null;
          return { glisse: rb.left - rb2.left > 20, plein, barre: rb.left - rb2.left, verre: rg && rg2 ? Math.max(Math.abs(rg.left - rg2.left), Math.abs(rg.top - rg2.top)) : 99 };
        });
        dit('du Profil aux Jeux, la barre arrive avec sa page : elle glisse, son verre reste face au décor',
          r.glisse && !r.plein && r.verre <= 1.5, (r.glisse ? 'barre glissée de ' + Math.round(r.barre) + ' px' : 'LA BARRE NE GLISSE PAS') + ', verre ' + r.verre.toFixed(1) + ' px');
      }
      /* ---- 6. après ---- */
      {
        await p.waitForTimeout(600);
        const r = await p.evaluate(() => ({
          copies: document.querySelectorAll('.fond-pousse').length,
          anims: document.getAnimations().filter(a => { const t = a.effect && a.effect.target; return t && t.classList && (t.classList.contains('gs') || t.classList.contains('fp-decor')); }).length,
          passage: !!passage }));
        dit('après les passages : plus de copie du décor, plus aucune animation sur le verre', r.copies === 0 && r.anims === 0 && !r.passage,
          r.copies + ' copie(s), ' + r.anims + ' animation(s) de verre');
      }
      await ctx.close();
    }
  }
  dit('aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n' + ko + ' ÉCHEC(S)' : '\nTOUT EST VERT');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
