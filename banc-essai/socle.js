/* ====== BANC « CHACUN NE TÉLÉCHARGE QUE SA LANGUE » ======
   Le socle du service worker (CORE, dans sw.js) est ce que TOUT LE MONDE
   télécharge à l'installation. questions-en.js y avait été ajouté par réflexe,
   et questions-es.js allait l'y rejoindre : six cent mille octets imposés à
   tous les joueurs, dont les français, qui n'en liront jamais une ligne.

   Les deux banques en sont sorties. Mais les en sortir ne suffisait pas : au
   TOUT PREMIER chargement, le service worker vient à peine de s'installer et
   ne contrôle pas encore la page — la requête du <script> passe à côté de lui
   et rien n'est mis en cache (mesuré : cache vide de questions-es.js après une
   première visite en espagnol). La page lui demande donc explicitement de
   garder LA SIENNE, une fois arrivée.

   Ce banc vérifie les deux moitiés de cette histoire, dans les trois langues,
   avec le service worker RÉELLEMENT actif (pas bloqué comme dans les autres
   bancs) :
     - le joueur a en cache la banque de SA langue, dès la première ouverture ;
     - il n'a PAS celle des autres ;
     - et le socle (l'app, les polices, les icônes) est là dans tous les cas.

   Usage : node banc-essai/socle.js        (le serveur 8099 doit tourner)
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const CAS = [
  ['fr', null],
  ['en', 'questions-en.js'],
  ['es', 'questions-es.js'],
];
const TOUTES = ['questions-en.js', 'questions-es.js'];

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const fautes = [];
  for(const [lg, attendu] of CAS){
    /* Un contexte NEUF par langue : cache, service worker et stockage repartent
       de zéro, comme une vraie première installation. */
    const ctx = await nav.newContext({ viewport:{ width:390, height:844 } });
    const p = await ctx.newPage();
    await p.addInitScript((l) => { try{ localStorage.setItem('bt_langue', l); }catch(e){} }, lg);
    await p.goto(URL, { waitUntil:'load' });
    await p.waitForFunction(() => typeof state !== 'undefined' && state.screen === 'mode', null, { timeout:25000 });
    if(attendu) await p.waitForFunction((n) => !!self[n], { en:'BANQUE_EN', es:'BANQUE_ES' }[lg], { timeout:20000 }).catch(()=>{});
    /* On laisse le service worker s'installer et ranger ce qu'on lui a demandé. */
    await p.waitForFunction(async () => { try{ const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }catch(e){ return false; } }, null, { timeout:20000 }).catch(()=>{});
    const liste = await p.evaluate(async () => {
      const noms = await caches.keys();
      let out = [];
      for(const n of noms){ const c = await caches.open(n);
        out = out.concat((await c.keys()).map(r => r.url.replace(location.origin + '/', ''))); }
      return out;
    });
    const a = (f) => liste.some(u => u.indexOf(f) >= 0);
    const dit = (ok, texte) => { if(!ok) fautes.push(lg + ' : ' + texte); return ok ? '  ok  ' : 'FAUTE '; };
    console.log(dit(a('index.html'), "l'app n'est pas en cache") + ` ${lg} : l'app et ${liste.filter(u => u.indexOf('fonts/') === 0).length} polices en cache`);
    if(attendu){
      /* Deux essais : la première ouverture doit suffire. C'est tout l'objet du
         message « garder » — sans lui, il fallait revenir une seconde fois. */
      let ici = a(attendu);
      if(!ici){ await p.waitForTimeout(2500);
        const l2 = await p.evaluate(async () => { const n = await caches.keys(); let o = [];
          for(const k of n){ const c = await caches.open(k); o = o.concat((await c.keys()).map(r => r.url)); } return o; });
        ici = l2.some(u => u.indexOf(attendu) >= 0);
      }
      console.log(dit(ici, attendu + " n'est pas en cache dès la première ouverture") + ` ${lg} : ${attendu} gardé dès la première ouverture`);
    }
    for(const f of TOUTES){
      if(f === attendu) continue;
      console.log(dit(!a(f), f + ' est téléchargé alors que le joueur ne le lira jamais') + ` ${lg} : ${f} n'est pas téléchargé`);
    }
    await ctx.close();
  }
  await nav.close();
  if(fautes.length){ console.log('\n  DÉFAUTS :'); fautes.forEach(f => console.log('   ' + f)); process.exit(1); }
  console.log('\n  OK — chacun ne télécharge que sa langue, et l\'a hors ligne dès la première ouverture\n');
})();
