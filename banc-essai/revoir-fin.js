/* ====== « À REVOIR » : CE QUI RESTE, ET UNE PAGE QUI TIENT (v364) ======
   « Lorsqu'il me reste une série et précisément une erreur, au moment où ça
     revient à l'accueil et que je veux revoir ma dernière erreur, ça me dit
     que j'ai terminé. Sauf que j'ai pas terminé. »
   « Ici, je ne veux pas qu'on puisse swiper vers le bas. »
   Six erreurs récentes, une séance de cinq, toutes justes :
     1. la fin de séance ne dit PAS « Tout est rattrapé » : « Séance
        parfaite ! », « 1 encore à rattraper », et le bouton dit
        « Continuer » (à côté de « Quitter ») ;
     2. « Continuer » joue la dernière ; juste, elle donne cette fois « Tout
        est rattrapé ! », « Plus rien à rattraper », et un seul bouton,
        « Continuer », qui ramène sur « À revoir » — où tout est rattrapé ;
     3. une séance ratée ne se dit jamais « Tout est rattrapé » ;
     4. l'écran « À revoir » tient dans le téléphone et ne défile pas (on ne
        peut pas le tirer), du plus petit iPhone au plus grand, avec 1, 5 ou
        15 erreurs ; une question y tient en deux lignes au plus, et le
        bouton « Seconde chance » reste entier à l'écran ;
     5. aucune erreur.
   Usage : node banc-essai/revoir-fin.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };
const net = (t) => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

async function ouvrir(nav, w, h) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(() => { if (sessionStorage.getItem('pose')) return; sessionStorage.setItem('pose', '1');
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  await p.evaluate(() => { document.documentElement.requestFullscreen = null; });
  return { ctx, p };
}
/* n erreurs récentes, jamais rattrapées */
const semer = (p, n) => p.evaluate((n) => { const t = Date.now(); const a = []; const qs = BANK.moyen.slice(20, 20 + n);
  qs.forEach((q, i) => a.push({ k: qKey(q), n: 1, p: 0, du: dayKey(1), maj: t - i * 3600e3, rate: t - i * 3600e3, q: q.q, options: q.options, correct: q.correct, fact: q.fact, tier: 'moyen' }));
  saveErrbook(a); state.screen = 'revoir'; render(); }, n);
