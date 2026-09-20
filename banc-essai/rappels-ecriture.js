/* ============ BANC « LE JEU ÉCRIT-IL VRAIMENT SON ÉTAT AU SERVEUR ? » ============
   « J'ai activé les notifications et je n'ai jamais rien reçu. »

   La chaîne des rappels a cinq maillons : la clé VAPID, l'abonnement du
   navigateur, la ligne dans push_subs, l'ÉTAT DU JOUEUR écrit dans cette ligne,
   et la fonction horaire qui décide. Les quatre autres avaient l'air bons — la
   fonction répond, la table contient huit abonnements, les clés passent la
   vérification. Et pourtant, dans la table en ligne, les HUIT lignes portaient
   dernier = null, serie = 0, vu = null, decalage = 0.

   Or les cinq motifs d'envoi lisent TOUS un de ces champs :
     série en jeu   : serie >= 2            -> impossible à 0
     défi du jour   : dernier dans la semaine -> impossible à null
     à revoir       : revoir >= 1           -> la colonne n'existe même pas
     verset         : vu à moins de 14 jours -> impossible à null
     longue absence : vu à exactement 3/7/30 -> impossible à null
   Aucun rappel ne POUVAIT partir. Ce n'était pas un réglage trop prudent,
   c'était une écriture qui n'avait jamais eu lieu.

   LA CAUSE : LE CLIENT SUPABASE EST PARESSEUX. « from().update().eq() » ne
   construit qu'un objet ; la requête n'est émise qu'au moment où on l'attend.
   Le repli (réessayer sans la colonne « revoir ») était écrit sans « then » ni
   « await » : il n'a jamais quitté le téléphone. Comme le premier essai
   échouait toujours, toute l'écriture se perdait en silence.

   CE QUE CE BANC MESURE : pas « est-ce que ça marche », mais COMBIEN DE
   REQUÊTES PARTENT VRAIMENT, et ce qu'elles portent. Trois parties :
     1. la forme publiée, isolée      -> doit n'écrire RIEN
     2. la forme corrigée, isolée     -> doit écrire une fois, complète
     3. le VRAI notifSync() du jeu    -> doit écrire les quatre champs
   La partie 3 est celle qui compte : les deux premières prouvent le mécanisme,
   la troisième prouve que le jeu s'en sert.

   Usage : node banc-essai/rappels-ecriture.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http');
const fs = require('fs');

const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const SUPA = process.env.SUPA_UMD
  || '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/supabase.js';

/* Le faux serveur répond comme le vrai : toute écriture qui mentionne
   « revoir » est refusée (42703), parce que la colonne n'existe pas en ligne. */
const refus = (corps) => corps.includes('"revoir"');
const vues = [];

const serveur = http.createServer((req, res) => {
  let corps = '';
  req.on('data', c => corps += c);
  req.on('end', () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.url === '/supabase.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      return res.end(fs.readFileSync(SUPA));
    }
    if (req.url === '/page.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><meta charset=utf-8><script src="/supabase.js"></script><body>');
    }
    if (req.url.startsWith('/rest/')) {
      vues.push({ methode: req.method, url: req.url, corps });
      if (refus(corps)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ code: '42703', message: "column push_subs.revoir does not exist" }));
      }
      res.writeHead(204); return res.end();
    }
    res.writeHead(404); res.end();
  });
});

const abouties = (v) => v.filter(x => !refus(x.corps));
const dire = (nom, v) => {
  console.log('  ' + nom);
  console.log('     requêtes parties : ' + v.length);
  v.forEach(x => console.log('       ' + x.methode + (refus(x.corps) ? '  avec revoir -> REFUSÉE (42703)' : '  sans revoir -> acceptée')));
  console.log('     écriture aboutie : ' + (abouties(v).length ? 'OUI' : 'NON'));
};

