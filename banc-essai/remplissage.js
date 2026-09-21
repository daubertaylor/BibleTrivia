/* ============ BANC « LE ROUGE REMPLIT, IL NE S'ALLUME PAS » ============
   « Lorsque je passe d'un bouton à un autre, quand ça passe du rosé au rouge,
   je veux une vraie animation de remplissage, cohérente avec le reste. »

   CE QUE C'ÉTAIT. Relevé en pixels, mouvement ralenti dix fois, cinq colonnes
   prises en travers d'une puce : 0 0 0 0 0, puis 1 1 1 1 1, puis 2 2 2 2 2…
   les cinq colonnes avançaient ENSEMBLE, du premier au dernier centième. Un
   fondu, pas un remplissage — la puce entière changeait de couleur d'un bloc.

   CE BANC NE REGARDE PAS LES PIXELS, IL REGARDE LA MÉCANIQUE. Décoder des
   images demande une bibliothèque qu'on n'a pas, et surtout ça mesure le
   résultat sans dire pourquoi. On lit donc directement ce que le navigateur
   a calculé : l'échelle de la couche de remplissage, la teinte du verre, la
   couleur du libellé — instant par instant, sur l'animation ralentie.

   QUATRE PROMESSES :
     1. le remplissage est un MOUVEMENT : l'échelle passe de zéro à un par
        valeurs distinctes et croissantes, jamais d'un saut ;
     2. la teinte pleine n'arrive qu'à la FIN — sinon elle referait, sous la
        couche, le fondu uniforme qu'on vient d'enlever ;
     3. AU REPOS la couche n'est pas peinte : une puce déjà choisie doit être
        exactement ce qu'elle était avant ce banc, pas une couche de plus ;
     4. le LIBELLÉ reste lisible pendant tout le trajet — contraste au-dessus
        de 3, la valeur que le jeu s'impose depuis qu'on l'a mesurée.

   Usage : node banc-essai/remplissage.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const LENT = 10;                       /* on ralentit pour échantillonner, pas pour tricher */
const DUREE = 240 * LENT;

/* La part de la largeur qu'occupe le libellé : au-delà de cette échelle, la
   couche est passée dessous et c'est elle qui fait le fond du mot. */
const PART_LIBELLE = 0.7;

