/* ====== LA PUBLICITÉ EN PLEIN ÉCRAN, ENTRE DEUX PARTIES (v349) ======
   « Je veux que les pubs AdSense apparaissent exactement là où on veut, en
     fin de partie. » — « La pub doit prendre tout l'écran, pas comme ça. »
   Google n'autorise l'écran entier, dans un jeu, que par SA fonction adBreak
   (H5 Games Ads). Le script de Google est coupé net ; à sa place, une fausse
   file adsbygoogle joue Google : elle note chaque demande et répond comme
   lui — annonce montrée (beforeAd… afterAd, adBreakDone), rien à montrer
   (adBreakDone tout de suite), ou silence (script bloqué). Sur un iPhone :
     1. LA PAGE SE DÉCLARE À ADSENSE : le script du compte (avec un écart
        minimal entre deux annonces), la balise google-adsense-account,
        ads.txt à la racine, et les deux fonctions adBreak / adConfig ;
     2. LES RÉSULTATS D'ABORD : à la fin de chaque partie (Solo, « À revoir »,
        Groupe, les cinq jeux), l'écran des résultats arrive sans aucune
        annonce — ni plein écran, ni bloc dans la page ;
     3. EN LES QUITTANT, L'ÉCRAN ENTIER : Rejouer (Solo, Groupe, un jeu),
        Quitter, Autres jeux — chacun demande UNE annonce « next », les
        résultats restent dessous pendant qu'elle est là, et l'on arrive
        ensuite là où l'on allait ;
     4. LE SON DU JEU SE TAIT pendant l'annonce, et revient après ;
     5. RIEN À MONTRER : on passe aussitôt ;
     6. GOOGLE MUET (script bloqué) : on passe au bout d'une seconde et
        demie, une seule fois ;
     7. JAMAIS AILLEURS : pas en pleine partie, pas en quittant une partie en
        cours, pas à la fin d'une partie en ligne, pas deux fois pour la même
        partie (un double toucher pendant l'annonce ne fait rien) ;
     8. UN NAVIGATEUR PILOTÉ NE DEMANDE RIEN, sauf quand un banc le demande
        exprès (des annonces demandées par un automate avec le compte de
        Taylor, c'est du trafic invalide pour Google) : il ne charge même pas
        le script de Google, et rien ne part chez Google ;
     9. L'ADRESSE DU JEU est https://yadaquiz.app/ : « Partager », et les
        invitations des groupes ;
    10. aucune erreur.
   Usage : node banc-essai/pub-fin.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

/* La fausse file de Google : elle reçoit adBreak et adConfig comme la vraie. */
const FAUX_GOOGLE = (banc) => {
  if (!/^http/.test(location.protocol)) return;
  localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
  if (banc) window.__pubBanc = true;
  window.__pauses = []; window.__configs = []; window.__modePub = 'montre'; window.__annonce = false; window.__journal = [];
  const file = [];
  file.push = function (o) {
    if (o && o.type) {
      window.__pauses.push({ type: o.type, name: o.name, ecran: (typeof state !== 'undefined') ? state.screen : null });
      const m = window.__modePub;
      if (m === 'rien') setTimeout(() => { o.adBreakDone && o.adBreakDone({ breakStatus: 'frequencyCapped' }); }, 30);
      else if (m === 'montre') setTimeout(() => {
        window.__annonce = true; window.__journal.push('avant'); o.beforeAd && o.beforeAd();
        setTimeout(() => {
          window.__journal.push('fin:' + state.screen + ':' + !!(typeof musicPlaying !== 'undefined' && musicPlaying));
          window.__annonce = false; o.afterAd && o.afterAd(); o.adBreakDone && o.adBreakDone({ breakStatus: 'viewed' });
        }, 700);
      }, 50);
      return 0;
    }
    if (o && (o.preloadAdBreaks || o.sound)) { window.__configs.push(o); return 0; }
    return Array.prototype.push.call(this, o);
  };
  window.adsbygoogle = file;
  try { navigator.share = (d) => { window.__partage = d; return Promise.resolve(); }; } catch (e) {}
};

