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
     3. le contexte est carrément perdu (« closed ») : il faut le recréer.

   L'EXIGENCE, dans les trois cas : le son revient SANS QUE LE JOUEUR AIT À
   TOUCHER QUOI QUE CE SOIT. S'il faut un geste, ce n'est pas « en tout temps »,
   c'est « quand on y pense ».
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

  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
