/* ====== BANC « SA FLAMME, MÊME ENVOYÉE AVANT LE BON SQL » (v384) ======
   « Sur le profil d'un utilisateur, où il est censé avoir ses flammes, je ne
     vois pas son nombre de flammes. »
   Le décor de groupes.js — un VRAI PostgreSQL avec groupes/table.sql tel
   qu'il partira chez Supabase. Ce qui s'est passé chez Taylor : le jeu de
   chaque joueur envoyait sa flamme, mais le serveur, d'avant le SQL de la
   v379, la jetait (poser_stats ne garde que ce qu'il connaît) ; le jeu, lui,
   retenait « déjà envoyé » et ne renvoyait plus rien tant que ses chiffres
   ne changeaient pas. Le SQL recollé, la flamme restait un tiret.

     1. LE SERVEUR D'AVANT : le jeu de Benoît envoie ses chiffres et sa
        flamme ; le serveur garde les chiffres, pas la flamme ;
     2. TAYLOR RECOLLE LE SQL, BENOÎT ROUVRE SON JEU SANS JOUER : il relit sa
        fiche (une ligne, la sienne), n'y voit pas sa flamme, et ses chiffres
        repartent — le serveur a maintenant sa flamme, la vraie ;
     3. TAYLOR OUVRE LA PAGE DE BENOÎT : en haut, sous son nom, sa flamme en
        chiffres, allumée — plus un tiret ;
     4. Benoît rouvre encore : une relecture, la flamme y est — retenu, rien
        ne repart ;
     5. et à l'ouverture d'après : plus aucune relecture, plus aucun envoi ;
     6. UN SERVEUR TOUJOURS D'AVANT (le SQL pas recollé) : une relecture et un
        envoi par ouverture au plus — jamais une boucle, et une partie dans
        la même ouverture ne relit rien de plus ;
     7. aucune erreur dans les pages.

   Usage : node banc-essai/flamme-reposee.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2', C = 'cccccccc-0000-4000-8000-0000000000c3';

let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

const PROG_B = { books: {}, totalCorrect: 834, bestStreak: 21, flawless: 1, cibles: 1,
  maitrises: { 'Genèse': 1, 'Exode': 1, 'Matthieu': 1 }, ach: { 'pas': 1, 'centurion': 1, 'erudit': 1 } };
const PROG_C = { books: {}, totalCorrect: 120, bestStreak: 8, flawless: 0, cibles: 1, maitrises: { 'Ruth': 1 }, ach: { 'pas': 1 } };

(async () => {
  const m = await monter(8581, 5781);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, nom] of [[A, 'Taylor'], [B, 'Benoît'], [C, 'Chloé']]) {
      await m.compte(id, nom.toLowerCase() + '@essai');
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis du jeudi', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: g.code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: g.code });
    const stats = async (id) => { const t = await m.sql(`select coalesce(stats::text, 'null') from public.profils where id = '${id}'`); return JSON.parse(t); };
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);
    const pause = (ms) => new Promise(r => setTimeout(r, ms));

    /* Un téléphone, gardé d'une ouverture à l'autre (sa mémoire reste) ; ce
       qu'il demande au serveur, compté par ouverture. Le serveur « d'avant
       la v379 » est imité au plus juste : ce que le jeu envoie lui arrive,
       mais il n'en garde que ce qu'il connaissait — sans la flamme. */
    const telephone = async (moi, nom, prog, daily) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const t = { ctx, ancien: false, appels: [], relus: [], lus: [] };
      await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
      await ctx.route('**/faux/rpc', async (route) => {
        const corps = JSON.parse(route.request().postData() || '{}');
        if (corps.nom === 'poser_stats') t.appels.push(corps.args && corps.args.p_stats);
        if (t.ancien && corps.nom === 'poser_stats' && corps.args && corps.args.p_stats) {
          const s = Object.assign({}, corps.args.p_stats); delete s.flamme; delete s.flamme_le; delete s.gel;
          return route.continue({ postData: JSON.stringify(Object.assign({}, corps, { args: Object.assign({}, corps.args, { p_stats: s }) })) });
        }
        return route.continue();
      });
      await ctx.route('**/faux/select', async (route) => {
        try {
          const q = JSON.parse(route.request().postData() || '{}');
          if (q.table === 'profils' && /stats/.test(q.cols || '')) {
            const f = (q.filtres || []).find(x => x[0] === 'id');
            if (f && f[1] === 'eq' && f[2] === moi) t.relus.push(q); else t.lus.push(q);
          }
        } catch (e) {}
        return route.continue();
      });
      await ctx.addInitScript(([moi, nom, prog, daily]) => {
        if (!localStorage.getItem('bt_profile')) localStorage.setItem('bt_profile', JSON.stringify({ name: nom, color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
        if (prog && !localStorage.getItem('bt_progress')) localStorage.setItem('bt_progress', JSON.stringify(prog));
        if (daily && !localStorage.getItem('bt_daily')) {
          const jour = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
          localStorage.setItem('bt_daily', JSON.stringify({ last: jour(-1), streak: daily, score: 9, total: 12, jours: Array.from({ length: daily }, (_, i) => jour(i - daily)), geles: [], gels: 0, palier: daily, parties: 11, palierParties: 10, annonce: jour(-1) }));
        }
        localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [moi, nom, prog, daily]);
      /* Une ouverture du jeu : une page neuve, la même mémoire. */
      t.ouvrir = async () => {
        if (t.p) await t.p.close();
        t.appels.length = 0; t.relus.length = 0; t.lus.length = 0;
        const p = await ctx.newPage(); t.p = p;
        p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
        await p.goto(m.url);
        await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
        await pause(4200);                       // l'arrivée dans les groupes pose ses chiffres 2,5 s après
        return p;
      };
      return t;
    };

    /* ---- 1. le serveur d'avant : les chiffres, pas la flamme ---- */
    const tb = await telephone(B, 'Benoît', PROG_B, 6);
    tb.ancien = true;
    await tb.ouvrir();
    const sB1 = await stats(B), envoi1 = tb.appels[0] || {};
    const sienB = await tb.p.evaluate(() => mesStats());
    const pubB = await tb.p.evaluate(() => localStorage.getItem('bt_stats_pub') || '');
    dit('1. serveur d\'avant la v379 : le jeu de Benoît envoie ses chiffres ET sa flamme (6 jours) ; le serveur garde les chiffres, pas la flamme',
      tb.appels.length === 1 && envoi1.flamme === 6 && sienB.flamme === 6 && !!sB1 && sB1.bonnes === 834 && !('flamme' in sB1) && pubB.startsWith(B + '|'),
      JSON.stringify({ envois: tb.appels.length, flammeEnvoyee: envoi1.flamme, serveur: sB1, retenu: pubB.slice(0, 50) }));

    /* ---- 2. le SQL recollé ; Benoît rouvre son jeu, sans jouer ---- */
    tb.ancien = false;
    await tb.ouvrir();
    let sB2 = null;
    for (let i = 0; i < 30; i++) { sB2 = await stats(B); if (sB2 && 'flamme' in sB2) break; await pause(150); }
    dit('2. le SQL recollé, Benoît rouvre son jeu sans jouer : une relecture de SA fiche, sa flamme n\'y est pas, ses chiffres repartent — le serveur a sa flamme (6, et son jour)',
      tb.relus.length === 1 && tb.appels.length === 1 && !!sB2 && sB2.flamme === 6 && sB2.flamme_le === sienB.flamme_le && sB2.bonnes === 834,
      JSON.stringify({ relectures: tb.relus.length, envois: tb.appels.length, serveur: sB2 }));

    /* ---- 3. Taylor ouvre la page de Benoît ---- */
    const ta = await telephone(A, 'Taylor', null, 0);
    const pa = await ta.ouvrir();
    await pa.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pa, (b) => !!(grp.membres[grp.courant] || []).find(x => x.membre === b) && !!(grp.stats && grp.stats[b]), B, 10000);
    await pa.waitForTimeout(400);
    await pa.evaluate((b) => ouvrirMembre(b), B);
    await attendre(pa, (b) => !!document.querySelector('#grpMembreVeil .mb-hero .mb-feu[data-qui="' + b + '"] .mb-flamme b'), B, 8000);
    await pa.waitForTimeout(900);
    const page = await pa.evaluate((b) => { const e = document.querySelector('#grpMembreVeil .mb-hero .mb-feu[data-qui="' + b + '"] .mb-flamme'); return e ? { n: e.querySelector('b').textContent, eteinte: e.classList.contains('eteinte'), dit: e.getAttribute('aria-label') } : null; }, B);
    dit('3. Taylor ouvre la page de Benoît : en haut, sous son nom, sa flamme en chiffres, allumée (6) — plus un tiret',
      !!page && page.n === '6' && !page.eteinte && /6/.test(page.dit || ''), JSON.stringify({ page }));

    /* ---- 4. Benoît rouvre encore : la flamme vue chez le serveur, retenue ---- */
    await tb.ouvrir();
    const srv4 = await tb.p.evaluate((b) => localStorage.getItem('bt_stats_srv') === b , B);
    dit('4. Benoît rouvre encore : une relecture, sa flamme y est — c\'est retenu, et rien ne repart',
      tb.relus.length === 1 && tb.appels.length === 0 && srv4, JSON.stringify({ relectures: tb.relus.length, envois: tb.appels.length, retenu: srv4 }));

    /* ---- 5. et ensuite, plus rien ---- */
    await tb.ouvrir();
    const o5 = { relus: tb.relus.length, envois: tb.appels.length };
    /* La première partie du jour allume sa flamme (7) : ses chiffres changent,
       ils partent, sans relecture ; la suivante ne change rien : rien ne part. */
    await tb.p.evaluate(() => compterPartie()); await pause(2600);
    const o5b = { relus: tb.relus.length, envois: tb.appels.length, flamme: (await stats(B)).flamme };
    await tb.p.evaluate(() => compterPartie()); await pause(2600);
    const o5c = { relus: tb.relus.length, envois: tb.appels.length };
    dit('5. à l\'ouverture d\'après : plus aucune relecture, plus aucun envoi ; une partie qui allume sa flamme la pose (7) sans rien relire, la suivante n\'envoie rien',
      o5.relus === 0 && o5.envois === 0 && o5b.relus === 0 && o5b.envois === 1 && o5b.flamme === 7 && o5c.relus === 0 && o5c.envois === 1,
      JSON.stringify({ o5, o5b, o5c }));

    /* ---- 6. un serveur toujours d'avant : jamais une boucle ---- */
    const tc = await telephone(C, 'Chloé', PROG_C, 3);
    tc.ancien = true;
    await tc.ouvrir();
    const o1 = { relus: tc.relus.length, envois: tc.appels.length };
    await tc.ouvrir();
    const o2 = { relus: tc.relus.length, envois: tc.appels.length };
    await tc.p.evaluate(() => compterPartie());
    await pause(2600);
    const o2b = { relus: tc.relus.length, envois: tc.appels.length };
    await tc.ouvrir();
    const o3 = { relus: tc.relus.length, envois: tc.appels.length };
    const sC = await stats(C);
    dit('6. un serveur toujours d\'avant : une relecture et un envoi par ouverture au plus — jamais une boucle, et une partie dans la même ouverture ne relit rien de plus',
      o1.relus === 0 && o1.envois === 1 && o2.relus === 1 && o2.envois === 1 && o2b.relus === 1 && o2b.envois <= 2 && o3.relus === 1 && o3.envois === 1
      && !!sC && !('flamme' in sC) && await tc.p.evaluate((c) => localStorage.getItem('bt_stats_srv') !== c , C),
      JSON.stringify({ o1, o2, o2b, o3, serveur: sC }));

    dit('7. aucune erreur dans les pages', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) { erreurs.push('le banc s\'est arrêté : ' + (e.stack || e.message)); dit('le banc va au bout', false, e.stack || e.message); }
  finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n' + ko + ' défaut(s)' : '\nTout est juste.');
  process.exit(ko ? 1 : 0);
})();
