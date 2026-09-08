/* LA DÉCHIRURE DE ROTATION.
   Quand le téléphone tourne, l'écran « se déchirait » : des cartes dont le fond
   s'arrête avant leur propre texte. La cause n'est pas un défaut de peinture,
   c'est une mise en page qui DÉPEND DE L'ORIENTATION.

   La largeur de la colonne en dépendait deux fois : #app est borné à 430 px
   (debout sur un écran de 393 il fait 393, couché il atteint 430), et au-delà
   de 620 px de large un palier « grand écran » le pousse à 31 rem. Couché, les
   deux se déclenchent : 393 → 509 px, les cartes 370 → 486, et les couches de
   verre, elles, restent à 393. Mesuré : 25,3 px de carte au-delà de son verre.

   Une règle « (orientation:landscape) » gelait tout ça — mais iOS ne bascule
   PAS la géométrie et les requêtes média dans la même passe. Il reste quelques
   images où l'écran est déjà couché et où la règle n'a pas encore pris.

   CE TEST SIMULE EXACTEMENT CETTE FENÊTRE : il annule les règles « paysage »
   (comme si Safari ne les avait pas encore basculées), bascule la géométrie, et
   vérifie que rien ne bouge. C'est le seul moyen de reproduire le défaut : un
   navigateur de test, lui, bascule tout d'un coup et ne le montre jamais.

       node rotation.js                (jeu servi en HTTP sur 8099)
       node rotation.js --sans-decalage   (bascule normale, pour comparaison) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = (process.argv.find(a=>/^https?:/.test(a))) || 'http://127.0.0.1:8099/index.html';
const DECALAGE = process.argv.indexOf('--sans-decalage') < 0;
/* SIMULER LE RETARD, FIDÈLEMENT : on neutralise TOUTES les règles dont la
   condition parle d'orientation — et rien d'autre. C'est exactement l'état où
   se trouve Safari pendant quelques images : la géométrie a basculé, les
   requêtes média non. Une mise en page qui ne dépend pas de l'orientation
   traverse cet état sans bouger ; c'est tout ce qu'on lui demande. */
function retarderLesRequetes(){
  let n = 0;
  for (const f of Array.from(document.styleSheets)) {
    let regles; try { regles = f.cssRules; } catch(e){ continue; }
    for (let i = regles.length - 1; i >= 0; i--) {
      const r = regles[i];
      if (r.type === 4 && /orientation\s*:/.test(r.conditionText || r.media.mediaText || '')) {
        f.deleteRule(i); n++;
      }
    }
  }
  return n;
}
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, isMobile:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen==='mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.waitForTimeout(1400);
  if (DECALAGE) {
    const n = await p.evaluate(`(${retarderLesRequetes.toString()})()`);
    console.log('  (' + n + ' regles « orientation » neutralisees : on simule le retard de Safari)');
  }
  const mesure = ()=>p.evaluate(()=>{
    const app=document.getElementById('app'), c=document.querySelector('.mode-card');
    if(!app || !c) return null;
    const rc=c.getBoundingClientRect();
    const g=c.querySelector(':scope > .gs'), rg=g?g.getBoundingClientRect():null;
    const de=document.documentElement;
    return { vue:de.clientWidth+'x'+de.clientHeight,
             colonne:Math.round(app.getBoundingClientRect().width*10)/10,
             carte:Math.round(rc.width*10)/10,
             /* le verre couvre-t-il toute la carte ? sinon, ça se déchire */
             hors: rg ? Math.max(0, Math.round((rc.right-rg.right)*10)/10, Math.round((rg.left-rc.left)*10)/10) : null,
             voile: (()=>{const v=document.getElementById('rotate-lock'); return v?getComputedStyle(v).display!=='none':false;})() };
  });
  const depart = await mesure();
  console.log('  debout, au repos : colonne ' + depart.colonne + '   carte ' + depart.carte);
  let ok = true, sansVoile = 0;
  const suivre = async (etiquette, attentes)=>{
    for (const d of attentes) {
      if (d) await p.waitForTimeout(d);
      const m = await mesure();
      const bouge = Math.abs(m.colonne - depart.colonne) > 0.6 || Math.abs(m.carte - depart.carte) > 0.6;
      const dechire = (m.hors || 0) > 0.6;
      if (bouge || dechire) ok = false;
      if (etiquette === 'couche' && !m.voile) sansVoile++;
      console.log('  ' + etiquette + ' : colonne ' + String(m.colonne).padStart(6) + '   carte ' + String(m.carte).padStart(6)
        + '   hors verre ' + String(m.hors).padStart(5) + '   voile ' + (m.voile?'oui':'NON')
        + (bouge||dechire ? '   <-- DECHIRURE' : ''));
    }
  };
  await ctx.pages()[0].setViewportSize({width:852,height:393});
  await suivre('couche', [0, 40, 60, 120, 250, 500]);
  await ctx.pages()[0].setViewportSize({width:393,height:852});
  await suivre('debout', [0, 60, 160, 400, 800]);
  console.log('\n  mise en page ' + (ok ? 'INCHANGEE pendant toute la bascule' : 'DEFORMEE — ça se déchire'));
  if (sansVoile) console.log('  ' + sansVoile + ' image(s) couchées SANS voile');
  console.log('  erreurs : ' + (errs.length?JSON.stringify([...new Set(errs)]):'aucune'));
  await ctx.close(); await b.close();
  process.exit(ok && !sansVoile ? 0 : 1);
})();
