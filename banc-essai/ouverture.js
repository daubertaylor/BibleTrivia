/* « CRÉER UNE PARTIE » DOIT S'OUVRIR À LA MÊME VITESSE, TOUJOURS.

   Le salon n'apparaissait qu'une fois le canal Supabase abonné : le temps
   d'ouverture était donc le temps du RÉSEAU. Première partie d'une session
   (poignée de main du socket en plus), 4G capricieuse, wifi encombré — le
   même bouton mettait 100 ms ou 2 s. Rien dans le jeu ne varie autant.

   Le test remplace Supabase par un canal dont on FIXE la latence, et mesure
   le temps entre le clic et la première image du salon.

       node ouverture.js                       (jeu servi en HTTP sur 8099)
       URL_ESSAI=<url> node ouverture.js       (pour comparer une autre version)

   ET IL DOIT S'OUVRIR UNE SEULE FOIS. Le salon se peint avant que la présence
   Supabase ne réponde ; quand elle arrive, un rendu sur place le rafraîchit.
   Ce rendu-là reprend l'animation d'entrée là où elle en était (délai négatif)
   — mais le nettoyage qui suivait remettait ce délai à zéro alors que la
   classe screen-enter était encore posée, ce qui RELANCE l'animation. Mesuré
   à 400 ms de latence : l'écran, posé depuis 40 ms, repartait de 18 px et
   refaisait toute son entrée. « Ça saute puis ça revient. »
   Le test suit donc aussi la position image par image APRÈS la première, et
   relève le plus fort mouvement VERS LE BAS ainsi que l'instant où tout se
   pose enfin.

   Repères : écart d'ouverture <= 80 ms, saut <= 2 px, pose <= 620 ms. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const LATENCES = [0, 150, 400, 600, 1500];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const mesures = [];
  const errs = [];
  for (const lat of LATENCES) {
    const ctx = await b.newContext({ viewport:{width:402,height:874}, deviceScaleFactor:2,
      userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((ms) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      /* Un Supabase de laboratoire : il ne fait qu'une chose, répondre
         « SUBSCRIBED » au bout de <ms>. C'est exactement la variable qu'on
         veut isoler. */
      window.supabase = {
        createClient(){
          return {
            channel(){
              let syncCb = null;
              const api = {
                /* LE VRAI SUPABASE RÉPOND DEUX FOIS. L'abonnement d'abord, puis
                   une synchro de présence juste après le track — deux rendus sur
                   place à trente millisecondes d'écart, pendant l'entrée. Le
                   laboratoire n'en jouait qu'un seul : il ne pouvait donc pas
                   voir la relance qui vient du SECOND. Un banc qui ne trouve
                   rien doit d'abord prouver qu'il sait trouver. */
                on(t, o, cb){ if(t === 'presence' && o && o.event === 'sync') syncCb = cb; return api; },
                subscribe(cb){ setTimeout(() => cb && cb('SUBSCRIBED'), ms); return api; },
                track(){ setTimeout(() => syncCb && syncCb(), 30); return Promise.resolve('ok'); },
                untrack(){ return Promise.resolve('ok'); },
                send(){ return Promise.resolve('ok'); },
                presenceState(){ return {}; },
                unsubscribe(){ return Promise.resolve('ok'); },
              };
              return api;
            },
            removeChannel(){ return Promise.resolve('ok'); },
            from(){ const q = { select:()=>q, insert:()=>q, upsert:()=>q, update:()=>q,
                                delete:()=>q, eq:()=>q, gte:()=>q,
                                then:(r)=>Promise.resolve({data:[],error:null}).then(r) }; return q; },
          };
        },
      };
    }, lat);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
    /* On part de l'écran « en ligne », comme un joueur qui vient d'y arriver. */
    await p.evaluate(() => { state.screen = 'online'; render(); });
    await p.waitForTimeout(900);
    const suite = await p.evaluate(() => new Promise(res => {
      const t0 = performance.now(); const releve = []; let premiere = -1;
      createRoomFlow();
      const tic = () => {
        const t = performance.now() - t0;
        const li = document.querySelector('.salle-liste, .vs-row');
        if (premiere < 0 && li) premiere = Math.round(t);
        releve.push([Math.round(t), li ? Math.round(li.getBoundingClientRect().top * 10) / 10 : null]);
        if (t < 2200) requestAnimationFrame(tic); else res({ premiere, releve });
      };
      requestAnimationFrame(tic);
    }));
    const r = suite.releve.filter(x => x[1] !== null);
    /* Le SAUT : un mouvement VERS LE BAS après que l'écran s'est posé une
       première fois. L'entrée, elle, ne fait que monter. */
    let saut = 0, quand = 0;
    for (let i = 1; i < r.length; i++) { const d = r[i][1] - r[i-1][1]; if (d > saut) { saut = d; quand = r[i][0]; } }
    let pose = 0;
    for (let i = r.length - 1; i > 0; i--) { if (Math.abs(r[i][1] - r[i-1][1]) > 0.6) { pose = r[i][0]; break; } }
    const ms = suite.premiere;
    mesures.push([lat, ms, saut, pose]);
    console.log('  latence ' + String(lat).padStart(4) + ' ms  ->  salon à l\'écran en ' + String(ms).padStart(4) +
      ' ms  |  saut ' + saut.toFixed(1).padStart(6) + ' px' + (saut > 2 ? ' à ' + quand + ' ms' : '        ') +
      '  |  posé à ' + String(pose).padStart(4) + ' ms' +
      (saut > 2 ? '   <-- ÇA SAUTE PUIS ÇA REVIENT' : ''));
    await ctx.close();
  }
  const v = mesures.map(m => m[1]);
  const ecart = Math.max(...v) - Math.min(...v);
  const sautMax = Math.max(...mesures.map(m => m[2]));
  const poseMax = Math.max(...mesures.map(m => m[3]));
  console.log('\n  écart d\'ouverture entre la plus lente et la plus rapide : ' + ecart + ' ms');
  console.log('  saut maximum après la première image : ' + sautMax.toFixed(1) + ' px');
  console.log('  dernière image qui bouge, au pire : ' + poseMax + ' ms');
  if (errs.length) console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | '));
  const ok = ecart <= 80 && sautMax <= 2 && poseMax <= 620 && !errs.length;
  console.log(ok ? '  OK — une seule ouverture, à vitesse fixe' : '  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
