/* ===== LA PAGE GLISSE PAR LE COMPOSITEUR, MÊME QUAND LA PAGE EST EN RETARD (v315) =====
   CE QUE CE BANC GARDAIT JUSQU'À LA V314. « Des fois ils s'ouvrent presque
   pareil, mais il y a un petit décalage. » Une FEUILLE de verre montait par
   une animation que le compositeur jouait seul, et le décor vu à travers elle
   était recalé par le JavaScript, image par image : sur un téléphone, la page
   avait parfois une image de retard sur le compositeur, et le décor glissait.
   Le banc recréait ce retard (fil principal bloqué 45 ms à chaque image) et
   regardait le décor à travers la vitre.
   CE QUI A CHANGÉ. Depuis la v315, les volets sont des PAGES PLEINES, et les
   deux menus restants aussi : aucune vitre, plus de décor à travers, plus
   rien à recaler (voir LES VOLETS DEVIENNENT DES PAGES). Le défaut d'origine
   ne peut plus exister.
   CE QUI DOIT TENIR MAINTENANT, SOUS LE MÊME RETARD. La page arrive par la
   droite d'un mouvement que le COMPOSITEUR joue seul : le fil principal
   bloqué 45 ms à chaque image, elle doit quand même avancer d'image en image
   — sans s'arrêter, sans reculer — et se poser à sa place. On le lit sur les
   images RÉELLEMENT AFFICHÉES (capture du compositeur), l'accueil caché et le
   fond passé au noir : le bord gauche de la page est le premier pixel clair.
   LE TÉMOIN joue la même arrivée par le JAVASCRIPT (une boucle d'images) :
   sous le même retard, il n'avance qu'une image sur trois. S'il avançait
   aussi souvent que le jeu, le banc serait aveugle.
   Usage : node banc-essai/decor-tenu.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
async function mesure(nav, temoin) {
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:1, isMobile:true, hasTouch:true, userAgent:IOS, serviceWorkers:'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', (route) => route.fulfill({ status:200, contentType:'application/javascript', body:'' }));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' })); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.waitForTimeout(2500);
  await p.addStyleTag({ content:`html, body{ background:#000 !important; } #app, #barreBas, .scene, .scene-layer{ visibility:hidden !important; }
    ${temoin ? 'html .sheet-veil.page:not(.closing){ animation:none !important; }' : ''}` });
  await p.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(p);
  const images = [];
  let capture = false;
  cdp.on('Page.screencastFrame', async (f) => { try { await cdp.send('Page.screencastFrameAck', { sessionId:f.sessionId }); } catch(e){} if (capture) images.push({ t: f.metadata && f.metadata.timestamp || 0, d: f.data }); });
  await cdp.send('Page.startScreencast', { format:'png', everyNthFrame:1 });
  await p.waitForTimeout(300);
  capture = true;
  await p.waitForTimeout(150);
  await p.evaluate((temoin) => {
    openSettings();
    const t0 = performance.now();
    /* Le témoin : la même arrivée, menée image par image par le JavaScript. */
    if (temoin) {
      const v = document.getElementById('settingsVeil');
      const duree = 420;
      const pas = () => { const k = Math.min(1, (performance.now() - t0) / duree), e = 1 - Math.pow(1 - k, 3);
        v.style.transform = 'translate3d(' + ((1 - e) * 100).toFixed(2) + '%,0,0)'; if (k < 1) requestAnimationFrame(pas); };
      v.style.transform = 'translate3d(100%,0,0)';
      requestAnimationFrame(pas);
    }
    /* LE RETARD : 45 ms de travail à chaque image, pendant toute l'arrivée. */
    const charge = () => { const fin = performance.now() + 45; while (performance.now() < fin) {} if (performance.now() - t0 < 700) requestAnimationFrame(charge); };
    requestAnimationFrame(charge);
  }, temoin);
  await p.waitForTimeout(1500);
  capture = false;
  await cdp.send('Page.stopScreencast');
  /* Les images peuvent arriver dans le désordre : on les remet dans l'ordre
     de leur horodatage, une image en double n'est comptée qu'une fois. */
  images.sort((a, b) => a.t - b.t);
  const vues = new Set(); const ordre = [];
  for (const im of images) { if (vues.has(im.t)) continue; vues.add(im.t); ordre.push(im.d); }
  /* Le bord gauche de la page, sur trois rangées : le premier pixel clair. */
  const bords = await p.evaluate(async (imgs) => {
    const out = [];
    for (const b64 of imgs) {
      const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, im.height);
      let bord = im.width;
      for (const y of [260, 430, 600]) {
        for (let x = 0; x < im.width; x++) { const i = (y * im.width + x) * 4; if (d.data[i] + d.data[i+1] + d.data[i+2] > 3 * 150) { bord = Math.min(bord, x); break; } }
      }
      out.push(bord);
    }
    return out;
  }, ordre);
  await ctx.close();
  /* Ce qui se passe PENDANT l'arrivée : des premières images où la page
     entre à celle où elle est posée. */
  const debut = bords.findIndex(x => x < 393), fin = bords.findIndex((x, i) => i > debut && x <= 0);
  const course = debut >= 0 ? bords.slice(debut, fin >= 0 ? fin + 1 : bords.length) : [];
  let recul = 0; for (let i = 1; i < course.length; i++) recul = Math.max(recul, course[i] - course[i - 1]);
  const distinctes = new Set(course).size;
  return { n: ordre.length, course, distinctes, recul, posee: bords.length ? bords[bords.length - 1] : 999, errs };
}
(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const t = await mesure(nav, true);
  const e = await mesure(nav, false);
  await nav.close();
  console.log('  témoin, mené par le JavaScript  ' + t.n + ' images · ' + t.distinctes + ' positions pendant l\'arrivée');
  console.log('  le jeu                          ' + e.n + ' images · ' + e.distinctes + ' positions pendant l\'arrivée · posée à ' + e.posee + ' px · recul max ' + e.recul + ' px');
  if (process.env.BORDS) console.log('  jeu : ' + e.course.join(' ') + '\n  témoin : ' + t.course.join(' '));
  const ko = [];
  if (t.distinctes >= e.distinctes - 2) ko.push('le témoin avance aussi souvent que le jeu (' + t.distinctes + ' contre ' + e.distinctes + ') : le banc ne sait pas voir le défaut');
  if (e.distinctes < 10) ko.push('la page n\'avance que par ' + e.distinctes + ' positions sous le retard : elle n\'est pas menée par le compositeur');
  if (e.recul > 2) ko.push('la page recule pendant son arrivée (' + e.recul + ' px)');
  if (e.posee > 1) ko.push('la page ne se pose pas à sa place (bord à ' + e.posee + ' px)');
  if (e.n < 12) ko.push('trop peu d\'images capturées (' + e.n + ')');
  if (e.errs.length) ko.push('erreurs : ' + e.errs.slice(0, 2).join(' | '));
  console.log(ko.length ? '\n  ÉCHEC :\n    ' + ko.join('\n    ') : '\n  OK — la page glisse par le compositeur, même quand la page est en retard');
  process.exit(ko.length ? 1 : 0);
})();
