/* Y A-T-IL DU TEXTE COUPÉ QUELQUE PART, SUR QUELQUE TÉLÉPHONE QUE CE SOIT ?
   Un mot tronqué, une ligne qui dépasse de sa carte : c'est ce qui se voit en
   premier sur une capture d'écran. On passe tous les écrans sur cinq tailles
   d'appareil et on demande à chaque élément de texte s'il tient dans sa boîte.
   Deux défauts distincts :
     COUPÉ    scrollWidth/Height dépasse la boîte alors qu'elle rogne
     DÉBORDE  l'élément sort de la boîte de son parent qui rogne */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const U=process.env.URL_ESSAI||'http://127.0.0.1:8099/index.html';
const APPAREILS=[[320,568,'iPhone SE 1'],[375,667,'iPhone SE'],[393,852,'iPhone 15'],[412,915,'Pixel 8'],[430,932,'iPhone Pro Max']];
const ECRANS=[
 ["accueil","state.screen='mode'; render();"],
 ["groupe","state.mode='group'; state.teams=[{name:'Taylor'},{name:'Bea-Marie'},{name:'Jean-Christophe'}]; state.screen='setup'; render();"],
 ["solo","state.mode='solo'; state.screen='setup'; render();"],
 ["jeu","state.mode='solo'; startGame();"],
 ["reponse","state.revealed=true; render();"],
 ["fin","state.screen='end'; state.soloScore=80; state.soloCorrect=3; state.soloBestStreak=2; state.soloMissed=[{q:'Une question ratee ?',correct:'La bonne',chosen:'La mauvaise',fact:'Anecdote.'}]; render();"],
 ["erreurs","openMissedReview();"],
 ["progression","closeMissedReview(); state.screen='parcours'; render();"],
 ["profil","state.screen='profile'; render();"],
 ["reglages","state.screen='mode'; render(); openSettings();"],
 ["versions","openBibles();"],
 ["enligne","closeBibles(); closeSettings(); state.screen='online'; render();"],
 ["salon","net.isHost=true; net.code='42CJ'; net.joueurs={}; majAdversaire(); state.screen='online-room'; render();"],
];
/* ===== ON MESURE LE TEXTE, PAS LA BOÎTE =====
   Premier jet : scrollWidth/scrollHeight contre clientWidth/clientHeight.
   Il a signalé toutes les surfaces de verre du jeu — parce que chacune héberge
   une copie floutée du décor BEAUCOUP plus grande qu'elle (.gs). Le défilement
   interne de ces boîtes ne dit rien du texte ; c'est le même piège que le
   défilement fantôme de la v170.
   On demande donc au navigateur où sont les LIGNES DE TEXTE (Range), et on
   les compare à la boîte de l'ancêtre le plus proche qui rogne. Aucun rapport
   avec le verre. */
