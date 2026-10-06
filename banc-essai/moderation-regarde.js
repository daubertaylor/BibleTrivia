/* ====== LA MODÉRATION REGARDE L'INTÉRIEUR D'UN GROUPE (v311) ======
   « Quand la modération reçoit un signalement, il faut qu'elle puisse
     l'examiner : voir l'intérieur du groupe, ce qui s'y passe. » « Un
     modérateur doit pouvoir voir tous les groupes — pas y entrer, mais voir. »
   Le décor de groupes.js — un VRAI PostgreSQL. Benoît et Chloé ont un groupe
   privé dont Taylor, modérateur, ne fait pas partie :
     1. un signalement arrive ; sa carte propose « Voir le groupe » ;
     2. la discussion s'ouvre telle que les membres la voient, en LECTURE
        SEULE : pas de champ pour écrire, et Taylor n'en devient pas membre ;
     3. un nouveau message y arrive en direct ;
     4. les infos montrent les membres, sans « Quitter le groupe » ;
     5. le retour ramène à la modération, où « Tous les groupes » liste aussi
        ce groupe, et l'ouvre de même ;
     6. rien n'a été marqué « lu » au nom des membres.
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
    dit('… en lecture seule : pas de champ pour écrire', await p.evaluate(() => !document.getElementById('compoTexte') && !!document.querySelector('.compo-lecture')));
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
    dit('« Tous les groupes » ouvre aussi la discussion, en lecture seule', await attendre(p, () => state.screen === 'groupe' && !!document.querySelector('.compo-lecture')
      && [...document.querySelectorAll('#fil .b-bulle')].some(b => /Encore là/.test(b.textContent)), null, 9000));

    /* ---- 6. rien n'a été « lu » au nom des membres ---- */
    await p.waitForTimeout(800);
    const luApres = await m.sql(`select string_agg(membre || ':' || lu_jusqu, ',' order by membre) from public.membres where groupe = '${g.id}'`);
    dit('rien n\'a été marqué « lu » au nom des membres', luAvant === luApres, luApres);
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
