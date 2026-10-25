/* ====== BANC « LE MENU DE LA PHOTO S'OUVRE SOUS LA PHOTO » (v335) ======
   « Quand je clique sur Choisir une photo, le truc qui apparaît pour choisir
     une photo ou prendre la photo s'affiche en bas : le positionnement n'est
     pas cohérent. » Sur iPhone, le menu « Photothèque / Prendre une photo /
     Choisir un fichier » s'accroche au champ de fichier : il était rangé hors
   de l'écran, sans hauteur, et le menu tombait en bas à gauche. Au moment où
   le sélecteur s'ouvre, on relève où est ce champ :
     1. Profil sans photo : toucher l'appareil photo du visage — le champ est
        sous le visage, à l'écran ;
     2. Profil avec photo : « Changer la photo » dans le menu du bas — le
        champ est sous le visage, pas en bas de l'écran ;
     3. un groupe : « Choisir une photo » — le champ est sous la grande
        pastille du formulaire ;
     4. aucune erreur.
   Avant la v335 : 1, 2 et 3 rouges — le champ hors de l'écran.
   Usage : node banc-essai/photo-menu-place.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    /* Au moment où le sélecteur s'ouvre : la place du champ, et celle de la photo. */
    await p.evaluate(() => {
      const c = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file') {
          const r = this.getBoundingClientRect(), a = document.querySelector(window.__ancre || '.avatar-tap'), ra = a ? a.getBoundingClientRect() : null;
          window.__champ = { x: r.left, y: r.top, ancre: ra ? { g: ra.left, d: ra.right, h: ra.top, b: ra.bottom } : null, hauteur: innerHeight, largeur: innerWidth };
          return;
        }
        return c.apply(this, arguments);
      };
    });
    const relever = () => p.evaluate(() => window.__champ || null);
    const sous = (c) => !!c && !!c.ancre && c.x >= c.ancre.g && c.x <= c.ancre.d && c.y >= c.ancre.h && c.y <= c.ancre.b + 4 && c.y > 0 && c.y < c.hauteur;

    /* 1 */
    await p.evaluate(() => { openProfile(); });
    await p.waitForTimeout(900);
    await p.locator('.avatar-tap').tap();
    await p.waitForTimeout(300);
    const c1 = await relever();
    dit('1. Profil sans photo : toucher l\'appareil photo — le champ est sous le visage, à l\'écran', sous(c1), JSON.stringify(c1));
    /* 2 */
    await p.evaluate(() => {
      window.__champ = null;
      const c = document.createElement('canvas'); c.width = c.height = 96;
      const x = c.getContext('2d'); x.fillStyle = '#3a6ea5'; x.fillRect(0, 0, 96, 96); x.fillStyle = '#d9822b'; x.fillRect(20, 20, 56, 56);
      enregistrerPhoto(c.toDataURL('image/jpeg', 0.8)); render();
    });
    await p.waitForTimeout(700);
    await p.locator('.avatar-tap').tap();
    await p.waitForTimeout(900);
    const ligne = p.locator('#profilPhotoVeil .grp-act-l').first();
    await ligne.tap();
    await p.waitForTimeout(400);
    const c2 = await relever();
    dit('2. Profil avec photo : « Changer la photo » — le champ est sous le visage, pas en bas', sous(c2) && c2.y < c2.hauteur * 0.6, JSON.stringify(c2));
    /* 3 */
    await p.evaluate(() => {
      window.__champ = null; window.__ancre = '.grp-photo-b';
      compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'joueur@exemple.net' } }; compte.etape = 'connecte';
      grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false, ouverts: true, photos: true, logos: true };
      grp.liste = []; grp.publics = []; state.screen = 'groupes'; render(); ouvrirCreation();
    });
    await p.waitForTimeout(1000);
    await p.locator('.grp-photo-b').tap();
    await p.waitForTimeout(900);
    await p.locator('#grpImageVeil .grp-act-l').first().tap();
    await p.waitForTimeout(400);
    const c3 = await relever();
    dit('3. un groupe : « Choisir une photo » — le champ est sous la grande pastille du formulaire', sous(c3), JSON.stringify(c3));
    await ctx.close();
    dit('4. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le menu de la photo s\'ouvre contre la photo qu\'on change');
  process.exit(ko ? 1 : 0);
})();
