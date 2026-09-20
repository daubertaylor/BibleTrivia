/* ============ BANC « TOUTE PARTIE ALLUME LA FLAMME » ============
   « Le défi du jour ne sert à rien si ce n'est activer les flammes. Fais en
   sorte d'activer les flammes sur d'autres modes. »
   On joue une partie DANS CHAQUE MODE, depuis une flamme éteinte, et on
   vérifie que la journée est marquée et la série montée à 1. Puis on rejoue :
   la série ne doit PAS monter deux fois le même jour.
   Et le plus important : la progression d'un joueur qui existait déjà ne doit
   pas bouger d'un jour. On part donc AUSSI d'une série de 5 et on vérifie
   qu'elle devient 6, pas 1.
   Usage : node banc-essai/flamme-modes.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async()=>{
  const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  let ko=0;
  const essai = async (titre, avant, attendu)=>{
    const ctx=await nav.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,userAgent:IOS,hasTouch:true,serviceWorkers:'block'});
    const p=await ctx.newPage();
    await p.addInitScript((a)=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor'}));
      localStorage.setItem('bt_fs_hint','1');
      if(a) localStorage.setItem('bt_daily', JSON.stringify(a)); }, avant);
    await p.goto(URL);
    await p.waitForFunction(()=>{try{return state.screen==='mode';}catch(e){return false;}},null,{timeout:20000});
    await p.waitForTimeout(700);
    const r = await p.evaluate(()=>{
      const av = loadDaily();
      compterPartie();                    // le passage obligé des trois modes
      const ap = loadDaily();
      compterPartie();                    // deuxième partie le MÊME jour
      const ap2 = loadDaily();
      return { avant:av.streak, apres:ap.streak, deux:ap2.streak,
               jour:ap.last === dayKey(0), flamme:dailyStreakShown() };
    });
    const bon = r.apres === attendu && r.deux === attendu && r.jour;
    if(!bon) ko++;
    console.log('  ' + (bon?'OK':'KO') + '  ' + titre.padEnd(34)
      + 'série ' + r.avant + ' -> ' + r.apres + ' (2e partie : ' + r.deux + ')'
      + '  jour marqué : ' + r.jour + '  pastille : ' + r.flamme
      + (bon?'':'   ATTENDU ' + attendu));
    await ctx.close();
  };
  const hier = new Date(Date.now()-86400000).toISOString().slice(0,10);
  await essai('joueur neuf, 1re partie', null, 1);
  await essai('série de 5 faite hier', {last:hier, streak:5, jours:[hier], geles:[], gels:0}, 6);
  await essai('série de 5, trou de 3 jours',
    {last:new Date(Date.now()-4*86400000).toISOString().slice(0,10), streak:5, jours:[], geles:[], gels:0}, 1);
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — toute partie marque la journée, une seule fois');
  await nav.close();
  process.exit(ko?1:0);
})();
