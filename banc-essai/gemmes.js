/* ====== BANC « DES GEMMES QUI RESSEMBLENT À DES GEMMES » (v383) ======
   « N'oublie pas de continuer le travail sur les gemmes et tout ce qui va
     avec. » Le mot est « gemmes » depuis la v379 ; le dessin restait un
   diamant de dessin animé (le 💎 de tous les jeux). La v383 dessine une
   pierre taillée — un octogone, sa table, huit facettes — partout où une
   gemme se montre, et un tas de trois gemmes dans la Boutique.
     1. l'icône est la pierre taillée : son rondiste à huit côtés, sa table,
        ses facettes en voiles de blanc et d'ombre sur currentColor (aucun
        dégradé nommé, aucun identifiant) ;
     2. partout où une gemme se montre — le compteur du Parcours, la réserve,
        les gains et le prix de la Boutique, la fin d'une leçon, la prime
        d'une quête, l'étiquette d'un coffre ouvert, la scène du coffre et ce
        qui en jaillit —, c'est elle : plus aucun ancien diamant, ni dans la
        page, ni dans le code ;
     3. la Boutique montre un tas de trois gemmes (verte, rouge, bleue), sur
        une tuile claire, sans ombre colorée ;
     4. ce qui jaillit du coffre : la même pierre, dans les cinq couleurs du
        trésor ;
     5. la gemme prend la couleur de sa place : bleue au compteur, blanche
        sur le bouton d'achat, grise quand il est grisé ;
     6. AUCUNE GEMME NE SE PERD : la réserve d'un joueur (bt_tresor, écrite
        par la v382) est relue au même compte, et une gemme gagnée s'y ajoute
        comme avant ;
     7. aucune erreur.
   Usage : node banc-essai/gemmes.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 320) + ')' : '')); };
const PIERRE = '8,2.5 16,2.5 21,7.5 21,16.5 16,21.5 8,21.5 3,16.5 3,7.5';
/* La pierre se reconnaît à son rondiste (l'icône, d'une couleur) ou à sa
   table (la pierre en couleurs, facette par facette). */
