/* ====== BANC « LA FLAMME DU JOUR, FÊTÉE ; PUIS LES RAPPELS » (v343) ======
   « Lorsque je termine une série et que j'ai gagné une flamme, j'ai besoin
     de le savoir directement, juste après ma partie, comme sur Duolingo. »
   « Il faut bien leur afficher les rappels : à un certain moment, il faut
     qu'ils aient un bouton pour activer les rappels, parce que la plupart ne
     les activent pas. »
   Une vraie partie Solo jouée jusqu'au bout, dans le vrai code du jeu :
     1. première partie du jour (hier joué, 4 jours) : après les résultats,
        la carte de la flamme s'ouvre — « 5 », « 5 jours d'affilée ! », la
        case du jour en or, un seul bouton « Continuer » ;
     2. pendant qu'elle est ouverte, les bandeaux (objectifs, gels) attendent ;
     3. « Continuer » la referme, et les bandeaux reprennent ;
     4. une deuxième partie le même jour : pas de fête ;
     5. la toute première partie d'un joueur : « Ta flamme est allumée ! », 1 ;
     6. jeu installé, rappels jamais demandés : après « Continuer », la carte
        des rappels — « Activer les rappels » et « Plus tard » ;
     7. « Plus tard » la referme sans rien demander au téléphone ; le
        lendemain elle ne revient pas (trois jours d'écart au moins), trois
        jours plus tard si, et jamais plus de trois fois en tout ;
     8. « Activer les rappels » demande l'autorisation DANS le toucher ;
     9. rappels déjà acceptés, ou refusés par le téléphone : jamais la carte ;
    10. en anglais : « 5 days in a row! », « Continue », « Turn on reminders » ;
    11. aucune erreur.
   Usage : node banc-essai/fete-flamme.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 300) + ')' : '')); };

const PARTIE = () => new Promise(res => {
  /* Une partie solo menée à sa dernière question, puis finie comme le joueur. */
  state.mode = 'solo'; startGame();
  state.currentIndex = state.questions.length - 1; state.revealed = true; state.soloSelected = 0;
  const t0 = performance.now(); let tFin = null;
  const tic = () => { if (tFin === null && state.screen === 'end') tFin = performance.now() - t0; if (performance.now() - t0 < 2600) requestAnimationFrame(tic); else res({ tFin }); };
  requestAnimationFrame(tic);
  setTimeout(() => nextQuestion(), 60);
});
const CARTE = () => {
  const v = document.getElementById('modalVeil'); const f = v && !v.classList.contains('closing') && v.querySelector('.fete-flamme');
  const r = document.getElementById('modalVeil'); const i = r && !r.classList.contains('closing') && r.querySelector('.invit-rappels');
  return {
    fete: !!f, n: f ? f.querySelector('.ff-apres').textContent : '', titre: f ? f.querySelector('.modal-title').textContent : '',
    bouton: f ? f.querySelector('#modalOk').textContent : '', boutons: f ? f.querySelectorAll('button').length : 0,
    jour: f ? !!f.querySelector('.ff-sem .sj.auj.fait') : false,
    invit: !!i, oui: i ? i.querySelector('#modalOk').textContent : '', non: i ? i.querySelector('#modalCancel').textContent : '',
    toast: !!document.querySelector('.ach-toast'),
  };
};
const jour = (d) => { const t = new Date(Date.now() + d * 86400000), z = n => String(n).padStart(2, '0'); return t.getFullYear() + '-' + z(t.getMonth() + 1) + '-' + z(t.getDate()); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const telephone = async (langue, daily, installe) => {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(([langue, daily]) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      if (langue) localStorage.setItem('bt_langue', langue);
      if (daily) localStorage.setItem('bt_daily', JSON.stringify(daily));
    }, [langue, daily]);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.waitForTimeout(700);
    if (installe) await p.evaluate(() => {
      window.__demandes = 0; window.notifPossible = () => true; window.notifEtat = () => window.__etat || 'default';
      window.notifActiver = () => { window.__demandes++; window.__dansGeste = !!(navigator.userActivation && navigator.userActivation.isActive); return Promise.resolve(true); };
    });
    return { ctx, p };
  };
  const hier4 = { last: jour(-1), streak: 4, jours: [jour(-4), jour(-3), jour(-2), jour(-1)], geles: [], gels: 0, palier: 0 };
  try {
    /* ---- 1 à 4 ---- */
    let { ctx, p } = await telephone(null, hier4, false);
    await p.evaluate(() => { achToastQueue.push({ clr: 'gold', ico: '', tete: 'Objectif débloqué', t: 'Essai' }); });
    const r1 = await p.evaluate(PARTIE);
    const c1 = await p.evaluate(CARTE);
    dit('1. première partie du jour : la flamme se fête après les résultats — « 5 », « 5 jours d\'affilée ! », la case du jour en or, « Continuer » seul',
      r1.tFin !== null && c1.fete && c1.n === '5' && /^5 jours d'affilée/.test(c1.titre) && c1.jour && c1.bouton === 'Continuer' && c1.boutons === 1, JSON.stringify(c1));
    dit('2. … et les bandeaux attendent qu\'elle soit refermée', !c1.toast, 'bandeau visible : ' + c1.toast);
    await p.evaluate(() => document.querySelector('#modalVeil .fete-flamme #modalOk').click());
    await p.waitForTimeout(900);
    const c3 = await p.evaluate(CARTE);
    dit('3. « Continuer » la referme ; les bandeaux reprennent (pas de rappels hors du jeu installé)', !c3.fete && !c3.invit && c3.toast, JSON.stringify(c3));
    await p.waitForTimeout(5200);
    await p.evaluate(PARTIE);
    const c4 = await p.evaluate(CARTE);
    dit('4. deuxième partie le même jour : pas de fête', !c4.fete, JSON.stringify(c4));
    await ctx.close();

    /* ---- 5 ---- */
    ({ ctx, p } = await telephone(null, null, false));
    await p.evaluate(PARTIE);
    const c5 = await p.evaluate(CARTE);
    dit('5. toute première partie : « Ta flamme est allumée ! », 1', c5.fete && c5.n === '1' && /allumée/.test(c5.titre), JSON.stringify(c5));
    await ctx.close();

    /* ---- 6 à 8 ---- */
    ({ ctx, p } = await telephone(null, hier4, true));
    await p.evaluate(PARTIE);
    await p.evaluate(() => document.querySelector('#modalVeil .fete-flamme #modalOk').click());
    await p.waitForTimeout(500);
    const c6 = await p.evaluate(CARTE);
    dit('6. jeu installé : après « Continuer », la carte des rappels — « Activer les rappels », « Plus tard »', c6.invit && c6.oui === 'Activer les rappels' && c6.non === 'Plus tard', JSON.stringify(c6));
    await p.evaluate(() => document.querySelector('#modalVeil .invit-rappels #modalCancel').click());
    await p.waitForTimeout(500);
    const m7 = await p.evaluate(() => ({ dem: window.__demandes, ask: JSON.parse(localStorage.getItem('bt_notif_ask') || 'null'), carte: !!document.querySelector('#modalVeil:not(.closing)') }));
    /* Le lendemain, puis trois jours plus tard : on rejoue la fête par la fonction elle-même. */
    const relance = (decalJours) => p.evaluate((d) => { const o = JSON.parse(localStorage.getItem('bt_notif_ask')); o.t = Date.now() - d * 86400000; localStorage.setItem('bt_notif_ask', JSON.stringify(o)); return notifProposer(false, null); }, decalJours);
    const lendemain = await relance(1);
    await p.evaluate(() => closeModal()); await p.waitForTimeout(300);
    const troisJours = await relance(3.2);
    await p.waitForTimeout(300);
    const c7 = await p.evaluate(CARTE);
    await p.evaluate(() => document.querySelector('#modalVeil .invit-rappels #modalCancel').click()); await p.waitForTimeout(400);
    const troisieme = await relance(3.2); await p.evaluate(() => closeModal()); await p.waitForTimeout(300);
    const quatrieme = await relance(9);
    dit('7. « Plus tard » : rien demandé au téléphone ; pas le lendemain ; trois jours plus tard si ; jamais plus de trois fois',
      m7.dem === 0 && m7.ask && m7.ask.n === 1 && !m7.carte && lendemain === false && troisJours === true && c7.invit && troisieme === true && quatrieme === false,
      JSON.stringify({ m7, lendemain, troisJours, troisieme, quatrieme }));
    await p.evaluate(() => { localStorage.removeItem('bt_notif_ask'); closeModal(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => notifProposer(false, null));
    await p.waitForTimeout(300);
    const cdp = await ctx.newCDPSession(p);
    const pt = await p.evaluate(() => { const b = document.querySelector('#modalVeil .invit-rappels #modalOk').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] }); await p.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
    const m8 = await p.evaluate(() => ({ dem: window.__demandes, geste: window.__dansGeste }));
    dit('8. « Activer les rappels » demande l\'autorisation, dans le toucher même', m8.dem === 1 && m8.geste === true, JSON.stringify(m8));
    /* ---- 9 ---- */
    await p.evaluate(() => { localStorage.removeItem('bt_notif_ask'); window.__etat = 'denied'; });
    const refuse = await p.evaluate(() => notifProposer(false, null));
    await p.evaluate(() => { window.__etat = 'default'; settings.notif = true; });
    const accepte = await p.evaluate(() => notifProposer(false, null));
    dit('9. refusés par le téléphone, ou déjà acceptés : jamais la carte', refuse === false && accepte === false, JSON.stringify({ refuse, accepte }));
    await ctx.close();

    /* ---- 10 ---- */
    ({ ctx, p } = await telephone('en', hier4, true));
    await p.evaluate(PARTIE);
    const e1 = await p.evaluate(CARTE);
    await p.evaluate(() => document.querySelector('#modalVeil .fete-flamme #modalOk').click());
    await p.waitForTimeout(500);
    const e2 = await p.evaluate(CARTE);
    dit('10. en anglais : « ' + e1.titre + ' », « ' + e1.bouton + ' », « ' + e2.oui + ' », « ' + e2.non + ' »',
      /^5 days in a row!$/.test(e1.titre) && e1.bouton === 'Continue' && e2.oui === 'Turn on reminders' && e2.non === 'Later', JSON.stringify({ e1, e2 }));
    await ctx.close();
  } catch (e) { console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 400)); ko++; }
  dit('11. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la flamme du jour se fête juste après la partie, puis les rappels se proposent avec un bouton');
  process.exit(ko ? 1 : 0);
})();
