/* ============ BANC « SE CONNECTER N'EFFACE RIEN » ============
   Le moteur de fusion est la seule chose qui sépare un joueur de la perte de
   sa progression. On ne le vérifie donc pas sur un exemple : on vérifie ses
   PROPRIÉTÉS, sur des centaines de paires tirées au hasard, plus les cas
   précis qui ont une raison d'exister.

     MONOTONE      chaque compteur du résultat >= les deux entrées ;
                   chaque ensemble contient leur union.
     IDEMPOTENTE   fusionner(fusionner(a,b), b) == fusionner(a,b).
     HONNÊTE       la série se recalcule depuis les jours : elle peut baisser,
                   et alors c'est qu'elle était cassée.

   Usage : node banc-essai/fusion.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
let ko = 0;
function v(nom, bon, detail){
  if(!bon) ko++;
  console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(56) + (detail || ''));
}
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  const ev = (f, ...a) => p.evaluate(f, ...a);

  v("le moteur existe", await ev(()=> typeof fusionner === 'function' && typeof sauvegardeIci === 'function'), '');

  // ---------- LES PROPRIÉTÉS, SUR 400 PAIRES TIRÉES AU HASARD ----------
  const props = await ev(()=>{
    /* Un générateur volontairement HOSTILE : des nombres négatifs, des chaînes
       là où on attend des nombres, des listes nulles, des clés en double, des
       valeurs énormes. C'est ce qui peut arriver d'un serveur, d'une vieille
       version, ou d'un octet retourné. */
    let graine = 12345;
    const rnd = ()=> (graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const ent = (n)=> Math.floor(rnd() * n);
    const sale = ()=>{ const t = ent(6);
      return t===0 ? ent(50) : t===1 ? -ent(50) : t===2 ? String(ent(50)) : t===3 ? null : t===4 ? NaN : ent(1e9); };
    /* Que des jours PASSÉS : un jour à venir est coupé par la fusion (il le
       doit), donc il fausserait l'assertion d'union. Le futur a son cas à lui,
       plus bas. */
    const jour = ()=>{ const d = new Date(); d.setDate(d.getDate() - ent(300)); const p2=n=>String(n).padStart(2,'0');
      return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); };
    const tire = ()=>{
      const livres = {}; for(let i=0;i<ent(8);i++) livres[BIBLE_BOOKS[ent(BIBLE_BOOKS.length)]] = sale();
      const jours = []; for(let i=0;i<ent(12);i++) jours.push(jour());
      const carnet = []; for(let i=0;i<ent(6);i++) carnet.push({ k:'q'+ent(20), p:ent(5), n:ent(4), du:jour(), maj:rnd()<0.2?0:Date.now()-ent(9e6), q:'?', options:['a','b'], correct:'a', fact:'f', tier:'moyen' });
      const vues = []; for(let i=0;i<ent(20);i++) vues.push('v'+ent(40));
      return { v:1,
        profil:{ name: rnd()<0.5 ? '' : 'Nom'+ent(9), color: rnd()<0.5 ? '' : '#4C86E8' },
        progres:{ books:livres, totalCorrect:sale(), bestStreak:sale(), flawless:sale(), ach:{ ['a'+ent(6)]:1 } },
        stats:{ bestScore:sale(), bestPct:sale(), games:sale() },
        flamme:{ last: rnd()<0.2 ? '' : jour(), streak:sale(), score:sale(), total:sale(),
                 jours: rnd()<0.25 ? null : jours, geles:[jour()], gels:sale(),
                 palier:sale(), parties:sale(), palierParties:sale(), annonce:'' },
        vues, carnet, acquises: rnd()<0.3 ? { ['q'+ent(20)]: Date.now()-ent(9e6) } : {}, modes:{ solo:sale(), duel:sale() },
        gout:{ bible: rnd()<0.5 ? '' : 'darby', scene: rnd()<0.5 ? '' : 'canyon', maj: rnd()<0.4 ? 0 : Date.now()-ent(9e6) } };
    };
    const n0 = x => { const n = +x; return (isFinite(n) && n > 0) ? Math.floor(n) : 0; };
    const ensemble = x => new Set(Array.isArray(x) ? x.filter(k=>typeof k==='string'&&k) : []);
    const contient = (gros, petit) => { for(const k of petit) if(!gros.has(k)) return false; return true; };

    let perteCompteur = 0, perteEnsemble = 0, pasIdempotent = 0, exemple = '';
    for(let t = 0; t < 400; t++){
      const a = tire(), b = tire();
      const r = fusionner(a, b);
      /* MONOTONIE des compteurs */
      const cpt = [
        ['totalCorrect', r.progres.totalCorrect, n0(a.progres.totalCorrect), n0(b.progres.totalCorrect)],
        ['bestStreak',   r.progres.bestStreak,   n0(a.progres.bestStreak),   n0(b.progres.bestStreak)],
        ['flawless',     r.progres.flawless,     n0(a.progres.flawless),     n0(b.progres.flawless)],
        ['bestScore',    r.stats.bestScore,      n0(a.stats.bestScore),      n0(b.stats.bestScore)],
        ['bestPct',      r.stats.bestPct,        n0(a.stats.bestPct),        n0(b.stats.bestPct)],
        ['games',        r.stats.games,          n0(a.stats.games),          n0(b.stats.games)],
        ['parties',      r.flamme.parties,       n0(a.flamme.parties),       n0(b.flamme.parties)],
        ['palier',       r.flamme.palier,        n0(a.flamme.palier),        n0(b.flamme.palier)]
      ];
      for(const [nom, res, x, y] of cpt){
        if(res < x || res < y){ perteCompteur++; if(!exemple) exemple = nom+' '+res+' < max('+x+','+y+')'; }
      }
      for(const livre in Object.assign({}, a.progres.books, b.progres.books)){
        const attendu = Math.max(n0(a.progres.books[livre]), n0(b.progres.books[livre]));
        if(n0(r.progres.books[livre]) < attendu){ perteCompteur++; if(!exemple) exemple = 'livre '+livre; }
      }
      /* MONOTONIE des ensembles */
      const u = (x, y) => { const s = ensemble(x); for(const k of ensemble(y)) s.add(k); return s; };
      if(!contient(ensemble(r.vues),  u(a.vues, b.vues)))   { perteEnsemble++; if(!exemple) exemple = 'vues'; }
      if(!contient(ensemble(r.flamme.geles), u(a.flamme.geles, b.flamme.geles))) { perteEnsemble++; if(!exemple) exemple = 'gels'; }
      if(!contient(new Set(Object.keys(r.progres.ach)), u(Object.keys(a.progres.ach), Object.keys(b.progres.ach)))){ perteEnsemble++; if(!exemple) exemple = 'succès'; }
      /* IDEMPOTENCE */
      if(JSON.stringify(fusionner(r, b)) !== JSON.stringify(r)){ pasIdempotent++; if(!exemple) exemple = 'idempotence (r,b)'; }
      if(JSON.stringify(fusionner(r, a)) !== JSON.stringify(r)){ pasIdempotent++; if(!exemple) exemple = 'idempotence (r,a)'; }
    }
    return { perteCompteur, perteEnsemble, pasIdempotent, exemple };
  });
  v("aucun compteur ne baisse, sur 400 paires hostiles", props.perteCompteur === 0, props.perteCompteur ? props.perteCompteur + ' perte(s) — ' + props.exemple : '');
  v("aucun ensemble ne perd un élément", props.perteEnsemble === 0, props.perteEnsemble ? props.perteEnsemble + ' perte(s) — ' + props.exemple : '');
  v("fusionner deux fois == fusionner une fois", props.pasIdempotent === 0, props.pasIdempotent ? props.pasIdempotent + ' écart(s) — ' + props.exemple : '');

  // ---------- LE CAS QUI COMPTE : UN COMPTE NEUF ----------
  /* Le jour où un joueur se connecte pour la première fois, le serveur n'a
     RIEN. Si la fusion se trompait là, elle effacerait tout ce qu'il a fait
     depuis le début. C'est le seul cas dont on ne peut pas se remettre. */
  const neuf = await ev(()=>{
    const auj = dayKey(0), demain = dayKey(1);
    /* Douze jours d'affilée jusqu'à aujourd'hui : on les pose vraiment, pour
       que la série recalculée ait de quoi se recalculer. */
    const douze = []; for(let i=11;i>=0;i--) douze.push(dayKey(-i));
    const moi = { v:1, profil:{name:'Taylor',color:'#4C86E8'},
      progres:{ books:{'Genèse':14,'Jean':9}, totalCorrect:430, bestStreak:22, flawless:3, ach:{ premier:1, torah:1 } },
      stats:{ bestScore:980, bestPct:92, games:61 },
      flamme:{ last:auj, streak:12, score:9, total:10, jours:douze, geles:[dayKey(-40)], gels:2, palier:1, parties:61, palierParties:1, annonce:'' },
      vues:['v1','v2','v3'], carnet:[{k:'q1',p:0,n:2,du:demain,maj:Date.now()}], acquises:{q9:Date.now()}, modes:{solo:40}, gout:{bible:'darby',scene:'canyon',maj:Date.now()} };
    const r = fusionner(moi, null);
    const r2 = fusionner(moi, { v:1 });
    return { totalCorrect:r.progres.totalCorrect, genese:r.progres.books['Genèse'], jean:r.progres.books['Jean'],
             ach:Object.keys(r.progres.ach).sort().join(','), bestScore:r.stats.bestScore, games:r.stats.games,
             serie:r.flamme.streak, gels:r.flamme.gels, vues:r.vues.length, carnet:r.carnet.length,
             nom:r.profil.name, bible:r.gout.bible, memeAvecObjetVide: JSON.stringify(r) === JSON.stringify(r2) };
  });
  v("compte neuf : la progression reste entière", neuf.totalCorrect === 430 && neuf.genese === 14 && neuf.jean === 9, 'totalCorrect ' + neuf.totalCorrect);
  v("  les succès restent", neuf.ach === 'premier,torah', neuf.ach);
  v("  les records restent", neuf.bestScore === 980 && neuf.games === 61, '');
  v("  la série de 12 jours reste", neuf.serie === 12, 'série ' + neuf.serie);
  v("  les gels, les vues, le carnet restent", neuf.gels === 2 && neuf.vues === 3 && neuf.carnet === 1, '');
  v("  le nom et la traduction restent", neuf.nom === 'Taylor' && neuf.bible === 'darby', '');
  v("  « rien » et « objet vide » donnent la même chose", neuf.memeAvecObjetVide, '');

  // ---------- UN TÉLÉPHONE NEUF, UN COMPTE PLEIN ----------
  const vide = await ev(()=>{
    const distant = { v:1, profil:{name:'Taylor',color:'#4C86E8'},
      progres:{ books:{'Genèse':14}, totalCorrect:430, bestStreak:22, flawless:3, ach:{ premier:1 } },
      stats:{ bestScore:980, bestPct:92, games:61 },
      flamme:{ last:dayKey(0), streak:3, score:9, total:10, jours:[dayKey(-2),dayKey(-1),dayKey(0)], geles:[], gels:2, palier:1, parties:61, palierParties:1, annonce:'' },
      vues:['v1'], carnet:[], acquises:{}, modes:{}, gout:{bible:'darby',scene:'canyon',maj:Date.now()} };
    const r = fusionner({ v:1, profil:{name:'',color:''} }, distant);
    return { total:r.progres.totalCorrect, serie:r.flamme.streak, nom:r.profil.name, bible:r.gout.bible };
  });
  v("téléphone neuf : tout revient du compte", vide.total === 430 && vide.serie === 3, 'total ' + vide.total + ', série ' + vide.serie);
  v("  et le nom du compte s'installe", vide.nom === 'Taylor' && vide.bible === 'darby', '');

  // ---------- LA SÉRIE, RECALCULÉE ----------
  const serie = await ev(()=>{
    const f = (last, jours, geles, streak) => ({ v:1, flamme:{ last, jours, geles:geles||[], streak:streak||0 } });
    const j = n => dayKey(-n);
    /* Dix jours arrêtés il y a treize jours, un seul jour aujourd'hui : la
       série est UN. Prendre le plus grand des deux nombres en aurait inventé
       dix. */
    const vieux10 = []; for(let i=22;i>=13;i--) vieux10.push(j(i));
    const casse = fusionner(f(j(13), vieux10, [], 10), f(j(0), [j(0)], [], 1));
    /* Deux appareils, quatre jours qui se suivent : 2 + 2 = 4. */
    const colle = fusionner(f(j(2), [j(3),j(2)], [], 2), f(j(0), [j(1),j(0)], [], 2));
    /* Un trou GELÉ ne casse pas la série — mais il ne COMPTE pas non plus : la
       série compte les jours joués (voir marquerJourJoue), le gel ne fait que
       l'empêcher de mourir. Deux jours joués, un gelé entre les deux : 2. */
    const gele = fusionner(f(j(0), [j(2),j(0)], [j(1)], 2), { v:1 });
    /* Une sauvegarde d'AVANT les gels (jours == null) apporte quand même ses
       jours, redéployés depuis « dernier + série ». */
    const ancien = fusionner(f(j(0), null, [], 4), { v:1 });
    /* AU BORD DE LA MÉMOIRE : cent vingt jours d'affilée, mais la liste n'en
       garde que quatre-vingt-dix. La marche va jusqu'au bout du connu sans
       trouver de trou : on ne peut pas voir plus loin, donc on croit ce qui
       était annoncé au lieu de couper trente jours. */
    const cent = []; for(let i=89;i>=0;i--) cent.push(j(i));
    const bord = fusionner(f(j(0), cent, [], 120), { v:1 });
    /* UN JOUR DANS LE FUTUR est ignoré, et ne peut donc pas voler la flamme
       d'aujourd'hui. */
    const futur = fusionner(f(dayKey(3), [j(1), j(0), dayKey(3)], [], 3), { v:1 });
    return { casse:casse.flamme.streak, colle:colle.flamme.streak, gele:gele.flamme.streak,
             ancien:ancien.flamme.streak, bord:bord.flamme.streak,
             futurDernier:futur.flamme.last, futurSerie:futur.flamme.streak, auj:dayKey(0),
             joursCasse:casse.flamme.jours.length };
  });
  v("dix jours cassés + un jour isolé = une série de 1", serie.casse === 1, 'série ' + serie.casse);
  v("  mais AUCUN jour n'est perdu (11 jours gardés)", serie.joursCasse === 11, serie.joursCasse + ' jours');
  v("deux appareils qui se suivent : 2 + 2 = 4", serie.colle === 4, 'série ' + serie.colle);
  v("un jour gelé ne casse pas la série (2 joués, 1 gelé)", serie.gele === 2, 'série ' + serie.gele);
  v("une sauvegarde d'avant les gels garde sa série", serie.ancien === 4, 'série ' + serie.ancien);
  v("au bord des 90 jours de mémoire, on ne coupe pas une série de 120", serie.bord === 120, 'série ' + serie.bord);
  v("un jour dans le futur est ignoré", serie.futurDernier === serie.auj && serie.futurSerie === 2,
    'dernier ' + serie.futurDernier + ', série ' + serie.futurSerie);

  // ---------- LE CARNET ----------
  const carnet = await ev(()=>{
    const s = (carnet, acquises) => ({ v:1, carnet, acquises:acquises||{} });
    const T = Date.now();
    /* La même question des deux côtés, écrite au MÊME instant (ou sans
       instant) : on croit celui qui dit qu'on l'a ratée — palier le plus bas,
       échéance la plus proche, n le plus grand. */
    const dur = fusionner(s([{k:'q1',p:3,n:1,du:dayKey(16),maj:T}]), s([{k:'q1',p:0,n:4,du:dayKey(1),maj:T}]));
    /* Écritures DATÉES : la plus récente gagne, même si elle demande moins de
       travail — c'est elle qui dit la vérité d'aujourd'hui. */
    const recent = fusionner(s([{k:'q1',p:0,n:4,du:dayKey(1),maj:T-60000}]), s([{k:'q1',p:3,n:1,du:dayKey(16),maj:T}]));
    /* Une question ACQUISE APRÈS sa dernière erreur ne ressuscite pas. */
    const partie  = fusionner(s([], {q2:T}), s([{k:'q2',p:1,n:1,du:dayKey(3),maj:T-60000}]));
    const partie2 = fusionner(s([{k:'q2',p:1,n:1,du:dayKey(3),maj:T-60000}]), s([], {q2:T}));
    /* Mais se RETROMPER après l'avoir acquise la ramène. */
    const rechute = fusionner(s([{k:'q2',p:0,n:2,du:dayKey(1),maj:T}]), s([], {q2:T-60000}));
    return { p:dur.carnet[0].p, n:dur.carnet[0].n, du:dur.carnet[0].du, attenduDu:dayKey(1),
             recentP: recent.carnet[0].p,
             resteVide: partie.carnet.length === 0 && partie2.carnet.length === 0,
             acquiseGardee: !!partie.acquises.q2 && !!partie2.acquises.q2,
             rechuteRevient: rechute.carnet.length === 1 && rechute.carnet[0].p === 0 };
  });
  v("carnet, à égalité : l'état qui demande le plus de travail", carnet.p === 0 && carnet.n === 4 && carnet.du === carnet.attenduDu,
    'palier ' + carnet.p + ', n ' + carnet.n + ', du ' + carnet.du);
  v("carnet, écritures datées : la plus récente l'emporte", carnet.recentP === 3, 'palier ' + carnet.recentP);
  v("une question acquise ne ressuscite pas", carnet.resteVide && carnet.acquiseGardee, '');
  v("  mais se retromper après l'avoir acquise la ramène", carnet.rechuteRevient, '');

  // ---------- POSER UNE SAUVEGARDE SUR L'APPAREIL ----------
  /* fusionner est pure ; appliquerSauvegarde, elle, ÉCRIT. C'est la seule
     fonction de tout ce mécanisme qui puisse faire perdre quelque chose à un
     joueur, et c'est donc celle qu'il faut le plus serrer. On lui donne le pire
     cas : une sauvegarde VIDE, celle d'un compte tout neuf. */
  const pose = await ev(()=>{
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':14,'Jean':9}, totalCorrect:430, bestStreak:22, flawless:3, ach:{ premier:1 } }));
    localStorage.removeItem('bt_progress_bak');
    localStorage.setItem('bt_stats', JSON.stringify({ bestScore:980, bestPct:92, games:61 }));
    localStorage.setItem('bt_seen', JSON.stringify(['v1','v2','v3']));
    localStorage.setItem('bt_errbook', JSON.stringify([{k:'q1',p:0,n:2,du:dayKey(1),maj:Date.now(),q:'Q ?',options:['a','b'],correct:'a',fact:'F',tier:'moyen'}]));
    localStorage.setItem('bt_acquises', JSON.stringify({}));
    const douze = []; for(let i=11;i>=0;i--) douze.push(dayKey(-i));
    localStorage.setItem('bt_daily', JSON.stringify({ last:dayKey(0), streak:12, score:9, total:10, jours:douze, geles:[], gels:2, palier:1, parties:61, palierParties:1, annonce:'' }));
    profile.name = 'Taylor'; profile.color = '#4C86E8'; saveProfile();
    const avant = sauvegardeIci();
    appliquerSauvegarde(sauvegardeVide());          // le compte est vide
    const apres = sauvegardeIci();
    return { total:apres.progres.totalCorrect, genese:apres.progres.books['Genèse'],
             bestScore:apres.stats.bestScore, serie:apres.flamme.streak, gels:apres.flamme.gels,
             vues:apres.vues.length, carnet:apres.carnet.length, nom:apres.profil.name,
             identique: JSON.stringify(avant) === JSON.stringify(apres) };
  });
  v("compte vide posé sur un téléphone plein : rien ne bouge", pose.identique,
    pose.identique ? '' : 'total ' + pose.total + ', série ' + pose.serie + ', carnet ' + pose.carnet);

  /* Puis une vraie sauvegarde venue d'ailleurs : elle APPORTE sans retirer. */
  const pose2 = await ev(()=>{
    const avant = sauvegardeIci();
    const ailleurs = { v:1, profil:{ name:'Autre', color:'#EE4A28' },
      progres:{ books:{'Genèse':3,'Exode':11}, totalCorrect:120, bestStreak:30, flawless:0, ach:{ torah:1 } },
      stats:{ bestScore:500, bestPct:99, games:12 },
      flamme:{ last:dayKey(0), streak:1, score:5, total:10, jours:[dayKey(0)], geles:[], gels:1, palier:0, parties:12, palierParties:0, annonce:'' },
      vues:['v4'], carnet:[{k:'q2',p:0,n:1,du:dayKey(1),maj:Date.now(),q:'Q2 ?',options:['a','b'],correct:'a',fact:'F',tier:'moyen'}],
      acquises:{}, modes:{}, gout:{ bible:'darby', scene:'canyon', maj:Date.now() } };
    appliquerSauvegarde(ailleurs);
    const apres = sauvegardeIci();
    appliquerSauvegarde(ailleurs);                  // deux fois : rien ne doit bouger
    const encore = sauvegardeIci();
    return { total:apres.progres.totalCorrect, genese:apres.progres.books['Genèse'], exode:apres.progres.books['Exode'],
             ach:Object.keys(apres.progres.ach).sort().join(','), bestPct:apres.stats.bestPct,
             serie:apres.flamme.streak, vues:apres.vues.length, carnet:apres.carnet.length,
             nom:apres.profil.name, bible:apres.gout.bible,
             avantTotal:avant.progres.totalCorrect,
             stable: JSON.stringify(apres) === JSON.stringify(encore) };
  });
  v("une sauvegarde venue d'ailleurs apporte sans retirer",
    pose2.total === 430 && pose2.genese === 14 && pose2.exode === 11 && pose2.bestPct === 99,
    'total ' + pose2.total + ', Genèse ' + pose2.genese + ', Exode ' + pose2.exode + ', meilleur % ' + pose2.bestPct);
  v("  les succès des deux côtés sont réunis", pose2.ach === 'premier,torah', pose2.ach);
  v("  la série d'ici (12) survit à celle d'en face (1)", pose2.serie === 12, 'série ' + pose2.serie);
  v("  les deux carnets, les deux listes de vues", pose2.carnet === 2 && pose2.vues === 4,
    'carnet ' + pose2.carnet + ', vues ' + pose2.vues);
  /* Le nom est à l'appareil qu'on tient ; la traduction, au choix le plus
     récent — ici celui du compte, puisque ce téléphone n'a jamais rien choisi. */
  v("  le nom d'ICI l'emporte, la traduction la plus récente s'installe", pose2.nom === 'Taylor' && pose2.bible === 'darby',
    'nom ' + pose2.nom + ', bible ' + pose2.bible);
  v("  poser deux fois la même chose ne change rien", pose2.stable, '');

  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
