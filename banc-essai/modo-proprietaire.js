/* ====== BANC « LA MODÉRATION A LE DERNIER MOT SUR LE PROPRIÉTAIRE » (v338) ======
   « Lorsque j'agis au nom de la modération, je dois pouvoir avoir le plein
     contrôle sur le propriétaire du groupe. Parce que là, je ne peux rien
     faire à part le mettre en sourdine. »
   Un VRAI PostgreSQL, le vrai groupes/table.sql (le décor de groupes.js).
   Benoît a un groupe ; Chloé (admin), Dora et Émile y entrent dans cet
   ordre ; Taylor, modératrice, n'en fait pas partie.
   LE SERVEUR
     1. sans le mode modération, ni Taylor ni Chloé (admin) ne retirent ni ne
        bannissent le propriétaire ;
     2. en mode modération, Taylor retire Benoît : la règle de toujours
        choisit qui prend la main — un admin d'abord : Chloé ; la discussion
        dit les deux, « la modération a retiré Benoît », puis « Chloé est
        maintenant propriétaire » (une ligne de tous les jours : c'est la
        règle qui l'a choisie) ; le groupe compte un membre de moins ;
     3. Benoît revient avec le code, en simple membre ;
     4. Taylor met Chloé, la propriétaire, en sourdine, puis la bannit : sans
        admin, le plus ancien prend la main (Dora) ; Chloé ne revient plus
        avec le code ;
     5. Taylor confie le groupe à Émile : Dora en reste admin, et la ligne
        le dit au nom de la modération ;
     6. un groupe sans personne d'autre ne se retire pas à son propriétaire
        (« seul ») : rien ne bouge, rien ne se dit ;
   LE JEU (le téléphone de Taylor)
     7. la page du propriétaire (Émile) : la sourdine, le retrait, le
        bannissement, « au nom de la modération » ;
     8. « Retirer du groupe » : la fenêtre dit à qui le groupe passera, selon
        la règle (les mots de « Quitter ») ; confirmé, la phrase dit à qui
        (Dora), le serveur l'a fait, la discussion le montre ;
     9. la page d'un membre (Benoît) offre « Confier le groupe » ; la fenêtre
        nomme l'ancienne propriétaire, qui en reste admin ; confirmé, c'est
        fait, au nom de la modération ;
    10. la phrase « seul », en clair ;
    11. aucune erreur.
   Sur la v337 : tout rouge de 2 à 10 — le serveur refusait, et le jeu ne
   proposait que la sourdine.
   Usage : node banc-essai/modo-proprietaire.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const T_ = 'aaaaaaaa-0000-4000-8000-0000000000f1', B = 'bbbbbbbb-0000-4000-8000-0000000000f2', C = 'cccccccc-0000-4000-8000-0000000000f3',
      D = 'dddddddd-0000-4000-8000-0000000000f4', E = 'eeeeeeee-0000-4000-8000-0000000000f5';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 320) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8520, 5725);
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
    const role = (qui, gid) => m.sql(`select coalesce((select role from public.membres where groupe = '${gid || g.id}' and membre = '${qui}'), 'dehors')`);
    const moderer = async (moi, qui, action, minutes, mode, gid) => ((await m.rpc(moi, 'moderer_membre',
      { p_groupe: gid || g.id, p_membre: qui, p_action: action, p_minutes: minutes || null, p_moderation: mode === undefined ? moi === T_ : mode })).data || {});
    const lignes = async (n) => (await m.sql(`select string_agg(t, ' | ') from (select texte || ':' || coalesce(donnees->>'moderation', 'non') || '/' || coalesce(donnees->>'nom', '-') as t
                                               from public.messages where groupe = '${g.id}' and genre = 'systeme' order by id desc limit ${n}) x`)).split(' | ').reverse();
    const nbMembres = async () => +(await m.sql(`select nb_membres from public.groupes where id = '${g.id}'`));
    await moderer(B, C, 'promouvoir');

    /* 1 */
    const r1 = [await moderer(T_, B, 'exclure', null, false), await moderer(T_, B, 'bannir', null, false), await moderer(C, B, 'exclure'), await moderer(C, B, 'bannir')];
    dit('1. sans le mode modération, ni Taylor ni Chloé (admin) ne retirent ni ne bannissent le propriétaire',
      r1.every(r => r.ok === false && r.erreur === 'interdit') && (await role(B)) === 'proprietaire', JSON.stringify(r1));

    /* 2 */
    const n2 = await nbMembres();
    const r2 = await moderer(T_, B, 'exclure'); const l2 = await lignes(2);
    dit('2. en mode modération, Taylor retire Benoît : Chloé (admin) prend la main ; la discussion dit les deux ; un membre de moins',
      r2.ok && (await role(B)) === 'dehors' && (await role(C)) === 'proprietaire' && JSON.stringify(l2) === JSON.stringify(['exclu:true/Benoît', 'proprietaire:non/Chloé']) && (await nbMembres()) === n2 - 1,
      JSON.stringify({ r2, l2 }));

    /* 3 */
    const j3 = (await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code })).data || {};
    dit('3. Benoît revient avec le code, en simple membre', j3.ok === true && (await role(B)) === 'membre', JSON.stringify(j3));

    /* 4 */
    await moderer(T_, C, 'muet', 60);
    const r4 = await moderer(T_, C, 'bannir'); const l4 = await lignes(2);
    const j4 = (await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code })).data || {};
    const muetD = await m.sql(`select coalesce((muet_jusqu > now())::text, 'non') from public.membres where groupe = '${g.id}' and membre = '${D}'`);
    dit('4. Taylor met Chloé, la propriétaire, en sourdine, puis la bannit : sans admin, le plus ancien prend la main (Dora) ; Chloé ne revient plus',
      r4.ok && (await role(C)) === 'dehors' && (await role(D)) === 'proprietaire' && muetD === 'non' && JSON.stringify(l4) === JSON.stringify(['banni:true/Chloé', 'proprietaire:non/Dora'])
        && j4.ok === false, JSON.stringify({ r4, l4, j4, muetD }));

    /* 5 */
    const r5 = await moderer(T_, E, 'ceder'); const l5 = await lignes(1);
    dit('5. Taylor confie le groupe à Émile : Dora en reste admin, la ligne au nom de la modération',
      r5.ok && (await role(E)) === 'proprietaire' && (await role(D)) === 'admin' && JSON.stringify(l5) === JSON.stringify(['proprietaire:true/Émile']), JSON.stringify({ r5, l5 }));

    /* 6 */
    const seul = (await m.rpc(E, 'creer_groupe', { p_nom: 'Le coin d\'Émile', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const nS = await m.sql(`select count(*) from public.messages where groupe = '${seul.id}'`);
    const r6 = [await moderer(T_, E, 'exclure', null, true, seul.id), await moderer(T_, E, 'bannir', null, true, seul.id)];
    dit('6. un groupe sans personne d\'autre ne se retire pas à son propriétaire (« seul ») : rien ne bouge, rien ne se dit',
      r6.every(r => r.ok === false && r.erreur === 'seul') && (await role(E, seul.id)) === 'proprietaire'
        && (await m.sql(`select count(*) from public.messages where groupe = '${seul.id}'`)) === nS
        && (await m.sql(`select (supprime_le is null)::text from public.groupes where id = '${seul.id}'`)) === 'true', JSON.stringify(r6));

    /* LE JEU, chez Taylor */
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
    await p.waitForFunction((e) => state.screen === 'groupe' && !!(grp.membres[grp.courant] || []).find(x => x.membre === e), E, { timeout: 9000 });
    await p.waitForTimeout(700);
    const lignesPage = (id) => p.evaluate((id) => [...document.querySelectorAll('#' + id + ' .grp-liste-act .gal-t')].map(e => e.textContent.trim()), id);
    const aide = (id) => p.evaluate((id) => { const a = document.querySelector('#' + id + ' .grp-modo-aide'); return a ? a.textContent.trim() : ''; }, id);
    /* La typographie française met des espaces insécables devant « ? », « : » et « ; » : on lit des espaces. */
    const fenetre = () => p.evaluate(() => { const n = (t) => String(t || '').replace(/[\u00A0\u202F]/g, ' '); const v = document.getElementById('modalVeil');
      return v ? { titre: n(v.querySelector('.modal-title').textContent), msg: n((v.querySelector('.modal-msg') || {}).textContent), ok: n(v.querySelector('#modalOk').textContent) } : null; });

    /* 7 */
    await p.evaluate(() => ouvrirInfosGroupe()); await p.waitForTimeout(800);
    await p.evaluate((e) => ouvrirMembre(e), E); await p.waitForTimeout(900);
    const l7 = await lignesPage('grpMembreVeil'), a7 = await aide('grpMembreVeil');
    dit('7. la page du propriétaire (Émile) : la sourdine, le retrait, le bannissement, au nom de la modération',
      JSON.stringify(l7) === JSON.stringify(['Mettre en sourdine une heure', 'Retirer du groupe', 'Bannir du groupe']) && a7 === 'Ici, tu agis au nom de la modération.', JSON.stringify({ l7, a7 }));

    /* 8 */
    await p.evaluate((e) => modererMembre(e, 'exclure'), E); await p.waitForTimeout(500);
    const f8 = await fenetre();
    await p.evaluate(() => document.getElementById('modalOk').click());
    await p.waitForFunction(() => { const t = document.querySelector('.mini-toast.show'); return !!t && /propriétaire/.test(t.textContent); }, null, { timeout: 8000 }).catch(() => {});
    const t8 = await p.evaluate(() => { const t = document.querySelector('.mini-toast'); return t ? t.textContent.replace(/[\u00A0\u202F]/g, ' ') : ''; });
    /* Une ligne « Dora est maintenant propriétaire » existe déjà (le 4) : on attend que les DEUX nouvelles ferment le fil. */
    await p.waitForFunction(() => { const l = [...document.querySelectorAll('#fil .b-sys')].map(e => e.textContent.replace(/[\u00A0\u202F]/g, ' ').trim()).slice(-2);
      return l[0] === 'La modération a retiré Émile du groupe' && l[1] === 'Dora est maintenant propriétaire du groupe'; }, null, { timeout: 8000 }).catch(() => {});
    const fil8 = await p.evaluate(() => [...document.querySelectorAll('#fil .b-sys')].map(e => e.textContent.replace(/[\u00A0\u202F]/g, ' ').trim()).slice(-2));
    dit('8. « Retirer du groupe » : la fenêtre dit que le groupe passera au suivant ; la phrase dit à qui ; le serveur l\'a fait ; la discussion le montre',
      !!f8 && f8.titre === 'Retirer Émile du groupe ?' && /Le groupe passera à son plus ancien admin encore actif, sinon à son plus ancien membre encore actif\./.test(f8.msg) && f8.ok === 'Retirer'
        && t8 === 'Émile ne fait plus partie du groupe : Dora en est maintenant propriétaire.' && (await role(E)) === 'dehors' && (await role(D)) === 'proprietaire'
        && JSON.stringify(fil8) === JSON.stringify(['La modération a retiré Émile du groupe', 'Dora est maintenant propriétaire du groupe']),
      JSON.stringify({ f8, t8, fil8 }));

    /* 9 */
    await p.waitForTimeout(800);
    await p.evaluate((b) => ouvrirMembre(b), B); await p.waitForTimeout(900);
    const l9 = await lignesPage('grpMembreVeil');
    await p.evaluate((b) => modererMembre(b, 'ceder'), B); await p.waitForTimeout(500);
    const f9 = await fenetre();
    await p.evaluate(() => document.getElementById('modalOk').click());
    await p.waitForTimeout(1800);
    const l9b = await lignes(1);
    dit('9. la page de Benoît offre « Confier le groupe » ; la fenêtre nomme Dora, qui en reste admin ; confirmé, c\'est fait au nom de la modération',
      l9.includes('Confier le groupe') && !l9.includes('Céder le groupe') && !!f9 && f9.titre === 'Confier le groupe à Benoît ?' && f9.msg === 'Benoît en devient propriétaire ; Dora en reste admin.' && f9.ok === 'Confier'
        && (await role(B)) === 'proprietaire' && (await role(D)) === 'admin' && JSON.stringify(l9b) === JSON.stringify(['proprietaire:true/Benoît']),
      JSON.stringify({ l9, f9, l9b }));

    /* 10 */
    const m10 = await p.evaluate(() => { const n = (t) => String(t || '').replace(/[\u00A0\u202F]/g, ' ');
      return [n(motErreurGroupe({ ok: false, erreur: 'seul' })), (()=>{ const a = LANGUE; LANGUE = 'en'; const t = n(motErreurGroupe({ ok: false, erreur: 'seul' })); LANGUE = 'es'; const u = n(motErreurGroupe({ ok: false, erreur: 'seul' })); LANGUE = a; return [t, u]; })()]; });
    dit('10. la phrase « seul », en clair, en trois langues',
      m10[0] === 'Personne d\'autre dans ce groupe pour le reprendre : supprime plutôt le groupe.' && m10[1][0] === 'No one else in this group to take it over: delete the group instead.'
        && m10[1][1] === 'No hay nadie más en este grupo para hacerse cargo: mejor elimina el grupo.', JSON.stringify(m10));
    await ctx.close();
    dit('11. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — en mode modération, le propriétaire se retire, se bannit, et le groupe se confie ; la règle choisit qui prend la main');
  process.exit(ko ? 1 : 0);
})();
