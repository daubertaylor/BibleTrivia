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
   ===== ET RÉÉCRIT UNE SECONDE FOIS : LE ROUGE NE PÂLIT PLUS, IL SE RETIRE =====
   Depuis l'encre (index.html, « L'ENCRE »), la couleur de la puce quittée ne
   s'efface plus par l'opacité d'une couche pleine : elle se RETIRE vers la
   nouvelle puce, en rétrécissant depuis le bord qui lui fait face. Le modèle
   « teinte + couche à son opacité » ne voyait plus rien bouger (une couche
   qui rétrécit n'est plus « pleine ») et criait au claquement.
   ON COMPTE DONC CE QUE L'ŒIL REÇOIT : la part de la puce quittée qui est
   encore rouge, mesurée en PIXELS sur des captures, mouvement ralenti. Un
   départ qui claque passe de 1 à 0 en une ou deux images ; un vrai retrait
   descend par paliers. On exige au moins six paliers, une descente sans
   remontée, et une puce entièrement rendue à son crème à la fin.
   Usage : node banc-essai/fondu.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const S_ETAPES = 6;     // sous six paliers distincts, ce n'est pas un retrait
const LENT = 5;
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'T',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.addStyleTag({ content:`.chip, .len-chip{ --encre-duree:${0.5*LENT}s !important; --encre-sortie:${0.3*LENT}s !important; }
    :root{ --onde-duree:${0.24*LENT}s !important; --tr-onde:${0.24*LENT}s cubic-bezier(0.33,1,0.68,1) !important; }` });
  const cdp = await ctx.newCDPSession(p);
  const toucher = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y }] });
    await p.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  };
  let ko = 0;
  for (const [nom, groupe] of [['durée de la partie','len'], ['chrono','tmr'], ['testament','theme']]) {
    await p.evaluate(()=>{ state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render(); });
    await p.waitForTimeout(900);
    const pos = await p.evaluate((g)=>{
      const q=[...document.querySelectorAll('.chip[data-group="'+g+'"]')];
      if(q.length < 2) return null;
      const c=(x)=>{ const r=x.getBoundingClientRect(); return {x:r.x, y:r.y, w:r.width, h:r.height}; };
      return { a:c(q[0]), b:c(q[1]) };
    }, groupe);
    if(!pos){ console.log('  ' + nom + ' : moins de deux puces'); ko++; continue; }
    // on sélectionne la première, puis on la QUITTE pour la seconde
    await toucher(pos.a.x + pos.a.w/2, pos.a.y + pos.a.h/2);
    await p.waitForTimeout(0.5*LENT*1000 + 600);
    const textes = p.evaluate((g)=> new Promise(res=>{
      const q=[...document.querySelectorAll('.chip[data-group="'+g+'"]')][0];
      const rel=[]; const t0=performance.now();
      const tic=()=>{ rel.push(getComputedStyle(q).color); if(performance.now()-t0 < 0.3*5*1000+300) requestAnimationFrame(tic); else res(rel); };
      requestAnimationFrame(tic); }), groupe);
    await toucher(pos.b.x + pos.b.w/2, pos.b.y + pos.b.h/2);
    const parts = [];
    const t0 = Date.now();
    while(Date.now() - t0 < 0.3*LENT*1000 + 300){
      const png = await p.screenshot({ clip:{ x:pos.a.x, y:pos.a.y, width:pos.a.w, height:pos.a.h } });
      parts.push(await p.evaluate(async (b64)=>{
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(8, 8, img.width - 16, img.height - 16).data;
        let s = 0, n = 0;
        for(let i = 0; i < d.length; i += 4){ if(d[i] < 170) continue; s += Math.max(0, Math.min(1, (246 - d[i+1]) / (246 - 62))); n++; }
        return n ? s / n : 0;
      }, png.toString('base64')));
    }
    const coul = await textes;
    const paliers = new Set(parts.map(v => Math.round(v * 50) / 50)).size;
    const descend = parts.every((v, i) => i === 0 || v <= parts[i-1] + 0.03);
    const finale = parts[parts.length - 1];
    const eT = new Set(coul).size;
    const mauvais = paliers < S_ETAPES || !descend || finale > 0.04;
    if(mauvais) ko++;
    console.log('  ' + (mauvais?'KO ':'OK ') + nom.padEnd(20) + 'rouge quitté ' + String(paliers).padStart(2) + ' paliers ('
      + parts[0].toFixed(2) + ' -> ' + finale.toFixed(2) + ')   texte ' + eT + ' couleur(s)');
    if(paliers < S_ETAPES) console.log('           ↳ le rouge CLAQUE : ' + paliers + ' palier(s), il ne se retire pas');
    if(!descend) console.log('           ↳ le rouge remonte en partant');
    if(finale > 0.04) console.log('           ↳ il reste du rouge sur la puce quittée (' + finale.toFixed(2) + ')');
    await p.waitForTimeout(300);
  }
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,2).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK — la puce quittée se vide par paliers, le texte franchit d\'un coup' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
