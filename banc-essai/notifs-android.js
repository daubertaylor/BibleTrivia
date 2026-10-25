/* ====== BANC « UNE NOTIFICATION SUR ANDROID » (v335) ======
   « Regarde sur Android lorsqu'ils reçoivent les notifications : je t'ai mis
     du crayon rouge sur les problèmes. » Du rouge sur le rond de gauche, du
   rouge sur l'image de droite. Ce que Chrome pour Android fait des deux
   images d'une notification (NotificationPlatformBridge.java,
   NotificationBuilderBase.java) :
     — le BADGE est peint en blanc (applyWhiteOverlay) puis posé dans la
       barre d'état et dans le rond de la notification : une image pleine y
       devient un carré blanc ;
     — l'ICON est l'image de droite ; sans elle, Chrome en dessine une, une
       pastille grise avec la première lettre de l'adresse : elle ne peut
       pas partir, elle peut seulement dire quelque chose.
   Le vrai sw.js du jeu servi, dans un bac à sable de téléphone, puis les
   images elles-mêmes, au pixel :
     1. chaque rappel (série, défi, à revoir, absence, verset, prière,
        lecture, essai, bienvenue) et chaque « essayer ce rappel » : SA
        vignette, et le petit pictogramme ;
     2. chaque message (une ligne, une mention, une partie, la modération) :
        sa vignette ; rejoué, il se repose tel qu'il était, image comprise ;
     3. plus aucune notification ne porte l'icône de l'app, ni à droite ni
        en petit ;
     4. le petit pictogramme : blanc sur transparent, pas un carré plein, la
        silhouette de l'icône (l'enfant qui lit) sur 20 dp des 24, centrée ;
     5. les vignettes : 168 px, coins transparents, la pastille du jeu (ses
        deux couleurs, lues dans index.html) avec un pictogramme blanc ;
        toutes différentes ;
     6. chaque image nommée par sw.js est servie (200, image/png).
   Avant la v335 : « ./icon-192.png » partout, en petit comme à droite — un
   carré blanc à gauche, et la même icône une seconde fois à droite.
   Usage : node banc-essai/notifs-android.js [url] */
const vm = require('vm');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL_JEU = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const BASE = new URL('.', URL_JEU).href;
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

/* L'heure du téléphone : le 18 octobre, 18 h, à Greenwich (décalage nul). */
let HORLOGE = Date.parse('2026-10-18T18:00:00Z');
const FauxDate = class extends Date { constructor(...a){ if (a.length) super(...a); else super(HORLOGE); } static now(){ return HORLOGE; } };

/* Le téléphone : son tiroir de notifications (une étiquette en remplace une
   autre), son miroir (indexedDB), aucune fenêtre du jeu ouverte. */
function bac(src, miroir) {
  const affichees = [], ecoute = {}, journal = [];
  const idb = { open() { const r = {}; setTimeout(() => { r.result = { objectStoreNames: { contains: () => true },
    transaction() { return { objectStore() { return { get() { const g = {}; setTimeout(() => { g.result = miroir; g.onsuccess && g.onsuccess(); }, 0); return g; }, put() { return {}; } }; } }; } };
    r.onsuccess && r.onsuccess(); }, 0); return r; } };
  const self = {
    registration: {
      scope: 'https://exemple.github.io/BibleTrivia/',
      showNotification: (t, o) => { o = o || {};
        const n = { title: t, body: o.body, tag: o.tag, data: o.data, icon: o.icon, badge: o.badge };
        const i = affichees.findIndex(x => x.tag && x.tag === n.tag);
        if (i >= 0) affichees.splice(i, 1, n); else affichees.push(n);
        journal.push(n); return Promise.resolve(); },
      getNotifications: (f) => Promise.resolve(affichees.filter(x => !f || !f.tag || x.tag === f.tag)),
    },
    addEventListener: (nom, fn) => { ecoute[nom] = fn; },
    skipWaiting() {}, clients: { claim() {} },
  };
  const ctx = { self, indexedDB: idb, caches: { open: () => Promise.resolve({}), keys: () => Promise.resolve([]), match: () => Promise.resolve(null) },
    clients: { matchAll: () => Promise.resolve([]), openWindow: () => Promise.resolve({}) },
    fetch: () => Promise.reject(new Error('hors ligne')), URL, Request: function(){}, Response: function(){},
    console, setTimeout, clearTimeout, Promise, Date: FauxDate, Math, JSON, encodeURIComponent };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const recevoir = async (charge) => {
    let attente = null;
    ecoute.push({ data: { json: () => charge }, waitUntil: (p) => { attente = p; } });
    await attente;
    return journal.splice(0);
  };
  return { recevoir, affichees };
}

