/* ====== BANC « RETIRER UN JOUEUR PENDANT QU'ON TAPE NE FAIT RIEN TOMBER » ======
   « Lorsqu'on les retire ou ajoute, ça bug un peu. »

   CE QUE C'ÉTAIT, ET C'ÉTAIT MOI. Pour empêcher le clavier de redimensionner le
   jeu, j'avais posé une règle : on garde la hauteur DE REPOS tant qu'un champ a
   le focus, plus un délai de grâce de 380 ms pour laisser le clavier
   redescendre. C'était UN PARI SUR UNE DURÉE, et il se perd : quand on touche
   la croix d'un joueur, le code retire aussitôt le focus du champ — donc le
   délai part immédiatement — mais le clavier, lui, met plus longtemps à s'en
   aller. Mesuré : à 593 ms, le délai avait expiré, la fenêtre faisait encore la
   taille « clavier ouvert », et le jeu a ADOPTÉ cette taille comme hauteur de
   repos. #app est tombé de 852 à 516 px, et toute la mise en page avec.

   LE FAIT QUI NE DÉPEND D'AUCUNE DURÉE : un clavier ne rend JAMAIS la fenêtre
   plus grande. La règle ne se mesure donc plus en millisecondes — une fenêtre
   qui rétrécit à largeur constante est un recouvrement, et on ne la suit pas.

   CE BANC SIMULE LE VRAI CLAVIER (un focus() ne fait rien monter en headless :
   « html.kb » ne s'allume jamais et on ne teste rien), puis retire un joueur
   pendant qu'il est levé. Il exige que la hauteur de #app ne bouge pas d'un
   pixel, et que les places restantes ne sautent pas.
   (v344) On ne tape plus dans la carte : le nom s'écrit dans la page du
   joueur (voir LES SIX PLACES). Le geste d'aujourd'hui, c'est donc : clavier
   levé dans cette page, « Retirer de la partie ». La page repart, le champ
   perd le foyer pendant que le clavier redescend encore — le même piège que
   la croix d'autrefois.
   Usage : node banc-essai/retrait-clavier.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const H = 852, W = 393, CLAVIER = 336, PALIERS = 12;

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.evaluate(()=>{ state.mode='group';
    state.teams = Array.from({length:6},(_,i)=>({ name: i? 'Joueur '+(i+1) : 'Taylor' }));
    state.screen='setup'; render(); });
  await p.waitForTimeout(1200);

  await p.evaluate(()=>{ ouvrirJoueur(5); });
  await p.waitForTimeout(900);
  await p.evaluate(()=>{ document.getElementById('joueurNom').focus(); });
  for(let i=1;i<=PALIERS;i++){
    await p.setViewportSize({ width:W, height: Math.round(H - CLAVIER*i/PALIERS) });
    await p.waitForTimeout(22);
  }
  await p.waitForTimeout(600);
  const leve = await p.evaluate(()=>document.documentElement.classList.contains('kb'));

  const cap = p.evaluate(()=> new Promise(res=>{
    const app=document.getElementById('app');
    const rel=[]; const t0=performance.now();
    const tic=()=>{
      const lignes={};
      document.querySelectorAll('#teamCard .place').forEach(r=>{ lignes['p' + r.dataset.p]=+r.getBoundingClientRect().top.toFixed(1); });
      rel.push({ t:+(performance.now()-t0).toFixed(0), ch:app.clientHeight, lignes, n:state.teams.length });
      if(performance.now()-t0<1200) requestAnimationFrame(tic); else res(rel);
    };
    requestAnimationFrame(tic);
  }));
  await p.waitForTimeout(50);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('#joueurVeil .grp-act-l')].find(x=>/Retirer de la partie/.test(x.textContent)); b.click(); });
  const rel = await cap;

  let ko = 0;
  const v = (nom, bon, det)=>{ if(!bon) ko++; console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(46) + det); };
  v("le clavier est bien levé pour l'essai", leve, leve ? 'html.kb' : 'le clavier ne s\'est pas levé — l\'essai ne prouve rien');

  const hauteurs = [...new Set(rel.map(r=>r.ch))];
  v("la hauteur de #app ne bouge pas", hauteurs.length === 1, hauteurs.length + ' valeur(s) : ' + hauteurs.join(' · '));

  /* le pire saut d'UNE place (elles ne bougent jamais : le joueur retiré est
     le dernier, personne n'a à glisser). */
  let pire = 0, quand = 0;
  for(let i=1;i<rel.length;i++){
    const a = rel[i-1].lignes, b = rel[i].lignes;
    for(const k of Object.keys(b)){
      if(!(k in a)) continue;
      const d = Math.abs(b[k]-a[k]);
      if(d > pire){ pire = d; quand = rel[i].t; }
    }
  }
  v("aucune place ne bouge", pire <= 0.5, 'plus grand saut ' + pire.toFixed(1) + ' px' + (pire>0.5 ? ' (à ' + quand + 'ms)' : ''));
  /* (le retrait se pose après le départ de la page : on le lit à la fin) */
  await p.waitForTimeout(400);
  const n = await p.evaluate(()=>state.teams.length);
  v("le joueur est bien parti", n === 5, n + ' joueurs');

  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK — retirer un joueur clavier levé (depuis sa page) ne fait rien tomber'
                       : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
