/* ====== LE LOGO D'UN GROUPE, DANS LE JEU (v322) ======
   « Je veux aussi pouvoir ajouter une photo de profil de groupe, ou sinon
     pouvoir choisir un logo de groupe. »
   Un téléphone, un vrai PostgreSQL derrière un faux Supabase (le décor de
   groupes.js). On touche avec le doigt, comme Taylor :
     1. en créant un groupe, la pastille porte un crayon et ouvre « Image du
        groupe » : « Choisir une photo », puis seize vignettes (l'initiale et
        quinze logos) dans la couleur choisie, l'initiale retenue ;
     2. toucher la colombe : sa coche arrive, le menu se referme, la pastille
        du formulaire porte la colombe — et la garde quand on retape le nom ;
     3. « Créer » envoie p_logo, le serveur le garde ; la liste, l'en-tête de
        la discussion et la feuille d'infos montrent la colombe ;
     4. « Modifier » rouvre sur la colombe cochée ; l'église, « Enregistrer » :
        le serveur et l'en-tête suivent ;
     5. une photo posée : aucune vignette n'est cochée, « Changer la photo » et
        « Retirer la photo » sont là ; choisir un logo retire la photo (sinon
        le logo resterait caché dessous) ;
     6. les groupes à découvrir et l'aperçu par le code montrent leur logo ;
     7. un numéro de logo que ce jeu ne connaît pas s'affiche comme l'initiale ;
     8. un serveur qui ne connaît pas les logos : le petit appareil photo,
        l'ancien menu, et AUCUN p_logo envoyé (PostgREST refuserait tout
        l'appel pour un paramètre inconnu) ;
     9. aucune erreur.
   Usage : node banc-essai/logo-groupe.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 260) + ')' : '')); };
const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

(async () => {
  const m = await monter(8422, 5608);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [], appels = [];
  try {
    for (const [id, nom] of [[A, 'Taylor'], [B, 'Benoît']]) {
      await m.compte(id, id + '@essai');
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    /* 6. un groupe public de Benoît (le soleil, 12) et un privé (la montagne, 13) */
    const pub = (await m.rpc(B, 'creer_groupe', { p_nom: 'Lumière du matin', p_description: '', p_ouvert: true, p_langue: 'fr', p_teinte: 1, p_logo: 12 })).data;
    const priv = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le camp', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 3, p_logo: 13 })).data;
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);
    const logoSrv = async (nom) => m.sql("select logo from public.groupes where nom = '" + nom + "'");

    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    p.on('request', r => { if (/\/faux\/rpc$/.test(r.url())) { try { appels.push(JSON.parse(r.postData())); } catch (e) {} } });
    await p.addInitScript((moi) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, A);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    dit('le serveur annonce les logos au jeu', await p.evaluate(() => logosServeur() === true && photosServeur() === true));
    /* Les glyphes tels que la page les écrit (innerHTML ré-écrit « <rect/> »
       en « <rect></rect> ») : c'est ce qu'on compare au DOM. BRUT : la chaîne
       d'origine, pour ce qui se compare au HTML avant qu'il soit posé. */
    const SVG = await p.evaluate(() => LOGOS_GROUPE.map(l => { if (!l) return ''; const d = document.createElement('span'); d.innerHTML = l.svg; return d.innerHTML; }));
    const BRUT = await p.evaluate(() => LOGOS_GROUPE.map(l => l ? l.svg : ''));
    dit('quinze logos, et l\'initiale en tête', SVG.length === 16 && SVG[0] === '' && SVG.slice(1).every(s => /^<svg viewBox="0 0 24 24"/.test(s)));

    /* ---- 1. créer : la pastille ouvre « Image du groupe » ---- */
    await p.evaluate(() => allerOnglet('groupes'));
    await p.waitForTimeout(600);
    await p.evaluate(() => ouvrirCreation());
    await attendre(p, () => !!document.getElementById('grpNom'), null, 5000);
    await p.waitForTimeout(500);
    await p.fill('#grpNom', 'Les amis');
    await p.evaluate(() => majPastilleFormulaire());
    const bouton = await p.evaluate(() => { const b = document.querySelector('#grpCreerVeil .grp-photo-b'); return b ? { label: b.getAttribute('aria-label'), crayon: b.querySelector('.gpb-ico').innerHTML === (() => { const d = document.createElement('span'); d.innerHTML = ICONS.crayon; return d.innerHTML; })(), av: document.getElementById('grpFormAv').textContent } : null; });
    dit('la pastille du formulaire porte un crayon et dit « Image du groupe »', bouton && bouton.label === 'Image du groupe' && bouton.crayon && bouton.av === 'L', JSON.stringify(bouton));
    await p.tap('#grpCreerVeil .grp-photo-b');
    const ouvert = await attendre(p, () => document.querySelectorAll('#grpImageVeil .grp-logo-b').length === 16, null, 4000);
    await p.waitForTimeout(500);
    const menu = await p.evaluate(() => {
      const v = document.getElementById('grpImageVeil'); if (!v) return null;
      const b = [...v.querySelectorAll('.grp-logo-b')];
      return { menu: v.classList.contains('menu'), titre: (v.querySelector('.sheet-title') || {}).textContent || '', photo: [...v.querySelectorAll('.grp-act-l')].map(x => x.textContent.trim()),
               etiquette: (v.querySelector('.grp-logos-t') || {}).textContent || '', coches: b.filter(x => x.classList.contains('choisi')).map(x => b.indexOf(x)),
               initiale: b[0].querySelector('.grp-av').textContent, svgs: b.slice(1).filter(x => x.querySelector('.grp-av.a-logo > svg')).length,
               couleur: b.every(x => x.querySelector('.grp-av').getAttribute('style') === teinte(creation.teinte)), aria: b.map(x => x.getAttribute('aria-label')) };
    });
    dit('le menu « Image du groupe » s\'ouvre en bas, sous le doigt', ouvert && menu && menu.menu && /Image du groupe/.test(menu.titre), JSON.stringify(menu && menu.titre));
    dit('… « Choisir une photo » d\'abord, puis « Ou un logo »', menu && menu.photo.length === 1 && menu.photo[0] === 'Choisir une photo' && /ou un logo/i.test(menu.etiquette), JSON.stringify(menu && [menu.photo, menu.etiquette]));
    dit('… seize vignettes dans la couleur choisie : l\'initiale (retenue) et quinze logos', menu && menu.initiale === 'L' && menu.svgs === 15 && menu.couleur && JSON.stringify(menu.coches) === '[0]', JSON.stringify(menu && [menu.initiale, menu.svgs, menu.coches]));
    dit('… chacune a un nom pour les lecteurs d\'écran', menu && menu.aria[0] === 'Initiale' && menu.aria[3] === 'Colombe' && menu.aria[15] === 'Ancre', JSON.stringify(menu && menu.aria.slice(0, 4)));

    /* ---- 2. la colombe ---- */
    await p.tap('#grpImageVeil .grp-logo-b:nth-child(4)');
    await p.waitForTimeout(80);
    const coche = await p.evaluate(() => [...document.querySelectorAll('#grpImageVeil .grp-logo-b')].map((b, i) => b.classList.contains('choisi') ? i : -1).filter(i => i >= 0));
    dit('toucher la colombe : sa coche arrive, la seule', JSON.stringify(coche) === '[3]', JSON.stringify(coche));
    const ferme = await attendre(p, () => !document.getElementById('grpImageVeil'), null, 3000);
    dit('… et le menu se referme tout seul', ferme);
    let av = await p.evaluate(() => { const a = document.getElementById('grpFormAv'); return { logo: a.classList.contains('a-logo'), svg: (a.querySelector('svg') || {}).outerHTML || '' }; });
    dit('la pastille du formulaire porte la colombe', av.logo && av.svg === SVG[3], av.svg.slice(0, 60));
    await p.fill('#grpNom', 'Les amis de la colombe');
    av = await p.evaluate(() => { const a = document.getElementById('grpFormAv'); return { logo: a.classList.contains('a-logo'), n: a.querySelectorAll('svg').length, txt: a.textContent }; });
    dit('… et la garde quand on retape le nom', av.logo && av.n === 1 && av.txt === '', JSON.stringify(av));

    /* ---- 3. créer ---- */
    appels.length = 0;
    await p.tap('#grpCreerVeil .btn-primary');
    const cree = await (async () => { for (let i = 0; i < 40; i++) { if ((await logoSrv('Les amis de la colombe')) === '3') return true; await p.waitForTimeout(200); } return false; })();
    const envoi = appels.find(a => a.nom === 'creer_groupe') || {};
    dit('« Créer » envoie p_logo 3, et le serveur le garde', cree && envoi.args && envoi.args.p_logo === 3, JSON.stringify(envoi.args || {}));
    await attendre(p, () => state.screen === 'groupe', null, 6000);
    await p.waitForTimeout(1500);
    const tete = await p.evaluate((s) => { const t = document.querySelector('.grp-fil-tete .grp-av'); return t ? t.classList.contains('a-logo') && t.innerHTML === s : false; }, SVG[3]);
    dit('l\'en-tête de la discussion montre la colombe', tete);
    const infos = await p.evaluate((s) => { const v = document.getElementById('grpInfosVeil'); const a = v && v.querySelector('.sheet-title .grp-av'); return a ? a.innerHTML === s : 'pas de feuille'; }, SVG[3]);
    dit('la feuille d\'infos aussi (elle s\'ouvre seule pour un groupe privé)', infos === true, String(infos));
    await p.evaluate(() => { document.querySelectorAll('.sheet-veil').forEach(v => { try { fermerFeuilleGroupe(v.id); } catch (e) {} }); });
    await p.waitForTimeout(700);

    /* ---- 4. modifier ---- */
    await p.evaluate(() => ouvrirInfosGroupe());
    await p.waitForTimeout(600);
    await p.evaluate(() => ouvrirModifGroupe());
    await attendre(p, () => !!document.querySelector('#grpModifVeil #grpFormAv'), null, 5000);
    await p.waitForTimeout(600);
    av = await p.evaluate((s) => document.getElementById('grpFormAv').innerHTML === s, SVG[3]);
    dit('« Modifier » rouvre avec la colombe', av);
    await p.tap('#grpModifVeil .grp-photo-b');
    await attendre(p, () => document.querySelectorAll('#grpImageVeil .grp-logo-b').length === 16, null, 4000);
    await p.waitForTimeout(450);
    const deja = await p.evaluate(() => [...document.querySelectorAll('#grpImageVeil .grp-logo-b')].map((b, i) => b.classList.contains('choisi') ? i : -1).filter(i => i >= 0));
    dit('… la colombe y est cochée', JSON.stringify(deja) === '[3]', JSON.stringify(deja));
    await p.tap('#grpImageVeil .grp-logo-b:nth-child(10)');
    await attendre(p, () => !document.getElementById('grpImageVeil'), null, 3000);
    appels.length = 0;
    await p.tap('#grpModifVeil .btn-primary');
    const modifie = await (async () => { for (let i = 0; i < 40; i++) { if ((await logoSrv('Les amis de la colombe')) === '9') return true; await p.waitForTimeout(200); } return false; })();
    const envoi2 = appels.find(a => a.nom === 'modifier_groupe') || {};
    dit('l\'église, « Enregistrer » : p_logo 9 part, le serveur suit', modifie && envoi2.args && envoi2.args.p_logo === 9, JSON.stringify(envoi2.args || {}));
    await p.waitForTimeout(900);
    const tete2 = await p.evaluate((s) => { const t = document.querySelector('.grp-fil-tete .grp-av'); return t ? t.innerHTML === s : false; }, SVG[9]);
    dit('… et l\'en-tête aussi, sans recharger', tete2);

    /* ---- 5. une photo, puis un logo ---- */
    await p.evaluate(() => ouvrirInfosGroupe());
    await p.waitForTimeout(600);
    await p.evaluate(() => ouvrirModifGroupe());
    await attendre(p, () => !!document.querySelector('#grpModifVeil #grpFormAv'), null, 5000);
    await p.waitForTimeout(500);
    await p.evaluate((u) => recevoirPhotoGroupe(u), jpeg);
    dit('une photo posée couvre la pastille', await p.evaluate(() => document.getElementById('grpFormAv').classList.contains('a-photo')));
    await p.tap('#grpModifVeil .grp-photo-b');
    await attendre(p, () => document.querySelectorAll('#grpImageVeil .grp-logo-b').length === 16, null, 4000);
    await p.waitForTimeout(450);
    const avecPhoto = await p.evaluate(() => ({ coches: document.querySelectorAll('#grpImageVeil .grp-logo-b.choisi').length, act: [...document.querySelectorAll('#grpImageVeil .grp-act-l')].map(x => x.textContent.trim()) }));
    dit('avec une photo : aucune vignette cochée, « Changer » et « Retirer la photo »', avecPhoto.coches === 0 && JSON.stringify(avecPhoto.act) === '["Changer la photo","Retirer la photo"]', JSON.stringify(avecPhoto));
    await p.tap('#grpImageVeil .grp-logo-b:nth-child(2)');
    await attendre(p, () => !document.getElementById('grpImageVeil'), null, 3000);
    const sans = await p.evaluate((s) => { const a = document.getElementById('grpFormAv'); return { photo: a.classList.contains('a-photo'), retiree: creation.photo === '', croix: a.innerHTML === s }; }, SVG[1]);
    dit('choisir la croix retire la photo : la croix se voit', !sans.photo && sans.retiree && sans.croix, JSON.stringify(sans));
    await p.evaluate(() => { document.querySelectorAll('.sheet-veil').forEach(v => { try { fermerFeuilleGroupe(v.id); } catch (e) {} }); });
    await p.waitForTimeout(700);
    dit('… rien n\'est parti sans « Enregistrer »', (await logoSrv('Les amis de la colombe')) === '9');

    /* ---- 6. découvrir, et l'aperçu par le code ---- */
    await p.evaluate(() => retourGroupes());
    await p.waitForTimeout(800);
    await p.evaluate(() => { grp.publics = null; return chargerListes(); });
    await attendre(p, () => (grp.publics || []).length > 0, null, 6000);
    const decouvrir = await p.evaluate((s) => lignesPublics().indexOf(s) >= 0, BRUT[12]);
    dit('les groupes à découvrir montrent leur logo (le soleil)', decouvrir);
    const code = await m.sql("select code from public.groupes where id = '" + priv.id + "'");
    await p.evaluate((c) => ouvrirCode(c), code);
    const apercu = await attendre(p, (s) => { const a = document.querySelector('#grpApercu .grp-av'); return !!a && a.innerHTML === s; }, SVG[13], 6000);
    dit('l\'aperçu par le code montre le logo du groupe (la montagne)', apercu);
    await p.evaluate(() => { document.querySelectorAll('.sheet-veil').forEach(v => { try { fermerFeuilleGroupe(v.id); } catch (e) {} }); });
    await p.waitForTimeout(600);

    /* ---- 7. un numéro inconnu ---- */
    const inconnu = await p.evaluate(() => { const h = pastilleGroupe({ id: null, nom: 'Zacharie', teinte: 2, logo: 40 }); const d = document.createElement('div'); d.innerHTML = h; const a = d.firstElementChild; return { txt: a.textContent, logo: a.classList.contains('a-logo'), svg: !!a.querySelector('svg') }; });
    dit('un logo que ce jeu ne connaît pas (40) s\'affiche comme l\'initiale', inconnu.txt === 'Z' && !inconnu.logo && !inconnu.svg, JSON.stringify(inconnu));

    /* ---- 8. un serveur qui ne connaît pas les logos ---- */
    await p.evaluate(() => { grp.etat.logos = false; });
    await p.evaluate(() => ouvrirCreation());
    await attendre(p, () => !!document.getElementById('grpNom'), null, 5000);
    await p.waitForTimeout(500);
    const ancien = await p.evaluate(() => { const b = document.querySelector('#grpCreerVeil .grp-photo-b'); return { label: b.getAttribute('aria-label'), appareil: b.querySelector('.gpb-ico').innerHTML === (() => { const d = document.createElement('span'); d.innerHTML = ICONS.appareil; return d.innerHTML; })() }; });
    dit('sans logos au serveur : le petit appareil photo et « Photo du groupe »', ancien.label === 'Photo du groupe' && ancien.appareil, JSON.stringify(ancien));
    await p.evaluate(() => { window.__photo = 0; window.choisirPhotoGroupe = () => { window.__photo++; }; });
    await p.tap('#grpCreerVeil .grp-photo-b');
    await p.waitForTimeout(500);
    dit('… la pastille ouvre l\'ancien chemin de la photo, pas le menu des logos', await p.evaluate(() => window.__photo === 1 && !document.getElementById('grpImageVeil')));
    await p.fill('#grpNom', 'Ancien serveur');
    appels.length = 0;
    await p.tap('#grpCreerVeil .btn-primary');
    const cree2 = await (async () => { for (let i = 0; i < 40; i++) { if ((await logoSrv('Ancien serveur')) === '0') return true; await p.waitForTimeout(200); } return false; })();
    const envoi3 = appels.find(a => a.nom === 'creer_groupe') || {};
    dit('… et « Créer » n\'envoie AUCUN p_logo', cree2 && envoi3.args && !('p_logo' in envoi3.args), JSON.stringify(envoi3.args || {}));
    await p.waitForTimeout(1500);

    dit('aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await ctx.close();
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — une photo ou un logo : chaque groupe a son image');
  process.exit(ko ? 1 : 0);
})();
