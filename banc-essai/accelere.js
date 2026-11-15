/* ====== (v366) TOUT CE QUI BOUGE, L'iPHONE LE JOUE SEUL ======
   « Sur Android, c'est ultra fluide. Et sur iOS, c'est un petit peu moins
     fluide. Je sais pas pourquoi. Essaie de régler ça pour que ça soit
     parfaitement fluide sur les deux OS. »
   Safari ne confie au processeur graphique (Core Animation) que les
   animations dont la courbe est une cubic-bezier ou un mot-clé : une
   courbe linear() à points, ou steps(), l'en empêche (WebKit,
   KeyframeEffect::canBeAccelerated, commit 269594@main) et l'animation
   reste sur le fil de la page — 60 images par seconde au mieux, et des
   images perdues dès que la page travaille. Depuis la v360, TOUS les
   mouvements du jeu étaient dans ce cas. Ce banc ne peut pas lancer
   Safari : il vérifie la règle même que Safari applique, sur tout ce qui
   bouge pendant un vrai parcours, puis que le mouvement n'a pas changé.
     1. aucune feuille de style ne porte de courbe linear() à points ni
        steps() (--tr-plie compris) ;
     2. pendant un vrai parcours, sur iPhone et sur Android (les quatre
        onglets, deux onglets coup sur coup, les Réglages, une page
        par-dessus, un menu qui monte, une fenêtre, une partie avec sa
        réponse et ses résultats, le verrou paysage), AUCUNE animation en
        cours n'en porte — ni l'animation, ni une de ses images clés ;
     3. chaque @keyframes de l'horloge porte le ressort en deux tronçons :
        trois étapes (0 %, 22,54 %, 100 %), le premier tronçon à 0 %, le
        second à 22,54 % ;
     4. l'écran qui arrive suit le ressort à 0,1 px près d'un bout à
        l'autre (arrêté à 51 instants), celui qui part aussi, et la barre
        qui s'en va avec lui ;
     5. le menu qui monte du bas et la page qui arrive suivent le même
        ressort, à 0,1 px près (arrêtés à 51 instants). (Le contre-mouvement
        du décor, contreMonte, ne tourne plus : le moteur de verre ne pose
        plus de couche dans une feuille — GLASS_VIVANT les exclut. Ses
        images clés portent quand même les deux tronçons, vérifiés en 3 :
        s'il revient, il reste en phase avec la feuille.)
     6. aucune erreur.
   Usage : node banc-essai/accelere.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 600) + ')' : '')); };
const HORLOGE = ['screenIn', 'cardSlideIn', 'optionIn', 'modalIn', 'rlIn', 'fadeSlide', 'pageIn', 'sheetIn', 'contreMonte', 'barreArriveG', 'barreArriveD', 'ccArrive', 'veilIn'];
const A = 'cubic-bezier(0.2519,0,0.5558,0.5371)', B = 'cubic-bezier(0.2344,0.8699,0.4669,0.9745)';

/* Le guetteur : à chaque image, toutes les animations en cours ; il garde
   celles dont une courbe empêcherait Safari de les accélérer. */
