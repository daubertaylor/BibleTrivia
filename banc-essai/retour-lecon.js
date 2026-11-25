/* ====== LA FLÈCHE QUI RAMÈNE À SA LEÇON (v381) ======
   « Dans le Parcours, je voudrais une flèche pour monter et une flèche pour
     descendre, pour revenir à l'endroit où on était à la base. Fais ça bien. »
   Sur un iPhone, un Parcours avancé (la leçon à faire loin du haut) :
     1. à l'arrivée, la leçon est à l'écran : pas de flèche ;
     2. remonté tout en haut, la leçon est plus bas : la flèche paraît, et elle
        pointe vers le bas ;
     3. descendu tout en bas, la leçon est plus haut : la flèche pointe vers le
        haut (elle a tourné) ;
     4. elle se pose au-dessus de la barre du bas, au bord droit du jeu, et se
        touche sur 44 px au moins ;
     5. la toucher ramène EXACTEMENT à la place d'arrivée du Parcours (la leçon
        un peu au-dessus du milieu), en glissant ; la leçon revenue, la flèche
        s'efface ;
     6. pas de clignotement au bord : un pixel autour du seuil ne la fait pas
        paraître et disparaître ;
     7. changer d'écran la retire avant que l'écran bouge ; une page ouverte
        par-dessus la retire aussi ;
     8. en anglais et en espagnol, elle se dit dans la langue du jeu ;
     9. aucune erreur.
   Usage : node banc-essai/retour-lecon.js [url du jeu] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

async function ouvrir(nav, lg) {
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await ctx.route(/supabase\.co|googlesyndication|doubleclick/, r => r.abort());
  await ctx.addInitScript((lg) => {
    if (!/^http/.test(location.protocol)) return;
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    if (lg) localStorage.setItem('bt_langue', lg);
  }, lg);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  /* Un Parcours avancé : les vingt-cinq premières leçons faites. */
  await p.evaluate(() => {
    const f = {}; let k = 0;
    for (let u = 0; u < PARCOURS.length && k < 25; u++) for (let l = 0; l < LECONS_PAR_UNITE && k < 25; l++, k++) f[cleLecon(u, l)] = '2026-11-0' + (1 + (k % 8));
    const P = loadParcours(); P.faites = Object.assign({}, P.faites || {}, f); saveParcours(P);
  });
  await p.evaluate(() => { ouvrirChemin(); });
  await p.waitForFunction(() => state.screen === 'chemin' && document.querySelector('.chemin-ecran .ch-noeud.courante, .chemin-ecran .ch-jeu.courante'), null, { timeout: 10000 });
  await p.waitForTimeout(1400);
  return { ctx, p, errs };
}
const etat = (p) => p.evaluate(() => {
  const b = document.getElementById('retourLecon');
  const n = document.querySelector('.chemin-ecran .ch-noeud.courante, .chemin-ecran .ch-jeu.courante');
  const a = document.getElementById('app');
  const r = n.getBoundingClientRect();
  return { vu: !!(b && b.classList.contains('vu')), bas: !!(b && b.classList.contains('bas')), op: b ? +getComputedStyle(b).opacity : 0,
    tourne: b ? getComputedStyle(b.querySelector('.rl-fleche')).rotate : null, aria: b ? b.getAttribute('aria-label') : null,
    lecon: Math.round(r.top + r.height / 2), cible: Math.round(a.clientHeight * 0.48 + a.getBoundingClientRect().top), haut: a.scrollTop, max: a.scrollHeight - a.clientHeight };
});

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const { ctx, p, errs: e1 } = await ouvrir(nav);
    const r1 = await etat(p);
    dit('1. à l\'arrivée, la leçon est à l\'écran : pas de flèche', !r1.vu && r1.max > 900, JSON.stringify(r1));

    await p.evaluate(() => { document.getElementById('app').scrollTop = 0; });
    await p.waitForTimeout(500);
    const r2 = await etat(p);
    dit('2. remonté tout en haut (la leçon plus bas) : la flèche paraît et pointe vers le bas', r2.vu && r2.bas && r2.op > 0.99 && /180/.test(r2.tourne || ''), JSON.stringify(r2));

    await p.evaluate(() => { const a = document.getElementById('app'); a.scrollTop = a.scrollHeight; });
    await p.waitForTimeout(600);
    const r3 = await etat(p);
    dit('3. descendu tout en bas (la leçon plus haut) : la flèche pointe vers le haut', r3.vu && !r3.bas && r3.op > 0.99 && !/180/.test(r3.tourne || ''), JSON.stringify(r3));

    const r4 = await p.evaluate(() => {
      const b = document.getElementById('retourLecon').getBoundingClientRect(), bb = document.getElementById('barreBas').getBoundingClientRect(), a = document.getElementById('app').getBoundingClientRect();
      /* la zone réellement touchable : le toucher revient-il au bouton, à 22 px de son centre ? */
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const touche = (x, y) => { const el = document.elementFromPoint(x, y); return !!(el && el.closest && el.closest('#retourLecon')); };
      return { bas: Math.round(b.bottom), barre: Math.round(bb.top), droite: Math.round(a.right - b.right), large: Math.round(b.width),
        doigt: touche(cx - 22, cy) && touche(cx + 21, cy) && touche(cx, cy - 22) && touche(cx, cy + 21) };
    });
    dit('4. au-dessus de la barre du bas, au bord droit du jeu, 44 px sous le doigt', r4.bas < r4.barre - 4 && r4.droite >= 8 && r4.droite <= 24 && r4.large >= 44 && r4.doigt, JSON.stringify(r4));

    await p.locator('#retourLecon').tap();
    await p.waitForTimeout(80);
    const pendant = await p.evaluate(() => document.getElementById('app').scrollTop);
    await p.waitForTimeout(1300);
    const r5 = await etat(p);
    dit('5. la toucher ramène à la place d\'arrivée (la leçon un peu au-dessus du milieu), en glissant ; la flèche s\'efface',
      Math.abs(r5.lecon - r5.cible) <= 24 && !r5.vu && pendant > r5.haut + 40, JSON.stringify({ pendant, ...r5 }));

    /* 6. au bord du seuil : on fait sortir la leçon de 4 px, puis rentrer de 4 px, image par image */
    const r6 = await p.evaluate(async () => {
      const a = document.getElementById('app'), n = document.querySelector('.chemin-ecran .ch-noeud.courante, .chemin-ecran .ch-jeu.courante');
      const bb = document.getElementById('barreBas').getBoundingClientRect();
      const dors = (ms) => new Promise(r => setTimeout(r, ms));
      const milieu = () => { const r = n.getBoundingClientRect(); return r.top + r.height / 2; };
      /* la leçon juste sous le haut de l'écran, puis 4 px au-dessus, puis 4 px dessous */
      const vus = [];
      for (const d of [6, -4, 4, -3, 3]) {
        a.scrollTop = a.scrollTop + (milieu() - (Math.max(a.getBoundingClientRect().top, 0) + d));
        await dors(120);
        vus.push(document.getElementById('retourLecon').classList.contains('vu'));
      }
      return { vus, bas: Math.round(bb.top) };
    });
    dit('6. autour du seuil (quelques pixels), la flèche ne clignote pas', !r6.vus.some(Boolean), JSON.stringify(r6));

    /* 7. changer d'écran, ouvrir une page */
    await p.evaluate(() => { document.getElementById('app').scrollTop = 0; });
    await p.waitForTimeout(500);
    const r7 = await p.evaluate(async () => {
      const b = document.getElementById('retourLecon');
      const avant = b.classList.contains('vu');
      state.screen = 'jeux'; render();
      const aussitot = b.classList.contains('vu');
      await new Promise(r => setTimeout(r, 900));
      const apres = b.classList.contains('vu');
      ouvrirChemin();
      await new Promise(r => setTimeout(r, 900));
      document.getElementById('app').scrollTop = 0;
      await new Promise(r => setTimeout(r, 400));
      const revu = b.classList.contains('vu');
      ouvrirBoutique();
      await new Promise(r => setTimeout(r, 120));
      document.getElementById('app').dispatchEvent(new Event('scroll'));
      await new Promise(r => setTimeout(r, 200));
      const sousPage = b.classList.contains('vu');
      return { avant, aussitot, apres, revu, sousPage };
    });
    dit('7. changer d\'écran la retire tout de suite ; une page ouverte par-dessus aussi', r7.avant && !r7.aussitot && !r7.apres && r7.revu && !r7.sousPage, JSON.stringify(r7));
    e1.forEach(x => errs.push(x));
    await ctx.close();

    /* 8. les langues */
    const r8 = {};
    for (const lg of ['en', 'es']) {
      const o = await ouvrir(nav, lg);
      await o.p.evaluate(() => { document.getElementById('app').scrollTop = 0; });
      await o.p.waitForTimeout(500);
      r8[lg] = (await etat(o.p)).aria;
      o.errs.forEach(x => errs.push(x));
      await o.ctx.close();
    }
    dit('8. elle se dit dans la langue du jeu', r8.en === 'Back to my lesson' && r8.es === 'Volver a mi lección', JSON.stringify(r8));
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('9. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la flèche paraît quand la leçon sort de l\'écran, montre son côté, y ramène, et s\'efface');
  process.exit(ko ? 1 : 0);
})();
