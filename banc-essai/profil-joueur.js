/* ====== BANC « LE PROFIL D'UN JOUEUR » (v356) ======
   « Je t'avais demandé un truc qui permet de voir le profil : quand tu
     cliques sur le profil, tu vois le profil avec les différentes
     statistiques au niveau des testaments, des succès de la personne. »
   Le décor de groupes.js — un VRAI PostgreSQL avec groupes/table.sql tel
   qu'il partira chez Supabase —, et tout ce que les chiffres d'un joueur
   traversent :

     1. LE SERVEUR NE GARDE QUE DES NOMBRES BORNÉS ET DES NOMS D'OBJECTIFS :
        une clé inconnue, un objectif au nom étrange ou répété, un nombre
        négatif, démesuré, à virgule ou écrit en lettres — rien ne passe tel
        quel ; un résumé trop gros est refusé ; sans compte, rien ;
     2. SEULS LES MEMBRES D'UN GROUPE PARTAGÉ LES LISENT (règle d'accès) ;
     3. LE JEU DE BENOÎT POSE SES CHIFFRES TOUT SEUL à la fin d'une partie —
        exactement les siens —, et ne les renvoie pas s'ils n'ont pas changé ;
     4. TAYLOR OUVRE LA PAGE DE BENOÎT : ses trois chiffres, ses deux
        testaments, ses objectifs en couleur — et rien ne change de taille
        quand ils arrivent (tirets, chiffres, ou la phrase d'attente) ;
     5. toucher un objectif dit lequel c'est, et s'il l'a ;
     6. « VOIR LE PROFIL » en tenant un message de Taylor, chez Benoît (simple
        membre) : la page de Taylor, avec ses chiffres ;
     7. quelqu'un qui n'a encore rien posé : la phrase d'attente ;
     8. UN SERVEUR QUI NE CONNAÎT PAS ENCORE LES CHIFFRES : le jeu n'en envoie
        ni n'en lit aucun, et la page d'un membre reste celle d'avant ;
     9. aucune erreur dans les pages.

   Usage : node banc-essai/profil-joueur.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2', C = 'cccccccc-0000-4000-8000-0000000000c3';

let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

/* La progression de Benoît : douze livres maîtrisés (sept de l'Ancien, cinq
   du Nouveau), 834 bonnes réponses, 21 d'affilée, neuf objectifs. */
const PROG_B = { books: {}, totalCorrect: 834, bestStreak: 21, flawless: 1, cibles: 1,
  maitrises: { 'Genèse': 1, 'Exode': 1, 'Lévitique': 1, 'Nombres': 1, 'Deutéronome': 1, 'Josué': 1, 'Juges': 1, 'Matthieu': 1, 'Marc': 1, 'Luc': 1, 'Jean': 1, 'Actes': 1 },
  ach: { 'pas': 1, 'centurion': 1, 'erudit': 1, 'premier-livre': 1, 'explorateur': 1, 'bibliophile': 1, 'serie10': 1, 'sans-faute': 1, 'fidele7': 1 } };
const PROG_A = { books: {}, totalCorrect: 57, bestStreak: 9, flawless: 0, cibles: 1, maitrises: { 'Ruth': 1, 'Jonas': 1, 'Jude': 1 }, ach: { 'pas': 1, 'premier-livre': 1 } };

