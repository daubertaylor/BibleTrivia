/* ====== BANC « CLAVIER OUVERT, LA PAGE NE GLISSE PLUS SOUS LE DOIGT » (v339) ======
   « Regarde : lorsque je glisse le doigt vers le bas depuis là où j'ai
     écrit, ça fait un bug de saccade. » (vidéo, iPhone, une discussion :
   toute la discussion tremble de haut en bas tant que le doigt bouge.)
   Clavier ouvert, iOS faisait glisser la page entière sous le doigt, et le
   jeu la remettait en place une image trop tard. Ce banc ne peut pas faire
   glisser une page comme iOS ; il vérifie ce qui l'en empêche désormais :
   chaque geste, joué au doigt (le protocole tactile de Chromium), est-il
   retenu (preventDefault) ou laissé à ce qu'il fait défiler ?
   La discussion de clavier-discussion.js (24 messages), un clavier simulé.
     1. clavier ouvert, tirer la barre d'écriture vers le bas : le geste est
        retenu dès le départ, et passé 28 px le clavier se range (le champ
        perd le foyer, la discussion reprend sa hauteur) ;
     2. la tirer vers le HAUT : retenu, le clavier reste ;
     3. faire défiler le fil vers les anciens messages : le geste est libre
        (le fil défile), le clavier reste ;
     4. le fil tout en haut, le tirer encore vers le bas : retenu (la page ne
        glisse plus), et le clavier reste — seule la barre le range ;
     5. un appui long sur le champ, puis le doigt bouge (le curseur, la
        loupe) : libre, le clavier reste ;
     6. un geste horizontal sur la barre : libre ;
     7. un long message qui défile dans le champ : le faire défiler est libre ;
     8. clavier fermé : rien n'est retenu nulle part (l'écoute bloquante
        n'existe que clavier ouvert) ;
     9. aucune erreur.
   Sur la v338 : 1, 2 et 4 rouges — rien n'était retenu.
   Usage : node banc-essai/clavier-glisser-page.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const W = 402, H = 874, KB = 346;
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  try {
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 62, bottom: 34, left: 0, right: 0 } }).catch(() => {});
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.evaluate(() => {
      document.documentElement.classList.add('is-standalone');
      compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
      grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false };
      grp.liste = [{ id: 'g1', nom: 'Les amis du jeudi', teinte: 2, non_lus: 0, nb_membres: 2, code: '7UHF5T', role: 'proprietaire' }];
      grp.membres = { g1: [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null }, { membre: 'u-2', role: 'membre', muet_jusqu: null }] };
      grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' } };
      const t = Date.now(), msgs = [];
      for (let i = 1; i <= 24; i++) msgs.push({ id: i, groupe: 'g1', auteur: i % 3 ? 'u-2' : 'moi-0', genre: 'texte', texte: (i === 24 ? 'Le dernier message' : 'Message numéro ' + i), cree_le: new Date(t - (30 - i) * 60000).toISOString() });
      grp.fils = { g1: { charge: true, tout: true, messages: msgs } };
      grp.courant = 'g1'; state.screen = 'groupe'; render();
      window.__retenus = [];
      document.addEventListener('touchmove', e => window.__retenus.push(e.defaultPrevented), { passive: true });
    });
    await p.waitForTimeout(1300);
    await p.evaluate(([kb, h]) => {
      Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => (window.__kb ? h - kb : h) });
    }, [KB, H]);

    const ouvrirClavier = async () => {
      await p.evaluate(() => { window.__kb = true; const c = document.getElementById('compoTexte'); c.focus({ preventScroll: true }); window.visualViewport.dispatchEvent(new Event('resize')); });
      await p.waitForTimeout(900);
      return p.evaluate(() => document.documentElement.classList.contains('kb-fil') && document.activeElement && document.activeElement.id === 'compoTexte');
    };
    const centre = (sel) => p.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }, sel);
    /* Un geste au doigt : posé, une pause éventuelle (appui long), puis des pas. */
    const geste = async (x, y, pas, attente) => {
      await p.evaluate(() => { window.__retenus = []; });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      if (attente) await p.waitForTimeout(attente);
      let cx = x, cy = y;
      for (const [dx, dy] of pas) {
        cx += dx; cy += dy;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy }] });
        await p.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await p.waitForTimeout(80);
      return p.evaluate(() => window.__retenus.slice());
    };
    const bas = (n, d) => Array.from({ length: n }, () => [0, d]);
    const etat = () => p.evaluate(() => ({ foyer: !!document.activeElement && document.activeElement.id === 'compoTexte',
      kb: document.documentElement.classList.contains('kb'), fil: Math.round(document.getElementById('fil').scrollTop) }));
    const tous = (l) => l.length > 0 && l.every(Boolean), aucun = (l) => l.length > 0 && !l.some(Boolean);

    /* 1 */
    const o1 = await ouvrirClavier();
    const c1 = await centre('#compoTexte');
    const r1 = await geste(c1.x, c1.y, bas(10, 4));
    await p.waitForTimeout(250);
    const e1 = await etat();
    dit('1. clavier ouvert, tirer la barre d\'écriture vers le bas : retenu dès le départ, et le clavier se range',
      o1 && tous(r1.slice(0)) && !e1.foyer && !e1.kb, JSON.stringify({ o1, r1, e1 }));

    /* 2 */
    const o2 = await ouvrirClavier();
    const c2 = await centre('#compoTexte');
    const r2 = await geste(c2.x, c2.y, bas(10, -4));
    const e2 = await etat();
    dit('2. la tirer vers le haut : retenu, le clavier reste', o2 && tous(r2) && e2.foyer && e2.kb, JSON.stringify({ o2, r2, e2 }));

    /* 3 */
    await p.evaluate(() => { const f = document.getElementById('fil'); f.scrollTop = Math.round((f.scrollHeight - f.clientHeight) / 2); });
    await p.waitForTimeout(150);
    const c3 = await centre('#fil');
    const avant3 = (await etat()).fil;
    const r3 = await geste(c3.x, c3.y, bas(10, 6));
    await p.waitForTimeout(200);
    const e3 = await etat();
    dit('3. faire défiler le fil vers les anciens messages : libre (le fil défile), le clavier reste',
      aucun(r3) && e3.foyer && e3.kb && e3.fil < avant3, JSON.stringify({ r3, avant3, e3 }));

    /* 4 */
    await p.evaluate(() => { document.getElementById('fil').scrollTop = 0; });
    await p.waitForTimeout(150);
    const r4 = await geste(c3.x, c3.y, bas(10, 6));
    const e4 = await etat();
    dit('4. le fil tout en haut, le tirer encore vers le bas : retenu, et le clavier reste',
      tous(r4) && e4.foyer && e4.kb, JSON.stringify({ r4, e4 }));

    /* 5 */
    const c5 = await centre('#compoTexte');
    const r5 = await geste(c5.x, c5.y, bas(10, 4), 600);
    const e5 = await etat();
    dit('5. un appui long puis le doigt bouge (le curseur, la loupe) : libre, le clavier reste', aucun(r5) && e5.foyer && e5.kb, JSON.stringify({ r5, e5 }));

    /* 6 */
    const r6 = await geste(c5.x - 60, c5.y, Array.from({ length: 10 }, () => [8, 1]));
    const e6 = await etat();
    dit('6. un geste horizontal sur la barre : libre', aucun(r6) && e6.foyer, JSON.stringify({ r6, e6 }));

    /* 7 */
    await p.evaluate(() => { const c = document.getElementById('compoTexte'); c.value = Array.from({ length: 14 }, (_, i) => 'Ligne ' + (i + 1)).join('\n'); c.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.waitForTimeout(400);
    const t7 = await p.evaluate(() => { const c = document.getElementById('compoTexte'); c.scrollTop = c.scrollHeight; return { h: c.scrollHeight, v: c.clientHeight, st: Math.round(c.scrollTop) }; });
    const c7 = await centre('#compoTexte');
    const r7 = await geste(c7.x, c7.y, bas(8, 4));
    const e7 = await etat();
    dit('7. un long message qui défile dans le champ : le faire défiler est libre, le clavier reste',
      t7.h > t7.v + 20 && t7.st > 0 && aucun(r7) && e7.foyer && e7.kb, JSON.stringify({ t7, r7, e7 }));

    /* 8 */
    await p.evaluate(() => { const c = document.getElementById('compoTexte'); c.value = ''; c.dispatchEvent(new Event('input', { bubbles: true })); c.blur(); window.__kb = false; window.visualViewport.dispatchEvent(new Event('resize')); });
    await p.waitForTimeout(900);
    const k8 = await p.evaluate(() => document.documentElement.classList.contains('kb'));
    const c8 = await centre('#compo');
    const r8a = await geste(c8.x, c8.y, bas(10, 4));
    const c8b = await centre('#fil');
    const r8b = await geste(c8b.x, c8b.y, bas(10, -6));
    dit('8. clavier fermé : rien n\'est retenu, ni sur la barre ni sur le fil', !k8 && aucun(r8a) && aucun(r8b), JSON.stringify({ k8, r8a, r8b }));

    dit('9. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await ctx.close().catch(() => {});
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — clavier ouvert, la page ne glisse plus sous le doigt ; tirer la barre vers le bas range le clavier');
  process.exit(ko ? 1 : 0);
})();
