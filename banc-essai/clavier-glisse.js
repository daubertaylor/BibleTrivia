/* ====== BANC « LA ZONE VISIBLE GLISSE : PAGES ET FENÊTRES S'Y POSENT » (v330) ======
   « Le clavier n'est pas du tout à la bonne taille pour Android. » Dans le
   mode ORDINAIRE (resizes-visual — celui où le jeu passe sur un téléphone
   dont le navigateur ne dit pas son clavier), Android ne fait pas que
   rétrécir la zone visible : pour montrer le champ touché, il la fait
   GLISSER vers le bas dans la page (visualViewport.offsetTop). Ce qui se
   posait sur le haut de la fenêtre restait remonté d'autant sur l'écran :
   l'en-tête coupé en haut, un vide entre la page et le clavier.
   clavier-android-discussion.js éprouve la discussion ; ici, les pages à
   champ et la fenêtre du code d'une partie. Un Android déjà passé au mode
   ordinaire, une zone visible qui glisse de 60 % du clavier ; tout se
   mesure SUR L'ÉCRAN :
     1. l'en-tête de la page entier sur l'écran ;
     2. le corps de la page s'arrête au bord du clavier (pas de vide) ;
     3. le champ visible, entre l'en-tête et le clavier ;
     4. la page passe sous le clavier jusqu'en bas de l'écran (pas de décor) ;
     5. la fenêtre du code d'une partie : entière, au-dessus du clavier ;
     6. clavier rangé : tout revient à sa place (décalage 0) ;
     7. aucune erreur.
   Usage : node banc-essai/clavier-glisse.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const W = 412, H = 915, KB = 330, GLISSE = 0.6;
const CHAMPS = [
  ['Créer · nom', "ouvrirCreation()", 'grpNom', 'grpCreerVeil'],
  ['Créer · description', "ouvrirCreation()", 'grpDesc', 'grpCreerVeil'],
  ['Rejoindre · code', "ouvrirCode()", 'grpCode', 'grpCodeVeil'],
];
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

/* Le navigateur en mode ordinaire : la zone visible rétrécit du clavier et
   glisse vers le bas ; navigator.virtualKeyboard existe mais ne dit rien. */
