/* ====== BANC « L'HEURE QUI ARRIVE AU SERVEUR EST LA DERNIÈRE CHOISIE » (v327) ======
   « Le test marche, mais la prière et la lecture ne sonnent pas. » Relevé le
   18/10/2026 : le dernier envoi du téléphone au serveur datait de 15 h 42 ;
   tout ce qui avait été réglé ensuite n'était jamais arrivé. Deux défauts,
   joués ici sur un serveur simulé qui se comporte comme le vrai (la table
   refuse le téléphone depuis le verrou de la v326 ; chaque appel arrive
   quand son réseau le veut) :
     1. DANS LE DÉSORDRE. La roue de l'heure annonce chaque cran : 15:00,
        15:30, 15:50. Chaque annonce lançait sa propre écriture ; la première,
        plus lente, arrivait en dernier — et le serveur gardait 15:00, déjà
        passée, donc remise à demain. Il doit garder 15:50.
     2. UN RATÉ QUI EMPOISONNE. Une seule erreur passagère (le réseau coupe,
        le serveur hoquette) faisait croire que la fonction n'existait pas :
        le jeu passait à la table, refusée, et ne revenait plus à la bonne
        porte avant d'être fermé. Après un raté, la prière doit encore
        s'allumer, et ce qui n'est pas parti doit repartir tout seul.
   L'horloge de la page est simulée (page.clock) : on avance le temps à la
   main, rien n'attend pour de vrai.
   Usage : node banc-essai/rappels-ordre.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const CLE = 'BOveRs4clrziwaZmqCy4re5c-vpsPRGRvw0mfUxP5D3u920HJW45-o7V1avGrvsKwFiFj-Jv6WQ-6O8JkXgi21g';
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

async function telephone(nav) {
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-18T13:40:00Z') });
  await p.route('**/*.html*', async (route) => {
    const rep = await route.fetch(); const corps = await rep.text();
    await route.fulfill({ response: rep, body: /const VAPID_PUBLIC = "[A-Za-z0-9_-]{80,}"/.test(corps) ? corps : corps.replace('const VAPID_PUBLIC = "";', 'const VAPID_PUBLIC = "' + CLE + '";') });
  });
  await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: false, ouverts: false, version: 1, modo: false, quand: Date.now() }));
    const vraiMM = window.matchMedia ? window.matchMedia.bind(window) : null;
    window.matchMedia = (q) => /display-mode/.test(String(q))
      ? { matches: true, media: q, onchange: null, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } }
      : (vraiMM ? vraiMM(q) : { matches: false, media: q, addEventListener(){}, removeEventListener(){} });
    window.Notification = function(){};
    window.Notification.permission = 'granted';
    window.Notification.requestPermission = () => Promise.resolve('granted');
    /* LE SERVEUR. « arrivees » : l'ordre dans lequel les écritures ATTEIGNENT
       le serveur (pas celui où elles partent). « lents » : la durée de réseau
       de chaque appel, dans l'ordre des départs. « rates » : combien des
       prochains appels échouent (erreur passagère). La table refuse tout,
       comme le vrai serveur depuis le verrou de la v326. */
    window.__banc = { departs: [], arrivees: [], lents: [], rates: 0, table: 0, serveur: null };
    const abo = { endpoint: 'https://exemple.push/appareil-de-taylor-0003',
      toJSON(){ return { endpoint: this.endpoint, keys: { p256dh: 'p', auth: 'a' } }; },
      unsubscribe(){ pose = null; return Promise.resolve(true); } };
    let pose = abo;
    const reg = { pushManager: { getSubscription: () => Promise.resolve(pose), subscribe: () => { pose = abo; return Promise.resolve(abo); } }, update(){} };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(reg), register: () => Promise.resolve(reg),
      getRegistration: () => Promise.resolve(reg), addEventListener(){}, controller: null } });
    window.supabase = { createClient(){
      const refus = () => { window.__banc.table++; return Promise.resolve({ error: { code: '42501', message: 'permission denied for table push_subs' } }); };
      const table = () => ({ upsert: refus, insert: refus,
        update(){ return { eq: refus }; }, delete(){ return { eq: refus }; },
        select(){ const q = { eq: () => q, gte: () => q, then: (r) => Promise.resolve({ data: [], error: null }).then(r) }; return q; } });
      return { from: table,
        rpc(nom, corps){
          if (nom !== 'push_enregistrer') return Promise.resolve({ data: null, error: null });
          const b = window.__banc, c = JSON.parse(JSON.stringify(corps || {}));
          const lent = b.lents.length ? b.lents.shift() : 50;
          b.departs.push(c.p_priere);
          if (b.rates > 0) { b.rates--; return new Promise((res) => setTimeout(() => res({ data: null, error: { code: '', message: 'TypeError: Load failed' } }), lent)); }
          return new Promise((res) => setTimeout(() => { b.arrivees.push(c.p_priere); b.serveur = c; res({ data: null, error: null }); }, lent));
        },
        channel(){ const a = { on: () => a, subscribe(){ return a; }, track(){ return Promise.resolve('ok'); }, untrack(){ return Promise.resolve('ok'); },
          send(){ return Promise.resolve('ok'); }, presenceState(){ return {}; }, unsubscribe(){ return Promise.resolve('ok'); } }; return a; },
        removeChannel(){ return Promise.resolve('ok'); } };
    } };
  });
  await p.goto(URL);
  for (let i = 0; i < 60; i++) {
    await p.clock.runFor(500);
    if (await p.evaluate(() => { try { return state.screen === 'mode'; } catch (e) { return false; } })) break;
  }
  await p.evaluate(() => openSettings());
  await p.clock.runFor(1500);
  return { ctx, p, errs };
}
const etat = (p) => p.evaluate(() => ({ ...window.__banc, sansRpc: typeof notifSansRpc !== 'undefined' ? notifSansRpc : null,
  priere: settings.priere, interrupteur: document.getElementById('swPriere') && document.getElementById('swPriere').classList.contains('on') }));
