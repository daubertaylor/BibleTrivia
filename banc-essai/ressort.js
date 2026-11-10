/* ====== LE CHANGEMENT D'ÉCRAN EST UN RESSORT (v360) ======
   « Fluidifie encore l'animation de transition : je veux qu'elle soit bien
     fluide, sans s'arrêter brusquement. » L'horloge commune (--tr-plie)
   était easeOutCubic : 38 px dès la première image, un coup de frein
   aussitôt. Elle devient un ressort amorti (voir LE RESSORT). Filmé image
   par image, sur iPhone et sur Android, de vrais touchers sur la barre :
     1. une seule horloge : l'écran qui arrive, celui qui part, la barre et
        sa pastille portent la courbe de --tr-plie, en ressort (linear()) ;
     2. l'écran part de l'arrêt : sa première image avance de moins de 3 %
        de la largeur (12 px), et sa vitesse monte d'abord ;
     3. une seule bosse de vitesse : passé le sommet, elle ne fait que
        décroître (à un demi-pixel près, l'arrondi des points de la courbe) ;
     4. une pose douce, sans cassure : la dernière image en mouvement fait
        moins d'un pixel, et les 150 dernières millisecondes avancent encore
        (plus de 2 px) — le mouvement s'éteint, il ne s'arrête pas net ;
     5. sur un téléphone lent (processeur ralenti six fois, où la première
        image tombe en retard), l'écran apparaît à moins de 10 % de sa course
        (l'ancienne courbe : jusqu'à 18 %) ;
     6. les compteurs (easePli) suivent le même ressort ;
     7. deux onglets touchés coup sur coup : l'écran qui arrivait repart
        avec son élan — aucune image ne fait moins de la moitié du pas
        d'avant le second toucher (pas de temps d'arrêt) ;
     8. aucune erreur.
   Usage : node banc-essai/ressort.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 500) + ')' : '')); };
const norme = (s) => String(s || '').replace(/\s+/g, '');

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const fautes = { horloge: [], depart: [], bosse: [], pose: [], lent: [] };
  let vus = 0, compteur = null, elan = null;
  for (const [tel, ua, vp] of [['iPhone', IOS, { width: 402, height: 874 }], ['Android', AND, { width: 412, height: 915 }]]) {
    for (const cpu of [1, 6]) {
      const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
        localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() })); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.waitForTimeout(1500);
      const cdp = await ctx.newCDPSession(p);
      if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      for (const o of ['parcours', 'jeux', 'groupes', 'accueil']) {
        /* Le film démarre au toucher : chaque image, la place de l'écran qui arrive. */
        await p.evaluate(() => {
          window.__film = []; const t0 = performance.now(); let pp = null;
          const tic = () => {
            const t = performance.now() - t0;
            if (!pp && passage) {
              pp = passage;
              const a = pp.anims || [];
              const courbe = norme => String(norme || '').replace(/\s+/g, '');
              window.__horloge = { pli: getComputedStyle(document.documentElement).getPropertyValue('--tr-plie').trim(),
                ecrans: a.map(x => { try { return x.effect.getTiming().easing; } catch (e) { return '?'; } }),
                pastille: getComputedStyle(document.querySelector('.bb-curseur')).transitionTimingFunction };
            }
            const e = pp && pp.entrant;
            const v = e && e.isConnected ? getComputedStyle(e).translate : null;
            window.__film.push([t, (!v || v === 'none') ? 0 : parseFloat(v), !!pp && passage === pp]);
            if (t < 1400) requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
        });
        await p.tap('.bb-onglet[data-o="' + o + '"]');
        await p.waitForTimeout(1600);
        const r = await p.evaluate(() => ({ film: window.__film, h: window.__horloge, W: innerWidth }));
        if (!r.h) { fautes.horloge.push(tel + ' → ' + o + ' : aucun passage'); continue; }
        vus++;
        const pli = norme(r.h.pli.replace(/^[\d.]+s\s*/, ''));
        if (!/^linear\(/.test(pli) || r.h.ecrans.some(x => norme(x) !== pli) || norme(r.h.pastille) !== pli) fautes.horloge.push(tel + ' → ' + o + ' : ' + JSON.stringify(r.h).slice(0, 200));
        /* Les positions pendant le passage (|x| décroît vers 0). */
        const pos = r.film.filter(x => x[2]).map(x => [x[0], Math.abs(x[1])]);
        const visibles = pos.filter(x => x[1] < r.W - 0.5);
        if (visibles.length < 8) { fautes.pose.push(tel + ' → ' + o + ' : ' + visibles.length + ' images'); continue; }
        const premier = r.W - visibles[0][1];
        const pas = []; for (let i = 1; i < visibles.length; i++) pas.push(visibles[i - 1][1] - visibles[i][1]);
        if (cpu === 1) {
          if (!(premier <= 12) || !(pas[0] > premier - 0.5)) fautes.depart.push(tel + ' → ' + o + ' : 1re image ' + premier.toFixed(1) + ' px, puis ' + pas.slice(0, 3).map(x => x.toFixed(1)).join(' '));
          const sommet = pas.indexOf(Math.max(...pas));
          for (let i = sommet + 1; i < pas.length; i++) if (pas[i] > pas[i - 1] + 0.6) { fautes.bosse.push(tel + ' → ' + o + ' : ' + pas.map(x => x.toFixed(1)).join(' ')); break; }
          const fin = visibles[visibles.length - 1], tFin = fin[0];
          const avant = visibles.filter(x => x[0] >= tFin - 150);
          const reste = avant.length ? avant[0][1] : 0;
          if (!(fin[1] < 1) || !(reste > 2)) fautes.pose.push(tel + ' → ' + o + ' : dernière image à ' + fin[1].toFixed(2) + ' px, ' + reste.toFixed(1) + ' px sur les 150 dernières ms');
        } else {
          if (!(premier <= 0.1 * r.W)) fautes.lent.push(tel + ' → ' + o + ' : apparu à ' + (100 * premier / r.W).toFixed(1) + ' % de sa course');
        }
      }
      if (tel === 'iPhone' && cpu === 1) {
        await p.tap('.bb-onglet[data-o="accueil"]'); await p.waitForTimeout(1200);
        elan = await p.evaluate(() => new Promise(res => {
          allerOnglet('jeux');
          const jeux = passage && passage.entrant; const l = []; const t0 = performance.now(); let second = null;
          const tx = () => { const v = jeux && jeux.isConnected ? getComputedStyle(jeux).translate : null; return (!v || v === 'none') ? 0 : parseFloat(v); };
          const tic = () => {
            const t = performance.now() - t0;
            l.push([t, tx()]);
            if (second === null && t >= 110) { second = l.length; allerOnglet('groupes'); }
            if (t < 520) requestAnimationFrame(tic); else res({ l, second });
          };
          requestAnimationFrame(tic);
        }));
        await p.waitForTimeout(900);
        compteur = await p.evaluate(() => {
          try {
            const ms = msPli(), out = [];
            for (const f of [0.1, 0.25, 0.5, 0.75]) out.push([f, Math.round(easePli(f) * 1000) / 1000]);
            return { ms, out, ressort: PLI_RESSORT };
          } catch (e) { return { erreur: e.message }; }
        });
      }
      await ctx.close();
    }
  }
  dit('1. une seule horloge, en ressort : écrans, barre et pastille portent la courbe de --tr-plie', vus >= 12 && !fautes.horloge.length, fautes.horloge[0] || vus + ' passages filmés');
  dit('2. l\'écran part de l\'arrêt : 1re image sous 12 px, puis il accélère', !fautes.depart.length, fautes.depart[0] || '');
  dit('3. une seule bosse de vitesse, qui ne fait que décroître ensuite', !fautes.bosse.length, fautes.bosse[0] || '');
  dit('4. une pose douce : la dernière image sous 1 px, et encore plus de 2 px sur les 150 dernières ms', !fautes.pose.length, fautes.pose[0] || '');
  dit('5. sur un téléphone lent, l\'écran apparaît à moins de 10 % de sa course', !fautes.lent.length, fautes.lent[0] || '');
  const k = 7.54, n = 1 - (1 + k) * Math.exp(-k), ref = (t) => (1 - (1 + k * t) * Math.exp(-k * t)) / n;
  const bonCpt = compteur && compteur.ressort && compteur.ms === 580 && compteur.out.every(([f, v]) => Math.abs(v - ref(f)) < 0.002);
  dit('6. les compteurs suivent le même ressort, sur la même durée', bonCpt, JSON.stringify(compteur));
  let bonElan = false, detail = '—';
  if (elan && elan.second) {
    const pas = []; for (let i = 1; i < elan.l.length; i++) pas.push(Math.abs(elan.l[i][1] - elan.l[i - 1][1]));
    const avant = pas[elan.second - 2], apres = pas.slice(elan.second - 1, elan.second + 2);
    bonElan = avant > 5 && apres.length === 3 && apres.every(x => x >= 0.5 * avant);
    detail = 'pas avant le second toucher ' + (avant || 0).toFixed(1) + ' px, puis ' + apres.map(x => x.toFixed(1)).join(' ');
  }
  dit('7. deux onglets coup sur coup : l\'écran repart avec son élan, sans temps d\'arrêt', bonElan, detail);
  dit('8. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — un écran part de l\'arrêt, prend son élan et se pose en douceur : un ressort, partout');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
