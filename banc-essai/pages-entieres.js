/* ====== BANC « LES PAGES ARRIVENT ENTIÈRES » (v383) ======
   « Vérifie que les pages qui s'ouvrent se comportent bien : il y a un petit
     bug à l'ouverture, c'est comme si elles s'ouvraient puis se chargeaient
     une deuxième fois. »
   Filmé avant la v383 (vrai PostgreSQL, réseau de téléphone : 250 ms par
   requête) : la page d'un joueur arrivait avec des tirets, puis à +280 ms —
   en plein glissement — ses chiffres, ses testaments, ses objectifs et sa
   flamme étaient tous refaits d'un coup, même identiques.
     1. les chiffres des membres sont lus avec les membres, d'une seule
        requête, sans rien marquer ni envoyer ;
     2. la page d'un joueur arrive avec ses vrais chiffres dès sa première
        image (pas de tirets) ;
     3. rien n'est refait dans la page pendant qu'elle glisse (la relecture
        de l'ouverture, identique, ne touche à rien) ;
     4. des chiffres qui CHANGENT pendant le glissement se posent juste après
        (la page posée), en une fois ;
     5. la page des infos du groupe : une relève des membres identique ne
        refait pas la liste ;
     6. aucune erreur.
   Usage : node banc-essai/pages-entieres.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000f1', B = 'bbbbbbbb-0000-4000-8000-0000000000f2';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 320) + ')' : '')); };

/* Ce qui change DANS une page, image par image, depuis son ouverture. */
const FILMER = () => {
  window.__filmerPage = (id, ms) => new Promise(res => {
    const t0 = performance.now(); let v = null, obs = null; const muts = [], images = [];
    const pas = () => {
      const t = performance.now() - t0;
      if (!v) { v = document.getElementById(id);
        if (v) { obs = new MutationObserver(l => { const tt = Math.round(performance.now() - t0); for (const m of l) {
          if (m.type === 'attributes' && (m.target === v || (m.target.classList && m.target.classList.contains('settings-sheet')))) continue;   // la vie de la page elle-même (monte, posée…)
          if (m.type === 'attributes' && m.target.classList && (m.target.classList.contains('gs') || m.attributeName === 'style')) continue;
          muts.push({ t: tt, k: m.type, d: (m.target.className && m.target.className.baseVal === undefined ? m.target.className : m.target.nodeName) }); } });
          obs.observe(v, { subtree: true, childList: true, attributes: true, characterData: true }); } }
      if (v) { const c = v.querySelector('.mb-profil'); images.push({ t: Math.round(t), posee: v.classList.contains('posee'), tirets: c ? (c.textContent.match(/—/g) || []).length : -1 }); }
      if (t < ms) requestAnimationFrame(pas); else { if (obs) obs.disconnect(); res({ muts, images }); }
    };
    requestAnimationFrame(pas);
  });
};

