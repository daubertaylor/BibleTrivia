/* ====== BANC « LE MODE MODÉRATION » (v336) ======
   « Vu que je suis modérateur, je me demande s'il n'est pas juste d'avoir
     des permissions qu'en modération, et pas simplement avec mon profil
     classique. » Un VRAI PostgreSQL, le vrai groupes/table.sql. Benoît a un
   groupe ; Taylor, modératrice, et Chloé en sont de simples membres. Le
   téléphone de Taylor :
     1. le groupe ouvert depuis « Mes groupes » : son profil — son visage à
        côté du champ ; la page de Chloé ne lui propose rien qu'un simple
        membre n'ait, sauf « Agir au nom de la modération » (ni « Signaler »
        ni « Bloquer » : les signalements arrivent chez elle, et elle doit
        voir ce qu'elle modère) ;
     2. le menu d'un message de Chloé : « Gérer Chloé », pas « Supprimer le
        message » ;
     3. les infos : ni « Modifier le groupe », ni « Personnes bannies », ni
        « Supprimer le groupe » ;
     4. « @tout le monde » lui est réservé, comme à tout membre ;
     5. « Agir au nom de la modération » : la page se refait sur place, avec
        ses pouvoirs et « Ici, tu agis au nom de la modération » ; le
        bouclier à côté du champ ; le mot le dit ;
     6. nommer Chloé admin depuis la page : fait, et la discussion le dit au
        nom de la modération ;
     7. en mode modération : les infos (modifier, bannis, supprimer), le
        menu d'un message (le supprimer), « @tout le monde » ;
     8. un toucher sur le bouclier : de nouveau son profil — le mot le dit,
        la page d'un membre ne propose plus que son rôle ;
     9. arrivée de la Modération : d'office en mode modération ;
    10. rouvert depuis « Mes groupes » : de nouveau son profil ;
    11. un serveur d'avant (sans « moderation_pleine ») : comme en v335 —
        les pouvoirs, sans mode ni visage ;
    12. aucune erreur.
   Sur la v335 : 1 à 7 rouges, et le banc s'arrête au 8 — pas de mode : un
   modérateur avait ses pouvoirs partout, avec son profil (le menu d'un
   message lui proposait même « Signaler »).
   Usage : node banc-essai/mode-moderation.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const T_ = 'aaaaaaaa-0000-4000-8000-0000000000d1', B = 'bbbbbbbb-0000-4000-8000-0000000000d2', C = 'cccccccc-0000-4000-8000-0000000000d3';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 360) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8517, 5721);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[T_, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(T_); await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(T_, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'envoyer_message', { p_groupe: g.id, p_texte: 'Bonjour à tous', p_genre: 'texte', p_donnees: null });
    const idC = +(await m.sql(`select max(id) from public.messages where groupe = '${g.id}' and auteur = '${C}'`));
    await m.sql("update public.messages set cree_le = cree_le - interval '2 minutes'");

    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript(([moi]) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, [T_]);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok' && grp.etat.moderateur); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => chargerListes());
    await attendre(p, (gid) => (grp.liste || []).some(x => x.id === gid), g.id, 8000);
    const ouvrir = async () => {
      await p.evaluate(() => { state.screen = 'groupes'; render(); });
      await p.evaluate((gid) => ouvrirGroupe(gid), g.id);
      await attendre(p, (c) => state.screen === 'groupe' && !!document.getElementById('compoTexte') && !!(grp.membres[grp.courant] || []).find(x => x.membre === c), C, 9000);
      await p.waitForTimeout(600);
    };
    const lignes = (id) => p.evaluate((id) => [...document.querySelectorAll('#' + id + ' .grp-liste-act .gal-t')].map(e => e.textContent.trim()), id);
    const aide = (id) => p.evaluate((id) => { const a = document.querySelector('#' + id + ' .grp-modo-aide'); return a ? a.textContent.trim() : ''; }, id);
    const bouclier = () => p.evaluate(() => { const v = document.getElementById('compoVoix'); return v ? (v.querySelector('.avatar.a-mod') ? 'bouclier' : 'visage') : 'rien'; });
    const mot = () => p.evaluate(() => { const t = document.querySelector('.mini-toast.show'); return t ? t.textContent : ''; });
    const fermer = (id) => p.evaluate((id) => fermerFeuilleGroupe(id), id).then(() => p.waitForTimeout(500));
    const page = async (qui) => { await p.evaluate((q) => ouvrirMembre(q), qui); await p.waitForTimeout(800); return { l: await lignes('grpMembreVeil'), a: await aide('grpMembreVeil') }; };
    const menu = async () => { await p.evaluate((id) => actionsMessage(String(id)), idC); await p.waitForTimeout(700); const l = await lignes('grpActionsVeil'); await fermer('grpActionsVeil'); return l; };
    const infos = async () => { await p.evaluate(() => ouvrirInfosGroupe()); await p.waitForTimeout(800); const l = await lignes('grpInfosVeil'); await fermer('grpInfosVeil'); return l; };

    await ouvrir();
    await attendre(p, (id) => !!(grp.fils[grp.courant] && grp.fils[grp.courant].messages.some(x => x.id === id)), idC, 6000);

    /* 1 */
    const v1 = await bouclier(); const p1 = await page(C); await fermer('grpMembreVeil');
    dit('1. avec son profil : son visage à côté du champ ; la page de Chloé ne propose que « Agir au nom de la modération » (ni pouvoirs, ni Signaler, ni Bloquer)',
      v1 === 'visage' && JSON.stringify(p1.l) === JSON.stringify(['Agir au nom de la modération']) && p1.a === '', JSON.stringify({ v1, p1 }));

    /* 2 */
    const l2 = await menu();
    dit('2. le menu d\'un message de Chloé : « Gérer Chloé », pas « Supprimer le message »', l2.includes('Gérer Chloé') && !l2.includes('Supprimer le message') && !l2.some(t => /^Signaler|^Bloquer/.test(t)), JSON.stringify(l2));

    /* 3 */
    const l3 = await infos();
    dit('3. les infos : ni Modifier, ni Personnes bannies, ni Supprimer le groupe (ni Signaler)',
      !l3.includes('Modifier le groupe') && !l3.includes('Personnes bannies') && !l3.includes('Supprimer le groupe') && !l3.includes('Signaler le groupe') && l3.includes('Quitter le groupe'), JSON.stringify(l3));

    /* 4 */
    const t4 = await p.evaluate(() => peutNommerTous());
    dit('4. « @tout le monde » lui est réservé, comme à tout membre', t4 === false, String(t4));

    /* 5 */
    await p.evaluate((q) => ouvrirMembre(q), C); await p.waitForTimeout(800);
    await p.evaluate(() => { const e = [...document.querySelectorAll('#grpMembreVeil .grp-liste-act .gal-t')].find(x => x.textContent.trim() === 'Agir au nom de la modération'); if (e) e.closest('button').click(); });
    await p.waitForTimeout(400);
    const mot5 = await mot();
    const p5 = { l: await lignes('grpMembreVeil'), a: await aide('grpMembreVeil') };
    const v5 = await bouclier();
    const memePage = await p.evaluate(() => document.querySelectorAll('#grpMembreVeil').length);
    dit('5. « Agir au nom de la modération » : la page se refait sur place, avec ses pouvoirs et « Ici, tu agis au nom de la modération » ; le bouclier à côté du champ ; le mot le dit',
      memePage === 1 && JSON.stringify(p5.l) === JSON.stringify(['Mettre en sourdine une heure', 'Nommer admin', 'Retirer du groupe', 'Bannir du groupe'])
        && p5.a === 'Ici, tu agis au nom de la modération.' && v5 === 'bouclier' && mot5 === 'Tu agis au nom de la modération.', JSON.stringify({ p5, v5, mot5 }));

    /* 6 */
    await p.evaluate((q) => modererMembre(q, 'promouvoir'), C);
    await p.waitForTimeout(1500);
    const l6 = await m.sql(`select coalesce(donnees->>'moderation', 'non') || ' / ' || coalesce(donnees->>'nom', '-') from public.messages
                             where groupe = '${g.id}' and genre = 'systeme' and texte = 'admin' order by id desc limit 1`);
    const r6 = await m.sql(`select role from public.membres where groupe = '${g.id}' and membre = '${C}'`);
    dit('6. nommer Chloé admin depuis la page : fait, et la discussion le dit au nom de la modération', r6 === 'admin' && l6 === 'true / Chloé', JSON.stringify({ r6, l6 }));
    await m.rpc(B, 'moderer_membre', { p_groupe: g.id, p_membre: C, p_action: 'retrograder', p_minutes: null });
    await p.evaluate((gid) => chargerMembres(gid), g.id); await p.waitForTimeout(600);

    /* 7 */
    const l7i = await infos(), l7m = await menu(), t7 = await p.evaluate(() => peutNommerTous());
    dit('7. en mode modération : les infos (modifier, bannis, supprimer), le menu d\'un message (le supprimer), « @tout le monde »',
      ['Modifier le groupe', 'Personnes bannies', 'Supprimer le groupe'].every(t => l7i.includes(t)) && l7m.includes('Supprimer le message') && t7 === true,
      JSON.stringify({ l7i, l7m, t7 }));

    /* 8 */
    await p.evaluate(() => changerVoix()); await p.waitForTimeout(300);
    const mot8 = await mot(), v8 = await bouclier(); const p8 = await page(C); await fermer('grpMembreVeil');
    dit('8. un toucher sur le bouclier : de nouveau son profil — le mot le dit, la page de Chloé ne propose plus que le passage en modération',
      v8 === 'visage' && mot8 === 'Tu agis en ton nom.' && JSON.stringify(p8.l) === JSON.stringify(['Agir au nom de la modération']) && p8.a === '', JSON.stringify({ v8, mot8, p8 }));

    /* 9 : arrivée de la Modération */
    await p.evaluate(() => { retourGroupes(); });
    await attendre(p, () => state.screen === 'groupes', null, 5000);
    await p.evaluate(() => ouvrirModeration());
    await attendre(p, () => state.screen === 'moderation', null, 6000);
    await p.waitForTimeout(500);
    await p.evaluate((gid) => regarderGroupe(gid), g.id);
    await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    await p.waitForTimeout(600);
    const v9 = await bouclier(); const p9 = await page(C); await fermer('grpMembreVeil');
    dit('9. arrivée de la Modération : d\'office en mode modération (le bouclier, les pouvoirs)',
      v9 === 'bouclier' && p9.l.includes('Retirer du groupe') && p9.a === 'Ici, tu agis au nom de la modération.', JSON.stringify({ v9, p9 }));

    /* 10 */
    await p.evaluate(() => retourGroupes());
    await attendre(p, () => state.screen === 'moderation' || state.screen === 'groupes', null, 5000);
    await ouvrir();
    const v10 = await bouclier(); const p10 = await page(C); await fermer('grpMembreVeil');
    dit('10. rouvert depuis « Mes groupes » : de nouveau son profil', v10 === 'visage' && JSON.stringify(p10.l) === JSON.stringify(['Agir au nom de la modération']), JSON.stringify({ v10, p10 }));

    /* 11 : un serveur d'avant */
    await p.evaluate(() => { grp.etat.moderation_pleine = false; render(); });
    await p.waitForTimeout(500);
    const v11 = await bouclier(); const p11 = await page(C); await fermer('grpMembreVeil');
    const t11 = await p.evaluate(() => peutNommerTous());
    dit('11. un serveur d\'avant : comme en v335 — les pouvoirs, sans mode ni visage',
      v11 === 'rien' && p11.l.includes('Retirer du groupe') && !p11.l.includes('Agir au nom de la modération') && p11.a === '' && t11 === true, JSON.stringify({ v11, p11, t11 }));

    await ctx.close();
    dit('12. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 700)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — avec son profil, un membre comme les autres ; en mode modération, la modération');
  process.exit(ko ? 1 : 0);
})();
