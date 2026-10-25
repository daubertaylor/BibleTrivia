/* ====== BANC « RÉVÉLÉE, LA QUESTION GARDE SON CHRONO, ARRÊTÉ » (v335) ======
   Le chrono disparaissait à la réponse, et les pastilles d'à côté se
   répartissaient aussitôt autrement : « 1/15 » sautait d'une quarantaine de
   pixels vers le milieu en Solo, jusqu'au bord en Groupe et En ligne, puis
   revenait à la question suivante. Sur un iPhone :
     1. Solo : on répond juste (la série passe de 0 à 1) ; aucune pastille
        ne bouge, le chrono reste à sa place, arrêté sur le temps qui restait
        (adouci, sans id : le décompte ne le touche plus) ;
     2. Solo : en passant sous les dix secondes, le chrono garde sa largeur
        (rien ne glisse) ; le temps s'écoule, et le chrono arrêté dit « 0 s »,
        sans le rouge qui bat ;
     3. Groupe : « Voir la réponse » ; aucune pastille ne bouge ;
     4. sans chrono (« Sans limite ») : rien n'apparaît, rien ne bouge ;
     5. Seconde chance : pas de chrono, ni avant ni après ;
     6. une partie révélée, reprise après une relance : le chrono arrêté dit
        toujours le temps qui restait ;
     7. quitter une partie à la première question, puis en commencer une
        autre : la nouvelle première question arrive avec son entrée, et son
        chrono part (le jeu la croyait déjà affichée : même numéro, 0) ;
     8. En ligne, deux joueurs (le serveur temps réel local, hub.js) : aucune
        pastille ne bouge à la révélation, chez l'un comme chez l'autre ;
     9. aucune erreur.
   Avant la v335 : 1, 2, 3, 6, 7 et 8 rouges.
   Usage : node banc-essai/chrono-fige.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const PORT = 8248;
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };
const attends = (ms) => new Promise(r => setTimeout(r, ms));

/* Les pastilles du haut de la partie : où elles sont, et le chrono. */
const PASTILLES = () => {
  const m = document.querySelector('.play-meta');
  if (!m) return null;
  const g = (s) => { const e = m.querySelector(s); return e ? Math.round(e.getBoundingClientRect().left * 10) / 10 : null; };
  const t = m.querySelector('.timer-chip');
  return { niveau: g('.tier-chip'), compteur: g('.q-counter'), serie: g('.streak-chip'),
    chrono: t ? { x: g('.timer-chip'), id: t.id || '', fige: t.classList.contains('fige'), rouge: t.classList.contains('low'),
      bat: getComputedStyle(t).animationName !== 'none', texte: (t.querySelector('.tv-n') || t).textContent.trim(), large: Math.round(t.getBoundingClientRect().width * 10) / 10 } : null };
};
const memes = (a, b) => !!a && !!b && ['niveau', 'compteur', 'serie'].every(k => a[k] === b[k] || Math.abs((a[k] || 0) - (b[k] || 0)) <= 0.5);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(800);
    const pastilles = () => p.evaluate(PASTILLES);
    const solo = async (cle) => { await p.evaluate((k) => { clearSavedGame(); state.screen = 'mode'; render(); state.timerKey = k; state.mode = 'solo'; state.daily = false; state.revision = false; startGame(); }, cle); await p.waitForTimeout(1300); };

    /* 1 */
    await solo('30');
    const a1 = await pastilles();
    await p.waitForTimeout(2150);
    await p.evaluate(() => { const q = currentQ(); soloAnswer(q.shuffledOptions.indexOf(q.correct)); });
    await p.waitForTimeout(500);
    const b1 = await pastilles();
    dit('1. Solo : on répond juste (série 0 → 1), aucune pastille ne bouge ; le chrono reste, arrêté sur ce qui restait',
      memes(a1, b1) && !!a1.chrono && !!b1.chrono && b1.chrono.fige && !b1.chrono.id && b1.chrono.x === a1.chrono.x && /^2[78] s$/.test(b1.chrono.texte),
      JSON.stringify({ a1, b1 }));

    /* 2 : le temps s'écoule */
    await solo('15');
    await p.evaluate(() => { qTimerLeft = 11; });
    /* (sans « .tv-n », avant la v335, on lit le chrono entier) */
    const LU = (t) => { const c = document.querySelector('#qTimerChip .tv-n') || document.getElementById('qTimerChip'); return !!c && c.textContent.trim() === t; };
    const attendre = (f, ms, arg) => p.waitForFunction(f, arg, { timeout: ms }).then(() => true, () => false);
    await attendre(LU, 4000, '10 s');
    const dix = await pastilles();
    await attendre(LU, 4000, '9 s');
    const neuf = await pastilles();
    const a2 = neuf;
    await p.evaluate(() => { qTimerLeft = 1; });
    await attendre(() => state.revealed && state.timedOut, 4000);
    await p.waitForTimeout(500);
    const b2 = await pastilles();
    dit('2. Solo : sous les dix secondes, le chrono garde sa largeur ; écoulé, il dit « 0 s », arrêté, sans le rouge qui bat',
      memes(dix, neuf) && !!dix.chrono && !!neuf.chrono && dix.chrono.large === neuf.chrono.large && dix.chrono.x === neuf.chrono.x
        && memes(a2, b2) && !!b2.chrono && b2.chrono.fige && b2.chrono.texte === '0 s' && !b2.chrono.rouge && !b2.chrono.bat && b2.chrono.large === dix.chrono.large,
      JSON.stringify({ dix, neuf, b2 }));

    /* 3 : Groupe */
    await p.evaluate(() => { clearSavedGame(); state.screen = 'mode'; render(); state.timerKey = '30'; state.mode = 'group'; state.daily = false; state.revision = false;
      state.teams = [{ name: 'Lions', color: 0 }, { name: 'Aigles', color: 1 }]; startGame(); });
    await p.waitForTimeout(1300);
    const a3 = await pastilles();
    await p.waitForTimeout(1100);
    await p.evaluate(() => revealAnswer());
    await p.waitForTimeout(500);
    const b3 = await pastilles();
    dit('3. Groupe : « Voir la réponse », aucune pastille ne bouge, le chrono reste arrêté',
      memes(a3, b3) && !!b3.chrono && b3.chrono.fige && b3.chrono.x === a3.chrono.x, JSON.stringify({ a3, b3 }));

    /* 4 : sans chrono */
    await solo('off');
    const a4 = await pastilles();
    await p.evaluate(() => soloAnswer(1));
    await p.waitForTimeout(500);
    const b4 = await pastilles();
    dit('4. sans chrono : rien n\'apparaît, rien ne bouge', memes(a4, b4) && !a4.chrono && !b4.chrono, JSON.stringify({ a4, b4 }));

    /* 5 : Seconde chance */
    await solo('30');
    await p.evaluate(() => { stopQTimer(); state.revision = true; render(); });
    await p.waitForTimeout(400);
    const a5 = await pastilles();
    await p.evaluate(() => soloAnswer(0));
    await p.waitForTimeout(500);
    const b5 = await pastilles();
    dit('5. Seconde chance : pas de chrono, ni avant ni après', !!a5 && !a5.chrono && !!b5 && !b5.chrono, JSON.stringify({ a5, b5 }));

    /* 6 : reprise après une relance */
    await solo('30');
    await p.waitForTimeout(3150);
    await p.evaluate(() => { soloAnswer(0); });
    await p.waitForTimeout(400);
    const avant6 = await pastilles();
    await p.evaluate(() => saveState());
    await p.reload();
    await p.waitForFunction(() => { try { return state.screen === 'play' && state.revealed; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(800);
    const b6 = await pastilles();
    dit('6. une partie révélée, reprise après une relance : le chrono arrêté dit toujours ce qui restait',
      !!avant6.chrono && !!b6 && !!b6.chrono && b6.chrono.fige && b6.chrono.texte === avant6.chrono.texte, JSON.stringify({ avant6: avant6.chrono, b6: b6 && b6.chrono }));
    await p.evaluate(() => { clearSavedGame(); });

    /* 7 : quitter à la première question, puis recommencer */
    await p.evaluate(() => { stopQTimer(); state.timerKey = '30'; state.mode = 'solo'; state.revision = false; state.screen = 'setup'; render(); });
    await p.waitForTimeout(600);
    await p.evaluate(() => startGame());
    await p.waitForTimeout(1200);
    await p.evaluate(() => confirmLeaveGame());
    await p.waitForTimeout(500);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Quitter' && x.offsetParent); b.click(); });
    await p.waitForTimeout(900);
    const ecran8 = await p.evaluate(() => state.screen);
    const entree8 = await p.evaluate(() => { startGame(); return new Promise(r => requestAnimationFrame(() => r(!!document.querySelector('.question-card.animate')))); });
    await p.waitForTimeout(2200);
    const chrono8 = await p.evaluate(() => { const c = document.querySelector('#qTimerChip .tv-n') || document.getElementById('qTimerChip'); return c ? c.textContent.trim() : null; });
    dit('7. quitter à la première question puis recommencer : la nouvelle arrive avec son entrée, et son chrono part',
      ecran8 === 'setup' && entree8 && /^2[78] s$/.test(chrono8 || ''), JSON.stringify({ ecran8, entree8, chrono8 }));
    await p.evaluate(() => { stopQTimer(); clearSavedGame(); });
    await ctx.close();

    /* 8 : En ligne */
    const { serveur } = require('./hub.js');
    await new Promise(r => serveur.listen(PORT, r));
    try {
      const ouvre = async (nom, couleur) => {
        const c = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
        const q = await c.newPage();
        q.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
        await q.addInitScript(([n, cl]) => { localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: cl })); localStorage.setItem('bt_fs_hint', '1'); }, [nom, couleur]);
        await q.goto('http://localhost:' + PORT + '/');
        await q.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
        await q.evaluate(() => openOnline());
        return { c, q };
      };
      const H = await ouvre('Taylor', '#4C86E8'), A = await ouvre('Sarah', '#E8734C');
      await attends(1500);
      const code = await H.q.evaluate(() => { createRoomFlow(); return new Promise(r => setTimeout(() => r(net.code), 1500)); });
      await A.q.evaluate((k) => { joinRoom(k, false); }, code);
      await attends(2200);
      await H.q.evaluate(() => hostStart());
      await H.q.waitForFunction(() => state.screen === 'online-play', null, { timeout: 8000 });
      await A.q.waitForFunction(() => state.screen === 'online-play', null, { timeout: 8000 });
      await attends(1500);
      const a7 = [await H.q.evaluate(PASTILLES), await A.q.evaluate(PASTILLES)];
      await H.q.evaluate(() => onlineAnswer(0));
      await A.q.evaluate(() => onlineAnswer(1));
      await H.q.waitForFunction(() => net.revealed, null, { timeout: 8000 });
      await A.q.waitForFunction(() => net.revealed, null, { timeout: 8000 });
      await attends(600);
      const b7 = [await H.q.evaluate(PASTILLES), await A.q.evaluate(PASTILLES)];
      dit('8. En ligne : à la révélation, aucune pastille ne bouge, chez l\'un comme chez l\'autre',
        [0, 1].every(i => memes(a7[i], b7[i]) && !!b7[i].chrono && b7[i].chrono.fige && b7[i].chrono.x === a7[i].chrono.x),
        JSON.stringify({ a7, b7 }));
      await H.c.close(); await A.c.close();
    } finally { serveur.close(); }
    dit('9. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — révélée, la question garde son chrono, arrêté : rien ne bouge');
  process.exit(ko ? 1 : 0);
})();
