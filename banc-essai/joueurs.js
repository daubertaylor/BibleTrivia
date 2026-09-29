/* ====== BANC « AJOUTER ET RETIRER UN JOUEUR, SANS UN SEUL CRAN » ======
   Taylor : « vérifie que sur Android les joueurs ajoutés ou retirés du mode
   groupe fonctionne à la perfection, et sur iOS ça marche bien mais DES FOIS au
   moment de les retirer ça fait comme un cran qui ne devrait pas avoir. »

   « DES FOIS » EST L'INFORMATION PRINCIPALE. banc-essai/lignes.js joue un seul
   retrait, sur un seul écran, au repos : il est vert, et il l'était déjà quand
   Taylor voyait le cran. Un défaut intermittent ne se trouve pas en refaisant
   la même mesure plus fort — il se trouve en faisant VARIER ce que le geste
   rencontre. Ce banc rejoue donc le geste dans douze situations, sur trois
   écrans, y compris celles que le code signale comme les plus risquées : le
   sixième joueur (où « Ajouter » renaît du même geste), le retrait lancé
   pendant qu'une autre animation court encore, et la page défilée en bas.

   UN CRAN, C'EST DEUX CHOSES BIEN DIFFÉRENTES, ET ON MESURE LES DEUX.
   1) UNE MARCHE dans le mouvement : quelque chose bondit ou repart en arrière.
      - demi-tours    : combien de fois le mouvement change de sens. Un retrait
                        pur doit en faire ZÉRO. Un retrait lancé PENDANT un
                        ajout en fait UN, et c'est le geste de Taylor lui-même
                        qui s'inverse : c'est permis, et déclaré cas par cas.
                        (Ma première version comptait ce demi-tour comme un
                        défaut et criait au cran sur huit situations parfaites.)
      - marche finale : ce que change l'image où la ligne QUITTE le DOM. Zéro.
      - plus grand pas: un seul bond d'une image à l'autre.
      - chevauchement : deux lignes qui se marchent dessus une image.
   2) UN TEMPS D'ARRÊT : le fil principal bloqué au moment du toucher. Rien ne
      bondit, mais l'image se fige — et l'oeil lit exactement « un cran ». On
      chronomètre donc le gestionnaire du clic ET la plus longue image du geste,
      à vitesse normale puis avec le processeur bridé six fois (un téléphone
      Android d'entrée de gamme). Une image à 50 ms, c'est trois images perdues.

   CE QUE CE BANC NE PEUT PAS FAIRE, ET IL FAUT LE DIRE. Le conteneur n'a que
   Chromium. Android, c'est Chrome : la mesure vaut pour de vrai. iOS, c'est
   WebKit, absent d'ici — on joue donc les CHEMINS DE CODE d'iOS (dimensions et
   UA d'iPhone), pas son moteur de rendu. Un cran propre à WebKit passerait à
   travers ce banc.
   Usage : node banc-essai/joueurs.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_AND = 'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
/* LES DEUX SEUILS, ET D'OÙ ILS VIENNENT. Avant la correction (la marge haute
   d'« Ajouter un joueur », voir index.html) : saut 6,6 px et deux demi-tours
   dès le DEUXIÈME retrait, sur les trois appareils. Après : saut 0,05 à
   0,55 px, secousse 0,10 à 0,50 px, dans les vingt situations. Les seuils sont
   posés à environ deux fois le mesuré — ils attrapent un doublement franc, ils
   ne prétendent pas trancher un dixième. */
