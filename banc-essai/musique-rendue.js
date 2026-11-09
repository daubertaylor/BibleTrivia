/* ============ BANC « LA MUSIQUE RENDUE D'AVANCE » (v355) ============
   « Lorsque je quitte le jeu, la page, pour aller sur une autre page, ça fait
     un bruit robotique, comme un bruit bizarre qui casse le son du jeu.
     Règle ça une fois pour toutes. »
   La musique ne se calcule plus en direct : chaque mesure se rend à part,
   d'avance, et le son du jeu ne fait que la rejouer. Vérifié ici :
     1. LA MUSIQUE JOUE DES MESURES PRÊTES : après le premier toucher, les
        mesures arrivent rendues (22 050 Hz, la mesure et 6,6 s de queue), et
        le son du jeu ne crée AUCUN oscillateur pour elle pendant six
        secondes de musique ;
     2. UNE MESURE RENDUE SONNE : ni silence, ni saturation ;
     3. LE SIGNAL EST CONTINU d'une mesure à l'autre et pendant huit
        changements de page : aucun clic, aucun trou (prise sur le fil audio) ;
     4. COUPER LA MUSIQUE (Réglages) arrête aussi les mesures qui sonnaient ;
        la rallumer la fait repartir, rendue d'avance ;
     5. QUITTER L'APP ET REVENIR : les mesures s'en vont avec la coupure, et
        la musique repart, rendue d'avance ;
     6. aucune erreur.
   Usage : node banc-essai/musique-rendue.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, userAgent: ANDROID, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: true, music: true, volume: 0.6 }));
    /* Qui crée des oscillateurs, et dans quel contexte. */
    window.__osc = { direct: 0, rendu: 0 };
    const B = window.BaseAudioContext || window.AudioContext;
    const f = B.prototype.createOscillator;
    B.prototype.createOscillator = function(){ if (window.OfflineAudioContext && this instanceof OfflineAudioContext) __osc.rendu++; else __osc.direct++; return f.apply(this, arguments); };
  });
  try {
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(500);
    const cdp = await ctx.newCDPSession(p);
    const toucher = async (x, y) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await p.waitForTimeout(60);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    /* Le premier toucher (sur le verset de l'accueil, rien d'autre) ouvre le son. */
    await toucher(200, 120);
    await p.waitForFunction(() => typeof actx !== 'undefined' && actx && actx.state === 'running' && musicPlaying, null, { timeout: 8000 });
    await p.waitForFunction(() => musiqueRendue && musiqueRendue.joues >= 1, null, { timeout: 8000 });
    /* 1 : six secondes de musique, sans toucher */
    const avant = await p.evaluate(() => ({ direct: __osc.direct, joues: musiqueRendue.joues }));
    await p.waitForTimeout(6000);
    const m1 = await p.evaluate(() => { const R = musiqueRendue, b = [...R.prets.values()][0];
      return { direct: __osc.direct, rendu: __osc.rendu, joues: R.joues, sources: R.sources.size, prets: R.prets.size, echecs: R.echecs,
        sr: b ? b.sampleRate : null, long: b ? b.length : null, attendu: Math.ceil((MUSIQUE_AVANT + MUSIC_BAR + MUSIQUE_QUEUE) * MUSIQUE_SR) }; });
    dit('1. la musique joue des mesures rendues d\'avance (22 050 Hz, mesure et queue), et le son du jeu ne crée aucun oscillateur pour elle',
      m1.direct === avant.direct && m1.rendu > 0 && m1.joues - avant.joues >= 2 && m1.echecs === 0 && m1.sr === 22050 && m1.long === m1.attendu && m1.sources <= 5,
      JSON.stringify({ avant, m1 }));
    /* 2 : une mesure rendue sonne */
    const m2 = await p.evaluate(async () => { const b = await rendreMesure(9); const d = b.getChannelData(0); let pic = 0, s = 0;
      for (let i = 0; i < d.length; i++){ const v = Math.abs(d[i]); if (v > pic) pic = v; s += d[i] * d[i]; } return { pic, rms: Math.sqrt(s / d.length) }; });
    dit('2. une mesure rendue sonne : ni silence, ni saturation', m2.rms > 0.002 && m2.pic < 0.9, JSON.stringify(m2));
    /* 3 : huit changements de page, écoutés sur le fil audio */
    await p.evaluate(async () => {
      const c = getCtx();
      const code = `class Prise extends AudioWorkletProcessor{
        constructor(){ super(); this.b = []; this.n = 0; }
        process(inp){ const d = inp[0] && inp[0][0]; if(d){ this.b.push(new Float32Array(d)); this.n += d.length;
          if(this.n >= 11025){ this.port.postMessage(this.b); this.b = []; this.n = 0; } } return true; } }
        registerProcessor('prise', Prise);`;
      await c.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
      const n = new AudioWorkletNode(c, 'prise', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 1, channelCountMode: 'explicit' });
      window.__paquets = [];
      n.port.onmessage = (e) => { for (const b of e.data) __paquets.push(b); };
      masterGain.connect(n); window.__prise = n;
    });
    const centre = (sel) => p.evaluate((s) => {
      const e = Array.from(document.querySelectorAll(s)).find(x => { const q = x.getBoundingClientRect(); return q.width > 0 && q.height > 0 && !x.closest('.screen-exit'); });
      if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 };
    }, sel);
    const pages = ['.mode-card', '.icon-btn[aria-label="Retour"]', '#barreBas .bb-onglet[data-o="jeux"]', '#barreBas .bb-onglet[data-o="accueil"]',
      '.parcours-card', '.icon-btn[aria-label="Retour"]', '#barreBas .bb-onglet[data-o="parcours"]', '#barreBas .bb-onglet[data-o="accueil"]'];
    let faits = 0;
    for (const sel of pages) { const c = await centre(sel); if (!c) { console.log('    (introuvable : ' + sel + ')'); continue; } await toucher(c.x, c.y); faits++; await p.waitForTimeout(1300); }
    const res = await p.evaluate(() => {
      masterGain.disconnect(__prise);
      const sr = actx.sampleRate;
      let n = 0; for (const b of __paquets) n += b.length;
      const a = new Float32Array(n); let o = 0; for (const b of __paquets){ a.set(b, o); o += b.length; }
      const W = Math.round(sr * 0.01), d2 = [], rms = [];
      for (let i = 0; i + W < a.length; i += W){
        let m = 0, s = 0;
        for (let k = i + 2; k < i + W; k++){ const v = Math.abs(a[k] - 2*a[k-1] + a[k-2]); if (v > m) m = v; s += a[k]*a[k]; }
        d2.push(m); rms.push(Math.sqrt(s / W));
      }
      const tri = d2.slice().sort((x, y) => x - y), med = tri[Math.floor(tri.length / 2)] || 0;
      return { secondes: n / sr, sauts: d2.filter(v => v > Math.max(12 * med, 0.004)).length, trous: rms.filter(v => v < 1e-5).length, joues: musiqueRendue ? musiqueRendue.joues : -1 };
    });
    dit('3. huit changements de page, la musique continue d\'une mesure à l\'autre : aucun clic, aucun trou', faits === pages.length && res.secondes > 9 && res.sauts === 0 && res.trous === 0,
      JSON.stringify({ faits, ...res, secondes: res.secondes.toFixed(1) }));
    /* 4 : couper la musique, puis la rallumer */
    await p.evaluate(() => { settings.music = false; stopMusic(); });
    await p.waitForTimeout(1200);
    const m4 = await p.evaluate(() => ({ joue: musicPlaying, rendu: musiqueRendue ? musiqueRendue.sources.size : 0 }));
    await p.evaluate(() => { settings.music = true; maybeStartMusic(); });
    await p.waitForFunction(() => musiqueRendue && musiqueRendue.joues >= 1, null, { timeout: 8000 }).catch(() => {});
    const m4b = await p.evaluate(() => ({ joue: musicPlaying, joues: musiqueRendue ? musiqueRendue.joues : 0 }));
    dit('4. couper la musique arrête aussi les mesures qui sonnaient ; la rallumer la fait repartir, rendue d\'avance', !m4.joue && m4.rendu === 0 && m4b.joue && m4b.joues >= 1,
      JSON.stringify({ m4, m4b }));
    /* 5 : quitter l'app et revenir */
    await p.evaluate(() => audioHidden());
    await p.waitForTimeout(400);
    const m5 = await p.evaluate(() => ({ joue: musicPlaying, rendu: !!musiqueRendue }));
    await p.evaluate(() => { try { if (actx.state !== 'running') actx.resume(); } catch (e) {} reprendreApresCoupure(); });
    await p.waitForFunction(() => musicPlaying && musiqueRendue && musiqueRendue.joues >= 1, null, { timeout: 8000 }).catch(() => {});
    const m5b = await p.evaluate(() => ({ joue: musicPlaying, joues: musiqueRendue ? musiqueRendue.joues : 0, coupe: masterCoupe }));
    dit('5. quitter l\'app emporte les mesures ; au retour, la musique repart, rendue d\'avance', !m5.joue && !m5.rendu && m5b.joue && m5b.joues >= 1 && !m5b.coupe,
      JSON.stringify({ m5, m5b }));
  } catch (e) { ko++; console.log('  KO  le banc s\'est arrêté : ' + e.message); }
  dit('6. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la musique est rendue d\'avance, et le son du jeu ne fait que la rejouer');
  process.exit(ko ? 1 : 0);
})();
