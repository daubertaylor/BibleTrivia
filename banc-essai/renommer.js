/* ====== BANC « LE NOUVEAU NOM SE VOIT PARTOUT, MÊME DEDANS » (v328) ======
   « Quand je change le nom du groupe, à l'intérieur du groupe c'est toujours
     l'ancien nom. » Le décor de groupes.js — un VRAI PostgreSQL, les vraies
   règles. Taylor (propriétaire, iPhone) et Benoît (membre, Android), tous
   deux DANS la discussion. Taylor renomme le groupe et change sa couleur.
   CE QU'IL EXIGE :
     1. chez Taylor, tout de suite : l'en-tête de la discussion (le nom, et
        l'icône à sa nouvelle couleur), la page des infos — et la discussion
        elle-même ne change pas de couleur (v333 : elle garde celle du jeu) ;
     2. chez Benoît, sans rien toucher, la discussion restée ouverte : le
        nouveau nom dans l'en-tête et l'icône à la nouvelle couleur, en 12 s
        au plus ;
     3. Benoît revient à la liste : le nouveau nom ;
     4. Taylor relance l'app : le nouveau nom, dès la liste (la mémoire du
        téléphone le garde) ;
     5. aucune erreur.
   Usage : node banc-essai/renommer.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000e8', B = 'bbbbbbbb-0000-4000-8000-0000000000e8';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8482, 5682);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Ancien nom', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 100 }).then(() => true).catch(() => false);
    const telephone = async (ctx, id, nom, couleur) => {
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n, c]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [id, nom, couleur]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      return p;
    };
    const ctxA = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const ctxB = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: AND, serviceWorkers: 'block' });
    let pa = await telephone(ctxA, A, 'Taylor', '#4C86E8');
    const pb = await telephone(ctxB, B, 'Benoît', '#E8734C');
    for (const p of [pa, pb]) {
      await p.evaluate(() => allerOnglet('groupes'));
      await attendre(p, () => !!document.querySelector('#grpMes .grp-ligne'), null, 9000);
      await p.evaluate((id) => ouvrirGroupe(id), g.id);
      await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('grpTete'), null, 9000);
    }
    await pa.waitForTimeout(800);
    /* L'icône de l'en-tête porte la couleur du groupe (TEINTES[5] : #2FC1C6,
       #14989E) ; l'écran, lui, n'en porte aucune. */
    const tete = (p) => p.evaluate(() => { const t = document.querySelector('#grpTete .grp-txt b'); const e = document.querySelector('#app > .screen.groupe-ecran:not(.screen-exit)');
      const av = document.querySelector('#grpTete .grp-av');
      return { nom: t ? t.textContent : '', icone: av ? av.getAttribute('style') || '' : '', ecran: e ? e.getAttribute('style') || '' : '' }; });
    const avantB = await tete(pb);
    dit('au départ, les deux voient « Ancien nom »', avantB.nom === 'Ancien nom' && (await tete(pa)).nom === 'Ancien nom', avantB.nom);

    /* ---- Taylor renomme, depuis la page des infos ---- */
    await pa.evaluate(() => ouvrirInfosGroupe());
    await attendre(pa, () => !!document.querySelector('#grpInfosVeil.posee'), null, 6000);
    await pa.waitForTimeout(400);
    await pa.evaluate(() => ouvrirModifGroupe());
    await attendre(pa, () => !!document.querySelector('#grpModifVeil.posee #grpNom'), null, 6000);
    await pa.waitForTimeout(300);
    await pa.evaluate(() => { const i = document.getElementById('grpNom'); i.value = 'Les veilleurs'; i.dispatchEvent(new Event('input', { bubbles: true })); choisirTeinte(5); });
    await pa.evaluate(() => enregistrerGroupe(document.querySelector('#grpModifVeil .btn-primary')));
    await attendre(pa, () => !document.getElementById('grpModifVeil') || document.getElementById('grpModifVeil').classList.contains('closing'), null, 6000);
    await pa.waitForTimeout(500);
    const serveur = await m.sql(`select nom || ' / ' || teinte from public.groupes where id = '${g.id}'`);
    const ta = await tete(pa);
    const infos = await pa.evaluate(() => { const v = document.getElementById('grpInfosVeil'); const t = v && v.querySelector('.sheet-title .st-mot'); return t ? t.textContent : ''; });
    dit('1. chez Taylor, tout de suite : l\'en-tête, l\'icône à sa couleur, la page des infos ; la discussion garde la couleur du jeu',
      ta.nom === 'Les veilleurs' && /2FC1C6|14989E/i.test(ta.icone) && !ta.ecran && infos === 'Les veilleurs',
      'serveur « ' + serveur + ' », en-tête « ' + ta.nom + ' », icône « ' + ta.icone.slice(0, 60) + ' », écran « ' + ta.ecran.slice(0, 40) + ' », infos « ' + infos + ' »');

    /* ---- Benoît, sans rien toucher ---- */
    const t0 = Date.now();
    const vu = await attendre(pb, () => { const t = document.querySelector('#grpTete .grp-txt b'); return !!t && t.textContent === 'Les veilleurs'; }, null, 12500);
    const tb = await tete(pb);
    dit('2. chez Benoît, la discussion restée ouverte : le nouveau nom et l\'icône à la nouvelle couleur', vu && /2FC1C6|14989E/i.test(tb.icone) && !tb.ecran,
      (vu ? (Date.now() - t0) + ' ms' : 'jamais') + ' · « ' + tb.nom + ' »');

    /* ---- Benoît revient à la liste ---- */
    await pb.evaluate(() => retourGroupes());
    const liste = await attendre(pb, (n) => [...document.querySelectorAll('#grpMes .grp-ligne b')].some(b => b.textContent === n), 'Les veilleurs', 8000);
    dit('3. Benoît revient à la liste : le nouveau nom', liste);

    /* ---- Taylor relance l'app : la liste vient de la mémoire ---- */
    await pa.close();
    pa = await ctxA.newPage();
    pa.on('pageerror', e => erreurs.push('Taylor : ' + e.message));
    /* Le serveur ne répond plus aux listes : seule la mémoire peut parler. */
    await pa.route('**/faux/rpc', async (route) => {
      const b = JSON.parse(route.request().postData() || '{}');
      if (b.nom === 'mes_groupes') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, error: { message: 'hors ligne' } }) });
      return route.continue();
    });
    await pa.goto(m.url);
    await pa.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await pa.evaluate(() => allerOnglet('groupes'));
    const memoire = await attendre(pa, (n) => [...document.querySelectorAll('#grpMes .grp-ligne b')].some(b => b.textContent === n), 'Les veilleurs', 9000);
    dit('4. Taylor relance l\'app, serveur muet : la mémoire du téléphone dit le nouveau nom', memoire,
      await pa.evaluate(() => [...document.querySelectorAll('#grpMes .grp-ligne b')].map(b => b.textContent).join(', ')));

    dit('5. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — le nouveau nom se voit partout, sur tous les téléphones, et reste' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
