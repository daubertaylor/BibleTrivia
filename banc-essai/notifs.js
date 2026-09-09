/* ============== BANC « LE RAPPEL POUR TOUT LE MONDE » ==============
   « Je veux que TOUS les appareils qui utilisent le jeu aient les
   notifications, pas seulement moi. »
   Le rappel de série s'inscrit dans une table du serveur : un appareil absent
   de cette table ne peut PAS être réveillé, quoi qu'il arrive. Or l'inscription
   était écrite « si le lien avec le serveur existe déjà » — et ce lien n'est
   ouvert qu'en entrant dans le mode en ligne. Un joueur qui n'a jamais fait de
   partie à distance allumait donc l'interrupteur, le voyait s'allumer, et
   restait inconnu du serveur.
   Le banc joue exactement ce cas : un joueur qui ne fait QUE du solo, qui
   n'ouvre jamais le mode en ligne, et qui active le rappel.
   Trois choses vérifiées :
     inscrit    l'appareil arrive-t-il dans la table push_subs ?
     discret    n'y met-il QUE ce qu'il faut (adresse d'envoi, clés, date) —
                aucun pseudo, aucun score, aucune progression ?
     retiré     l'extinction efface-t-elle la ligne ?
   Le jeu livré n'a pas encore de clé publique : sans elle, le réglage est
   volontairement caché. Le banc en injecte une le temps de l'essai — il teste
   le chemin, pas la clé.
   Usage : node banc-essai/notifs.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
/* Une clé publique VAPID valide (65 octets en base64url) — de laboratoire. */
const CLE = 'BOveRs4clrziwaZmqCy4re5c-vpsPRGRvw0mfUxP5D3u920HJW45-o7V1avGrvsKwFiFj-Jv6WQ-6O8JkXgi21g';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let injectee = true;

  /* La page telle qu'elle est livrée, avec la seule clé publique en plus. */
  await p.route('**/*.html*', async (route) => {
    const rep = await route.fetch();
    let corps = await rep.text();
    const avant = corps;
    corps = corps.replace('const VAPID_PUBLIC = "";', 'const VAPID_PUBLIC = "' + CLE + '";');
    if (corps === avant) { injectee = false; }
    await route.fulfill({ response: rep, body: corps });
  });

  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    /* Une série de 3 jours en cours : c'est le cas où le rappel a un sens. */
    const j = (d) => { const x = new Date(Date.now() - d*86400000); const p2 = n => String(n).padStart(2,'0');
      return x.getFullYear() + '-' + p2(x.getMonth()+1) + '-' + p2(x.getDate()); };
    localStorage.setItem('bt_daily', JSON.stringify({ last:j(1), streak:3 }));

    /* ---- l'autorisation système, accordée ---- */
    window.Notification = function(){};
    window.Notification.permission = 'granted';
    window.Notification.requestPermission = () => Promise.resolve('granted');

    /* ---- un service worker de laboratoire ---- */
    const abo = {
      endpoint: 'https://exemple.push/appareil-de-taylor-0001',
      toJSON(){ return { endpoint:this.endpoint, keys:{ p256dh:'…', auth:'…' } }; },
      unsubscribe(){ window.__banc.desabonne = true; return Promise.resolve(true); },
    };
    let pose = null;
    const reg = { pushManager: {
      getSubscription: () => Promise.resolve(pose),
      subscribe: () => { pose = abo; return Promise.resolve(abo); },
    }, update(){}, };
    Object.defineProperty(navigator, 'serviceWorker', { configurable:true, value:{
      ready: Promise.resolve(reg),
      register: () => Promise.resolve(reg),
      getRegistration: () => Promise.resolve(reg),
      addEventListener(){}, controller: null,
    }});

    /* ---- un Supabase de laboratoire, qui NOTE ce qu'on lui écrit ---- */
    window.__banc = { ecrits: [], desabonne:false, clientCree:0 };
    window.supabase = { createClient(){
      window.__banc.clientCree++;
      const table = (nom) => ({
        upsert(ligne){ window.__banc.ecrits.push({ op:'upsert', table:nom, ligne }); return Promise.resolve({ error:null }); },
        update(ligne){ window.__banc.ecrits.push({ op:'update', table:nom, ligne });
          return { eq(){ return Promise.resolve({ error:null }); } }; },
        delete(){ window.__banc.ecrits.push({ op:'delete', table:nom });
          return { eq(){ return Promise.resolve({ error:null }); } }; },
        select(){ const q = { eq:()=>q, gte:()=>q, then:(r)=>Promise.resolve({data:[],error:null}).then(r) }; return q; },
        insert(){ return Promise.resolve({ error:null }); },
      });
      return { from: table, channel(){ const a = { on:()=>a, subscribe(){ return a; }, track(){ return Promise.resolve('ok'); },
        untrack(){ return Promise.resolve('ok'); }, send(){ return Promise.resolve('ok'); },
        presenceState(){ return {}; }, unsubscribe(){ return Promise.resolve('ok'); } }; return a; },
        removeChannel(){ return Promise.resolve('ok'); } };
    }};
  });

  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.waitForTimeout(600);

  /* Un joueur QUI NE FAIT QUE DU SOLO : on ne touche jamais au mode en ligne. */
  const avantLigne = await p.evaluate(() => !!net.supa);
  await p.evaluate(() => setNotif(true));
  await p.waitForTimeout(900);

  const r = await p.evaluate(() => ({
    ecrits: window.__banc.ecrits,
    allume: !!settings.notif,
  }));
  const inscription = r.ecrits.find(e => e.op === 'upsert' && e.table === 'push_subs');
  const suivi       = r.ecrits.find(e => e.op === 'update' && e.table === 'push_subs');

  /* Extinction : la ligne doit partir. */
  await p.evaluate(() => setNotif(false));
  await p.waitForTimeout(700);
  const efface = await p.evaluate(() => window.__banc.ecrits.some(e => e.op === 'delete' && e.table === 'push_subs'));

  await nav.close();

  const PERMIS = ['endpoint','abonnement','maj','dernier','serie','decalage'];
  const indiscret = [];
  for (const e of [inscription, suivi]) {
    if (!e) continue;
    Object.keys(e.ligne || {}).forEach(k => { if (!PERMIS.includes(k)) indiscret.push(k); });
  }

  console.log('  le joueur n\'a jamais ouvert le mode en ligne : ' + (avantLigne ? 'FAUX (lien déjà ouvert)' : 'vrai'));
  console.log('  interrupteur allumé      : ' + (r.allume ? 'oui' : 'NON'));
  console.log('  inscrit dans push_subs   : ' + (inscription ? 'oui — ' + Object.keys(inscription.ligne).join(', ') : 'NON'));
  console.log('  série et fuseau transmis : ' + (suivi ? 'oui — ' + Object.keys(suivi.ligne).join(', ') : 'NON'));
  console.log('  rien de personnel envoyé : ' + (indiscret.length ? 'NON — ' + indiscret.join(', ') : 'oui'));
  console.log('  retiré à l\'extinction    : ' + (efface ? 'oui' : 'NON'));
  if (errs.length) console.log('  ERREURS JS : ' + [...new Set(errs)].slice(0,3).join(' | '));

  if (!injectee) console.log('  LA CLÉ N\'A PAS PU ÊTRE INJECTÉE — le banc ne teste rien');
  const ok = injectee && !avantLigne && r.allume && !!inscription && !!suivi && !indiscret.length && efface && !errs.length;
  console.log(ok ? '\n  OK — un appareil qui n\'a jamais joué en ligne est quand même inscrit'
                 : '\n  ÉCHEC — cet appareil ne recevra jamais de rappel');
  process.exit(ok ? 0 : 1);
})();
