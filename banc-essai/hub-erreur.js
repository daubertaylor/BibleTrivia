/* ============ BANC « LE MESSAGE ROUGE DE L'ACCUEIL EN LIGNE » ============
   « Ici le truc de connexion en rouge est mal placé. »

   Il était posé entre « 1 connecté » et la ligne du joueur : il coupait en
   deux le seul groupe de l'écran qui dise QUI EST LÀ, et il n'était à côté
   d'aucun bouton pour réessayer. Mesuré : en apparaissant, il poussait aussi
   les trois cartes d'action de 36 px vers le bas.

   ON VÉRIFIE TROIS CHOSES, SUR TOUTES LES HAUTEURS :
     1. la ligne du joueur touche la carte de présence — le groupe n'est plus
        coupé ;
     2. le message est AU-DESSUS des trois actions, donc à côté du remède ;
     3. rien ne bouge d'un pixel quand il apparaît ou disparaît — sa place est
        réservée, vide comme pleine.
   Et pour les deux états de l'écran : au repos, et pendant la recherche d'un
   adversaire.

   Usage : node banc-essai/hub-erreur.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const SUPA = process.env.SUPA_UMD
  || '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/supabase.js';
const MSG = "La connexion au salon a échoué. Réessaie.";
const HAUTEURS = [553, 600, 643, 667, 700, 780, 800, 852, 873, 915, 944, 1000];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  /* La bibliothèque vient du disque : sans elle onlineConfigured() est faux et
     l'écran affiche la page « pas configuré », pas le hub. */
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(SUPA) }));
  await p.route('**://*.supabase.co/**', r => r.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } }));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8', isCreator: true }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return typeof render === 'function' && typeof net === 'object'
    && !!(window.supabase && window.supabase.createClient); } catch (e) { return false; } }, null, { timeout: 20000 });

  /* ===== ON ATTEND QUE ÇA SE POSE, ET ON DIT POURQUOI =====
     Première écriture : rendre, attendre 450 ms, mesurer. Le banc a alors
     annoncé « les actions bougent de 460 px » à 643 px de haut — et c'était
     FAUX : relevé à la main, les trois cartes étaient aux mêmes pixels avec et
     sans message (323 / 391 / 460). Ce que je mesurais, c'était l'animation
     d'entrée (.reveal-in) qui joue quand on repasse de la recherche aux
     actions, saisie en plein vol.
     On attend donc deux lectures IDENTIQUES d'affilée : tant que ça bouge, ce
     n'est pas une mise en page, c'est un mouvement. */
  const lire = () => p.evaluate(() =>
    [...document.querySelectorAll('.online-action, .searching-card')].map(e => Math.round(e.getBoundingClientRect().top)).join(','));
  /* ===== ON TIENT L'ÉCRAN PENDANT QU'ON MESURE =====
     Le lien temps réel est bouché dans ce banc (rien ne répond), et le jeu
     finit par quitter le mode en ligne tout seul — au beau milieu d'une
     mesure, on se retrouvait à relever l'ACCUEIL en croyant relever le hub,
     d'où des « les actions bougent de 473 px » parfaitement imaginaires.
     On remet donc l'écran en place à chaque tour, et on ne retient une lecture
     que si elle est identique à la précédente. */
  const poser = async (err, cherche) => {
    let a = null;
    for (let i = 0; i < 40; i++) {
      await p.evaluate(({ e, c }) => {
        if (state.screen !== 'online' || net.error !== e || net.searching !== c) {
          net.error = e; net.connected = 1; net.searching = c; state.screen = 'online'; render();
        }
      }, { e: err, c: cherche });
      await p.waitForTimeout(90);
      const b = await lire();
      if (b !== '' && b === a) return true;
      a = b;
    }
    return false;
  };
  const releve = async (err, cherche) => {
    await p.evaluate(({ e, c }) => { net.error = e; net.connected = 1; net.searching = c;
      state.screen = 'online'; render(); }, { e: err, c: cherche });
    if (!(await poser(err, cherche))) return { instable: true };
    return p.evaluate(() => {
      const bo = (s) => { const el = document.querySelector(s); if (!el) return null;
        const r = el.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom) }; };
      const app = document.getElementById('app');
      return { presence: bo('.presence-card'), me: bo('.me-row'), err: bo('.err-msg'),
        cible: bo('.online-action') || bo('.searching-card'),
        tous: [...document.querySelectorAll('.online-action, .searching-card')].map(e => Math.round(e.getBoundingClientRect().top)),
        deborde: Math.max(0, app.scrollHeight - app.clientHeight),
        vu: (()=>{ const e = document.querySelector('.err-msg'); if(!e) return null;
          return getComputedStyle(e).opacity !== '0'; })() };
    });
  };

  const soucis = [];
  for (const h of HAUTEURS) {
    await p.setViewportSize({ width: 393, height: h });
    for (const cherche of [false, true]) {
      const etat = cherche ? 'en recherche' : 'au repos';
      const sans = await releve('', cherche);
      const avec = await releve(MSG, cherche);
      if (sans.instable || avec.instable) { soucis.push(h + ' px (' + etat + ') : la mise en page ne se pose jamais'); continue; }
      if (!avec.err) { soucis.push(h + ' px (' + etat + ') : aucun message affiché'); continue; }
      /* 1. le groupe « qui est là » n'est plus coupé */
      const colle = avec.me && avec.presence && (avec.me.t - avec.presence.b) < 30;
      if (!colle) soucis.push(h + ' px (' + etat + ') : le message coupe encore la carte de présence de la ligne du joueur ('
        + (avec.me ? avec.me.t - avec.presence.b : '?') + ' px entre les deux)');
      /* 2. le message est au-dessus de ce qu'il faut toucher pour réessayer */
      if (avec.cible && avec.err.b > avec.cible.t + 1)
        soucis.push(h + ' px (' + etat + ') : le message est SOUS les actions');
      /* 3. rien ne bouge */
      const d = avec.tous.map((v, i) => Math.abs(v - (sans.tous[i] ?? v)));
      const pire = d.length ? Math.max(...d) : 0;
      if (pire > 0) soucis.push(h + ' px (' + etat + ') : les actions bougent de ' + pire + ' px');
      if (avec.deborde > 0 || sans.deborde > 0)
        soucis.push(h + ' px (' + etat + ') : débord de ' + Math.max(avec.deborde, sans.deborde) + ' px');
      /* et la place réservée reste invisible tant qu'il n'y a rien à dire */
      if (sans.vu) soucis.push(h + ' px (' + etat + ') : la place réservée se voit alors qu\'il n\'y a pas d\'erreur');
    }
  }
  if (errs.length) soucis.push('erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | '));
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('  OK — ' + HAUTEURS.length + ' hauteurs x 2 états : le groupe reste entier, le message est\n'
    + '       au-dessus du remède, et rien ne bouge de plus de 0 px');
})();
