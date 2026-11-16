/* ====== BANC « QUITTER L'APP SANS COURT-JUS, TENIR UNE PARTIE SANS SÉLECTION, LIRE “COMMENT JOUER” » (v375) ======
   « Lorsque je suis sur le jeu et que je change la page pour aller dans une
     autre appli, ça fait un bruit très robotique, comme si le son se fermait
     d'un coup et qu'il y avait un court-jus. »
   « Lorsque je reste appuyé sur une partie qui est terminée, la petite barre
     qui se lève pour me demander de répondre bug légèrement à son ouverture. »
   « Le bouton Comment jouer : son interface est très glassmorphisme. »
   Sur un iPhone :
   LE SON
     1. PARTIE POUR DE BON, DANS UNE PAGE GELÉE : on simule le gel d'un
        iPhone — aucune minuterie ne tourne plus après l'événement — et
        l'app passe en arrière-plan (visibilitychange, puis pagehide) : le
        contexte est arrêté DANS l'événement, la musique débranchée, et la
        dernière chose jouée est du silence (le fondu a été joué avant
        l'arrêt) ;
     2. L'ÉVÉNEMENT RESTE COURT : l'attente du fondu dure moins de 90 ms, et
        le pagehide qui suit, la sortie déjà muette, n'attend rien ;
     3. LE GESTE DU SYSTÈME (un doigt posé au bas de l'écran, que le système
        reprend : touchcancel) : la sortie se tait en moins de 60 ms, sans
        arrêter le contexte ; l'app toujours là, la musique revient en fondu ;
     4. un toucher ordinaire au bas de l'écran (posé, levé) ne change rien ;
   LA CARTE D'UNE PARTIE
     5. elle ne se sélectionne pas (ni elle, ni ce qu'elle contient), et le
        doigt qui tient une bulle n'y démarre aucune sélection ;
   « COMMENT JOUER »
     6. une carte pleine : aucune couche de verre, un fond opaque, une
        pastille en tête, chaque geste sur sa ligne blanche, la note du chrono
        dans son encart ; entière à l'écran ; aucune ombre de couleur ;
     7. aucune erreur.
   Usage : node banc-essai/sortie-nette.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const MUET = 1e-5, SONORE = 1e-4;
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 460) + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const erreurs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.mouse.click(196, 700);
    const allumer = () => p.evaluate(() => { settings.music = true; settings.sfx = true; settings.volume = 0.4; try { saveSettings(); } catch (e) {} try { startMusic(); } catch (e) {} });
    await allumer();
    await p.waitForFunction(() => { try { return actx && actx.state === 'running' && musicPlaying; } catch (e) { return false; } }, null, { timeout: 8000 });
    /* L'oreille, sur la sortie maître (comme son-bascule.js). */
    await p.evaluate(() => {
      const an = actx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0;
      masterGain.connect(an);
      window.__an = an; window.__buf = new Float32Array(an.fftSize);
      window.__pic = () => { let m = 0; try { window.__an.getFloatTimeDomainData(window.__buf); for (const v of window.__buf) m = Math.max(m, Math.abs(v)); } catch (e) {} return m; };
      const proto = Object.getPrototypeOf(actx), sus = proto.suspend;
      window.__arrets = 0;
      proto.suspend = function () { window.__arrets++; return sus.apply(this, arguments); };
    });
    await p.waitForTimeout(2500);

    /* ---- 1, 2 ---- partie pour de bon, dans une page gelée */
    const gel = await p.evaluate(() => {
      const avant = window.__pic();
      /* Le gel : plus aucune minuterie ne tournera. */
      const st = window.setTimeout, si = window.setInterval;
      window.setTimeout = () => 0; window.setInterval = () => 0;
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      window.__arrets = 0;
      const t0 = performance.now();
      document.dispatchEvent(new Event('visibilitychange'));
      const t1 = performance.now();
      window.dispatchEvent(new Event('pagehide'));
      const t2 = performance.now();
      const r = { avant, arrets: window.__arrets, musique: !!musicPlaying, bus: !!musicBusNode,
        duree: Math.round((t1 - t0) * 10) / 10, pagehide: Math.round((t2 - t1) * 10) / 10 };
      window.setTimeout = st; window.setInterval = si;
      return r;
    });
    await p.waitForTimeout(300);
    const apresGel = await p.evaluate(() => ({ etat: actx.state, dernier: window.__pic() }));
    dit('1. partie pour de bon, dans une page gelée (aucune minuterie) : le contexte arrêté dans l\'événement, la musique débranchée, et la dernière chose jouée est du silence',
      gel.avant > SONORE && gel.arrets >= 1 && !gel.musique && !gel.bus && apresGel.etat === 'suspended' && apresGel.dernier < MUET,
      JSON.stringify({ gel, apresGel }));
    dit('2. l\'événement reste court : l\'attente du fondu dure moins de 90 ms, et le pagehide qui suit n\'attend rien',
      gel.duree < 90 && gel.pagehide < 10, gel.duree + ' ms, puis ' + gel.pagehide + ' ms');

    /* le retour */
    await p.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));
    });
    await p.mouse.click(196, 700);
    await p.waitForFunction(() => { try { return actx.state === 'running' && musicPlaying; } catch (e) { return false; } }, null, { timeout: 8000 });
    await p.waitForTimeout(1500);

    /* ---- 3 ---- le geste du système : un doigt au bas de l'écran, repris */
    const cdp = await ctx.newCDPSession(p);
    const geste = await p.evaluate(() => ({ avant: window.__pic(), t: performance.now() }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 196, y: 845 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await p.waitForTimeout(80);
    const pendant = await p.evaluate(() => ({ pic: window.__pic(), etat: actx.state }));
    await p.waitForTimeout(2600);
    const apres = await p.evaluate(() => ({ pic: window.__pic(), etat: actx.state, musique: !!musicPlaying }));
    dit('3. le geste du système (touchcancel au bas de l\'écran) : la sortie se tait aussitôt, sans arrêter le contexte ; l\'app toujours là, la musique revient',
      geste.avant > SONORE && pendant.pic < MUET && pendant.etat === 'running' && apres.etat === 'running' && apres.musique && apres.pic > SONORE,
      JSON.stringify({ avant: geste.avant, pendant, apres }));

    /* ---- 4 ---- un toucher ordinaire au bas de l'écran */
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 196, y: 845 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(120);
    const touche = await p.evaluate(() => ({ pic: window.__pic(), musique: !!musicPlaying }));
    dit('4. un toucher ordinaire au bas de l\'écran (posé, levé) ne change rien', touche.pic > SONORE && touche.musique, JSON.stringify(touche));
    await p.evaluate(() => { settings.music = false; settings.sfx = false; try { stopMusic(); } catch (e) {} });

    /* ---- 5 ---- la carte d'une partie ne se sélectionne pas */
    const r5 = await p.evaluate(() => {
      compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
      grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false, reponses: true, recaps: true, parties_suivies: true };
      grp.liste = [{ id: 'g1', nom: 'Les amis du jeudi', teinte: 2, non_lus: 0, nb_membres: 2, code: '7UHF5T', role: 'membre' }];
      grp.membres = { g1: [{ membre: 'moi-0', role: 'membre', muet_jusqu: null }, { membre: 'u-2', role: 'proprietaire', muet_jusqu: null }] };
      grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Kirens', couleur: '#E8A06A' } };
      const t = Date.now();
      grp.fils = { g1: { charge: true, tout: true, messages: [
        { id: 1, groupe: 'g1', auteur: 'u-2', genre: 'texte', texte: 'On joue ?', cree_le: new Date(t - 20 * 60000).toISOString() },
        { id: 2, groupe: 'g1', auteur: 'u-2', genre: 'partie', texte: '', cree_le: new Date(t - 10 * 60000).toISOString(),
          donnees: { code: 'ABCD', fermee: true, lancee: true, total: 15, theme: 'tout', venus: [{ id: 'moi-0', nom: 'Taylor' }], scores: { 'moi-0': [200, 10] } } }] } };
      grp.courant = 'g1'; state.screen = 'groupe'; render();
      const b = document.querySelector('#fil .b-partie');
      const enfants = [...b.querySelectorAll('*')].map(e => getComputedStyle(e).userSelect);
      /* le doigt qui tient la bulle : une sélection qui voudrait démarrer est refusée */
      const r = b.getBoundingClientRect();
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 20, clientY: r.top + 20, pointerType: 'touch', isPrimary: true }));
      const ev = new Event('selectstart', { bubbles: true, cancelable: true });
      b.querySelector('b').dispatchEvent(ev);
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
      return { carte: getComputedStyle(b).userSelect, enfants: [...new Set(enfants)], refusee: ev.defaultPrevented };
    });
    dit('5. la carte d\'une partie ne se sélectionne pas (ni ce qu\'elle contient), et le doigt qui la tient n\'y démarre aucune sélection',
      r5.carte === 'none' && r5.enfants.every(x => x === 'none') && r5.refusee, JSON.stringify(r5));

    /* ---- 6 ---- « Comment jouer » */
    const r6 = await p.evaluate(async () => {
      state.screen = 'mode'; render();
      await new Promise(r => setTimeout(r, 900));
      state.mode = 'group'; state.screen = 'setup'; render();
      await new Promise(r => setTimeout(r, 1100));
      ouvrirDeroule();
      await new Promise(r => setTimeout(r, 900));
      const c = document.querySelector('#modalVeil .modal-card.modal-deroule');
      if (!c) return null;
      const cs = getComputedStyle(c), rc = c.getBoundingClientRect();
      const ombres = [cs.boxShadow, ...[...c.querySelectorAll('*')].map(e => getComputedStyle(e).boxShadow)].join(' | ');
      const couleurs = (ombres.match(/rgba?\([^)]*\)/g) || []).filter(x => { const n = x.match(/[\d.]+/g).map(Number); return !(n[0] === 24 && n[1] === 16 && n[2] === 10) && !(n[3] === 0); });
      const lignes = [...c.querySelectorAll('.deroule-pas li')].map(l => getComputedStyle(l).backgroundColor);
      return { verre: !!c.querySelector(':scope > .gs') && getComputedStyle(c.querySelector(':scope > .gs')).display !== 'none', fond: cs.backgroundColor,
        pastille: !!c.querySelector('.deroule-tete svg'), lignes, note: !!c.querySelector('.deroule-note .ico svg'),
        dedans: rc.top >= 0 && rc.bottom <= innerHeight && rc.left >= 0 && rc.right <= innerWidth, couleurs, titre: c.querySelector('.modal-title').textContent };
    });
    const opaque = (s) => { const n = (s || '').match(/[\d.]+/g); return !!n && (n.length < 4 || +n[3] === 1); };
    dit('6. « Comment jouer » : une carte pleine — aucune couche de verre, un fond opaque, la pastille, chaque geste sur sa ligne blanche, la note dans son encart, entière à l\'écran, aucune ombre de couleur',
      !!r6 && !r6.verre && opaque(r6.fond) && r6.pastille && r6.lignes.length === 3 && r6.lignes.every(x => x === 'rgb(255, 255, 255)') && r6.note && r6.dedans && r6.couleurs.length === 0 && r6.titre === 'Comment jouer',
      JSON.stringify(r6));
    await ctx.close();
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('7. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — on quitte sans court-jus, on tient une partie sans rien sélectionner, et « Comment jouer » se lit');
  process.exit(ko ? 1 : 0);
})();
