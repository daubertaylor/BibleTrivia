/* ============ « UNE FOIS OUVERT PARFAITEMENT, ÇA SAUTE » ============
   Toutes mes mesures regardaient une feuille QUE PERSONNE NE TOUCHAIT. Or ce
   n'est pas le temps qui déclenche le défaut : c'est le doigt. Dès le premier
   contact, attachSheetDrag fait trois choses d'un coup —
     feuille.style.animation = "none"   (l'entrée est coupée net)
     classList.add("monte", "dragging")
   puis, au moindre déplacement,
     feuille.style.transform = "translateY(" + dy + "px)"
   et ce dernier POINT COMPTE : la règle de base dit « translateZ(0) », un
   transform 3D qui met la feuille sur sa propre couche. En le remplaçant par
   un « translateY » plat, on retire la troisième dimension — et une couche
   composée qui redevient plate se refait, flou compris.
   Un vrai doigt ne se pose jamais parfaitement immobile : deux ou trois
   pixels suffisent. On simule donc ça, exactement : poser, bouger de 2 px,
   relâcher — après que la feuille soit arrivée depuis longtemps.
   Usage : node doigt-feuille.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
(async()=>{
  const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await nav.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'}));
    localStorage.setItem('bt_fs_hint','1');
    localStorage.setItem('bt_progress',JSON.stringify({books:{'Genèse':12},correct:434}));
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:25000});
  await p.evaluate(()=>{
    const t=[]; ['facile','moyen','difficile'].forEach(k=>(BANK[k]||[]).forEach(q=>t.push(Object.assign({},q,{tier:k}))));
    const pris=t.filter(q=>bookOf(q)).slice(0,200);
    localStorage.setItem('bt_errbook', JSON.stringify(pris.map((q,i)=>({k:qKey(q),n:1,p:0,du:dayKey(i<3?-1:5),q:q.q,options:q.options,correct:q.correct,fact:q.fact,tier:q.tier}))));
    render();
  });
  await p.waitForTimeout(600);

  const CAS = [
    ['réglages', "openSettings()",   "closeSettings()", 0.30],   // dans le titre, zone neutre
    ['à revoir', "ouvrirRevoir()",   "fermerRevoir()",  0.30],
    ['flamme',   "ouvrirFlamme()",   "closeFlamme()",   0.30],
  ];
  let ok = true;
  console.log('  feuille      au repos            au POSER du doigt       après 2 px de dérive');
  for(const [nom, ouvrir, fermer, frac] of CAS){
    await p.evaluate((c)=>{ new Function(c)(); }, ouvrir);
    await p.waitForTimeout(1400);              // largement arrivée, animation finie
    const boite = await p.evaluate(()=>{
      const f=document.querySelector('.sheet-veil:not(.closing) .settings-sheet');
      const b=f.getBoundingClientRect();
      return { x:b.left+b.width/2, y:b.top, h:b.height, tr:getComputedStyle(f).transform };
    });
    const yTouche = boite.y + boite.h * frac;
    const lire = () => p.evaluate(()=>{
      const f=document.querySelector('.sheet-veil:not(.closing) .settings-sheet');
      if(!f) return null; const b=f.getBoundingClientRect();
      const cs=getComputedStyle(f);
      return { y:Math.round(b.top*10)/10, tr:cs.transform, ligne:f.style.transform || '(aucun)',
        anim:cs.animationName + ' / ' + (f.style.animation || 'css') };
    });
    const repos = await lire();
    await p.mouse.move(boite.x, yTouche);
    await p.mouse.down();
    await p.waitForTimeout(90);
    const pose = await lire();
    await p.mouse.move(boite.x, yTouche + 2);   // la dérive d'un vrai doigt
    await p.waitForTimeout(90);
    const derive = await lire();
    await p.mouse.up();
    await p.waitForTimeout(500);

    const d1 = Math.abs(pose.y - repos.y), d2 = Math.abs(derive.y - repos.y);
    const perd3d = /matrix3d/.test(repos.tr) && !/matrix3d/.test(derive.tr);
    const mauvais = d1 > 0.6 || d2 > 0.6 || perd3d;
    if(mauvais) ok = false;
    console.log('  ' + nom.padEnd(12) + ('y=' + repos.y).padEnd(12)
      + ('bouge de ' + d1.toFixed(1) + ' px').padEnd(24)
      + 'bouge de ' + d2.toFixed(1) + ' px'
      + (perd3d ? '   <-- ET LA COUCHE 3D EST PERDUE' : (mauvais ? '   <-- SAUT' : '')));
    if(perd3d) console.log('        au repos : ' + repos.tr + '\n        au doigt : ' + derive.tr);
    await p.evaluate((c)=>{ new Function(c)(); }, fermer);
    await p.waitForTimeout(800);
  }

  /* ===== ET LE GLISSEMENT DOIT TOUJOURS MARCHER =====
     Un seuil qui empêche le saut mais empêche AUSSI de fermer la feuille au
     doigt n'aurait rien réparé : il aurait déplacé le défaut. Trois gestes,
     donc, et les trois doivent faire ce qu'ils ont toujours fait. */
  console.log('');
  const ouvre = async (c)=>{ await p.evaluate((x)=>{ new Function(x)(); }, c); await p.waitForTimeout(1300); };
  const laFeuille = ()=> p.evaluate(()=>!!document.querySelector('.sheet-veil:not(.closing) .settings-sheet'));

  /* 1. un vrai glissement vers le bas ferme */
  await ouvre("openSettings()");
  let b = await p.evaluate(()=>{ const f=document.querySelector('.settings-sheet').getBoundingClientRect();
    return { x:f.left+f.width/2, y:f.top + f.height*0.30 }; });
  await p.mouse.move(b.x, b.y); await p.mouse.down();
  for(let i=1;i<=8;i++){ await p.mouse.move(b.x, b.y + i*20); await p.waitForTimeout(16); }
  await p.mouse.up(); await p.waitForTimeout(800);
  const ferme1 = !(await laFeuille());
  if(!ferme1) ok = false;
  console.log('  glisser de 160 px vers le bas ferme la feuille : ' + (ferme1 ? 'oui' : 'NON'));
  if(!ferme1) await p.evaluate(()=>closeSettings());
  await p.waitForTimeout(700);

  /* 2. un appui sur la poignée ferme */
  await ouvre("openSettings()");
  const bp = await p.evaluate(()=>{ const g=document.querySelector('.sheet-grab').getBoundingClientRect();
    return { x:g.left+g.width/2, y:g.top+g.height/2 }; });
  await p.mouse.move(bp.x, bp.y); await p.mouse.down(); await p.waitForTimeout(60);
  await p.mouse.move(bp.x, bp.y + 2); await p.mouse.up();
  await p.waitForTimeout(800);
  const ferme2 = !(await laFeuille());
  if(!ferme2) ok = false;
  console.log('  appuyer sur la poignée ferme la feuille          : ' + (ferme2 ? 'oui' : 'NON'));
  if(!ferme2) await p.evaluate(()=>closeSettings());
  await p.waitForTimeout(700);

  /* 3. un appui ailleurs, avec la dérive habituelle, ne ferme RIEN */
  await ouvre("openSettings()");
  b = await p.evaluate(()=>{ const f=document.querySelector('.settings-sheet').getBoundingClientRect();
    return { x:f.left+f.width/2, y:f.top + f.height*0.30 }; });
  await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.waitForTimeout(80);
  await p.mouse.move(b.x, b.y + 3); await p.mouse.up();
  await p.waitForTimeout(700);
  const reste = await laFeuille();
  if(!reste) ok = false;
  console.log('  un appui avec 3 px de dérive ne ferme rien       : ' + (reste ? 'oui' : 'NON'));
  await p.evaluate(()=>closeSettings());
  await p.waitForTimeout(700);

  if(errs.length){ ok=false; console.log('  ERREURS : '+[...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ok?'\n  OK — le doigt posé ne déplace rien, et le glissement marche toujours':'\n  ÉCHEC');
  process.exit(ok?0:1);
})();
