/* ====== BANC « LES BOUTONS D'ANDROID ARRIVENT APRÈS LE CLAVIER » (v356) ======
   « Si je prends mon doigt, que je le mets sur la barre où j'écris, que je
     glisse vers le haut, le clavier s'ajuste parfaitement. Il faut que ce
     soit comme ça, sans que j'aie à faire la manipulation. Le clavier
     Android de base. »
   Photo d'avant le geste : la barre d'écriture trop basse de 48 px, la
   hauteur des boutons d'Android, revenus sous le clavier APRÈS lui. Le jeu
   ne relisait la marge sûre du bas qu'aux nouvelles du clavier ; une marge
   qui change seule ne prévient personne. Reproduit ici au plus près :
     — Chrome annonce un clavier qui ne compte pas les boutons, posé au bas
       d'une fenêtre qui n'a PAS rétréci (le plein écran) ;
     — la marge sûre du bas grandit de 48 px (Emulation.setSafeAreaInsetsOverride)
       0,3 s, puis 2,5 s après le clavier — sans aucun autre signal.
   Exigé, dans une discussion de groupe, sur deux Android :
     1. avant les boutons, la barre est posée sur le clavier annoncé ;
     2. les boutons arrivés, la barre d'écriture se recale TOUTE SEULE,
        entièrement au-dessus du vrai haut du clavier (boutons compris), et
        juste au-dessus (24 px au plus) ; l'en-tête ne bouge pas ;
     3. le relevé du clavier (Modération) dit la marge des boutons ;
     4. les boutons repartis, le champ toujours en main : la barre redescend
        sur le clavier annoncé ;
     5. aucune erreur.
   Usage : node banc-essai/clavier-boutons-tard.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const TEL = [['Pixel 9', 412, 915, 330], ['Petit Android', 360, 740, 290]];
const DELAIS = [300, 2500];
const BOUTONS = 48;
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

/* La doublure du navigateur : celle de clavier-boutons-android.js, réduite au
   plein écran (rien ne rétrécit, le clavier se dit par navigator.virtualKeyboard). */
const FAUX = () => {
  const ev = new EventTarget();
  const fauxVV = {
    get width(){ return innerWidth; }, get height(){ return innerHeight; },
    get offsetTop(){ return 0; }, get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  const vk = new EventTarget();
  let rect = new DOMRect(0, 0, 0, 0);
  vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
  Object.defineProperty(vk, 'boundingRect', { get(){ return rect; } });
  Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
  window.__clavier = (h) => { rect = h > 0 ? new DOMRect(0, innerHeight - h, innerWidth, h) : new DOMRect(0, 0, 0, 0); vk.dispatchEvent(new Event('geometrychange')); };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [tel, W, H, KB] of TEL) {
    for (const delai of DELAIS) {
      const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.route('**/pagead2.googlesyndication.com/**', (r) => r.abort());
      await p.addInitScript(FAUX);
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      const cdp = await ctx.newCDPSession(p);
      const boutons = (b) => cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, right: 0, bottom: b } });
      try {
        await p.goto(URL);
        await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
        await p.waitForTimeout(600);
        await p.evaluate(() => {
          grp.etat = { participe: 'ok' };
          grp.liste = [{ id: 'g1', nom: 'Les amis', teinte: 2, nb_membres: 3, notifs: 'tout', non_lus: 0, mentions: 0 }];
          grp.membres.g1 = []; grp.profils.u2 = { nom: 'Benoît', couleur: '#E8734C' };
          const t0 = Date.now() - 3600e3;
          grp.fils.g1 = { charge: true, tout: true, lu: 0, messages: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, groupe: 'g1', auteur: i % 3 ? 'u2' : 'moi', genre: 'texte',
            texte: 'Message numéro ' + (i + 1), donnees: {}, cree_le: new Date(t0 + i * 60e3).toISOString(), masque: false, supprime_le: null })) };
          grp.courant = 'g1'; state.screen = 'groupe'; render();
        });
        await p.waitForTimeout(900);
        const pose = () => p.evaluate(() => {
          const c = document.getElementById('compo').getBoundingClientRect();
          const t = document.querySelector('.grp-fil-tete').getBoundingClientRect();
          return { bas: Math.round(c.bottom), tete: Math.round(t.top) };
        });
        await p.locator('#compoTexte').tap();
        await p.waitForTimeout(150);
        for (const f of [0.25, 0.5, 0.75, 1]) { await p.evaluate((h) => window.__clavier(h), Math.round(KB * f)); await p.waitForTimeout(40); }
        await p.waitForTimeout(900);
        const sansBoutons = await pose();
        const annonce = H - KB;
        dire(sansBoutons.bas <= annonce + 1 && sansBoutons.bas >= annonce - 24,
          tel + ', boutons ' + delai + ' ms après le clavier : d\'abord posée sur le clavier annoncé (bas ' + sansBoutons.bas + ', clavier à ' + annonce + ')');
        await p.waitForTimeout(Math.max(0, delai - 900));
        await boutons(BOUTONS);
        await p.waitForTimeout(1300);
        const avecBoutons = await pose();
        const vraiHaut = H - KB - BOUTONS;
        dire(avecBoutons.bas <= vraiHaut + 1 && avecBoutons.bas >= vraiHaut - 24 && avecBoutons.tete === sansBoutons.tete,
          '   … les boutons arrivés, la barre se recale toute seule au-dessus du vrai haut du clavier (bas ' + avecBoutons.bas + ', clavier boutons compris à ' + vraiHaut + '), l\'en-tête immobile (' + sansBoutons.tete + '→' + avecBoutons.tete + ')');
        const releve = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt_clavier_diag') || '[]')[0] || null; } catch (e) { return null; } });
        dire(!!releve && releve.ouvert && releve.ouvert.sab === BOUTONS && Math.abs(releve.visible - vraiHaut) <= 1,
          '   … le relevé du clavier le dit (marge ' + (releve ? releve.ouvert.sab : '—') + ', hauteur visible ' + (releve ? releve.visible : '—') + ')');
        await boutons(0);
        await p.waitForTimeout(1300);
        const repartis = await pose();
        dire(repartis.bas <= annonce + 1 && repartis.bas >= annonce - 24,
          '   … les boutons repartis, le champ en main : la barre redescend sur le clavier annoncé (bas ' + repartis.bas + ', clavier à ' + annonce + ')');
      } catch (e) { dire(false, tel + ', ' + delai + ' ms : le banc s\'est arrêté — ' + e.message); }
      if (errs.length) dire(false, '   erreurs : ' + errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  }
  await nav.close();
  console.log(ko ? `\n  ${ko} défaut(s)` : '\n  OK — les boutons d\'Android peuvent arriver quand ils veulent : la barre d\'écriture se cale toute seule au-dessus du clavier');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
