/* ====== BANC « UNE NOTIFICATION SE VOIT, MÊME LONGUE » (v334) ======
   « Fais en sorte que les notifications s'affichent correctement, parce que
     si la notification est trop grande, par exemple sur iPhone, elle ne se
     voit pas. Il faut qu'elle se voie. » Chaque surface du jeu qui annonce
   quelque chose, avec un contenu extrême, sur un iPhone SE, un iPhone 15, un
   iPhone Pro Max et un Android :
     1. le bandeau d'un autre groupe : un message de 300 caractères se lit
        sur QUATRE lignes (au lieu d'une, coupée après trente caractères), le
        nom du groupe garde sa ligne, et tout le bandeau est dans l'écran ;
     2. le petit message : il prend la largeur de l'écran (et non la moitié),
        chaque ligne de texte reste DANS sa forme arrondie, et l'adresse du jeu
        (un seul mot de 44 lettres) ne sort pas de l'écran ;
     3. le petit message reste le temps d'être lu : une phrase de cent
        caractères au moins 5 s, « Lien copié ! » toujours 2,1 s ;
     4. le bandeau d'un succès : entier, dans l'écran ;
     5. aucune erreur.
   Avant la v334 : le message coupé à « Bonjour … », le petit message dans
   188 px de large, ses lignes hors de la pilule, et 2,1 s pour tout.
   Usage : node banc-essai/notifs-visibles.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const TELS = [['iPhone SE', 375, 667, IOS], ['iPhone 15', 393, 852, IOS], ['iPhone Pro Max', 430, 932, IOS], ['Android', 412, 915, AND]];
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 300) + ')' : '')); };
const LONG = "Bonjour à tous ! Je voulais vous dire que la réunion de prière de jeudi soir est déplacée à vendredi, même heure, chez Marie-Thérèse. Pensez à apporter vos Bibles et de quoi partager un petit repas ensemble après, ce sera l'occasion de faire connaissance avec les nouveaux du groupe.";
const PHRASE = "Ce message ne peut pas partir : il contient un mot que la communauté a choisi d'écarter. Reformule-le, et il partira.";

/* Dans la page : chaque ligne d'un texte est-elle dans la forme arrondie de
   sa boîte ? On prend les quatre coins de chaque ligne et on les teste
   contre le rectangle arrondi (rayon réellement utilisé, ramené à la
   moitié de la hauteur comme le fait le navigateur). */
