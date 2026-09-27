/* ============ BANC « TOUT SE LIT, TOUT S'ATTEINT, TOUT SE NOMME » ============
   Contrastes, lecteurs d'écran, taille des cibles : jamais vérifiés. Des
   aria-label existent, posés au fil de l'eau, sans relecture d'ensemble. Un
   texte clair sur du verre clair peut passer sous le seuil lisible sans que
   personne ne le remarque — sauf ceux qui en ont besoin. Et les deux stores
   regardent ce point.

   ON NE CALCULE PAS LE CONTRASTE, ON LE PHOTOGRAPHIE. Tout le jeu est posé sur
   du verre : backdrop-filter, dégradés, décor qui transparaît, couches ::after
   qui se superposent. La couleur de fond « déclarée » d'un élément n'a
   pratiquement jamais de rapport avec ce que l'œil reçoit — c'est exactement
   l'erreur qui a rendu deux bancs aveugles pendant des semaines (lisible.js et
   fondu.js lisaient --glass-tint pendant qu'une couche peignait par-dessus).
   On prend donc DEUX photos de chaque écran : une normale, une avec tout le
   texte rendu transparent. La seconde donne le fond RÉEL sous chaque mot, au
   pixel. Le contraste se calcule entre la couleur calculée du texte et le PIRE
   pixel de son propre fond — le pire, parce qu'un mot illisible sur un
   cinquième de sa longueur est un mot illisible.

   LES TROIS EXIGENCES, et d'où viennent les nombres (WCAG 2.1 AA, celui que
   les deux stores citent) :
     — contraste 4,5 pour du texte courant, 3,0 pour du grand texte (≥ 24 px,
       ou ≥ 18,7 px en gras) ;
     — toute cible tactile fait au moins 44 x 44 points (Apple HIG ; Material
       demande 48, on prend le seuil le plus bas des deux pour ne pas inventer
       une exigence que personne ne pose) ;
     — tout ce qui se touche porte un nom lisible par un lecteur d'écran :
       du texte, un aria-label, ou un titre.
   Usage : node banc-essai/acces.js [url]        ECRAN=nom pour n'en voir qu'un
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'acces-'));
const CIBLE_MIN = 44;

/* Les écrans, et comment y aller. Un pas par état qu'un joueur peut voir. */
const ECRANS = [
  ['accueil',        () => { state.screen='mode'; render(); }],
  ['réglages solo',  () => { state.mode='solo'; state.screen='setup'; render(); }],
  ['réglages groupe',() => { state.mode='group'; state.teams=[{name:'Taylor',color:'#4C86E8'},{name:'Ana',color:'#E8A14C'}]; state.screen='setup'; render(); }],
  ['une question',   () => { state.mode='solo'; startGame(); state.screen='play'; render(); }],
  ['la réponse',     () => { state.mode='solo'; startGame(); state.screen='play'; state.revealed=true;
                             state.soloSelected=(state.questions[0]||{}).correct; render(); }],
  ['fin de partie',  () => { state.mode='solo'; startGame(); state.screen='end';
                             state.soloScore=310; state.soloCorrect=11; state.soloBestStreak=5; render(); }],
  ['progression',    () => { state.screen='parcours'; render(); }],
  ['profil',         () => { state.screen='profile'; render(); }],
  ['en ligne',       () => { state.screen='online'; render(); }],
  ['à revoir',       () => { state.screen='revoir'; render(); }],
  ['les réglages',   () => { state.screen='mode'; render(); openSettings(); }],
  ['les bibles',     () => { state.screen='mode'; render(); openSettings(); setTimeout(()=>openBibles(), 300); }],
  ['la flamme',      () => { state.screen='mode'; render(); if(typeof openFlamme==='function') openFlamme(); }],
];

/* Ce qu'on relève sur un écran : chaque morceau de texte visible avec sa boîte
   et sa couleur calculée, et chaque chose qui se touche avec sa taille et son
   nom accessible. */
