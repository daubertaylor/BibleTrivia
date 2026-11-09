/* ====== RANGE LES LIVRES (v354) ======
   « Je veux dans le mode jeux que tu en remplaces un par un truc pour
     classer les livres dans l'ordre, avec un système où tu prends et tu les
     places au bon endroit. » (Il remplace « Dans l'ordre ».)
   Sur un iPhone, avec de vrais touchers (Input.dispatchTouchEvent) :
     1. L'ONGLET JEUX : « Range les livres » en tête de la grille, à la place
        de « Dans l'ordre » ; pour un joueur arrivé avant lui, il dit
        « Nouveau », lui seul ;
     2. PRENDRE le premier livre et le lâcher tout en bas : pendant le geste,
        il suit le doigt au pixel près et se soulève ; les autres sont
        remontés d'une place ; la page ne défile pas, rien ne se sélectionne.
        Lâché, il est le dernier — dans le jeu comme à l'écran — et rien ne
        reste (ni décalage, ni classe de geste) ;
     3. le dernier, PRIS ET MONTÉ tout en haut, devient le premier ; un livre
        descendu de deux places s'y pose ;
     4. un toucher (moins de sept pixels) n'est pas un glissement : il
        CHOISIT le livre ; un second livre touché S'ÉCHANGE avec lui ;
        toucher deux fois le même le repose ;
     5. un geste INTERROMPU (le système reprend le doigt) rend le livre à sa
        place : l'ordre n'a pas changé ;
     6. À LA SOURIS aussi, et le clic qui suit le glissement ne choisit rien ;
     7. « Valider » faux : « Le savais-tu ? », les livres glissent jusqu'à
        l'ordre juste, chacun avec son numéro dans la Bible (vert à sa place,
        rouge sinon) ; « Valider » juste : « Bien joué ! » et +10 ;
     8. LA MANCHE TIENT DANS L'ÉCRAN, de l'iPhone SE au plus grand : cinq
        livres, la consigne et « Valider », sans défiler ;
     9. en anglais et en espagnol : le nom, la consigne, l'indication, les
        livres et ce qu'on apprend ;
    10. aucune erreur.
   Usage : node banc-essai/livres.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

async function ouvrir(nav, langue, vue, avant) {
  const ctx = await nav.newContext({ viewport: vue || { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(({ langue, avant }) => {
    if (!/^http/.test(location.protocol)) return;
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    if (langue) localStorage.setItem('bt_langue', langue);
    /* Un joueur arrivé avant la v354 : il connaissait « Dans l'ordre ». */
    if (avant && !localStorage.getItem('bt_jeux_connus')) localStorage.setItem('bt_jeux_connus', JSON.stringify(['ordre', 'quiou', 'combien', 'erreur', 'morceaux']));
  }, { langue, avant: !!avant });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  /* Ce que dit « Le savais-tu ? », sans son étiquette. */
  await p.evaluate(() => { window.FAIT = () => { const f = document.querySelector('.fact-card .ftext'), l = f.querySelector('.fact-label'); return f.textContent.slice(l ? l.textContent.length : 0); }; });
  await p.waitForTimeout(600);
  p._cdp = await ctx.newCDPSession(p);
  return { ctx, p };
}
/* Une manche, toujours la même (le hasard est fixé) ; « m » choisit la manche. */
const LANCER = async (p, m) => {
  await p.evaluate((m) => { let g = 4242; const r = Math.random; Math.random = () => ((g = (g * 16807) % 2147483647) / 2147483647);
    try { jeu = null; lancerJeu('livres'); } finally { Math.random = r; }
    if (m) { jeu.i = m; jeu.vu = -1; render(); } }, m || 0);
  await p.waitForFunction(() => document.querySelectorAll('#app > .screen').length === 1 && document.getElementById('jxLivres'), null, { timeout: 6000 });
  await p.waitForTimeout(700);
};
const ordre = (p) => p.evaluate(() => ({ jeu: mancheCourante().livres.slice(), dom: [...document.querySelectorAll('#jxLivres .jx-livre')].map(e => +e.dataset.b) }));
const reste = (p) => p.evaluate(() => ({ decales: [...document.querySelectorAll('#jxLivres .jx-livre')].filter(e => e.style.transform).length,
  classes: document.querySelectorAll('#jxLivres .jx-porte, #jxLivres .jx-atterrit, #jxLivres.jx-en-main').length, choisi: mancheCourante().choisi,
  pris: document.querySelectorAll('#jxLivres .jx-pris').length, defile: document.getElementById('app').scrollTop, choix: String(getSelection()) }));
