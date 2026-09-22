/* ====== BANC « LE LIBELLÉ NE DISPARAÎT JAMAIS EN CHANGEANT DE PUCE » ======
   « Lorsque je change de bouton, j'ai l'impression qu'il y a un petit effet
   bizarre, c'est léger. »

   CE QUE C'ÉTAIT, MESURÉ IMAGE PAR IMAGE. Sur la puce QUI PART, le texte allait
   du blanc à l'encre pendant que son fond allait du rouge au crème. Les deux
   courbes de clarté se croisaient au milieu — et au croisement elles étaient
   ÉGALES : contraste 1,00. Le mot n'était pas pâle, il n'existait plus.

   ON NE PEUT PAS ÉVITER LE CROISEMENT — un texte clair sur fond sombre qui
   devient un texte sombre sur fond clair doit bien passer par là. On le
   FRANCHIT donc d'un coup, au bon instant, au lieu de s'y attarder.

   ===== POURQUOI CE BANC A ÉTÉ RÉÉCRIT : IL REGARDAIT LA MAUVAISE SURFACE =====
   Sa première version lisait --glass-tint, la variable qui peint le fond de la
   puce AU REPOS. C'était juste à l'époque. Depuis, le rouge n'arrive plus par
   un fondu de cette variable : il arrive par une COUCHE ::after qui grandit
   (@keyframes remplitIn), et --glass-tint ne bascule qu'à la toute fin, sous
   la couche, quand plus personne ne la voit.
   Le banc mesurait donc « blanc sur crème » pendant les soixante-six
   millisecondes où le joueur, lui, voit « blanc sur rouge plein ». Il criait
   1,06 sur une app parfaitement lisible, et il l'aurait fait quoi qu'on
   corrige. Un banc qui se trompe de surface est pire qu'un banc absent : il
   fait réparer ce qui n'est pas cassé.

   CE QU'IL MESURE MAINTENANT : LES PIXELS RÉELLEMENT PEINTS.
   Deux passes, avec toutes les horloges d'animation mises en PAUSE juste après
   le clic puis déplacées à la main — donc deux passes rigoureusement alignées.
     passe A   aucune injection : on lit la couleur du libellé à chaque instant.
     passe B   le libellé est rendu transparent AVANT le clic : on photographie
               le fond seul, exactement sous les glyphes du titre.
   Contraste = couleur du libellé (passe A) contre le PIRE pixel de son propre
   fond (passe B). Le pire pixel, pas le moyen : pendant que le front du
   remplissage traverse le mot, la moitié des lettres est encore sur du crème.

   RELEVÉ, creux de contraste du libellé contre les pixels sous lui :
       celle qui PART     4,02       celle qui ARRIVE   3,90
   Sous 1,5 le mot n'est pas pâle, il n'existe plus. Au-dessus de 3, il se lit.
   Usage : node banc-essai/lisible.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const SEUIL = 3.0;
const FIN = 420, PAS = 10;
const PART = '30\\s*s', ARRIVE = 'Sans';

const cn = (v)=>{ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
const lum = (r,g,b)=> 0.2126*cn(r) + 0.7152*cn(g) + 0.0722*cn(b);
const ratio = (a,b)=> (Math.max(a,b)+0.05) / (Math.min(a,b)+0.05);

async function ouvrir(nav){
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.evaluate(()=>{ state.mode='solo'; state.screen='setup'; render(); });
  await p.waitForTimeout(1300);
  return p;
}
/* Le clic, puis l'arrêt immédiat de toutes les horloges. Le garde-fou de
   basculerChoix() retirerait les classes passagères au bout de 360 ms : on le
   désamorce, sinon le mouvement s'évapore pendant qu'on le photographie. */
