/* ============ BANC « PLUS UN MOT DE FRANÇAIS EN ANGLAIS » ============
   Le banc des traductions lit le CODE. Il a été vert deux fois de suite
   pendant que l'écran En ligne affichait « connecté », « Partie aléatoire »
   et « Créateur » en toutes lettres — parce qu'il ne savait pas lire les
   gabarits multilignes. Corrigé, il est resté vert sur « Commencer le duel »,
   « En attente des joueurs… » et « Code invalide. » : ces phrases-là n'ont
   aucun accent, et l'accent était son seul indice.

   ALORS ON ARRÊTE DE LIRE LE CODE. On met le jeu en anglais, on ouvre chaque
   écran et chaque panneau, et on RAMASSE LE TEXTE VISIBLE — exactement ce que
   l'œil reçoit. Peu importe comment la phrase a été fabriquée, concaténée,
   injectée : si du français s'affiche, il est là.

   COMMENT ON RECONNAÎT LE FRANÇAIS sans dictionnaire de langue : deux indices
   qui ne se trompent pas. Un accent (le jeu n'a aucun mot anglais accentué),
   ou un mot-outil français qui n'existe pas en anglais — « les », « une »,
   « pour », « avec », « qui »… La liste ci-dessous exclut soigneusement les
   faux amis : « plus », « par », « ton », « son », « salon », « duel » et
   « a » sont des mots anglais, ils n'y sont pas.

   ET UNE DEUXIÈME BARRIÈRE, QUI NE DÉPEND D'AUCUNE LISTE. Les initiales des
   jours — « D L M M J V S » — sont du français pur, et aucun des deux indices
   ci-dessus ne peut les voir : pas d'accent, pas de mot. Il a fallu les
   trouver à l'œil. Alors on pose la question autrement : on peint chaque
   écran DEUX FOIS, en français puis en anglais, et on demande CE QUI N'A PAS
   BOUGÉ. Un texte identique dans les deux langues n'a pas été traduit — sauf
   s'il ne doit pas l'être, et ceux-là se comptent : les noms propres, les
   chiffres, les initiales d'avatar, les sigles, les titres de Bible.
   Cette barrière-là n'a rien à savoir du français : elle voit tout ce qui
   manque, dans n'importe quelle langue qu'on ajoutera ensuite.

   Usage : node banc-essai/anglais-ecrans.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const SUPA = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/supabase.js';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';

/* Les mots-outils français qui NE SONT PAS des mots anglais. Volontairement
   court : un seul faux positif et le banc devient du bruit qu'on ignore. */
const MOTS = ('le les la une des du aux et est sont tu toi ta tes ne pas pour avec dans sur '
  + 'qui que quoi cette ces sa ses sans mais donc comme toute tous toutes vous nous ils elles '
  + 'votre notre leurs chaque autres encore aussi jamais toujours deja ici oui joueur joueurs '
  + 'partie attente commencer quitter rejoindre choisis choisir aucune aucun '
  + 'bonne bonnes mauvaise mauvaises reponse reponses erreur erreurs '
  + 'livre livres verset versets serie flamme jour jours semaine prochaine derniere premiere '
  + 'bravo felicitations continuer recommencer rejouer terminer retour suivant '
  + 'chargement parametres').split(/\s+/);
const RE_MOTS = new RegExp('(^|[^\\p{L}])(' + MOTS.join('|') + ')([^\\p{L}]|$)', 'iu');
const RE_ACCENT = /[àâäéèêëîïôöùûüÿçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇŒÆ]/;

/* Ce qu'on laisse passer : les noms propres et les sigles qui restent
   identiques dans toutes les langues. Rien d'autre. */
const TOLERE = [
  /^Yada$/i, /^Taylor$/i, /^[A-Z0-9]{2,6}$/,           /* sigles de versions, codes de salon */
  /^\d[\d\s:·%\/.,-]*$/,                                /* nombres, scores, minuteries */
  /^[·•→←✓×+\-–—\s]*$/,                                 /* ponctuation seule */
  /* UNE LANGUE S'ÉCRIT DANS SA PROPRE LANGUE. « Français » au milieu d'un
     écran anglais n'est pas un oubli : c'est ainsi qu'on choisit une langue
     qu'on ne lit pas encore. */
  /^(Français|English|Español|Português|Deutsch|Italiano)$/,
  /* LE TITRE D'UN LIVRE EST UN NOM PROPRE. « La Sainte Bible, Ostervald,
     1744 » s'appelle ainsi en toutes langues. La vraie réponse n'est pas de
     traduire ces titres mais de proposer des Bibles ANGLAISES quand on lit en
     anglais — c'est la tâche suivante, et le jour où elle sera faite ces
     lignes-là ne passeront plus par ici. */
  /^(La Sainte Bible|La Bible|Bible Annotée|Segond|Darby|Ostervald|Crampon|King James|American Standard|World English)/i,
];

