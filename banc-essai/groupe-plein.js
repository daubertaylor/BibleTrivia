/* ====== BANC « UN GROUPE, CENT VINGT AU PLUS — ET ON LE DIT » (v332) ======
   « Vérifie le nombre de personnes maximal par groupe. Je veux quelque chose
     de cohérent et d'intéressant. » C'était 200, et un groupe plein ne
     savait pas le dire (« Pas de réseau » au mieux). Cent vingt — les
   disciples réunis après l'Ascension (Actes 1:15). Le décor de groupes.js —
   un VRAI PostgreSQL, le vrai groupes/table.sql.
     1. le serveur dit la taille (membres_max = 120) ;
     2. à 119, on entre encore avec le code ;
     3. à 120, l'aperçu du code le dit AVANT « Rejoindre » (« Ce groupe est
        complet : 120 membres au plus. »), le bouton reste éteint ;
     4. le serveur refuse quand même un téléphone qui forcerait (groupe_plein,
        max 120) ;
     5. en anglais, les mots de l'anglais ;
     6. aucune erreur.
   Usage : node banc-essai/groupe-plein.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a8', B = 'bbbbbbbb-0000-4000-8000-0000000000b8', C = 'cccccccc-0000-4000-8000-0000000000c8';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8483, 5685);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom] of [[A, 'taylor@essai', 'Taylor'], [B, 'benoit@essai', 'Benoît'], [C, 'chloe@essai', 'Chloé']]) {
      await m.compte(id, mail); await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' }); await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'La chorale', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (id, langue) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(e.message));
      await p.addInitScript(([moi, l]) => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Moi', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1'); if (l) localStorage.setItem('bt_langue', l); }, [id, langue || '']);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => { allerOnglet('groupes'); });
      await p.waitForTimeout(800);
      await p.evaluate(() => ouvrirCode());
      await attendre(p, () => !!document.getElementById('grpCode'), null, 4000);
      await p.waitForTimeout(600);
      return { ctx, p };
    };
    const taper = async (p) => { await p.evaluate((c) => { const i = document.getElementById('grpCode'); i.value = c; i.dispatchEvent(new Event('input', { bubbles: true })); }, code); await p.waitForTimeout(900); };
    const etat = (p) => p.evaluate(() => ({ mot: (document.querySelector('#grpCodeVeil .grp-mot span') || {}).textContent || '', eteint: document.getElementById('grpCodeGo').disabled,
      nom: (document.querySelector('#grpApercu b') || {}).textContent || '' }));

    /* 1 & 2 */
    await m.sql(`update public.groupes set nb_membres = 119 where id = '${g.id}'`);
    const { ctx: cb, p: pb } = await telephone(B);
    const max = await pb.evaluate(() => grp.etat.membres_max);
    dit('1. le serveur dit la taille d\'un groupe : 120', max === 120, String(max));
    await taper(pb);
    await pb.evaluate(() => rejoindreParCode());
    const entre = await attendre(pb, (gid) => state.screen === 'groupe' && grp.courant === gid, g.id, 8000);
    dit('2. à 119, on entre encore avec le code', entre, await m.sql(`select nb_membres from public.groupes where id = '${g.id}'`));
    await cb.close();

    /* 3 */
    const { ctx: cc, p: pc } = await telephone(C);
    await taper(pc);
    const e3 = await etat(pc);
    dit('3. à 120, l\'aperçu le dit AVANT « Rejoindre », le bouton reste éteint', e3.nom === 'La chorale' && e3.eteint && e3.mot.replace(/ /g, ' ') === 'Ce groupe est complet : 120 membres au plus.', JSON.stringify(e3));
    await cc.close();

    /* 4 */
    const r4 = await m.rpc(C, 'rejoindre_groupe', { p_groupe: null, p_code: code });
    dit('4. le serveur refuse quand même un téléphone qui forcerait', r4.data && r4.data.ok === false && r4.data.erreur === 'groupe_plein' && r4.data.max === 120, JSON.stringify(r4.data));

    /* 5 */
    const { ctx: ce, p: pe } = await telephone(C, 'en');
    await taper(pe);
    const e5 = await etat(pe);
    dit('5. en anglais : « ' + e5.mot + ' »', e5.mot === 'This group is full: 120 members at most.');
    await ce.close();

    dit('6. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); await m.arreter(); }
  console.log(ko === 0 ? '\n  OK — un groupe tient cent vingt personnes, et le dit avant qu\'on essaie' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