const FAUX = ([glisse]) => {
  localStorage.setItem('bt_clavier_redim', '1');
  const ev = new EventTarget();
  const etat = { kb: 0 };
  const fauxVV = {
    get width(){ return innerWidth; }, get height(){ return innerHeight - etat.kb; },
    get offsetTop(){ return etat.kb > 0 ? Math.round(etat.kb * glisse) : 0; },
    get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable: true, get(){ return fauxVV; } });
  const vk = new EventTarget();
  vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
  Object.defineProperty(vk, 'boundingRect', { get(){ return new DOMRect(0, 0, 0, 0); } });
  Object.defineProperty(navigator, 'virtualKeyboard', { configurable: true, get(){ return vk; } });
  window.__clavier = (h) => { etat.kb = h; fauxVV.dispatchEvent(new Event('resize')); };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ouvrirPage = async (ouvrir) => {
      const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2.625, userAgent: AND, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(FAUX, [GLISSE]);
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => { document.documentElement.classList.add('is-standalone');
        compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
        grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false }; grp.liste = []; grp.publics = [];
        state.screen = 'groupes'; render(); majBarre(); });
      await p.waitForTimeout(800);
      if (ouvrir) { await p.evaluate((o) => { new Function(o)(); }, ouvrir); await p.waitForTimeout(1300); }
      return { ctx, p };
    };
    const monter = async (p) => { for (const f of [0.25, 0.5, 0.75, 1]) { await p.evaluate((h) => window.__clavier(h), Math.round(KB * f)); await p.waitForTimeout(40); } await p.waitForTimeout(1100); };
    const descendre = async (p) => { for (const f of [0.66, 0.33, 0]) { await p.evaluate((h) => window.__clavier(h), Math.round(KB * f)); await p.waitForTimeout(40); } await p.waitForTimeout(900); };

    for (const [nom, ouvrir, champ, voile] of CHAMPS) {
      const { ctx, p } = await ouvrirPage(ouvrir);
      await p.locator('#' + champ).tap();
      await p.waitForTimeout(120);
      await monter(p);
      const m = await p.evaluate(([champ, voile, H, KB]) => {
        const dv = visualViewport.offsetTop || 0;
        const v = document.getElementById(voile), corps = v.querySelector('.settings-sheet'), tete = v.querySelector('.page-tete'), c = document.getElementById(champ);
        const ecran = (r) => ({ haut: Math.round(r.top - dv), bas: Math.round(r.bottom - dv) });
        return { dv, voile: ecran(v.getBoundingClientRect()), corps: ecran(corps.getBoundingClientRect()), tete: ecran(tete.getBoundingClientRect()), champ: ecran(c.getBoundingClientRect()),
          clavier: H - KB, focus: document.activeElement && document.activeElement.id };
      }, [champ, voile, H, KB]);
      dit(nom + ' : l\'en-tête entier sur l\'écran', m.tete.haut >= 0, 'en-tête à ' + m.tete.haut + ', zone visible glissée de ' + m.dv);
      dit('   le corps de la page s\'arrête au bord du clavier', Math.abs(m.corps.bas - m.clavier) <= 2, 'corps jusqu\'à ' + m.corps.bas + ', clavier à ' + m.clavier);
      dit('   le champ visible, entre l\'en-tête et le clavier', m.focus === champ && m.champ.haut >= m.tete.bas - 1 && m.champ.bas <= m.clavier, 'champ ' + m.champ.haut + '–' + m.champ.bas);
      dit('   la page passe sous le clavier jusqu\'en bas de l\'écran', m.voile.haut <= 0 && m.voile.bas >= H - 1, 'voile ' + m.voile.haut + '–' + m.voile.bas + ' / ' + H);
      await descendre(p);
      await p.evaluate(() => document.activeElement && document.activeElement.blur());
      await p.waitForTimeout(500);
      const f = await p.evaluate((voile) => ({ vvt: getComputedStyle(document.documentElement).getPropertyValue('--vvt').trim(), top: getComputedStyle(document.getElementById(voile)).top }), voile);
      dit('   clavier rangé : tout revient à sa place', (f.vvt === '' || f.vvt === '0px') && f.top === '0px', JSON.stringify(f));
      await ctx.close();
    }

    /* La fenêtre du code d'une partie (une modale à champ, centrée). */
    {
      const { ctx, p } = await ouvrirPage(null);
      await p.evaluate(() => { showModal({ title: 'Rejoindre une partie', message: '', input: true, placeholder: 'CODE', okLabel: 'Rejoindre', cancelLabel: 'Annuler', onOk: () => true }); });
      await p.waitForTimeout(700);
      const champ = await p.evaluate(() => { const i = document.querySelector('.modal-card input'); if (i) i.id = i.id || 'champModale'; return i ? i.id : null; });
      if (!champ) dit('la fenêtre du code d\'une partie a un champ', false, 'aucun champ dans la fenêtre');
      else {
        await p.locator('#' + champ).tap();
        await monter(p);
        const m = await p.evaluate(([H, KB]) => {
          const dv = visualViewport.offsetTop || 0;
          const r = document.querySelector('.modal-card').getBoundingClientRect();
          return { dv, haut: Math.round(r.top - dv), bas: Math.round(r.bottom - dv), clavier: H - KB };
        }, [H, KB]);
        dit('la fenêtre du code : entière, au-dessus du clavier', m.haut >= 0 && m.bas <= m.clavier, 'fenêtre ' + m.haut + '–' + m.bas + ', clavier à ' + m.clavier + ', zone visible glissée de ' + m.dv);
      }
      await ctx.close();
    }
    dit('aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la zone visible a beau glisser, pages et fenêtres s\'y posent : en-tête entier, rien de vide au-dessus du clavier');
  process.exit(ko ? 1 : 0);
})();
