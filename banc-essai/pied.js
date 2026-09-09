/* LE PIED DE L'ACCUEIL DOIT ÊTRE LE MÊME PARTOUT.

   « Sur certain appareil ça s'affiche pas comme sur le mien au niveau des
   7 jours. » Trois choses le font varier :

     - un espaceur unique (.home-sp-bot, flex:1.3) absorbe TOUT le vide
       restant : plus l'écran est grand, plus la bande des sept jours
       s'éloigne des cartes, jusqu'à flotter seule en bas ;
     - .home-verse disparaît sous 700 px de haut ;
     - .semaine disparaît sous 610 px, et revient entre 610 et 700.

   Soit trois compositions différentes de l'accueil selon le téléphone.

   Le test balaie les hauteurs réelles des appareils courants et relève, pour
   chacune : ce qui est affiché, l'écart entre la dernière carte et la bande,
   et si quelque chose déborde.

       node pied.js        (jeu servi en HTTP sur 8099)

   LE BON REPÈRE EST UNE FRACTION, PAS DES PIXELS. Un écran court comprime
   tout : que la bande y soit plus près des cartes est normal, et l'exiger en
   pixels rendrait le test infaisable. Ce qui n'est PAS normal, c'est que
   l'écart GRANDISSE avec l'écran une fois que plus rien d'autre ne grandit —
   21,6 % de la hauteur utile sur un écran de 1000 px contre 14,2 % sur un
   iPhone 15. On mesure donc l'écart en pourcentage de la hauteur utile et on
   lui demande de ne jamais dépasser ce que fait un iPhone 15 aujourd'hui —
   rien ne bouge en dessous, l'écart cesse simplement de grandir au-dessus.
   Le vide restant devient une marge de page, partagée en haut et en bas : on
   relève aussi son équilibre. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const ECRANS = [
  ['iPhone SE (navigateur)', 375, 553],
  ['iPhone SE',              375, 667],
  ['iPhone 15 (navigateur)', 393, 643],
  ['iPhone 12 mini',         360, 780],
  ['Galaxy S23',             360, 800],
  ['iPhone 15',              393, 852],
  ['Galaxy S23 Ultra',       384, 854],
  ['Pixel 8',                412, 915],
  /* Xiaomi : Taylor a signalé les sept jours « trop bas » sur un Xiaomi. Ces
     appareils sont hauts ET étroits — un rapport hauteur/largeur de 2,22 à
     2,29 quand l'iPhone 15 est à 2,17 — donc c'est là que les espaceurs
     souples ont le plus de place à prendre. */
  ['Xiaomi Redmi Note',      393, 873],
  ['Xiaomi 13',              390, 866],
  ['Xiaomi 14 / POCO',       412, 944],
  ['iPhone 15 Pro Max',      430, 932],
  ['Android très haut',      412, 1000],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const lignes = []; const errs = [];
  for (const [nom, w, h] of ECRANS) {
    const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2,
      userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12,'Exode':8,'Matthieu':10}, correct:126 }));
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const vu = (s) => { const e = document.querySelector(s); if (!e) return false;
        const c = getComputedStyle(e); return c.display !== 'none' && e.getBoundingClientRect().height > 0; };
      const sem = document.querySelector('.semaine');
      const par = document.querySelector('.parcours-card');
      const app = document.getElementById('app');
      const ecart = (sem && par && vu('.semaine'))
        ? Math.round(sem.getBoundingClientRect().top - par.getBoundingClientRect().bottom) : null;
      const hero = document.querySelector('.hero');
      const hu = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hu')) || 0;
      return {
        verset: vu('.home-verse'),
        bande: vu('.semaine'),
        ecart,
        pct: (ecart !== null && hu) ? Math.round(ecart / hu * 10) / 10 : null,
        /* les deux marges de page : au-dessus de l'en-tête, sous le pied */
        airHaut: hero ? Math.round(hero.getBoundingClientRect().top) : null,
        airBas: sem && vu('.semaine') ? Math.round(innerHeight - sem.getBoundingClientRect().bottom) : null,
        deborde: Math.max(0, app.scrollHeight - app.clientHeight),
      };
    });
    lignes.push([nom, w, h, r]);
    await ctx.close();
  }
  /* L'ÉCART MESURÉ N'EST PAS L'ESPACEUR. Il va du BAS de la carte Progression
     au HAUT de la bande : il contient donc aussi la marge basse de la carte
     (~16 px). L'espaceur est plafonné à 12,3 % de la hauteur utile dans la
     feuille de style ; l'écart, lui, se stabilise à 14,2 %. C'est cette
     valeur-là qu'on surveille, avec un dixième de marge d'arrondi. */
  const PLAFOND = 14.3;   // % de la hauteur utile
  console.log('  écran                    taille     verset bande   écart carte->bande    air haut  air bas   débord');
  for (const [nom, w, h, r] of lignes) {
    const trop = r.pct !== null && r.pct > PLAFOND;
    console.log('  ' + nom.padEnd(24) + (w + 'x' + h).padEnd(11) +
      (r.verset ? 'oui  ' : 'NON  ') + (r.bande ? 'oui  ' : 'NON  ').padEnd(7) +
      (r.ecart === null ? '     —        ' : (String(r.ecart).padStart(4) + ' px = ' + String(r.pct).padStart(4) + ' %').padEnd(16)) +
      (r.airHaut === null ? '   —' : String(r.airHaut).padStart(4) + ' px').padEnd(11) +
      (r.airBas === null ? '   —' : String(r.airBas).padStart(4) + ' px').padEnd(10) +
      (r.deborde ? String(r.deborde) + ' px' : '0') + (trop ? '   <-- LE PIED DÉCROCHE' : ''));
  }
  const pcts = lignes.filter(l => l[3].pct !== null).map(l => l[3].pct);
  const compositions = new Set(lignes.map(l => (l[3].verset ? 'V' : '-') + (l[3].bande ? 'B' : '-')));
  const debords = lignes.filter(l => l[3].deborde > 0).length;
  /* ===== L'AIR SOUS LE PIED DOIT ÊTRE LE MÊME PARTOUT =====
     Il ne dépendait que de ce que le SYSTÈME déclare : 34 px de marge de
     sécurité sur un iPhone posé sur l'écran d'accueil, ZÉRO sur presque tous
     les Android. La bande des sept jours se retrouvait à 40 px du bord d'un
     côté et à 6 de l'autre — « les 7 jours trop bas sur un Xiaomi ». On exige
     donc que l'air du bas soit le même sur tous les écrans qui affichent la
     bande, à la compression près des écrans courts. */
  const airs = lignes.filter(l => l[3].bande && l[3].airBas !== null).map(l => l[3].airBas);
  const ecartAir = airs.length ? Math.max(...airs) - Math.min(...airs) : 0;
  const hors = pcts.filter(v => v > PLAFOND).length;
  console.log('\n  écart en % de la hauteur utile : de ' + Math.min(...pcts) + ' à ' + Math.max(...pcts) + ' %   (plafond ' + PLAFOND + ')');
  console.log('  écrans où le pied décroche : ' + hors);
  console.log('  compositions différentes de l\'accueil : ' + compositions.size + '  [' + [...compositions].join(' ') + ']');
  console.log('  écrans qui débordent : ' + debords);
  console.log('  air sous la bande : de ' + Math.min(...airs) + ' à ' + Math.max(...airs) + ' px  (écart ' + ecartAir + ', toléré 30)');
  if (errs.length) console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | '));
  const ok = hors === 0 && debords === 0 && ecartAir <= 30 && !errs.length;
  console.log(ok ? '\n  OK — le pied se tient pareil partout' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
