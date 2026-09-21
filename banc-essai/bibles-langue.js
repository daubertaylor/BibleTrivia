/* ============ BANC « LA BIBLE SUIT LA LANGUE » ============
   « Pense bien à mettre les bonnes versions de Bible en fonction des langues
   correspondantes. »

   Proposer Louis Segond, Darby et Ostervald à quelqu'un qui lit l'anglais n'a
   pas de sens : ce sont des Bibles françaises. Le panneau ne montre donc que
   les versions de la langue en cours, et le verset affiché vient de la version
   choisie DANS cette langue.

   ON VÉRIFIE, DANS LES DEUX LANGUES :
     1. la liste ne contient que des versions de la bonne langue ;
     2. la version active en fait partie ;
     3. chaque version rend un texte DIFFÉRENT des autres — une version qui
        retomberait sur le français, ou sur sa voisine, ne serait pas un choix ;
     4. en anglais, aucun verset ne contient de caractère accentué : c'est le
        signe le plus simple et le plus sûr qu'aucun texte français n'a fui ;
     5. et le verset de l'accueil change de langue avec le reste.

   Usage : node banc-essai/bibles-langue.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const ACCENT = /[àâäéèêëîïôöùûüÿçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇŒÆ]/;
/* ===== ET LE SIGLE DOIT SE LIRE =====
   « À ce niveau le texte blanc ne se voit pas beaucoup. » Les trois versions
   anglaises n'avaient pas de couleurs de pastille : leur dégradé ne peignait
   rien, et le sigle blanc tombait sur le crème de la ligne. Contraste relevé :
   1,06 — au-dessous de 1,5, un mot n'est pas pâle, il n'existe plus.
   UN FOND SEMI-TRANSPARENT N'EST PAS UNE COULEUR. Le comparer tel quel donnait
   2,71 là où l'œil voit 4,6 : on compose le voile sur ce qu'il y a derrière,
   comme le navigateur, avant de mesurer. */
