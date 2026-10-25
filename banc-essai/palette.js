/* ====== BANC « LA PALETTE DE YADA » (v334) ======
   « Harmonise la palette de couleurs des différents modes de jeu : une
     interface plus cohérente, élégante et professionnelle. Une palette
     principale et secondaire ; des modes distincts sans être disparates ;
     un contraste suffisant ; pas de couleurs trop vives. »
   La palette est écrite une fois, en tête de la feuille (--pal-*). Ce banc
   vérifie qu'elle tient sa règle, et que le jeu s'en sert :
     1. les accents (ciel, pourpre, vert, jade, rose, indigo) ont la même
        clarté et la même intensité perçues (OKLCH), à 0,01 et 0,012 près —
        seule la teinte change. Une teinte peut rester en dessous si, et
        seulement si, l'écran ne sait pas montrer plus intense à cette clarté
        (le bleu-vert foncé du jade) : elle doit alors être AU BORD de ce que
        l'écran sait montrer. Aucun accent n'est plus intense que le corail,
        la couleur principale ;
     2. sur chaque pastille, le pictogramme blanc se lit : au moins 2,7 de
        contraste au bas du dégradé (au moins 2,25 au milieu pour l'or, qui
        doit rester de l'or) ;
     3. l'or des jours joués reste loin du feu des flammes (écart perçu
        CIEDE2000 d'au moins 12 ; il était de 3,3 quand on les confondait) ;
     4. chaque pastille colorée du jeu — les cinq cartes de l'accueil, les
        Réglages, les objectifs, l'En ligne, À revoir, les huit couleurs de
        groupe — est peinte avec les couleurs de la palette, et rien d'autre ;
     5. les huit couleurs d'un groupe (TEINTES) sont, dans l'ordre, le
        corail, l'or, le ciel, le vert, le pourpre, le jade, le rose et
        l'ardoise de la palette ;
     6. aucune erreur.
   Avant la v334 : pas de palette (1 tombe), le Solo à 1,6 de contraste.
   Usage : node banc-essai/palette.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

/* ---- La couleur telle que l'œil la perçoit ---- */
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const rgbDe = (h) => { h = h.replace('#', '').trim(); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const oklch = (h) => {
  const [r, g, b] = rgbDe(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
};
const lum = (h) => { const [r, g, b] = rgbDe(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (h) => 1.05 / (lum(h) + 0.05);
const lab = (h) => {
  const [r, g, b] = rgbDe(h).map(lin);
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const X = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047), Y = f(0.2126729 * r + 0.7151522 * g + 0.0721750 * b), Z = f((0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
};
const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
const de2000 = (h1, h2) => {
  const [L1, a1, b1] = lab(h1), [L2, a2, b2] = lab(h2);
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h1p = (deg(Math.atan2(b1, a1p)) + 360) % 360, h2p = (deg(Math.atan2(b2, a2p)) + 360) % 360;
  let dh = h2p - h1p; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dL = L2 - L1, dC = C2p - C1p, dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dh / 2));
  const Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = C1p * C2p === 0 ? h1p + h2p : (Math.abs(h1p - h2p) <= 180 ? (h1p + h2p) / 2 : (h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2));
  const T = 1 - 0.17 * Math.cos(rad(hb - 30)) + 0.24 * Math.cos(rad(2 * hb)) + 0.32 * Math.cos(rad(3 * hb + 6)) - 0.20 * Math.cos(rad(4 * hb - 63));
  const dT = 30 * Math.exp(-Math.pow((hb - 275) / 25, 2)), Rc = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const Sl = 1 + 0.015 * Math.pow(Lb - 50, 2) / Math.sqrt(20 + Math.pow(Lb - 50, 2)), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(rad(2 * dT)) * Rc;
  return Math.sqrt(Math.pow(dL / Sl, 2) + Math.pow(dC / Sc, 2) + Math.pow(dH / Sh, 2) + Rt * (dC / Sc) * (dH / Sh));
};
/* L'écran sait-il montrer cette couleur ? (OKLCH → sRGB, chaque canal dans [0, 1]) */
const dansEcran = (L, C, H) => {
  const a = C * Math.cos(rad(H)), b = C * Math.sin(rad(H));
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].every(v => v >= -0.0005 && v <= 1.0005);
};
const hexDeRgb = (s) => '#' + s.match(/\d+/g).slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase();

const NOMS = ['corail', 'or', 'ciel', 'pourpre', 'vert', 'jade', 'rose', 'indigo', 'bronze', 'ardoise'];
const ACCENTS = ['ciel', 'pourpre', 'vert', 'jade', 'rose', 'indigo'];
const GRP_DECOR = () => {
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
  grp.installe = true; grp.ouverts = true; grp.message = '';
  grp.etat = { participe: 'ok', moderateur: false, ouverts: true };
  grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' } };
  grp.liste = [0, 1, 2, 3, 4, 5, 6, 7].map(t => ({ id: 'g-' + t, nom: 'Groupe ' + t, teinte: t, ouvert: false, code: 'ABC23' + t, nb_membres: 2, non_lus: 0, dernier_message: il(t + 1), apercu: null }));
  grp.publics = []; grp.membres = {}; grp.fils = {}; grp.courant = null;
};
/* Les pastilles qui portent une couleur de la palette, écran par écran. */
const ECRANS = [
  ['accueil', () => { state.screen = 'mode'; render(); }, '.mode-icon, .daily-card .dc-ico, .parcours-card .pc-ico'],
  ['réglages', () => { window.notifPossible = () => true; window.notifEtat = () => 'granted'; settings.notif = true; openSettings(); }, '.set-ico'],
  ['objectifs', () => { closeSettings(); state.screen = 'parcours'; render(); }, '.ach-tile'],
  ['en ligne', () => { window.onlineConfigured = () => true; state.screen = 'online'; render(); }, '.oa-ico'],
  ['à revoir', () => { ouvrirRevoir(); }, '.rv-grand'],
  ['groupes', () => { window.__grp(); state.screen = 'groupes'; render(); }, '#grpMes .grp-av'],
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(800);

    const P = await p.evaluate((noms) => {
      const cs = getComputedStyle(document.documentElement), out = {};
      for (const n of noms) out[n] = [cs.getPropertyValue('--pal-' + n + '-a').trim(), cs.getPropertyValue('--pal-' + n + '-b').trim()];
      out.feu = cs.getPropertyValue('--feu').trim();
      return out;
    }, NOMS);
    const manque = NOMS.filter(n => !/^#[0-9a-f]{6}$/i.test(P[n][0]) || !/^#[0-9a-f]{6}$/i.test(P[n][1]));
    if (manque.length) { dit('la palette est écrite (--pal-*)', false, 'absentes : ' + manque.join(', ')); throw new Error('pas de palette'); }

    /* 1 */
    const mes = ACCENTS.map(n => ({ n, a: oklch(P[n][0]), b: oklch(P[n][1]) }));
    /* L'intensité commune est celle des accents que l'écran laisse libres ;
       une teinte plus pâle n'est admise qu'au bord de ce que l'écran montre. */
    const auBord = (o) => !dansEcran(o.L, o.C + 0.006, o.H);
    const ecart = (k, bout) => {
      const v = mes.filter(m => k !== 'C' || !auBord(m[bout])).map(m => m[bout][k]);
      const plafond = Math.max(...v), plancher = Math.min(...v);
      const auDessus = k === 'C' ? mes.filter(m => auBord(m[bout]) && m[bout].C > plafond + 0.012) : [];
      return Math.max(plafond - plancher, auDessus.length ? 1 : 0);
    };
    const bridees = mes.filter(m => auBord(m.a) || auBord(m.b)).map(m => m.n);
    const corail = Math.max(oklch(P.corail[0]).C, oklch(P.corail[1]).C);
    const plusIntense = mes.filter(m => Math.max(m.a.C, m.b.C) >= corail).map(m => m.n);
    dit('1. les six accents : même clarté, même intensité, seule la teinte change ; le corail reste le plus intense',
      ecart('L', 'a') <= 0.01 && ecart('L', 'b') <= 0.01 && ecart('C', 'a') <= 0.012 && ecart('C', 'b') <= 0.012 && !plusIntense.length,
      'clarté ' + ecart('L', 'a').toFixed(3) + ' / ' + ecart('L', 'b').toFixed(3) + ' · intensité ' + ecart('C', 'a').toFixed(3) + ' / ' + ecart('C', 'b').toFixed(3)
      + ' · ' + mes.map(m => m.n + ' L' + m.a.L.toFixed(2) + ' C' + m.a.C.toFixed(3) + ' H' + Math.round(m.a.H)).join(', ') + (bridees.length ? ' · au bord de l\'écran : ' + bridees.join(', ') : '') + (plusIntense.length ? ' · plus intense que le corail : ' + plusIntense.join(', ') : ''));

    /* 2 */
    const bas = NOMS.filter(n => n !== 'or').map(n => [n, contraste(P[n][1])]);
    const or = (contraste(P.or[0]) + contraste(P.or[1])) / 2;
    const faibles = bas.filter(([, c]) => c < 2.7);
    dit('2. le pictogramme blanc se lit sur chaque pastille', !faibles.length && or >= 2.25,
      bas.map(([n, c]) => n + ' ' + c.toFixed(2)).join(', ') + ' · or (milieu) ' + or.toFixed(2) + (faibles.length ? ' · trop faibles : ' + faibles.map(f => f[0]).join(', ') : ''));

    /* 3 — la couleur moyenne d'un jour joué, photographiée. */
    const jour = await p.evaluate(() => {
      const j = document.querySelector('.sj'); if (!j) return null;
      j.classList.add('fait'); return true;
    });
    let ecartFeu = null, d3 = 'pas de jour sur l\'accueil';
    if (jour) {
      await p.waitForTimeout(300);
      const boite = await p.evaluate(() => { const r = document.querySelector('.sj.fait').getBoundingClientRect(); return { x: r.left + r.width * 0.2, y: r.top + r.height * 0.15, width: r.width * 0.6, height: r.height * 0.25 }; });
      const png = await p.screenshot({ clip: boite });
      const moy = await p.evaluate(async (b64) => {
        const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; let r = 0, v = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; v += d[i + 1]; b += d[i + 2]; n++; }
        return 'rgb(' + Math.round(r / n) + ',' + Math.round(v / n) + ',' + Math.round(b / n) + ')';
      }, png.toString('base64'));
      ecartFeu = de2000(hexDeRgb(moy), P.feu);
      d3 = 'jour joué ' + moy + ' · feu ' + P.feu + ' · écart ' + ecartFeu.toFixed(1);
      await p.evaluate(() => { document.querySelector('.sj.fait').classList.remove('fait'); });
    }
    dit('3. l\'or des jours joués reste loin du feu des flammes', ecartFeu !== null && ecartFeu >= 12, d3);

    /* 4 */
    const permises = new Set(NOMS.flatMap(n => P[n]).map(h => h.toUpperCase()));
    await p.evaluate(`window.__grp = ${GRP_DECOR.toString()};`);
    const hors = [], vus = {};
    for (const [nom, prep, sel] of ECRANS) {
      try { await p.evaluate(`(${prep.toString()})()`); } catch (e) { hors.push(nom + ' : ' + e.message.slice(0, 60)); continue; }
      await p.waitForTimeout(900);
      const fonds = await p.evaluate((sel) => [...document.querySelectorAll(sel)].map(e => ({ c: (e.className && e.className.baseVal === undefined ? e.className : '') + '', f: getComputedStyle(e).backgroundImage })), sel);
      vus[nom] = fonds.length;
      for (const f of fonds) {
        const cs = (f.f.match(/rgba?\([^)]*\)/g) || []).map(hexDeRgb);
        if (!cs.length && f.f === 'none') continue; /* une photo, une pastille sans fond */
        const etr = cs.filter(h => !permises.has(h));
        if (etr.length) hors.push(nom + ' « ' + f.c.trim().slice(0, 30) + ' » ' + etr.join(' '));
      }
    }
    const peu = Object.entries(vus).filter(([, n]) => !n).map(([k]) => k);
    dit('4. chaque pastille colorée du jeu est peinte avec la palette, et rien d\'autre', !hors.length && !peu.length,
      Object.entries(vus).map(([k, n]) => k + ' ' + n).join(', ') + (hors.length ? ' · hors palette : ' + hors.slice(0, 6).join(' | ') : '') + (peu.length ? ' · rien vu : ' + peu.join(', ') : ''));

    /* 5 */
    const T = await p.evaluate(() => TEINTES.map(t => t.map(h => h.toUpperCase())));
    const ordre = ['corail', 'or', 'ciel', 'vert', 'pourpre', 'jade', 'rose', 'ardoise'];
    const faux = ordre.map((n, i) => [n, T[i]]).filter(([n, t]) => !t || t[0] !== P[n][0].toUpperCase() || t[1] !== P[n][1].toUpperCase());
    dit('5. les huit couleurs d\'un groupe sont celles de la palette, dans l\'ordre', T.length === 8 && !faux.length,
      faux.length ? faux.map(([n, t]) => n + ' : ' + (t || []).join('→') + ' ≠ ' + P[n].join('→')).join(' · ') : T.map(t => t[0]).join(' '));
    await ctx.close();
  } catch (e) { if (e.message !== 'pas de palette') { console.error(e); } ko++; }
  finally { dit('6. aucune erreur', !errs.length, errs.slice(0, 3).join(' | ')); await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — une seule palette, tenue partout');
  process.exit(ko ? 1 : 0);
})();