const ICONES = './notifications/icones/';
const BADGE = ICONES + 'badge.png';
const v = (nom) => ICONES + nom + '.png';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const src = await (await fetch(BASE + 'sw.js')).text();
    const html = await (await fetch(URL_JEU)).text();

    /* ===== 1. LES RAPPELS ===== */
    const AUJ = '2026-10-18', HIER = '2026-10-17';
    const RAPPELS = [
      ['la flamme en jeu (série)',  { genre: 'serie' },               { actif: true, serie: 4, dernier: HIER },        'flamme'],
      ['une partie aujourd\'hui ? (défi)', { genre: 'defi' },          { actif: true, dernier: '2026-10-15' },          'flamme'],
      ['à revoir',                  { genre: 'revoir' },              { actif: true, revoir: 3 },                      'revoir'],
      ['l\'absence',                { genre: 'absence', jours: 6 },   { actif: true, vu: '2026-10-12' },               'absence'],
      ['le verset de la semaine',   { genre: 'verset' },              { actif: true, vu: '2026-10-16' },               'verset'],
      ['la prière',                 { genre: 'priere' },              { priere: 480 },                                 'priere'],
      ['la lecture',                { genre: 'lecture' },             { lecture: 1200 },                               'lecture'],
      ['l\'essai',                  { genre: 'essai' },               { actif: true },                                 'rappels'],
      ['la bienvenue',              { genre: 'bienvenue' },           { actif: false },                                'rappels'],
    ];
    const vus = [];
    const lignes = [];
    for (const [nom, charge, miroir, attendu] of RAPPELS) {
      const b = bac(src, Object.assign({ langue: 'fr', messages: true, priere: -1, lecture: -1 }, miroir));
      const m = await b.recevoir(Object.assign({ decalage: 0 }, charge));
      const n = m[0] || {};
      vus.push(n);
      const bon = m.length === 1 && n.icon === v(attendu) && n.badge === BADGE;
      if (!bon) ko++;
      lignes.push((bon ? '      ' : '   ✗  ') + nom + ' → ' + (m.length ? n.icon + ' · ' + n.badge : 'rien'));
    }
    const ESSAIS = [['serie', 'flamme'], ['defi', 'flamme'], ['revoir', 'revoir'], ['verset', 'verset'], ['absence', 'absence'], ['priere', 'priere'], ['lecture', 'lecture']];
    for (const [genre, attendu] of ESSAIS) {
      const b = bac(src, { langue: 'fr', actif: false });
      const m = await b.recevoir({ essai: true, genre, n: 3, jours: 7, decalage: 0 });
      const n = m[0] || {};
      vus.push(n);
      const bon = m.length === 1 && n.icon === v(attendu) && n.badge === BADGE;
      if (!bon) ko++;
      lignes.push((bon ? '      ' : '   ✗  ') + 'essayer « ' + genre + ' » → ' + (m.length ? n.icon + ' · ' + n.badge : 'rien'));
    }
    const ko1 = lignes.filter(l => l.includes('✗')).length;
    console.log('  ' + (ko1 ? 'KO  ' : 'OK  ') + '1. chaque rappel porte SA vignette, et le petit pictogramme de Yada');
    lignes.forEach(l => console.log(l));

    /* ===== 2. LES MESSAGES ===== */
    const G = '11111111-2222-4333-8444-555555555555';
    const msg = (o) => Object.assign({ genre: 'message', groupe: G, nom: 'Les amis', de: 'Benoît', texte: 'Salut !', partie: false, mention: false, decalage: 0 }, o);
    let b = bac(src, { langue: 'fr', messages: true });
    const m1 = (await b.recevoir(msg({ id: 1 })))[0] || {};
    HORLOGE += 5000;
    const m2 = (await b.recevoir(msg({ id: 2, texte: '@Taylor tu viens ?', mention: true })))[0] || {};
    HORLOGE += 25000;
    const m3 = (await b.recevoir(msg({ id: 3, texte: '', partie: true })))[0] || {};
    HORLOGE += 1000;
    const m4 = (await b.recevoir(msg({ id: 1 })))[0] || {};          // un envoi rejoué : déjà compté
    b = bac(src, { langue: 'fr', messages: true });
    const m5 = (await b.recevoir(msg({ id: 9, moderation: true, de: 'Taylor', texte: 'Merci de rester courtois.' })))[0] || {};
    vus.push(m1, m2, m3, m4, m5);
    dit('2. un message : les bulles ; une mention : les bulles ; une partie : la manette ; la modération : le bouclier',
      m1.icon === v('message') && m2.icon === v('message') && m3.icon === v('partie') && m5.icon === v('moderation')
        && [m1, m2, m3, m5].every(n => n.badge === BADGE),
      [m1, m2, m3, m5].map(n => (n.icon || '').replace(ICONES, '') + '·' + (n.badge || '').replace(ICONES, '')).join('  '));
    dit('   rejoué, il se repose tel qu\'il était : le même texte, la même image', m4.title === m3.title && m4.body === m3.body && m4.icon === m3.icon && m4.badge === BADGE,
      '« ' + m4.title + ' » · ' + m4.icon);

    /* ===== 3. PLUS JAMAIS L'ICÔNE DE L'APP ===== */
    const app = vus.filter(n => /icon-(192|512)|apple-touch/.test(String(n.icon) + ' ' + String(n.badge)));
    dit('3. aucune des ' + vus.length + ' notifications ne porte l\'icône de l\'app (ni à droite, ni en petit)', vus.length >= 21 && !app.length,
      app.slice(0, 3).map(n => n.title + ' → ' + n.icon + ' · ' + n.badge).join(' | '));

    /* ===== LES IMAGES ===== */
    const noms = ['flamme', 'revoir', 'absence', 'verset', 'priere', 'lecture', 'rappels', 'message', 'partie', 'moderation'];
    const ctx = await nav.newContext({ serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await p.goto(BASE + 'manifest.json');               // la même origine : les images se lisent au pixel
    const lire = (u) => p.evaluate(async (u) => {
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) return { statut: r.status };
      const im = new Image(); im.src = URL.createObjectURL(await r.blob());
      try { await im.decode(); } catch (e) { return { statut: r.status, type: r.headers.get('content-type'), illisible: true }; }
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      return { statut: r.status, type: r.headers.get('content-type'), w: c.width, h: c.height, d: Array.from(x.getImageData(0, 0, c.width, c.height).data) };
    }, u);

    /* ===== 4. LE PETIT PICTOGRAMME ===== */
    const bd = await lire(BASE + BADGE.slice(2));
    const ic = await lire(BASE + 'icon-512.png');
    if (bd.d && ic.d) {
      const W = bd.w, px = (i) => bd.d.slice(i * 4, i * 4 + 4);
      let transp = 0, pasBlanc = 0, x0 = W, y0 = W, x1 = -1, y1 = -1;
      for (let i = 0; i < W * W; i++) {
        const [r, g, bb, a] = px(i);
        if (a < 8) transp++;
        if (a > 32 && (r < 245 || g < 245 || bb < 245)) pasBlanc++;
        if (a > 128) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      const haut = y1 - y0 + 1, larg = x1 - x0 + 1;
      /* La silhouette de l'icône : ses pixels sombres, arrêtés aux genoux,
         ramenés au cadre du pictogramme, comparés point par point. */
      const IW = ic.w, sombre = (x, y) => { const k = (y * IW + x) * 4; return 0.2126 * ic.d[k] + 0.7152 * ic.d[k + 1] + 0.0722 * ic.d[k + 2] < 40; };
      const lim = Math.round(465 * IW / 512);
      let sx0 = IW, sy0 = IW, sx1 = -1, sy1 = -1;
      for (let y = 0; y < lim; y++) for (let x = 0; x < IW; x++) if (sombre(x, y)) { sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sy0 = Math.min(sy0, y); sy1 = Math.max(sy1, y); }
      let inter = 0, union = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const a = px(y * W + x)[3] > 128;
        const s = sombre(Math.min(sx1, Math.round(sx0 + (x - x0 + 0.5) * (sx1 - sx0 + 1) / larg - 0.5)), Math.min(sy1, Math.round(sy0 + (y - y0 + 0.5) * (sy1 - sy0 + 1) / haut - 0.5)));
        if (a && s) inter++; if (a || s) union++;
      }
      const iou = union ? inter / union : 0;
      const centre = Math.abs(y0 - (W - 1 - y1)) <= 2 && Math.abs(x0 - (W - 1 - x1)) <= 2;
      dit('4. le petit pictogramme : blanc sur transparent, la silhouette de l\'icône sur 20 dp des 24, centrée',
        bd.type === 'image/png' && W === 96 && bd.h === 96 && pasBlanc === 0 && transp / (W * W) > 0.4 && Math.abs(haut - 80) <= 2 && centre && iou > 0.9,
        W + '×' + bd.h + ' · ' + Math.round(100 * transp / (W * W)) + ' % transparent · ' + pasBlanc + ' pixel(s) pas blancs · silhouette ' + larg + '×' + haut
          + ' à (' + x0 + ',' + y0 + ') · ressemblance à l\'icône ' + iou.toFixed(3));
    } else dit('4. le petit pictogramme : blanc sur transparent', false, 'badge ' + bd.statut + ' · icône ' + ic.statut);

    /* ===== 5. LES VIGNETTES ===== */
    const fab = await (await fetch(BASE + 'notifications/icones/fabriquer.js')).text().catch(() => '');
    const feu = (/const FEU = \['(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})'\]/.exec(fab) || []).slice(1);
    const pal = (t) => t === 'feu' ? feu : ['a', 'b'].map(k => (new RegExp('--pal-' + t + '-' + k + ':(#[0-9A-Fa-f]{6})').exec(html) || [])[1]);
    const TEINTE = { flamme: 'feu', revoir: 'pourpre', absence: 'vert', verset: 'or', priere: 'indigo', lecture: 'rose', rappels: 'jade', message: 'corail', partie: 'corail', moderation: 'ardoise' };
    const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const empreintes = {};
    const det = [];
    let ko5 = 0;
    for (const nom of noms) {
      const im = await lire(BASE + v(nom).slice(2));
      if (!im.d) { ko5++; det.push(nom + ' : ' + im.statut); continue; }
      const W = im.w, at = (x, y) => im.d.slice((y * W + x) * 4, (y * W + x) * 4 + 4);
      const coins = [[2, 2], [W - 3, 2], [2, W - 3], [W - 3, W - 3]].every(([x, y]) => at(x, y)[3] === 0);
      /* Le fond de la pastille, à mi-hauteur, à gauche et à droite de
         l'icône : le dégradé à 150° y vaut 35 % et 65 % du chemin. */
      const [a, bb] = pal(TEINTE[nom]);
      const ca = a && hex(a), cb = bb && hex(bb);
      const mix = (t) => ca.map((c, i) => c + (cb[i] - c) * t);
      const g = at(40, 84), d = at(W - 41, 84);
      const ecart = ca && cb ? Math.max(...mix(0.35).map((c, i) => Math.abs(c - g[i])), ...mix(0.65).map((c, i) => Math.abs(c - d[i]))) : 999;
      let blancs = 0;
      for (let y = 30; y < W - 30; y++) for (let x = 30; x < W - 30; x++) { const q = at(x, y); if (q[3] === 255 && q[0] > 235 && q[1] > 235 && q[2] > 235) blancs++; }
      const bon = im.type === 'image/png' && W === 168 && im.h === 168 && coins && g[3] === 255 && d[3] === 255 && ecart <= 8 && blancs > 250;
      if (!bon) ko5++;
      empreintes[nom] = im.d.reduce((s, x, i) => (s * 31 + x * (i % 7 + 1)) >>> 0, 7);
      det.push(nom + (bon ? '' : ' ✗') + ' ' + W + 'px ' + TEINTE[nom] + ' écart ' + Math.round(ecart) + ' blanc ' + blancs);
    }
    const toutes = new Set(Object.values(empreintes)).size === noms.length;
    dit('5. les vignettes : 168 px, coins transparents, la pastille du jeu et son pictogramme blanc, toutes différentes', !ko5 && toutes, det.join(' · '));

    /* ===== 6. TOUT CE QUE sw.js NOMME EST SERVI ===== */
    const nommes = [...new Set(vus.flatMap(n => [n.icon, n.badge]).filter(Boolean))];
    const servis = [];
    for (const u of nommes) { const r = await fetch(new URL(u, BASE).href); servis.push([u, r.status, r.headers.get('content-type')]); }
    dit('6. chaque image nommée par sw.js est servie (' + nommes.length + ')', nommes.length >= 11 && servis.every(([, s, t]) => s === 200 && t === 'image/png'),
      servis.filter(([, s, t]) => s !== 200 || t !== 'image/png').map(x => x.join(' ')).join(' | ') || nommes.map(u => u.replace(ICONES, '')).join(' '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — sur Android, le petit pictogramme de Yada à gauche, et à droite ce dont parle la notification');
  process.exit(ko ? 1 : 0);
})();
