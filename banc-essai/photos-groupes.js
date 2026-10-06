/* ====== LES PHOTOS DANS LES GROUPES, À DEUX TÉLÉPHONES (v311) ======
   « Je veux que les groupes puissent avoir une photo de groupe, et que nos
     photos à nous soient visibles dans les groupes aussi. »
   Le même décor que groupes.js — un VRAI PostgreSQL avec groupes/table.sql tel
   qu'il partira chez Supabase —, et tout ce qu'une photo traverse, au doigt :

     1. Taylor choisit sa photo de profil : une copie réduite part au serveur ;
     2. Taylor crée un groupe AVEC une photo, choisie par le vrai sélecteur de
        fichier et cadrée : la pastille du formulaire la montre avant « Créer »,
        à la hauteur exacte du nom et de la description ;
     3. Benoît tape le code : l'aperçu montre la photo du groupe ; il entre,
        et voit la photo du groupe dans sa liste et dans l'en-tête, celle de
        Taylor sur ses messages et dans les membres ; la toucher l'agrandit ;
     4. Benoît relance le jeu : les photos sont là SANS rien retélécharger ;
     5. Taylor change la photo du groupe : Benoît la voit changer en direct,
        avec le mot du jeu dans la discussion ;
     6. Benoît signale Taylor : la carte de modération montre la photo et
        propose « Retirer la photo » ; retirée, elle disparaît chez Benoît ;
     7. un serveur qui ne connaît pas encore les photos (SQL de la v310) : le
        jeu ne demande aucune photo et n'en propose aucune ;
     8. aucune erreur dans les pages.

   Usage : node banc-essai/photos-groupes.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2';

let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8272, 5458);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    await m.compte(A, 'taylor@essai'); await m.compte(B, 'benoit@essai');
    for (const [id, nom] of [[A, 'Taylor'], [B, 'Benoît']]) {
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(A); await m.ouvrir(true);
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);

    /* Chaque téléphone compte les photos qu'il télécharge vraiment : une
       lecture qui demande la colonne « photo » elle-même (pas sa version). */
    const telechargees = new Map();
    const telephone = async (moi, nom, ancienServeur) => {
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      telechargees.set(p, 0);
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      p.on('request', r => {
        if (!/\/faux\/select$/.test(r.url())) return;
        try { const b = JSON.parse(r.postData() || '{}'); if (/(^|,)\s*photo\s*(,|$)/.test(b.cols || '')) telechargees.set(p, telechargees.get(p) + 1); } catch (e) {}
      });
      if (ancienServeur) {
        /* Le serveur d'avant la v311 : son état ne dit pas « photos ». */
        await p.route('**/faux/rpc', async (route) => {
          const corps = JSON.parse(route.request().postData() || '{}');
          const rep = await route.fetch();
          const j = await rep.json();
          if (corps.nom === 'mon_etat_groupes' && j && j.data) delete j.data.photos;
          await route.fulfill({ response: rep, json: j });
        });
      }
      await p.addInitScript(([moi, nom]) => {
        if (!localStorage.getItem('bt_profile')) localStorage.setItem('bt_profile', JSON.stringify({ name: nom, color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [moi, nom]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
      return p;
    };
    const etatPret = (p) => attendre(p, () => !!(grp.etat && grp.etat.participe === 'ok'), null, 12000);
    /* Une image d'essai, fabriquée dans la page : un dégradé et deux formes,
       pour qu'une compression ratée se voie. */
    const imageEssai = (p, teinte) => p.evaluate((h) => {
      const c = document.createElement('canvas'); c.width = 900; c.height = 600;
      const g = c.getContext('2d');
      const d = g.createLinearGradient(0, 0, 900, 600); d.addColorStop(0, 'hsl(' + h + ',80%,55%)'); d.addColorStop(1, 'hsl(' + (h + 60) + ',70%,35%)');
      g.fillStyle = d; g.fillRect(0, 0, 900, 600);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(450, 260, 140, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(250, 430, 400, 90);
      return c.toDataURL('image/jpeg', 0.9);
    }, teinte);
    const fichier = (dataUrl, nom) => ({ name: nom, mimeType: 'image/jpeg', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });

    const pa = await telephone(A, 'Taylor');
    dit('le serveur annonce les photos', await etatPret(pa) && await pa.evaluate(() => photosServeur()));

    /* ---- 1. ma photo de profil part au serveur ---- */
    const portrait = await imageEssai(pa, 20);
    await pa.evaluate(async (u) => {
      const im = new Image(); im.src = u; await im.decode();
      enregistrerPhoto(carrePhoto(im, 150, 0, 600));
    }, portrait);
    const photoServeur = async (table, id) => {
      for (let i = 0; i < 40; i++) {
        const v = await m.sql(`select coalesce(length(photo), 0) from public.${table} where id = '${id}'`);
        if (+v > 0) return +v;
        await pa.waitForTimeout(150);
      }
      return 0;
    };
    const lg = await photoServeur('profils', A);
    dit('ma photo part au serveur, réduite (moins de 56 000 caractères)', lg > 2000 && lg <= 56000, lg + ' caractères');
    dit('… en JPEG de 384 px', (await m.sql(`select left(photo, 23) from public.profils where id = '${A}'`)) === 'data:image/jpeg;base64,');

    /* ---- 2. Taylor crée un groupe avec une photo ---- */
    await pa.evaluate(() => allerOnglet('groupes'));
    await attendre(pa, () => !!document.getElementById('grpMes'), null, 9000);
    await pa.evaluate(() => ouvrirCreation());
    await pa.waitForTimeout(650);
    const geom = await pa.evaluate(() => {
      const a = document.getElementById('grpFormAv').getBoundingClientRect();
      const n = document.getElementById('grpNom').getBoundingClientRect(), d = document.getElementById('grpDesc').getBoundingClientRect();
      return { haut: Math.abs(a.top - n.top), bas: Math.abs(a.bottom - d.bottom), carre: Math.abs(a.width - a.height) };
    });
    dit('la pastille du formulaire a la hauteur exacte du nom et de la description', geom.haut < 1 && geom.bas < 1 && geom.carre < 1, JSON.stringify(geom));
    await pa.fill('#grpNom', 'Les amis du jeudi');
    dit('… et montre déjà l\'initiale du nom tapé', await pa.evaluate(() => document.getElementById('grpFormAv').textContent === 'L'));
    const paysage = await imageEssai(pa, 200);
    const [choix] = await Promise.all([pa.waitForEvent('filechooser', { timeout: 5000 }), pa.evaluate(() => document.querySelector('.grp-photo-b').click())]);
    await choix.setFiles(fichier(paysage, 'groupe.jpg'));
    dit('le vrai sélecteur de fichier ouvre le cadrage', await attendre(pa, () => !!document.getElementById('cadrageVeil') && !!cadrage, null, 6000));
    dit('… par-dessus la feuille, qui recule', await pa.evaluate(() => document.querySelector('#grpCreerVeil .settings-sheet').classList.contains('feuille-recule')));
    await pa.waitForTimeout(400);
    await pa.evaluate(() => document.querySelector('#cadrageVeil .sheet-done').click());
    dit('la pastille du formulaire montre la photo choisie', await attendre(pa, () => document.getElementById('grpFormAv').classList.contains('a-photo'), null, 4000));
    dit('… et la feuille revient au premier plan', await attendre(pa, () => !document.querySelector('#grpCreerVeil .settings-sheet.feuille-recule'), null, 3000));
    dit('rien n\'est parti avant « Créer »', (await m.sql("select count(*) from public.groupes")) === '0');
    await pa.evaluate(() => document.querySelector('#grpCreerVeil .btn-primary').click());
    const gid = await (async () => { for (let i = 0; i < 40; i++) { const v = await m.sql("select id from public.groupes where nom = 'Les amis du jeudi'"); if (v) return v; await pa.waitForTimeout(150); } return ''; })();
    const lgG = await photoServeur('groupes', gid);
    dit('« Créer » : le groupe et sa photo arrivent sur le serveur', !!gid && lgG > 2000 && lgG <= 56000, lgG + ' caractères');
    dit('… sans mot du jeu « a changé la photo » dans un groupe où l\'on est seul', (await m.sql(`select count(*) from public.messages where groupe = '${gid}' and texte = 'photo'`)) === '0');
    await attendre(pa, () => state.screen === 'groupe', null, 8000);
    dit('l\'en-tête du groupe montre sa photo', await attendre(pa, () => !!document.querySelector('#grpTete .grp-av.a-photo'), null, 5000));
    const code = await m.sql(`select code from public.groupes where id = '${gid}'`);
    await pa.evaluate(() => { try { fermerFeuilleGroupe('grpInfosVeil'); } catch (e) {} });
    await pa.waitForTimeout(500);
    await pa.fill('#compoTexte', 'Bienvenue à tous !');
    await pa.evaluate(() => envoyerMessageGroupe());
    await pa.waitForTimeout(600);

    /* ---- 3. Benoît entre avec le code ---- */
    const pb = await telephone(B, 'Benoît');
    await etatPret(pb);
    await pb.evaluate(() => allerOnglet('groupes'));
    await attendre(pb, () => !!document.getElementById('grpMes'), null, 9000);
    await pb.evaluate(() => ouvrirCode());
    await pb.waitForTimeout(500);
    await pb.fill('#grpCode', code);
    dit('Benoît tape le code : l\'aperçu montre la photo du groupe', await attendre(pb, () => !!document.querySelector('#grpApercu .grp-av.a-photo'), null, 8000));
    await pb.evaluate(() => document.getElementById('grpCodeGo').click());
    await attendre(pb, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    dit('… entre : la photo de Taylor est sur son message', await attendre(pb, () => {
      const a = document.querySelector('.b-eux .b-av .avatar'); return !!a && a.classList.contains('a-photo') && /blob:/.test(a.style.getPropertyValue('--ph')); }, null, 8000));
    dit('… et la photo du groupe dans l\'en-tête', await attendre(pb, () => !!document.querySelector('#grpTete .grp-av.a-photo'), null, 6000));
    await pb.evaluate(() => document.querySelector('.b-eux .b-av .avatar').click());
    dit('toucher la photo de Taylor l\'agrandit', await attendre(pb, () => { const v = document.querySelector('#photoGrandVeil .pv-img'); return !!v && /blob:/.test(v.style.backgroundImage); }, null, 3000)
      && /Taylor/.test(await pb.evaluate(() => (document.querySelector('#photoGrandVeil .pv-nom') || {}).textContent || '')));
    await pb.evaluate(() => { const v = document.getElementById('photoGrandVeil'); if (v) v.click(); });
    await pb.evaluate(() => ouvrirInfosGroupe());
    dit('dans les membres, Taylor a sa photo', await attendre(pb, () => [...document.querySelectorAll('#grpInfosVeil .grp-ligne')].some(l => /Taylor/.test(l.textContent) && !!l.querySelector('.avatar.a-photo')), null, 6000));
    await pb.evaluate(() => fermerFeuilleGroupe('grpInfosVeil'));
    await pb.waitForTimeout(500);
    await pb.evaluate(() => retourGroupes());
    dit('dans la liste de Benoît, le groupe a sa photo', await attendre(pb, () => !!document.querySelector('#grpMes .grp-av.a-photo'), null, 6000));

    /* ---- 4. relancer le jeu : rien à retélécharger ---- */
    await pb.reload();
    await pb.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    telechargees.set(pb, 0);
    await etatPret(pb);
    await pb.evaluate(() => allerOnglet('groupes'));
    await attendre(pb, () => !!document.querySelector('#grpMes .grp-ligne'), null, 9000);
    dit('après relance, la photo du groupe est là', await attendre(pb, () => !!document.querySelector('#grpMes .grp-av.a-photo'), null, 6000));
    await pb.evaluate((g) => ouvrirGroupe(g), gid);
    dit('… et celle de Taylor sur ses messages', await attendre(pb, () => !!document.querySelector('.b-eux .b-av .avatar.a-photo'), null, 6000));
    await pb.waitForTimeout(800);
    dit('… sans avoir retéléchargé une seule image', telechargees.get(pb) === 0, telechargees.get(pb) + ' téléchargement(s)');

    /* ---- 5. Taylor change la photo du groupe : Benoît la voit changer ---- */
    const avantUrl = await pb.evaluate(() => document.querySelector('#grpTete .grp-av').style.getPropertyValue('--ph'));
    await pa.evaluate(() => ouvrirModifGroupe());
    await pa.waitForTimeout(650);
    dit('« Modifier le groupe » montre la photo actuelle', await pa.evaluate(() => document.getElementById('grpFormAv').classList.contains('a-photo')));
    await pa.evaluate(() => document.querySelector('.grp-photo-b').click());
    dit('… la toucher propose « Changer » ou « Retirer »', await attendre(pa, () => (document.querySelectorAll('#grpPhotoVeil .grp-act-l') || []).length === 2, null, 3000));
    const autre = await imageEssai(pa, 300);
    const [choix2] = await Promise.all([pa.waitForEvent('filechooser', { timeout: 5000 }), pa.evaluate(() => document.querySelector('#grpPhotoVeil .grp-act-l').click())]);
    await choix2.setFiles(fichier(autre, 'autre.jpg'));
    await attendre(pa, () => !!document.getElementById('cadrageVeil') && !!cadrage, null, 6000);
    await pa.waitForTimeout(400);
    await pa.evaluate(() => document.querySelector('#cadrageVeil .sheet-done').click());
    await pa.waitForTimeout(500);
    await pa.evaluate(() => document.querySelector('#grpModifVeil .btn-primary').click());
    dit('Benoît voit le mot du jeu : « Taylor a changé la photo du groupe »', await attendre(pb, () => [...document.querySelectorAll('.b-sys')].some(x => /changé la photo du groupe/.test(x.textContent)), null, 9000));
    dit('… et la nouvelle photo dans l\'en-tête, sans rien toucher', await attendre(pb, (a) => {
      const v = document.querySelector('#grpTete .grp-av'); return !!v && v.classList.contains('a-photo') && v.style.getPropertyValue('--ph') !== a; }, avantUrl, 9000));

    /* ---- 6. signalée, la photo de Taylor est retirée par la modération ---- */
    await pb.evaluate((a) => ouvrirMembre(a), A);
    await pb.waitForTimeout(500);
    await pb.evaluate(() => { const l = [...document.querySelectorAll('#grpMembreVeil .grp-act-l')].find(x => /Signaler/.test(x.textContent)); l.click(); });
    await pb.waitForTimeout(600);
    await pb.evaluate(() => document.querySelector('#grpSignalerVeil .grp-act-l').click());
    await attendre(pb, () => !!document.querySelector('#grpSignalerVeil .grp-merci'), null, 6000);
    await pb.evaluate(() => fermerFeuilleGroupe('grpSignalerVeil'));
    await pa.evaluate(() => { state.screen = 'mode'; render(); allerOnglet('groupes'); });
    await pa.waitForTimeout(900);
    await pa.evaluate(() => chargerEtatGroupes());
    await pa.waitForTimeout(600);
    await pa.evaluate(() => ouvrirModeration());
    dit('la carte de modération montre la photo signalée', await attendre(pa, () => !!document.querySelector('.mod-carte .mod-photo .avatar.a-photo'), null, 8000));
    dit('… et propose « Retirer la photo »', await pa.evaluate(() => [...document.querySelectorAll('.mod-carte .grp-pill')].some(b => /Retirer la photo/.test(b.textContent))));
    await pa.evaluate(() => [...document.querySelectorAll('.mod-carte .grp-pill')].find(b => /Retirer la photo/.test(b.textContent)).click());
    dit('… retirée : elle n\'existe plus sur le serveur', await (async () => { for (let i = 0; i < 30; i++) { if ((await m.sql(`select count(*) from public.profils where id = '${A}' and photo is not null`)) === '0') return true; await pa.waitForTimeout(150); } return false; })());
    await pb.evaluate(() => retourGroupes());
    await pb.waitForTimeout(500);
    await pb.evaluate((g) => ouvrirGroupe(g), gid);
    dit('… et Benoît voit l\'initiale de Taylor à la place', await attendre(pb, () => { const a = document.querySelector('.b-eux .b-av .avatar'); return !!a && !a.classList.contains('a-photo'); }, null, 8000));

    /* ---- 7. un serveur qui ne connaît pas les photos ---- */
    const pc = await telephone(B, 'Benoît (ancien serveur)', true);
    await etatPret(pc);
    telechargees.set(pc, 0);
    await pc.evaluate(() => allerOnglet('groupes'));
    await attendre(pc, () => !!document.querySelector('#grpMes .grp-ligne'), null, 9000);
    await pc.evaluate(() => ouvrirCreation());
    await pc.waitForTimeout(600);
    dit('ancien serveur : le formulaire ne propose pas de photo', await pc.evaluate(() => !document.querySelector('.grp-photo-b') && !!document.getElementById('grpNom')));
    await pc.evaluate(() => fermerFeuilleGroupe('grpCreerVeil'));
    await pc.waitForTimeout(500);
    await pc.evaluate((g) => ouvrirGroupe(g), gid);
    await attendre(pc, () => state.screen === 'groupe' && !!document.querySelector('.b-eux'), null, 9000);
    await pc.waitForTimeout(800);
    dit('… et ne demande aucune photo', telechargees.get(pc) === 0 && await pc.evaluate(() => !photosServeur()), telechargees.get(pc) + ' demande(s)');

    dit('aucune erreur dans les pages', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — les photos vont et viennent dans les groupes');
  process.exit(ko ? 1 : 0);
})();
