/* ========= BANC « LE LOGO S'AGITE-T-IL ? » =========
   « Je trouve qu'elle bouge beaucoup trop vite et qu'elle va trop dans tous
   les sens. Ça fait mal aux yeux plutôt qu'autre chose. »

   POURQUOI logo.js NE POUVAIT PAS LE VOIR. Il n'a que des bornes BASSES :
   au moins 7 % d'enfoncement, au moins 1,2 % de ressort au retour, au moins
   4° d'inclinaison au bord. Toutes disent « pas assez », aucune ne dit
   « trop ». Un banc bâti pour corriger un défaut de timidité ne peut pas
   signaler l'excès inverse — il l'encourage. C'est la deuxième fois : la
   métrique du recadrage clavier punissait elle aussi ce qu'on cherchait.

   CE QU'ON MESURE. Le logo est animé par QUATRE ressorts simultanés
   (enfoncement, balancement, et les deux axes du point de contact) qui se
   composent en une seule matrice. Plutôt que de lire chaque ressort, on suit
   LES QUATRE COINS de l'image à l'écran, perspective comprise, et on retient
   le pire : c'est ce que l'œil voit.

   DEUX ERREURS DE MESURE À NE PAS REFAIRE, toutes deux commises ici :
     — je suivais un point à 32 px du centre alors que le logo en fait 53 de
       demi-largeur. Toutes les vitesses étaient sous-estimées de 40 %. On lit
       donc la taille réelle de l'élément, on ne la suppose pas.
     — je ne suivais qu'UN coin. Une bascule en 3D fait pivoter tout le carré ;
       un seul point n'en montre qu'une part, et pas la plus grande.
   On ajoute aussi la VITESSE ANGULAIRE, en degrés par seconde : c'est la
   grandeur la plus parlante pour « ça bouge trop vite », et elle ne dépend pas
   de la taille de l'écran.

     vitesse de pointe  px/s du coin le plus rapide — « ça bouge trop vite ».
     vitesse angulaire  degrés/s de la bascule — la même chose, en plus lisible.
     demi-tours         nombre de fois où le coin REPART dans l'autre sens.
                        « Ça va dans tous les sens. » Un objet qui se pose en
                        fait un ou deux : il dépasse le repos, il revient.
                        ON NE LE LIT PAS SUR LA VITESSE. Premier essai : un
                        virage de plus de 120° entre deux pas, en ignorant les
                        pas trop lents pour ne pas compter du bruit. Résultat :
                        zéro demi-tour partout, alors que la trace en montrait
                        trois. Évidemment — un demi-tour se produit là où la
                        vitesse S'ANNULE, donc exactement dans ce que le
                        garde-fou écartait. On compte donc les EXTRÉMUMS du
                        déplacement, qui sont les demi-tours eux-mêmes, en ne
                        retenant que ceux dont le rebroussement dépasse un
                        tiers de pixel — sous cela, l'œil ne voit rien.
                        ET ON NE LES COMPTE QUE DANS LA QUEUE, c'est-à-dire
                        une fois le doigt parti. Deuxième métrique fausse de
                        la soirée : comptés sur toute la salve, ils valaient
                        huit — évidemment, cinq taps font cinq enfoncements et
                        cinq retours, soit neuf demi-tours PAR CONSTRUCTION.
                        Je comptais le geste, pas l'agitation. Ce qu'on veut
                        savoir est ailleurs : quand on arrête de toucher, est-
                        ce que ça se pose ?
     chemin / écart     longueur totale du trajet divisée par l'écart maximal
                        au repos. Un aller-retour vaut 2. Au-delà de 4, le
                        coin a fait bien plus de route que de déplacement :
                        c'est de l'agitation, pas un geste.
     retour au calme    millisecondes APRÈS LE DERNIER DOIGT LEVÉ avant que
                        le coin ne bouge plus de façon visible (8 px/s).

   ON MESURE SURTOUT LA SALVE, parce que c'est l'usage réel : cinq taps
   rapides révèlent un verset. Chaque tap inverse le balancement et redonne au
   logo une nouvelle direction de bascule ; c'est LÀ que « ça part dans tous
   les sens », pas sur un tap isolé. Un banc qui ne tape qu'une fois regarde à
   côté du geste.

   PIÈGE DE MESURE, RENCONTRÉ ICI. Le premier relevé donnait 1082 px/s au
   centre, et c'était faux : le transform passe de « none » à une matrice en
   une image, et mes deux points étaient séparés d'UNE milliseconde d'horloge.
   La vitesse venait de l'horloge, pas du logo. On ignore donc tout intervalle
   plus court qu'une demi-image — une vitesse ne se lit pas entre deux relevés
   qui tombent dans la même image.

   Usage : node banc-essai/agitation.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
/* Les bornes. Elles disent « ça se pose », elles n'interdisent pas la vie :
   le ressort au retour et l'inclinaison restent exigés par logo.js, qui doit
   rester vert en même temps que celui-ci. Les deux bancs se tiennent. */
