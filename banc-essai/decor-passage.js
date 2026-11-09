/* ====== LE DÉCOR NE BOUGE PAS, L'ÉCRAN FOND (v348, v356) ======
   v348 : « Corrige ça : je t'ai mis un trait rouge, lors d'une fermeture ou
     d'une ouverture » — le bord de la copie du décor qui glissait avec la
     page. v356 : « pour se déplacer, dans l'accueil, dans le jeu, dans le
     groupe, ou même pour aller dans le profil, je trouve que c'est pas
     plaisant du tout. Je veux un truc qui soit clean, qui fonctionne
     parfaitement sur tout type d'appareil sans faire bugger. »
   Un écran ne glisse plus : il FOND (le « fade through » de Material). Le
   décor, le même derrière tous les écrans, ne bouge jamais. Ce que ce banc
   exige, passage figé à plusieurs instants, à l'aller comme au retour, sur
   iPhone et sur Android :
     1. LE DÉCOR EST CONTINU. Écrans et barre masqués : ce qu'on voit
        pendant le passage est, au pixel près, le décor au repos ;
     2. RIEN NE GLISSE NI NE GRANDIT : aucune copie du décor ; l'écran qui
        arrive et celui qui part ne bougent pas d'un pixel et ne changent pas
        de taille — seule leur opacité change (une échelle laissait l'écran
        arrivé dessiné à une fraction de pixel de sa place : voir LE PASSAGE
        D'UN ÉCRAN À L'AUTRE EST UN FONDU, « ET PAS D'ÉCHELLE ») ;
     3. JAMAIS LES DEUX À LA FOIS : l'écran quitté a disparu avant que
        l'autre ne se voie (le texte de l'un ne passe jamais sur l'autre) ;
        et le verre des cartes reste face au décor, à chaque instant ;
     4. REPRIS EN ROUTE : un rendu sur place pendant l'arrivée — le nœud neuf
        reprend le fondu là où il en était ; un retour demandé avant la fin
        — l'écran repart de l'opacité où il en est, sans éclair ;
     5. la barre du bas qui arrive avec sa page (du Profil aux Jeux) : elle
        apparaît en fondu, sans bouger d'un pixel ;
     6. après le passage : aucune animation, aucune opacité ni origine
        laissées sur les écrans ou la barre ; aucune erreur.
   Usage : node banc-essai/decor-passage.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 360) + ')' : '')); };

const OUTILS = () => {
  /* Fige tout ce qui bouge à la fraction f du passage en cours. */
  window.__fige = (f) => { const d = passage ? passage.duree : 0;
    document.getAnimations().forEach(a => { try { a.pause(); if (f !== undefined) a.currentTime = d * f; } catch (e) {} }); };
  window.__lache = () => document.getAnimations().forEach(a => { try { a.play(); } catch (e) {} });
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
  window.__ecart = (a, b) => { let pire = 0, n = 0;
    for (const k in a) { if (!b[k]) continue; n++; pire = Math.max(pire, Math.abs(a[k][0] - b[k][0]), Math.abs(a[k][1] - b[k][1])); }
    return { pire: Math.round(pire * 10) / 10, n }; };
  /* L'état des deux écrans du passage : opacité, échelle, déplacement. */
  window.__etat = () => {
    const p = passage; if (!p) return null;
    const lit = (el) => { if (!el || !el.isConnected) return null; const cs = getComputedStyle(el), m = new DOMMatrixReadOnly(cs.transform);
      return { op: +cs.opacity, sc: m.a, sy: m.d, tx: m.m41, ty: m.m42 }; };
    return { e: lit(p.entrant), s: lit(p.sortant), fonds: document.querySelectorAll('.fond-pousse').length };
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
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(OUTILS);
    await p.waitForTimeout(1500);
    return { ctx, p };
  };
  const appareils = [['iPhone', IOS, { width: 402, height: 874 }], ['Android', ANDROID, { width: 412, height: 915 }]];
  const FRACTIONS = [0.12, 0.25, 0.4, 0.6, 0.85];
  const PASSAGES = [
    ['Accueil → Jeux', "allerOnglet('jeux')", "allerOnglet('mode')"],
    ['Accueil → Progression', 'openParcours()', 'goToModeSelect()'],
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
        for (const f of [0.25, 0.6]) {
          for (const geste of [aller, retour]) {
            const ok = await p.evaluate(([g, f]) => { new Function(g)(); if (!passage) return false; __fige(f); return true; }, [geste, f]);
            if (ok) {
              await p.waitForTimeout(120);
              const r = await comparer(await p.screenshot());
              vus++; pire = Math.max(pire, r.pire); moyen = Math.max(moyen, r.moyen);
            }
            await p.evaluate(() => __lache()); await p.waitForTimeout(800);
          }
        }
        dit(nomP + ' : 1. le décor reste le décor pendant tout le passage (aller et retour, ' + vus + ' instants)',
          vus === 4 && pire <= 10 && moyen <= 1.5, 'écart max ' + pire + ' niveaux, moyen ' + moyen);
      }
      await ctx.close();
    }
    /* ---- 2 et 3. rien ne glisse ; jamais les deux à la fois ; le verre ---- */
    {
      const { ctx, p } = await ouvrir(ua, vp);
      for (const [nomP, aller, retour] of PASSAGES) {
        const releves = [];
        let verre = { pire: 0, n: 0 };
        for (const geste of [aller, retour]) {
          /* Le retour part de la destination : on y va d'abord. */
          if (geste === retour) { await p.evaluate((g) => new Function(g)(), aller); await p.waitForTimeout(800); }
          for (const f of FRACTIONS) {
            const r = await p.evaluate(([g, f]) => { new Function(g)(); __fige(f); const e = __etat(); const v = __verre(passage && passage.entrant); return { e, v }; }, [geste, f]);
            await p.evaluate(() => __lache()); await p.waitForTimeout(700);
            const posee = await p.evaluate(() => __verre(document.querySelector('#app > .screen:not(.screen-exit)')));
            const ec = await p.evaluate(([a, b]) => __ecart(a, b), [r.v, posee]);
            if (r.e) releves.push(Object.assign({ f, visible: ec.pire * (r.e.e ? r.e.e.op : 0), n: ec.n }, r.e));
            verre.n += ec.n;
            /* retour à l'écran de départ, pour la mesure suivante */
            await p.evaluate((g) => new Function(g)(), geste === aller ? retour : aller); await p.waitForTimeout(700);
          }
          if (geste === retour) { await p.evaluate((g) => new Function(g)(), retour); await p.waitForTimeout(800); }
        }
        const fixe = (x) => !x || (Math.abs(x.tx) < 0.05 && Math.abs(x.ty) < 0.05 && Math.abs(x.sc - 1) < 1e-4 && Math.abs(x.sy - 1) < 1e-4);
        const glisse = releves.filter(x => !fixe(x.e) || !fixe(x.s) || x.fonds);
        dit(nomP + ' : 2. rien ne glisse ni ne grandit — aucune copie du décor ; les écrans ne bougent pas d\'un pixel, seule leur opacité change',
          releves.length === FRACTIONS.length * 2 && !glisse.length, releves.length + ' instants' + (glisse.length ? ', ' + JSON.stringify(glisse[0]) : ''));
        const ensemble = releves.filter(x => x.e && x.s && x.e.op > 0.02 && x.s.op > 0.02);
        const visible = Math.max(...releves.map(x => x.visible));
        dit(nomP + ' : 3. jamais les deux écrans à la fois, et le verre des cartes reste face au décor',
          !ensemble.length && visible <= 0.5 && verre.n >= FRACTIONS.length * 2,
          (ensemble.length ? 'ENSEMBLE : ' + JSON.stringify(ensemble[0]) + ' · ' : '') + 'décalage visible max ' + visible.toFixed(2) + ' px sur ' + verre.n + ' relevés');
      }
      /* ---- 4. repris en route ---- */
      {
        await p.evaluate(async () => { allerOnglet('mode'); await new Promise(ok => setTimeout(ok, 800)); });
        const r = await p.evaluate(async () => {
          allerOnglet('jeux');
          await new Promise(ok => setTimeout(ok, 170));
          const vieux = passage && passage.entrant, op0 = vieux ? +getComputedStyle(vieux).opacity : -1;
          render();                                   // un rendu sur place pendant l'arrivée
          const neuf = passage && passage.entrant;
          await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
          const op1 = neuf ? +getComputedStyle(neuf).opacity : -1;
          await new Promise(ok => setTimeout(ok, 700));
          return { repris: !!(vieux && neuf && vieux !== neuf), op0, op1, fin: neuf ? +getComputedStyle(neuf).opacity : -1 };
        });
        dit('4. un rendu sur place pendant l\'arrivée : le nœud neuf reprend le fondu là où il en était (pas de retour à zéro)',
          r.repris && r.op0 > 0.05 && r.op0 < 0.98 && r.op1 >= r.op0 - 0.02 && r.fin === 1, JSON.stringify(r));
        const q = await p.evaluate(async () => {
          allerOnglet('mode'); await new Promise(ok => setTimeout(ok, 800));
          allerOnglet('jeux');
          await new Promise(ok => setTimeout(ok, 170));
          const jeux = passage && passage.entrant, op0 = jeux ? +getComputedStyle(jeux).opacity : -1;
          const b = document.getElementById('barreBas'), bo0 = +getComputedStyle(b).opacity;
          allerOnglet('mode');                        // demi-tour avant la fin
          const suite = [];
          for (let i = 0; i < 12; i++) {
            await new Promise(ok => requestAnimationFrame(ok));
            suite.push([jeux && jeux.isConnected ? +getComputedStyle(jeux).opacity : 0, +getComputedStyle(b).opacity]);
          }
          await new Promise(ok => setTimeout(ok, 700));
          return { op0, bo0, suite, fin: { barre: +getComputedStyle(b).opacity, styleBarre: b.style.opacity, ecran: +getComputedStyle(document.querySelector('#app > .screen:not(.screen-exit)')).opacity } };
        });
        const eclair = Math.max(...q.suite.map(x => x[0])) - q.op0;
        dit('4. un retour demandé avant la fin : l\'écran quitté repart de l\'opacité où il en est, sans éclair, et la barre aussi',
          q.op0 > 0.05 && q.op0 < 0.98 && eclair <= 0.03 && q.suite[q.suite.length - 1][0] < 0.05 && q.fin.barre === 1 && q.fin.styleBarre === '' && q.fin.ecran === 1,
          'opacité au demi-tour ' + q.op0.toFixed(2) + ', plus haute ensuite de ' + eclair.toFixed(2) + ' · ' + JSON.stringify(q.fin));
      }
      /* ---- 5. la barre qui arrive avec sa page ---- */
      {
        await p.evaluate(async () => { state.screen = 'profile'; render(); await new Promise(ok => setTimeout(ok, 900)); });
        const r = await p.evaluate(async () => {
          const b = document.getElementById('barreBas');
          state.screen = 'jeux'; render();
          __fige(0.6);
          const rb = b.getBoundingClientRect(), op = +getComputedStyle(b).opacity;
          __lache();
          await new Promise(ok => setTimeout(ok, 900));
          const rb2 = b.getBoundingClientRect();
          return { op, bouge: Math.max(Math.abs(rb.left - rb2.left), Math.abs(rb.top - rb2.top)), fin: +getComputedStyle(b).opacity, cachee: b.classList.contains('cachee') };
        });
        dit('5. du Profil aux Jeux, la barre apparaît en fondu avec sa page, sans bouger d\'un pixel',
          r.op > 0.05 && r.op < 0.98 && r.bouge <= 0.5 && r.fin === 1 && !r.cachee, JSON.stringify(r));
      }
      /* ---- 6. après ---- */
      {
        await p.waitForTimeout(600);
        const r = await p.evaluate(() => ({
          copies: document.querySelectorAll('.fond-pousse').length,
          anims: document.getAnimations().filter(a => { const t = a.effect && a.effect.target; return t && (t.id === 'barreBas' || (t.classList && (t.classList.contains('gs') || t.classList.contains('screen')))); }).length,
          passage: !!passage,
          traces: [...document.querySelectorAll('#app > .screen'), document.getElementById('barreBas')].filter(e => e && (e.style.opacity !== '' || e.style.transformOrigin !== '')).length }));
        dit('6. après les passages : aucune animation, aucune opacité ni origine laissées sur les écrans ou la barre',
          r.copies === 0 && r.anims === 0 && !r.passage && r.traces === 0, JSON.stringify(r));
      }
      await ctx.close();
    }
  }
  dit('aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n' + ko + ' ÉCHEC(S)' : '\nTOUT EST VERT — le décor ne bouge pas, l\'écran fond');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
