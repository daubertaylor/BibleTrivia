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
  || require('./brouillon.js') + '/supabase.js';

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
/* ===== LE SALON SE MESURE MAINTENANT PLEIN, PAS VIDE =====
   Ce banc posait net.players — un champ mort depuis la table à huit — et
   laissait net.joueurs vide. nbJoueurs() valait donc 1 : on mesurait un salon
   OÙ PERSONNE N'ÉTAIT ENCORE ARRIVÉ, c'est-à-dire le cas le plus court, et on
   en concluait que le salon tenait. Depuis que la liste sert de deux joueurs
   à huit (« je veux que même s'il n'y en a que deux, ça reste pareil, de haut
   en bas »), la hauteur dépend directement du nombre : chaque arrivant ajoute
   une rangée. On mesure donc les trois moments qui comptent — le salon qu'on
   vient d'ouvrir, le duel, et le salon plein à huit, qui est le pire cas. */
const PEUPLEMENTS = [
  ['salon qui vient d\'ouvrir', 0],
  ['duel (2 joueurs)',          1],
  ['salon plein (8 joueurs)',   7],
  /* LE SALON D'UN GROUPE (v311) : sa pastille et son nom à la place du
     grand code — il doit tenir pareil, de deux à huit. */
  ['salon d\'un groupe, à 2',   1, true],
  ['salon d\'un groupe, à 8',   7, true],
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
  for (const [peuple, combien, deGroupe] of PEUPLEMENTS) {
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
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof render === 'function'
      && !!(window.supabase && window.supabase.createClient); } catch (e) { return false; } }, null, { timeout: 20000 });
    /* Les vraies marges du téléphone, que le navigateur sans tête ne fournit pas. */
    await p.evaluate(() => { document.documentElement.classList.add('is-standalone'); });
    await p.addStyleTag({ content: `html.is-standalone #app, #app{ padding-top:${hautSure}px !important; padding-bottom:${Math.max(basSure, 12)}px !important; }` });
    await p.evaluate(([combien, deGroupe]) => {
      /* La VRAIE table de joueurs, celle que le jeu lit : un arrivant, une
         rangée. Les prénoms sont longs à dessein — c'est la largeur qu'on
         voudrait aussi voir tenir. */
      const NOMS = [['Stany','#2FA36B'],['Myriam','#9B5DE5'],['Jonathan','#F1B24A'],
                    ['Élisabeth','#E8734C'],['Barnabé','#4C86E8'],['Priscille','#2FA3A3'],['Zacharie','#B45DE5']];
      net.code = 'CHNW'; net.isHost = true;
      if (deGroupe && typeof grp === 'object') { grp.liste = [{ id: 'g1', nom: 'Les amis du jeudi', teinte: 2 }]; net.depuisGroupe = 'g1'; }
      net.joueurs = {};
      for (let i = 0; i < combien; i++) {
        const [n, c] = NOMS[i];
        net.joueurs['j' + i] = { id: 'j' + i, name: n, color: c, score: 0, idx: 0, done: false, gone: false, vu: Date.now() };
      }
      majAdversaire();
      net.lengthKey = Object.keys(LENGTHS)[1]; net.timerKey = Object.keys(TIMER_OPTS)[1]; net.themeKey = 'tout';
      state.screen = 'online-room'; render();
    }, [combien, !!deGroupe]);
    await p.waitForTimeout(1300);
    const r = await p.evaluate(() => {
      const a = document.getElementById('app');
      const b = document.querySelector('.btn-primary');
      const nb = nbJoueurs();
      const lignes = document.querySelectorAll('.salle-liste .salle-ligne:not(.vide)').length;
      const vide = document.querySelectorAll('.salle-liste .salle-ligne.vide').length;
      return { deb: Math.max(0, a.scrollHeight - a.clientHeight),
               bouton: b ? Math.round(b.getBoundingClientRect().bottom) : null, ih: innerHeight,
               nb, rangees: lignes, attendu: nb,
               /* La place vide n'invite que tant qu'on est SEUL : à deux elle
                  répétait ce que la phrase du code dit déjà, pour 58 px. */
               places: vide, attenduVide: nb === 1 ? 1 : 0,
               /* CE QUI NE DOIT PLUS JAMAIS EXISTER : la disposition horizontale. */
               face: !!document.querySelector('.vs-row, .vs-player, .vs-mid, #oppSlot') };
    });
    lignes.push([peuple, nom, w, h, hautSure, basSure, r]);
    if (errs.length) soucis.push(peuple + ' / ' + nom + ' : erreurs JS — ' + [...new Set(errs)].slice(0, 2).join(' | '));
    await ctx.close();
  }
  }
  await nav.close();

  let peupleEnCours = null;
  for (const [peuple, nom, w, h, ht, bs, r] of lignes) {
    if (peuple !== peupleEnCours) {
      peupleEnCours = peuple;
      console.log('\n  ' + peuple.toUpperCase());
      console.log('  écran                     taille     marges    tient ?   joueurs   rangées');
    }
    const ok = r.deb === 0;
    console.log('  ' + nom.padEnd(25) + (w + 'x' + h).padEnd(11) + (ht + '/' + bs).padEnd(10)
      + (ok ? 'oui      ' : 'NON — déborde de ' + r.deb + ' px   ')
      + String(r.nb).padStart(4) + String(r.rangees).padStart(10)
      + (r.bouton !== null ? '   (bouton à ' + r.bouton + '/' + r.ih + ')' : '')
      + (r.face ? '   FACE-À-FACE ENCORE LÀ' : ''));
    if (!ok && !HORS_ATTEINTE.has(nom)) soucis.push(peuple + ' / ' + nom + ' : déborde de ' + r.deb + ' px');
    if (r.face) soucis.push(peuple + ' / ' + nom + ' : le face-à-face horizontal est encore dessiné');
    if (r.rangees !== r.attendu) soucis.push(peuple + ' / ' + nom + ' : ' + r.rangees + ' rangées pour ' + r.nb + ' joueurs (attendu ' + r.attendu + ')');
    if (r.places !== r.attenduVide) soucis.push(peuple + ' / ' + nom + ' : ' + r.places + ' place(s) vide(s) à ' + r.nb + ' joueurs (attendu ' + r.attenduVide + ')');
  }
  if (soucis.length) { console.log('\n  DÉFAUTS :'); [...new Set(soucis)].forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('\n  OK — le salon tient entier sur les ' + ECRANS.length + ' configurations × '
    + PEUPLEMENTS.length + ' peuplements, marges réelles comprises,'
    + '\n       et il garde la même liste verticale de deux joueurs à huit');
})();