const RELEVER = () => {
  const dedans = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
                        && r.right > 0 && r.left < innerWidth;
  const visible = (e) => { const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };

  const textes = [];
  const marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while((n = marche.nextNode())){
    const t = (n.textContent || '').trim();
    if(!t) continue;
    const p = n.parentElement;
    if(!p || !visible(p)) continue;
    const g = document.createRange(); g.selectNodeContents(n);
    const r = g.getBoundingClientRect();
    if(!dedans(r)) continue;
    const cs = getComputedStyle(p);
    const px = parseFloat(cs.fontSize) || 16;
    const gras = (parseInt(cs.fontWeight, 10) || 400) >= 700;
    /* ===== ON MESURE SOUS LES LETTRES, PAS SOUS LA LIGNE =====
       La boîte d'un nœud de texte est sa LIGNE, interligne compris. Avec un
       line-height de 1,5 sur 13 px, un tiers de cette boîte est du vide — et
       ce vide déborde sous la carte, sur le décor. Ma première mesure y
       trouvait des bruns de rocher et annonçait un contraste de 1,00 sur des
       cartes de verre parfaitement lisibles. On ramène donc la hauteur à la
       taille de la police, centrée dans la ligne, et on rentre d'un pixel sur
       les côtés : c'est là que les lettres sont, et nulle part ailleurs. */
    const hb = Math.min(r.height, px);
    const yb = r.y + (r.height - hb) / 2;
    textes.push({ t: t.slice(0, 40), x:r.x + 1, y:yb, w:Math.max(1, r.width - 2), h:Math.max(1, hb),
                  col: cs.color, px, gras,
                  ou: (p.tagName.toLowerCase() + '.' + String(p.className || '').trim().split(/\s+/).join('.')).slice(0, 44) });
  }

  const TOUCHABLE = 'button,a[href],input,select,textarea,[role="button"],[role="switch"],[onclick],[tabindex]:not([tabindex="-1"])';
  const cibles = [];
  for(const e of document.querySelectorAll(TOUCHABLE)){
    if(!visible(e)) continue;
    const r = e.getBoundingClientRect();
    if(!dedans(r)) continue;
    if(e.disabled) continue;
    const nom = (e.getAttribute('aria-label') || e.getAttribute('title')
              || (e.textContent || '').trim() || e.getAttribute('alt') || '').trim();
    cibles.push({ ou: (e.tagName.toLowerCase() + '.' + String(e.className || '').trim().split(/\s+/).join('.')).slice(0, 44),
                  w: r.width, h: r.height, nom: nom.slice(0, 30),
                  role: e.getAttribute('role') || '' });
  }
  return { textes, cibles };
};

