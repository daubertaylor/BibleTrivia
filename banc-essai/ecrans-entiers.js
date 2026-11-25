/* ====== BANC « UN ÉCRAN ARRIVE ENTIER » (v382) ======
   « Fais en sorte que toutes les pages et les affichages soient bien chargés
     au moment d'une transition, pour qu'ils n'apparaissent pas brusquement :
     dans les jeux ça s'affiche trop tard, et même quand je rentre dans les
     groupes ou autre. »
   Le décor de groupes.js — un VRAI PostgreSQL —, et un réseau de téléphone :
   chaque requête met 250 ms. Image par image :
     1. entrer dans les Groupes : l'écran n'est pas refait après coup, et ses
        lignes ne sont pas redessinées quand rien n'a changé ;
     2. la liste arrivée, les discussions que ce téléphone ne connaît pas sont
        lues d'avance (et leurs membres) ;
     3. lire d'avance n'est pas lire : rien n'est marqué lu (ni chez soi, ni
        sur le serveur) ;
     4. ouvrir un groupe pour la toute première fois : ses messages sont là
        dès la première image de l'écran, l'en-tête n'est pas refait, les
        coches « Vu » sont là et l'heure ne bouge pas ;
     5. le Profil arrive avec la carte du compte (même quand la sonde des
        comptes n'a pas encore répondu) : rien ne pousse l'écran ensuite ;
     6. une liste qui change pendant que l'écran glisse se pose APRÈS le
        glissement, pas pendant ;
     7. aucune erreur.
   Usage : node banc-essai/ecrans-entiers.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000f1', B = 'bbbbbbbb-0000-4000-8000-0000000000f2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 260) + ')' : '')); if (!bon) ko++; };

/* Le film d'un passage : la première image de l'écran qui arrive, et tout ce
   qui s'ajoute ensuite là où on regarde. */
const FILM = () => {
  window.__film = (ms, quoi) => new Promise(res => {
    const app = document.getElementById('app'), t0 = performance.now(), avant = new Set([...app.children]);
    const muts = [];
    const obs = new MutationObserver(l => { const t = performance.now() - t0; for (const m of l) {
      if (m.type === 'childList' && !(m.addedNodes.length || m.removedNodes.length)) continue;
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      muts.push({ t, cible: el ? (el.id || el.className || el.nodeName) : '?', mes: !!(el && el.closest && el.closest('#grpMes')), ajout: [...m.addedNodes].map(n => n.nodeType === 1 ? (n.id || n.className || n.nodeName) : '#t').join(',') });
    } });
    obs.observe(app, { childList: true, subtree: true, characterData: true });
    let premiere = null, tEcran = null, finPassage = null, vuPassage = false;
    const ecrans = [];
    const pas = () => {
      const t = performance.now() - t0;
      const e = [...app.children].filter(x => x.classList && x.classList.contains('screen') && !avant.has(x));
      e.forEach(x => { if (!ecrans.includes(x)) ecrans.push(x); });
      /* « passage » est une variable du jeu (let), pas une propriété de window. */
      const pa = (typeof passage !== 'undefined') ? passage : null;
      if (pa) vuPassage = true; else if (vuPassage && finPassage === null) finPassage = t;
      if (e.length && tEcran === null) { tEcran = t; premiere = quoi ? quoi(e[e.length - 1]) : null; }
      if (t < ms) requestAnimationFrame(pas);
      else { obs.disconnect(); res({ tEcran, premiere, finPassage, ecrans: ecrans.length, muts: muts.filter(m => m.t > (tEcran || 0) + 1) }); }
    };
    requestAnimationFrame(pas);
  });
};