const S_SAUT     = 1.2;    // px : écart à la tendance à l'image où la ligne s'en va
const S_SECOUSSE = 1.5;    // px : plus grand écart à la tendance, hors démarrages
const S_CHEVAU = 1.0;      // px : deux lignes qui se marchent dessus
/* LE SEUIL DU TEMPS D'ARRÊT, ET D'OÙ IL VIENT. Avant la correction de la v286,
   le clic sur la croix tenait le fil 3 à 6 ms à vitesse normale et 22 à 47 ms
   avec le processeur bridé six fois — jusqu'à trois images perdues, et c'est ça
   que l'oeil lit comme « un cran ». Après (le recalage du verre sorti du
   gestionnaire) : 2 à 4 ms et 17 à 24 ms. Les seuils sont posés juste au-dessus
   du mesuré. ON JUGE SUR LA MÉDIANE DE CINQ TOUCHERS, pas sur le pire : avec
   deux bancs en parallèle, un toucher isolé peut doubler parce qu'un autre
   navigateur démarre au même instant — mesuré 35,7 ms une fois sur neuf, sur
   une médiane de 20. Le pire est affiché quand même, pour qu'on le voie.
   CE QUE CES DEUX SEUILS SONT, EXACTEMENT : des garde-fous contre une
   RÉGRESSION, pas la preuve du gain. La médiane bridée est passée de 23-33 à
   18-25 ms selon l'écran, et le gain se voit surtout sur le PIRE toucher (47 ->
   25 ms). Mais ce conteneur n'est pas un banc de mesure isolé : d'une exécution
   à l'autre, la même médiane varie de 18 à 25 ms et un toucher isolé monte à 40.
   Un seuil calé au ras du mesuré serait donc rouge un jour sur trois sans
   qu'une seule ligne du jeu ait changé — et un banc qui crie pour rien, on
   finit par ne plus le lire. Ils sont posés à environ le double de la médiane
   observée : ils attrapent un doublement franc, ils ne prétendent pas trancher
   un dixième. Les chiffres, eux, sont imprimés à chaque passage : c'est en les
   relisant qu'on voit une dérive lente, pas en durcissant le seuil. */
const S_FIL      = 10.0;   // ms, processeur normal (médiane de cinq touchers)
const S_FIL_LENT = 45.0;   // ms, processeur bridé x6 (médiane de cinq touchers)

const SUIVRE = function(ms){
  return new Promise((res)=>{
    const t0 = performance.now(); const rel = [];
    window.__t0 = t0; window.__clics = [];
    const tic = ()=>{
      const t = performance.now() - t0;
      const c = document.getElementById('teamCard');
      const rows = c ? [].slice.call(c.querySelectorAll('.team-row')) : [];
      const add = c ? c.querySelector('.add-team') : null;
      const r = (x)=> Math.round(x * 10) / 10;
      /* TOUT EST RELATIF AU HAUT DE LA CARTE. Mesurer des positions dans la
         fenêtre mêlait au mouvement de la liste celui du DÉFILEMENT : quand la
         page est en bas, elle se réajuste, et mon compteur de demi-tours voyait
         neuf changements de sens qui n'étaient que le glissement de la page.
         Ici, le défilement n'entre plus dans la mesure. */
      const b0 = c ? c.getBoundingClientRect() : null;
      const y0 = b0 ? b0.top : 0;
      rel.push({ t: r(t),
        h: b0 ? r(b0.height) : null,
        n: rows.length,
        tops: rows.map(x => r(x.getBoundingClientRect().top - y0)),
        bots: rows.map(x => r(x.getBoundingClientRect().bottom - y0)),
        addTop: add ? r(add.getBoundingClientRect().top - y0) : null });
      if(t < ms) requestAnimationFrame(tic); else res({ rel, clics: window.__clics.slice() });
    };
    requestAnimationFrame(tic);
  });
};

function serie(rel, cle){ return rel.map(f => f[cle]).filter(v => v !== null && v !== undefined); }
/* UN DEMI-TOUR NE COMPTE QUE S'IL PARCOURT QUELQUE CHOSE. Compter tout
   changement de sens revenait à compter le tremblement sous-pixel d'une valeur
   posée : jusqu'à dix-huit « demi-tours » sur une animation parfaite. On
   découpe donc le relevé en COURSES monotones, on fond dans la précédente
   toute course qui parcourt moins de deux pixels — c'est du bruit, pas un
   mouvement — et on compte les changements de sens qui restent. Deux pixels,
   c'est le tiers du plus grand pas normal de cette animation (6 à 7 px) : bien
   au-dessus du bruit, bien en dessous d'une marche visible. */
