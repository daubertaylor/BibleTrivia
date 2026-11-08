/* ====== LES PETITS DÉFAUTS SIGNALÉS PAR TAYLOR (v350) ======
     1. « Sur un iPhone XS avec Safari, le jeu ne se lance pas. » Un Safari
        d'avant iOS 16.4 ne connaît pas le « regard en arrière » des
        expressions : la construire levait une erreur, et « Trouve l'erreur »
        ne démarrait pas. Ici, la page tourne avec un RegExp qui refuse ce
        regard, comme ce Safari-là : le jeu démarre, ses manches sont justes
        (un mot entier changé, la majuscule gardée) ; et le code n'en écrit
        plus un seul, nulle part ;
     2. « Continuer » sans prénom le dit : un message sous le champ, le
        champ qui dit non ; et le message part dès qu'on écrit ;
     3. l'ombre de l'icône de l'accueil s'efface quand le verset s'ouvre
        (l'animation de respiration réécrivait son opacité à chaque image) ;
     4. « Nouveaux messages » ne paraît que pour un message nouveau : pas
        quand le fil se redessine pour autre chose (un « Vu », une photo,
        le retour sur l'app) ;
     5. le relevé du clavier note la sortie d'un champ : la nature de la
        dernière saisie (jamais son texte), et si c'est le jeu qui a retiré
        le curseur ;
     6. aucune erreur.
   Usage : node banc-essai/petits-defauts.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS16 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS16, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await p.addInitScript(() => {
      if (!/^http/.test(location.protocol)) return;
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      /* Un Safari d'avant iOS 16.4 : RegExp refuse le regard en arrière. */
      const R = window.RegExp;
      const Ancien = function (motif, drapeaux) {
        const src = motif instanceof R ? motif.source : String(motif);
        if (/\(\?<[=!]/.test(src)) { window.__refus = (window.__refus || 0) + 1; throw new SyntaxError('Invalid regular expression: invalid group specifier name'); }
        return new R(motif, drapeaux);
      };
      Ancien.prototype = R.prototype;
      Object.setPrototypeOf(Ancien, R);
      window.RegExp = Ancien;
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(800);

    /* 1 */
    const source = await p.evaluate(async () => (await (await fetch(location.href, { cache: 'no-store' })).text()));
    const regards = (source.match(/\(\?<[=!]/g) || []).length;
    const r1 = await p.evaluate(async () => {
      const lu = [];
      let plante = null;
      for (let i = 0; i < 6; i++) {
        try { lancerJeu('erreur'); } catch (e) { plante = String(e.message || e).slice(0, 90); break; }
        await new Promise(z => setTimeout(z, 250));
        const ms = (jeu && jeu.manches) || [];
        ms.forEach(m => {
          const faux = m.mots[m.faux], juste = m.juste;
          const maj = (x) => x && x[0] === x[0].toUpperCase() && x[0] !== x[0].toLowerCase();
          lu.push({ change: faux !== juste, majGardee: maj(juste) === maj(faux) });
        });
      }
      let entiers = [];
      try { entiers = [motRe('roi').test('le roi.'), motRe('roi').test('Roi, dit-il'), !motRe('roi').test('paroi'), !motRe('roi').test('roitelet'), motRe('Moïse').test('« Moïse parla')]; } catch (e) { entiers = [false]; }
      return { plante, ecran: state.screen, manches: lu.length, malChangees: lu.filter(x => !x.change).length, majPerdue: lu.filter(x => !x.majGardee).length, entiers, refus: window.__refus || 0 };
    });
    dit('1. Safari d\'avant iOS 16.4 : « Trouve l\'erreur » démarre, ses manches sont justes (un mot entier changé, la majuscule gardée), et le code n\'écrit plus aucun regard en arrière',
      regards === 0 && !r1.plante && r1.manches >= 6 && !r1.malChangees && !r1.majPerdue && r1.entiers.every(Boolean) && !r1.refus, JSON.stringify({ regards, ...r1 }));
    await p.evaluate(() => { state.screen = 'mode'; render(); });
    await p.waitForTimeout(700);

    /* 2 */
    await p.evaluate(() => { profile.name = ''; state.screen = 'online-name'; render(); });
    await p.waitForTimeout(900);
    await p.evaluate(() => { const i = document.getElementById('nameInput'); i.value = ''; });
    await p.locator('#app > .screen .btn-primary').tap();
    await p.waitForTimeout(250);
    const r2 = await p.evaluate(() => {
      const e = document.getElementById('nomErreur'), i = document.getElementById('nameInput');
      return { texte: e && e.textContent, visible: !!(e && e.getBoundingClientRect().height > 0), refus: i.classList.contains('refus'), ecran: state.screen, role: e && e.getAttribute('role') };
    });
    await p.locator('#nameInput').type('S');
    await p.waitForTimeout(150);
    const r2b = await p.evaluate(() => { const e = document.getElementById('nomErreur'); return e ? e.textContent : null; });
    dit('2. « Continuer » sans prénom : un message sous le champ, le champ dit non, l\'écran reste ; le message part dès qu\'on écrit',
      r2.texte === 'Écris ton prénom pour continuer : c\'est le nom que verront les autres joueurs.' && r2.visible && r2.refus && r2.ecran === 'online-name' && r2.role === 'alert' && r2b === '',
      JSON.stringify({ ...r2, apres: r2b }));
    await p.evaluate(() => { profile.name = 'Taylor'; state.screen = 'mode'; render(); });
    await p.waitForTimeout(900);

    /* 3 */
    const r3 = await p.evaluate(async () => {
      const z = document.getElementById('heroZone');
      const avant = getComputedStyle(z, '::after').filter;
      showHeroVerse();
      await new Promise(res => setTimeout(res, 900));
      const ouvert = z.classList.contains('show-verse'), apres = getComputedStyle(z, '::after').filter;
      try { hideHeroVerse(); } catch (e) {}
      await new Promise(res => setTimeout(res, 900));
      return { avant, ouvert, apres, ferme: getComputedStyle(z, '::after').filter };
    });
    dit('3. l\'ombre de l\'icône s\'efface quand le verset s\'ouvre, et revient quand il se ferme',
      r3.ouvert && /opacity\(0\)/.test(r3.apres) && !/opacity\(0\)/.test(r3.ferme), JSON.stringify(r3));

    /* 4 */
    const r4 = await p.evaluate(() => {
      const fil = document.createElement('div');
      fil.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:200px;overflow:auto';
      document.body.appendChild(fil);
      let b = document.getElementById('filBas'), cree = false;
      if (!b) { b = document.createElement('button'); b.id = 'filBas'; b.hidden = true; document.body.appendChild(b); cree = true; }
      const html = (n, vu) => Array.from({ length: n }, (_, i) => `<div class="b b-eux"><div class="bl" data-m="${i + 1}" style="height:60px">message ${i + 1}${vu && i === n - 1 ? ' · Vu' : ''}</div></div>`).join('');
      poserFil(fil, html(20, false));
      fil.scrollTop = 0; b.hidden = true;
      poserFil(fil, html(20, true));            // un « Vu » qui passe : rien de nouveau
      const apresVu = !b.hidden;
      poserFil(fil, html(20, true));            // un redessin pour rien
      const apresRien = !b.hidden;
      poserFil(fil, html(21, true));            // un message arrive
      const apresMessage = !b.hidden, resteEnHaut = fil.scrollTop < 5;
      fil.remove(); if (cree) b.remove(); else b.hidden = true;
      return { apresVu, apresRien, apresMessage, resteEnHaut };
    });
    dit('4. « Nouveaux messages » ne paraît que pour un message nouveau (pas pour un « Vu », pas pour un redessin), et la lecture reste où elle était',
      !r4.apresVu && !r4.apresRien && r4.apresMessage && r4.resteEnHaut, JSON.stringify(r4));

    /* 5 */
    await p.evaluate(() => { localStorage.removeItem('bt_clavier_sorties'); profile.name = ''; state.screen = 'online-name'; render(); });
    await p.waitForTimeout(900);
    const r5 = await p.evaluate(async () => {
      const i = document.getElementById('nameInput');
      i.focus();
      i.value = 'Benoît';
      i.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', data: 'Benoît', bubbles: true }));
      await new Promise(res => setTimeout(res, 50));
      i.blur();
      await new Promise(res => setTimeout(res, 50));
      const l = sortiesDeChamp(), s = l[0] || {};
      const brut = localStorage.getItem('bt_clavier_sorties') || '';
      return { n: l.length, champ: s.champ, genre: s.saisie && s.saisie.genre, longueur: s.saisie && s.saisie.n, parLeJeu: Array.isArray(s.par_le_jeu), texteGarde: brut.indexOf('Beno') >= 0 };
    });
    dit('5. le relevé du clavier note la sortie d\'un champ : la nature de la saisie (jamais son texte), et que c\'est le jeu qui a retiré le curseur',
      r5.n === 1 && r5.champ === 'nameInput' && r5.genre === 'insertFromPaste' && r5.longueur === 6 && r5.parLeJeu && !r5.texteGarde, JSON.stringify(r5));
    await p.evaluate(() => { profile.name = 'Taylor'; state.screen = 'mode'; render(); });
    await p.waitForTimeout(500);
    await ctx.close();
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('6. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — les petits défauts signalés sont corrigés');
  process.exit(ko ? 1 : 0);
})();