/* Répondre à toute la séance : juste, ou faux pour les numéros donnés. */
async function jouerSeance(p, faux) {
  const nq = await p.evaluate(() => state.questions.length);
  for (let i = 0; i < nq; i++) {
    await p.evaluate(([rater]) => { const q = state.questions[state.currentIndex];
      const btns = [...document.querySelectorAll('.options-grid .option-btn')];
      const net = (t) => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[A-D]\s*/, '');
      const bonne = btns.find(b => net(b.innerText) === net(T(q.correct)) || net(b.innerText) === net(q.correct));
      const t = rater ? btns.find(b => b !== bonne) : bonne;
      (t || btns[0]).click(); }, [faux.includes(i)]);
    await p.waitForTimeout(350);
    await p.evaluate(() => { const n = document.querySelector('.btn-next'); if (n) n.click(); });
    await p.waitForTimeout(450);
  }
  await p.waitForFunction(() => state.screen === 'end', null, { timeout: 6000 }).catch(() => {});
  await p.waitForTimeout(500);
}
const fin = (p) => p.evaluate(() => ({ ecran: state.screen, titre: (document.querySelector('.end-title') || {}).innerText, reste: (document.querySelector('.end-hero .end-best') || {}).innerText,
  boutons: [...document.querySelectorAll('.end-actions button')].map(b => b.innerText.trim()), aRatt: aRattraper().length }));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    /* 1 et 2 */
    const { ctx, p } = await ouvrir(nav, 390, 844);
    await semer(p, 6); await p.waitForTimeout(700);
    await p.evaluate(() => lancerRevision()); await p.waitForTimeout(700);
    await jouerSeance(p, []);
    const f1 = await fin(p);
    dit('1. cinq sur cinq, une erreur encore : « Séance parfaite ! », « 1 encore à rattraper », « Continuer » et « Quitter » — pas « Tout est rattrapé »',
      f1.ecran === 'end' && net(f1.titre) === 'Séance parfaite !' && /1 encore à rattraper/.test(net(f1.reste)) && f1.aRatt === 1
      && f1.boutons.length === 2 && f1.boutons[0] === 'Continuer' && f1.boutons[1] === 'Quitter', JSON.stringify(f1));
    await p.evaluate(() => { document.querySelectorAll('.modal-veil').forEach(m => { const b = m.querySelector('.modal-btn.ok, .modal-btn'); if (b) b.click(); }); document.querySelector('.end-actions .btn-replay').click(); }); await p.waitForTimeout(900);
    const q2 = await p.evaluate(() => ({ ecran: state.screen, n: state.questions.length, revision: state.revision }));
    await jouerSeance(p, []);
    const f2 = await fin(p);
    await p.evaluate(() => { document.querySelectorAll('.modal-veil').forEach(m => { const b = m.querySelector('.modal-btn.ok, .modal-btn'); if (b) b.click(); }); document.querySelector('.end-actions .btn-replay').click(); }); await p.waitForTimeout(1200);
    const apres = await p.evaluate(() => ({ ecran: state.screen, txt: (document.querySelector('.rv-chiffres') || {}).innerText }));
    dit('2. « Continuer » joue la dernière ; juste : « Tout est rattrapé ! », un seul bouton, qui ramène sur « À revoir », où tout est rattrapé',
      q2.ecran === 'play' && q2.n === 1 && q2.revision === true && net(f2.titre) === 'Tout est rattrapé !' && /Plus rien à rattraper/.test(net(f2.reste))
      && f2.boutons.length === 1 && f2.boutons[0] === 'Continuer' && apres.ecran === 'revoir' && /Tout est rattrapé/.test(net(apres.txt)),
      JSON.stringify({ q2, f2, apres }));
    /* 3 */
    await semer(p, 3); await p.waitForTimeout(600);
    await p.evaluate(() => lancerRevision()); await p.waitForTimeout(700);
    await jouerSeance(p, [1]);
    const f3 = await fin(p);
    dit('3. une séance avec une erreur ne se dit jamais « Tout est rattrapé » : « 2 rattrapées sur 3 », « 1 encore à rattraper »',
      net(f3.titre) === '2 rattrapées sur 3' && /1 encore à rattraper/.test(net(f3.reste)) && f3.boutons[0] === 'Continuer', JSON.stringify(f3));
    p._errs.forEach(e => errs.push(e));
    await ctx.close();

    /* 4 */
    const mal = [];
    for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) for (const n of [1, 5, 15]) {
      const o = await ouvrir(nav, w, h);
      await semer(o.p, n); await o.p.waitForTimeout(1300);
      const m = await o.p.evaluate(async () => {
        const a = document.getElementById('app');
        const avant = a.scrollTop; a.scrollTop = 200; const bouge = a.scrollTop; a.scrollTop = avant;
        const lignes = [...document.querySelectorAll('.rv-q')].map(q => Math.round(q.getBoundingClientRect().height / parseFloat(getComputedStyle(q).lineHeight)));
        const b = document.querySelector('.rv-go'); const rb = b && b.getBoundingClientRect();
        return { sh: a.scrollHeight, ch: a.clientHeight, ov: getComputedStyle(a).overflowY, bouge, lignes, bouton: rb ? [Math.round(rb.top), Math.round(rb.bottom)] : null, h: innerHeight };
      });
      if (m.sh > m.ch + 1 || m.ov !== 'hidden' || m.bouge !== 0 || m.lignes.some(l => l > 2) || !m.bouton || m.bouton[1] > m.h || m.bouton[0] < 0) mal.push(w + 'x' + h + '/' + n + ' ' + JSON.stringify(m));
      o.p._errs.forEach(e => errs.push(e));
      await o.ctx.close();
    }
    dit('4. « À revoir » tient dans le téléphone et ne se laisse pas tirer (320×568 à 430×932, 1, 5 ou 15 erreurs) ; deux lignes au plus par question ; le bouton entier à l\'écran',
      mal.length === 0, mal.slice(0, 3).join(' | '));
  } catch (e) { errs.push('banc : ' + e.message); }
  dit('5. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — « Tout est rattrapé » seulement quand c\'est vrai, et « À revoir » tient sans glisser');
  process.exit(ko ? 1 : 0);
})();
