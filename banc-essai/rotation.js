/* LA DÉCHIRURE DE ROTATION — « l'écran se coupe en deux ».
   Rien à voir avec la peinture : c'est une mise en page qui DÉPEND DE
   L'ORIENTATION. iOS ne bascule pas la géométrie et les requêtes média dans la
   même passe : il reste quelques images où l'écran est déjà couché et où les
   règles « (orientation:landscape) » n'ont pas encore pris. Tout ce qui suit
   l'écran change alors de valeur, et l'image affichée ne correspond plus à
   celle d'avant.

   CE TEST A DÉJÀ MENTI, ET C'EST SA LEÇON PRINCIPALE. Sa première version ne
   comparait que la LARGEUR de la colonne. Elle passait au vert pendant que
   l'écran se coupait toujours en deux — parce que le reste bougeait :

       #app   [0, 0, 393, 852]  ->  [229,5, 0, 393, 393]

   la colonne se RECENTRE de 229,5 px (margin:0 auto dans une fenêtre devenue
   large) et sa HAUTEUR s'effondre (100lvh suit l'écran) ; puis, une fois ces
   deux-là figés, il restait 14 px de glissement vertical, dus aux unités vw et
   svh — jusqu'à la taille du rem, qui commande toute l'échelle du jeu.

   On compare donc la BOÎTE COMPLÈTE de plusieurs éléments, position verticale
   comprise. Le seul résultat acceptable est zéro.

       node rotation.js                    (jeu servi en HTTP sur 8099)
       node rotation.js --sans-decalage    (bascule franche, pour comparaison) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = (process.argv.find(a=>/^https?:/.test(a))) || 'http://127.0.0.1:8099/index.html';
const DECALAGE = process.argv.indexOf('--sans-decalage') < 0;
const SEL = ['#app','.hero-zone','.hero-title','.mode-card','.daily-card','.parcours-card','.semaine'];
/* Neutraliser TOUTES les règles dont la condition parle d'orientation — et rien
   d'autre : c'est exactement l'état de Safari pendant la bascule. Un navigateur
   de test, lui, bascule tout d'un coup et ne montrerait jamais le défaut. */
function retarderLesRequetes(){
  let n = 0;
  for (const f of Array.from(document.styleSheets)) {
    let regles; try { regles = f.cssRules; } catch(e){ continue; }
    for (let i = regles.length - 1; i >= 0; i--) {
      const r = regles[i];
      if (r.type === 4 && /orientation\s*:/.test(r.conditionText || r.media.mediaText || '')) { f.deleteRule(i); n++; }
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
  await p.waitForTimeout(1500);
  if (DECALAGE) {
    const n = await p.evaluate(`(${retarderLesRequetes.toString()})()`);
    console.log('  ' + n + ' regles « orientation » neutralisees — on simule le retard de Safari');
  }
  const lire = ()=>p.evaluate((sel)=>{ const o={};
    for (const s of sel){ const e=document.querySelector(s); if(!e) continue;
      const r=e.getBoundingClientRect(); o[s]=[r.left,r.top,r.width,r.height].map(v=>Math.round(v*10)/10); }
    return o; }, SEL);
  const debout = await lire();
  const voir = async (etiquette, w, h, attente)=>{
    await ctx.pages()[0].setViewportSize({ width:w, height:h });
    await p.waitForTimeout(attente);
    const m = await lire();
    let pire = 0;
    console.log('\n  ' + etiquette + ' :');
    for (const s of SEL) {
      if (!debout[s] || !m[s]) continue;
      const d = Math.max(...debout[s].map((v,i)=>Math.abs(v - m[s][i])));
      const dd = Math.round(d*10)/10;
      if (dd > pire) pire = dd;
      console.log('   ' + String(dd).padStart(6) + ' px  ' + s.padEnd(16)
        + JSON.stringify(debout[s]) + (dd > 1 ? ' -> ' + JSON.stringify(m[s]) + '   <-- BOUGE' : ''));
    }
    return pire;
  };
  const a = await voir('couche', 852, 393, 220);
  const b2 = await voir('redresse', 393, 852, 500);
  const max = Math.max(a, b2);
  console.log('\n  deplacement maximum : ' + max + ' px  ->  ' + (max <= 1 ? 'RIEN NE BOUGE' : 'L ECRAN SE COUPE EN DEUX'));
  console.log('  erreurs : ' + (errs.length?JSON.stringify([...new Set(errs)]):'aucune'));
  await ctx.close(); await b.close();
  process.exit(max <= 1 ? 0 : 1);
})();
