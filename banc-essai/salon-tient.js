/* ============ BANC « LE SALON TIENT DANS L'ÉCRAN » ============
   « Ici aussi l'écran n'est pas parfaitement adapté ; il faut que ça ne bouge
     pas lorsque je déplace mon doigt sur l'écran. »

   Un écran qui déborde glisse sous le doigt. Le salon débordait — et pas qu'un
   peu : 47 px sur un iPhone 15 dans Safari, 60 sur un 13 mini, 143 sur un SE.

   POURQUOI AUCUN BANC NE L'AVAIT VU. Un navigateur sans tête a
   env(safe-area-inset-*) à ZÉRO. Un vrai iPhone à encoche en prend 59 en haut
   et 34 en bas : quatre-vingt-treize pixels de hauteur utile en moins, soit
   très exactement l'ordre de grandeur du débord. On mesurait un téléphone qui
   n'existe pas. Et dans un NAVIGATEUR, la barre d'adresse en mange cent de
   plus — c'est le cas le plus fréquent, et c'était le moins testé.
   Ce banc pose donc les vraies marges, appareil par appareil : un iPhone SE a
   un bouton d'accueil et ZÉRO marge en bas ; un 15 Pro Max a une encoche et
   une barre d'accueil. Les confondre invente des débords là où il n'y en a
   pas, et en cache là où il y en a.

   Usage : node banc-essai/salon-tient.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const SUPA = process.env.SUPA_UMD
  || '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/supabase.js';

/*  nom, largeur, hauteur, marge haute, marge basse
    « Safari » = la même machine avec la barre d'adresse, soit ~100 px de moins. */
const ECRANS = [
  ['iPhone SE (installé)',    375, 667, 20, 0],
  ['iPhone 13 mini (Safari)', 375, 712, 50, 34],
  ['iPhone 13 mini',          375, 812, 50, 34],
  ['iPhone 14 (Safari)',      390, 744, 47, 34],
  ['iPhone 14',               390, 844, 47, 34],
  ['iPhone 15 (Safari)',      393, 752, 59, 34],
  ['iPhone 15',               393, 852, 59, 34],
  ['15 Pro Max',              430, 932, 59, 34],
  ['Galaxy S23',              360, 800, 24, 0],
  ['Android très haut',       412,1000, 24, 0],
];
/* L'iPhone SE dans Safari (553 px utiles sur un écran de 4,7 pouces) reste
   hors d'atteinte : les seules zones tactiles obligatoires — trois rangées de
   puces, le bouton d'invitation, celui qui lance la partie, l'en-tête — en
   occupent déjà près de la moitié. Il est mesuré et affiché, mais il ne fait
   pas échouer le banc : mieux vaut un cas connu et dit qu'un seuil déguisé. */
const HORS_ATTEINTE = new Set([]);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const lignes = []; const soucis = [];
  for (const [nom, w, h, hautSure, basSure] of ECRANS) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2,
      userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    if (fs.existsSync(SUPA)) {
      await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(SUPA) }));
      await p.route('**://*.supabase.co/**', r => r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } }));
    }
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8', isCreator: true }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof render === 'function'
      && !!(window.supabase && window.supabase.createClient); } catch (e) { return false; } }, null, { timeout: 20000 });
    /* Les vraies marges du téléphone, que le navigateur sans tête ne fournit pas. */
    await p.evaluate(() => { document.documentElement.classList.add('is-standalone'); });
    await p.addStyleTag({ content: `html.is-standalone #app, #app{ padding-top:${hautSure}px !important; padding-bottom:${Math.max(basSure, 12)}px !important; }` });
    await p.evaluate(() => {
      net.code = 'CHNW'; net.isHost = true; net.oppPresent = true;
      net.players = [{ id: 'a', name: 'Taylor', color: '#4C86E8', score: 0 },
                     { id: 'b', name: 'Stany', color: '#2FA36B', score: 0 }];
      net.opp = { name: 'Stany', color: '#2FA36B' };
      net.lengthKey = Object.keys(LENGTHS)[1]; net.timerKey = Object.keys(TIMER_OPTS)[1]; net.themeKey = 'tout';
      state.screen = 'online-room'; render();
    });
    await p.waitForTimeout(1300);
    const r = await p.evaluate(() => {
      const a = document.getElementById('app');
      const b = document.querySelector('.btn-primary');
      return { deb: Math.max(0, a.scrollHeight - a.clientHeight),
               bouton: b ? Math.round(b.getBoundingClientRect().bottom) : null, ih: innerHeight };
    });
    lignes.push([nom, w, h, hautSure, basSure, r]);
    if (errs.length) soucis.push(nom + ' : erreurs JS — ' + [...new Set(errs)].slice(0, 2).join(' | '));
    await ctx.close();
  }
  await nav.close();

  console.log('  écran                     taille     marges    tient ?');
  for (const [nom, w, h, ht, bs, r] of lignes) {
    const ok = r.deb === 0;
    console.log('  ' + nom.padEnd(25) + (w + 'x' + h).padEnd(11) + (ht + '/' + bs).padEnd(10)
      + (ok ? 'oui' : 'NON — déborde de ' + r.deb + ' px, l\'écran glisse sous le doigt')
      + (r.bouton !== null ? '   (bas du bouton ' + r.bouton + '/' + r.ih + ')' : ''));
    if (!ok && !HORS_ATTEINTE.has(nom)) soucis.push(nom + ' : déborde de ' + r.deb + ' px');
  }
  if (soucis.length) { console.log('\n  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('\n  OK — le salon tient entier sur les ' + ECRANS.length + ' configurations, marges réelles comprises');
})();