(async () => {
  const m = await monter(8526, 5731);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, nom] of [[A, 'Taylor'], [B, 'Benoît'], [C, 'Chloé']]) {
      await m.compte(id, nom.toLowerCase() + '@essai');
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis du jeudi', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: g.code });
    const stats = async (id) => { const t = await m.sql(`select coalesce(stats::text, 'null') from public.profils where id = '${id}'`); return JSON.parse(t); };
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);

    /* ---- 1. le serveur ne garde que des nombres bornés et des noms d'objectifs ---- */
    const r1 = await m.rpc(B, 'poser_stats', { p_stats: { livres: 12, at: 7, nt: 5, bonnes: 834, serie: 21,
      succes: ['pas', 'centurion', 'pas', 'x y', 42, 'DROP TABLE', 'premier-livre'], pirate: '<script>alert(1)</script>' } });
    const s1 = await stats(B);
    dit('1. une clé inconnue et des objectifs étranges ou répétés ne passent pas',
      r1.data && r1.data.ok === true && JSON.stringify(s1) === JSON.stringify({ at: 7, nt: 5, v: 1, serie: 21, bonnes: 834, livres: 12, succes: ['pas', 'centurion', 'premier-livre'] })
      || (s1 && s1.livres === 12 && s1.at === 7 && s1.nt === 5 && s1.bonnes === 834 && s1.serie === 21 && JSON.stringify(s1.succes) === '["pas","centurion","premier-livre"]' && !('pirate' in s1) && Object.keys(s1).length === 7),
      JSON.stringify(s1));
    await m.rpc(B, 'poser_stats', { p_stats: { livres: 500, at: -3, nt: 'beaucoup', bonnes: 1e30, serie: 2.7, succes: 'pas' } });
    const s1b = await stats(B);
    dit('1. … un nombre négatif, démesuré, à virgule ou en lettres est ramené dans ses bornes',
      s1b.livres === 66 && s1b.at === 0 && s1b.nt === 0 && s1b.bonnes === 10000000 && s1b.serie === 2 && JSON.stringify(s1b.succes) === '[]', JSON.stringify(s1b));
    const r1c = await m.rpc(B, 'poser_stats', { p_stats: { succes: Array.from({ length: 400 }, (_, i) => 'objectif-' + i) } });
    const s1c = await stats(B);
    const r1d = await m.rpc('', 'poser_stats', { p_stats: { livres: 3 } });
    dit('1. … un résumé trop gros est refusé, et sans compte, rien',
      r1c.data && r1c.data.ok === false && r1c.data.erreur === 'stats' && JSON.stringify(s1c) === JSON.stringify(s1b) && !!(r1d.error || (r1d.data && r1d.data.ok === false)),
      JSON.stringify({ r1c: r1c.data, r1d }));

    /* ---- 2. seuls les membres d'un groupe partagé les lisent ---- */
    const lit = async (moi, cible) => m.sql(`begin; set local role authenticated; set local essai.moi = '${moi}'; select count(*) from public.profils where id = '${cible}' and stats is not null; commit;`);
    const vuParA = (await lit(A, B)).split('\n').filter(Boolean).pop(), vuParC = (await lit(C, B)).split('\n').filter(Boolean).pop();
    dit('2. Taylor (même groupe) lit les chiffres de Benoît ; Chloé (aucun groupe en commun) ne les lit pas', vuParA === '1' && vuParC === '0', 'A:' + vuParA + ' C:' + vuParC);
    await m.sql(`update public.profils set stats = null, stats_maj = null where id = '${B}'`);

    /* Un téléphone : sa progression, son compte, et ce qu'il demande au serveur. */
    const telephone = async (moi, nom, prog, ancienServeur) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      p._appels = []; p._selects = [];
      p.on('request', r => {
        try {
          if (/\/faux\/rpc$/.test(r.url())) p._appels.push(JSON.parse(r.postData() || '{}').nom);
          if (/\/faux\/select$/.test(r.url())) p._selects.push(JSON.parse(r.postData() || '{}').cols || '');
        } catch (e) {}
      });
      if (ancienServeur) {
        await p.route('**/faux/rpc', async (route) => {
          const corps = JSON.parse(route.request().postData() || '{}');
          const rep = await route.fetch();
          const j = await rep.json();
          if (corps.nom === 'mon_etat_groupes' && j && j.data) delete j.data.stats;
          await route.fulfill({ response: rep, json: j });
        });
      }
      await p.addInitScript(([moi, nom, prog]) => {
        if (!localStorage.getItem('bt_profile')) localStorage.setItem('bt_profile', JSON.stringify({ name: nom, color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
        if (prog && !localStorage.getItem('bt_progress')) localStorage.setItem('bt_progress', JSON.stringify(prog));
        localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [moi, nom, prog]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      return { ctx, p };
    };

    /* ---- 3. le jeu de Benoît pose ses chiffres tout seul, et seulement s'ils ont changé ---- */
    const { p: pb } = await telephone(B, 'Benoît', PROG_B);
    dit('3. le serveur annonce les chiffres au jeu', await pb.evaluate(() => statsServeur() === true));
    const posees = async (id) => { for (let i = 0; i < 60; i++) { const s = await stats(id); if (s) return s; await new Promise(r => setTimeout(r, 150)); } return null; };
    const sB = await posees(B);
    const sienB = await pb.evaluate(() => mesStats());
    dit('3. arrivé dans les groupes, le jeu de Benoît pose ses chiffres — exactement les siens (12 livres : 7 + 5, 834, 21, ses objectifs — y compris ceux déjà mérités et pas encore fêtés)',
      !!sB && sB.livres === sienB.livres && sB.at === sienB.at && sB.nt === sienB.nt && sB.bonnes === sienB.bonnes && sB.serie === sienB.serie
      && JSON.stringify(sB.succes) === JSON.stringify(sienB.succes) && sB.livres === 12 && sB.at === 7 && sB.nt === 5
      && ['pas', 'centurion', 'erudit', 'premier-livre', 'explorateur', 'bibliophile', 'pentateuque', 'evangiles', 'serie10', 'serie20', 'sans-faute', 'fidele7'].every(x => sB.succes.includes(x))
      && !(await pb.evaluate(() => !!loadProgress().ach.pentateuque)),
      JSON.stringify({ sB, sienB }));
    const avant3 = pb._appels.filter(n => n === 'poser_stats').length;
    await pb.evaluate(() => compterPartie());
    await pb.waitForTimeout(2600);
    const apres3 = pb._appels.filter(n => n === 'poser_stats').length;
    await pb.evaluate(() => { const p = loadProgress(); p.totalCorrect += 5; saveProgress(p); compterPartie(); });
    await pb.waitForTimeout(2600);
    const sB3 = await stats(B), apres3b = pb._appels.filter(n => n === 'poser_stats').length;
    dit('3. … une partie sans rien de neuf ne renvoie rien ; une partie qui change ses chiffres les renvoie',
      apres3 === avant3 && apres3b === avant3 + 1 && sB3.bonnes === 839, JSON.stringify({ avant3, apres3, apres3b, bonnes: sB3.bonnes }));

    /* ---- 4. Taylor ouvre la page de Benoît ---- */
    const { p: pa } = await telephone(A, 'Taylor', PROG_A);
    await posees(A);
    await pa.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pa, () => !!document.querySelector('.b-moi, .b-eux, .grp-fil, #compo'), null, 8000);
    await pa.waitForTimeout(600);
    await attendre(pa, (b) => !!(grp.membres[grp.courant] || []).find(x => x.membre === b), B, 8000);
    await pa.evaluate((b) => ouvrirMembre(b), B);
    await attendre(pa, () => !!document.querySelector('#grpMembreVeil .mb-profil .mb-ach.on'), null, 8000);
    await pa.waitForTimeout(500);
    const carte = await pa.evaluate(() => {
      const c = document.querySelector('#grpMembreVeil .mb-profil');
      return { chiffres: [...c.querySelectorAll('.mb-chiffres > div > b')].map(b => b.textContent.trim()),
        tst: [...c.querySelectorAll('.mb-tst-l .tst-count > span:first-child')].map(x => x.textContent.trim()),
        obj: c.querySelector('.mb-obj-h small').textContent.trim(),
        on: [...c.querySelectorAll('.mb-ach')].map((b, i) => b.classList.contains('on') ? ACHIEVEMENTS[i].id : null).filter(Boolean),
        avant: !!c.nextElementSibling && c.compareDocumentPosition(document.querySelector('#grpMembreVeil .grp-liste-act')) === Node.DOCUMENT_POSITION_FOLLOWING };
    });
    dit('4. la page de Benoît : ses trois chiffres, ses deux testaments, ses objectifs en couleur — avant les actions',
      carte.chiffres.join('|') === '12/66|839|21' && carte.tst.join('|') === '7/39|5/27' && carte.obj === sB3.succes.length + '/16'
      && JSON.stringify(carte.on) === JSON.stringify(sB3.succes) && carte.avant, JSON.stringify(carte));
    const hauteurs = await pa.evaluate((s) => {
      const c = document.querySelector('#grpMembreVeil .mb-profil');
      const h = (x) => { const d = c.cloneNode(false); d.style.visibility = 'hidden'; c.parentNode.appendChild(d); d.innerHTML = contenuProfilHtml(x); const v = d.getBoundingClientRect().height; d.remove(); return Math.round(v * 10) / 10; };
      return { attente: h(undefined), chiffres: h(s), rien: h(null) };
    }, sB3);
    dit('4. … rien ne change de taille quand les chiffres arrivent (tirets, chiffres, ou la phrase d\'attente)',
      Math.abs(hauteurs.attente - hauteurs.chiffres) < 1 && Math.abs(hauteurs.rien - hauteurs.chiffres) < 1, JSON.stringify(hauteurs));

    /* ---- 5. toucher un objectif ---- */
    await pa.evaluate(() => document.querySelector('#grpMembreVeil .mb-ach.on').click());
    await pa.waitForTimeout(450);
    const info5 = await pa.evaluate(() => ({ t: (document.querySelector('#modalVeil .ach-info-t') || {}).textContent, c: (document.querySelector('#modalVeil .ach-info-c') || {}).textContent }));
    await pa.evaluate(() => closeModal());
    await pa.waitForTimeout(350);
    await pa.evaluate(() => document.querySelector('#grpMembreVeil .mb-ach:not(.on)').click());
    await pa.waitForTimeout(450);
    const info5b = await pa.evaluate(() => ({ t: (document.querySelector('#modalVeil .ach-info-t') || {}).textContent, c: (document.querySelector('#modalVeil .ach-info-c') || {}).textContent }));
    await pa.evaluate(() => closeModal());
    dit('5. toucher un objectif dit lequel c\'est, et s\'il l\'a', info5.t === 'Premiers pas' && info5.c === 'Objectif débloqué' && !!info5b.t && info5b.c === 'Pas encore débloqué', JSON.stringify({ info5, info5b }));
    await pa.evaluate(() => fermerFeuilleGroupe('grpMembreVeil'));
    await pa.waitForTimeout(500);

    /* ---- 6. « Voir le profil » en tenant un message de Taylor, chez Benoît ---- */
    await m.rpc(A, 'envoyer_message', { p_groupe: g.id, p_texte: 'Bonsoir à tous', p_genre: 'texte', p_donnees: null });
    await pb.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pb, () => [...document.querySelectorAll('.b-eux .b-bulle')].some(b => /Bonsoir/.test(b.textContent)), null, 9000);
    await pb.evaluate(() => { const b = [...document.querySelectorAll('.b-eux .b-bulle')].find(x => /Bonsoir/.test(x.textContent)); actionsMessage(b.getAttribute('data-m')); });
    await pb.waitForTimeout(550);
    const menu6 = await pb.evaluate(() => [...document.querySelectorAll('#grpActionsVeil .grp-act-l')].map(x => x.textContent.trim()));
    await pb.evaluate(() => { const l = [...document.querySelectorAll('#grpActionsVeil .grp-act-l')].find(x => /Voir le profil/.test(x.textContent)); if (l) l.click(); });
    await attendre(pb, () => !!document.querySelector('#grpMembreVeil .mb-profil .mb-ach.on'), null, 8000);
    const page6 = await pb.evaluate(() => ({ titre: (document.querySelector('#grpMembreVeil .st-mot') || {}).textContent, chiffres: [...document.querySelectorAll('#grpMembreVeil .mb-chiffres > div > b')].map(b => b.textContent.trim()), menu: !!document.getElementById('grpActionsVeil') && !document.getElementById('grpActionsVeil').classList.contains('closing') }));
    dit('6. « Voir le profil », en tenant un message de Taylor : la page de Taylor, avec ses chiffres',
      menu6.some(t => /Voir le profil/.test(t)) && menu6.findIndex(t => /Voir le profil/.test(t)) < menu6.findIndex(t => /Signaler/.test(t))
      && page6.titre === 'Taylor' && page6.chiffres.join('|') === '3/66|57|9', JSON.stringify({ menu6, page6 }));

    /* ---- 7. quelqu'un qui n'a encore rien posé ---- */
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: g.code });
    await pa.evaluate((id) => chargerMembres(id), g.id);
    await attendre(pa, (c) => !!(grp.membres[grp.courant] || []).find(x => x.membre === c), C, 8000);
    await pa.evaluate((c) => ouvrirMembre(c), C);
    await attendre(pa, () => !!document.querySelector('#grpMembreVeil .mb-note'), null, 8000);
    const page7 = await pa.evaluate(() => ({ note: (document.querySelector('#grpMembreVeil .mb-note') || {}).textContent, on: document.querySelectorAll('#grpMembreVeil .mb-ach.on').length }));
    dit('7. quelqu\'un qui n\'a encore rien posé : la phrase d\'attente, ses objectifs éteints', page7.note === 'Ses chiffres arriveront avec sa prochaine partie.' && page7.on === 0, JSON.stringify(page7));

    /* ---- 8. un serveur qui ne connaît pas encore les chiffres ---- */
    await m.sql(`update public.profils set stats = null, stats_maj = null where id = '${A}'`);
    const { p: pv } = await telephone(A, 'Taylor', PROG_A, true);
    await pv.waitForTimeout(3200);
    await pv.evaluate(() => compterPartie());
    await pv.waitForTimeout(2400);
    await pv.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pv, (b) => !!(grp.membres[grp.courant] || []).find(x => x.membre === b), B, 8000);
    await pv.evaluate((b) => ouvrirMembre(b), B);
    await pv.waitForTimeout(900);
    const r8 = await pv.evaluate(() => ({ annonce: statsServeur(), carte: !!document.querySelector('#grpMembreVeil .mb-profil'), actions: !!document.querySelector('#grpMembreVeil .grp-liste-act') }));
    dit('8. un serveur qui ne connaît pas encore les chiffres : rien n\'est envoyé ni lu, la page d\'un membre reste celle d\'avant',
      !r8.annonce && !r8.carte && r8.actions && !pv._appels.includes('poser_stats') && !pv._selects.some(c => /stats/.test(c)) && (await stats(A)) === null,
      JSON.stringify({ r8, appels: pv._appels.filter(n => /stats/.test(n)), selects: pv._selects.filter(c => /stats/.test(c)) }));
  } catch (e) { dit('le banc s\'est arrêté', false, e.stack || e.message); }
  dit('9. aucune erreur dans les pages', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  await nav.close();
  await m.arreter();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le profil d\'un joueur montre ses chiffres, et le serveur n\'en garde que ce qu\'il faut');
  process.exit(ko ? 1 : 0);
})();