/* La roue de l'iPhone : un « change » par cran, à 150 ms l'un de l'autre —
   le temps qu'une écriture parte avant le cran suivant. */
const tourner = async (p, valeurs) => {
  for (const v of valeurs) {
    await p.evaluate((v) => { const i = document.querySelector('#hPriere'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    await p.clock.runFor(150);
  }
};
const allumerPriere = (p) => p.evaluate(() => document.querySelector('#swPriere').click());

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ===== 1. LA ROUE QUI TOURNE, LA PREMIÈRE ÉCRITURE LENTE ===== */
  let { ctx, p, errs } = await telephone(nav);
  await allumerPriere(p);
  await p.clock.runFor(3000);
  let e = await etat(p);
  dire(e.priere === true && e.interrupteur && e.serveur && e.serveur.p_priere === 420, '1. prière allumée (7 h) : le serveur a ' + (e.serveur && e.serveur.p_priere));
  /* Trois crans : 15:00 part, lent (2 s) ; 15:30 et 15:50 suivent, rapides. */
  await p.evaluate(() => { window.__banc.departs = []; window.__banc.arrivees = []; window.__banc.lents = [2000, 30, 30]; });
  await tourner(p, ['15:00', '15:30', '15:50']);
  await p.clock.runFor(6000);
  e = await etat(p);
  dire(e.serveur && e.serveur.p_priere === 950, '   la roue tourne 15:00 → 15:30 → 15:50, la première écriture lente : le serveur garde ' +
    (e.serveur && e.serveur.p_priere) + ' (950 = 15:50) — arrivées dans l\'ordre ' + JSON.stringify(e.arrivees));
  dire(e.arrivees[e.arrivees.length - 1] === 950 && e.arrivees.every((v, i, a) => !i || a[i - 1] !== 950),
    '   rien n\'arrive après la dernière heure choisie');
  dire(e.departs.length <= 3, '   pas plus d\'écritures que de crans (' + e.departs.length + ' parties)');
  dire(!errs.length, '   aucune erreur de page' + (errs.length ? ' : ' + errs[0] : ''));
  await ctx.close();

  /* ===== 2. UN RATÉ PASSAGER N'EMPOISONNE PLUS RIEN ===== */
  ({ ctx, p, errs } = await telephone(nav));
  await allumerPriere(p);
  await p.clock.runFor(3000);
  /* Le réseau coupe une fois, pendant un changement d'heure. */
  await p.evaluate(() => { window.__banc.rates = 1; window.__banc.arrivees = []; });
  await tourner(p, ['16:20']);
  await p.clock.runFor(2000);
  e = await etat(p);
  dire(e.sansRpc === false, '2. après un raté passager, le jeu garde la bonne porte (notifSansRpc : ' + e.sansRpc + ')');
  dire(e.table === 0, '   et n\'écrit pas dans la table, qui le refuserait (' + e.table + ' essai(s))');
  dire(!(e.serveur && e.serveur.p_priere === 980), '   (l\'écriture ratée n\'est pas arrivée : le serveur a encore ' + (e.serveur && e.serveur.p_priere) + ')');
  /* Rien à toucher : la relance part seule, au plus tard 15 s après. */
  await p.clock.runFor(16000);
  e = await etat(p);
  dire(e.serveur && e.serveur.p_priere === 980, '   la relance repart toute seule : le serveur a ' + (e.serveur && e.serveur.p_priere) + ' (980 = 16:20)');
  /* Éteindre puis rallumer la prière marche encore (avant : « Impossible d'activer »). */
  await allumerPriere(p); await p.clock.runFor(2000);
  await allumerPriere(p); await p.clock.runFor(3000);
  e = await etat(p);
  dire(e.priere === true && e.interrupteur && e.serveur && e.serveur.p_priere === 980,
    '   éteindre puis rallumer la prière après le raté : allumée, le serveur a ' + (e.serveur && e.serveur.p_priere));
  dire(!errs.length, '   aucune erreur de page' + (errs.length ? ' : ' + errs[0] : ''));
  await ctx.close();

  await nav.close();
  console.log(ko === 0 ? '\n  OK — la dernière heure choisie est celle que le serveur garde, et un raté ne coupe plus rien' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