const SONDE = (temoin) => {
  const out=[];
  if(temoin){
    const d=document.createElement('div');
    d.className='temoin-coupe';
    d.style.cssText='position:fixed;left:10px;top:120px;width:60px;height:14px;overflow:hidden;white-space:nowrap;font-size:12px;z-index:9999;';
    d.textContent='Un texte beaucoup trop long pour cette boite';
    document.body.appendChild(d);
  }
  /* ===== UNE BOÎTE QUI DÉFILE N'EST PAS UNE BOÎTE QUI COUPE =====
     « Testament », dans le salon d'un iPhone SE, tombe 17 px sous le bord de
     l'écran. Rien n'est perdu : #app défile (694 px de contenu pour 568 de
     fenêtre), il suffit de faire glisser. Un ancêtre qui DÉFILE est donc une
     fenêtre, pas un couteau — on continue de remonter. Seul « hidden » ou
     « clip », qui ne rendent jamais le texte accessible, comptent. */
  const rogneur = (e)=>{ let n=e;
    while(n && n.nodeType===1){ const c=getComputedStyle(n);
      const defile = c.overflowY==='auto'||c.overflowY==='scroll'||c.overflowX==='auto'||c.overflowX==='scroll'||n.id==='app';
      /* Dès qu'on rencontre une boîte qui défile, on ARRÊTE : au-dessus d'elle
         il n'y a plus que des fenêtres. Sans ça on remontait jusqu'à <body>,
         qui rogne, et « Testament » redevenait coupé alors qu'un glissement
         du doigt suffit à le lire. */
      if(defile) return null;
      if(c.overflowX==='hidden'||c.overflowX==='clip'||c.overflowY==='hidden'||c.overflowY==='clip') return n;
      n=n.parentElement; }
    return null; };
  document.querySelectorAll('#app *, .settings-sheet *, .modal-card *, .bible-sheet *, .temoin-coupe').forEach(e=>{
    if(e.closest('.gs, .glass-rim')) return;
    const cs=getComputedStyle(e);
    if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0) return;
    /* seulement les éléments qui portent EUX-MÊMES du texte */
    let propre=''; const noeuds=[];
    for(const n of e.childNodes) if(n.nodeType===3 && n.textContent.trim()){ propre+=n.textContent; noeuds.push(n); }
    propre=propre.trim(); if(!propre) return;
    /* UN RANGE SUR TOUT LE CONTENU PREND AUSSI LES ENFANTS — donc la couche de
       verre, qui est vingt fois plus grande que le bouton : « Courte » sortait
       de 273 px de son propre chip. On ne mesure QUE les nœuds de texte. */
    const rects=[];
    for(const n of noeuds){ const rg=document.createRange(); rg.selectNodeContents(n);
      for(const r of rg.getClientRects()) if(r.width>0.5&&r.height>0.5) rects.push(r); }
    if(!rects.length) return;
    const x0=Math.min(...rects.map(r=>r.left)), x1=Math.max(...rects.map(r=>r.right));
    const y0=Math.min(...rects.map(r=>r.top)),  y1=Math.max(...rects.map(r=>r.bottom));
    const cage=rogneur(e); if(!cage) return;
    const cb=cage.getBoundingClientRect();
    const cc=getComputedStyle(cage);
    const L=cb.left+parseFloat(cc.borderLeftWidth), R=cb.right-parseFloat(cc.borderRightWidth);
    const H=cb.top+parseFloat(cc.borderTopWidth),  B=cb.bottom-parseFloat(cc.borderBottomWidth);
    const nom=e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
    const cageNom=cage.tagName.toLowerCase()+(typeof cage.className==='string'&&cage.className.trim()?'.'+cage.className.trim().split(/\s+/)[0]:'');
    /* ===== LA BOÎTE DE POLICE N'EST PAS LA LIGNE =====
       getClientRects() sur un nœud de texte rend la boîte EM de la police, pas
       la ligne : en Poppins, 15 px pour un corps de 10,8 alors que la ligne en
       fait 12,6. Elle déborde donc naturellement de 1,2 px en haut et en bas,
       sans qu'un seul pixel d'encre soit perdu — vérifié à l'oeil, agrandi
       quatre fois, sur « Premiers pas » et sa descendante. Seize objectifs
       étaient signalés pour ça. On retranche donc ce demi-interligne avant de
       conclure : ce qui reste est une vraie perte. */
    const lh=parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize)*1.2);
    const hLigne=Math.max(...rects.map(r=>r.height));
    const jeu=Math.max(0, (hLigne - lh) / 2) + 1;
    const dx=Math.max(L-x0, x1-R), dy=Math.max(H-y0, y1-B);
    if(dx>1) out.push(['COUPÉ largeur', nom, Math.round(dx*10)/10+' px hors de '+cageNom, propre.slice(0,44)]);
    else if(dy>jeu) out.push(['COUPÉ hauteur', nom, Math.round((dy-jeu)*10)/10+' px hors de '+cageNom, propre.slice(0,44)]);
  });
  document.querySelectorAll('.temoin-coupe').forEach(n=>n.remove());
  return out;
};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const temoin = process.env.TEMOIN === '1';
 const vus=new Map();
 for(const [w,h,nom] of APPAREILS){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'}));localStorage.setItem('bt_fs_hint','1');
    localStorage.setItem('bt_progress',JSON.stringify({books:{'Genèse':12,'Exode':8,'Apocalypse':3},correct:126,streakBest:14}));});
  await p.goto(U);
  await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:20000});
  let n=0;
  for(const [ecran,prep] of ECRANS){
   try{ await p.evaluate((q)=>{ new Function(q)(); }, prep); }catch(e){}
   await p.waitForTimeout(700);
   const r=await p.evaluate(SONDE, temoin);
   r.forEach(x=>{ const cle=x[0]+'|'+x[1]+'|'+x[3];
     if(!vus.has(cle)) vus.set(cle, [x[0],x[1],x[2],x[3],nom+' / '+ecran]); });
   n+=r.length;
  }
  console.log('  '+nom.padEnd(16)+w+'x'+h+'   '+String(n).padStart(3)+' signalement(s)');
  await ctx.close();
 }
 console.log('');
 if(!vus.size) console.log('  aucun texte coupé, aucun débordement');
 [...vus.values()].forEach(x=>console.log('   '+x[0]+'  '+x[1].padEnd(28)+x[2].padEnd(12)+'« '+x[3]+' »   ['+x[4]+']'));
 await b.close(); })();
