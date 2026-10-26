/* ====== BANC « LA MODÉRATION AGIT PARTOUT, ET LE DIT » (v336) ======
   « Vérifie les possibilités que j'ai au niveau des droits — retirer, nommer
     administrateur, etc. — sur les groupes, en sachant que je suis dans la
     modération : je veux que tout soit cohérent et top. » Un VRAI PostgreSQL,
   le vrai groupes/table.sql (le décor de groupes.js). Benoît a un groupe
   privé ; Chloé, Dora et Émile en sont membres ; Taylor, modératrice, n'en
   fait pas partie.
   LE SERVEUR
     1. sans le mode modération, le compte de Taylor ne peut rien ; avec,
        elle nomme Chloé admin, puis le lui retire : c'est fait, et la
        discussion le dit au nom de la modération (« moderation »), sans le
        nom de Taylor ; Benoît fait de même avec Dora : sa ligne à lui reste
        celle de tous les jours ;
     2. Taylor met le propriétaire en sourdine : il ne peut plus écrire ;
        elle lui rend la parole ;
     3. « Il sera changé de propriétaire, mais que par inactivité, pas par la
        modération » : Taylor ne confie pas le groupe à Dora ;
     4. … ni ne retire, ni ne bannit le propriétaire : rien ne bouge, rien
        ne se dit ;
    4b. le propriétaire, lui, cède toujours son groupe (Benoît à Dora, Dora
        le lui rend) : une ligne de tous les jours ;
     5. Taylor bannit Chloé : elle ne peut plus revenir avec le code ;
     6. la liste des bannis : Taylor et le propriétaire la lisent (le nom, la
        couleur) ; un simple membre, non ;
     7. Taylor lève le bannissement : Chloé revient avec le code ;
     8. un simple membre ne peut rien faire de tout cela ;
     9. la photo : changée par Taylor, la ligne dit « la modération », sans
        nom ; changée par le propriétaire, son nom ;
    10. LE MODE : Taylor membre du groupe — avec son profil, son rôle et
        rien de plus (membre : rien ; admin : nommer un admin, pas en retirer
        un, ni toucher au propriétaire) ; en mode modération, tout, et tout
        au nom de la modération, même ce que son rôle permet ; Chloé, qui
        n'est pas modératrice, n'y gagne rien à le dire ;
   LE JEU (le téléphone de Taylor, modératrice, de l'extérieur)
    11. la page du propriétaire : la sourdine seule — et « Ici, tu agis au
        nom de la modération » ; ni retrait, ni bannissement, ni « Confier »,
        ni « Signaler », ni « Bloquer » ;
    12. la page d'un membre : nommer admin, retirer, bannir ; ni « Confier »,
        ni « Signaler », ni « Bloquer » ;
    13. la sourdine du propriétaire, par sa page : faite au serveur, et la
        page offre ensuite de lui rendre la parole — rendue ;
    14. les infos : « Personnes bannies », pas « Signaler le groupe » ; la
        page des bannis montre Émile, banni ; le toucher lève le
        bannissement ;
    15. le menu d'un message d'un membre : « Gérer … », ni « Signaler » ni
        « Bloquer » ;
    16. les lignes de la discussion, au nom de la modération, en français,
        en anglais et en espagnol ;
    17. aucune erreur.
   Sur la v335 : 1, 5, 6 et 9 à 13 rouges, et le banc s'arrête au 14 (pas
   de page des bannis). Le serveur refusait déjà de confier le groupe ou d'en
   retirer le propriétaire (3, 4) ; la sourdine du propriétaire (2) et la
   levée d'un bannissement (7) y existaient — rien, dans le jeu, ne
   permettait de les faire.
   Usage : node banc-essai/moderation-droits.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const T_ = 'aaaaaaaa-0000-4000-8000-0000000000e1', B = 'bbbbbbbb-0000-4000-8000-0000000000e2', C = 'cccccccc-0000-4000-8000-0000000000e3',
      D = 'dddddddd-0000-4000-8000-0000000000e4', E = 'eeeeeeee-0000-4000-8000-0000000000e5';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 320) + ')' : '')); if (!bon) ko++; };
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

(async () => {
  const m = await monter(8513, 5717);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[T_, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B'],
                                             [D, 'dora@essai', 'Dora', '#8E5BD8'], [E, 'emile@essai', 'Émile', '#E8B84C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(T_); await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    for (const x of [C, D, E]) { await m.rpc(x, 'rejoindre_groupe', { p_groupe: g.id, p_code: code }); await m.sql("select pg_sleep(0.02)"); }
    const role = (qui) => m.sql(`select coalesce((select role from public.membres where groupe = '${g.id}' and membre = '${qui}'), 'dehors')`);
    /* Taylor agit en mode modération (p_moderation), sauf quand le banc dit
       le contraire ; les autres, avec leur profil. */
    const moderer = async (moi, qui, action, minutes, mode) => ((await m.rpc(moi, 'moderer_membre',
      { p_groupe: g.id, p_membre: qui, p_action: action, p_minutes: minutes || null, p_moderation: mode === undefined ? moi === T_ : mode })).data || {});
    /* La dernière ligne du jeu « quoi » : par la modération ? avec quel nom ? */
    const ligne = async (quoi) => m.sql(`select coalesce(donnees->>'moderation', 'non') || ' / ' || coalesce(donnees->>'nom', '-') from public.messages
                                          where groupe = '${g.id}' and genre = 'systeme' and texte = '${quoi}' order by id desc limit 1`);
    const ecrire = async (moi, texte) => ((await m.rpc(moi, 'envoyer_message', { p_groupe: g.id, p_texte: texte, p_genre: 'texte', p_donnees: null })).data || {});

    /* 1 */
    const r1z = await moderer(T_, C, 'promouvoir', null, false);
    const r1a = await moderer(T_, C, 'promouvoir'); const l1a = await ligne('admin'); const ro1a = await role(C);
    const r1b = await moderer(T_, C, 'retrograder'); const l1b = await ligne('plus_admin'); const ro1b = await role(C);
    const r1c = await moderer(B, D, 'promouvoir'); const l1c = await ligne('admin');
    dit('1. sans le mode modération, le compte de Taylor ne peut rien ; avec, elle nomme Chloé admin puis le lui retire, au nom de la modération ; la ligne de Benoît reste la sienne',
      r1z.ok === false && r1z.erreur === 'interdit' && r1a.ok && ro1a === 'admin' && l1a === 'true / Chloé' && r1b.ok && ro1b === 'membre' && l1b === 'true / Chloé' && r1c.ok && l1c === 'non / Dora',
      JSON.stringify({ r1z, r1a, l1a, r1b, l1b, l1c }));

    /* 2 */
    const r2a = await moderer(T_, B, 'muet', 60); const e2a = await ecrire(B, 'Bonjour');
    const r2b = await moderer(T_, B, 'parler'); await m.sql("select pg_sleep(1.05)"); const e2b = await ecrire(B, 'Me revoilà');
    dit('2. Taylor met le propriétaire en sourdine (il ne peut plus écrire), puis lui rend la parole',
      r2a.ok && e2a.ok === false && e2a.erreur === 'muet' && r2b.ok && e2b.ok === true, JSON.stringify({ r2a, e2a, r2b, e2b }));

    /* 3 et 4 : jamais par la modération */
    const nbLignes = async () => +(await m.sql(`select count(*) from public.messages where groupe = '${g.id}' and genre = 'systeme'`));
    const n3 = await nbLignes();
    const r3 = await moderer(T_, D, 'ceder');
    dit('3. Taylor ne confie pas le groupe à Dora : le serveur refuse, Benoît reste propriétaire',
      r3.ok === false && r3.erreur === 'interdit' && (await role(B)) === 'proprietaire' && (await role(D)) === 'admin', JSON.stringify({ r3 }));
    const r4 = [await moderer(T_, B, 'exclure'), await moderer(T_, B, 'bannir')];
    dit('4. … ni ne retire, ni ne bannit le propriétaire : rien ne bouge, rien ne se dit',
      r4.every(r => r.ok === false && r.erreur === 'interdit') && (await role(B)) === 'proprietaire' && (await nbLignes()) === n3
        && +(await m.sql(`select count(*) from public.bannis where groupe = '${g.id}'`)) === 0, JSON.stringify({ r4 }));

    /* 4b : le propriétaire, lui, cède toujours */
    const r4b = await moderer(B, D, 'ceder'); const l4b = await ligne('proprietaire'); const ro4b = [await role(D), await role(B)];
    const r4c = await moderer(D, B, 'ceder'); const l4c = await ligne('proprietaire');
    dit('4b. le propriétaire cède son groupe (Benoît à Dora, Dora le lui rend) : une ligne de tous les jours',
      r4b.ok && ro4b.join() === 'proprietaire,admin' && l4b === 'non / Dora' && r4c.ok && (await role(B)) === 'proprietaire' && (await role(D)) === 'admin' && l4c === 'non / Benoît',
      JSON.stringify({ r4b, l4b, ro4b, r4c, l4c }));

    /* 5 */
    const r5 = await moderer(T_, C, 'bannir'); const l5 = await ligne('banni');
    const j5 = (await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code })).data || {};
    dit('5. Taylor bannit Chloé : dit au nom de la modération, et le code ne la fait plus entrer',
      r5.ok && l5 === 'true / Chloé' && j5.ok === false && (await role(C)) === 'dehors', JSON.stringify({ r5, l5, j5 }));

    /* 6 */
    const b6t = (await m.rpc(T_, 'bannis_du_groupe', { p_groupe: g.id })).data || [];
    const b6b = (await m.rpc(B, 'bannis_du_groupe', { p_groupe: g.id })).data || [];
    const b6e = (await m.rpc(E, 'bannis_du_groupe', { p_groupe: g.id })).data || [];
    dit('6. la liste des bannis : Taylor et le propriétaire la lisent (nom, couleur), un simple membre non',
      b6t.length === 1 && b6t[0].nom === 'Chloé' && b6t[0].couleur === '#7BC86B' && b6t[0].id === C && b6b.length === 1 && b6e.length === 0,
      JSON.stringify({ b6t, b6b: b6b.length, b6e: b6e.length }));

    /* 7 */
    const r7 = await moderer(T_, C, 'debannir');
    const j7 = (await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code })).data || {};
    dit('7. Taylor lève le bannissement : Chloé revient avec le code', r7.ok && j7.ok === true && (await role(C)) === 'membre', JSON.stringify({ r7, j7 }));

    /* 8 */
    const r8 = [await moderer(E, C, 'exclure'), await moderer(E, C, 'promouvoir'), await moderer(E, B, 'muet', 60), await moderer(E, C, 'ceder')];
    dit('8. un simple membre ne peut rien faire de tout cela', r8.every(r => r.ok === false && r.erreur === 'interdit') && (await role(C)) === 'membre', JSON.stringify(r8));

    /* 9 */
    const p9t = (await m.rpc(T_, 'poser_photo_groupe', { p_groupe: g.id, p_photo: PHOTO })).data || {};
    const l9t = await ligne('photo');
    await m.sql("select pg_sleep(3.1)");
    const p9b = (await m.rpc(B, 'poser_photo_groupe', { p_groupe: g.id, p_photo: null })).data || {};
    const l9b = await ligne('photo_retiree');
    dit('9. la photo changée par Taylor : « la modération », sans nom ; retirée par le propriétaire : son nom',
      p9t.ok && l9t === 'true / -' && p9b.ok && l9b === 'non / Benoît', JSON.stringify({ p9t, l9t, p9b, l9b }));

    /* 10 : LE MODE — Taylor membre du groupe : avec son profil, son rôle et rien de plus ; en mode modération, tout, au nom de la modération */
    await m.rpc(T_, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const r10a = await moderer(T_, C, 'muet', 60, false);                 // simple membre, avec son profil
    await moderer(B, T_, 'promouvoir');                                    // Benoît la nomme admin
    const r10b = await moderer(T_, E, 'promouvoir', null, false); const l10b = await ligne('admin');
    const r10c = await moderer(T_, E, 'retrograder', null, false);
    const r10d = await moderer(T_, B, 'muet', 60, false);
    const r10e = await moderer(T_, E, 'retrograder', null, true); const l10e = await ligne('plus_admin');
    const r10f = await moderer(T_, E, 'promouvoir', null, true); const l10f = await ligne('admin');
    const r10g = await moderer(C, E, 'retrograder', null, true);           // Chloé n'est pas modératrice : le mot ne lui sert à rien
    dit('10. le mode : avec son profil, Taylor n\'a que son rôle (membre : rien ; admin : nommer, sans retirer un admin ni toucher au propriétaire) ; en mode modération, tout, et au nom de la modération — même ce que son rôle permet',
      r10a.erreur === 'interdit' && r10b.ok && l10b === 'non / Émile' && r10c.erreur === 'interdit' && r10d.erreur === 'interdit'
        && r10e.ok && l10e === 'true / Émile' && r10f.ok && l10f === 'true / Émile' && r10g.erreur === 'interdit',
      JSON.stringify({ r10a, r10b, l10b, r10c, r10d, r10e, l10e, r10f, l10f, r10g }));
    await moderer(T_, E, 'retrograder', null, true);
    await m.rpc(T_, 'quitter_groupe', { p_groupe: g.id });

    /* LE JEU, chez Taylor */
    await moderer(B, E, 'bannir');                                   // Émile, banni par le propriétaire
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'");
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript(([moi]) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, [T_]);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok' && grp.etat.moderateur); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate((gid) => { state.screen = 'groupes'; render(); return regarderGroupe(gid); }, g.id);
    await p.waitForFunction((b) => state.screen === 'groupe' && !!(grp.membres[grp.courant] || []).find(x => x.membre === b), B, { timeout: 9000 });
    await p.waitForTimeout(700);
    const lignesPage = (id) => p.evaluate((id) => [...document.querySelectorAll('#' + id + ' .grp-liste-act .gal-t')].map(e => e.textContent.trim()), id);
    const aide = (id) => p.evaluate((id) => { const a = document.querySelector('#' + id + ' .grp-modo-aide'); return a ? a.textContent.trim() : ''; }, id);

    /* 11 */
    await p.evaluate((b) => ouvrirMembre(b), B);
    await p.waitForTimeout(900);
    const l11 = await lignesPage('grpMembreVeil'), a11 = await aide('grpMembreVeil');
    dit('11. la page du propriétaire : la sourdine seule, « au nom de la modération » ; ni retrait, ni bannissement, ni Confier, ni Signaler, ni Bloquer',
      JSON.stringify(l11) === JSON.stringify(['Mettre en sourdine une heure']) && a11 === 'Ici, tu agis au nom de la modération.', JSON.stringify({ l11, a11 }));
    await p.evaluate(() => fermerFeuilleGroupe('grpMembreVeil')); await p.waitForTimeout(500);

    /* 12 */
    await p.evaluate((c) => ouvrirMembre(c), C);
    await p.waitForTimeout(900);
    const l12 = await lignesPage('grpMembreVeil');
    dit('12. la page d\'un membre : nommer admin, retirer, bannir ; ni Confier, ni Signaler, ni Bloquer',
      JSON.stringify(l12) === JSON.stringify(['Mettre en sourdine une heure', 'Nommer admin', 'Retirer du groupe', 'Bannir du groupe']), JSON.stringify(l12));
    await p.evaluate(() => fermerFeuilleGroupe('grpMembreVeil')); await p.waitForTimeout(500);

    /* 13 : la sourdine du propriétaire, par sa page */
    await p.evaluate(() => ouvrirInfosGroupe()); await p.waitForTimeout(900);
    await p.evaluate((b) => ouvrirMembre(b), B); await p.waitForTimeout(900);
    await p.evaluate((b) => modererMembre(b, 'muet'), B);
    await p.waitForTimeout(1500);
    const muet13 = await m.sql(`select (muet_jusqu > now())::text from public.membres where groupe = '${g.id}' and membre = '${B}'`);
    await p.evaluate((b) => ouvrirMembre(b), B); await p.waitForTimeout(900);
    const l13 = await lignesPage('grpMembreVeil');
    await p.evaluate((b) => modererMembre(b, 'parler'), B);
    await p.waitForTimeout(1500);
    const parle13 = await m.sql(`select (muet_jusqu is null)::text from public.membres where groupe = '${g.id}' and membre = '${B}'`);
    dit('13. la sourdine du propriétaire, par sa page : faite, puis la page offre de lui rendre la parole — rendue ; il reste propriétaire',
      muet13 === 'true' && JSON.stringify(l13) === JSON.stringify(['Rendre la parole']) && parle13 === 'true' && (await role(B)) === 'proprietaire',
      JSON.stringify({ muet13, l13, parle13 }));

    /* 14 */
    const l14 = await p.evaluate(() => [...document.querySelectorAll('#grpInfosVeil .grp-liste-act .gal-t')].map(e => e.textContent.trim()));
    await p.evaluate(() => ouvrirBannis());
    await p.waitForFunction(() => !!document.querySelector('#grpBannis .grp-ligne, #grpBannis .grp-vide:not(:has(.spinner))'), null, { timeout: 6000 }).catch(() => {});
    await p.waitForTimeout(400);
    const b14 = await p.evaluate(() => [...document.querySelectorAll('#grpBannis .grp-ligne')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    await p.evaluate((e) => leverBannissement(e), E); await p.waitForTimeout(400);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Lever' && x.offsetParent); if (b) b.click(); });
    await p.waitForTimeout(1500);
    const apres14 = await p.evaluate(() => document.getElementById('grpBannis') ? document.getElementById('grpBannis').textContent.trim() : '');
    const reste14 = +(await m.sql(`select count(*) from public.bannis where groupe = '${g.id}'`));
    dit('14. les infos : « Personnes bannies », pas « Signaler le groupe » ; Émile y est ; le toucher lève son bannissement',
      l14.includes('Personnes bannies') && !l14.includes('Signaler le groupe') && b14.length === 1 && /Émile\s*Depuis le/.test(b14[0]) && reste14 === 0 && /Personne n'est banni/.test(apres14),
      JSON.stringify({ l14, b14, apres14, reste14 }));
    await p.evaluate(() => { fermerFeuilleGroupe('grpBannisVeil'); fermerFeuilleGroupe('grpInfosVeil'); }); await p.waitForTimeout(600);

    /* 15 : le menu d'un message de Chloé */
    await m.rpc(C, 'envoyer_message', { p_groupe: g.id, p_texte: 'Coucou', p_genre: 'texte', p_donnees: null });
    const idC = +(await m.sql(`select max(id) from public.messages where groupe = '${g.id}' and auteur = '${C}'`));
    await p.waitForFunction((id) => !!(grp.fils[grp.courant] && grp.fils[grp.courant].messages.some(x => x.id === id)), idC, { timeout: 6000 }).catch(() => {});
    await p.evaluate((id) => actionsMessage(String(id)), idC); await p.waitForTimeout(800);
    const l15 = await lignesPage('grpActionsVeil');
    dit('15. le menu d\'un message de Chloé : « Gérer Chloé », ni Signaler ni Bloquer', l15.includes('Gérer Chloé') && !l15.some(t => /^Signaler|^Bloquer/.test(t)), JSON.stringify(l15));
    await p.evaluate(() => fermerFeuilleGroupe('grpActionsVeil')); await p.waitForTimeout(400);

    /* 16 */
    const l16 = await p.evaluate(() => {
      const avant = LANGUE, r = {};
      const cas = [['exclu', 'Chloé'], ['banni', 'Chloé'], ['admin', 'Chloé'], ['plus_admin', 'Chloé'], ['photo', ''], ['photo_retiree', '']];
      for (const l of ['fr', 'en', 'es']) { LANGUE = l; r[l] = cas.map(([t, n]) => texteSysteme({ texte: t, donnees: { nom: n, moderation: true } })); }
      LANGUE = avant;
      r.fil = [...document.querySelectorAll('#fil .b-sys')].map(e => e.textContent.trim());
      return r;
    });
    const attendu = {
      fr: ['La modération a retiré Chloé du groupe', 'La modération a banni Chloé du groupe', 'La modération a nommé Chloé admin du groupe', 'La modération a retiré le rôle d\'admin de Chloé',
           'La modération a changé la photo du groupe', 'La modération a retiré la photo du groupe'],
      en: ['Moderators removed Chloé from the group', 'Moderators banned Chloé from the group', 'Moderators made Chloé a group admin', 'Moderators removed Chloé\'s admin role',
           'Moderators changed the group photo', 'Moderators removed the group photo'],
      es: ['La moderación quitó a Chloé del grupo', 'La moderación expulsó a Chloé del grupo', 'La moderación nombró admin del grupo a Chloé', 'La moderación le quitó el rol de admin a Chloé',
           'La moderación cambió la foto del grupo', 'La moderación quitó la foto del grupo'] };
    dit('16. les lignes de la discussion au nom de la modération, en français, en anglais et en espagnol — et dans le fil',
      ['fr', 'en', 'es'].every(l => JSON.stringify(l16[l]) === JSON.stringify(attendu[l])) && l16.fil.includes('La modération a banni Chloé du groupe') && l16.fil.includes('La modération a changé la photo du groupe'),
      JSON.stringify(l16).slice(0, 300));
    await ctx.close();
    dit('17. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la modération agit partout, le dit en son nom, et ne prend jamais un groupe à son propriétaire');
  process.exit(ko ? 1 : 0);
})();
