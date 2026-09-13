/* ============ BANC « L'ACCUEIL TIENT DANS L'ÉCRAN » ============
   « Maintenant je ne vois plus les 7 derniers jours. »
   La carte « À revoir » a ajouté une sixième carte à une colonne qui n'avait
   plus de place : l'accueil débordait de vingt pixels sur un iPhone 15, et la
   bande des sept jours passait sous l'indicateur d'accueil. Sur les écrans
   courts c'était pire — jusqu'à trente-trois pixels dans la bande morte des
   700-800 px, juste au-dessus du palier « petits écrans ».
   Le banc ne juge pas une hauteur, il les balaie TOUTES de 560 à 1000 px : à
   chacune, l'accueil doit tenir sans débord, et la bande des sept jours doit
   être entièrement au-dessus du pli quand elle est affichée. Une mise en page
   qui tient sur l'appareil du jour et casse sur le suivant n'est pas une mise
   en page, c'est une coïncidence.
   Usage : node banc-essai/accueil.js [url]  (ou URL_ESSAI=…)
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  let pires = [];
  /* UN NAVIGATEUR NEUF PAR HAUTEUR — c'est lent (une seconde chacun), et c'est
     le prix de la justesse : redimensionner une page déjà chargée laisse
     derrière elle des mesures mémorisées (la hauteur maximale du verre, entre
     autres) qu'un vrai téléphone n'a jamais. On échantillonne donc tous les
     20 px au lieu de 10, et on ajoute à la main les hauteurs des appareils
     réels et les deux bords de chaque palier CSS — c'est là, et seulement là,
     que la mise en page change de régime. */
  const HAUTEURS = [...new Set([
    ...Array.from({ length: 23 }, (_, i) => 560 + i * 20),
    609, 610, 611, 629, 630, 631, 643, 667, 699, 700, 701, 749, 750, 751,
    844, 852, 873, 896, 915, 926,
  ])].sort((a, b) => a - b);
  for (const h of HAUTEURS) {
    const ctx = await nav.newContext({ viewport:{width:393,height:h}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12}, correct:434 }));
      const k = (n)=>{ const d=new Date(Date.now()-n*86400000); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
      localStorage.setItem('bt_daily', JSON.stringify({ last:k(1), streak:5, jours:[k(1),k(2),k(3),k(4)], geles:[k(5)], gels:1, parties:12 }));
      localStorage.setItem('bt_errbook', JSON.stringify([{ q:'Q1', options:['a','b','c','d'], correct:'a', p:0 }]));
    });
    await p.goto(URL);
    /* ON NE REGARDE PAS L'ÉCRAN DE CHARGEMENT QUATRE SECONDES, CINQUANTE FOIS.
       Attendre « state.screen === 'mode' » attend AUSSI les quatre secondes du
       splash : à cinquante hauteurs, le banc passait plus de trois minutes à
       regarder une colombe. On attend que le jeu soit prêt (ses fonctions
       existent), puis on demande l'accueil. C'est le même accueil, peint par
       le même render() — le chemin pour y arriver n'entre pas dans la mesure. */
    await p.waitForFunction(() => { try { return typeof render === 'function' && typeof state === 'object'; } catch(e){ return false; } }, null, { timeout:20000 });
    await p.evaluate(() => { state.screen = 'mode'; render(); });
    await p.waitForTimeout(320);
    const r = await p.evaluate(() => {
      const app = document.getElementById('app');
      const s = document.querySelector('.semaine');
      const vue = s && getComputedStyle(s).display !== 'none';
      const b = s ? s.getBoundingClientRect() : null;
      return { deb: app.scrollHeight - app.clientHeight, semVue: !!vue,
        semBas: b ? Math.round(b.bottom) : null, ih: innerHeight };
    });
    if (r.deb > 0) pires.push(h + ' px : débord ' + r.deb + (r.semVue ? '' : ' (bande masquée)'));
    else if (r.semVue && r.semBas > r.ih) pires.push(h + ' px : bande sous le pli (' + r.semBas + ' > ' + r.ih + ')');
    await ctx.close();
  }
  await nav.close();
  if (pires.length) { console.log('  HAUTEURS EN DÉFAUT :'); pires.forEach(x => console.log('   ' + x)); process.exit(1); }
  console.log('  OK — ' + HAUTEURS.length + ' hauteurs de 560 à 1000 px : l\'accueil tient partout sans débord');
})();
