/* ====== BANC « DANS UNE PAGE AUSSI, LE ROUGE SE REMPLIT » (v325) ======
   Taylor, sur une capture de la page « Un livre » : « pour choisir un livre
   spécifique, il n'y a pas l'animation de couleur rouge qui vient se
   remplir. Et d'ailleurs, c'est partout ailleurs où il y a besoin. » Puis :
   « je veux que le changement de livre soit cohérent avec les boutons de la
   page précédente ».

   Filmé au ralenti avant la v325 :
     — la tuile du livre passait du beige au rouge d'une image à l'autre ;
     — les puces posées dans une page (Privé/Public, Tout/Mentions/Muet)
       devenaient rouges dès la première image : leur dégradé arrivait avec la
       classe, et l'encre s'étalait sous un rouge déjà là.

   CE QU'ON MESURE, encre cinq fois plus lente, image par image, sur ce qu'on
   PREND et sur ce qu'on QUITTE (la part de rouge de la surface, rapportée à
   celle du repos — le libellé ne compte pas) :
     1. ce qu'on prend ne claque pas : moins d'un tiers de son rouge à la
        première image ;
     2. il se remplit par paliers (au moins six niveaux) ;
     3. la relève est invisible : l'encre finie, juste avant de s'effacer, et
        la surface au repos sont la même image (écart moyen sous 1,5) ;
     4. ce qu'on quitte se vide par paliers, jusqu'à zéro ;
   pour trois familles : la tuile du livre depuis le Solo, la tuile du livre
   dans le salon en ligne, des puces dans une page (le balisage de
   Tout/Mentions/Muet). Puis, à vitesse réelle : la page des livres ne repart
   qu'une fois la tuile remplie — pas avant 350 ms, pas après 700 ms.
   Usage : node banc-essai/remplir-pages.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const S_PALIERS = 6, S_DEBUT = 0.33, S_RELEVE = 1.5;

/* La part de rouge d'une capture : un pixel est « rouge » s'il est dans la
   famille du dégradé (244,78,44) -> (222,54,22), bord adouci exclu. */
