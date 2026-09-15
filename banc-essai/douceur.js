/* ========= BANC « LE RECADRAGE SE POSE-T-IL EN DOUCEUR ? » =========
   « Pour l'ouverture du clavier je veux qu'il se règle parfaitement en douceur
   et pas de saccade rapide. »

   POURQUOI UN BANC DE PLUS. « camera.js » compte les IMAGES MORTES — les
   images où rien ne bouge alors que le geste n'est pas fini. C'était la bonne
   mesure pour le défaut d'alors (la fin qui rampe), et elle reste verte.
   Mais une image morte n'est qu'UNE façon de saccader. Un mouvement peut
   n'avoir aucune image morte et rester brutal :
     — s'il DÉMARRE à pleine vitesse (le suivi amorti avale 26 % de l'écart dès
       la première image : sur 75 px de course, 19 px d'un coup, à l'arrêt) ;
     — s'il DONNE UN COUP À LA FIN (la queue pose les 5 derniers pixels d'un
       seul bloc juste après une image qui n'en faisait que 1,7).
   Les deux se voient, aucun des deux ne fabrique d'image morte. Ce banc-ci
   regarde donc le PROFIL DE VITESSE, pas les trous.

   CE QU'ON MESURE, sur la suite des pas (pixels avalés par image) :
     départ   pas[0] / plus grand pas — 1,00 = le geste commence à sa vitesse
              maximale, donc d'un coup, depuis l'arrêt.
     arrivée  dernier pas / médiane des trois précédents — au-dessus de 1, le
              geste ACCÉLÈRE en se posant.
     à-coup   la plus forte REMONTÉE de vitesse APRÈS le sommet, rapportée au
              plus grand pas.
   UN GESTE BIEN FORMÉ MONTE, CULMINE, DESCEND — une seule bosse. Son à-coup
   vaut donc exactement zéro. J'avais d'abord mesuré « le plus grand écart de
   vitesse entre deux images », et c'était FAUX : cet écart est forcément grand
   au DÉPART d'un mouvement qui accélère, c'est-à-dire précisément quand tout
   va bien. Aucun ressort ne pouvait passer. La forme se juge sur la remontée
   après le sommet, pas sur l'amplitude des variations.
   Relevé en machine sur les deux lois, course de 75 px :
     suivi amorti  départ 1,00  arrivée 2,11  à-coup 0,17
     ressort       départ 0,40  arrivée 0,34  à-coup 0,00

   LE CLAVIER MONTE PAR PALIERS. « camera.js » réduit la fenêtre en une seule
   fois ; iOS ne fait pas ça, il la réduit en plusieurs images — et c'est
   justement là que le suivi doit rester lisse. On reproduit les paliers.

   Usage : node banc-essai/douceur.js [url] [bridage]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const BRIDE = Number(process.argv[3] || 4);
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CAS = [
  ['groupe', "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'},{name:'D'},{name:'E'}]; state.screen='setup'; render();", '.team-row input'],
  ['plein',  "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'},{name:'D'},{name:'E'},{name:'F'},{name:'G'},{name:'H'}]; state.screen='setup'; render();", '.team-row:last-of-type input'],
];
/* Seuils. Ils disent « ça se pose », pas « c'est parfait ».
   départ  ≤ 0,60 — la première image ne fait pas plus de six dixièmes du pas
                    maximal : on voit le geste partir, on ne le voit pas sauter.
                    Simulé à 0,40 ; la marge couvre le jeu des images réelles.
   arrivée ≤ 1,10 — la dernière image ne va pas plus vite que les précédentes.
   à-coup  ≤ 0,12 — le geste n'a qu'une bosse. Zéro en simulation ; la marge
                    couvre une image en retard, pas un vrai coup (0,17 mini
                    sur l'ancienne loi). */
