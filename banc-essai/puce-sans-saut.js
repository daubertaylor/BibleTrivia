/* ====== BANC « LE ROUGE REMPLIT TOUT D'UN SEUL GESTE, SANS SAUT » (v377) ======
   « Pour les modes Groupe et Solo, quand je clique par exemple sur 15 puis
     30 secondes, le remplissage se fait mal et il s'ajuste d'un coup. En bas
     surtout : il ne se remplit pas en entier, et ensuite hop, il se remplit,
     comme si c'était un bug. Vérifie tous les endroits où le remplissage se
     remplit mal, dans les modes de jeu. »

   CE QUE C'ÉTAIT, FILMÉ IMAGE PAR IMAGE (v376, Solo, 15 s puis 30 s). Chaque
   image est comparée à l'image FINALE, au repos :
     — l'intérieur de la puce rejoignait le rouge final à 268 ms, sans heurt ;
     — mais sa LISIÈRE (le dernier pixel du bord, tout autour) restait rose
       pâle — 104 pixels, jusqu'à 56 nuances d'écart, 18 d'entre eux en bas,
       contre l'ombre de la puce — puis rejoignait le rouge EN UNE IMAGE, à
       0,4 s : la teinte pleine basculait sous l'encre à heure fixe ;
     — et avec une encre lancée en retard (un téléphone qui prépare sa
       couche), cette bascule tombait sur une puce pas encore couverte.
   Et 47 pixels du bord fonçaient encore un dixième de seconde vers 0,55 s
   (le fond de la puce revenait sous l'encre), puis revenaient.

   CE QU'ON EXIGE, sur chaque famille de puces des modes de jeu — le doigt
   posé là où un iPhone le situe, et une fois avec une encre lancée 120 ms en
   retard :
     1. l'intérieur de ce qu'on PREND rejoint son image finale tôt (avant
        380 ms, plus le retard), et ne s'en écarte plus jamais ;
     2. sa lisière la rejoint SANS SAUT : une fois l'encre passée, d'une
        image à la suivante, elle ne perd jamais plus de 45 % de l'écart
        qu'elle gardait — un fondu, pas une bascule (quelques nuances sur un
        fil de pixels, sous 700, ne comptent pas : elles ne se voient pas) ;
     3. et SANS BATTEMENT : une fois en route vers le final, elle ne s'en
        écarte plus (aucune remontée de plus de 20 %) ;
     4. ce qu'on QUITTE se vide jusqu'au bout sans perdre d'un coup ses
        dernières traces (moins de 4 % de la puce à la dernière image avant
        le repos) ;
     5. aucune erreur de page.
   Familles : Solo · chrono (le cas de Taylor), Groupe · durée, Solo ·
   testament, salon en ligne · chrono, page · privé/public, page des livres.
   (Dans une page, l'encre est le dégradé de la puce, qui ne coïncide au
   pixel près qu'au bout de sa course : l'intérieur y est jugé à 26 nuances
   près au lieu de 10.)
   Usage : node banc-essai/puce-sans-saut.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const S_PLEIN = 380, S_SAUT = 0.45, S_BATTEMENT = 0.2, S_RESTE = 0.04;
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

/* Les familles : comment ouvrir l'écran, la puce de départ, celle qu'on prend,
   où le doigt la touche, et un retard d'encre éventuel. */
