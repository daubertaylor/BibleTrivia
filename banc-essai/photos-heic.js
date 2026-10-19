/* ====== BANC « TOUTE PHOTO SE LIT, MÊME CELLE D'UN IPHONE SUR ANDROID » (v329) ======
   « Pour les images de groupe, il y a des images qui ne peuvent pas être
     lues. » Les photos d'iPhone sont en HEIC : Safari les lit, Chrome non
   (mesuré dans ce Chromium : « The source image could not be decoded »).
   Le jeu charge alors, et alors seulement, un décodeur HEIC. Ici le décodeur
   est une doublure (servie à son adresse figée) qui compte ses chargements et
   peint l'image en rouge ; le vrai (libheif 1.18.2) a été éprouvé à part sur
   une vraie photo HEIC.
     1. une photo HEIC (reconnue à ses octets, même mal nommée) : le cadrage
        s'ouvre, l'image est celle que le décodeur a faite, et la photo du
        groupe part en JPEG ;
     2. une deuxième : le décodeur n'est pas rechargé ;
     3. une photo ordinaire (PNG) dans un téléphone neuf : le décodeur n'est
        JAMAIS chargé ;
     4. décodeur injoignable (pas de réseau) : « Cette image n'a pas pu être
        lue. », sans erreur ;
     5. une photo très détaillée (du bruit pur) : elle passe sous le plafond
        du serveur au lieu d'être dite illisible ;
     6. aucune erreur.
   Usage : node banc-essai/photos-heic.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const DECODEUR = 'https://cdn.jsdelivr.net/npm/libheif-js@1.18.2/libheif-wasm/libheif-bundle.js';
const FAUX_DECODEUR = `window.__heicCharge = (window.__heicCharge || 0) + 1;
var libheif = function(){ return { HeifDecoder: function(){ this.decode = function(buf){ window.__heicOctets = buf.length;
  return [{ get_width: function(){ return 640; }, get_height: function(){ return 480; },
    display: function(img, cb){ for (var i = 0; i < img.data.length; i += 4){ img.data[i] = 210; img.data[i+1] = 30; img.data[i+2] = 40; img.data[i+3] = 255; } cb(img); } }]; }; } }; };`;
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const telephone = async (decodeur) => {
    const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route(DECODEUR, (r) => decodeur ? r.fulfill({ status: 200, contentType: 'application/javascript', body: FAUX_DECODEUR }) : r.abort('internetdisconnected'));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(400);
    return { ctx, p };
  };
  /* Une photo choisie pour un groupe, comme le sélecteur la rend : le jeu
     ouvre son cadrage ; on valide, et on lit ce qui est parti. */
  const choisir = (p, sorte) => p.evaluate(async (sorte) => {
    creation = { type: 'prive', teinte: 0, logo: 0, photo: undefined, gid: null };
    let fichier;
    if (sorte === 'heic') {
      const t = new Uint8Array(4096); t.set([0, 0, 0, 28]); t.set(Array.from('ftypheic', c => c.charCodeAt(0)), 4);
      for (let i = 32; i < t.length; i++) t[i] = (i * 37) & 255;
      fichier = new File([t], 'IMG_0042.jpg', { type: '' });          // mal nommé, sans type : reconnu à ses octets
    } else {
      const c = document.createElement('canvas'); c.width = sorte === 'bruit' ? 1800 : 600; c.height = sorte === 'bruit' ? 1800 : 400;
      const g = c.getContext('2d');
      if (sorte === 'bruit') { const d = g.createImageData(c.width, c.height); for (let i = 0; i < d.data.length; i++) d.data[i] = (i % 4 === 3) ? 255 : Math.floor(Math.random() * 256); g.putImageData(d, 0, 0); }
      else { g.fillStyle = '#2E7FE8'; g.fillRect(0, 0, c.width, c.height); }
      const b = await new Promise(r => c.toBlob(r, 'image/png'));
      fichier = new File([b], 'photo.png', { type: 'image/png' });
    }
    let refus = null;
    const vraiModal = showModal;
    showModal = (o) => { refus = o && o.message; };
    photoCible = recevoirPhotoGroupe;
    await ouvrirCadrage(fichier);
    await new Promise(r => setTimeout(r, 700));
    const cadre = !!document.getElementById('cadrageVeil');
    if (cadre) validerCadrage();
    await new Promise(r => setTimeout(r, 400));
    showModal = vraiModal;
    const photo = typeof creation.photo === 'string' ? creation.photo : '';
    let centre = null;
    if (photo) {
      const im = new Image(); im.src = photo; await im.decode();
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      centre = Array.from(g.getImageData(c.width >> 1, c.height >> 1, 1, 1).data).slice(0, 3);
    }
    return { cadre, refus, longueur: photo.length, jpeg: photo.indexOf('data:image/jpeg;base64,') === 0, centre, charges: window.__heicCharge || 0, octets: window.__heicOctets || 0 };
  }, sorte);

  /* 1 & 2 */
  let { ctx, p } = await telephone(true);
  let r = await choisir(p, 'heic');
  dire(r.cadre && r.jpeg && r.charges === 1 && r.octets === 4096 && r.centre && r.centre[0] > 180 && r.centre[1] < 70,
    '1. une photo HEIC (mal nommée, sans type) : décodée (' + r.octets + ' octets lus), cadrée, partie en JPEG — centre ' + JSON.stringify(r.centre));
  r = await choisir(p, 'heic');
  dire(r.cadre && r.charges === 1, '2. une deuxième : le décodeur n\'est pas rechargé (chargé ×' + r.charges + ')');
  await ctx.close();

  /* 3 */
  ({ ctx, p } = await telephone(true));
  r = await choisir(p, 'png');
  dire(r.cadre && r.jpeg && r.charges === 0, '3. une photo ordinaire : le décodeur n\'est jamais chargé (×' + r.charges + ')');
  /* 5 */
  r = await choisir(p, 'bruit');
  dire(r.cadre && r.jpeg && r.longueur > 0 && r.longueur <= 56000 && !r.refus, '5. une photo très détaillée passe sous le plafond du serveur (' + r.longueur + ' caractères)');
  await ctx.close();

  /* 4 */
  ({ ctx, p } = await telephone(false));
  r = await choisir(p, 'heic');
  dire(!r.cadre && /n'a pas pu être lue/.test(r.refus || ''), '4. décodeur injoignable : « ' + r.refus + ' »');
  await ctx.close();

  dire(!errs.length, '6. aucune erreur' + (errs.length ? ' : ' + errs.slice(0, 2).join(' | ') : ''));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — toute photo se lit : HEIC décodée à la demande, détaillée réduite sous le plafond');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
