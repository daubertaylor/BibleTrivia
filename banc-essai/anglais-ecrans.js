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
  { quoi:/^(Duel|Options|Score|Records|Contact|Version|Format|Instagram|Notifications?|Guide|Volume|Testament|Solo|Installation|Modes?|Messages?|Info)$/i, car:'même mot dans les deux langues' },
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
    await p.waitForTimeout(600);

  /* Chaque étape : un nom, et ce qu'il faut faire pour y être. On force l'état
     plutôt que de cliquer — plus court, et surtout reproductible. */
  const ETAPES = [
    ['Accueil',           () => { state.screen='mode'; render(); }],
    ['Réglages',          () => { openSettings(); }],
    ['Versions de Bible', () => { closeModal&&closeModal(); openBibles(); }],
    ['Langues',           () => { closeModal&&closeModal(); openLangues(); }],
    ['Flamme',            () => { closeModal&&closeModal(); state.screen='mode'; render(); ouvrirFlamme(); }],
    ['Profil',            () => { closeFlamme&&closeFlamme(); state.screen='profile'; render(); }],
    ['Progression',       () => { state.screen='parcours'; render(); }],
    ['À revoir',          () => { state.screen='revoir'; render(); }],
    ['Réglages Groupe',   () => { state.mode='group'; state.screen='setup'; render(); }],
    ['Réglages Solo',     () => { state.mode='solo'; state.screen='setup'; render(); }],
    ['Partie Solo',       () => { state.mode='solo'; startGame(); }],
    ['Fin de partie',     () => { state.screen='end'; render(); }],
    ['Nom en ligne',      () => { state.screen='online-name'; render(); }],
    ['Hub en ligne',      () => { net.connected=1; net.error=''; state.screen='online'; render(); }],
    ['Hub · erreur',      () => { net.error = T("La connexion au salon a échoué. Réessaie."); render(); }],
    ['Rejoindre',         () => { net.error=''; state.screen='online-join'; render(); }],
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
    ['Succès',             () => { closeMissedReview&&closeMissedReview(); openAchInfo(ACHIEVEMENTS[0].id); }],
    ['Guide plein écran',  () => { closeModal&&closeModal(); state.screen='mode'; render(); openFsGuide(); }],
    ['Hors connexion',     () => { closeModal&&closeModal(); showModal({ titre:T('Hors connexion'), texte:T('Le mode en ligne nécessite Internet. Les modes Solo et Groupe restent jouables sans connexion.'), ok:T('Compris') }); }],
  ];

    const releve = new Map();
    const ennuis = [];
    for(const [nom, faire] of ETAPES){
      try { await p.evaluate(faire); } catch(e){ ennuis.push(nom + ' (' + lg + ') : impossible d\'ouvrir — ' + e.message.split('\n')[0]); continue; }
      await p.waitForTimeout(450);
      try { releve.set(nom, await p.evaluate(RAMASSER)); }
      catch(e){ ennuis.push(nom + ' (' + lg + ') : relevé impossible — ' + e.message.split('\n')[0]); }
    }
    await ctx.close();
    return { releve, ennuis, erreurs, nEtapes: ETAPES.length };
  };

  const en = await passe('en');
  const fr = await passe('fr');
  await nav.close();

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
     qu'elle était juste. Deux rendus du même écran ont le même nombre de
     textes dans le même ordre — sauf si la mise en page elle-même diffère
     selon la langue, et ce jour-là on veut le savoir aussi. */
  let paires = 0;
  for(const [nom, textesEn] of en.releve){
    const textesFr = fr.releve.get(nom);
    if(!textesFr) continue;
    if(textesFr.length !== textesEn.length){
      fautes.push('DÉCALAGE  ' + nom.padEnd(18) + ' ' + textesEn.length + ' textes en anglais contre '
        + textesFr.length + ' en français — les deux rendus ne se superposent plus');
      continue;
    }
    for(let i = 0; i < textesEn.length; i++){
      const { t, ou } = textesEn[i];
      if(textesFr[i].t !== t) continue;
      paires++;
      if(MEME_DANS_LES_DEUX.some(r => r.quoi.test(t) && (!r.ou || r.ou.test(String(ou))))) continue;
      if(LIEUX_LIBRES.test(String(ou))) continue;
      const cle = 'id:' + t.slice(0, 80);
      if(vus.has(cle)) continue;
      vus.add(cle);
      fautes.push('INCHANGÉ  ' + nom.padEnd(18) + ' « ' + t.slice(0, 80) + ' »   [' + String(ou).slice(0, 34) + ']');
    }
  }

  if(fautes.length){
    console.log('  CE QUI NE PARLE PAS ANGLAIS (' + fautes.length + ') :');
    fautes.forEach(f => console.log('   ' + f));
    process.exit(1);
  }
  console.log('  OK — ' + en.nEtapes + ' écrans et panneaux peints dans les deux langues, '
    + compte + ' textes relevés, pas un mot de français');
  console.log('       ' + paires + ' textes identiques fr/en, tous justifiés');
})();
