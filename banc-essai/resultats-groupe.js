/* ====== LES RÉSULTATS DU MODE GROUPE : UN PODIUM QUI SE LIT (v319) ======
   « Je trouve cette page pas forcément au goût du jour : je veux qu'elle soit
     top, et cohérente avec le reste de l'app. » (capture de Taylor : trois
     joueurs à égalité, « Ex æquo en tête ! »)
   Le podium était posé à même la photo — « Joueur 3 » en encre sur les
   rochers, les scores en corail sur le ciel — avec trois blocs dorés coupés
   net en dessous. Il devient une carte de verre, et ses marches se posent
   sur le bas de la carte. Ce banc vérifie, sur iPhone :
     1. trois joueurs, un vainqueur : le podium est une carte de verre, et le
        nom comme le score de chaque joueur sont posés SUR elle (ce qu'on
        trouve sous leur centre appartient à la carte, pas à la photo) ;
     2. les marches : or au milieu, la plus haute, puis argent, puis bronze —
        et toutes posées sur le bas de la carte, au pixel ;
     3. deux premiers ex æquo : deux marches d'or de même hauteur, puis un
        bronze marqué 3 (pas 2 : deux joueurs devant) ;
     4. tout le monde premier (six joueurs à zéro) : pas de podium, et la page
        tient sur l'écran sans défiler — « Rejouer » visible ;
     5. à l'arrivée de l'écran, les marches montent sans jamais redescendre ;
     6. aucune erreur.
   Usage : node banc-essai/resultats-groupe.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    const finir = async (noms, scores) => {
      await p.evaluate(([n, s]) => { state.mode = 'group'; state.teams = n.map(x => ({ name: x })); startGame(); state.scores = s.slice(); state.screen = 'end'; render(); }, [noms, scores]);
      await p.waitForTimeout(1800);
    };
    const lire = () => p.evaluate(() => {
      const carte = document.querySelector('#app > .screen:not(.screen-exit) .podium');
      if (!carte) return { carte: false };
      const rc = carte.getBoundingClientRect();
      const sur = (el) => { const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && carte.contains(t); };
      const cols = [...carte.querySelectorAll('.podium-col')].map(c => {
        const bar = c.querySelector('.podium-bar'), rb = bar.getBoundingClientRect();
        return { nom: c.querySelector('.podium-name').textContent, rang: bar.textContent.trim(), cls: bar.className.replace('podium-bar', '').trim(),
          h: +rb.height.toFixed(1), bas: +(rc.bottom - rb.bottom).toFixed(2),
          lisible: sur(c.querySelector('.podium-name')) && sur(c.querySelector('.podium-score')) };
      });
      return { carte: true, verre: carte.classList.contains('card') && carte.classList.contains('has-gs'), cols };
    });
    /* ---- 1-2 ---- */
    await finir(['Taylor', 'Ana', 'Léo'], [120, 80, 40]);
    const a = await lire();
    dit('1. un vainqueur : le podium est une carte de verre, noms et scores posés dessus', a.carte && a.verre && a.cols.length === 3 && a.cols.every(c => c.lisible),
      a.carte ? a.cols.map(c => c.nom + (c.lisible ? '' : ' (SUR LA PHOTO)')).join(', ') : 'pas de podium');
    const [g, m, d] = a.cols || [];
    dit('2. or au milieu et le plus haut, puis argent, puis bronze — toutes posées sur le bas de la carte',
      !!(g && m && d) && m.cls === 'p1' && g.cls === 'p2' && d.cls === 'p3' && m.h > g.h && g.h > d.h && a.cols.every(c => Math.abs(c.bas) <= 0.5),
      a.cols ? a.cols.map(c => c.nom + ' ' + c.cls + ' ' + c.h + ' px, écart au bas ' + c.bas).join(' | ') : '');
    /* ---- 3 ---- */
    await finir(['Taylor', 'Ana', 'Léo'], [80, 80, 40]);
    const b = await lire();
    const ors = (b.cols || []).filter(c => c.cls === 'p1'), bronze = (b.cols || []).find(c => c.cls === 'p3');
    dit('3. deux premiers ex æquo : deux marches d\'or de même hauteur, puis un bronze marqué 3', ors.length === 2 && ors[0].h === ors[1].h && !!bronze && bronze.rang === '3',
      (b.cols || []).map(c => c.nom + ' ' + c.cls + ' « ' + c.rang + ' » ' + c.h).join(' | '));
    /* ---- 4 ---- */
    await finir(['Taylor', 'Joueur 2', 'Joueur 3', 'Joueur 4', 'Joueur 5', 'Joueur 6'], [0, 0, 0, 0, 0, 0]);
    const c = await lire();
    const tient = await p.evaluate(() => { const a = document.getElementById('app'); const r = document.querySelector('#app > .screen:not(.screen-exit) .btn-replay').getBoundingClientRect();
      return { deborde: a.scrollHeight - a.clientHeight, rejouer: r.bottom <= innerHeight }; });
    dit('4. tout le monde premier : pas de podium, la page tient, « Rejouer » visible', !c.carte && tient.deborde <= 1 && tient.rejouer,
      'podium ' + c.carte + ', débordement ' + tient.deborde + ' px, Rejouer visible ' + tient.rejouer);
    /* ---- 5 ---- */
    await p.evaluate(() => { state.mode = 'group'; state.teams = [{ name: 'Taylor' }, { name: 'Ana' }, { name: 'Léo' }]; startGame(); state.screen = 'play'; render(); });
    await p.waitForTimeout(1200);
    const film = p.evaluate(() => new Promise(res => { const l = []; const t0 = performance.now();
      const tic = () => { const bars = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .podium-bar')];
        if (bars.length) l.push(bars.map(x => x.getBoundingClientRect().top - x.parentElement.getBoundingClientRect().top));
        if (performance.now() - t0 < 1400) requestAnimationFrame(tic); else res(l); };
      requestAnimationFrame(tic); }));
    await p.evaluate(() => { state.scores = [120, 80, 40]; state.screen = 'end'; render(); });
    const l = await film;
    let recul = 0; for (let i = 1; i < l.length; i++) for (let k = 0; k < l[i].length; k++) if (l[i][k] > l[i - 1][k] + 0.05) recul = Math.max(recul, l[i][k] - l[i - 1][k]);
    const depart = l.length ? Math.min(...l[0]) : 0, arrivee = l.length ? Math.max(...l[l.length - 1].map(Math.abs)) : 99;
    dit('5. à l\'arrivée, les marches montent sans jamais redescendre', l.length > 10 && depart > 20 && arrivee < 0.5 && recul === 0,
      l.length + ' images, départ ' + depart.toFixed(1) + ' px sous le socle, arrivée ' + arrivee.toFixed(2) + ', plus grand recul ' + recul.toFixed(2) + ' px');
    await ctx.close();
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  }
  dit('6. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le podium du Mode Groupe se lit, et il est posé');
  process.exit(ko ? 1 : 0);
})();
