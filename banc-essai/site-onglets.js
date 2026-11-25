/* ====== À PROPOS : LES ONGLETS AU JEU, LES PAGES QUI GLISSENT (v381) ======
   « Je veux que tu améliores les transitions dans À propos. »
   Sur un iPhone, le site ouvert dans le jeu :
     1. À propos s'ouvre avec la rangée des onglets du JEU (cinq, À propos
        actif, la pastille sombre dessous) ; la page du site ne montre plus
        la sienne (une seule rangée) ;
     2. toucher « Guide » (à gauche) : la nouvelle page se prépare hors de la
        vue, puis l'ancienne repart vers la droite et découvre la nouvelle,
        image par image, sans saut ; la pastille glisse jusqu'à Guide ; le
        titre dit « Guide » ; une seule page à la fin ;
     3. toucher « FAQ » (à droite) : la nouvelle page arrive de la droite,
        l'ancienne recule ; tout se pose ;
     4. un lien du site vers une autre page (un livre, depuis Quiz par livre)
        fait le même chemin, en avant, et l'onglet reste « Quiz par livre » ;
        une ancre défile dans la page ;
     5. toucher l'onglet où l'on est ne recharge rien ;
     6. l'historique ne grandit jamais (le geste retour ne ramène pas dans le
        site) ;
     7. les pages légales s'ouvrent seules, sans rangée ;
     8. en anglais, les onglets se disent en anglais ;
     9. aucune erreur.
   Usage : node banc-essai/site-onglets.js [url du jeu] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 460) + ')' : '')); };

async function ouvrir(nav, lg) {
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route(/supabase\.co|googlesyndication|doubleclick/, r => r.abort());
  await ctx.addInitScript((lg) => {
    if (!/^http/.test(location.protocol)) return;
    try { if (self !== top) return; } catch (e) { return; }
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    if (lg) localStorage.setItem('bt_langue', lg);
  }, lg);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  await p.waitForTimeout(500);
  return { ctx, p, errs };
}
const pret = (p) => p.waitForFunction(() => { const v = document.getElementById('siteVeil'); return v && v.classList.contains('site-pret') && document.querySelectorAll('#siteVeil .site-couche').length === 1; }, null, { timeout: 8000 });
const lire = (p) => p.evaluate(() => {
  const v = document.getElementById('siteVeil');
  const nav = v.querySelector('.site-onglets');
  const act = nav && nav.querySelector('.so-onglet.actif');
  const pa = nav && nav.querySelector('.so-pastille');
  const f = v.querySelector('.site-couche .site-cadre');
  let url = '', entete = null, onglets = false;
  try { url = f.contentWindow.location.href; const d = f.contentDocument; const en = d.querySelector('.entete'); entete = en ? getComputedStyle(en).display : 'absente'; onglets = d.documentElement.classList.contains('onglets-jeu'); } catch (e) { url = 'illisible'; }
  const ra = act && act.getBoundingClientRect(), rp = pa && pa.getBoundingClientRect();
  return { titre: (v.querySelector('.page-tete .st-mot') || {}).textContent, rangee: !!nav, n: nav ? nav.querySelectorAll('.so-onglet').length : 0,
    actif: act ? act.textContent : null, aria: act ? act.getAttribute('aria-current') : null,
    pastille: ra && rp ? Math.round(Math.abs((ra.left + ra.width / 2) - (rp.left + rp.width / 2))) : null,
    url: url.replace(location.origin, ''), entete, onglets, couches: v.querySelectorAll('.site-couche').length, histoire: history.length };
});
/* Filmer un passage : à chaque image, la place des couches (x), et la pastille. */
const filmer = (p, geste) => p.evaluate((geste) => new Promise(ok => {
  const v = document.getElementById('siteVeil'), pile = v.querySelector('.site-pile');
  const images = [];
  const t0 = performance.now();
  const pas = () => {
    const cs = [...pile.querySelectorAll('.site-couche')].map(c => Math.round(c.getBoundingClientRect().left - pile.getBoundingClientRect().left));
    /* la pastille, dans la rangée (qui peut défiler en même temps pour garder l'onglet en vue) */
    const pa = v.querySelector('.so-pastille'), nv = v.querySelector('.site-onglets');
    images.push({ t: Math.round(performance.now() - t0), cs, pa: pa ? Math.round(pa.getBoundingClientRect().left - nv.getBoundingClientRect().left + nv.scrollLeft) : null });
    if (performance.now() - t0 < 1800) requestAnimationFrame(pas); else ok(images);
  };
  eval(geste);
  requestAnimationFrame(pas);
}), geste);
const monotone = (xs, sens) => xs.every((x, i) => i === 0 || (sens > 0 ? x >= xs[i - 1] - 1 : x <= xs[i - 1] + 1));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const { ctx, p, errs: e1 } = await ouvrir(nav);
    const h0 = await p.evaluate(() => history.length);
    await p.evaluate(() => { openSettings(); });
    await p.waitForTimeout(600);
    await p.evaluate(() => { ouvrirSite('a-propos/'); });
    await pret(p); await p.waitForTimeout(700);
    const r1 = await lire(p);
    dit('1. À propos s\'ouvre avec la rangée du jeu (5 onglets, À propos actif, la pastille dessous) ; la page ne montre plus la sienne',
      r1.rangee && r1.n === 5 && r1.actif === 'À propos' && r1.aria === 'page' && r1.pastille !== null && r1.pastille <= 2 && r1.onglets && r1.entete === 'none' && /a-propos\/$/.test(r1.url) && r1.titre === 'À propos', JSON.stringify(r1));

    /* 2. vers la gauche : Guide */
    const f2 = await filmer(p, "allerSite(1)");
    await pret(p); await p.waitForTimeout(300);
    const r2 = await lire(p);
    const mouv2 = f2.filter(i => i.cs.length === 2);
    const anc2 = mouv2.map(i => i.cs[0]);                  // l'ancienne (première couche) repart vers la droite
    const neu2 = mouv2.map(i => i.cs[1]);                  // la nouvelle, dessous, revient de -24 %
    dit('2. « Guide » (à gauche) : l\'ancienne page repart à droite et découvre la nouvelle, sans saut ; la pastille glisse ; le titre suit ; une seule page à la fin',
      mouv2.length >= 8 && monotone(anc2, +1) && monotone(neu2, +1) && anc2[anc2.length - 1] > 200 && neu2[0] < -40
      && r2.actif === 'Guide' && r2.titre === 'Guide' && /guide\/$/.test(r2.url) && r2.couches === 1 && r2.pastille <= 2 && r2.onglets && r2.entete === 'none',
      JSON.stringify({ images: mouv2.length, anc: anc2.filter((x, i) => i % 4 === 0), neu: neu2.filter((x, i) => i % 4 === 0), r2 }));

    /* 3. vers la droite : FAQ */
    const f3 = await filmer(p, "allerSite(3)");
    await pret(p); await p.waitForTimeout(300);
    const r3 = await lire(p);
    const mouv3 = f3.filter(i => i.cs.length === 2);
    const anc3 = mouv3.map(i => i.cs[0]), neu3 = mouv3.map(i => i.cs[1]);
    const pas3 = f3.map(i => i.pa).filter(x => x !== null);
    dit('3. « FAQ » (à droite) : la nouvelle page arrive de la droite, l\'ancienne recule ; la pastille glisse vers la droite ; tout se pose',
      mouv3.length >= 8 && monotone(neu3, -1) && monotone(anc3, -1) && neu3[0] > 200 && anc3[anc3.length - 1] < -40 && monotone(pas3, +1) && pas3[pas3.length - 1] > pas3[0] + 40
      && r3.actif === 'FAQ' && /faq\/$/.test(r3.url) && r3.couches === 1,
      JSON.stringify({ images: mouv3.length, neu: neu3.filter((x, i) => i % 4 === 0), anc: anc3.filter((x, i) => i % 4 === 0), r3 }));

    /* 4. un lien du site : Quiz par livre, puis un livre ; une ancre */
    await p.evaluate(() => allerSite(0)); await pret(p); await p.waitForTimeout(700);
    const f4 = await filmer(p, "document.querySelector('#siteVeil .site-cadre').contentDocument.querySelector('a[href=\"genese/\"]').click()");
    await pret(p); await p.waitForTimeout(300);
    const r4 = await lire(p);
    const neu4 = f4.filter(i => i.cs.length === 2).map(i => i.cs[1]);
    const ancre = await p.evaluate(async () => {
      const f = document.querySelector('#siteVeil .site-cadre'), d = f.contentDocument;
      const a = d.querySelector('a[href="#moyen"]'); const avant = f.contentWindow.scrollY; a.click();
      await new Promise(r => setTimeout(r, 900));
      return { avant, apres: Math.round(f.contentWindow.scrollY), hash: f.contentWindow.location.hash };
    });
    dit('4. un lien vers un livre : la page arrive de la droite, l\'onglet reste « Quiz par livre » ; une ancre défile dans la page, sans toucher à l\'adresse',
      neu4.length >= 8 && monotone(neu4, -1) && neu4[0] > 200 && /quiz-biblique\/genese\/$/.test(r4.url) && r4.actif === 'Quiz par livre' && ancre.apres > ancre.avant + 100 && ancre.hash === '',
      JSON.stringify({ neu: neu4.filter((x, i) => i % 4 === 0), r4, ancre }));

    /* 5. l'onglet où l'on est */
    const r5 = await p.evaluate(async () => {
      const f = document.querySelector('#siteVeil .site-cadre');
      allerSite(0);
      await new Promise(r => setTimeout(r, 120));
      return { couches: document.querySelectorAll('#siteVeil .site-couche').length, meme: document.querySelector('#siteVeil .site-cadre') === f };
    });
    await p.evaluate(() => allerSite(0)); await pret(p);
    const r5b = await p.evaluate(async () => {
      const f = document.querySelector('#siteVeil .site-cadre');
      f.contentWindow.scrollTo(0, 900);
      await new Promise(r => setTimeout(r, 100));
      allerSite(0);
      await new Promise(r => setTimeout(r, 900));
      return { couches: document.querySelectorAll('#siteVeil .site-couche').length, meme: document.querySelector('#siteVeil .site-cadre') === f, haut: Math.round(f.contentWindow.scrollY) };
    });
    dit('5. toucher l\'onglet où l\'on est ne recharge rien (et remonte la page en haut)', r5b.couches === 1 && r5b.meme && r5b.haut < 40, JSON.stringify({ r5, r5b }));

    /* 6. l'historique */
    const h1 = await p.evaluate(() => history.length);
    dit('6. l\'historique ne grandit jamais', h1 === h0, JSON.stringify({ avant: h0, apres: h1 }));

    /* 7. une page légale */
    await p.evaluate(() => { fermerFeuilleGroupe('siteVeil'); });
    await p.waitForTimeout(700);
    await p.evaluate(() => { ouvrirSite('mentions-legales/', 'Mentions légales'); });
    await pret(p); await p.waitForTimeout(500);
    const r7 = await lire(p);
    dit('7. les mentions légales s\'ouvrent seules, sans rangée, et sans celle de la page', !r7.rangee && r7.titre === 'Mentions légales' && r7.entete === 'none' && /mentions-legales\/$/.test(r7.url), JSON.stringify(r7));
    e1.forEach(x => errs.push(x));
    await ctx.close();

    /* 8. en anglais */
    const o = await ouvrir(nav, 'en');
    await o.p.evaluate(() => { ouvrirSite('guide/'); });
    await pret(o.p); await o.p.waitForTimeout(500);
    const r8 = await o.p.evaluate(() => [...document.querySelectorAll('#siteVeil .so-onglet')].map(b => b.textContent));
    dit('8. en anglais, les onglets se disent en anglais', r8.join('|') === 'Quiz by book|Guide|What\'s new|FAQ|About', JSON.stringify(r8));
    o.errs.forEach(x => errs.push(x));
    await o.ctx.close();
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('9. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — une rangée d\'onglets qui ne bouge pas, une pastille qui glisse, des pages qui arrivent en glissant');
  process.exit(ko ? 1 : 0);
})();
