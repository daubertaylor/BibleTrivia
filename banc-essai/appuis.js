/* L'ONDE D'APPUI SE VOIT-ELLE SUR SON PROPRE BOUTON ?
   Le jeu répond au doigt de deux façons : le bouton s'enfonce (scale 0,968) et
   une onde colorée s'allume dessous (button::before). Le second point est le
   fragile : la teinte de l'onde est choisie PAR FAMILLE de boutons, alors que
   la couleur du bouton, elle, dépend de son rôle. Quand les deux ne
   correspondent pas, l'onde existe, elle est bien peinte — et elle est
   invisible.
   Ce test compose donc chaque teinte d'appui SUR la couleur réelle de son
   bouton et donne l'écart de luminance. Sous ~6 unités, le doigt ne voit rien.

   IL A ATTRAPÉ EXACTEMENT ÇA : « Quitter » de la confirmation de sortie est un
   .modal-btn.ok, il héritait donc de l'onde BLANCHE des boutons corail — mais
   lui est CRÈME. 2,3 unités d'écart. C'est le seul bouton du jeu où l'appui ne
   se sentait pas, et c'est celui qu'on presse en quittant une partie.

       node appuis.js                       (jeu servi en HTTP sur 8099)

   À lire avec couleurs.js : un écran au repos n'est pas un écran, il faut
   aller dans l'ÉTAT. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ECRANS = [
  ['accueil',  () => { state.screen='mode'; render(); }],
  ['solo',     () => { state.mode='solo'; state.screen='setup'; render(); }],
  ['groupe',   () => { state.mode='group'; state.teams=[{name:'Taylor'},{name:'Ana'}]; state.screen='setup'; render(); }],
  ['jeu',      () => { state.mode='solo'; startGame(); state.screen='play'; render(); }],
  ['fin',      () => { state.screen='end'; state.soloScore=110; state.soloCorrect=7; state.soloBestStreak=3;
                       state.questions=new Array(15); state.soloMissed=new Array(8); render(); }],
  ['sortie',   () => { state.mode='solo'; startGame(); state.screen='play'; render(); confirmLeaveGame(); }],
  ['ligne',    () => { state.screen='online'; render(); }],
  ['salon',    () => { net.isHost=true; net.code='42CJ'; net.joueurs={}; majAdversaire(); state.screen='online-room'; render(); }],
  ['salon2',   () => { net.isHost=true; net.code='42CJ'; net.joueurs={a:{id:'a',name:'Ana',color:'#E8734C',score:0,idx:0,done:false,gone:false,vu:Date.now()}};
                       majAdversaire(); state.screen='online-room'; render(); }],
  ['finligne', () => { net.isHost=true; net.code='42CJ'; net.score=300; net.oppScore=180; net.missed=[];
                       net.joueurs={a:{id:'a',name:'Sogane',color:'#E8734C',score:180,idx:15,done:true,gone:false,vu:Date.now()}};
                       majAdversaire(); state.screen='online-end'; render(); }],
  ['sortieligne',()=> { net.isHost=true; net.code='42CJ'; net.joueurs={a:{id:'a',name:'Ana',color:'#E8734C',score:0,idx:0,done:false,gone:false,vu:Date.now()}};
                       majAdversaire(); beginDuel(1,'courte','30','tout'); quitDuel(); }],
  ['profil',   () => { state.screen='profile'; render(); }],
  ['parcours', () => { state.screen='parcours'; render(); }],
  ['reglages', () => { state.screen='mode'; render(); openSettings(); }],
  ['bibles',   () => { state.screen='mode'; render(); openSettings(); setTimeout(()=>openBibles(),300); }],
  ['revoir',   () => { state.screen='end'; state.soloScore=110; state.questions=new Array(15); state.soloMissed=new Array(3); render();
                       var f=[]; for(var i=0;i<4;i++) f.push({q:"Question ?",correct:"A",chosen:"B",fact:"Genese 1."});
                       setTimeout(function(){ openMissedReview(f); }, 350); }],
];
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:402,height:874}, deviceScaleFactor:2, userAgent:IOS, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8',isCreator:true})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.waitForFunction(() => { try { return state.screen==='mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  const vus = {};
  for (const [nom, aller] of ECRANS) {
    try { await p.evaluate(`(${aller.toString()})()`); } catch(e) { console.log('  !! '+nom+' : '+e.message); continue; }
    await p.waitForTimeout(1300);
    const r = await p.evaluate(() => {
      const lum = (c)=>{ const m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c||''); if(!m) return null;
        return { r:+m[1], g:+m[2], b:+m[3], a:m[4]===undefined?1:+m[4] }; };
      const L = (c)=> 0.2126*c.r + 0.7152*c.g + 0.0722*c.b;
      const out = [];
      for (const e of document.querySelectorAll('button, .mode-card')) {
        const bb = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        if(bb.width<24||bb.height<18||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.9||e.disabled) continue;
        if(cs.pointerEvents === 'none') continue;
        const fond = lum(cs.backgroundColor);
        if(!fond || fond.a < 0.9) continue;             /* fond translucide : on ne sait pas juger */
        const t = (cs.getPropertyValue('--press-tint')||'').trim() || 'rgba(238,74,40,0.18)';
        const te = lum(t); if(!te) continue;
        /* la teinte est peinte PAR-DESSUS le fond du bouton */
        const mel = { r: te.r*te.a + fond.r*(1-te.a), g: te.g*te.a + fond.g*(1-te.a), b: te.b*te.a + fond.b*(1-te.a) };
        const ecart = Math.abs(L(mel) - L(fond));
        const cls = (e.className||'').toString().split(' ').filter(c=>c&&!/has-gs|reveal-in|animate|screen-enter|arrivee/.test(c)).slice(0,3).join('.') || e.tagName.toLowerCase();
        out.push({ cls, ecart:Math.round(ecart*10)/10, fond:cs.backgroundColor, teinte:t });
      }
      return out;
    });
    r.forEach(x=>{ const k=x.cls; if(!vus[k] || vus[k].ecart > x.ecart) vus[k] = Object.assign({nom}, x); });
    console.log('  ' + nom.padEnd(12) + r.length + ' boutons');
  }
  const l = Object.values(vus).sort((a,b)=>a.ecart-b.ecart);
  console.log('\n%s  %-30s %-22s %s'.replace('%s','ecart'.padStart(6)).replace('%-30s','bouton'.padEnd(30)).replace('%-22s','fond'.padEnd(22)).replace('%s','teinte'));
  l.slice(0,14).forEach(x=> console.log(String(x.ecart).padStart(6) + '  ' + x.cls.slice(0,30).padEnd(30) + ' ' + x.fond.padEnd(22) + ' ' + x.teinte + (x.ecart<6?'   <-- ONDE INVISIBLE ('+x.nom+')':'')));
  console.log('\n  ' + l.length + ' familles de boutons — onde invisible (<6) : ' + l.filter(x=>x.ecart<6).length);
  console.log('  erreurs : ' + (errs.length?JSON.stringify([...new Set(errs)]):'aucune'));
  await ctx.close(); await b.close();
})();