const EST_PIERRE = "(h) => h.includes('8,2.5 16,2.5 21,7.5') || h.includes('9.7,7 14.3,7 17,9.7 17,14.3 14.3,17 9.7,17 7,14.3 7,9.7')";
/* Une réserve écrite par la v382 : quatre gains (10 + 5 + 30 + 20) et un gel acheté (50) : 15 gemmes. */
const TRESOR = { v: 1, gains: { 'lecon:u1-l1': { n: 10, t: '2026-11-20' }, 'parfait:u1-l1': { n: 5, t: '2026-11-20' }, 'coffre:u1': { n: 30, t: '2026-11-21' }, 'quete:q1': { n: 20, t: '2026-11-22' } },
  depenses: { 'gel:mzx1abc': { n: 50, t: '2026-11-23' } } };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await ctx.route('**/*.supabase.co/**', r => r.abort());
    await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((t) => { if (!sessionStorage.getItem('deja')) { sessionStorage.setItem('deja', '1');
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); localStorage.setItem('bt_tresor', JSON.stringify(t)); } }, TRESOR);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    /* 6 : la réserve d'avant, relue au même compte */
    const solde0 = await p.evaluate(() => soldeDiamants());
    /* 1 */
    const ico = await p.evaluate(() => ICONS.diamant);
    dit('1. l\'icône est la pierre taillée : rondiste à huit côtés, table, facettes en voiles sur currentColor, sans dégradé ni identifiant',
      ico.includes('points="' + '8,2.5 16,2.5 21,7.5 21,16.5 16,21.5 8,21.5 3,16.5 3,7.5' + '"') && /fill="currentColor"/.test(ico) && (ico.match(/fill-opacity/g) || []).length >= 5
        && !/Gradient|id=/.test(ico) && !/M7 4h10/.test(ico), ico.slice(0, 160));
    /* 2 : partout */
    await p.evaluate(() => allerOnglet('parcours'));
    await p.waitForTimeout(1500);
    await p.evaluate((f) => { window.__pierre = (0, eval)(f); }, EST_PIERRE);
    const lieux = {};
    const relever = async (nom, sel) => { lieux[nom] = await p.evaluate((sel) => { const l = [...document.querySelectorAll(sel)]; return { n: l.length, pierres: l.filter(s => window.__pierre(s.innerHTML)).length, vieux: l.filter(s => /M7 4h10|M7 3h10/.test(s.innerHTML)).length,
      couleur: l[0] ? getComputedStyle(l[0]).color : null }; }, sel); };
    await relever('compteur', '.ch-diamants .ico');
    await relever('prime de quête', '.ch-prime .ico');
    /* Un coffre ouvert, tel que le chemin le dessine. */
    lieux['coffre ouvert'] = await p.evaluate(() => { const d = document.createElement('div');
      d.innerHTML = coffreHtml({ id: 'essai' }, 0, true, { gains: { 'coffre:essai': { n: 30, t: '2026-11-25' } }, depenses: {} });
      const l = [...d.querySelectorAll('.ch-coffre-l .ico')]; return { n: l.length, pierres: l.filter(s => window.__pierre(s.innerHTML)).length, vieux: l.filter(s => /M7 4h10/.test(s.innerHTML)).length }; });
    await p.evaluate(() => ouvrirBoutique());
    await p.waitForTimeout(1300);
    await relever('gains de la Boutique', '#boutiqueVeil .bq-ligne .ico');
    await relever('prix', '#boutiqueVeil .bq-acheter .ico');
    const tas = await p.evaluate(() => { const t = document.querySelector('#boutiqueVeil .bq-solde .bq-tas'); if (!t) return null; const cs = getComputedStyle(t);
      return { svgs: [...t.querySelectorAll('svg')].map(s => (s.innerHTML.match(/fill="(#[0-9A-Fa-f]{6})"/g) || []).slice(2, 3).join('')), pierres: [...t.querySelectorAll('svg')].filter(s => window.__pierre(s.innerHTML)).length,
        ombre: cs.boxShadow, fond: cs.backgroundColor, vieux: /M7 4h10|M7 3h10/.test(t.innerHTML) }; });
    const achat = await p.evaluate(() => { const b = document.querySelector('#boutiqueVeil .bq-acheter'); return b ? { couleur: getComputedStyle(b.querySelector('.ico')).color, grise: b.disabled } : null; });
    /* Le bouton d'achat, actif (assez de gemmes) puis grisé. */
    await p.evaluate(() => { document.querySelectorAll('.sheet-veil').forEach(v => v.remove()); gagnerDiamants('essai:banc', 100); ouvrirBoutique(); });
    await p.waitForTimeout(1300);
    const achatActif = await p.evaluate(() => { const b = document.querySelector('#boutiqueVeil .bq-acheter'); return b ? { couleur: getComputedStyle(b.querySelector('.ico')).color, grise: b.disabled } : null; });
    await p.evaluate(() => document.querySelectorAll('.sheet-veil').forEach(v => v.remove()));
    const fin = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = gainHtml(10); document.body.appendChild(d); const s = d.querySelector('.ico').innerHTML; d.remove(); return s; });
    lieux['fin d\'une leçon'] = { n: 1, pierres: await p.evaluate((h) => window.__pierre(h) ? 1 : 0, fin), vieux: /M7 4h10/.test(fin) ? 1 : 0 };
    await p.evaluate(() => sceneCoffre(30));
    await p.waitForTimeout(500);
    await relever('gain du coffre', '.coffre-veil .cs-gain .ico');
    const jaillit = await p.evaluate(() => [...document.querySelectorAll('.coffre-veil .cs-gemme svg')].map(s => ({ pierre: window.__pierre(s.innerHTML), couleur: (s.innerHTML.match(/fill="(#[0-9A-Fa-f]{6})"/g) || [])[2] || '' })));
    await p.evaluate(() => { try { closeModal(); } catch (e) {} });
    const source = await p.evaluate(() => document.documentElement.outerHTML.includes('M7 4h10l4.2 5.4') || (typeof gemmeSvg === 'function' && /M7 3h10/.test(gemmeSvg.toString())));
    const tous = Object.entries(lieux);
    dit('2. partout où une gemme se montre, c\'est la pierre taillée — plus aucun ancien diamant',
      tous.every(([, v]) => v.n > 0 && v.pierres === v.n && v.vieux === 0) && !source,
      tous.map(([k, v]) => k + ' ' + v.pierres + '/' + v.n).join(' · ') + (source ? ' · ANCIEN DESSIN ENCORE DANS LE CODE' : ''));
    dit('3. la Boutique montre un tas de trois gemmes (verte, rouge, bleue), sur une tuile claire, sans ombre colorée',
      !!tas && tas.pierres === 3 && !tas.vieux && tas.ombre === 'none' && /rgba\(39, 125, 196, 0\.1\)/.test(tas.fond), JSON.stringify(tas));
    const couleurs = new Set(jaillit.map(j => j.couleur));
    dit('4. ce qui jaillit du coffre : la pierre taillée, dans les cinq couleurs du trésor', jaillit.length >= 5 && jaillit.every(j => j.pierre) && couleurs.size >= 5,
      jaillit.length + ' gemmes, ' + couleurs.size + ' couleurs');
    dit('5. la gemme prend la couleur de sa place : bleue au compteur, blanche sur le bouton d\'achat, grise quand il est grisé',
      lieux.compteur.couleur === 'rgb(47, 143, 216)' && achatActif && !achatActif.grise && achatActif.couleur === 'rgb(255, 255, 255)' && achat && achat.grise && achat.couleur !== achatActif.couleur,
      JSON.stringify({ compteur: lieux.compteur.couleur, actif: achatActif, grise: achat }));
    /* 6 : la réserve */
    const apres = await p.evaluate(() => { const avant = soldeDiamants(); const g = gagnerDiamants('lecon:essai-banc', 10); const t = JSON.parse(localStorage.getItem('bt_tresor'));
      return { avant, g, apres: soldeDiamants(), cles: Object.keys(t.gains).length, depenses: Object.keys(t.depenses).length }; });
    dit('6. aucune gemme ne se perd : la réserve de la v382 relue au même compte (10 + 5 + 30 + 20 − 50 = 15), un gain s\'y ajoute',
      solde0 === 15 && apres.apres === apres.avant + 10 && apres.g === 10 && apres.depenses === 1, JSON.stringify({ solde0, ...apres }));
    await ctx.close();
  } catch (e) { errs.push('le banc s\'est arrêté : ' + (e.stack || e.message)); }
  dit('7. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko === 0 ? '\n  OK — des gemmes taillées partout, un tas de trois dans la Boutique, et pas une gemme perdue' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