const GUET = () => {
  window.__vues = new Set(); window.__fautes = [];
  const mauvaise = (e) => /linear\(\s*[-\d.]/.test(e || '') || /steps\(/.test(e || '');
  const nom = (a) => a.animationName || (a.transitionProperty ? 'transition ' + a.transitionProperty : 'script');
  const cible = (a) => { try { const t = a.effect.target; return t ? (t.id ? '#' + t.id : t.tagName.toLowerCase() + '.' + String(t.className || '').split(' ').slice(0, 3).join('.')) : '?'; } catch (e) { return '?'; } };
  const tic = () => {
    try {
      for (const a of document.getAnimations()) {
        if (!a.effect) continue;
        const n = nom(a); window.__vues.add(n);
        const t = a.effect.getTiming ? a.effect.getTiming().easing : '';
        let ks = []; try { ks = a.effect.getKeyframes(); } catch (e) {}
        const k = ks.map(x => x.easing).find(mauvaise);
        if (mauvaise(t) || k) { const f = n + ' sur ' + cible(a) + ' : ' + String(mauvaise(t) ? t : k).slice(0, 60); if (!window.__fautes.includes(f)) window.__fautes.push(f); }
      }
    } catch (e) {}
    requestAnimationFrame(tic);
  };
  requestAnimationFrame(tic);
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  let statique = null, etapes = null, ecran = null, barre = null, feuille = null, page = null;
  const vuesTout = new Set(), fautesTout = [];
  for (const [tel, ua, vp] of [['iPhone', IOS, { width: 402, height: 874 }], ['Android', AND, { width: 412, height: 915 }]]) {
    const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
      localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() })); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(1200);
    const ferme = () => p.evaluate(() => { document.querySelectorAll('#modalVeil').forEach(e => e.remove()); });
    if (tel === 'iPhone') {
      /* 1. les feuilles de style */
      statique = await p.evaluate(() => {
        const out = [];
        const lire = (regles) => { for (const r of regles) { if (r.cssRules) lire(r.cssRules); const t = r.cssText || ''; const m = t.match(/linear\(\s*[-\d.][^)]*\)|steps\([^)]*\)/); if (m) out.push((r.selectorText || r.name || r.conditionText || '?') + ' : ' + m[0].slice(0, 50)); } };
        for (const f of document.styleSheets) { try { lire(f.cssRules); } catch (e) {} }
        return { out, pli: getComputedStyle(document.documentElement).getPropertyValue('--tr-plie').trim() };
      });
      /* 3. les @keyframes de l'horloge */
      etapes = await p.evaluate((noms) => {
        const n = (s) => String(s || '').replace(/\s+/g, '');
        const trouve = {};
        const lire = (regles) => { for (const r of regles) { if (r.cssRules && !(r instanceof CSSKeyframesRule)) lire(r.cssRules); if (r instanceof CSSKeyframesRule && noms.includes(r.name)) trouve[r.name] = [...r.cssRules].map(k => [k.keyText, n(k.style.getPropertyValue('animation-timing-function'))]); } };
        for (const f of document.styleSheets) { try { lire(f.cssRules); } catch (e) {} }
        return trouve;
      }, HORLOGE);
    }
    await p.evaluate(GUET);
    /* 2. le parcours */
    for (const o of ['parcours', 'jeux', 'groupes', 'accueil']) { await p.tap('.bb-onglet[data-o="' + o + '"]'); await p.waitForTimeout(900); }
    await p.evaluate(() => { allerOnglet('jeux'); setTimeout(() => allerOnglet('groupes'), 110); }); await p.waitForTimeout(1100);
    await p.evaluate(() => allerOnglet('accueil')); await p.waitForTimeout(900);
    await p.evaluate(() => openSettings()); await p.waitForTimeout(900);
    await p.evaluate(() => openLangues()); await p.waitForTimeout(900);
    await p.evaluate(() => closeLangues()); await p.waitForTimeout(700);
    await p.evaluate(() => closeSettings()); await p.waitForTimeout(700);
    await p.evaluate(() => ouvrirFeuilleGroupe('grpPhotoVeil', 'Photo du groupe', ICONS.appareil, '<div class="grp-liste-act"><p>Essai</p></div>')); await p.waitForTimeout(900);
    await p.evaluate(() => fermerFeuilleGroupe('grpPhotoVeil')); await p.waitForTimeout(700);
    await p.evaluate(() => showModal({ title: 'Essai', message: 'Essai.', okLabel: 'Oui', cancelLabel: 'Non' })); await p.waitForTimeout(700);
    await p.evaluate(() => closeModal()); await p.waitForTimeout(600);
    await p.evaluate(() => { state.mode = 'solo'; state.revision = false; startGame(); }); await p.waitForTimeout(1100);
    await p.evaluate(() => { const b = document.querySelector('.option-btn'); if (b) b.click(); }); await p.waitForTimeout(2600);
    await p.evaluate(() => { document.querySelectorAll('#modalVeil').forEach(e => e.remove()); state.soloScore = 120; state.soloCorrect = 9; partieFinie(); state.screen = 'end'; render(); }); await p.waitForTimeout(1600);
    await ferme();
    await p.setViewportSize({ width: vp.height, height: vp.width }); await p.waitForTimeout(900);
    await p.setViewportSize(vp); await p.waitForTimeout(900);
    await p.evaluate(() => { document.querySelectorAll('#modalVeil').forEach(e => e.remove()); state.screen = 'mode'; render(); }); await p.waitForTimeout(900);
    const g = await p.evaluate(() => ({ vues: [...window.__vues], fautes: window.__fautes }));
    g.vues.forEach(v => vuesTout.add(v)); g.fautes.forEach(f => fautesTout.push(tel + ' — ' + f));

    if (tel === 'iPhone') {
      const K = 7.54;
      /* 4. un écran qui arrive, celui qui part, la barre : arrêtés à 51 instants */
      ecran = await p.evaluate((K) => new Promise(res => {
        allerOnglet('jeux');
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const pp = passage; if (!pp) return res({ erreur: 'aucun passage' });
          const N = 1 - (1 + K) * Math.exp(-K), R = (t) => (1 - (1 + K * t) * Math.exp(-K * t)) / N;
          const tx = (el) => { const v = getComputedStyle(el).translate; return (!v || v === 'none') ? 0 : parseFloat(v); };
          pp.anims.forEach(a => a.pause());
          let pire = 0, n = 0;
          for (let i = 0; i <= 50; i++) {
            const t = i / 50; pp.anims.forEach(a => { a.currentTime = t * pp.duree; });
            pire = Math.max(pire, Math.abs(tx(pp.entrant) - (pp.entrantDe + (0 - pp.entrantDe) * R(t))), Math.abs(tx(pp.sortant) - (pp.sortantDe + (pp.sortantA - pp.sortantDe) * R(t)))); n++;
          }
          pp.anims.forEach(a => a.play());
          res({ pire, n, duree: pp.duree });
        }));
      }), K);
      await p.waitForTimeout(900);
      await p.evaluate(() => allerOnglet('accueil')); await p.waitForTimeout(900);
      barre = await p.evaluate((K) => new Promise(res => {
        state.mode = 'solo'; state.revision = false; startGame();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const pp = passage, b = document.getElementById('barreBas');
          const ab = b && b.getAnimations().find(a => { try { return !a.animationName && a.effect.getKeyframes().some(k => k.translate !== undefined); } catch (e) { return false; } });
          if (!pp || !ab || !pp.barreGlisse) return res({ erreur: 'la barre ne glisse pas (' + !!pp + ', ' + !!ab + ')' });
          const N = 1 - (1 + K) * Math.exp(-K), R = (t) => (1 - (1 + K * t) * Math.exp(-K * t)) / N;
          const tx = (el) => { const v = getComputedStyle(el).translate; return (!v || v === 'none') ? 0 : parseFloat(v); };
          const toutes = pp.anims.concat([ab]); toutes.forEach(a => a.pause());
          let pire = 0;
          for (let i = 0; i <= 50; i++) { const t = i / 50; toutes.forEach(a => { a.currentTime = t * pp.duree; }); pire = Math.max(pire, Math.abs(tx(b) - (pp.barreGlisse.de + (pp.barreGlisse.a - pp.barreGlisse.de) * R(t)))); }
          toutes.forEach(a => a.play());
          res({ pire });
        }));
      }), K);
      await p.waitForTimeout(1000);
      await p.evaluate(() => { document.querySelectorAll('#modalVeil').forEach(e => e.remove()); state.screen = 'mode'; render(); }); await p.waitForTimeout(1000);
      /* 5. le menu qui monte et son décor ; la page qui arrive */
      feuille = await p.evaluate((K) => new Promise(res => {
        ouvrirFeuilleGroupe('grpPhotoVeil', 'Photo du groupe', ICONS.appareil, '<div class="grp-liste-act"><p>Essai</p></div>');
        let essais = 0;
        const voir = () => {
          const f = document.querySelector('#grpPhotoVeil .settings-sheet');
          const a = f && f.getAnimations().find(x => x.animationName === 'sheetIn');
          if (!a) { if (++essais < 30) return requestAnimationFrame(voir); return res({ erreur: 'pas de montée' }); }
          const gs = [...f.querySelectorAll('.gs')].map(el => [el, el.getAnimations().find(x => x.animationName === 'contreMonte')]).filter(x => x[1]);
          const N = 1 - (1 + K) * Math.exp(-K), R = (t) => (1 - (1 + K * t) * Math.exp(-K * t)) / N;
          const ty = (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
          const tout = [a].concat(gs.map(x => x[1])); tout.forEach(x => x.pause());
          const H = f.getBoundingClientRect().height;
          a.currentTime = 0; const h0 = ty(f);
          const sommes0 = gs.map(([el]) => ty(f) + ty(el));
          let pire = 0, pireDecor = 0;
          for (let i = 0; i <= 50; i++) {
            const t = i / 50; tout.forEach(x => { x.currentTime = t * 580; });
            pire = Math.max(pire, Math.abs(ty(f) - h0 * (1 - R(t))));
            gs.forEach(([el], j) => { pireDecor = Math.max(pireDecor, Math.abs(ty(f) + ty(el) - sommes0[j])); });
          }
          tout.forEach(x => x.play());
          res({ pire, pireDecor, decors: gs.length, depart: h0, attendu: H - 220 });
        };
        requestAnimationFrame(voir);
      }), K);
      await p.waitForTimeout(900);
      await p.evaluate(() => fermerFeuilleGroupe('grpPhotoVeil')); await p.waitForTimeout(700);
      page = await p.evaluate((K) => new Promise(res => {
        openSettings();
        let essais = 0;
        const voir = () => {
          const v = document.getElementById('settingsVeil');
          const a = v && v.getAnimations().find(x => x.animationName === 'pageIn');
          if (!a) { if (++essais < 30) return requestAnimationFrame(voir); return res({ erreur: 'pas d\'arrivée' }); }
          const N = 1 - (1 + K) * Math.exp(-K), R = (t) => (1 - (1 + K * t) * Math.exp(-K * t)) / N;
          const tx = (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
          a.pause(); const W = v.getBoundingClientRect().width; let pire = 0;
          for (let i = 0; i <= 50; i++) { const t = i / 50; a.currentTime = t * 580; pire = Math.max(pire, Math.abs(tx(v) - W * (1 - R(t)))); }
          a.play(); res({ pire });
        };
        requestAnimationFrame(voir);
      }), K);
      await p.waitForTimeout(900);
    }
    await ctx.close();
  }
  dit('1. aucune feuille de style ne porte de courbe linear() à points ni steps() (--tr-plie : ' + (statique ? statique.pli : '?') + ')',
    statique && statique.out.length === 0 && !/linear\(\s*[-\d.]/.test(statique.pli), statique ? statique.out.slice(0, 4).join(' | ') : 'non lu');
  dit('2. pendant le parcours, sur iPhone et sur Android, aucune animation en cours ne porte une courbe que Safari refuse d\'accélérer (' + vuesTout.size + ' sortes d\'animations vues)',
    fautesTout.length === 0 && vuesTout.size >= 12, fautesTout.slice(0, 5).join(' | ') || [...vuesTout].join(', '));
  const n = (s) => String(s || '').replace(/\s+/g, '');
  const malEcrites = HORLOGE.filter(k => { const e = etapes && etapes[k]; return !e || e.length !== 3 || e[0][0] !== '0%' || e[1][0] !== '22.54%' || e[2][0] !== '100%' || e[0][1] !== n(A) || e[1][1] !== n(B); });
  dit('3. les ' + HORLOGE.length + ' @keyframes de l\'horloge portent le ressort en deux tronçons (0 %, 22,54 %, 100 %)', malEcrites.length === 0, malEcrites.map(k => k + ' ' + JSON.stringify(etapes && etapes[k])).join(' | '));
  dit('4. l\'écran qui arrive et celui qui part suivent le ressort à 0,1 px près (51 instants), la barre qui s\'en va aussi',
    ecran && !ecran.erreur && ecran.pire <= 0.1 && ecran.duree === 580 && barre && !barre.erreur && barre.pire <= 0.1, JSON.stringify({ ecran, barre }));
  dit('5. le menu qui monte du bas et la page qui arrive suivent le ressort à 0,1 px près (51 instants)',
    feuille && !feuille.erreur && feuille.pire <= 0.1 && feuille.pireDecor <= 0.1 && feuille.depart > 50 && page && !page.erreur && page.pire <= 0.1, JSON.stringify({ feuille, page }));
  dit('6. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — plus rien ne bouge sur une courbe que Safari refuse d\'accélérer, et le ressort n\'a pas bougé d\'un pixel');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
