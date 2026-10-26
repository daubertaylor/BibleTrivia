/* ====== BANC « LE RÉCAP D'UNE PARTIE DE GROUPE » (v339) ======
   « Est-ce que tu penses qu'il serait bien, pour les parties dans les
     groupes, une fois que la partie est terminée, qu'on puisse cliquer
     dessus pour avoir un récap de la partie, qui a gagné, etc. ? »
   Un VRAI PostgreSQL (le décor de groupes.js), de vrais salons. Benoît a un
   groupe ; Chloé, Dora et Émile en sont membres ; Ruth n'en est pas.
   LE SERVEUR (resultat_partie)
     1. Ruth (pas membre), Dora (membre, pas de la partie) : refusées ; un
        score hors de la partie (plus de bonnes réponses que de questions,
        plus de 30 points par question) : refusé ;
     2. Chloé inscrit son score ; une seconde fois, rien ne change (le premier
        compte) ; Benoît, qui l'a lancée, inscrit le sien ; le nombre de
        questions et le testament viennent du premier ; trois heures après
        l'invitation, plus rien ne s'inscrit ;
   LE JEU
     3. Benoît lance une partie, Chloé et Dora la rejoignent, elle part ;
        Chloé répond juste partout, Benoît une fois sur trois, Dora s'en va
        au milieu : à la fin des questions, le serveur a les scores de Chloé
        et de Benoît — les vrais, ceux de leurs écrans ;
     4. chez Émile (qui regardait la discussion), en direct : la bulle dit
        « Chloé l'emporte · N pts », avec son chevron ;
     5. Émile la touche : la page « Récap de la partie » — la coupe, « Chloé
        l'emporte », « Lancée par Benoît · … », « 9 questions · Toute la
        Bible » (la partie courte) ; Chloé 1re (or), Benoît 2e (argent), leurs bonnes réponses
        et leurs points ; Dora « N'a pas fini », en dernier ;
     6. chez Chloé : « Tu l'emportes · N pts » ;
     7. « Rejouer » dans le même salon : la nouvelle manche n'écrase rien ;
     8. ex æquo, et en anglais : « Ex æquo : Chloé et Benoît », « Chloé
        wins · N pts », « Game recap » ;
     9. un serveur d'avant (sans « recaps ») : rien ne part ;
    10. aucune erreur.
   Sur la v338 : 1 à 9 rouges — rien de tout cela n'existait.
   Usage : node banc-essai/partie-recap.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const B = 'bbbbbbbb-0000-4000-8000-0000000000d1', C = 'cccccccc-0000-4000-8000-0000000000d2', D = 'dddddddd-0000-4000-8000-0000000000d3',
      E = 'eeeeeeee-0000-4000-8000-0000000000d4', R = 'ffffffff-0000-4000-8000-0000000000d5';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 360) + ')' : '')); if (!bon) ko++; };
const n = (t) => String(t || '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  const m = await monter(8524, 5729);
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
    const scores = (id) => m.sql(`select coalesce((donnees->'scores')::text, '{}') || ' / ' || coalesce(donnees->>'total', '-') || ' / ' || coalesce(donnees->>'theme', '-')
                                   from public.messages where id = ${id}`);
    const res = async (qui, id, pts, bonnes, total, theme) => ((await m.rpc(qui, 'resultat_partie', { p_message: id, p_points: pts, p_bonnes: bonnes, p_total: total, p_theme: theme || 'tout', p_livre: null })).data || {});

    /* 1 et 2 : le serveur, sur une invitation d'essai */
    const essai = (await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: '', p_genre: 'partie', p_donnees: { code: 'QQQQ' } })).data;
    await m.rpc(C, 'venir_partie', { p_message: essai.id, p_venu: true });
    const r1 = [await res(R, essai.id, 20, 1, 3), await res(D, essai.id, 20, 1, 3), await res(C, essai.id, 20, 4, 3), await res(C, essai.id, 100, 3, 3)];
    dit('1. Ruth (pas membre) et Dora (pas de la partie) refusées ; un score hors de la partie refusé',
      r1[0].erreur === 'pas_membre' && r1[1].erreur === 'interdit' && r1[2].erreur === 'valeur' && r1[3].erreur === 'valeur' && (await scores(essai.id)) === '{} / - / -',
      JSON.stringify(r1));
    const r2a = await res(C, essai.id, 60, 3, 3, 'nt'), r2b = await res(C, essai.id, 10, 1, 3, 'nt'), r2c = await res(B, essai.id, 20, 1, 5, 'at');
    const s2 = await scores(essai.id);
    await m.sql(`update public.messages set cree_le = now() - interval '3 hours 1 minute' where id = ${essai.id}`);
    await m.rpc(D, 'venir_partie', { p_message: essai.id, p_venu: true });
    await m.sql(`update public.messages set donnees = donnees || '{"venus":[{"id":"${C}","nom":"Chloé"},{"id":"${D}","nom":"Dora"}]}'::jsonb where id = ${essai.id}`);
    const r2d = await res(D, essai.id, 20, 1, 3);
    dit('2. Chloé inscrit son score, une fois ; Benoît le sien ; le nombre de questions et le testament viennent du premier ; trois heures après, plus rien',
      r2a.ok === true && r2b.ok === true && r2b.deja === true && r2c.ok === true && s2 === `{"${B}": [20, 1], "${C}": [60, 3]} / 3 / nt` && r2d.erreur === 'partie_finie',
      JSON.stringify({ r2a, r2b, r2c, s2, r2d }));
    await m.sql(`update public.messages set supprime_le = now() where id = ${essai.id}`);
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute' where supprime_le is null");

    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n2, c]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n2, color: c }));
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
    /* Répondre à toute la partie : juste partout, ou juste à la première seulement. */
    const jouer = async (p, justes, arret) => {
      for (let i = 0; i < 12; i++) {
        const encore = await p.evaluate(() => state.screen === 'online-play' && !net.myDone);
        if (!encore) break;
        if (arret !== undefined && i === arret) return;
        await p.evaluate((j) => { const q = net.deck[net.idx]; const bon = q.shuffledOptions.indexOf(q.correct);
          const k = j ? bon : (bon + 1) % q.shuffledOptions.length; onlineAnswer(k); }, justes === 'tout' || (justes === 'premiere' && i === 0));
        await p.waitForTimeout(250);
        await p.evaluate(() => onlineNext());
        await p.waitForTimeout(250);
      }
    };
    const BULLE = () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); if (!b) return null;
      const r = b.querySelector('.bp-recap'); return { recap: r ? r.querySelector('small').textContent : '', chev: !!(r && r.querySelector('.bp-chev svg')), cls: b.className }; };

    const ben = await telephone(B, 'Benoît', '#E8734C', IOS);
    const chl = await telephone(C, 'Chloé', '#7BC86B', AND);
    const dora = await telephone(D, 'Dora', '#8E5BD8', IOS);
    const emi = await telephone(E, 'Émile', '#E8B84C', AND);

    /* 3 */
    await ben.p.evaluate(() => document.querySelector('.compo-jeu').click());
    await attendre(ben.p, () => state.screen === 'online-room' && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    const idPartie = await ben.p.evaluate(() => net.partieGroupe.message);
    for (const t of [chl, dora]) {
      await attendre(t.p, () => !!document.querySelector('#fil .b-partie .grp-pill'), null, 9000);
      await t.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].pop().click());
      await attendre(t.p, () => state.screen === 'online-room', null, 9000);
    }
    await attendre(ben.p, () => !!net.oppPresent && autresJoueurs().length >= 2, null, 9000);
    await ben.p.waitForTimeout(1200);
    await ben.p.evaluate(() => { net.lengthKey = 'courte'; hostStart(); });
    for (const t of [ben, chl, dora]) await attendre(t.p, () => state.screen === 'online-play', null, 9000);
    await jouer(dora.p, 'tout', 1);
    await dora.p.evaluate(() => { cleanupRoom(); state.screen = 'mode'; render(); });
    await jouer(chl.p, 'tout');
    await jouer(ben.p, 'premiere');
    await attendre(ben.p, () => state.screen === 'online-end', null, 9000);
    const fin3 = { b: await ben.p.evaluate(() => ({ s: net.score, c: net.correct, n: net.deck.length })), c: await chl.p.evaluate(() => ({ s: net.score, c: net.correct, n: net.deck.length })) };
    let s3 = ''; for (let i = 0; i < 30; i++) { s3 = await scores(idPartie); if (s3.indexOf(B) >= 0 && s3.indexOf(C) >= 0) break; await ben.p.waitForTimeout(200); }
    const attendu3 = `{"${B}": [${fin3.b.s}, ${fin3.b.c}], "${C}": [${fin3.c.s}, ${fin3.c.c}]} / ${fin3.c.n} / tout`;
    dit('3. une vraie partie : Chloé juste partout, Benoît une fois, Dora partie au milieu — le serveur a les scores de Chloé et de Benoît, ceux de leurs écrans',
      s3 === attendu3 && fin3.c.c === fin3.c.n && fin3.b.c === 1 && s3.indexOf(D) < 0, JSON.stringify({ s3, attendu3 }));

    /* 4 */
    const vu4 = await attendre(emi.p, () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); return !!b && !!b.querySelector('.bp-recap'); }, null, 9000);
    const b4 = await emi.p.evaluate(BULLE);
    dit('4. chez Émile, en direct : « Chloé l\'emporte · N pts », avec son chevron', vu4 && n(b4.recap) === `Chloé l'emporte · ${fin3.c.s} pts` && b4.chev, JSON.stringify(b4));

    /* 5 */
    await emi.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie')].pop().click());
    await attendre(emi.p, () => { const v = document.getElementById('grpRecapVeil'); return !!v && !v.classList.contains('closing'); }, null, 5000);
    await emi.p.waitForTimeout(700);
    const p5 = await emi.p.evaluate(() => { const v = document.getElementById('grpRecapVeil'); const t = (s) => { const e = v.querySelector(s); return e ? e.textContent : ''; };
      return { titre: t('.page-tete .st-mot') || t('.sheet-title'), coupe: !!v.querySelector('.rp-coupe svg'), nom: t('.grp-ap-nom'),
        metas: [...v.querySelectorAll('.grp-ap-meta')].map(e => e.textContent),
        rangs: [...v.querySelectorAll('.rp-rang')].map(r => ({ rg: (r.querySelector('.rank-badge') || {}).textContent, or: (r.querySelector('.rank-badge') || { className: '' }).className,
          nom: r.querySelector('.grp-txt b').textContent, sous: (r.querySelector('.grp-txt small') || {}).textContent || '', pts: (r.querySelector('.rp-pts') || {}).textContent || '' })) }; });
    const r5 = p5.rangs;
    dit('5. le récap : la coupe, « Chloé l\'emporte », lancée par Benoît, « 9 questions · Toute la Bible » ; Chloé or, Benoît argent, Dora « N\'a pas fini »',
      p5.titre.includes('Récap de la partie') && p5.coupe && n(p5.nom) === "Chloé l'emporte" && /^Lancée par Benoît · Aujourd'hui · \d\d:\d\d$/.test(n(p5.metas[0])) && n(p5.metas[1]) === `${fin3.c.n} questions · Toute la Bible`
        && r5.length === 3 && r5[0].nom === 'Chloé' && r5[0].rg === '1' && /\bg1\b/.test(r5[0].or) && r5[0].pts === `${fin3.c.s} pts` && n(r5[0].sous) === `${fin3.c.n}/${fin3.c.n} bonnes réponses`
        && r5[1].nom === 'Benoît' && r5[1].rg === '2' && /\bg2\b/.test(r5[1].or) && r5[1].pts === `${fin3.b.s} pts` && n(r5[1].sous) === `1/${fin3.b.n} bonnes réponses`
        && r5[2].nom === 'Dora' && r5[2].sous === "N'a pas fini" && !r5[2].pts,
      JSON.stringify(p5));

    /* 6 */
    await attendre(chl.p, () => state.screen === 'online-end', null, 9000);
    await chl.p.evaluate(() => { quitterFinEnLigne(); });
    await chl.p.waitForTimeout(600);
    await chl.p.evaluate((gid) => ouvrirGroupe(gid), g.id);
    const vu6 = await attendre(chl.p, () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); return !!b && !!b.querySelector('.bp-recap'); }, null, 9000);
    const b6 = await chl.p.evaluate(BULLE);
    dit('6. chez Chloé : « Tu l\'emportes · N pts »', vu6 && n(b6.recap) === `Tu l'emportes · ${fin3.c.s} pts`, JSON.stringify(b6));

    /* 7 : Benoît relance une manche dans le même salon : elle n'écrase rien */
    const avant7 = await scores(idPartie);
    await ben.p.evaluate(() => { net.resultats = net.resultats || {}; if (typeof relancerPartie === 'function') { try { relancerPartie(); } catch (e) {} } });
    await ben.p.waitForTimeout(800);
    await ben.p.evaluate(() => { if (state.screen === 'online-play') { net.deck = net.deck.slice(0, 1); } });
    await jouer(ben.p, 'tout');
    await ben.p.evaluate(() => { try { envoyerResultatPartie(); } catch (e) {} });
    await ben.p.waitForTimeout(1200);
    const apres7 = await scores(idPartie);
    dit('7. une nouvelle manche dans le même salon n\'écrase rien', apres7 === avant7, JSON.stringify({ avant7, apres7 }));

    /* 8 */
    const l8 = await emi.p.evaluate(([b, c]) => {
      const faux = { auteur: b, genre: 'partie', donnees: { venus: [{ id: c, nom: 'Chloé' }], scores: { [b]: [60, 3], [c]: [60, 2] }, total: 3 } };
      const fr = vainqueurDit(rangsPartie(faux), true);
      const avant = LANGUE; LANGUE = 'en';
      const vrai = { auteur: b, genre: 'partie', donnees: { venus: [{ id: c, nom: 'Chloé' }], scores: { [b]: [20, 1], [c]: [60, 3] }, total: 3 } };
      const en = [vainqueurDit(rangsPartie(vrai), true), T('Récap de la partie'), Tf('{b}/{t} bonnes réponses', { b: 2, t: 3 }), T("N'a pas fini")];
      LANGUE = avant;
      return { fr, en };
    }, [B, C]);
    dit('8. ex æquo, et en anglais', n(l8.fr) === 'Ex æquo : Benoît et Chloé · 60 pts' && JSON.stringify(l8.en) === JSON.stringify(['Chloé wins · 60 pts', 'Game recap', '2/3 correct answers', "Didn't finish"]),
      JSON.stringify(l8));

    /* 9 */
    const r9 = await dora.p.evaluate((id) => {
      let appele = false; const vraie = appelGroupe;
      appelGroupe = function(nom){ if (nom === 'resultat_partie') appele = true; return vraie.apply(this, arguments); };
      grp.etat.recaps = false;
      net.deck = [{}]; net.partieVenue = { message: id + 999 }; net.resultats = {};
      envoyerResultatPartie();
      appelGroupe = vraie; grp.etat.recaps = true; net.partieVenue = null; net.deck = [];
      return appele;
    }, idPartie);
    dit('9. un serveur d\'avant (sans « recaps ») : rien ne part', r9 === false, String(r9));

    for (const t of [ben, chl, dora, emi]) await t.ctx.close();
    dit('10. aucune erreur dans les pages', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — une partie de groupe terminée dit qui l\'a emporté, et son récap s\'ouvre d\'un toucher');
  process.exit(ko ? 1 : 0);
})();
