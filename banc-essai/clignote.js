/* ============ BANC « LE LOGO NE CLIGNOTE PAS » ============
   « Vérifie aussi l'icône et sa manière de clignoter. »

   La lueur qui répond au doigt est née en v219 avec une transition SYMÉTRIQUE :
   0,16 s pour s'allumer, 0,16 s pour s'éteindre. Relevé image par image, à cent
   vingt millisecondes entre deux taps — le rythme réel du geste — cela donnait
   ceci :

        crête 0,71  ->  creux 0,09  ->  crête 0,78  ->  creux 0,13
     -> crête 0,81  ->  creux 0,15  ->  crête 0,82  ->  creux 0,15  ->  crête 0,83

   Un battement à huit hertz, 80 % de contraste. Ce n'était plus une lumière,
   c'était un stroboscope — et c'est très exactement ce que « clignoter » veut
   dire.

   Trois choses sont vérifiées ici, dans l'ordre où l'oeil les rencontre.

   1. LA RAFALE NE BAT PAS. Une fois la lueur arrivée à pleine force, elle ne
      doit plus retomber entre deux taps. Le seuil : ne pas perdre plus d'un
      sixième de sa force (0,85). Au-delà, l'oeil cesse de voir UNE lumière qui
      reste et se met à compter des éclairs — c'est la différence entre une
      bougie et un gyrophare. L'ancienne version tombait à 0,11 de sa crête :
      elle échoue ici de très loin.

   2. LA LUEUR SURVIT AU GESTE. Sur un tap isolé, elle doit être encore visible
      quand le logo a fini son ressort (retour à la taille pleine), et éteinte
      moins d'une seconde après. Une matière chaude garde un instant la trace du
      doigt ; elle ne s'éteint pas avec lui, et elle ne traîne pas non plus.
      L'ancienne version s'éteignait à 236 ms quand le ressort, lui, ne se
      posait qu'à 450 ms : la lumière mourait AVANT le mouvement.

   3. AU REPOS, RIEN NE BAT. Le logo flotte (5 s) et une aura tourne derrière
      lui (9 s). Deux mouvements sans fin, de périodes différentes : s'ils
      faisaient pulser la lumière, on le verrait comme un clignotement lent.
      On mesure donc la VRAIE luminance du carré qui entoure l'icône sur une
      révolution complète de l'aura. Relevé : 1,1 % d'amplitude. Le plafond est
      à 4 % — au-delà, ce n'est plus une respiration, c'est une pulsation.

   Usage : node banc-essai/clignote.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
let ko = 0;
function v(nom, bon, detail){
  if(!bon) ko++;
  console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(52) + (detail || ''));
}
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.waitForTimeout(1200);

  /* Le relevé : échelle du logo et opacité de la lueur, à chaque image. */
  const releve = (duree) => p.evaluate((ms)=> new Promise(res=>{
    const l=[]; const t0=performance.now();
    const tic=()=>{
      const w=document.querySelector('.hero-icon-wrap');
      if(w){
        const m=new DOMMatrixReadOnly(getComputedStyle(w).transform);
        const z=document.getElementById('heroZone');
        l.push([+(performance.now()-t0).toFixed(0),
                +Math.sqrt(m.a*m.a+m.b*m.b).toFixed(4),
                +(+getComputedStyle(w,'::after').opacity).toFixed(3),
                z && z.classList.contains('show-verse') ? 1 : 0]);
      }
      if(performance.now()-t0<ms) requestAnimationFrame(tic); else res(l);
    };
    requestAnimationFrame(tic);
  }), duree);

  const boite = await p.locator('.hero-icon-btn').boundingBox();
  if(!boite){ console.log('  pas de logo'); await b.close(); process.exit(1); }
  const cx = boite.x + boite.width/2, cy = boite.y + boite.height/2;
  const tap = async (contact)=>{ await p.mouse.move(cx, cy); await p.mouse.down(); await p.waitForTimeout(contact); await p.mouse.up(); };

  // ---------- 1. LA RAFALE DE CINQ TAPS ----------
  /* Cinq taps à cent vingt millisecondes : le geste qui ouvre le verset, et le
     plus rapide qu'un doigt puisse faire. C'est là que le battement se voyait. */
  let cap = releve(900);
  for(let i=0;i<5;i++){ await tap(70); if(i<4) await p.waitForTimeout(50); }
  const rafale = await cap;
  const iPlein = rafale.findIndex(e => e[2] >= 0.9);
  /* LA FENÊTRE S'ARRÊTE AU CINQUIÈME TAP, PAS APRÈS. Première écriture de ce
     banc : la fenêtre courait jusqu'à la dernière image où l'échelle valait son
     minimum — or le cinquième tap ouvre le verset, qui met le logo à 0,5. La
     fenêtre allait donc jusqu'au bout du repli, et l'EXTINCTION NORMALE de la
     lueur y était comptée comme un battement (creux 0,54, contraste 0,295).
     Un banc doit mesurer le geste, pas ce qui vient après : la fenêtre va donc
     de l'arrivée de la lueur à la première image du verset. */
  const iVerset = rafale.findIndex(e => e[3] === 1);
  const fin = iVerset >= 0 ? iVerset : rafale.length;
  /* Si la lueur n'atteint JAMAIS la pleine force — le cas de l'ancienne
     version — on mesure quand même, depuis le premier appui : sans cela le
     banc annoncerait « creux 0,00 pour une crête de 0,00 » et n'apprendrait
     rien à celui qui le lit. */
  const iDebut = iPlein >= 0 ? iPlein : Math.max(0, rafale.findIndex(e => e[2] > 0));
  const zone = (iDebut >= 0 && fin > iDebut) ? rafale.slice(iDebut, fin).map(e=>e[2]) : [];
  const creux = zone.length ? Math.min(...zone) : 0;
  const crete = zone.length ? Math.max(...zone) : 0;
  const michelson = crete ? (crete-creux)/(crete+creux) : 1;
  v("la lueur atteint sa pleine force pendant la rafale", iPlein >= 0,
    iPlein >= 0 ? '' : '  elle n\'a jamais dépassé ' + Math.max(...rafale.map(e=>e[2])).toFixed(2));
  v("et elle ne retombe plus entre deux taps", creux >= 0.85,
    'creux ' + creux.toFixed(2) + ' pour une crête de ' + crete.toFixed(2));
  v("  aucun battement (contraste de Michelson)", michelson <= 0.10,
    michelson.toFixed(3) + ' (l\'ancienne version : 0,81)');
  await p.waitForTimeout(2600);          // le verset s'ouvre au cinquième tap
  await p.evaluate(()=>{ try{ hideHeroVerse(); }catch(e){} });
  await p.waitForTimeout(900);

  // ---------- 2. UN TAP ISOLÉ ----------
  /* Cent dix millisecondes de contact : un tap DÉLIBÉRÉ, pas un doigt qui
     mitraille. Les soixante-dix de la rafale sont la limite basse du geste
     rapide ; un tap qu'on fait pour voir ce que le logo répond dure plus
     longtemps, et c'est ce cas-là qu'on regarde ici. */
  cap = releve(1300);
  await tap(110);
  const seul = await cap;
  /* LE RESSORT EST FINI QUAND LE LOGO SE POSE, PAS QUAND IL PASSE.
     Première écriture : « la première image où l'échelle revaut un ». Mais la
     courbe de retour DÉPASSE — elle traverse la taille pleine vers 0,10 s,
     monte à 1,018, puis redescend. Cette écriture-là datait donc la fin du
     ressort au moment de la TRAVERSÉE (152 ms) au lieu du moment où il se
     pose (~450 ms), et l'ancienne version passait ce test alors qu'elle ne
     devait pas. On cherche donc la DERNIÈRE image qui bouge encore. */
  const bas = seul.findIndex(e => e[1] < 0.95);
  let finRessort = -1;
  for(let i = seul.length - 1; i > bas; i--){ if(Math.abs(seul[i][1] - 1) >= 0.0015){ finRessort = Math.min(i + 1, seul.length - 1); break; } }
  const lueurALaFin = finRessort >= 0 ? seul[finRessort][2] : -1;
  const iEteinte = seul.findIndex((e,i) => i > bas && e[2] <= 0.005);
  /* Ce seuil n'est pas la mesure, c'est un garde-fou : sous la demi-force, on
     ne verrait rien répondre sur un téléphone. La vraie question est en
     dessous — combien de temps la lueur survit au geste. */
  v("un tap isolé allume vraiment la lueur", Math.max(...seul.map(e=>e[2])) >= 0.5,
    'crête ' + Math.max(...seul.map(e=>e[2])).toFixed(2));
  v("elle survit au ressort du logo", lueurALaFin >= 0.05,
    finRessort >= 0 ? 'ressort fini à ' + seul[finRessort][0] + ' ms, lueur encore ' + lueurALaFin.toFixed(2)
                    : 'le ressort ne revient jamais à 1');
  v("et elle est éteinte moins d'une seconde après", iEteinte >= 0 && seul[iEteinte][0] <= 1000,
    iEteinte >= 0 ? 'éteinte à ' + seul[iEteinte][0] + ' ms' : 'toujours allumée au bout du relevé');

  // ---------- 3. AU REPOS ----------
  /* La vraie luminance, pas une propriété calculée : on capture le carré qui
     entoure le logo pendant une révolution complète de l'aura, puis la page
     elle-même décode les images dans un canevas et rend la moyenne. */
  await p.waitForTimeout(800);
  const m = 34;
  const clip = { x:Math.max(0,boite.x-m), y:Math.max(0,boite.y-m), width:boite.width+2*m, height:boite.height+2*m };
  const images = [];
  const t0 = Date.now();
  while(Date.now() - t0 < 9400){
    images.push((await p.screenshot({ clip })).toString('base64'));
  }
  const moyennes = [];
  for(let i = 0; i < images.length; i += 10){
    const lot = await p.evaluate(async (tranche)=>{
      const out = [];
      for(const b64 of tranche){
        const im = new Image();
        await new Promise(r=>{ im.onload = r; im.src = 'data:image/png;base64,' + b64; });
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let s = 0; for(let k = 0; k < d.length; k += 4) s += 0.2126*d[k] + 0.7152*d[k+1] + 0.0722*d[k+2];
        out.push(s / (d.length/4));
      }
      return out;
    }, images.slice(i, i+10));
    moyennes.push(...lot);
  }
  const mini = Math.min(...moyennes), maxi = Math.max(...moyennes);
  const amplitude = 100 * (maxi - mini) / mini;
  v("au repos, la lumière ne pulse pas", amplitude <= 4,
    amplitude.toFixed(1) + ' % d\'amplitude sur ' + moyennes.length + ' images (' + ((Date.now()-t0)/1000).toFixed(1) + ' s)');

  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
