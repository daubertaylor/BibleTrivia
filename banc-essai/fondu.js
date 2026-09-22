/* ====== BANC « LE BOUTON QUITTÉ SE FOND, IL NE CLAQUE PAS » ======
   « Fluidifie la transition lorsque je choisis un autre bouton : si je change
   la durée de la partie et que l'autre bouton redevient blanc, je veux que la
   transition se fasse parfaitement bien. »

   CE QU'ON MESURE, ET POURQUOI C'EST UN COMPTAGE. Une transition qui manque ne
   se voit pas dans une durée — elle se voit dans le NOMBRE D'ÉTAPES. Un fond
   qui passe du rouge au blanc en une seule image ne donne que deux valeurs
   distinctes ; un fondu en donne une dizaine. On compte donc les valeurs
   distinctes prises par la couleur du bouton QUITTÉ pendant les huit dixièmes
   de seconde qui suivent le tap.

   LE TEXTE, LUI, A LE DROIT DE CLAQUER. Ma première version exigeait que le
   fond ET le texte se fondent, et qu'ils finissent ensemble. Ça fabriquait le
   défaut que Taylor a vu : le texte va du blanc à l'encre pendant que le fond
   va du rouge au crème, et au milieu les deux clartés sont ÉGALES — contraste
   1,00, le mot disparaît. Un texte clair sur fond sombre qui devient sombre
   sur fond clair DOIT passer par là ; le bon geste est de FRANCHIR d'un coup,
   au bon instant. Sa lisibilité a son propre banc, et une mesure bien plus
   juste que « en combien d'étapes » : banc-essai/lisible.js.

   ===== POURQUOI CE BANC A ÉTÉ RÉÉCRIT : IL COMPTAIT SUR LA MAUVAISE COUCHE =====
   Il lisait --glass-tint, et il a fini par exiger le contraire de ce que le
   jeu fait exprès. Le rouge ne part plus par un fondu de cette variable : il
   part par l'OPACITÉ d'une couche ::after (@keyframes remplitOut), et
   --glass-tint, elle, doit lâcher IMMÉDIATEMENT — sinon elle referait sous la
   couche le fondu uniforme qu'on venait d'enlever, et on le verrait dépasser
   aux quatre coins (index.html, « LA TEINTE DE VERRE ARRIVE QUAND LE
   REMPLISSAGE A FINI, ET REPART TOUT DE SUITE »).
   Le banc voyait donc 2 étapes et criait « le fond CLAQUE » sur une app dont
   le fond se fond parfaitement. Relevé de la couleur RÉELLEMENT COMPOSÉE :
       --glass-tint          2 étapes   (voulu, instantané)
       opacité de la couche 16 étapes
       COULEUR COMPOSÉE     16 étapes   rgb(236,60,26) -> rgb(252,248,241)
                                        en ~250 ms, sans marche visible

   CE QU'IL MESURE MAINTENANT : la couleur que l'œil reçoit, c'est-à-dire la
   teinte de verre AVEC la couche rouge par-dessus, à son opacité de l'instant.
   Si un jour la couche perd son animation, ou la teinte sa déclaration
   @property, ou qu'un composant oublie sa transition, le compte s'effondre à
   deux et le banc le dit.
   Usage : node banc-essai/fondu.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const S_ETAPES = 6;     // sous six valeurs distinctes, ce n'est pas un fondu
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'T',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  let ko = 0;
  for (const [nom, groupe] of [['durée de la partie','len'], ['chrono','tmr'], ['testament','theme']]) {
    await p.evaluate(()=>{ state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render(); });
    await p.waitForTimeout(900);
    const pos = await p.evaluate((g)=>{
      const q=[...document.querySelectorAll('.chip[data-group="'+g+'"]')];
      if(q.length < 2) return null;
      const c=(x)=>{ const r=x.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; };
      return { a:c(q[0]), b:c(q[1]) };
    }, groupe);
    if(!pos){ console.log('  ' + nom + ' : moins de deux puces'); ko++; continue; }
    // on sélectionne la première, puis on la QUITTE pour la seconde
    await p.mouse.move(pos.a.x, pos.a.y); await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up();
    await p.waitForTimeout(900);
    const cap = p.evaluate((g)=> new Promise(res=>{
      const rel=[]; const t0=performance.now();
      const q=[...document.querySelectorAll('.chip[data-group="'+g+'"]')];
      const tic=()=>{ const cs=getComputedStyle(q[0]), ap=getComputedStyle(q[0],'::after');
        rel.push([+(performance.now()-t0).toFixed(0),
                  (cs.getPropertyValue('--glass-tint')||'').trim(), cs.color,
                  ap.opacity, ap.backgroundColor, ap.transform]);
        if(performance.now()-t0<800) requestAnimationFrame(tic); else res(rel); };
      requestAnimationFrame(tic); }), groupe);
    await p.mouse.move(pos.b.x, pos.b.y); await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up();
    const rel = await cap;

    /* LA COULEUR QUE L'ŒIL REÇOIT = teinte de verre, puis couche rouge dessus.
       La couche n'est comptée que si elle couvre vraiment le point observé :
       en partant elle garde scale(1) — elle se fond, elle ne rétrécit pas. */
    const n=(s)=>(s.match(/[\d.]+/g)||[0,0,0]).map(Number);
    const echelle=(t)=>{ const m=n(t); return (t==='none'||m.length<4) ? 1 : m[0]; };
    const compose=(r)=>{ const base=n(r[1]), lay=n(r[4]);
      const o = (echelle(r[5]) >= 0.99) ? (parseFloat(r[3])||0) : 0;
      return [0,1,2].map(i=>Math.round(lay[i]*o + base[i]*(1-o))).join(','); };

    const vus = rel.map(compose);
    const eF = new Set(vus).size;
    const eT = new Set(rel.map(r=>r[2])).size;
    const finit = (t)=>{ const der=t[t.length-1]; for(let k=t.length-1;k>=0;k--) if(t[k]!==der) return rel[k+1][0]; return 0; };
    const tF = finit(vus), tT = finit(rel.map(r=>r[2]));
    const mauvais = eF < S_ETAPES;
    if(mauvais) ko++;
    console.log('  ' + (mauvais?'KO ':'OK ') + nom.padEnd(20)
      + 'fond vu ' + String(eF).padStart(2) + ' étapes (fini à ' + String(tF).padStart(3) + ' ms)   '
      + 'texte ' + String(eT).padStart(2) + ' étapes (fini à ' + String(tT).padStart(3) + ' ms)');
    if(mauvais) console.log('           ↳ le fond CLAQUE : ' + eF + ' valeur(s) distincte(s), il ne se fond pas');
    await p.waitForTimeout(300);
  }
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,2).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK — le fond quitté se fond, le texte franchit d\'un coup' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
