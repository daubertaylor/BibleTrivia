/* ====== BANC « LES JEUX, EN MIEUX » (v383) ======
   « Améliore les jeux Verset en morceaux et Qui ? Où ?, et les autres si tu
     penses qu'il y a besoin. »
   Sur un iPhone, en jouant :
     1. Qui ? Où ? : chaque lien posé est un fil tendu d'une pastille à
        l'autre, de la couleur du personnage ; dénoué, son fil s'en va ;
     2. un écran de Qui ? Où ? redessiné avec ses liens les a dès sa
        première image ;
     3. tirer un fil déjà posé le décroche le temps du geste ; lâché dans le
        vide, il se raccroche ;
     4. Verset en morceaux : quatre morceaux aux premières manches, plus en
        avançant (jamais moins qu'avant), entre quatre et six ;
     5. des morceaux qu'on prend sans viser : 44 px de haut au moins ;
     6. la réponse révélée cite le verset entier, avec sa référence (et en
        anglais, entre guillemets anglais) ;
     7. Trouve l'erreur : révélé, le mot changé est barré et le vrai mot
        écrit à côté ;
     8. aucune erreur.
   Usage : node banc-essai/jeux-plus.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 360) + ')' : '')); if (!bon) ko++; };

async function page(nav, langue) {
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  await ctx.addInitScript((lg) => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
    if (lg) localStorage.setItem('bt_langue', lg);
  }, langue || null);
  const p = await ctx.newPage();
  p.__erreurs = [];
  p.on('pageerror', e => p.__erreurs.push(e.message));
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  return { ctx, p };
}
/* Les fils posés, et pour chacun : sa couleur, et si ses deux bouts sont sur les bonnes pastilles. */
const fils = (p) => p.evaluate(() => {
  const z = document.getElementById('jxZone'), svg = z && z.querySelector('.jx-liens'); if (!svg) return null;
  const box = svg.getBoundingClientRect(), m = mancheCourante();
  return [...svg.querySelectorAll('path')].map(pa => {
    const d = pa.getAttribute('d').match(/-?[\d.]+/g).map(Number);
    const i = +pa.dataset.i, l = +pa.dataset.l;
    const c = (sel) => { const r = z.querySelector(sel + ' .jx-point').getBoundingClientRect(); return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }; };
    const a = c('.jx-qui[data-i="' + i + '"]'), b = c('.jx-ou[data-l="' + l + '"]');
    const pres = (x, y, q) => Math.hypot(x - q.x, y - q.y) < 2.5;
    return { i, l, lie: m.liens[i] === l, couleur: pa.getAttribute('class').split(' ')[0] === JX_LIENS[i], bouts: pres(d[0], d[1], a) && pres(d[4], d[5], b), cache: pa.classList.contains('jx-decroche') };
  });
});

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    /* ---- 1, 2, 3 : Qui ? Où ? ---- */
    { const { ctx, p } = await page(nav);
      await p.evaluate(() => lancerJeu('quiou')); await p.waitForTimeout(900);
      await p.evaluate(() => { const m = mancheCourante(); toucherQui(0); toucherOu(m.lieux[2]); toucherQui(1); toucherOu(m.lieux[0]); toucherQui(3); toucherOu(m.lieux[3]); });
      await p.waitForTimeout(500);
      const f1 = await fils(p);
      await p.evaluate(() => { clicQuiouMuet = 0; const m = mancheCourante(); toucherOu(m.lieux[0]); });   // dénouer le lien vers ce lieu
      await p.waitForTimeout(500);
      const f1b = await fils(p);
      dit('1. Qui ? Où ? : chaque lien est un fil d\'une pastille à l\'autre, de la couleur du personnage ; dénoué, il s\'en va',
        f1 && f1.length === 3 && f1.every(x => x.lie && x.couleur && x.bouts) && f1b.length === 2 && f1b.every(x => x.lie && x.bouts),
        JSON.stringify(f1) + ' → ' + JSON.stringify(f1b));
      /* 2 : redessiné sur place, les fils sont là à la première image. */
      const f2 = await p.evaluate(() => new Promise(res => { render(); requestAnimationFrame(() => { const svg = document.querySelector('#jxZone .jx-liens'); res(svg ? svg.querySelectorAll('path').length : -1); }); }));
      dit('2. redessiné avec ses liens, l\'écran les a dès sa première image', f2 === 2, 'fils à la première image : ' + f2);
      /* 3 : tirer un fil posé le décroche ; lâché dans le vide, il se raccroche. */
      const b0 = await p.evaluate(() => { const r = document.querySelector('#jxZone .jx-qui[data-i="0"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.mouse.move(b0.x, b0.y); await p.mouse.down(); await p.mouse.move(b0.x + 30, b0.y + 20, { steps: 4 }); await p.mouse.move(b0.x + 40, b0.y + 260, { steps: 6 });
      await p.waitForTimeout(120);
      const pendant = (await fils(p)).filter(x => x.i === 0).map(x => x.cache);
      await p.mouse.up(); await p.waitForTimeout(700);
      const apres = (await fils(p)).filter(x => x.i === 0).map(x => x.cache);
      dit('3. tirer un fil posé le décroche le temps du geste ; lâché dans le vide, il se raccroche', pendant.join() === 'true' && apres.join() === 'false', 'pendant ' + JSON.stringify(pendant) + ' · après ' + JSON.stringify(apres));
      erreurs.push(...p.__erreurs); await ctx.close(); }
    /* ---- 4, 5, 6 : Verset en morceaux ---- */
    { const { ctx, p } = await page(nav);
      const r = await p.evaluate(() => { const l = []; for (let k = 0; k < 12; k++) l.push(manchesMorceaux(6).map(m => m.parts.length)); return l; });
      const premiers = r.map(x => x[0]), suites = r.every(x => x.every((n, i) => !i || n >= x[i - 1]) && x.every(n => n >= 4 && n <= 6));
      const monte = r.filter(x => x[x.length - 1] > x[0]).length;
      dit('4. Verset en morceaux : quatre morceaux d\'abord, plus en avançant, jamais moins qu\'avant', premiers.every(n => n === 4) && suites && monte >= 10, JSON.stringify(r.slice(0, 4)) + ' · ' + monte + '/12 parties montent');
      await p.evaluate(() => lancerJeu('morceaux')); await p.waitForTimeout(900);
      const h = await p.evaluate(() => [...document.querySelectorAll('#jxZone .jx-bout')].map(b => Math.round(b.getBoundingClientRect().height)));
      dit('5. des morceaux qu\'on prend sans viser : 44 px de haut au moins', h.length >= 4 && h.every(x => x >= 44), JSON.stringify(h));
      const f6 = await p.evaluate(() => { const m = mancheCourante(); m.melange.forEach(k => toucherMorceau(k)); validerManche(); const t = (document.querySelector('.fact-card .ftext') || {}).textContent || ''; return { t, verset: m.parts.join(' '), ref: refLivre(m.r) }; });
      await p.waitForTimeout(400);
      dit('6. la réponse révélée cite le verset entier, avec sa référence', f6.t.includes(f6.verset) && f6.t.includes(f6.ref) && f6.t.includes('«'), f6.t.slice(0, 160));
      erreurs.push(...p.__erreurs); await ctx.close(); }
    { const { ctx, p } = await page(nav, 'en');
      await p.evaluate(() => lancerJeu('morceaux')); await p.waitForTimeout(900);
      const f = await p.evaluate(() => { const m = mancheCourante(); m.melange.forEach(k => toucherMorceau(k)); validerManche(); const t = (document.querySelector('.fact-card .ftext') || {}).textContent || ''; return { t, verset: m.parts.join(' ') }; });
      dit('   …et en anglais, entre guillemets anglais', f.t.includes('“' + f.verset + '”'), f.t.slice(0, 140));
      erreurs.push(...p.__erreurs); await ctx.close(); }
    /* ---- 7 : Trouve l'erreur ---- */
    { const { ctx, p } = await page(nav);
      await p.evaluate(() => lancerJeu('erreur')); await p.waitForTimeout(900);
      const r7 = await p.evaluate(() => { const m = mancheCourante(); toucherMot(m.faux === 0 ? 1 : 0); const e = document.querySelector('#jxZone .jx-mot.faux');
        return { barre: e && e.querySelector('s') ? e.querySelector('s').textContent : null, vrai: e && e.querySelector('b') ? e.querySelector('b').textContent : null, change: frSpace(String(m.mots[m.faux]).replace(/[,;:.!?»”"]+$/, '')), juste: frSpace(m.juste) }; });
      dit('7. Trouve l\'erreur : le mot changé est barré, le vrai mot écrit à côté', r7.barre === r7.change && r7.vrai === r7.juste && r7.barre !== r7.vrai, JSON.stringify(r7));
      erreurs.push(...p.__erreurs); await ctx.close(); }
  } catch (e) {
    dit('le banc a planté', false, e.stack || e.message);
  }
  dit('8. aucune erreur', erreurs.length === 0, erreurs.join(' | '));
  await nav.close();
  console.log(ko ? `\n${ko} échec(s)` : '\nTout est vert.');
  process.exit(ko ? 1 : 0);
})();
