/* ====== BANC « SUR ANDROID, LA BARRE D'ÉCRITURE MONTE AU-DESSUS DU CLAVIER » (v328) ======
   « Sur Android, j'ai le problème du clavier » — photo à l'appui : dans une
   discussion de groupe, le clavier ouvert, la barre d'écriture restait
   DESSOUS. Sur Android (interactive-widget=overlays-content), ni la page ni
   la zone visible ne rétrécissent : le clavier ne se connaît que par
   navigator.virtualKeyboard (boundingRect, « geometrychange »). Et Chrome
   Android rend parfois une POSITION fausse pour un clavier posé en bas
   (crbug 493416495 : boundingRect.y = 66), la HAUTEUR restant juste.
   Doublures fidèles (celles de clavier-vrai.js), clavier qui monte par
   paliers sans redimensionner la page. Pour deux Android (Pixel 9, petit
   Android) et cinq façons de dire le clavier :
     — la position juste (y = hauteur de la fenêtre − clavier) ;
     — la position fausse de Chrome (y = 66) ;
     — pas de position du tout (y = 0) ;
     — un clavier MUET : l'interface existe mais ne dit rien, et le
       navigateur pose quand même le clavier par-dessus (on soupçonne
       Samsung Internet) ;
     — pas d'interface du tout, et le clavier par-dessus (Firefox) ;
   exigé : la barre d'écriture ENTIÈREMENT au-dessus du clavier (pour les
   deux derniers, une fois que le jeu a compris — 1,5 s au plus — puis TOUT
   DE SUITE au lancement suivant, le téléphone s'en souvenant), l'en-tête de
   la discussion toujours là, la discussion rendue entière quand le clavier
   redescend ; et Chrome, qui dit son clavier, ne change jamais de mode.
   Aucune erreur.
   Usage : node banc-essai/clavier-android-discussion.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const TEL = [['Pixel 9', 412, 915, 330], ['Petit Android', 360, 740, 290]];
const POSITIONS = [['position juste', null], ['position fausse de Chrome (y = 66)', 66], ['sans position (y = 0)', 0],
  ['clavier muet (Samsung Internet ?)', 'muet'], ['sans interface du clavier (Firefox)', 'absent']];
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

/* Le navigateur simulé. « mode » : null / un nombre (Chrome, qui dit son
   clavier, à la position donnée), « muet » (l'interface existe, ne dit
   rien), « absent » (pas d'interface). Tant que l'en-tête dit
   overlays-content, la zone visible ne bouge pas ; s'il passe à
   resizes-visual, elle rétrécit de la hauteur du clavier, comme dans un
   vrai navigateur — tout de suite si le clavier est déjà là. */
