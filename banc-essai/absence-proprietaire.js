/* ====== BANC « L'ABSENCE DU PROPRIÉTAIRE » (v336) ======
   « Si le joueur reste inactif vraiment trop longtemps, il sera changé de
     propriétaire — mais que par inactivité, pas par la modération. Et ça ne
     doit pas se choisir au hasard. » Un VRAI PostgreSQL (le décor de
   groupes.js), les vraies fonctions de groupes/table.sql.
   LE JOUR DE LA DERNIÈRE VENUE
     1. personne ne le lit : ni la table, ni les fonctions internes ne
        s'ouvrent à un joueur ; un compte suspendu ne « vient » pas ;
   LE SEUIL
     2. un propriétaire venu il y a 89 jours garde son groupe ;
     3. à 91 jours, à la visite d'un membre, le groupe passe selon la règle :
        un admin qui vient encore (pas l'admin plus ancien qui ne vient plus,
        pas le simple membre plus ancien) ; l'ancien propriétaire en reste
        admin ; la discussion le dit, une seule fois ;
     4. deux membres au même instant : un seul passage ;
     5. personne à qui le donner (le seul autre membre est en sourdine) :
        rien ne bouge ;
     6. ni quelqu'un en sourdine, ni quelqu'un de suspendu : le simple membre
        qui vient passe devant ces deux admins ;
     7. sans trace du propriétaire (aucune venue notée), on ne conclut rien ;
   LE DÉPART
     8. le propriétaire qui s'en va : la même règle, et la discussion dit qui
        garde le groupe ; seul, il l'éteint, sans ligne de trop ;
   LE FICHIER
     9. recoller groupes/table.sql ne touche à aucun jour noté, et note
        « aujourd'hui » qui ne l'était pas ;
   LE JEU
    10. la ligne de la discussion et l'aperçu de la liste, dans les trois
        langues ; l'ancien propriétaire, revenu, est admin et ne reprend rien ;
    11. aucune erreur.
   Sur la v335, le banc s'arrête au premier pas : le serveur ne notait la
   venue de personne, et un propriétaire parti gardait son groupe pour
   toujours.
   Usage : node banc-essai/absence-proprietaire.js */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const RACINE = path.resolve(__dirname, '..');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const id = (n) => n.repeat(8) + '-0000-4000-8000-0000000000' + n.repeat(2);