async function cliquerEtGeler(p){
  await p.evaluate((ARRIVE)=>{
    const c=[...document.querySelectorAll('.chip')].find(x=>new RegExp(ARRIVE).test(x.textContent));
    c.click();
    getComputedStyle(c).color;
    document.querySelectorAll('.chip').forEach(x=>clearTimeout(x._remplirT));
    window.__anims = document.getAnimations();
    window.__anims.forEach(a=>{ try{ a.pause(); }catch(e){} });
  }, ARRIVE);
}
const deplacer = (p,t)=> p.evaluate((t)=>{ window.__anims.forEach(a=>{ try{ a.currentTime=t; }catch(e){} }); }, t);

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const errs = [];

  /* ---------- PASSE A : la couleur du libellé, sans rien injecter ---------- */
  const pa = await ouvrir(nav);
  pa.on('pageerror', e=>errs.push(e.message));
  await cliquerEtGeler(pa);
  const couleurs = [];
  for(let t=0; t<=FIN; t+=PAS){
    await deplacer(pa, t);
    couleurs.push(await pa.evaluate(([PART,ARRIVE])=>{
      const ch=[...document.querySelectorAll('.chip')];
      const g=(re)=>{ const c=ch.find(x=>new RegExp(re).test(x.textContent)); return getComputedStyle(c).color; };
      return [g(PART), g(ARRIVE)];
    }, [PART, ARRIVE]));
  }
  await pa.context().close();

  /* ---------- PASSE B : le fond seul, sous les glyphes du titre ---------- */
  const pb = await ouvrir(nav);
  pb.on('pageerror', e=>errs.push(e.message));
  await pb.evaluate(()=>{
    const s=document.createElement('style');
    s.textContent='.chip, .chip *{ color:transparent !important; text-shadow:none !important; }';
    document.head.appendChild(s);
  });
  const rects = await pb.evaluate(([PART,ARRIVE])=>{
    const ch=[...document.querySelectorAll('.chip')];
    const r=(re)=>{ const c=ch.find(x=>new RegExp(re).test(x.textContent));
      const n=[...c.childNodes].find(n=>n.nodeType===3 && n.textContent.trim());
      const g=document.createRange(); g.selectNodeContents(n); const b=g.getBoundingClientRect();
      return { x:b.x, y:b.y, width:b.width, height:b.height }; };
    return [r(PART), r(ARRIVE)];
  }, [PART, ARRIVE]);
  await cliquerEtGeler(pb);
  const fonds = [];
  for(let t=0; t<=FIN; t+=PAS){
    await deplacer(pb, t);
    const paire = [];
    for(const rc of rects){
      const buf = await pb.screenshot({ clip:rc });
      paire.push(await pb.evaluate(async (b64)=>{
        const bin=atob(b64), u=new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
        const bmp=await createImageBitmap(new Blob([u],{type:'image/png'}));
        const cv=new OffscreenCanvas(bmp.width,bmp.height), g=cv.getContext('2d');
        g.drawImage(bmp,0,0);
        const d=g.getImageData(0,0,bmp.width,bmp.height).data;
        const out=[]; for(let i=0;i<d.length;i+=4) out.push([d[i],d[i+1],d[i+2]]);
        return out;
      }, buf.toString('base64')));
    }
    fonds.push(paire);
  }
  await pb.context().close();
  await nav.close();

  /* ---------- Le croisement des deux passes ---------- */
  const creux = [99, 99], quand = [0, 0];
  for(let i=0; i<couleurs.length; i++){
    for(let k=0; k<2; k++){
      const m=(couleurs[i][k].match(/[\d.]+/g)||[0,0,0]).map(Number);
      if(m.length>3 && m[3]===0) continue;                 // libellé transparent : rien à lire
      const lt=lum(m[0],m[1],m[2]);
      let pire=99;
      for(const [r,g,b] of fonds[i][k]){ const v=ratio(lt, lum(r,g,b)); if(v<pire) pire=v; }
      if(pire < creux[k]){ creux[k]=pire; quand[k]=i*PAS; }
    }
  }

  let ko = 0;
  const v = (nom, val, ms)=>{ const bon = val >= SEUIL; if(!bon) ko++;
    console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(38) + 'creux ' + val.toFixed(2) +
                ' à ' + String(ms).padStart(3) + ' ms  (minimum ' + SEUIL + ')'); };
  v("la puce qui PART reste lisible",   creux[0], quand[0]);
  v("la puce qui ARRIVE reste lisible", creux[1], quand[1]);
  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  console.log(ko === 0 ? '\n  OK — le mot reste lisible d\'un bout à l\'autre du changement'
                       : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
