/* ====== BANC « UN GROUPE PUBLIC LE RESTE, MÊME REJOINT » (v337) ======
   « Maintenant que j'ai rejoint un groupe public, je ne le trouve plus dans
     les groupes publics. Je le trouve dans mes groupes, mais plus dans les
     groupes publics — un peu comme si c'était un groupe privé. Corrige. »
   Un VRAI PostgreSQL, le vrai groupes/table.sql. Benoît a deux groupes
   publics ; Taylor (iPhone) arrive dans les groupes.
     1. Découvrir montre les deux, avec « Rejoindre » ;
     2. Taylor rejoint « Les amis de Jean » depuis Découvrir : la discussion
        s'ouvre ;
     3. de retour : le groupe est dans Mes groupes, ET toujours dans
        Découvrir, à sa place, avec « Ouvrir » ; l'autre garde « Rejoindre » ;
     4. « Ouvrir » ouvre la discussion ;
     5. une recherche le trouve aussi, avec « Ouvrir » ;
     6. aucune erreur.
   Sur la v336 : 3 et 4 rouges — Découvrir n'en montrait plus que l'autre.
   Usage : node banc-essai/decouvrir-rejoint.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const T_ = 'aaaaaaaa-0000-4000-8000-0000000000e1', B = 'bbbbbbbb-0000-4000-8000-0000000000e2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 300) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8518, 5722);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[T_, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g1 = (await m.rpc(B, 'creer_groupe', { p_nom: 'Les amis de Jean', p_description: 'On lit Jean ensemble', p_ouvert: true, p_langue: 'fr', p_teinte: 2 })).data;
    const g2 = (await m.rpc(B, 'creer_groupe', { p_nom: 'Psaumes du soir', p_description: '', p_ouvert: true, p_langue: 'fr', p_teinte: 4 })).data;

    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript((moi) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, T_);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    const ecranGroupes = async () => { await p.evaluate(() => { state.screen = 'groupes'; render(); ouvrirGroupes(); }); await attendre(p, () => !!grp.publics && !!grp.liste, null, 9000); await p.waitForTimeout(600); };
    const decouvrir = () => p.evaluate(() => [...document.querySelectorAll('#grpPublics .grp-ligne')].map(l => ({ nom: l.querySelector('.grp-txt b').textContent, bouton: (l.querySelector('.grp-pill') || {}).textContent || '' })));
    const mes = () => p.evaluate(() => [...document.querySelectorAll('#grpMes .grp-ligne, #grpMes [data-g]')].map(l => (l.querySelector('b') || l).textContent.trim()));

    /* 1 */
    await ecranGroupes();
    const d1 = await decouvrir();
    dit('1. Découvrir montre les deux groupes publics, avec « Rejoindre »', d1.length === 2 && d1.every(x => x.bouton === 'Rejoindre'), JSON.stringify(d1));

    /* 2 */
    await p.evaluate(() => { const l = [...document.querySelectorAll('#grpPublics .grp-ligne')].find(x => /amis de Jean/.test(x.textContent)); l.querySelector('.grp-pill').click(); });
    const ouvert2 = await attendre(p, (gid) => state.screen === 'groupe' && grp.courant === gid, g1.id, 9000);
    dit('2. Taylor rejoint « Les amis de Jean » depuis Découvrir : la discussion s\'ouvre', ouvert2);

    /* 3 */
    await p.evaluate(() => retourGroupes()); await p.waitForTimeout(500);
    await ecranGroupes();
    const d3 = await decouvrir(), m3 = await mes();
    const jean = d3.find(x => x.nom === 'Les amis de Jean'), psaumes = d3.find(x => x.nom === 'Psaumes du soir');
    dit('3. le groupe est dans Mes groupes ET toujours dans Découvrir, avec « Ouvrir » ; l\'autre garde « Rejoindre »',
      m3.some(n => /Les amis de Jean/.test(n)) && !!jean && jean.bouton === 'Ouvrir' && !!psaumes && psaumes.bouton === 'Rejoindre', JSON.stringify({ d3, m3 }));

    /* 4 */
    const a4 = await p.evaluate(() => { const l = [...document.querySelectorAll('#grpPublics .grp-ligne')].find(x => /amis de Jean/.test(x.textContent)); if (!l) return false; l.querySelector('.grp-pill').click(); return true; });
    const ouvert4 = a4 && await attendre(p, (gid) => state.screen === 'groupe' && grp.courant === gid, g1.id, 9000);
    dit('4. « Ouvrir » ouvre la discussion', ouvert4);

    /* 5 */
    await p.evaluate(() => retourGroupes()); await p.waitForTimeout(500);
    await ecranGroupes();
    await p.evaluate(() => { const c = document.querySelector('.grp-cherche'); c.value = 'jean'; chercherGroupes(c.value); });
    /* La réponse de la recherche, pas la liste d'avant (qui peut déjà
       n'avoir qu'une ligne) : on attend qu'elle nomme le groupe cherché. */
    await attendre(p, () => { const l = [...document.querySelectorAll('#grpPublics .grp-ligne')]; return grp.recherche === 'jean' && l.length === 1 && /amis de Jean/.test(l[0].textContent); }, null, 6000);
    const d5 = await decouvrir();
    dit('5. une recherche le trouve aussi, avec « Ouvrir »', d5.length === 1 && d5[0].nom === 'Les amis de Jean' && d5[0].bouton === 'Ouvrir', JSON.stringify(d5));

    await ctx.close();
    dit('6. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un groupe public rejoint reste dans Découvrir, avec « Ouvrir »');
  process.exit(ko ? 1 : 0);
})();
