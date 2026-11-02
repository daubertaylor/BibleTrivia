/* ============ BANC « LE SON NE HOQUETTE PAS QUAND ON CHANGE DE PAGE » ============
   « Le son du jeu qui bugue quand je change de page : c'est toujours le même,
     corrige encore. » (v345 ; déjà signalé avant la v338.)
   Un banc ne peut pas entendre un téléphone à la peine. Il vérifie donc ce
   dont dépend le hoquet, et ce qui peut s'en approcher hors du téléphone :
     1. LA RÉSERVE. Le son se calcule d'avance ; quand un changement de page
        prend le processeur, c'est la réserve qui tient la sortie. Sur
        Android, « équilibré » ne valait que 20 ms (code de Chrome, lu) : on
        en exige 45 au moins, mesurées sur le contexte réellement obtenu ;
     2. AUCUN EFFET PROGRAMMÉ DANS LE PASSÉ : un « toc » posé pile sur
        « maintenant » perd sa montée douce si le fil audio a déjà avancé —
        un clic à l'attaque ;
     3. RIEN NE COUPE NI NE REFAIT LA MUSIQUE en changeant de page : aucune
        coupure (audioHidden), aucune musique refaite à neuf
        (restartMusicClean), aucun contexte rebâti ;
     4. LE SIGNAL EST PROPRE : une prise sur le FIL AUDIO (AudioWorklet — un
        ScriptProcessor, lui, perd des morceaux dès que la page travaille et
        invente des clics qui n'existent pas), pendant huit changements de
        page au vrai toucher : aucun saut, aucun trou de silence.
   Usage : node banc-essai/son-pages.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

let ko = 0;
function verifier(nom, bon, detail){
  if(!bon) ko++;
  console.log('  ' + (bon ? 'OK ' : 'KO ') + nom + (detail ? '   (' + detail + ')' : ''));
}

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2, userAgent:ANDROID,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status:200, contentType:'application/javascript', body:'' }));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx:true, music:true, volume:0.6 }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(p);
  const toucher = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await p.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  };
  /* Le premier toucher ouvre le son et lance la musique. */
  await toucher(200, 120);
  await p.waitForFunction(() => typeof actx !== 'undefined' && actx && actx.state === 'running' && musicPlaying, null, { timeout:8000 });
  await p.waitForTimeout(1500);

  // ---------- 1. LA RÉSERVE ----------
  const reserve = await p.evaluate(() => actx.baseLatency || 0);
  verifier("la réserve de son tient un gros effort (≥ 45 ms)", reserve >= 0.045, Math.round(reserve * 1000) + ' ms');

  // ---------- 2. AUCUN EFFET DANS LE PASSÉ ----------
  const marge = await p.evaluate(() => { if(typeof tEffet !== 'function') return -1; const c = getCtx(); return tEffet(c, 0) - c.currentTime; });
  verifier("un effet part toujours un peu après « maintenant »", marge >= 0.004, Math.round(marge * 1000) + ' ms');

  // ---------- 3 et 4. HUIT CHANGEMENTS DE PAGE, ÉCOUTÉS ----------
  await p.evaluate(async () => {
    window.__appels = [];
    ['audioHidden', 'restartMusicClean', 'reviveAudioHard', 'reprendreApresCoupure', 'stopMusic'].forEach(n => {
      const f = window[n]; if(typeof f !== 'function') return;
      window[n] = function(){ __appels.push(n); return f.apply(this, arguments); };
    });
    const c = getCtx();
    const code = `class Prise extends AudioWorkletProcessor{
      constructor(){ super(); this.b = []; this.n = 0; }
      process(inp){ const d = inp[0] && inp[0][0]; if(d){ this.b.push(new Float32Array(d)); this.n += d.length;
        if(this.n >= 11025){ this.port.postMessage(this.b); this.b = []; this.n = 0; } } return true; } }
      registerProcessor('prise', Prise);`;
    await c.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type:'application/javascript' })));
    const n = new AudioWorkletNode(c, 'prise', { numberOfInputs:1, numberOfOutputs:0, channelCount:1, channelCountMode:'explicit' });
    window.__paquets = [];
    n.port.onmessage = (e) => { for(const b of e.data) __paquets.push(b); };
    masterGain.connect(n); window.__prise = n;
  });
  const centre = (sel) => p.evaluate((s) => {
    const e = Array.from(document.querySelectorAll(s)).find(x => { const q = x.getBoundingClientRect(); return q.width > 0 && q.height > 0 && !x.closest('.screen-exit'); });
    if(!e) return null; const q = e.getBoundingClientRect(); return { x:q.left + q.width/2, y:q.top + q.height/2 };
  }, sel);
  const parcours = [
    ['.mode-card', 'un mode'], ['.icon-btn[aria-label="Retour"]', 'retour'],
    ['.parcours-card', 'Progression'], ['.icon-btn[aria-label="Retour"]', 'retour'],
    ['.icon-btn[aria-label="Réglages"]', 'Réglages'], ['.sheet-grab', 'fermer les Réglages'],
    ['.parcours-card', 'Progression'], ['.icon-btn[aria-label="Retour"]', 'retour'],
  ];
  let faits = 0;
  for(const [sel, nom] of parcours){
    const c = await centre(sel);
    if(!c){ console.log('    (introuvable : ' + nom + ')'); continue; }
    await toucher(c.x, c.y); faits++;
    await p.waitForTimeout(1300);
  }
  verifier("huit changements de page au vrai toucher", faits === parcours.length, faits + '/' + parcours.length);
  const res = await p.evaluate(() => {
    masterGain.disconnect(__prise);
    const sr = actx.sampleRate;
    let n = 0; for(const b of __paquets) n += b.length;
    const a = new Float32Array(n); let o = 0; for(const b of __paquets){ a.set(b, o); o += b.length; }
    /* Un saut = une seconde différence hors de proportion avec la musique
       (un clic) ; un trou = 10 ms de silence quasi parfait. */
    const W = Math.round(sr * 0.01), d2 = [], rms = [];
    for(let i = 0; i + W < a.length; i += W){
      let m = 0, s = 0;
      for(let k = i + 2; k < i + W; k++){ const v = Math.abs(a[k] - 2*a[k-1] + a[k-2]); if(v > m) m = v; s += a[k]*a[k]; }
      d2.push(m); rms.push(Math.sqrt(s / W));
    }
    const tri = d2.slice().sort((x, y) => x - y), med = tri[Math.floor(tri.length / 2)] || 0;
    const sauts = d2.filter(v => v > Math.max(12 * med, 0.004)).length;
    const trous = rms.filter(v => v < 1e-5).length;
    return { secondes: n / sr, sauts, trous, appels: __appels.slice() };
  });
  verifier("la prise a bien écouté tout le parcours", res.secondes > 9, res.secondes.toFixed(1) + ' s');
  verifier("aucun clic dans le signal", res.sauts === 0, res.sauts + ' saut(s)');
  verifier("aucun trou de silence", res.trous === 0, res.trous + ' fenêtre(s) muette(s)');
  verifier("rien ne coupe ni ne refait la musique en changeant de page", res.appels.length === 0, res.appels.join(', ') || 'aucun appel');
  verifier("aucune erreur", errs.length === 0, errs.slice(0, 2).join(' | '));

  await nav.close();
  console.log(ko === 0 ? '\n  OK — la réserve tient, le signal est propre, la musique continue' : '\n  ' + ko + ' règle(s) en défaut');
  process.exit(ko === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
