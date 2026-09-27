/* ====== BANC « LA PHOTO DE PROFIL » ======
   v287 : « retire le badge créateur et ajoute la possibilité de mettre une
   photo de profil. »
   v288 : « je veux que les autres joueurs la voient et qu'elle reste
   synchronisée avec le compte. »

   CE QU'IL VÉRIFIE, ET POURQUOI CHAQUE POINT EST LÀ.

   ===== L'IMAGE =====
   1. Elle est RÉDUITE : 256 px de côté, JPEG. Une photo d'appareil de
      téléphone fait quatre à douze méga-octets ; la garder telle quelle ferait
      déborder le stockage local au premier essai. Mesuré sur une image
      photographique : 16 Ko de texte à 256 px et qualité 0,82.
   2. Elle est RECADRÉE AU CARRÉ par le centre : un avatar est un rond, une
      photo étirée pour y entrer se voit tout de suite. On donne au banc une
      image 400x100 dont la moitié gauche est rouge et la droite bleue, et on
      vérifie que ce qui ressort est bien le CENTRE (à cheval sur les deux)
      et non l'image entière écrasée.
   3. Une seule copie de l'image dans la page : les variables CSS de la racine,
      pas seize kilo-octets recopiés dans chaque avatar.
   4. Un fichier qui n'est pas une image le DIT, et ne détruit pas la photo
      déjà en place. Le retrait, lui, rend l'initiale.

   ===== LE COMPTE (v288) =====
   5. Elle MONTE dans la sauvegarde, avec sa date.
   6. La FUSION se départage par la date, dans les deux sens : la plus récente
      gagne, et un RETRAIT récent efface une photo plus ancienne au lieu de la
      laisser ressusciter. C'est la seule entorse à la monotonie de fusionner()
      et c'est pour ça qu'elle est mesurée ici, dans les quatre cas.
   7. Elle ne part toujours PAS dans la présence du mode en ligne : la présence
      est re-diffusée à chaque track(), donc à chaque changement de score.

   ===== LES AUTRES JOUEURS (v288) =====
   8. Une photo reçue par diffusion s'affiche sur l'avatar du joueur qui l'a
      envoyée — et seulement sur le sien.
   9. Quitter le salon oublie les photos reçues (rien ne traîne d'une partie à
      l'autre).
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
  const dire = (vert, quoi, detail)=>{ if(!vert) ko++; console.log('  %s %s %s', vert?'OK  ':'ECHEC', quoi.padEnd(54), detail||''); };

  /* ---- le badge n'existe plus ---- */
  const badge = await p.evaluate(()=>{
    const vus = [];
    const regarde = (ou)=>{ if(document.querySelector('.creator-badge, .crown-badge')) vus.push(ou); };
    state.screen='mode'; render(); regarde('accueil');
    state.screen='profile'; render(); regarde('profil');
    return { vus, code: typeof window.promptCreator + '/' + typeof window.claimCreator };
  });
  dire(badge.vus.length === 0, 'le badge Créateur n\'est plus peint nulle part', badge.vus.join(' '));
  dire(badge.code === 'undefined/undefined', 'son code secret est parti avec lui', badge.code);

  /* ---- l'image ---- */
  const pose = await p.evaluate(async()=>{
    const c = document.createElement('canvas'); c.width=400; c.height=100;
    const g = c.getContext('2d');
    g.fillStyle='#FF0000'; g.fillRect(0,0,200,100);
    g.fillStyle='#0000FF'; g.fillRect(200,0,200,100);
    const blob = await new Promise(r=>c.toBlob(r,'image/png'));
    const ok = await poserPhoto(blob);
    state.screen='profile'; render();
    const url = localStorage.getItem('bt_photo') || '';
    const queue = url.slice(-60);
    let copies = 0, i = 0; const h = document.body.innerHTML;
    while(queue && (i = h.indexOf(queue, i)) >= 0){ copies++; i += 10; }
    const av = document.querySelector('[data-avatar-preview] .avatar');
    const im = new Image(); im.src = url;
    await new Promise(r=>{ im.onload=r; im.onerror=r; });
    const c2 = document.createElement('canvas'); c2.width=im.width; c2.height=im.height;
    c2.getContext('2d').drawImage(im,0,0);
    const lis = (x)=>{ const d=c2.getContext('2d').getImageData(x, Math.floor(im.height/2), 1, 1).data; return [d[0],d[1],d[2]]; };
    return { ok, taille:url.length, jpeg: url.indexOf('data:image/jpeg') === 0,
             cote: im.width + 'x' + im.height, copies,
             classe: !!(av && av.classList.contains('a-photo')),
             renvoi: av ? (av.getAttribute('style')||'').indexOf('--ph:var(--photo)') >= 0 : false,
             maj: profile.photoMaj,
             gauche: lis(Math.floor(im.width*0.15)), droite: lis(Math.floor(im.width*0.85)) };
  });
  dire(pose.ok === true, 'poser une photo réussit', '');
  dire(pose.jpeg && pose.cote === '256x256', 'elle est réduite à 256x256 en JPEG', pose.cote);
  dire(pose.taille > 0 && pose.taille < 60000, 'elle pèse moins de 60 000 caractères', pose.taille + ' car.');
  const rouge = pose.gauche[0] > 150 && pose.gauche[2] < 110;
  const bleu  = pose.droite[2] > 150 && pose.droite[0] < 110;
  dire(rouge && bleu, 'elle est recadrée au CARRÉ par le centre',
       'gauche ' + pose.gauche.join(',') + '  droite ' + pose.droite.join(','));
  dire(pose.copies === 0, 'aucune copie de l\'image dans le HTML', pose.copies + ' copie(s)');
  dire(pose.classe && pose.renvoi, 'l\'avatar ne porte qu\'un renvoi vers la racine', '');
  dire(pose.maj > 0, 'elle est horodatée', String(pose.maj));

  /* ---- le compte ---- */
  const cpt = await p.evaluate(()=>{
    const photo = localStorage.getItem('bt_photo') || '';
    const queue = photo.slice(-80);
    const paquet = JSON.stringify(sauvegardeIci());
    const presence = JSON.stringify(meMeta());
    return { monte: paquet.indexOf(queue) >= 0,
             date: !!sauvegardeIci().profil.photoMaj,
             dansPresence: presence.indexOf(queue) >= 0 || /data:image/.test(presence),
             octets: paquet.length };
  });
  dire(cpt.monte && cpt.date, 'elle MONTE dans la sauvegarde du compte, avec sa date', (cpt.octets/1024).toFixed(1) + ' Ko de paquet');
  dire(!cpt.dansPresence, 'elle ne part PAS dans la présence du mode en ligne', '');

  /* ---- la fusion, dans les quatre cas ---- */
  const fus = await p.evaluate(()=>{
    const base = sauvegardeIci();
    const avec = (photo, maj)=> JSON.parse(JSON.stringify(Object.assign({}, base, { profil: Object.assign({}, base.profil, { photo, photoMaj: maj }) })));
    const A = avec('data:image/jpeg;base64,AAAA', 100);   // vieille photo
    const B = avec('data:image/jpeg;base64,BBBB', 200);   // photo récente
    const V = avec('', 300);                              // retrait, encore plus récent
    const R = avec('', 50);                               // vieux « pas de photo »
    const ph = (x, y)=> fusionner(x, y).profil.photo;
    return {
      recente1: ph(A, B), recente2: ph(B, A),
      retrait1: ph(B, V), retrait2: ph(V, B),
      pasDeResurrection1: ph(R, A), pasDeResurrection2: ph(A, R),
      date: fusionner(A, B).profil.photoMaj
    };
  });
  dire(fus.recente1.indexOf('BBBB') > 0 && fus.recente2.indexOf('BBBB') > 0,
       'la photo la plus RÉCENTE gagne, dans les deux sens', '');
  dire(fus.retrait1 === '' && fus.retrait2 === '',
       'un RETRAIT récent efface une photo plus ancienne', '');
  dire(fus.pasDeResurrection1.indexOf('AAAA') > 0 && fus.pasDeResurrection2.indexOf('AAAA') > 0,
       'un vieux « pas de photo » ne détruit rien', '');
  dire(fus.date === 200, 'la date retenue est la plus grande', String(fus.date));

  /* ---- les autres joueurs ---- */
  /* DEUX DISPOSITIONS, ET IL FAUT LES DEUX. À deux joueurs le salon montre
     deux grands avatars face à face (.vs-player, qui lit net.opp) ; à trois et
     plus il montre une LISTE (.salle-liste, qui lit net.joueurs). Ma première
     version ne peuplait que net.joueurs avec un seul adversaire : le salon
     affichait donc la disposition à deux, et cherchait une photo dans un écran
     qui ne peignait pas la liste. Deux faux échecs, et ma faute. */
  const joueur = (id, nom, couleur)=>({ id, name:nom, color:couleur, score:0, idx:0, done:false, gone:false, vu:Date.now(), arrive:1 });
  const autres = await p.evaluate((mk)=>{
    const faire = eval('(' + mk + ')');
    const vert = 'data:image/jpeg;base64,' + 'A'.repeat(200);
    const bleu = 'data:image/jpeg;base64,' + 'B'.repeat(200);
    recevoirPhoto('joueur-x', vert);
    recevoirPhoto('joueur-z', bleu);
    net.room = { id:'ESSAI' }; net.isHost = true; net.code = 'ESSAI';
    const lis = ()=>{
      const el = (pid)=>document.querySelector('.avatar[data-pid="' + pid + '"]');
      const v = (e)=>{ const m = e ? (e.getAttribute('style')||'').match(/--ph:var\((--ph\d+|--photo)\)/) : null; return m ? m[1] : ''; };
      const x = el('joueur-x'), z = el('joueur-z'), m = el('moi');
      return { x: !!(x && x.classList.contains('a-photo')), vx: v(x),
               z: !!(z && z.classList.contains('a-photo')), vz: v(z),
               moi: !!(m && m.classList.contains('a-photo')), vmoi: v(m) };
    };
    /* à deux : la disposition face à face */
    net.joueurs = { 'joueur-x': faire('joueur-x','Alex','#E0526B') };
    net.opp = net.joueurs['joueur-x']; net.oppPresent = true;
    state.screen = 'online-room'; render();
    const duo = lis();
    /* à trois : la liste */
    net.joueurs['joueur-z'] = faire('joueur-z','Sam','#39B98A');
    render();
    const trio = lis();
    const inconnu = (()=>{ recevoirPhoto('joueur-y', ''); return photoDeVar('joueur-y') === ''; })();
    const h = document.body.innerHTML;
    return { duo, trio, inconnu,
             posees: [document.documentElement.style.getPropertyValue(trio.vx||'--rien').length,
                      document.documentElement.style.getPropertyValue(trio.vz||'--rien').length],
             copies: (h.match(/A{200}/g)||[]).length + (h.match(/B{200}/g)||[]).length };
  }, joueur.toString());
  dire(autres.duo.x && autres.duo.moi, 'à deux joueurs, chacun voit la photo de l\'autre', '');
  dire(autres.trio.x && autres.trio.z && autres.trio.moi, 'à trois, la liste les montre toutes les trois', '');
  const distinctes = new Set([autres.trio.vx, autres.trio.vz, autres.trio.vmoi]);
  dire(distinctes.size === 3 && autres.posees[0] > 100 && autres.posees[1] > 100,
       'chacune a sa propre variable sur la racine', [...distinctes].join(' '));
  dire(autres.copies === 0, 'là non plus, rien n\'est recopié dans le HTML', autres.copies + ' copie(s)');
  dire(autres.inconnu, 'un joueur sans photo garde son initiale', '');

  const sortie = await p.evaluate(()=>{
    cleanupRoom();
    return { reste: Object.keys(net.photos).length, varRestante: document.documentElement.style.getPropertyValue('--ph1') };
  });
  dire(sortie.reste === 0 && !sortie.varRestante, 'quitter le salon oublie les photos reçues', '');

  /* ---- JAMAIS DE BORDURE DE COULEUR, MÊME SOUS UNE PHOTO ----
     Une image de fond est posée dans la boîte de remboursage mais peinte
     jusqu'au bord de la bordure : sans background-origin:border-box, la
     couleur du joueur reparaît sous les 2 px de rebord, en anneau autour de
     son visage. Ça ne se voit pas sur n'importe quelle photo — sur une image
     aux bords colorés, l'anneau se confond avec elle. On prend donc le cas qui
     le révèle : photo entièrement BLANCHE, couleur de joueur ROUGE VIF. */
  const rebord = await p.evaluate(async()=>{
    const c = document.createElement('canvas'); c.width = c.height = 400;
    const g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0,0,400,400);
    profile.color = '#FF0000';
    localStorage.setItem('bt_photo', c.toDataURL('image/jpeg', 0.95));
    photoCache = null; majPhotoRacine();
    state.screen = 'profile'; render();
    await new Promise(r=>setTimeout(r,350));
    const av = document.querySelector('[data-avatar-preview] .avatar');
    const r = av.getBoundingClientRect();
    /* on repeint l'avatar dans un canevas pour lire ses pixels : html2canvas
       n'existe pas ici, mais la question ne porte que sur le FOND — on la pose
       donc au navigateur, qui sait dire ce qu'il peint à un point donné. */
    const cs = getComputedStyle(av);
    return { origine: cs.backgroundOrigin, image: cs.backgroundImage.slice(0,20),
             largeur: Math.round(r.width) };
  });
  /* CE QUE CETTE LIGNE VÉRIFIE, EXACTEMENT : que la déclaration est là. Le
     comptage de pixels qui a établi le chiffre (21 rouges sur 120 le long du
     dernier anneau sans elle, 0 avec) a été fait une fois, à la main, et il est
     consigné dans index.html. Depuis un banc on ne peut pas photographier la
     page depuis l'intérieur de la page ; on garde donc la cause, pas l'effet.
     C'est une garde honnête : le jour où quelqu'un retire la déclaration,
     cette ligne rougit. */
  dire(rebord.origine === 'border-box' && rebord.image.indexOf('url(') === 0,
       'le fond de la photo est posé dans la boîte de BORDURE', rebord.origine);

  /* ---- un fichier illisible, puis le retrait ---- */
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

  const oter = await p.evaluate(()=>{
    const avant = profile.photoMaj;
    retirerPhoto();
    state.screen='profile'; render();
    const av = document.querySelector('[data-avatar-preview] .avatar');
    return { reste: localStorage.getItem('bt_photo'),
             racine: (document.documentElement.style.getPropertyValue('--photo')||'').trim(),
             classe: !!(av && av.classList.contains('a-photo')),
             initiale: (av ? av.textContent : '').trim(),
             horodate: profile.photoMaj >= avant && profile.photoMaj > 0 };
  });
  dire(!oter.reste && oter.racine === 'none' && !oter.classe, 'le retrait efface tout', oter.racine);
  dire(oter.initiale === 'T', 'et l\'initiale revient', oter.initiale);
  dire(oter.horodate, 'le retrait est horodaté (sinon la photo reviendrait)', '');

  if(errs.length){ console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); ko++; }
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — la photo suit le compte, se voit des autres, et ne traîne nulle part');
  await b.close();
  process.exit(ko ? 1 : 0);
})();
