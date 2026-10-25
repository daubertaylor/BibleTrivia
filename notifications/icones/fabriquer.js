/* ====== LES VIGNETTES DES NOTIFICATIONS (v335) ======
   L'image à droite d'une notification Android, une par sorte (voir ICONES
   dans sw.js). Elles ne sont pas dessinées à part : ce sont les pastilles du
   JEU, lues dans le jeu lui-même — la palette (--pal-*), les icônes (ICONS,
   LOGOS_GROUPE, ACH_ICONS) —, puis posées sur une page vierge, fond
   transparent, et photographiées. Une couleur ou une icône change dans le
   jeu : on relance, et les notifications suivent.
     — une pastille du jeu : coins de 14 px pour 43 (--r-ico), l'icône
       blanche dedans avec la marge de .mode-icon, le reflet du haut ;
     — 168 px de côté : la grande image d'une notification fait 64 dp, et
       Chrome RÉDUIT SANS LISSER une image plus grande que l'écran ne la
       montre (NotificationBuilderBase.ensureNormalizedIcon) ; 168, c'est
       64 dp sur les écrans les plus courants (2,625) : pas de réduction là,
       ni sur tout écran plus dense ;
     — la pastille occupe 64 % de l'image : à côté du rond de l'app, à
       gauche, elle a la même présence, pas celle d'une photo.
   Le petit pictogramme (badge.png) se fait à part : node ne sait pas lire
   un PNG, voir badge.py.
   Usage : node notifications/icones/fabriquer.js http://127.0.0.1:8099/index.html */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const ICI = __dirname;
const PART = 0.64, PX = 168;
/* La sorte, sa teinte, son icône — la même que celle qui la porte dans le
   jeu : la flamme (le logo de groupe, plein : la flamme du compteur est en
   couleurs), la cible de la page À revoir, la coupe de la Progression, le
   parchemin pour le verset, la bougie et le livre des rappels de prière et
   de lecture (Réglages), la cloche des Notifications, les bulles de l'onglet
   des groupes, la manette d'une partie, le bouclier de la modération. */
const SORTES = [
  ['flamme',     'feu',     'LOGOS_GROUPE[5].svg'],
  ['revoir',     'pourpre', 'ICONS.cible'],
  ['absence',    'vert',    'ICONS.trophy'],
  ['verset',     'or',      'ACH_ICONS.scroll'],
  ['priere',     'indigo',  'LOGOS_GROUPE[11].svg'],
  ['lecture',    'rose',    'ICONS.book'],
  ['rappels',    'jade',    'ICONS.bell'],
  ['message',    'corail',  'ICONS.bulles'],
  ['partie',     'corail',  'ICONS.manette'],
  ['moderation', 'ardoise', 'ICONS.bouclier'],
];
/* Le feu n'est pas dans la palette des pastilles (--feu est une teinte de
   verre) : son dégradé est posé ici, à la manière des autres. */
const FEU = ['#F7883F', '#E25A12'];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const ctx = await nav.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 4, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    const lu = await p.evaluate(([sortes, feu]) => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n) => cs.getPropertyValue(n).trim();
      return sortes.map(([nom, teinte, expr]) => ({ nom, svg: eval(expr),
        a: teinte === 'feu' ? feu[0] : v('--pal-' + teinte + '-a'),
        b: teinte === 'feu' ? feu[1] : v('--pal-' + teinte + '-b') }));
    }, [SORTES, FEU]);
    const q = await ctx.newPage();
    await q.setContent('<!doctype html><html style="background:transparent"><body style="margin:0;background:transparent"></body></html>');
    for (const s of lu) {
      await q.evaluate(([s, part, px]) => {
        document.body.innerHTML = '';
        const cote = px / 4, t = cote * part, k = t / 43.2;
        const d = document.createElement('div');
        d.id = 'v';
        d.style.cssText = `width:${cote}px;height:${cote}px;display:flex;align-items:center;justify-content:center;`;
        d.innerHTML = `<span style="width:${t}px;height:${t}px;border-radius:${14 * k}px;padding:${9.6 * k}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(150deg, ${s.a}, ${s.b});box-shadow:inset 0 ${k}px 0 rgba(255,255,255,0.26);">${s.svg}</span>`;
        const g = d.querySelector('svg'); g.style.width = '100%'; g.style.height = '100%'; g.style.display = 'block';
        document.body.appendChild(d);
      }, [s, PART, PX]);
      await q.locator('#v').screenshot({ path: path.join(ICI, s.nom + '.png'), omitBackground: true });
      console.log('  ' + s.nom + '.png   ' + s.a + ' → ' + s.b);
    }
  } finally { await nav.close(); }
})();
