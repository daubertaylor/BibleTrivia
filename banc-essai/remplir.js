/* ====== BANC « LE REMPLISSAGE EST LE MÊME D'UN BOUTON À L'AUTRE » ======
   Taylor : « vérifie l'animation au niveau des boutons, au niveau du
   remplissage, dans certains modes — par exemple les boutons où tu choisis le
   temps, la longueur des modes, ou autre. Je veux que les boutons changent
   correctement et qu'ils se remplissent bien. »

   CE QU'ON MESURE. Quand on choisit une option, deux choses doivent se passer
   ENSEMBLE : le bouton pris se REMPLIT de rouge, celui qu'on quitte se VIDE.
   Pour chacun des deux on relève, image par image, la couleur RÉELLEMENT
   COMPOSÉE (la teinte de verre, plus la couche ::after à son opacité de
   l'instant — lire la variable seule ne dit rien, voir banc-essai/fondu.js), et
   on en tire deux nombres :
     étapes  le nombre de couleurs distinctes traversées. Deux, c'est un
             claquement ; une dizaine, c'est un fondu.
     durée   l'instant où la couleur se pose définitivement.
   La QUESTION de Taylor n'est pas « est-ce que ça marche » mais « est-ce que
   c'est PAREIL partout » : le banc compare donc les durées entre familles et
   refuse un écart de plus de 80 ms.

   DEUX IDIOMES, DEUX CRITÈRES — et c'est la première chose que j'ai eu
   tort de confondre. Les PUCES (préparation, salon) se remplissent de rouge :
   on leur demande un fondu et le même tempo d'une famille à l'autre. La LISTE
   DES VERSIONS, elle, n'est pas une rangée de puces : la retenue s'y montre par
   une coche et une ligne qui se teinte. Lui réclamer un remplissage rouge
   serait lui réclamer d'être autre chose. Ce qu'on lui demande, c'est que les
   morceaux d'une MÊME ligne changent ENSEMBLE.
   La liste des LANGUES est volontairement hors du banc : la choisir redémarre
   le jeu (voir setLangue), il n'y a donc pas d'animation à mesurer.
   Usage : node banc-essai/remplir.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const S_ETAPES = 6;     // sous six couleurs distinctes, ce n'est pas un fondu
const S_ECART  = 80;    // ms d'écart toléré entre familles

const RELEVE = function(sel, ms){
  return new Promise((res)=>{
    const rel = []; const t0 = performance.now();
    const tic = ()=>{
      const el = document.querySelector(sel);
      if(el){
        const cs = getComputedStyle(el), ap = getComputedStyle(el, '::after');
        rel.push([+(performance.now()-t0).toFixed(0),
                  (cs.getPropertyValue('--glass-tint')||'').trim(),
                  ap.opacity, ap.backgroundColor, ap.transform]);
      }
      if(performance.now()-t0 < ms) requestAnimationFrame(tic); else res(rel);
    };
    requestAnimationFrame(tic);
  });
};
/* LA COULEUR QUE L'OEIL REÇOIT AU CENTRE DU BOUTON, et pourquoi ce n'est pas
   la même règle que dans banc-essai/fondu.js. Là-bas on ne regarde que le
   bouton QUITTÉ, dont la couche garde scale(1) : elle est comptée seulement si
   elle couvre encore tout, d'où le seuil à 0,99. Ici on regarde aussi le bouton
   PRIS, dont la couche GRANDIT depuis le centre — et le point qu'on observe,
   c'est justement le centre. Elle le couvre donc dès que l'échelle décolle.
   Avec le seuil de 0,99 hérité de l'autre banc, le remplissage ne comptait que
   trois couleurs et j'ai cru que le bouton « claquait » : c'était ma règle qui
   regardait ailleurs, pas le jeu. Seuil à 0,05, et le fondu réapparaît. */
