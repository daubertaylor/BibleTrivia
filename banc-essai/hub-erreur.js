/* ============ BANC « LE MESSAGE ROUGE DE L'ACCUEIL EN LIGNE » ============
   « Ici le truc de connexion en rouge est mal placé. »  Puis, deux versions
   plus tard : « L'interface au-dessous est décalée par rapport au message
   d'erreur. Règle ça et mets le message d'erreur ailleurs. »

   TROIS ÉTATS SUCCESSIFS, ET CE QUE CHACUN A COÛTÉ.
     v-1 : le message était posé entre « 1 connecté » et la ligne du joueur ; il
           coupait en deux le seul groupe qui dise QUI EST LÀ, et poussait les
           trois cartes d'action de 36 px vers le bas.
     v258 : je l'ai remonté sous le titre et j'ai RÉSERVÉ sa hauteur pour que
           rien ne bouge. Plus rien ne bougeait, en effet — au prix d'un trou
           de 88 px sous le titre, en permanence, sur un écran qui n'affiche un
           message qu'une fois sur mille. Taylor l'a vu tout de suite.
     v260 : le message ne participe plus du tout à la mise en page. Il se pose
           PAR-DESSUS (.err-flot), sous le titre, aligné au pixel sur lui.
           Rien à réserver : le trou tombe à 16 px, le rythme normal.

   ON VÉRIFIE QUATRE CHOSES, SUR TOUTES LES HAUTEURS :
     1. pas de trou sous le titre — l'interface commence tout de suite, avec ou
        sans message (c'est la plainte de Taylor, et elle se mesure) ;
     2. le message est sous le titre et bien au-dessus des actions, donc à côté
        du remède et jamais « dans les boutons » ;
     3. rien ne bouge d'un demi-pixel quand il apparaît ou disparaît ;
     4. il est aligné AU PIXEL sur l'en-tête — même gauche, même largeur. Un
        bandeau posé à la main peut dériver sur un appareil qu'on n'a pas
        essayé ; on relit donc sa position réelle plutôt que de la supposer.
   Et pour les deux états de l'écran : au repos, et pendant la recherche.

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
  /* ON NE MESURE PAS ARRONDI. Arrondir d'abord, comparer ensuite, c'est
     inventer un pixel : relevé au centième, le message déplace les cartes de
     419,17 -> 419,17, soit RIEN, et le « 1 px » venait d'un bord d'arrondi
     franchi entre deux relevés (419,17 et 419,23) par le seul moteur du verre.
     On compare donc les vraies valeurs, et on refuse tout ce qui dépasse un
     demi-pixel — plus sévère que l'arrondi, pas moins. */
  const lire = () => p.evaluate(() =>
    [...document.querySelectorAll('.online-action, .searching-card')].map(e => e.getBoundingClientRect().top.toFixed(1)).join(','));
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
      const cadre = (s) => { const el = document.querySelector(s); if(!el) return null;
        const r = el.getBoundingClientRect(); return { t:r.top, b:r.bottom, g:r.left, l:r.width }; };
      const ef = document.querySelector('.err-flot');
      return { presence: bo('.presence-card'), me: bo('.me-row'), err: bo('.err-flot'),
        entete: cadre('.screen .app-header'), bandeau: cadre('.err-flot'),
        premier: bo('.presence-card') || bo('.online-action'),
        cible: bo('.online-action') || bo('.searching-card'),
        tous: [...document.querySelectorAll('.online-action, .searching-card')].map(e => e.getBoundingClientRect().top),
        deborde: Math.max(0, app.scrollHeight - app.clientHeight),
        vu: ef ? getComputedStyle(ef).opacity !== '0' : false };
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
      /* 1. PAS DE TROU SOUS LE TITRE. C'est la plainte, et elle se chiffre :
            88 px en v258, avec ou sans message. Le rythme normal entre deux
            blocs de cet écran est de 16 px ; on refuse tout ce qui dépasse
            largement, dans LES DEUX états. */
      for(const [quoi, r] of [['sans message', sans], ['avec message', avec]]){
        if(r.entete && r.premier){
          const trou = Math.round(r.premier.t - r.entete.b);
          if(trou > 28) soucis.push(h + ' px (' + etat + ', ' + quoi + ') : trou de ' + trou
            + ' px sous le titre — l\'interface est décalée');
        }
      }
      if (!avec.err) { soucis.push(h + ' px (' + etat + ') : aucun message affiché'); continue; }
      /* 2. il est sous le titre, et bien au-dessus des actions : à côté du
            remède, jamais collé aux boutons (« il est trop dans les boutons »). */
      if (avec.entete && avec.err.t < avec.entete.b)
        soucis.push(h + ' px (' + etat + ') : le message passe par-dessus le titre');
      if (avec.cible && avec.err.b > avec.cible.t - 40)
        soucis.push(h + ' px (' + etat + ') : le message colle aux actions');
      /* 3. rien ne bouge */
      const d = avec.tous.map((v, i) => Math.abs(v - (sans.tous[i] ?? v)));
      const pire = d.length ? Math.max(...d) : 0;
      if (pire > 0.5) soucis.push(h + ' px (' + etat + ') : les actions bougent de ' + pire.toFixed(2) + ' px');
      if (avec.deborde > 0 || sans.deborde > 0)
        soucis.push(h + ' px (' + etat + ') : débord de ' + Math.max(avec.deborde, sans.deborde) + ' px');
      /* 4. aligné AU PIXEL sur l'en-tête, gauche et largeur. */
      if (avec.entete && avec.bandeau){
        const dg = Math.abs(avec.bandeau.g - avec.entete.g), dl = Math.abs(avec.bandeau.l - avec.entete.l);
        if (dg > 1 || dl > 1) soucis.push(h + ' px (' + etat + ') : bandeau désaligné du titre ('
          + dg.toFixed(1) + ' px à gauche, ' + dl.toFixed(1) + ' px de largeur)');
      }
      /* et la place réservée reste invisible tant qu'il n'y a rien à dire */
      if (sans.vu) soucis.push(h + ' px (' + etat + ') : le bandeau se voit alors qu\'il n\'y a pas d\'erreur');
      if (!avec.vu) soucis.push(h + ' px (' + etat + ') : le bandeau ne se voit pas alors qu\'il y a une erreur');
    }
  }
  if (errs.length) soucis.push('erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | '));
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('  OK — ' + HAUTEURS.length + ' hauteurs x 2 états : aucun trou sous le titre, le message\n'
    + '       se pose par-dessus, aligné au pixel, et rien ne bouge d\'un demi-pixel');
})();