const SEUIL = 3;
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
const ctr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const ATTENDU = { fr: ['LSG','JND','OST','BA','MAR'], en: ['KJV','ASV','WEB'] };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const soucis = [];
  const vu = {};
  for (const lg of ['fr', 'en']) {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
      userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((l) => {
      localStorage.setItem('bt_langue', l);
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor' }));
      localStorage.setItem('bt_fs_hint', '1');
    }, lg);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof render === 'function' && state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(600);
    /* UNE VERSION QUI N'A PAS ENCORE LA FONCTION N'EST PAS UNE PANNE DU BANC.
       Sur la version d'avant, biblesDeLaLangue() n'existe pas : le banc doit
       le DIRE, pas s'écrouler avec une trace de pile. */
    const r = await p.evaluate(() => {
      if (typeof biblesDeLaLangue !== 'function') return { absente: true, langue: LANGUE };
      const liste = biblesDeLaLangue();
      const garde = settings.bible;
      const textes = {};
      /* On relève QUELQUES références, pas une : deux versions peuvent
         coïncider sur un verset court et différer partout ailleurs. */
      const refs = ["Psaume 23:1", "Jean 3:16", "Psaume 34:18", "Ésaïe 64:8"];
      for (const b of liste) {
        settings.bible = b.cle;
        textes[b.sigle] = refs.map(x => texteVerset(x, "(défaut)"));
      }
      settings.bible = garde;
      return { langue: LANGUE, sigles: liste.map(b => b.sigle), active: bibleActive().sigle,
        accueil: texteAccueil(), textes };
    });
    vu[lg] = r;
    if (r.absente) {
      soucis.push(lg + ' : la liste des versions ne suit pas la langue (biblesDeLaLangue absente)');
      await ctx.close();
      continue;
    }
    /* 1. la bonne liste */
    if (r.sigles.join(',') !== ATTENDU[lg].join(','))
      soucis.push(lg + ' : versions proposées ' + r.sigles.join('/') + ' au lieu de ' + ATTENDU[lg].join('/'));
    /* 2. la version active en fait partie */
    if (!r.sigles.includes(r.active))
      soucis.push(lg + ' : la version active (' + r.active + ') n\'est pas dans la liste');
    /* 3. chacune dit quelque chose qui lui est propre */
    const empreintes = {};
    for (const s of r.sigles) empreintes[s] = r.textes[s].join(' ¦ ');
    const paires = r.sigles;
    for (let i = 0; i < paires.length; i++)
      for (let j = i + 1; j < paires.length; j++)
        if (empreintes[paires[i]] === empreintes[paires[j]])
          soucis.push(lg + ' : ' + paires[i] + ' et ' + paires[j] + ' rendent exactement le même texte');
    /* 4. en anglais, pas un accent */
    if (lg === 'en') {
      for (const s of r.sigles)
        for (const t of r.textes[s])
          if (ACCENT.test(t)) soucis.push('en : ' + s + ' laisse passer du français — « ' + t.slice(0, 60) + ' »');
      if (ACCENT.test(r.accueil)) soucis.push('en : le verset de l\'accueil est resté français — « ' + r.accueil.slice(0, 60) + ' »');
    }
    /* 6. le sigle de chaque ligne se lit — panneau ouvert, styles réels */
    await p.evaluate(() => { openSettings(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { openBibles(); });
    await p.waitForTimeout(800);
    const sigles = await p.evaluate(() => {
      const rgb = (s) => { const m = String(s).match(/-?\d+(\.\d+)?/g); return m ? m.slice(0,3).map(Number) : [255,255,255]; };
      const alpha = (s) => { const m = String(s).match(/-?\d+(\.\d+)?/g); return (m && m.length > 3) ? Number(m[3]) : 1; };
      return [...document.querySelectorAll('.bible-sig')].map(e => {
        const cs = getComputedStyle(e);
        let derriere = [255,255,255], q = e.parentElement;
        while (q) { const f = getComputedStyle(q).backgroundColor;
          if (f !== 'rgba(0, 0, 0, 0)' && f !== 'transparent') { derriere = rgb(f); break; } q = q.parentElement; }
        const a = alpha(cs.backgroundColor), c = rgb(cs.backgroundColor);
        const fond = [0,1,2].map(i => Math.round(a*c[i] + (1-a)*derriere[i]));
        /* UN DÉGRADÉ SE MESURE PAR SES ARRÊTS. On ne peut pas lire un pixel
           depuis la page, mais un dégradé linéaire n'a pas d'autre couleur que
           celles qu'il déclare : on les relève toutes et on retiendra la pire.
           Sans ça le banc ne voyait que backgroundColor — transparent — et
           annonçait « illisible » sur des pastilles parfaitement lisibles. */
        const arrets = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(rgb);
        return { sigle: e.textContent.trim(), encre: rgb(cs.color), fond, arrets,
                 peint: cs.backgroundImage !== 'none' || a > 0.02, largeur: Math.round(e.getBoundingClientRect().width) };
      });
    });
    if (!sigles.length) soucis.push(lg + ' : aucun sigle dans le panneau des versions');
    for (const s of sigles) {
      /* Un dégradé qu'on ne sait pas mesurer ne doit pas passer pour bon : on
         exige d'abord qu'il y ait QUELQUE CHOSE de peint sous les lettres. */
      if (!s.peint) { soucis.push(lg + ' : le sigle ' + s.sigle + ' n\'a aucun fond peint'); continue; }
      const fonds = s.arrets.length ? s.arrets : [s.fond];
      const c = Math.min(...fonds.map(f => ctr(s.encre, f)));
      if (c < SEUIL) soucis.push(lg + ' : le sigle ' + s.sigle + ' ne se lit pas (contraste '
        + c.toFixed(2) + ', le jeu s\'impose ' + SEUIL + ')');
    }
    /* Et un seul traitement : toutes les pastilles de la même largeur. */
    const larg = [...new Set(sigles.map(s => s.largeur))];
    if (larg.length > 1) soucis.push(lg + ' : les sigles n\'ont pas tous la même largeur (' + larg.join(', ') + ' px)');
    if (errs.length) soucis.push(lg + ' : erreurs JS — ' + [...new Set(errs)].slice(0, 2).join(' | '));
    await ctx.close();
  }
  /* 5. l'accueil change bien de langue */
  if (vu.fr && vu.en && !vu.fr.absente && !vu.en.absente && vu.fr.accueil === vu.en.accueil)
    soucis.push('le verset de l\'accueil est le même dans les deux langues');
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('  OK — fr : ' + vu.fr.sigles.join(' ') + ' (active ' + vu.fr.active + ')');
  console.log('       en : ' + vu.en.sigles.join(' ') + ' (active ' + vu.en.active + '), aucun accent');
  console.log('       accueil : « ' + vu.fr.accueil.slice(0, 44) + '… » / « ' + vu.en.accueil.slice(0, 44) + '… »');
})();
