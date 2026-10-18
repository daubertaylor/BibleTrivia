/* ====== BANC « PRIÈRE ET LECTURE, À L'HEURE CHOISIE » (v326) ======
   « Dans les réglages, un bouton qui rappelle de prier à une certaine heure
     de la journée, et la lecture aussi. »
   Deux rangées sous « Rappels », dans le jeu INSTALLÉ : Prière, Lecture de la
   Bible — chacune son heure (le vrai sélecteur du téléphone) et son
   interrupteur. Le banc joue un joueur, jeu installé, notifications
   accordées, et lit ce qui part vers le serveur (la fonction
   push_enregistrer) :
     1. les rangées sont là, éteintes, avec leur heure par défaut ;
     2. allumer la prière : abonnement, puis p_priere = l'heure en minutes,
        p_lecture = -1, p_jeu = false (les rappels du jeu restent éteints) ;
     3. changer l'heure : le serveur l'apprend tout de suite ;
     4. allumer la lecture : les deux partent ;
     5. le miroir du service worker porte les deux heures et la langue ;
     6. éteindre la prière : -1, et l'abonnement RESTE (la lecture sonne) ;
     7. éteindre la lecture, dernier rappel allumé : désinscription ;
     8. rappels du jeu + prière, puis rappels du jeu éteints : p_jeu = false,
        l'abonnement reste ;
     9. un serveur d'avant la v326 : « Pas encore disponible », et
        l'interrupteur revient à l'arrêt — on ne promet pas un rappel que le
        serveur ne gardera pas ;
    10. sur le plus petit écran, la rangée tient : l'heure et l'interrupteur
        dans la carte, le nom entier.
   Usage : node banc-essai/rappels-heure.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const CLE = 'BOveRs4clrziwaZmqCy4re5c-vpsPRGRvw0mfUxP5D3u920HJW45-o7V1avGrvsKwFiFj-Jv6WQ-6O8JkXgi21g';
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

async function telephone(nav, opts) {
  opts = opts || {};
  const ctx = await nav.newContext({ viewport: opts.vue || { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*.html*', async (route) => {
    const rep = await route.fetch(); const corps = await rep.text();
    await route.fulfill({ response: rep, body: /const VAPID_PUBLIC = "[A-Za-z0-9_-]{80,}"/.test(corps) ? corps : corps.replace('const VAPID_PUBLIC = "";', 'const VAPID_PUBLIC = "' + CLE + '";') });
  });
  await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.addInitScript((ancien) => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: false, ouverts: false, version: 1, modo: false, quand: Date.now() }));
    const vraiMM = window.matchMedia ? window.matchMedia.bind(window) : null;
    window.matchMedia = (q) => /display-mode/.test(String(q))
      ? { matches: true, media: q, onchange: null, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } }
      : (vraiMM ? vraiMM(q) : { matches: false, media: q, addEventListener(){}, removeEventListener(){} });
    window.Notification = function(){};
    window.Notification.permission = 'default';
    window.Notification.requestPermission = () => { window.Notification.permission = 'granted'; return Promise.resolve('granted'); };
    window.__banc = { rpc: [], table: [], desabonne: 0, abonne: 0 };
    const abo = { endpoint: 'https://exemple.push/appareil-de-taylor-0002',
      toJSON(){ return { endpoint: this.endpoint, keys: { p256dh: 'p', auth: 'a' } }; },
      unsubscribe(){ window.__banc.desabonne++; pose = null; return Promise.resolve(true); } };
    let pose = null;
    const reg = { pushManager: { getSubscription: () => Promise.resolve(pose), subscribe: () => { window.__banc.abonne++; pose = abo; return Promise.resolve(abo); } }, update(){} };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(reg), register: () => Promise.resolve(reg),
      getRegistration: () => Promise.resolve(reg), addEventListener(){}, controller: null } });
    window.supabase = { createClient(){
      const table = (nom) => ({
        upsert(l){ window.__banc.table.push({ op: 'upsert', nom, l }); return Promise.resolve({ error: null }); },
        update(l){ window.__banc.table.push({ op: 'update', nom, l }); return { eq(){ return Promise.resolve({ error: null }); } }; },
        delete(){ window.__banc.table.push({ op: 'delete', nom }); return { eq(){ return Promise.resolve({ error: null }); } }; },
        select(){ const q = { eq: () => q, gte: () => q, then: (r) => Promise.resolve({ data: [], error: null }).then(r) }; return q; },
        insert(){ return Promise.resolve({ error: null }); },
      });
      return { from: table,
        rpc(nom, corps){
          window.__banc.rpc.push({ nom, corps: JSON.parse(JSON.stringify(corps || {})) });
          /* la fonction d'avant la v326 : PostgREST refuse les paramètres qu'elle ne connaît pas */
          if (ancien && nom === 'push_enregistrer' && corps && 'p_jeu' in corps) return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
          return Promise.resolve({ data: null, error: null });
        },
        channel(){ const a = { on: () => a, subscribe(){ return a; }, track(){ return Promise.resolve('ok'); }, untrack(){ return Promise.resolve('ok'); },
          send(){ return Promise.resolve('ok'); }, presenceState(){ return {}; }, unsubscribe(){ return Promise.resolve('ok'); } }; return a; },
        removeChannel(){ return Promise.resolve('ok'); } };
    } };
  }, !!opts.ancien);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(500);
  await p.evaluate(() => openSettings());
  await p.waitForTimeout(800);
  return { ctx, p, errs };
}
const dernierEnvoi = (p) => p.evaluate(() => { const l = window.__banc.rpc.filter(x => x.nom === 'push_enregistrer'); return l.length ? l[l.length - 1].corps : null; });
const toucher = async (p, sel) => { await p.evaluate((s) => document.querySelector(s).click(), sel); await p.waitForTimeout(700); };
const regler = async (p, sel, v) => { await p.evaluate(([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]); await p.waitForTimeout(600); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ---- 1 à 7 ---- */
  let { ctx, p, errs } = await telephone(nav);
  const r1 = await p.evaluate(() => ({
    rangees: !!document.getElementById('rowPriere') && !!document.getElementById('rowLecture'),
    heures: [document.getElementById('hPriere') && document.getElementById('hPriere').value, document.getElementById('hLecture') && document.getElementById('hLecture').value],
    allumes: ['swPriere', 'swLecture'].map(id => document.getElementById(id) && document.getElementById(id).classList.contains('on')),
    noms: [...document.querySelectorAll('.rh-row .set-txt b')].map(b => b.textContent),
    /* L'icône se vérifie par le NOM du logo, pas par son numéro : la prière
       avait reçu la note de musique (n° 10) au lieu de la bougie (n° 11). */
    icones: ['rowPriere', 'rowLecture'].map(id => { const html = document.querySelector('#' + id + ' .set-ico').innerHTML;
      /* comparés tels que le navigateur les écrit, pas tels que la source les tape */
      const rendu = (svg) => { const d = document.createElement('span'); d.innerHTML = svg; return d.innerHTML; };
      const l = LOGOS_GROUPE.find(x => x && rendu(x.svg) === html); return l ? l.nom() : (html === rendu(ICONS.book) ? 'livre' : '?'); }),
  }));
  dire(r1.rangees, '1. les deux rangées sont dans les Réglages : ' + r1.noms.join(', '));
  dire(r1.icones[0] === 'Bougie' && r1.icones[1] === 'livre', '   la prière a la bougie, la lecture le livre (' + r1.icones.join(', ') + ')');
  dire(r1.heures[0] === '07:00' && r1.heures[1] === '21:00' && !r1.allumes[0] && !r1.allumes[1], '   éteintes, heures par défaut ' + r1.heures.join(' / '));

  await toucher(p, '#swPriere');
  let c = await dernierEnvoi(p);
  const ab = await p.evaluate(() => window.__banc.abonne);
  dire(!!c && c.p_priere === 420 && c.p_lecture === -1 && c.p_jeu === false && c.p_abonnement && c.p_abonnement.endpoint,
    '2. prière allumée : abonné (' + ab + '), p_priere ' + (c && c.p_priere) + ', p_lecture ' + (c && c.p_lecture) + ', p_jeu ' + (c && c.p_jeu));
  dire(await p.evaluate(() => settings.priere === true && document.getElementById('swPriere').classList.contains('on') && document.getElementById('rowPriere').classList.contains('on')),
    '   l\'interrupteur et la rangée sont allumés, le réglage gardé');

  await regler(p, '#hPriere', '06:45');
  c = await dernierEnvoi(p);
  /* Le sous-titre suit : « Chaque jour à 06:45 », au format du téléphone. */
  const lu = await p.evaluate(() => document.querySelector('#rowPriere .rh-val').textContent);
  dire(!!c && c.p_priere === 405 && (await p.evaluate(() => settings.priereH)) === '06:45' && /06:45/.test(lu),
    '3. l\'heure passe à 6 h 45 : p_priere ' + (c && c.p_priere) + ', le sous-titre dit « ' + lu + ' »');

  await toucher(p, '#swLecture');
  c = await dernierEnvoi(p);
  dire(!!c && c.p_priere === 405 && c.p_lecture === 1260, '4. lecture allumée : p_priere ' + (c && c.p_priere) + ', p_lecture ' + (c && c.p_lecture));

  const miroir = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('bibletrivia', 1);
    r.onsuccess = () => { try { const g = r.result.transaction('etat').objectStore('etat').get('serie'); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); } catch (e) { res(null); } };
    r.onerror = () => res(null); }));
  dire(!!miroir && miroir.priere === 405 && miroir.lecture === 1260 && miroir.langue === 'fr' && miroir.actif === false,
    '5. le miroir du service worker : ' + JSON.stringify(miroir && { priere: miroir.priere, lecture: miroir.lecture, langue: miroir.langue, actif: miroir.actif }));

  await toucher(p, '#swPriere');
  c = await dernierEnvoi(p);
  let b = await p.evaluate(() => ({ desabonne: window.__banc.desabonne, oublie: window.__banc.rpc.some(x => x.nom === 'push_oublier') }));
  dire(!!c && c.p_priere === -1 && c.p_lecture === 1260 && !b.desabonne && !b.oublie, '6. prière éteinte : p_priere ' + (c && c.p_priere) + ', la lecture reste, abonnement gardé');

  await toucher(p, '#swLecture');
  b = await p.evaluate(() => ({ desabonne: window.__banc.desabonne, oublie: window.__banc.rpc.some(x => x.nom === 'push_oublier') }));
  dire(b.desabonne === 1 && b.oublie, '7. plus aucun rappel : désinscrit (' + b.desabonne + '), le serveur l\'oublie');

  /* ---- 8 : rappels du jeu + prière, puis rappels du jeu éteints ---- */
  await p.evaluate(() => setNotif(true)); await p.waitForTimeout(700);
  await toucher(p, '#swPriere');
  const avant8 = await p.evaluate(() => window.__banc.desabonne);
  await p.evaluate(() => setNotif(false)); await p.waitForTimeout(800);
  c = await dernierEnvoi(p);
  b = await p.evaluate(() => ({ desabonne: window.__banc.desabonne }));
  dire(!!c && c.p_jeu === false && c.p_priere === 405 && b.desabonne === avant8, '8. rappels du jeu éteints, prière allumée : p_jeu ' + (c && c.p_jeu) + ', p_priere ' + (c && c.p_priere) + ', abonnement gardé');
  dire(!errs.length, '   aucune erreur' + (errs.length ? ' : ' + errs.slice(0, 2).join(' | ') : ''));
  await ctx.close();

  /* ---- 9 : un serveur d'avant la v326 ---- */
  ({ ctx, p, errs } = await telephone(nav, { ancien: true }));
  await p.evaluate(() => { window.__toasts = []; const vrai = window.showMiniToast; window.showMiniToast = (t) => { window.__toasts.push(t); try { vrai(t); } catch (e) {} }; });
  await toucher(p, '#swPriere'); await p.waitForTimeout(500);
  const r9 = await p.evaluate(() => ({ on: settings.priere, sw: document.getElementById('swPriere').classList.contains('on'), toasts: window.__toasts }));
  dire(!r9.on && !r9.sw && r9.toasts.some(t => /Pas encore disponible/.test(t)), '9. serveur d\'avant la v326 : « ' + (r9.toasts[0] || 'rien') + ' », interrupteur revenu à l\'arrêt');
  await ctx.close();

  /* ---- 10 : le plus petit écran ---- */
  ({ ctx, p, errs } = await telephone(nav, { vue: { width: 320, height: 640 } }));
  await toucher(p, '#swPriere');
  const r10 = await p.evaluate(() => [...document.querySelectorAll('.rh-row')].map(r => {
    const rr = r.getBoundingClientRect(), h = r.querySelector('.rh-heure').getBoundingClientRect(), s = r.querySelector('.switch').getBoundingClientRect(), b = r.querySelector('.set-txt b');
    const v = r.querySelector('.rh-val').getBoundingClientRect(), sous = r.querySelector('.set-txt small').getBoundingClientRect();
    /* Le sélecteur d'heure (invisible) couvre le nom ET l'heure affichée :
       toucher l'une ou l'autre l'ouvre ; il ne mord pas sur l'interrupteur. */
    const centre = (x) => { const q = x.getBoundingClientRect(); return document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); };
    const champ = r.querySelector('.rh-heure');
    /* … et c'est bien LUI que le doigt touche, au-dessus du nom comme de l'heure. */
    const couvre = v.left >= h.left - 0.5 && v.right <= h.right + 0.5 && v.top >= h.top - 0.5 && v.bottom <= h.bottom + 0.5
      && centre(b) === champ && centre(r.querySelector('.rh-val')) === champ;
    return { dedans: h.left >= rr.left - 0.5 && s.right <= rr.right + 0.5 && h.right <= s.left && v.right <= s.left, entier: b.scrollWidth <= b.clientWidth + 1,
             couvre, cible: Math.round(h.height), uneLigne: sous.height < 30, nom: b.textContent, h: Math.round(rr.height) };
  }));
  dire(r10.length === 2 && r10.every(x => x.dedans && x.entier && x.couvre && x.cible >= 36 && x.uneLigne), '10. sur 320 px, les rangées tiennent : ' + r10.map(x => x.nom + ' (' + x.h + ' px, cible ' + x.cible + ' px'
    + (x.entier ? '' : ', nom coupé') + (x.dedans ? '' : ', déborde') + (x.couvre ? '' : ', heure hors de la cible') + (x.uneLigne ? '' : ', sous-titre sur deux lignes') + ')').join(', '));
  if (process.env.CAPTURE) await p.locator('#rowPriere').screenshot({ path: process.env.CAPTURE });
  await ctx.close();
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la prière et la lecture sonnent à l\'heure choisie, et rien ne promet ce que le serveur ne tiendra pas');
  process.exit(ko ? 1 : 0);
})();
