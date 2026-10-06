/* ====== LES PHOTOS, CÔTÉ SERVEUR (v311) ======
   Les règles qui tiennent les photos vivent dans groupes/table.sql : ce banc
   les éprouve sur un VRAI PostgreSQL (faux-serveur-groupes.js), sans page :
     - seul du JPEG en texte passe, ni PNG, ni texte, ni image trop lourde ;
     - une photo par trois secondes au plus ;
     - l'état du joueur ne fait jamais voyager l'image, les listes non plus ;
     - une photo de profil ne se voit QUE d'un membre d'un groupe partagé ;
     - la photo d'un groupe : propriétaire et admins seulement, et un mot du
       jeu le dit au groupe ; l'aperçu par le code la montre à qui va entrer ;
     - la modération voit la photo signalée, la retire, et rien ne revient
       avant sept jours ;
     - recoller le fichier SQL une seconde fois ne casse rien.
   Usage : node banc-essai/photos-sql.js */
const path = require('path');
const RACINE = path.resolve(__dirname, '..');
const { monter } = require('./faux-serveur-groupes.js');
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2', C = 'cccccccc-0000-4000-8000-0000000000c3';
let ko = 0; const dit = (q, b, d) => { console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '  (' + d + ')' : '')); if (!b) ko++; };
const jpeg = (n) => 'data:image/jpeg;base64,' + '/9j/'.padEnd(n, 'A');
(async () => {
  const m = await monter(8282, 5468);
  const rpc0 = m.rpc; m.rpc = async (moi, nom, args) => { const r = await rpc0(moi, nom, args); if (r.error) return { ok: false, erreur: 'PG ' + r.error.message }; return r.data; };
  try {
    for (const [id, mail, nom] of [[A, 'a@x', 'Taylor'], [B, 'b@x', 'Benoît'], [C, 'c@x', 'Chloé']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(A); await m.ouvrir(true);
    // L'état dit qu'on connaît les photos, sans faire voyager d'image.
    const e = await m.rpc(A, 'mon_etat_groupes', {});
    dit('mon_etat_groupes annonce les photos', e.photos === true, JSON.stringify(Object.keys(e)));
    // Ma photo : valide, invalide, trop grosse.
    let r = await m.rpc(A, 'poser_photo', { p_photo: jpeg(4000) });
    dit('une photo JPEG est acceptée', r.ok === true && r.photo_maj > 0, JSON.stringify(r).slice(0, 80));
    r = await m.rpc(A, 'poser_photo', { p_photo: 'data:image/png;base64,iVBORw0KGgo' + 'A'.repeat(500) });
    dit('un PNG est refusé', r.ok === false && r.erreur === 'photo', JSON.stringify(r));
    r = await m.rpc(A, 'poser_photo', { p_photo: 'data:image/jpeg;base64,<script>' + 'A'.repeat(500) });
    dit('du texte qui n\'est pas du base64 est refusé', r.ok === false && r.erreur === 'photo', JSON.stringify(r));
    r = await m.rpc(A, 'poser_photo', { p_photo: jpeg(61000) });
    dit('une photo trop lourde est refusée', r.ok === false && r.erreur === 'photo', JSON.stringify(r));
    r = await m.rpc(A, 'poser_photo', { p_photo: jpeg(5000) });
    dit('deux photos en moins de trois secondes : trop vite', r.ok === false && r.erreur === 'trop_vite', JSON.stringify(r));
    const e2 = await m.rpc(A, 'mon_etat_groupes', {});
    dit('l\'état ne fait pas voyager l\'image', !('photo' in (e2.profil || {})) && e2.profil.photo_maj > 0, JSON.stringify(e2.profil).slice(0, 120));
    // Qui voit la photo de Taylor : personne tant qu'aucun groupe n'est partagé.
    const voit = async (qui, id) => (await m.sql(`set role authenticated; set essai.moi = '${qui}'; select count(*) from public.profils where id = '${id}' and photo is not null;`)).split('\n').pop();
    dit('Benoît ne voit pas la photo de Taylor sans groupe commun', (await voit(B, A)) === '0');
    // Groupe privé de Taylor, Benoît y entre.
    const g = await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 });
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    dit('membres du même groupe : Benoît voit la photo de Taylor', (await voit(B, A)) === '1');
    dit('Chloé, hors du groupe, ne la voit pas', (await voit(C, A)) === '0');
    // La photo du groupe : admins seulement.
    r = await m.rpc(B, 'poser_photo_groupe', { p_groupe: g.id, p_photo: jpeg(3000) });
    dit('un simple membre ne change pas la photo du groupe', r.ok === false && r.erreur === 'interdit', JSON.stringify(r));
    r = await m.rpc(A, 'poser_photo_groupe', { p_groupe: g.id, p_photo: jpeg(3000) });
    dit('la propriétaire la change', r.ok === true, JSON.stringify(r));
    const annonce = await m.sql(`select texte from public.messages where groupe = '${g.id}' and genre = 'systeme' order by id desc limit 1`);
    dit('… et un mot du jeu le dit au groupe', annonce === 'photo', annonce);
    const liste = await m.rpc(B, 'mes_groupes', {});
    const lg = (Array.isArray(liste) ? liste : []).find(x => x.id === g.id) || {};
    dit('mes_groupes donne la version, pas l\'image', lg.photo_maj > 0 && !('photo' in lg), JSON.stringify(lg).slice(0, 100));
    const ap = await m.rpc(C, 'groupe_par_code', { p_code: code });
    dit('l\'aperçu par le code montre la photo à qui n\'est pas encore membre', ap.photo === jpeg(3000), String(ap.photo).slice(0, 40));
    const vg = (await m.sql(`set role authenticated; set essai.moi = '${C}'; select count(*) from public.groupes where id = '${g.id}' and photo is not null;`)).split('\n').pop();
    dit('… mais Chloé ne lit pas le groupe privé lui-même', vg === '0');
    // Signalement, puis retrait par la modération.
    r = await m.rpc(B, 'signaler', { p_message: null, p_cible: A, p_groupe: g.id, p_raison: 'inapproprie', p_details: 'photo' });
    const file = await m.rpc(A, 'moderation_ouverte', {});
    const carte = (Array.isArray(file) ? file : [])[0] || {};
    dit('la modération voit la version de la photo visée', carte.cible_photo_maj > 0, JSON.stringify(carte).slice(0, 160));
    r = await m.rpc(A, 'traiter_signalement', { p_id: carte.id, p_decision: 'retirer_photo' });
    dit('« Retirer la photo » est une décision', r.ok === true, JSON.stringify(r));
    dit('… la photo n\'existe plus', (await m.sql(`select count(*) from public.profils where id = '${A}' and photo is not null`)) === '0');
    await m.sql(`update public.profils set photo_maj = photo_maj - 10000 where id = '${A}'`);
    r = await m.rpc(A, 'poser_photo', { p_photo: jpeg(4000) });
    dit('… et ne revient pas avant sept jours', r.ok === false && r.erreur === 'photo_retiree', JSON.stringify(r));
    // Retirer sa propre photo, puis supprimer le groupe : rien ne reste.
    await m.sql(`update public.profils set photo_retiree_le = null where id = '${A}'`);
    r = await m.rpc(A, 'poser_photo', { p_photo: jpeg(4000) });
    dit('après le délai, une nouvelle photo passe', r.ok === true, JSON.stringify(r));
    await m.sql(`update public.profils set photo_maj = photo_maj - 10000 where id = '${A}'`);
    r = await m.rpc(A, 'poser_photo', { p_photo: null });
    dit('on retire la sienne', r.ok === true && (await m.sql(`select count(*) from public.profils where id = '${A}' and photo is not null`)) === '0');
    r = await m.rpc(A, 'supprimer_groupe', { p_groupe: g.id });
    dit('un groupe supprimé perd sa photo', (await m.sql(`select count(*) from public.groupes where id = '${g.id}' and photo is not null`)) === '0');
    // Recoller le fichier : rien ne casse.
    await m.sql(require('fs').readFileSync(path.join(RACINE, 'groupes/table.sql'), 'utf8'));
    dit('recoller groupes/table.sql une seconde fois ne casse rien', true);
  } catch (e) { console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 400)); ko++; }
  finally { await m.arreter(); }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le SQL des photos tient');
  process.exit(ko ? 1 : 0);
})();