(async () => {
  const m = await monter(8566, 5766);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g1 = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: 'Le groupe du jeudi', p_ouvert: false, p_langue: 'fr', p_teinte: 1 })).data;
    const g2 = (await m.rpc(B, 'creer_groupe', { p_nom: 'La chorale', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 3 })).data;
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g1.id, p_code: await m.sql(`select code from public.groupes where id = '${g1.id}'`) });
    await m.rpc(A, 'rejoindre_groupe', { p_groupe: g2.id, p_code: await m.sql(`select code from public.groupes where id = '${g2.id}'`) });
    const ecrit = async (qui, g, t) => { await m.sql("update public.messages set cree_le = cree_le - interval '6 minutes'"); await m.rpc(qui, 'envoyer_message', { p_groupe: g, p_texte: t, p_genre: 'texte', p_donnees: {} }); };
    for (const [qui, t] of [[B, 'Salut tout le monde'], [A, 'Coucou Benoît'], [B, 'On fait une partie ?'], [A, 'Oui, ce soir'], [B, 'Parfait']]) await ecrit(qui, g1.id, t);
    for (const t of ['Répétition samedi', 'À 10 h', 'Apportez vos partitions']) await ecrit(B, g2.id, t);
    await m.sql("update public.messages set cree_le = cree_le - interval '6 minutes'; update public.membres set rejoint_le = rejoint_le - interval '1 hour'");
    const luAvant = await m.sql(`select coalesce(lu_jusqu, 0) from public.membres where groupe = '${g2.id}' and membre = '${A}'`);

    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await p.route('**/faux/**', async r => { await new Promise(f => setTimeout(f, 250)); r.continue(); });
    await p.addInitScript((moi) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
      { const d = new Date(), z = n => String(n).padStart(2, '0'), k = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
        localStorage.setItem('bt_daily', JSON.stringify({ last: k, streak: 1, score: 0, total: 0, jours: [k], geles: [], palier: 0 })); }
    }, A);
    await p.addInitScript(FILM);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok') && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);

    /* ===== 1 ===== */
    const f1 = p.evaluate(() => window.__film(1700));
    await p.waitForTimeout(20);
    await p.evaluate(() => allerOnglet('groupes'));
    const r1 = await f1;
    const lignes1 = r1.muts.filter(x => x.mes || x.cible === 'grpPublics');
    dit('1. entrer dans les Groupes : l\'écran n\'est pas refait, ses lignes non plus', r1.ecrans === 1 && !lignes1.length,
      'écrans ×' + r1.ecrans + ' · lignes refaites : ' + JSON.stringify(lignes1.slice(0, 3)));

    /* ===== 2 & 3 ===== */
    const lu = await p.waitForFunction(([a, b]) => !!(grp.fils[a] && grp.fils[a].charge && grp.fils[b] && grp.fils[b].charge && grp.membres[a] && grp.membres[b]), [g1.id, g2.id], { timeout: 9000, polling: 100 }).then(() => true).catch(() => false);
    dit('2. la liste arrivée, les discussions sont lues d\'avance (et leurs membres)', lu,
      JSON.stringify(await p.evaluate(([a, b]) => ({ g1: !!(grp.fils[a] && grp.fils[a].charge), g2: !!(grp.fils[b] && grp.fils[b].charge), m1: !!grp.membres[a], m2: !!grp.membres[b] }), [g1.id, g2.id])));
    await p.waitForTimeout(800);
    const luApres = await m.sql(`select coalesce(lu_jusqu, 0) from public.membres where groupe = '${g2.id}' and membre = '${A}'`);
    const nonLus = await p.evaluate((b) => { const g = (grp.liste || []).find(x => x.id === b); return g ? g.non_lus : null; }, g2.id);
    dit('3. lire d\'avance n\'est pas lire : rien de marqué lu', String(luApres) === String(luAvant) && nonLus === 3, 'lu_jusqu ' + luAvant + ' → ' + luApres + ' · non lus ' + nonLus);

    /* ===== 4 ===== */
    const quoi4 = (e) => {
      const h = [...e.querySelectorAll('#fil .b-moi .b-heure[data-der]')].pop();
      return { bulles: e.querySelectorAll('#fil .b-bulle').length, coche: !!(h && h.querySelector('.b-vu')), x: h ? Math.round(h.getBoundingClientRect().left - e.getBoundingClientRect().left) : null };
    };
    const f4 = p.evaluate((q) => window.__film(1900, eval(q)), '(' + quoi4.toString() + ')');
    await p.waitForTimeout(20);
    await p.evaluate((id) => { ouvrirGroupe(id); }, g1.id);
    const r4 = await f4;
    const fin4 = await p.evaluate(() => { const e = document.querySelector('#app > .groupe-ecran'); const h = [...e.querySelectorAll('#fil .b-moi .b-heure[data-der]')].pop(); return { x: h ? Math.round(h.getBoundingClientRect().left - e.getBoundingClientRect().left) : null, coche: !!(h && h.querySelector('.b-vu')) }; });
    const tete4 = r4.muts.filter(x => x.cible === 'grpTete');
    const fil4 = r4.muts.filter(x => x.cible === 'fil' || /\bb\b|b-heure/.test(String(x.cible)));
    dit('4. un groupe ouvert pour la première fois arrive entier : messages, en-tête, coches, heure immobile',
      r4.premiere && r4.premiere.bulles >= 5 && r4.premiere.coche && !tete4.length && !fil4.length && fin4.coche && r4.premiere.x === fin4.x,
      'première image : ' + JSON.stringify(r4.premiere) + ' · fin : ' + JSON.stringify(fin4) + ' · en-tête refait ×' + tete4.length + ' · fil touché ' + JSON.stringify(fil4.slice(0, 3)));

    /* ===== 5 ===== */
    await p.evaluate(() => allerOnglet('mode'));
    await p.waitForTimeout(900);
    await p.evaluate(() => { localStorage.removeItem('bt_compte_ok'); compte.dispo = null; });
    const f5 = p.evaluate((q) => window.__film(1500, eval(q)), '(' + ((e) => ({ carte: !!e.querySelector('#compteCarte'), y: (() => { const b = e.querySelector('.btn-primary'); return b ? Math.round(b.getBoundingClientRect().top - e.getBoundingClientRect().top) : null; })() })).toString() + ')');
    await p.waitForTimeout(20);
    await p.evaluate(() => openProfile());
    const r5 = await f5;
    const fin5 = await p.evaluate(() => { const e = [...document.querySelectorAll('#app > .screen')].pop(); const b = e.querySelector('.btn-primary'); return { carte: !!e.querySelector('#compteCarte'), y: b ? Math.round(b.getBoundingClientRect().top - e.getBoundingClientRect().top) : null }; });
    dit('5. le Profil arrive avec la carte du compte, et rien ne pousse l\'écran ensuite', r5.premiere && r5.premiere.carte && fin5.carte && r5.premiere.y === fin5.y,
      'première image : ' + JSON.stringify(r5.premiere) + ' · fin : ' + JSON.stringify(fin5));

    /* ===== 6 ===== */
    await p.evaluate(() => allerOnglet('mode'));
    await p.waitForTimeout(900);
    /* Le groupe est renommé ailleurs À L'INSTANT où l'écran part : la relecture
       de la liste (250 ms de réseau) revient pendant qu'il glisse. */
    const f6 = p.evaluate(() => window.__film(1800));
    await p.waitForTimeout(20);
    await p.evaluate(() => allerOnglet('groupes'));
    await m.rpc(A, 'modifier_groupe', { p_groupe: g1.id, p_nom: 'Les amis du jeudi', p_description: 'Le groupe du jeudi', p_ouvert: false, p_teinte: 1 }).catch(() => null);
    const r6 = await f6;
    const renomme = await m.sql(`select nom from public.groupes where id = '${g1.id}'`);
    const l6 = r6.muts.filter(x => x.mes);
    const nom6 = await p.evaluate(() => [...document.querySelectorAll('#grpMes .grp-ligne b')].map(b => b.textContent));
    dit('6. une liste qui change pendant le glissement se pose après lui', renomme === 'Les amis du jeudi' && l6.length > 0 && r6.finPassage !== null && l6.every(x => x.t >= r6.finPassage - 1) && nom6.includes('Les amis du jeudi'),
      'renommé : ' + renomme + ' · fin du glissement ' + Math.round(r6.finPassage) + ' ms · lignes refaites à ' + l6.map(x => Math.round(x.t)).join(', ') + ' ms · ' + nom6.join(' / '));

    dit('7. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
    await ctx.close();
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko ? `\n${ko} défaut(s).` : '\nTout est bon.');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
