/* ============ BANC « L'ACCUEIL TIENT DANS L'ÉCRAN » ============
   « Maintenant je ne vois plus les 7 derniers jours. »
   La carte « À revoir » (v218) a ajouté une sixième carte à une colonne qui
   n'avait plus de place : l'accueil débordait de vingt pixels sur un iPhone 15
   et la bande des sept jours passait sous l'indicateur d'accueil. Sur les
   écrans courts c'était pire — jusqu'à trente-trois pixels dans la bande morte
   des 700-800 px, juste au-dessus du palier « petits écrans ».

   LE BANC NE VÉRIFIE PAS UNE HAUTEUR, IL LES BALAIE TOUTES. C'est ce qui a
   montré que la correction évidente (resserrer les cartes) laissait derrière
   elle dix hauteurs en défaut que ni l'iPhone 15 ni le SE ne montraient. Une
   mise en page qui tient sur l'appareil du jour et casse sur le suivant n'est
   pas une mise en page, c'est une coïncidence.

   POURQUOI ON REDIMENSIONNE AU LIEU DE RECHARGER. Un navigateur neuf par
   hauteur est la mesure la plus honnête sur le papier : une page déjà chargée
   garde des valeurs mémorisées qu'un vrai téléphone n'a jamais. Mais cinquante
   navigateurs coûtaient plus de huit minutes, et la suite les coupait à cinq
   (sortie 124) — un banc qu'on ne peut pas lancer ne garde rien.
   Alors on a MESURÉ l'équivalence au lieu de la supposer, sur douze hauteurs
   couvrant tous les paliers : débord, visibilité et position de la bande,
   identiques AU PIXEL dans les douze cas, et 157 s contre 16 — dix fois plus
   rapide. (Pour refaire la comparaison : lancer une fois avec « --neuf », une
   fois sans, et comparer les deux sorties.) Ce qui est mémorisé dans la page (la hauteur maximale du verre)
   ne touche pas la mise en page, qui ne dépend que des unités CSS et des
   media queries — les deux suivent le redimensionnement.
   « --neuf » refait le balayage en rechargeant, pour revérifier l'équivalence
   le jour où l'accueil se mettrait à dépendre de l'état de chargement.

   Usage : node banc-essai/accueil.js [url] [--neuf]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const args = process.argv.slice(2).filter(a => a !== '--neuf');
const NEUF = process.argv.includes('--neuf');
const URL = args[0] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';

/* Tous les 20 px, plus les hauteurs des appareils réels et LES DEUX BORDS de
   chaque palier CSS — c'est là, et seulement là, que la mise en page change de
   régime. */
const HAUTEURS = [...new Set([
  ...Array.from({ length: 23 }, (_, i) => 560 + i * 20),
  609, 610, 611, 629, 630, 631, 643, 667, 699, 700, 701, 749, 750, 751,
  844, 852, 873, 896, 915, 926,
])].sort((a, b) => a - b);

const PREP = () => {
  localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
  localStorage.setItem('bt_fs_hint', '1');
  localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12}, correct:434 }));
  const k = (n)=>{ const d=new Date(Date.now()-n*86400000); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  localStorage.setItem('bt_daily', JSON.stringify({ last:k(1), streak:5, jours:[k(1),k(2),k(3),k(4)], geles:[k(5)], gels:1, parties:12 }));
  localStorage.setItem('bt_errbook', JSON.stringify([{ q:'Q1', options:['a','b','c','d'], correct:'a', p:0 }]));
};
/* Ce qu'on relève : est-ce que ça déborde, et la bande des sept jours est-elle
   ENTIÈREMENT au-dessus du pli quand elle est affichée ? Le reste (le nombre
   de cartes, leur taille) est vérifié ailleurs. */
const RELEVE = () => {
  const app = document.getElementById('app');
  const s = document.querySelector('.semaine');
  const vue = s && getComputedStyle(s).display !== 'none';
  const cartes = document.querySelectorAll('.mode-card, .daily-card, .parcours-card').length;
  return { deb: app.scrollHeight - app.clientHeight, semVue: !!vue, cartes,
    semBas: s ? Math.round(s.getBoundingClientRect().bottom) : null, ih: innerHeight };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:HAUTEURS[0] }, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(PREP);
  await p.goto(URL);
  /* On n'attend pas les quatre secondes de l'écran de chargement : on attend
     que le jeu soit prêt, et on demande l'accueil. C'est le même accueil,
     peint par le même render(). */
  const pret = () => { try { return typeof render === 'function' && typeof state === 'object'; } catch(e){ return false; } };
  await p.waitForFunction(pret, null, { timeout:20000 });

  const pires = [];
  for (const h of HAUTEURS) {
    if (NEUF) {
      await p.goto(URL);
      await p.waitForFunction(pret, null, { timeout:20000 });
    }
    await p.setViewportSize({ width:393, height:h });
    await p.evaluate(() => { state.screen = 'mode'; render(); });
    await p.waitForTimeout(NEUF ? 320 : 200);
    const r = await p.evaluate(RELEVE);
    if (r.cartes !== 6) pires.push(h + ' px : ' + r.cartes + ' cartes au lieu de 6');
    else if (r.deb > 0) pires.push(h + ' px : débord ' + r.deb + (r.semVue ? '' : ' (bande masquée)'));
    else if (r.semVue && r.semBas > r.ih) pires.push(h + ' px : bande sous le pli (' + r.semBas + ' > ' + r.ih + ')');
  }
  if (errs.length) pires.push('erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | '));
  await nav.close();
  if (pires.length) { console.log('  HAUTEURS EN DÉFAUT :'); pires.forEach(x => console.log('   ' + x)); process.exit(1); }
  console.log('  OK — ' + HAUTEURS.length + ' hauteurs de ' + HAUTEURS[0] + ' à ' + HAUTEURS[HAUTEURS.length-1]
    + ' px : six cartes, aucun débord, la bande des sept jours au-dessus du pli');
})();
