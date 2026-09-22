/* ============ BANC « LE SON REVIENT, QUOI QU'IL SE SOIT PASSÉ » ============
   « Règle-moi le problème de sons une bonne fois pour toute : peu importe ce
   qui se passe lorsque je suis sur l'app ou si je retourne dessus, le son doit
   fonctionner en tout temps, tout le temps. »

   CE QUE CE BANC VÉRIFIE, ET POURQUOI C'EST CELUI-LÀ. On ne peut pas écouter
   un son depuis un banc. Mais on peut vérifier la seule chose dont dépend TOUT
   le reste : que le contexte audio soit VIVANT (« running ») et que la musique
   tourne. Un contexte suspendu, c'est le silence, sans exception.

   TROIS FAÇONS DE PERDRE LE SON, ET ELLES NE SE RESSEMBLENT PAS :
     1. l'app passe en arrière-plan puis revient — le cas évident, déjà traité ;
     2. le contexte est suspendu PENDANT QU'ON REGARDE L'ÉCRAN : bannière
        d'appel entrant, Siri, une autre app qui prend la sortie audio, un
        casque Bluetooth qui se connecte. L'app reste visible, le joueur ne
        touche à rien — et il n'y a AUCUN événement de visibilité pour prévenir.
        C'est le cas qui manquait : le code notait l'interruption et attendait
        un « running » qui ne pouvait pas arriver tout seul ;
     3. le contexte est carrément perdu (« closed ») : il faut le recréer ;
     4. TOUS LES DRAPEAUX SONT AU VERT ET IL NE SORT RIEN. Le contexte est
        « running », musicPlaying est vrai, le fil d'ordonnancement porte encore
        son identifiant — et la sortie est muette. Mesuré au signal réel, avec
        un analyseur branché sur la sortie maître :
            musique en marche   jamais sous 5,5e-4, pic 9,4e-3
            fil arrêté          1,2e-12, c'est-à-dire le silence complet
        et le jeu répondait « tout va bien ». Le joueur n'entendait plus rien,
        pour toujours, et rien dans le code ne pouvait s'en apercevoir : le
        guetteur regardait l'INTENTION au lieu de la CONSÉQUENCE.

   L'EXIGENCE, dans les quatre cas : le son revient SANS QUE LE JOUEUR AIT À
   TOUCHER QUOI QUE CE SOIT. S'il faut un geste, ce n'est pas « en tout temps »,
   c'est « quand on y pense ».

   CE BANC ÉCOUTE, LUI AUSSI. Il branche son propre analyseur sur masterGain —
   une prise passive, elle ne change pas le son — et lit des flottants, pas des
   octets : la musique de fond tourne à 3e-3, ce que huit bits arrondissent à
   « 1 sur 128 », indiscernable du silence. La précision n'était pas un détail.
   Usage : node banc-essai/son.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
    args:['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});

  /* Un vrai geste : c'est la seule chose qu'iOS accepte pour ouvrir l'audio. */
  await p.mouse.click(196, 700);
  await p.evaluate(()=>{ settings.music = true; settings.sfx = true; try{ saveSettings(); }catch(e){} try{ startMusic(); }catch(e){} });
  const vivant = async ()=> p.evaluate(()=>({
    etat: (typeof actx!=='undefined' && actx) ? actx.state : 'aucun',
    musique: (typeof musicPlaying!=='undefined') ? !!musicPlaying : false,
  }));
  await p.waitForFunction(()=>{ try{ return actx && actx.state==='running'; }catch(e){ return false; } }, null, {timeout:8000})
        .catch(()=>{});
  const depart = await vivant();
  console.log('  départ : contexte ' + depart.etat + ', musique ' + (depart.musique?'oui':'non'));

  let ko = 0;
  const v = (nom, bon, det)=>{ if(!bon) ko++; console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(52) + det); };

  /* ---- 0. LE REMÈDE NE DOIT JAMAIS SE DÉCLENCHER TOUT SEUL ----
     Un guetteur qui écoute peut se tromper dans l'autre sens : croire au
     silence pendant une vraie musique, et refaire la nappe toutes les six
     secondes. Ce serait un hoquet permanent, pour tout le monde, et pire que
     le défaut qu'on répare. On joue donc pour de vrai — une partie, les
     feuilles, les écrans — et on compte les réparations. Ce contrôle passe
     AVANT qu'on casse quoi que ce soit, sinon il compterait nos propres
     dégâts. */
  await p.evaluate(()=>{
    window.__rep = 0; window.__dur = 0;
    const r = window.restartMusicClean, d = window.reviveAudioHard;
    window.restartMusicClean = function(){ window.__rep++; return r.apply(this, arguments); };
    window.reviveAudioHard   = function(){ window.__dur++; return d.apply(this, arguments); };
  });
  for(const faire of [
    ()=>{ state.mode='solo'; startGame(); },
    ()=>{ try{ const b=document.querySelector('.option-btn'); if(b) b.click(); }catch(e){} },
    ()=>{ try{ openSettings(); }catch(e){} },
    ()=>{ try{ closeSettings(); }catch(e){} },
    ()=>{ state.screen='parcours'; render(); },
    ()=>{ state.screen='mode'; render(); },
  ]){ await p.evaluate(faire); await p.waitForTimeout(2600); }
  const faux = await p.evaluate(()=>({ rep:window.__rep, dur:window.__dur }));
  v("en jeu normal, le remède ne se déclenche jamais",
    faux.rep === 0 && faux.dur === 0,
    faux.rep + ' réparation(s), ' + faux.dur + ' reconstruction(s) sur 16 s de jeu');

  /* ---- 1. arrière-plan puis retour ---- */
  await p.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});
                         document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(400);
  await p.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});
                         document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(3600);
  let r = await vivant();
  v("retour d'arrière-plan : le son repart seul", r.etat==='running' && r.musique, 'contexte ' + r.etat + ', musique ' + (r.musique?'oui':'non'));

  /* ---- 2. INTERROMPU AU PREMIER PLAN — le cas qui manquait ----
     On suspend le contexte sans rien d'autre : l'app reste visible, aucun
     geste, aucun événement de visibilité. Exactement une bannière d'appel. */
  await p.evaluate(async ()=>{ try{ await actx.suspend(); }catch(e){} });
  await p.waitForTimeout(150);
  const pendant = await vivant();
  await p.waitForTimeout(4500);   // on ne touche à RIEN
  r = await vivant();
  v("interrompu sous les yeux du joueur : ça revient seul",
    r.etat==='running' && r.musique,
    'suspendu -> ' + pendant.etat + ', puis ' + r.etat + ', musique ' + (r.musique?'oui':'non'));

  /* ---- 3. contexte perdu pour de bon ---- */
  await p.evaluate(async ()=>{ try{ await actx.close(); }catch(e){} });
  await p.waitForTimeout(150);
  await p.waitForTimeout(4500);   // toujours sans le moindre geste
  r = await vivant();
  v("contexte perdu : il est recréé sans geste", r.etat==='running', 'contexte ' + r.etat);
  v("  et la musique repart avec lui", r.musique, 'musique ' + (r.musique?'oui':'non'));

  /* ---- 4. TOUS LES DRAPEAUX AU VERT, ET PLUS UN SON ----
     On arrête le fil d'ordonnancement SANS toucher aux drapeaux : musicTimer
     garde son identifiant, musicPlaying reste vrai, le contexte reste vivant.
     C'est exactement l'état que l'ancien guetteur déclarait sain. */
  await p.waitForTimeout(2500);
  const poser = async ()=> p.evaluate(()=>{
    if(window.__oreille) return true;
    try{
      const an = actx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0;
      masterGain.connect(an);
      const buf = new Float32Array(an.fftSize);
      window.__oreille = ()=>{ an.getFloatTimeDomainData(buf); let pic = 0;
        for(let i=0;i<buf.length;i++){ const d = Math.abs(buf[i]); if(d>pic) pic = d; } return pic; };
      return true;
    }catch(e){ return false; }
  });
  await poser();
  const ecouter = async (ms)=>{
    let pic = 0; const fin = Date.now() + ms;
    while(Date.now() < fin){
      pic = Math.max(pic, await p.evaluate(()=> window.__oreille ? window.__oreille() : 0));
      await p.waitForTimeout(100);
    }
    return pic;
  };
  const picAvant = await ecouter(1500);
  v("la musique produit vraiment du son", picAvant > 1e-4, 'pic ' + picAvant.toExponential(2));

  /* D'ABORD, LE GUETTEUR ENDORMI : on prouve que la panne est réelle ET
     invisible. Sinon on ne saurait pas si le son revient parce qu'on l'a
     réparé, ou parce qu'il n'était jamais vraiment parti. Les notes déjà
     programmées résonnent 2,6 s : on laisse la queue s'éteindre. */
  await p.evaluate(()=>{ clearInterval(veilleSonT); clearInterval(musicTimer); });
  await p.waitForTimeout(7000);
  const croit = await p.evaluate(()=>({ etat:actx.state, musique:musicPlaying, fil:!!musicTimer }));
  const picMuet = await ecouter(1500);
  v("  la panne est bien silencieuse", picMuet < 1e-5, 'sortie ' + picMuet.toExponential(2));
  v("  et bien invisible : tous les drapeaux au vert",
    croit.etat==='running' && croit.musique && croit.fil,
    'contexte ' + croit.etat + ', musique ' + croit.musique + ', fil ' + croit.fil);

  /* PUIS LE GUETTEUR RÉVEILLÉ : trois tours muets (six secondes) et il doit
     rendre le son, sans que le joueur ait touché quoi que ce soit. */
  await p.evaluate(()=>{ veillerLeSon(); });
  await p.waitForTimeout(9000);
  const picApres = await ecouter(2500);
  v("le son revient alors que TOUS les drapeaux disaient que tout allait bien",
    picApres > 1e-4, 'pic ' + picApres.toExponential(2));

  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
