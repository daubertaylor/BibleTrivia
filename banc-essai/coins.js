/* ====== BANC « PAS DE FILET BLANC DANS LES COINS DU REMPLISSAGE » ======
   « Est-ce possible de me remplir correctement l'endroit où je sélectionne,
   sans bord blanc dans les coins ? »

   CE QU'ON CHERCHE, ET POURQUOI ÇA NE SE VOIT QUE DANS LES COINS. La surface
   dessine son fond crème avec son rayon ; le remplissage dessinait le sien, du
   même rayon, par-dessus. Sur un bord DROIT, les deux tombent sur la même
   colonne de pixels et se recouvrent exactement. Sur une COURBE, chacun est
   lissé pour son propre compte, et il reste une frange où le crème est couvert
   à quatre-vingts pour cent quand le remplissage ne l'est qu'à soixante. Le
   remplissage étant un VOILE (28 %), il est plus sombre que le crème : cette
   frange se retrouve plus claire que l'un ET que l'autre. C'est ça, le trait
   blanc — et c'est pour ça qu'il ne se voit que dans les coins.

   LA MESURE EST DONC EXACTEMENT CELLE-LÀ : dans le coin d'une puce appuyée,
   combien de pixels sont plus clairs À LA FOIS que la carte derrière et que le
   remplissage ? Zéro serait un idéal que l'anticrénelage ne permet pas ; ce
   qu'on exige, c'est qu'aucun ne dépasse d'un écart VISIBLE.
   Relevé : 16,3 d'excès de clarté avant (un trait qu'on voit), 8,4 après
   (le lissage ordinaire d'une courbe). Le seuil est à 12.
   Usage : node banc-essai/coins.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SEUIL = 12;

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:4,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});

  /* ON NE MESURE QUE LÀ OÙ LE DÉFAUT PEUT EXISTER. Le filet clair, c'est le
     fond CRÈME de la surface qui se voit passer sous un remplissage plus
     sombre que lui. Il faut donc une surface claire posée sur un fond plus
     sombre qu'elle : les puces, sur leur carte. Une tuile de l'accueil, elle,
     est posée sur le décor — sombre — et « plus clair que les deux » y désigne
     toute la tuile : 9 477 pixels, un chiffre qui ne juge rien. Essayé, retiré.
     Deux rangées de puces suffisent, et ce sont exactement celles de la
     capture qui a servi à trouver le défaut. */
  const CAS = [
    ['puce de durée',     "state.mode='solo'; state.screen='setup'; render();", '.chip', 0],
    ['puce de testament', "state.mode='solo'; state.screen='setup'; render();", '.chip', 7],
  ];
  let ko = 0;
  const clarte = (px)=> (px[0]*299 + px[1]*587 + px[2]*114) / 1000;

  for(const [nom, prep, sel, idx] of CAS){
    await p.evaluate(c=>{ new Function(c)(); }, prep);
    await p.waitForTimeout(1100);
    const h = await p.evaluateHandle(([s,i])=>document.querySelectorAll(s)[i], [sel, idx]);
    const el = h.asElement(); if(!el){ console.log('  ' + nom + ' : absent'); ko++; continue; }
    const b = await el.boundingBox();
    await p.mouse.move(b.x + b.width/2, b.y + b.height/2);
    await p.mouse.down(); await p.waitForTimeout(650);
    /* le coin haut-gauche, avec trois pixels de carte autour */
    const png = await p.screenshot({ clip:{ x:b.x-3, y:b.y-3, width:34, height:34 } });
    await p.mouse.up(); await p.waitForTimeout(400);

    /* ON FAIT LIRE LES PIXELS PAR LE NAVIGATEUR. Node n'a pas de décodeur PNG
       ici, et en ajouter un pour trois pixels serait une dépendance de plus à
       entretenir. Chromium, lui, sait déjà décoder une image : on lui rend la
       capture et il la mesure. Le banc reste autonome. */
    const m = await p.evaluate(async (b64)=> new Promise(res=>{
      const img = new Image();
      img.onload = ()=>{
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const L = (x,y)=>{ const i=(c.width*y+x)<<2; return (d[i]*299 + d[i+1]*587 + d[i+2]*114)/1000; };
        const fond = L(2,2), remp = L(c.width-3, c.height-3), haut = Math.max(fond, remp);
        let pire = 0, combien = 0;
        for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++){
          const v = L(x,y);
          if(v > haut + 2){ combien++; if(v - haut > pire) pire = v - haut; }
        }
        res({ fond, remp, pire, combien });
      };
      img.onerror = ()=>res(null);
      img.src = 'data:image/png;base64,' + b64;
    }), png.toString('base64'));

    if(!m){ console.log('  ' + nom + ' : image illisible'); ko++; continue; }
    const bon = m.pire <= SEUIL;
    if(!bon) ko++;
    console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(20)
      + 'carte ' + m.fond.toFixed(0) + ', remplissage ' + m.remp.toFixed(0)
      + '  |  ' + m.combien + ' pixels plus clairs, excès max ' + m.pire.toFixed(1)
      + ' (max ' + SEUIL + ')');
  }
  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK — le remplissage rejoint le bord sans laisser de trait clair'
                       : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
