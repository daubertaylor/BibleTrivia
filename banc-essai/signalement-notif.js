/* ====== BANC « UN SIGNALEMENT PRÉVIENT LA MODÉRATION » (v335) ======
   « Vérifie aussi que je reçois bien les notifs sur la modération. » Un
   signalement ne prévenait personne : il attendait que le modérateur ouvre
   le jeu et voie la pastille du bouclier. Toute la chaîne, pour de vrai :
   LE SERVEUR — un vrai PostgreSQL (groupes/table.sql et
   notifications/installer.sql), pg_net imité, la VRAIE fonction « rappels » :
     1. Benoît signale un message : la base appelle la fonction, qui prévient
        le téléphone de Taylor (modératrice) — « signalement », 1 à traiter —
        et celui de personne d'autre ; rien de ce qui est signalé ne part ;
     2. un deuxième objet signalé : « 2 à traiter » ;
     3. Taylor signale elle-même : on ne la prévient pas de son propre geste ;
     4. un signalement déjà traité ne sonne plus ; un téléphone qui a éteint
        les messages n'est pas prévenu ;
   LE TÉLÉPHONE — sw.js tel quel, dans un bac à sable :
     5. « Modération » / « Un signalement à traiter. » (« 3 signalements à
        traiter. »), l'icône de la modération, et il sonne ; en anglais et en
        espagnol ; messages éteints ici : rien ;
     6. le jeu ouvert reçoit le compte (sa pastille) ; la notification
        touchée : le jeu ouvert va à la Modération, fermé il s'ouvre sur
        ./?moderation=1 ;
   LE JEU :
     7. ouvert par ./?moderation=1, il va à la Modération, et l'adresse se
        nettoie ; un joueur qui n'est pas modérateur reste où il est ;
     8. le compte arrivé du service worker : la pastille du bouclier le dit ;
     9. aucune erreur.
   Avant la v335 : 1 à 8 rouges — aucun appel, aucun genre « signalement »,
   aucune porte vers la Modération.
   Usage : node banc-essai/signalement-notif.js [url] */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const { brancherFonction, lit } = require('./fonction-rappels.js');
const ADRESSE = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000f1', B = 'bbbbbbbb-0000-4000-8000-0000000000f2', C = 'cccccccc-0000-4000-8000-0000000000f3';
const EP_A = 'https://push.exemple/telephone-de-taylor', EP_A2 = 'https://push.exemple/tablette-de-taylor', EP_C = 'https://push.exemple/telephone-de-chloe';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 360) + ')' : '')); };

/* Le service worker dans un bac à sable (comme sw-messages.js). */
function bac(miroir, fenetres) {
  const journal = [], ecoute = {}, ouvertes = [];
  const idb = { open() { const r = {}; setTimeout(() => { r.result = { objectStoreNames: { contains: () => true },
    transaction() { return { objectStore() { return { get() { const g = {}; setTimeout(() => { g.result = miroir; g.onsuccess && g.onsuccess(); }, 0); return g; }, put() { return {}; } }; } }; } };
    r.onsuccess && r.onsuccess(); }, 0); return r; } };
  const self = {
    registration: { scope: 'https://exemple.github.io/BibleTrivia/',
      showNotification: (t, o) => { journal.push(Object.assign({ title: t }, o || {})); return Promise.resolve(); },
      getNotifications: () => Promise.resolve([]) },
    addEventListener: (nom, fn) => { ecoute[nom] = fn; }, skipWaiting() {}, clients: { claim() {} },
  };
  const clients = { matchAll: () => Promise.resolve(fenetres || []), openWindow: (u) => { ouvertes.push(u); return Promise.resolve({}); } };
  const ctx = { self, indexedDB: idb, caches: { open: () => Promise.resolve({}), keys: () => Promise.resolve([]), match: () => Promise.resolve(null) },
    clients, fetch: () => Promise.reject(new Error('hors ligne')), URL, Request: function () {}, Response: function () {},
    console, setTimeout, clearTimeout, Promise, Date, Math, JSON, encodeURIComponent };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), ctx);
  const recevoir = async (charge) => { let p = null; ecoute.push({ data: { json: () => charge }, waitUntil: (x) => { p = x; } }); await p; return journal.splice(0); };
  const toucher = async (n) => { let p = null; ecoute.notificationclick({ notification: Object.assign({ close() {} }, n), waitUntil: (x) => { p = x; } }); await p; return ouvertes.splice(0); };
  return { recevoir, toucher };
}
const fenetre = (visible) => { const f = { visibilityState: visible ? 'visible' : 'hidden', recus: [], focus() { f.auPremierPlan = true; return Promise.resolve(f); }, postMessage(m) { f.recus.push(m); } }; return f; };

