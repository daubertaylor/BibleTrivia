/* ================== BANC « MENTIONS LÉGALES ET SIGNALER UNE PHOTO » (v346) ==================
   « Pour les mentions légales, pour l'instant le jeu sera à mon compte. S'il
     faut mon nom : Taylor Dauber, et pour l'adresse mail celle de Yada. S'il
     faut un numéro de téléphone obligatoire, ajoute-le ; sinon, non. Je veux
     que ce soit propre, sans trop d'informations sur moi. »
   « Ajoute la possibilité de signaler un joueur pour plusieurs raisons, par
     exemple une photo de profil qui n'est pas appropriée. »

   Ce qui est vérifié :
     1. Réglages : « Confidentialité » et « Mentions légales » sur UNE ligne,
        deux cibles de 44 px, dans la page — sur un grand et un petit écran.
     2. La page des mentions (v349, refaite « simple et très professionnelle ») :
        l'éditeur et directeur de la publication (Taylor Dauber), son
        téléphone (v350 : « pour le numéro de téléphone tu peux mettre
        0784045770 », Taylor, 08/11/2026 — en lien tel:), son adresse quand
        elle est complète, l'adresse de Yada en lien mailto, l'hébergeur avec
        son adresse et SON téléphone (la loi le demande), et le lien vers la
        Confidentialité ; aucun AUTRE numéro de téléphone, aucune autre
        donnée personnelle ; rien ne déborde.
     3. En anglais et en espagnol : chaque ligne traduite (aucun mot français).
     4. Une photo de profil vue en grand : « Signaler cette photo » ; le
        toucher ouvre SA page (v352) : « Signaler cette photo », la photo et
        le nom en tête, les raisons d'une PHOTO (nudité, violence, haine, la
        photo de quelqu'un d'autre, publicité, autre), rien de coché,
        « Envoyer » qui attend ; il part avec la raison « photo », ce qu'elle
        montre en tête du détail.
     5. Jamais sur sa propre photo, ni sans compte, ni en mode modération ;
        jamais sur la photo de son propre groupe ; oui sur celle d'un groupe
        dont on est simple membre (raisons d'un GROUPE).
     6. Un serveur d'avant la v346 refuse « photo » : le signalement repart
        comme « contenu inapproprié », la raison écrite en tête du détail, et
        le remerciement s'affiche — rien ne se perd.
     7. Un MESSAGE garde ses cinq raisons d'avant.
     8. En ligne, le joueur dit son compte s'il en a un (c'est lui qu'on
        signale), rien sinon.
     9. Aucune erreur.
   Aucun contact avec le vrai serveur : la bibliothèque Supabase est vide, et
   les appels du signalement sont remplacés dans la page.
   Usage : node banc-essai/mentions-signaler.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };
const PHOTO = "url('data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27><rect width=%2710%27 height=%2710%27 fill=%27%23C9A27E%27/></svg>')";

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const ouvrir = async (lg, taille) => {
    const ctx = await nav.newContext({ viewport: taille || { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(lg + ' : ' + e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript((l) => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_langue', l); }, lg);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(700);
    return { ctx, p };
  };
  const pagePosee = (p, id) => p.waitForFunction((i) => { const v = document.getElementById(i); if (!v || v.classList.contains('closing')) return false;
    const s = v.querySelector('.settings-sheet'); if (!s) return false; const r = s.getBoundingClientRect(); return Math.abs(r.left) < 1; }, id, { timeout: 6000 }).then(() => true, () => false);
  try {
    /* ---- 1. Les deux liens, sur une ligne ---- */
    for (const [nom, taille] of [['iPhone 16', { width: 393, height: 852 }], ['petit écran', { width: 320, height: 640 }]]) {
      const { ctx, p } = await ouvrir('fr', taille);
      await p.evaluate(() => openSettings());
      await pagePosee(p, 'settingsVeil'); await p.waitForTimeout(400);
      const r = await p.evaluate(() => {
        const ls = [...document.querySelectorAll('#settingsVeil .liens-legaux .lien-conf')];
        const sh = document.querySelector('#settingsVeil .settings-sheet').getBoundingClientRect();
        return { n: ls.length, textes: ls.map(l => l.textContent.trim()),
          boites: ls.map(l => { const b = l.getBoundingClientRect(); return { h: Math.round(b.height), mil: Math.round((b.top + b.bottom) / 2), g: b.left, d: b.right }; }),
          dedans: ls.every(l => { const b = l.getBoundingClientRect(); return b.left >= sh.left - 0.5 && b.right <= sh.right + 0.5; }) };
      });
      const uneLigne = r.n === 2 && Math.abs(r.boites[0].mil - r.boites[1].mil) <= 1 && r.boites[0].d <= r.boites[1].g + 0.5;
      dit('1. ' + nom + ' : « Confidentialité » et « Mentions légales » côte à côte, deux cibles de 44 px, dans la page',
        uneLigne && r.boites.every(b => b.h >= 44) && r.dedans && r.textes[0] === 'Confidentialité' && r.textes[1] === 'Mentions légales', JSON.stringify(r));
      await ctx.close();
    }

    /* ---- 2 et 3. La page des mentions, en trois langues ---- */
    const FRANCAIS = /Éditeur|directeur de la publication|Hébergeur|Données personnelles|Confidentialité|États-Unis/;
    for (const lg of ['fr', 'en', 'es']) {
      const { ctx, p } = await ouvrir(lg);
      await p.evaluate(() => openSettings());
      await pagePosee(p, 'settingsVeil'); await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelectorAll('#settingsVeil .liens-legaux .lien-conf')[1].click());
      const posee = await pagePosee(p, 'mentionsVeil'); await p.waitForTimeout(300);
      const m = await p.evaluate(() => {
        const v = document.getElementById('mentionsVeil'); if (!v) return null;
        const corps = v.querySelector('.grp-feuille-corps') || v;
        const mail = v.querySelector('a.lien-mail');
        const s = v.querySelector('.settings-sheet');
        const t = v.querySelector('a.ment-tel');
        /* (v350) Le téléphone est aussi un lien : l'e-mail se cherche par son mailto. */
        const mel = v.querySelector('a.lien-mail[href^="mailto:"]');
        return { titre: (v.querySelector('.st-mot') || {}).textContent, texte: corps.textContent.replace(/\s+/g, ' ').trim(), lignes: corps.querySelectorAll('.conf-l').length,
          mail: mel ? mel.getAttribute('href') : null, deborde: s.scrollWidth - s.clientWidth,
          tel: t ? t.getAttribute('href') + ' ' + t.textContent : null, attendues: EDITEUR.adresse ? 7 : 6, adresse: EDITEUR.adresse };
      });
      if (!m) { dit('2. ' + lg + ' : la page des mentions s\'ouvre', false, 'introuvable'); await ctx.close(); continue; }
      /* Les seuls numéros permis : celui de l'hébergeur, et celui que Taylor a
         donné pour cette page (v350). Tout autre est une fuite. */
      const tel = /(\+33|\b0\d([ .]?\d\d){4}\b)/.test(m.texte.replace('+1 650 319 8930', '').replace('07 84 04 57 70', ''));
      if (lg === 'fr') {
        dit('2. la page « Mentions légales » : l\'éditeur et directeur de la publication (Taylor Dauber, une seule fois), l\'adresse de Yada (lien mailto), l\'hébergeur avec son téléphone, le lien vers la Confidentialité',
          posee && m.titre === 'Mentions légales' && /Éditeur et directeur de la publication : Taylor Dauber/.test(m.texte) && m.mail === 'mailto:yadaquiz.app@gmail.com'
          && (m.texte.match(/Taylor Dauber/g) || []).length === 1 && /Cloudflare, Inc\., 101 Townsend Street, San Francisco, CA 94107, États-Unis — \+1 650 319 8930/.test(m.texte)
          && /Données personnelles : Confidentialité/.test(m.texte) && /Hébergeur des données : Supabase Pte\. Ltd\., 65 Chulia Street/.test(m.texte) && m.lignes === m.attendues
          && m.tel === 'tel:+33784045770 07 84 04 57 70' && /Téléphone : 07 84 04 57 70/.test(m.texte) && (!m.adresse || m.texte.includes('Adresse : ' + m.adresse)),
          JSON.stringify({ posee, titre: m.titre, mail: m.mail, tel: m.tel, lignes: m.lignes, texte: m.texte.slice(0, 300) }));
        dit('2. … aucun autre numéro de téléphone que ceux de l\'hébergeur et de l\'éditeur, aucune adresse personnelle, rien ne déborde',
          !tel && !/daubertaylor22|@gmail\.com/.test(m.texte.replace('yadaquiz.app@gmail.com', '')) && m.deborde <= 0, JSON.stringify({ tel, deborde: m.deborde }));
      } else {
        const reste = (m.texte.match(FRANCAIS) || [])[0];
        dit('3. ' + lg + ' : chaque ligne traduite, le même lien mailto, aucun autre téléphone que celui de l\'hébergeur',
          posee && !reste && m.titre !== 'Mentions légales' && m.mail === 'mailto:yadaquiz.app@gmail.com' && !tel && m.lignes === m.attendues && m.deborde <= 0
          && m.tel === 'tel:+33784045770 07 84 04 57 70'
          && /\+1 650 319 8930/.test(m.texte),
          JSON.stringify({ titre: m.titre, reste, mail: m.mail, lignes: m.lignes }));
      }
      await ctx.close();
    }

    /* ---- 4 à 8. Signaler une photo ---- */
    const { ctx, p } = await ouvrir('fr');
    await p.evaluate((PH) => {
      window.__appels = [];
      window.__ancien = false;     // true : le serveur d'avant la v346 (il refuse « photo »)
      compteConnecte = () => true;
      monId = () => 'moi-0000';
      modeModeration = () => false;
      photoValeur = () => PH;
      valeurPhotoSrv = () => PH;
      grp.profils['u-2'] = { nom: 'Sam' };
      grp.liste = [{ id: 'g-1', nom: 'Les Psaumes', role: 'membre' }, { id: 'g-2', nom: 'Mon groupe', role: 'proprietaire' }];
      appelGroupe = async (nom, args) => { window.__appels.push({ nom, args: JSON.parse(JSON.stringify(args)) });
        if (nom === 'signaler' && window.__ancien && ['photo', 'nom', 'usurpation'].includes(args.p_raison)) return { ok: false, erreur: 'raison' };
        return { ok: true }; };
    }, PHOTO);
    const lien = (pid) => p.evaluate(async (pid) => {
      ouvrirPhotoGrand(pid);
      await new Promise(r => setTimeout(r, 500));
      const v = document.getElementById('photoGrandVeil');
      const b = v ? v.querySelector('.pv-signaler') : null;
      let geo = null;
      if (b) { const r = b.getBoundingClientRect(), img = v.querySelector('.pv-img').getBoundingClientRect();
        geo = { centre: Math.round((r.left + r.right) / 2 - innerWidth / 2), bas: Math.round(innerHeight - r.bottom), sousPhoto: r.top >= img.bottom - 0.5, h: Math.round(r.height), texte: b.textContent.trim() }; }
      return { ouverte: !!v, lien: !!b, geo };
    }, pid);
    const fermer = async () => { await p.evaluate(() => { try { fermerPhotoGrand(); } catch (e) {} try { fermerFeuilleGroupe('grpSignalerVeil'); } catch (e) {} });
      await p.waitForTimeout(500); };

    const a4 = await lien('u:u-2');
    dit('4. la photo d\'un autre joueur en grand : « Signaler cette photo », sous la photo, au centre, à portée de pouce',
      a4.ouverte && a4.lien && a4.geo.texte === 'Signaler cette photo' && Math.abs(a4.geo.centre) <= 1 && a4.geo.sousPhoto && a4.geo.bas >= 8 && a4.geo.h >= 36, JSON.stringify(a4));
    await p.evaluate(() => document.querySelector('#photoGrandVeil .pv-signaler').click());
    await p.waitForTimeout(900);
    const PAGE_PHOTO = () => { const v = document.getElementById('grpSignalerVeil'); if (!v) return null;
      const img = v.querySelector('.sp-img');
      return { titre: (v.querySelector('.st-mot') || {}).textContent, raisons: [...v.querySelectorAll('.grp-raison')].map(b => b.dataset.k),
        cochee: (v.querySelector('.grp-raison.choisie') || { dataset: {} }).dataset.k || null, envoi: !document.getElementById('grpSignalerEnvoi').disabled,
        image: img ? img.getAttribute('style') : null, nom: (v.querySelector('.sp-nom') || {}).textContent || null,
        textes: [...v.querySelectorAll('.grp-raison .gal-t')].map(x => x.textContent), photo: !!document.getElementById('photoGrandVeil') }; };
    const f4 = await p.evaluate(PAGE_PHOTO);
    const RAISONS = 'nudite,violence,haine,usurpation,arnaque,autre';
    dit('4. … le toucher ouvre SA page : « Signaler cette photo », la photo et le nom en tête, les raisons d\'une photo, rien de coché, « Envoyer » qui attend',
      !!f4 && f4.titre === 'Signaler cette photo' && f4.raisons.join() === RAISONS && !f4.cochee && !f4.envoi && !f4.photo
      && !!f4.image && f4.image.includes(PHOTO) && f4.nom === 'Sam' && f4.textes[0] === 'Nudité ou contenu sexuel', JSON.stringify(f4));
    await p.evaluate(() => document.querySelector('#grpSignalerVeil .grp-raison[data-k="nudite"]').click());
    const pret4 = await p.evaluate(() => !document.getElementById('grpSignalerEnvoi').disabled);
    await p.evaluate(() => document.getElementById('grpSignalerEnvoi').click());
    await p.waitForTimeout(500);
    const e4 = await p.evaluate(() => ({ appels: window.__appels.slice(), merci: !!document.querySelector('#grpSignalerVeil .grp-merci') }));
    dit('4. … une raison choisie, il part : la personne visée, la raison « photo », ce qu\'elle montre en tête du détail',
      pret4 && e4.merci && e4.appels.length === 1 && e4.appels[0].args.p_cible === 'u-2' && e4.appels[0].args.p_raison === 'photo' && e4.appels[0].args.p_groupe === null
      && e4.appels[0].args.p_details === 'Nudité ou contenu sexuel', JSON.stringify(e4));
    await fermer();

    /* 5. Là où il ne doit pas être */
    const sienne = await lien('moi'); await fermer();
    const sienneU = await lien('u:moi-0000'); await fermer();
    await p.evaluate(() => { compteConnecte = () => false; });
    const sansCompte = await lien('u:u-2'); await fermer();
    await p.evaluate(() => { compteConnecte = () => true; modeModeration = () => true; });
    const enModo = await lien('u:u-2'); await fermer();
    await p.evaluate(() => { modeModeration = () => false; });
    const sonGroupe = await lien('g:g-2'); await fermer();
    dit('5. jamais sur sa propre photo, ni sans compte, ni en mode modération, ni sur la photo de son propre groupe',
      sienne.ouverte && !sienne.lien && sienneU.ouverte && !sienneU.lien && sansCompte.ouverte && !sansCompte.lien && enModo.ouverte && !enModo.lien && sonGroupe.ouverte && !sonGroupe.lien,
      JSON.stringify({ sienne, sienneU, sansCompte, enModo, sonGroupe }));
    const unGroupe = await lien('g:g-1');
    await p.evaluate(() => document.querySelector('#photoGrandVeil .pv-signaler').click());
    await p.waitForTimeout(900);
    const f5 = await p.evaluate(PAGE_PHOTO);
    await p.evaluate(() => { window.__appels = []; document.querySelector('#grpSignalerVeil .grp-raison[data-k="haine"]').click(); document.getElementById('grpSignalerEnvoi').click(); });
    await p.waitForTimeout(500);
    const e5 = await p.evaluate(() => window.__appels.slice());
    dit('5. … oui sur la photo d\'un groupe dont on est membre : « Signaler la photo du groupe », la photo et le nom du groupe, les raisons d\'une photo ; elle part pour le groupe',
      unGroupe.lien && !!f5 && f5.titre === 'Signaler la photo du groupe' && f5.raisons.join() === RAISONS && !f5.cochee && f5.nom === 'Les Psaumes' && !!f5.image
      && e5.length === 1 && e5[0].args.p_groupe === 'g-1' && e5[0].args.p_cible === null && e5[0].args.p_raison === 'photo' && e5[0].args.p_details === 'Haine ou symbole haineux',
      JSON.stringify({ unGroupe, f5, e5 }));
    await fermer();

    /* 6. Le serveur d'avant la v346 */
    await p.evaluate(() => { window.__appels = []; window.__ancien = true; });
    await lien('u:u-2');
    await p.evaluate(() => document.querySelector('#photoGrandVeil .pv-signaler').click());
    await p.waitForTimeout(900);
    await p.evaluate(() => { document.querySelector('#grpSignalerVeil .grp-raison[data-k="nudite"]').click(); const t = document.getElementById('grpPrecision'); t.value = 'Photo choquante'; document.getElementById('grpSignalerEnvoi').click(); });
    await p.waitForTimeout(600);
    const e6 = await p.evaluate(() => ({ appels: window.__appels.slice(), merci: !!document.querySelector('#grpSignalerVeil .grp-merci') }));
    const a = e6.appels;
    dit('6. un serveur d\'avant la v346 refuse « photo » : le signalement repart en « contenu inapproprié », la raison en tête du détail',
      e6.merci && a.length === 2 && a[0].args.p_raison === 'photo' && a[0].args.p_details === 'Nudité ou contenu sexuel — Photo choquante'
      && a[1].args.p_raison === 'inapproprie' && a[1].args.p_details === 'Photo inappropriée — Nudité ou contenu sexuel — Photo choquante' && a[1].args.p_cible === 'u-2',
      JSON.stringify(e6));
    await fermer();
    await p.evaluate(() => { window.__ancien = false; });

    /* 7. Un message garde ses raisons */
    await p.evaluate(() => signalerMessage(7, 'u-2', 'g-1'));
    await p.waitForTimeout(700);
    const f7 = await p.evaluate(() => ({ titre: (document.querySelector('#grpSignalerVeil .st-mot') || {}).textContent,
      raisons: [...document.querySelectorAll('#grpSignalerVeil .grp-raison')].map(b => b.dataset.k), cochee: !!document.querySelector('#grpSignalerVeil .grp-raison.choisie'),
      envoi: document.getElementById('grpSignalerEnvoi').disabled }));
    dit('7. un message garde ses cinq raisons, rien de coché d\'avance, « Envoyer » attend',
      f7.titre === 'Signaler ce message' && f7.raisons.join() === 'harcelement,inapproprie,spam,danger,autre' && !f7.cochee && f7.envoi, JSON.stringify(f7));
    await fermer();

    /* 8. En ligne : le compte voyage avec le joueur */
    const m8 = await p.evaluate(() => { const avec = meMeta().compte; compteConnecte = () => false; const sans = meMeta().compte; compteConnecte = () => true; return { avec, sans }; });
    dit('8. en ligne, le joueur dit son compte s\'il en a un, rien sinon', m8.avec === 'moi-0000' && m8.sans === '', JSON.stringify(m8));

    /* Les nouvelles raisons, traduites */
    const tr = await p.evaluate(() => {
      const k = ['Photo inappropriée', 'Nom inapproprié', "Se fait passer pour quelqu'un d'autre", 'Photo de profil inappropriée', 'Photo du groupe inappropriée',
        'Nom ou description du groupe inapproprié', 'Signaler cette photo'];
      const r = {}; for (const lg of ['en', 'es']) { setLangue(lg); r[lg] = k.filter(x => T(x) === x); }
      setLangue('fr'); return r; });
    dit('8. les nouvelles raisons et « Signaler cette photo » sont traduites (anglais, espagnol)', !tr.en.length && !tr.es.length, JSON.stringify(tr));
    await ctx.close();
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  }
  dit('9. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — mentions légales propres, et une photo se signale d\'un geste');
  process.exit(ko ? 1 : 0);
})();