const FAUX = (mode) => {
  const ev = new EventTarget();
  const etat = { kb: 0 };
  const redim = () => { const m = document.querySelector('meta[name="viewport"]'); return !!m && /resizes-visual/.test(m.getAttribute('content') || ''); };
  const fauxVV = {
    get width(){ return innerWidth; }, get height(){ return redim() ? innerHeight - etat.kb : innerHeight; },
    get offsetTop(){ return 0; }, get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  const vk = new EventTarget();
  let rect = new DOMRect(0, 0, 0, 0);
  vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
  Object.defineProperty(vk, 'boundingRect', { get(){ return rect; } });
  if (mode !== 'absent') Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
  /* h : la hauteur du clavier ; y : la position qu'il annonce (null = la juste). */
  window.__clavier = (h, y) => {
    etat.kb = h;
    if (mode !== 'muet' && mode !== 'absent' && vk.overlaysContent !== false) {
      rect = h > 0 ? new DOMRect(0, y == null ? innerHeight - h : y, innerWidth, h) : new DOMRect(0, 0, 0, 0);
      vk.dispatchEvent(new Event('geometrychange'));
    }
    if (redim()) fauxVV.dispatchEvent(new Event('resize'));
  };
  /* L'en-tête change : la zone visible suit aussitôt. */
  document.addEventListener('DOMContentLoaded', () => {
    const m = document.querySelector('meta[name="viewport"]');
    if (m) new MutationObserver(() => fauxVV.dispatchEvent(new Event('resize'))).observe(m, { attributes: true });
  });
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [tel, W, H, KB] of TEL) {
    for (const [nomPos, y] of POSITIONS) {
      const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(FAUX, typeof y === 'string' ? y : null);
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.waitForTimeout(600);
      /* Une discussion ouverte, une vingtaine de messages. */
      await p.evaluate(() => {
        grp.etat = { participe: 'ok' };
        grp.liste = [{ id: 'g1', nom: 'Les amis', teinte: 2, nb_membres: 3, notifs: 'tout', non_lus: 0, mentions: 0 }];
        grp.membres.g1 = [];
        grp.profils.u2 = { nom: 'Benoît', couleur: '#E8734C' };
        const t0 = Date.now() - 3600e3;
        grp.fils.g1 = { charge: true, tout: true, lu: 0, messages: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, groupe: 'g1', auteur: i % 3 ? 'u2' : 'moi', genre: 'texte',
          texte: 'Message numéro ' + (i + 1) + (i % 4 ? '' : ' — un peu plus long pour prendre deux lignes dans la bulle'), donnees: {}, cree_le: new Date(t0 + i * 60e3).toISOString(), masque: false, supprime_le: null })) };
        grp.courant = 'g1'; state.screen = 'groupe'; render();
      });
      await p.waitForTimeout(900);
      await p.locator('#compoTexte').tap();
      await p.waitForTimeout(120);
      const pos = typeof y === 'string' ? null : y;
      for (const f of [0.25, 0.5, 0.75, 1]) { await p.evaluate(([h, y]) => window.__clavier(h, y), [Math.round(KB * f), pos]); await p.waitForTimeout(40); }
      await p.waitForTimeout(typeof y === 'string' ? 1500 : 700);
      const ouvert = await p.evaluate((KB) => {
        const c = document.getElementById('compo').getBoundingClientRect();
        const t = document.querySelector('.grp-fil-tete').getBoundingClientRect();
        const haut = innerHeight - KB;
        return { compoBas: Math.round(c.bottom), compoHaut: Math.round(c.top), hautClavier: haut, tete: Math.round(t.top), teteBas: Math.round(t.bottom), focus: document.activeElement && document.activeElement.id };
      }, KB);
      dire(ouvert.compoBas <= ouvert.hautClavier + 1 && ouvert.compoHaut >= ouvert.teteBas && ouvert.tete >= 0 && ouvert.focus === 'compoTexte',
        tel + ', ' + nomPos + ' : la barre d\'écriture au-dessus du clavier (bas ' + ouvert.compoBas + ' ≤ ' + ouvert.hautClavier + '), l\'en-tête en place (' + ouvert.tete + ')');
      const memoire = await p.evaluate(() => localStorage.getItem('bt_clavier_redim'));
      if (typeof y !== 'string') dire(memoire !== '1', '   … Chrome dit son clavier : le jeu garde son mode (pas de bascule)');
      /* Le clavier redescend (bouton retour d'Android, champ toujours actif). */
      for (const f of [0.66, 0.33, 0]) { await p.evaluate(([h, y]) => window.__clavier(h, y), [Math.round(KB * f), y]); await p.waitForTimeout(40); }
      await p.waitForTimeout(800);
      const ferme = await p.evaluate(() => { const c = document.getElementById('compo').getBoundingClientRect(); return { bas: Math.round(c.bottom), H: innerHeight, kb: document.documentElement.classList.contains('kb-fil') }; });
      dire(!ferme.kb && ferme.bas > ferme.H - 140, '   … clavier redescendu : la discussion reprend toute la hauteur (barre à ' + ferme.bas + ' / ' + ferme.H + ')');
      /* Le lancement suivant, sur ce téléphone : le jeu se souvient, tout de suite. */
      if (typeof y === 'string') {
        await p.reload();
        await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
        await p.waitForTimeout(500);
        await p.evaluate(() => {
          grp.etat = { participe: 'ok' };
          grp.liste = [{ id: 'g1', nom: 'Les amis', teinte: 2, nb_membres: 3, notifs: 'tout', non_lus: 0, mentions: 0 }];
          grp.membres.g1 = []; grp.fils.g1 = { charge: true, tout: true, lu: 0, messages: [] };
          grp.courant = 'g1'; state.screen = 'groupe'; render();
        });
        await p.waitForTimeout(700);
        await p.locator('#compoTexte').tap();
        for (const f of [0.5, 1]) { await p.evaluate(([h]) => window.__clavier(h, null), [Math.round(KB * f)]); await p.waitForTimeout(40); }
        await p.waitForTimeout(350);
        const ensuite = await p.evaluate((KB) => ({ bas: Math.round(document.getElementById('compo').getBoundingClientRect().bottom), haut: innerHeight - KB,
          meta: (document.querySelector('meta[name="viewport"]').getAttribute('content').match(/interactive-widget=[a-z-]+/) || [''])[0] }), KB);
        dire(ensuite.bas <= ensuite.haut + 1 && /resizes-visual/.test(ensuite.meta), '   … au lancement suivant, tout de suite : barre au-dessus du clavier (' + ensuite.bas + ' ≤ ' + ensuite.haut + ', ' + ensuite.meta + ')');
      }
      if (errs.length) dire(false, '   erreurs : ' + errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  }
  await nav.close();
  console.log(ko ? `\n  ${ko} défaut(s)` : '\n  OK — sur Android, la barre d\'écriture monte au-dessus du clavier, quelle que soit la façon dont Chrome le décrit');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
