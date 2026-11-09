/* ====== VERSET EN MORCEAUX, À LA MAIN (v351) ======
   « La possibilité de prendre le verset dans les mains, si on le souhaite, de
     le placer soi-même, et aussi de confirmer son choix plutôt que ça
     confirme tout seul à la fin. »
   Sur un iPhone, avec de vrais touchers (Input.dispatchTouchEvent) :
     1. TOUCHER reste : chaque morceau touché va au bout de la ligne — et la
        ligne complète NE SE VALIDE PAS toute seule ; « Valider » reste
        éteint tant qu'il manque un morceau, s'allume quand tout est posé ;
     2. PRENDRE un morceau de la réserve et le lâcher ENTRE deux morceaux de
        la ligne l'y insère ; pendant le geste, un trait dit où il se posera,
        et on voit de haut en bas la copie, le trait, le doigt — rien ne
        cache le trait ;
     3. un morceau DÉJÀ POSÉ se déplace de la même façon (ici, en tête) ;
     4. lâché HORS DE LA LIGNE, un morceau posé rentre dans la réserve ;
     5. le geste ne fait ni défiler la page ni sélectionner de texte, ne
        laisse aucune copie derrière lui, et n'est pas suivi d'un « toucher »
        en trop ;
     6. à la souris aussi ;
     7. « Valider » juste : « Bien joué ! » ; « Valider » faux : « Le
        savais-tu ? », et la ligne montre ce qui était à sa place ;
     8. en anglais et en espagnol : la consigne et « Valider » ;
     9. aucune erreur ;
    10. QUI ? OÙ ? ne se valide plus au dernier toucher non plus : « Valider »
        s'allume quand tout est fait, et le dernier geste se reprend avant de
        valider ; RANGE LES LIVRES (v354, à la place de « Dans l'ordre ») a
        toujours tous ses livres en place : « Valider » est allumé dès le
        départ, et une liste rangée ne se valide pas toute seule.
   Usage : node banc-essai/morceaux-main.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

async function ouvrir(nav, langue) {
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript((langue) => {
    if (!/^http/.test(location.protocol)) return;
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    if (langue) localStorage.setItem('bt_langue', langue);
  }, langue);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(600);
  p._cdp = await ctx.newCDPSession(p);
  return { ctx, p };
}
/* Une manche de morceaux, toujours la même (le hasard est fixé). */
const LANCER = async (p) => {
  await p.evaluate(() => { let g = 4242; const r = Math.random; Math.random = () => ((g = (g * 16807) % 2147483647) / 2147483647);
    try { lancerJeu('morceaux'); } finally { Math.random = r; } });
  await p.waitForFunction(() => document.querySelectorAll('#app > .screen').length === 1 && document.getElementById('jxValider'), null, { timeout: 6000 });
  await p.waitForTimeout(700);
};
const etat = (p) => p.evaluate(() => { const m = mancheCourante(); return { pose: m.pose.slice(), n: m.parts.length, revele: jeu.revele,
  valider: (document.getElementById('jxValider') || {}).disabled, copies: document.querySelectorAll('.jx-flotte').length,
  curseur: !!document.querySelector('#jxLigne .jx-curseur'), choix: String(getSelection()), defile: document.getElementById('app').scrollTop }; });
const centre = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getClientRects()[0] || e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, t: r.top, h: r.height, w: r.width }; }, sel);
/* Un geste du doigt : posé, glissé en douze pas, puis (avant de lâcher) ce
   que la page montre, puis lâché. */
async function doigt(p, de, a, avantDeLacher) {
  const t = (type, x, y) => p._cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  await t('touchStart', de.x, de.y);
  await p.waitForTimeout(40);
  for (let i = 1; i <= 12; i++) { await t('touchMove', de.x + (a.x - de.x) * i / 12, de.y + (a.y - de.y) * i / 12); await p.waitForTimeout(16); }
  await p.waitForTimeout(60);
  const vu = avantDeLacher ? await avantDeLacher() : null;
  await t('touchEnd');
  await p.waitForTimeout(520);
  return vu;
}
/* Où mettre le doigt pour viser l'écart juste avant le morceau k de la
   ligne : l'endroit visé est 34 px au-dessus du bout du doigt. */
