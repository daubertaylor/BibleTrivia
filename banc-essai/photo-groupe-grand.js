/* ====== BANC « LA PHOTO D'UN GROUPE SE VOIT EN GRAND » (v335) ======
   « Pour la photo de profil de groupe, je veux qu'on puisse la voir en
     cliquant quelque part. » Le même geste que pour un visage, partout où
   elle se montre. Sur un iPhone et un Android, un groupe à photo et un
   groupe à logo :
     1. Mes groupes : toucher la photo l'ouvre en grand — en carré arrondi,
        avec le nom du groupe — et n'ouvre PAS le groupe ; elle s'enfonce
        sous le doigt, la ligne ne se teinte pas ;
     2. toucher le grand format le referme ;
     3. toucher le nom, sur la même ligne, ouvre le groupe ;
     4. en tête de la discussion : la photo s'ouvre en grand, le nom ouvre
        la page du groupe ;
     5. sur la page du groupe, la photo du titre s'ouvre en grand ;
     6. un groupe à logo : le toucher ouvre le groupe, rien d'autre ;
     7. « Modifier le groupe » : la grande pastille du formulaire ouvre le
        choix de l'image, pas le grand format ;
     8. aucune erreur.
   Avant la v335 : 1, 2, 4 et 5 rouges — la photo d'un groupe ne s'ouvrait
   nulle part.
   Usage : node banc-essai/photo-groupe-grand.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

const DECOR = () => {
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  compte.dispo = true; profile.name = 'Taylor';
  compte.session = { user: { id: 'moi-0', email: 'joueur@exemple.net' } }; compte.etape = 'connecte';
  grp.installe = true; grp.ouverts = true; grp.message = '';
  grp.etat = { participe: 'ok', moderateur: false, ouverts: true, photos: true, logos: true };
  grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' } };
  /* une vraie photo, un dégradé en JPEG, posée dans le cache des photos */
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 96, 96); g.addColorStop(0, '#d9822b'); g.addColorStop(1, '#3a6ea5');
  x.fillStyle = g; x.fillRect(0, 0, 96, 96);
  poserPhotoSrv('g:g-1', 5, c.toDataURL('image/jpeg', 0.8));
  grp.liste = [
    { id: 'g-1', nom: 'Teste', teinte: 2, logo: 0, photo_maj: 5, ouvert: false, code: 'ABC234', nb_membres: 1, non_lus: 0, dernier_message: il(0.1), apercu: null },
    { id: 'g-2', nom: 'Teste 1', teinte: 5, logo: 3, ouvert: true, code: 'DEF567', nb_membres: 1, non_lus: 0, dernier_message: il(0.2), apercu: null }];
  grp.publics = [];
  grp.membres = { 'g-1': [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null, lu_jusqu: 0, rejoint_le: il(5) }],
                  'g-2': [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null, lu_jusqu: 0, rejoint_le: il(5) }] };
  const m = (gid) => ({ charge: true, tout: true, messages: [{ id: 1, groupe: gid, auteur: null, genre: 'systeme', texte: 'cree', donnees: { nom: 'Taylor' }, cree_le: il(1), masque: false, supprime_le: null }] });
  grp.fils = { 'g-1': m('g-1'), 'g-2': m('g-2') };
  grp.courant = null; state.screen = 'groupes'; render();
};
const ETAT = () => {
  const v = document.getElementById('photoGrandVeil');
  const im = v && v.querySelector('.pv-img');
  return { ecran: state.screen, courant: grp.courant, grand: !!v, groupe: !!(im && im.classList.contains('pv-groupe')),
    rayon: im ? getComputedStyle(im).borderTopLeftRadius : '', nom: v ? (v.querySelector('.pv-nom') || {}).textContent || '' : '',
    infos: !!document.getElementById('grpInfosVeil'), image: !!document.getElementById('grpImageVeil') };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(DECOR);
      await p.waitForTimeout(1200);
      /* on neutralise le serveur : ouvrir un groupe ne doit rien charger */
      await p.evaluate(() => { window.chargerMembres = async () => {}; window.chargerFil = async () => {}; });
      const centre = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
      const toucher = async (sel, tenir) => {
        const c = await centre(sel);
        if (!c) return false;
        if (tenir) {
          await p.mouse.move(c.x, c.y); await p.mouse.down();
          await p.waitForTimeout(tenir);
          const r = await p.evaluate((s) => { const a = document.querySelector(s), b = a && a.closest('button'); return { enfonce: !!(a && a.classList.contains('enfonce')), sansAppui: !!(b && b.classList.contains('sans-appui')), onde: !!(b && b.classList.contains('onde')) }; }, sel);
          await p.mouse.up();
          return r;
        }
        await p.touchscreen.tap(c.x, c.y);
        return true;
      };
      const fermer = async () => { await p.evaluate(() => { const v = document.getElementById('photoGrandVeil'); if (v) v.click(); }); await p.waitForTimeout(300); };

      /* 1 */
      const appui = await toucher('#grpMes .grp-ligne:nth-child(1) .grp-av', 150);
      await p.waitForTimeout(400);
      const e1 = await p.evaluate(ETAT);
      dit('1. ' + tel + ', Mes groupes : la photo s\'ouvre en grand (carré arrondi, le nom), le groupe ne s\'ouvre pas ; elle s\'enfonce, la ligne ne se teinte pas',
        e1.grand && e1.groupe && parseFloat(e1.rayon) > 20 && e1.nom === 'Teste' && e1.ecran === 'groupes' && !e1.courant && appui && appui.enfonce && appui.sansAppui && !appui.onde,
        JSON.stringify({ e1, appui }));
      /* 2 */
      await fermer();
      const e2 = await p.evaluate(ETAT);
      dit('2. ' + tel + ', toucher le grand format le referme', !e2.grand && e2.ecran === 'groupes', JSON.stringify(e2));
      /* 3 */
      await toucher('#grpMes .grp-ligne:nth-child(1) .grp-txt');
      await p.waitForTimeout(900);
      const e3 = await p.evaluate(ETAT);
      dit('3. ' + tel + ', toucher le nom ouvre le groupe', e3.ecran === 'groupe' && e3.courant === 'g-1' && !e3.grand, JSON.stringify(e3));
      /* 4 */
      await toucher('.grp-fil-tete .grp-tete .grp-av');
      await p.waitForTimeout(400);
      const e4a = await p.evaluate(ETAT);
      await fermer();
      await toucher('.grp-fil-tete .grp-tete b, .grp-fil-tete .grp-tete .gt-nom, .grp-fil-tete .grp-tete .grp-txt');
      await p.waitForTimeout(900);
      const e4b = await p.evaluate(ETAT);
      dit('4. ' + tel + ', en tête de la discussion : la photo en grand, le nom ouvre la page du groupe', e4a.grand && e4a.groupe && !e4a.infos && e4b.infos && !e4b.grand, JSON.stringify({ e4a, e4b }));
      /* 5 */
      if (!e4b.infos) { await p.evaluate(() => ouvrirInfosGroupe()); await p.waitForTimeout(900); }
      await toucher('#grpInfosVeil .sheet-title .grp-av');
      await p.waitForTimeout(400);
      const e5 = await p.evaluate(ETAT);
      dit('5. ' + tel + ', sur la page du groupe, la photo du titre s\'ouvre en grand', e5.grand && e5.groupe && e5.nom === 'Teste', JSON.stringify(e5));
      await fermer();
      /* 7 : Modifier le groupe */
      await p.evaluate(() => { ouvrirModifGroupe(); });
      await p.waitForTimeout(1000);
      await toucher('#grpFormAv');
      await p.waitForTimeout(900);
      const e7 = await p.evaluate(ETAT);
      dit('7. ' + tel + ', « Modifier le groupe » : la grande pastille ouvre le choix de l\'image, pas le grand format', !e7.grand && e7.image, JSON.stringify(e7));
      /* 6 : un groupe à logo */
      await p.evaluate(() => { document.querySelectorAll('.sheet-veil').forEach(v => v.remove()); document.documentElement.classList.remove('sous-page'); grp.courant = null; state.screen = 'groupes'; render(); });
      await p.waitForTimeout(900);
      await toucher('#grpMes .grp-ligne:nth-child(2) .grp-av');
      await p.waitForTimeout(900);
      const e6 = await p.evaluate(ETAT);
      dit('6. ' + tel + ', un groupe à logo : le toucher ouvre le groupe, rien d\'autre', !e6.grand && e6.ecran === 'groupe' && e6.courant === 'g-2', JSON.stringify(e6));
      await ctx.close();
    }
    dit('8. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la photo d\'un groupe s\'ouvre en grand partout où elle se montre');
  process.exit(ko ? 1 : 0);
})();