(async () => {
  const m = await monter(8571, 5771);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: 'Le groupe du jeudi', p_ouvert: false, p_langue: 'fr', p_teinte: 1 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: 'Salut', p_genre: 'texte', p_donnees: {} });
    const stats = { livres: 12, at: 7, nt: 5, bonnes: 834, serie: 21, succes: ['premiers-pas'], flamme: 4, flamme_le: new Date().toISOString().slice(0, 10), gel: 0 };
    await m.rpc(B, 'poser_stats', { p_stats: stats });

    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    const lectures = [];
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    /* Le réseau d'un téléphone (250 ms par requête) ; on compte les lectures
       des chiffres (un select de la table des profils qui demande « stats »). */
    await p.route('**/faux/**', async r => { const q = r.request(); if (/\/faux\/select/.test(q.url())) { try { const c = JSON.parse(q.postData() || '{}'); if (c.table === 'profils' && /stats/.test(c.cols || '')) lectures.push(c); } catch (e) {} }
      await new Promise(f => setTimeout(f, 250)); r.continue(); });
    await p.addInitScript((moi) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
    }, A);
    await p.addInitScript(FILMER);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 30000 });
    await p.evaluate(() => allerOnglet('groupes')); await p.waitForTimeout(2200);
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await p.waitForFunction((b) => { try { return !!(grp.membres[grp.courant] || []).find(x => x.membre === b) && !!(grp.stats && grp.stats[b]); } catch (e) { return false; } }, B, { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(600);
    /* 1 */
    const lu = await p.evaluate((b) => grp.stats && grp.stats[b], B);
    dit('1. les chiffres des membres sont lus avec les membres, d\'une seule requête', !!lu && lu.bonnes === 834 && lectures.length === 1, lectures.length + ' lecture(s) des chiffres · ' + JSON.stringify(lu || null).slice(0, 80));
    /* 2, 3 */
    await p.evaluate(() => ouvrirInfosGroupe());
    await p.waitForTimeout(800);
    const film2 = p.evaluate(() => window.__filmerPage('grpMembreVeil', 1300));
    await p.waitForTimeout(20);
    await p.evaluate((b) => ouvrirMembre(b), B);
    const f = await film2;
    const premiere = f.images[0] || {};
    dit('2. la page d\'un joueur arrive avec ses vrais chiffres dès sa première image', premiere.tirets === 0 && lectures.length >= 1, 'première image : ' + JSON.stringify(premiere));
    dit('3. rien n\'est refait dans la page pendant qu\'elle glisse (la relecture identique ne touche à rien)', f.muts.length === 0, f.muts.length + ' changement(s) : ' + JSON.stringify(f.muts.slice(0, 4)));
    await p.evaluate(() => { document.querySelectorAll('#grpMembreVeil').forEach(v => v.remove()); try { majPages(); } catch (e) {} });
    await p.waitForTimeout(500);
    /* 4 : des chiffres qui changent pendant le glissement */
    await m.rpc(B, 'poser_stats', { p_stats: Object.assign({}, stats, { bonnes: 900, livres: 13 }) });
    const film3 = p.evaluate(() => window.__filmerPage('grpMembreVeil', 1500));
    await p.waitForTimeout(20);
    await p.evaluate((b) => ouvrirMembre(b), B);
    const f3 = await film3;
    const t3 = f3.muts.map(x => x.t), poseeA = (f3.images.find(i => i.posee) || {}).t;
    const texte = await p.evaluate(() => (document.querySelector('#grpMembreVeil .mb-profil') || {}).textContent || '');
    dit('4. des chiffres qui changent pendant le glissement se posent juste après, la page posée, en une fois',
      f3.muts.length > 0 && poseeA !== undefined && t3.every(t => t >= poseeA - 20) && Math.max(...t3) - Math.min(...t3) <= 20 && /900/.test(texte.replace(/\s/g, '')),
      'posée à +' + poseeA + ' ms, changements à ' + JSON.stringify([...new Set(t3)]) + ' · ' + texte.replace(/\s+/g, ' ').slice(0, 60));
    await p.evaluate(() => { document.querySelectorAll('#grpMembreVeil').forEach(v => v.remove()); try { majPages(); } catch (e) {} });
    await p.waitForTimeout(500);
    /* 5 : la liste des infos, une relève identique */
    const film5 = p.evaluate(() => window.__filmerPage('grpInfosVeil', 1600));
    await p.waitForTimeout(20);
    await p.evaluate((id) => chargerMembres(id), g.id);
    const f5 = await film5;
    dit('5. infos du groupe : une relève des membres identique ne refait pas la liste', f5.muts.length === 0, f5.muts.length + ' changement(s) : ' + JSON.stringify(f5.muts.slice(0, 4)));
  } catch (e) { errs.push('le banc s\'est arrêté : ' + (e.stack || e.message)); }
  dit('6. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close(); await m.arreter();
  console.log(ko === 0 ? '\n  OK — les pages arrivent entières, et rien ne s\'y refait en route' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
