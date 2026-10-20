/* ====== LA MODÉRATION REGARDE L'INTÉRIEUR D'UN GROUPE (v311) ======
   « Quand la modération reçoit un signalement, il faut qu'elle puisse
     l'examiner : voir l'intérieur du groupe, ce qui s'y passe. » « Un
     modérateur doit pouvoir voir tous les groupes — pas y entrer, mais voir. »
   Le décor de groupes.js — un VRAI PostgreSQL. Benoît et Chloé ont un groupe
   privé dont Taylor, modérateur, ne fait pas partie :
     1. un signalement arrive ; sa carte propose « Voir le groupe » ;
     2. la discussion s'ouvre telle que les membres la voient, DE
        L'EXTÉRIEUR : Taylor n'en devient pas membre. (v334 : la barre qu'il
        y trouve est celle de la modération — le bouclier à la place de la
        manette —, voir moderation-ecrit.js ; jusqu'à la v333, rien pour
        écrire) ;
     3. un nouveau message y arrive en direct ;
     4. les infos montrent les membres, sans « Quitter le groupe » ;
     5. le retour ramène à la modération, où « Tous les groupes » liste aussi
        ce groupe, et l'ouvre de même ;
     6. rien n'a été marqué « lu » au nom des membres ;
     7. (v319) un signalement dans un groupe dont Taylor EST membre : « Voir
        le groupe » l'ouvre normalement, et la flèche ramène à la
        modération — pas à la liste des groupes. (« Quand je reviens en
        arrière, je veux revenir sur la page précédente. ») Ouvert depuis la
        liste des groupes, le même groupe ramène toujours à la liste.
   Usage : node banc-essai/moderation-regarde.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2', C = 'cccccccc-0000-4000-8000-0000000000c3';

let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8302, 5488);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom] of [[A, 'taylor@essai', 'Taylor'], [B, 'benoit@essai', 'Benoît'], [C, 'chloe@essai', 'Chloé']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(A); await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: 'Bonjour le club', p_genre: 'texte', p_donnees: null });
    await m.sql("update public.messages set cree_le = cree_le - interval '4 seconds'");
    const mid = (await m.rpc(C, 'envoyer_message', { p_groupe: g.id, p_texte: 'Un message douteux', p_genre: 'texte', p_donnees: null })).data.id;
    await m.rpc(B, 'signaler', { p_message: mid, p_cible: null, p_groupe: null, p_raison: 'inapproprie', p_details: '' });
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);

    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript((moi) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, A);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => allerOnglet('groupes'));
    await attendre(p, () => !!document.getElementById('grpMes'), null, 9000);
    await p.evaluate(() => chargerEtatGroupes());
    await p.waitForTimeout(800);

    /* ---- 1. la carte propose « Voir le groupe » ---- */
    await p.evaluate(() => ouvrirModeration());
    dit('la carte du signalement propose « Voir le groupe »', await attendre(p, () => !!document.querySelector('.mod-carte .mod-voir'), null, 8000));
    dit('« Tous les groupes » liste le groupe dont Taylor n\'est pas membre', await attendre(p, () => [...document.querySelectorAll('#modGroupes .grp-ligne')].some(l => /club de Benoît/.test(l.textContent)), null, 8000));

    /* ---- 2. lecture seule ---- */
    await p.evaluate(() => document.querySelector('.mod-carte .mod-voir').click());
    dit('la discussion s\'ouvre, telle que les membres la voient', await attendre(p, () => state.screen === 'groupe'
      && [...document.querySelectorAll('#fil .b-bulle')].some(b => /Bonjour le club/.test(b.textContent))
      && [...document.querySelectorAll('#fil .b-bulle')].some(b => /douteux|masqué/.test(b.textContent)), null, 9000));
    dit('… de l\'extérieur : la barre de la modération, pas celle d\'un membre (ni manette, ni « Lecture seule »)', await p.evaluate(() => !!document.querySelector('#compo .compo-mod') && !document.querySelector('#compo .compo-jeu') && !document.querySelector('.compo-lecture')));
    dit('… et Taylor n\'en devient pas membre', (await m.sql(`select count(*) from public.membres where groupe = '${g.id}' and membre = '${A}'`)) === '0');

    /* ---- 3. le direct ---- */
    await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: 'Encore là ?', p_genre: 'texte', p_donnees: null });
    dit('un nouveau message arrive en direct', await attendre(p, () => [...document.querySelectorAll('#fil .b-bulle')].some(b => /Encore là/.test(b.textContent)), null, 9000));
    /* Ce que les membres ont lu, APRÈS leur dernier message à eux (écrire
       avance son propre « lu ») : la suite ne doit plus rien y changer. */
    const luAvant = await m.sql(`select string_agg(membre || ':' || lu_jusqu, ',' order by membre) from public.membres where groupe = '${g.id}'`);

    /* ---- 4. les infos ---- */
    await p.evaluate(() => ouvrirInfosGroupe());
    dit('les infos montrent les membres', await attendre(p, () => [...document.querySelectorAll('#grpInfosVeil .grp-ligne')].length === 2, null, 6000));
    dit('… sans « Quitter le groupe »', await p.evaluate(() => ![...document.querySelectorAll('#grpInfosVeil .grp-act-l')].some(x => /Quitter/.test(x.textContent))));
    await p.evaluate(() => fermerFeuilleGroupe('grpInfosVeil'));
    await p.waitForTimeout(500);

    /* ---- 5. retour, puis « Tous les groupes » ---- */
    await p.evaluate(() => document.querySelector('.grp-fil-tete .icon-btn').click());
    dit('le retour ramène à la modération', await attendre(p, () => state.screen === 'moderation', null, 4000));
    await p.waitForTimeout(600);
    await p.evaluate(() => [...document.querySelectorAll('#modGroupes .grp-ligne')].find(l => /club de Benoît/.test(l.textContent)).click());
    dit('« Tous les groupes » ouvre aussi la discussion, de l\'extérieur', await attendre(p, () => state.screen === 'groupe' && !!document.querySelector('#compo .compo-mod')
      && [...document.querySelectorAll('#fil .b-bulle')].some(b => /Encore là/.test(b.textContent)), null, 9000));

    /* ---- 6. rien n'a été « lu » au nom des membres ---- */
    await p.waitForTimeout(800);
    const luApres = await m.sql(`select string_agg(membre || ':' || lu_jusqu, ',' order by membre) from public.membres where groupe = '${g.id}'`);
    dit('rien n\'a été marqué « lu » au nom des membres', luAvant === luApres, luApres);

    /* ---- 7. un de SES groupes, regardé depuis la modération ---- */
    await p.evaluate(() => document.querySelector('.grp-fil-tete .icon-btn').click());
    await attendre(p, () => state.screen === 'moderation', null, 4000);
    const g2 = (await m.rpc(A, 'creer_groupe', { p_nom: 'La Modération', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code2 = await m.sql(`select code from public.groupes where id = '${g2.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g2.id, p_code: code2 });
    await m.sql("update public.messages set cree_le = cree_le - interval '4 seconds'");
    const mid2 = (await m.rpc(B, 'envoyer_message', { p_groupe: g2.id, p_texte: 'Un autre message à vérifier', p_genre: 'texte', p_donnees: null })).data.id;
    await m.rpc(A, 'signaler', { p_message: mid2, p_cible: null, p_groupe: null, p_raison: 'inapproprie', p_details: '' });
    await p.evaluate(() => { chargerListes(); chargerEtatGroupes(); });
    await attendre(p, (id) => (grp.liste || []).some(x => x.id === id), g2.id, 8000);
    await p.evaluate(() => chargerModeration());
    const carte = await attendre(p, () => [...document.querySelectorAll('.mod-carte')].some(c => /à vérifier/.test(c.textContent) && c.querySelector('.mod-voir')), null, 9000);
    await p.evaluate(() => [...document.querySelectorAll('.mod-carte')].find(c => /à vérifier/.test(c.textContent)).querySelector('.mod-voir').click());
    const ouvert = await attendre(p, (id) => state.screen === 'groupe' && grp.courant === id && !!document.getElementById('compoTexte'), g2.id, 9000);
    await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelector('.grp-fil-tete .icon-btn').click());
    const versModo = await attendre(p, () => state.screen === 'moderation', null, 4000);
    dit('7. un de ses groupes, vu depuis un signalement : la flèche ramène à la modération', carte && ouvert && versModo,
      (carte ? 'carte' : 'PAS de carte') + ', ' + (ouvert ? 'groupe ouvert (membre)' : 'groupe PAS ouvert') + ', retour ' + (await p.evaluate(() => state.screen)));
    await p.waitForTimeout(700);
    await p.evaluate(() => allerOnglet('groupes'));
    await attendre(p, () => state.screen === 'groupes' && !!document.getElementById('grpMes'), null, 6000);
    await p.evaluate((id) => ouvrirGroupe(id), g2.id);
    await attendre(p, (id) => state.screen === 'groupe' && grp.courant === id, g2.id, 6000);
    await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelector('.grp-fil-tete .icon-btn').click());
    const versListe = await attendre(p, () => state.screen === 'groupes', null, 4000);
    dit('   … ouvert depuis la liste des groupes, il ramène toujours à la liste', versListe, 'retour ' + (await p.evaluate(() => state.screen)));
    dit('aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la modération voit l\'intérieur des groupes, sans y entrer');
  process.exit(ko ? 1 : 0);
})();
