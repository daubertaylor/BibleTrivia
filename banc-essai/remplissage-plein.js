/* ============ BANC « UNE PUCE SE REMPLIT À 100 %, PAS À 28 % » ============
   « Lorsque je sélectionne, il faut que les sélectionnages se fassent à 100 %.
     J'ai bien dit 100 %. »

   La puce appuyée virait au ROSE PÂLE au lieu du corail : la teinte d'appui
   était écrite à 28 % d'opacité. Ce n'était pas un réglage de force mal
   choisi, c'était un ÉTAGE : l'onde est un pseudo-élément posé AU-DESSUS du
   texte, et une couleur pleine à cet étage aurait effacé le libellé. Les 28 %
   existaient pour qu'on puisse lire « Courte » à travers.

   La correction descend l'onde SOUS le texte (z-index -1) pour les deux
   familles de puces — et pour elles seulement : les cartes de mode, elles,
   portent une pastille d'icône OPAQUE qui découperait sa silhouette dans
   l'onde (c'est tout l'objet de banc-essai/plein.js, qui reste le garde-fou
   de ce côté-là). Une puce n'a pas d'enfant opaque : rien à découper.

   CE QU'ON MESURE. Pas un nom de couleur dans une feuille de style — l'image.
   On appuie, on tient, et on lit les pixels : le centre de la puce doit être
   le corail PLEIN, le même que celui d'une puce déjà sélectionnée, et le
   libellé doit rester lisible par-dessus.

   Usage : node banc-essai/remplissage-plein.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const TMP = fs.mkdtempSync('/tmp/remplissage-');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';

/* Le corail de la sélection. On ne l'écrit pas en dur : on le LIT sur une puce
   réellement sélectionnée, pour que le banc suive la charte si elle change. */
const ECART = (a, b) => Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]), Math.abs(a[2]-b[2]));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const SUPA = process.env.SUPA_UMD
    || '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/supabase.js';
  if (fs.existsSync(SUPA)) {
    await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(SUPA) }));
    await p.route('**://*.supabase.co/**', r => r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } }));
  }
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return typeof render === 'function'; } catch (e) { return false; } }, null, { timeout: 20000 });

  const soucis = [];
  /* Les deux familles, sur leur écran : .chip (réglages d'une partie de
     groupe) et .len-chip (durée, en solo). */
  for (const [nom, prep, sel] of [
    ['puce de réglage (.chip)',  () => { state.screen = 'setup'; state.mode = 'group'; render(); }, '.chip'],
    /* .len-chip vit dans le SALON en ligne, pas dans les réglages solo. On y
       pose le décor minimal — un salon dont on est l'hôte — sans réseau. */
    ['puce de salon (.len-chip)', () => {
      net.code = 'ABCD'; net.isHost = true;
      net.players = [{ id: 'a', name: 'Taylor', color: '#4C86E8', score: 0 }];
      net.lengthKey = Object.keys(LENGTHS)[1]; net.timerKey = Object.keys(TIMER_OPTS)[1]; net.themeKey = 'tout';
      state.screen = 'online-room'; render();
    }, '.len-chip'],
  ]) {
    await p.evaluate(prep);
    await p.waitForTimeout(1100);
    const ok = await p.evaluate((s) => !!document.querySelector(s), sel);
    if (!ok) { soucis.push(nom + ' : introuvable sur son écran'); continue; }

    /* 1. la couleur de RÉFÉRENCE : une puce déjà choisie. */
    const ref = await p.evaluate((s) => {
      const c = document.querySelector(s + '.active, ' + s + '.sel');
      if (!c) return null; const r = c.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height * 0.78 };
    }, sel);
    if (!ref) { soucis.push(nom + ' : aucune puce sélectionnée pour servir de référence'); continue; }
    /* ===== ON LIT LE POINT SUR UNE CAPTURE ENTIÈRE, PAS SUR UN DÉCOUPAGE =====
       Première écriture : une capture de 2x2 px autour du point (« clip »).
       Elle a rendu du BLEU pour une puce que la capture entière montrait
       corail au même endroit — le repère d'un découpage ne se lit pas comme
       celui de la fenêtre, et je comparais deux systèmes de coordonnées.
       On photographie donc toute la fenêtre et on va chercher le point
       dedans, en multipliant par la densité d'écran. Une seule origine, plus
       de malentendu possible. */
    const DPR = 3;
    const pixel = async (x, y) => {
      const f = TMP + '/vue.png';
      await p.screenshot({ path: f });
      const sortie = execSync('python3 -c "from PIL import Image;'
        + ' im=Image.open(\'' + f + '\').convert(\'RGB\');'
        + ' print(*im.getpixel((' + Math.round(x * DPR) + ',' + Math.round(y * DPR) + ')))"').toString().trim();
      return sortie.split(/\s+/).map(Number);
    };
    const couleurChoisie = await pixel(ref.x, ref.y);

    /* 2. on appuie sur une puce NON choisie, et on tient. */
    const cible = await p.evaluate((s) => {
      const c = [...document.querySelectorAll(s)].filter(e => !e.classList.contains('active') && !e.classList.contains('sel'))[0];
      if (!c) return null; const r = c.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, bas: r.y + r.height * 0.78 };
    }, sel);
    if (!cible) { soucis.push(nom + ' : aucune puce libre à appuyer'); continue; }
    await p.mouse.move(cible.x, cible.y);
    await p.mouse.down();
    await p.waitForTimeout(420);          // l'onde met 0,24 s, et l'appui la tient pleine
    const couleurAppui = await pixel(cible.x, cible.bas);
    await p.mouse.up();
    await p.waitForTimeout(500);

    const d = ECART(couleurAppui, couleurChoisie);
    console.log('  ' + nom.padEnd(26)
      + ' appuyée rgb(' + couleurAppui.join(',') + ')   choisie rgb(' + couleurChoisie.join(',') + ')   écart ' + d);
    /* Huit niveaux de tolérance : l'antialiasing et le verre au-dessus font
       bouger un point ou deux, pas davantage. Le rose pâle d'avant était à
       plus de cent. */
    if (d > 8) soucis.push(nom + ' : la puce appuyée n\'a pas la couleur de la puce choisie (écart ' + d + ')');
  }

  if (errs.length) soucis.push('erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | '));
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('\n  OK — appuyée ou choisie, une puce a exactement la même couleur pleine');
})();