(async () => {
  const erreurs = [];
  /* ===== LE SERVEUR ===== */
  const m = await monter(8506, 5710, { rappels: true });
  try {
    const fn = await brancherFonction(m.sql);
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    await m.moderateur(A);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const abo = (ep, qui, messages) => m.sql(`insert into public.push_subs (endpoint, abonnement, membre, messages) values (${lit(ep)}, ${lit(JSON.stringify({ endpoint: ep, keys: { p256dh: 'x', auth: 'y' } }))}::jsonb, '${qui}', ${messages ? 'true' : 'false'})`);
    await abo(EP_A, A, true); await abo(EP_A2, A, false); await abo(EP_C, C, true);
    const msgC = (await m.rpc(C, 'envoyer_message', { p_groupe: g.id, p_texte: 'Coucou tout le monde', p_genre: 'texte', p_donnees: {} })).data;
    await fn.nouveaux();
    fn.envois.length = 0;
    /* Les appels de la base pour les signalements, servis à la fonction. */
    const servirSignalements = async () => {
      const l = (await fn.nouveaux()).filter(x => x.body && x.body.signalement != null);
      const rep = [];
      for (const x of l) rep.push(await fn.servir(x));
      return rep;
    };

    /* 1 */
    const s1 = await m.rpc(B, 'signaler', { p_message: +msgC.id, p_cible: null, p_groupe: null, p_raison: 'spam', p_details: 'pub pour un site' });
    const r1 = await servirSignalements();
    const e1 = fn.envois.splice(0);
    dit('1. Benoît signale un message : la fonction prévient le téléphone de Taylor, et lui seul (rien de ce qui est signalé ne part)',
      s1.data && s1.data.ok && r1.length === 1 && r1[0].c.sorte === 'signalement' && e1.length === 1 && e1[0].qui === EP_A && e1[0].charge.genre === 'signalement' && e1[0].charge.n === 1
        && !/Coucou|pub pour/.test(JSON.stringify(e1[0].charge)) && e1[0].options && e1[0].options.urgency === 'high',
      JSON.stringify({ r1: r1.map(x => x.c), e1 }));
    /* 2 */
    await m.rpc(B, 'signaler', { p_message: null, p_cible: C, p_groupe: null, p_raison: 'harcelement', p_details: '' });
    const r2 = await servirSignalements();
    const e2 = fn.envois.splice(0);
    dit('2. un deuxième objet signalé : « 2 à traiter »', r2.length === 1 && e2.length === 1 && e2[0].charge.n === 2, JSON.stringify({ r2: r2.map(x => x.c), e2 }));
    /* 3 */
    await m.rpc(A, 'signaler', { p_message: null, p_cible: B, p_groupe: null, p_raison: 'spam', p_details: '' });
    const r3 = await servirSignalements();
    const e3 = fn.envois.splice(0);
    dit('3. Taylor signale elle-même : on ne la prévient pas de son propre geste', r3.length === 1 && !e3.length && /aucun modérateur/.test(r3[0].c.rien || ''), JSON.stringify(r3.map(x => x.c)));
    /* 4 */
    const id1 = await m.sql(`select min(id) from public.signalements`);
    await m.sql(`update public.signalements set traite_le = now(), decision = 'rien' where id = ${+id1}`);
    const r4 = await fn.servir({ headers: (await fn.recus())[0].headers, body: { signalement: +id1 } });
    const e4 = fn.envois.splice(0);
    dit('4. un signalement déjà traité ne sonne plus ; le téléphone aux messages éteints n\'est jamais prévenu',
      !e4.length && /déjà traité/.test(r4.c.rien || '') && !e1.concat(e2).some(x => x.qui === EP_A2), JSON.stringify(r4.c));
  } catch (e) { console.error(e); ko++; }
  finally { await m.arreter(); }

  /* ===== LE TÉLÉPHONE ===== */
  try {
    const MIROIR = { actif: false, priere: -1, lecture: -1, messages: true, langue: 'fr' };
    let b = bac(MIROIR, []);
    const n1 = (await b.recevoir({ genre: 'signalement', n: 1, decalage: 60 }))[0] || {};
    const n3 = (await b.recevoir({ genre: 'signalement', n: 3, decalage: 60 }))[0] || {};
    const en = (await bac(Object.assign({}, MIROIR, { langue: 'en' }), []).recevoir({ genre: 'signalement', n: 2 }))[0] || {};
    const es = (await bac(Object.assign({}, MIROIR, { langue: 'es' }), []).recevoir({ genre: 'signalement', n: 1 }))[0] || {};
    const eteint = await bac(Object.assign({}, MIROIR, { messages: false }), []).recevoir({ genre: 'signalement', n: 1 });
    dit('5. « Modération » / « Un signalement à traiter. », l\'icône de la modération, il sonne ; « 3 signalements à traiter. » ; anglais, espagnol ; messages éteints : rien',
      n1.title === 'Modération' && n1.body === 'Un signalement à traiter.' && /moderation\.png$/.test(n1.icon || '') && n1.renotify === true && n1.tag === 'signalement'
        && n3.body === '3 signalements à traiter.' && en.title === 'Moderation' && en.body === '2 reports to review.' && es.title === 'Moderación' && es.body === 'Una denuncia por revisar.' && !eteint.length,
      JSON.stringify({ n1: [n1.title, n1.body, n1.icon], n3: n3.body, en: [en.title, en.body], es: [es.title, es.body], eteint: eteint.length }));
    /* 6 */
    const f = fenetre(true);
    b = bac(MIROIR, [f]);
    const n6 = (await b.recevoir({ genre: 'signalement', n: 2 }))[0] || {};
    const compte = f.recus.find(x => x && typeof x.signalements === 'number');
    await b.toucher(n6);
    const ouvre = f.recus.some(x => x && x.ouvrirModeration === true) && f.auPremierPlan;
    const ferme = await bac(MIROIR, []).toucher(n6);
    dit('6. le jeu ouvert reçoit le compte ; touchée : le jeu ouvert va à la Modération, fermé il s\'ouvre sur ./?moderation=1',
      compte && compte.signalements === 2 && ouvre && ferme.length === 1 && ferme[0] === './?moderation=1', JSON.stringify({ recus: f.recus, ferme }));
  } catch (e) { console.error(e); ko++; }

  /* ===== LE JEU ===== */
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    for (const modo of [true, false]) {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(ADRESSE + '?moderation=1');
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      const r = await p.evaluate(async (modo) => {
        compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'joueur@exemple.net' } }; compte.etape = 'connecte';
        grp.installe = true; grp.ouverts = true; grp.liste = []; grp.publics = [];
        grp.etat = { participe: 'ok', moderateur: modo, ouverts: true, a_traiter: 1 };
        /* la file du serveur : vide d'abord, puis les trois cartes que le
           compte annonce */
        window.__file = [];
        window.listeGroupe = async (n) => n === 'moderation_ouverte' ? window.__file : [];
        const avant = moderationEnAttente;
        servirModeration();
        await new Promise(x => setTimeout(x, 1500));
        const apres = { ecran: state.screen, adresse: location.search, attente: moderationEnAttente };
        let pastille = null;
        if (modo) {
          state.screen = 'groupes'; render();
          await new Promise(x => setTimeout(x, 600));
          const carte = (k) => ({ id: k, raison: 'spam', details: '', le: new Date().toISOString(), groupe: 'g-' + k, groupe_nom: 'Les amis',
            message: k, texte: 'Amen', cible: 'u-' + k, cible_nom: 'Sam', par_nom: 'Lee', nb: 1 });
          window.__file = [carte(1), carte(2), carte(3)];
          signalementsArrives(3);
          await new Promise(x => setTimeout(x, 400));
          const e = document.querySelector('.grp-modo .bb-pastille');
          pastille = e ? { cache: e.hidden, texte: e.textContent } : null;
        }
        return { avant, apres, pastille };
      }, modo);
      if (modo) {
        dit('7. ouvert par ./?moderation=1 : la Modération, l\'adresse nettoyée', r.avant === true && r.apres.ecran === 'moderation' && r.apres.adresse === '' && r.apres.attente === false, JSON.stringify(r));
        dit('8. le compte arrivé du service worker : la pastille du bouclier dit 3', r.pastille && !r.pastille.cache && r.pastille.texte === '3', JSON.stringify(r.pastille));
      } else {
        dit('7b. un joueur qui n\'est pas modérateur reste où il est', r.apres.ecran === 'mode', JSON.stringify(r));
      }
      await ctx.close();
    }
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  dit('9. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — un signalement prévient la modération, du serveur au téléphone et au jeu');
  process.exit(ko ? 1 : 0);
})();