const BRUIT = 2.0;
function demiTours(rel, cle){
  const v = serie(rel, cle);
  if(v.length < 3) return 0;
  const courses = [];                 // [sens, parcours]
  let sens = 0, parcours = 0;
  for(let i = 1; i < v.length; i++){
    const d = v[i] - v[i-1];
    if(Math.abs(d) < 0.15) continue;
    const s = d > 0 ? 1 : -1;
    if(s === sens){ parcours += Math.abs(d); }
    else { if(sens) courses.push([sens, parcours]); sens = s; parcours = Math.abs(d); }
  }
  if(sens) courses.push([sens, parcours]);
  const gardees = [];
  for(const c of courses){
    if(c[1] < BRUIT) continue;        // course insignifiante : on l'oublie
    if(gardees.length && gardees[gardees.length-1][0] === c[0]) gardees[gardees.length-1][1] += c[1];
    else gardees.push([c[0], c[1]]);
  }
  return Math.max(0, gardees.length - 1);
}
/* ===== MESURER UNE MARCHE QUAND TOUT BOUGE DÉJÀ =====
   marcheFinale lisait le PAS de l'image où la ligne quitte le DOM. C'est juste
   tant qu'un seul repli court : il finit à l'arrêt, donc tout pas est une
   marche. Avec quatre replis qui se chevauchent, la carte descend
   légitimement de 3,5 px par image au moment où la première ligne s'en va —
   et l'ancienne mesure criait « marche de 3,5 px » sur un mouvement parfait.
   ON MESURE DONC L'ÉCART À LA TENDANCE, pas le pas : un pas qui vaut la
   moyenne de ses deux voisins est la continuation du mouvement ; un pas qui
   s'en écarte est une marche. Sur le défaut corrigé, l'écart valait 6,3 px ;
   sur le mouvement d'après, 0,12. */
function ecartTendance(v, i){
  if(i < 1 || i + 1 >= v.length) return 0;
  const d0 = v[i] - v[i-1], dm = v[i-1] - v[i-2 < 0 ? 0 : i-2], dp = v[i+1] - v[i];
  return Math.abs(d0 - (dm + dp) / 2);
}
function saut(rel){
  const v = serie(rel, 'h');
  let pire = 0;
  for(let i = 1; i < rel.length; i++) if(rel[i].n < rel[i-1].n) pire = Math.max(pire, ecartTendance(v, i));
  return pire;
}
/* LA SECOUSSE : le plus grand écart à la tendance de toute l'animation. Elle
   remplace « plus grand pas », qui punissait la VITESSE : quatre replis
   simultanés font légitimement quatre fois le chemin par image (mesuré 6,7 px
   seul, 16,9 px à quatre) sans que rien ne saute. Un ressort n'a pas de
   secousse, quel que soit leur nombre.
   ON NE COMPTE PAS LE DÉMARRAGE, ET C'EST UNE CORRECTION DU BANC. Une
   animation qui part du repos change forcément de vitesse d'un coup : c'est ce
   que « démarrer » veut dire. Localisé image par image, le pire écart tombe
   exactement sur l'image du toucher — 1,25 px pour un repli seul, 3,20 px
   quand un second repli s'ajoute à un premier qui court déjà. Compter ça comme
   un cran reviendrait à interdire au jeu de réagir au doigt. On ignore donc
   les trois images qui suivent chaque toucher, et on mesure tout le reste. */
