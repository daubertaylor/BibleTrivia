/* ====== BANC « L'INVITATION DIT QUI A REJOINT » (v336) ======
   « Lorsque le joueur crée une partie, il faut un message comme quoi il a
     lancé une partie, et les joueurs qui rejoignent par la suite : de cette
     façon, les autres peuvent décider de rentrer ou pas. » Un VRAI
   PostgreSQL (le décor de groupes.js), de vrais salons. Benoît a un groupe ;
   Chloé, Dora et Émile en sont membres ; Ruth n'en est pas.
   LE SERVEUR
     1. Ruth, qui n'est pas membre, ne peut pas s'inscrire ; Benoît, qui a
        lancé la partie, n'est pas « venu » ; seul Benoît peut la dire
        commencée ; et (1b) s'inscrire deux fois, ou se retirer deux fois,
        n'écrit rien la seconde — l'ordre de la liste tient ;
   LE JEU
     2. Benoît lance la partie : chez Dora, la discussion ouverte,
        l'invitation arrive — personne encore, « Rejoindre la partie » ;
     3. Chloé la rejoint par la bulle : chez Dora, en direct, son visage et
        « Avec Chloé » ; le serveur a son nom ;
     4. Émile entre en tapant le code (« Jouer en ligne ») : il est inscrit
        aussi — « Avec Chloé et Émile » ;
     5. Chloé ressort avant le départ : elle s'en retire — « Avec Émile » ;
     6. Benoît lance la manche : « Partie en cours », plus de bouton, la liste
        reste ; le serveur refuse désormais d'inscrire quelqu'un ;
     7. Benoît s'en va : « Partie terminée », et la liste de ceux qui ont
        joué reste ;
     8. les noms dans les trois langues, « toi » à la fin, et « 3 autres »
        au-delà de quatre ; la fin passe à la ligne d'un seul bloc ;
     9. un serveur d'avant (sans « parties_suivies ») : personne ne s'inscrit,
        la bulle de toujours ;
    10. aucune erreur.
   Sur la v335 : 1, 1b et 3 à 8 rouges — l'invitation ne disait jamais qui
   était là ; 2, 9 et 10 verts (la bulle de toujours).
   Usage : node banc-essai/partie-venus.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const B = 'bbbbbbbb-0000-4000-8000-0000000000c1', C = 'cccccccc-0000-4000-8000-0000000000c2', D = 'dddddddd-0000-4000-8000-0000000000c3',
      E = 'eeeeeeee-0000-4000-8000-0000000000c4', R = 'ffffffff-0000-4000-8000-0000000000c5';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 320) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8515, 5719);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B'], [D, 'dora@essai', 'Dora', '#8E5BD8'],
                                             [E, 'emile@essai', 'Émile', '#E8B84C'], [R, 'ruth@essai', 'Ruth', '#4CA3E8']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    for (const x of [C, D, E]) await m.rpc(x, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });

    /* 1 : le serveur, sur une invitation d'essai */
    const essai = (await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: '', p_genre: 'partie', p_donnees: { code: 'QQQQ' } })).data;
    const r1a = (await m.rpc(R, 'venir_partie', { p_message: essai.id, p_venu: true })).data || {};
    const r1b = (await m.rpc(B, 'venir_partie', { p_message: essai.id, p_venu: true })).data || {};
    const r1c = (await m.rpc(C, 'commencer_partie', { p_message: essai.id })).data || {};
    const v1 = await m.sql(`select coalesce(jsonb_array_length(donnees->'venus'), 0) || ' / ' || coalesce(donnees->>'lancee', 'non') from public.messages where id = ${essai.id}`);
    /* 1b : rien ne change, rien ne s'écrit (xmin : la version de la ligne) — et l'ordre tient */
    const ligne = async () => m.sql(`select xmin::text || ' | ' || coalesce((select string_agg(e->>'nom', ', ' order by o) from jsonb_array_elements(donnees->'venus') with ordinality t(e, o)), '') from public.messages where id = ${essai.id}`);
    await m.rpc(C, 'venir_partie', { p_message: essai.id, p_venu: true });
    await m.rpc(D, 'venir_partie', { p_message: essai.id, p_venu: true });
    const l1 = await ligne();
    await m.rpc(C, 'venir_partie', { p_message: essai.id, p_venu: true });
    const l2 = await ligne();
    await m.rpc(C, 'venir_partie', { p_message: essai.id, p_venu: false });
    const l3 = await ligne();
    await m.rpc(C, 'venir_partie', { p_message: essai.id, p_venu: false });
    const l4 = await ligne();
    const nomsDe = (l) => l.split(' | ')[1], versionDe = (l) => l.split(' | ')[0];
    await m.rpc(B, 'fermer_partie', { p_message: essai.id });
    await m.sql(`update public.messages set supprime_le = now() where id = ${essai.id}`);
    dit('1. Ruth (pas membre) ne s\'inscrit pas ; Benoît n\'est pas « venu » ; seul Benoît la dit commencée',
      r1a.ok === false && r1a.erreur === 'pas_membre' && r1b.ok === true && r1c.ok === false && r1c.erreur === 'interdit' && v1 === '0 / non', JSON.stringify({ r1a, r1b, r1c, v1 }));
    dit('1b. déjà inscrit ou déjà retiré : le serveur n\'écrit rien (rien ne part en direct), et l\'ordre tient',
      nomsDe(l1) === 'Chloé, Dora' && l2 === l1 && nomsDe(l3) === 'Dora' && versionDe(l3) !== versionDe(l1) && l4 === l3, JSON.stringify({ l1, l2, l3, l4 }));
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'");

    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n, c]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [id, nom, couleur]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => chargerListes());
      await attendre(p, (gid) => (grp.liste || []).some(x => x.id === gid), g.id, 8000);
      await p.evaluate((gid) => ouvrirGroupe(gid), g.id);
      await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
      await p.waitForTimeout(500);
      return { ctx, p };
    };
    const BULLE = () => {
      const b = [...document.querySelectorAll('#fil .b-partie')].pop();
      if (!b) return null;
      const tx = (x) => ((x || {}).textContent || '').replace(/\s+/g, ' ');
      return { titre: tx(b.querySelector('b')), avec: tx(b.querySelector('.bp-venus small')),
        visages: b.querySelectorAll('.bp-visages .avatar').length, etat: [...b.querySelectorAll(':scope > small')].map(x => x.textContent).join(' | '),
        bouton: (b.querySelector('.grp-pill') || {}).textContent || '' };
    };
    const venus = () => m.sql(`select coalesce((select string_agg(e->>'nom', ', ' order by ord) from jsonb_array_elements(donnees->'venus') with ordinality as t(e, ord)), '')
                                 || ' / ' || coalesce(donnees->>'lancee', 'non') || ' / ' || coalesce(donnees->>'fermee', 'non')
                               from public.messages where groupe = '${g.id}' and genre = 'partie' and supprime_le is null order by id desc limit 1`);

    const ben = await telephone(B, 'Benoît', '#E8734C', IOS);
    const dora = await telephone(D, 'Dora', '#8E5BD8', IOS);
    const chl = await telephone(C, 'Chloé', '#7BC86B', AND);
    const emi = await telephone(E, 'Émile', '#E8B84C', AND);

    /* 2 */
    await ben.p.evaluate(() => document.querySelector('.compo-jeu').click());
    await attendre(ben.p, () => state.screen === 'online-room' && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    await attendre(dora.p, () => !!document.querySelector('#fil .b-partie'), null, 9000);
    const b2 = await dora.p.evaluate(BULLE);
    dit('2. Benoît lance la partie : chez Dora, l\'invitation — personne encore, « Rejoindre la partie »',
      b2 && b2.titre === 'Benoît lance une partie' && !b2.avec && b2.visages === 0 && b2.bouton === 'Rejoindre la partie', JSON.stringify(b2));

    /* 3 */
    await attendre(chl.p, () => !!document.querySelector('#fil .b-partie .grp-pill'), null, 9000);
    await chl.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].pop().click());
    await attendre(chl.p, () => state.screen === 'online-room', null, 9000);
    const vu3 = await attendre(dora.p, () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); return !!b && /Avec Chloé/.test(b.textContent.replace(/\s+/g, ' ')); }, null, 9000);
    const b3 = await dora.p.evaluate(BULLE);
    const s3 = await venus();
    dit('3. Chloé la rejoint par la bulle : chez Dora, en direct, son visage et « Avec Chloé » ; le serveur a son nom',
      vu3 && b3.avec === 'Avec Chloé' && b3.visages === 1 && s3 === 'Chloé / non / non', JSON.stringify({ b3, s3 }));

    /* 4 : Émile tape le code */
    const codeSalon = await ben.p.evaluate(() => net.code);
    await emi.p.evaluate(() => { retourGroupes(); });
    await emi.p.waitForTimeout(400);
    await emi.p.evaluate((k) => { openOnline(); joinRoom(k, false); }, codeSalon);
    await attendre(emi.p, () => state.screen === 'online-room', null, 9000);
    const vu4 = await attendre(dora.p, () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); return !!b && /Avec Chloé et Émile/.test(b.textContent.replace(/\s+/g, ' ')); }, null, 9000);
    const b4 = await dora.p.evaluate(BULLE);
    dit('4. Émile entre en tapant le code : inscrit aussi — « Avec Chloé et Émile »', vu4 && b4.visages === 2 && (await venus()) === 'Chloé, Émile / non / non', JSON.stringify({ b4, s: await venus() }));

    /* 5 : Chloé ressort */
    await chl.p.evaluate(() => leaveRoomToOnline());
    const vu5 = await attendre(dora.p, () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); return !!b && /Avec Émile/.test(b.textContent) && !/Chloé/.test(b.textContent); }, null, 9000);
    dit('5. Chloé ressort avant le départ : elle s\'en retire — « Avec Émile »', vu5 && (await venus()) === 'Émile / non / non', JSON.stringify({ b5: await dora.p.evaluate(BULLE), s: await venus() }));

    /* 6 : la manche part */
    await attendre(ben.p, () => !!net.oppPresent, null, 6000);
    await ben.p.evaluate(() => hostStart());
    const vu6 = await attendre(dora.p, () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); return !!b && /Partie en cours/.test(b.textContent); }, null, 9000);
    const b6 = await dora.p.evaluate(BULLE);
    const r6 = (await m.rpc(D, 'venir_partie', { p_message: +(await ben.p.evaluate(() => net.partieGroupe && net.partieGroupe.message)), p_venu: true })).data || {};
    dit('6. la manche part : « Partie en cours », plus de bouton, la liste reste ; le serveur n\'inscrit plus personne',
      vu6 && b6.etat === 'Partie en cours' && !b6.bouton && b6.avec === 'Avec Émile' && r6.ok === false && r6.erreur === 'partie_finie' && (await venus()) === 'Émile / true / non',
      JSON.stringify({ b6, r6, s: await venus() }));

    /* 7 : Benoît s'en va */
    await ben.p.evaluate(() => { cleanupRoom(); state.screen = 'mode'; render(); });
    const vu7 = await attendre(dora.p, () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); return !!b && /Partie terminée/.test(b.textContent); }, null, 9000);
    const b7 = await dora.p.evaluate(BULLE);
    dit('7. Benoît s\'en va : « Partie terminée », la liste de ceux qui ont joué reste', vu7 && b7.avec === 'Avec Émile' && !b7.bouton, JSON.stringify(b7));

    /* 8 : les mots */
    const l8 = await dora.p.evaluate((ids) => {
      const avant = LANGUE, r = { fr:[], en:[], es:[] };
      if (typeof avecQui !== 'function') return r;
      const deux = [{ id: ids.c, nom: 'Chloé' }, { id: ids.d, nom: 'Dora' }];
      const six = ['Ana', 'Ben', 'Cléo', 'Dan', 'Eva', 'Fred'].map((n, i) => ({ id: 'x-' + i, nom: n }));
      for (const l of ['fr', 'en', 'es']) { LANGUE = l; r[l] = [avecQui(deux), avecQui(six)]; r[l + ':soudé'] = /\u00A0(toi|you|contigo)$/.test(r[l][0]) && /(et|and|y)\u00A03\u00A0(autres|others|más)$/.test(r[l][1]); r[l] = r[l].map(x => x.replace(/\u00A0/g, ' ')); }
      LANGUE = avant; return r;
    }, { c: C, d: D });
    dit('8. les noms dans les trois langues, « toi » à la fin, « 3 autres » au-delà de quatre — la fin d\'un seul bloc',
      l8['fr:soudé'] && l8['en:soudé'] && l8['es:soudé'] && l8.fr[0] === 'Avec Chloé et toi' && l8.en[0] === 'With Chloé and you' && l8.es[0] === 'Con Chloé y contigo'
        && l8.fr[1] === 'Avec Ana, Ben, Cléo et 3 autres' && /^With Ana, Ben, Cléo,? and 3 others$/.test(l8.en[1]) && l8.es[1] === 'Con Ana, Ben, Cléo y 3 más', JSON.stringify(l8));

    /* 9 : un serveur d'avant */
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'");
    await dora.p.evaluate(() => { grp.etat.parties_suivies = false; });
    await ben.p.evaluate((gid) => { net.partieLancee = 0; ouvrirGroupe(gid); }, g.id);
    await attendre(ben.p, () => state.screen === 'groupe' && !!document.querySelector('.compo-jeu'), null, 8000);
    await ben.p.waitForTimeout(500);
    await ben.p.evaluate(() => document.querySelector('.compo-jeu').click());
    await attendre(ben.p, () => state.screen === 'online-room' && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    await attendre(dora.p, () => [...document.querySelectorAll('#fil .b-partie')].pop() && /Rejoindre/.test([...document.querySelectorAll('#fil .b-partie')].pop().textContent), null, 9000);
    const b9 = await dora.p.evaluate(BULLE);
    await dora.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].pop().click());
    await attendre(dora.p, () => state.screen === 'online-room', null, 9000);
    await dora.p.waitForTimeout(2500);
    const s9 = await venus();
    dit('9. un serveur d\'avant : personne ne s\'inscrit, la bulle de toujours', s9.trim() === '/ non / non' && b9 && !b9.avec && b9.visages === 0 && b9.bouton === 'Rejoindre la partie',
      JSON.stringify({ s9, b9 }));

    for (const t of [ben, dora, chl, emi]) await t.ctx.close();
    dit('10. aucune erreur dans les pages', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — l\'invitation dit qui a rejoint, en direct, et quand la partie a commencé');
  process.exit(ko ? 1 : 0);
})();
