/* ===================== BANC « FORME DE L'ONDE » =====================
   « Lorsque je reste appuyé sur une croix, le petit truc rosé apparaît en
   carré. »
   L'onde d'appui est un ::before à border-radius:inherit : elle a donc
   EXACTEMENT la forme du bouton. Un bouton sans arrondi donne une tache
   carrée sous le doigt — et la croix de retrait était le seul du jeu dans ce
   cas, au milieu d'une ligne, elle, arrondie.
   Le banc parcourt les écrans, prend chaque bouton qui peint réellement une
   onde (certains la neutralisent, comme la poignée des feuilles) et vérifie
   deux choses : le bouton a un arrondi, et l'onde porte le même.
   Usage : node banc-essai/forme.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

/* LES GROUPES (v302), sans serveur : le décor de doigt.js, copié tel quel.
   Le premier passage n'en visitait aucun — et le lien « Confidentialité »,
   seul nouveau bouton qu'il voyait, peignait déjà son onde en carré. */
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
  ['accueil',     "state.screen='mode'; render();"],
  ['groupe',      "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'},{name:'D'}]; state.screen='setup'; render();"],
  ['jeu solo',    "state.mode='solo'; startGame();"],
  ['progression', "state.screen='parcours'; render();"],
  ['profil',      "state.screen='profile'; render();"],
  ['réglages',    "state.screen='mode'; render(); openSettings();"],
  ['en ligne',    "closeSettings(); state.screen='online'; render();"],
  ['résultats',   "state.mode='group'; state.teams=[{name:'Taylor',score:20},{name:'B',score:5},{name:'C',score:0}]; state.screen='results'; render();"],
  ['barre',       GRP_DECOR + "__grpDecor(); state.screen='mode'; render(); majBarre();"],
  ['groupes',     "__grpDecor(); state.screen='groupes'; render(); majBarre();"],
  ['grp·dehors',  "__grpDecor(); compte.session=null; compte.etape='repos'; grp.etat=null; state.screen='groupes'; render();"],
  ['grp·entrée',  "__grpDecor(); grp.etat={ participe:'regles', moderateur:false }; state.screen='groupes'; render();"],
  ['discussion',  "__grpDecor(); grp.courant='g-1'; state.screen='groupe'; render(); majCompo();"],
  ['grp·infos',   "ouvrirInfosGroupe(true);"],
  ['grp·membre',  "fermerFeuilleGroupe('grpInfosVeil'); ouvrirMembre('u-4');"],
  ['grp·message', "fermerFeuilleGroupe('grpMembreVeil'); actionsMessage('7');"],
  ['grp·signaler',"fermerFeuilleGroupe('grpActionsVeil'); signalerMessage('7');"],
  ['grp·créer',   "fermerFeuilleGroupe('grpSignalerVeil'); __grpDecor(); state.screen='groupes'; render(); ouvrirCreation();"],
  ['grp·code',    "fermerFeuilleGroupe('grpCreerVeil'); ouvrirCode();"],
  ['grp·règles',  "fermerFeuilleGroupe('grpCodeVeil'); ouvrirRegles();"],
  ['modération',  "fermerFeuilleGroupe('grpReglesVeil'); __grpDecor(); window.__lg = window.__lg || listeGroupe;" +
                  " listeGroupe = async (n, a) => n === 'moderation_ouverte' ? [{ id:1, raison:'harcelement', details:'', le:new Date().toISOString()," +
                  " groupe:'g-1', groupe_nom:'Lee', message:7, texte:'Amen', cible:'u-2', cible_nom:'Sam', par_nom:'Lee', nb:2 }] : __lg(n, a);" +
                  " state.screen='groupes'; render(); ouvrirModeration();"],
  ['compte',      "__grpDecor(); state.screen='profile'; render();"],
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });

  const vus = new Map();
  for (const [nom, prep] of ECRANS) {
    try { await p.evaluate((s) => { new Function(s)(); }, prep); } catch(e){ console.log('  (' + nom + ' injoignable)'); continue; }
    await p.waitForTimeout(900);
    const l = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('button, .mode-card').forEach(e => {
        const b = e.getBoundingClientRect();
        if (b.width < 3 || b.height < 3) return;
        const cs = getComputedStyle(e), av = getComputedStyle(e, '::before');
        /* L'onde peint-elle vraiment ? Certains boutons remplacent ce ::before
           par un agrandisseur de zone tactile, transparent. */
        const fond = av.backgroundColor || '';
        const m = fond.match(/rgba?\(([^)]+)\)/);
        const alpha = m ? (m[1].split(',')[3] === undefined ? 1 : parseFloat(m[1].split(',')[3])) : 0;
        if (!(alpha > 0.02)) return;
        out.push({
          cls: (e.className||'').toString().split(' ').filter(Boolean).slice(0,2).join('.') || e.tagName.toLowerCase(),
          w: Math.round(b.width), h: Math.round(b.height),
          rb: +(parseFloat(cs.borderTopLeftRadius)||0).toFixed(1),
          ro: +(parseFloat(av.borderTopLeftRadius)||0).toFixed(1),
        });
      });
      return out;
    });
    for (const e of l) { const k = e.cls + '|' + e.w + 'x' + e.h; if (!vus.has(k)) vus.set(k, { ...e, ecran:nom }); }
  }
  const marges = await p.evaluate(() => {
    const out = {};
    document.querySelectorAll('.has-gs').forEach(e => {
      const m = getComputedStyle(e).overflowClipMargin;
      if (m && m !== '0px' && m !== 'normal') out[m] = (out[m] || 0) + 1;
    });
    return out;
  });
  await nav.close();

  const fautifs = [...vus.values()].filter(e => e.rb < 2 || Math.abs(e.rb - e.ro) > 0.6);
  /* ===== ET RIEN NE DOIT DÉPASSER À CÔTÉ DE L'ONDE =====
     L'onde est bornée à la boîte du bouton. Si la couche de verre, elle, peint
     UN PIXEL PLUS LOIN (overflow-clip-margin), il reste tout autour un liseré
     clair que l'onde ne peut pas atteindre — « ça ne se remplit pas
     entièrement dans les bords ». Mesuré au huitième de pixel : le bord du
     bouton à 446,02, l'onde qui démarre à 446,00, et la crème de 445 à 446,
     c'est-à-dire dehors. La marge de découpe doit donc rester nulle. */
  console.log('  boutons qui peignent une onde : ' + vus.size + '\n');
  console.log('  écran         bouton                      taille   arrondi   onde');
  for (const e of [...vus.values()].sort((a,b) => a.rb - b.rb).slice(0, fautifs.length ? 999 : 6)) {
    const mauvais = e.rb < 2 || Math.abs(e.rb - e.ro) > 0.6;
    console.log('  ' + e.ecran.padEnd(13) + e.cls.padEnd(27) + (e.w + '×' + e.h).padStart(8) +
      (e.rb + ' px').padStart(10) + (e.ro + ' px').padStart(9) +
      (mauvais ? (e.rb < 2 ? '   <-- ONDE CARRÉE' : '   <-- L ONDE N A PAS LA FORME DU BOUTON') : ''));
  }
  if (!fautifs.length) console.log('  …' + Math.max(0, vus.size - 6) + ' autres, tous arrondis');
  const cles = Object.keys(marges);
  console.log('\n  marge de découpe des surfaces de verre : ' +
    (cles.length ? cles.map(k => k + ' sur ' + marges[k] + ' surface(s)') .join(', ') + '   <-- UN LISERÉ DÉPASSE À CÔTÉ DE L\'ONDE' : 'nulle partout'));
  const mauvais = fautifs.length || cles.length;
  console.log(mauvais ? '\n  ÉCHEC' : '\n  OK — chaque onde a la forme de son bouton, et rien ne dépasse à côté');
  process.exit(mauvais ? 1 : 0);
})();