/* EN IMAGES, PAS EN MILLISECONDES — ET C'EST UNE CORRECTION DU BANC.
   La première version ignorait 50 ms après chaque toucher, en pensant « trois
   images ». C'est vrai à 60 images par seconde, et faux dès qu'une image dure :
   rejoué seul, « 4 fois la PREMIÈRE à 90 ms » sur Android petit est à 0,12 -
   0,17 px neuf fois sur dix, et la dixième montre pourquoi elle crie :
       t=211  image de 32 ms   pas  -4,59 px   (la carte avance à peine)
       t=251  image de 20 ms   pas -13,45 px   (et rattrape d'un coup)
   C'est le DÉMARRAGE du troisième repli, touché à 191 ms, repoussé par une
   image longue du conteneur hors de la fenêtre de 50 ms. Ramené en vitesse,
   cet essai est dans la norme des neuf autres. On compte donc des IMAGES :
   l'écart à la tendance d'un démarrage à l'image k touche les indices k-1, k
   et k+1 (il lit le pas d'avant et celui d'après) ; on laisse deux images de
   plus pour un démarrage retardé. Le reste de l'animation est mesuré comme
   avant, et le saut au départ de la ligne n'est concerné par rien de tout ça. */
const AVANT = 1, APRES = 3;       // images ignorées autour de chaque toucher
function secousse(rel, clics){
  const v = serie(rel, 'h');
  const muets = new Set();
  for(const c of (clics || [])){
    const k = rel.findIndex(f => f.t >= c);
    if(k < 0) continue;
    for(let j = k - AVANT; j <= k + APRES; j++) muets.add(j);
  }
  let pire = 0;
  for(let i = 2; i + 1 < v.length; i++){
    if(muets.has(i)) continue;
    pire = Math.max(pire, ecartTendance(v, i));
  }
  return pire;
}
function chevauchement(rel){
  let pire = 0;
  for(const f of rel) for(let i = 1; i < f.tops.length; i++) pire = Math.max(pire, f.bots[i-1] - f.tops[i]);
  return pire;
}
function pireImage(rel){
  let pire = 0;
  for(let i = 1; i < rel.length; i++) pire = Math.max(pire, rel[i].t - rel[i-1].t);
  return pire;
}

