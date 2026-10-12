/* ====== UN SEUL GESTE POUR REVENIR D'UNE PAGE (v318) ======
   « Lorsque je déplace la page, on dirait qu'il reste encore l'ancienne
     version qui bug. » (capture de Taylor, iPhone : en tirant la page d'un
     groupe depuis le bord gauche, on voyait dessous la discussion figée,
     coupée net, puis un second morceau de la discussion, puis la page.)
   DEUX GESTES PARTAIENT ENSEMBLE. Une page ouverte posait une marque dans
   l'historique, pour que le bouton retour d'Android la referme. Sur iPhone,
   cette marque réveille le geste « retour » d'iOS : il fait glisser
   l'application ENTIÈRE et montre dessous une photo de l'écran prise quand
   la marque a été posée — « l'ancienne version ». Pendant ce temps, notre
   propre geste faisait glisser la page dans l'application.
   Ce banc ne peut pas lancer le geste d'iOS (il appartient au téléphone,
   pas à la page) ; il garde ce qui le réveille : une marque dans
   l'historique d'un iPhone. Et il vérifie qu'Android garde son bouton
   retour.
   CE QU'IL EXIGE :
   sur iPhone —
     1. ouvrir une page ne pose aucune marque : l'historique ne bouge pas ;
     2. une page ouverte depuis une page non plus ;
     3. notre geste du bord ramène toujours : la page suit le doigt, l'écran
        de dessous se voit pendant qu'on tire, et la page se referme ;
     3b. sur une page posée sur une autre (Réglages, puis Version de la
        Bible), le geste ne referme QUE celle du dessus : on revient aux
        Réglages, pas à l'accueil. (« Je dois revenir à la page précédente,
        pas directement sur le menu. » Avec deux gestes à la fois, le nôtre
        refermait la page du dessus et celui d'iOS, en remontant
        l'historique, refermait celle d'en dessous.) ;
     4. le bouton retour referme, et l'historique n'a toujours pas bougé ;
   sur Android —
     5. une page pose UNE marque, et une page par-dessus n'en ajoute pas ;
     6. le retour du téléphone referme la page du dessus, puis celle du
        dessous ;
     7. une page refermée à l'écran retire sa marque ;
     8. aucune erreur.
   Usage : node banc-essai/historique-page.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const ouvrir = async (ua) => {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(1200);
    return { ctx, p };
  };
  const histoire = (p) => p.evaluate(() => ({ n: history.length, marque: !!(history.state && history.state.yada) }));
  const pages = (p) => p.evaluate(() => [...document.querySelectorAll('.sheet-veil.page:not(.closing)')].map(v => v.id));
  try {
    /* ---------- iPhone ---------- */
    {
      const { ctx, p } = await ouvrir(IOS);
      const avant = await histoire(p);
      await p.evaluate(() => openSettings());
      await p.waitForTimeout(1300);
      const une = await histoire(p);
      dit('1. iPhone : ouvrir une page ne pose aucune marque', une.n === avant.n && !une.marque, 'historique ' + avant.n + ' -> ' + une.n + (une.marque ? ', marqué' : ''));
      await p.evaluate(() => openBibles());
      await p.waitForTimeout(1300);
      const deux = await histoire(p), p2 = await pages(p);
      dit('2. iPhone : une page par-dessus une page non plus', p2.length === 2 && deux.n === avant.n && !deux.marque, p2.join(' + ') + ', historique ' + deux.n);
      await p.evaluate(() => closeBibles());
      await p.waitForTimeout(900);
      /* Le geste du bord, au vrai doigt : la page doit suivre, et l'écran de
         dessous se voir pendant qu'on tire. */
      const cdp = await ctx.newCDPSession(p);
      const doigt = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      await doigt('touchStart', 6, 420);
      for (let i = 1; i <= 6; i++) { await doigt('touchMove', 6 + i * 18, 422); await p.waitForTimeout(16); }
      const pendant = await p.evaluate(() => {
        const v = document.getElementById('settingsVeil');
        return { x: v ? Math.round(v.getBoundingClientRect().left) : -1, dessous: getComputedStyle(document.getElementById('app')).visibility };
      });
      for (let i = 7; i <= 12; i++) { await doigt('touchMove', 6 + i * 18, 422); await p.waitForTimeout(16); }
      await doigt('touchEnd'); await p.waitForTimeout(900);
      const apres = await pages(p);
      dit('3. iPhone : notre geste du bord ramène toujours', pendant.x > 40 && pendant.dessous === 'visible' && apres.length === 0,
        'page à ' + pendant.x + ' px sous le doigt, écran de dessous ' + pendant.dessous + ', ' + (apres.length ? 'page restée : ' + apres.join(',') : 'page refermée'));
      /* 3b. Deux pages l'une sur l'autre : le bord ne referme que celle du dessus. */
      await p.evaluate(() => openSettings());
      await p.waitForTimeout(1300);
      await p.evaluate(() => openBibles());
      await p.waitForTimeout(1300);
      const avant3b = await pages(p);
      await doigt('touchStart', 6, 420);
      for (let i = 1; i <= 12; i++) { await doigt('touchMove', 6 + i * 18, 422); await p.waitForTimeout(16); }
      await doigt('touchEnd'); await p.waitForTimeout(1000);
      const apres3b = await pages(p), h3b = await histoire(p);
      dit('3b. iPhone : sur une page posée sur une autre, le bord ne referme que celle du dessus', avant3b.join(',') === 'settingsVeil,biblesVeil' && apres3b.join(',') === 'settingsVeil' && h3b.n === avant.n,
        (avant3b.join(' + ') || 'rien') + ' -> ' + (apres3b.join(' + ') || 'rien') + ', historique ' + h3b.n);
      await p.evaluate(() => { const b = document.querySelector('#settingsVeil .sheet-grab'); if (b) b.click(); });
      await p.waitForTimeout(900);
      await p.evaluate(() => openSettings());
      await p.waitForTimeout(1300);
      await p.evaluate(() => { const b = document.querySelector('#settingsVeil .sheet-grab'); if (b) b.click(); });
      await p.waitForTimeout(900);
      const fin = await histoire(p), restent = await pages(p);
      dit('4. iPhone : le bouton retour referme, l\'historique n\'a pas bougé', restent.length === 0 && fin.n === avant.n && !fin.marque, 'historique ' + avant.n + ' -> ' + fin.n);
      await ctx.close();
    }
    /* ---------- Android ---------- */
    {
      const { ctx, p } = await ouvrir(ANDROID);
      const avant = await histoire(p);
      await p.evaluate(() => openSettings());
      await p.waitForTimeout(1300);
      const une = await histoire(p);
      await p.evaluate(() => openBibles());
      await p.waitForTimeout(1300);
      const deux = await histoire(p);
      dit('5. Android : une page pose UNE marque, une page par-dessus n\'en ajoute pas', une.marque && une.n === avant.n + 1 && deux.n === une.n, 'historique ' + avant.n + ' -> ' + une.n + ' -> ' + deux.n);
      await p.evaluate(() => history.back());
      await p.waitForTimeout(1000);
      const r1 = await pages(p);
      await p.evaluate(() => history.back());
      await p.waitForTimeout(1000);
      const r2 = await pages(p);
      dit('6. Android : le retour du téléphone referme la page du dessus, puis celle du dessous', r1.length === 1 && r1[0] === 'settingsVeil' && r2.length === 0, (r1.join(',') || 'rien') + ' puis ' + (r2.join(',') || 'rien'));
      await p.evaluate(() => openSettings());
      await p.waitForTimeout(1300);
      await p.evaluate(() => { const b = document.querySelector('#settingsVeil .sheet-grab'); if (b) b.click(); });
      await p.waitForTimeout(1000);
      const fin = await histoire(p);
      dit('7. Android : une page refermée à l\'écran retire sa marque', !fin.marque && (await pages(p)).length === 0, fin.marque ? 'marque restée' : 'plus de marque');
      await ctx.close();
    }
    dit('8. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un seul geste pour revenir d\'une page');
  process.exit(ko ? 1 : 0);
})();
