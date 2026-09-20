/* JUSQU'OÙ DESCEND LA CARTE DU VERSET, UNE FOIS OUVERTE.
   Elle est en position absolue : elle ne pousse donc RIEN. Le défaut n'est pas
   un décalage, c'est une descente — sur la photo de Taylor, son bord inférieur
   vient lécher la carte « Mode Groupe ». On mesure l'écart entre les deux, pour
   chaque verset et chaque version. C'est ce blanc-là qui doit rester. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ECRANS = [['iPhone SE',375,667],['iPhone 15',393,852],['Xiaomi',360,780]];
(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  let pireGlobal = 1e9;
  for(const [nom,w,h] of ECRANS){
    const ctx = await nav.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2,
      userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage();
    await p.addInitScript(()=>{ localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8'}));
      localStorage.setItem('bt_fs_hint','1'); });
    await p.goto(URL);
    await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
    await p.waitForTimeout(900);
    /* On ouvre la surcouche comme le ferait un doigt sur la ligne du verset. */
    await p.evaluate(()=>{ try{ showHeroVerse(); }catch(e){ const z=document.getElementById('heroZone'); if(z) z.classList.add('show-verse'); } });
    await p.waitForTimeout(500);
    const r = await p.evaluate(()=>{
      const card = document.querySelector('.hero-verse-card');
      const t = document.querySelector('.hero-verse-text');
      const ref = document.querySelector('.hero-verse-ref');
      const premiere = document.querySelector('.mode-card');
      if(!card || !t || !premiere) return { erreur:'éléments absents' };
      const out = [];
      for(const b of BIBLES){
        settings.bible = b.cle;
        for(const v of HERO_VERSES){
          t.textContent = frSpace('« ' + texteVerset(v.r, v.t) + ' »');
          if(ref) ref.textContent = refLivre(v.r) + ' · ' + (b.sigle || b.court || '');
          card.classList.remove('long'); card.style.removeProperty('--vs');
          card.classList.toggle('long', (t.textContent||'').length > 150);
          /* La mesure doit passer par le MÊME chemin que le jeu, sinon elle
             mesure une carte que personne ne verra jamais. */
          poserPlafondVerset(document.getElementById('heroZone'), card);
          const c = card.getBoundingClientRect(), m = premiere.getBoundingClientRect();
          out.push({ v:b.court||b.cle, ref:v.r, bas:Math.round(c.bottom*10)/10,
                     ecart:Math.round((m.top - c.bottom)*10)/10, h:Math.round(c.height*10)/10 });
        }
      }
      settings.bible = BIBLES[0].cle;
      const m = premiere.getBoundingClientRect();
      return { out, hautCartes:Math.round(m.top), ecran:window.innerHeight };
    });
    if(r.erreur){ console.log('  ' + nom + ' : ' + r.erreur); await ctx.close(); continue; }
    r.out.sort((a,b)=>a.ecart-b.ecart);
    const pire = r.out[0];
    if(pire.ecart < pireGlobal) pireGlobal = pire.ecart;
    console.log('  ' + nom.padEnd(11) + ' écran ' + String(r.ecran).padStart(4) + ' px · 1re carte à ' + String(r.hautCartes).padStart(4) + ' px');
    console.log('      écart le plus serré : ' + String(pire.ecart).padStart(7) + ' px  (carte de ' + pire.h + ' px)  ' + pire.v + ' · ' + pire.ref);
    r.out.slice(1,4).forEach(x=>console.log('                           ' + String(x.ecart).padStart(7) + ' px  (' + x.h + ' px)  ' + x.v + ' · ' + x.ref));
    await ctx.close();
  }
  console.log('\n  LE PLUS SERRÉ, TOUS ÉCRANS : ' + pireGlobal + ' px de blanc sous le verset');
  await nav.close();
})();
