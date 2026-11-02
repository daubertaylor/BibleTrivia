/* ====== BANC « LE RELIEF, PARTOUT LE MÊME » (v342) ======
   « Sur certains de nos boutons, il serait mieux d'avoir le même effet de
     bordure que sur ces images », puis : « ajoute-le partout, pas seulement
     aux boutons ». Les images : des tuiles et des puces blanches sur une page
   crème, en relief sans le moindre trait. Le relief du jeu est UNE ombre
   (--relief), relevée au pixel sur ces captures (voir LE RELIEF dans
   index.html). Ce banc vérifie qu'elle est partout, et seule :
     1. le jeton --relief vaut toujours la mesure ;
     2. sur 27 écrans, chaque surface qui tient en relief — cartes, boutons
        clairs ou pleins, puces, tuiles, champs, pilules, bulles, barre du bas
        — porte le relief et RIEN d'autre de visible : ni anneau d'un pixel
        (l'ancien « Ouvrir »), ni halo de sa couleur (l'ancien bouton corail,
        la bonne réponse verte), ni ombre écrite à la main ;
     3. ce qui doit rester plat (compteurs « − / + », cases du calendrier)
        ne porte rien ;
     4. iPhone et Android : exactement les mêmes ombres ;
     5. aucune erreur.
   Si une nouvelle surface arrive avec son ombre à elle, c'est ici qu'elle
   se fait voir.
   Usage : node banc-essai/relief.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const RELIEF = 'rgba(24, 16, 10, 0.17) 2.5px 2.5px 9px -1px';
/* LE DÉCOR DES GROUPES, sans serveur : celui de couleurs.js, copié tel quel. */
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
 ['accueil',    ()=>{state.screen='mode';render();}],
 ['verset',     ()=>{state.screen='mode';render();showHeroVerse();}],
 ['solo',       ()=>{state.mode='solo';state.screen='setup';render();}],
 ['groupe',     ()=>{state.mode='group';state.teams=[{name:'Taylor'},{name:'Joueur 2'}];state.screen='setup';render();}],
 ['jeu',        ()=>{state.mode='solo';startGame();state.screen='play';render();}],
 ['répondu',    ()=>{state.mode='solo';startGame();state.screen='play';render();
                     const q=state.questions[state.currentIndex]; soloAnswer(q.shuffledOptions.findIndex(o=>o!==q.correct));}],
 ['tour de groupe',()=>{state.mode='group';state.teams=[{name:'Taylor'},{name:'Ana'},{name:'Benoît'}];startGame();state.revealed=true;render();}],
 ['résultats',  ()=>{state.mode='group';state.teams=[{name:'Taylor'},{name:'Ana'},{name:'Benoît'}];state.scores=[30,20,10];state.screen='results';render();}],
 ['fin',        ()=>{state.screen='end';state.soloScore=110;state.soloCorrect=7;state.soloBestStreak=3;state.questions=new Array(15);state.soloMissed=new Array(8);render();}],
 ['en ligne',   ()=>{state.screen='online';render();}],
 /* Le duel : sa barre des scores, puis les deux cartes du résultat — l'écran
    qui avait échappé à tous les relevés (il ne s'atteint qu'en jouant en
    ligne). Aucun salon n'est ouvert : la bibliothèque Supabase est vide. */
 ['duel',       ()=>{net.isHost=true;net.code='42CJ';net.joueurs={a:{id:'a',name:'Sogane',color:'#E8734C',score:0,idx:0,done:false,gone:false,vu:Date.now()}};
                     majAdversaire();beginDuel(12345,'normale','30','tout',null);}],
 ['duel à trois',()=>{net.isHost=true;net.code='42CJ';net.joueurs={a:{id:'a',name:'Sogane',color:'#E8734C',score:0,idx:0,done:false,gone:false,vu:Date.now()},
                     b:{id:'b',name:'Lee',color:'#4CE88A',score:0,idx:0,done:false,gone:false,vu:Date.now()}};majAdversaire();beginDuel(12345,'normale','30','tout',null);}],
 ['duel gagné', ()=>{net.isHost=true;net.code='42CJ';net.score=300;net.oppScore=180;net.missed=[];
                     net.joueurs={a:{id:'a',name:'Sogane',color:'#E8734C',score:180,idx:15,done:true,gone:false,vu:Date.now()}};majAdversaire();state.screen='online-end';render();}],
 ['progression',()=>{state.screen='parcours';render();}],
 ['testament',  ()=>{state.screen='parcours';render();ouvrirTestament('at');}],
 ['profil',     ()=>{state.screen='profile';render();}],
 ['champ actif',()=>{state.screen='profile';render();setTimeout(()=>{const i=document.querySelector('.text-input');i&&i.focus();},250);}],
 ['réglages',   ()=>{state.screen='mode';render();openSettings();}],
 ['versions',   ()=>{state.screen='mode';render();openSettings();setTimeout(()=>openBibles(),300);}],
 ['sortie',     ()=>{state.mode='solo';startGame();state.screen='play';render();confirmLeaveGame();}],
 ['à revoir',   ()=>{state.screen='mode';render();openMissedReview([{q:"Qui a construit l'arche ?",options:['Noé','Moïse','Abraham','David'],correct:'Noé',chosen:'Moïse',fact:"Genèse 6:14."}]);}],
 ['un livre',   ()=>{state.mode='solo';state.screen='setup';render();ouvrirLivreLocal();}],
 ['groupes',    ()=>{__grpDecor();state.screen='groupes';render();majBarre();}],
 ['discussion', ()=>{__grpDecor();grp.courant='g-1';state.screen='groupe';render();majCompo();}],
 ['infos du groupe',()=>{__grpDecor();grp.courant='g-1';state.screen='groupe';render();ouvrirInfosGroupe(true);}],
 ['créer un groupe',()=>{__grpDecor();state.screen='groupes';render();ouvrirCreation();}],
 ['code',       ()=>{__grpDecor();state.screen='groupes';render();ouvrirCode();}],
];
/* Ce qui tient en relief. (.icon-btn.hero-profile est la pastille du joueur
   sur l'accueil : un objet, pas une surface. La flamme éteinte est un creux
   translucide : rien à poser.) */
