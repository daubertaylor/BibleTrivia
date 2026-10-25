/* ====== BANC « RETIRER UN ADMIN SE DIT DANS LA DISCUSSION » (v335) ======
   « Lorsque je retire quelqu'un admin, il n'est pas mentionné dans le
     chat. » Nommer un admin s'annonçait (« Chloé devient admin du
   groupe »), le retirer se faisait en silence : le groupe ne savait plus qui
   le gardait. Sur un VRAI PostgreSQL (groupes/table.sql tel qu'il part chez
   Supabase), puis dans le jeu :
     1. le propriétaire nomme Chloé : « admin » est annoncé, une fois ;
     2. il le lui retire : « plus_admin » est annoncé, une fois, à son nom ;
     3. le retirer à quelqu'un qui ne l'est plus : rien de plus ;
     4. un simple membre, ou un autre admin, qui tente de le retirer : refusé,
        et rien n'est annoncé ;
     5. dans la discussion, chez un membre : « Chloé devient admin du
        groupe » puis « Chloé n'est plus admin du groupe », à leur place ;
     6. en anglais et en espagnol aussi (« is no longer a group admin »,
        « ya no es admin del grupo ») ;
     7. aucune erreur.
   Avant la v335 : le 2 échoue, aucune ligne dans la discussion.
   Usage : node banc-essai/admin-annonce.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const B = 'bbbbbbbb-0000-4000-8000-0000000000ba', C = 'cccccccc-0000-4000-8000-0000000000ca', D = 'dddddddd-0000-4000-8000-0000000000da';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 300) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8499, 5701);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B'], [D, 'dora@essai', 'Dora', '#8E5BD8']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(D, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const annonces = async (quoi) => +(await m.sql(`select count(*) from public.messages where groupe = '${g.id}' and genre = 'systeme' and texte = '${quoi}'`));
    const role = (qui) => m.sql(`select role from public.membres where groupe = '${g.id}' and membre = '${qui}'`);
    const moderer = async (moi, qui, action) => ((await m.rpc(moi, 'moderer_membre', { p_groupe: g.id, p_membre: qui, p_action: action, p_minutes: null })).data || {});

    /* 1 et 2 */
    const r1 = await moderer(B, C, 'promouvoir');
    dit('1. le propriétaire nomme Chloé : « admin » annoncé, une fois', r1.ok === true && (await role(C)) === 'admin' && (await annonces('admin')) === 1, JSON.stringify(r1));
    const r2 = await moderer(B, C, 'retrograder');
    const ligne = await m.sql(`select coalesce(auteur::text, 'jeu') || ' / ' || (donnees->>'qui') || ' / ' || (donnees->>'nom') from public.messages where groupe = '${g.id}' and texte = 'plus_admin'`);
    dit('2. il le lui retire : « plus_admin » annoncé, une fois, à son nom (un mot du jeu)', r2.ok === true && (await role(C)) === 'membre' && (await annonces('plus_admin')) === 1 && ligne === 'jeu / ' + C + ' / Chloé',
      JSON.stringify(r2) + ' · ' + ligne);
    /* 3 */
    const r3 = await moderer(B, C, 'retrograder');
    dit('3. le retirer à qui ne l\'est plus : rien de plus', r3.ok === true && (await annonces('plus_admin')) === 1, JSON.stringify(r3));
    /* 4 */
    await moderer(B, D, 'promouvoir');
    const r4a = await moderer(C, D, 'retrograder');
    await moderer(B, C, 'promouvoir');
    const r4b = await moderer(C, D, 'retrograder');
    dit('4. un membre, puis un autre admin, qui tentent de le retirer : refusé, rien d\'annoncé',
      r4a.ok === false && r4b.ok === false && (await role(D)) === 'admin' && (await annonces('plus_admin')) === 1, JSON.stringify([r4a, r4b]));
    /* Pour la discussion : Chloé redevient simple membre (deuxième retrait). */
    await moderer(B, C, 'retrograder');
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'");

    /* 5 et 6. Dans le jeu, chez Dora. */
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript(([moi]) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Dora', color: '#8E5BD8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, [D]);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate((gid) => ouvrirGroupe(gid), g.id);
    await p.waitForFunction(() => state.screen === 'groupe' && document.querySelectorAll('#fil .b-sys').length >= 6, null, { timeout: 9000, polling: 50 }).catch(() => {});
    const fil = await p.evaluate(() => [...document.querySelectorAll('#fil .b-sys')].map(e => e.textContent.trim()));
    const iA = fil.indexOf('Chloé devient admin du groupe'), iP = fil.indexOf('Chloé n\'est plus admin du groupe');
    dit('5. dans la discussion : « Chloé devient admin du groupe », puis « Chloé n\'est plus admin du groupe »',
      iA >= 0 && iP > iA && fil.filter(t => t === 'Chloé n\'est plus admin du groupe').length === 2, fil.join(' | '));
    const langues = await p.evaluate(() => {
      const m = { texte: 'plus_admin', donnees: { nom: 'Chloé' } }, avant = LANGUE, r = {};
      for (const l of ['en', 'es']) { LANGUE = l; r[l] = texteSysteme(m); }
      LANGUE = avant; return r;
    });
    dit('6. en anglais et en espagnol aussi', langues.en === 'Chloé is no longer a group admin' && langues.es === 'Chloé ya no es admin del grupo', JSON.stringify(langues));
    await ctx.close();
    dit('7. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — nommer un admin et le lui retirer se disent tous deux dans la discussion');
  process.exit(ko ? 1 : 0);
})();