const contraste = (a, b) => {
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const lire = (s) => { const m = String(s).match(/-?\d+(\.\d+)?/g); return m ? m.map(Number) : [0, 0, 0]; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return typeof render === 'function'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.evaluate(() => { state.mode = 'group'; state.lengthKey = 'normale'; state.timerKey = '30'; state.themeKey = 'tout'; state.screen = 'setup'; render(); });
  await p.waitForTimeout(1600);
  /* ON RALENTIT TOUT CE QUI COMPTE, Y COMPRIS L'ENCRE DU LIBELLÉ.
     Les deux variables de durée suffisent pour la couche et pour la teinte,
     qui les lisent par var(). Mais le moment où le mot passe au blanc est
     écrit en dur (0,18 s) : sans le ralentir lui aussi, il tombe à sept pour
     cent du mouvement au lieu de septante-cinq, et le banc mesure un blanc sur
     crème qui n'existe pour personne. On réécrit donc la règle entière, dans
     les mêmes proportions. */
  await p.addStyleTag({ content: `:root{ --onde-duree:${0.24 * LENT}s !important; --tr-onde:${0.24 * LENT}s cubic-bezier(0.33,1,0.68,1) !important; }
    .chip.remplit, .len-chip.remplit{ transition:transform 0.44s cubic-bezier(0.2,1,0.3,1),
      background-color 0s, border-color 0.22s ease, color 0s linear ${0.18 * LENT}s,
      opacity 0.22s ease, --glass-tint 0s linear var(--onde-duree) !important; }` });
  await p.waitForTimeout(200);

  const soucis = [];

  /* ===== 3. AU REPOS ===== */
  const repos = await p.evaluate(() => {
    const c = document.querySelector('.chip.active');
    if (!c) return { absent: true };
    const a = getComputedStyle(c, '::after');
    return { opacite: a.opacity, contenu: a.content, transform: a.transform };
  });
  /* ===== D'ABORD : LA COUCHE EXISTE-T-ELLE ? =====
     Sans « content », le pseudo-élément ne fabrique aucune boîte — et tout ce
     qu'on lirait ensuite (échelle, opacité, fond sous le libellé) serait des
     valeurs par défaut qu'on prendrait pour des mesures. C'est exactement ce
     qui est arrivé : sur la version d'avant, le banc annonçait « le libellé
     devient illisible, contraste 1,37 », ce qui était FAUX — il n'y avait
     simplement rien à mesurer. Un banc qui invente un défaut ne vaut pas mieux
     qu'un banc qui en rate un. */
  const existe = !repos.absent && repos.contenu !== 'none';
  if (repos.absent) soucis.push('aucune puce choisie sur l\'écran de réglages');
  else if (!existe)
    soucis.push('la couche de remplissage n\'existe pas (::after sans « content ») : le rouge ne peut que s\'allumer d\'un bloc');
  else if (parseFloat(repos.opacite) > 0.01)
    soucis.push('au repos la couche de remplissage est peinte (opacité ' + repos.opacite + ') — la puce choisie n\'est plus celle d\'avant');

  /* ===== 1, 2, 4. PENDANT LE CHANGEMENT ===== */
  const cible = await p.evaluate(() => {
    const c = [...document.querySelectorAll('[data-group="len"]')].find(e => !e.classList.contains('active'));
    return c ? c.dataset.k : null;
  });
  if (!cible) soucis.push('aucune puce non choisie à toucher');
  else if (existe) {
    const t0 = Date.now();
    await p.evaluate((k) => setLength(k), cible);
    const releves = [];
    while (Date.now() - t0 < DUREE + 200) {
      const r = await p.evaluate((k) => {
        const arrive = [...document.querySelectorAll('[data-group="len"]')].find(e => e.dataset.k === k);
        /* L'écran peut se repeindre sous nos pieds (verre, minuterie) : on ne
           relève rien plutôt que de relever n'importe quoi. */
        if(!arrive) return null;
        const part = [...document.querySelectorAll('[data-group="len"]')].find(e => e.classList.contains('devide'));
        const a = getComputedStyle(arrive, '::after');
        const cs = getComputedStyle(arrive);
        const m = String(a.transform).match(/matrix\(([^,]+)/);
        return {
          echelle: m ? parseFloat(m[1]) : (a.transform === 'none' ? 1 : 0),
          opacite: parseFloat(a.opacity),
          couche: a.backgroundColor, teinte: cs.backgroundColor,
          encre: cs.color,
          partOpacite: part ? parseFloat(getComputedStyle(part, '::after').opacity) : null,
        };
      }, cible);
      if(r) releves.push({ t: Date.now() - t0, ...r });
    }

    /* 1. un mouvement, pas un saut */
    const ech = releves.filter(r => r.t < DUREE).map(r => Math.round(r.echelle * 1000) / 1000);
    const distinctes = new Set(ech).size;
    if (distinctes < 6) soucis.push('le remplissage ne bouge pas : ' + distinctes + ' échelle(s) distincte(s) sur ' + ech.length + ' relevés — c\'est un fondu, pas un remplissage');
    const monte = ech.every((v, i) => i === 0 || v >= ech[i - 1] - 0.02);
    if (!monte) soucis.push('le remplissage recule en cours de route');
    if (ech.length && ech[0] > 0.25) soucis.push('le remplissage commence déjà rempli (' + ech[0] + ')');
    const fin = releves[releves.length - 1];
    if (fin && fin.echelle < 0.99 && fin.opacite > 0.01) soucis.push('le remplissage ne va pas jusqu\'au bout (' + fin.echelle + ')');

    /* 2. la teinte n'arrive qu'à la fin */
    const rouge = (c) => { const v = lire(c); return v[0] > 200 && v[1] < 110 && v[2] < 90; };
    const tot = releves.filter(r => r.t < DUREE * 0.6);
    if (tot.some(r => rouge(r.teinte)))
      soucis.push('la teinte pleine arrive avant la fin du remplissage — le fondu uniforme est encore là, sous la couche');

    /* 4. le libellé reste lisible */
    /* LE FOND SOUS LE MOT N'EST PAS « L'UN OU L'AUTRE ». La couche grandit ET
       s'opacifie en même temps : tant qu'elle n'a pas couvert le libellé c'est
       la teinte qu'on lit, et dès qu'elle l'a couvert c'est un MÉLANGE des
       deux, à hauteur de son opacité du moment. Prendre la couche pour pleine
       dès qu'elle passe, c'est se donner un contraste qu'on n'a pas. */
    const melange = (a, b, k) => a.map((v, i) => v * k + b[i] * (1 - k));
    let creux = 99, quand = 0;
    for (const r of releves) {
      const fond = r.echelle >= PART_LIBELLE
        ? melange(lire(r.couche), lire(r.teinte), Math.max(0, Math.min(1, r.opacite)))
        : lire(r.teinte);
      const c = contraste(lire(r.encre), fond);
      if (c < creux) { creux = c; quand = r.t; }
    }
    if (creux < 3) soucis.push('le libellé devient illisible : contraste ' + creux.toFixed(2) + ' à ' + quand + ' ms (le jeu s\'impose 3)');

    /* 5. un seul geste : la puce qui part s'efface pendant que l'autre se remplit */
    const ensemble = releves.some(r => r.partOpacite !== null && r.partOpacite > 0.05 && r.echelle > 0.05 && r.echelle < 0.95);
    if (!ensemble) soucis.push('les deux puces ne bougent pas ensemble : le rouge saute au lieu de passer');

    /* On imprime une valeur tous les dixièmes du trajet, pas les dix
       premières mesures : les relevés s'entassent dans les premières
       millisecondes et donnaient neuf fois « 0,001 », ce qui ressemblait à
       une panne alors que c'était le début du mouvement. */
    const jalons = [];
    for (let part = 0; part <= 1.001; part += 0.125) {
      const vise = part * DUREE;
      const r = releves.reduce((a, b) => Math.abs(b.t - vise) < Math.abs(a.t - vise) ? b : a);
      jalons.push(Math.round(r.echelle * 100) + '%');
    }
    console.log('  remplissage, du début à la fin : ' + jalons.join(' → '));
    console.log('  creux de contraste du libellé : ' + creux.toFixed(2) + ' (à ' + quand + ' ms sur ' + DUREE + ')');
  }

  if (errs.length) soucis.push('erreurs JS : ' + [...new Set(errs)].slice(0, 2).join(' | '));
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('  OK — le rouge se remplit, la teinte attend la fin, rien au repos, le mot reste lisible');
})();