const PART = async (p, png, zone) => p.evaluate(async ([b64, z]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
  const k = img.width / z.largeur;                       // l'échelle de la capture (pixels par point)
  const d = g.getImageData(Math.round(z.x * k), Math.round(z.y * k), Math.round(z.w * k), Math.round(z.h * k)).data;
  let r = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 190 && d[i + 1] < 120 && d[i + 2] < 90) r++;
  return r / (d.length / 4);
}, [png.toString('base64'), zone]);
const ECART = async (p, a, b) => p.evaluate(async ([x, y]) => {
  const lire = async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
  const da = await lire(x), db = await lire(y);
  if (da.length !== db.length) return 999;
  let s = 0; for (let i = 0; i < da.length; i += 4) s += (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
  return s / (da.length / 4);
}, [a.toString('base64'), b.toString('base64')]);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { state.mode = 'solo'; state.screen = 'setup'; render(); });
  await p.waitForTimeout(900);

  /* Vitesse réelle d'abord : quand la page des livres repart-elle ? */
  const reel = await p.evaluate(async () => {
    state.livre = null; ouvrirLivreLocal();
    await new Promise(r => setTimeout(r, 900));
    const v = document.getElementById('livreVeil');
    const i = BIBLE_BOOKS.indexOf('Ruth');
    const t0 = performance.now(); choisirLivreLocal(i);
    while (!v.classList.contains('closing') && performance.now() - t0 < 2000) await new Promise(r => requestAnimationFrame(r));
    const t = performance.now() - t0;
    const tuile = v.querySelector('.bk-choix[data-i="' + i + '"]');
    const blanc = tuile && getComputedStyle(tuile.querySelector('.bk-nm')).color === 'rgb(255, 255, 255)';
    await new Promise(r => setTimeout(r, 900));
    return { t: Math.round(t), blanc, livre: state.livre };
  });

  /* Puis le ralenti : l'encre dure 2,5 s pour le jeu (ses minuteries), et
     l'animation 2 s — la fenêtre entre les deux laisse photographier l'encre
     finie, avant que sa couche ne s'efface. */
  await p.addStyleTag({ content: '.chip,.len-chip,.bk-choix{--encre-duree:2.5s !important;--encre-sortie:1.5s !important;}'
    + '.bk-choix.remplit::after,.sheet-veil .len-chip.remplit::after{animation-duration:2s !important;}' });
  await p.evaluate(() => { const f = window.fermerFeuilleGroupe; window.__fermer = f; window.fermerFeuilleGroupe = (id) => { if (id !== 'livreVeil') f(id); }; });

  const familles = [
    { nom: 'Livre, depuis le Solo', ouvrir: () => p.evaluate(() => { state.livre = 'Ésaïe'; ouvrirLivreLocal(); }),
      prise: '#livreVeil .bk-choix[data-i="IJ"]', quittee: '#livreVeil .bk-choix[data-i="IE"]',
      geste: () => p.evaluate(() => choisirLivreLocal(BIBLE_BOOKS.indexOf('Jérémie'))), fermer: 'livreVeil' },
    { nom: 'Livre, en ligne', ouvrir: () => p.evaluate(() => { net.isHost = true; net.themeFixe = null; net.livre = 'Ésaïe';
        pageDesLivres(net.livre, 'choisirLivreSalon', LIVRE_MIN, ''); }),
      prise: '#livreVeil .bk-choix[data-i="IJ"]', quittee: '#livreVeil .bk-choix[data-i="IE"]',
      geste: () => p.evaluate(() => choisirLivreSalon(BIBLE_BOOKS.indexOf('Jérémie'))), fermer: 'livreVeil' },
    { nom: 'Puces dans une page', ouvrir: () => p.evaluate(() => {
        ouvrirFeuilleGroupe('essaiVeil', 'Essai', ICONS.bell || ICONS.book, '<div class="grp-types grp-notifs" role="radiogroup">'
          + ['tout', 'mentions', 'muet'].map((k, i) => `<button class="len-chip${i === 0 ? ' sel' : ''}" data-egroup="n" data-k="${k}">${['Tout', 'Mentions', 'Muet'][i]}</button>`).join('') + '</div>'); }),
      prise: '#essaiVeil [data-k="muet"]', quittee: '#essaiVeil [data-k="tout"]',
      geste: () => p.evaluate(() => basculerChoix('#essaiVeil [data-egroup="n"]', 'sel', 'muet')), fermer: 'essaiVeil' },
  ];
  const iJ = await p.evaluate(() => BIBLE_BOOKS.indexOf('Jérémie')), iE = await p.evaluate(() => BIBLE_BOOKS.indexOf('Ésaïe'));
  let ko = 0;
  const dire = (ok, txt) => { if (!ok) ko++; console.log('  ' + (ok ? 'OK ' : 'KO ') + ' ' + txt); };
  for (const f of familles) {
    const prise = f.prise.replace('IJ', iJ), quittee = f.quittee.replace('IE', iE);
    await f.ouvrir();
    await p.waitForTimeout(1300);
    const boite = async (s) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + 2, y: r.top + 2, width: r.width - 4, height: r.height - 4 }; }, s);
    const bp = await boite(prise), bq = await boite(quittee);
    /* UNE capture par image, qui prend les deux : photographier puis mesurer
       à chaque tour ne laissait que huit images en deux secondes. */
    const x0 = Math.min(bp.x, bq.x), y0 = Math.min(bp.y, bq.y);
    const tout = { x: x0, y: y0, width: Math.max(bp.x + bp.width, bq.x + bq.width) - x0, height: Math.max(bp.y + bp.height, bq.y + bq.height) - y0 };
    const zp = { x: bp.x - x0, y: bp.y - y0, w: bp.width, h: bp.height, largeur: tout.width };
    const zq = { x: bq.x - x0, y: bq.y - y0, w: bq.width, h: bq.height, largeur: tout.width };
    await f.geste();
    const images = [];
    const t0 = Date.now();
    let finie = null;
    while (Date.now() - t0 < 2550) {
      images.push(await p.screenshot({ clip: tout }));
      if (!finie && Date.now() - t0 > 2080) {
        const encore = await p.evaluate((s) => document.querySelector(s).classList.contains('remplit'), prise);
        if (encore) finie = await p.screenshot({ clip: bp });
      }
    }
    const prises = [], quittees = [];
    for (const im of images) { prises.push(await PART(p, im, zp)); quittees.push(await PART(p, im, zq)); }
    await p.waitForFunction((s) => !document.querySelector(s).classList.contains('remplit'), prise, { timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(400);
    const repos = await p.screenshot({ clip: bp });
    const plein = await PART(p, repos, { x: 0, y: 0, w: bp.width, h: bp.height, largeur: bp.width });
    const r = prises.map(v => v / (plein || 1)), q = quittees.map(v => v / (plein || 1));
    const paliers = new Set(r.filter(v => v > 0.04 && v < 0.96).map(v => Math.round(v * 20))).size;
    const pq = new Set(q.filter(v => v > 0.04 && v < 0.96).map(v => Math.round(v * 20))).size;
    const releve = finie ? await ECART(p, finie, repos) : 999;
    console.log('  ' + f.nom + ' :');
    dire(r[0] < S_DEBUT, `ne claque pas : ${(r[0] * 100).toFixed(0)} % de rouge à la première image`);
    dire(paliers >= S_PALIERS, `se remplit par paliers : ${paliers} niveaux (de ${(r[0] * 100).toFixed(0)} à ${(r[r.length - 1] * 100).toFixed(0)} %)`);
    dire(releve < S_RELEVE, `relève invisible : écart moyen ${releve === 999 ? 'non mesuré' : releve.toFixed(2)} entre l'encre finie et le repos`);
    dire(pq >= S_PALIERS && q[q.length - 1] < 0.03, `ce qu'on quitte se vide par paliers : ${pq} niveaux, ${(q[q.length - 1] * 100).toFixed(0)} % à la fin`);
    await p.evaluate((id) => window.__fermer(id), f.fermer);
    await p.waitForTimeout(900);
  }
  console.log('  Vitesse réelle :');
  dire(reel.t >= 350 && reel.t <= 700, `la page des livres repart après le remplissage : ${reel.t} ms`);
  dire(reel.blanc, `au départ de la page, le nom du livre est déjà blanc sur le rouge`);
  dire(reel.livre === 'Ruth', `le livre est retenu (${reel.livre})`);
  dire(!errs.length, 'aucune erreur' + (errs.length ? ' : ' + errs.slice(0, 2).join(' | ') : ''));
  await nav.close();
  console.log(ko ? `\n  ${ko} défaut(s)` : '\n  OK — dans une page aussi, le rouge se remplit depuis le doigt et se vide vers le suivant');
  process.exit(ko ? 1 : 0);
})();
