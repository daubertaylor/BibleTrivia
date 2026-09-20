/* ============ BANC « UN MESSAGE D'ERREUR NE DÉPLACE RIEN » ============
   « Lorsque le code est invalide, il ne faut pas que ça décale le reste. »
   On relève la position de CHAQUE élément de l'écran « Rejoindre » avant et
   après l'apparition du message, sur trois largeurs — dont la plus étroite,
   où le plus long message passe à deux lignes.
   Usage : node banc-essai/code-invalide.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ECRANS=[['iPhone SE',375,667],['iPhone 15',393,852],['Xiaomi',360,780]];
const MESSAGES=['Code invalide.','Code incorrect.','Aucune partie trouvée pour ce code.',
                'La connexion au salon a échoué. Réessaie.','Impossible de rejoindre ce salon. Réessaie.'];
(async()=>{
  const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  let ko=0, pire=0, quoi='';
  for(const [nom,w,h] of ECRANS){
    const ctx=await nav.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
    const p=await ctx.newPage();
    await p.addInitScript(()=>{localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor'}));localStorage.setItem('bt_fs_hint','1');});
    await p.goto(URL);
    await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:20000});
    await p.waitForTimeout(800);
    const r = await p.evaluate(async (MESSAGES)=>{
      const releve = ()=>{
        const out={};
        for(const sel of ['.app-header','.online-hero','.code-input','.btn-primary','.online-hero-title','.online-hero-sub']){
          const e=document.querySelector(sel); if(e){ const b=e.getBoundingClientRect(); out[sel]=[b.top,b.left,b.width,b.height]; }
        }
        return out;
      };
      /* ON ATTEND QUE L'ÉCRAN SOIT POSÉ. Première version : 250 ms. Le
         témoin bougeait alors de 17 px sans qu'aucun message n'apparaisse —
         je mesurais l'animation d'entrée. On attend donc que deux relevés
         consécutifs soient identiques : c'est la seule définition honnête de
         « l'écran ne bouge plus ». */
      const poser = async ()=>{
        let a = releve();
        for(let i=0;i<40;i++){
          await new Promise(r=>setTimeout(r,80));
          const b = releve();
          if(JSON.stringify(a)===JSON.stringify(b)) return b;
          a = b;
        }
        return a;
      };
      net.error=''; state.screen='online-join'; render();
      const avant = await poser();
      /* TÉMOIN. Avant d'accuser le message, on refait le MÊME rendu sans
         message : si l'écran bouge déjà tout seul, c'est l'animation d'entrée
         qu'on mesure, pas le bandeau. */
      net.error=''; render(); const temoinR = await poser();
      let temoin=0;
      for(const k of Object.keys(avant)) if(temoinR[k])
        temoin=Math.max(temoin, Math.abs(avant[k][0]-temoinR[k][0]), Math.abs(avant[k][1]-temoinR[k][1]));
      const pires=[];
      for(const m of MESSAGES){
        net.error=m; render(); const apres = await poser();
        let mx=0, el='';
        for(const k of Object.keys(avant)){
          if(!apres[k]) continue;
          const d=Math.max(Math.abs(avant[k][0]-apres[k][0]), Math.abs(avant[k][1]-apres[k][1]));
          if(d>mx){ mx=d; el=k; }
        }
        pires.push({m, mx:Math.round(mx*10)/10, el});
        net.error=''; render(); await poser();
      }
      return { pires, temoin:Math.round(temoin*10)/10 };
    }, MESSAGES);
    console.log('  ' + nom.padEnd(11) + 'témoin (même rendu, sans message) : ' + r.temoin + ' px');
    const rr=r.pires; rr.sort((a,b)=>b.mx-a.mx);
    const x=rr[0];
    if(x.mx > pire){ pire=x.mx; quoi=nom+' · '+x.m+' · '+x.el; }
    const etat = x.mx <= 0.6 ? 'OK' : 'KO';
    if(x.mx > 0.6) ko++;
    console.log('  ' + nom.padEnd(11) + etat + '  plus grand déplacement ' + String(x.mx).padStart(6) + ' px' + (x.mx>0.6 ? '  (' + x.el + ' · « ' + x.m + ' »)' : ''));
    await ctx.close();
  }
  console.log('\n  pire cas : ' + pire + ' px' + (quoi?'  — '+quoi:''));
  console.log(ko ? '  ' + ko + ' écran(s) en défaut' : '  OK — rien ne bouge quand le message apparaît');
  await nav.close();
  process.exit(ko?1:0);
})();