(async () => {
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + serveur.address().port;
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const soucis = [];
  const etat = { dernier: '2026-09-19', serie: 5, vu: '2026-09-19', decalage: 120, maj: '2026-09-20T11:00:00.000Z' };

  /* ===== 1 et 2 : les deux formes, isolées ===== */
  const ctx1 = await nav.newContext({ serviceWorkers: 'block' });
  const p1 = await ctx1.newPage();
  await p1.goto(base + '/page.html');
  await p1.waitForFunction(() => !!(window.supabase && window.supabase.createClient), null, { timeout: 20000 });

  vues.length = 0;
  await p1.evaluate(async ({ base, etat }) => {
    const supa = window.supabase.createClient(base, 'cle-de-banc');
    await new Promise((fini) => {
      supa.from('push_subs').update(Object.assign({ revoir: 3 }, etat)).eq('endpoint', 'E')
        .then(r => { if (r && r.error) { supa.from('push_subs').update(etat).eq('endpoint', 'E'); } fini(); },
              () => { supa.from('push_subs').update(etat).eq('endpoint', 'E'); fini(); });
    });
  }, { base, etat });
  await p1.waitForTimeout(800);
  const avant = vues.slice();

  vues.length = 0;
  await p1.evaluate(async ({ base, etat }) => {
    const supa = window.supabase.createClient(base, 'cle-de-banc');
    let r = await supa.from('push_subs').update(Object.assign({ revoir: 3 }, etat)).eq('endpoint', 'E');
    if (r && r.error) r = await supa.from('push_subs').update(etat).eq('endpoint', 'E');
  }, { base, etat });
  await p1.waitForTimeout(800);
  const apres = vues.slice();
  await ctx1.close();

  dire('1. LA FORME PUBLIÉE, isolée :', avant);
  dire('2. LA FORME CORRIGÉE, isolée :', apres);
  if (abouties(avant).length !== 0) soucis.push('la forme publiée écrit quand même : le diagnostic serait faux');
  if (abouties(apres).length !== 1) soucis.push("la forme corrigée n'écrit pas une fois et une seule (" + abouties(apres).length + ')');

  /* ===== 3 et 4 : LE VRAI notifSync() DU JEU, DANS LES DEUX ORDRES =====
     La fonction push_enregistrer() sera posée sur le serveur à un moment, et
     le jeu sera mis à jour à un autre. Les deux ordres doivent marcher, sinon
     il y a une fenêtre pendant laquelle les rappels retombent en panne.
       — « fonction absente » : le serveur ne la connaît pas encore (404).
         Le jeu doit retomber sur l'écriture directe dans la table.
       — « fonction posée »   : le jeu doit l'utiliser, et NE PLUS TOUCHER à
         la table du tout — c'est ce qui permet de la fermer. */
  const essaiDuJeu = async (rpcExiste) => {
    const ctx = await nav.newContext({ serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await p.route('**/cdn.jsdelivr.net/**', route =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(SUPA) }));
    await p.route('**://*.supabase.co/**', async (route) => {
      const r = route.request(); const corps = r.postData() || '';
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
      if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (!r.url().includes('/rest/')) return route.fulfill({ status: 204, headers: cors });
      const rpc = r.url().includes('/rpc/');
      vues.push({ methode: rpc ? 'RPC' : r.method(), url: r.url(), corps });
      if (rpc) {
        if (rpcExiste) return route.fulfill({ status: 204, headers: cors });
        return route.fulfill({ status: 404, headers: cors, contentType: 'application/json',
          body: JSON.stringify({ code: 'PGRST202', message: "Could not find the function public.push_enregistrer" }) });
      }
      if (refus(corps)) return route.fulfill({ status: 400, headers: cors, contentType: 'application/json',
        body: JSON.stringify({ code: '42703', message: "column push_subs.revoir does not exist" }) });
      return route.fulfill({ status: 204, headers: cors });
    });
    await p.addInitScript(() => {
      const faux = { endpoint: 'https://essai.invalid/abonnement-de-banc', toJSON: () => ({ endpoint: 'https://essai.invalid/abonnement-de-banc', keys: { p256dh: 'x', auth: 'y' } }) };
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: () => ({
        ready: Promise.resolve({ pushManager: { getSubscription: () => Promise.resolve(faux), subscribe: () => Promise.resolve(faux) } }),
        register: () => Promise.resolve(), addEventListener: () => {}, controller: null }) });
      window.Notification = function(){}; window.Notification.permission = 'granted';
      window.Notification.requestPermission = () => Promise.resolve('granted');
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      const k = (n) => { const d = new Date(Date.now() - n * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      localStorage.setItem('bt_daily', JSON.stringify({ last: k(1), streak: 5, jours: [k(1), k(2), k(3), k(4), k(5)], geles: [], gels: 1, parties: 12 }));
      localStorage.setItem('bt_vu', k(1));
      localStorage.setItem('bt_settings', JSON.stringify({ notif: true }));
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof notifSync === 'function' && typeof settings === 'object'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.waitForFunction(() => !!(window.supabase && window.supabase.createClient), null, { timeout: 20000 });
    vues.length = 0;
    await p.evaluate(() => { settings.notif = true; notifSync(); });
    await p.waitForTimeout(2500);
    const v = vues.slice();
    await ctx.close();
    return v;
  };

  const sansRpc = await essaiDuJeu(false);
  const avecRpc = await essaiDuJeu(true);
  await nav.close(); serveur.close();

  /* Ce qui compte : l'état est-il VRAIMENT arrivé quelque part ? */
  const aboutie = (v) => v.find(x => (x.methode === 'RPC' || !refus(x.corps)) && x.corps);
  const dire2 = (nom, v) => {
    console.log('  ' + nom);
    console.log('     requêtes parties : ' + v.length);
    v.forEach(x => console.log('       ' + x.methode + (x.methode === 'RPC' ? '' : (refus(x.corps) ? '  avec revoir -> REFUSÉE (42703)' : '  sans revoir -> acceptée'))));
  };

  dire2('3. LE JEU, serveur SANS la fonction (repli sur la table) :', sansRpc);
  const a3 = aboutie(sansRpc);
  if (!a3) soucis.push("sans la fonction, le jeu n'écrit rien : les rappels resteraient muets pendant la transition");
  else {
    const c = JSON.parse(a3.corps);
    const e = a3.methode === 'RPC' ? { dernier: c.p_dernier, serie: c.p_serie, vu: c.p_vu, decalage: c.p_decalage } : { dernier: c.dernier, serie: c.serie, vu: c.vu, decalage: c.decalage };
    console.log('     état écrit : ' + JSON.stringify(e));
    if (!e.dernier) soucis.push('(sans fonction) « dernier » vide : les motifs série et défi ne partiront jamais');
    if ((e.serie | 0) < 2) soucis.push('(sans fonction) « serie » vaut ' + e.serie + ' au lieu de 5');
    if (!e.vu) soucis.push('(sans fonction) « vu » vide : les motifs verset et absence ne partiront jamais');
    if (e.decalage === undefined) soucis.push('(sans fonction) « decalage » absent : l\'heure locale du joueur est inconnue');
  }

  dire2('4. LE JEU, serveur AVEC la fonction (la table n\'est plus touchée) :', avecRpc);
  const a4 = aboutie(avecRpc);
  if (!a4) soucis.push("avec la fonction, le jeu n'écrit rien");
  else {
    const c = JSON.parse(a4.corps);
    console.log('     état écrit : ' + JSON.stringify({ dernier: c.p_dernier, serie: c.p_serie, vu: c.p_vu, decalage: c.p_decalage }));
    if (a4.methode !== 'RPC') soucis.push("la fonction existe et le jeu écrit quand même dans la table : elle ne pourra pas être fermée");
    if (!c.p_dernier) soucis.push('(avec fonction) « p_dernier » vide');
    if ((c.p_serie | 0) < 2) soucis.push('(avec fonction) « p_serie » vaut ' + c.p_serie + ' au lieu de 5');
    if (!c.p_vu) soucis.push('(avec fonction) « p_vu » vide');
  }
  if (avecRpc.some(x => x.methode !== 'RPC')) {
    soucis.push('la table est encore touchée alors que la fonction répond : ' + avecRpc.filter(x => x.methode !== 'RPC').length + ' requête(s)');
  }

  if (soucis.length) { console.log('  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log("  OK — l'état part dans les deux ordres, et la table n'est plus touchée dès que la fonction existe");
})();
