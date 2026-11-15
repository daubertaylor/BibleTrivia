/* ====== BANC « LA PARTIE DU GROUPE SUIT LE JOUEUR » (v369) ======
   « Je te parlais uniquement de lancer l'invitation aux autres joueurs sans
     devoir être dans un écran spécifique, et pouvoir rester dans les messages
     ou autre. Et une fois que la partie est lancée, ensuite on entre à
     l'intérieur de la partie sans rester dans le chat. »
   Un VRAI PostgreSQL (le décor de groupes.js), de vrais salons en direct.
   Benoît (iPhone, l'hôte) et Chloé (Android) sont dans deux groupes : « Le
   club de Benoît » (la partie) et « Les voisins ».
     1. Benoît lance la partie depuis la discussion du club, Chloé la rejoint
        par la bulle : la carte chez les deux ;
     2. Benoît retourne aux groupes : rien n'est demandé, le salon reste ; la
        barre « Partie du groupe » est là, au-dessus de la barre du bas, avec
        le nom du groupe, « 2 joueurs » et « Commencer » ; la liste s'arrête
        au-dessus d'elle ;
     3. Chloé va à l'accueil, au Parcours, puis à son profil : la barre la
        suit (sans « Commencer » : c'est l'hôte qui lance), au-dessus de la
        barre du bas, puis au bas de l'écran sur le profil ; rien ne passe
        dessous ;
     4. Benoît ouvre la discussion des voisins : la même barre s'y pose sous
        l'en-tête (la barre d'écriture garde le bas), pas de carte ;
     5. il la touche : la discussion du club s'ouvre, la carte y est, plus de
        barre ;
     6. Chloé tente une partie solo : « Quitter la partie ? » ; « Rester » —
        le salon tient, la barre aussi ;
     7. Chloé ouvre ses Réglages : la barre s'efface sous la page ;
     8. Benoît, à l'accueil, touche « Commencer » sur la barre : chez les
        deux, la partie arrive EN PLEIN ÉCRAN — la page de Chloé s'est
        refermée —, plus de barre ;
     9. la partie finie, « Quitter » ramène Chloé dans la discussion du club ;
    10. une nouvelle partie, Chloé à l'accueil : Benoît, aux groupes, lance
        une partie solo ; « Fermer la partie ? » (Chloé l'avait rejointe),
        « Fermer » : sa partie solo démarre ; chez Chloé, le mot « L'hôte a
        quitté le salon. », elle RESTE à l'accueil, la barre s'en va ;
    11. aucune erreur.
   Les captures vont dans le dossier donné en second argument (facultatif).
   Usage : node banc-essai/partie-partout.js [url ignorée] [dossier des captures] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const B = 'bbbbbbbb-0000-4000-8000-0000000000e1', C = 'cccccccc-0000-4000-8000-0000000000e2';
const CAPTURES = process.argv[3] || '';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8545, 5745);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const g2 = (await m.rpc(B, 'creer_groupe', { p_nom: 'Les voisins', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    for (const x of [g, g2]) {
      const code = await m.sql(`select code from public.groupes where id = '${x.id}'`);
      await m.rpc(C, 'rejoindre_groupe', { p_groupe: x.id, p_code: code });
    }

    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n, c]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
        localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
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
    const photo = async (t, nom) => { if (CAPTURES) { await t.p.waitForTimeout(150); await t.p.screenshot({ path: CAPTURES + '/' + nom + '.png' }); } };
    /* Ce qu'on voit : l'écran, la barre flottante, celle du fil, la carte. */
    const VUE = () => {
      const ecr = [...document.querySelectorAll('#app > .screen')].find(x => !x.classList.contains('screen-exit'));
      const b = document.getElementById('barrePartie');
      const r = (x) => x ? x.getBoundingClientRect() : null;
      const montree = !!b && !b.classList.contains('cachee') && getComputedStyle(b).visibility !== 'hidden' && getComputedStyle(b).opacity > 0.5;
      const rb = montree ? r(b) : null;
      const bas = document.getElementById('barreBas');
      const basVue = !!bas && !bas.classList.contains('cachee') && getComputedStyle(bas).visibility !== 'hidden';
      /* Au bas de l'écran (défilé jusqu'au bout) : son dernier élément visible. */
      const app = document.getElementById('app');
      app.scrollTop = 1e6;
      const enfants = ecr ? [...ecr.children].filter(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden' && x.offsetHeight > 0 && getComputedStyle(x).position !== 'fixed' && getComputedStyle(x).position !== 'absolute') : [];
      const dernier = enfants.length ? Math.round(Math.max(...enfants.map(x => r(x).bottom))) : 0;
      const ici = rb ? document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2) : null;
      const fil = ecr && ecr.querySelector(':scope > .barre-partie.dans-fil');
      return {
        ecran: state.screen, salon: !!(net.room && net.fil), barre: montree, surBarre: !!b && b.classList.contains('sur-barre'),
        haut: rb ? Math.round(rb.top) : null, basHaut: basVue ? Math.round(r(bas).top) : null,
        texte: montree ? b.textContent.replace(/\s+/g, ' ').trim() : '', commencer: montree && !!b.querySelector('.bp-go'),
        dessus: !!(ici && b && b.contains(ici)), dernier, sousPartie: !!(ecr && ecr.classList.contains('sous-partie')),
        dansFil: fil ? fil.textContent.replace(/\s+/g, ' ').trim() : '', carte: !!(ecr && ecr.querySelector(':scope > .grp-partie')),
        compo: !!document.getElementById('compo'), compoBas: document.getElementById('compo') ? Math.round(r(document.getElementById('compo')).bottom) : 0,
        modale: (document.querySelector('#modalVeil .modal-card h3, #modalVeil .modal-title') || {}).textContent || (document.getElementById('modalVeil') ? '(fenêtre)' : ''),
        page: !!document.querySelector('.sheet-veil.page:not(.closing)'), vueH: innerHeight
      };
    };

    const ben = await telephone(B, 'Benoît', '#E8734C', IOS);
    const chl = await telephone(C, 'Chloé', '#7BC86B', AND);

    /* 1 */
    await ben.p.evaluate(() => document.querySelector('.compo-jeu').click());
    await attendre(ben.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    await attendre(chl.p, () => !!document.querySelector('#fil .b-partie .grp-pill'), null, 9000);
    await chl.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].pop().click());
    const ok1 = await attendre(chl.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!net.oppPresent, null, 9000);
    const ok1b = await attendre(ben.p, () => document.querySelectorAll('.grp-partie .gp-joueur').length === 2, null, 9000);
    dit('1. Benoît lance depuis la discussion, Chloé rejoint par la bulle : la carte chez les deux', ok1 && ok1b);

    /* 2 */
    await ben.p.evaluate(() => retourGroupes());
    const ok2 = await attendre(ben.p, () => state.screen === 'groupes' && !!document.querySelector('#barrePartie:not(.cachee)'), null, 6000);
    await ben.p.waitForTimeout(700);
    const vb2 = await ben.p.evaluate(VUE);
    await photo(ben, '2-groupes-hote');
    dit('2. Benoît retourne aux groupes : rien n\'est demandé, le salon reste ; la barre est là, au-dessus de la barre du bas, avec le groupe, « 2 joueurs » et « Commencer » ; la liste s\'arrête au-dessus d\'elle',
      ok2 && !vb2.modale && vb2.salon && vb2.barre && vb2.surBarre && vb2.basHaut !== null && vb2.haut < vb2.basHaut && /Partie du groupe/.test(vb2.texte) && /Le club de Beno/.test(vb2.texte) && /2 joueurs/.test(vb2.texte) && vb2.commencer && vb2.dessus && vb2.dernier <= vb2.haut + 1 && vb2.sousPartie,
      JSON.stringify(vb2));

    /* 3 */
    const chemin = [];
    for (const [nom, f] of [['accueil', () => allerOnglet('accueil')], ['parcours', () => allerOnglet('parcours')], ['profil', () => openProfile()]]) {
      await chl.p.evaluate(f);
      await chl.p.waitForTimeout(900);
      const v = await chl.p.evaluate(VUE);
      chemin.push(Object.assign({ nom }, v));
      await photo(chl, '3-' + nom + '-invitee');
    }
    const [ca, cp, cpr] = chemin;
    dit('3. Chloé va à l\'accueil, au Parcours, à son profil : la barre la suit (sans « Commencer »), au-dessus de la barre du bas, puis au bas de l\'écran ; rien ne passe dessous',
      chemin.every(v => v.salon && v.barre && !v.commencer && v.dessus && /2 joueurs/.test(v.texte) && v.sousPartie && v.dernier <= v.haut + 1)
        && ca.ecran === 'mode' && ca.surBarre && cp.ecran === 'chemin' && cp.surBarre && cpr.ecran === 'profile' && !cpr.surBarre && cpr.haut > ca.haut,
      JSON.stringify(chemin.map(v => [v.nom, v.ecran, v.barre, v.surBarre, v.haut, v.basHaut, v.dernier, v.dessus, v.commencer, v.texte])));

    /* 4 */
    await ben.p.evaluate((id) => ouvrirGroupe(id), g2.id);
    const ok4 = await attendre(ben.p, (id) => state.screen === 'groupe' && grp.courant === id && !!document.querySelector('#app > .screen:not(.screen-exit) > .barre-partie.dans-fil'), g2.id, 8000);
    await ben.p.waitForTimeout(700);
    const vb4 = await ben.p.evaluate(VUE);
    await photo(ben, '4-autre-discussion-hote');
    dit('4. Benoît ouvre la discussion des voisins : la même barre s\'y pose sous l\'en-tête, la barre d\'écriture garde le bas, pas de carte',
      ok4 && !vb4.barre && /Partie du groupe/.test(vb4.dansFil) && /Commencer/.test(vb4.dansFil) && !vb4.carte && vb4.compo && vb4.compoBas > vb4.vueH - 120 && vb4.salon,
      JSON.stringify(vb4));

    /* 5 */
    await ben.p.evaluate(() => document.querySelector('#app > .screen:not(.screen-exit) > .barre-partie.dans-fil .bp-zone').click());
    const ok5 = await attendre(ben.p, (id) => state.screen === 'groupe' && grp.courant === id && !!document.querySelector('#app > .screen:not(.screen-exit) > .grp-partie[data-phase="room"]'), g.id, 8000);
    await ben.p.waitForTimeout(500);
    const vb5 = await ben.p.evaluate(VUE);
    dit('5. il la touche : la discussion du club s\'ouvre, la carte y est, plus de barre', ok5 && vb5.carte && !vb5.barre && !vb5.dansFil, JSON.stringify(vb5));

    /* 6 */
    await chl.p.evaluate(() => { state.mode = 'solo'; startGame(); });
    await chl.p.waitForTimeout(500);
    const vc6a = await chl.p.evaluate(VUE);
    await photo(chl, '6-garde-invitee');
    await chl.p.evaluate(() => { const b = [...document.querySelectorAll('#modalVeil button')].find(x => /Rester/.test(x.textContent)); if (b) b.click(); });
    await chl.p.waitForTimeout(600);
    const vc6b = await chl.p.evaluate(VUE);
    dit('6. Chloé tente une partie solo : « Quitter la partie ? » ; « Rester » — le salon tient, la barre aussi',
      /Quitter la partie/.test(vc6a.modale) && vc6a.ecran === 'profile' && !vc6b.modale && vc6b.ecran === 'profile' && vc6b.salon && vc6b.barre,
      JSON.stringify({ a: [vc6a.modale, vc6a.ecran], b: [vc6b.modale, vc6b.ecran, vc6b.salon, vc6b.barre] }));

    /* 7 */
    await chl.p.evaluate(() => openSettings());
    await chl.p.waitForTimeout(900);
    const vc7 = await chl.p.evaluate(VUE);
    dit('7. Chloé ouvre ses Réglages : la barre s\'efface sous la page', vc7.page && !vc7.barre, JSON.stringify([vc7.page, vc7.barre]));

    /* 8 */
    await ben.p.evaluate(() => allerOnglet('accueil'));
    await ben.p.waitForTimeout(900);
    const vb8a = await ben.p.evaluate(VUE);
    await photo(ben, '8-accueil-hote');
    await ben.p.evaluate(() => { const k = Object.keys(LENGTHS).sort((a, b) => LENGTHS[a] - LENGTHS[b])[0]; net.lengthKey = k; });
    await ben.p.evaluate(() => document.querySelector('#barrePartie .bp-go').click());
    const PLEIN = () => {
      const e = [...document.querySelectorAll('#app > .screen')].find(x => !x.classList.contains('screen-exit'));
      const b = document.getElementById('barrePartie');
      return { ecran: state.screen, reponses: e ? e.querySelectorAll('.options-grid > .option-btn').length : 0,
        question: e && e.querySelector('.question-card .qtext') ? e.querySelector('.question-card .qtext').textContent.trim() : '',
        barre: !!b && !b.classList.contains('cachee'), page: !!document.querySelector('.sheet-veil:not(.closing)'), vue: document.documentElement.classList.contains('partie-vue') };
    };
    const ok8 = await attendre(ben.p, () => state.screen === 'online-play', null, 9000);
    const ok8c = await attendre(chl.p, () => state.screen === 'online-play', null, 9000);
    await ben.p.waitForTimeout(1400);
    const vb8 = await ben.p.evaluate(PLEIN), vc8 = await chl.p.evaluate(PLEIN);
    await photo(chl, '8-partie-invitee');
    dit('8. Benoît, à l\'accueil, touche « Commencer » sur la barre : chez les deux, la partie arrive en plein écran — la page de Chloé s\'est refermée —, plus de barre',
      vb8a.ecran === 'mode' && vb8a.commencer && ok8 && ok8c && vb8.reponses === 4 && vc8.reponses === 4 && !!vb8.question && vb8.question === vc8.question && !vb8.barre && !vc8.barre && !vc8.page && !vb8.vue && !vc8.vue,
      JSON.stringify({ vb8a: [vb8a.ecran, vb8a.commencer], vb8, vc8 }));

    /* 9 */
    const jouerTout = (t) => t.p.evaluate(async () => {
      for (let i = 0; i < 40 && !net.myDone; i++) {
        if (!net.revealed) onlineAnswer(0);
        await new Promise(r => setTimeout(r, 60));
        onlineNext();
        await new Promise(r => setTimeout(r, 60));
      }
      return net.myDone;
    });
    await Promise.all([jouerTout(ben), jouerTout(chl)]);
    const FIN = () => state.screen === 'online-end' && !!document.querySelector('#app > .screen:not(.screen-exit) .btn-quit');
    await attendre(ben.p, FIN, null, 12000);
    await attendre(chl.p, FIN, null, 12000);
    await chl.p.evaluate(() => { const b = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .end-actions button')].find(x => /Quitter/.test(x.textContent)); if (b) b.click(); });
    const ok9 = await attendre(chl.p, (id) => state.screen === 'groupe' && grp.courant === id && !!document.getElementById('compoTexte') && !net.room, g.id, 8000);
    const vc9 = await chl.p.evaluate(VUE);
    dit('9. la partie finie, « Quitter » ramène Chloé dans la discussion du club', ok9 && !vc9.barre && !vc9.carte && vc9.compo, JSON.stringify(vc9));

    /* 10 */
    await ben.p.evaluate(() => { const b = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .end-actions button')].find(x => /Quitter/.test(x.textContent)); if (b) b.click(); });
    await attendre(ben.p, () => state.screen === 'groupe' && !net.room, null, 8000);
    await ben.p.waitForTimeout(5600);                       // une partie à la fois : cinq secondes entre deux
    await ben.p.evaluate(() => document.querySelector('.compo-jeu').click());
    await attendre(ben.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    await attendre(chl.p, () => [...document.querySelectorAll('#fil .b-partie .grp-pill')].some(x => /Rejoindre/.test(x.textContent)), null, 9000);
    await chl.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].filter(x => /Rejoindre/.test(x.textContent)).pop().click());
    await attendre(ben.p, () => document.querySelectorAll('.grp-partie .gp-joueur').length === 2, null, 9000);
    await chl.p.evaluate(() => allerOnglet('accueil'));
    await ben.p.evaluate(() => retourGroupes());
    await chl.p.waitForTimeout(900);
    const vc10a = await chl.p.evaluate(VUE);
    await ben.p.evaluate(() => { state.mode = 'solo'; startGame(); });
    await ben.p.waitForTimeout(500);
    const vb10a = await ben.p.evaluate(VUE);
    await photo(ben, '10-garde-hote');
    await ben.p.evaluate(() => { const b = document.getElementById('modalOk'); if (b) b.click(); });
    const ok10 = await attendre(ben.p, () => state.screen === 'play' && !net.room, null, 8000);
    const ok10c = await attendre(chl.p, () => !net.room && !document.querySelector('#barrePartie:not(.cachee)'), null, 9000);
    const mot = await chl.p.evaluate(() => (document.querySelector('.mini-toast.show') || {}).textContent || '');
    await chl.p.waitForTimeout(400);
    const vc10 = await chl.p.evaluate(VUE);
    dit('10. Benoît lance une partie solo : « Fermer la partie ? » (Chloé l\'avait rejointe), « Fermer » : sa partie démarre ; Chloé reste à l\'accueil, le mot dit que l\'hôte est parti, la barre s\'en va',
      vc10a.ecran === 'mode' && vc10a.barre && /Fermer la partie/.test(vb10a.modale) && ok10 && ok10c && vc10.ecran === 'mode' && !vc10.barre && !vc10.sousPartie && /hôte a quitté/.test(mot),
      JSON.stringify({ vc10a: [vc10a.ecran, vc10a.barre], vb10a: vb10a.modale, ok10, ok10c, vc10: [vc10.ecran, vc10.barre, vc10.sousPartie], mot }));

    for (const t of [ben, chl]) await t.ctx.close();
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('11. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la partie du groupe suit le joueur, et l\'embarque en plein écran');
  process.exit(ko ? 1 : 0);
})();
