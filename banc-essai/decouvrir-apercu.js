/* ====== BANC « LA PRÉSENTATION D'UN GROUPE PUBLIC » (v339) ======
   « Lorsque je vais pour cliquer sur un groupe public, par exemple
     rejoindre, je voudrais pouvoir voir le groupe. Peut-être pas voir
     l'intérieur, mais voir le groupe : qu'est-ce que c'est que ce groupe, le
     descriptif ou ce genre de choses. »
   Un VRAI PostgreSQL, le vrai groupes/table.sql. Benoît a trois groupes
   publics : « Les amis de Jean » (une description sur deux lignes, un
   message de bienvenue dedans), « Psaumes du soir » (sans description, avec
   une photo), « Le cercle complet » (Dora y est, et le jeu le sait plein).
   Taylor (iPhone) est dans Découvrir ; Mia est modératrice. Tout se touche
   au doigt, là où un doigt tomberait.
     1. toucher la LIGNE (hors de la pilule) ouvre la présentation : la page
        « Groupe public », la pastille en grand, le nom, « 1 membre ·
        Dernière activité aujourd'hui », la description ENTIÈRE (ses deux
        lignes, rien de coupé), « Rejoindre », « Signaler le groupe » — et
        rien de l'intérieur : ni le message de Benoît, ni « Voir le groupe » ;
     2. la pilule « Rejoindre » rejoint toujours tout de suite, sans
        présentation (« Psaumes du soir ») ;
     3. « Rejoindre » dans la présentation : la page se ferme, la discussion
        s'ouvre, Taylor est membre ;
     4. de retour, la présentation d'un groupe dont on est dit « Ouvrir » (et
        rien à signaler de plus), et « Ouvrir » ouvre la discussion ;
     5. un groupe plein : « Rejoindre » éteint, et la phrase le dit d'avance ;
     6. la photo d'un groupe, touchée sur la ligne puis dans la
        présentation, s'ouvre en grand — sans ouvrir la présentation ;
     7. « Signaler le groupe » sans en être : le signalement part, et le
        remerciement ne propose pas de « quitter ce groupe » ;
     8. Mia (modératrice) : « Voir le groupe » (au bouclier), et « Signaler »
        comme tout membre ; elle y regarde en lecture, et la flèche la ramène
        à Découvrir — pas à la Modération, où elle n'était pas ;
     9. la file de Mia porte des groupes signalés (sans personne en cause :
        celui de Taylor, et un de Dora, posé au serveur) : elle se relit
        jusqu'au bout — les cartes, la pastille au même compte (depuis la
        v311, un groupe signalé glissait un vide dans les photos à charger,
        et tout s'arrêtait là) ;
    10. aucune erreur.
   Sur la v338 : 1, 3 à 10 rouges — la ligne ne s'ouvrait pas, et la file
   de la modération tombait sur le groupe signalé.
   Usage : node banc-essai/decouvrir-apercu.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const T_ = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000a2',
      D = 'dddddddd-0000-4000-8000-0000000000a4', M = 'eeeeeeee-0000-4000-8000-0000000000a5';
const DESC = "On lit l'Évangile de Jean ensemble, un chapitre par semaine.\nChacun partage ce qui l'a touché, et l'on prie les uns pour les autres le dimanche.";
const BIENVENUE = 'Bienvenue à tous, on commence lundi !';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 360) + ')' : '')); if (!bon) ko++; };
const n = (t) => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  const m = await monter(8523, 5728);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[T_, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'],
                                             [D, 'dora@essai', 'Dora', '#8E5BD8'], [M, 'mia@essai', 'Mia', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(M); await m.ouvrir(true);
    const creer = async (nom, desc, teinte) => (await m.rpc(B, 'creer_groupe', { p_nom: nom, p_description: desc, p_ouvert: true, p_langue: 'fr', p_teinte: teinte })).data;
    const g3 = await creer('Le cercle complet', 'Un petit cercle de prière.', 5);
    await m.rpc(D, 'rejoindre_groupe', { p_groupe: g3.id, p_code: null });
    const g2 = await creer('Psaumes du soir', '', 4);
    const g1 = await creer('Les amis de Jean', DESC, 2);
    await m.rpc(B, 'envoyer_message', { p_groupe: g1.id, p_texte: BIENVENUE, p_genre: 'texte', p_donnees: {} });
    const membre = async (qui, gid) => (await m.sql(`select count(*) from public.membres where groupe = '${gid}' and membre = '${qui}'`)) === '1';

    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const ouvrirPage = async (moi, nom, couleur, modo) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(e.message));
      await p.addInitScript(([moi, nom, couleur]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: nom, color: couleur }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [moi, nom, couleur]);
      await p.goto(m.url);
      await p.waitForFunction((modo) => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok') && (!modo || !!grp.etat.moderateur); } catch (e) { return false; } }, modo, { timeout: 25000 });
      return { ctx, p };
    };
    const ecranGroupes = async (p) => {
      await p.evaluate(() => { state.screen = 'groupes'; render(); ouvrirGroupes(); });
      await attendre(p, () => !!grp.publics && !!grp.liste && document.querySelectorAll('#grpPublics .grp-ligne').length >= 3, null, 9000);
      await p.waitForTimeout(700);
    };
    /* Le doigt se pose au milieu du texte de la ligne, ou sur ce qu'on nomme. */
    const toucher = async (p, sel, dansLigne) => {
      const b = await p.evaluate(([sel, nom]) => {
        const base = nom ? [...document.querySelectorAll('#grpPublics .grp-ligne')].find(l => l.querySelector('.grp-txt b').textContent === nom) : document;
        const e = base && base.querySelector(sel); if (!e) return null;
        e.scrollIntoView({ block: 'center' });
        const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, [sel, dansLigne || null]);
      if (!b) return false;
      await p.waitForTimeout(150);
      await p.touchscreen.tap(b.x, b.y);
      return true;
    };
    const apercuOuvert = (p) => attendre(p, () => { const v = document.getElementById('grpApercuVeil'); return !!v && !v.classList.contains('closing'); }, null, 4000);
    const apercuParti = (p) => attendre(p, () => !document.getElementById('grpApercuVeil'), null, 4000);
    const lirePage = (p) => p.evaluate(() => {
      const v = document.getElementById('grpApercuVeil'); if (!v) return null;
      const t = (s) => { const e = v.querySelector(s); return e ? e.textContent : null; };
      const d = v.querySelector('.grp-desc'), av = v.querySelector('.grp-ap-tete .grp-av'), go = v.querySelector('#grpApercuGo');
      const mot = v.querySelector('.grp-mot');
      return {
        titre: t('.page-tete .st-mot'), nom: t('.grp-ap-nom'), meta: t('.grp-ap-meta'),
        desc: d ? d.textContent : null, descLignes: d ? Math.round(d.getBoundingClientRect().height / parseFloat(getComputedStyle(d).lineHeight)) : 0,
        descCoupee: d ? (d.scrollWidth > d.clientWidth + 1 || d.scrollHeight > d.clientHeight + 1) : null,
        pastille: av ? Math.round(av.getBoundingClientRect().width) : 0,
        bouton: go ? go.textContent : null, eteint: go ? go.disabled : null,
        mot: mot && mot.classList.contains('vu') ? mot.textContent : '',
        actions: [...v.querySelectorAll('.grp-liste-act .gal-t')].map(e => e.textContent),
        texte: v.textContent
      };
    });

    /* ----- Taylor ----- */
    const { ctx, p } = await ouvrirPage(T_, 'Taylor', '#4C86E8', false);
    /* Une vraie photo pour « Psaumes du soir », posée par Benoît. */
    const jpeg = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
      x.fillStyle = '#2f6f8f'; x.fillRect(0, 0, 96, 96); x.fillStyle = '#f2c14e'; x.beginPath(); x.arc(48, 40, 22, 0, 7); x.fill(); return c.toDataURL('image/jpeg', 0.85); });
    const ph = (await m.rpc(B, 'poser_photo_groupe', { p_groupe: g2.id, p_photo: jpeg })).data || {};
    await ecranGroupes(p);

    /* 1 */
    const t1 = await toucher(p, '.grp-txt', 'Les amis de Jean');
    const o1 = t1 && await apercuOuvert(p); await p.waitForTimeout(700);
    const l1 = await lirePage(p);
    dit('1. toucher la ligne ouvre la présentation : grande pastille, nom, membres et activité, description entière, « Rejoindre », « Signaler » — rien de l\'intérieur',
      o1 && !!l1 && l1.titre === 'Groupe public' && l1.nom === 'Les amis de Jean' && n(l1.meta) === '1 membre · Dernière activité aujourd\'hui'
        && l1.desc === DESC && l1.descLignes >= 2 && l1.descCoupee === false && l1.pastille >= 85
        && l1.bouton === 'Rejoindre' && l1.eteint === false && JSON.stringify(l1.actions) === JSON.stringify(['Signaler le groupe'])
        && !l1.texte.includes(BIENVENUE) && !l1.texte.includes('Benoît'),
      JSON.stringify(l1 && Object.assign({}, l1, { texte: undefined })));
    await p.evaluate(() => fermerFeuilleGroupe('grpApercuVeil')); await apercuParti(p); await p.waitForTimeout(300);

    /* 2 */
    const t2 = await toucher(p, '.grp-pill', 'Psaumes du soir');
    const o2 = t2 && await attendre(p, (gid) => state.screen === 'groupe' && grp.courant === gid, g2.id, 9000);
    const sans2 = await p.evaluate(() => !document.getElementById('grpApercuVeil'));
    dit('2. la pilule « Rejoindre » rejoint toujours tout de suite, sans présentation', o2 && sans2 && await membre(T_, g2.id), JSON.stringify({ t2, o2, sans2 }));
    await p.evaluate(() => retourGroupes()); await p.waitForTimeout(500);
    await ecranGroupes(p);

    /* 3 */
    await toucher(p, '.grp-txt', 'Les amis de Jean'); await apercuOuvert(p); await p.waitForTimeout(600);
    const t3 = await toucher(p, '#grpApercuGo');
    const o3 = t3 && await attendre(p, (gid) => state.screen === 'groupe' && grp.courant === gid, g1.id, 9000);
    const parti3 = await apercuParti(p);
    dit('3. « Rejoindre » dans la présentation : la page se ferme, la discussion s\'ouvre, Taylor est membre', o3 && parti3 && await membre(T_, g1.id), JSON.stringify({ t3, o3, parti3 }));
    await p.waitForTimeout(400);
    await p.evaluate(() => retourGroupes()); await p.waitForTimeout(500);
    await ecranGroupes(p);

    /* 4 */
    await toucher(p, '.grp-txt', 'Les amis de Jean'); await apercuOuvert(p); await p.waitForTimeout(600);
    const l4 = await lirePage(p);
    const t4 = await toucher(p, '#grpApercuGo');
    const o4 = t4 && await attendre(p, (gid) => state.screen === 'groupe' && grp.courant === gid, g1.id, 9000);
    dit('4. la présentation d\'un groupe dont on est dit « Ouvrir », et « Ouvrir » ouvre la discussion',
      !!l4 && l4.bouton === 'Ouvrir' && l4.eteint === false && n(l4.meta).indexOf('2 membres · ') === 0 && o4 && await apercuParti(p),
      JSON.stringify(l4 && { bouton: l4.bouton, meta: l4.meta, actions: l4.actions, o4 }));
    await p.waitForTimeout(400);
    await p.evaluate(() => retourGroupes()); await p.waitForTimeout(500);
    await ecranGroupes(p);

    /* 5 */
    await p.evaluate(() => { grp.etat.membres_max = 2; });
    await toucher(p, '.grp-txt', 'Le cercle complet'); await apercuOuvert(p); await p.waitForTimeout(600);
    const l5 = await lirePage(p);
    dit('5. un groupe plein : « Rejoindre » éteint, et la phrase le dit d\'avance',
      !!l5 && l5.bouton === 'Rejoindre' && l5.eteint === true && n(l5.mot) === 'Ce groupe est complet : 2 membres au plus.' && n(l5.meta).indexOf('2 membres · ') === 0,
      JSON.stringify(l5 && { bouton: l5.bouton, eteint: l5.eteint, mot: l5.mot, meta: l5.meta }));
    await p.evaluate(() => { fermerFeuilleGroupe('grpApercuVeil'); grp.etat.membres_max = 120; }); await apercuParti(p); await p.waitForTimeout(300);

    /* 6 */
    await attendre(p, (gid) => !!document.querySelector('#grpPublics .grp-av.a-photo[data-gid="' + gid + '"]'), g2.id, 9000);
    const t6 = await toucher(p, '.grp-av', 'Psaumes du soir');
    const grand6 = t6 && await attendre(p, () => !!document.getElementById('photoGrandVeil'), null, 3000);
    const sans6 = await p.evaluate(() => !document.getElementById('grpApercuVeil'));
    await p.evaluate(() => { const v = document.getElementById('photoGrandVeil'); if (v) v.click(); }); await p.waitForTimeout(400);
    await toucher(p, '.grp-txt', 'Psaumes du soir'); const o6 = await apercuOuvert(p); await p.waitForTimeout(600);
    const t6b = await toucher(p, '#grpApercuVeil .grp-ap-tete .grp-av');
    const grand6b = t6b && await attendre(p, () => !!document.getElementById('photoGrandVeil'), null, 3000);
    const nom6 = await p.evaluate(() => { const e = document.querySelector('#photoGrandVeil .pv-nom'); return e ? e.textContent : ''; });
    dit('6. la photo d\'un groupe s\'ouvre en grand, touchée sur la ligne (sans présentation) puis dans la présentation',
      ph.ok === true && grand6 && sans6 && o6 && grand6b && nom6 === 'Psaumes du soir', JSON.stringify({ ph, grand6, sans6, o6, grand6b, nom6 }));
    await p.evaluate(() => { const v = document.getElementById('photoGrandVeil'); if (v) v.click(); fermerFeuilleGroupe('grpApercuVeil'); }); await apercuParti(p); await p.waitForTimeout(300);

    /* 7 */
    await toucher(p, '.grp-txt', 'Le cercle complet'); await apercuOuvert(p); await p.waitForTimeout(600);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#grpApercuVeil .grp-act-l')].find(x => /Signaler le groupe/.test(x.textContent)); if (b) b.click(); });
    await attendre(p, () => !!document.querySelector('#grpSignalerVeil .grp-raison'), null, 4000); await p.waitForTimeout(500);
    await p.evaluate(() => { const r = document.querySelector('#grpSignalerVeil .grp-raison'); if (r) r.click(); const e = document.getElementById('grpSignalerEnvoi'); if (e) e.click(); });
    const merci7 = await attendre(p, () => !!document.querySelector('#grpSignalerVeil .grp-merci'), null, 6000);
    const m7 = await p.evaluate(() => { const e = document.querySelector('#grpSignalerVeil .grp-merci'); return e ? e.textContent : ''; });
    const s7 = await m.sql(`select count(*) from public.signalements where par = '${T_}' and groupe = '${g3.id}' and message is null and cible is null`);
    dit('7. « Signaler le groupe » sans en être : le signalement part, et le remerciement ne propose pas de « quitter ce groupe »',
      merci7 && s7 === '1' && /Merci\. La modération va regarder\./.test(n(m7)) && !/quitter/i.test(m7), JSON.stringify({ merci7, s7, m7: n(m7) }));
    await p.evaluate(() => { fermerFeuilleGroupe('grpSignalerVeil'); }); await p.waitForTimeout(500);
    await p.evaluate(() => { fermerFeuilleGroupe('grpApercuVeil'); }); await apercuParti(p);
    await ctx.close();

    /* ----- 8 : Mia, modératrice ----- */
    const sD = (await m.rpc(D, 'signaler', { p_message: null, p_cible: null, p_groupe: g2.id, p_raison: 'spam', p_details: '' })).data || {};
    const attendus = +(await m.sql(`select count(distinct groupe) from public.signalements where traite_le is null and message is null and cible is null`));
    const mia = await ouvrirPage(M, 'Mia', '#7BC86B', true);
    await ecranGroupes(mia.p);
    await toucher(mia.p, '.grp-txt', 'Les amis de Jean'); await apercuOuvert(mia.p); await mia.p.waitForTimeout(600);
    const l8 = await lirePage(mia.p);
    await mia.p.evaluate(() => { const b = [...document.querySelectorAll('#grpApercuVeil .grp-act-l')].find(x => /Voir le groupe/.test(x.textContent)); if (b) b.click(); });
    const lu8 = await attendre(mia.p, (gid) => state.screen === 'groupe' && grp.courant === gid && enLecture()
      && [...document.querySelectorAll('#fil .b-texte, #fil .bulle, #fil')].some(e => e.textContent.includes('Bienvenue à tous')), g1.id, 9000);
    const parti8 = await apercuParti(mia.p);
    await mia.p.waitForTimeout(500);
    await mia.p.evaluate(() => retourGroupes()); await mia.p.waitForTimeout(600);
    const ecran8 = await mia.p.evaluate(() => state.screen);
    dit('8. la modératrice : « Voir le groupe » et « Signaler le groupe » ; elle y lit en lecture seule, et la flèche la ramène à Découvrir',
      !!l8 && JSON.stringify(l8.actions) === JSON.stringify(['Voir le groupe', 'Signaler le groupe']) && l8.bouton === 'Rejoindre' && lu8 && parti8 && ecran8 === 'groupes',
      JSON.stringify({ actions: l8 && l8.actions, lu8, parti8, ecran8 }));

    /* 9 */
    const r9 = await mia.p.evaluate(async () => {
      grp.etat.a_traiter = 0;
      let ok = true; try { await chargerModeration(); } catch (e) { ok = String(e && e.message || e); }
      return { ok, n: (moderation || []).length, pastille: aTraiter(), groupes: (moderation || []).map(x => x.groupe_nom).sort() };
    });
    dit('9. la file de Mia, avec des groupes signalés sans personne en cause, se relit jusqu\'au bout : les cartes, la pastille au même compte',
      sD.ok === true && r9.ok === true && r9.n === attendus && attendus >= 1 && r9.pastille === attendus && r9.groupes.includes('Psaumes du soir'), JSON.stringify({ sD, attendus, r9 }));
    await mia.ctx.close();
    dit('10. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — toucher un groupe public montre ce qu\'il est, sans rien de l\'intérieur ; la pilule rejoint toujours d\'un geste');
  process.exit(ko ? 1 : 0);
})();
