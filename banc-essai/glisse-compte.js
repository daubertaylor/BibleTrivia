/* ====== BANC « LA CARTE DU COMPTE GLISSE, ELLE NE SAUTE PAS » ======
   « Lorsque je rouvre, ça décale tout d'un coup. »

   Deux sauts, mesurés sur un iPhone de 430 × 932 avant la correction :
   — toucher « Se connecter » (ou « Annuler ») faisait passer la carte de 73
     à 320 px d'une image à l'autre : la photo, le nom et les couleurs
     remontaient de 110 px d'un bloc ;
   — passé vingt-quatre heures, la sonde de la table repartait sur le réseau
     pendant que le Profil s'ouvrait SANS la carte ; elle arrivait ensuite et
     poussait tout de 40 px.

   Ce banc suit la photo de profil image par image, et refuse :
   — plus de 20 px en une image quand la carte change d'état ;
   — plus de 3 px en une image à l'ouverture du Profil quand la table a déjà
     été vue (même il y a plus d'un jour, même sur un réseau lent) ;
   — une adresse refusée qui remplacerait le champ, effacerait ce qu'on y a
     tapé ou ferait perdre le focus — donc le clavier.

   Usage : node banc-essai/glisse-compte.js [url]  */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const FAUX = require('./faux-supabase.js');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

let ko = 0;
const v = (nom, bon, detail) => { if(!bon) ko++; console.log('  ' + (bon ? 'ok   ' : 'KO   ') + nom + (detail ? '\n        ' + detail : '')); };

async function page(b, sonde){
  const ctx = await b.newContext({ viewport:{width:430,height:932}, deviceScaleFactor:1, userAgent:IOS, hasTouch:true, isMobile:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p._errs = errs;
  await p.route('**/supabase-js@2**', r => r.fulfill({ status:200, contentType:'text/javascript; charset=utf-8', body:FAUX }));
  await p.addInitScript((sonde) => {
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12}, correct:126 }));
    if (sonde === 'frais')  localStorage.setItem('bt_compte_ok', JSON.stringify({ ok:true, quand: Date.now() - 3600000 }));
    if (sonde === 'perime') localStorage.setItem('bt_compte_ok', JSON.stringify({ ok:true, quand: Date.now() - 90000000 }));
  }, sonde);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.evaluate(() => { window.__faux.lenteur = 400; });   // une sonde qui part sur le réseau met 400 ms
  await p.waitForTimeout(1200);
  return p;
}
/* La photo de profil, image par image — un relevé AVANT le geste, pour voir
   le saut de la toute première image. */
const suivre = (p, geste, duree) => p.evaluate(({ geste, duree }) => new Promise(res => {
  const t0 = performance.now(), rel = [];
  const lire = () => { const sc = document.querySelector('#app > .screen:not(.screen-exit)');
    const av = sc && sc.querySelector('.profile-card'), ca = document.getElementById('compteCarte');
    return { t: Math.round(performance.now() - t0), y: av ? av.getBoundingClientRect().top - sc.getBoundingClientRect().top : null, carte: !!ca }; };
  rel.push(lire());
  new Function(geste)();
  const tic = () => { rel.push(lire()); if (performance.now() - t0 < duree) requestAnimationFrame(tic); else res(rel); };
  requestAnimationFrame(tic);
}), { geste, duree });
function pireSaut(rel){
  let pire = 0, quand = 0;
  for (let i = 1; i < rel.length; i++) { if (rel[i].y == null || rel[i-1].y == null) continue;
    const d = Math.abs(rel[i].y - rel[i-1].y); if (d > pire) { pire = d; quand = rel[i].t; } }
  return { pire: Math.round(pire * 10) / 10, quand };
}

(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });

  console.log('\n  — ouvrir le Profil —');
  for (const [nom, sonde, max] of [['table vue il y a une heure', 'frais', 3], ['table vue il y a plus d\'un jour, réseau lent', 'perime', 3]]) {
    const p = await page(b, sonde);
    const rel = await suivre(p, "state.screen='profile'; render();", 1400);
    const s = pireSaut(rel), premiere = rel.find(x => x.y != null);
    v(nom + ' : la carte est là dès la première image', !!(premiere && premiere.carte), premiere ? 'première image à ' + premiere.t + ' ms' : 'pas d\'écran');
    v(nom + ' : rien ne bouge (≤ ' + max + ' px par image)', s.pire <= max, 'pire : ' + s.pire + ' px à ' + s.quand + ' ms');
    if (p._errs.length) v(nom + ' : aucune erreur JS', false, p._errs.join(' | '));
    await p.context().close();
  }
  { const p = await page(b, 'aucune');
    const rel = await suivre(p, "state.screen='profile'; render();", 1600);
    const s = pireSaut(rel), arrivee = rel.find(x => x.carte);
    v('table jamais vue, réseau lent : la carte arrive après la sonde', !!arrivee && arrivee.t >= 300, arrivee ? 'à ' + arrivee.t + ' ms' : 'jamais');
    v('…et se déplie au lieu de tout pousser (≤ 20 px par image)', s.pire <= 20, 'pire : ' + s.pire + ' px à ' + s.quand + ' ms');
    await p.context().close(); }

  console.log('\n  — changer d\'état —');
  { const p = await page(b, 'frais');
    await p.evaluate(() => { state.screen='profile'; render(); }); await p.waitForTimeout(1300);
    for (const [nom, geste] of [['« Se connecter »', 'compteOuvrir();'], ['« Annuler »', 'compteRetour();'], ['« Se connecter », encore', 'compteOuvrir();']]) {
      const rel = await suivre(p, geste, 900);
      const s = pireSaut(rel), course = Math.abs(rel[rel.length-1].y - rel[0].y);
      v(nom + ' : la photo glisse (≤ 20 px par image)', s.pire <= 20, 'pire : ' + s.pire + ' px à ' + s.quand + ' ms, sur ' + Math.round(course) + ' px de course');
      await p.waitForTimeout(300);
    }
    /* Une adresse mal tapée : même état, la carte se met à jour EN PLACE. */
    await p.click('#compteMail'); await p.keyboard.type('taylor@essai');
    const r = await p.evaluate(async () => {
      const champ = document.getElementById('compteMail');
      await envoyerCode();
      const carte = document.getElementById('compteCarte'), h = [], t0 = performance.now();
      await new Promise(res => { const tic = () => { h.push(Math.round(carte.getBoundingClientRect().height)); if (performance.now() - t0 < 700) requestAnimationFrame(tic); else res(); }; requestAnimationFrame(tic); });
      return { meme: document.getElementById('compteMail') === champ, valeur: document.getElementById('compteMail').value,
               focus: document.activeElement === champ, mot: (carte.querySelector('.compte-mot')||{}).textContent || '',
               paliers: new Set(h).size };
    });
    v('une adresse refusée garde le champ (le même élément)', r.meme);
    v('…ce qu\'on y a tapé', r.valeur === 'taylor@essai', r.valeur);
    v('…et le focus, donc le clavier', r.focus);
    v('…dit la raison', /pas l'air d'une adresse/.test(r.mot), r.mot);
    v('…et la carte prend sa ligne de plus en douceur', r.paliers >= 4, r.paliers + ' hauteurs différentes');
    if (p._errs.length) v('aucune erreur JS', false, p._errs.join(' | '));
    await p.context().close(); }

  await b.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — la carte du compte glisse, elle ne saute jamais');
  process.exit(ko ? 1 : 0);
})();
