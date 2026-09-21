/* ============ BANC « LA LANGUE CHANGE, ET RIEN NE BOUGE » ============
   « Tu cales ça dans les réglages, mais fais en sorte que les réglages ne
   montent pas trop haut. Un petit truc avec un drapeau, ça permettrait de
   comprendre en quelques secondes. »

   DEUX EXIGENCES, ET LA SECONDE EST LA PLUS FACILE À TRAHIR :
     1. le drapeau est là, en haut à DROITE, et il change la langue ;
     2. la feuille des réglages ne gagne pas UN pixel. C'est la condition qui
        était posée, et c'est celle qu'on perd sans s'en apercevoir le jour où
        on ajoute une rangée « de plus, juste une ». Le banc mesure donc la
        hauteur de la feuille, sa position, et la hauteur de la rangée de
        titre — avant et après le changement de langue.

   ET UN COMPTE HONNÊTE. Le banc relève aussi COMBIEN DE TEXTE RESTE EN
   FRANÇAIS quand l'anglais est choisi. Ce n'est pas une note à faire monter :
   c'est le chiffre qui dit où en est la traduction, écran par écran, sans
   qu'on ait à s'en souvenir. Il descendra lot après lot.
   Usage : node banc-essai/langue.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/* Ce qui trahit du français à l'écran : un accent, ou un mot outil que
   l'anglais n'a pas. On ne compte QUE l'interface — jamais un nom de joueur,
   jamais un verset, jamais une question : ceux-là ont leur propre chemin. */
const FRANCAIS = /[àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]|\b(le|la|les|des|une|est|sont|pour|avec|sans|dans|votre|vos|pas|plus|que|qui|cette|ces|aux|mon|ma|mes|nous|tout|toute|du|au)\b/i;

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.waitForTimeout(1200);

  let ko = 0;
  const v = (nom, bon, det)=>{ if(!bon) ko++; console.log('  ' + (bon?'OK ':'KO ') + nom.padEnd(48) + det); };

  const mesure = ()=> p.evaluate(()=>{
    const f=document.querySelector('.settings-sheet'), t=document.querySelector('.sheet-title'),
          b=document.querySelector('.lang-btn');
    const r=(e)=>e?e.getBoundingClientRect():null;
    const rf=r(f), rt=r(t), rb=r(b);
    return { feuille: rf?+rf.height.toFixed(1):null, haut: rf?+rf.top.toFixed(1):null,
             titre: rt?+rt.height.toFixed(1):null,
             btnDroite: (rb&&rt)?+(rt.right-rb.right).toFixed(1):null,
             btnL: rb?+rb.width.toFixed(1):null, code: b?b.textContent.trim():null,
             lang: document.documentElement.lang };
  });

  await p.evaluate(()=>openSettings());
  await p.waitForTimeout(800);
  const a = await mesure();
  v("un drapeau dans la rangée de titre", a.code !== null, a.code ? ('« ' + a.code +' », large de ' + a.btnL + ' px') : 'absent');
  v("il est bien à DROITE du titre", a.btnDroite !== null && Math.abs(a.btnDroite) < 2,
    a.btnDroite === null ? '—' : (a.btnDroite + ' px du bord droit'));

  /* LE DRAPEAU OUVRE UN MENU, il ne fait plus défiler les langues. « Je veux
     pas juste appuyer pour changer de langue, mais avoir un menu avec plusieurs
     langues. » Un bouton qui fait défiler ne dit jamais ce qu'il propose ; à
     quatre langues, il faut tapoter trois fois pour revenir où l'on était. */
  await p.click('.lang-btn'); await p.waitForTimeout(900);
  const menu = await p.evaluate(()=>{
    const f=document.querySelector('#languesVeil .settings-sheet');
    const l=[...document.querySelectorAll('.lang-item')];
    return { ouvert:!!f, n:l.length, cochee:l.filter(x=>x.classList.contains('sel')).length,
             grisees:l.filter(x=>x.disabled).length, drapeaux:l.filter(x=>x.querySelector('.lang-pav svg')).length };
  });
  v("le drapeau ouvre un menu de langues", menu.ouvert && menu.n >= 2,
    menu.ouvert ? (menu.n + ' langues, ' + menu.drapeaux + ' drapeaux, ' + menu.grisees + ' pas encore prêtes') : 'aucun menu');
  v("une seule langue est cochée", menu.cochee === 1, menu.cochee + ' coche(s)');
  /* ===== CHOISIR UNE LANGUE REDÉMARRE LE JEU =====
     « Au changement de langue, je veux un jeu qui redémarre totalement, avec un
     écran de chargement. » Ce banc vérifiait l'ANCIEN contrat : la feuille des
     réglages restait ouverte et se repeignait sans gagner un pixel. Elle ne
     reste plus ouverte — la page recharge, il n'y a plus de feuille à mesurer.
     Le déroulé du redémarrage (voile, rechargement unique, écran de chargement,
     accueil dans la nouvelle langue) a son propre banc :
     banc-essai/langue-redemarre.js. Ici on garde ce qui reste vrai : après le
     redémarrage, le jeu EST en anglais, et son drapeau le dit. */
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('.lang-item')].find(x=>x.dataset.langue==='en'); if(b) b.click(); });
  await p.waitForFunction(()=>{ try{ return LANGUE==='en' && typeof render==='function'; }catch(e){ return false; } }, null, {timeout:25000});
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:25000});
  await p.waitForTimeout(500);
  await p.evaluate(()=>openSettings());
  await p.waitForTimeout(800);
  const b2 = await mesure();
  v("choisir une langue la change", b2.lang === 'en' && b2.code === 'EN', 'html lang=' + b2.lang + ', bouton ' + b2.code);
  v("et le jeu est reparti à neuf", await p.evaluate(()=>!document.getElementById('languesVeil')), 'plus de menu de langues');

  /* LE COMPTE : ce qui reste en français, écran par écran. */
  await p.evaluate(()=>{ const v=document.getElementById('settingsVeil'); if(v) v.remove(); });
  const ECRANS = [['accueil',"state.screen='mode'; render();"],
                  ['réglages',"openSettings();"],
                  ['à revoir',"state.screen='revoir'; render();"],
                  ['solo',"state.mode='solo'; state.screen='setup'; render();"]];
  console.log('\n  CE QUI RESTE EN FRANÇAIS, EN ANGLAIS :');
  let total = 0;
  for(const [nom, code] of ECRANS){
    await p.evaluate((c)=>{ try{ const v=document.getElementById('settingsVeil'); if(v) v.remove(); }catch(e){} new Function(c)(); }, code);
    await p.waitForTimeout(600);
    const n = await p.evaluate((src)=>{
      const re = new RegExp(src, 'i');
      const vus = new Set();
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while((node = w.nextNode())){
        const e = node.parentElement;
        if(!e || !e.offsetParent) continue;
        if(e.closest('.hero-verse-card, .question-card, .option-btn, .fact-card, .team-row')) continue;
        const t = (node.textContent||'').trim();
        if(t.length > 2 && re.test(t)) vus.add(t.slice(0,60));
      }
      return [...vus];
    }, FRANCAIS.source);
    total += n.length;
    console.log('   ' + nom.padEnd(12) + String(n.length).padStart(3) + ' morceau(x)'
      + (n.length ? '  ex. « ' + n.slice(0,2).join(' » « ') + ' »' : ''));
  }
  console.log('   ' + 'TOTAL'.padEnd(12) + String(total).padStart(3));

  if(errs.length){ ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); }
  await nav.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
