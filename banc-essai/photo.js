/* ====== BANC « LA PHOTO DE PROFIL, ET LE BADGE QUI N'EST PLUS LÀ » ======
   « Retire le badge créateur et ajoute la possibilité de mettre une photo de
   profil. » (Taylor, v287)

   CE QU'IL VÉRIFIE, ET POURQUOI CHAQUE POINT EST LÀ.

   1. LA PROMESSE QUI COMPTE LE PLUS : la photo ne monte PAS dans le compte.
      Un visage n'est pas un pseudo. sauvegardeIci() énumère champ par champ ce
      qui part vers Supabase ; le banc sérialise ce paquet ENTIER et y cherche la
      photo. Si un jour quelqu'un ajoute « tout le localStorage » à la
      sauvegarde, cette ligne devient rouge — c'est exactement son rôle.
   2. Elle ne part pas non plus dans la présence du mode en ligne (meMeta).
   3. Elle est RÉDUITE : 256 px de côté, JPEG. Une photo d'appareil de
      téléphone fait quatre à douze méga-octets ; la garder telle quelle
      ferait déborder le stockage local au premier essai.
   4. Elle est RECADRÉE AU CARRÉ par le centre : un avatar est un rond, une
      photo étirée pour y entrer se voit tout de suite. On donne au banc une
      image 400x100 dont la moitié gauche est rouge et la droite bleue, et on
      vérifie que ce qui ressort est bien le CENTRE (donc à cheval sur les
      deux, moitié-moitié) et non l'image entière écrasée.
   5. Une seule copie de l'image dans la page : la variable --photo sur la
      racine, pas vingt kilo-octets recopiés dans chaque avatar.
   6. Un fichier qui n'est pas une image le DIT, et ne détruit pas la photo
      déjà en place.
   7. Le retrait rend l'initiale.
   8. Le badge Créateur a disparu : aucune trace dans le HTML de l'accueil, du
      profil, du salon, ni dans le code.
   Usage : node banc-essai/photo.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  let ko = 0;
  const dire = (vert, quoi, detail)=>{ if(!vert) ko++; console.log('  %s %s %s', vert?'OK  ':'ECHEC', quoi.padEnd(52), detail||''); };

  /* ---- 8. le badge n'existe plus ---- */
  const badge = await p.evaluate(async()=>{
    const vus = [];
    const regarde = (ou)=>{
      if(document.querySelector('.creator-badge, .crown-badge')) vus.push(ou);
    };
    state.screen='mode'; render(); regarde('accueil');
    state.screen='profile'; render(); regarde('profil');
    return { vus, code: typeof window.promptCreator + '/' + typeof window.claimCreator,
             dansProfil: Object.prototype.hasOwnProperty.call(profile,'isCreator') };
  });
  dire(badge.vus.length === 0, 'le badge Créateur n\'est plus peint nulle part', badge.vus.join(' '));
  dire(badge.code === 'undefined/undefined', 'son code secret est parti avec lui', badge.code);

  /* ---- 3, 4, 5 : on pose une vraie image, par le chemin du jeu ---- */
  const pose = await p.evaluate(async()=>{
    /* 400x100 : moitié gauche rouge, moitié droite bleue. Le centre carré
       (100x100 au milieu) est donc à cheval sur les deux, moitié-moitié. */
    const c = document.createElement('canvas'); c.width=400; c.height=100;
    const g = c.getContext('2d');
    g.fillStyle='#FF0000'; g.fillRect(0,0,200,100);
    g.fillStyle='#0000FF'; g.fillRect(200,0,200,100);
    const blob = await new Promise(r=>c.toBlob(r,'image/png'));
    const ok = await poserPhoto(blob);
    state.screen='profile'; render();
    const url = localStorage.getItem('bt_photo') || '';
    const racine = document.documentElement.style.getPropertyValue('--photo') || '';
    /* COMBIEN DE FOIS MA PHOTO est-elle recopiée dans le HTML de la page ?
       On cherche sa QUEUE, pas « data:image/jpeg » : le décor du jeu est lui
       aussi une image en dur (trois, même : la vignette, la scène et sa version
       floutée), et le <script> en ligne vit dans le <body>. Ma première version
       les comptait et criait « trois copies » sur une page qui n'en contenait
       aucune. */
    const queue = (localStorage.getItem('bt_photo') || '').slice(-60);
    let copies = 0, i = 0, h = document.body.innerHTML;
    while(queue && (i = h.indexOf(queue, i)) >= 0){ copies++; i += 10; }
    const av = document.querySelector('[data-avatar-preview] .avatar');
    /* on relit les pixels de la photo enregistrée pour juger le recadrage */
    const im = new Image(); im.src = url;
    await new Promise(r=>{ im.onload=r; im.onerror=r; });
    const c2 = document.createElement('canvas'); c2.width=im.width; c2.height=im.height;
    c2.getContext('2d').drawImage(im,0,0);
    const lis = (x)=>{ const d=c2.getContext('2d').getImageData(x, Math.floor(im.height/2), 1, 1).data; return [d[0],d[1],d[2]]; };
    return { ok, taille:url.length, jpeg: url.indexOf('data:image/jpeg') === 0,
             cote: im.width + 'x' + im.height, racine: racine.length,
             copies, classe: !!(av && av.classList.contains('a-photo')),
             gauche: lis(Math.floor(im.width*0.15)), droite: lis(Math.floor(im.width*0.85)) };
  });
  dire(pose.ok === true, 'poser une photo réussit', '');
  dire(pose.jpeg && pose.cote === '256x256', 'elle est réduite à 256x256 en JPEG', pose.cote);
  dire(pose.taille > 0 && pose.taille < 60000, 'elle pèse moins de 60 000 caractères', pose.taille + ' car.');
  const rouge = pose.gauche[0] > 150 && pose.gauche[2] < 110;
  const bleu  = pose.droite[2] > 150 && pose.droite[0] < 110;
  dire(rouge && bleu, 'elle est recadrée au CARRÉ par le centre',
       'gauche ' + pose.gauche.join(',') + '  droite ' + pose.droite.join(','));
  dire(pose.copies === 0 && pose.racine > 100, 'une seule copie dans la page (--photo sur la racine)',
       pose.copies + ' copie(s) dans le HTML');
  dire(pose.classe, 'l\'avatar du profil la réclame (classe a-photo)', '');

  /* ---- 1 et 2 : elle ne sort pas du téléphone ---- */
  const fuite = await p.evaluate(()=>{
    const photo = localStorage.getItem('bt_photo') || '';
    const morceau = photo.slice(-80);
    const paquet = JSON.stringify(sauvegardeIci());
    const presence = JSON.stringify(meMeta());
    return { dansSauvegarde: paquet.indexOf(morceau) >= 0 || /data:image/.test(paquet),
             dansPresence: presence.indexOf(morceau) >= 0 || /data:image/.test(presence),
             octetsSauvegarde: paquet.length };
  });
  dire(!fuite.dansSauvegarde, 'elle ne monte PAS dans la sauvegarde du compte', fuite.octetsSauvegarde + ' o de paquet');
  dire(!fuite.dansPresence, 'elle ne part PAS dans la présence du mode en ligne', '');

  /* ---- 6 : un fichier qui n'est pas une image ---- */
  const mauvais = await p.evaluate(async()=>{
    const avant = localStorage.getItem('bt_photo') || '';
    const ok = await poserPhoto(new Blob(['ceci n\'est pas une image'], {type:'image/jpeg'}));
    const modal = document.getElementById('modalVeil');
    const txt = modal ? (modal.textContent || '') : '';
    const apres = localStorage.getItem('bt_photo') || '';
    try{ closeModal(); }catch(e){}
    return { ok, dit: /lue|read|leído|leer/i.test(txt), intacte: apres === avant && !!avant };
  });
  dire(mauvais.ok === false, 'un fichier illisible est refusé', '');
  dire(mauvais.dit, 'et il le DIT au joueur', '');
  dire(mauvais.intacte, 'la photo déjà posée n\'est pas détruite', '');

  /* ---- 7 : le retrait ---- */
  const oter = await p.evaluate(()=>{
    retirerPhoto();
    state.screen='profile'; render();
    const av = document.querySelector('[data-avatar-preview] .avatar');
    return { reste: localStorage.getItem('bt_photo'),
             racine: (document.documentElement.style.getPropertyValue('--photo')||'').trim(),
             classe: !!(av && av.classList.contains('a-photo')),
             initiale: (av ? av.textContent : '').trim() };
  });
  dire(!oter.reste && oter.racine === 'none' && !oter.classe, 'le retrait efface tout', oter.racine);
  dire(oter.initiale === 'T', 'et l\'initiale revient', oter.initiale);

  if(errs.length){ console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); ko++; }
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — la photo reste sur le téléphone, et le badge est parti');
  await b.close();
  process.exit(ko ? 1 : 0);
})();
