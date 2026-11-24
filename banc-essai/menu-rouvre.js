/* ====== LE MENU D'UN MESSAGE NE « SE ROUVRE » PLUS (v378) ======
   « Vérifie l'animation lors de l'ouverture de cette page parce que
     maintenant on dirait qu'elle s'ouvre puis qu'elle se rouvre une deuxième
     fois. » (Capture de Taylor : le menu d'une carte de partie terminée —
     Répondre, Signaler, Gérer —, tenu au doigt sur iPhone.)
   La cause est dans Safari : une montée confiée à Core Animation, sans
   remplissage arrière, montre d'abord la valeur COURANTE de la propriété —
   la feuille déjà ouverte — puis part d'en bas. Chromium ne le fait pas : ce
   banc vérifie donc la RÈGLE qui l'empêche, et le geste lui-même :
     1. appui long sur la carte d'une partie terminée : le menu s'ouvre une
        fois, une seule montée ;
     2. sa montée tient sa première image avant de partir (fill « backwards »),
        sans la garder à la fin (pas « both » : la feuille du dessous doit
        pouvoir reculer) ;
     3. une page (Réglages) et une fenêtre font de même ;
     4. demander de nouveau le menu du même message ne le refait pas (même
        élément, aucune nouvelle montée) ;
     5. un toucher ANNULÉ après l'ouverture (iOS reprend parfois la main) :
        le clic qui suit ne referme rien et n'ouvre pas le récap ;
     6. aucune erreur.
   Usage : node banc-essai/menu-rouvre.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };
const attends = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route('**/*.supabase.co/**', r => r.abort());
  await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  await p.evaluate(() => {
    document.documentElement.classList.add('is-standalone');
    compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
    grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false, reponses: true };
    grp.liste = [{ id: 'g1', nom: 'Les Dauber', teinte: 2, non_lus: 0, nb_membres: 3, code: '7UHF5T', role: 'proprietaire' }];
    grp.membres = { g1: [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null }, { membre: 'u-2', role: 'membre', muet_jusqu: null }] };
    grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Coryne', couleur: '#E8574C' } };
    const t = Date.now(), msgs = [];
    for (let i = 1; i <= 6; i++) msgs.push({ id: i, groupe: 'g1', auteur: i % 3 ? 'u-2' : 'moi-0', genre: 'texte', texte: 'Message numéro ' + i, cree_le: new Date(t - (90 - i) * 60000).toISOString() });
    msgs.push({ id: 7, groupe: 'g1', auteur: 'u-2', genre: 'partie', texte: '', cree_le: new Date(t - 70 * 60000).toISOString(),
      donnees: { code: 'ABCD', fermee: true, venus: [{ id: 'moi-0', nom: 'Taylor' }], scores: { 'u-2': [90, 5], 'moi-0': [60, 4] }, total: 6 } });
    grp.fils = { g1: { charge: true, tout: true, messages: msgs } };
    grp.courant = 'g1'; state.screen = 'groupe'; render();
    window.__montees = 0;
    document.addEventListener('animationstart', (e) => { if (e.animationName === 'sheetIn') window.__montees++; }, true);
  });
  await attends(1500);
  const cdp = await ctx.newCDPSession(p);
  const carte = async () => p.evaluate(() => { const b = document.querySelector('#fil .b-partie'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 12 }; });
  const etat = () => p.evaluate(() => {
    const vs = document.querySelectorAll('#grpActionsVeil'), v = vs[vs.length - 1];
    const f = v && v.querySelector('.settings-sheet');
    const cs = f && getComputedStyle(f);
    return { n: vs.length, ouvert: !!v && !v.classList.contains('closing'), montees: window.__montees,
      nom: cs ? cs.animationName : '', remplit: cs ? cs.animationFillMode : '', recap: !!document.querySelector('#grpRecapVeil:not(.closing)') };
  });
  const fermer = async () => { await p.evaluate(() => { try { fermerFeuilleGroupe('grpActionsVeil'); fermerFeuilleGroupe('grpRecapVeil'); } catch (e) {} }); await attends(700); };

  /* 1-2 */
  let b = await carte(); await attends(250);
  await p.evaluate(() => { window.__montees = 0; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] });
  await attends(520);
  const e1 = await etat();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await attends(900);
  const e2 = await etat();
  dit('appui long sur la carte d\'une partie terminée : le menu s\'ouvre une fois, une seule montée', e2.ouvert && e2.n === 1 && e2.montees === 1 && !e2.recap, JSON.stringify(e2));
  dit('sa montée tient sa première image avant de partir (backwards), sans la garder à la fin', e1.nom === 'sheetIn' && e1.remplit === 'backwards', JSON.stringify(e1));
  /* 4 */
  const avant = await p.evaluate(() => { const v = document.getElementById('grpActionsVeil'); v.__marque = 1; return window.__montees; });
  await p.evaluate(() => actionsMessage('7'));
  await attends(700);
  const e4 = await p.evaluate(() => { const v = document.getElementById('grpActionsVeil'); return { meme: !!(v && v.__marque === 1), montees: window.__montees, n: document.querySelectorAll('#grpActionsVeil').length }; });
  dit('redemander le menu du même message ne le refait pas (même élément, aucune nouvelle montée)', e4.meme && e4.n === 1 && e4.montees === avant, JSON.stringify(e4) + ' avant ' + avant);
  await fermer();
  /* 5 */
  b = await carte(); await attends(250);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] });
  await attends(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await attends(40);
  /* Le clic que le téléphone pourrait envoyer en fin d'appui, là où était le doigt. */
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await attends(800);
  const e5 = await etat();
  dit('toucher annulé après l\'ouverture : le clic qui suit ne referme rien et n\'ouvre pas le récap', e5.ouvert && !e5.recap, JSON.stringify(e5));
  await fermer();
  /* 3 */
  await p.evaluate(() => { state.screen = 'mode'; render(); });
  await attends(600);
  const page = await p.evaluate(async () => {
    openSettings();
    await new Promise(r => setTimeout(r, 60));
    const v = document.querySelector('#settingsVeil');
    const cs = v && getComputedStyle(v);
    const r = { nom: cs ? cs.animationName : '', remplit: cs ? cs.animationFillMode : '' };
    try { closeSettings(); } catch (e) {}
    return r;
  });
  dit('une page (Réglages) entre de même (pageIn, backwards)', page.nom === 'pageIn' && page.remplit === 'backwards', JSON.stringify(page));
  await attends(700);
  const fen = await p.evaluate(async () => {
    showModal({ title: 'Essai', text: 'Une fenêtre', okText: 'OK' });
    await new Promise(r => setTimeout(r, 60));
    const c = document.querySelector('#modalVeil .modal-card');
    const cs = c && getComputedStyle(c);
    const r = { nom: cs ? cs.animationName : '', remplit: cs ? cs.animationFillMode : '' };
    try { closeModal(); } catch (e) {}
    return r;
  });
  dit('une fenêtre entre de même (backwards)', /modalIn/.test(fen.nom) && /backwards/.test(fen.remplit), JSON.stringify(fen));
  dit('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — le menu monte une fois, et tient sa première image');
  process.exit(ko ? 1 : 0);
})();
