/* ============ BANC « CINQ TAPS SUR LE LOGO » ============
   Taper cinq fois le logo révèle un verset. C'est un geste RAPIDE — cent vingt
   à deux cents millisecondes entre deux taps — et l'enfoncement du logo doit
   suivre ce rythme : cinq appuis nets, cinq retours à la taille pleine.
   Mesuré sur la version d'avant : l'enfoncement descendait à 0,90 en 0,13 s
   mais le retour durait 0,44 s, soit trois fois et demie l'intervalle entre
   deux taps. Chaque appui coupait un retour à peine entamé : l'échelle errait
   entre 0,86 et 1,00 et ne revenait à sa taille QU'UNE FOIS SUR CINQ. Le logo
   ne faisait pas cinq appuis, il tremblait.
   Usage : node banc-essai/logo.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const RYTHMES = [120, 160, 240];
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  let ko = 0;
  for (const rythme of RYTHMES) {
    await p.evaluate(()=>{ try{ hideHeroVerse(); }catch(e){} state.screen='mode'; render(); });
    await p.waitForTimeout(1100);
    const boite = await p.locator('.hero-icon-btn').boundingBox();
    if(!boite){ console.log('  pas de logo'); ko++; break; }
    const cap = p.evaluate(()=> new Promise(res=>{
      const rel=[]; const t0=performance.now();
      const tic=()=>{
        const w=document.querySelector('.hero-icon-wrap');
        const z=document.getElementById('heroZone');
        if(w && z && !z.classList.contains('show-verse')){
          const m=new DOMMatrixReadOnly(getComputedStyle(w).transform);
          rel.push([+(performance.now()-t0).toFixed(0), +Math.sqrt(m.a*m.a+m.b*m.b).toFixed(4)]);
        }
        if(performance.now()-t0<2600) requestAnimationFrame(tic); else res(rel);
      };
      requestAnimationFrame(tic);
    }));
    for(let i=0;i<5;i++){
      await p.mouse.move(boite.x+boite.width/2, boite.y+boite.height/2);
      await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up();
      if(i<4) await p.waitForTimeout(Math.max(10, rythme-70));
    }
    const rel = await cap;
    let retours=0, dedans=false, mini=1;
    for(const e of rel){ if(e[1] < mini) mini = e[1];
      if(e[1] > 0.995){ if(!dedans){ retours++; dedans=true; } } else dedans=false; }
    const amplitude = 1 - mini;
    /* CINQ APPUIS, CINQ RETOURS. Et l'amplitude reste celle d'un appui, pas
       d'un écrasement : au-delà de dix pour cent, le logo « saute ». */
    const bon = retours >= 5 && amplitude <= 0.10;
    if(!bon) ko++;
    console.log('  ' + (rythme + 'ms').padStart(6) + ' entre deux taps : ' + (bon?'OK ':'KO ')
      + retours + ' retour(s) à la taille pleine sur 5, amplitude ' + (amplitude*100).toFixed(1) + ' %');
    if(retours < 5) console.log('           ↳ le logo n\'est jamais revenu : il tremble au lieu de s\'enfoncer');
    await p.waitForTimeout(500);
  }
  /* Et le secret marche toujours. */
  await p.evaluate(()=>{ try{ hideHeroVerse(); }catch(e){} state.screen='mode'; render(); });
  await p.waitForTimeout(900);
  const boite = await p.locator('.hero-icon-btn').boundingBox();
  for(let i=0;i<5;i++){ await p.mouse.click(boite.x+boite.width/2, boite.y+boite.height/2); await p.waitForTimeout(90); }
  await p.waitForTimeout(900);
  const vu = await p.evaluate(()=> !!document.querySelector('.hero-zone.show-verse'));
  if(!vu) ko++;
  console.log('  le verset apparaît toujours au cinquième tap : ' + (vu?'OK':'KO'));
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,2).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
