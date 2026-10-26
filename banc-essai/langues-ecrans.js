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
const path = require('path');
const SUPA = process.env.SUPA_UMD || require('./brouillon.js') + '/supabase.js';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
/* Safari d'iOS 26 : la version du système est gelée (18_6), celle de Safari dit 26. */
const IOS26 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const DANS_APPLI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.30.97 (iPhone14,2; iOS 18_6; fr_FR; fr; scale=3.00; 1170x2532)';
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1';
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
/* ===== UN MARQUEUR DE FRANÇAIS N'EST PAS LE MÊME SELON LA LANGUE D'EN FACE =====
   « é » dénonce du français au milieu de l'anglais ; au milieu de l'espagnol
   il ne dénonce rien du tout, « él » et « también » en portent un. Pareil pour
   les mots : « la », « tu », « que » sont français ET espagnols, « serie » et
   « bravo » aussi. Laisser la liste anglaise juger l'espagnol, c'est un banc
   qui crie à chaque écran — et qu'on finit par ne plus lire.
   On retire donc, pour l'espagnol, ce que les deux langues partagent. Le reste
   est aussi sévère qu'avant. */
/* MESURÉ, PAS DEVINÉ. Une fois la banque espagnole en place, on a compté ces
   mots-outils français dans les 1545 questions espagnoles : la ×1370, que ×386,
   le ×74, tu ×47, les ×6, deja ×3, sur ×1 — et zéro accent interdit. Les sept
   sont de l'espagnol : « le » et « les » sont ses pronoms, « deja » son verbe
   (« el pastor deja las 99 »), « sur » son point cardinal (« Roboam al sur »).
   Ils sortent donc de la liste, sous peine d'un banc qui crie à chaque écran. */
const AUSSI_ESPAGNOL = new Set(['la', 'tu', 'que', 'serie', 'bravo', 'une', 'sa',
                                'le', 'les', 'deja', 'sur']);
const CIBLE = {
  en: { mots:MOTS,
        accent:/[àâäéèêëîïôöùûüÿçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇŒÆ]/ },
  /* é et ü sortent : l'espagnol les écrit. à è ê ë î ï ô ö ù û ÿ ç œ æ restent,
     aucun mot espagnol n'en porte. */
  es: { mots:MOTS.filter(m => !AUSSI_ESPAGNOL.has(m)),
        accent:/[àâäèêëîïôöùûÿçœæÀÂÄÈÊËÎÏÔÖÙÛŸÇŒÆ]/ },
};
for(const c of Object.values(CIBLE))
  c.re = new RegExp('(^|[^\\p{L}])(' + c.mots.join('|') + ')([^\\p{L}]|$)', 'iu');

/* Ce qu'on laisse passer : les noms propres et les sigles qui restent
   identiques dans toutes les langues. Rien d'autre. */
const TOLERE = [
  /* L'ADRESSE D'UN JOUEUR N'EST PAS UNE PHRASE. Elle s'affiche telle qu'il
     l'a tapée sur la carte du compte, et elle peut très bien contenir des
     mots français — « joueur@... », « famille@... ». La juger comme du texte,
     c'est reprocher au jeu de ne pas traduire l'adresse de quelqu'un. */
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
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
  /* L'ESPAGNOL ABRÈGE TESALONICENSES EN « TES. » (v316 : les vingt-sept
     abrégés du Nouveau Testament se lisent maintenant dans sa page). Le
     détecteur y voit le français « tes » ; le français, lui, écrit
     « 1 Thess. ». Le motif est exact : ces deux abrégés-là, rien d'autre. */
  /^[12] Tes\.$/,
];

