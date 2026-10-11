/* ====== UN GROUPE TOUT JUSTE CRÉÉ SE VOIT À LA MODÉRATION (v314) ======
   « Lorsqu'un nouveau groupe est créé, je ne peux pas le voir dans la
     modération. Si un groupe est créé, je dois pouvoir le voir. »
   Le décor de groupes.js — un VRAI PostgreSQL. Taylor est modérateur ;
   Benoît crée des groupes privés dont Taylor ne fait pas partie :
     1. un groupe créé AVANT d'ouvrir la modération y est listé ;
     2. un groupe créé PENDANT qu'on regarde la modération y apparaît tout
        seul, en quelques secondes ;
     3. un groupe créé pendant qu'on est ailleurs (l'onglet Groupes) y est
        dès qu'on rouvre la modération ;
     4. aucune erreur.
   Usage : node banc-essai/moderation-nouveau.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8332, 5518);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom] of [[A, 'taylor@essai', 'Taylor'], [B, 'benoit@essai', 'Benoît']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(A); await m.ouvrir(true);
    const creer = (nom) => m.rpc(B, 'creer_groupe', { p_nom: nom, p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 3 });
    await creer('Le club de Benoît');
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);
    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript((moi) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, A);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => allerOnglet('groupes'));
    await attendre(p, () => !!document.getElementById('grpMes'), null, 9000);
    await p.evaluate(() => chargerEtatGroupes());
    await p.waitForTimeout(800);
    const liste = (nom) => (n) => [...document.querySelectorAll('#modGroupes .grp-ligne')].some(l => l.textContent.indexOf(n) >= 0);

    /* ---- 1 ---- */
    await p.evaluate(() => ouvrirModeration());
    dit('un groupe créé avant d\'ouvrir la modération y est listé', await attendre(p, liste(), 'Le club de Benoît', 8000));

    /* ---- 2 ---- */
    await p.waitForTimeout(600);
    await creer('Tout neuf');
    const t0 = Date.now();
    const vu = await attendre(p, liste(), 'Tout neuf', 9000);
    dit('un groupe créé pendant qu\'on regarde y apparaît tout seul', vu, vu ? (Date.now() - t0) + ' ms' : 'jamais');

    /* ---- 3 ---- */
    await p.evaluate(() => retourGroupes());
    await attendre(p, () => state.screen === 'groupes', null, 4000);
    await p.waitForTimeout(500);
    await creer('Créé pendant qu\'on était ailleurs');
    await p.waitForTimeout(400);
    await p.evaluate(() => ouvrirModeration());
    dit('un groupe créé ailleurs y est dès qu\'on rouvre la modération', await attendre(p, liste(), 'Créé pendant', 8000));
    dit('aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un groupe tout juste créé se voit à la modération');
  process.exit(ko ? 1 : 0);
})();
