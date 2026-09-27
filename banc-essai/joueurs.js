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
const S_FINALE = 1.2;      // px : ce que change le départ du noeud
const S_PAS    = 14.0;     // px en une image
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
      if(t < ms) requestAnimationFrame(tic); else res(rel);
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
function plusGrandPas(rel, cle){
  const v = serie(rel, cle); let pire = 0;
  for(let i = 1; i < v.length; i++) pire = Math.max(pire, Math.abs(v[i] - v[i-1]));
  return pire;
}
function marcheFinale(rel){
  let pire = 0;
  for(let i = 1; i < rel.length; i++){
    if(rel[i].n < rel[i-1].n){
      for(const k of ['h','addTop'])
        if(rel[i][k] !== null && rel[i-1][k] !== null) pire = Math.max(pire, Math.abs(rel[i][k] - rel[i-1][k]));
    }
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
    console.log('  situation                      demi-tours  marche finale  plus grand pas  chevauch.');

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
    const croix = (k)=> p.evaluate((kk)=>{
      const r = document.querySelectorAll('.team-row');
      const row = kk < 0 ? r[r.length + kk] : r[kk];
      row.querySelector('.team-remove').click();
    }, k);

    /* [nom, joueurs, page en bas, demi-tours permis, geste] */
    const cas = [
      ['retirer la dernière (4)',        4, false, 0, ()=>croix(-1)],
      ['retirer la première (4)',        4, false, 0, ()=>croix(0)],
      ['retirer au milieu (5)',          5, false, 0, ()=>croix(2)],
      ['retirer le 6e (bouton renaît)',  6, false, 0, ()=>croix(-1)],
      ['6 joueurs, page en bas',         6, true,  1, ()=>croix(-1)],
      ['5 joueurs, page en bas',         5, true,  1, ()=>croix(-1)],
      ['retirer 120 ms après ajout',     4, false, 1, async()=>{ await p.evaluate(()=>addTeam()); await p.waitForTimeout(120); await croix(-1); }],
      ['retirer 300 ms après ajout',     4, false, 1, async()=>{ await p.evaluate(()=>addTeam()); await p.waitForTimeout(300); await croix(-1); }],
      ['ajout au 6e puis retrait',       5, false, 1, async()=>{ await p.evaluate(()=>addTeam()); await p.waitForTimeout(160); await croix(-1); }],
      ['deux retraits coup sur coup',    6, false, 0, async()=>{ await croix(-1); await p.waitForTimeout(140); await croix(-1); }],
      ['retirer, clavier ouvert',        5, false, 0, async()=>{ await p.evaluate(()=>{ document.querySelector('.team-row input').focus(); }); await p.waitForTimeout(260); await croix(-1); }],
      ['ajouter (contrôle)',             3, false, 0, ()=>p.evaluate(()=>addTeam())],
    ];

    for (const [nom, n, bas, dtOK, geste] of cas){
      await poser(n, bas);
      const suivi = p.evaluate(()=>window.__suivre(1400));
      await geste();
      const rel = await suivi;
      const dt = Math.max(demiTours(rel,'h'), demiTours(rel,'addTop'));
      const mf = marcheFinale(rel);
      const pas = Math.max(plusGrandPas(rel,'h'), plusGrandPas(rel,'addTop'));
      const ch = chevauchement(rel);
      const vert = dt <= dtOK && mf <= S_FINALE && pas <= S_PAS && ch <= S_CHEVAU;
      if(!vert) ko++;
      console.log('  %s %s %s %s %s %s',
        (vert?'OK  ':'CRAN').padEnd(5), nom.padEnd(29),
        (dt + '/' + dtOK).padStart(8), (mf.toFixed(1)+' px').padStart(13),
        (pas.toFixed(1)+' px').padStart(14), (ch.toFixed(1)+' px').padStart(10));
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
