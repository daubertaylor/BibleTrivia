/* ============ BANC « L'ENCRE S'IMPRÈGNE DEPUIS LE DOIGT » ============
   « Je veux vraiment que ça donne l'impression, lorsque je clique, d'être
   rempli. Comme si la couleur s'imprégnait et s'élargissait, pour remplir
   toute la surface ultra proprement. Et de l'autre côté, où la surface
   disparaît, fais en sorte que ça se fasse bien aussi. »

   HISTOIRE. Ce banc gardait l'ancien remplissage : un rectangle rouge qu'on
   agrandissait depuis le centre en fondu. Le geste a changé (voir « L'ENCRE »
   dans index.html) ; ce qu'il doit garantir aussi. On touche une vraie puce
   avec un vrai doigt (événements tactiles), à un endroit choisi exprès loin du
   centre, et on vérifie SEPT promesses :

     1. LA GOUTTE NAÎT SOUS LE DOIGT : le centre du disque est le point touché,
        au pixel près — pas le centre de la puce ;
     2. ELLE S'ÉTALE : son échelle monte par valeurs distinctes et croissantes,
        jamais d'un saut, et elle part petite ;
     3. ELLE COUVRE TOUT : à la fin, le cœur plein du disque atteint le coin le
        plus éloigné (géométrie), et en pixels les quatre coins de la puce sont
        rouges — pas de frange claire ;
     4. LA TEINTE PLEINE N'ARRIVE QU'À LA FIN, sous l'encre ;
     5. LE MOT NE BLANCHIT QUE COUVERT : à l'instant où il bascule, le cœur de
        l'encre couvre toute la boîte du libellé ;
     6. UN SEUL ROUGE : la quantité totale de rouge sur la rangée (en pixels,
        lettres exclues) reste entre 85 et 120 % de celle du repos pendant tout
        le passage — ni éclair (deux puces pleines à la fois) ni trou ;
     7. AU REPOS, la couche d'encre n'est plus peinte.

   Le mouvement est ralenti (les durées se lisent dans des variables CSS, le
   JS les relit aussi : tout reste proportionné), pour échantillonner.
   Usage : node banc-essai/remplissage.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const LENT = 6;

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.evaluate(() => { state.mode = 'solo'; state.lengthKey = 'courte'; state.screen = 'setup'; render(); });
  await p.waitForTimeout(1500);
  const soucis = [];

  /* 7. AU REPOS — avant tout geste. */
  const repos = await p.evaluate(() => {
    const c = document.querySelector('.chip.active');
    if (!c) return null;
    const a = getComputedStyle(c, '::after');
    return { contenu: a.content, opacite: parseFloat(a.opacity) };
  });
  if (!repos) soucis.push('aucune puce choisie sur l\'écran de réglages');
  else if (repos.contenu === 'none') soucis.push('la couche d\'encre n\'existe pas (::after sans « content ») : rien ne peut s\'étaler');
  else if (repos.opacite > 0.01) soucis.push('au repos, la couche d\'encre est peinte (opacité ' + repos.opacite + ')');

  await p.addStyleTag({ content: `.chip, .len-chip{ --encre-duree:${0.5 * LENT}s !important; --encre-sortie:${0.3 * LENT}s !important; }
    :root{ --onde-duree:${0.24 * LENT}s !important; --tr-onde:${0.24 * LENT}s cubic-bezier(0.33,1,0.68,1) !important; }` });
  await p.waitForTimeout(150);
  const boites = await p.evaluate(() => [...document.querySelectorAll('.chip[data-group="len"]')].map(c => {
    const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, k: c.dataset.k };
  }));
  const cible = boites.find(b => b.k === 'normale');
  /* Loin du centre exprès : au quart gauche, aux deux tiers de la hauteur. */
  const doigt = { x: cible.x + cible.w * 0.24, y: cible.y + cible.h * 0.66 };
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: doigt.x, y: doigt.y }] });
  await p.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  /* Échantillons : mécanique (rAF, dans la page) et pixels (captures). */
  const meca = p.evaluate((dureeMax) => new Promise(res => {
    const c = document.querySelector('.chip[data-group="len"][data-k="normale"]');
    const t0 = performance.now(), l = [];
    const tic = () => {
      const a = getComputedStyle(c, '::after'), cs = getComputedStyle(c);
      const m = String(a.transform).match(/matrix\(([^,]+)/);
      l.push({ t: performance.now() - t0, ech: m ? parseFloat(m[1]) : (a.transform === 'none' ? 1 : 0),
               teinte: cs.getPropertyValue('--glass-tint').trim(), couleur: cs.color,
               x: parseFloat(c.style.getPropertyValue('--encre-x')), y: parseFloat(c.style.getPropertyValue('--encre-y')),
               r: parseFloat(c.style.getPropertyValue('--encre-r')), remplit: c.classList.contains('remplit') });
      if (performance.now() - t0 < dureeMax) requestAnimationFrame(tic); else res(l);
    };
    requestAnimationFrame(tic);
  }), 0.5 * LENT * 1000 + 300);
  const rangee = { x: boites[0].x, y: boites[0].y, width: boites[2].x + boites[2].w - boites[0].x, height: boites[0].h };
  const sommes = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 0.5 * LENT * 1000 + 200) {
    const png = await p.screenshot({ clip: rangee });
    sommes.push(await p.evaluate(async ({ b64, boites, x0 }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const k = img.width / (boites[2].x + boites[2].w - x0);
      return boites.map(b => {
        const d = g.getImageData(Math.round((b.x - x0) * k) + 8, 8, Math.round(b.w * k) - 16, Math.round(b.h * k) - 16).data;
        let s = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < 170) continue;                  // lettres sombres : ni crème ni rouge
          if (d[i + 1] > 250 && d[i + 2] > 250) continue;   // lettres blanches non plus
          s += Math.max(0, Math.min(1, (246 - d[i + 1]) / (246 - 62))); n++;
        }
        return n ? s / n : 0;
      }).reduce((a, v) => a + v, 0);
    }, { b64: png.toString('base64'), boites, x0: boites[0].x }));
  }
  const l = await meca;
  const fin = await p.evaluate(() => {
    const c = document.querySelector('.chip[data-group="len"][data-k="normale"]');
    const a = getComputedStyle(c, '::after');
    return { opacite: parseFloat(a.opacity), remplit: c.classList.contains('remplit'), actif: c.classList.contains('active') };
  });

  /* 1. sous le doigt */
  const pose = l.find(e => isFinite(e.x));
  const attendu = { x: doigt.x - cible.x, y: doigt.y - cible.y };
  if (!pose) soucis.push('la goutte n\'a pas de point de départ');
  else if (Math.hypot(pose.x - attendu.x, pose.y - attendu.y) > 2)
    soucis.push('la goutte ne naît pas sous le doigt : (' + pose.x.toFixed(1) + ', ' + pose.y.toFixed(1) + ') au lieu de ('
      + attendu.x.toFixed(1) + ', ' + attendu.y.toFixed(1) + ')');

  /* 2. elle s'étale */
  const pendant = l.filter(e => e.remplit);
  const ech = pendant.map(e => Math.round(e.ech * 1000) / 1000);
  if (new Set(ech).size < 8) soucis.push('l\'encre ne s\'étale pas : ' + new Set(ech).size + ' échelle(s) distincte(s)');
  if (!ech.every((v, i) => i === 0 || v >= ech[i - 1] - 0.005)) soucis.push('l\'encre recule en s\'étalant');
  if (ech.length && ech[0] > 0.25) soucis.push('l\'encre part déjà grande (' + ech[0] + ')');

  /* 3. elle couvre tout */
  const geo = pendant.length ? pendant[pendant.length - 1] : null;
  if (geo) {
    const loin = Math.max(...[[0, 0], [cible.w, 0], [0, cible.h], [cible.w, cible.h]].map(([a, b]) => Math.hypot(a - geo.x, b - geo.y)));
    if (0.82 * geo.r < loin) soucis.push('à pleine taille, le cœur de l\'encre (' + (0.82 * geo.r).toFixed(1) + ' px) n\'atteint pas le coin le plus éloigné (' + loin.toFixed(1) + ' px)');
  }

  /* 4. la teinte n'arrive qu'à la fin */
  const rouge = (c) => { const v = (String(c).match(/\d+/g) || []).map(Number); return v[0] > 200 && v[1] < 110 && v[2] < 90; };
  const tot = pendant.filter(e => e.t < 0.5 * LENT * 1000 * 0.85);
  if (tot.some(e => rouge(e.teinte))) soucis.push('la teinte pleine arrive avant la fin de l\'encre');

  /* 5. le mot ne blanchit que couvert */
  const blanc = (c) => { const v = (String(c).match(/\d+/g) || []).map(Number); return v[0] > 240 && v[1] > 240 && v[2] > 240; };
  const bascule = pendant.find(e => blanc(e.couleur));
  if (!bascule) soucis.push('le libellé ne passe jamais au blanc');
  else {
    const libelle = await p.evaluate(() => {
      const c = document.querySelector('.chip[data-group="len"][data-k="normale"]');
      const r = c.getBoundingClientRect(); let g = 1e9, h = 1e9, d = -1e9, b = -1e9;
      const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const x of rg.getClientRects()) { g = Math.min(g, x.left - r.left); d = Math.max(d, x.right - r.left); h = Math.min(h, x.top - r.top); b = Math.max(b, x.bottom - r.top); }
      }
      return { g, h, d, b };
    });
    const besoin = Math.max(...[[libelle.g, libelle.h], [libelle.d, libelle.h], [libelle.g, libelle.b], [libelle.d, libelle.b]].map(([a, b]) => Math.hypot(a - bascule.x, b - bascule.y)));
    const coeur = 0.82 * bascule.r * bascule.ech;
    if (coeur + 0.5 < besoin) soucis.push('le mot blanchit avant d\'être couvert : cœur ' + coeur.toFixed(1) + ' px, il en faut ' + besoin.toFixed(1));
    console.log('  le mot blanchit à ' + Math.round(bascule.t / LENT) + ' ms (temps réel) — cœur de l\'encre ' + coeur.toFixed(1) + ' px pour ' + besoin.toFixed(1) + ' px de libellé');
  }

  /* 6. un seul rouge — rapporté au repos (la dernière image, tout posé) */
  const reposR = sommes[sommes.length - 1] || 1;
  const pc = sommes.map(v => 100 * v / reposR);
  const pic = Math.max(...pc), creux = Math.min(...pc);
  console.log('  rouge total sur la rangée : de ' + creux.toFixed(0) + ' à ' + pic.toFixed(0) + ' % du repos, ' + sommes.length + ' images');
  if (pic > 120) soucis.push('éclair : la rangée monte à ' + pic.toFixed(0) + ' % de son rouge (deux puces à la fois)');
  if (creux < 85) soucis.push('trou : la rangée tombe à ' + creux.toFixed(0) + ' % de son rouge pendant le passage');

  /* 7. au repos, après */
  if (!fin.actif) soucis.push('la puce touchée n\'est pas choisie');
  if (fin.remplit || fin.opacite > 0.01) soucis.push('après le geste, la couche d\'encre reste peinte (opacité ' + fin.opacite + ')');

  /* 3 bis. LES COINS, EN PIXELS. On rejoue un toucher (au bord opposé cette
     fois) et on FIGE la puce à 98 % du mouvement : l'encre est à pleine
     taille, la teinte de verre n'a pas encore pris le relais. C'est l'encre
     seule qui doit avoir rempli les coins arrondis — là où une frange claire
     se verrait. */
  const lb = boites.find(b => b.k === 'longue');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: lb.x + lb.w * 0.86, y: lb.y + lb.h * 0.3 }] });
  await p.waitForTimeout(40);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(30);
  const fige = await p.evaluate((D) => {
    const c = document.querySelector('.chip[data-group="len"][data-k="longue"]');
    clearTimeout(c._remplirT);
    let n = 0;
    document.getAnimations().forEach(a => { if (a.effect && a.effect.target === c) { a.pause(); a.currentTime = D * 0.98; n++; } });
    return { n, teinte: getComputedStyle(c).getPropertyValue('--glass-tint').trim(), rayon: parseFloat(getComputedStyle(c).borderTopLeftRadius) };
  }, 0.5 * LENT * 1000);
  await p.waitForTimeout(120);
  const png = await p.screenshot({ clip: { x: lb.x, y: lb.y, width: lb.w, height: lb.h } });
  const coins = await p.evaluate(async ({ b64, r }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const k = img.width / 1, W = img.width, H = img.height, rr = r * (W / Math.max(1, W / 2)) / 2;
    const e = Math.max(2, Math.round(0.42 * r * 2));     // dans l'arrondi, près du bord
    return [[e, e], [W - 1 - e, e], [e, H - 1 - e], [W - 1 - e, H - 1 - e]].map(([x, y]) => [...g.getImageData(x, y, 1, 1).data].slice(0, 3));
  }, { b64: png.toString('base64'), r: fige.rayon });
  const pales = coins.filter(([R, G, B]) => !(R > 200 && G < 110 && B < 90));
  console.log('  coins à 98 % de l\'encre (teinte ' + fige.teinte + ') : ' + coins.map(c => 'rgb(' + c.join(',') + ')').join(' '));
  if (fige.n < 2) soucis.push('impossible de figer l\'encre pour regarder les coins');
  else if (pales.length) soucis.push(pales.length + ' coin(s) sur 4 ne sont pas couverts par l\'encre : ' + pales.map(c => 'rgb(' + c.join(',') + ')').join(' '));

  const jalons = [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1].map(f => {
    const vise = f * 0.5 * LENT * 1000;
    const e = pendant.reduce((a, b) => Math.abs(b.t - vise) < Math.abs(a.t - vise) ? b : a, pendant[0] || { ech: 0 });
    return Math.round((e.ech || 0) * 100) + '%';
  });
  console.log('  l\'encre, du début à la fin : ' + jalons.join(' → '));

  if (errs.length) soucis.push('erreurs JS : ' + [...new Set(errs)].slice(0, 2).join(' | '));
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('  OK — l\'encre naît sous le doigt, s\'étale, couvre tout, un seul rouge à la fois, rien au repos');
})();
