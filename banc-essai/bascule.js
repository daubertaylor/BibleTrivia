/* LA BASCULE DU SALON. Le salon a trois visages et doit suivre le nombre de
   joueurs DANS LES DEUX SENS :

     seul   -> la liste, avec les places restantes (on ne sait pas encore)
     à deux -> le face-à-face VS (c'est un duel, on le sait)
     à trois et plus -> la liste

   Ce test existe parce que le raccourci de rafraîchissement a déjà cassé ça
   une fois : reRenderIfOnline() retouchait la case de l'adversaire sans
   redessiner l'écran, donc le salon ne pouvait pas CHANGER de visage. Il
   n'appelle donc que reRenderIfOnline(), exactement comme le vrai jeu à
   chaque événement de présence.

       node bascule.js        (le jeu doit être servi en HTTP sur 8099) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const NOMS = ['Marie','Paul','Ana','Luc','Jean','Eve','Noe'];
/* on monte jusqu'a huit PUIS on redescend : c'est la descente qui piegeait */
const ETAPES = [1,2,3,8,3,2,1,2];
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:402,height:874}, deviceScaleFactor:2, userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8',isCreator:true})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen==='mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.evaluate(() => { net.isHost=true; net.code='42CJ'; net.joueurs={}; majAdversaire(); state.screen='online-room'; render(); });
  let ok = true;
  for (const n of ETAPES) {
    const r = await p.evaluate(({n,NOMS}) => {
      net.joueurs = {};
      for (let i=0;i<n-1;i++) net.joueurs['j'+i]={id:'j'+i,name:NOMS[i],color:'#E8734C',isCreator:false,score:0,idx:0,done:false,gone:false,vu:Date.now()};
      majAdversaire(); reRenderIfOnline();
      const q = s => { const e=document.querySelector(s); return e ? e.innerText.trim() : null; };
      return { vs:!!document.querySelector('.vs-row'), li:!!document.querySelector('.salle-liste'),
               lbl:q('.len-label'), lignes:document.querySelectorAll('.salle-ligne').length };
    }, {n,NOMS});
    await p.waitForTimeout(280);
    const attendu = n === 2 ? 'VS' : 'liste';
    const vu = r.vs ? 'VS' : (r.li ? 'liste' : 'RIEN');
    const bonneVue = vu === attendu && !(r.vs && r.li);
    /* le MOT doit suivre la vue : « duel » seulement quand c'en est un */
    const motAttendu = n === 2 ? 'du duel' : 'de la partie';
    const bonMot = (r.lbl||'').indexOf(motAttendu) >= 0;
    /* la liste montre un joueur par ligne, plus la ligne des places libres */
    const bonnesLignes = !r.li || r.lignes === n + (n < 8 ? 1 : 0);
    if (!bonneVue || !bonMot || !bonnesLignes) ok = false;
    console.log('  ' + String(n).padStart(2) + ' joueur(s) -> ' + vu.padEnd(6) +
      (bonneVue ? 'ok   ' : 'ATTENDU ' + attendu + '  ') + '| ' + (r.lbl||'?').padEnd(22) +
      (bonMot ? 'ok' : 'MOT FAUX') + (r.li ? '  | ' + r.lignes + ' lignes ' + (bonnesLignes?'ok':'FAUX') : ''));
  }
  console.log('\n  bascule : ' + (ok ? 'CORRECTE dans les deux sens' : 'DEFAUT'));
  console.log('  erreurs : ' + (errs.length ? JSON.stringify([...new Set(errs)]) : 'aucune'));
  await ctx.close(); await b.close();
  process.exit(ok ? 0 : 1);
})();
