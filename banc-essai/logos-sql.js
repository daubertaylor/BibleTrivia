/* ====== LE LOGO D'UN GROUPE, CÔTÉ SERVEUR (v322) ======
   « Je veux aussi pouvoir ajouter une photo de profil de groupe, ou sinon
     pouvoir choisir un logo de groupe. »
   Le logo vit dans groupes/table.sql : un NUMÉRO (groupes.logo), 0 pour
   l'initiale. Ce banc l'éprouve sur un VRAI PostgreSQL, sans page :
     - l'état annonce les logos (le jeu ne les propose qu'à ce serveur) ;
     - un jeu plus ancien, qui n'envoie pas p_logo, crée et modifie toujours
       ses groupes — et la modification ne touche pas au logo ;
     - un logo hors des bornes est ramené dedans (0 à 63) ; la table refuse
       elle-même un numéro impossible ;
     - seuls le propriétaire et les admins le changent ;
     - les listes (mes groupes, les publics) et l'aperçu par le code le
       donnent ; la table se lit avec sa colonne ;
     - une seule version de creer_groupe et de modifier_groupe : deux côte à
       côte, et PostgREST ne saurait laquelle appeler ;
     - recoller le fichier SQL ne casse rien et ne remet aucun logo à zéro.
   Usage : node banc-essai/logos-sql.js */
const path = require('path');
const fs = require('fs');
const RACINE = path.resolve(__dirname, '..');
const { monter } = require('./faux-serveur-groupes.js');
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2', C = 'cccccccc-0000-4000-8000-0000000000c3';
let ko = 0; const dit = (q, b, d) => { console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '  (' + d + ')' : '')); if (!b) ko++; };
(async () => {
  const m = await monter(8412, 5598);
  const rpc0 = m.rpc; m.rpc = async (moi, nom, args) => { const r = await rpc0(moi, nom, args); if (r.error) return { ok: false, erreur: 'PG ' + r.error.message }; return r.data; };
  const logo = async (id) => m.sql(`select logo from public.groupes where id = '${id}'`);
  try {
    for (const [id, mail, nom] of [[A, 'a@x', 'Taylor'], [B, 'b@x', 'Benoît'], [C, 'c@x', 'Chloé']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const e = await m.rpc(A, 'mon_etat_groupes', {});
    dit('mon_etat_groupes annonce les logos', e.logos === true && e.photos === true, JSON.stringify(Object.keys(e)));

    // Un jeu plus ancien : cinq paramètres, sans p_logo.
    const g0 = await m.rpc(A, 'creer_groupe', { p_nom: 'Sans logo', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 1 });
    dit('créer sans p_logo (un jeu plus ancien) marche toujours', g0.ok === true, JSON.stringify(g0));
    dit('… et le groupe prend l\'initiale (logo 0)', (await logo(g0.id)) === '0');

    const g = await m.rpc(A, 'creer_groupe', { p_nom: 'La colombe', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2, p_logo: 3 });
    dit('créer avec p_logo 3', g.ok === true && (await logo(g.id)) === '3', JSON.stringify(g));
    const gh = await m.rpc(A, 'creer_groupe', { p_nom: 'Trop haut', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 0, p_logo: 99 });
    const gb = await m.rpc(A, 'creer_groupe', { p_nom: 'Trop bas', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 0, p_logo: -5 });
    dit('un logo hors des bornes est ramené dedans (99 → 63, -5 → 0)', (await logo(gh.id)) === '63' && (await logo(gb.id)) === '0');
    let refuse = false;
    try { const o = await m.sql(`update public.groupes set logo = 64 where id = '${g.id}'`); refuse = /ERROR|violates/i.test(o); } catch (x) { refuse = /groupes_logo_valeurs|check/i.test(String(x.stderr || x.message || x)); }
    dit('la table refuse elle-même un numéro impossible (64)', refuse && (await logo(g.id)) === '3');

    // Modifier : sans p_logo, rien ne bouge ; avec, il change ; un membre ne peut pas.
    let r = await m.rpc(A, 'modifier_groupe', { p_groupe: g.id, p_nom: 'La colombe', p_description: 'Paix', p_ouvert: false, p_teinte: 4 });
    dit('modifier sans p_logo (un jeu plus ancien) garde le logo', r.ok === true && (await logo(g.id)) === '3', JSON.stringify(r));
    r = await m.rpc(A, 'modifier_groupe', { p_groupe: g.id, p_nom: 'La colombe', p_description: 'Paix', p_ouvert: false, p_teinte: 4, p_logo: 9 });
    dit('modifier avec p_logo 9 le change', r.ok === true && (await logo(g.id)) === '9', JSON.stringify(r));
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    r = await m.rpc(B, 'modifier_groupe', { p_groupe: g.id, p_nom: 'Pirate', p_description: '', p_ouvert: false, p_teinte: 0, p_logo: 1 });
    dit('un simple membre ne change pas le logo', r.ok === false && r.erreur === 'interdit' && (await logo(g.id)) === '9', JSON.stringify(r));

    // Ce qui voyage vers le jeu.
    const mes = await m.rpc(B, 'mes_groupes', {});
    const lg = (Array.isArray(mes) ? mes : []).find(x => x.id === g.id) || {};
    dit('mes_groupes donne le logo', lg.logo === 9, JSON.stringify(lg).slice(0, 120));
    const pub = await m.rpc(B, 'creer_groupe', { p_nom: 'Ouvert à tous', p_description: '', p_ouvert: true, p_langue: 'fr', p_teinte: 5, p_logo: 12 });
    const publics = await m.rpc(C, 'groupes_publics', { p_recherche: '', p_langue: 'fr', p_limite: 30 });
    const lp = (Array.isArray(publics) ? publics : []).find(x => x.id === pub.id) || {};
    dit('groupes_publics donne le logo', lp.logo === 12, JSON.stringify(lp).slice(0, 120));
    const ap = await m.rpc(C, 'groupe_par_code', { p_code: code });
    dit('l\'aperçu par le code donne le logo', ap.ok === true && ap.logo === 9, JSON.stringify(ap).slice(0, 120));
    const col = (await m.sql(`set role authenticated; set essai.moi = '${B}'; select logo from public.groupes where id = '${g.id}';`)).split('\n').pop();
    dit('un membre lit la colonne logo dans la table', col === '9', col);

    // Une seule version de chaque fonction.
    const n = await m.sql("select string_agg(proname || '/' || pronargs, ',' order by proname) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and proname in ('creer_groupe','modifier_groupe')");
    dit('une seule version de creer_groupe et de modifier_groupe (6 paramètres)', n === 'creer_groupe/6,modifier_groupe/6', n);
    const droits = await m.sql("select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and proname in ('creer_groupe','modifier_groupe') and has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute')");
    dit('… ouvertes aux connectés, fermées aux anonymes', droits === '2', droits);

    // Recoller le fichier : rien ne casse, aucun logo ne retombe à zéro.
    const sqlTexte = fs.readFileSync(path.join(RACINE, 'groupes/table.sql'), 'utf8');
    await m.sql(sqlTexte);
    await m.sql(sqlTexte);
    const n2 = await m.sql("select count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and proname in ('creer_groupe','modifier_groupe')");
    dit('recoller groupes/table.sql deux fois ne casse rien', n2 === '2', n2);
    dit('… et ne remet aucun logo à zéro', (await logo(g.id)) === '9' && (await logo(pub.id)) === '12');
  } catch (e) { console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 400)); ko++; }
  finally { await m.arreter(); }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le SQL des logos tient');
  process.exit(ko ? 1 : 0);
})();
