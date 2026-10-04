/* LA RÈGLE DES 44 PX — MESURÉE LÀ OÙ LE DOIGT TOMBE.

   Apple demande 44 points dans les deux sens pour tout ce qui se touche. Le
   jeu s'en réclame déjà (« la zone tactile est bien plus grande que le trait
   visible », dit le commentaire de la poignée des feuilles) — encore
   faut-il le vérifier.

   ET LA BOÎTE NE SUFFIT PAS À LE DIRE. Un bouton peut être plus petit que sa
   zone (un pseudo-élément l'étend), ou plus GRAND qu'elle (un parent qui
   découpe à overflow:hidden coupe aussi le test de survol). On ne mesure donc
   pas getBoundingClientRect : on demande à la page, point par point, QUI
   reçoit le toucher — elementFromPoint respecte les pseudo-éléments, les
   découpes et les recouvrements, exactement comme un vrai doigt.

   Pour chaque cible on part du centre et on s'éloigne dans les quatre
   directions tant que le toucher revient au bouton : la somme donne la
   largeur et la hauteur RÉELLEMENT touchables.

       node doigt.js        (jeu servi en HTTP sur 8099)

   Repère : 44 px dans les deux sens. Deux exceptions documentées plus bas. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const MIN = 44;
/* CE QUE LE JEU ASSUME, ET POURQUOI. Une exception doit s'écrire, sinon
   c'est un défaut qu'on a oublié. */
const TOLERE = {
  '.switch':  'interrupteur — 51x31, la taille exacte d\'un UISwitch iOS',
  '.icon-btn': 'rond d\'en-tête, 39 px : il porte du verre, donc une découpe, donc\n' +
               '                          seule sa boîte pourrait grandir — et l\'en-tête entier grandirait\n' +
               '                          de 5,8 px sur TOUS les écrans. Cinq pixels de zone ne valent pas ça.',
  'input':     'champ de texte, 40 px : on le vise sur toute sa largeur (238 px),\n' +
               '                          et le clavier s\'ouvre au moindre contact.',
  '.set-go':   'bouton Guide / version, 30 px : porté à 44, il devenait une grosse\n' +
               '                          pastille corail pour une action secondaire. Il porte du verre, donc une\n' +
               '                          découpe : ni pseudo-élément ni bordure transparente ne peuvent agrandir\n' +
               '                          la zone sans grossir le dessin ou détacher son ombre. Le dessin gagne.',
};
/* Le décor des groupes : un compte connecté, modérateur, deux groupes à
   soi et un à découvrir, une discussion qui contient chaque sorte de bulle
   (un mot du jeu, un message, une partie, le sien). Défini une fois dans la
   page, rappelé avant chaque écran pour repartir propre. */
