/* ============ BANC « UN JOUEUR QUI MET À JOUR NE PERD RIEN » ============
   Il y a des joueurs. Chaque publication part directement chez eux, plusieurs
   fois par jour, sans préproduction. Ce banc est celui qui les protège.
   On sème un stockage tel qu'il existait AVANT la mise à jour — un carnet
   d'entrées sans « maj », aucun bt_acquises, une série plus longue que la
   mémoire de quatre-vingt-dix jours, un livre à zéro, un carnet plein — on
   charge la version d'aujourd'hui, on force une écriture de CHAQUE magasin
   (c'est ce que fait une partie), et on recompte tout.
   Toute valeur qui baisse est un défaut. Y compris celles qui ne se voient pas
   tout de suite : le volume du son, la traduction choisie, le badge créateur.
   Usage : node banc-essai/migration.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    const j=(n)=>{const d=new Date(Date.now()-n*86400000),z=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());};
    localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8',isCreator:true}));
    localStorage.setItem('bt_fs_hint','1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':14,'Exode':0,'Jean':9,'Psaumes':22}, totalCorrect:505, bestStreak:22, flawless:3, ach:{premier:1,torah:1,fidele:1} }));
    localStorage.setItem('bt_stats', JSON.stringify({ bestScore:980, bestPct:92, games:61 }));
    /* série de 120 jours : plus longue que la mémoire de 90 jours */
    localStorage.setItem('bt_daily', JSON.stringify({ last:j(0), streak:120, score:9, total:10, geles:[j(40)], gels:2, palier:120, parties:61, palierParties:60 }));
    localStorage.setItem('bt_settings', JSON.stringify({ sfx:false, music:true, volume:0.7, scene:'canyon', bible:'darby', notif:true }));
    const vues=[]; for(let i=0;i<300;i++) vues.push('v'+i);
    localStorage.setItem('bt_seen', JSON.stringify(vues));
    /* carnet « à l'ancienne » : aucune entrée ne porte « maj » */
    const c=[]; for(let i=0;i<200;i++) c.push({ k:'q'+i, n:2, p:i%4, du:j(-1), q:'Q'+i, options:['a','b'], correct:'a', fact:'F', tier:'moyen' });
    localStorage.setItem('bt_errbook', JSON.stringify(c));
  });
  await p.goto(process.argv[2] || 'http://127.0.0.1:8099/index.html');
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.waitForTimeout(1500);
  /* on force une écriture de chaque magasin, comme le ferait une partie */
  await p.evaluate(()=>{ saveProgress(loadProgress()); saveDaily({}); saveErrbook(loadErrbook()); saveSeen(loadSeen()); saveSettings(); });
  await p.waitForTimeout(300);
  const r = await p.evaluate(()=>{
    const pr=loadProgress(), st=loadStats(), d=loadDaily();
    return { livres:Object.keys(pr.books).length, genese:pr.books['Genèse'], jean:pr.books['Jean'], psaumes:pr.books['Psaumes'],
      total:pr.totalCorrect, meilleure:pr.bestStreak, parfaites:pr.flawless, succes:Object.keys(pr.ach).length,
      score:st.bestScore, parties:st.games, serie:d.streak, gels:d.gels, jours:(d.jours||[]).length, geles:(d.geles||[]).length,
      carnet:errbookCount(), vues:loadSeen().size, sfx:settings.sfx, volume:settings.volume, bible:settings.bible,
      nom:profile.name, createur:profile.isCreator, joursLus:joursFaits().size };
  });
  const attendu = { genese:14, jean:9, psaumes:22, total:505, meilleure:22, parfaites:3, succes:3, score:980, parties:61,
    serie:120, gels:2, carnet:200, vues:300, sfx:false, volume:0.7, bible:'darby', nom:'Taylor', createur:true };
  let ko=0;
  for(const k in attendu){ const bon = r[k] === attendu[k]; if(!bon) ko++;
    console.log('  ' + (bon?'OK ':'KO ') + k.padEnd(12) + String(r[k]).padEnd(10) + (bon?'':'  attendu ' + attendu[k])); }
  /* LES DEUX POINTS QUI MÉRITENT UNE PHRASE PLUTÔT QU'UN CHIFFRE.
     Un livre à zéro disparaît de la carte des livres : zéro et absent disent
     la même chose, et progNormalize refuse désormais les nombres impossibles.
     Et « jours » reste vide pour un joueur d'avant les gels — c'est voulu :
     joursFaits() redéploie alors les jours depuis « dernier + série », bornés
     à la mémoire. Ce qu'il faut vérifier, ce n'est donc pas la liste brute,
     c'est ce que le jeu en LIT. */
  const lus = r.joursLus;
  const bonJours = lus === Math.min(90, 120);
  if(!bonJours) ko++;
  console.log('  ' + (bonJours?'OK ':'KO ') + 'jours lus'.padEnd(12) + String(lus).padEnd(10)
    + (bonJours ? '  (série 120 bornée à la mémoire de 90, la série elle-même reste 120)' : '  attendu 90'));
  console.log('  -- livres gardés : ' + r.livres + ' (Exode était à 0 : zéro et absent disent la même chose)');
  if(errs.length){ ko++; console.log('  ERREURS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await b.close();
  console.log(ko===0 ? '\n  AUCUNE PERTE' : '\n  ' + ko + ' PERTE(S)');
  process.exit(ko===0?0:1);
})();