const EN_RELIEF = ['.app-header', '.icon-btn:not(.hero-profile)', '.card', '.mode-card', '.question-card', '.fact-card',
  '.solo-summary', '.solo-score-bar', '.score-pane', '.option-btn', '.info-card', '.rules', '.btn-review', '.daily-card',
  '.parcours-card', '.parcours-sum', '.tst-head', '.presence-card', '.online-action', '.btn-newgame', '.btn-invite',
  '.award-btn', '.barre-bas', '.compo', '.chip', '.len-chip', '.q-counter', '.timer-chip:not(.low)', '.tier-chip',
  '.streak-chip', '.rev-item', '.me-row', '.rank-row', '.pl-btn:not(.pl-libre)', '.bk', '.text-input', '.code-input',
  '.share-btn', '.btn-ghost', '.modal-btn.cancel', '.modal-btn.ok', '.btn-primary:not(:disabled)', '.btn-next:not(:disabled)',
  '.btn-replay', '.btn-reveal', '.grp-pill', '.bb-curseur', '.b-bulle:not(.b-vide)', '.compo-jeu', '.compo-mod',
  '.compo-envoi', '.grp-desc-carte', '.grp-code-carte', '.set-groupe', '.sheet-grab', '.hero-verse-card', '.switch',
  '.sem-flamme:not(.eteinte)', '.pc-feu', '.bk-carte', '.tp-carte', '.tp-tete', '.duel-scorebar', '.dr-side'];