const PREP = (lg) => {
  localStorage.setItem('bt_langue', lg);
  localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8', isCreator:true }));
  localStorage.setItem('bt_fs_hint', '1');
  localStorage.setItem('bt_progress', JSON.stringify({ books:{ 'Genèse':12, 'Jean':7 }, correct:434 }));
  const k = (n)=>{ const d=new Date(Date.now()-n*86400000); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  localStorage.setItem('bt_daily', JSON.stringify({ last:k(1), streak:5, jours:[k(1),k(2),k(3),k(4)], geles:[k(5)], gels:1, parties:12 }));
};

/* On ramasse le texte que l'œil reçoit : les nœuds de texte visibles, plus ce
   que portent les attributs qui s'affichent (placeholder, aria-label, title). */
const RAMASSER = () => {
  const vu = [];
  const visible = (el) => {
    for(let n = el; n && n !== document.body; n = n.parentElement){
      const s = getComputedStyle(n);
      if(s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
    }
    return true;
  };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for(let n = w.nextNode(); n; n = w.nextNode()){
    const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
    if(!t) continue;
    const p = n.parentElement;
    if(!p || p.tagName === 'SCRIPT' || p.tagName === 'STYLE') continue;
    if(!visible(p)) continue;
    /* L'ENDROIT, C'EST AUSSI CELUI D'AU-DESSUS. Les lettres de la grille de la
       flamme vivent dans des <span> nus : sans le parent, leur emplacement
       s'appelle « SPAN » et ne dit rien. */
    const pp = p.parentElement;
    vu.push({ t, ou: ((p.className || p.tagName) + ' ' + (pp ? (pp.className || pp.tagName) : '')).trim() });
  }
  document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => {
    if(!visible(el)) return;
    ['placeholder','aria-label','title'].forEach(a => {
      const v = (el.getAttribute(a) || '').trim();
      if(v) vu.push({ t:v, ou:(el.className||el.tagName) + '@' + a });
    });
  });
  return vu;
};

/* Ce qu'on laisse passer à la DEUXIÈME barrière : les textes qui ont le droit
   d'être identiques en français et en anglais. Chacun est ici pour une raison
   qu'on peut dire à voix haute. */
const MEME_DANS_LES_DEUX = [
  { quoi:/^(Yada|Taylor|Sam|Lee|Kim)$/,        car:'un nom propre' },
  { quoi:/^(Job|Daniel|Esther|Ruth|Jude|Amos|Nahum|Joel|Amen|Hosanna)$/i, car:'même mot dans les deux langues' },
  { quoi:/^(Duel|Options|Score|Records|Contact|Version|Format|Instagram|Notifications?|Guide|Volume|Testament|Solo|Installation|Modes?|Messages?|Info|Centurion|Bibliophile)$/i, car:'même mot dans les deux langues' },
  { quoi:/^\d+\s*(questions?|pts|points?|s|min)$/i, car:'un nombre et un mot écrit pareil' },
  { quoi:/^[^\p{L}]*$/u,                       car:'aucune lettre — chiffres, ponctuation, icône' },
  { quoi:/^(Français|English|Español|Português|Deutsch|Italiano)$/, car:'une langue s\'écrit dans sa langue' },
  { quoi:/^(La Sainte Bible|La Bible|Bible |Bible Annotée|Louis Segond|Segond|Darby|David Martin|Martin|Ostervald|Crampon|King James|American Standard|World English)/i, car:'le titre d\'une Bible est un nom propre' },
  /* DEUX SIGNES AU MINIMUM. Une SEULE lettre est justement ce qu'on cherche :
     les initiales des jours, « D L M M J V S », sont restées françaises très
     longtemps parce qu'elles ressemblent à tout et à rien. Les initiales
     d'avatar, elles, sont couvertes par leur emplacement (LIEUX_LIBRES) — pas
     par leur forme. */
  { quoi:/^[A-Z0-9]{2,6}$/,                    car:'un sigle, un code de salon' },
  /* Samedi et Saturday commencent par la même lettre : la seule des sept qui
     ait le droit de ne pas changer. Les six autres, si elles reparaissent
     identiques, c'est que la bande est repassée en français. */
  { quoi:/^S$/, ou:/\bsj\b|fg-sem/,            car:'samedi et Saturday, même initiale' },
  /* Les lettres de repère : A B C D devant les options, l'initiale d'une
     équipe. Ce sont des numéros écrits en lettres, pas des mots. */
  { quoi:/^[A-Z]$/, ou:/letter|team-token/,    car:'une lettre de repère, pas un mot' },
  /* L'ABRÉGÉ DE CERTAINS LIVRES EST LE MÊME DANS LES DEUX LANGUES.
     « 1 Corinthiens » et « 1 Corinthians » s'abrègent tous deux en « 1 Cor. » ;
     de même « 2 Chron. » et « Philip. ». Vérifié dans LIVRES_COURTS_EN, qui les
     porte explicitement — ce n'est pas un oubli de traduction, c'est la bonne
     abréviation des deux côtés. */
  { quoi:/^(1 Cor\.|2 Cor\.|1 Chron\.|2 Chron\.|Philip\.|Col\.|Dan\.|Jude|Job|Ruth|Esther|Amos|Joel|Nahum)$/, ou:/bk-nm/,
    car:'la même abréviation dans les deux langues' },
];
/* Les endroits où un texte identique est normal quelle que soit la langue :
   l'initiale d'un avatar, le code du salon, un score, un chiffre.
   ET LES QUESTIONS. « Amnon », « Absalom », « David » s'écrivent pareil dans
   les deux langues : un énoncé ou une option identique ne prouve rien ici.
   Ce n'est pas un trou — les 1545 questions sont vérifiées une par une, et
   comparées à la banque française, par banc-essai/questions-en.js. */
const LIEUX_LIBRES = /avatar|code-big|rank-pts|sem-t$|scorebar|q-counter|timer|logo|st-ico|ficon|ico\b|opt-text|q-text|rev-q|rev-a|rev-fact|ftext|fact-|hero-verse/;

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });

  /* UNE PASSE = UN NAVIGATEUR NEUF DANS UNE LANGUE. La langue est lue au
     démarrage (changer de langue recharge le jeu), alors on recharge nous
     aussi : c'est le seul moyen honnête d'obtenir les deux rendus. */
  const passe = async (lg) => {
    const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
      userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage();
    const erreurs = [];
    p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
    if(fs.existsSync(SUPA)){
      await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(SUPA) }));
      await p.route('**://*.supabase.co/**', r => r.fulfill({ status:204, headers:{ 'Access-Control-Allow-Origin':'*' } }));
    }
    await p.addInitScript(PREP, lg);
    await p.goto(URL);
    await p.waitForFunction((l) => { try { return typeof render === 'function' && typeof state === 'object' && LANGUE === l; } catch(e){ return false; } }, lg, { timeout:20000 });
    /* ===== ON ATTEND QUE L'ÉCRAN D'OUVERTURE AIT RENDU LA MAIN =====
       Le nom du jeu s'assemble pendant QUATRE SECONDES, puis un setTimeout
       pose state.screen='mode' et redessine. Le banc, lui, partait après 600 ms
       et enchaînait ses étapes : la septième ou la huitième tombait pile sur ce
       réveil, qui écrasait l'écran qu'elle venait de demander. C'est « Progression »
       qui y passait — et ses vingt-deux phrases (« books mastered », « Goals »,
       les seize objectifs, les deux testaments) se déclaraient « jamais vues »
       alors que l'écran les peignait très bien. Une minute d'attente de plus
       ici vaut mieux qu'un écran jamais relu. */
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
    await p.waitForTimeout(400);
    /* TOUT REFERMER AVANT D'OUVRIR. Le panneau des Réglages n'est pas une
       « modal » : il a sa propre porte (closeSettings), et closeModal ne la
       touche pas. Il restait donc ouvert du deuxième écran jusqu'au dernier,
       posé par-dessus tout ce que le banc croyait regarder — et les textes
       qu'il porte étaient recomptés à chaque étape. On la pose DANS la page :
       les étapes y sont exécutées, elles ne voient rien d'ici. */
    await p.evaluate(() => {
      window.__fermerTout = () => {
        ['closeModal', 'closeSettings', 'closeFlamme', 'closeLangues', 'closeBibles', 'closeMissedReview']
          .forEach(f => { try { if(typeof window[f] === 'function') window[f](); } catch(e){} });
        document.querySelectorAll('.sheet-veil, .modal-veil').forEach(v => { try { v.remove(); } catch(e){} });
      };
    });

  /* Chaque étape : un nom, et ce qu'il faut faire pour y être. On force l'état
     plutôt que de cliquer — plus court, et surtout reproductible. */
  /* ===== LES FINS DE PARTIE =====
     Dix-huit mots de fin — trois par palier, six paliers — plus les lignes de
     resultat : aucun ne s'affiche tant qu'on n'a pas FINI une partie. C'etait
     le plus gros angle mort du banc, et c'est le moment ou le joueur lit le
     plus attentivement.
     LE MOT AFFICHE NE DEPEND PAS QUE DU SCORE. soloPerformanceMessage() lit
     aussi l'historique : le palier vient du pourcentage ET du record, et la
     variante vient du nombre de parties. Forcer le score seul ne montrait donc
     qu'un mot sur dix-huit — c'est ce que faisait la premiere version de ces
     etapes, et c'est pourquoi le compte des phrases jamais vues ne bougeait
     presque pas. On pose donc les trois entrees ensemble. */
  const finSolo = (o) => {
    __fermerTout();
    localStorage.setItem('bt_stats', JSON.stringify({ bestScore:1, bestPct:o.best, games:o.games }));
    state.mode = 'solo'; state.daily = false; state.revision = !!o.revision;
    state.soloIsRecord = !!o.record;
    state.questions = seededDeck(21, '9', null);
    state.currentIndex = state.questions.length;
    state.soloMissed = (o.rates || []).map(i => state.questions[i]);
    localStorage.setItem('bt_lastmiss', JSON.stringify(o.reste ? ['a', 'b'] : []));
    state.soloScore = Math.round(maxPossibleScore() * o.part);
    state.soloCorrect = Math.round(state.questions.length * o.part);
    state.soloBestStreak = state.soloCorrect;
    state.screen = 'end'; render();
  };
  const FINS_SOLO = (() => {
    const cas = [];
    /* nom du palier, part du score maximal, record a l'historique */
    const paliers = [['haut', 0.95, 20], ['bon', 0.72, 20], ['moyen', 0.50, 20],
      /* bas + peu de parties + petit record = « debut » */
      ['debut', 0.25, 20],
      /* bas + record bien au-dessus = « mieux » ; le record >= 65 ecarte « debut » */
      ['mieux', 0.25, 90]];
    for(const [nom, part, best] of paliers)
      for(const g of [1, 2, 3])
        cas.push(['Fin Solo ' + nom + ' ' + g, finSolo, { part, best, games:g }]);
    /* « creux » : bas, sans record a invoquer. Il faut sortir de « debut »
       (plus de cinq parties) sans entrer dans « mieux » (record a moins de
       25 points au-dessus du jour). */
    for(const g of [7, 8, 9])
      cas.push(['Fin Solo creux ' + (g - 6), finSolo, { part:0.30, best:40, games:g }]);
    /* Les trois lignes qui coiffent le mot de fin. */
    cas.push(['Fin Solo record', finSolo, { part:0.95, best:20, games:3, record:true }]);
    cas.push(['Fin Revision tout', finSolo, { part:0.9, best:50, games:3, revision:true, rates:[], reste:false }]);
    cas.push(['Fin Revision reste', finSolo, { part:0.6, best:50, games:3, revision:true, rates:[0, 1], reste:true }]);
    return cas;
  })();
  const finGroupe = (o) => {
    __fermerTout();
    state.mode = 'group';
    state.teams = [{ name:'Taylor' }, { name:'Sam' }, { name:'Lee' }];
    state.scores = o.scores;
    state.questions = seededDeck(21, '9', null);
    state.currentIndex = state.questions.length;
    state.screen = 'end'; render();
  };
  const FINS_GROUPE = [
    ['Fin Groupe', finGroupe, { scores:[120, 80, 40] }],
    ['Fin Groupe ex aequo', finGroupe, { scores:[120, 120, 40] }],
  ];

  /* ===== LES SEIZE FICHES D'OBJECTIF =====
     Leur NOM tient sur la grille de la Progression ; leur DESCRIPTION ne
     s'écrit que dans la fiche qu'on ouvre en touchant le badge. Seize phrases
     que le banc n'avait jamais lues, alors qu'un joueur curieux les ouvre
     toutes en une minute. */
  const FICHES = Array.from({ length:16 }, (_, i) =>
    ['Objectif ' + (i + 1), (k) => {
      __fermerTout();
      if(!ACHIEVEMENTS[k]) return;
      /* Un objectif décroché ne dit pas la même chose qu'un objectif en cours :
         on alterne, pour lire « Goal unlocked » ET la progression chiffrée. */
      const p = loadProgress(); p.ach = p.ach || {};
      p.ach[ACHIEVEMENTS[k].id] = (k % 2 === 0) ? Date.now() : 0;
      saveProgress(p);
      openAchInfo(ACHIEVEMENTS[k].id);
    }, i]);

  /* ===== LA FLAMME ET SES ÉTATS =====
     « Aucune série en cours », « Un jour manqué », « Hier était manqué »,
     « Aucun gel en réserve » : quatre phrases qui décrivent quatre situations
     qu'on ne peut pas attendre — il faudrait manquer un jour pour les voir.
     On écrit donc le carnet des jours à la main, comme le jeu l'écrit. */
  const flamme = (o) => {
    __fermerTout();
    const jour = (n) => { const t = new Date(); t.setDate(t.getDate() - n);
      const p = (x) => String(x).padStart(2, '0');
      return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()); };
    localStorage.setItem('bt_daily', JSON.stringify({
      last: o.jours && o.jours.length ? jour(o.jours[0]) : '',
      streak: o.serie || 0, gels: o.gels || 0,
      jours: (o.jours || []).map(jour), geles: (o.geles || []).map(jour),
    }));
    state.screen = 'mode'; render(); ouvrirFlamme();
  };
  const FLAMMES = [
    ['Flamme · rien',      flamme, { jours:[], geles:[], gels:0, serie:0 }],
    ['Flamme · un jour',   flamme, { jours:[0], geles:[], gels:1, serie:1 }],
    /* Trois mois d'histoire : la feuille écrit alors le nom des mois et des
       jours de la semaine, les vingt-six dernières phrases du dictionnaire
       que rien d'autre n'affiche. */
    ['Flamme · longue',    flamme, { jours:[0,1,2,3,5,6,7,30,31,60,61,90], geles:[4], gels:2, serie:4 }],
    ['Flamme · hier raté', flamme, { jours:[0,2,3,4], geles:[], gels:0, serie:1 }],
  ];

  /* ===== LA PARTIE EN GROUPE, ET SES TROIS TEMPS =====
     Poser la question, révéler, attribuer les points. « Reveal the answer »,
     « Who got it right? », « Time's up! » et « See the results » ne vivent que
     là, et le banc n'allait jamais plus loin que la première image. */
  const groupe = (o) => {
    __fermerTout();
    state.mode = 'group';
    state.teams = [{ name:'Taylor' }, { name:'Sam' }];
    state.scores = [30, 20];
    state.questions = seededDeck(21, '9', null);
    state.currentIndex = o.dernier ? state.questions.length - 1 : 2;
    state.revealed = !!o.revele;
    state.timedOut = !!o.temps;
    state.awarded = [];
    if(o.tier && state.questions[state.currentIndex]) state.questions[state.currentIndex].tier = o.tier;
    state.screen = 'play'; render();
  };
  const GROUPE = [
    ['Groupe · question',  groupe, { tier:'facile' }],
    ['Groupe · révélé',    groupe, { revele:true, tier:'moyen' }],
    ['Groupe · temps',     groupe, { revele:true, temps:true, tier:'difficile' }],
    ['Groupe · dernière',  groupe, { revele:true, dernier:true }],
    /* Deux joueurs sans nom : le bouton de départ refuse, et le dit. */
    ['Groupe · sans nom',  () => { __fermerTout(); state.mode='group';
      state.teams=[{name:''},{name:''}]; state.screen='setup'; render();
      const b = document.querySelector('.btn-start, .btn-primary'); if(b) b.click(); }],
  ];

  /* ===== LE DUEL, DE SON DÉBUT À SES CINQ FINS =====
     Victoire, défaite, égalité, forfait, « beau duel » : cinq mots qui ne
     s'écrivent qu'une fois la dernière question passée, et un seul par partie. */
  const finLigne = (o) => {
    __fermerTout();
    net.connected = 1; net.error = ''; net.code = 'ABCD';
    net.joueurs = { b:{ id:'b', name:'Sam', color:'#E8574C' } };
    net.opp = net.joueurs.b; net.oppPresent = true;
    net.deck = seededDeck(12345, '9', null);
    net.idx = net.deck.length; net.myDone = true; net.oppDone = true;
    net.score = o.moi; net.oppScore = o.lui; net.correct = 3;
    net.oppGone = !!o.parti; net.forfait = !!o.parti;
    state.screen = 'online-end'; render();
  };
  const FINS_LIGNE = [
    ['Duel · victoire',   finLigne, { moi:80, lui:40 }],
    ['Duel · défaite',    finLigne, { moi:30, lui:90 }],
    ['Duel · égalité',    finLigne, { moi:60, lui:60 }],
    ['Duel · forfait',    finLigne, { moi:40, lui:20, parti:true }],
  ];

  const ETAPES = [
    ['Accueil',           () => { state.screen='mode'; render(); }],
    ['Réglages',          () => { openSettings(); }],
    ['Versions de Bible', () => { __fermerTout(); openBibles(); }],
    ['Langues',           () => { __fermerTout(); openLangues(); }],
    ['Flamme',            () => { __fermerTout(); state.screen='mode'; render(); ouvrirFlamme(); }],
    ['Profil',            () => { __fermerTout(); state.screen='profile'; render(); }],
    ['Progression',       () => { state.screen='parcours'; render(); }],
    ['À revoir',          () => { state.screen='revoir'; render(); }],
    /* LE CARNET VIDE NE MONTRE PAS TOUT. Sans erreurs, la jauge, la liste des
       livres et le compte des échéances ne sont pas peints du tout — six
       intitulés que le banc ne voyait donc jamais. On remplit le carnet par le
       CHEMIN DU JEU (errbookAdd), puis on avance deux échéances à aujourd'hui
       et on rate deux questions une seconde fois, pour que les quatre portes
       comptent quelque chose. */
    ['À revoir · rempli', () => {
      __fermerTout();
      localStorage.removeItem('bt_errbook');
      const d = seededDeck(4242, '9', null);
      d.forEach(q => errbookAdd(q));
      errbookAdd(d[0]); errbookAdd(d[1]);
      const a = loadErrbook();
      if(a[2]) a[2].du = dayKey(0);
      if(a[3]) a[3].du = dayKey(0);
      if(a[4]) a[4].p = 2;
      saveErrbook(a);
      localStorage.setItem('bt_lastmiss', JSON.stringify([qKey(d[0]), qKey(d[1])]));
      state.screen='revoir'; render(); }],
    ['Réglages Groupe',   () => { state.mode='group'; state.screen='setup'; render(); }],
    ['Réglages Solo',     () => { state.mode='solo'; state.screen='setup'; render(); }],
    ['Partie Solo',       () => { state.mode='solo'; startGame(); }],
    ['Fin de partie',     () => { state.screen='end'; render(); }],
    ['Nom en ligne',      () => { state.screen='online-name'; render(); }],
    ['Hub en ligne',      () => { net.connected=1; net.error=''; state.screen='online'; render(); }],
    ['Hub · erreur',      () => { net.error = T("La connexion au salon a échoué. Réessaie."); render(); }],
    /* La carte de recherche d'adversaire : un écran entier que le banc ne
       voyait pas, et qui contenait « Dès qu'un autre joueur cherche… » en
       français dans le texte. */
    ['Recherche',         () => { net.searching=true; render(); }],
    ['Rejoindre',         () => { net.searching=false; net.error=''; state.screen='online-join'; render(); }],
    ['Code invalide',     () => { joinRoom('AB', false); }],
    ['Salon seul',        () => { net.error=''; net.code='ABCD'; net.isHost=true; net.joueurs={}; net.oppPresent=false; state.screen='online-room'; render(); }],
    ['Salon à deux',      () => { net.joueurs={ b:{ id:'b', name:'Sam', color:'#E8574C', ready:true } }; net.oppPresent=true; net.opp=net.joueurs.b; render(); }],
    ['Salon à quatre',    () => { net.joueurs={ b:{ id:'b', name:'Sam', color:'#E8574C', ready:true }, c:{ id:'c', name:'Lee', color:'#4CE88A', ready:false }, d:{ id:'d', name:'Kim', color:'#E8C84C', ready:true } }; render(); }],
    /* LE FACE-À-FACE SANS ADVERSAIRE. Deux joueurs comptés, mais l'autre pas
       encore là : c'est le seul chemin qui peint « En attente… » dans la
       colonne de droite, et il était resté en français pendant que le banc
       était vert — parce qu'aucune étape ne passait par là. */
    ['Salon · duel vide',  () => { net.joueurs={ b:{ id:'b', name:'Sam', color:'#E8574C' } }; net.oppPresent=false; net.opp=null; render(); }],
    /* Une partie en ligne, posée à la main : la même pioche que le jeu, la
       réponse déjà révélée, pour voir aussi la carte du fait et le bouton
       « Question suivante ». */
    ['Partie en ligne',    () => { net.oppPresent=true; net.opp=net.joueurs.b;
      net.deck = seededDeck(12345, '9', null); net.idx = 3; net.score = 40; net.correct = 3;
      net.selected = net.deck[3].correct; net.revealed = true; net.timerKey = '30';
      state.screen='online-play'; render(); }],
    ['Fin en ligne',       () => { net.myDone = true; state.screen='online-end'; render(); }],
    /* Les trois panneaux qu'on n'atteint qu'après avoir joué ou fouillé. */
    /* On remplit le carnet EXACTEMENT comme le jeu le remplit — mêmes champs,
       même chemin. La première version de cette étape inventait sa propre
       forme ; la feuille affichait « [object Object] » et le banc, content,
       ne voyait pas le français qui dormait dessous. */
    ['Revoir mes erreurs', () => { const d = seededDeck(777, '9', null);
      const faux = (q) => q.options[(q.options.indexOf(q.correct) + 1) % q.options.length];
      state.soloMissed = [d[0], d[1]].map(q => ({ q:q.q, options:q.options, correct:q.correct,
        chosen:faux(q), fact:q.fact }));
      openMissedReview(state.soloMissed); }],
    ['Succès',             () => { __fermerTout(); openAchInfo(ACHIEVEMENTS[0].id); }],
    ['Guide plein écran',  () => { __fermerTout(); state.screen='mode'; render(); openFsGuide(); }],
    /* ===== LES FENÊTRES DE CONFIRMATION =====
       showModal ne traduit rien de lui-même : chaque appelant pose ses T().
       Treize phrases ne les avaient jamais eus. On ouvre donc ici CHAQUE
       fenêtre par la fonction du jeu qui l'ouvre — pas en réinventant l'appel.
       La première version de cette étape passait « titre / texte / ok » là où
       showModal attend « title / message / okLabel » : la fenêtre s'ouvrait
       VIDE, le banc n'y lisait rien, et il en déduisait que tout allait bien. */
    ['Hors connexion',     () => { __fermerTout();
      const ol = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
      Object.defineProperty(navigator, 'onLine', { configurable:true, get:()=>false });
      openOnline();
      if(ol) Object.defineProperty(Navigator.prototype, 'onLine', ol); }],
    ['Quitter la partie',  () => { __fermerTout(); confirmLeaveGame(); }],
    ['Quitter le duel',    () => { __fermerTout();
      net.myDone = false; net.oppGone = false;
      net.deck = seededDeck(12345, '9', null); net.idx = 2;
      quitDuel(); }],
    ['Rappels proposés',   () => { __fermerTout();
      showModal({ title:T('Recevoir les rappels\u00a0?'),
        message:T("Ta série sur le point de s'éteindre, tes erreurs à revoir, un verset le dimanche, et un mot si tu t'absentes. Au plus UN rappel par jour, et jamais si tu as déjà joué."),
        okLabel:T("D'accord"), cancelLabel:T('Non merci') }); }],
    /* Le code créateur, et son refus : « Code incorrect. » ne s'écrit qu'après
       une mauvaise saisie. */
    ['Badge Créateur',     () => { __fermerTout(); profile.isCreator = false; promptCreator(); }],
    ['Code incorrect',     () => { const i = document.getElementById('modalInput');
      if(i) i.value = 'xxxx';
      const b = document.getElementById('modalOk'); if(b) b.click(); }],
    ...FICHES,
    ...FLAMMES,
    ...GROUPE,
    ...FINS_LIGNE,
    ...FINS_SOLO,
    ...FINS_GROUPE,
    /* Le profil d'un joueur qui n'a pas encore choisi de nom. */
    ['Profil · invité',    () => { const g = JSON.parse(localStorage.getItem('bt_profile')||'{}');
      profile.name = ''; state.screen='profile'; render(); }],
  ];

    const releve = new Map();
    const ennuis = [];
    for(const [nom, faire, arg] of ETAPES){
      try { await p.evaluate(faire, arg === undefined ? null : arg); } catch(e){ ennuis.push(nom + ' (' + lg + ') : impossible d\'ouvrir — ' + e.message.split('\n')[0]); continue; }
      await p.waitForTimeout(450);
      if(process.env.ECRANS && lg === 'en'){
        const e = await p.evaluate(() => state.screen + (document.getElementById('modalVeil') ? ' +modal' : '')
          + (document.getElementById('flammeVeil') ? ' +flamme' : '') + (document.querySelector('.sheet-veil') ? ' +sheet' : ''));
        console.log('  ~ ' + nom.padEnd(24) + ' -> ' + e);
      }
      try { releve.set(nom, await p.evaluate(RAMASSER)); }
      catch(e){ ennuis.push(nom + ' (' + lg + ') : relevé impossible — ' + e.message.split('\n')[0]); }
    }
    await ctx.close();
    return { releve, ennuis, erreurs, nEtapes: ETAPES.length };
  };

  const en = await passe('en');
  const fr = await passe('fr');
  const nav2 = nav;

  const fautes = [...en.ennuis, ...fr.ennuis];
  if(en.erreurs.length) fautes.push('erreurs JS (en) : ' + [...new Set(en.erreurs)].slice(0,2).join(' | '));
  if(fr.erreurs.length) fautes.push('erreurs JS (fr) : ' + [...new Set(fr.erreurs)].slice(0,2).join(' | '));

  /* ===== PREMIÈRE BARRIÈRE : du français reconnaissable dans le rendu anglais ===== */
  const vus = new Set();
  let compte = 0;
  for(const [nom, textes] of en.releve){
    compte += textes.length;
    for(const { t, ou } of textes){
      if(TOLERE.some(r => r.test(t))) continue;
      if(!(RE_ACCENT.test(t) || RE_MOTS.test(t))) continue;
      const cle = 'fr:' + t.slice(0, 80);
      if(vus.has(cle)) continue;
      vus.add(cle);
      fautes.push('FRANÇAIS  ' + nom.padEnd(18) + ' « ' + t.slice(0, 80) + ' »   [' + String(ou).slice(0, 34) + ']');
    }
  }

  /* ===== DEUXIÈME BARRIÈRE : ce qui n'a pas bougé d'une langue à l'autre ===== */
  /* ON COMPARE PLACE PAR PLACE, PAS EN VRAC. Comparer deux sacs de mots
     faisait mentir le banc : le « M » anglais du lundi retrouvait le « M »
     français du mardi, et le banc annonçait une bande restée française alors
     qu'elle était juste.
     MAIS PLACE PAR PLACE SUR TOUT L'ÉCRAN NE TIENT PLUS. Depuis que le panneau
     des Bibles propose cinq versions en français et trois en anglais, les deux
     rendus n'ont plus le même nombre de textes : le banc annonçait « les deux
     rendus ne se superposent plus » sur onze écrans, ce qui était vrai et sans
     intérêt — c'est voulu. On apparie donc PAR EMPLACEMENT : les textes d'une
     même classe CSS, dans l'ordre, chacun avec son homologue. Une liste plus
     courte d'un côté ne gêne plus que sa propre liste, et le reste de l'écran
     reste comparé aussi sévèrement qu'avant. */
  let paires = 0;
  const parLieu = (liste) => {
    const m = new Map();
    for(const x of liste){ const k = String(x.ou); if(!m.has(k)) m.set(k, []); m.get(k).push(x); }
    return m;
  };
  for(const [nom, textesEn] of en.releve){
    const textesFr = fr.releve.get(nom);
    if(!textesFr) continue;
    const lieuxEn = parLieu(textesEn), lieuxFr = parLieu(textesFr);
    const couples = [];
    for(const [k, a] of lieuxEn){
      const b = lieuxFr.get(k);
      if(!b) continue;
      for(let i = 0; i < Math.min(a.length, b.length); i++) couples.push([a[i], b[i]]);
    }
    for(const [x, y] of couples){
      const { t, ou } = x;
      if(y.t !== t) continue;
      paires++;
      if(MEME_DANS_LES_DEUX.some(r => r.quoi.test(t) && (!r.ou || r.ou.test(String(ou))))) continue;
      if(LIEUX_LIBRES.test(String(ou))) continue;
      const cle = 'id:' + t.slice(0, 80);
      if(vus.has(cle)) continue;
      vus.add(cle);
      fautes.push('INCHANGÉ  ' + nom.padEnd(18) + ' « ' + t.slice(0, 80) + ' »   [' + String(ou).slice(0, 34) + ']');
    }
  }

  /* ===== TROISIÈME BARRIÈRE : CE QUE LE BANC N'A JAMAIS VU =====
     Un banc vert ne prouve rien sur les écrans qu'il n'ouvre pas. On demande
     donc au jeu toutes ses phrases anglaises, et on retire celles qu'on a
     effectivement lues à l'écran. Ce qui reste, ce sont les coins du jeu que
     personne n'a relus en anglais. */
  const dico = await (async () => {
    const ctx2 = await nav2.newContext({ viewport:{ width:393, height:852 }, userAgent:IOS, serviceWorkers:'block' });
    const q = await ctx2.newPage();
    await q.addInitScript(() => localStorage.setItem('bt_langue', 'en'));
    await q.goto(URL);
    await q.waitForFunction(() => { try { return typeof TEXTES === 'object'; } catch(e){ return false; } }, null, { timeout:20000 });
    const v = await q.evaluate(() => Object.values(TEXTES.en));
    await ctx2.close();
    return v;
  })();
  /* ON COMPARE SUR UNE FORME APLATIE, ET PAR MORCEAU.
     Deux angles morts rendaient ce compte faux, tous les deux dans le même
     sens — il accusait le jeu de ne pas montrer ce qu'il montrait :
     1. RAMASSER écrase les blancs (\s+ -> une espace), donc toute valeur qui
        porte une espace insécable — « 16 jours », « Série : » — ne pouvait
        JAMAIS retomber sur son homologue à l'écran ;
     2. le jeu COMPOSE ses phrases. « September » ne s'affiche pas seul : il
        vit dans « September 21 — played », au titre d'une case de la flamme.
        Une comparaison exacte ne le retrouvait jamais.
     On aplatit donc des deux côtés, et on cherche le morceau DANS ce qui a
     été lu. Ce qui reste après ça est vraiment du texte que personne n'a vu. */
  const aplat = (x) => String(x).replace(/\s+/g, ' ').trim();
  const lus = new Set();
  for(const [, textes] of en.releve) for(const { t } of textes) lus.add(aplat(t));
  const toutLu = [...lus].join('\u0001');
  if(process.env.ETAPE){
    const tx = en.releve.get(process.env.ETAPE);
    console.log('  >>> ' + process.env.ETAPE + ' : ' + (tx ? tx.length + ' textes' : 'ABSENTE'));
    if(tx) console.log('      ' + tx.map(x => x.t).slice(0, 30).join(' | ').slice(0, 900));
  }
  if(process.env.OU){
    for(const [nom, textes] of en.releve)
      if(textes.some(x => x.t === process.env.OU)) console.log('  >>> vu à : ' + nom);
    console.log('  >>> étapes relevées : ' + en.releve.size + ' / ' + en.nEtapes + '   textes : ' + lus.size);
  }
  const jamais = [...new Set(dico)].filter(v => !/\{/.test(v)   /* les phrases à trou ne s'affichent jamais telles quelles */
    && aplat(v).length >= 2
    && !lus.has(aplat(v)) && toutLu.indexOf(aplat(v)) < 0);
  console.log('  phrases anglaises jamais vues à l\'écran : ' + jamais.length + ' sur ' + new Set(dico).size);
  if(jamais.length) jamais.slice(0, process.env.TOUT ? 999 : 40)
    .forEach(v => console.log('     « ' + v.slice(0, 70) + ' »'));

  if(fautes.length){
    console.log('  CE QUI NE PARLE PAS ANGLAIS (' + fautes.length + ') :');
    fautes.forEach(f => console.log('   ' + f));
    nav.close().catch(()=>{}); process.exit(1);
  }
  await nav.close();
  console.log('  OK — ' + en.nEtapes + ' écrans et panneaux peints dans les deux langues, '
    + compte + ' textes relevés, pas un mot de français');
  console.log('       ' + paires + ' textes identiques fr/en, tous justifiés');
})();
