/* ====== BANC « LES NOTIFICATIONS DES MESSAGES, DU TÉLÉPHONE AU SERVEUR ET RETOUR » (v329) ======
   « Je veux aussi que tu fasses les notifications des messages. » Toute la
   chaîne, pour de vrai : le décor de groupes.js (un VRAI PostgreSQL, les
   vraies règles) avec notifications/installer.sql collé par-dessus, le jeu
   de Benoît sur un Android où Yada est installé (permission, abonnement push
   et service worker simulés — le banc sw-messages.js éprouve le vrai), et la
   VRAIE fonction des rappels, qui lit la base et note ses envois.
     1. « Compte les messages de groupe comme des rappels, pas comme un
        rappel spécifique » : aucune ligne à part dans les Réglages, et rien
        dans les infos du groupe ;
     2. Benoît écrit dans le groupe, puis revient à la liste : on lui propose
        les rappels, UNE fois (la phrase dit les messages) ; « D'accord » :
        la permission, l'abonnement, et le serveur rattache ce téléphone au
        compte de Benoît, messages voulus ; la proposition ne revient pas ;
        (v331) tant que le jeu est à l'écran, le téléphone le dit au serveur
        (« ecran », dans son abonnement) ; passé derrière, il dit le
        contraire aussitôt ; « messages » ne bouge jamais ;
     3. Taylor écrit pendant que Benoît a la discussion ouverte : personne
        n'est prévenu (il l'a lue) ;
     4. (v331) Benoît dans le jeu, sur la liste : rien ne sonne — le jeu
        montre déjà le message ; Benoît quitte le jeu : Taylor écrit, son
        téléphone est prévenu — le groupe, son nom, Taylor, le texte ;
     5. la notification touchée, jeu ouvert à l'accueil : la discussion
        s'ouvre, et la notification du groupe s'en va du téléphone ;
     6. le jeu fermé, ouvert par la notification (./?discussion=…) : il va
        droit à la discussion, et l'adresse se nettoie ;
     7. une partie en cours ne s'interrompt pas ;
     8. un serveur d'avant la v329 (installer.sql pas encore recollé) : les
        rappels s'allument quand même, et le serveur ne note AUCUN « oui »
        aux messages (rien n'est promis qu'il ne tiendrait pas) ;
     9. Benoît se déconnecte : le serveur détache le téléphone, plus rien
        n'arrive ;
    10. « Rappels » éteint : désinscrit, plus rien n'arrive ;
    11. aucune erreur.
   Usage : node banc-essai/messages-notifs.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const { brancherFonction, lit } = require('./fonction-rappels.js');
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000e1', B = 'bbbbbbbb-0000-4000-8000-0000000000e2', C = 'cccccccc-0000-4000-8000-0000000000e3';
const EP_B = 'https://push.exemple/telephone-de-benoit-0001';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8495, 5697, { rappels: true });
  const fn = await brancherFonction(m.sql);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'jp@essai', 'Jean Paul', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    fn.nouveaux();   // les lignes du jeu n'appellent rien ; on part de zéro
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 100 }).then(() => true).catch(() => false);
    /* Taylor écrit ; la fonction passe comme pg_net la lancerait (avec ses 4 s d'attente). */
    const taylorEcrit = async (texte) => {
      await fn.nouveaux();   // les messages de Benoît ont eu leurs appels : seul compte celui de Taylor
      await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
      const r = await m.rpc(A, 'envoyer_message', { p_groupe: g.id, p_texte: texte, p_genre: 'texte', p_donnees: {} });
      if (!r.data || !r.data.ok) throw new Error('envoi refusé : ' + JSON.stringify(r));
      const l = await fn.nouveaux();
      fn.envois.length = 0;
      const rep = l.length ? await fn.servir(l[0]) : null;
      return { id: r.data.id, appels: l.length, rep, pourB: fn.envois.filter(x => x.qui === EP_B) };
    };
    const ligneB = async () => JSON.parse(await m.sql("select coalesce((select to_jsonb(x) from (select membre, messages, abonnement->'ecran' as ecran from public.push_subs where endpoint = " + lit(EP_B) + ") x), 'null'::jsonb)"));
    const attendreLigne = async (f) => { for (let i = 0; i < 30; i++){ const l = await ligneB(); if (f(l)) return l; await new Promise(r => setTimeout(r, 150)); } return null; };
    /* (v331) Le jeu passe derrière (on change d'app, on verrouille) ou revient. */
    const cacher = (pg, oui) => pg.evaluate((oui) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => oui ? 'hidden' : 'visible' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => oui });
      document.dispatchEvent(new Event('visibilitychange'));
    }, oui);

    const telephone = async (suite, regles) => {
      const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(e.message));
      if (regles) await regles(p);
      await p.addInitScript(([moi, ep]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: 'Benoît', color: '#E8734C' }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
        /* Yada installé sur l'écran d'accueil. */
        const vraiMM = window.matchMedia.bind(window);
        window.matchMedia = (q) => /display-mode: standalone/.test(String(q))
          ? { matches: true, media: q, onchange: null, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } } : vraiMM(q);
        window.Notification = function(){};
        window.Notification.permission = sessionStorage.getItem('essai_perm') || 'default';
        window.Notification.requestPermission = () => { window.Notification.permission = 'granted'; sessionStorage.setItem('essai_perm', 'granted'); return Promise.resolve('granted'); };
        window.__banc = { abonne: 0, desabonne: 0, fermees: [], ecouteSW: null };
        /* Le tiroir de notifications du téléphone, tel que le jeu le lit. */
        window.__tiroir = [];
        const abo = { endpoint: ep, toJSON(){ return { endpoint: ep, keys: { p256dh: 'p', auth: 'a' } }; },
          unsubscribe(){ window.__banc.desabonne++; sessionStorage.removeItem('essai_abo'); pose = null; return Promise.resolve(true); } };
        let pose = sessionStorage.getItem('essai_abo') ? abo : null;
        const reg = { pushManager: { getSubscription: () => Promise.resolve(pose),
            subscribe: () => { window.__banc.abonne++; pose = abo; sessionStorage.setItem('essai_abo', '1'); return Promise.resolve(abo); } },
          getNotifications: (f) => Promise.resolve(window.__tiroir.filter(n => !f || !f.tag || n.tag === f.tag)),
          update(){} };
        Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
          ready: Promise.resolve(reg), register: () => Promise.resolve(reg), getRegistration: () => Promise.resolve(reg), controller: null,
          addEventListener(t, f){ if (t === 'message') window.__banc.ecouteSW = f; }, removeEventListener(){} } });
      }, [B, EP_B]);
      await p.goto(m.url + (suite || ''));
      await p.waitForFunction(() => { try { return state.screen !== 'splash' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.waitForTimeout(600);
      return { ctx, p };
    };

    /* ===== 1 ===== */
    let { ctx, p } = await telephone();
    await p.evaluate(() => openSettings());
    await p.waitForTimeout(900);
    const r1 = await p.evaluate(() => ({ lignes: [...document.querySelectorAll('#settingsVeil .set-row b')].map(b => b.textContent), rappels: !!document.getElementById('swNotif') }));
    dit('1. pas de ligne à part pour les messages : ils sont des rappels (« ' + r1.lignes.join(' », « ') + ' »)',
      r1.rappels && !r1.lignes.some(t => /message/i.test(t)));
    await p.evaluate(() => closeSettings());
    await p.waitForTimeout(500);
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    await p.evaluate(() => ouvrirInfosGroupe());
    await p.waitForTimeout(1200);
    const infos = await p.evaluate(() => document.querySelector('#grpInfosVeil .grp-feuille-corps').textContent.replace(/\s+/g, ' '));
    dit('   rien dans les infos du groupe', !/notifications des messages|Activer/.test(infos));
    await p.evaluate(() => fermerFeuilleGroupe('grpInfosVeil'));
    await p.waitForTimeout(600);

    /* ===== 2 ===== */
    await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
    await p.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = 'Bonsoir à tous'; surSaisie(t); envoyerMessageGroupe(); });
    await attendre(p, () => grp.aEcrit === true, null, 6000);
    const pendant = await p.evaluate(() => !!document.querySelector('.modal-card'));
    await p.evaluate(() => retourGroupes());
    const propose = await attendre(p, () => !!document.querySelector('.modal-card'), null, 4000);
    const mots = await p.evaluate(() => { const c = document.querySelector('.modal-card'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
    dit('2. écrit dans le groupe, revenu à la liste : les rappels sont proposés (pas pendant qu\'on écrit), la phrase dit les messages',
      !pendant && propose && /messages de tes groupes/.test(mots), mots.slice(0, 120));
    await p.evaluate(() => { const b = document.getElementById('modalOk'); if (b) b.click(); });
    await attendre(p, () => settings.notif === true, null, 6000);
    await p.waitForTimeout(1200);
    const l2 = await ligneB();
    dit('   « D\'accord » : le serveur rattache ce téléphone au compte de Benoît, messages voulus, jeu à l\'écran', !!l2 && l2.membre === B && l2.messages === true && l2.ecran === true, JSON.stringify(l2));
    await cacher(p, true);
    const l2b = await attendreLigne((l) => l && l.ecran === false && l.messages === true);
    await cacher(p, false);
    const l2c = await attendreLigne((l) => l && l.ecran === true && l.messages === true);
    dit('   (v331) le jeu passe derrière : le téléphone le dit aussitôt ; il revient : « à l\'écran » — les messages restent voulus', !!l2b && !!l2c, JSON.stringify(l2b) + ' → ' + JSON.stringify(l2c));
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(p, () => state.screen === 'groupe', null, 6000);
    await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
    await p.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = 'Encore moi'; surSaisie(t); envoyerMessageGroupe(); });
    await p.waitForTimeout(800);
    await p.evaluate(() => retourGroupes());
    await p.waitForTimeout(1200);
    dit('   la proposition ne revient pas', !(await p.evaluate(() => !!document.querySelector('.modal-card'))));
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    await p.waitForTimeout(600);

    /* ===== 3 ===== */
    let t = await taylorEcrit('Tu es là ?');
    dit('3. Benoît a la discussion ouverte : la fonction est appelée, et ne le prévient pas (il l\'a lue)', t.appels === 1 && t.rep && t.rep.st === 200 && !t.pourB.length,
      JSON.stringify(t.rep && t.rep.c));

    /* ===== 4 ===== */
    await p.evaluate(() => retourGroupes());
    await p.waitForTimeout(700);
    t = await taylorEcrit('Tu nous rejoins ?');
    dit('4. Benoît dans le jeu, sur la liste : rien ne sonne (le jeu montre déjà le message)', t.appels === 1 && !t.pourB.length && t.rep && t.rep.c.presents === 1, JSON.stringify(t.rep && t.rep.c));
    await cacher(p, true);
    await attendreLigne((l) => l && l.ecran === false);
    t = await taylorEcrit('On joue ce soir ?');
    const c4 = t.pourB[0] && t.pourB[0].charge;
    dit('   Benoît quitte le jeu : son téléphone est prévenu', t.pourB.length === 1 && c4.genre === 'message' && c4.groupe === g.id && c4.nom === 'Les amis' && c4.de === 'Taylor' && c4.texte === 'On joue ce soir ?',
      JSON.stringify(c4));
    await cacher(p, false);

    /* ===== 5 ===== */
    await p.evaluate(() => allerOnglet('accueil'));
    await p.waitForTimeout(600);
    await p.evaluate((id) => { window.__tiroir.push({ tag: 'grp-' + id, close(){ window.__banc.fermees.push(this.tag); window.__tiroir = window.__tiroir.filter(x => x !== this); } });
      window.__tiroir.push({ tag: 'serie', close(){ window.__banc.fermees.push(this.tag); } }); }, g.id);
    await p.evaluate((id) => window.__banc.ecouteSW({ data: { ouvrirGroupe: id } }), g.id);
    const ouvert5 = await attendre(p, (id) => state.screen === 'groupe' && grp.courant === id && !!document.getElementById('fil'), g.id, 8000);
    await p.waitForTimeout(800);
    const ferm = await p.evaluate(() => window.__banc.fermees.slice());
    dit('5. la notification touchée, jeu à l\'accueil : la discussion s\'ouvre', ouvert5);
    dit('   la notification du groupe s\'en va du téléphone (et elle seule)', ferm.length === 1 && ferm[0] === 'grp-' + g.id, ferm.join(', '));
    await ctx.close();

    /* ===== 6 ===== */
    ({ ctx, p } = await telephone('?discussion=' + g.id, async (pg) => { await pg.addInitScript(() => { sessionStorage.setItem('essai_perm', 'granted'); sessionStorage.setItem('essai_abo', '1'); }); }));
    const ouvert6 = await attendre(p, (id) => state.screen === 'groupe' && grp.courant === id, g.id, 9000);
    const adresse = await p.evaluate(() => location.search);
    dit('6. le jeu ouvert par la notification va droit à la discussion, l\'adresse se nettoie', ouvert6 && !/discussion/.test(adresse), 'adresse « ' + adresse + ' »');

    /* ===== 7 ===== */
    await p.evaluate(() => { retourGroupes(); });
    await p.waitForTimeout(500);
    const ecran7 = await p.evaluate((id) => { state.screen = 'play'; window.__banc.ecouteSW({ data: { ouvrirGroupe: id } }); return { s: state.screen, c: grp.courant }; }, g.id);
    await p.waitForTimeout(400);
    const apres7 = await p.evaluate(() => ({ s: state.screen, c: grp.courant }));
    dit('7. une partie en cours ne s\'interrompt pas', apres7.s === 'play' && !apres7.c, JSON.stringify(apres7));
    await p.evaluate(() => { state.screen = 'mode'; render(); });
    await ctx.close();

    /* ===== 8 : un serveur d'avant la v329 ===== */
    await m.sql('delete from public.push_subs');
    ({ ctx, p } = await telephone('', async (pg) => {
      await pg.addInitScript(() => { sessionStorage.setItem('essai_perm', 'granted'); });
      await pg.route('**/faux/rpc', async (route) => {
        const b = JSON.parse(route.request().postData() || '{}');
        if (b.nom === 'push_enregistrer' && b.args && 'p_messages' in b.args) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }) });
        return route.continue();
      });
    }));
    await p.evaluate(() => openSettings());
    await p.waitForTimeout(900);
    await p.locator('#swNotif').tap();
    await attendre(p, () => settings.notif === true, null, 5000);
    await p.waitForTimeout(1500);
    const r8 = await p.evaluate(() => ({ on: !!document.querySelector('#swNotif.on'), mot: (document.querySelector('.mini-toast.show') || {}).textContent || '' }));
    const l8 = await ligneB();
    dit('8. serveur d\'avant la v329 : les rappels s\'allument, aucun « oui » aux messages n\'est noté', r8.on && !r8.mot && l8 && l8.messages === null, JSON.stringify(r8) + ' ' + JSON.stringify(l8));
    await ctx.close();

    /* ===== 9 : la déconnexion ===== */
    await m.sql('delete from public.push_subs');
    ({ ctx, p } = await telephone());
    await p.evaluate(() => openSettings());
    await p.waitForTimeout(900);
    await p.locator('#swNotif').tap();
    await attendre(p, () => settings.notif === true, null, 5000);
    await p.waitForTimeout(1200);
    const avant9 = await ligneB();
    await p.evaluate(() => { closeSettings(); window.__seDeconnecter(); });
    await p.waitForTimeout(2500);
    const apres9 = await ligneB();
    t = await taylorEcrit('Toujours là ?');
    dit('9. Benoît se déconnecte : le serveur détache le téléphone, plus rien n\'arrive', avant9 && avant9.membre === B && apres9 && apres9.membre === null && !t.pourB.length,
      JSON.stringify(avant9) + ' → ' + JSON.stringify(apres9));
    await ctx.close();

    /* ===== 10 : éteint dans les Réglages ===== */
    await m.sql('delete from public.push_subs');
    ({ ctx, p } = await telephone());
    await p.evaluate(() => openSettings());
    await p.waitForTimeout(900);
    await p.locator('#swNotif').tap();
    await attendre(p, () => settings.notif === true, null, 5000);
    await p.waitForTimeout(1200);
    const on10 = await ligneB();
    await p.locator('#swNotif').tap();
    await p.waitForTimeout(1500);
    const off10 = await ligneB();
    const des = await p.evaluate(() => window.__banc.desabonne);
    t = await taylorEcrit('Et là ?');
    dit('10. « Rappels » éteint : désinscrit, plus rien n\'arrive', on10 && on10.messages === true && off10 === null && des === 1 && !t.pourB.length,
      JSON.stringify(on10) + ' → ' + JSON.stringify(off10) + ', désabonné ×' + des);
    await ctx.close();

    dit('11. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — un message prévient le téléphone de qui ne l\'a pas lu, et la notification ouvre la discussion' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
