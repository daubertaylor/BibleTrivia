/* ====== BANC « LA CARTE RAPPELS DE LA MODÉRATION DIT CE QUI MANQUE » (v326) ======
   « Les notifications ne marchent toujours pas. » Tout se joue chez Supabase,
   en quatre endroits — la base, la tâche des cinq minutes, la fonction, ses
   clés — et le premier qui manque coupe la chaîne sans un bruit. La carte
   « Rappels » de la Modération interroge chaque maillon et dit quoi faire.
   Ce banc lui présente chaque panne qu'on peut vraiment rencontrer, une par
   une, et vérifie qu'elle nomme la bonne — et seulement elle :
     1. rien d'installé            → coller installer.sql ; créer la fonction
     2. tout en ordre              → que du vert, et le compte des envois
     3. « Verify JWT » activé      → UNE ligne (la tâche et le jeu butent sur
                                     la même cause), qui dit l'ordre : le code
                                     d'abord, la porte ensuite
     4. l'ancienne fonction        → remplacer son code
     5. clés qui ne vont pas       → la phrase, et « Copier la clé publique »
     6. l'ancienne tâche (horaire) → recoller installer.sql
     7. pg_cron absent             → Database → Extensions
     8. « M'envoyer un essai »     → envoyé ; un par minute ; refus 403 nommé
     9. téléphone pas abonné, jeu pas installé → dit, et pas de bouton d'essai
    10. allumer « Rappels » envoie UNE confirmation « bienvenue », pas deux
    11. chaque appel à la fonction porte la clé publishable, jamais la session
    12. la carte tient sur le plus petit écran, en anglais et en espagnol aussi
    13. (v327) les heures que le serveur a pour CE téléphone : égales, on dit
        quand sonne le prochain rappel (aujourd'hui, ou demain s'il est déjà
        parti) ; différentes, on le dit et le téléphone les renvoie aussitôt
    14. (v327) « Essayer chaque rappel » : les sept sortes, d'un coup ; une
        fonction d'avant la v327 le dit au lieu de faire semblant
    15. (v329) les messages des groupes : le déclencheur posé et les
        téléphones rattachés, ce qu'a donné le dernier message ; une base
        d'avant la v329 → « recolle installer.sql » ; une fonction d'avant la
        v329 → « sa mise à jour part de GitHub » ; un envoi refusé, nommé ;
        (v331) dit avec les mots des RAPPELS (les messages y passent), et
        aucun téléphone encore rattaché → ce qu'il faut faire, en orange
   Usage : node banc-essai/rappels-diag.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const SORTIE = process.env.CAPTURES || '';
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

async function telephone(nav, opts) {
  opts = opts || {};
  const ctx = await nav.newContext({ viewport: opts.vue || { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.addInitScript((o) => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    if (o.langue) localStorage.setItem('bt_langue', o.langue);
    localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: false, ouverts: false, version: 1, modo: false, quand: Date.now() }));
    if (o.installe !== false) {
      const vraiMM = window.matchMedia ? window.matchMedia.bind(window) : null;
      window.matchMedia = (q) => /display-mode/.test(String(q))
        ? { matches: true, media: q, onchange: null, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } }
        : (vraiMM ? vraiMM(q) : { matches: false, media: q, addEventListener(){}, removeEventListener(){} });
    }
    window.Notification = function(){};
    window.Notification.permission = o.permission || 'granted';
    window.Notification.requestPermission = () => { window.Notification.permission = 'granted'; return Promise.resolve('granted'); };
    /* LE SCÉNARIO : ce que la base et la fonction répondent. Le banc le change
       d'une panne à l'autre, sans recharger. */
    window.__banc = { invoke: [], rpc: [], scenario: null };
    const abo = { endpoint: 'https://web.push.apple.com/appareil-de-taylor-0002',
      toJSON(){ return { endpoint: this.endpoint, keys: { p256dh: 'p', auth: 'a' } }; },
      unsubscribe(){ pose = null; return Promise.resolve(true); } };
    let pose = o.abonne === false ? null : abo;
    const reg = { pushManager: { getSubscription: () => Promise.resolve(pose), subscribe: () => { pose = abo; return Promise.resolve(abo); } }, update(){} };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(reg), register: () => Promise.resolve(reg),
      getRegistration: () => Promise.resolve(reg), addEventListener(){}, controller: null } });
    const requete = () => { const q = {}; for (const m of ['select','eq','is','order','limit','in','gte','lte','neq','match','or','not','range']) q[m] = () => q;
      q.maybeSingle = () => Promise.resolve({ data: null, error: null }); q.single = q.maybeSingle;
      q.then = (r, e) => Promise.resolve({ data: [], error: null }).then(r, e); return q; };
    window.supabase = { createClient(){
      return {
        from(){ const q = requete(); q.upsert = () => Promise.resolve({ error: null }); q.insert = () => Promise.resolve({ error: null });
          q.update = () => requete(); q.delete = () => requete(); return q; },
        rpc(nom, corps){
          window.__banc.rpc.push({ nom, corps: JSON.parse(JSON.stringify(corps || {})) });
          const sc = window.__banc.scenario || {};
          if (nom === 'rappels_etat') return Promise.resolve(sc.etat ? { data: sc.etat, error: null } : { data: null, error: sc.etatErreur || { code: 'PGRST202', message: 'Could not find the function public.rappels_etat(p_endpoint) in the schema cache' } });
          return Promise.resolve({ data: null, error: null });
        },
        functions: { invoke(nom, opts){
          window.__banc.invoke.push({ nom, corps: JSON.parse(JSON.stringify((opts && opts.body) || {})), auth: opts && opts.headers && opts.headers.Authorization });
          const sc = window.__banc.scenario || {};
          const corps = (opts && opts.body) || {};
          const rep = corps.essai_moi ? (sc.essai || { st: 404, c: null }) : (sc.fonction || { st: 404, c: null });
          if (rep.st === 200) return Promise.resolve({ data: rep.c, error: null });
          if (!rep.st) return Promise.resolve({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request', context: new TypeError('Failed to fetch') } });
          const r = new Response(JSON.stringify(rep.c || { message: 'erreur' }), { status: rep.st, headers: { 'Content-Type': 'application/json' } });
          return Promise.resolve({ data: null, error: { name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code', context: r } });
        } },
        auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
        channel(){ const a = { on: () => a, subscribe(){ return a; }, track(){ return Promise.resolve('ok'); }, untrack(){ return Promise.resolve('ok'); },
          send(){ return Promise.resolve('ok'); }, presenceState(){ return {}; }, unsubscribe(){ return Promise.resolve('ok'); } }; return a; },
        removeChannel(){ return Promise.resolve('ok'); } };
    } };
  }, { installe: opts.installe, permission: opts.permission, abonne: opts.abonne, langue: opts.langue });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(400);
  return { ctx, p, errs };
}
/* La Modération, ouverte comme un modérateur l'ouvre, sans passer par un vrai
   serveur de groupes : l'état « modérateur » et une file vide. */
const ouvrirModeration = async (p) => {
  await p.evaluate(() => { grp.etat = Object.assign({}, grp.etat || {}, { moderateur: true }); moderation = []; state.screen = 'moderation'; render(); });
};
const scenario = async (p, sc) => {
  await p.evaluate((sc) => { window.__banc.scenario = sc; window.__banc.invoke.length = 0; }, sc);
  await p.evaluate(() => diagnosticRappels(true));
  await p.waitForFunction(() => rapDiag.lignes && !rapDiag.enCours, null, { timeout: 8000 });
  await p.waitForTimeout(250);
  return p.evaluate(() => ({
    lignes: [...document.querySelectorAll('#modRappels .rd-l')].map(l => ({ k: l.querySelector('.rd-m').className.replace('rd-m', '').trim(), t: l.querySelector('.rd-t').textContent })),
    boutons: [...document.querySelectorAll('#modRappels .mod-act button')].map(b => b.textContent.trim()),
    invoke: window.__banc.invoke.slice(),
  }));
};
const VERSION_OK = { version: 329, abonnes: 3, inscrit: true, cle_interne: true, cron: true, net: true,
  tache: { active: true, schedule: '*/5 * * * *' }, passage: { status: 'succeeded', start_time: new Date().toISOString(), message: '1 row' },
  reponse: { status_code: 200, contenu: JSON.stringify({ version: 329, envoyes: 2, serie: 1, defi: 1, retires: 0, echecs: 0, dernier_echec: null, examines: 3 }), error_msg: null, created: new Date().toISOString() },
  /* (v329) les messages des groupes */
  lies: 2, messages_branches: true,
  reponse_message: { status_code: 200, contenu: JSON.stringify({ version: 329, sorte: 'message', envoyes: 2, destinataires: 2, telephones: 2, retires: 0, echecs: 0, dernier_echec: null }), error_msg: null, created: new Date().toISOString() } };
const avec = (base, plus) => Object.assign({}, base, plus);
const compte = (r, k) => r.lignes.filter(l => l.k === k).length;
const porte = (r, re) => r.lignes.some(l => re.test(l.t.replace(/\u00a0/g, ' ')));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const { ctx, p, errs } = await telephone(nav);
  const PUB = await p.evaluate(() => VAPID_PUBLIC);
  await ouvrirModeration(p);
  const FONCTION_OK = { st: 200, c: { version: 329, vapid: 'ok', pub: PUB } };

  /* 1. rien d'installé */
  let r = await scenario(p, { etat: null, fonction: { st: 404, c: { code: 'NOT_FOUND', message: 'Requested function was not found' } } });
  dire(compte(r, 'non') === 2 && porte(r, /colle notifications\/installer\.sql → Run/) && porte(r, /n'existe pas : Edge Functions → Deploy a new function/) && compte(r, 'ok') === 0,
    "rien d'installé : « colle installer.sql » et « crée la fonction », rien de vert (" + r.lignes.map(l => l.k).join(',') + ')');
  dire(r.boutons.includes("M'envoyer un essai") && r.boutons.includes('Actualiser'), 'téléphone abonné : « Actualiser » et « M\'envoyer un essai » (' + r.boutons.join(' · ') + ')');

  /* 2. tout en ordre */
  r = await scenario(p, { etat: VERSION_OK, fonction: FONCTION_OK });
  dire(compte(r, 'non') === 0 && compte(r, 'att') === 0 && compte(r, 'ok') === 7, 'tout en ordre : sept lignes vertes, aucune rouge (' + r.lignes.map(l => l.k + ':' + l.t.slice(0, 38)).join(' | ') + ')');
  dire(porte(r, /3 téléphones inscrits/) && porte(r, /2 rappels envoyés/) && porte(r, /La fonction répond \(v329\)/), 'tout en ordre : le compte des téléphones et des envois, la version');
  dire(porte(r, /Les rappels annoncent aussi les messages des groupes · 2 téléphones peuvent les recevoir/) && porte(r, /Dernier message \(.+\) : 2 téléphones prévenus\./), 'tout en ordre : les rappels annoncent aussi les messages des groupes, et le dernier message (v331)');
  dire(!porte(r, /branchés/), '    (v331) plus de « messages des groupes branchés » : ils passent par les rappels');
  r = await scenario(p, { etat: avec(VERSION_OK, { lies: 0 }), fonction: FONCTION_OK });
  dire(compte(r, 'non') === 0 && r.lignes.some(l => l.k === 'att' && /aucun téléphone ne peut encore les recevoir : chacun doit rouvrir Yada, connecté, rappels allumés\./.test(l.t.replace(/\u00a0/g, ' '))),
    '    (v331) aucun téléphone rattaché : dit, en orange, ce qu\'il faut faire');
  dire(r.invoke.length === 1 && r.invoke[0].corps.etat === true && /^Bearer sb_publishable_/.test(r.invoke[0].auth || ''),
    "la fonction est appelée avec la clé publishable, jamais la session (" + (r.invoke[0] && r.invoke[0].auth || 'aucune').slice(0, 24) + '…)');
  const rpcEtat = await p.evaluate(() => window.__banc.rpc.filter(x => x.nom === 'rappels_etat').pop());
  dire(rpcEtat && rpcEtat.corps.p_endpoint === 'https://web.push.apple.com/appareil-de-taylor-0002', "rappels_etat reçoit l'adresse de CE téléphone, pour dire s'il est inscrit");

  /* 3. Verify JWT activé : la tâche ET le jeu butent dessus — une seule ligne */
  r = await scenario(p, { etat: avec(VERSION_OK, { reponse: { status_code: 401, contenu: '{"code":401,"message":"Missing authorization header"}', created: new Date().toISOString() } }),
                          fonction: { st: 401, c: { code: 401, message: 'Invalid JWT' } } });
  const jwt = r.lignes.filter(l => /Verify\sJWT/.test(l.t));
  dire(jwt.length === 1 && /d'abord.*PUIS/.test(jwt[0].t.replace(/\u00a0/g, ' ')), "Verify JWT : UNE ligne, qui dit l'ordre — le code d'abord, la porte ensuite (" + jwt.length + ')');

  /* 4. l'ancienne fonction */
  r = await scenario(p, { etat: avec(VERSION_OK, { reponse: { status_code: 200, contenu: '{"envoyes":0,"series":0,"absences":0}', created: new Date().toISOString() } }),
                          fonction: { st: 200, c: { envoyes: 0, series: 0, absences: 0 } } });
  dire(r.lignes.filter(l => /est l'ancienne : Edge Functions → rappels → remplace son code/.test(l.t.replace(/\u00a0/g, ' '))).length === 1, "l'ancienne fonction : « remplace son code », une fois");

  /* 5. clés qui ne vont pas avec le jeu */
  r = await scenario(p, { etat: VERSION_OK, fonction: { st: 200, c: { version: 326, vapid: 'ok', pub: 'B' + 'x'.repeat(86) } } });
  dire(porte(r, /VAPID_PUBLIQUE n'est pas la clé publique du jeu/) && r.boutons.includes('Copier la clé publique'), 'clé publique différente : la phrase, et « Copier la clé publique »');
  r = await scenario(p, { etat: VERSION_OK, fonction: { st: 200, c: { version: 326, vapid: ['VAPID_PRIVEE est absente ou vide — vérifie l\'orthographe du nom du secret'], pub: PUB } } });
  dire(porte(r, /Secrets VAPID de la fonction : VAPID_PRIVEE est absente/) && !r.boutons.includes('Copier la clé publique'), 'secret absent : nommé tel que la fonction le dit');

  /* 6. l'ancienne tâche, une fois par heure */
  r = await scenario(p, { etat: avec(VERSION_OK, { tache: { active: true, schedule: '0 * * * *' } }), fonction: FONCTION_OK });
  dire(porte(r, /l'ancienne \(une fois par heure\) : recolle installer\.sql/), "l'ancienne tâche horaire : « recolle installer.sql »");

  /* 7. pg_cron absent */
  r = await scenario(p, { etat: avec(VERSION_OK, { cron: false, tache: undefined, passage: undefined, reponse: undefined }), fonction: FONCTION_OK });
  dire(porte(r, /Database → Extensions → active pg_cron et pg_net/) && !porte(r, /pas encore répondu/), 'pg_cron absent : « Database → Extensions », sans parler de réponse');

  /* 7 bis. des envois refusés au dernier passage */
  r = await scenario(p, { etat: avec(VERSION_OK, { reponse: { status_code: 200, created: new Date().toISOString(),
    contenu: JSON.stringify({ version: 326, envoyes: 1, echecs: 2, dernier_echec: { code: 403, raison: 'the VAPID credentials do not correspond' }, examines: 3 }) } }), fonction: FONCTION_OK });
  dire(porte(r, /2 envois refusés par le service d'envoi \(code 403\) : the VAPID credentials/), "des envois refusés : le nombre, le code et la raison du service d'envoi");

  /* 8. M'envoyer un essai */
  const essai = async (rep) => {
    await p.evaluate((rep) => { window.__banc.scenario = Object.assign({}, window.__banc.scenario, { essai: rep }); window.__banc.invoke.length = 0; }, rep);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#modRappels .mod-act button')].find(b => /essai/.test(b.textContent)); b.click(); });
    await p.waitForTimeout(500);
    return p.evaluate(() => ({ essai: rapDiag.essai, invoke: window.__banc.invoke.slice(), vu: [...document.querySelectorAll('#modRappels .rd-t')].map(x => x.textContent).pop() }));
  };
  await scenario(p, { etat: VERSION_OK, fonction: FONCTION_OK });
  let e = await essai({ st: 200, c: { version: 326, envoye: true } });
  dire(e.essai && e.essai.k === 'ok' && /Essai envoyé/.test(e.vu) && e.invoke[0] && e.invoke[0].corps.essai_moi === 'https://web.push.apple.com/appareil-de-taylor-0002' && !e.invoke[0].corps.genre,
    "« M'envoyer un essai » : l'adresse de CE téléphone, et la ligne verte « Essai envoyé »");
  e = await essai({ st: 429, c: { version: 326, erreur: 'patience' } });
  dire(e.essai && e.essai.k === 'att' && /Un essai par minute/.test(e.vu), 'un second essai dans la minute : « un essai par minute »');
  e = await essai({ st: 502, c: { version: 326, erreur: 'envoi', code: 403, details: ['the VAPID credentials…'] } });
  dire(e.essai && e.essai.k === 'non' && /refuse la signature \(403\)/.test(e.vu), "le service d'envoi refuse (403) : la signature, nommée");
  e = await essai({ st: 404, c: { version: 326, erreur: 'inconnu' } });
  dire(/n'est pas inscrit : éteins puis rallume/.test(e.vu.replace(/\u00a0/g, ' ')), 'téléphone inconnu du serveur : « éteins puis rallume »');

  /* 13. (v327) CE QUE LE SERVEUR SAIT DE CE TÉLÉPHONE */
  const ici = await p.evaluate(() => { const d = new Date(); return { dec: -d.getTimezoneOffset(), min: d.getHours() * 60 + d.getMinutes() }; });
  const hh = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const plusTard = (ici.min + 90) % 1440, encoreAujourdhui = plusTard > ici.min;
  const jour = await p.evaluate((dec) => { const d = new Date(Date.now() + dec * 60000);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }, ici.dec);
  await p.evaluate((h) => { settings.priere = true; settings.priereH = h; settings.lecture = false; settings.notif = false; }, hh(plusTard));
  const MOI = { inscrit: true, decalage: ici.dec, jeu: false, priere: plusTard, lecture: null, priere_le: null, lecture_le: null, jeu_le: null, maj: new Date().toISOString() };
  const fonctionMoi = (moi) => ({ st: 200, c: { version: 327, vapid: 'ok', pub: PUB, moi } });
  const lisible = (m) => p.evaluate((h) => heureLisible(h), hh(m));
  r = await scenario(p, { etat: VERSION_OK, fonction: fonctionMoi(MOI) });
  const hPlus = await lisible(plusTard);
  dire(r.invoke[0] && r.invoke[0].corps.moi === 'https://web.push.apple.com/appareil-de-taylor-0002', '13. la fonction reçoit l\'adresse de CE téléphone (moi)');
  dire(compte(r, 'non') === 0 && porte(r, new RegExp('Prière : prochain rappel ' + (encoreAujourdhui ? "aujourd'hui" : 'demain') + ' à ' + hPlus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
    '    mêmes heures : « Prière : prochain rappel ' + (encoreAujourdhui ? "aujourd'hui" : 'demain') + ' à ' + hPlus + ' », rien de rouge');
  r = await scenario(p, { etat: VERSION_OK, fonction: fonctionMoi(Object.assign({}, MOI, { priere_le: jour })) });
  dire(porte(r, /Prière : prochain rappel demain à/), '    déjà partie aujourd\'hui : « prochain rappel demain »');
  await p.evaluate(() => { window.__banc.rpc.length = 0; });
  r = await scenario(p, { etat: VERSION_OK, fonction: fonctionMoi(Object.assign({}, MOI, { priere: 420 })) });
  await p.waitForTimeout(300);
  const renvoi = await p.evaluate(() => window.__banc.rpc.filter(x => x.nom === 'push_enregistrer').pop());
  const h7 = await lisible(420);
  const espaces = (s) => s.replace(/[\u00a0\u202f]/g, ' ');
  dire(r.lignes.some(l => l.k === 'non' && espaces(l.t).includes(espaces('Prière : le serveur a ' + h7 + ' au lieu de ' + hPlus + '. Ce téléphone le lui renvoie.'))),
    '    le serveur a 07:00 au lieu de ' + hPlus + ' : la ligne rouge le dit');
  dire(renvoi && renvoi.corps.p_priere === plusTard, '    et le téléphone renvoie aussitôt sa vraie heure (p_priere ' + (renvoi && renvoi.corps.p_priere) + ')');
  r = await scenario(p, { etat: VERSION_OK, fonction: fonctionMoi(Object.assign({}, MOI, { decalage: ici.dec + 120 })) });
  dire(porte(r, /Fuseau horaire : le serveur a UTC.+ au lieu de UTC/), '    un autre fuseau sur le serveur : dit, en UTC±');
  r = await scenario(p, { etat: VERSION_OK, fonction: fonctionMoi({ erreur: 'column "jeu" does not exist' }) });
  dire(porte(r, /Ce que le serveur sait de ce téléphone ne se lit pas : column "jeu"/), '    une lecture qui échoue : dite telle quelle');
  r = await scenario(p, { etat: VERSION_OK, fonction: FONCTION_OK });
  dire(!porte(r, /prochain rappel|le serveur a/), '    une fonction d\'avant la v327 (sans « moi ») : rien d\'inventé');

  /* 14. (v327) ESSAYER CHAQUE RAPPEL */
  const chaque = async (rep) => {
    await p.evaluate((rep) => { window.__banc.scenario = Object.assign({}, window.__banc.scenario, { essai: rep }); window.__banc.invoke.length = 0; }, rep);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#modRappels .mod-act button')].find(b => /chaque/.test(b.textContent)); b.click(); });
    await p.waitForTimeout(500);
    return p.evaluate(() => ({ essai: rapDiag.essai, invoke: window.__banc.invoke.slice(), vu: [...document.querySelectorAll('#modRappels .rd-t')].map(x => x.textContent).pop() }));
  };
  await scenario(p, { etat: VERSION_OK, fonction: FONCTION_OK });
  e = await chaque({ st: 200, c: { version: 327, envoye: true, envoyes: 7 } });
  const g = e.invoke[0] && e.invoke[0].corps.genres;
  dire(e.essai && e.essai.k === 'ok' && /7 rappels envoyés, un de chaque sorte/.test(e.vu) && e.invoke[0].corps.essai_moi === 'https://web.push.apple.com/appareil-de-taylor-0002'
    && Array.isArray(g) && g.join() === 'serie,defi,revoir,verset,absence,priere,lecture', "14. « Essayer chaque rappel » : les sept sortes, vers CE téléphone (" + (g || []).join(',') + ')');
  e = await chaque({ st: 200, c: { version: 326, envoye: true } });
  dire(e.essai && e.essai.k === 'att' && /ne sait pas encore envoyer chaque sorte/.test(e.vu), "    une fonction d'avant la v327 : dit, au lieu de faire semblant");
  e = await chaque({ st: 429, c: { version: 327, erreur: 'patience' } });
  dire(e.essai && e.essai.k === 'att' && /Un essai par minute/.test(e.vu), '    dans la minute d\'un autre essai : « un essai par minute »');

  /* 15. (v329) LES MESSAGES DES GROUPES */
  const sansMessages = avec(VERSION_OK, { version: 326, lies: undefined, messages_branches: undefined, reponse_message: undefined });
  r = await scenario(p, { etat: sansMessages, fonction: FONCTION_OK });
  dire(compte(r, 'non') === 1 && porte(r, /Les rappels n'annoncent pas encore les messages des groupes : Supabase → SQL Editor → recolle notifications\/installer\.sql → Run\./),
    '15. base d\'avant la v329 : UNE ligne rouge, « recolle installer.sql » (' + r.lignes.filter(l => l.k === 'non').map(l => l.t.slice(0, 50)).join(' | ') + ')');
  r = await scenario(p, { etat: VERSION_OK, fonction: { st: 200, c: { version: 328, vapid: 'ok', pub: PUB } } });
  dire(compte(r, 'non') === 0 && porte(r, /ne sait pas encore prévenir des messages : sa mise à jour part toute seule de GitHub/), '    fonction d\'avant la v329 : dit, en orange, que sa mise à jour part de GitHub');
  r = await scenario(p, { etat: avec(VERSION_OK, { reponse_message: { status_code: 200, created: new Date().toISOString(),
    contenu: JSON.stringify({ version: 329, sorte: 'message', envoyes: 0, echecs: 1, dernier_echec: { code: 403, raison: 'the VAPID credentials do not correspond' } }) } }), fonction: FONCTION_OK });
  dire(porte(r, /Dernier message \(.+\) : personne à prévenir\./) && porte(r, /1 envoi refusé par le service d'envoi \(code 403\) : the VAPID credentials/), '    un envoi refusé au dernier message : le code et la raison');
  r = await scenario(p, { etat: avec(VERSION_OK, { reponse_message: { status_code: 500, created: new Date().toISOString(), contenu: '{"version":329,"sorte":"message","erreur":"table"}' } }), fonction: FONCTION_OK });
  dire(porte(r, /La fonction a répondu 500/), '    une fonction en panne sur un message : son code, tel quel');

  /* 12. la carte tient : rien ne déborde, à 393 px */
  r = await scenario(p, { etat: null, fonction: { st: 0 } });
  const deborde = await p.evaluate(() => { const c = document.getElementById('modRappels').getBoundingClientRect();
    return [...document.querySelectorAll('#modRappels .rd-t, #modRappels button')].some(x => { const b = x.getBoundingClientRect(); return b.right > c.right + 0.5 || b.left < c.left - 0.5; }) || document.documentElement.scrollWidth > innerWidth; });
  dire(!deborde && porte(r, /ne répond pas au jeu/), 'fonction injoignable : dit, et rien ne déborde de la carte');
  if (SORTIE) {
    await scenario(p, { etat: avec(VERSION_OK, { reponse: { status_code: 401, contenu: '{}', created: new Date().toISOString() } }), fonction: { st: 401, c: {} } });
    await p.evaluate(() => document.getElementById('modRappels').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SORTIE, 'rappels-diag-jwt.png') });
    await scenario(p, { etat: VERSION_OK, fonction: FONCTION_OK });
    await p.evaluate(() => document.getElementById('modRappels').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SORTIE, 'rappels-diag-vert.png') });
  }
  dire(!errs.length, 'aucune erreur de page' + (errs.length ? ' : ' + errs.slice(0, 2).join(' / ') : ''));
  await ctx.close();

  /* 9. téléphone pas abonné ; jeu pas installé */
  for (const [nom, opts, re] of [['pas abonné', { abonne: false }, /n'est pas abonné : allume un rappel/], ['jeu pas installé', { installe: false }, /n'arrivent que dans le jeu installé/]]) {
    const t = await telephone(nav, opts);
    await ouvrirModeration(t.p);
    const r2 = await scenario(t.p, { etat: VERSION_OK, fonction: FONCTION_OK });
    dire(porte(r2, re) && !r2.boutons.includes("M'envoyer un essai") && !porte(r2, /Ce téléphone est inscrit/), nom + ' : dit, et pas de bouton d\'essai');
    await t.ctx.close();
  }

  /* 10. allumer « Rappels » : une confirmation « bienvenue », une seule fois */
  {
    const t = await telephone(nav, { abonne: false, permission: 'default' });
    await t.p.evaluate(() => { window.__banc.scenario = { essai: { st: 200, c: { version: 326, envoye: true } } }; });
    await t.p.evaluate(() => notifActiver());
    await t.p.waitForTimeout(600);
    const un = await t.p.evaluate(() => window.__banc.invoke.filter(x => x.corps.genre === 'bienvenue'));
    await t.p.evaluate(() => notifCouper());
    await t.p.waitForTimeout(400);
    await t.p.evaluate(() => notifActiver());
    await t.p.waitForTimeout(600);
    const deux = await t.p.evaluate(() => window.__banc.invoke.filter(x => x.corps.genre === 'bienvenue'));
    const jeu = await t.p.evaluate(() => window.__banc.rpc.filter(x => x.nom === 'push_enregistrer').map(x => x.corps.p_jeu));
    dire(un.length === 1 && deux.length === 1 && /^Bearer sb_publishable_/.test(un[0].auth || ''), 'allumer « Rappels » : une confirmation « bienvenue », pas deux (' + un.length + ' puis ' + deux.length + ')');
    dire(jeu.length && jeu[0] === true, "la première inscription dit déjà « rappels du jeu : oui » (p_jeu = " + jeu[0] + ')');
    await t.ctx.close();
  }

  /* 12 bis. en anglais et en espagnol, sur le plus petit écran */
  for (const lg of ['en', 'es']) {
    const t = await telephone(nav, { langue: lg, vue: { width: 320, height: 568 } });
    await ouvrirModeration(t.p);
    const r3 = await scenario(t.p, { etat: avec(VERSION_OK, { tache: { active: true, schedule: '0 * * * *' } }), fonction: { st: 401, c: {} } });
    const fr = r3.lignes.filter(l => /recolle|Verify\sJWT\s»\sactivé|téléphone/.test(l.t));
    const deb = await t.p.evaluate(() => { const c = document.getElementById('modRappels').getBoundingClientRect();
      return [...document.querySelectorAll('#modRappels .rd-t, #modRappels button')].some(x => { const b = x.getBoundingClientRect(); return b.right > c.right + 0.5; }) || document.documentElement.scrollWidth > innerWidth; });
    dire(!fr.length && !deb, lg + ' : la carte parle ' + lg + ' et tient dans 320 px' + (fr.length ? ' — en français : ' + fr[0].t.slice(0, 50) : ''));
    if (SORTIE) {
      await t.p.evaluate(() => document.getElementById('modRappels').scrollIntoView({ block: 'center' }));
      await t.p.waitForTimeout(300);
      await t.p.screenshot({ path: path.join(SORTIE, 'rappels-diag-' + lg + '-se.png') });
    }
    await t.ctx.close();
  }
  await nav.close();
  console.log(ko ? '\n  ÉCHEC — ' + ko + ' point(s)' : '\n  OK — chaque panne nommée, une fois, avec ce qu\'il faut faire et où');
  process.exit(ko ? 1 : 0);
})();
