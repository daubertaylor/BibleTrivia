/* AUCUN VERSET N'EST TRANCHÉ. La carte est en overflow:hidden : dès qu'on lui
   pose un plafond, un verset trop long perd sa fin — et sa référence avec.
   On compare donc, pour les 248 versets des cinq versions et en anglais, la
   hauteur du CONTENU à celle de la boîte. Un seul pixel de trop est un mot
   perdu. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ECRANS = [['iPhone SE',375,667],['iPhone 15',393,852],['Xiaomi',360,780],['iPad',820,1180]];
(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  let ko = 0;
  for(const [nom,w,h] of ECRANS){
    const ctx = await nav.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2,
      userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage();
    await p.addInitScript(()=>{ localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8'}));
      localStorage.setItem('bt_fs_hint','1'); });
    await p.goto(URL);
    await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
    await p.waitForTimeout(900);
    const r = await p.evaluate(()=>{
      const zone = document.getElementById('heroZone');
      const card = document.querySelector('.hero-verse-card');
      const t = document.querySelector('.hero-verse-text');
      const ref = document.querySelector('.hero-verse-ref');
      if(!zone || !card || !t) return { erreur:'éléments absents' };
      zone.classList.add('show-verse');
      const coupes = [], serres = [];
      /* UN ESSAI QUI NE PROUVE RIEN EST PIRE QU'UN ESSAI ROUGE. La version
         précédente annonçait « aucun verset tronqué » alors que la fonction de
         plafond lançait une ReferenceError avalée par son catch : plus rien
         n'était borné, donc plus rien n'était coupé. On vérifie donc AUSSI que
         le plafond est bel et bien posé. */
      let sansPlafond = 0;
      const langues = ['fr','en'];
      for(const lg of langues){
        LANGUE = lg;
        for(const b of BIBLES){
          settings.bible = b.cle;
          for(const v of HERO_VERSES){
            const texte = texteVerset(v.r, v.t);
            t.textContent = frSpace('« ' + texte + ' »');
            if(ref) ref.textContent = refLivre(v.r) + ' · ' + (b.sigle||'');
            card.classList.remove('long'); card.style.removeProperty('--vs');
            card.classList.toggle('long', texte.length > 105);
            poserPlafondVerset(zone, card);
            /* Même piège que dans le jeu : scrollHeight compte la couche de
               verre. On lève le plafond et on lit offsetHeight, la hauteur
               que la carte prendrait si on la laissait faire. */
            const avant = card.style.getPropertyValue('--verset-max');
            card.style.setProperty('--verset-max','none');
            const naturelle = card.offsetHeight;
            card.style.setProperty('--verset-max', avant);
            const trop = naturelle - card.offsetHeight;
            if(!card.style.getPropertyValue('--verset-max')) sansPlafond++;
            if(trop > 1) coupes.push({ lg, v:b.court||b.cle, ref:v.r, trop:Math.round(trop) });
            serres.push({ lg, v:b.court||b.cle, ref:v.r, reste:Math.round(card.offsetHeight - naturelle) });
          }
        }
      }
      LANGUE = 'fr'; settings.bible = BIBLES[0].cle;
      zone.classList.remove('show-verse');
      serres.sort((a,b)=>a.reste-b.reste);
      return { coupes, serres:serres.slice(0,3), total:serres.length, sansPlafond };
    });
    if(r.erreur){ console.log('  ' + nom + ' : ' + r.erreur); ko++; await ctx.close(); continue; }
    if(r.sansPlafond){ ko++; console.log('  ' + nom.padEnd(11) + 'KO plafond jamais posé sur ' + r.sansPlafond + ' essai(s) — la mesure ne vaut rien'); await ctx.close(); continue; }
    const etat = r.coupes.length ? 'KO ' + r.coupes.length + ' verset(s) tronqué(s)' : 'OK aucun verset tronqué';
    console.log('  ' + nom.padEnd(11) + etat + '   sur ' + r.total + ' essais');
    if(r.coupes.length){ ko++; r.coupes.slice(0,5).forEach(c=>console.log('        ' + c.lg + ' · ' + c.v + ' · ' + c.ref + ' : ' + c.trop + ' px perdus')); }
    else console.log('        le plus juste : ' + r.serres[0].reste + ' px de marge (' + r.serres[0].v + ' · ' + r.serres[0].ref + ')');
    await ctx.close();
  }
  console.log(ko ? '\n  ' + ko + ' écran(s) en défaut' : '\n  OK');
  await nav.close();
  process.exit(ko ? 1 : 0);
})();
