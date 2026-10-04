/* ===== LE DÉCOR TIENT PENDANT LA MONTÉE, MÊME QUAND LA PAGE EST EN RETARD =====
   « Des fois ils s'ouvrent presque pareil, mais il y a un petit décalage. »
   Une feuille monte par une animation que le COMPOSITEUR joue seul ; le décor
   vu à travers elle était recalé par le JAVASCRIPT, image par image. Sur
   cette machine les deux horloges n'en font qu'une, et le défaut était
   invisible (moins d'un pixel). Sur un téléphone, la page a parfois une image
   de retard sur le compositeur — et le décor glisse.
   Le banc RECRÉE ce retard : le fil principal est bloqué 45 ms à chaque image
   pendant la montée, le compositeur reste libre. On regarde alors les images
   RÉELLEMENT AFFICHÉES (capture du compositeur), accueil caché et contenu de
   la feuille masqué : il ne reste que le décor et la vitre. Pour chaque paire
   d'images, on mesure combien les pixels couverts par la feuille dans les
   deux ont changé. Un décor qui tient ne change pas.
   Relevé à l'écriture de ce banc :
       v300, décor suivi par le JavaScript   moyen 6,48   pire 21,18 / 255
       contre-mouvement (contreMonte)        moyen 0,02   pire  0,41 / 255
   Le témoin coupe le contre-mouvement : il DOIT glisser, sinon le banc est
   aveugle. Et la feuille ne doit jamais reculer en montant (un rebond).
   Usage : node banc-essai/decor-tenu.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
async function mesure(nav, temoin) {
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:1, isMobile:true, hasTouch:true, userAgent:IOS, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' })); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.waitForTimeout(6500);
  await p.addStyleTag({ content:`.settings-sheet > *:not(.gs):not(.glass-rim){ visibility:hidden !important; } .settings-sheet .glass-rim{ visibility:hidden !important; }
    #app{ visibility:hidden !important; }
    ${temoin ? '.settings-sheet.contre .gs{ animation:none !important; }' : ''}` });
  await p.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(p);
  const images = [];
  let capture = false;
  cdp.on('Page.screencastFrame', async (f) => { try { await cdp.send('Page.screencastFrameAck', { sessionId:f.sessionId }); } catch(e){} if (capture) images.push({ t: f.metadata && f.metadata.timestamp || 0, d: f.data }); });
  await cdp.send('Page.startScreencast', { format:'png', everyNthFrame:1 });
  await p.waitForTimeout(300);
  capture = true;
  await p.waitForTimeout(250);         // les premières images : la référence, sans feuille
  await p.evaluate(() => {
    openSettings();
    const t0 = performance.now();
    const charge = () => { const fin = performance.now() + 45; while (performance.now() < fin) {} if (performance.now() - t0 < 700) requestAnimationFrame(charge); };
    requestAnimationFrame(charge);
  });
  await p.waitForTimeout(1500);
  capture = false;
  await cdp.send('Page.stopScreencast');
  /* LES IMAGES PEUVENT ARRIVER DANS LE DÉSORDRE. Leur ordre d'arrivée
     faisait croire à un recul de la feuille (440 -> 467 -> 421) : c'était
     une image plus ancienne livrée en retard. On les remet dans l'ordre de
     leur horodatage, et une image en double n'est comptée qu'une fois. */
  images.sort((a, b) => a.t - b.t);
  const vues = new Set(); const ordre = [];
  for (const im of images) { if (vues.has(im.t)) continue; vues.add(im.t); ordre.push(im.d); }
  images.length = 0; images.push(...ordre);
  /* Analyse dans la page : pour chaque paire d'images, différence moyenne des
     pixels couverts par la feuille dans les DEUX images (colonne x = 196,
     plus deux colonnes à 120 et 270). Un décor fixe ne change pas. */
  const res = await p.evaluate(async (imgs) => {
    const lire = async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height); };
    const datas = []; for (const b of imgs) datas.push(await lire(b));
    const W = datas[0].width, H = datas[0].height;
    const ref = datas[0];
    /* Bord haut de la feuille : premier pixel qui s'écarte NETTEMENT de
       l'image de référence (décor seul), en descendant la colonne centrale. */
    const haut = (d) => { for (let y = 60; y < H - 5; y++) { const i = (y * W + 196) * 4; const e = Math.abs(d.data[i] - ref.data[i]) + Math.abs(d.data[i+1] - ref.data[i+1]) + Math.abs(d.data[i+2] - ref.data[i+2]); if (e > 45) return y; } return H; };
    const hauts = datas.map(haut);
    const ecarts = [];
    for (let k = 1; k < datas.length; k++) {
      const y0 = Math.max(hauts[k], hauts[k - 1]) + 25;      // sous les deux bords, loin de l'arrondi
      let s = 0, n = 0;
      for (const x of [120, 196, 270]) for (let y = y0; y < H - 10; y += 2) {
        const i = (y * W + x) * 4; const a = datas[k].data, b = datas[k - 1].data;
        s += Math.abs(a[i] - b[i]) + Math.abs(a[i+1] - b[i+1]) + Math.abs(a[i+2] - b[i+2]); n += 3;
      }
      ecarts.push(n ? s / n : 0);
    }
    return { n: datas.length, hauts, ecarts };
  }, images);
  const mouv = res.ecarts.filter((e, i) => res.hauts[i + 1] !== res.hauts[i]);
  await ctx.close();
  const moyen = mouv.reduce((a, b) => a + b, 0) / Math.max(1, mouv.length);
  return { n: res.n, moyen, pire: Math.max(0, ...mouv), hauts: res.hauts };
}
(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const t = await mesure(nav, true);
  const e = await mesure(nav, false);
  await nav.close();
  const recule = (h) => { let m = 0; for (let i = 1; i < h.length; i++) if (h[i] > h[i - 1]) m = Math.max(m, h[i] - h[i - 1]); return m; };
  console.log('  témoin, sans contre-mouvement  ' + t.n + ' images · décor : moyen ' + t.moyen.toFixed(2) + ', pire ' + t.pire.toFixed(2));
  console.log('  le jeu                         ' + e.n + ' images · décor : moyen ' + e.moyen.toFixed(2) + ', pire ' + e.pire.toFixed(2)
    + ' · bord ' + e.hauts[2] + ' -> ' + e.hauts[e.hauts.length - 1] + ', recul max ' + recule(e.hauts) + ' px');
  if (process.env.BORDS) console.log('  bords : ' + e.hauts.join(' ') + '\n  témoin : ' + t.hauts.join(' '));
  const ko = [];
  if (t.pire < 5) ko.push('le témoin ne montre aucun glissement (' + t.pire.toFixed(2) + ') : le banc ne sait pas voir le défaut');
  if (e.pire > 2) ko.push('le décor bouge dans les images affichées pendant la montée (pire ' + e.pire.toFixed(2) + ' sur 255)');
  if (recule(e.hauts) > 2) ko.push('la feuille recule pendant sa montée (' + recule(e.hauts) + ' px) : un rebond');
  if (e.n < 12) ko.push('trop peu d\'images capturées (' + e.n + ')');
  console.log(ko.length ? '\n  ÉCHEC :\n    ' + ko.join('\n    ') : '\n  OK — le décor tient par le compositeur, même quand la page est en retard');
  process.exit(ko.length ? 1 : 0);
})();
