/* « CRÉER UNE PARTIE » DOIT S'OUVRIR À LA MÊME VITESSE, TOUJOURS.

   Le salon n'apparaissait qu'une fois le canal Supabase abonné : le temps
   d'ouverture était donc le temps du RÉSEAU. Première partie d'une session
   (poignée de main du socket en plus), 4G capricieuse, wifi encombré — le
   même bouton mettait 100 ms ou 2 s. Rien dans le jeu ne varie autant.

   Le test remplace Supabase par un canal dont on FIXE la latence, et mesure
   le temps entre le clic et la première image du salon.

       node ouverture.js        (jeu servi en HTTP sur 8099)

   Repère : l'écart entre la plus lente et la plus rapide doit rester sous
   80 ms — c'est-à-dire que la latence ne doit plus se voir. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const LATENCES = [0, 150, 600, 1500];
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
              const api = {
                on(){ return api; },
                subscribe(cb){ setTimeout(() => cb && cb('SUBSCRIBED'), ms); return api; },
                track(){ return Promise.resolve('ok'); },
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
    const ms = await p.evaluate(() => new Promise(res => {
      const t0 = performance.now();
      createRoomFlow();
      /* La première IMAGE du salon, pas le simple changement d'état : on
         attend que le nœud existe ET qu'il ait été peint. */
      const tic = () => {
        if (document.querySelector('.salle-liste, .vs-row, .code-box, [data-salon]')
            || (typeof state !== 'undefined' && state.screen === 'online-room'
                && document.querySelector('.screen'))) {
          requestAnimationFrame(() => res(Math.round(performance.now() - t0)));
        } else requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    }));
    mesures.push([lat, ms]);
    console.log('  latence ' + String(lat).padStart(4) + ' ms  ->  salon à l\'écran en ' + String(ms).padStart(4) + ' ms');
    await ctx.close();
  }
  const v = mesures.map(m => m[1]);
  const ecart = Math.max(...v) - Math.min(...v);
  console.log('\n  écart entre la plus lente et la plus rapide : ' + ecart + ' ms');
  if (errs.length) console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | '));
  const ok = ecart <= 80 && !errs.length;
  console.log(ok ? '  OK — la latence ne se voit plus' : '  ECHEC — l\'ouverture dépend encore du réseau');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