const S_DEPART = 0.60, S_ARRIVEE = 1.10, S_ACOUP = 0.12;
const med = a => { const b=[...a].sort((x,y)=>x-y); return b.length? b[b.length>>1] : 0; };
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: BRIDE });
  let ko = 0;
  for (const [nom, prep, sel] of CAS) {
    await p.setViewportSize({ width:393, height:852 });
    await p.evaluate(s=>{ new Function(s)(); }, prep);
    await p.waitForTimeout(1300);
    const trouve = await p.evaluate((s)=>{ const e=document.querySelector(s); if(!e) return false; e.focus(); return true; }, sel);
    if(!trouve){ console.log('  ' + nom + ' : pas de champ'); ko++; continue; }
    await p.waitForTimeout(150);
    const cap = p.evaluate(()=> new Promise(res=>{
      const app = document.getElementById('app');
      const rel = []; const t0 = performance.now();
      const tic = ()=>{ rel.push([+(performance.now()-t0).toFixed(1), +app.scrollTop.toFixed(2)]);
        if(performance.now()-t0 < 2000) requestAnimationFrame(tic); else res(rel); };
      requestAnimationFrame(tic);
    }));
    /* LE CLAVIER MONTE PAR PALIERS, comme sur iOS. */
    for (const h of [780, 700, 630, 575, 540, 516]) { await p.setViewportSize({ width:393, height:h }); await p.waitForTimeout(40); }
    const rel = await cap;
    /* Découpage en gestes, identique à camera.js : des suites d'images où la
       page bouge, séparées par au moins 100 ms d'immobilité. */
    const mouv = []; let cur = null;
    for (let i=1;i<rel.length;i++){
      const d = Math.abs(rel[i][1]-rel[i-1][1]);
      if (d > 0.01){ if(!cur){ cur = { i0:i-1, i1:i, pas:[] }; mouv.push(cur); } cur.i1 = i; cur.pas.push(d); }
      else if (cur && rel[i][0] - rel[cur.i1][0] > 100) cur = null;
    }
    /* MÊME CORRECTION QUE DANS « clavier » : ne pas bouger n'est un défaut que
       si le champ en avait besoin. On le regarde au lieu de le supposer. */
    const vu = await p.evaluate((s)=>{ const e=document.querySelector(s); const r=e.getBoundingClientRect();
      return { haut:+r.top.toFixed(1), bas:+r.bottom.toFixed(1), vvh:Math.round(visualViewport.height) }; }, sel);
    const air = +(vu.vvh - vu.bas).toFixed(1);
    if(!mouv.length){
      if(vu.haut >= 0 && air >= 12){
        console.log('  ' + nom.padEnd(7) + ' : rien \u00e0 recadrer, ' + air + ' px d\'air au-dessus du clavier');
      } else {
        console.log('  ' + nom.padEnd(7) + ' : la page ne bouge pas ET le champ est cach\u00e9 (air ' + air + ' px)'); ko++;
      }
      continue;
    }
    if(vu.haut < 0 || air < 12){ console.log('  ' + nom.padEnd(7) + ' : le champ n\'est pas d\u00e9gag\u00e9 (air ' + air + ' px)'); ko++; }
    let n = 0;
    for (const m of mouv){
      n++;
      const course = Math.abs(rel[m.i1][1] - rel[m.i0][1]);
      /* LES TOUT PETITS GESTES NE VEULENT RIEN DIRE, et le seuil était trop
         bas. Les trois critères ont été calibrés sur des courses de 45 à
         75 px ; sous une vingtaine de pixels, c'est la QUANTIFICATION qui
         parle, pas le mouvement. Mesuré sur une course de 12 px en six
         images : pas 3 2 2 2 2 1 — « départ 1,00 », donc condamné, alors que
         l'écart entre le premier pas et le suivant est d'UN pixel. Aucun
         doigt ne sent ça ; un défileur ne connaît pas le demi-pixel.
         On ne juge donc le rythme qu'à partir de 20 px — le même plancher que
         dans « clavier », pour que les deux bancs disent la même chose. */
      if (course < 20) { console.log('  ' + nom.padEnd(7) + ' geste ' + n + ' : ' + course.toFixed(0) + ' px — trop court pour juger (air ' + air + ' px)'); continue; }
      /* Le CORPS du geste, c'est tout sauf la dernière image : celle-ci se
         pose sur la cible et vaut ce qui restait, elle ne dit rien du rythme.
         C'est « arrivée » qui la juge, et elle seule. */
      const pas = m.pas, corps = pas.slice(0, -1), mx = Math.max(...corps);
      const depart  = corps[0] / mx;
      const avant   = pas.slice(-4, -1);
      const arrivee = avant.length ? pas[pas.length-1] / Math.max(0.01, med(avant)) : 0;
      let som = 0;
      for (let i=0;i<corps.length;i++) if (corps[i] > corps[som]) som = i;
      let acoup = 0;
      for (let i=som+1;i<pas.length;i++) acoup = Math.max(acoup, (pas[i]-pas[i-1]) / mx);
      acoup = Math.max(0, acoup);
      const mauvais = (depart > S_DEPART) || (arrivee > S_ARRIVEE) || (acoup > S_ACOUP);
      if (mauvais) ko++;
      console.log('  ' + nom.padEnd(7) + ' geste ' + n + ' : ' + course.toFixed(0) + ' px en ' + (rel[m.i1][0]-rel[m.i0][0]).toFixed(0) + 'ms'
        + ' | départ ' + depart.toFixed(2) + ' | arrivée ' + arrivee.toFixed(2) + ' | à-coup ' + acoup.toFixed(2)
        + (mauvais ? '   ← ' : '   ')
        + '\n           pas ' + pas.map(x=>x.toFixed(1)).join(' '));
      if (depart  > S_DEPART)  console.log('           ↳ départ brutal : la 1re image fait ' + (depart*100).toFixed(0) + ' % du pas maximal (max ' + (S_DEPART*100) + ' %)');
      if (arrivee > S_ARRIVEE) console.log('           ↳ coup à l\'arrivée : la dernière image fait ' + arrivee.toFixed(2) + '× les précédentes (max ' + S_ARRIVEE + ')');
      if (acoup > S_ACOUP) console.log('           ↳ le geste REPART après avoir ralenti : +' + (acoup*100).toFixed(0) + ' % du pas maximal (max ' + (S_ACOUP*100) + ' %)');
    }
    await p.waitForTimeout(500);
  }
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
