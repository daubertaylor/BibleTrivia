/* ====== BANC « LA PARTIE DU GROUPE RESTE DANS LES MESSAGES » (v373) ======
   « Pour ce qui est de la partie de groupe qui nous suit dans les
     différents modes, je ne sais pas si c'est bien. Je pense que peut-être
     il serait mieux, lorsqu'on décide de lancer une partie, de rester
     uniquement dans les messages, pour éviter que le truc de partie nous
     suive dans les autres modes et que ça se superpose sur différents modes
     de jeu et autres. »
   (Ce banc remplace partie-partout.js, celui de la v369, où la barre de la
   partie suivait le joueur partout.)
   Un VRAI PostgreSQL (le décor de groupes.js), de vrais salons en direct.
   Benoît (iPhone, l'hôte) et Chloé (Android) sont dans deux groupes : « Le
   club de Benoît » (la partie) et « Les voisins ».
     1. Benoît lance la partie depuis la discussion du club, Chloé la rejoint
        par la bulle : la carte chez les deux ;
     2. DANS LES MESSAGES, ELLE ATTEND. Benoît retourne aux groupes : rien
        n'est demandé, le salon reste ; la barre « Partie du groupe » ARRIVE
        AVEC LA LISTE — collée à elle, image par image, entière et déjà à sa
        hauteur (elle montait du bas en s'allumant) —, au-dessus de la barre
        du bas (le groupe, « 2 joueurs », « Commencer ») ; la liste s'arrête
        au-dessus d'elle ;
     3. il ouvre la discussion des voisins : la barre flottante PART AVEC LA
        LISTE, puis la même barre est sous l'en-tête, la barre d'écriture
        garde le bas, pas de carte ;
     4. il la touche : la discussion du club s'ouvre, la carte y est ;
     5. Chloé, aux groupes, a sa barre (sans « Commencer ») ; ses Réglages
        l'effacent sous la page ;
     6. HORS DES MESSAGES, ELLE NE SUIT PLUS. Chloé (invitée) va à l'accueil :
        rien n'est demandé, elle quitte la partie, et sa barre part avec la
        liste des groupes ; à l'accueil, aucune barre, rien de réservé en
        bas ; chez Benoît, la carte n'a plus qu'un visage ;
     7. elle revient dans la discussion du club et rejoint de nouveau ;
     8. Benoît (l'hôte, avec Chloé) touche l'onglet Accueil depuis les
        groupes : « Fermer la partie ? » ; « Rester » : il reste aux groupes,
        le salon et sa barre aussi ;
     9. Chloé ouvre ses Réglages ; Benoît touche « Commencer » sur la barre :
        chez les deux, la partie arrive en plein écran — la page de Chloé
        s'est refermée —, plus de barre ;
    10. la partie finie, « Quitter » ramène chacun dans la discussion du club ;
    11. une nouvelle partie, Chloé dedans : Benoît, aux groupes, touche
        l'onglet Jeux : « Fermer la partie ? », « Fermer » — la fenêtre et la
        barre partent avec l'écran des groupes (voir fenetre-page.js), les
        jeux arrivent,
        sans barre ; chez Chloé, « L'hôte a quitté le salon. », elle reste
        dans la discussion et la carte s'en va ;
    12. une partie que Benoît attend seul : il va à son profil sans qu'on lui
        demande rien ; l'invitation est retirée, aucune barre sur le profil ;
    13. aucune erreur.
   Les captures vont dans le dossier donné en second argument (facultatif).
   Usage : node banc-essai/partie-messages.js [url ignorée] [dossier des captures] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const B = 'bbbbbbbb-0000-4000-8000-0000000000e1', C = 'cccccccc-0000-4000-8000-0000000000e2';
const CAPTURES = process.argv[3] || '';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8555, 5755);
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
      const app = document.getElementById('app');
      app.scrollTop = 1e6;
      const enfants = ecr ? [...ecr.children].filter(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden' && x.offsetHeight > 0 && getComputedStyle(x).position !== 'fixed' && getComputedStyle(x).position !== 'absolute') : [];
      const dernier = enfants.length ? Math.round(Math.max(...enfants.map(x => r(x).bottom))) : 0;
      const ici = rb ? document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2) : null;
      const fil = ecr && ecr.querySelector(':scope > .barre-partie.dans-fil');
      const carte = ecr && [...ecr.querySelectorAll(':scope > .grp-partie')].find(x => !x._part);
      return {
        ecran: state.screen, salon: !!(net.room && net.fil), barre: montree, surBarre: !!b && b.classList.contains('sur-barre'),
        haut: rb ? Math.round(rb.top) : null, basHaut: basVue ? Math.round(r(bas).top) : null,
        texte: montree ? b.textContent.replace(/\s+/g, ' ').trim() : '', commencer: montree && !!b.querySelector('.bp-go'),
        dessus: !!(ici && b && b.contains(ici)), dernier, sousPartie: !!(ecr && ecr.classList.contains('sous-partie')),
        vue: document.documentElement.classList.contains('partie-vue'),
        dansFil: fil ? fil.textContent.replace(/\s+/g, ' ').trim() : '', carte: !!carte, visages: carte ? carte.querySelectorAll('.gp-joueur').length : 0,
        compo: !!document.getElementById('compo'), compoBas: document.getElementById('compo') ? Math.round(r(document.getElementById('compo')).bottom) : 0,
        modale: (document.querySelector('#modalVeil .modal-card h3, #modalVeil .modal-title') || {}).textContent || (document.getElementById('modalVeil') ? '(fenêtre)' : ''),
        page: !!document.querySelector('.sheet-veil.page:not(.closing)'), vueH: innerHeight
      };
    };
    /* La barre flottante pendant un passage, image par image : son décalage
       de côté comparé à celui de l'écran qui la porte (celui qui arrive, ou
       celui qu'on quitte), sa hauteur, son opacité. */
    const suivreBarre = (t, geste, avec) => t.p.evaluate(({ geste, avec }) => new Promise(res => {
      const tx = (el) => { const v = el ? getComputedStyle(el).translate : 'none'; return (!v || v === 'none') ? 0 : parseFloat(v) || 0; };
      new Function(geste)();
      const pp = passage, b = document.getElementById('barrePartie');
      const l = []; const t0 = performance.now();
      const tic = () => {
        const ecr = pp ? (avec === 'entrant' ? pp.entrant : pp.sortant) : null;
        if (pp && ecr && ecr.isConnected && Math.abs(tx(pp.entrant)) >= 0.5 && b && !b.classList.contains('cachee')) {
          const r = b.getBoundingClientRect();
          l.push({ ecart: Math.abs(tx(b) - tx(ecr)), haut: r.top, o: parseFloat(getComputedStyle(b).opacity) });
        }
        if (performance.now() - t0 < 700) requestAnimationFrame(tic);
        else res({ passage: !!pp, images: l.length, ecart: l.length ? Math.round(Math.max(...l.map(x => x.ecart)) * 10) / 10 : null,
          hauteur: l.length ? Math.round(Math.max(...l.map(x => x.haut)) - Math.min(...l.map(x => x.haut))) : null,
          opacite: l.length ? Math.round(Math.min(...l.map(x => x.o)) * 100) : null, cachee: !!b && b.classList.contains('cachee') });
      };
      requestAnimationFrame(tic);
    }), { geste, avec });
    const rejoindre = async (t) => {
      await attendre(t.p, () => [...document.querySelectorAll('#fil .b-partie .grp-pill')].some(x => /Rejoindre/.test(x.textContent)), null, 9000);
      await t.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].filter(x => /Rejoindre/.test(x.textContent)).pop().click());
    };
    const lancer = async (t) => {
      await t.p.evaluate(() => document.querySelector('.compo-jeu').click());
      return attendre(t.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    };

    const ben = await telephone(B, 'Benoît', '#E8734C', IOS);
    const chl = await telephone(C, 'Chloé', '#7BC86B', AND);

    /* 1 */
    await lancer(ben);
    await rejoindre(chl);
    const ok1 = await attendre(chl.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!net.oppPresent, null, 9000);
    const ok1b = await attendre(ben.p, () => document.querySelectorAll('.grp-partie .gp-joueur').length === 2, null, 9000);
    dit('1. Benoît lance depuis la discussion, Chloé rejoint par la bulle : la carte chez les deux', ok1 && ok1b);

    /* 2 */
    const arrive = await suivreBarre(ben, 'retourGroupes()', 'entrant');
    const ok2 = await attendre(ben.p, () => state.screen === 'groupes' && !!document.querySelector('#barrePartie:not(.cachee)'), null, 6000);
    await ben.p.waitForTimeout(700);
    const vb2 = await ben.p.evaluate(VUE);
    await photo(ben, '2-groupes-hote');
    dit('2. dans les messages, elle attend : Benoît retourne aux groupes sans question, le salon reste ; la barre ARRIVE AVEC LA LISTE (collée à elle, entière, à sa hauteur), au-dessus de celle du bas (le groupe, « 2 joueurs », « Commencer ») ; la liste s\'arrête au-dessus',
      ok2 && arrive.passage && arrive.images >= 8 && arrive.ecart <= 1 && arrive.hauteur <= 1 && arrive.opacite >= 99
        && !vb2.modale && vb2.salon && vb2.barre && vb2.surBarre && vb2.basHaut !== null && vb2.haut < vb2.basHaut && /Partie du groupe/.test(vb2.texte) && /Le club de Beno/.test(vb2.texte) && /2 joueurs/.test(vb2.texte) && vb2.commencer && vb2.dessus && vb2.sousPartie && vb2.dernier <= vb2.haut + 1,
      JSON.stringify({ arrive, vb2 }));

    /* 3 */
    const part = await suivreBarre(ben, "ouvrirGroupe('" + g2.id + "')", 'sortant');
    const ok3 = await attendre(ben.p, (id) => state.screen === 'groupe' && grp.courant === id && !!document.querySelector('#app > .screen:not(.screen-exit) > .barre-partie.dans-fil'), g2.id, 8000);
    await ben.p.waitForTimeout(700);
    const vb3 = await ben.p.evaluate(VUE);
    dit('3. la discussion des voisins : la barre flottante PART AVEC LA LISTE (collée à elle, entière), puis la même barre est sous l\'en-tête, la barre d\'écriture garde le bas, pas de carte',
      ok3 && part.passage && part.images >= 8 && part.ecart <= 1 && part.hauteur <= 1 && part.opacite >= 99 && part.cachee
        && !vb3.barre && /Partie du groupe/.test(vb3.dansFil) && /Commencer/.test(vb3.dansFil) && !vb3.carte && vb3.compo && vb3.compoBas > vb3.vueH - 120 && vb3.salon,
      JSON.stringify({ part, vb3 }));

    /* 4 */
    await ben.p.evaluate(() => document.querySelector('#app > .screen:not(.screen-exit) > .barre-partie.dans-fil .bp-zone').click());
    const ok4 = await attendre(ben.p, (id) => state.screen === 'groupe' && grp.courant === id && !!document.querySelector('#app > .screen:not(.screen-exit) > .grp-partie[data-phase="room"]'), g.id, 8000);
    await ben.p.waitForTimeout(500);
    const vb4 = await ben.p.evaluate(VUE);
    dit('4. il la touche : la discussion du club s\'ouvre, la carte y est, plus de barre', ok4 && vb4.carte && !vb4.barre && !vb4.dansFil, JSON.stringify(vb4));

    /* 5 */
    await chl.p.evaluate(() => retourGroupes());
    await attendre(chl.p, () => state.screen === 'groupes' && !!document.querySelector('#barrePartie:not(.cachee)'), null, 6000);
    await chl.p.waitForTimeout(700);
    const vc5a = await chl.p.evaluate(VUE);
    await chl.p.evaluate(() => openSettings());
    await chl.p.waitForTimeout(900);
    const vc5b = await chl.p.evaluate(VUE);
    await chl.p.evaluate(() => closeSettings());
    await chl.p.waitForTimeout(800);
    dit('5. Chloé, aux groupes, a sa barre (sans « Commencer ») ; ses Réglages l\'effacent sous la page',
      vc5a.salon && vc5a.barre && !vc5a.commencer && /2 joueurs/.test(vc5a.texte) && vc5b.page && !vc5b.barre,
      JSON.stringify({ a: [vc5a.ecran, vc5a.barre, vc5a.commencer, vc5a.texte], b: [vc5b.page, vc5b.barre] }));

    /* 6 */
    const part6 = await suivreBarre(chl, "allerOnglet('accueil')", 'sortant');
    await chl.p.waitForTimeout(400);
    const vc6 = await chl.p.evaluate(VUE);
    await photo(chl, '6-accueil-invitee');
    const ok6 = await attendre(ben.p, () => document.querySelectorAll('#app > .screen:not(.screen-exit) > .grp-partie .gp-joueur').length === 1, null, 9000);
    dit('6. hors des messages, elle ne suit plus : Chloé va à l\'accueil sans question et quitte la partie — sa barre part avec la liste des groupes ; à l\'accueil, aucune barre, rien de réservé en bas ; chez Benoît, un seul visage',
      vc6.ecran === 'mode' && !vc6.modale && !vc6.salon && !vc6.barre && !vc6.vue && !vc6.sousPartie && ok6
        && part6.passage && part6.images >= 8 && part6.ecart <= 1 && part6.opacite >= 99 && part6.cachee,
      JSON.stringify({ part6, vc6: [vc6.ecran, vc6.modale, vc6.salon, vc6.barre, vc6.vue, vc6.sousPartie], ok6 }));

    /* 7 */
    await chl.p.evaluate((gid) => ouvrirGroupe(gid), g.id);
    await attendre(chl.p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    await rejoindre(chl);
    const ok7 = await attendre(ben.p, () => document.querySelectorAll('#app > .screen:not(.screen-exit) > .grp-partie .gp-joueur').length === 2, null, 9000);
    dit('7. elle revient dans la discussion du club et rejoint de nouveau : deux visages chez Benoît', ok7);

    /* 8 */
    await ben.p.evaluate(() => retourGroupes());
    await attendre(ben.p, () => state.screen === 'groupes' && !!document.querySelector('#barrePartie:not(.cachee)'), null, 6000);
    await ben.p.waitForTimeout(600);
    await ben.p.evaluate(() => allerOnglet('accueil'));
    await ben.p.waitForTimeout(500);
    const vb8a = await ben.p.evaluate(VUE);
    await photo(ben, '8-fermer-hote');
    await ben.p.evaluate(() => [...document.querySelectorAll('#modalVeil button')].find(x => /Rester/.test(x.textContent)).click());
    await ben.p.waitForTimeout(700);
    const vb8b = await ben.p.evaluate(VUE);
    dit('8. Benoît, l\'hôte avec Chloé, touche Accueil depuis les groupes : « Fermer la partie ? » ; « Rester » : il reste aux groupes, le salon et sa barre aussi',
      /Fermer la partie/.test(vb8a.modale) && vb8a.ecran === 'groupes' && !vb8b.modale && vb8b.ecran === 'groupes' && vb8b.salon && vb8b.barre && vb8b.commencer,
      JSON.stringify({ a: [vb8a.modale, vb8a.ecran], b: [vb8b.modale, vb8b.ecran, vb8b.salon, vb8b.barre] }));

    /* 9 */
    await chl.p.evaluate(() => openSettings());
    await chl.p.waitForTimeout(800);
    await ben.p.evaluate(() => { const k = Object.keys(LENGTHS).sort((a, b) => LENGTHS[a] - LENGTHS[b])[0]; net.lengthKey = k; });
    await ben.p.evaluate(() => document.querySelector('#barrePartie .bp-go').click());
    const PLEIN = () => {
      const e = [...document.querySelectorAll('#app > .screen')].find(x => !x.classList.contains('screen-exit'));
      const b = document.getElementById('barrePartie');
      return { ecran: state.screen, reponses: e ? e.querySelectorAll('.options-grid > .option-btn').length : 0,
        question: e && e.querySelector('.question-card .qtext') ? e.querySelector('.question-card .qtext').textContent.trim() : '',
        barre: !!b && !b.classList.contains('cachee'), page: !!document.querySelector('.sheet-veil:not(.closing)'), vue: document.documentElement.classList.contains('partie-vue') };
    };
    const ok9 = await attendre(ben.p, () => state.screen === 'online-play', null, 9000);
    const ok9c = await attendre(chl.p, () => state.screen === 'online-play', null, 9000);
    await ben.p.waitForTimeout(1400);
    const vb9 = await ben.p.evaluate(PLEIN), vc9 = await chl.p.evaluate(PLEIN);
    dit('9. Benoît touche « Commencer » sur la barre : chez les deux, la partie arrive en plein écran — la page de Chloé s\'est refermée —, plus de barre',
      ok9 && ok9c && vb9.reponses === 4 && vc9.reponses === 4 && !!vb9.question && vb9.question === vc9.question && !vb9.barre && !vc9.barre && !vc9.page && !vb9.vue && !vc9.vue,
      JSON.stringify({ vb9, vc9 }));

    /* 10 */
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
    const quitterFin = (t) => t.p.evaluate(() => { const b = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .end-actions button')].find(x => /Quitter/.test(x.textContent)); if (b) b.click(); });
    await quitterFin(chl); await quitterFin(ben);
    const DISCU = (id) => state.screen === 'groupe' && grp.courant === id && !!document.getElementById('compoTexte') && !net.room;
    const ok10 = await attendre(chl.p, DISCU, g.id, 8000), ok10b = await attendre(ben.p, DISCU, g.id, 8000);
    dit('10. la partie finie, « Quitter » ramène chacun dans la discussion du club', ok10 && ok10b);

    /* 11 */
    await ben.p.waitForTimeout(5600);                       // une partie à la fois : cinq secondes entre deux
    await lancer(ben);
    await rejoindre(chl);
    await attendre(ben.p, () => document.querySelectorAll('.grp-partie .gp-joueur').length === 2, null, 9000);
    await ben.p.evaluate(() => retourGroupes());
    await attendre(ben.p, () => state.screen === 'groupes' && !!document.querySelector('#barrePartie:not(.cachee)'), null, 6000);
    await ben.p.waitForTimeout(600);
    await ben.p.evaluate(() => allerOnglet('jeux'));
    await ben.p.waitForTimeout(500);
    const vb11a = await ben.p.evaluate(VUE);
    /* « Fermer » : la fenêtre part avec l'écran des groupes */
    const colle = await ben.p.evaluate(() => new Promise(res => {
      document.getElementById('modalOk').click();
      const pp = passage, v = document.querySelector('.modal-veil.closing'), b = document.getElementById('barrePartie');
      const tx = (el) => { const x = getComputedStyle(el).translate; return (!x || x === 'none') ? 0 : parseFloat(x) || 0; };
      const l = [], lb = []; const t0 = performance.now();
      const tic = () => {
        if (pp && v && v.isConnected && pp.sortant && pp.sortant.isConnected && Math.abs(tx(pp.entrant)) >= 0.5) l.push(Math.abs(tx(v) - tx(pp.sortant)));
        if (pp && b && !b.classList.contains('cachee') && pp.sortant && pp.sortant.isConnected && Math.abs(tx(pp.entrant)) >= 0.5) lb.push([Math.abs(tx(b) - tx(pp.sortant)), parseFloat(getComputedStyle(b).opacity)]);
        if (performance.now() - t0 < 300) requestAnimationFrame(tic); else res({ images: l.length, ecart: l.length ? Math.round(Math.max(...l)) : null,
          barre: lb.length, barreEcart: lb.length ? Math.round(Math.max(...lb.map(x => x[0]))) : null, barreOpacite: lb.length ? Math.round(Math.min(...lb.map(x => x[1])) * 100) : null });
      };
      requestAnimationFrame(tic);
    }));
    const ok11 = await attendre(ben.p, () => state.screen === 'jeux' && !net.room, null, 8000);
    const ok11c = await attendre(chl.p, () => !net.room && !document.querySelector('#app > .screen:not(.screen-exit) > .grp-partie:not(.part)'), null, 9000);
    const mot = await chl.p.evaluate(() => (document.querySelector('.mini-toast.show') || {}).textContent || '');
    await ben.p.waitForTimeout(500);
    const vb11 = await ben.p.evaluate(VUE), vc11 = await chl.p.evaluate(VUE);
    dit('11. Benoît, aux groupes, touche Jeux : « Fermer la partie ? », « Fermer » — la fenêtre et la barre de la partie partent avec les groupes, les jeux arrivent sans barre ; Chloé lit que l\'hôte est parti et reste dans la discussion, sans carte',
      /Fermer la partie/.test(vb11a.modale) && colle.images >= 3 && colle.ecart <= 1 && colle.barre >= 3 && colle.barreEcart <= 1 && colle.barreOpacite >= 99 && ok11 && !vb11.barre && !vb11.vue && ok11c && vc11.ecran === 'groupe' && !vc11.carte && /hôte a quitté/.test(mot),
      JSON.stringify({ modale: vb11a.modale, colle, ok11, vb11: [vb11.ecran, vb11.barre, vb11.vue], ok11c, vc11: [vc11.ecran, vc11.carte], mot }));

    /* 12 */
    await ben.p.evaluate((gid) => ouvrirGroupe(gid), g.id);
    await attendre(ben.p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    await ben.p.waitForTimeout(5600);
    await lancer(ben);
    await ben.p.evaluate(() => retourGroupes());
    await attendre(ben.p, () => state.screen === 'groupes' && !!document.querySelector('#barrePartie:not(.cachee)'), null, 6000);
    await ben.p.waitForTimeout(600);
    const vb12a = await ben.p.evaluate(VUE);
    await ben.p.evaluate(() => openProfile());
    await ben.p.waitForTimeout(1000);
    const vb12 = await ben.p.evaluate(VUE);
    await photo(ben, '12-profil-hote');
    dit('12. une partie que Benoît attend seul : il va à son profil sans question ; plus de partie, aucune barre sur le profil',
      vb12a.salon && /En attente/.test(vb12a.texte) && vb12.ecran === 'profile' && !vb12.modale && !vb12.salon && !vb12.barre && !vb12.vue && !vb12.sousPartie,
      JSON.stringify({ a: [vb12a.salon, vb12a.texte], b: [vb12.ecran, vb12.modale, vb12.salon, vb12.barre, vb12.vue, vb12.sousPartie] }));

    for (const t of [ben, chl]) await t.ctx.close();
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('13. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la partie du groupe reste dans les messages');
  process.exit(ko ? 1 : 0);
})();
