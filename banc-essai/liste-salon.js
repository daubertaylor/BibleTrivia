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
    /* ===== ET IL NE DOIT RIEN DÉCOUVRIR AU DÉGEL =====
       « Lors de l'ouverture de ce menu, au niveau de l'affichage des joueurs,
       l'effet de verre change brusquement. » Ma première façon de faire suivre
       le défilement à ces rangées était de leur faire LIRE leur position réelle,
       comme les surfaces d'une feuille. Ça marchait pour le défilement et ça
       cassait l'ARRIVÉE : pendant une transition d'écran le moteur est gelé,
       tout glisse sur le compositeur, et une surface qui lit sa position
       découvre d'un coup au dégel qu'elle a voyagé. Mesuré : 120 px de saut à
       641 ms sur un iPhone 15, 94 sur un SE — pile à la fin de la transition.
       ON COMPARE À UN TÉMOIN, et c'est indispensable : pendant l'entrée, TOUTES
       les surfaces de l'écran voyagent avec lui, c'est l'animation. Ce qu'on
       refuse, c'est que la rangée bouge PLUS que le reste de son écran. */
    await p.evaluate(() => { state.screen = 'online'; render(); });
    await p.waitForTimeout(900);
    const entree = await p.evaluate(() => new Promise((res) => {
      state.screen = 'online-room'; render();
      const im = []; const t0 = performance.now();
      const tic = () => {
        const l = document.querySelector('.salle-ligne');
        const gs = l ? l.querySelector('.gs') : null;
        /* UN VRAI TÉMOIN EST UNE SURFACE DE VERRE. Ma première version prenait
           .code-hero, qui n'est pas dans GLASS_SEL : il n'a pas de couche, le
           témoin lisait 0, et le banc accusait la rangée de sauter toute seule
           alors que c'est tout l'écran qui glisse. Le bouton de lancement, lui,
           est du verre et il est toujours là pour l'hôte. */
        const tem = document.querySelector('.btn-primary, .len-chip');
        const tgs = tem ? tem.querySelector('.gs') : null;
        const t = performance.now() - t0;
        if (gs) im.push([t, gs.getBoundingClientRect().top, tgs ? tgs.getBoundingClientRect().top : null]);
        if (t < 1400) requestAnimationFrame(tic);
        else {
          let pire = 0, quand = 0, pireT = 0;
          for (let i = 1; i < im.length; i++) {
            const d = Math.abs(im[i][1] - im[i - 1][1]);
            if (d > pire) { pire = d; quand = im[i][0]; }
            if (im[i][2] !== null && im[i - 1][2] !== null) {
              const dt = Math.abs(im[i][2] - im[i - 1][2]); if (dt > pireT) pireT = dt;
            }
          }
          res({ pire: +pire.toFixed(1), quand: Math.round(quand), temoin: +pireT.toFixed(1), images: im.length });
        }
      };
      requestAnimationFrame(tic);
    }));
    const enFamille = entree.pire <= entree.temoin + 1.5;
    console.log('  ' + ''.padEnd(11) + 'à l\'ouverture : rangée ' + String(entree.pire).padStart(6)
      + ' px @' + String(entree.quand).padStart(4) + ' ms, témoin ' + String(entree.temoin).padStart(6) + ' px  '
      + (enFamille ? 'même famille' : 'LA RANGÉE SAUTE PLUS QUE SON ÉCRAN'));
    if (!enFamille) soucis.push(nom + ' : à l\'ouverture, la rangée saute de ' + entree.pire
      + ' px quand son écran n\'en fait que ' + entree.temoin);

    /* ===== ET CHAQUE RANGÉE DOIT AVOIR SON VERRE, QUEL QUE SOIT SON CHEMIN =====
       « Au niveau des joueurs, l'effet de verre se décale certaines fois à
       l'ouverture. » Le « certaines fois » disait tout : une rangée dessinée
       par le rendu complet avait sa couche de décor, une rangée créée par
       majSalleListe (l'arrivée d'un joueur, qui tombe quand le réseau répond)
       n'en avait AUCUNE. Le moteur garde ses surfaces en cache et ne les
       recompte qu'au changement de génération ; ce chemin-là n'en changeait
       pas.
       LA MESURE EST ABSOLUE, SANS TÉMOIN. Une couche .gs porte le paysage à la
       taille de l'écran, posée en haut à gauche de sa surface puis décalée :
       si le moteur est juste, TOUTES les couches de l'écran ont leur origine
       au même endroit — celle du fond. Une rangée qui s'en écarte montre un
       autre morceau de paysage que sa voisine. */
    const verres = await p.evaluate(async () => {
      const N = [['Stany','#2FA36B'],['Myriam','#9B5DE5'],['Jonathan','#F1B24A'],['Élisabeth','#E8734C']];
      net.joueurs = {}; majAdversaire(); state.screen = 'online-room'; render();
      await new Promise(r => setTimeout(r, 900));
      const vus = [];
      const releve = (quand) => {
        const t = document.querySelector('.len-chip .gs, .btn-primary .gs');
        const ref = t ? t.getBoundingClientRect().top : null;
        document.querySelectorAll('.salle-ligne').forEach((r, i) => {
          const gs = r.querySelector('.gs');
          vus.push({ quand, i, sans: !gs,
            ecart: (gs && ref !== null) ? +(gs.getBoundingClientRect().top - ref).toFixed(1) : null });
        });
      };
      releve('ouverture');
      for (let k = 0; k < N.length; k++) {
        const [a, c] = N[k];
        net.joueurs['j' + k] = { id:'j'+k, name:a, color:c, score:0, idx:0, done:false, gone:false, vu:Date.now() };
        majAdversaire(); majSalleListe();
        await new Promise(r => setTimeout(r, 420));
        releve(a + ' arrive');
      }
      delete net.joueurs['j1']; majAdversaire(); majSalleListe();
      await new Promise(r => setTimeout(r, 420));
      releve('un joueur part');
      return vus;
    });
    const sans = verres.filter(v => v.sans);
    const loin = verres.filter(v => !v.sans && Math.abs(v.ecart) > 2);
    console.log('  ' + ''.padEnd(11) + 'rangées mesurées : ' + verres.length
      + '   sans couche : ' + sans.length + '   décalées : ' + loin.length
      + '   pire écart : ' + Math.max(0, ...verres.filter(v => !v.sans).map(v => Math.abs(v.ecart))).toFixed(1) + ' px');
    if (sans.length) soucis.push(nom + ' : ' + sans.length + ' rangée(s) sans couche de verre ('
      + [...new Set(sans.map(v => v.quand))].join(', ') + ')');
    if (loin.length) soucis.push(nom + ' : ' + loin.length + ' rangée(s) dont le verre montre un autre morceau de paysage ('
      + loin.map(v => v.quand + ' ' + v.ecart + ' px').slice(0, 3).join(', ') + ')');

    if (errs.length) soucis.push(nom + ' : erreurs JS — ' + [...new Set(errs)].slice(0, 2).join(' | '));
    await ctx.close();
  }
  await nav.close();
  if (soucis.length) { console.log('\n  DÉFAUTS :'); soucis.forEach(x => console.log('   ' + x)); process.exit(1); }
  console.log('\n  OK — la page ne bouge pas, la liste défile, son décor reste fixe derrière,\n       et le fondu dit des deux côtés qu\'il reste des joueurs à voir');
})();