const A_PLAT = ['.adj-btn', '.sj'];
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 300) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [], parTel = {};
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      console.log('  — ' + tel);
      const vu = parTel[tel] = {};
      for (const [nom, aller] of ECRANS) {
        const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
        const p = await ctx.newPage();
        p.on('pageerror', e => errs.push(tel + ' · ' + nom + ' : ' + e.message));
        /* Aucun contact avec le vrai serveur : la bibliothèque Supabase est vide. */
        await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
          localStorage.setItem('bt_progress', JSON.stringify({ books: { 'Genèse': 12, 'Exode': 8 }, correct: 337, streakBest: 21, achievements: ['premiers-pas'] })); });
        await p.goto(URL);
        await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
        await p.waitForTimeout(400);
        await p.evaluate(GRP_DECOR);
        if (nom === 'accueil' && tel === 'iPhone') {
          const jeton = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--relief').trim());
          dit('1. le jeton --relief vaut la mesure des captures', jeton === '2.5px 2.5px 9px -1px rgba(24,16,10,0.17)', jeton);
        }
        try { await p.evaluate(`(${aller.toString()})()`); } catch (e) { errs.push(tel + ' · ' + nom + ' : ' + e.message); }
        await p.waitForTimeout(1300);
        const r = await p.evaluate(([enRelief, aPlat, RELIEF]) => {
          const couches = (bs) => (bs || 'none') === 'none' ? [] : bs.split(/,(?![^(]*\))/).map(x => x.trim())
            .filter(x => { const m = /rgba?\(([^)]+)\)/.exec(x); if (!m) return true; const v = m[1].split(',').map(Number); return (v.length > 3 ? v[3] : 1) > 0; });
          const visible = (e) => { const b = e.getBoundingClientRect(); if (b.width < 10 || b.height < 10 || b.bottom < 0 || b.top > innerHeight) return false;
            for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; }
            return true; };
          const nomDe = (e) => e.tagName.toLowerCase() + '.' + [...e.classList].filter(c => !/^(has-gs|screen-enter|arrivee|reveal-in)$/.test(c)).slice(0, 3).join('.');
          const fautes = [], ombres = {}; let n = 0;
          /* (v345) Une carte peut porter son ombre sur un calque à elle (::before),
             de SA forme exacte — posé à fleur de ses quatre bords, au même
             arrondi —, pour que Safari ne la redessine jamais carrée aux coins
             (« Un livre », les testaments). C'est la même ombre au même
             endroit : on la lit là, et seulement si le calque épouse la carte. */
          const ombreDe = (e) => {
            const cs = getComputedStyle(e), c = couches(cs.boxShadow);
            if (c.length) return c;
            const av = getComputedStyle(e, '::before');
            const epouse = av.content !== 'none' && av.position === 'absolute' && ['top', 'right', 'bottom', 'left'].every(k => av[k] === '0px')
              && av.borderRadius === cs.borderRadius;
            return epouse ? couches(av.boxShadow) : c;
          };
          for (const sel of enRelief) for (const e of document.querySelectorAll(sel)) {
            if (!visible(e)) continue; n++;
            const c = ombreDe(e);
            ombres[nomDe(e)] = c.join(' | ');
            if (c.length !== 1 || c[0] !== RELIEF) fautes.push(nomDe(e) + ' → ' + (c.join(' | ') || 'aucune ombre'));
          }
          const plats = [];
          for (const sel of aPlat) for (const e of document.querySelectorAll(sel)) {
            if (!visible(e)) continue;
            const c = couches(getComputedStyle(e).boxShadow);
            if (c.length) plats.push(nomDe(e) + ' → ' + c.join(' | '));
          }
          return { n, fautes: [...new Set(fautes)], plats: [...new Set(plats)], ombres };
        }, [EN_RELIEF, A_PLAT, RELIEF]);
        Object.assign(vu, Object.fromEntries(Object.entries(r.ombres).map(([k, v]) => [nom + ' · ' + k, v])));
        dit('2. ' + nom + ' : ' + r.n + ' surfaces, toutes au relief et à lui seul', r.n > 0 && r.fautes.length === 0, r.fautes.slice(0, 4).join(' ; '));
        if (r.plats.length) dit('3. ' + nom + ' : ce qui doit rester plat le reste', false, r.plats.slice(0, 3).join(' ; '));
        await ctx.close();
      }
    }
    const cles = new Set([...Object.keys(parTel.iPhone), ...Object.keys(parTel.Android)]);
    const ecarts = [...cles].filter(k => k in parTel.iPhone && k in parTel.Android && parTel.iPhone[k] !== parTel.Android[k]);
    dit('4. iPhone et Android : les mêmes ombres sur les mêmes surfaces', ecarts.length === 0, ecarts.slice(0, 3).join(' ; '));
  } catch (e) { errs.push('le banc s\'est arrêté : ' + e.message); }
  dit('5. aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko === 0 ? '\n  OK — un seul relief, partout, et rien d\'autre' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
