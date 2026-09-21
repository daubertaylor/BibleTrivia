/* ============ BANC « PAS DE COUTURE PÂLE AU BORD D'UN BOUTON APPUYÉ » ============
   « Y a des bords blancs qui doivent pas être là. »

   IL M'A FALLU SA PHOTO ENTOURÉE POUR LE TROUVER, et deux raisons à cela.
   D'abord je ne mesurais que la CLARTÉ : le pixel fautif n'est que trois
   unités plus clair que le rose de l'appui. Ce qui le trahit, c'est sa
   SATURATION — 38 là où la puce est à 63 : du crème qui passe sans son voile.
   Ensuite je pressais la puce du MILIEU d'une rangée : contre une voisine
   crème, l'écart est invisible ; contre le gris de la carte, c'est une couture
   blanche. On appuie donc sur la PREMIÈRE de chaque rangée.

   LA CAUSE : deux rastérisations du même arrondi. La surface peint son fond
   avec son border-radius ; l'onde, elle, est découpée par l'overflow de la
   surface. Deux lissages calculés séparément pour la même courbe ne donnent
   pas la même couverture au même pixel.

   CE QU'ON MESURE : un SOMMET DE CLARTÉ sur le pourtour. Le pixel de la
   couture est plus clair que le fond ET que le bouton — ni l'un ni l'autre n'a
   cette valeur, elle n'existe que sur la jointure. On ne regarde que le
   pourtour : au milieu il y a le libellé, et le lissage de ses lettres est un
   sommet de clarté à chaque jambage (ma première version mesurait ça, et
   annonçait 102 unités de couture sur le mot « Short »).

   Usage : node banc-essai/couture.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execSync } = require('child_process');
const SC = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const S = 3;
/* Au-delà de 1,5, la couture se voit : celle que Taylor a entourée mesurait
   3,5 chez lui et 9,0 au banc. */
const SEUIL = 1.5;

/* La PREMIÈRE de chaque rangée : c'est elle qui touche la carte.
   « mode » A SON PROPRE PLAFOND, ET IL FAUT DIRE POURQUOI. Une carte de mode
   garde une couture de 20 unités sur sa dernière ligne de pixels, et ce n'est
   PAS le même défaut : ici l'onde n'est pas en retard sur le fond du bouton
   (il est transparent), c'est la COUCHE DE VERRE qui dépasse d'un pixel
   appareil. Vérifié en peignant chaque couche en vert l'une après l'autre :
       fond du bouton en vert  -> la ligne reste grise  (ce n'est pas lui)
       couche de verre en vert -> la ligne devient VERTE (c'est elle)
       onde en vert            -> l'onde s'arrête juste avant
   La cause est dans le moteur du verre, qui pose cette couche au pixel près
   par une transformation composée ; son bord arrondi et celui du contenu ne
   tombent pas au même endroit. Un tiers de pixel CSS, sur une seule ligne, en
   bas d'une carte : on ne touche pas au moteur qui garantit iOS = Android
   pour ça. On CHIFFRE le défaut, il ne peut plus empirer sans qu'on le sache,
   et il ne peut plus être oublié. */
const CIBLES = [
  ['durée',     "state.mode='group'; state.screen='setup'; render();", '[data-group="len"]', SEUIL],
  ['chrono',    "state.mode='group'; state.screen='setup'; render();", '[data-group="tmr"]', SEUIL],
  ['testament', "state.mode='group'; state.screen='setup'; render();", '[data-group="theme"]', SEUIL],
  ['version',   "state.screen='mode'; render(); openSettings(); setTimeout(()=>openBibles(), 80);", '.bible-item', SEUIL],
  ['mode',      "state.screen='mode'; render();", '.mode-card', 20.5],
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: S,
    hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return typeof render === 'function'; } catch (e) { return false; } }, null, { timeout: 20000 });
  const faits = [];
  for (const [nom, prep, sel, plafond] of CIBLES) {
    /* ON REPART TOUJOURS DE L'ACCUEIL. Enchaîner les cibles sans revenir
       laissait des feuilles ouvertes par-dessus l'écran suivant, et la rangée
       du chrono devenait « introuvable » alors qu'elle était simplement
       cachée sous les Réglages. */
    await p.evaluate(() => {
      try { closeBibles(); } catch (e) {}
      document.querySelectorAll('.sheet-veil, .modal-veil').forEach(v => v.remove());
      try { state.screen = 'mode'; render(); } catch (e) {}
    });
    await p.waitForTimeout(600);
    await p.evaluate(s => { new Function(s)(); }, prep);
    await p.waitForTimeout(1500);
    const el = p.locator(sel).first();
    if (!(await el.count())) { console.log('  ' + nom + ' : introuvable'); continue; }
    const b = await el.boundingBox();
    await p.mouse.move(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
    await p.mouse.down();
    await p.waitForTimeout(600);
    const f = SC + '/couture-' + nom + '.png';
    await p.screenshot({ path: f, clip: { x: Math.round(b.x - 4), y: Math.round(b.y - 4),
      width: Math.round(b.width + 8), height: Math.round(b.height + 8) } });
    await p.mouse.up();
    await p.waitForTimeout(300);
    faits.push([nom, f, plafond]);
  }
  await nav.close();

  const py = `
import sys
from PIL import Image
CIB = ${JSON.stringify(faits)}
SEUIL = ${SEUIL}
def cl(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ko = 0
for nom, f, plafond in CIB:
    im = Image.open(f).convert("RGB"); px = im.load(); W, H = im.size
    pire = 0.0; ou = None; n = 0
    def voir(a, b, c, x, y):
        global pire, ou, n
        e = cl(b) - max(cl(a), cl(c))
        if e > 0.8 and abs(cl(a) - cl(c)) > 8:
            n += 1
            if e > pire:
                pire = e; ou = (x, y)
    B = 26
    for y in range(4, H-4):
        for x in list(range(2, B)) + list(range(W-B, W-2)): voir(px[x-1,y], px[x,y], px[x+1,y], x, y)
    for x in range(4, W-4):
        for y in list(range(2, B)) + list(range(H-B, H-2)): voir(px[x,y-1], px[x,y], px[x,y+1], x, y)
    etat = "OK" if pire <= plafond else "KO"
    if pire > plafond: ko += 1
    note = "" if plafond == SEUIL else "   (plafond %.1f : défaut connu du moteur de verre)" % plafond
    print("  %-10s %s  couture %5.1f  sur %4d pixels de jointure%s%s" % (nom, etat, pire, n,
          ("   (le plus fort en %d,%d)" % ou) if ou and pire > plafond else "", note))
sys.exit(1 if ko else 0)
`;
  /* ON ÉCRIT LE SCRIPT DANS UN FICHIER. « python3 -c » avec une chaîne
     échappée en JSON transforme chaque saut de ligne en « \n » littéral, et
     Python refuse tout le programme d'un bloc. */
  const fs = require('fs');
  const chemin = SC + '/couture-mesure.py';
  fs.writeFileSync(chemin, py);
  try {
    console.log(execSync('python3 ' + chemin, { encoding: 'utf8' }).trimEnd());
    console.log('\n  OK — aucune couture pâle au bord d\'un bouton appuyé');
  } catch (e) {
    if (e.stdout) console.log(String(e.stdout).trimEnd());
    console.log('\n  DES COUTURES SE VOIENT');
    process.exit(1);
  }
})();
