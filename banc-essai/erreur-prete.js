/* ====== BANC « TROUVE L'ERREUR EST PRÊT TOUT DE SUITE » (v373) ======
   Toucher la tuile de « Trouve l'erreur », et rien pendant un quart de
   seconde : préparer ses huit manches demandait, pour chaque verset essayé,
   trois expressions neuves par paire de mots — des centaines avant
   d'afficher quoi que ce soit (0,12 à 0,26 s au premier lancement, au
   processeur ralenti quatre fois ; les autres jeux : moins d'une
   milliseconde). Les mots d'un verset sont maintenant relevés une fois, et
   chaque paire se vérifie d'un regard.
     1. LES MÊMES PAIRES : pour chaque verset du jeu, dans les trois langues,
        les paires possibles sont exactement celles de l'ancienne méthode
        (une expression par mot, refaite ici à l'identique) ;
     2. LES MANCHES TIENNENT LEUR RÈGLE : vingt tirages par langue, huit
        manches chacun, un seul mot changé par verset, et ce mot-là ;
     3. LE PREMIER LANCEMENT EST RAPIDE : dans une page neuve, au processeur
        ralenti quatre fois, préparer les huit manches prend moins de 90 ms
        (médiane de trois pages) ;
     4. DU TOUCHER AU MOUVEMENT, « Trouve l'erreur » part comme « Range les
        livres » (au plus 60 ms de plus, au processeur ralenti) ;
     5. aucune erreur.
   Usage : node banc-essai/erreur-prete.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  const page = async () => {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block',
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
    await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await ctx.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(1000);
    return { ctx, p };
  };
  try {
    /* ---- 1 et 2 ---- */
    const t = await page();
    const r12 = await t.p.evaluate(() => {
      const ancien = (echanges, txt, tous) => echanges.filter(([a, z]) => motRe(a).test(txt) && !motRe(z).test(tous) && !motRe(z).test(txt));
      const avant = LANGUE, o = { versets: 0, avecPaires: 0, ecarts: [], manches: 0, fautes: [] };
      for (const lg of ['fr', 'en', 'es']) {
        LANGUE = lg;
        const ech = JEU_ECHANGES[lg];
        for (const v of HERO_VERSES) {
          const txt = texteVerset(v.r, v.t);
          if (!txt) continue;
          const tous = versionsDeLaLangue(v).join(' ');
          const a = JSON.stringify(ancien(ech, txt, tous)), b = JSON.stringify(pairesPossibles(ech, txt, tous));
          o.versets++;
          if (a !== '[]') o.avecPaires++;
          if (a !== b && o.ecarts.length < 3) o.ecarts.push(lg + ' ' + v.r + ' : ' + a + ' / ' + b);
        }
        for (let k = 0; k < 20; k++) {
          for (const m of manchesErreur(8)) {
            o.manches++;
            const vrais = texteVerset(m.r, (HERO_VERSES.find(x => x.r === m.r) || {}).t).split(/\s+/).filter(Boolean);
            const diff = m.mots.map((w, i) => w !== vrais[i] ? i : -1).filter(i => i >= 0);
            if (m.mots.length !== vrais.length || diff.length !== 1 || diff[0] !== m.faux || vrais[m.faux] !== m.juste) { if (o.fautes.length < 3) o.fautes.push(lg + ' ' + m.r); }
          }
        }
      }
      LANGUE = avant;
      return o;
    });
    dit('1. les mêmes paires que l\'ancienne méthode, pour chaque verset, dans les trois langues',
      r12.versets > 900 && r12.avecPaires > 300 && r12.ecarts.length === 0, JSON.stringify({ versets: r12.versets, avecPaires: r12.avecPaires, ecarts: r12.ecarts }));
    dit('2. vingt tirages par langue : huit manches, un seul mot changé par verset, et ce mot-là',
      r12.manches === 3 * 20 * 8 && r12.fautes.length === 0, JSON.stringify({ manches: r12.manches, fautes: r12.fautes }));
    await t.ctx.close();

    /* ---- 3 ---- le premier lancement, dans une page neuve */
    const premiers = [];
    for (let i = 0; i < 3; i++) {
      const u = await page();
      const c = await u.ctx.newCDPSession(u.p); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      premiers.push(await u.p.evaluate(() => { const t0 = performance.now(); const m = manchesErreur(8); return m.length === 8 ? Math.round(performance.now() - t0) : 9999; }));
      await u.ctx.close();
    }
    const med = premiers.slice().sort((a, b) => a - b)[1];
    dit('3. le premier lancement : préparer les huit manches prend moins de 90 ms au processeur ralenti (médiane de trois pages neuves)',
      med < 90, premiers.join(' / ') + ' ms');

    /* ---- 4 ---- du toucher au mouvement : le PREMIER lancement de chacun,
       dans une page neuve (deux pages, le meilleur des deux) */
    const mesures = { livres: [], erreur: [] };
    for (let k = 0; k < 2; k++) {
      const u = await page();
      const c = await u.ctx.newCDPSession(u.p); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      for (const id of ['livres', 'erreur']) {
        await u.p.evaluate(() => { jeu = null; allerOnglet('jeux'); }); await u.p.waitForTimeout(1500);
        mesures[id].push(await u.p.evaluate((id) => new Promise(res => {
          const t0 = performance.now();
          lancerJeu(id);
          const tic = () => {
            const t = performance.now() - t0;
            const e = document.querySelector('#app > .screen:not(.screen-exit)');
            const v = e ? getComputedStyle(e).translate : 'none';
            const x = (!v || v === 'none') ? 0 : parseFloat(v);
            if (x !== 0 && Math.abs(x) < innerWidth - 2) return res(Math.round(t));
            if (t > 3000) return res(9999);
            requestAnimationFrame(tic);
          };
          requestAnimationFrame(tic);
        }), id));
        await u.p.waitForTimeout(1300);
      }
      await u.ctx.close();
    }
    const l = Math.min(...mesures.livres), e = Math.min(...mesures.erreur);
    dit('4. du toucher au mouvement, au premier lancement, « Trouve l\'erreur » part comme « Range les livres » (au plus 60 ms de plus, au processeur ralenti)',
      e < 9999 && l < 9999 && e - l <= 60, JSON.stringify(mesures) + ' ms');
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('5. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — « Trouve l\'erreur » est prêt tout de suite, avec les mêmes manches');
  process.exit(ko ? 1 : 0);
})();