const B = id('b'), C = id('c'), D = id('d'), E = id('e'), F = id('f'), A = id('a'), G = id('9'), H = id('8'), K = id('7'), L = id('6');
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 360) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8516, 5720);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    const gens = [[B, 'Benoît', '#E8734C'], [C, 'Chloé', '#7BC86B'], [D, 'Dora', '#8E5BD8'], [E, 'Émile', '#E8B84C'], [F, 'Fanny', '#4CA3E8'],
                  [A, 'Abel', '#E84C8A'], [G, 'Gad', '#4CE8C8'], [H, 'Hanna', '#C84CE8'], [K, 'Kenan', '#8AE84C'], [L, 'Lina', '#E8D84C']];
    for (const [u, nom, couleur] of gens) {
      await m.compte(u, nom.toLowerCase() + '@essai');
      await m.rpc(u, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(u, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const venu = (u, jours) => m.sql(`insert into public.activite (membre, vu_le) values ('${u}', now() - interval '${jours} days')
                                       on conflict (membre) do update set vu_le = excluded.vu_le`);
    const etat = (u) => m.rpc(u, 'mon_etat_groupes', {});
    const groupe = async (proprio, nom, membres) => {
      const g = (await m.rpc(proprio, 'creer_groupe', { p_nom: nom, p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
      const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
      let jours = 400;
      await m.sql(`update public.membres set rejoint_le = now() - interval '${jours} days' where groupe = '${g.id}' and membre = '${proprio}'`);
      for (const [u, role] of membres) {
        await m.rpc(u, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
        jours -= 10;   // l'ordre d'arrivée, net : chacun dix jours après le précédent
        await m.sql(`update public.membres set rejoint_le = now() - interval '${jours} days' where groupe = '${g.id}' and membre = '${u}'`);
        if (role === 'admin') await m.rpc(proprio, 'moderer_membre', { p_groupe: g.id, p_membre: u, p_action: 'promouvoir', p_minutes: null });
      }
      return g.id;
    };
    const proprio = (g) => m.sql(`select p.nom from public.membres x join public.profils p on p.id = x.membre where x.groupe = '${g}' and x.role = 'proprietaire'`);
    const role = (g, u) => m.sql(`select role from public.membres where groupe = '${g}' and membre = '${u}'`);
    const lignes = (g) => m.sql(`select coalesce(string_agg(texte || ':' || coalesce(donnees->>'nom', '') || ':' || coalesce(donnees->>'ancien', '') || ':' || coalesce(donnees->>'absence', ''), ' | ' order by id), '')
                                  from public.messages where groupe = '${g}' and genre = 'systeme' and texte in ('proprietaire', 'parti')`);
    const enTant = (u, q) => m.sql(`begin; set local role authenticated; set local essai.moi = '${u}'; ${q}; commit;`);

    /* Tout le monde vient aujourd'hui. */
    for (const [u] of gens) await etat(u);

    /* 1 : personne ne lit le jour d'un autre ; un compte suspendu ne vient pas */
    let vus;
    try { vus = await enTant(C, 'select count(*) from public.activite'); } catch (e) { vus = /permission denied/.test(String(e.stderr || e.message)) ? 'fermée' : String(e.stderr || e.message); }
    let ferme = 0;
    for (const q of [`select public._absent('${B}')`, `select public._veiller_absences('${C}')`, `select public._successeur('${B}', '${C}')`]) {
      try { await enTant(C, q); } catch (e) { if (/permission denied/.test(String(e.stderr || e.message))) ferme++; }
    }
    await venu(K, 200);
    await m.sql(`update public.profils set banni_le = now() where id = '${K}'`);
    await etat(K);
    const k1 = await m.sql(`select (vu_le < now() - interval '199 days')::text from public.activite where membre = '${K}'`);
    await m.sql(`update public.profils set banni_le = null where id = '${K}'`);
    await etat(K);
    const k2 = await m.sql(`select (vu_le > now() - interval '1 minute')::text from public.activite where membre = '${K}'`);
    dit('1. le jour noté ne se lit pas (table et fonctions fermées) ; un compte suspendu ne « vient » pas, revenu il vient',
      (vus === 'fermée' || vus === '0') && ferme === 3 && k1 === 'true' && k2 === 'true', JSON.stringify({ vus, ferme, k1, k2 }));

    /* Le club de Benoît : Chloé (membre, la plus ancienne), Dora (admin), Émile (admin), Fanny (membre). */
    const g1 = await groupe(B, 'Le club de Benoît', [[C, 'membre'], [D, 'admin'], [E, 'admin'], [F, 'membre']]);
    const avant1 = await lignes(g1);

    /* 2 : 89 jours */
    await venu(B, 89);
    await etat(C);
    dit('2. un propriétaire venu il y a 89 jours garde son groupe', (await proprio(g1)) === 'Benoît' && (await lignes(g1)) === avant1, await proprio(g1));

    /* 3 : 91 jours — Dora, l'admin la plus ancienne, ne vient plus non plus */
    await venu(B, 91); await venu(D, 120);
    await etat(C);
    const l3 = await lignes(g1);
    dit('3. à 91 jours, à la visite de Chloé, le groupe passe à Émile (admin qui vient), pas à Dora (ne vient plus) ni à Chloé (simple membre) ; Benoît en reste admin ; dit une fois',
      (await proprio(g1)) === 'Émile' && (await role(g1, B)) === 'admin' && l3 === 'proprietaire:Émile:Benoît:true',
      JSON.stringify({ p: await proprio(g1), b: await role(g1, B), l3 }));
    await etat(F); await etat(C);
    dit('3b. les visites suivantes ne refont rien', (await lignes(g1)) === l3 && (await proprio(g1)) === 'Émile', await lignes(g1));

    /* 4 : deux membres au même instant */
    const g2 = await groupe(G, 'Le cercle de Gad', [[H, 'admin'], [L, 'membre']]);
    await venu(G, 95);
    await Promise.all([etat(H), etat(L), etat(H), etat(L)]);
    const l4 = await lignes(g2);
    dit('4. quatre visites au même instant : un seul passage, une seule ligne', (await proprio(g2)) === 'Hanna' && l4 === 'proprietaire:Hanna:Gad:true', l4);

    /* 5 : personne à qui le donner — le seul autre membre vient, mais il est en sourdine */
    const g3 = await groupe(A, 'Chez Abel', [[K, 'membre']]);
    await m.sql(`update public.membres set muet_jusqu = now() + interval '2 hours' where groupe = '${g3}' and membre = '${K}'`);
    await venu(A, 150);
    await etat(K);
    dit('5. personne à qui le donner (le seul autre membre est en sourdine) : rien ne bouge', (await proprio(g3)) === 'Abel' && (await lignes(g3)) === '',
      JSON.stringify({ p: await proprio(g3), l: await lignes(g3) }));

    /* 6 : ni en sourdine, ni suspendu (Dora, absente depuis le 3, revient d'abord) */
    await venu(D, 0);
    const g4 = await groupe(D, 'Le salon de Dora', [[H, 'admin'], [K, 'admin'], [L, 'membre']]);
    await etat(K);
    await m.sql(`update public.membres set muet_jusqu = now() + interval '1 hour' where groupe = '${g4}' and membre = '${H}'`);
    await m.sql(`update public.profils set banni_le = now() where id = '${K}'`);
    await venu(D, 100);
    await etat(L);
    const l6 = await lignes(g4);
    await m.sql(`update public.profils set banni_le = null where id = '${K}'`);
    dit('6. Hanna (admin en sourdine) et Kenan (admin suspendu) passent après Lina, simple membre qui vient : le groupe va à Lina',
      (await proprio(g4)) === 'Lina' && l6 === 'proprietaire:Lina:Dora:true', JSON.stringify({ p: await proprio(g4), l6 }));

    /* 7 : sans trace */
    const g5 = await groupe(F, 'Le coin de Fanny', [[C, 'membre']]);
    await m.sql(`delete from public.activite where membre = '${F}'`);
    await etat(C);
    dit('7. sans trace du propriétaire, on ne conclut rien', (await proprio(g5)) === 'Fanny' && (await lignes(g5)) === '', await proprio(g5));
    await etat(F);

    /* 8 : le départ */
    const g6 = await groupe(C, 'Le jardin de Chloé', [[D, 'admin'], [E, 'admin'], [F, 'membre']]);
    await venu(D, 130);
    await m.rpc(C, 'quitter_groupe', { p_groupe: g6 });
    const l8 = await lignes(g6);
    const g7 = await groupe(L, 'Seule, Lina', []);
    await m.rpc(L, 'quitter_groupe', { p_groupe: g7 });
    const ferme7 = await m.sql(`select (supprime_le is not null)::text from public.groupes where id = '${g7}'`);
    dit('8. Chloé s\'en va : la même règle (Émile, pas Dora qui ne vient plus), « parti » puis qui garde le groupe ; seule, Lina l\'éteint sans ligne de trop',
      (await proprio(g6)) === 'Émile' && l8 === 'parti:Chloé:: | proprietaire:Émile::' && ferme7 === 'true' && (await lignes(g7)) === 'parti:Lina::',
      JSON.stringify({ p: await proprio(g6), l8, ferme7, l7: await lignes(g7) }));

    /* 9 : recoller le fichier */
    const jour = await m.sql(`select vu_le::text from public.activite where membre = '${D}'`);
    await m.sql(`delete from public.activite where membre = '${A}'`);
    await m.sql(fs.readFileSync(path.join(RACINE, 'groupes/table.sql'), 'utf8'));
    const jour2 = await m.sql(`select vu_le::text from public.activite where membre = '${D}'`);
    const a9 = await m.sql(`select (vu_le > now() - interval '1 minute')::text from public.activite where membre = '${A}'`);
    dit('9. recoller groupes/table.sql ne touche à aucun jour noté, et note « aujourd\'hui » qui ne l\'était pas', jour === jour2 && a9 === 'true', JSON.stringify({ jour, jour2, a9 }));

    /* 10 : le jeu */
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript(([moi]) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Benoît', color: '#E8734C' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, [B]);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => chargerListes());
    await p.waitForFunction((gid) => (grp.liste || []).some(x => x.id === gid), g1, { timeout: 8000, polling: 50 }).catch(() => {});
    const apercu = await p.evaluate((gid) => { const g = (grp.liste || []).find(x => x.id === gid); return g ? apercuGroupe(g) : null; }, g1);
    await p.evaluate((gid) => ouvrirGroupe(gid), g1);
    await p.waitForFunction(() => state.screen === 'groupe' && document.querySelectorAll('#fil .b-sys, #fil .sys').length > 0, null, { timeout: 9000, polling: 50 }).catch(() => {});
    /* Le fil écrit à la française : une espace fine insécable avant « : ». */
    const fil = await p.evaluate(() => ((document.getElementById('fil') || {}).textContent || '').replace(/[\u00A0\u202F]/g, ' '));
    const l10 = await p.evaluate(() => {
      const msg = { texte: 'proprietaire', genre: 'systeme', donnees: { nom: 'Émile', ancien: 'Benoît', absence: true } };
      const avant = LANGUE, r = {};
      for (const l of ['fr', 'en', 'es']) { LANGUE = l; r[l] = texteSysteme(msg); }
      LANGUE = avant; return r;
    });
    const roleB = await p.evaluate((gid) => (grp.liste.find(x => x.id === gid) || {}).role, g1);
    await ctx.close();
    const phrase = 'Le groupe passe à Émile : sans nouvelles de Benoît depuis trois mois';
    dit('10. la ligne dans la discussion et dans l\'aperçu, en trois langues ; Benoît, revenu, est admin et ne reprend rien',
      apercu === phrase && fil.includes(phrase) && l10.en === 'The group now belongs to Émile: no sign of Benoît for three months'
        && l10.es === 'El grupo pasa a Émile: sin noticias de Benoît desde hace tres meses' && roleB === 'admin' && (await proprio(g1)) === 'Émile',
      JSON.stringify({ apercu, l10, roleB, fil: fil.slice(-160) }));

    dit('11. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 700) + (e.stderr ? ' — ' + String(e.stderr).slice(0, 300) : '')); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un groupe ne change de main que par l\'absence de son propriétaire, et jamais au hasard');
  process.exit(ko ? 1 : 0);
})();
