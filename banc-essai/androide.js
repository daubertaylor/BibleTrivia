/* ========= BANC « LE CLAVIER ANDROID NE FAIT PLUS SAUTER L'ÉCRAN » =========
   « Ultra important : sur Android, lors de l'ouverture du clavier ou de sa
   fermeture, ça saute, l'écran clignote. Règle ça une bonne fois pour toute,
   j'en ai marre. »

   LA CAUSE, MESURÉE. Sur iOS le clavier se POSE par-dessus : rien ne bouge.
   Sur Android il pouvait REDIMENSIONNER la page — et --hu, la mesure dont
   dépendent TOUTES les tailles du jeu, changeait avec elle. Relevé sur un
   Android, cycle complet :
       --hu  7,37 -> 4,99 px à l'ouverture (−32 %)
             puis 5,43 / 6,00 / 6,78 / 7,56 / 8,07 à la fermeture
       hauteur de la carte des joueurs  294 -> 268 -> 302
   Dix valeurs pour un seul geste : tout l'écran recalculé cinq fois de suite.

   DEUX VERROUS, ET LE BANC VÉRIFIE LE RÉSULTAT DES DEUX :
     — « interactive-widget=overlays-content » dans la balise viewport, pour
       qu'Android se comporte comme iOS et n'envoie plus l'événement ;
     — et, au cas où un navigateur l'ignorerait, la règle qui dit qu'un clavier
       n'est PAS un redimensionnement : à largeur constante, on attend que la
       hauteur se pose avant de refaire quoi que ce soit.

   CE QU'ON EXIGE : --hu ne prend QU'UNE SEULE valeur sur tout le cycle, la
   hauteur des cartes ne bouge pas, et l'écran revient exactement à sa place.
   C'est une propriété, pas un réglage : elle restera vraie quoi qu'on ajoute.
   Usage : node banc-essai/androide.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND = 'Mozilla/5.0 (Linux; Android 13; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, userAgent:AND, hasTouch:true, isMobile:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.evaluate(()=>{ state.mode='group'; state.teams=[{name:'Taylor'},{name:'Joueur 2'},{name:'Joueur 3'}]; state.screen='setup'; render(); });
  await p.waitForTimeout(1300);
  const cap = p.evaluate(()=> new Promise(res=>{
    const rel=[]; const t0=performance.now();
    const tic=()=>{
      const cs=getComputedStyle(document.documentElement);
      const h=document.querySelector('.app-header'); const c=document.querySelector('.card');
      rel.push({ t:+(performance.now()-t0).toFixed(0),
                 hu:cs.getPropertyValue('--hu').trim(),
                 entete:h?+h.getBoundingClientRect().top.toFixed(1):null,
                 hCarte:c?+c.getBoundingClientRect().height.toFixed(1):null });
      if(performance.now()-t0<2600) requestAnimationFrame(tic); else res(rel);
    };
    requestAnimationFrame(tic);
  }));
  await p.evaluate(()=>{ const e=document.querySelector('.team-row input'); if(e) e.focus(); });
  for(const h of [780,700,630,575,540,516]){ await p.setViewportSize({width:393,height:h}); await p.waitForTimeout(45); }
  await p.waitForTimeout(500);
  await p.evaluate(()=>{ const e=document.activeElement; if(e&&e.blur) e.blur(); });
  for(const h of [560,640,720,800,852]){ await p.setViewportSize({width:393,height:h}); await p.waitForTimeout(45); }
  const rel = await cap;
  let ko = 0;
  const hus = [...new Set(rel.map(r=>r.hu))];
  const hauteurs = [...new Set(rel.map(r=>r.hCarte).filter(x=>x!=null))];
  const debut = rel[0], fin = rel[rel.length-1];
  const revenu = Math.abs((fin.entete||0) - (debut.entete||0)) <= 1.5;
  const v = (nom, bon, det)=>{ if(!bon) ko++; console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(46) + det); };
  v("--hu ne change pas de tout le cycle", hus.length === 1, hus.length + ' valeur(s) : ' + hus.slice(0,6).join(' · '));
  v("la hauteur des cartes ne change pas", hauteurs.length === 1, hauteurs.length + ' valeur(s) : ' + hauteurs.slice(0,6).join(' · '));
  v("l'écran revient à sa place", revenu, 'entête ' + debut.entete + ' -> ' + fin.entete);
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,2).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