const PREP = (lg) => {
  localStorage.setItem('bt_langue', lg);
  localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8', isCreator:true }));
  localStorage.setItem('bt_fs_hint', '1');
  /* SANS navigator.share, LE JEU NE DESSINE PAS SES BOUTONS DE PARTAGE.
     shareLineHtml() rend "" quand le téléphone ne sait pas partager — et
     Chromium sans tête ne sait pas. « Share the result » et « Invite friends »
     n'avaient donc jamais été relus en anglais, faute d'exister. */
  try { navigator.share = () => Promise.resolve(); } catch(e){}
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
/* ===== CE QU'AUCUN BANC NE PEUT PEINDRE, ET POURQUOI =====
   La troisième barrière compte les phrases anglaises jamais vues à l'écran.
   Tant qu'elle se contentait de les COMPTER, le nombre baissait sans jamais
   vouloir dire « c'est fini ». Elle refuse maintenant tout ce qui n'est pas
   ici — et ce qui est ici a dû être justifié à voix haute. */
/* Les endroits où s'affiche une question de la banque : énoncé, options, fait,
   et les deux mêmes dans la feuille « À revoir ». */
const LIEUX_QUESTION = /qtext|opt-text|ftext|rev-q|rev-a\b|rev-fact|fact-label/;

const JAMAIS_A_L_ECRAN = [
  /* Chaque ligne porte SA langue : une phrase peut être hors d'atteinte en
     anglais et parfaitement visible en espagnol, et l'inverse. */
  { lg:'en', quoi:'Good duel', car:"n'existe que dans le texte PARTAGÉ d'un duel serré, jamais sur un écran" },
  { lg:'en', quoi:'Win', car:"idem : « Victoire » sans point d'exclamation ne sert qu'au texte partagé" },
  { lg:'en', quoi:'Background', car:"la rangée des décors ne se peint que si SCENES en compte plus d'un ; il n'y en a qu'un" },
  /* ===== L'ESPAGNOL, MÊME EXAMEN ===== */
  { lg:'es', quoi:'Fondo',  car:"la rangée des décors ne se peint que si SCENES en compte plus d'un ; il n'y en a qu'un" },
  /* « bientôt » ne s'écrit qu'à CÔTÉ D'UNE LANGUE NON OUVERTE. Depuis que
     l'espagnol l'est, les trois langues du jeu sont ouvertes : le mot n'a plus
     nulle part où s'afficher, dans aucune langue. Il reste au dictionnaire
     pour la prochaine langue en chantier. */
  { lg:'es', quoi:'pronto', car:"aucune langue n'est plus en attente : « bientôt » ne s'affiche nulle part" },
  { lg:'en', quoi:'soon',   car:"aucune langue n'est plus en attente : « bientôt » ne s'affiche nulle part" },
  { lg:'es', quoi:'Victoria',  car:"« Victoire » sans point d'exclamation ne sert qu'au texte partagé" },
  { lg:'es', quoi:'Buen duelo', car:"n'existe que dans le texte PARTAGÉ d'un duel serré" },
  { lg:'es', quoi:'mi rival',   car:"le repli du nom dans le texte partagé, jamais à l'écran" },
  { lg:'es', quoi:'Bloqueados en los ajustes del teléfono', car:'idem, et seulement si le téléphone a refusé' },
  { lg:'es', quoi:'No se puede activar el recordatorio ahora mismo.', car:"idem, et seulement si l'abonnement échoue" },
  { lg:'en', quoi:'my opponent', car:"même chose : le repli du nom dans le texte partagé, jamais à l'écran" },
  /* Les rappels : la rangée elle-même se lit depuis la v326 (passe « jeu
     installé », plus bas). Restent ces deux phrases, qui ne paraissent que
     sur un téléphone qui a REFUSÉ les notifications, ou quand l'abonnement
     échoue. */
  { lg:'en', quoi:'Blocked in the phone settings', car:'idem, et seulement si le téléphone a refusé' },
  { lg:'en', quoi:'Cannot turn the reminder on right now.', car:"idem, et seulement si l'abonnement échoue" },
];

const MEME_DANS_LES_DEUX = [
  { quoi:/^(Yada|Taylor|Sam|Lee|Kim)$/,        car:'un nom propre' },
  { quoi:/^(Job|Daniel|Esther|Ruth|Jude|Amos|Nahum|Joel|Amen|Hosanna)$/i, car:'même mot dans les deux langues' },
  { quoi:/^(Duel|Options|Score|Records|Contact|Version|Format|Instagram|Notifications?|Guide|Volume|Testament|Solo|Installation|Modes?|Messages?|Info|Centurion|Bibliophile|Zoom|Navigation|Public|Admin)$/i, car:'même mot dans les deux langues' },
  /* Le code d'un salon annoncé dans un groupe : « Code EFGH » s'écrit pareil
     en anglais (l'espagnol dit « Código »). */
  { quoi:/^Code [A-Z0-9]{4,8}$/,               car:'le mot « code » et un code de salon' },
  { quoi:/^\d+\s*(questions?|pts|points?|s|min)$/i, car:'un nombre et un mot écrit pareil' },
  { quoi:/^[^\p{L}]*$/u,                       car:'aucune lettre — chiffres, ponctuation, icône' },
  { quoi:/^(Français|English|Español|Português|Deutsch|Italiano)$/, car:'une langue s\'écrit dans sa langue' },
  /* Une adresse e-mail ne se traduit pas : c'est celle du joueur, il l'a
     tapée lui-même. Elle s'affiche telle quelle sur la carte du compte. */
  { quoi:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,        car:'une adresse e-mail' },
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
  /* LES SEPT INITIALES SONT LES MÊMES EN FRANÇAIS ET EN ESPAGNOL : domingo,
     lunes, martes, miércoles, jueves, viernes, sábado — D L M M J V S, comme
     dimanche, lundi, mardi, mercredi, jeudi, vendredi, samedi. Il n'y a rien
     à traduire, et c'est vérifiable lettre par lettre. */
  { lg:'es', quoi:/^[DLMJVS]$/, ou:/\bsj\b|fg-sem/, car:'les sept initiales sont les mêmes des deux côtés' },
  /* Six livres s'écrivent pareil dans les deux langues. */
  { lg:'es', quoi:/^(Josué|Esdras|Habacuc|Job|Daniel|Joel|1 Cor\.|2 Cor\.)$/, ou:/bk-nm/,
    car:'le même nom, ou la même abréviation, en français et en espagnol' },
  /* Les lettres de repère : A B C D devant les options, l'initiale d'une
     équipe. Ce sont des numéros écrits en lettres, pas des mots. */
  { quoi:/^[A-Z]$/, ou:/letter|team-token/,    car:'une lettre de repère, pas un mot' },
  /* L'ABRÉGÉ DE CERTAINS LIVRES EST LE MÊME DANS LES DEUX LANGUES.
     « 1 Corinthiens » et « 1 Corinthians » s'abrègent tous deux en « 1 Cor. » ;
     de même « 2 Chron. » et « Philip. ». Vérifié dans LIVRES_COURTS_EN, qui les
     porte explicitement — ce n'est pas un oubli de traduction, c'est la bonne
     abréviation des deux côtés. */
  { quoi:/^(1 Cor\.|2 Cor\.|1 Chron\.|2 Chron\.|1 Samuel|2 Samuel|Philip\.|Lament\.|Col\.|Dan\.|Jude|Job|Ruth|Esther|Amos|Joel|Nahum)$/, ou:/bk-nm/,
    car:'la même abréviation dans les deux langues' },
  /* Le nom du bloc de code que l'installateur doit trouver dans le fichier.
     Ce n'est pas une phrase, c'est un repère : il s'écrit pareil partout,
     sinon on ne le retrouve pas. */
  { quoi:/^CONFIG EN LIGNE$/, ou:/info-card/, car:'le nom d\'un bloc de code, pas du texte' },
  /* La puce « Mentions » des notifications d'un groupe (v317) : le même mot
     en anglais (l'espagnol dit « Menciones »). */
  { lg:'en', quoi:/^Mentions$/, ou:/grp-notifs/, car:'même mot dans les deux langues' },
  /* LA PAGE DU NOUVEAU TESTAMENT (v316) montre ses vingt-sept abrégés. Trois
     s'écrivent pareil en anglais — LIVRES_COURTS_EN les porte exprès —, et
     l'espagnol abrège Apocalipsis en « Apoc. », comme le français. */
  { lg:'en', quoi:/^(Coloss\.|1 Thess\.|2 Thess\.)$/, ou:/bk-nm/, car:'la même abréviation, portée exprès par LIVRES_COURTS_EN' },
  { lg:'es', quoi:/^Apoc\.$/, ou:/bk-nm/, car:'la même abréviation d\'Apocalipsis en espagnol' },
  /* LA PAGE « UN LIVRE » (v316) dit à voix haute le nom de chaque livre et
     son nombre de questions : « Ruth · 8 questions ». Neuf livres ont le même
     nom en anglais, et « questions » s'écrit pareil. */
  { lg:'en', quoi:/^(Ruth|1 Samuel|2 Samuel|Esther|Job|Lamentations|Daniel|Amos|Nahum|Jude|Joel) · \d+ questions?$/, ou:/bk-choix/,
    car:'un nom de livre écrit pareil, un nombre, et « questions », le même mot en anglais' },
];
/* Les endroits où un texte identique est normal quelle que soit la langue :
   l'initiale d'un avatar, le code du salon, un score, un chiffre.
   ET LES QUESTIONS. « Amnon », « Absalom », « David » s'écrivent pareil dans
   les deux langues : un énoncé ou une option identique ne prouve rien ici.
   Ce n'est pas un trou — les 1545 questions sont vérifiées une par une, et
   comparées à la banque française, par banc-essai/questions-langues.js.
   « sem-t » N'EN EST PLUS. L'intitulé de la bande des sept jours y figurait du
   temps où il portait une légende fixe. Il porte maintenant l'échéance du jour
   — « Plus que 6 h », « Fait pour aujourd'hui » —, une vraie phrase qui doit
   se traduire comme les autres : on la surveille. */
const LIEUX_LIBRES = /avatar|grp-av|code-big|rank-pts|scorebar|q-counter|timer|logo|st-ico|ficon|ico\b|opt-text|q-text|rev-q|rev-a|rev-fact|ftext|fact-|hero-verse/;

/* ===== UNE LANGUE PAS ENCORE OUVERTE SE RELIT QUAND MÊME =====
   Le jeu refuse une langue déclarée « dispo:false » : elle s'affiche grisée
   dans la liste et ne se choisit pas. C'est la bonne règle pour un joueur — et
   elle empêchait le banc d'aller voir si le travail déjà fait tient debout. On
   sert donc au navigateur une copie de la page où CETTE langue-là est ouverte,
   et seulement elle. Rien n'est modifié sur le disque : le fichier publié
   reste celui des joueurs. */
const ouvrirLaLangue = async (p, lg) => {
  await p.route('**/index.html*', async (r) => {
    let corps;
    try { corps = await (await r.fetch()).text(); } catch(e){ return r.continue(); }
    const motif = new RegExp('(cle:"' + lg + '"[^}]*?)dispo:false');
    if(motif.test(corps)) corps = corps.replace(motif, '$1dispo:true');
    r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:corps });
  });
};

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
    await ouvrirLaLangue(p, lg);
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
    /* Ce qui reste à rattraper se lit d'après la porte d'où l'on vient
       (v316) : par la dernière partie, c'est bt_lastmiss — que l'étape pose. */
    state.revisionDe = o.revision ? 'setup' : null;
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
    /* UNE ANNÉE ENTIÈRE, ET PAS TROIS MOIS. La grille remonte au plus vieux
       jour dont on ait la trace, sans plafond : douze mois d'histoire, c'est
       le seul endroit du jeu qui écrive « January » ou « October ». Avec trois
       mois, huit noms de mois sur douze n'étaient jamais relus. */
    ['Flamme · longue',    flamme, { jours:[0,1,2,3,5,6,7,30,31,60,61,90,120,150,180,210,240,270,300,330,360], geles:[4], gels:2, serie:4 }],
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

  /* ===== LE DERNIER LOT : LES ÉTATS QU'ON N'ATTEINT QU'EN LES PROVOQUANT ===== */
  const DERNIERS = [
    /* Le chrono qui expire : la note « Time's up! » n'existe qu'en solo. */
    ['Solo · temps écoulé', () => { __fermerTout();
      state.mode='solo'; state.daily=false; state.revision=false;
      state.questions = seededDeck(21, '9', null); state.currentIndex = 2;
      state.revealed = true; state.timedOut = true; state.soloScore = 40;
      state.screen='play'; render(); }],
    /* L'écran de fin avec des erreurs au compteur : le bouton « Review my
       mistakes » et son singulier ne s'écrivent que là. */
    ['Fin Solo · une erreur', () => { __fermerTout();
      state.mode='solo'; state.revision=false;
      state.questions = seededDeck(21, '9', null); state.currentIndex = state.questions.length;
      state.soloMissed = [state.questions[0]]; state.soloScore = 120; state.soloCorrect = 8;
      state.screen='end'; render(); }],
    ['Fin Solo · erreurs',  () => { state.soloMissed = state.questions.slice(0, 3); render(); }],
    /* L'accueil quand le carnet a des erreurs mais rien pour aujourd'hui. */
    ['Accueil · carnet',    () => { __fermerTout();
      localStorage.removeItem('bt_errbook');
      const d = seededDeck(4242, '9', null); d.forEach(q => errbookAdd(q));
      const a = loadErrbook(); a.forEach(x => { x.du = dayKey(7); }); saveErrbook(a);
      state.screen='mode'; render(); }],
    /* Un testament déplié : la phrase qui explique la grille des livres est
       dans le corps replié, que personne n'ouvrait. */
    ['Testament ouvert',   () => { __fermerTout(); state.screen='parcours'; render();
      const h = document.querySelector('.tst-head'); if(h) h.click(); }],
    /* Le verset d'accueil déplié : son bouton porte « Close the verse ». */
    /* Le verset d'accueil déplié : son bouton porte « Close the verse ».
       On passe par la porte du jeu — cinq tapes sur l'icône — plutôt que de
       poser la classe à la main. */
    ['Verset ouvert',      () => { __fermerTout(); state.screen='mode'; render();
      try { showHeroVerse(); } catch(e){} }],
    /* Le hub en ligne AVANT qu'on ait branché Supabase : trois phrases qui
       s'adressent à celui qui installe le jeu. */
    ['Hub non configuré',  () => { __fermerTout();
      const vrai = window.onlineConfigured; window.onlineConfigured = () => false;
      state.screen='online'; render(); window.onlineConfigured = vrai; }],
    /* Le hub avec un joueur ordinaire : « Edit » n'apparaît qu'à qui n'a pas
       le badge Créateur. */
    ['Hub · joueur',       () => { __fermerTout(); profile.isCreator = false;
      net.connected=1; net.error=''; state.screen='online'; render(); }],
    /* Les deux refus du salon. */
    ['Salon introuvable',  () => { __fermerTout(); net.error = T('Aucune partie trouvée pour ce code.');
      state.screen='online-join'; render(); }],
    ['Salon refusé',       () => { net.error = T('Impossible de rejoindre ce salon. Réessaie.'); render(); }],
    ['Hôte parti',         () => { net.error = T("L'hôte a quitté le salon."); render(); }],
    /* Le salon vu par un invité, et la ligne d'attente que le jeu écrit à la
       main (hors rendu) quand l'adversaire arrive ou non. */
    /* LA NOTE DE L'INVITÉ EST ÉCRITE PAR LA RETOUCHE EN PLACE, pas par le
       rendu : c'est majSalleListe qui la met à jour quand l'hôte arrive. Le
       banc passait par updateRoomOpponent, qui n'existe plus depuis que le
       face-à-face a disparu — et comme il était appelé sous un
       « typeof === function », le banc ne plantait pas : il ne voyait
       simplement plus jamais la phrase « Tout est prêt ! En attente du lancement... »,
       et la signalait comme jamais traduite. Un garde-fou qui avale son
       propre échec est pire qu'une erreur. */
    ['Salon · invité',     () => { __fermerTout(); net.error=''; net.code='ABCD'; net.isHost=false;
      net.joueurs={}; majAdversaire();
      state.screen='online-room'; render(); majSalleListe(); }],
    ['Salon · prêt',       () => { net.joueurs={ b:{ id:'b', name:'Sam', color:'#E8574C', vu:Date.now() } };
      majAdversaire(); majSalleListe(); }],
    /* Le duel fini de mon côté seulement. */
    ['Duel · j\'ai fini',   () => { __fermerTout();
      net.oppPresent=true; net.opp={ id:'b', name:'Sam', color:'#E8574C' };
      net.joueurs={ b:net.opp }; net.deck = seededDeck(12345, '9', null);
      net.idx = net.deck.length; net.myDone = true; net.oppDone = false; net.oppGone = false;
      net.score = 60; net.oppScore = 30; net.oppIdx = 4;
      state.screen='online-play'; render(); }],
    /* L'adversaire parti en cours de route : la mention « gone » se colle à
       son nom, dans la barre de scores du duel. */
    ['Duel · parti',       () => { net.oppGone = true; net.myDone = false;
      /* La barre de scores du duel ne s'affiche qu'EN partie : il faut donc
         une question sous la main, pas l'index d'après la dernière. */
      net.idx = net.deck.length - 1; net.revealed = false; render(); }],
    /* Les quatre temps de la poignée de main « on rejoue ? ». */
    ['Rejouer · on me demande', () => { __fermerTout();
      net.oppPresent=true; net.opp={ id:'b', name:'Sam', color:'#E8574C' };
      net.joueurs={ b:net.opp }; net.deck = seededDeck(12345, '9', null);
      net.idx = net.deck.length; net.myDone=true; net.oppGone=false;
      net.score=40; net.oppScore=70; net.iWantReplay=false; net.oppWantReplay=true;
      state.screen='online-end'; render(); }],
    ['Rejouer · les deux', () => { net.iWantReplay=true; net.oppWantReplay=true; render(); }],
    ['Rejouer · à plusieurs hôte', () => { net.iWantReplay=false; net.oppWantReplay=false;
      net.isHost=true;
      net.joueurs={ b:{ id:'b', name:'Sam', color:'#E8574C' }, c:{ id:'c', name:'Lee', color:'#4CE88A' } };
      render(); }],
    ['Rejouer · à plusieurs invité', () => { net.isHost=false; render(); }],
    /* Les deux bandeaux de gel, et la coupure de connexion. */
    ['Gel offert',         () => { __fermerTout(); state.screen='mode'; render();
      saveDaily({ gels:0 });
      try { achToastPause = false; achToastBusy = false; } catch(e){}
      offrirGel(Tf('{n} parties jouées', {n:30})); }],
    ['Gel annoncé',        () => { __fermerTout();
      saveDaily({ gels:0, annonce:dayKey(-1) });
      try { achToastPause = false; achToastBusy = false; } catch(e){}
      annoncerGel(); }],
    /* Un jour manqué dont on n'a plus la date : l'autre branche de la phrase. */
    ['Gel annoncé · sans date', () => { __fermerTout();
      saveDaily({ gels:0, annonce:'x' });
      try { achToastPause = false; achToastBusy = false; } catch(e){}
      annoncerGel(); }],
    ['Connexion perdue',   () => { __fermerTout();
      showModal({ title:T('Connexion perdue'), message:T('Le mode en ligne a été interrompu. Tu peux continuer en Solo ou en Groupe.'), okLabel:T('Compris'), hideCancel:true }); }],
    /* Le guide d'installation quand le navigateur propose lui-même d'installer. */
    ['Guide · invitation', () => { __fermerTout();
      invitePWA = { prompt(){} }; openFsGuide(); invitePWA = null; }],
    /* Le code du salon copié, et le résultat partagé. */
    ['Code copié',         () => { __fermerTout(); net.code='ABCD'; net.isHost=true;
      net.joueurs={}; state.screen='online-room'; render();
      const vrai = navigator.share; try { delete navigator.share; } catch(e){}
      try { shareRoomCode(); } catch(e){}
      try { navigator.share = vrai; } catch(e){} }],
  ];

  const RESTES = [
    /* Le garde-fou du départ : deux joueurs sans nom, et le bouton refuse. */
    /* LE GARDE-FOU NE SE DÉCLENCHE QU'AVEC DE VRAIES CASES VIDES. renderSetup
       appelle normalizeTeams, qui rebaptise aussitôt « Joueur 1 » et
       « Joueur 2 » — deux noms valides, donc pas de refus. On vide APRÈS le
       rendu, comme le fait un joueur qui efface les deux cases. */
    ['Groupe · refus',     () => { __fermerTout(); state.mode='group';
      state.teams=[{name:'A'},{name:'B'}]; state.scores=[0,0]; state.screen='setup'; render();
      state.teams.forEach(t => { t.name = ''; });
      try { startGame(); } catch(e){} }],
    /* Le duel dont on ne connaît plus l'adversaire : deux replis, « The
       opponent » à l'écran et « my opponent » dans le texte partagé. */
    ['Duel · sans nom',    () => { __fermerTout();
      net.opp = null; net.oppPresent = false; net.oppGone = false;
      net.joueurs = {}; net.deck = seededDeck(12345, '9', null);
      net.idx = net.deck.length; net.myDone = true; net.score = 50; net.oppScore = 20;
      net.iWantReplay = false; net.oppWantReplay = true;
      state.screen='online-end'; render();
      try { document.title = shareTexte ? shareTexte('duel') : document.title; } catch(e){} }],
    /* Une table à plusieurs que tout le monde a quittée. La carte d'attente
       ne se peint qu'à celui qui a FINI : c'est là qu'on lit ce qui reste. */
    ['Duel · table vide',  () => { __fermerTout();
      net.deck = seededDeck(12345, '9', null); net.idx = net.deck.length;
      net.myDone = true; net.oppGone = true; net.score = 60; net.oppScore = 40;
      net.opp = { id:'b', name:'Sam', color:'#E8574C' };
      net.joueurs = { b:{ id:'b', name:'Sam', color:'#E8574C', gone:true },
                      c:{ id:'c', name:'Lee', color:'#4CE88A', gone:true } };
      state.screen='online-play'; render(); }],
    /* Le lien du résultat copié faute de pouvoir partager. */
    /* La dernière question d'un duel : le bouton dit « Terminer », pas
       « Question suivante ». */
    ['Duel · dernière',    () => { __fermerTout();
      net.oppPresent=true; net.opp={ id:'b', name:'Sam', color:'#E8574C' };
      net.joueurs={ b:net.opp }; net.deck = seededDeck(12345, '9', null);
      net.idx = net.deck.length - 1; net.myDone=false; net.oppGone=false;
      net.selected = net.deck[net.idx].correct; net.revealed = true; net.timerKey='30';
      net.score=50; net.oppScore=30; state.screen='online-play'; render(); }],
    /* À plus de deux, le salon et la partie s'appellent « Partie », pas
       « Duel » : deux mots que seul ce chemin écrit. */
    ['Salon · à plusieurs', () => { __fermerTout();
      net.error=''; net.code='ABCD'; net.isHost=true;
      net.joueurs={ b:{ id:'b', name:'Sam', color:'#E8574C' },
                    c:{ id:'c', name:'Lee', color:'#4CE88A' },
                    d:{ id:'d', name:'Kim', color:'#E8C84C' } };
      net.oppPresent=true; net.opp=net.joueurs.b;
      state.screen='online-room'; render();
      if(typeof updateRoomOpponent === 'function') updateRoomOpponent(); }],
    /* Une révision en cours : son en-tête ne dit ni le nom du jeu ni
       « Partie », mais « Révision ». */
    ['Révision en cours',  () => { __fermerTout();
      state.mode='solo'; state.daily=false; state.revision=true;
      state.questions = seededDeck(21, '9', null); state.currentIndex = 1;
      state.revealed = false; state.soloScore = 20;
      state.screen='play'; render(); }],
    /* Plusieurs joueurs connectés : le compteur passe au pluriel, et la ligne
       d'avancement écrit « terminé » pour qui a fini. */
    ['Hub · plusieurs',    () => { __fermerTout();
      net.connected = 4; net.error=''; state.screen='online'; render();
      if(typeof majPresence === 'function') majPresence(4); }],
    ['Duel · l\'autre a fini', () => { __fermerTout();
      net.deck = seededDeck(12345, '9', null); net.idx = net.deck.length;
      net.myDone = true; net.oppGone = false; net.score = 50; net.oppScore = 60;
      net.opp = { id:'b', name:'Sam', color:'#E8574C' };
      net.joueurs = { b:{ id:'b', name:'Sam', color:'#E8574C', done:true, idx:9 },
                      c:{ id:'c', name:'Lee', color:'#4CE88A', done:false, idx:4 } };
      state.screen='online-play'; render(); }],
    /* À plus de deux, l'en-tête de la partie s'appelle « Partie » et non
       « Duel » : titrePartie() ne dit « Partie » que là. */
    ['Partie à plusieurs', () => {
      net.deck = seededDeck(12345, '9', null); net.idx = 2;
      net.selected = null; net.revealed = false; net.timerKey='30';
      net.score=30; net.myDone=false; net.oppGone=false;
      state.screen='online-play'; render(); }],
    /* Le message d'erreur PAR DÉFAUT d'une fenêtre : celui que showModal écrit
       quand l'appelant n'en fournit pas. */
    /* Le titre et le bouton n'ont plus d'importance ici (le badge Créateur est
       parti en v287) : ce qui est mesuré, c'est le message que showModal écrit
       LUI-MÊME quand l'appelant n'en fournit pas. On garde donc une fenêtre à
       champ quelconque, avec un titre qui existe encore. */
    ['Fenêtre · réessaie', () => { __fermerTout();
      showModal({ title:T('Nom affiché'), input:true, onOk:() => false });
      const b = document.getElementById('modalOk'); if(b) b.click(); }],
    /* Le lien du jeu copié faute de pouvoir partager : c'est copierLeLien()
       qui affiche le petit bandeau, pas shareScore(), qui ne fait qu'appeler
       le partage du téléphone. */
    ['Lien copié',         () => { __fermerTout(); state.screen='mode'; render();
      /* navigator.clipboard est en lecture seule : on le REDÉFINIT. */
      try { Object.defineProperty(navigator, 'clipboard',
        { configurable:true, get:() => ({ writeText:() => Promise.resolve() }) }); } catch(e){}
      try { copierLeLien(); } catch(e){} }],
  ];

  /* ===== LES GROUPES =====
     Une soixantaine d'écrans et de fenêtres, sans serveur : un décor posé à la
     main (__grpDecor), puis CHAQUE fenêtre par la fonction du jeu qui l'ouvre.
     Les réponses du serveur (« c'est fait ») sont imitées en remplaçant
     appelGroupe le temps d'une étape : ce qu'on relit, c'est ce que le jeu
     affiche ENSUITE. */
  const GROUPES_SOCIAUX = [
    ['Groupes · barre',    () => { __fermerTout();
      window.__grpDecor = () => {
        const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
        /* « Hier » à coup sûr : vingt-six heures en arrière tombaient AVANT-HIER
           passé deux heures du matin. Hier à midi, c'est hier à toute heure. */
        const hier = () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(12, 0, 0, 0); return d.toISOString(); };
        compte.dispo = true; profile.name = 'Taylor';
        compte.session = { user:{ id:'moi-0', email:'joueur@exemple.net' } }; compte.etape = 'connecte';
        grp.installe = true; grp.ouverts = true; grp.message = '';
        grp.etat = { participe:'ok', moderateur:true, ouverts:true, photos:true };
        grp.profils = { 'moi-0':{ nom:'Taylor', couleur:'#4C86E8' }, 'u-2':{ nom:'Sam', couleur:'#E8574C' },
                        'u-3':{ nom:'Lee', couleur:'#4CE88A' }, 'u-4':{ nom:'Kim', couleur:'#E8C84C' } };
        grp.liste = [
          { id:'g-1', nom:'Lee', teinte:2, ouvert:false, code:'ABC234', nb_membres:4, non_lus:2, dernier_message:il(1), description:'Amen',
            apercu:{ id:9, auteur:'u-2', genre:'texte', texte:'Amen', nom:'Sam', le:il(1) } },
          { id:'g-2', nom:'Sam', teinte:0, ouvert:true, code:'DEF567', nb_membres:2, non_lus:0, dernier_message:hier(),
            apercu:{ id:7, auteur:'moi-0', genre:'texte', texte:'Amen', nom:'Taylor', le:il(26) } },
          { id:'g-3', nom:'Kim', teinte:4, ouvert:false, code:'GHJ892', nb_membres:3, non_lus:0, dernier_message:il(30), apercu:null },
          { id:'g-6', nom:'Amos', teinte:6, ouvert:true, code:'NPQ456', nb_membres:5, non_lus:0, dernier_message:il(40), apercu:null },
          { id:'g-4', nom:'Job', teinte:5, ouvert:false, code:'KLM345', nb_membres:3, non_lus:1, dernier_message:il(2),
            apercu:{ id:5, auteur:null, genre:'texte', texte:'Amen', nom:null, le:il(2) } },
        ];
        grp.publics = [ { id:'g-2', nom:'Sam', description:'', nb_membres:2, teinte:0, membre:true },
                        { id:'g-5', nom:'Ruth', description:'', nb_membres:1, teinte:3, membre:false } ];
        /* (v329) Ce que chacun a lu : Sam a tout vu, Lee jusqu'au 7, Kim rien —
           les coches de « Vu » sous mon dernier message. */
        grp.membres = { 'g-1':[ { membre:'moi-0', role:'proprietaire', muet_jusqu:null, lu_jusqu:99, rejoint_le:il(5) },
                                { membre:'u-2', role:'admin', muet_jusqu:null, lu_jusqu:99, rejoint_le:il(5) },
                                { membre:'u-3', role:'membre', muet_jusqu:new Date(Date.now() + 3600000).toISOString(), lu_jusqu:7, rejoint_le:il(5) },
                                { membre:'u-4', role:'membre', muet_jusqu:null, lu_jusqu:0, rejoint_le:il(5) } ] };
        const m = (id, auteur, genre, texte, extra) => Object.assign({ id, groupe:'g-1', auteur, genre, texte, donnees:{},
          cree_le:il(0.5), masque:false, supprime_le:null }, extra || {});
        grp.fils = { 'g-1':{ charge:true, tout:false, messages:[
          m(1, null, 'systeme', 'cree',   { donnees:{ nom:'Taylor' } }),
          m(2, null, 'systeme', 'rejoint',{ donnees:{ nom:'Sam' } }),
          m(3, null, 'systeme', 'parti',  { donnees:{ nom:'Kim' } }),
          m(4, null, 'systeme', 'exclu',  { donnees:{ nom:'Kim' } }),
          m(5, null, 'systeme', 'banni',  { donnees:{ nom:'Kim' } }),
          m(6, null, 'systeme', 'admin',  { donnees:{ nom:'Sam' } }),
          m(13, null, 'systeme', 'photo', { donnees:{ nom:'Sam' } }),
          m(14, null, 'systeme', 'photo_retiree', { donnees:{ nom:'Sam' } }),
          m(15, null, 'systeme', 'proprietaire', { donnees:{ nom:'Sam' } }),
          m(7, 'u-2', 'texte', 'Amen'),
          m(8, 'u-3', 'texte', '', { masque:true }),
          m(9, 'u-3', 'texte', '', { supprime_le:il(0.2) }),
          m(10, 'u-2', 'partie', '', { donnees:{ code:'ABCD' } }),
          m(11, 'moi-0', 'partie', '', { donnees:{ code:'EFGH' } }),
          m(12, 'moi-0', 'texte', 'Amen') ] } };
        grp.courant = null; grp.nonLus = 3;
        moderation = null;
      };
      __grpDecor(); grp.etat = { participe:'ok', moderateur:false }; state.screen='mode'; render(); majBarre(); }],
    ['Groupes · sans compte', () => { __fermerTout(); __grpDecor(); compte.session = null; compte.etape = 'repos'; grp.etat = null;
      state.screen='groupes'; render(); }],
    ['Groupes · suspendu', () => { __fermerTout(); __grpDecor(); grp.etat = { participe:'banni' }; state.screen='groupes'; render(); }],
    ['Groupes · bientôt',  () => { __fermerTout(); __grpDecor(); grp.etat = { participe:'ferme' }; state.screen='groupes'; render(); }],
    /* Sans réseau à l'entrée : l'écran le dit, et propose de réessayer. */
    ['Groupes · pas de réseau', () => { __fermerTout(); __grpDecor(); grp.etat = null; grp.etatEchec = true; state.screen='groupes'; render(); }],
    ['Groupes · bienvenue', () => { __fermerTout(); __grpDecor(); grp.etat = { participe:'regles' };
      grp.message = T("Il faut confirmer les deux pour entrer."); state.screen='groupes'; render(); }],
    ['Groupes · nom refusé', () => { grp.message = T("Ce nom ne peut pas être utilisé dans les groupes. Change-le dans ton profil."); render(); }],
    ['Groupes · sans nom', () => { const n = profile.name; profile.name = ''; grp.message = T("Choisis d'abord un nom."); render(); profile.name = n; }],
    ['Groupes · liste',    () => { __fermerTout(); __grpDecor(); state.screen='groupes'; render(); }],
    /* Le modérateur : des signalements attendent. Le bouclier et l'onglet
       le disent aussi au lecteur d'écran — dans la langue du joueur. */
    ['Groupes · signalements en attente', () => { grp.etat = { participe:'ok', moderateur:true, ouverts:true, a_traiter:2 }; render(); majBarre(); }],
    ['Groupes · rien que des signalements', () => { grp.nonLus = 0; grp.etat.a_traiter = 1; render(); majBarre(); }],
    ['Groupes · listes vides', () => { grp.liste = []; grp.publics = []; grp.recherche = ''; render(); }],
    /* (v328) La recherche reste posée jusqu'à l'écran suivant : les listes à
       l'écran se relisent d'elles-mêmes (toutes les 30 s), et une relecture
       tombée entre le dessin et le relevé repeignait la liste sans elle. */
    ['Groupes · recherche vaine', () => { grp.recherche = 'Zzz'; render(); }],
    /* (v337) Découvrir montre de nouveau TOUS les groupes publics, ceux dont
       on est membre compris (avec « Ouvrir ») — en cherchant un nom, et sans
       rien chercher. */
    ['Groupes · recherche',  () => { grp.publics = [ { id:'g-2', nom:'Sam', description:'', nb_membres:2, teinte:0, membre:true },
                                                     { id:'g-5', nom:'Ruth', description:'', nb_membres:1, teinte:3, membre:false } ];
                                     grp.recherche = 'a'; render(); }],
    ['Groupes · Découvrir, un groupe rejoint', () => { grp.recherche = ''; grp.publics = [ { id:'g-2', nom:'Sam', description:'', nb_membres:2, teinte:0, membre:true } ]; render(); }],
    /* (v339) La présentation d'un groupe public : à qui n'en est pas (sa
       description, sa dernière activité), à qui en est, et un groupe plein. */
    ['Groupes · présentation d\'un groupe public', () => { grp.recherche = ''; grp.publics = [ { id:'g-5', nom:'Ruth', description:'Amen', nb_membres:1, teinte:3, membre:false,
        dernier_message:new Date(Date.now() - 3 * 86400000).toISOString() } ]; render(); apercuPublic('g-5'); }],
    ['Groupes · présentation, un groupe rejoint', () => { __fermerTout(); grp.publics = [ { id:'g-2', nom:'Sam', description:'', nb_membres:2, teinte:0, membre:true,
        dernier_message:new Date().toISOString() } ]; render(); apercuPublic('g-2'); }],
    ['Groupes · présentation, active hier', () => { __fermerTout(); const h = new Date(); h.setDate(h.getDate() - 1); h.setHours(12, 0, 0, 0);
      grp.publics = [ { id:'g-5', nom:'Ruth', description:'', nb_membres:1, teinte:3, membre:false, dernier_message:h.toISOString() } ]; render(); apercuPublic('g-5'); }],
    ['Groupes · présentation, un groupe plein', () => { __fermerTout(); grp.etat.membres_max = 1; grp.publics = [ { id:'g-5', nom:'Ruth', description:'', nb_membres:1, teinte:3, membre:false,
        dernier_message:new Date(Date.now() - 20 * 86400000).toISOString() } ]; render(); apercuPublic('g-5'); delete grp.etat.membres_max; }],
    ['Groupes · créer',    () => { grp.recherche = ''; __fermerTout(); __grpDecor(); state.screen='groupes'; render(); ouvrirCreation(); }],
    ['Groupes · créer public', () => { choisirTypeGroupe('public'); }],
    ['Groupes · code',     () => { __fermerTout(); ouvrirCode(); }],
    ['Groupes · règles',   () => { __fermerTout(); ouvrirRegles(); }],
    /* La pastille « Nouveaux messages » : le fil descend tout seul au bas
       juste après le rendu (et la cache) — on la montre après lui. */
    ['Groupes · discussion', async () => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render();
      await new Promise(r => setTimeout(r, 60));
      const b = document.getElementById('filBas'); if(b) b.hidden = false; }],
    /* Revenir d'une bulle dont la partie est finie : le mot s'affiche
       au-dessus de la discussion (voir sortirVersGroupe). */
    ['Groupes · partie finie', async () => { showMiniToast(T("Cette partie n'est plus ouverte."));
      await new Promise(r => setTimeout(r, 120)); }],
    /* (v339) Des parties de groupe terminées, avec leurs scores : chaque bulle
       dit qui l'a emporté (un autre, un ex æquo, soi) ; puis deux récaps —
       gagné par un autre, gagné par soi —, et tout se referme. */
    ['Groupes · parties terminées', async () => { __fermerTout(); __grpDecor();
      const il = (mn) => new Date(Date.now() - mn * 60000).toISOString();
      const p = (id, auteur, venus, scores, theme, mn) => ({ id, groupe:'g-1', auteur, genre:'partie', texte:'', cree_le:il(mn), masque:false, supprime_le:null,
        donnees:{ code:'JKLM', fermee:true, venus, scores, total:3, theme } });
      grp.fils['g-1'].messages.push(
        p(30, 'u-2', [ { id:'moi-0', nom:'Taylor' }, { id:'u-3', nom:'Lee' } ], { 'u-2':[60, 3], 'moi-0':[40, 2] }, 'nt', 50),
        p(31, 'moi-0', [ { id:'u-2', nom:'Sam' } ], { 'moi-0':[50, 2], 'u-2':[50, 2] }, 'tout', 40),
        p(32, 'moi-0', [ { id:'u-3', nom:'Lee' } ], { 'moi-0':[70, 3], 'u-3':[30, 1] }, 'at', 30));
      grp.courant = 'g-1'; state.screen = 'groupe'; render();
      await new Promise(r => setTimeout(r, 60)); descendreFil(); }],
    ['Groupes · récap d\'une partie', () => { ouvrirRecapPartie('30'); }],
    ['Groupes · récap, gagné', () => { __fermerTout(); ouvrirRecapPartie('32'); }],
    ['Groupes · récap refermé', () => { __fermerTout(); grp.fils['g-1'].messages = grp.fils['g-1'].messages.filter(x => x.id < 30 || x.id > 32); majFil(); }],
    /* LES MENTIONS (v317). Taper « @ » propose les membres et, à qui peut
       s'en servir, « @tout le monde » ; un simple membre qui commence à
       l'écrire lit qu'il est réservé. Par majNoms, la fonction que la frappe
       appelle. Puis les deux refus du serveur, par motErreurGroupe, celle
       qui les traduit pour l'envoi. */
    ['Groupes · mentions', () => { const t = document.getElementById('compoTexte');
      t.focus({ preventScroll:true }); t.value = '@'; t.setSelectionRange(1, 1); majNoms(t); }],
    ['Groupes · mentions réservées', () => { grp.membres['g-1'][0].role = 'membre'; grp.etat.moderateur = false;
      const t = document.getElementById('compoTexte'); t.value = '@to'; t.setSelectionRange(3, 3); majNoms(t); }],
    ['Groupes · prévenir refusé', async () => { const t = document.getElementById('compoTexte'); t.value = ''; majNoms(t);
      grp.membres['g-1'][0].role = 'proprietaire'; grp.etat.moderateur = true;
      showMiniToast(motErreurGroupe({ ok:false, erreur:'tous_reserve' })); await new Promise(r => setTimeout(r, 120)); }],
    ['Groupes · prévenir trop souvent', async () => {
      showMiniToast(motErreurGroupe({ ok:false, erreur:'tous_trop_souvent' })); await new Promise(r => setTimeout(r, 120)); }],
    /* (v331) Une insulte ne part pas, et la raison se dit au-dessus de la
       barre d'écriture, au bas de la discussion (alerteCompo, ce que l'envoi
       refusé appelle). */
    ['Groupes · insulte refusée', async () => { alerteCompo(motRefusMessage({ ok:false, erreur:'mot_interdit' }));
      await new Promise(r => setTimeout(r, 400)); }],
    /* (v332) TOUCHER UN MESSAGE POUR Y RÉPONDRE : la citation se pose
       au-dessus de la barre d'écriture, avec sa croix (« Annuler la
       réponse »). Puis deux réponses dans le fil : l'une à un message
       supprimé depuis, l'autre à un message plus ancien que ce qui est
       chargé — toucher sa citation le dit. */
    ['Groupes · répondre', () => { cacherAlerteCompo(); grp.etat.reponses = true; toucherMessage('7'); }],
    ['Groupes · réponses dans le fil', async () => { annulerReponse();
      const il = new Date(Date.now() - 86400000).toISOString(), maint = new Date().toISOString();
      citesConnus[501] = { id:501, groupe:'g-1', auteur:'u-4', genre:'texte', texte:'Amen', donnees:{}, cree_le:il, masque:false, supprime_le:null };
      grp.fils['g-1'].messages.push(
        { id:16, groupe:'g-1', auteur:'u-2', genre:'texte', texte:'Amen', donnees:{ reponse:9 }, cree_le:maint, masque:false, supprime_le:null },
        { id:17, groupe:'g-1', auteur:'u-3', genre:'texte', texte:'Amen', donnees:{ reponse:501 }, cree_le:maint, masque:false, supprime_le:null });
      majFil(); await new Promise(r => setTimeout(r, 60));
      allerAuMessage('501'); await new Promise(r => setTimeout(r, 120)); }],
    ['Groupes · sourdine', () => { cacherAlerteCompo(); grp.membres['g-1'][0].muet_jusqu = new Date(Date.now() + 3600000).toISOString(); majCompo(); }],
    ['Groupes · fil vide', () => { __fermerTout(); __grpDecor(); grp.fils['g-1'] = { charge:true, tout:true, messages:[] }; grp.courant = 'g-1';
      state.screen='groupe'; render(); }],
    ['Groupes · infos',    () => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render(); ouvrirInfosGroupe(true); }],
    /* LES NOTIFICATIONS D'UN GROUPE (v317) : la page ne montre que l'aide du
       réglage choisi. On passe par les trois — appliquerNotifs, ce que le
       toucher appelle, sans le serveur —, puis le mot d'un serveur qui n'a
       pas encore reçu la nouvelle table (une fonction absente). */
    ['Groupes · notifs mentions', () => { appliquerNotifs(groupeCourant(), 'mentions'); }],
    ['Groupes · notifs muet',     () => { appliquerNotifs(groupeCourant(), 'rien'); }],
    ['Groupes · réglage indisponible', () => { appliquerNotifs(groupeCourant(), 'tout');
      motFeuille('grpInfosVeil', motErreurGroupe({ ok:false, erreur:'reseau', error:{ code:'PGRST202' } })); }],
    ['Groupes · membre',   () => { __fermerTout(); ouvrirMembre('u-4'); }],
    ['Groupes · admin',    () => { __fermerTout(); ouvrirMembre('u-2'); }],
    ['Groupes · en sourdine', () => { __fermerTout(); ouvrirMembre('u-3'); }],
    ['Groupes · un message', () => { __fermerTout(); actionsMessage('7'); }],
    /* (v329) « VU », comme sur WhatsApp : sous mon message, les coches ; en
       le touchant, qui l'a lu et qui pas encore — puis tout le monde, puis
       personne. (v338) Sur un serveur qui sait l'arrivée : « Distribué à »,
       « Pas encore distribué », et les deux coches grises. */
    ['Groupes · lu par',   () => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render(); actionsMessage('12'); }],
    ['Groupes · lu par tout le monde', () => { __fermerTout(); grp.membres['g-1'].forEach(x => { x.lu_jusqu = 99; }); majVus(); actionsMessage('12'); }],
    ['Groupes · personne ne l\'a lu', () => { __fermerTout(); grp.membres['g-1'].forEach(x => { x.lu_jusqu = 0; }); majVus(); actionsMessage('12'); }],
    ['Groupes · distribué', () => { __fermerTout(); grp.etat.distribues = true;
      const l = grp.membres['g-1']; l.forEach(x => { x.lu_jusqu = 0; x.recu_jusqu = 0; });
      l.find(x => x.membre === 'u-2').lu_jusqu = 99; l.find(x => x.membre === 'u-3').recu_jusqu = 99; majVus(); actionsMessage('12'); }],
    ['Groupes · distribué à tous', () => { __fermerTout(); grp.membres['g-1'].forEach(x => { x.recu_jusqu = 99; }); majVus(); actionsMessage('12'); }],
    /* (v329) Le propriétaire peut céder le groupe. */
    ['Groupes · céder',    () => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render(); ouvrirMembre('u-4'); }],
    ['Groupes · céder ?',  () => { __fermerTout(); modererMembre('u-4', 'ceder'); }],
    /* (v329) Une session que personne n'a fermée : le jeu le dit. */
    ['Compte · session fermée', async () => { __fermerTout(); deconnexionImprevue('play'); await new Promise(r => setTimeout(r, 120)); }],
    ['Groupes · signaler', () => { __fermerTout(); signalerMessage(null, null, null); signalerMessage('7'); }],
    ['Groupes · signaler quelqu\'un', () => { __fermerTout(); signalerMessage(null, 'u-2', 'g-1'); }],
    ['Groupes · signaler le groupe', () => { __fermerTout(); signalerMessage(null, null, 'g-1'); }],
    /* (v339) Le merci d'un membre : il propose de bloquer — à un modérateur,
       non (bloquer lui cacherait ce qu'il modère). */
    ['Groupes · merci',    async () => { __fermerTout(); const a = appelGroupe, mo = grp.etat.moderateur; appelGroupe = async () => ({ ok:true });
      grp.etat.moderateur = false;
      signalerMessage('7'); await new Promise(r => setTimeout(r, 60)); await envoyerSignalement('spam'); appelGroupe = a; grp.etat.moderateur = mo; }],
    ['Groupes · merci (groupe)', async () => { __fermerTout(); const a = appelGroupe; appelGroupe = async () => ({ ok:true });
      signalerMessage(null, null, 'g-1'); await new Promise(r => setTimeout(r, 60)); await envoyerSignalement('autre'); appelGroupe = a; }],
    ['Groupes · bloquer',  () => { __fermerTout(); bloquerQuelquUn('u-2'); }],
    ['Groupes · bloqué',   async () => { __fermerTout(); const a = appelGroupe, m = showModal, l = chargerListes;
      appelGroupe = async () => ({ ok:true }); showModal = (o) => { o.onOk && o.onOk(); }; chargerListes = async () => {};
      bloquerQuelquUn('u-4'); await new Promise(r => setTimeout(r, 60)); appelGroupe = a; showModal = m; chargerListes = l; }],
    ['Groupes · retirer',  () => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render(); modererMembre('u-4', 'exclure'); }],
    ['Groupes · bannir',   () => { __fermerTout(); modererMembre('u-4', 'bannir'); }],
    ...['muet', 'parler', 'promouvoir', 'retrograder', 'exclure', 'bannir', 'ceder'].map(action =>
      ['Groupes · ' + action + ' (fait)', async (a) => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render();
        const x = appelGroupe, m = showModal, c = chargerMembres;
        appelGroupe = async () => ({ ok:true }); showModal = (o) => { o.onOk && o.onOk(); }; chargerMembres = async () => {};
        await modererMembre('u-4', a); await new Promise(r => setTimeout(r, 60));
        appelGroupe = x; showModal = m; chargerMembres = c; }, action]),
    ['Groupes · quitter (propriétaire)', () => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render(); quitterGroupeCourant(); }],
    ['Groupes · quitter (public)', () => { __fermerTout(); grp.membres['g-1'][0].role = 'membre'; groupeCourant().ouvert = true; quitterGroupeCourant(); }],
    ['Groupes · quitter (privé)',  () => { __fermerTout(); groupeCourant().ouvert = false; quitterGroupeCourant(); }],
    ['Groupes · supprimer', () => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render(); supprimerGroupeCourant(); }],
    ['Groupes · supprimer un message', () => { __fermerTout(); supprimerMessageGroupe('7'); }],
    ['Groupes · modifier', () => { __fermerTout(); ouvrirModifGroupe(); }],
    ['Groupes · groupe modifié', async () => { __fermerTout(); const a = appelGroupe; appelGroupe = async () => ({ ok:true });
      ouvrirModifGroupe(); await new Promise(r => setTimeout(r, 60)); await enregistrerGroupe(); appelGroupe = a; }],
    ['Groupes · nom trop court', () => { __fermerTout(); ouvrirCreation(); creerGroupe(); }],
    ['Groupes · code copié', () => { __fermerTout();
      try { Object.defineProperty(navigator, 'clipboard', { configurable:true, get:() => ({ writeText:() => Promise.resolve() }) }); } catch(e){}
      copierCode(); }],
    ['Groupes · invitation copiée', () => { __fermerTout();
      try { Object.defineProperty(navigator, 'share', { configurable:true, get:() => undefined }); } catch(e){}
      partagerGroupe(); }],
    ['Groupes · message copié', () => { __fermerTout(); copierMessage('7'); }],
    ['Groupes · nouveau code', async () => { __fermerTout(); const a = appelGroupe; appelGroupe = async () => ({ ok:true, code:'XYZ789' });
      ouvrirInfosGroupe(); await new Promise(r => setTimeout(r, 60)); await nouveauCodeGroupe(); appelGroupe = a; }],
    ['Groupes · envoi en cours', () => { __fermerTout(); __grpDecor(); grp.courant = 'g-1'; state.screen='groupe'; render();
      grp.fils['g-1'].messages.push({ id:-1, groupe:'g-1', auteur:'moi-0', genre:'texte', texte:'Amen', donnees:{}, cree_le:new Date().toISOString(), masque:false, supprime_le:null });
      majFil(); }],
    /* LA MODÉRATION DU JEU : la file vide, une carte, et ses deux décisions
       qui demandent confirmation. La file vient du serveur : on répond à sa
       place, pour que les cartes soient posées par le chemin du jeu. */
    ['Modération · rien',  async () => { __fermerTout(); __grpDecor(); const l = listeGroupe; listeGroupe = async () => [];
      ouvrirModeration(); await new Promise(r => setTimeout(r, 60)); listeGroupe = l; }],
    ['Modération · signalements', async () => { __fermerTout(); __grpDecor(); const l = listeGroupe;
      listeGroupe = async () => [{ id:1, raison:'harcelement', details:'Amen', le:new Date().toISOString(), groupe:'g-1', groupe_nom:'Lee',
                                   message:7, texte:'Amen', cible:'u-2', cible_nom:'Sam', par_nom:'Kim', nb:2 }];
      ouvrirModeration(); await new Promise(r => setTimeout(r, 60)); listeGroupe = l; }],
    ['Modération · bannir', () => { traiterSignalement(1, 'bannir'); }],
    ['Modération · fermer', () => { __fermerTout(); traiterSignalement(1, 'fermer_groupe'); }],
    /* LA MODÉRATION REGARDE (v311) : la liste de tous les groupes, vide puis
       pleine, et un groupe ouvert en lecture seule. */
    ['Modération · aucun groupe', () => { __fermerTout(); __grpDecor(); moderation = []; grp.tous = []; state.screen = 'moderation'; render(); }],
    ['Modération · tous les groupes', () => { grp.tous = [{ id:'g-9', nom:'Ruth', ouvert:true, teinte:3, nb_membres:4, dernier_message:new Date().toISOString() }];
      const z = document.getElementById('modGroupes'); if (z) z.innerHTML = lignesTous(); }],
    ['Modération · lecture seule', () => { __fermerTout(); __grpDecor(); grp.vus = { 'g-9':{ id:'g-9', nom:'Ruth', ouvert:true, teinte:3, nb_membres:4 } };
      grp.fils['g-9'] = { charge:true, tout:true, messages:[] }; grp.courant = 'g-9'; state.screen = 'groupe'; render();
      showMiniToast(T("Ce groupe n'existe plus.")); }],
    /* LA MODÉRATION ÉCRIT (v334) : le même groupe, vu de l'extérieur, quand
       le serveur le permet (moderation_ecrit) — la barre d'écriture, son
       bouclier, et l'invite « Au nom de la modération… ». */
    ['Modération · écrire', () => { grp.etat = Object.assign({ participe:'ok' }, grp.etat || {}, { moderateur:true, moderation_ecrit:true });
      render(); }],
    /* LA MODÉRATION PLEINE (v336), quand le serveur la sait
       (moderation_pleine). Un modérateur, simple membre d'un de ses groupes :
       sa voix à côté du champ, puis d'un toucher celle de la modération et
       ses pouvoirs (le mode modération) ; la page d'un admin (ce qu'il y fait
       au nom de la modération, (v338) confier le groupe compris) et celle du
       propriétaire ((v338) la sourdine, le retrait, le bannissement : la
       modération a le dernier mot) ; les fenêtres qui le retirent, le
       bannissent, confient le groupe, et la phrase qui dit à qui il passe ;
       de nouveau son profil, et la page d'un membre qui ne
       propose plus que le passage en modération ; les personnes bannies, aucune
       puis une, et le bannissement levé ; les lignes de la discussion au nom
       de la modération, et celle d'un groupe passé à un autre faute de
       nouvelles du propriétaire. Puis ce que voit un joueur qui n'est pas
       modérateur : « Signaler » et « Bloquer », qu'un modérateur n'a plus. */
    ['Modération pleine · ma voix', () => { __fermerTout(); __grpDecor(); grp.etat.moderation_pleine = true; grp.etat.modo_proprietaire = true;
      grp.membres['g-1'][0].role = 'membre'; grp.membres['g-1'][1].role = 'proprietaire';
      grp.courant = 'g-1'; state.screen = 'groupe'; render(); }],
    ['Modération pleine · la voix de la modération', async () => { changerVoix(); await new Promise(r => setTimeout(r, 120)); }],
    ['Modération pleine · un admin', () => { __fermerTout(); grp.membres['g-1'][2].role = 'admin'; ouvrirMembre('u-3'); }],
    ['Modération pleine · le propriétaire', () => { __fermerTout(); ouvrirMembre('u-2'); }],
    /* (v338) La modération a le dernier mot sur le propriétaire. */
    ['Modération pleine · retirer le propriétaire ?', () => { __fermerTout(); modererMembre('u-2', 'exclure'); }],
    ['Modération pleine · bannir le propriétaire ?', () => { __fermerTout(); modererMembre('u-2', 'bannir'); }],
    ['Modération pleine · confier ?', () => { __fermerTout(); modererMembre('u-3', 'ceder'); }],
    ['Modération pleine · propriétaire retiré', async () => { __fermerTout(); const x = appelGroupe, mm = showModal, c = chargerMembres;
      appelGroupe = async () => ({ ok:true }); showModal = (o) => { o.onOk && o.onOk(); };
      chargerMembres = async (gid) => { const l = grp.membres[gid] || []; const a = l.find(y => y.membre === 'u-3'); if (a) a.role = 'proprietaire';
        grp.membres[gid] = l.filter(y => y.membre !== 'u-2'); };
      await modererMembre('u-2', 'exclure'); await new Promise(r => setTimeout(r, 60));
      appelGroupe = x; showModal = mm; chargerMembres = c; }],
    ['Modération pleine · groupe seul', () => { __fermerTout(); ouvrirMembre('u-3'); motFeuille('grpMembreVeil', motErreurGroupe({ ok:false, erreur:'seul' })); }],
    /* (v336) LE MODE MODÉRATION : un toucher sur le bouclier, et de nouveau
       son profil — le mot le dit ; la page d'un membre ne propose plus que
       le passage en modération. */
    ['Modération pleine · mon profil', async () => { __fermerTout(); changerVoix(); ouvrirMembre('u-4'); await new Promise(r => setTimeout(r, 120)); }],
    ['Modération pleine · les infos', () => { __fermerTout(); __grpDecor(); grp.etat.moderation_pleine = true;
      grp.courant = 'g-1'; state.screen = 'groupe'; render(); ouvrirInfosGroupe(); }],
    ['Modération pleine · personne de banni', async () => { __fermerTout(); const l = listeGroupe; listeGroupe = async () => [];
      ouvrirBannis(); await new Promise(r => setTimeout(r, 60)); listeGroupe = l; }],
    ['Modération pleine · des bannis', async () => { __fermerTout(); const l = listeGroupe;
      listeGroupe = async () => [{ id:'u-9', nom:'Ruth', couleur:'#8E5BD8', le:new Date(Date.now() - 3 * 86400000).toISOString() }];
      ouvrirBannis(); await new Promise(r => setTimeout(r, 60)); listeGroupe = l; }],
    ['Modération pleine · lever ?', () => { leverBannissement('u-9'); }],
    ['Modération pleine · levé', async () => { __fermerTout(); const a = appelGroupe, m = showModal;
      appelGroupe = async () => ({ ok:true }); showModal = (o) => { o.onOk && o.onOk(); };
      leverBannissement('u-9'); await new Promise(r => setTimeout(r, 60)); appelGroupe = a; showModal = m; }],
    ['Modération pleine · la discussion', () => { __fermerTout(); const le = new Date().toISOString(); const f = grp.fils['g-1']; let id = 100;
      for (const [t, n] of [['exclu', 'Kim'], ['banni', 'Kim'], ['admin', 'Sam'], ['plus_admin', 'Sam'], ['photo', ''], ['photo_retiree', ''], ['proprietaire', 'Sam']])
        f.messages.push({ id:id++, groupe:'g-1', auteur:null, genre:'systeme', texte:t, donnees:{ nom:n, moderation:true }, cree_le:le, masque:false, supprime_le:null });
      /* (v336) L'absence du propriétaire : le groupe est passé au suivant. */
      f.messages.push({ id:id++, groupe:'g-1', auteur:null, genre:'systeme', texte:'proprietaire', donnees:{ nom:'Sam', ancien:'Kim', absence:true }, cree_le:le, masque:false, supprime_le:null });
      majFil(); }],
    ['Groupes · ce qu\'un joueur peut signaler', () => { __fermerTout(); __grpDecor(); grp.etat.moderateur = false;
      grp.courant = 'g-1'; state.screen = 'groupe'; render(); actionsMessage('7'); }],
    ['Groupes · un joueur regarde un membre', () => { __fermerTout(); ouvrirMembre('u-4'); }],
    ['Groupes · un joueur regarde le groupe', () => { __fermerTout(); ouvrirInfosGroupe(); }],
    /* (v336) L'INVITATION DIT QUI A REJOINT : la partie de Sam, rejointe
       puis quittée avant le départ (« Avec Lee et toi », « Revenir dans la
       partie ») ; la mienne, commencée à six (« Partie en cours », « Avec
       Sam, Lee, Kim et 3 autres »). */
    ['Groupes · l\'invitation suivie', () => { __fermerTout(); __grpDecor(); grp.etat.parties_suivies = true;
      const f = grp.fils['g-1'].messages;
      f.find(x => x.id === 10).donnees = { code:'ABCD', venus:[{ id:'u-3', nom:'Lee' }, { id:'moi-0', nom:'Taylor' }] };
      f.find(x => x.id === 11).donnees = { code:'EFGH', lancee:true,
        venus:['Sam', 'Lee', 'Kim', 'Ruth', 'Amos', 'Job'].map((nom, i) => ({ id:'u-' + (i + 2), nom })) };
      grp.courant = 'g-1'; state.screen = 'groupe'; render(); }],
    /* LES PAGES QUE LES STORES DEMANDENT */
    ['Confidentialité',    () => { __fermerTout(); state.screen='mode'; render(); ouvrirConfidentialite(); }],
    ['Compte · supprimer', () => { __fermerTout(); __grpDecor(); state.screen='profile'; render(); demanderSuppressionCompte(); }],
    ['Compte · suppression ratée', async () => { __fermerTout(); __grpDecor(); state.screen='profile'; render();
      const a = appelGroupe; appelGroupe = async () => ({ ok:false, erreur:'reseau' }); await supprimerMonCompte(); appelGroupe = a; }],
    ['Compte · supprimé',  async () => { __fermerTout(); __grpDecor(); compte.dispo = true; state.screen='profile'; render();
      const a = appelGroupe; appelGroupe = async () => ({ ok:true }); await supprimerMonCompte(); appelGroupe = a; }],
    /* CE QUE DIT LE SERVEUR, code par code : chaque phrase de motErreurGroupe
       s'affiche là où le joueur la lirait (le mot sous les boutons). */
    ...['non_connecte', 'ferme', 'sans_profil', 'banni', 'age', 'nom_longueur', 'description_longueur', 'mot_interdit',
        'coordonnees', 'trop_de_groupes', 'code_inconnu', 'banni_du_groupe', 'groupe_plein', 'pas_membre', 'groupe_ferme',
        'trop_vite', 'vide', 'trop_long', 'interdit', 'introuvable', 'soi_meme', 'partie_invalide', 'photo', 'photo_retiree', 'reseau',
        /* Une partie à la fois (v314) : la sienne encore ouverte, ou relancée trop vite. */
        'partie_en_cours', 'parties_trop_vite'].map(code =>
      ['Groupes · erreur ' + code, (c) => { __fermerTout(); __grpDecor(); grp.message = motErreurGroupe({ erreur:c }); state.screen='groupes'; render(); }, code]),
    /* (v332) Un groupe plein dit combien il en tient : 120 au plus. */
    ['Groupes · groupe complet', () => { __fermerTout(); __grpDecor(); grp.message = motErreurGroupe({ ok:false, erreur:'groupe_plein', max:120 }); state.screen='groupes'; render(); }],
    /* LA PHOTO DU GROUPE (v311) : la feuille « Changer / Retirer », puis le
       salon d'une partie lancée depuis un groupe, chez l'hôte et chez
       l'invité. */
    ['Groupes · photo du groupe', () => { __fermerTout(); __grpDecor(); state.screen='groupes'; render(); ouvrirCreation();
      creation.photo = 'data:image/jpeg;base64,AAAA'; choisirPhotoGroupe(); }],
    /* L'IMAGE DU GROUPE (v322) : une photo, ou l'un des quinze logos — le
       menu, sans photo puis avec, et le logo posé sur la pastille. */
    ['Groupes · image du groupe', () => { __fermerTout(); __grpDecor(); grp.etat.photos = true; grp.etat.logos = true; state.screen='groupes'; render(); ouvrirCreation();
      choisirImageGroupe(); }],
    ['Groupes · image du groupe (photo)', () => { __fermerTout(); __grpDecor(); grp.etat.photos = true; grp.etat.logos = true; state.screen='groupes'; render(); ouvrirCreation();
      creation.photo = 'data:image/jpeg;base64,AAAA'; choisirImageGroupe(); }],
    ['Groupes · logo choisi', () => { __fermerTout(); __grpDecor(); grp.etat.photos = true; grp.etat.logos = true; state.screen='groupes'; render(); ouvrirCreation();
      creation.logo = 3; majPastilleFormulaire(); }],
    /* LA PHOTO DE PROFIL (v322) : le même menu que celle d'un groupe. */
    ['Profil · photo de profil', () => { __fermerTout(); state.screen='profile'; render();
      photoCache = 'data:image/jpeg;base64,AAAA'; choisirPhotoProfil(); photoCache = ''; }],
    ['Groupes · salon du groupe', () => { __fermerTout(); __grpDecor(); net.depuisGroupe = 'g-1'; net.code = 'ABCD'; net.isHost = true;
      net.joueurs = {}; majAdversaire(); state.screen = 'online-room'; render(); }],
    ['Groupes · salon du groupe (invité)', () => { net.isHost = false; render(); }],
    ['Groupes · erreur muet', () => { __fermerTout(); __grpDecor();
      grp.message = motErreurGroupe({ erreur:'muet', jusqu:new Date(Date.now() + 3600000).toISOString() }); state.screen='groupes'; render(); }],
  ];

  const ETAPES = [
    ['Accueil',           () => { state.screen='mode'; render(); }],
    ['Réglages',          () => { openSettings(); }],
    ['Versions de Bible', () => { __fermerTout(); openBibles(); }],
    ['Langues',           () => { __fermerTout(); openLangues(); }],
    ['Flamme',            () => { __fermerTout(); state.screen='mode'; render(); ouvrirFlamme(); }],
    /* LA JOURNÉE DÉJÀ FAITE EST UN AUTRE ÉCRAN. L'échéance du jour a deux
       visages — « Plus que 6 h » tant qu'il reste une partie à jouer, « Fait
       pour aujourd'hui » une fois qu'elle l'est — et la feuille de la flamme
       change de phrase avec lui. Sans cette étape, la moitié des deux ne se
       montre jamais au banc. On passe par saveDaily, le chemin du jeu. */
    ['Journée faite',     () => { __fermerTout();
      saveDaily({ last:dayKey(0), streak:5, jours:[dayKey(-1), dayKey(0)], geles:[], gels:1 });
      state.screen='mode'; render(); ouvrirFlamme(); }],
    ['Profil',            () => { __fermerTout(); state.screen='profile'; render(); }],
    ['Progression',       () => { state.screen='parcours'; render(); }],
    /* LES TESTAMENTS SONT DES PAGES (v316) : leurs sections — Pentateuque…,
       Évangiles et Actes… — ne se peignent qu'à l'ouverture de chacune. */
    ['Ancien Testament (page)',  () => { ouvrirTestament('at'); }],
    ['Nouveau Testament (page)', () => { __fermerTout(); ouvrirTestament('nt'); }],
    ['Progression (retour)',     () => { __fermerTout(); state.screen='parcours'; render(); }],
    ['À revoir',          () => { state.screen='revoir'; render(); }],
    /* LE CARNET VIDE NE MONTRE PAS TOUT. Sans erreurs, la jauge, la liste et
       le compte ne sont pas peints du tout — des intitulés que le banc ne
       verrait donc jamais. On remplit le carnet par le CHEMIN DU JEU
       (errbookAdd : les erreurs sont d'aujourd'hui), et on rate deux
       questions une seconde fois. */
    ['À revoir · rempli', () => {
      __fermerTout();
      localStorage.removeItem('bt_errbook');
      const d = seededDeck(4242, '9', null);
      d.forEach(q => errbookAdd(q));
      errbookAdd(d[0]); errbookAdd(d[1]);
      const a = loadErrbook();
      if(a[4]) a[4].p = 2;      // une rattrapée : la jauge de la semaine a de quoi dire
      saveErrbook(a);
      localStorage.setItem('bt_lastmiss', JSON.stringify([qKey(d[0]), qKey(d[1])]));
      state.screen='revoir'; render(); }],
    /* LA SECONDE CHANCE (v316) A TROIS ÉTATS, et chacun ses phrases : des
       erreurs à rattraper (le nombre, la liste, « Et 12 autres ensuite », la
       jauge), tout rattrapé cette semaine, et rien du tout. L'écran n'en
       peint qu'un à la fois : on les visite tous. */
    ['À revoir · une seule', () => {
      const a = loadErrbook().slice(0, 1); a[0].p = 0; saveErrbook(a);
      state.screen='revoir'; render(); }],
    ['À revoir · tout rattrapé', () => {
      const a = loadErrbook(); a.forEach(x => { x.p = 1; }); saveErrbook(a);
      state.screen='revoir'; render(); }],
    ['À revoir · vide',    () => { localStorage.setItem('bt_errbook','[]');
      localStorage.removeItem('bt_acquises');
      state.screen='revoir'; render(); }],
    /* ON REMET LE CARNET COMME ON L'A TROUVÉ. Les scénarios ci-dessus vident
       le carnet et effacent les erreurs de la dernière partie — et les écrans
       qui viennent APRÈS en dépendent : la carte de l'accueil ne dit « Tes
       erreurs récentes » que s'il y en a, et le bouton « Réviser la dernière
       partie » n'existe que s'il reste des ratées. Un scénario qui laisse
       l'état sale rend AVEUGLE tout ce qui le suit, et le banc accuse alors le
       jeu de ne pas traduire des phrases qu'il n'a simplement pas peintes. */
    ['Carnet remis à l\'état rempli', () => {
      localStorage.removeItem('bt_errbook');
      const d = seededDeck(4242, '9', null);
      d.forEach(q => errbookAdd(q));
      errbookAdd(d[0]); errbookAdd(d[1]);
      localStorage.setItem('bt_lastmiss', JSON.stringify([qKey(d[0]), qKey(d[1])]));
      state.screen='mode'; render(); }],
    ['Réglages Groupe',   () => { state.mode='group'; state.screen='setup'; render(); }],
    ['Réglages Solo',     () => { state.mode='solo'; state.screen='setup'; render(); }],
    /* UN LIVRE, DEPUIS L'ÉCRAN DU MODE (v320) : la page des livres ouverte
       depuis le Solo, avec sa phrase à elle — puis la puce, un livre choisi. */
    ['Solo · un livre',   () => { __fermerTout(); state.mode='solo'; state.screen='setup'; render(); ouvrirLivreLocal(); }],
    ['Solo · Genèse',     () => { __fermerTout(); state.livre = BIBLE_BOOKS[0]; state.mode='solo'; state.screen='setup'; render(); }],
    ['Solo · sans livre', () => { state.livre = null; render(); }],
    ['Partie Solo',       () => { state.mode='solo'; startGame(); }],
    /* LA SECONDE CHANCE EN JEU (v316) : une bonne réponse, et le fait dit
       « Rattrapée ! » au lieu de « Le savais-tu ? ». Par le vrai chemin : la
       séance de l'écran À revoir, et une bonne réponse. */
    ['Seconde chance · rattrapée', () => { __fermerTout(); startRevision('carnet');
      const q = currentQ(); if (q) soloAnswer(q.shuffledOptions.indexOf(q.correct)); }],
    ['Fin de partie',     () => { state.screen='end'; render(); }],
    ['Nom en ligne',      () => { state.screen='online-name'; render(); }],
    ['Hub en ligne',      () => { net.connected=1; net.error=''; state.screen='online'; render(); }],
    ['Hub · erreur',      () => { net.error = T("La connexion au salon a échoué. Réessaie."); render(); }],
    /* La carte de recherche d'adversaire : un écran entier que le banc ne
       voyait pas, et qui contenait « Dès qu'un autre joueur cherche… » en
       français dans le texte. */
    /* « Partie aléatoire » demande d'abord le testament, dans une feuille
       (v313) : la question, les trois lignes et la note. */
    ['Partie aléatoire',  () => { net.error=''; net.searching=false; render(); ouvrirPartieAleatoire(); }],
    ['Recherche',         () => { __fermerTout(); net.searching=true; render(); }],
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
    /* UN SEUL LIVRE (v316) : la page des livres, et le mot qui prévient
       l'hôte quand un invité resté sur une version d'avant ne sait pas lire
       un livre. Le mot passe par la fonction du jeu (lancerLaManche) ; seul
       le départ de la manche est retenu — on relève des textes, on ne joue
       pas. */
    ['Salon · un livre',   () => { ouvrirChoixLivre(); }],
    ['Salon · invité d\'avant', () => { __fermerTout();
      const salon = net.room, depart = window.beginDuel;
      net.livre = BIBLE_BOOKS[0]; net.room = { send(){} }; window.beginDuel = () => {};
      try { lancerLaManche(); } finally { net.room = salon; window.beginDuel = depart; net.livre = null; } }],
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
    /* ===== LE HORS-LIGNE DOIT S'EN ALLER AVEC L'ÉTAPE =====
       Le faux « hors ligne » est posé sur l'OBJET navigator, et l'étape
       croyait le retirer en reposant le descripteur du PROTOTYPE — qu'elle
       n'avait jamais touché. La propriété de l'objet restait donc là, et
       masquait la vraie : navigator.onLine valait false pour tout le reste de
       la passe. Sans conséquence tant que rien ne le relisait ; depuis que le
       jeu surveille le réseau (v300), c'est une fausse coupure. On retire
       donc exactement ce qu'on a posé. */
    ['Hors connexion',     () => { __fermerTout();
      Object.defineProperty(navigator, 'onLine', { configurable:true, get:()=>false });
      try { openOnline(); } finally { delete navigator.onLine; } }],
    /* ===== L'ICÔNE DU RÉSEAU, ET CE QU'ELLE DIT (v300) =====
       Elle n'apparaît que sur un mauvais réseau : sans ces étapes, ses quatre
       phrases ne s'affichaient jamais ici, et le banc les déclarait — à
       raison — « jamais vues ». On pose l'état par la fonction du jeu
       (poserReseau) et on ouvre la fenêtre par celle qui l'ouvre
       (expliquerReseau). La sonde que cette dernière relance est tenue à
       l'écart le temps des deux étapes : c'est un relevé de textes, pas une
       mesure du réseau. */
    ['Réseau faible',      () => { __fermerTout(); state.screen='mode'; render();
      RESEAU.enCours = true; poserReseau('faible'); expliquerReseau(); }],
    ['Réseau coupé',       () => { __fermerTout(); poserReseau('coupe'); expliquerReseau(); }],
    ['Réseau revenu',      () => { __fermerTout(); RESEAU.enCours = false; poserReseau('bon'); }],
    ['Quitter la partie',  () => { __fermerTout(); confirmLeaveGame(); }],
    ['Quitter le duel',    () => { __fermerTout();
      net.myDone = false; net.oppGone = false;
      net.deck = seededDeck(12345, '9', null); net.idx = 2;
      quitDuel(); }],
    ['Rappels proposés',   () => { __fermerTout();
      showModal({ title:T('Recevoir les rappels\u00a0?'),
        message:T("Les messages de tes groupes. Et pour le jeu, au plus UN rappel par jour, jamais si tu as déjà joué : ta série sur le point de s'éteindre, tes erreurs à revoir, un verset le dimanche, un mot si tu t'absentes."),
        okLabel:T("D'accord"), cancelLabel:T('Non merci') }); }],
    ...FICHES,
    ...FLAMMES,
    ...GROUPE,
    ...FINS_LIGNE,
    ...FINS_SOLO,
    ...FINS_GROUPE,
    ...DERNIERS,
    ...RESTES,
    /* Le profil d'un joueur qui n'a pas encore choisi de nom. */
    ['Profil · invité',    () => { const g = JSON.parse(localStorage.getItem('bt_profile')||'{}');
      profile.name = ''; state.screen='profile'; render(); }],
    /* ===== LA CARTE DU COMPTE, DANS SES QUATRE ÉTATS =====
       Elle ne s'affiche que si la table existe côté serveur, ce qui n'est pas
       le cas ici : on pose donc « dispo » à la main. Sans ces étapes, vingt et
       une phrases du dictionnaire n'étaient JAMAIS vues — et une traduction
       qu'aucun écran ne montre est une traduction qu'on ne peut pas relire. */
    ['Compte · repos',     () => { compte.dispo = true; compte.session = null; compte.etape = 'repos';
      compte.message = ''; state.screen = 'profile'; render(); }],
    /* LA SONDE GOOGLE INTERROGE LE VRAI SERVEUR (/auth/v1/settings, appelée
       par compteOuvrir), où Google est fermé : selon la vitesse du réseau,
       elle retirait le bouton avant ou après le relevé, et « Continuer avec
       Google » passait pour jamais vu une fois sur deux, dans une langue ou
       dans l'autre. On lui donne sa réponse d'avance (le souvenir qu'elle
       garde elle-même) : c'est un relevé de textes, pas un essai de la
       connexion. */
    ['Compte · deux portes',() => {
      try { localStorage.setItem(CLE_GOOGLE, JSON.stringify({ ok:true, quand:Date.now() })); } catch(e){}
      compte.google = true; compteOuvrir(); }],
    ['Compte · pas une adresse', () => { compte.message = T("Cette adresse n'a pas l'air d'une adresse."); majCarteCompte(); }],
    ['Compte · envoi refusé',    () => { compte.message = T("Impossible d'envoyer le code pour l'instant."); majCarteCompte(); }],
    ['Compte · trop d\'essais',  () => { compte.message = T("Trop d'essais d'affilée. Attends une minute, puis réessaie."); majCarteCompte(); }],
    ['Compte · mail parti nulle part', () => { compte.message = T("Le mail n'a pas pu partir. Réessaie dans un instant."); majCarteCompte(); }],
    ['Compte · Google fermé',    () => { compte.message = T("Passe plutôt par ton adresse e-mail."); majCarteCompte(); }],
    ['Compte · code envoyé', () => { compte.courriel = 'joueur@exemple.net'; compte.etape = 'code';
      compte.message = T("Code envoyé. Regarde ta boîte mail."); majCarteCompte(); }],
    ['Compte · code incomplet',  () => { compte.message = T("Tape tout le code reçu par mail."); majCarteCompte(); }],
    ['Compte · envoi en cours',  () => { compte.message = T("Envoi du code…"); majCarteCompte(); }],
    ['Compte · connexion',       () => { compte.message = T("Connexion…"); majCarteCompte(); }],
    ['Compte · code refusé',     () => { compte.message = T("Ce code ne correspond pas, ou il a expiré."); majCarteCompte(); }],
    ['Compte · serveur muet',    () => { compte.message = T("Le serveur ne répond pas. Réessaie dans un instant."); majCarteCompte(); }],
    ['Compte · connecté',  () => { compte.session = { user:{ id:'x', email:'joueur@exemple.net' } };
      compte.etape = 'connecte'; compte.derniere = Date.now(); compte.message = ''; majCarteCompte(); }],
    ['Compte · il y a une heure', () => { compte.derniere = Date.now() - 3700000;
      compte.message = T("Pas de réseau. La sauvegarde reprendra toute seule."); majCarteCompte(); }],
    ['Compte · il y a dix minutes', () => { compte.derniere = Date.now() - 600000; compte.message = ''; majCarteCompte(); }],
    /* CONNECTÉ, LA CARTE EST UNE LIGNE (v312) : l'adresse, la dernière
       sauvegarde, « Se déconnecter » et « Supprimer mon compte » vivent dans
       la feuille « Mon compte », qu'il faut donc ouvrir pour les lire. */
    ['Compte · Mon compte', () => { compte.derniere = Date.now() - 30000; ouvrirMonCompte(); }],
    /* ===== LA PHOTO DE PROFIL, DANS SES TROIS ÉTATS =====
       « Ajouter une photo » se montre à l'étape Profil ordinaire. Mais
       « Changer la photo » et « Retirer la photo » n'existent QUE si une photo
       est posée, et « Cette image n'a pas pu être lue. » que si la lecture
       échoue : sans ces deux étapes, trois phrases du dictionnaire ne seraient
       JAMAIS vues — et une traduction qu'aucun écran ne montre est une
       traduction qu'on ne peut pas relire.
       On pose une vraie photo (un JPEG de 8x8, le plus petit qui soit un vrai
       fichier) par la clé du jeu, puis on invalide le cache mémoire comme le
       ferait un rechargement. */
    ['Profil · avec photo', () => { __fermerTout();
      localStorage.setItem('bt_photo', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwClRRRXObH/2Q==');
      photoCache = null; majPhotoRacine();
      state.screen = 'profile'; render(); }],
    /* Un fichier qui n'est pas une image : la modale doit le DIRE. On passe par
       poserPhoto, le chemin du jeu — pas par showModal à la main. */
    ['Profil · photo illisible', () => poserPhoto(new Blob(['ceci n\'est pas une image'], { type:'image/jpeg' }))],
    /* La scène de cadrage (v290) : son titre, son aide et le nom du glisseur
       ne se montrent que là. */
    ['Ajuster la photo', async () => {
      __fermerTout();
      const c = document.createElement('canvas'); c.width = 600; c.height = 400;
      const g = c.getContext('2d'); g.fillStyle = '#7a5a3a'; g.fillRect(0,0,600,400);
      const blob = await new Promise(r=>c.toBlob(r,'image/png'));
      await ouvrirCadrage(blob);
    }],
    ...GROUPES_SOCIAUX,
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

  /* ===== UNE PASSE PAR LANGUE, ET LE FRANÇAIS POUR TÉMOIN =====
     Le banc s'appelait « anglais-ecrans » et ne savait faire qu'une langue.
     L'espagnol arrivé, le choix était d'en écrire un second — deux fichiers à
     tenir à jour, et le second qui prend du retard dès la semaine suivante —
     ou d'en faire une boucle. C'est une boucle. */
  const LANGUES = (process.env.LANGUES || 'en,es').split(',').map(x => x.trim()).filter(Boolean);
  const fr = await passe('fr');
  const fautes = [...fr.ennuis];
  if(fr.erreurs.length) fautes.push('erreurs JS (fr) : ' + [...new Set(fr.erreurs)].slice(0,2).join(' | '));
  let compteTotal = 0, pairesTotal = 0, ecransTotal = 0;
  const bilan = [];

  for(const lg of LANGUES){
    const cible = CIBLE[lg];
    if(!cible){ fautes.push('langue inconnue du banc : ' + lg); continue; }
    /* ===== LA BANQUE DE QUESTIONS EST UN FICHIER À PART =====
       Les 1545 questions ne sont pas dans index.html : elles vivent dans
       questions-<langue>.js, chargé seulement pour qui lit cette langue. Tant
       qu'il manque, le jeu montre les questions FRANÇAISES — et la première
       barrière en dénonce vingt, une par écran qui en affiche une. Vingt
       lignes pour un seul fait. On le dit UNE fois, clairement, et on cesse de
       juger les emplacements qui portent une question : le reste de l'écran
       reste comparé aussi sévèrement qu'avant. */
    const banque = path.join(__dirname, '..', 'questions-' + lg + '.js');
    const sansBanque = !fs.existsSync(banque);
    if(sansBanque) fautes.push('BANQUE ABSENTE  ' + lg + '  — questions-' + lg
      + '.js n\'existe pas : les 1545 questions restent en français');
    const p2 = await passe(lg);
    fautes.push(...p2.ennuis);
    if(p2.erreurs.length) fautes.push('erreurs JS (' + lg + ') : ' + [...new Set(p2.erreurs)].slice(0,2).join(' | '));

    /* ===== UNE PASSE DE PLUS, SUR ANDROID =====
       IS_IOS est une const lue au chargement : le guide d'installation choisit
       ses trois étapes une fois pour toutes, et la passe ci-dessus est un
       iPhone. Les quatre phrases du chemin Android n'auraient donc jamais été
       relues. Un autre téléphone, un écran, et elles le sont. */
    /* (v325) Et trois iPhone de plus : le guide y choisit aussi ses gestes
       au chargement — Safari d'iOS 26 range Partager dans « ••• », une
       application (Instagram, TikTok…) doit d'abord ouvrir Safari, Chrome a
       son bouton dans sa barre. */
    /* (v326) ET UN JEU INSTALLÉ. La rangée des rappels — Rappels, Prière,
       Lecture de la Bible — n'existe que là (notifPossible exige le mode
       installé, lu au chargement). Comme banc-essai/notifs.js, on fait
       répondre « installé » à matchMedia avant que le jeu ne se lance : la
       rangée se lit alors pour de vrai, au lieu d'être excusée. */
    /* (v326) Les pannes que la carte « Rappels » sait nommer, une par passage :
       à elles toutes, elles font dire à la carte chacune de ses phrases. */
    const quand = new Date().toISOString();
    const BASE_OK = { version:326, abonnes:3, inscrit:true, cron:true, net:true, tache:{ active:true, schedule:'*/5 * * * *' } };
    const F_OK = { st:200, c:{ version:326, vapid:'ok', pub:'@JEU' } };
    const avecBase = (plus) => Object.assign({}, BASE_OK, plus);
    const DIAG_RAPPELS = [
      { possible:false, etat:null, f:{ st:404, c:null } },
      { perm:'denied', etat:null, err:{ code:'57014', message:'canceling statement due to statement timeout' }, f:{ st:0 } },
      { abonne:false, etat:{ version:326, abonnes:1, inscrit:null, cron:false, net:true }, f:{ st:401, c:{} } },
      { etat:avecBase({ inscrit:false, tache:null }), f:{ st:200, c:{ envoyes:0 } } },
      { etat:avecBase({ tache:{ erreur:'permission denied for schema cron' } }), f:{ st:200, c:{ version:326, vapid:['VAPID_PRIVEE'], pub:'@JEU' } } },
      { etat:avecBase({ tache:{ active:false, schedule:'*/5 * * * *' } }), f:{ st:500, c:{ code:'WORKER_ERROR' } } },
      { etat:avecBase({ tache:{ active:true, schedule:'0 * * * *' }, passage:{ status:'failed', message:'connection refused' }, reponse:null }),
        f:{ st:200, c:{ version:326, vapid:'ok', pub:'B' + 'x'.repeat(86) } }, copier:true },
      { etat:avecBase({ reponse:{ erreur:'permission denied for table _http_response' } }), f:F_OK },
      { etat:avecBase({ reponse:{ error_msg:'Timeout of 25000 ms reached', created:quand } }), f:F_OK },
      { etat:avecBase({ reponse:{ status_code:200, contenu:'{"version":326,"envoyes":0}', created:quand } }), f:F_OK, essai:{ st:200, c:{ envoye:true } } },
      { etat:avecBase({ reponse:{ status_code:200, contenu:'{"version":326,"envoyes":1,"echecs":1,"dernier_echec":{"code":403,"raison":"VAPID"}}', created:quand } }), f:F_OK, essai:{ st:429, c:{} } },
      { etat:avecBase({ reponse:{ status_code:200, contenu:'{"version":326,"envoyes":5,"echecs":2,"dernier_echec":{"code":410,"raison":"Gone"}}', created:quand } }), f:F_OK, essai:{ st:502, c:{ code:403 } } },
      { etat:avecBase({ reponse:{ status_code:401, contenu:'{"erreur":"accès"}', created:quand } }), f:F_OK, essai:{ st:502, c:{ code:400, details:['Bad Request'] } } },
      { etat:avecBase({ reponse:{ status_code:400, contenu:'{"erreur":"table"}', created:quand } }), f:F_OK, essai:{ st:404, c:{ erreur:'inconnu' } } },
      /* (v327) Les heures que le serveur a pour CE téléphone : la prière à
         7 h là-bas, éteinte ici ; un autre fuseau ; les rappels du jeu
         allumés là-bas. Et « Essayer chaque rappel » face à une fonction
         d'avant la v327, qui n'envoie qu'un essai et ne compte rien. */
      { etat:avecBase({ reponse:{ status_code:200, contenu:'{"version":327,"envoyes":0}', created:quand } }),
        f:{ st:200, c:{ version:327, vapid:'ok', pub:'@JEU', moi:{ inscrit:true, decalage:-999, jeu:true, priere:420, lecture:null, priere_le:null, lecture_le:null, jeu_le:null } } },
        essai:{ st:200, c:{ envoye:true } }, chaque:true },
      /* (v331) Les rappels annoncent aussi les messages des groupes : aucun
         téléphone ne peut encore les recevoir, puis trois. */
      { etat:avecBase({ messages_branches:true, lies:0, reponse:{ status_code:200, contenu:'{"version":331,"envoyes":0}', created:quand } }), f:F_OK },
      { etat:avecBase({ messages_branches:true, lies:3, reponse:{ status_code:200, contenu:'{"version":331,"envoyes":0}', created:quand } }), f:F_OK },
    ];
    const INSTALLE = () => {
      const vraiMM = window.matchMedia ? window.matchMedia.bind(window) : null;
      window.matchMedia = (q) => /display-mode/.test(String(q))
        ? { matches:true, media:q, onchange:null, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } }
        : (vraiMM ? vraiMM(q) : { matches:false, media:q, addEventListener(){}, removeEventListener(){} });
      window.Notification = function(){}; window.Notification.permission = 'default';
      window.Notification.requestPermission = () => Promise.resolve('default');
    };
    for(const [nomGuide, ua, vue, installe] of [['Guide Android', ANDROID, { width:412, height:915 }],
                                      ['Guide iPhone · Safari 26', IOS26, { width:393, height:852 }],
                                      ['Guide iPhone · dans une appli', DANS_APPLI, { width:393, height:852 }],
                                      ['Guide iPhone · Chrome', CHROME_IOS, { width:393, height:852 }],
                                      ['Réglages · jeu installé', IOS, { width:393, height:852 }, true],
                                      ['Modération · rappels', IOS, { width:393, height:852 }, 'diag']]){
      const ctx = await nav.newContext({ viewport:vue, deviceScaleFactor:2,
        userAgent:ua, hasTouch:true, serviceWorkers:'block' });
      const q = await ctx.newPage();
      if(installe === 'diag') await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin:URL.match(/^https?:\/\/[^/]+/)[0] });
      await ouvrirLaLangue(q, lg);
      if(installe) await q.addInitScript(INSTALLE);
      await q.addInitScript(PREP, lg);
      await q.goto(URL);
      await q.waitForFunction((l) => { try { return typeof render === 'function' && LANGUE === l; } catch(e){ return false; } }, lg, { timeout:20000 });
      await q.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
      try {
        if(installe === 'diag'){
          /* (v326) LA CARTE « RAPPELS » : chaque panne qu'elle sait nommer, jouée
             par la vraie fonction du jeu ; on ne remplace que ce qui répond à
             sa place — la base (rappels_etat), la fonction (lireFonction), le
             téléphone (abonnement, permission). Le texte de chaque passage
             s'ajoute au relevé. */
          const lus = [];
          /* Vrai quand la carte est là ET que chacun de ses parents est
             pleinement visible : c'est ce que RAMASSER exige. */
          const carteLisible = () => q.evaluate(() => {
            if(state.screen !== 'moderation') return false;
            const c = document.querySelector('#modRappels .rd-l');
            if(!c) return false;
            for(let n = c; n && n !== document.body; n = n.parentElement){
              const s = getComputedStyle(n);
              if(s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 1) return false;
            }
            return true;
          });
          for(const sc of DIAG_RAPPELS){
           let lisible = false;
           for(let essai = 0; essai < 4 && !lisible; essai++){
            await q.evaluate(async (sc) => {
              const pub = (x) => x && x.c && x.c.pub === '@JEU' ? Object.assign({}, x, { c:Object.assign({}, x.c, { pub:VAPID_PUBLIC }) }) : x;
              window.notifPossible = () => sc.possible !== false;
              window.notifEtat = () => sc.perm || 'granted';
              const sub = sc.abonne === false ? null : { endpoint:'https://web.push.apple.com/appareil-0001', toJSON(){ return { endpoint:this.endpoint }; } };
              try { Object.defineProperty(navigator, 'serviceWorker', { configurable:true, value:{ ready:Promise.resolve({ pushManager:{ getSubscription:() => Promise.resolve(sub) } }),
                addEventListener(){}, register:() => Promise.resolve({}) } }); } catch(e){}
              window.initSupa = () => ({ rpc:async () => sc.etat ? { data:sc.etat, error:null } : { data:null, error:sc.err || { code:'PGRST202', message:'Could not find the function' } } });
              window.lireFonction = async (corps) => pub((corps && corps.essai_moi) ? (sc.essai || { st:404, c:null }) : (sc.f || { st:404, c:null }));
              if(state.screen !== 'moderation'){ grp.etat = Object.assign({}, grp.etat || {}, { moderateur:true }); moderation = []; grp.tous = []; state.screen = 'moderation'; render(); }
              rapDiag.essai = null;
              await diagnosticRappels(true);
              if(sc.essai) await essaiRappel();
              if(sc.chaque) await essaiChaqueRappel();
              if(sc.copier){ const b = [...document.querySelectorAll('#modRappels .mod-act button')].find(x => /copierDansPressePapier/.test(x.getAttribute('onclick') || '')); if(b) b.click(); }
            }, sc);
            /* L'écran a pu partir (le jeu renvoie à l'accueil un joueur sans
               compte), ou être encore en train d'arriver : on attend qu'il
               soit lisible, et sinon on rejoue le passage. */
            for(let t = 0; t < 12 && !(lisible = await carteLisible()); t++) await q.waitForTimeout(100);
           }
            if(!lisible) fautes.push(nomGuide + ' (' + lg + ') : la carte « Rappels » ne reste pas lisible');
            await q.waitForTimeout(sc.copier ? 300 : 0);
            lus.push(...await q.evaluate(RAMASSER));
          }
          /* (v328) La liste « Tous les groupes » qui ne se lit pas : la
             Modération le dit. */
          await q.evaluate(() => { grp.tous = []; tousEnEchec(null); });
          await q.waitForTimeout(250);
          lus.push(...await q.evaluate(RAMASSER));
          p2.releve.set(nomGuide, lus);
        } else if(installe){
          const vu = await q.evaluate(() => { state.screen='mode'; render(); openSettings(); return notifPossible(); });
          if(!vu) fautes.push(nomGuide + ' (' + lg + ') : la rangée des rappels n\'apparaît pas (notifPossible faux)');
          await q.waitForTimeout(700);
        } else {
          await q.evaluate(() => { state.screen='mode'; render(); openFsGuide(); });
          await q.waitForTimeout(450);
        }
        /* La passe « carte Rappels » a déjà posé ses quatorze relevés : une
           capture finale ici les écrasait tous, sauf le dernier. */
        if(installe !== 'diag') p2.releve.set(nomGuide, await q.evaluate(RAMASSER));
      } catch(e){ fautes.push(nomGuide + ' (' + lg + ') : ' + e.message.split('\n')[0]); }
      await ctx.close();
    }

    /* ===== PREMIÈRE BARRIÈRE : du français reconnaissable dans le rendu ===== */
    const vus = new Set();
    let compte = 0;
    for(const [nom, textes] of p2.releve){
      compte += textes.length;
      for(const { t, ou } of textes){
        if(sansBanque && LIEUX_QUESTION.test(String(ou))) continue;
        if(TOLERE.some(r => r.test(t))) continue;
        if(!(cible.accent.test(t) || cible.re.test(t))) continue;
        const cle = 'fr:' + t.slice(0, 80);
        if(vus.has(cle)) continue;
        vus.add(cle);
        fautes.push('FRANÇAIS  ' + lg + ' ' + nom.padEnd(18) + ' « ' + t.slice(0, 80) + ' »   [' + String(ou).slice(0, 34) + ']');
      }
    }

    /* ===== DEUXIÈME BARRIÈRE : ce qui n'a pas bougé d'une langue à l'autre =====
       ON COMPARE PLACE PAR PLACE, PAS EN VRAC. Comparer deux sacs de mots
       faisait mentir le banc : le « M » anglais du lundi retrouvait le « M »
       français du mardi. Et place par place sur TOUT l'écran ne tient pas non
       plus, depuis que le panneau des Bibles propose cinq versions en français,
       trois en anglais et deux en espagnol : on apparie par EMPLACEMENT, les
       textes d'une même classe CSS, dans l'ordre. */
    let paires = 0;
    const parLieu = (liste) => {
      const m = new Map();
      for(const x of liste){ const k = String(x.ou); if(!m.has(k)) m.set(k, []); m.get(k).push(x); }
      return m;
    };
    for(const [nom, textesLg] of p2.releve){
      const textesFr = fr.releve.get(nom);
      if(!textesFr) continue;
      const lieuxLg = parLieu(textesLg), lieuxFr = parLieu(textesFr);
      const couples = [];
      for(const [k, a] of lieuxLg){
        const b = lieuxFr.get(k);
        if(!b) continue;
        for(let i = 0; i < Math.min(a.length, b.length); i++) couples.push([a[i], b[i]]);
      }
      for(const [x, y] of couples){
        const { t, ou } = x;
        if(y.t !== t) continue;
        if(sansBanque && LIEUX_QUESTION.test(String(ou))) continue;
        paires++;
        if(MEME_DANS_LES_DEUX.some(r => (!r.lg || r.lg === lg) && r.quoi.test(t) && (!r.ou || r.ou.test(String(ou))))) continue;
        if(LIEUX_LIBRES.test(String(ou))) continue;
        const cle = 'id:' + t.slice(0, 80);
        if(vus.has(cle)) continue;
        vus.add(cle);
        fautes.push('INCHANGÉ  ' + lg + ' ' + nom.padEnd(18) + ' « ' + t.slice(0, 80) + ' »   [' + String(ou).slice(0, 34) + ']');
      }
    }

    /* ===== TROISIÈME BARRIÈRE : CE QUE LE BANC N'A JAMAIS VU =====
       Un banc vert ne prouve rien sur les écrans qu'il n'ouvre pas. On demande
       donc au jeu toutes ses phrases dans cette langue, et on retire celles
       qu'on a effectivement lues. Ce qui reste doit être JUSTIFIÉ, une ligne
       par phrase : sans quoi le banc échoue. */
    const dico = await (async () => {
      const ctx2 = await nav.newContext({ viewport:{ width:393, height:852 }, userAgent:IOS, serviceWorkers:'block' });
      const q = await ctx2.newPage();
      await ouvrirLaLangue(q, lg);
      await q.addInitScript((l) => localStorage.setItem('bt_langue', l), lg);
      await q.goto(URL);
      await q.waitForFunction(() => { try { return typeof TEXTES === 'object'; } catch(e){ return false; } }, null, { timeout:20000 });
      const v = await q.evaluate((l) => ({ textes:Object.values(TEXTES[l] || {}),
        versets:Object.values((typeof VERSETS_LANGUE === 'object' && VERSETS_LANGUE[l]) || {}) }), lg);
      await ctx2.close();
      return v;
    })();
    /* ON COMPARE SUR UNE FORME APLATIE, ET PAR MORCEAU. RAMASSER écrase les
       blancs, donc toute valeur portant une espace insécable ne retombait
       jamais sur son homologue ; et le jeu COMPOSE ses phrases — « September »
       ne s'affiche pas seul, il vit dans « September 21 — played ». */
    const aplat = (x) => String(x).replace(/\s+/g, ' ').trim();
    const lus = new Set();
    for(const [, textes] of p2.releve) for(const { t } of textes) lus.add(aplat(t));
    const toutLu = [...lus].join('\u0001');
    if(process.env.ETAPE){
      const tx = p2.releve.get(process.env.ETAPE);
      console.log('  >>> ' + lg + ' ' + process.env.ETAPE + ' : ' + (tx ? tx.length + ' textes' : 'ABSENTE'));
      if(tx) console.log('      ' + tx.map(x => x.t).slice(0, 30).join(' | ').slice(0, 900));
    }
    /* OÙ UN MOT S'AFFICHE-T-IL ? CHERCHE=soon dit chaque écran, chaque
       endroit et chaque texte qui le porte : pour savoir pourquoi une
       justification « ne sert plus » sans deviner. */
    if(process.env.CHERCHE){
      for(const [etape, textes] of p2.releve) for(const { t, ou } of textes)
        if(aplat(t).includes(process.env.CHERCHE)) console.log('  >>> ' + lg + ' ' + etape + ' [' + ou + '] ' + aplat(t).slice(0, 200));
    }
    /* ===== UN MORCEAU, OUI — MAIS PAS LE DÉBUT D'UNE AUTRE PHRASE =====
       Chercher la valeur DANS ce qui a été lu rattrape les phrases composées
       (« September » vit dans « September 21 — played »). Mais elle créditait
       aussi « Background », qui n'est le début que de « Background music », et
       « Finish », début de « Finish at your own pace, or leave the duel. » :
       deux étiquettes que personne n'avait jamais vues, déclarées vues parce
       qu'une AUTRE entrée du dictionnaire commence par elles.
       La différence est nette et se teste : « Background music » EST une
       valeur du dictionnaire, « September 21 — played » n'en est pas une. Un
       morceau ne compte donc que s'il est pris dans un texte qui n'est pas
       lui-même une autre entrée. */
    /* ===== UN VERSET N'EST PAS UNE PHRASE DU JEU =====
       Le verset du jour change chaque jour, et le Psaume 46 dit en espagnol
       « nuestro pronto auxilio » : le 18/10/2026, « pronto » (« bientôt »,
       qui ne s'affiche plus nulle part) était déclaré VU, dans un verset — et
       sa justification « ne sert plus ». Un banc qui change d'avis avec la
       date ne dit rien du jeu : les textes des versets ne créditent aucune
       phrase. */
    /* ===== UNE QUESTION NON PLUS =====
       Les questions d'une partie sont tirées au hasard, et sept textes de
       questions-es.js portent « pronto » (« Apagaron sus lámparas demasiado
       pronto »…) : le 25/10/2026, un passage déclarait le mot VU — et sa
       justification « ne sert plus » —, le suivant non. Un banc qui change
       d'avis avec le tirage ne dit rien du jeu : le texte d'une question ne
       crédite aucune phrase PAR MORCEAU. Une valeur affichée telle quelle à
       une place de question (l'étiquette du « Le savais-tu ? ») compte
       toujours. */
    const lusHorsQuestions = new Set();
    for(const [, textes] of p2.releve) for(const { t, ou } of textes) if(!LIEUX_QUESTION.test(String(ou))) lusHorsQuestions.add(aplat(t));
    const debutsVersets = dico.versets.map(x => aplat(x).slice(0, 24)).filter(x => x.length >= 12);
    const lusHorsVersets = [...lusHorsQuestions].filter(t => !debutsVersets.some(d => t.includes(d)));
    const valeurs = new Set(dico.textes.map(aplat));
    const dansUnTexteComposé = (v) => {
      for(const t of lusHorsVersets) if(t !== v && t.indexOf(v) >= 0 && !valeurs.has(t)) return true;
      return false;
    };
    const jamais = [...new Set(dico.textes)].filter(v => !/\{/.test(v)
      && aplat(v).length >= 2
      && !lus.has(aplat(v)) && !dansUnTexteComposé(aplat(v)));
    const mesJust = JAMAIS_A_L_ECRAN.filter(x => !x.lg || x.lg === lg);
    const justifiees = new Set(mesJust.map(x => x.quoi));
    for(const v of jamais) if(!justifiees.has(v))
      fautes.push('JAMAIS VUE  ' + lg + '  « ' + v.slice(0, 70) + ' »');
    /* Une justification qui ne sert plus est une justification qui ment. */
    for(const x of mesJust) if(!jamais.includes(x.quoi))
      fautes.push('JUSTIFIÉE POUR RIEN  ' + lg + '  « ' + x.quoi.slice(0, 60) + ' » s\'affiche maintenant — retire sa ligne');
    if(process.env.TOUT) jamais.forEach(v => console.log('     ' + lg + '  « ' + v.slice(0, 70) + ' »'));

    compteTotal += compte; pairesTotal += paires; ecransTotal = Math.max(ecransTotal, p2.releve.size);
    bilan.push('  ' + lg + ' : ' + p2.releve.size + ' écrans, ' + compte + ' textes, '
      + paires + ' identiques au français, ' + jamais.length + ' phrases jamais vues ('
      + justifiees.size + ' justifiées)');
  }

  bilan.forEach(l => console.log(l));
  if(fautes.length){
    console.log('  CE QUI NE PARLE PAS SA LANGUE (' + fautes.length + ') :');
    fautes.forEach(f => console.log('   ' + f));
    nav.close().catch(()=>{}); process.exit(1);
  }
  await nav.close();
  console.log('  OK — ' + LANGUES.join(' et ') + ' : ' + compteTotal
    + ' textes relevés, pas un mot de français hors de sa place');
})();