const PREPA = (mode) => `state.mode = '${mode}'; state.teams = [{ name:'A' }, { name:'B' }]; state.screen = 'setup'; render();`;
const FAMILLES = [
  { nom: 'Solo · chrono 15 s → 30 s', ouvrir: PREPA('solo'), de: '.screen [data-group="tmr"][data-k="15"]', vers: '.screen [data-group="tmr"][data-k="30"]', doigt: [0.5, 0.2] },
  { nom: 'Solo · chrono, encre en retard de 120 ms', ouvrir: PREPA('solo'), de: '.screen [data-group="tmr"][data-k="15"]', vers: '.screen [data-group="tmr"][data-k="30"]', doigt: [0.5, 0.2], retard: 120 },
  { nom: 'Groupe · durée Courte → Normale', ouvrir: PREPA('group'), de: '.screen [data-group="len"][data-k="courte"]', vers: '.screen [data-group="len"][data-k="normale"]', doigt: [0.25, 0.7] },
  { nom: 'Solo · testament Tout → Ancien', ouvrir: PREPA('solo'), de: '.screen [data-group="theme"][data-k="tout"]', vers: '.screen [data-group="theme"][data-k="at"]', doigt: [0.85, 0.5] },
  { nom: 'Salon en ligne · chrono', ouvrir: `document.querySelectorAll('.sheet-veil').forEach(e => e.remove()); net.room = { id:'ESSAI' }; net.isHost = true; net.roomCode = 'ESSAI'; net.oppPresent = false; state.screen = 'online-room'; render();`,
    de: '.len-chip[data-rgroup="tmr"]:nth-of-type(1)', vers: '.len-chip[data-rgroup="tmr"]:nth-of-type(2)', doigt: [0.5, 0.3] },
  { nom: 'Page · privé / public', ouvrir: `['grpCreerVeil'].forEach(i => { const e = document.getElementById(i); if (e) e.remove(); });
      compte.dispo = true; compte.session = { user:{ id:'moi-0', email:'j@e.net' } }; compte.etape = 'connecte';
      grp.installe = true; grp.ouverts = true; grp.etat = { participe:'ok', moderateur:true }; grp.liste = []; grp.publics = [];
      state.screen = 'groupes'; render(); setTimeout(() => ouvrirCreation(), 700);`,
    de: '.len-chip[data-tgroup="type"]:nth-of-type(1)', vers: '.len-chip[data-tgroup="type"]:nth-of-type(2)', doigt: [0.5, 0.25], attente: 1700, seuil: 26 },
  { nom: 'Page des livres · Ésaïe → Jérémie', ouvrir: `state.mode = 'solo'; state.screen = 'setup'; render(); state.livre = 'Ésaïe';
      window.__fermer = window.__fermer || fermerFeuilleGroupe; window.fermerFeuilleGroupe = (id) => { if (id !== 'livreVeil') window.__fermer(id); };
      ouvrirLivreLocal();`,
    de: null, vers: '#livreVeil .bk-choix[data-i="IJ"]', quitte: '#livreVeil .bk-choix[data-i="IE"]', doigt: [0.5, 0.3], attente: 1500, seuil: 26 },
];

/* L'écart à l'image finale, image par image : l'intérieur (pixels à plus de
   2 px du bord, lettres exclues) et la lisière (les 2 px du bord). */
