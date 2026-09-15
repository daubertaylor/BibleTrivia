/* ====== BANC « UNE PUCE CHOISIE N'A PAS DE HALO » ======
   « Lorsque je sélectionne, c'est toujours pas plein dans les bords. Règle ça
   une fois pour toutes, je commence à en avoir marre de répéter. »

   REPROCHE RÉPÉTÉ QUATRE FOIS, ET J'AI CHERCHÉ DEDANS LES QUATRE FOIS. Le
   remplissage était pourtant parfait : mesuré au pixel sur la capture du
   téléphone ET en machine, le dernier pixel avant le bord vaut exactement la
   couleur de fond, la largeur est identique à celle d'une puce non choisie
   (314 px contre 314) et la forme du coin identique à un pixel près.
   LE DÉFAUT ÉTAIT DEHORS :
       puce choisie   rgba(120,30,14,0.16) 0 1px 2px,
                      rgba(214,60,34,0.26) 0 8px 20px      <- halo corail
       puce normale   rgba(0,0,0,0) 0 0 0 1px              <- rien
   Vingt pixels de flou corail, décalés vers le bas. Contre le beige de la
   carte, ça brouille le bord : la puce ne se termine pas net, elle bave. Et
   c'est, littéralement, une bordure de couleur.

   CE QU'ON VÉRIFIE, ET POURQUOI C'EST STRUCTUREL. On ne mesure pas « le halo
   est-il assez discret » — on vérifie que la puce CHOISIE a exactement le même
   bord que ses sœurs non choisies. Seule sa couleur de fond doit les
   distinguer. C'est vrai de toutes les rangées, et ça le restera pour celles
   qu'on ajoutera : une règle qui remettrait une puce dans le rôle « pleine et
   colorée » se ferait voir tout de suite.
   Usage : node banc-essai/halo.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:3, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'T',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  let ko = 0;
  const ECRANS = [
    ['réglages de la partie', "state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render();"],
    ['parcours',              "state.screen='parcours'; render();"],
  ];
  for (const [ecran, prep] of ECRANS) {
    try{ await p.evaluate(s=>{ new Function(s)(); }, prep); }catch(e){}
    await p.waitForTimeout(900);
    const r = await p.evaluate(()=>{
      const out=[];
      const groupes={};
      for(const e of document.querySelectorAll('.chip, .len-chip, .streak-chip')){
        const g = e.dataset.group || e.dataset.rgroup || e.className.split(' ')[0];
        (groupes[g] = groupes[g] || []).push(e);
      }
      for(const g in groupes){
        const q = groupes[g];
        const choisie = q.find(x=>x.classList.contains('active') || x.classList.contains('sel') || x.classList.contains('hot'));
        const libre   = q.find(x=>x !== choisie);
        if(!choisie || !libre) continue;
        out.push({ groupe:g, n:q.length,
                   ombreChoisie: getComputedStyle(choisie).boxShadow,
                   ombreLibre:   getComputedStyle(libre).boxShadow,
                   fondChoisie:  getComputedStyle(choisie).getPropertyValue('--glass-tint').trim(),
                   fondLibre:    getComputedStyle(libre).getPropertyValue('--glass-tint').trim() });
      }
      return out;
    });
    if(!r.length){ console.log('  ' + ecran + ' : aucune rangée avec une puce choisie'); continue; }
    for(const o of r){
      const bon = o.ombreChoisie === o.ombreLibre;
      const change = o.fondChoisie !== o.fondLibre;
      if(!bon || !change) ko++;
      console.log('  ' + (bon && change ? 'OK ' : 'KO ') + (ecran + ' / ' + o.groupe).padEnd(34)
        + o.n + ' puces   fond ' + (change ? 'différent' : 'IDENTIQUE') + '   bord ' + (bon ? 'identique' : 'DIFFÉRENT'));
      if(!bon){
        console.log('           choisie : ' + o.ombreChoisie);
        console.log('           libre   : ' + o.ombreLibre);
        console.log('           ↳ la puce choisie porte un bord à elle : c\'est ce qui se lit comme « pas plein dans les bords »');
      }
      if(!change) console.log('           ↳ le fond ne change pas : on ne voit pas ce qui est choisi');
    }
  }
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,2).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
