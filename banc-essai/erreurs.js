/* ====== BANC « QUAND ÇA CASSE CHEZ UN JOUEUR, ON L'APPREND » ======
   DETTE.md, point 2 : « Zéro occurrence de window.onerror dans tout le code, et
   111 blocs try/catch. Ces 111 blocs sont une force — rien ne casse brutalement
   — et exactement pour cette raison, tout échec est silencieux. »

   Ce banc vérifie les deux moitiés de la promesse :

     CE QUI DOIT ÊTRE PRIS
       - une erreur non rattrapée ;
       - une promesse rejetée ;
       - la même erreur cent fois : UNE ligne, avec son compte ;
       - au-delà de vingt lignes, les plus anciennes partent.

     CE QUI NE DOIT JAMAIS PARTIR
       - le nom du joueur, sa couleur, son score, ses réponses ;
       - un identifiant qui le suivrait d'une fois sur l'autre.
       On lit le contenu RÉELLEMENT écrit sur le téléphone et on cherche ces
       choses dedans, plutôt que de faire confiance à la lecture du code.

     ET ÇA S'ÉTEINT
       - l'interrupteur des Réglages existe, il coupe la prise, et il efface ce
         qui attendait : on ne garde pas chez quelqu'un ce qu'il vient de
         refuser d'envoyer.

   Usage : node banc-essai/erreurs.js       (le serveur 8099 doit tourner)
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
let f = 0;
const dit = (ok, ...r) => { if(!ok) f++; console.log((ok ? '  ok  ' : 'FAUTE '), ...r); };

const ouvrir = async (nav) => {
  const ctx = await nav.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  p.on('pageerror', () => {});   /* on en provoque exprès : ne pas polluer la sortie */
  await p.addInitScript(() => {
    try{ localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' })); }catch(e){}
  });
  await p.goto(URL, { waitUntil:'domcontentloaded' });
  await p.waitForFunction(() => typeof state !== 'undefined' && state.screen === 'mode', null, { timeout:25000 });
  /* On part d'une ardoise propre : le décompte doit porter sur CE qu'on
     provoque, pas sur ce que le laboratoire a pu ajouter. */
  await p.evaluate(() => { try{ localStorage.removeItem('bt_erreurs'); }catch(e){} });
  return { ctx, p };
};
const lire = (p) => p.evaluate(() => { try{ return JSON.parse(localStorage.getItem('bt_erreurs') || '[]'); }catch(e){ return 'ILLISIBLE'; } });

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });

  /* ===== 1. CE QUI DOIT ÊTRE PRIS ===== */
  {
    const { ctx, p } = await ouvrir(nav);
    await p.evaluate(() => { window.__casse = () => { null.x; }; setTimeout(window.__casse, 0); });
    await p.waitForTimeout(150);
    let a = await lire(p);
    dit(Array.isArray(a) && a.length === 1, `une erreur non rattrapée : ${a.length} ligne(s) rangée(s)`);
    if(a[0]) console.log('        « ' + String(a[0].m).slice(0, 70) + ' »  ligne ' + a[0].l + ', écran « ' + a[0].e + ' », ' + a[0].v + ', ' + a[0].a);

    await p.evaluate(() => { Promise.reject(new Error('essai de promesse')); });
    await p.waitForTimeout(150);
    a = await lire(p);
    const prom = a.find(x => /promesse rejetée/.test(x.m));
    dit(!!prom, `une promesse rejetée : ${prom ? 'prise' : 'PERDUE'}`);

    /* la même erreur cent fois */
    await p.evaluate(() => { for(let i = 0; i < 100; i++) setTimeout(window.__casse, 0); });
    await p.waitForTimeout(400);
    a = await lire(p);
    const meme = a.filter(x => /null|undefined/i.test(x.m) && !/promesse/.test(x.m));
    /* La même ligne de code, cent fois : une seule entrée, un compte qui monte. */
    dit(meme.length === 1, `cent fois la même erreur : ${meme.length} ligne(s)`);
    dit(meme[0] && meme[0].n >= 50, `et elle porte son compte : n = ${meme[0] ? meme[0].n : '?'}`);

    /* le plafond */
    await p.evaluate(() => { for(let i = 0; i < 40; i++) noterErreur('erreur numéro ' + i, String(i)); });
    a = await lire(p);
    dit(a.length <= 20, `quarante erreurs différentes : ${a.length} gardées (plafond 20)`);
    dit(a.some(x => x.m === 'erreur numéro 39'), 'la plus récente est gardée');
    dit(!a.some(x => x.m === 'erreur numéro 0'), 'la plus ancienne est partie');

    /* ===== 2. CE QUI NE DOIT JAMAIS PARTIR ===== */
    const brut = await p.evaluate(() => localStorage.getItem('bt_erreurs') || '');
    for(const interdit of ['Taylor', '4C86E8', 'bt_profile'])
      dit(brut.indexOf(interdit) < 0, `rien de personnel : « ${interdit} » absent du rapport`);
    const clefs = [...new Set(a.flatMap(x => Object.keys(x)))].sort().join(',');
    dit(clefs === 'a,e,g,l,m,n,t,v', `les champs sont ceux prévus, et rien de plus : ${clefs}`);
    await ctx.close();
  }

  /* ===== 3. ET ÇA S'ÉTEINT ===== */
  {
    const { ctx, p } = await ouvrir(nav);
    await p.evaluate(() => { noterErreur('quelque chose a cassé', '1:1'); });
    dit((await lire(p)).length === 1, 'une erreur en attente');
    const vu = await p.evaluate(() => {
      openSettings();
      const b = document.getElementById('swRapport');
      return { existe:!!b, allume:!!(b && b.classList.contains('on')),
               titre:(b && b.closest('.set-row') ? b.closest('.set-row').querySelector('b').textContent : '') };
    });
    dit(vu.existe, `l'interrupteur est dans les Réglages : « ${vu.titre} »`);
    dit(vu.allume, 'et il est allumé par défaut');
    await p.evaluate(() => setRapport(false));
    dit((await lire(p)).length === 0, "éteint : ce qui attendait est effacé");
    await p.evaluate(() => { noterErreur('une autre', '2:2'); });
    dit((await lire(p)).length === 0, 'et plus rien ne se range');
    await p.evaluate(() => setRapport(true));
    await p.evaluate(() => { noterErreur('et ça repart', '3:3'); });
    dit((await lire(p)).length === 1, 'rallumé : ça repart');
    await ctx.close();
  }

  await nav.close();
  console.log(f ? `\n  ${f} FAUTES\n` : '\n  OK — une panne chez un joueur laisse une trace, et lui ne laisse rien de lui\n');
  process.exit(f ? 1 : 0);
})();