const MESURER = async (p, images, fin, b, R, lettres, t0, seuil) => p.evaluate(async ([imgs, fin, b, t0, R, lettres, seuil]) => {
  const lit = async (s) => { const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
  const F = await lit(fin), k = F.width / innerWidth;
  const dist = (x, y) => { const l = b.x, r = b.x + b.width, h = b.y, ba = b.y + b.height;
    if (x >= l + R && x <= r - R) return Math.min(y - h, ba - y);
    if (y >= h + R && y <= ba - R) return Math.min(x - l, r - x);
    const cx = x < l + R ? l + R : r - R, cy = y < h + R ? h + R : ba - R;
    return R - Math.hypot(x - cx, y - cy); };
  const out = [];
  for (const im of imgs) {
    const ms = Math.round((im.t - t0) * 1000); if (ms < -20) continue;
    const D = await lit(im.d);
    let ni = 0, tot = 0, E = 0;
    for (let Y = Math.floor((b.y - 1) * k); Y < (b.y + b.height + 1) * k; Y++) for (let X = Math.floor((b.x - 1) * k); X < (b.x + b.width + 1) * k; X++) {
      const x = (X + 0.5) / k, y = (Y + 0.5) / k, d = dist(x, y);
      if (d < -1) continue;
      if (lettres.some(q => x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3])) continue;
      const i = (Y * F.width + X) * 4;
      const e = Math.max(Math.abs(D.data[i] - F.data[i]), Math.abs(D.data[i + 1] - F.data[i + 1]), Math.abs(D.data[i + 2] - F.data[i + 2]));
      if (d < 2) { if (e > 6) E += e; }
      else { tot++; if (e > seuil) ni++; }
    }
    out.push({ ms, int: ni / Math.max(1, tot), E });
  }
  return out;
}, [images, fin, b, t0, R, lettres, seuil]);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const f of FAMILLES.filter(x => !process.env.FAMILLE || x.nom.includes(process.env.FAMILLE))) {
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await ctx.route('**/*.supabase.co/**', r => r.abort());
      await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(f.nom + ' : ' + e.message));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
      await p.evaluate(() => { document.documentElement.requestFullscreen = null; });
      await p.waitForTimeout(600);
      const ij = await p.evaluate(() => BIBLE_BOOKS.indexOf('Jérémie')), ie = await p.evaluate(() => BIBLE_BOOKS.indexOf('Ésaïe'));
      const vers = f.vers.replace('IJ', ij), quitte = (f.quitte || f.de || '').replace('IE', ie);
      await p.evaluate((js) => { (0, eval)(js); }, f.ouvrir);
      await p.waitForTimeout(f.attente || 1300);
      if (f.retard) await p.addStyleTag({ content: `.chip.remplit::after, .len-chip.remplit::after, .bk-choix.remplit::after{ animation-delay: calc(${f.retard}ms - var(--encre-avance, 0ms)) !important; }` });
      if (f.de) { await p.evaluate((s) => document.querySelector(s).click(), f.de); await p.waitForTimeout(1400); }
      const boite = (s) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
        const lettres = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        for (let t = w.nextNode(); t; t = w.nextNode()) { if (!t.nodeValue.trim()) continue; const g = document.createRange(); g.selectNodeContents(t); for (const q of g.getClientRects()) lettres.push([q.left - 2, q.top - 2, q.right + 2, q.bottom + 2]); }
        return { b: { x: r.left, y: r.top, width: r.width, height: r.height }, R: parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0, lettres }; }, s);
      const A = await boite(vers), Q = quitte ? await boite(quitte) : null;
      if (!A) { dit(f.nom + ' : la puce à prendre existe', false, vers); await ctx.close(); continue; }
      const cdp = await ctx.newCDPSession(p);
      const images = [];
      cdp.on('Page.screencastFrame', async (fr) => { images.push({ t: fr.metadata.timestamp, d: fr.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: fr.sessionId }); } catch (e) {} });
      await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
      await p.waitForTimeout(250);
      const t0 = Date.now() / 1000;
      await p.touchscreen.tap(A.b.x + A.b.width * f.doigt[0], A.b.y + A.b.height * f.doigt[1]);
      await p.waitForTimeout(1500 + (f.retard || 0));
      await cdp.send('Page.stopScreencast');
      const fin = (await p.screenshot()).toString('base64');
      const ma = await MESURER(p, images, fin, A.b, A.R, A.lettres, t0, f.seuil || 10);
      const mq = Q ? await MESURER(p, images, fin, Q.b, Q.R, Q.lettres, t0, f.seuil || 10) : null;
      /* 1. l'intérieur rejoint son final tôt, et y reste */
      const iPlein = ma.findIndex((m, i) => m.int <= 0.005 && ma.slice(i).every(n => n.int <= 0.01));
      const tPlein = iPlein >= 0 ? ma[iPlein].ms : null;
      /* 2 et 3. la lisière : un fondu, ni saut ni battement */
      /* La lisière est POSÉE quand l'encre a fini de la balayer : d'une image à
         la suivante, son écart ne bouge plus que d'un cinquième (ou de 300). Un
         saut ou un battement compte au-delà de 45 % (20 %) de l'écart qu'elle
         avait alors — et jamais sous 700 : quelques nuances sur un fil de
         pixels ne se voient pas. */
      let saut = 0, battement = 0, E0 = 0, i0 = -1;
      if (iPlein >= 0) {
        i0 = iPlein;
        while (i0 + 1 < ma.length && Math.abs(ma[i0].E - ma[i0 + 1].E) > Math.max(300, 0.2 * ma[i0].E)) i0++;
        E0 = Math.max(...ma.slice(i0).map(m => m.E), 1);
        const borne = (k) => Math.max(k * E0, 700);
        for (let i = i0 + 1; i < ma.length; i++) {
          saut = Math.max(saut, (ma[i - 1].E - ma[i].E) / borne(S_SAUT) * S_SAUT);
          battement = Math.max(battement, (ma[i].E - Math.min(...ma.slice(i0, i).map(m => m.E))) / borne(S_BATTEMENT) * S_BATTEMENT);
        }
      }
      /* 4. ce qu'on quitte se vide jusqu'au bout */
      let reste = 0;
      if (mq) { const j = mq.findIndex((m, i) => m.int <= 0.005 && mq.slice(i).every(n => n.int <= 0.005)); reste = j > 0 ? mq[j - 1].int : (j === 0 ? 0 : 1); }
      console.log('  ' + f.nom + ' :');
      dit('1. plein à l\'intérieur à ' + tPlein + ' ms, et il le reste', tPlein !== null && tPlein <= S_PLEIN + (f.retard || 0));
      dit('2. la lisière rejoint le final sans saut : au plus ' + Math.round(saut * 100) + ' % de son écart en une image', iPlein >= 0 && saut <= S_SAUT,
        ma.slice(Math.max(0, i0)).map(m => m.ms + ':' + m.E).join(' '));
      dit('3. sans battement : remontée de ' + Math.round(battement * 100) + ' %', iPlein >= 0 && battement <= S_BATTEMENT);
      if (mq) dit('4. ce qu\'on quitte se vide jusqu\'au bout : ' + (reste * 100).toFixed(1) + ' % à la dernière image avant le repos', reste <= S_RESTE);
      await ctx.close();
    }
  } catch (e) { errs.push('banc : ' + e.message); }
  dit('5. aucune erreur de page', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le rouge remplit tout d\'un seul geste, et rien ne saute à la fin');
  process.exit(ko ? 1 : 0);
})();
