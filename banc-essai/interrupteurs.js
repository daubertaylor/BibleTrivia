/* ====== BANC « DES INTERRUPTEURS LONGS, ÉTIRÉS, MINIMALISTES » (v383) ======
   « Ces boutons-ci, affine-les, rends-les plus modernes, sans trop changer
     leur style : juste bien mieux. » (capture des Réglages, IMG_4365.) Puis :
   « Je veux qu'ils soient plus longs, de façon moderne, pas juste un rond.
     De façon minimaliste, et plus étirés. »
   Sur un iPhone puis un Android, dans les Réglages :
     1. un rail LONG, 4 × 1,6 rem (66 × 27 sur 402 points ; 2,75 rem avant),
        et un galet ÉTIRÉ en capsule, 2,5 × 1,3 rem — presque deux fois plus
        long que haut —, avec le même jour tout autour, éteint comme allumé
        (à 0,5 px près) ;
     2. le rail reste plat (aucune ombre, aucun trait : jamais de bordure de
        couleur) ; seul le galet a une ombre, neutre ; minimaliste : un blanc
        plein, sans reflet ni dégradé ;
     3. toucher bascule (classe, aria-checked, réglage gardé) ; le galet part
        de l'autre côté ;
     4. tenu au doigt, le galet s'étire vers où il va ;
     5. on le touche sur 44 px de haut au moins ;
     6. les autres interrupteurs (heures des rappels, entrée des groupes) ont
        la même forme ;
     7. iPhone et Android : au pixel près ;
     8. sur un écran plus étroit (360, puis 320 points), le rail raccourcit
        un peu (jusqu'à 3,3 rem), le galet reste une capsule, 1,5 rem de
        moins que le rail, avec la même course et le même jour ; aucune erreur.
   Usage : node banc-essai/interrupteurs.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 300) + ')' : '')); };

const MESURE = (id) => {
  const b = document.getElementById(id); if (!b) return null;
  const r = b.getBoundingClientRect(), cs = getComputedStyle(b), g = getComputedStyle(b, '::after');
  /* La place réelle du galet : sa boîte, déplacée de sa translation. */
  const m = new DOMMatrixReadOnly(g.transform === 'none' ? undefined : g.transform);
  const gl = parseFloat(g.left) + m.m41, gt = parseFloat(g.top) + m.m42, gw = parseFloat(g.width), gh = parseFloat(g.height);
  const av = getComputedStyle(b, '::before');
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  /* Les mesures du rail sont celles de sa boîte, pas de son image : tenu au
     doigt, tout bouton du jeu s'enfonce un peu (l'onde d'appui le réduit). */
  const W = parseFloat(cs.width), H = parseFloat(cs.height);
  return { rem, w: W, h: H, gw, gh, gauche: gl, droite: W - gl - gw, haut: gt, bas: H - gt - gh,
    ombreRail: cs.boxShadow, bord: cs.borderTopWidth + ' ' + cs.borderTopStyle, outline: cs.outlineStyle,
    ombreGalet: g.boxShadow, rayon: g.borderRadius, fond: cs.backgroundColor, on: b.classList.contains('on'), aria: b.getAttribute('aria-checked'),
    blanc: g.backgroundColor, reflet: g.backgroundImage, course: m.m41,
    cible: (parseFloat(av.bottom) < 0 || parseFloat(av.top) < 0) ? r.height - parseFloat(av.top) - parseFloat(av.bottom) : r.height };
};
/* Une ombre neutre : chaque couleur citée est un gris-brun (canaux à moins de 30 l'un de l'autre). */
const neutre = (bs) => (bs.match(/rgba?\([^)]+\)/g) || []).every(c => { const v = c.match(/[\d.]+/g).map(Number); return Math.max(v[0], v[1], v[2]) - Math.min(v[0], v[1], v[2]) <= 30 || (v.length > 3 && v[3] === 0); });

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [], vus = {};
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      console.log('  — ' + tel);
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.route(/supabase\.co|googlesyndication/, r => r.abort());
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('bt_settings', JSON.stringify({ sfx: true, music: false })); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
      await p.evaluate(() => openSettings());
      await p.waitForTimeout(1100);
      const on = await p.evaluate(MESURE, 'swSfx'), off = await p.evaluate(MESURE, 'swMusic');
      vus[tel] = JSON.stringify([on, off]);
      /* Les tailles du jeu suivent la taille du texte (1 rem = 16 px sur un
         écran de référence, un peu plus sur un grand) : on les lit en rem. */
      const R = on.rem, jour = (x) => [x.haut, x.bas, x.on ? x.droite : x.gauche];
      dit('1. un rail long de 4 × 1,6 rem (66 × 27 px) et un galet étiré en capsule de 2,5 × 1,3 rem, le même jour tout autour, allumé comme éteint',
        Math.abs(on.w - 4 * R) <= 0.6 && Math.abs(on.h - 1.6 * R) <= 0.6 && on.gw > on.gh * 1.8 && Math.abs(on.gw - 2.5 * R) <= 0.6 && Math.abs(on.gh - 1.3 * R) <= 0.6
        && [...jour(on), ...jour(off)].every(v => Math.abs(v - 0.15 * R) <= 0.5),
        'rail ' + on.w.toFixed(1) + '×' + on.h.toFixed(1) + ', galet ' + on.gw.toFixed(1) + '×' + on.gh.toFixed(1) + ', jours allumé ' + jour(on).map(v => v.toFixed(1)).join('/') + ', éteint ' + jour(off).map(v => v.toFixed(1)).join('/'));
      dit('2. le rail est plat (aucune ombre, aucun trait) ; seul le galet a une ombre, neutre ; un blanc plein, sans reflet',
        [on, off].every(x => x.ombreRail === 'none' && /^0px/.test(x.bord) && x.outline === 'none' && x.ombreGalet !== 'none' && neutre(x.ombreGalet)
          && x.reflet === 'none' && x.blanc === 'rgb(255, 255, 255)'),
        'rail : ' + on.ombreRail + ' / ' + on.bord + ' · galet : ' + on.blanc + ' ' + on.reflet.slice(0, 40) + ' · ' + on.ombreGalet.slice(0, 100));
      /* 3 : basculer */
      await p.locator('#swMusic').tap();
      await p.waitForTimeout(500);
      const off2 = await p.evaluate(MESURE, 'swMusic');
      const garde = await p.evaluate(() => JSON.parse(localStorage.getItem('bt_settings') || '{}').music);
      dit('3. toucher bascule : allumé, dit allumé, gardé, le galet de l\'autre côté',
        off2.on && off2.aria === 'true' && garde === true && Math.abs(off2.droite - 0.15 * R) <= 0.5 && off2.fond !== off.fond, JSON.stringify({ on: off2.on, aria: off2.aria, garde, droite: +off2.droite.toFixed(1) }));
      await p.locator('#swMusic').tap();
      await p.waitForTimeout(500);
      /* 4 : tenu au doigt */
      const b = await p.evaluate(() => { const r = document.getElementById('swSfx').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.waitForTimeout(700);
      const tenu = await p.evaluate(MESURE, 'swSfx');
      await p.mouse.move(b.x, b.y - 200); await p.mouse.up(); await p.waitForTimeout(400);
      dit('4. tenu au doigt, le galet s\'étire vers où il va', tenu.gw > on.gw + 3 && Math.abs(tenu.droite - 0.15 * R) <= 0.6, 'galet ' + on.gw.toFixed(1) + ' → ' + tenu.gw.toFixed(1) + ' px, jour à droite ' + tenu.droite.toFixed(1));
      dit('5. on le touche sur 44 px de haut au moins', on.cible >= 44, on.cible.toFixed(1) + ' px');
      /* 6 : les autres interrupteurs */
      const autres = await p.evaluate(() => { const l = [], R = parseFloat(getComputedStyle(document.documentElement).fontSize); const r = (h) => { const d = document.createElement('div'); d.innerHTML = h; document.body.appendChild(d); const s = d.querySelector('.switch'); const b = s.getBoundingClientRect(), g = getComputedStyle(s, '::after'); l.push([+(b.width / R).toFixed(3), +(b.height / R).toFixed(3), +(parseFloat(g.width) / R).toFixed(3), +(parseFloat(g.height) / R).toFixed(3), getComputedStyle(s).boxShadow]); d.remove(); };
        r('<div class="set-row gb-ok"><span class="set-txt"><b>13 ans</b></span><button class="switch on" role="switch"></button></div>');
        r('<div class="rh-row"><button class="switch" role="switch"></button></div>');
        return l; });
      dit('6. les autres interrupteurs (entrée des groupes, rappels) ont la même forme', autres.every(a => Math.abs(a[0] - 4) <= 0.02 && Math.abs(a[1] - 1.6) <= 0.02 && Math.abs(a[2] - 2.5) <= 0.02 && Math.abs(a[3] - 1.3) <= 0.02 && a[4] === 'none'), JSON.stringify(autres));
      await ctx.close();
    }
    dit('7. iPhone et Android : au pixel près', vus.iPhone === vus.Android);
    /* 8 : des écrans plus étroits */
    const etroits = [];
    for (const L of [360, 320]) {
      const ctx = await nav.newContext({ viewport: { width: L, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(L + ' : ' + e.message));
      await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.route(/supabase\.co|googlesyndication/, r => r.abort());
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('bt_settings', JSON.stringify({ sfx: true, music: false })); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
      await p.evaluate(() => openSettings());
      await p.waitForTimeout(1100);
      const a = await p.evaluate(MESURE, 'swSfx'), o = await p.evaluate(MESURE, 'swMusic');
      etroits.push({ L, l: +(a.w / a.rem).toFixed(3), galet: +(a.gw / a.rem).toFixed(3), haut: +(a.gh / a.rem).toFixed(3), course: +(a.course / a.rem).toFixed(3),
        jours: [a.haut, a.bas, a.droite, o.haut, o.bas, o.gauche].map(v => +(v / a.rem).toFixed(3)) });
      await ctx.close();
    }
    dit('8. plus étroit, le rail raccourcit un peu (3,3 rem au moins), le galet reste une capsule, même course, même jour',
      etroits.every(e => e.l >= 3.29 && e.l < 4 && Math.abs(e.galet - (e.l - 1.5)) <= 0.02 && e.galet > e.haut + 0.3 && Math.abs(e.course - 1.2) <= 0.02 && e.jours.every(j => Math.abs(j - 0.15) <= 0.03)),
      JSON.stringify(etroits));
  } catch (e) { errs.push('le banc s\'est arrêté : ' + (e.stack || e.message)); }
  dit('   … aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko === 0 ? '\n  OK — des interrupteurs longs et plats, au galet étiré en capsule' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
