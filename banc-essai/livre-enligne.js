/* ====== BANC « UN SEUL LIVRE, EN LIGNE » (v316) ======
   « N'oublie pas que je veux un truc qui permet de jouer directement dans un
     livre en particulier — au niveau des parties en ligne, que ce soit en
     ligne et dans les groupes. »
   Une partie de groupe passe par le même salon qu'une partie En ligne : ce
   banc joue donc le salon, sur un serveur temps réel LOCAL (hub.js, port
   8246) — aucun vrai joueur n'est dérangé.
   CE QU'IL EXIGE :
     1. dans le salon, l'hôte a quatre puces : Tout, Ancien, Nouveau, Un livre ;
     2. « Un livre » ouvre une page : les 66 livres en deux cartes, chacun avec
        son nombre de questions ; un livre trop court ne se choisit pas ;
     3. choisir un livre le fait paraître sur la puce, éteint les testaments,
        et ramène au salon ;
     4. au départ, tout le monde joue EXACTEMENT les mêmes questions, toutes
        tirées de ce livre, autant que la longueur choisie (ou tout le livre
        s'il est plus court), et le titre de la partie est le nom du livre ;
     5. « Rejouer » garde le livre ;
     6. toucher un testament oublie le livre ;
     7. un invité resté sur une version d'avant (qui n'annonce pas « livres ») :
        la manche part sur le testament du livre, pour tout le monde — mêmes
        questions des deux côtés — et l'hôte en est prévenu ;
     8. aucune erreur.
   Usage : node banc-essai/livre-enligne.js */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const attends = (ms) => new Promise(r => setTimeout(r, ms));
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  await new Promise(r => serveur.listen(8246, r));
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const ouvre = async (nom, couleur, ancien) => {
    const c = await nav.newContext({ viewport: { width: 393, height: 852 }, userAgent: AND, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await c.newPage();
    p.on('pageerror', e => errs.push(nom + ': ' + e.message.slice(0, 120)));
    await p.addInitScript(([n, col]) => { localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: col })); localStorage.setItem('bt_fs_hint', '1'); }, [nom, couleur]);
    await p.goto('http://localhost:8246/');
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    /* Un téléphone d'avant la v316 : il n'annonce pas qu'il sait lire un livre. */
    if (ancien) await p.evaluate(() => { const vieux = meMeta; window.meMeta = (x) => { const m = vieux(x); delete m.livres; return m; }; meMeta = window.meMeta; });
    return { c, p, nom };
  };
  const salon = async (hote, invite) => {
    for (const j of [hote, invite]) await j.p.evaluate(() => { if (state.screen !== 'online') openOnline(); });
    await attends(1500);
    const code = await hote.p.evaluate(() => { createRoomFlow(); return new Promise(r => setTimeout(() => r(net.code), 1600)); });
    await invite.p.evaluate((k) => { joinRoom(k, false); }, code);
    await attends(2200);
    return code;
  };
  const paquet = (j) => j.p.evaluate(() => ({ cles: net.deck.map(q => qKey(q)), livres: [...new Set(net.deck.map(q => bookOf(q)))], n: net.deck.length,
    titre: (document.querySelector('.app-header .header-title') || {}).textContent || '', ecran: state.screen, livreJeu: net.livreJeu, theme: net.themeKey }));
  const finir = (j) => j.p.evaluate(async () => {
    for (let t = 0; t < 40 && !net.myDone; t++) { const q = net.deck[net.idx]; if (!q) break;
      onlineAnswer(Math.max(0, q.shuffledOptions.indexOf(q.correct))); await new Promise(r => setTimeout(r, 30));
      onlineNext(); await new Promise(r => setTimeout(r, 30)); }
  });
  try {
    const A = await ouvre('Taylor', '#4C86E8'), B = await ouvre('Sarah', '#E8734C');
    await salon(A, B);

    /* ---- 1 ---- */
    const puces = await A.p.evaluate(() => [...document.querySelectorAll('.len-chip[data-rgroup="theme"]')].map(b => b.dataset.k + ':' + b.textContent.trim()));
    dit('le salon offre quatre puces : Tout, Ancien, Nouveau, Un livre', puces.length === 4 && puces[3] === 'bk:Un livre', puces.join(' | '));

    /* ---- 2 ---- */
    await A.p.locator('.puce-bk').tap();
    await attends(1100);
    const page = await A.p.evaluate(() => {
      const v = document.getElementById('livreVeil');
      const tuiles = v ? [...v.querySelectorAll('.bk-choix')] : [];
      const ouvertes = tuiles.filter(t => !t.disabled);
      return { page: !!v && v.classList.contains('page'), n: tuiles.length, cartes: v ? v.querySelectorAll('.bk-carte').length : 0,
        chiffres: tuiles.every(t => /^\d+$/.test((t.querySelector('.lt-n') || {}).textContent || '')),
        fermees: tuiles.filter(t => t.disabled).map(t => +t.querySelector('.lt-n').textContent),
        grand: ouvertes.map(t => [+t.dataset.i, +t.querySelector('.lt-n').textContent]).sort((a, b) => b[1] - a[1])[0] };
    });
    dit('« Un livre » ouvre une page : 66 livres, deux cartes, chacun son nombre', page.page && page.n === 66 && page.cartes === 2 && page.chiffres, JSON.stringify({ n: page.n, cartes: page.cartes }));
    dit('un livre trop court ne se choisit pas', page.fermees.every(n => n < 5), page.fermees.length + ' fermé(s), le plus grand à ' + Math.max(0, ...page.fermees));

    /* ---- 3 ---- On prend un livre moyen : ni le plus gros, ni un fermé. */
    const choix = await A.p.evaluate(() => {
      const ok = BIBLE_BOOKS.map((b, i) => [b, i, BOOK_TOTALS[b] || 0]).filter(x => x[2] >= 12 && x[2] <= 40);
      return ok[Math.floor(ok.length / 2)] || null;
    });
    await A.p.locator('.bk-choix[data-i="' + choix[1] + '"]').tap();
    await attends(1200);
    const apres = await A.p.evaluate(() => ({ page: !!document.getElementById('livreVeil'), livre: net.livre,
      puce: (document.querySelector('.puce-bk') || {}).textContent, puceSel: !!document.querySelector('.puce-bk.sel'),
      testamentsSel: document.querySelectorAll('.len-chip[data-rgroup="theme"].sel:not(.puce-bk)').length, ecran: state.screen }));
    dit('choisir un livre : la puce le porte, les testaments s\'éteignent, retour au salon',
      !apres.page && apres.livre === choix[0] && apres.puceSel && apres.testamentsSel === 0 && apres.ecran === 'online-room', JSON.stringify(apres));

    /* ---- 4 ---- */
    await A.p.evaluate(() => hostStart());
    await attends(2200);
    const pa = await paquet(A), pb = await paquet(B);
    const attendu = Math.min(3 * 5, choix[2]);
    dit('tout le monde joue les mêmes questions', pa.n > 0 && JSON.stringify(pa.cles) === JSON.stringify(pb.cles), pa.n + ' / ' + pb.n);
    dit('… toutes tirées du livre choisi', pa.livres.length === 1 && pa.livres[0] === choix[0], pa.livres.join(', '));
    dit('… autant que la longueur choisie (ou tout le livre)', pa.n === attendu, pa.n + ' pour ' + attendu + ' (' + choix[2] + ' au livre)');
    dit('le titre de la partie est le nom du livre', pa.titre && pb.titre && pa.titre === pb.titre && pa.titre !== 'Duel', pa.titre + ' / ' + pb.titre);

    /* ---- 5 ---- */
    await Promise.all([finir(A), finir(B)]);
    await attends(2500);
    await A.p.evaluate(() => onlineRematch()); await attends(800);
    await B.p.evaluate(() => onlineRematch()); await attends(2500);
    const ra = await paquet(A), rb = await paquet(B);
    dit('« Rejouer » garde le livre', ra.ecran === 'online-play' && ra.livres.length === 1 && ra.livres[0] === choix[0] && JSON.stringify(ra.cles) === JSON.stringify(rb.cles) && JSON.stringify(ra.cles) !== JSON.stringify(pa.cles),
      ra.ecran + ' ; ' + ra.livres.join(', '));

    /* ---- 6 ---- */
    await A.p.evaluate(() => { quitterFinEnLigne(); });
    await B.p.evaluate(() => { quitterFinEnLigne(); });
    await attends(1200);
    await salon(A, B);
    await A.p.evaluate((i) => { ouvrirChoixLivre(); setTimeout(() => choisirLivreSalon(i), 900); }, choix[1]);
    await attends(1600);
    await A.p.locator('.len-chip[data-rgroup="theme"][data-k="nt"]').tap();
    await attends(700);
    const oubli = await A.p.evaluate(() => ({ livre: net.livre, puce: (document.querySelector('.puce-bk') || {}).textContent, theme: net.themeKey }));
    dit('toucher un testament oublie le livre', oubli.livre === null && oubli.puce === 'Un livre' && oubli.theme === 'nt', JSON.stringify(oubli));
    await A.p.evaluate(() => { leaveRoomToOnline(); }); await B.p.evaluate(() => { leaveRoomToOnline(); });
    await attends(1000);

    /* ---- 7 ---- */
    const C = await ouvre('Marc', '#7BC86B', true);
    await salon(A, C);
    await A.p.evaluate((i) => { ouvrirChoixLivre(); setTimeout(() => choisirLivreSalon(i), 900); }, choix[1]);
    await attends(1600);
    await A.p.evaluate(() => { window.__mots = []; const v = showMiniToast; showMiniToast = (t) => { window.__mots.push(t); return v(t); }; hostStart(); });
    await attends(2200);
    const va = await paquet(A), vc = await paquet(C);
    const mot = await A.p.evaluate(() => window.__mots.join(' | '));
    const testamentDuLivre = await A.p.evaluate((b) => (BIBLE_BOOKS.indexOf(b) < BIBLE_AT_COUNT) ? 'at' : 'nt', choix[0]);
    dit('invité d\'avant : la manche part sur le testament du livre, mêmes questions des deux côtés',
      va.n > 0 && va.livreJeu === null && va.theme === testamentDuLivre && JSON.stringify(va.cles) === JSON.stringify(vc.cles), va.theme + ', ' + va.n + ' questions');
    dit('… et l\'hôte en est prévenu', /mettre le jeu à jour/.test(mot), mot.slice(0, 90));

    dit('aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    try { serveur.close(); } catch (e) {}
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — en ligne et dans les groupes, on joue un livre, tous ensemble');
  process.exit(ko ? 1 : 0);
})();
