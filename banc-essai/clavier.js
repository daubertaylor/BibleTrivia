/* ============ BANC « LE CLAVIER MONTE, ET ÇA SACCADE » ============
   « Lorsque je choisis un joueur pour changer le nom, le clavier s'affiche et
   se règle parfaitement, mais de manière assez saccadée. »
   CE QUE MON BANC PRÉCÉDENT RATAIT : il faisait monter le clavier D'UN SEUL
   COUP (setViewportSize une fois). Sur iOS le clavier GLISSE — le visualViewport
   rétrécit par paliers pendant environ un quart de seconde, et chaque palier
   déclenche un nouveau recadrage. Le défilement se voit donc redonner une
   destination une quinzaine de fois pendant qu'il court déjà. Un banc qui ne
   monte le clavier qu'une fois ne peut pas voir ça, et il ne le voyait pas :
   « 150 ms, 0 image morte », alors que le doigt sent des crans.
   On relève, image par image : le pas (en pixels d'écran, ENTIERS — un
   défileur ne connaît pas le demi-pixel), les images mortes (pas nul alors
   qu'on n'est pas arrivé), et les CRANS : une image dont le pas s'écarte
   brutalement de la tendance.
   Usage : node clavier.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const H = 852, W = 393, CLAVIER = 336;      // hauteur du clavier iOS en portrait
const PALIERS = 12, DUREE_CLAVIER = 260;    // il glisse, il ne saute pas

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, { timeout:20000 });

  const CAS = [
    ['3 joueurs', 3, 0],   // le champ du dernier joueur
    ['6 joueurs', 6, 0],
    ['8 joueurs', 8, 0],
  ];
  let ok = true;
  console.log('  cas          course  attente   images   pas médian   rampe de fin   reprise de vitesse');
  for (const [nom, n, quel] of CAS) {
    await p.setViewportSize({ width:W, height:H });
    await p.evaluate((n)=>{
      state.mode='group';
      state.teams = Array.from({length:n}, (_,i)=>({ name:'Joueur ' + (i+1) }));
      state.screen='setup'; render();
    }, n);
    await p.waitForTimeout(900);
    /* on met le champ le plus bas au point : c'est celui qui oblige à recadrer */
    await p.evaluate(()=>{ const l = document.querySelectorAll('.team-row input'); l[l.length-1].focus(); });
    await p.waitForTimeout(160);
    const cap = p.evaluate((ms)=> new Promise(res=>{
      const app = document.getElementById('app'); const t0 = performance.now(); const rel = [];
      const tic = ()=>{ const t = performance.now()-t0;
        rel.push([Math.round(t), app.scrollTop, window.innerHeight]);
        if(t<ms) requestAnimationFrame(tic); else res(rel); };
      requestAnimationFrame(tic);
    }), 1500);
    /* LE CLAVIER GLISSE : douze paliers sur 260 ms. On note l'instant où il a
       fini, pour mesurer combien de temps la page reste ensuite immobile. */
    for(let i=1;i<=PALIERS;i++){
      await p.setViewportSize({ width:W, height: Math.round(H - CLAVIER * i / PALIERS) });
      await p.waitForTimeout(Math.round(DUREE_CLAVIER / PALIERS));
    }
    const rel = await cap;
    /* DEUX HORLOGES NE SE COMPARENT PAS. La fin du clavier était prise côté
       Node (Date.now) et le mouvement côté page (performance.now, démarré à
       l'appel de la capture) : entre les deux, l'aller-retour du protocole,
       quelques dizaines de millisecondes que personne ne mesure. On lit donc
       la fin du clavier DANS LE RELEVÉ lui-même — la dernière image où la
       hauteur de fenêtre a changé. Une seule horloge, celle de la page. */
    let finClavier = 0;
    for(let i=1;i<rel.length;i++) if(rel[i][2] !== rel[i-1][2]) finClavier = rel[i][0];
    const st = rel.map(r=>r[1]);
    const course = Math.abs(st[st.length-1] - st[0]);
    /* On ne juge que la partie qui BOUGE : de la première image où ça part à
       la dernière où ça change. */
    let i0 = 0, i1 = st.length-1;
    while(i0 < st.length-1 && st[i0+1] === st[i0]) i0++;
    while(i1 > i0 && st[i1] === st[i1-1]) i1--;
    const pas = [];
    for(let i=i0+1;i<=i1;i++) pas.push(Math.abs(st[i]-st[i-1]));
    const mortes = pas.filter(x=>x===0).length;
    const tri = pas.slice().sort((a,b)=>a-b);
    const med = tri.length ? tri[tri.length>>1] : 0;
    /* UN CRAN, C'EST UNE REPRISE DE VITESSE — PAS UN GRAND PAS.
       Premier essai : « une image qui fait plus de trois fois le pas médian ».
       Faux, et il condamnait le bon comportement : un mouvement qui décélère a
       forcément son plus grand pas AU DÉBUT, et ce pas-là vaut naturellement
       trois à quatre fois la médiane. Ce que le doigt sent n'est pas un grand
       pas, c'est un pas qui REPART après avoir ralenti.
       On cherche donc le sommet, puis on exige que ça ne remonte plus : après
       le pas le plus grand, aucune image ne doit dépasser la précédente de
       plus de trente pour cent. La dernière image est exclue — c'est le saut
       de fin assumé (GLISSE_QUEUE), qui pose les derniers pixels d'un coup.
       Sur l'ancien comportement (+13 +1 +2 +11 +14 +8), la reprise se voit
       tout de suite ; sur le suivi amorti, il n'y en a aucune. */
    let sommet = 0;
    for(let i=0;i<pas.length;i++) if(pas[i] > pas[sommet]) sommet = i;
    let cran = 0;
    for(let i=sommet+1;i<pas.length-1;i++){
      if(pas[i] > pas[i-1] * 1.3 + 0.5 && pas[i] - pas[i-1] > cran) cran = pas[i] - pas[i-1];
    }
    /* L'ATTENTE : le clavier a fini de monter, le champ est caché derrière lui,
       et la page ne bouge toujours pas. C'est le défaut le plus visible, et
       c'est celui qu'aucun relevé de régularité ne montre — le mouvement, quand
       il arrive enfin, est parfaitement régulier. Mesuré sur la v218 : cent
       millisecondes d'immobilité. Le relevé démarre au focus, le clavier au
       même instant : les deux horloges sont comparables.
       LA BORNE EST À 65 ms, et ce n'est pas un chiffre rond choisi au hasard :
       le recadrage doit attendre que les paliers d'iOS aient cessé (sinon la
       page repart sur une hauteur intermédiaire et RECULE, mesuré), soit deux
       fois leur intervalle — 40 ms — plus l'image où le mouvement démarre.
       Sous cette valeur, on n'accélère plus : on casse. */
    const attente = Math.max(0, rel[i0][0] - finClavier);
    /* LA RAMPE DE FIN : des images qui n'avancent que d'un pixel parce que la
       courbe est passée sous le pixel par image. Le défileur ne connaît pas le
       demi-pixel : ce sont des images à moitié mortes. */
    const rampe = (()=>{ let n = 0; for(let i = pas.length - 2; i >= 0 && pas[i] <= 1; i--) n++; return n; })();
    const mauvais = mortes > 1 || cran > 0 || attente > 65 || rampe > 1;
    if(mauvais) ok = false;
    if(process.env.DETAIL) console.log('     profil : ' + pas.map(x=>x.toFixed(0)).join(' '));
    console.log('  ' + nom.padEnd(12) + (Math.round(course)+' px').padStart(8)
      + (attente+' ms').padStart(9) + String(pas.length).padStart(9)
      + (med.toFixed(1)+' px').padStart(13) + String(rampe).padStart(15)
      + (cran ? ('+' + cran.toFixed(0)+' px').padStart(21) : '—'.padStart(21))
      + (mauvais ? '   <-- SACCADE' : ''));
    if(attente > 65) console.log('           ↳ le clavier est monté, le champ est caché, et la page attend ' + attente + ' ms avant de bouger');
    if(rampe > 1) console.log('           ↳ ' + rampe + ' images à un pixel en fin de course : ça rampe au lieu de se poser');
    await p.evaluate(()=>{ try{ document.activeElement.blur(); }catch(e){} });
    await p.waitForTimeout(400);
  }
  if(errs.length){ ok=false; console.log('  ERREURS : '+[...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ok?'\n  OK — le recadrage est régulier pendant que le clavier monte':'\n  ÉCHEC');
  process.exit(ok?0:1);
})();