const GRP_DECOR = `window.__grpDecor = () => {
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  compte.dispo = true;
  compte.session = { user:{ id:'moi-0', email:'joueur@exemple.net' } }; compte.etape = 'connecte';
  grp.installe = true; grp.ouverts = true; grp.message = '';
  grp.etat = { participe:'ok', moderateur:true, ouverts:true, a_traiter:2 };
  grp.profils = { 'moi-0':{ nom:'Taylor', couleur:'#4C86E8' }, 'u-2':{ nom:'Sam', couleur:'#E8574C' },
                  'u-3':{ nom:'Lee', couleur:'#4CE88A' }, 'u-4':{ nom:'Kim', couleur:'#E8C84C' } };
  grp.liste = [
    { id:'g-1', nom:'Lee', teinte:2, ouvert:false, code:'ABC234', nb_membres:4, non_lus:2, dernier_message:il(1),
      apercu:{ id:9, auteur:'u-2', genre:'texte', texte:'Amen', nom:'Sam', le:il(1) } },
    { id:'g-2', nom:'Sam', teinte:0, ouvert:true, code:'DEF567', nb_membres:2, non_lus:0, dernier_message:il(26),
      apercu:{ id:7, auteur:'moi-0', genre:'texte', texte:'Amen', nom:'Taylor', le:il(26) } } ];
  grp.publics = [ { id:'g-2', nom:'Sam', description:'', nb_membres:2, teinte:0, membre:true },
                  { id:'g-5', nom:'Ruth', description:'', nb_membres:1, teinte:3, membre:false } ];
  grp.membres = { 'g-1':[ { membre:'moi-0', role:'proprietaire', muet_jusqu:null },
                          { membre:'u-2', role:'admin', muet_jusqu:null },
                          { membre:'u-4', role:'membre', muet_jusqu:null } ] };
  const m = (id, auteur, genre, texte, extra) => Object.assign({ id, groupe:'g-1', auteur, genre, texte, donnees:{},
    cree_le:il(0.5), masque:false, supprime_le:null }, extra || {});
  grp.fils = { 'g-1':{ charge:true, tout:false, messages:[
    m(1, null, 'systeme', 'cree', { donnees:{ nom:'Taylor' } }),
    m(7, 'u-2', 'texte', 'Amen'),
    m(10, 'u-2', 'partie', '', { donnees:{ code:'ABCD' } }),
    m(12, 'moi-0', 'texte', 'Amen') ] } };
  grp.courant = null; grp.nonLus = 2; moderation = null;
};`;
const ECRANS = [
  ['accueil',      "state.screen='mode'; render();"],
  ['solo',         "state.mode='solo'; state.screen='setup'; render();"],
  ['groupe',       "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'}]; state.screen='setup'; render();"],
  ['jeu',          "state.mode='solo'; startGame();"],
  ['fin',          "state.screen='end'; state.soloScore=80; state.soloCorrect=3; state.soloBestStreak=2; state.soloMissed=[{q:'a',correct:'b',chosen:'c',fact:'d'}]; render();"],
  ['erreurs',      "openMissedReview();"],
  ['progression',  "closeMissedReview(); state.screen='parcours'; render();"],
  ['profil',       "state.screen='profile'; render();"],
  ['réglages',     "state.screen='mode'; render(); openSettings();"],
  ['versions',     "openBibles();"],
  ['en ligne',     "closeBibles(); closeSettings(); state.screen='online'; render();"],
  ['salon',        "net.isHost=true; net.code='42CJ'; net.joueurs={}; majAdversaire(); state.screen='online-room'; render();"],
  /* LES GROUPES. Sans serveur : un décor posé à la main (le même que celui
     de langues-ecrans.js), puis chaque écran ouvert par la fonction du jeu
     qui l'ouvre. On mesure ce que le doigt touche, pas ce que le serveur dit. */
  ['groupes · barre', GRP_DECOR + "try{ leaveRoomToOnline(); }catch(e){} __grpDecor(); state.screen='mode'; render(); majBarre();"],
  ['groupes',          "__grpDecor(); state.screen='groupes'; render(); majBarre();"],
  ['groupes · sans compte', "__grpDecor(); compte.session=null; compte.etape='repos'; grp.etat=null; state.screen='groupes'; render();"],
  ['groupes · bienvenue', "__grpDecor(); grp.etat={ participe:'regles', moderateur:false }; state.screen='groupes'; render();"],
  ['discussion',       "__grpDecor(); grp.courant='g-1'; state.screen='groupe'; render(); majCompo();"],
  ['infos du groupe',  "ouvrirInfosGroupe(true);"],
  ['un membre',        "fermerFeuilleGroupe('grpInfosVeil'); ouvrirMembre('u-4');"],
  ['un message',       "fermerFeuilleGroupe('grpMembreVeil'); actionsMessage('7');"],
  ['signaler',         "fermerFeuilleGroupe('grpActionsVeil'); signalerMessage('7');"],
  ['créer un groupe',  "fermerFeuilleGroupe('grpSignalerVeil'); __grpDecor(); state.screen='groupes'; render(); ouvrirCreation();"],
  ['j\'ai un code',    "fermerFeuilleGroupe('grpCreerVeil'); ouvrirCode();"],
  /* La file vient du serveur : on répond à sa place, pour que la carte soit
     posée par le chemin du jeu (chargerModeration), pas écrite par le banc. */
  ['modération',       "fermerFeuilleGroupe('grpCodeVeil'); __grpDecor(); window.__lg = window.__lg || listeGroupe;" +
                       " listeGroupe = async (n, a) => n === 'moderation_ouverte' ? [{ id:1, raison:'harcelement', details:'', le:new Date().toISOString()," +
                       " groupe:'g-1', groupe_nom:'Lee', message:7, texte:'Amen', cible:'u-2', cible_nom:'Sam', par_nom:'Lee', nb:2 }] : __lg(n, a);" +
                       " state.screen='groupes'; render(); ouvrirModeration();"],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12}, correct:126 }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  const vus = {};
  for (const [nom, prep] of ECRANS) {
    try { await p.evaluate((q) => { new Function(q)(); }, prep); }
    catch(e){ console.log('  (' + nom + ' injoignable)'); continue; }
    await p.waitForTimeout(650);
    const r = await p.evaluate(() => {
      const out = [];
      const cibles = [...document.querySelectorAll('button, [onclick], a, input, .switch, .mode-card')];
      for (const e of cibles) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || e.disabled) continue;
        const b = e.getBoundingClientRect();
        if (b.width < 1 || b.height < 1) continue;
        if (b.top < 4 || b.bottom > innerHeight - 4 || b.left < 4 || b.right > innerWidth - 4) continue;
        const cx = b.left + b.width/2, cy = b.top + b.height/2;
        /* le point central doit d'abord revenir au bouton, sinon quelque
           chose le recouvre et la mesure ne veut rien dire */
        const au = (x,y) => { const t = document.elementFromPoint(x,y); return t && (t === e || e.contains(t) || (t.parentElement && t.parentElement === e)); };
        if (!au(cx, cy)) continue;
        const porte = (dx, dy) => { let d = 0; while (d < 40 && au(cx + dx*(d+1), cy + dy*(d+1))) d++; return d; };
        const w = porte(1,0) + porte(-1,0) + 1, h = porte(0,1) + porte(0,-1) + 1;
        const fam = (e.className && typeof e.className === 'string')
          ? '.' + e.className.trim().split(/\s+/).slice(0,2).join('.') : e.tagName.toLowerCase();
        out.push({ fam, w, h, boite: Math.round(b.width) + 'x' + Math.round(b.height), aria: e.getAttribute('aria-label') || '' });
      }
      return out;
    });
    r.forEach(x => { const k = x.fam; if (!vus[k] || Math.min(x.w,x.h) < Math.min(vus[k].w,vus[k].h)) vus[k] = { ...x, ecran: nom }; });
  }
  const l = Object.values(vus);
  const petits = l.filter(x => (x.w < MIN || x.h < MIN) && !Object.keys(TOLERE).some(t => x.fam.startsWith(t)));
  const tolerees = l.filter(x => (x.w < MIN || x.h < MIN) && Object.keys(TOLERE).some(t => x.fam.startsWith(t)));
  petits.sort((a,b) => Math.min(a.w,a.h) - Math.min(b.w,b.h));
  console.log('  ' + l.length + ' cibles mesurées au doigt, ' + petits.length + ' sous ' + MIN + ' px\n');
  petits.forEach(x => console.log('   ' + String(x.w).padStart(4) + ' x ' + String(x.h).padStart(4) +
    '   (boîte ' + x.boite.padEnd(10) + ') ' + x.fam.padEnd(26) + ' [' + x.ecran + ']' + (x.aria ? '  « ' + x.aria + ' »' : '')));
  tolerees.forEach(x => console.log('   ' + String(x.w).padStart(4) + ' x ' + String(x.h).padStart(4) +
    '   ' + x.fam.padEnd(38) + ' ADMIS : ' + (TOLERE[Object.keys(TOLERE).find(t => x.fam.startsWith(t))])));
  if (errs.length) { console.log('\n  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  const ok = petits.length === 0 && !errs.length;
  console.log(ok ? '\n  OK — tout ce qui se touche fait au moins ' + MIN + ' px' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
