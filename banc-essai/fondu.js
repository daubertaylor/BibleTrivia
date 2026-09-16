/* ====== BANC « LE BOUTON QUITTÉ SE FOND, IL NE CLAQUE PAS » ======
   « Fluidifie la transition lorsque je choisis un autre bouton : si je change
   la durée de la partie et que l'autre bouton redevient blanc, je veux que la
   transition se fasse parfaitement bien. »

   CE QU'ON MESURE, ET POURQUOI C'EST UN COMPTAGE. Une transition qui manque ne
   se voit pas dans une durée — elle se voit dans le NOMBRE D'ÉTAPES. Un fond
   qui passe du rouge au blanc en une seule image ne donne que deux valeurs
   distinctes ; un fondu en donne une dizaine. On compte donc les valeurs
   distinctes prises par la couleur du bouton QUITTÉ, et par celle de son
   texte, pendant les huit dixièmes de seconde qui suivent le tap.
   Relevé avant correction :
       fond   2 valeurs   rouge -> blanc en une image
       texte 14 valeurs   fondu propre sur 200 ms
   Le texte fondait pendant que le fond claquait : c'est ce DÉCALAGE qui se
   voyait, pas la vitesse.

   ET J'EN AVAIS TIRÉ UNE EXIGENCE DE TROP. J'ai écrit « on exige les deux, et
   qu'ils finissent ensemble ». Le relevé disait pourtant ce qu'il fallait
   corriger : c'était LE FOND qui claquait. Demander en plus au texte de se
   fondre AVEC lui a fabriqué un autre défaut, que Taylor a vu avant moi :
   « quand je change de bouton, il y a un petit effet bizarre ». Mesuré, la
   cause est nette — le texte va du blanc à l'encre pendant que le fond va du
   rouge au crème, et au milieu les deux clartés sont ÉGALES : contraste 1,00,
   texte rgb(168,166,163) sur fond rgb(243,137,114). Le mot ne pâlit pas, il
   disparaît, deux images durant.
   Un texte clair sur fond sombre qui devient sombre sur fond clair DOIT passer
   par là. Le bon geste n'est pas de traverser lentement, c'est de franchir
   d'un coup, au bon instant. Le texte a donc le droit — et même le devoir — de
   claquer. Ce banc ne le lui reproche plus.
   CE QU'ON EXIGE DÉSORMAIS ICI : que le FOND se fonde, ce qui était le vrai
   sujet depuis le début. La lisibilité du texte, elle, a son propre banc et
   une mesure bien plus juste que « en combien d'étapes » : banc-essai/
   lisible.js vérifie qu'à aucune image le contraste ne descend sous 3.

   LA CAUSE ÉTAIT PROFONDE : la couleur vient de « --glass-tint », et une
   variable CSS ordinaire ne s'anime pas — le moteur la traite comme du texte.
   Il faut la DÉCLARER comme une couleur (@property) pour qu'il sache quoi
   interpoler. Ce banc vérifie le résultat, pas le moyen : si un jour la
   déclaration saute, ou qu'un composant oublie la transition, il le dira.
   Usage : node banc-essai/fondu.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const S_ETAPES = 6;     // sous six valeurs distinctes, ce n'est pas un fondu
const S_ECART  = 0;     // plus d'exigence d'écart : voir le commentaire en tête
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'T',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  let ko = 0;
  for (const [nom, groupe] of [['durée de la partie','len'], ['chrono','tmr'], ['testament','theme']]) {
    await p.evaluate(()=>{ state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render(); });
    await p.waitForTimeout(900);
    const pos = await p.evaluate((g)=>{
      const q=[...document.querySelectorAll('.chip[data-group="'+g+'"]')];
      if(q.length < 2) return null;
      const c=(x)=>{ const r=x.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; };
      return { a:c(q[0]), b:c(q[1]) };
    }, groupe);
    if(!pos){ console.log('  ' + nom + ' : moins de deux puces'); ko++; continue; }
    // on sélectionne la première, puis on la QUITTE pour la seconde
    await p.mouse.move(pos.a.x, pos.a.y); await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up();
    await p.waitForTimeout(900);
    const cap = p.evaluate((g)=> new Promise(res=>{
      const rel=[]; const t0=performance.now();
      const q=[...document.querySelectorAll('.chip[data-group="'+g+'"]')];
      const tic=()=>{ const cs=getComputedStyle(q[0]);
        rel.push([+(performance.now()-t0).toFixed(0), (cs.getPropertyValue('--glass-tint')||'').trim(), cs.color]);
        if(performance.now()-t0<800) requestAnimationFrame(tic); else res(rel); };
      requestAnimationFrame(tic); }), groupe);
    await p.mouse.move(pos.b.x, pos.b.y); await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up();
    const rel = await cap;
    const etapes = (i)=> new Set(rel.map(r=>r[i])).size;
    const finit  = (i)=>{ const der = rel[rel.length-1][i]; for(let k=rel.length-1;k>=0;k--) if(rel[k][i] !== der) return rel[k+1][0]; return 0; };
    const eF = etapes(1), eT = etapes(2), tF = finit(1), tT = finit(2);
    const ecart = Math.abs(tF - tT);
    /* SEUL LE FOND EST JUGÉ ICI. Le texte a le droit de claquer — c'est même
       ce qu'on lui demande maintenant, pour qu'il ne traverse pas le gris.
       Sa lisibilité est vérifiée par banc-essai/lisible.js, qui mesure le
       contraste à chaque image au lieu de compter des étapes. */
    const mauvais = eF < S_ETAPES;
    if(mauvais) ko++;
    console.log('  ' + (mauvais?'KO ':'OK ') + nom.padEnd(20)
      + 'fond ' + String(eF).padStart(2) + ' étapes (fini à ' + String(tF).padStart(3) + ' ms)   '
      + 'texte ' + String(eT).padStart(2) + ' étapes (fini à ' + String(tT).padStart(3) + ' ms)   '
      + 'écart ' + ecart + ' ms');
    if(eF < S_ETAPES) console.log('           ↳ le fond CLAQUE : ' + eF + ' valeur(s) distincte(s), il ne se fond pas');


    await p.waitForTimeout(300);
  }
  if(errs.length){ ko++; console.log('  erreurs : ' + [...new Set(errs)].slice(0,2).join(' | ')); }
  await b.close();
  console.log(ko === 0 ? '\n  OK' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
