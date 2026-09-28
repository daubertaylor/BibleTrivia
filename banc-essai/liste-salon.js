/* ============ BANC « LA LISTE DU SALON DÉFILE SOUS SON PROPRE VERRE » ============
   « Je veux que même s'il n'y en a que deux, ça reste pareil, de haut en bas,
     et pas sur les côtés. » (Taylor)

   La liste des joueurs sert maintenant de deux à huit. À huit, elle ne tient
   pas sur un écran de 4,7 pouces — mesuré, 277 px de débord — donc elle défile
   DANS SA PROPRE FENÊTRE pendant que le code reste en haut et le bouton en bas.

   CE QUE CE BANC SURVEILLE, ET POURQUOI IL EXISTE. Le moteur de verre déduit
   la position d'une surface de #app de son offset en page moins le défilement
   de #app. C'est exact — et faux dès qu'un SECOND défilement s'intercale. Le
   jour où la liste est devenue défilante, ses rangées montaient de 140 px
   pendant que leur décor restait à 0 : le verre voyageait AVEC la rangée au
   lieu de rester la fenêtre par laquelle on voit le paysage. Témoin mesuré
   avant/après : −140 px / 0 px.
   LE VERRE EST UNE FENÊTRE, PAS UNE PEINTURE : on ne mesure donc pas si la
   couche « suit » la rangée — elle doit faire exactement l'inverse, rester
   IMMOBILE à l'écran pendant que la rangée glisse dessus.

   Usage : node banc-essai/liste-salon.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const SUPA = process.env.SUPA_UMD
  || '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/supabase.js';
/* nom, UA, largeur, hauteur, marge haute, marge basse */
const CAS = [
  ['iPhone SE',  IOS, 375, 667, 20, 0],
  ['iPhone 15',  IOS, 393, 852, 59, 34],
  ['Galaxy S23', AND, 360, 800, 24, 0],
];
const soucis = [];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [nom, ua, w, h, ht, bs] of CAS) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2,
      userAgent: ua, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    if (fs.existsSync(SUPA)) {
      await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(SUPA) }));
      await p.route('**://*.supabase.co/**', r => r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } }));
    }
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof render === 'function'
      && !!(window.supabase && window.supabase.createClient); } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.evaluate(() => { document.documentElement.classList.add('is-standalone'); });
    await p.addStyleTag({ content: `html.is-standalone #app, #app{ padding-top:${ht}px !important; padding-bottom:${Math.max(bs, 12)}px !important; }` });
    await p.evaluate(() => {
      const N = [['Stany','#2FA36B'],['Myriam','#9B5DE5'],['Jonathan','#F1B24A'],
                 ['Élisabeth','#E8734C'],['Barnabé','#4C86E8'],['Priscille','#2FA3A3'],['Zacharie','#B45DE5']];
      net.code = 'CHNW'; net.isHost = true; net.joueurs = {};
      for (let i = 0; i < 7; i++) { const [n, c] = N[i];
        net.joueurs['j' + i] = { id:'j'+i, name:n, color:c, score:0, idx:0, done:false, gone:false, vu:Date.now() }; }
      majAdversaire();
      net.lengthKey = Object.keys(LENGTHS)[1]; net.timerKey = Object.keys(TIMER_OPTS)[1]; net.themeKey = 'tout';
      state.screen = 'online-room'; render();
    });
    await p.waitForTimeout(1400);

    const lire = () => p.evaluate(() => {
      const li = document.querySelector('.salle-liste');
      const r = document.querySelectorAll('.salle-ligne')[1];
      const gs = r ? r.querySelector('.gs') : null;
      const a = document.getElementById('app');
      return { st: li ? li.scrollTop : -1, reste: li ? (li.scrollHeight - li.clientHeight) : -1,
               rangee: r ? r.getBoundingClientRect().top : NaN,
               decor: gs ? gs.getBoundingClientRect().top : NaN,
               voileH: li ? li.style.getPropertyValue('--voile-h') : '',
               voileB: li ? li.style.getPropertyValue('--voile-b') : '',
               page: Math.max(0, a.scrollHeight - a.clientHeight) };
    });

    const a = await lire();
    await p.evaluate(() => { document.querySelector('.salle-liste').scrollTop = 140; });
    await p.waitForTimeout(700);
    const b = await lire();

    const dRangee = b.rangee - a.rangee;
    const dDecor = b.decor - a.decor;
    console.log('  ' + nom.padEnd(11)
      + 'page ' + (b.page === 0 ? 'stable' : 'DÉBORDE de ' + b.page + ' px').padEnd(10)
      + '  liste à défiler ' + String(b.reste).padStart(4) + ' px'
      + '  rangée ' + dRangee.toFixed(0).padStart(5) + ' px'
      + '  décor ' + dDecor.toFixed(1).padStart(6) + ' px'
      + '  voile ' + (a.voileB || '0px') + ' → ' + (b.voileH || '0px') + '/' + (b.voileB || '0px'));

    if (b.page > 0) soucis.push(nom + ' : la page déborde de ' + b.page + ' px — elle glisse sous le doigt');
    if (!(b.reste > 0)) soucis.push(nom + ' : la liste ne défile pas alors qu\'il y a huit joueurs');
    if (!(dRangee < -100)) soucis.push(nom + ' : la rangée n\'a pas bougé avec le défilement');
    if (!(Math.abs(dDecor) < 2)) soucis.push(nom + ' : le décor voyage avec la rangée (' + dDecor.toFixed(1) + ' px) — le verre n\'est plus une fenêtre');
    if (!(parseFloat(b.voileH) > 0)) soucis.push(nom + ' : pas de fondu en haut alors qu\'il reste des joueurs au-dessus');
    if (!(parseFloat(a.voileB) > 0)) soucis.push(nom + ' : pas de fondu en bas alors qu\'il reste des joueurs en dessous');
    if (errs.length) soucis.push(nom + ' : erreurs JS — ' + [...new Set(errs)].slice(0, 2).join(' | '));
    await ctx.close();
  }
  await nav.close();
  if (soucis.length) { console.log('\n  DÉFAUTS :'); soucis.forEach(x => console.log('   ' + x)); process.exit(1); }
  console.log('\n  OK — la page ne bouge pas, la liste défile, son décor reste fixe derrière,\n       et le fondu dit des deux côtés qu\'il reste des joueurs à voir');
})();