(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  let ko = 0;
  for (const [appareil, ua, vp] of [
    ['Android petit', UA_AND, {width:360,height:640}],
    ['Android grand', UA_AND, {width:412,height:915}],
    ['iOS (chemins)', UA_IOS, {width:393,height:852}],
  ]){
    const ctx = await b.newContext({ viewport:vp, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block', userAgent:ua });
    const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'T',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
    await p.goto(URL);
    await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
    /* Le contexte audio naît AVANT les mesures : sinon le premier toucher paie
       sa construction (mesuré 27 ms) et on attribuerait au retrait un coût qui
       n'est pas le sien. */
    await p.evaluate(()=>{ try{ getCtx(); }catch(e){} });
    await p.waitForTimeout(400);
    await p.evaluate((src)=>{ window.__suivre = eval('(' + src + ')'); }, SUIVRE.toString());
    console.log('\n  ' + appareil + '   ' + vp.width + 'x' + vp.height);
    console.log('  situation                        demi-tours       saut     secousse  chevauch.  gestes');

    const poser = async (n, bas)=>{
      await p.evaluate((nn)=>{
        state.mode='group';
        state.teams = Array.from({length:nn}, (_,k)=>({ name:'Joueur '+(k+1) }));
        state.screen='setup'; render();
      }, n);
      await p.waitForTimeout(700);
      if(bas) await p.evaluate(()=>{ const a=document.getElementById('app'); a.scrollTop = a.scrollHeight; });
      await p.waitForTimeout(250);
    };
    /* ===== UNE LIGNE QUI MEURT N'EST PLUS UNE LIGNE =====
       Ma première version prenait document.querySelectorAll('.team-row'). Or une
       ligne retirée RESTE dans le DOM pendant les 0,34 s de son repli, marquée
       data-partie — et removeTeam refuse aussitôt un clic sur elle. « Deux
       retraits coup sur coup » recliquait donc sur la MÊME ligne mourante : le
       deuxième retrait n'avait jamais lieu. Le banc était vert parce qu'il ne
       faisait qu'un seul retrait, pendant que Taylor voyait le cran sur deux.
       LE RELEVÉ LE DISAIT, ET JE NE L'AVAIS PAS LU : « plus grand pas » valait
       6,7 px à toutes les cadences, exactement comme le contrôle à un seul
       retrait. Un banc qui donne le même nombre pour un retrait et pour quatre
       ne mesure pas quatre retraits. On compte donc désormais les retraits
       RÉELLEMENT obtenus, et on les imprime : un banc doit dire ce qu'il a
       fait, pas seulement ce qu'on lui a demandé. */
    const croix = (k)=> p.evaluate((kk)=>{
      try{ window.__clics.push(performance.now() - window.__t0); }catch(e){}
      const r = document.querySelectorAll('.team-row:not([data-partie])');
      if(!r.length) return 0;
      const row = kk < 0 ? r[r.length + kk] : r[Math.min(kk, r.length - 1)];
      const b = row.querySelector('.team-remove');
      if(!b || b.disabled) return 0;
      b.click(); return 1;
    }, k);

    /* ===== LE MARTELAGE =====
       « Le cran se produit uniquement lorsque je retire les joueurs
       RAPIDEMENT. » Le repli d'une ligne dure 0,34 s : à 90 ms d'intervalle,
       quatre replis se chevauchent, et chacun repose sur une mise en page que
       le suivant modifie sous lui. Le banc ne dépassait pas deux retraits à
       140 ms — et ces deux-là n'en faisaient qu'un (voir croix). */
    let faits = 0;
    const martele = (n, pause)=> async ()=>{
      faits = 0;
      for(let k = 0; k < n; k++){ faits += await croix(-1); if(k < n - 1) await p.waitForTimeout(pause); }
    };
    const un = (g)=> async ()=>{ faits = 1; await g(); };

    /* [nom, joueurs, page en bas, demi-tours permis, geste] */
    const cas = [
      ['retirer la dernière (4)',        4, false, 0, un(()=>croix(-1))],
      ['retirer la première (4)',        4, false, 0, un(()=>croix(0))],
      ['retirer au milieu (5)',          5, false, 0, un(()=>croix(2))],
      ['retirer le 6e (bouton renaît)',  6, false, 0, un(()=>croix(-1))],
      ['6 joueurs, page en bas',         6, true,  1, un(()=>croix(-1))],
      ['5 joueurs, page en bas',         5, true,  1, un(()=>croix(-1))],
      ['retirer 120 ms après ajout',     4, false, 1, un(async()=>{ await p.evaluate(()=>{ try{ window.__clics.push(performance.now() - window.__t0); }catch(e){} addTeam(); }); await p.waitForTimeout(120); await croix(-1); })],
      ['retirer 300 ms après ajout',     4, false, 1, un(async()=>{ await p.evaluate(()=>{ try{ window.__clics.push(performance.now() - window.__t0); }catch(e){} addTeam(); }); await p.waitForTimeout(300); await croix(-1); })],
      ['ajout au 6e puis retrait',       5, false, 1, un(async()=>{ await p.evaluate(()=>{ try{ window.__clics.push(performance.now() - window.__t0); }catch(e){} addTeam(); }); await p.waitForTimeout(160); await croix(-1); })],
      ['retirer, clavier ouvert',        5, false, 0, un(async()=>{ await p.evaluate(()=>{ document.querySelector('.team-row input').focus(); }); await p.waitForTimeout(260); await croix(-1); })],
      ['ajouter (contrôle)',             3, false, 0, un(()=>p.evaluate(()=>{ try{ window.__clics.push(performance.now() - window.__t0); }catch(e){} addTeam(); }))],
      ['2 retraits à 140 ms',            6, false, 0, martele(2, 140)],
      ['3 retraits à 120 ms',            6, false, 0, martele(3, 120)],
      ['3 retraits à 90 ms',             6, false, 0, martele(3,  90)],
      ['4 retraits à 90 ms',             6, false, 0, martele(4,  90)],
      ['4 retraits à 70 ms',             6, false, 0, martele(4,  70)],
      ['4 retraits à 50 ms',             6, false, 0, martele(4,  50)],
      ['4 retraits à 90 ms, page en bas',6, true,  1, martele(4,  90)],
      ['4 fois la PREMIÈRE à 90 ms',     6, false, 0, async()=>{ faits = 0; for(let k=0;k<4;k++){ faits += await croix(0); if(k<3) await p.waitForTimeout(90); } }],
      ['ajout puis 3 retraits à 90 ms',  5, false, 1, async()=>{ faits = 0; await p.evaluate(()=>{ try{ window.__clics.push(performance.now() - window.__t0); }catch(e){} addTeam(); }); await p.waitForTimeout(90); for(let k=0;k<3;k++){ faits += await croix(-1); if(k<2) await p.waitForTimeout(90); } }],
    ];

    for (const [nom, n, bas, dtOK, geste] of cas){
      await poser(n, bas);
      const suivi = p.evaluate(()=>window.__suivre(2200));
      await geste();
      const { rel, clics } = await suivi;
      const dt = Math.max(demiTours(rel,'h'), demiTours(rel,'addTop'));
      const sa = saut(rel);
      const sec = secousse(rel, clics);
      const ch = chevauchement(rel);
      const vert = dt <= dtOK && sa <= S_SAUT && sec <= S_SECOUSSE && ch <= S_CHEVAU;
      if(!vert) ko++;
      console.log('  %s %s %s %s %s %s  %s',
        (vert?'OK  ':'CRAN').padEnd(5), nom.padEnd(32),
        (dt + '/' + dtOK).padStart(8), (sa.toFixed(2)+' px').padStart(11),
        (sec.toFixed(2)+' px').padStart(12), (ch.toFixed(1)+' px').padStart(10),
        faits + ' retrait' + (faits > 1 ? 's' : ''));
    }

    /* ===== LE TEMPS D'ARRÊT ===== */
    const cdp = await ctx.newCDPSession(p);
    for (const bridage of [1, 6]){
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: bridage });
      const fils = [];
      for (let k = 0; k < 5; k++){
        await poser(6, false);
        const ms = await p.evaluate(()=>{
          const r = document.querySelectorAll('.team-row');
          const bt = r[r.length-1].querySelector('.team-remove');
          const a = performance.now(); bt.click(); return performance.now() - a;
        });
        fils.push(ms);
        await p.waitForTimeout(900);
      }
      const tri = [...fils].sort((a,b)=>a-b);
      const med = tri[Math.floor(tri.length/2)];
      const seuil = bridage > 1 ? S_FIL_LENT : S_FIL;
      const vert = med <= seuil;
      if(!vert) ko++;
      console.log('  %s %s  clic sur la croix : mediane %s ms, pire %s ms   (seuil %s ms)',
        (vert?'OK  ':'CRAN').padEnd(5), (bridage>1?('processeur bridé x'+bridage):'processeur normal   ').padEnd(29),
        med.toFixed(1).padStart(5), tri[tri.length-1].toFixed(1).padStart(5), seuil.toFixed(0));
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    if(errs.length){ console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); ko++; }
    await ctx.close();
  }
  console.log(ko ? '\n  ECHEC — ' + ko + ' situation(s) avec un cran' : '\n  OK — aucun cran, dans aucune des situations');
  await b.close();
  process.exit(ko ? 1 : 0);
})();