const S_VITESSE = 900;     // px/s
const S_BASCULE = 120;     // °/s
const S_INVERSIONS = 2;   // dépasser le repos et revenir : c'est deux, pas plus
const S_CHEMIN = 4.5;
/* 600 ms, et pas 450 : le réglage retenu s'établit à 415 ms après une salve,
   et l'ancien aussi. Un seuil à 450 serait passé de justesse sans rien
   distinguer — il aurait fini par clignoter d'un jour à l'autre en n'attrapant
   rien. Il garde ici son vrai rôle : empêcher qu'un futur réglage ne laisse le
   logo osciller une seconde entière. Ce sont la bascule et les demi-tours qui
   font le tri. */
const S_CALME = 600;       // ms après le doigt levé
const DT_MINI = 8;         // ms : sous une demi-image, l'intervalle n'est pas une durée
/* Les cas. « salve » est le vrai geste : cinq taps rapides, le doigt qui ne
   retombe jamais exactement au même endroit. */
const CAS = [
  ['tap centre',   [[0, 0]],                                                   0],
  ['tap bord',     [[0.8, 0]],                                                 0],
  ['salve de 5',   [[0.1,-0.1],[-0.2,0.15],[0.25,0.05],[-0.1,-0.2],[0.15,0.1]], 150],
];
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  let ko = 0;
  console.log('  cas               vitesse    bascule   demi-tours   chemin/écart   calme');
  for (const [nom, taps, rythme] of CAS) {
    await p.evaluate(()=>{ try{ heroArreter(); hideHeroVerse(); }catch(e){} state.screen='mode'; render(); });
    await p.waitForTimeout(900);
    const bo = await p.locator('.hero-icon-btn').boundingBox();
    if(!bo){ console.log('  pas de logo'); ko++; break; }
    /* On relève la position D'UN COIN du logo, à l'écran, perspective
       comprise : c'est ce que l'œil suit. */
    const cap = p.evaluate(({duree, demi})=> new Promise(res=>{
      const rel=[]; const t0=performance.now(); window.__t0 = t0; window.__fin = null;
      const tic=()=>{
        const w=document.querySelector('.hero-icon-wrap');
        if(w){
          const M=new DOMMatrixReadOnly(getComputedStyle(w).transform);
          const c=[];
          for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
            const q=M.transformPoint(new DOMPoint(sx*demi, sy*demi, 0, 1));
            c.push(q.x/q.w, q.y/q.w);
          }
          const ry=Math.atan2(-M.m13, M.m11)*180/Math.PI;
          const rx=Math.atan2(-M.m23, M.m22)*180/Math.PI;
          rel.push([+(performance.now()-t0).toFixed(1), c, ry, rx]);
        }
        if(performance.now()-t0<duree) requestAnimationFrame(tic); else res(rel);
      };
      requestAnimationFrame(tic);
    }), { duree: 1400 + taps.length * rythme, demi: Math.round(bo.width/2) });
    for (let i=0;i<taps.length;i++){
      await p.mouse.move(bo.x + bo.width/2 * (1+taps[i][0]), bo.y + bo.height/2 * (1+taps[i][1]));
      await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up();
      if(i < taps.length-1) await p.waitForTimeout(Math.max(10, rythme-70));
    }
    /* On plante un repère DANS LA PAGE au moment où le doigt se lève pour de
       bon : c'est de là que se juge la façon dont le logo se pose. */
    await p.evaluate(()=>{ window.__fin = performance.now() - window.__t0; });
    const rel = await cap;
    const tFin = await p.evaluate(()=> window.__fin) || 0;
    /* Le repos, c'est la position de départ : le logo y est immobile avant le
       tap, et il doit y revenir. */
    const c0 = rel[0][1];
    let chemin = 0, ecart = 0, vmax = 0, amax = 0, calme = 0;
    let depuis = null;
    /* On garde le déplacement SIGNÉ le long de la direction dominante du
       geste : le mouvement est pour ainsi dire à une dimension (le coin part
       vers le doigt et revient), et une grandeur signée rend les demi-tours
       lisibles. La direction dominante, c'est celle de l'écart maximal. */
    let iMax = 0, dMax = 0, kMax = 0;
    for (let i=0;i<rel.length;i++) for (let k=0;k<4;k++){
      const d = Math.hypot(rel[i][1][2*k]-c0[2*k], rel[i][1][2*k+1]-c0[2*k+1]);
      if(d > dMax){ dMax = d; iMax = i; kMax = k; }
    }
    ecart = dMax;
    /* On projette le coin LE PLUS REMUANT sur sa propre direction dominante :
       une grandeur signée rend les demi-tours lisibles. */
    const ux = dMax > 0.001 ? (rel[iMax][1][2*kMax]-c0[2*kMax])/dMax : 1;
    const uy = dMax > 0.001 ? (rel[iMax][1][2*kMax+1]-c0[2*kMax+1])/dMax : 0;
    const proj = rel.map(e => (e[1][2*kMax]-c0[2*kMax])*ux + (e[1][2*kMax+1]-c0[2*kMax+1])*uy);
    for (let i=1;i<rel.length;i++){
      if(rel[i][0]-rel[i-1][0] < DT_MINI) continue;   // deux relevés dans la même image
      const dt = (rel[i][0]-rel[i-1][0])/1000;
      /* LE PIRE DES QUATRE COINS : c'est celui-là que l'œil suit. */
      let pas = 0;
      for (let k=0;k<4;k++) pas = Math.max(pas, Math.hypot(rel[i][1][2*k]-rel[i-1][1][2*k], rel[i][1][2*k+1]-rel[i-1][1][2*k+1]));
      chemin += pas;
      const v = pas/dt; if(v > vmax) vmax = v;
      const da = Math.hypot(rel[i][2]-rel[i-1][2], rel[i][3]-rel[i-1][3]) / dt;
      if(da > amax) amax = da;
      if(v > 8) depuis = rel[i][0];   // dernière fois qu'on a bougé visiblement
    }
    calme = depuis === null ? 0 : Math.max(0, depuis - tFin);
    /* LES DEMI-TOURS : les extrémums de la grandeur projetée. On ne retient
       qu'un extrémum dont le rebroussement dépasse un tiers de pixel — en
       dessous, c'est l'arrondi du moteur, pas un mouvement. */
    const REBROUSSE = 0.33;
    let i0q = 0; while(i0q < rel.length && rel[i0q][0] < tFin) i0q++;
    let inversions = 0, sens = 0, borne = proj[Math.min(i0q, proj.length-1)];
    for (let i=i0q+1;i<proj.length;i++){
      const d = proj[i] - borne;
      if(sens === 0){ if(Math.abs(d) > REBROUSSE){ sens = Math.sign(d); borne = proj[i]; } continue; }
      if(Math.sign(d) === sens){ borne = proj[i]; continue; }
      if(Math.abs(d) > REBROUSSE){ inversions++; sens = -sens; borne = proj[i]; }
    }
    const rapport = ecart > 0.5 ? chemin/ecart : 0;
    const mauvais = vmax > S_VITESSE || amax > S_BASCULE || inversions > S_INVERSIONS || rapport > S_CHEMIN || calme > S_CALME;
    if(mauvais) ko++;
    console.log('  ' + nom.padEnd(16) + (vmax.toFixed(0)+' px/s').padStart(10)
      + (amax.toFixed(0)+' °/s').padStart(11)
      + String(inversions).padStart(12) + rapport.toFixed(1).padStart(15)
      + (Math.round(calme)+' ms').padStart(9) + (mauvais ? '   <-- AGITÉ' : ''));
    if(vmax > S_VITESSE)        console.log('           ↳ trop vite : ' + vmax.toFixed(0) + ' px/s (max ' + S_VITESSE + ')');
    if(amax > S_BASCULE)        console.log('           ↳ la bascule tourne à ' + amax.toFixed(0) + ' °/s (max ' + S_BASCULE + ')');
    if(inversions > S_INVERSIONS) console.log('           ↳ ça part dans tous les sens : ' + inversions + ' demi-tours (max ' + S_INVERSIONS + ')');
    if(rapport > S_CHEMIN)      console.log('           ↳ le coin fait ' + rapport.toFixed(1) + '× plus de route que de déplacement (max ' + S_CHEMIN + ')');
    if(calme > S_CALME)         console.log('           ↳ il remue encore ' + Math.round(calme) + ' ms après le doigt levé (max ' + S_CALME + ')');
  }
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,2).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