async function viserAvant(p, k) {
  const b = await centre(p, `#jxLigne .jx-pose[data-k="${k}"]`);
  return { x: b.l + 1, y: b.t + b.h / 2 + 34 };
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const { ctx, p } = await ouvrir(nav, null);
    await LANCER(p);
    const m0 = await p.evaluate(() => ({ melange: mancheCourante().melange.slice(), parts: mancheCourante().parts.slice() }));
    const n = m0.parts.length;

    /* 1. Toucher : tout dans l'ordre, sans validation toute seule */
    const eteint = [];
    for (let k = 0; k < n; k++) {
      eteint.push((await etat(p)).valider);
      await p.locator(`#jxZone .jx-bout[data-k="${k}"]`).tap();
      await p.waitForTimeout(120);
    }
    await p.waitForTimeout(700);
    const e1 = await etat(p);
    dit('1. toucher pose chaque morceau au bout de la ligne ; la ligne complète ne se valide pas toute seule ; « Valider » éteint jusqu\'au dernier morceau, allumé ensuite',
      e1.pose.join() === [...Array(n).keys()].join() && !e1.revele && eteint.every(x => x === true) && e1.valider === false, JSON.stringify({ ...e1, eteint }));

    /* On repart de deux morceaux posés : 0 et 2 (toucher 1, 3… les rend). */
    for (let k = n - 1; k >= 0; k--) if (k !== 0 && k !== 2) await p.locator(`#jxLigne .jx-pose[data-k="${k}"]`).tap().then(() => p.waitForTimeout(100));
    const e1b = await etat(p);

    /* 2. Prendre le morceau 1 dans la réserve, le lâcher entre 0 et 2 */
    const de2 = await centre(p, '#jxZone .jx-bout[data-k="1"]');
    let vise = null;
    const tc = (type, x, y) => p._cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
    await tc('touchStart', de2.x, de2.y); await p.waitForTimeout(40);
    for (let i = 1; i <= 4; i++) { await tc('touchMove', de2.x, de2.y - 6 * i); await p.waitForTimeout(16); }
    vise = await viserAvant(p, 2);
    for (let i = 1; i <= 12; i++) { await tc('touchMove', de2.x + (vise.x - de2.x) * i / 12, (de2.y - 24) + (vise.y - (de2.y - 24)) * i / 12); await p.waitForTimeout(16); }
    await p.waitForTimeout(60);
    const pendant = await p.evaluate((vy) => { const c = document.querySelector('.jx-flotte'), t = document.querySelector('#jxLigne .jx-curseur');
      const rc = c ? c.getBoundingClientRect() : null, rt = t && !t.hidden ? t.getBoundingClientRect() : null;
      /* De haut en bas : la copie, le trait, le doigt — rien ne cache le trait. */
      const ordre = !!(rc && rt && rc.bottom <= rt.top + 0.5 && rt.bottom <= vy);
      return { copie: !!c, auDessus: ordre, trait: !!t && !t.hidden, idx: glisseMorceau && glisseMorceau.idx, dans: glisseMorceau && glisseMorceau.dans,
        defile: document.getElementById('app').scrollTop, choix: String(getSelection()) }; }, vise.y);
    await tc('touchEnd'); await p.waitForTimeout(560);
    const e2 = await etat(p);
    dit('2. pris dans la réserve et lâché entre deux morceaux, il s\'y insère ; un trait dit où il se posera, et l\'on voit de haut en bas la copie, le trait, le doigt',
      e1b.pose.join() === '0,2' && e2.pose.join() === '0,1,2' && pendant.copie && pendant.auDessus && pendant.trait && pendant.dans === true && pendant.idx === 1,
      JSON.stringify({ avant: e1b.pose, pendant, apres: e2.pose }));

    /* 3. Le morceau 2, déjà posé, déplacé en tête */
    const de3 = await centre(p, '#jxLigne .jx-pose[data-k="2"]');
    await tc('touchStart', de3.x, de3.y); await p.waitForTimeout(40);
    for (let i = 1; i <= 4; i++) { await tc('touchMove', de3.x, de3.y - 6 * i); await p.waitForTimeout(16); }
    const vise3 = await viserAvant(p, 0);
    for (let i = 1; i <= 12; i++) { await tc('touchMove', de3.x + (vise3.x - de3.x) * i / 12, (de3.y - 24) + (vise3.y - (de3.y - 24)) * i / 12); await p.waitForTimeout(16); }
    await p.waitForTimeout(60);
    await tc('touchEnd'); await p.waitForTimeout(560);
    const e3 = await etat(p);
    dit('3. un morceau déjà posé se déplace de la même façon (le 2 passe en tête)', e3.pose.join() === '2,0,1', JSON.stringify(e3.pose));

    /* 4. Le morceau 0, posé, lâché sur la réserve */
    const de4 = await centre(p, '#jxLigne .jx-pose[data-k="0"]');
    const res = await centre(p, '#jxZone .jx-bouts');
    await doigt(p, de4, { x: res.x, y: res.y + 40 });
    const e4 = await etat(p);
    const libre = await p.evaluate(() => !document.querySelector('#jxZone .jx-bout[data-k="0"]').classList.contains('jx-utilise'));
    dit('4. lâché hors de la ligne, un morceau posé rentre dans la réserve', e4.pose.join() === '2,1' && libre, JSON.stringify({ pose: e4.pose, libre }));

    /* 5 */
    const e5 = await etat(p);
    dit('5. le geste ne fait pas défiler la page, ne sélectionne rien, ne laisse aucune copie, et aucun toucher en trop ne le suit',
      pendant.defile === 0 && e5.defile === 0 && !pendant.choix && !e5.choix && e5.copies === 0 && !e5.curseur && e5.pose.join() === '2,1', JSON.stringify(e5));

    /* 6. À la souris : le morceau 0 de la réserve, au bout de la ligne */
    const de6 = await centre(p, '#jxZone .jx-bout[data-k="0"]');
    const fin6 = await p.evaluate(() => { const l = document.getElementById('jxLigne').getBoundingClientRect(); return { x: l.right - 12, y: l.bottom - 14 }; });
    await p.mouse.move(de6.x, de6.y); await p.mouse.down();
    for (let i = 1; i <= 10; i++) { await p.mouse.move(de6.x + (fin6.x - de6.x) * i / 10, de6.y + (fin6.y - de6.y) * i / 10); await p.waitForTimeout(16); }
    await p.mouse.up(); await p.waitForTimeout(560);
    const e6 = await etat(p);
    dit('6. à la souris aussi (le 0 lâché au bout de la ligne)', e6.pose.join() === '2,1,0' && e6.copies === 0, JSON.stringify(e6.pose));

    /* 7. Valider faux, puis une manche juste */
    for (let k = 3; k < n; k++) await p.locator(`#jxZone .jx-bout[data-k="${k}"]`).tap().then(() => p.waitForTimeout(100));
    const avantFaux = await etat(p);
    await p.locator('#jxValider').tap();
    await p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
    const faux = await p.evaluate(() => ({ label: document.querySelector('.fact-card .fact-label').textContent.replace(/\u00a0/g, ' '), bien: document.querySelectorAll('.jx-final .jx-pose.bien').length,
      mal: document.querySelectorAll('.jx-final .jx-pose.mal').length, juste: jeu.juste, points: jeu.points }));
    await p.locator('.btn-next').tap(); await p.waitForFunction(() => jeu && jeu.i === 1 && !jeu.revele, null, { timeout: 5000 }); await p.waitForTimeout(500);
    const n2 = await p.evaluate(() => mancheCourante().parts.length);
    for (let k = 0; k < n2; k++) await p.locator(`#jxZone .jx-bout[data-k="${k}"]`).tap().then(() => p.waitForTimeout(100));
    await p.locator('#jxValider').tap();
    await p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
    const juste = await p.evaluate(() => ({ label: document.querySelector('.fact-card .fact-label').textContent.replace(/\u00a0/g, ' '), juste: jeu.juste, points: jeu.points }));
    dit('7. « Valider » faux : « Le savais-tu ? », la ligne montre ce qui était à sa place ; juste : « Bien joué ! », +10',
      avantFaux.valider === false && faux.label === 'Le savais-tu ?' && !faux.juste && faux.mal > 0 && faux.bien + faux.mal === n && juste.label === 'Bien joué !' && juste.juste && juste.points === 10,
      JSON.stringify({ avantFaux, faux, juste }));
    /* 10. Range les livres, Qui ? Où ? */
    const r10 = {};
    for (const id of ['livres', 'quiou']) {
      await p.evaluate((id) => { jeu = null; lancerJeu(id); }, id);
      await p.waitForFunction(() => document.querySelectorAll('#app > .screen').length === 1 && document.getElementById('jxValider'), null, { timeout: 6000 });
      await p.waitForTimeout(600);
      const m = await p.evaluate(() => JSON.parse(JSON.stringify(mancheCourante())));
      const eteints = [];
      if (id === 'livres') {
        const allume = await p.evaluate(() => !document.getElementById('jxValider').disabled);
        const cible = m.livres.slice().sort((a, b) => a - b);
        for (let r = 0; r < cible.length; r++) {
          const cur = await p.evaluate(() => mancheCourante().livres.slice());
          if (cur[r] === cible[r]) continue;
          await p.locator(`#jxZone .jx-livre[data-b="${cur[r]}"]`).tap(); await p.waitForTimeout(120);
          await p.locator(`#jxZone .jx-livre[data-b="${cible[r]}"]`).tap(); await p.waitForTimeout(420);
        }
        await p.waitForTimeout(600);
        const plein = await p.evaluate(() => ({ revele: jeu.revele, eteint: document.getElementById('jxValider').disabled, range: mancheCourante().livres.join() }));
        await p.locator('#jxValider').tap();
        await p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
        r10[id] = { allume, plein, cible: cible.join(), juste: await p.evaluate(() => jeu.juste) };
      } else {
        const n = m.paires.length;
        for (let i = 0; i < n; i++) {
          eteints.push(await p.evaluate(() => document.getElementById('jxValider').disabled));
          await p.locator(`#jxZone .jx-qui[data-i="${i}"]`).tap(); await p.waitForTimeout(80);
          await p.locator(`#jxZone .jx-ou[data-l="${i}"]`).tap(); await p.waitForTimeout(120);
        }
        await p.waitForTimeout(600);
        const plein = await p.evaluate(() => ({ revele: jeu.revele, eteint: document.getElementById('jxValider').disabled }));
        await p.locator('#jxValider').tap();
        await p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
        r10[id] = { eteints, plein, juste: await p.evaluate(() => jeu.juste) };
      }
    }
    dit('10. Qui ? Où ? ne se valide plus au dernier toucher (« Valider » s\'allume quand tout est fait) ; Range les livres : « Valider » allumé dès le départ, et rangé, rien ne se valide tout seul',
      r10.livres && r10.livres.allume && !r10.livres.plein.revele && r10.livres.plein.eteint === false && r10.livres.plein.range === r10.livres.cible && r10.livres.juste === true
      && r10.quiou && r10.quiou.eteints.every(x => x === true) && !r10.quiou.plein.revele && r10.quiou.plein.eteint === false && r10.quiou.juste === true, JSON.stringify(r10));
    p._errs.forEach(e => errs.push(e));
    await ctx.close();

    /* 8. En anglais et en espagnol */
    for (const [lg, consigne, bouton] of [['en', 'Tap or drag the pieces in the order of the verse', 'Check'], ['es', 'Toca o arrastra los pedazos en el orden del versículo', 'Comprobar']]) {
      const o = await ouvrir(nav, lg);
      await LANCER(o.p);
      const r = await o.p.evaluate(() => ({ consigne: document.querySelector('.jx-consigne .qtext').textContent, bouton: document.getElementById('jxValider').textContent.trim(),
        vide: (document.querySelector('#jxLigne .jx-vide') || {}).textContent }));
      dit('8. ' + lg + ' : la consigne et « Valider » sont traduits', r.consigne === consigne && r.bouton === bouton && r.vide === (lg === 'en' ? 'Tap or drag the pieces here' : 'Toca o arrastra los pedazos aquí'), JSON.stringify(r));
      o.p._errs.forEach(e => errs.push(e));
      await o.ctx.close();
    }
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('9. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le verset se rebâtit à la main, et se valide quand on le décide');
  process.exit(ko ? 1 : 0);
})();