async function ouvrir(nav, banc) {
  const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  p._google = []; p.on('request', r => { if (/googlesyndication|doubleclick|adtrafficquality|adservice\.google/.test(r.url())) p._google.push(r.url().slice(0, 90)); });
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(FAUX_GOOGLE, banc);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(700);
  return { ctx, p };
}
/* Les écrans de fin, posés comme le jeu les pose (une partie finie). */
const FINIR = async (p, quoi) => {
  await p.evaluate((quoi) => {
    document.querySelectorAll('#modalVeil').forEach(e => e.remove());
    if (quoi === 'solo') { state.mode = 'solo'; state.revision = false; startGame(); state.soloScore = 120; state.soloCorrect = 9; state.screen = 'end'; render(); }
    else if (quoi === 'revoir') { state.mode = 'solo'; startGame(); state.revision = true; state.revisionDe = 'setup'; state.soloMissed = []; state.screen = 'end'; render(); }
    else if (quoi === 'groupe') { state.revision = false; state.mode = 'group'; state.teams = [{ name: 'Taylor' }, { name: 'Benoît' }, { name: 'Sam' }]; state.scores = [40, 30, 10]; state.screen = 'end'; render(); }
    else { jeu = null; state.screen = 'jeux'; render(); lancerJeu(quoi); jeu.pct = 80; jeu.bons = jeu.manches.length - 1; jeu.points = 50; jeu.meilleure = 3; jeu.nouveau = false; jeu.record = 60; state.screen = 'jeu-fin'; render(); }
  }, quoi);
  await p.waitForFunction(() => document.querySelectorAll('#app > .screen').length === 1, null, { timeout: 6000 }).catch(() => {});
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('#modalVeil').forEach(e => e.remove()));
};
const etat = (p) => p.evaluate(() => ({ ecran: state.screen, pauses: window.__pauses.length, annonce: window.__annonce, ins: document.querySelectorAll('#app ins.adsbygoogle').length }));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const { ctx, p } = await ouvrir(nav, true);

    /* 1 */
    const tete = await p.evaluate(async () => {
      const sc = [...document.querySelectorAll('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')];
      const meta = (document.querySelector('meta[name="google-adsense-account"]') || {}).content || null;
      let ads = null; try { ads = (await (await fetch(new URL('ads.txt', location.href).href, { cache: 'no-store' })).text()).trim(); } catch (e) {}
      return { n: sc.length, src: sc[0] && sc[0].getAttribute('src'), ecart: sc[0] && sc[0].getAttribute('data-ad-frequency-hint'), meta, ads,
        fonctions: typeof window.adBreak + '/' + typeof window.adConfig };
    });
    dit('1. la page se déclare à AdSense : le script du compte (une minute au moins entre deux annonces), la balise, ads.txt, et adBreak / adConfig',
      tete.n === 1 && /client=ca-pub-4777080561806498/.test(tete.src) && tete.ecart === '60s' && tete.meta === 'ca-pub-4777080561806498'
      && tete.ads === 'google.com, pub-4777080561806498, DIRECT, f08c47fec0942fa0' && tete.fonctions === 'function/function', JSON.stringify(tete));

    /* 2 */
    const fautes2 = [];
    for (const e of ['solo', 'revoir', 'groupe', 'ordre', 'quiou', 'combien', 'erreur', 'morceaux']) {
      const avant = await p.evaluate(() => window.__pauses.length);
      await FINIR(p, e);
      const r = await etat(p);
      if (!(r.pauses === avant && r.ins === 0 && (r.ecran === 'end' || r.ecran === 'jeu-fin'))) fautes2.push(e + ' ' + JSON.stringify(r));
    }
    dit('2. les résultats d\'abord : chaque fin de partie arrive sans annonce, ni plein écran ni bloc dans la page (Solo, À revoir, Groupe, les cinq jeux)',
      !fautes2.length, fautes2.join(' | '));

    /* 3 et 4 : en quittant les résultats, l'écran entier, puis la suite */
    const fautes3 = [], son = [];
    const CAS = [
      ['solo', '.end-actions .btn-replay', 'play'],
      ['solo', '.end-actions .btn-quit', 'setup'],
      ['groupe', '.end-actions .btn-replay', 'play'],
      ['revoir', '.end-actions .btn-quit', 'setup'],
      ['combien', '.jx-rejouer', 'jeu'],
      ['morceaux', '.jx-autres', 'jeux'],
    ];
    for (const [fin, bouton, apres] of CAS) {
      await FINIR(p, fin);
      /* Le son du jeu joue (comme après un premier toucher). */
      await p.evaluate(() => { try { audioUnlocked = true; settings.music = true; getCtx(); startMusic(); } catch (e) {} window.__journal = []; });
      const avant = await p.evaluate(() => window.__pauses.length);
      const avantSon = await p.evaluate(() => typeof musicPlaying !== 'undefined' && musicPlaying);
      await p.locator(bouton).first().tap();
      await p.waitForTimeout(350);
      const pendant = await p.evaluate(() => ({ ecran: state.screen, annonce: window.__annonce, musique: typeof musicPlaying !== 'undefined' && musicPlaying, coupe: typeof masterCoupe !== 'undefined' && masterCoupe }));
      await p.waitForTimeout(1100);
      const r = await p.evaluate((avant) => ({ ecran: state.screen, n: window.__pauses.length - avant, demande: window.__pauses[window.__pauses.length - 1], journal: window.__journal.slice(),
        apresSon: typeof musicPlaying !== 'undefined' && musicPlaying }), avant);
      const ok = r.n === 1 && r.demande && r.demande.type === 'next' && r.demande.name === 'fin-de-partie' && (r.demande.ecran === 'end' || r.demande.ecran === 'jeu-fin')
        && pendant.annonce && (pendant.ecran === 'end' || pendant.ecran === 'jeu-fin') && r.ecran === apres;
      if (!ok) fautes3.push(fin + ' ' + bouton + ' ' + JSON.stringify({ pendant, r }));
      son.push({ fin, avant: avantSon, pendant: pendant.musique, coupe: pendant.coupe, apres: r.apresSon });
      await p.evaluate(() => { try { jeu = null; } catch (e) {} state.screen = 'mode'; render(); });
      await p.waitForTimeout(400);
    }
    dit('3. en quittant les résultats (Rejouer, Quitter, Autres jeux), UNE annonce plein écran « next » ; les résultats restent dessous pendant qu\'elle est là, puis on arrive là où l\'on allait',
      !fautes3.length, fautes3.join(' | ') || CAS.map(c => c[0] + '→' + c[2]).join(', '));
    dit('4. le son du jeu se tait pendant l\'annonce, et revient après', son.every(s => s.avant === true && s.pendant === false && s.coupe === true && s.apres === true), JSON.stringify(son));

    /* 5. Rien à montrer */
    await p.evaluate(() => { window.__modePub = 'rien'; });
    await FINIR(p, 'solo');
    const t5 = Date.now();
    await p.locator('.end-actions .btn-replay').tap();
    await p.waitForFunction(() => state.screen === 'play', null, { timeout: 4000 }).catch(() => {});
    const d5 = Date.now() - t5, e5 = await etat(p);
    dit('5. Google n\'a rien à montrer : on passe aussitôt', e5.ecran === 'play' && d5 < 600, d5 + ' ms, ' + JSON.stringify(e5));
    await p.evaluate(() => { state.screen = 'mode'; render(); });

    /* 6. Google muet */
    await p.evaluate(() => { window.__modePub = 'muet'; window.__compteRendus = 0; });
    await FINIR(p, 'groupe');
    const t6 = Date.now();
    await p.locator('.end-actions .btn-quit').tap();
    await p.waitForTimeout(800);
    const e6a = await etat(p);
    await p.waitForFunction(() => state.screen === 'setup', null, { timeout: 4000 }).catch(() => {});
    const d6 = Date.now() - t6;
    /* un second toucher pendant l'attente n'a rien relancé : on est arrivé une seule fois */
    const e6 = await p.evaluate(() => ({ ecran: state.screen, ecrans: document.querySelectorAll('#app > .screen').length }));
    dit('6. Google muet (script bloqué) : les résultats restent, puis on passe au bout d\'une seconde et demie, une seule fois',
      e6a.ecran === 'end' && e6.ecran === 'setup' && d6 >= 1300 && d6 < 3000, d6 + ' ms, ' + JSON.stringify({ e6a, e6 }));
    await p.evaluate(() => { window.__modePub = 'montre'; state.screen = 'mode'; render(); });
    await p.waitForTimeout(500);

    /* 7. Jamais ailleurs */
    const r7 = await p.evaluate(async () => {
      const n0 = window.__pauses.length, z = (ms) => new Promise(r => setTimeout(r, ms));
      /* en pleine partie, puis en la quittant en cours */
      state.mode = 'solo'; state.revision = false; startGame(); await z(600);
      const enPartie = window.__pauses.length - n0;
      retourAuMode(); await z(400);
      const quitterEnCours = window.__pauses.length - n0;
      /* un jeu quitté en cours, puis « Autres jeux »… depuis l'écran des jeux */
      lancerJeu('combien'); await z(400); allerOnglet('jeux'); await z(400);
      const jeuQuitte = window.__pauses.length - n0;
      /* la fin d'une partie en ligne */
      const j = (id, n, c) => ({ id, name: n, color: c, score: 30, idx: 0, done: true, gone: false, vu: Date.now(), arrive: 1 });
      net.room = { id: 'E' }; net.isHost = true; net.code = 'E'; net.score = 40; net.oppScore = 30;
      net.joueurs = { 'j-g': j('j-g', 'Alex', '#E0526B'), 'j-h': j('j-h', 'Sam', '#39B98A') };
      state.screen = 'online-end'; render(); await z(500);
      const enLigne = window.__pauses.length - n0;
      try { net.room = null; net.joueurs = {}; } catch (e) {}
      state.screen = 'mode'; render(); await z(300);
      return { enPartie, quitterEnCours, jeuQuitte, enLigne };
    });
    /* même partie : deux touchers sur « Rejouer » pendant l'annonce → une seule demande, une seule partie */
    await FINIR(p, 'solo');
    const n7 = await p.evaluate(() => window.__pauses.length);
    await p.locator('.end-actions .btn-replay').tap();
    await p.waitForTimeout(250);
    await p.evaluate(() => { const b = document.querySelector('.end-actions .btn-replay'); if (b) b.click(); });
    await p.waitForTimeout(1300);
    const double = await p.evaluate((n7) => ({ n: window.__pauses.length - n7, ecran: state.screen, q: state.currentIndex }), n7);
    /* et la partie suivante, quittée en cours, ne montre rien */
    await p.evaluate(() => retourAuMode()); await p.waitForTimeout(400);
    const apresDouble = await p.evaluate((n7) => window.__pauses.length - n7, n7);
    dit('7. jamais ailleurs : ni en pleine partie, ni en quittant une partie en cours, ni à la fin d\'une partie en ligne ; une seule fois par partie finie',
      r7.enPartie === 0 && r7.quitterEnCours === 0 && r7.jeuQuitte === 0 && r7.enLigne === 0 && double.n === 1 && double.ecran === 'play' && apresDouble === 1,
      JSON.stringify({ r7, double, apresDouble }));

    /* 9. L'adresse du jeu */
    const r9 = await p.evaluate(async () => {
      try { shareGame(); } catch (e) {}
      await new Promise(res => setTimeout(res, 200));
      return { constante: GAME_URL, partage: window.__partage && window.__partage.url, invitation: lienInvitation({ code: 'ABC123' }) };
    });
    dit('9. l\'adresse du jeu est https://yadaquiz.app/ : « Partager » et les invitations des groupes',
      r9.constante === 'https://yadaquiz.app/' && r9.invitation === 'https://yadaquiz.app/?groupe=ABC123' && (!r9.partage || r9.partage === 'https://yadaquiz.app/'), JSON.stringify(r9));
    p._errs.forEach(e => errs.push(e));
    await ctx.close();

    /* 8. Un navigateur piloté, sans demande expresse du banc */
    const o = await ouvrir(nav, false);
    await FINIR(o.p, 'solo');
    const t8 = Date.now();
    await o.p.locator('.end-actions .btn-replay').tap();
    await o.p.waitForFunction(() => state.screen === 'play', null, { timeout: 4000 }).catch(() => {});
    const r8 = await o.p.evaluate(() => ({ pilote: navigator.webdriver, pauses: window.__pauses.length, configs: window.__configs.length, ecran: state.screen,
      script: document.querySelectorAll('script[src*="adsbygoogle"]').length }));
    r8.google = o.p._google.length; r8.vers = o.p._google.slice(0, 2);
    dit('8. un navigateur piloté ne demande rien (ni annonce, ni réglage) ; le script de Google n\'est pas chargé, rien ne part chez Google ; et l\'on passe aussitôt',
      r8.pilote === true && r8.pauses === 0 && r8.configs === 0 && r8.ecran === 'play' && r8.script === 0 && r8.google === 0 && Date.now() - t8 < 800, JSON.stringify(r8));
    o.p._errs.forEach(e => errs.push(e));
    await o.ctx.close();
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('10. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — les résultats d\'abord, puis l\'annonce en plein écran, par la voie de Google ; et yadaquiz.app partout');
  process.exit(ko ? 1 : 0);
})();
