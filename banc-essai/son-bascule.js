/* ====== BANC « QUITTER ET REVENIR SANS UN BRUIT » (v340) ======
   « Lorsque je suis sur le jeu et que je change de page pour aller sur une
     autre appli ou retourner à l'accueil de mon téléphone, ou même quand je
     retourne sur le jeu, ça fait un bruit de bug, de son robotisé. »
   Le grésillement lui-même naît dans le téléphone (un paquet de son qui
   manque, et le dernier rejoué) : un banc ne peut pas l'entendre. Il peut
   vérifier ce qui l'empêche — et il ÉCOUTE la sortie pour ça : un analyseur
   sur la sortie maître, lu toutes les 10 ms DANS la page.
     1. en partant (la fenêtre perd le premier plan) : la sortie est muette en
        moins de 60 ms, puis la musique est débranchée et le contexte ARRÊTÉ
        par le jeu (suspend) — il s'arrête sur du silence ;
     2. en revenant : rien ne sort pendant le temps calme (pas de son rendu à
        la seconde du retour), puis la musique revient, en fondu, sur un
        graphe NEUF (pas l'écho de la veille), et elle ne démarre qu'UNE fois ;
     3. même chose par la visibilité (l'app passe en arrière-plan) ;
     4. même chose par pagehide / pageshow ;
     5. un aller-retour éclair (revenu avant que la coupure ait fini) : pas de
        contexte arrêté sous les yeux du joueur, un seul départ, le son revient ;
     6. un toucher pendant le temps calme ne lance pas la musique en avance ;
     7. après le retour, les effets sonores sortent ;
     8. aucune erreur.
   Sur la v339 : 1 à 6 rouges.
   Usage : node banc-essai/son-bascule.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const MUET = 1e-5, SONORE = 1e-4;
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  try {
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.mouse.click(196, 700);
    await p.evaluate(() => { settings.music = true; settings.sfx = true; settings.volume = 0.4; try { saveSettings(); } catch (e) {} try { startMusic(); } catch (e) {} });
    await p.waitForFunction(() => { try { return actx && actx.state === 'running' && musicPlaying; } catch (e) { return false; } }, null, { timeout: 8000 });
    /* L'oreille : une prise passive sur la sortie maître, lue toutes les 10 ms
       par la page elle-même ; et les compteurs de départs. */
    await p.evaluate(() => {
      const an = actx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0;
      masterGain.connect(an);
      const buf = new Float32Array(an.fftSize);
      window.__oreille = []; window.__t0 = performance.now();
      setInterval(() => {
        let pic = 0;
        try { an.getFloatTimeDomainData(buf); for (let i = 0; i < buf.length; i++) { const d = Math.abs(buf[i]); if (d > pic) pic = d; } } catch (e) {}
        window.__oreille.push([Math.round(performance.now()), pic]);
        if (window.__oreille.length > 4000) window.__oreille.splice(0, 1000);
      }, 10);
      window.__departs = 0; window.__refaits = 0; window.__arrets = 0;
      const s = window.startMusic, r = window.restartMusicClean;
      window.startMusic = function () { const avant = musicPlaying; const x = s.apply(this, arguments); if (!avant && musicPlaying) window.__departs++; return x; };
      window.restartMusicClean = function () { window.__refaits++; return r.apply(this, arguments); };
      const proto = Object.getPrototypeOf(actx), sus = proto.suspend;
      proto.suspend = function () { window.__arrets++; return sus.apply(this, arguments); };
    });
    await p.waitForTimeout(3000);
    const pic = (de, a) => p.evaluate(([de, a]) => window.__oreille.filter(x => x[0] >= de && x[0] <= a).reduce((m, x) => Math.max(m, x[1]), 0), [de, a]);
    const premierSonore = (de) => p.evaluate(([de, s]) => { const x = window.__oreille.find(x => x[0] >= de && x[1] > s); return x ? x[0] - de : null; }, [de, SONORE]);
    const maintenant = () => p.evaluate(() => Math.round(performance.now()));
    const compteurs = () => p.evaluate(() => ({ departs: window.__departs, refaits: window.__refaits, arrets: window.__arrets,
      etat: actx.state, musique: !!musicPlaying, bus: !!musicBusNode }));
    const avantTout = await pic(await maintenant() - 1500, await maintenant());
    dit('0. la musique sonne avant de partir', avantTout > SONORE, 'pic ' + avantTout.toExponential(2));

    /* Un départ et un retour, par une paire d'événements : on mesure tout. */
    const allerRetour = async (nom, partir, revenir) => {
      await p.evaluate(() => { window.__busAvant = musicBusNode; window.__departs = 0; window.__refaits = 0; window.__arrets = 0; });
      const t0 = await maintenant();
      await p.evaluate(partir);
      await p.waitForTimeout(400);
      const t1 = await maintenant();
      const apres60 = await pic(t0 + 60, t1);
      const parti = await compteurs();
      await p.evaluate(revenir);
      const t2 = await maintenant();
      await p.waitForTimeout(4500);
      const calme = await pic(t2, t2 + 400);
      const debut = await premierSonore(t2);
      const fin = await compteurs();
      const neuf = await p.evaluate(() => !!musicBusNode && musicBusNode !== window.__busAvant);
      return { nom, apres60, parti, calme, debut, fin, neuf };
    };
    const juger = (n, r) => {
      dit(n + 'a. en partant : muet en moins de 60 ms, la musique débranchée, le contexte arrêté par le jeu',
        r.apres60 < MUET && r.parti.etat === 'suspended' && r.parti.arrets >= 1 && !r.parti.musique && !r.parti.bus,
        'sortie ' + r.apres60.toExponential(2) + ', contexte ' + r.parti.etat + ', suspend ×' + r.parti.arrets + ', graphe ' + (r.parti.bus ? 'encore là' : 'débranché'));
      dit(n + 'b. en revenant : rien pendant le temps calme, puis la musique en fondu, sur un graphe neuf, un seul départ',
        r.calme < MUET && r.debut !== null && r.debut >= 400 && r.fin.etat === 'running' && r.fin.musique && r.neuf && r.fin.departs === 1 && r.fin.refaits === 0,
        'calme ' + r.calme.toExponential(2) + ', premier son à ' + r.debut + ' ms, contexte ' + r.fin.etat + ', départs ' + r.fin.departs + ', refaits ' + r.fin.refaits + ', graphe ' + (r.neuf ? 'neuf' : 'ANCIEN'));
    };

    /* 1-2 : la fenêtre perd puis reprend le premier plan */
    juger('1-2', await allerRetour('fenêtre',
      () => window.dispatchEvent(new Event('blur')),
      () => window.dispatchEvent(new Event('focus'))));
    await p.waitForTimeout(1500);

    /* 3 : la visibilité */
    juger('3', await allerRetour('visibilité',
      () => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); },
      () => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }));
    await p.waitForTimeout(1500);

    /* 4 : pagehide / pageshow (la page reste « visible » pour le navigateur du banc) */
    juger('4', await allerRetour('page',
      () => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); window.dispatchEvent(new Event('pagehide')); },
      () => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); window.dispatchEvent(new Event('pageshow')); }));
    await p.waitForTimeout(1500);

    /* 5 : l'aller-retour éclair */
    {
      await p.evaluate(() => { window.__departs = 0; window.__refaits = 0; window.__arrets = 0; });
      await p.evaluate(() => { window.dispatchEvent(new Event('blur')); setTimeout(() => window.dispatchEvent(new Event('focus')), 20); });
      await p.waitForTimeout(4500);
      const c = await compteurs();
      const t = await maintenant();
      const s = await pic(t - 1200, t);
      dit('5. aller-retour éclair : pas de contexte arrêté sous les yeux, un seul départ, la musique revient',
        c.arrets === 0 && c.etat === 'running' && c.musique && c.departs === 1 && s > SONORE,
        'suspend ×' + c.arrets + ', contexte ' + c.etat + ', départs ' + c.departs + ', pic ' + s.toExponential(2));
    }
    await p.waitForTimeout(1000);

    /* 6 : un toucher pendant le temps calme */
    {
      await p.evaluate(() => { window.__departs = 0; window.__refaits = 0; });
      await p.evaluate(() => window.dispatchEvent(new Event('blur')));
      await p.waitForTimeout(300);
      const t2 = await maintenant();
      await p.evaluate(() => window.dispatchEvent(new Event('focus')));
      await p.waitForTimeout(120);
      await p.evaluate(() => document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
      const pendant = await p.evaluate(() => ({ musique: !!musicPlaying, departs: window.__departs }));
      await p.waitForTimeout(4000);
      const c = await compteurs();
      const debut = await premierSonore(t2);
      dit('6. un toucher pendant le temps calme ne lance pas la musique en avance (un seul départ, après le calme)',
        !pendant.musique && pendant.departs === 0 && c.departs === 1 && c.musique && debut !== null && debut >= 400,
        'au toucher : musique ' + pendant.musique + ', départs ' + pendant.departs + ' ; ensuite départs ' + c.departs + ', premier son à ' + debut + ' ms');
    }

    /* 7 : les effets après le retour (musique coupée pour les entendre seuls) */
    {
      await p.evaluate(() => { settings.music = false; stopMusic(); });
      await p.waitForTimeout(3200);
      const t = await maintenant();
      await p.evaluate(() => { playWin(); });
      await p.waitForTimeout(900);
      const s = await pic(t, t + 900);
      dit('7. après les retours, les effets sonores sortent', s > SONORE, 'pic ' + s.toExponential(2));
    }
    dit('8. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — en partant le son s\'éteint puis le contexte s\'arrête ; en revenant, il attend, puis revient en fondu, neuf');
  process.exit(ko ? 1 : 0);
})();