const places = (p) => p.evaluate(() => [...document.querySelectorAll('#jxLivres .jx-livre')].map(e => { const r = e.getBoundingClientRect(); return { b: +e.dataset.b, x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, h: r.height }; }));
const doigt = (p) => (type, x, y) => p._cdp.send('Input.dispatchTouchEvent', { type, touchPoints: (type === 'touchEnd' || type === 'touchCancel') ? [] : [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
/* Un geste du doigt : posé, glissé en quatorze pas, puis (avant de lâcher)
   ce que la page montre, puis lâché — ou rompu. */
async function geste(p, de, a, avantDeLacher, fin) {
  const t = doigt(p);
  await t('touchStart', de.x, de.y); await p.waitForTimeout(50);
  for (let i = 1; i <= 14; i++) { await t('touchMove', de.x + (a.x - de.x) * i / 14, de.y + (a.y - de.y) * i / 14); await p.waitForTimeout(16); }
  await p.waitForTimeout(320);
  const vu = avantDeLacher ? await avantDeLacher() : null;
  await t(fin || 'touchEnd');
  await p.waitForTimeout(500);
  return vu;
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    /* 1 */
    {
      const { ctx, p } = await ouvrir(nav, null, null, true);
      await p.locator('#barreBas .bb-onglet[data-o="jeux"]').click();
      await p.waitForFunction(() => state.screen === 'jeux' && document.querySelectorAll('#app > .screen').length === 1, null, { timeout: 6000 });
      await p.waitForTimeout(500);
      const h = await p.evaluate(() => ({ noms: [...document.querySelectorAll('.jx-grille .jx-tuile .jx-nom')].map(x => x.textContent),
        desc: document.querySelector('.jx-grille .jx-tuile .jx-desc').textContent, ico: !!document.querySelector('.jx-grille .jx-tuile .jx-ico.jade svg rect'),
        neufs: [...document.querySelectorAll('.jx-grille .jx-tuile')].map((t, i) => t.querySelector('.jx-neuf') ? JEUX[i].id : null).filter(Boolean),
        ordre: !!JEUX.find(j => j.id === 'ordre') }));
      dit('1. « Range les livres » en tête de la grille, à la place de « Dans l\'ordre » ; « Nouveau » pour qui est arrivé avant lui, et lui seul',
        h.noms[0] === 'Range les livres' && !h.noms.includes('Dans l\'ordre') && h.noms.length === 5 && h.desc === 'Remets les livres de la Bible dans l\'ordre' && h.ico && h.neufs.join() === 'livres' && !h.ordre,
        JSON.stringify(h));
      p._errs.forEach(e => errs.push(e)); await ctx.close();
    }

    const { ctx, p } = await ouvrir(nav, null);
    /* La cinquième manche : cinq livres voisins, les plus serrés. */
    await LANCER(p, 4);
    const o0 = await ordre(p), n = o0.jeu.length;
    const consigne = await p.evaluate(() => ({ q: document.querySelector('.jx-consigne .qtext').textContent, h: document.querySelector('.jx-consigne .jx-cref').textContent,
      valider: !document.getElementById('jxValider').disabled, poignees: document.querySelectorAll('#jxLivres .jx-livre .jx-poignee svg').length,
      noms: [...document.querySelectorAll('#jxLivres .jx-livre .opt-text')].map(e => e.textContent) }));

    /* 2. Le premier, tout en bas */
    const P2 = await places(p);
    const de2 = { x: P2[0].x, y: P2[0].y }, a2 = { x: P2[0].x + 6, y: P2[n - 1].y };
    const pendant2 = await geste(p, de2, a2, () => p.evaluate(({ b, y0, cy0 }) => {
      const els = [...document.querySelectorAll('#jxLivres .jx-livre')], e = els.find(x => +x.dataset.b === b), r = e.getBoundingClientRect();
      return { suit: (r.top + r.height / 2) - cy0, doigt: y0, porte: e.classList.contains('jx-porte'), ech: getComputedStyle(e).scale,
        autres: els.filter(x => x !== e).map(x => x.getBoundingClientRect().top), defile: document.getElementById('app').scrollTop, choix: String(getSelection()) };
    }, { b: P2[0].b, y0: a2.y - de2.y, cy0: P2[0].y }));
    const o2 = await ordre(p), r2 = await reste(p);
    const remontes = pendant2 && pendant2.autres.every((t, k) => Math.abs(t - P2[k].top) < 1.5);
    dit('2. pris et lâché tout en bas : pendant le geste il suit le doigt, soulevé, les autres remontent d\'une place, rien ne défile ni ne se sélectionne ; lâché, il est le dernier, et rien ne reste',
      consigne.q === 'Glisse les livres dans l\'ordre de la Bible' && consigne.h === 'Le premier en haut' && consigne.valider && consigne.poignees === n
      && pendant2 && Math.abs(pendant2.suit - pendant2.doigt) < 1.5 && pendant2.porte && pendant2.ech === '1.035' && remontes && pendant2.defile === 0 && !pendant2.choix
      && o2.jeu.join() === o0.jeu.slice(1).concat(o0.jeu[0]).join() && o2.dom.join() === o2.jeu.join() && !r2.decales && !r2.classes && !r2.defile,
      JSON.stringify({ consigne, pendant2, avant: o0.jeu, apres: o2, reste: r2 }));

    /* 3. Le dernier, tout en haut ; puis le premier descendu de deux places */
    const P3 = await places(p);
    await geste(p, { x: P3[n - 1].x, y: P3[n - 1].y }, { x: P3[n - 1].x - 4, y: P3[0].y - 4 });
    const o3 = await ordre(p);
    const P3b = await places(p);
    await geste(p, { x: P3b[0].x, y: P3b[0].y }, { x: P3b[0].x, y: P3b[2].y + 2 });
    const o3b = await ordre(p), r3 = await reste(p);
    const att3 = [o2.jeu[n - 1]].concat(o2.jeu.slice(0, n - 1));
    const att3b = att3.slice(1, 3).concat([att3[0]], att3.slice(3));
    dit('3. le dernier, monté tout en haut, devient le premier ; le premier, descendu de deux places, s\'y pose',
      o3.jeu.join() === att3.join() && o3.dom.join() === o3.jeu.join() && o3b.jeu.join() === att3b.join() && o3b.dom.join() === o3b.jeu.join() && !r3.decales && !r3.classes,
      JSON.stringify({ o3, attendu: att3, o3b, attendu2: att3b, reste: r3 }));

    /* 4. Toucher : choisir, échanger, reposer */
    const P4 = await places(p);
    const t = doigt(p);
    const tape = async (pt, dx) => { await t('touchStart', pt.x, pt.y); await p.waitForTimeout(40); if (dx) { await t('touchMove', pt.x + dx, pt.y); await p.waitForTimeout(30); } await t('touchEnd'); await p.waitForTimeout(450); };
    await tape(P4[1], 4);   /* quatre pixels : un toucher, pas un glissement */
    const choisi = await reste(p);
    await tape(P4[3]);
    const o4 = await ordre(p), r4 = await reste(p);
    await tape(P4[0]); await tape(P4[0]);
    const r4b = await reste(p), o4b = await ordre(p);
    const att4 = o3b.jeu.slice(); [att4[1], att4[3]] = [att4[3], att4[1]];
    dit('4. un toucher (moins de sept pixels) choisit le livre ; un second livre touché s\'échange avec lui ; deux fois le même le repose',
      choisi.choisi === o3b.jeu[1] && choisi.pris === 1 && o4.jeu.join() === att4.join() && o4.dom.join() === o4.jeu.join() && r4.choisi === null && r4.pris === 0 && !r4.decales
      && r4b.choisi === null && r4b.pris === 0 && o4b.jeu.join() === att4.join(),
      JSON.stringify({ choisi, o4, attendu: att4, r4, r4b }));

    /* 5. Un geste rompu */
    const P5 = await places(p);
    const pendant5 = await geste(p, { x: P5[0].x, y: P5[0].y }, { x: P5[0].x, y: P5[n - 1].y }, () => p.evaluate(() => !!(glisseLivre && glisseLivre.actif)), 'touchCancel');
    const o5 = await ordre(p), r5 = await reste(p);
    dit('5. un geste interrompu rend le livre à sa place : l\'ordre n\'a pas changé, et rien ne reste',
      pendant5 === true && o5.jeu.join() === o4b.jeu.join() && o5.dom.join() === o5.jeu.join() && !r5.decales && !r5.classes, JSON.stringify({ pendant5, o5, r5 }));

    /* 6. À la souris */
    const P6 = await places(p);
    await p.mouse.move(P6[0].x, P6[0].y); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { await p.mouse.move(P6[0].x, P6[0].y + (P6[1].y + 6 - P6[0].y) * i / 12); await p.waitForTimeout(16); }
    await p.waitForTimeout(250);
    await p.mouse.up(); await p.waitForTimeout(550);
    const o6 = await ordre(p), r6 = await reste(p);
    const att6 = o5.jeu.slice(); [att6[0], att6[1]] = [att6[1], att6[0]];
    dit('6. à la souris aussi (le premier descend d\'une place), et le clic qui suit le glissement ne choisit rien',
      o6.jeu.join() === att6.join() && o6.dom.join() === o6.jeu.join() && r6.choisi === null && r6.pris === 0 && !r6.decales, JSON.stringify({ o6, attendu: att6, r6 }));

    /* 7. Valider faux, puis une manche juste */
    const faux = await p.evaluate(() => mancheJuste(mancheCourante()));
    if (faux) { const P = await places(p); await tape(P[0]); await tape(P[1]); }
    const avant7 = await places(p);
    await p.locator('#jxValider').tap();
    await p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
    /* Juste après « Valider », chaque livre part de là où on l'a laissé ;
       un peu plus tard, il est à sa vraie place. */
    const tot = await p.evaluate(() => [...document.querySelectorAll('#jxZone .jx-livre')].map(e => e.getBoundingClientRect().top));
    await p.waitForTimeout(900);
    const tard = await p.evaluate(() => [...document.querySelectorAll('#jxZone .jx-livre')].map(e => e.getBoundingClientRect().top));
    const glisse = tot.filter((t, k) => Math.abs(t - tard[k]) > 2).length;
    const r7 = await p.evaluate(() => ({ label: document.querySelector('.fact-card .fact-label').textContent.replace(/ /g, ' '), fait: FAIT(),
      nums: [...document.querySelectorAll('#jxZone .jx-livre .letter')].map(e => +e.textContent), bs: [...document.querySelectorAll('#jxZone .jx-livre')].map(e => +e.dataset.b),
      bien: document.querySelectorAll('#jxZone .jx-livre.correct').length, mal: document.querySelectorAll('#jxZone .jx-livre.incorrect').length,
      restent: [...document.querySelectorAll('#jxZone .jx-livre')].filter(e => e.style.transform || e.style.translate).length, juste: jeu.juste, points: jeu.points }));
    const trie = r7.bs.slice().sort((a, b) => a - b);
    await p.locator('.btn-next').tap(); await p.waitForFunction(() => jeu && jeu.i === 5 && !jeu.revele, null, { timeout: 5000 }); await p.waitForTimeout(600);
    const m8 = await p.evaluate(() => mancheCourante().livres.slice());
    const cible = m8.slice().sort((a, b) => a - b);
    for (let r = 0; r < cible.length; r++) {
      const cur = (await ordre(p)).jeu;
      if (cur[r] === cible[r]) continue;
      const P = await places(p);
      await tape(P[r]); await tape(P[cur.indexOf(cible[r])]);
    }
    await p.locator('#jxValider').tap();
    await p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
    await p.waitForTimeout(700);
    const j7 = await p.evaluate(() => ({ label: document.querySelector('.fact-card .fact-label').textContent.replace(/ /g, ' '), juste: jeu.juste, points: jeu.points,
      bien: document.querySelectorAll('#jxZone .jx-livre.correct').length }));
    dit('7. « Valider » faux : « Le savais-tu ? », les livres glissent jusqu\'à l\'ordre juste, numérotés (vert à sa place, rouge sinon) ; juste : « Bien joué ! », +10',
      r7.label === 'Le savais-tu ?' && !r7.juste && r7.points === 0 && JSON.stringify(r7.bs) === JSON.stringify(trie) && r7.nums.join() === trie.map(b => b + 1).join()
      && r7.mal > 0 && r7.bien + r7.mal === n && glisse > 0 && !r7.restent && r7.fait === 'Le numéro est la place du livre dans la Bible, sur 66.'
      && j7.label === 'Bien joué !' && j7.juste && j7.points === 10 && j7.bien === m8.length,
      JSON.stringify({ r7, glisse, j7 }));
    p._errs.forEach(e => errs.push(e));
    await ctx.close();

    /* 8. La manche tient dans l'écran */
    const tient = [];
    for (const vue of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 375, height: 667 }, { width: 393, height: 852 }, { width: 430, height: 932 }]) {
      const o = await ouvrir(nav, null, vue);
      await LANCER(o.p, 4);
      const r = await o.p.evaluate(() => { const a = document.getElementById('app'), v = document.getElementById('jxValider').getBoundingClientRect(), bb = document.getElementById('barreBas');
        const sb = document.querySelector('.jeu-ecran .solo-score-bar').getBoundingClientRect();
        return { deborde: a.scrollHeight - a.clientHeight, valider: Math.round(v.bottom), score: Math.round(sb.bottom), h: innerHeight }; });
      tient.push(vue.width + 'x' + vue.height + ' ' + JSON.stringify(r));
      if (r.deborde > 1 || r.score > r.h) tient.push('  ↑ déborde');
      o.p._errs.forEach(e => errs.push(e)); await o.ctx.close();
    }
    dit('8. la manche (cinq livres, la consigne, « Valider ») tient dans l\'écran, du plus petit iPhone au plus grand', !tient.some(x => /déborde/.test(x)), tient.join(' | '));

    /* 9. En anglais et en espagnol */
    for (const [lg, A] of [['en', { nom: 'Sort the books', q: 'Drag the books into Bible order', h: 'First at the top', fait: 'The number is the book\'s place in the Bible, out of 66.', v: 'Check' }],
                          ['es', { nom: 'Ordena los libros', q: 'Arrastra los libros al orden de la Biblia', h: 'El primero arriba', fait: 'El número es el lugar del libro en la Biblia, de 66.', v: 'Comprobar' }]]) {
      const o = await ouvrir(nav, lg);
      await LANCER(o.p, 0);
      const r = await o.p.evaluate(() => ({ titre: document.querySelector('.jeu-ecran .header-title').textContent, q: document.querySelector('.jx-consigne .qtext').textContent,
        h: document.querySelector('.jx-consigne .jx-cref').textContent, v: document.getElementById('jxValider').textContent.trim(),
        noms: [...document.querySelectorAll('#jxLivres .opt-text')].map(e => e.textContent), attendus: mancheCourante().livres.map(b => nomLivre(BIBLE_BOOKS[b])),
        table: mancheCourante().livres.map(b => (LIVRES_TRAD[LANGUE] || {})[BIBLE_BOOKS[b]]) }));
      await o.p.locator('#jxValider').tap();
      await o.p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
      const fait = await o.p.evaluate(() => FAIT());
      dit('9. ' + lg + ' : le nom, la consigne, l\'indication, « Valider », les livres dans la langue et ce qu\'on apprend',
        r.titre === A.nom && r.q === A.q && r.h === A.h && r.v === A.v && JSON.stringify(r.noms) === JSON.stringify(r.table) && r.table.every(Boolean) && fait === A.fait,
        JSON.stringify({ ...r, fait }));
      o.p._errs.forEach(e => errs.push(e)); await o.ctx.close();
    }
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('10. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — les livres se prennent au doigt et se posent à leur place');
  process.exit(ko ? 1 : 0);
})();