const DEDANS = () => {
  window.__lignesDedans = (boite) => {
    const r = boite.getBoundingClientRect(), cs = getComputedStyle(boite);
    let rad = parseFloat(cs.borderTopLeftRadius) || 0;
    rad = Math.min(rad, r.height / 2, r.width / 2);
    const dans = (x, y) => {
      if (x < r.left - 0.5 || x > r.right + 0.5 || y < r.top - 0.5 || y > r.bottom + 0.5) return false;
      const cx = x < r.left + rad ? r.left + rad : (x > r.right - rad ? r.right - rad : x);
      const cy = y < r.top + rad ? r.top + rad : (y > r.bottom - rad ? r.bottom - rad : y);
      return Math.hypot(x - cx, y - cy) <= rad + 0.5;
    };
    const hors = [];
    const tw = document.createTreeWalker(boite, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const l of rg.getClientRects()) {
        if (l.width < 2) continue;
        /* Les coins de la ligne, rentrés d'un pixel (l'anticrénelage). */
        const pts = [[l.left + 1, l.top + 2], [l.right - 1, l.top + 2], [l.left + 1, l.bottom - 2], [l.right - 1, l.bottom - 2]];
        if (!pts.every(([x, y]) => dans(x, y))) hors.push(Math.round(l.left) + ',' + Math.round(l.top) + ' ' + Math.round(l.width) + 'x' + Math.round(l.height));
      }
    }
    return { hors, boite: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], rayon: Math.round(rad) };
  };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const [tel, w, h, ua] of TELS) {
      console.log('  — ' + tel + ' (' + w + '×' + h + ')');
      const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(DEDANS);
      await p.waitForTimeout(800);

      /* 1. le bandeau d'un autre groupe */
      await p.evaluate((l) => montrerBandeau({ id: 'g-1', nom: 'Les amis de la paroisse Saint-Jean-Bapt', teinte: 2 }, 'Marie-Thérèse te mentionne : ' + l), LONG);
      await p.waitForTimeout(900);
      const b = await p.evaluate(() => {
        const e = document.getElementById('bandeauMsg'), r = e.getBoundingClientRect();
        const s = e.querySelector('.bm-t small'), nom = e.querySelector('.bm-t b');
        const lh = parseFloat(getComputedStyle(s).lineHeight);
        return { dedans: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
          lignes: Math.round(s.getBoundingClientRect().height / lh), nomLignes: Math.round(nom.getBoundingClientRect().height / (parseFloat(getComputedStyle(nom).lineHeight) || nom.getBoundingClientRect().height)),
          lu: s.textContent.length };
      });
      dit('1. le bandeau d\'un autre groupe : le message sur quatre lignes, le nom sur la sienne, tout dans l\'écran', b.dedans && b.lignes === 4 && b.nomLignes === 1, JSON.stringify(b));
      await p.evaluate(() => cacherBandeau());
      await p.waitForTimeout(600);

      /* 2 et 3. le petit message */
      const t0 = await p.evaluate((ph) => { showMiniToast(ph); return performance.now(); }, PHRASE);
      await p.waitForTimeout(500);
      const m = await p.evaluate(() => { const e = document.querySelector('.mini-toast'); const r = e.getBoundingClientRect();
        return Object.assign(__lignesDedans(e), { large: Math.round(r.width), dispo: innerWidth, dansEcran: r.left >= 0 && r.right <= innerWidth }); });
      dit('2. le petit message : la largeur de l\'écran, chaque ligne dans sa forme arrondie', m.large >= (m.dispo - 40) * 0.8 && !m.hors.length && m.dansEcran,
        m.large + ' px sur ' + m.dispo + ' · rayon ' + m.rayon + ' · hors de la forme : ' + (m.hors.join(' ; ') || 'aucune'));
      const fin = await p.evaluate(() => new Promise((ok) => { const e = document.querySelector('.mini-toast'); const deb = performance.now();
        const pas = () => { if (!e.classList.contains('show')) ok(performance.now()); else if (performance.now() - deb > 9000) ok(-1); else requestAnimationFrame(pas); }; pas(); }));
      const dure = fin < 0 ? 9999 : fin - t0;
      await p.waitForTimeout(400);
      const t1 = await p.evaluate(() => { showMiniToast(T('Lien copié !')); return performance.now(); });
      const fin2 = await p.evaluate(() => new Promise((ok) => { const e = document.querySelector('.mini-toast'); const deb = performance.now();
        const pas = () => { if (!e.classList.contains('show')) ok(performance.now()); else if (performance.now() - deb > 9000) ok(-1); else requestAnimationFrame(pas); }; requestAnimationFrame(pas); }));
      const dure2 = fin2 < 0 ? 9999 : fin2 - t1;
      dit('3. le temps de le lire : la phrase au moins 5 s, « Lien copié ! » 2,1 s', dure >= 5000 && dure <= 7000 && dure2 >= 2000 && dure2 <= 2400, Math.round(dure) + ' ms · ' + Math.round(dure2) + ' ms');
      await p.waitForTimeout(400);
      await p.evaluate(() => showMiniToast(GAME_URL));
      await p.waitForTimeout(500);
      const u = await p.evaluate(() => { const e = document.querySelector('.mini-toast'); const r = e.getBoundingClientRect();
        return Object.assign(__lignesDedans(e), { dansEcran: r.left >= 0 && r.right <= innerWidth, deborde: e.scrollWidth > e.clientWidth + 1 }); });
      dit('   l\'adresse du jeu (un mot de 44 lettres) reste dans l\'écran et dans sa forme', u.dansEcran && !u.deborde && !u.hors.length, JSON.stringify(u));
      await p.waitForTimeout(3200);

      /* 4. un succès */
      await p.evaluate(() => { achToastQueue.push({ clr: 'gold', ico: '', tete: 'Objectif débloqué', t: 'Lire les quatre Évangiles en entier, de Matthieu jusqu\'à Jean, sans aucune erreur' }); pumpAchToast(); });
      await p.waitForTimeout(900);
      const a = await p.evaluate(() => { const e = document.querySelector('.ach-toast'); const r = e.getBoundingClientRect(); const s = e.querySelector('small');
        return { dedans: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, coupe: s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 1 }; });
      dit('4. le bandeau d\'un succès : entier, dans l\'écran', a.dedans && !a.coupe, JSON.stringify(a));
      await ctx.close();
    }
    dit('5. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — chaque annonce du jeu se lit en entier, à l\'écran, le temps qu\'il faut');
  process.exit(ko ? 1 : 0);
})();