const cn = (v)=>{ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
const lum = (r,g,b)=> 0.2126*cn(r) + 0.7152*cn(g) + 0.0722*cn(b);
const ratio = (a,b)=> (Math.max(a,b)+0.05) / (Math.min(a,b)+0.05);
const seuilDe = (px, gras)=> (px >= 24 || (gras && px >= 18.66)) ? 3.0 : 4.5;

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12,'Exode':8}, correct:126 }));
    localStorage.setItem('bt_errbook', JSON.stringify([{ k:'a', n:3, p:0, du:'2020-01-01', maj:5,
      q:'Une question ratée', options:['a','b','c','d'], correct:'a', tier:'moyen' }]));
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return typeof render === 'function'; }catch(e){ return false; } }, null, {timeout:20000});
  /* ===== ON ARRÊTE CE QUI RÉÉCRIT L'ÉCRAN TOUT SEUL =====
     L'échéance du jour se rafraîchit toutes les trente secondes. « Plus que
     21 h » devient « Plus que 20 h », la phrase change de largeur, peut passer
     sur deux lignes, et tout ce qui est en dessous glisse — SANS QUE L'IMAGE
     MESURÉE BOUGE D'UN PIXEL, puisque le texte y est effacé. On a donc une
     mise en page qui change sous une photo qui ne change pas : impossible de
     les synchroniser, il faut arrêter la source. Elle ne peint aucun fond,
     la neutraliser ne fausse rien. */
  await p.evaluate(()=>{ try{ window.rafraichirCompte = ()=>{}; }catch(e){} });
  /* La feuille qui rend TOUT le texte transparent sans rien déplacer. */
  await p.evaluate(()=>{
    const s = document.createElement('style'); s.id = 'acces-nu';
    s.textContent = '*{ color:transparent !important; text-shadow:none !important; -webkit-text-fill-color:transparent !important; }';
    document.head.appendChild(s); s.disabled = true;
  });
  /* On gèle les animations avant de photographier : une image prise en plein
     mouvement mesure le mouvement, pas l'écran. Même leçon que parite.js. */
  const figer = ()=> p.evaluate(()=>{ document.getAnimations().forEach(a=>{ try{ a.pause(); a.currentTime = 0; }catch(e){} }); });

  const py = `
import sys, json
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); px = im.load(); W, H = im.size
out = []
for b in json.load(open(sys.argv[2])):
    x1 = max(0, int(b[0]*2)); y1 = max(0, int(b[1]*2))
    x2 = min(W, int((b[0]+b[2])*2)); y2 = min(H, int((b[1]+b[3])*2))
    pires = None
    for y in range(y1, y2):
        for x in range(x1, x2):
            r, g, bl = px[x, y]
            if pires is None: pires = [[r,g,bl]]
            else: pires.append([r,g,bl])
    out.append(pires or [])
print(json.dumps(out))
`;
  fs.writeFileSync(TMP + '/fond.py', py);
  fs.writeFileSync(TMP + '/pareil.py', `
import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
print(0 if (a.size == b.size and ImageChops.difference(a, b).getbbox() is None) else 1)
`);
  /* ===== ON ATTEND QUE L'IMAGE SE POSE, ON NE PARIE PAS SUR UN DÉLAI =====
     Le moteur du verre lisse la position du décor derrière les cartes et
     converge vers sa valeur de repos — ce n'est pas une animation CSS, donc
     figer les horloges ne l'arrête pas. À 700 ms, ma première version
     photographiait un décor ENCORE DÉCALÉ : sous « En équipes, sur un seul
     écran », elle trouvait du brun de rocher là où le joueur voit du verre
     clair, et annonçait un contraste de 1,00 sur une carte parfaitement
     lisible. parite.js avait rencontré exactement ça et l'avait écrit ;
     j'aurais dû le lire avant de mesurer.
     On photographie donc en boucle jusqu'à obtenir deux images IDENTIQUES
     d'affilée : tant que ça bouge, ce n'est pas un écran, c'est un mouvement. */
  const poser = async (chemin)=>{
    const prec = chemin.replace('.png', '-prec.png');
    await p.screenshot({ path: prec });
    for(let k = 0; k < 14; k++){
      await p.waitForTimeout(320);
      await p.screenshot({ path: chemin });
      if(execSync('python3 ' + TMP + '/pareil.py ' + prec + ' ' + chemin).toString().trim() === '0') return true;
      fs.copyFileSync(chemin, prec);
    }
    return false;
  };

  const fautes = [], sansNom = [], petites = [], instables = [];
  let nTextes = 0, nCibles = 0;
  const seul = process.env.ECRAN;

  for(const [nom, aller] of ECRANS){
    if(seul && nom !== seul) continue;
    try{ await p.evaluate(aller); }catch(e){ fautes.push(nom + ' : impossible d\'ouvrir — ' + e.message.split('\n')[0]); continue; }
    await p.waitForTimeout(700);
    await figer();
    /* ===== ON ATTEND QUE LA MISE EN PAGE SE TAISE, PAS QU'UN DÉLAI PASSE =====
       Le piège qui m'a coûté le plus de temps sur ce banc, et il ne ressemble
       à rien : sur l'accueil, le bloc du verset arrive EN RETARD et pousse
       tout le contenu de 120 px vers le bas. Photo d'un côté, rectangles de
       l'autre, et mes boîtes tombaient entre deux cartes, sur le décor. J'y
       lisais du brun de rocher et j'annonçais un contraste de 1,00 sur des
       cartes de verre parfaitement lisibles — trois fois de suite, en croyant
       chaque fois avoir trouvé la cause.
       Aucun délai ne règle ça : rien ne dit quand une mise en page a fini de
       bouger. On relève donc le PLAN (chaque texte, sa position, sa largeur)
       jusqu'à ce que deux relevés d'affilée soient identiques. Tout le reste
       — photo comprise — vient après ce silence. */
    /* LE PLAN, C'EST LA GÉOMÉTRIE, PAS LES MOTS. Ma première version comparait
       aussi le contenu des textes — et le compte à rebours « Plus que 21 h »
       se met à jour toutes les trente secondes. Le banc déclarait l'écran
       instable alors que deux photos consécutives étaient identiques au pixel
       près : le mot avait changé, pas la mise en page. Et de toute façon le
       texte est invisible dans l'image qu'on mesure. */
    /* LE PLAN, C'EST LA VERTICALE, PAS LES MOTS NI LEUR LARGEUR. Deux versions
       fausses avant celle-ci :
         — comparer aussi le CONTENU : le compte à rebours « Plus que 21 h » se
           met à jour, le banc criait à l'instabilité pendant que deux photos
           consécutives étaient identiques AU PIXEL PRÈS ;
         — comparer aussi la LARGEUR : « 21 h » devient « 20 h », la largeur
           change, le texte étant centré sa gauche bouge aussi — et là encore
           l'image ne bouge pas d'un pixel, puisque le texte y est effacé.
       Ce qui compte pour mesurer un fond, c'est qu'aucune BANDE n'ait glissé
       verticalement. C'est ça qu'on vérifie, et l'image, elle, est comparée
       séparément au pixel près par poser(). */
    const plan = (r)=> JSON.stringify(r.textes.map(t=>[Math.round(t.y), Math.round(t.h)]));
    let relevé = await p.evaluate(RELEVER), calme = false;
    for(let k = 0; k < 12 && !calme; k++){
      await p.waitForTimeout(400);
      const suivant = await p.evaluate(RELEVER);
      if(plan(suivant) === plan(relevé)) calme = true;
      relevé = suivant;
    }
    if(!calme) instables.push(nom + ' (la mise en page bouge encore)');

    const img = TMP + '/' + nom.replace(/[^a-z]/gi,'') + '.png';
    await p.evaluate(()=>{ document.getElementById('acces-nu').disabled = false; });
    if(!await poser(img)) instables.push(nom + ' (l\'image ne se pose pas)');
    await p.evaluate(()=>{ document.getElementById('acces-nu').disabled = true; });
    /* Dernier contrôle : le plan n'a pas bougé pendant la photo. */
    if(plan(await p.evaluate(RELEVER)) !== plan(relevé)) instables.push(nom + ' (bougé pendant la photo)');
    nTextes += relevé.textes.length; nCibles += relevé.cibles.length;
    /* DESSINE=1 : les boîtes mesurées peintes sur l'écran, pour vérifier à
       l'œil qu'elles tombent bien sur les lettres. Une mesure dont on n'a
       jamais vu les boîtes est une mesure qu'on croit sur parole. */
    if(process.env.DESSINE){
      await p.evaluate(()=>{ document.getElementById('acces-nu').disabled = false; });
      await p.evaluate((bs)=>{
        document.querySelectorAll('.acces-boite').forEach(x=>x.remove());
        const d=document.createElement('div'); d.className='acces-boite';
        d.style.cssText='position:fixed;inset:0;z-index:99999;pointer-events:none';
        d.innerHTML = bs.map(b=>'<div style="position:absolute;left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;outline:1px solid rgba(255,0,0,0.9)"></div>').join('');
        document.body.appendChild(d);
      }, relevé.textes);
      await p.screenshot({ path: TMP + '/' + nom.replace(/[^a-z]/gi,'') + '-boites.png' });
      await p.evaluate(()=>{ document.querySelectorAll('.acces-boite').forEach(x=>x.remove());
                             document.getElementById('acces-nu').disabled = true; });
      console.log('    [image] ' + TMP + '/' + nom.replace(/[^a-z]/gi,'') + '-boites.png');
    }

    const boites = relevé.textes.map(t => [t.x, t.y, t.w, t.h]);
    fs.writeFileSync(TMP + '/boites.json', JSON.stringify(boites));
    const fonds = JSON.parse(execSync('python3 ' + TMP + '/fond.py ' + img + ' ' + TMP + '/boites.json',
                                      { maxBuffer: 1 << 28 }).toString());

    relevé.textes.forEach((t, i) => {
      const m = (t.col.match(/[\d.]+/g) || [0,0,0]).map(Number);
      if(m.length > 3 && m[3] < 0.5) return;            // texte volontairement effacé
      const lt = lum(m[0], m[1], m[2]);
      let pire = 99;
      for(const [r,g,b] of (fonds[i] || [])){ const v = ratio(lt, lum(r,g,b)); if(v < pire) pire = v; }
      if(pire === 99) return;
      const seuil = seuilDe(t.px, t.gras);
      if(process.env.DETAIL && pire < seuil){
        let pireRgb = null, pv = 99, idx = -1;
        (fonds[i] || []).forEach((c, k)=>{ const v = ratio(lt, lum(c[0],c[1],c[2])); if(v < pv){ pv = v; pireRgb = c; idx = k; } });
        /* La colonne et la ligne EXACTES du pire pixel, en pixels d'image :
           sans ça on discute de boîtes au lieu de regarder un point. */
        const x1 = Math.max(0, Math.trunc(t.x*2)), y1 = Math.max(0, Math.trunc(t.y*2));
        const larg = Math.min(786, Math.trunc((t.x+t.w)*2)) - x1;
        const px_ = x1 + (idx % larg), py_ = y1 + Math.floor(idx / larg);
        console.log('    [detail] ' + nom + ' « ' + t.t + ' »  texte ' + t.col
                  + '  pire fond rgb(' + pireRgb.join(',') + ')  ratio ' + pire.toFixed(2)
                  + '  au point ' + px_ + ',' + py_ + ' (image)  boîte ' + Math.round(t.x) + ',' + Math.round(t.y));
      }
      if(pire < seuil) fautes.push({ ecran:nom, t:t.t, pire:+pire.toFixed(2), seuil, px:Math.round(t.px), ou:t.ou });
    });

    for(const c of relevé.cibles){
      if(!c.nom) sansNom.push({ ecran:nom, ou:c.ou, role:c.role });
      if(c.w < CIBLE_MIN || c.h < CIBLE_MIN)
        petites.push({ ecran:nom, ou:c.ou, nom:c.nom, w:Math.round(c.w), h:Math.round(c.h) });
    }
  }
  await nav.close();

  console.log('  images : ' + TMP);
  console.log('  ' + nTextes + ' textes et ' + nCibles + ' cibles relevés sur ' + ECRANS.length + ' écrans\n');
  const mauvais = fautes.filter(f => typeof f === 'object');
  console.log('  CONTRASTE — ' + (mauvais.length ? mauvais.length + ' sous le seuil' : 'tout passe'));
  mauvais.sort((a,b)=>a.pire-b.pire).slice(0, 25).forEach(f =>
    console.log('    ' + String(f.pire).padStart(5) + ' (min ' + f.seuil + ')  ' + f.ecran.padEnd(17)
              + '« ' + f.t + ' »  ' + f.px + 'px  [' + f.ou + ']'));
  console.log('\n  CIBLES TROP PETITES (< ' + CIBLE_MIN + ' px) — ' + (petites.length || 'aucune'));
  petites.sort((a,b)=>(a.w*a.h)-(b.w*b.h)).slice(0, 25).forEach(c =>
    console.log('    ' + (c.w + 'x' + c.h).padStart(8) + '  ' + c.ecran.padEnd(17) + (c.nom || '(sans nom)').padEnd(22) + '[' + c.ou + ']'));
  console.log('\n  SANS NOM ACCESSIBLE — ' + (sansNom.length || 'aucune'));
  sansNom.slice(0, 25).forEach(c => console.log('    ' + c.ecran.padEnd(17) + '[' + c.ou + ']' + (c.role ? '  role=' + c.role : '')));
  if(instables.length) console.log('\n  ÉCRANS QUI NE SE POSENT JAMAIS (mesure douteuse) : ' + instables.join(', '));
  const ennuis = fautes.filter(f => typeof f === 'string');
  if(ennuis.length) console.log('\n  ÉCRANS NON OUVERTS :\n    ' + ennuis.join('\n    '));
  if(errs.length) console.log('\n  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | '));

  const ko = mauvais.length + petites.length + sansNom.length;
  console.log(ko === 0 ? '\n  OK — tout se lit, tout s\'atteint, tout se nomme'
                       : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
