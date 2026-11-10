/* ====== AUCUN BOUTON NE GARDE LA BORDURE DU NAVIGATEUR (v359) ======
   « Regarde, c'est pas pareil sur tes captures que sur mon jeu : les bords
     sont noirs de mon côté, c'est pas normal non ? » — capture de l'iPhone :
   chaque pierre du Parcours, et la bulle « Commencer », cernée d'un trait
   noir. Ce sont des boutons ; rien ne leur retirait la bordure qu'un
   navigateur pose d'office sur un bouton : Chrome un liseré clair de 2 px
   (presque invisible, d'où mes captures sans trait), Safari un trait noir.
   « Je veux que tout soit pareil, peu importe l'appareil. »
   Ce que le navigateur ajoute de lui-même, il l'ajoute à sa façon : chaque
   bouton, chaque champ, chaque liste doit donc dire lui-même sa bordure.
   Le banc parcourt le jeu, sur iPhone et sur Android, et exige :
     1. aucun contrôle (bouton, champ, liste, lien) ne garde la bordure du
        navigateur (un style « outset », « inset », « groove » ou « ridge »
        — le jeu n'en écrit jamais : c'est la signature du navigateur) ;
     2. aucun contrôle ne porte de trait visible (« jamais de bordures de
        couleurs, nulle part ») ;
     3. les pierres du Parcours et la bulle « Commencer » : bordure nulle,
        apparence du système retirée ;
     4. aucune erreur.
   Usage : node banc-essai/bords-natifs.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 600) + ')' : '')); };

const RELEVER = (nom) => {
  const natifs = [], traits = [], pierres = [];
  document.querySelectorAll('button, input, select, textarea, [role=button], a').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).slice(0, 2).join('.');
    const qui = nom + ' · ' + el.tagName.toLowerCase() + (cls ? '.' + cls : '') + (el.id ? '#' + el.id : '');
    const cotes = ['Top', 'Right', 'Bottom', 'Left'];
    const larg = (s) => parseFloat(cs['border' + s + 'Width']) || 0;
    if (cotes.some(s => larg(s) > 0 && /outset|inset|groove|ridge/.test(cs['border' + s + 'Style']))) natifs.push(qui + ' ' + cs.borderTopWidth + ' ' + cs.borderTopStyle);
    else if (cotes.some(s => {
      if (!(larg(s) > 0) || /none|hidden/.test(cs['border' + s + 'Style'])) return false;
      const m = /rgba?\(([^)]+)\)/.exec(cs['border' + s + 'Color']); if (!m) return cs['border' + s + 'Color'] !== 'transparent';
      const v = m[1].split(',').map(x => parseFloat(x)); return (v.length < 4 ? 1 : v[3]) > 0.02;
    })) traits.push(qui + ' ' + cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor);
    if (el.matches('.ch-pierre, .ch-bulle')) pierres.push({ qui, bord: cs.borderTopWidth + ' ' + cs.borderTopStyle, appa: cs.appearance });
  });
  return { natifs, traits, pierres };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const natifs = new Set(), traits = new Set(); const pierres = [];
  for (const [tel, ua, vp] of [['iPhone', IOS, { width: 402, height: 874 }], ['Android', AND, { width: 412, height: 915 }]]) {
    const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() })); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(800);
    const etats = [
      ['accueil', () => { state.screen = 'mode'; render(); }],
      ['parcours (débutant)', () => { allerOnglet('parcours'); }],
      ['parcours (19 leçons)', () => { const f = {}; let k = 0; for (let u = 0; u < PARCOURS.length && k < 18; u++) for (let l = 0; l < LECONS_PAR_UNITE && k < 18; l++, k++) f[cleLecon(u, l)] = '2026-11-01'; localStorage.setItem('bt_parcours', JSON.stringify({ faites: f })); state.screen = 'chemin'; render(); }],
      ['jeux', () => { allerOnglet('jeux'); }],
      ['groupes', () => { allerOnglet('groupes'); }],
      ['discussion', () => {
        grp.etat = { participe: 'ok' };
        grp.liste = [{ id: 'g1', nom: 'Les amis', teinte: 2, nb_membres: 3, notifs: 'tout', non_lus: 0, mentions: 0 }];
        grp.membres.g1 = []; grp.profils.u2 = { nom: 'Kirens', couleur: '#E8734C' };
        grp.fils.g1 = { charge: true, tout: true, lu: 0, messages: [{ id: 1, groupe: 'g1', auteur: 'u2', genre: 'texte', texte: 'Salut', donnees: {}, cree_le: new Date().toISOString(), masque: false, supprime_le: null }] };
        grp.courant = 'g1'; state.screen = 'groupe'; render(); }],
      ['profil', () => { state.screen = 'profile'; render(); }],
      ['solo', () => { state.mode = 'solo'; state.screen = 'setup'; render(); }],
      ['groupe (3 joueurs)', () => { state.mode = 'group'; state.teams = [{ name: 'Taylor' }, { name: 'B' }, { name: 'C' }]; state.screen = 'setup'; render(); }],
      ['groupe (6 joueurs)', () => { state.mode = 'group'; state.teams = ['Taylor', 'B', 'C', 'D', 'E', 'F'].map(name => ({ name })); state.screen = 'setup'; render(); }],
      ['réglages', () => { state.screen = 'mode'; render(); setTimeout(() => openSettings(), 50); }],
      ['leçon', () => { document.querySelectorAll('.sheet-veil').forEach(v => v.remove()); commencerLecon(0, 0); }],
      ['leçon, réponse', () => { const b = document.querySelector('.option-btn'); if (b) b.click(); }],
      ['partie solo', () => { state.mode = 'solo'; startGame(); }],
      ['partie, réponse', () => { const b = document.querySelector('.option-btn'); if (b) b.click(); }],
    ];
    for (const [nom, f] of etats) {
      try { await p.evaluate(f); } catch (e) { errs.push(tel + ' · ' + nom + ' : ' + e.message.slice(0, 120)); }
      await p.waitForTimeout(1100);
      const r = await p.evaluate(RELEVER, tel + ' · ' + nom);
      r.natifs.forEach(x => natifs.add(x)); r.traits.forEach(x => traits.add(x)); pierres.push(...r.pierres);
    }
    await ctx.close();
  }
  dit('1. aucun bouton, champ ni lien ne garde la bordure du navigateur, sur iPhone et sur Android', !natifs.size, natifs.size ? [...natifs].slice(0, 8).join(' | ') : '15 écrans × 2 appareils');
  dit('2. aucun contrôle ne porte de trait visible', !traits.size, traits.size ? [...traits].slice(0, 8).join(' | ') : '');
  const mauvaises = pierres.filter(x => x.bord.indexOf('0px') !== 0 || x.appa !== 'none');
  dit('3. les pierres du Parcours et la bulle « Commencer » : bordure nulle, apparence du système retirée', pierres.length >= 10 && !mauvaises.length,
    pierres.length + ' relevées' + (mauvaises.length ? ' · ' + mauvaises.slice(0, 3).map(x => x.qui + ' ' + x.bord + ' ' + x.appa).join(' | ') : ''));
  dit('4. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — aucun bouton ne garde la bordure du navigateur : le même jeu sur iPhone et sur Android');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