function compose(r){
  const n = (s)=> (String(s).match(/[-\d.]+/g) || [0,0,0]).map(Number);
  const ech = (t)=>{ const m = n(t); return (t === 'none' || m.length < 4) ? 1 : m[0]; };
  const base = n(r[1]), lay = n(r[3]);
  const o = (ech(r[4]) > 0.05) ? (parseFloat(r[2]) || 0) : 0;
  return [0,1,2].map(i => Math.round(lay[i]*o + base[i]*(1-o))).join(',');
}
function lire(rel){
  const vus = rel.map(compose);
  const etapes = new Set(vus).size;
  const der = vus[vus.length-1];
  let fin = 0;
  for(let k = vus.length-1; k >= 0; k--) if(vus[k] !== der){ fin = rel[k+1][0]; break; }
  return { etapes, fin };
}

(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'T',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  await p.evaluate(()=>{ try{ getCtx(); }catch(e){} });

  const prepa = async ()=>{ await p.evaluate(()=>{ state.mode='group'; state.teams=[{name:'A'},{name:'B'}]; state.screen='setup'; render(); }); await p.waitForTimeout(800); };
  const salon = async ()=>{ await p.evaluate(()=>{
      net.room = { id:'ESSAI' }; net.isHost = true; net.roomCode = 'ESSAI'; net.oppPresent = false;
      state.screen = 'online-room'; render(); }); await p.waitForTimeout(800); };
  const bibles = async ()=>{ await p.evaluate(()=>{ ['biblesVeil','settingsVeil'].forEach(i=>{const e=document.getElementById(i); if(e) e.remove();});
      state.screen='mode'; render(); openSettings(); }); await p.waitForTimeout(700);
    await p.evaluate(()=>openBibles()); await p.waitForTimeout(900); };

  /* [nom, préparer, sélecteur de la famille, comment lire l'identifiant] */
  const familles = [
    ['préparation · durée',   prepa,  '.chip[data-group="len"]'],
    ['préparation · chrono',  prepa,  '.chip[data-group="tmr"]'],
    ['préparation · testament', prepa, '.chip[data-group="theme"]'],
    ['salon · durée',         salon,  '.len-chip[data-rgroup="len"]'],
    ['salon · chrono',        salon,  '.len-chip[data-rgroup="tmr"]'],
    ['salon · testament',     salon,  '.len-chip[data-rgroup="theme"]'],
  ];

  let ko = 0; const durees = [];
  console.log('  famille                    ARRIVE : étapes  fin        QUITTE : étapes  fin');
  for (const [nom, preparer, sel] of familles){
    await preparer();
    const n = await p.evaluate((s)=>document.querySelectorAll(s).length, sel);
    if(n < 2){ console.log('  ECHEC %s  moins de deux boutons (%d)', nom.padEnd(24), n); ko++; continue; }
    /* On part du premier, on prend le second : les deux mouvements en un geste. */
    await p.evaluate((s)=>{ const q=document.querySelectorAll(s); q[0].click(); }, sel);
    await p.waitForTimeout(700);
    const relA = p.evaluate(([s, ms])=>window.__rel(s + ':nth-of-type(2)', ms), [sel, 700]).catch(()=>null);
    const capA = p.evaluate(([s, ms])=>{
      const q = document.querySelectorAll(s);
      window.__a = q[1]; window.__b = q[0];
      return new Promise((res)=>{
        const rel = { a:[], b:[] }; const t0 = performance.now();
        const lis = (el)=>{ const cs=getComputedStyle(el), ap=getComputedStyle(el,'::after');
          return [+(performance.now()-t0).toFixed(0), (cs.getPropertyValue('--glass-tint')||'').trim(), ap.opacity, ap.backgroundColor, ap.transform]; };
        const tic = ()=>{ rel.a.push(lis(window.__a)); rel.b.push(lis(window.__b));
          if(performance.now()-t0 < ms) requestAnimationFrame(tic); else res(rel); };
        requestAnimationFrame(tic);
      });
    }, [sel, 700]);
    await p.waitForTimeout(30);
    await p.evaluate(()=>{ window.__a.click(); });
    const rel = await capA;
    const A = lire(rel.a), B = lire(rel.b);
    const mauvais = A.etapes < S_ETAPES || B.etapes < S_ETAPES;
    if(mauvais) ko++;
    durees.push([nom, A.fin, B.fin, A.etapes, B.etapes]);
    console.log('  %s %s %s étapes, fin %s ms   %s étapes, fin %s ms',
      (mauvais?'ECHEC':'OK   '), nom.padEnd(24),
      String(A.etapes).padStart(3), String(A.fin).padStart(4),
      String(B.etapes).padStart(3), String(B.fin).padStart(4));
    if(mauvais) console.log('        ↳ %s', A.etapes < S_ETAPES ? 'le bouton pris CLAQUE au lieu de se remplir' : 'le bouton quitté CLAQUE au lieu de se vider');
  }

  /* LA QUESTION DE TAYLOR : est-ce PAREIL d'une famille à l'autre ? */
  const bons = durees.filter(d => d[3] >= S_ETAPES);
  if(bons.length >= 2){
    const mn = Math.min(...bons.map(d=>d[1])), mx = Math.max(...bons.map(d=>d[1]));
    const ecart = mx - mn;
    const vert = ecart <= S_ECART;
    if(!vert) ko++;
    console.log('\n  %s remplissage de %d ms à %d ms selon la famille — écart %d ms (toléré %d)',
      vert?'OK   ':'ECHEC', mn, mx, ecart, S_ECART);
  }
  /* ===== L'AUTRE IDIOME : LA LISTE À COCHE ===== */
  await bibles();
  const lignes = await p.evaluate(()=> new Promise((res)=>{
    const q = [...document.querySelectorAll('.bible-item:not(.indispo)')];
    if(q.length < 2) return res(null);
    q[0].click();
    setTimeout(()=>{
      const A = q[1], B = q[0]; const t0 = performance.now(); const rel = [];
      const lis = (el)=>{ const cs = getComputedStyle(el);
        const ck = el.querySelector('.bible-ck'); const tx = el.querySelector('.bible-txt b');
        const sg = el.querySelector('.bible-sig');
        return [cs.backgroundColor, ck ? getComputedStyle(ck).opacity : '',
                tx ? getComputedStyle(tx).color : '', sg ? getComputedStyle(sg).backgroundColor : '']; };
      const tic = ()=>{ rel.push([Math.round(performance.now()-t0), lis(A), lis(B)]);
        if(performance.now()-t0 < 700) requestAnimationFrame(tic); else res(rel); };
      requestAnimationFrame(tic);
      setTimeout(()=>A.click(), 30);
    }, 700);
  }));
  if(!lignes){ console.log('\n  ECHEC versions de la Bible : moins de deux lignes'); ko++; }
  else {
    const fin = (j)=>{ const v = lignes.map(r=>r[1][j]); const d = v[v.length-1];
      for(let k = v.length-1; k >= 0; k--) if(v[k] !== d) return lignes[k+1][0]; return 0; };
    const nb = (j)=> new Set(lignes.map(r=>r[1][j])).size;
    const noms = ['fond de la ligne', 'coche', 'titre', 'sigle'];
    const fins = [0,1,2,3].map(fin);
    console.log('\n  versions de la Bible — les morceaux d\'une même ligne :');
    noms.forEach((n, j)=> console.log('    %s %s étapes, fin %s ms', n.padEnd(18), String(nb(j)).padStart(3), String(fins[j]).padStart(4)));
    /* On ne juge QUE ce qui change de couleur. L'échelle de la coche, elle,
       porte le ressort d'ouverture du jeu (--tr-ouvre, ~0,56 s) : une marque
       qui arrive a le droit de rebondir, et c'est voulu. */
    const mn = Math.min(...fins), mx = Math.max(...fins);
    const vert = (mx - mn) <= 130 && Math.min(...[0,1,2,3].map(nb)) >= 4;
    if(!vert) ko++;
    console.log('    %s les couleurs de la ligne se posent entre %d et %d ms — écart %d ms (toléré 130)',
      vert ? 'OK   ' : 'ECHEC', mn, mx, mx - mn);
  }

  if(errs.length){ console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | ')); ko++; }
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — les puces se remplissent au même rythme, et chaque ligne change d\'un seul mouvement');
  await b.close();
  process.exit(ko ? 1 : 0);
})();
