/* ====== BANC « LA MODÉRATION PARLE DANS UN GROUPE » (v334) ======
   « Avoir la possibilité d'écrire dans un groupe lorsqu'on n'est pas dedans,
     mais qu'on est modérateur. » Le décor de groupes.js — un VRAI
   PostgreSQL, le vrai groupes/table.sql. Benoît et Chloé ont un groupe privé ;
   Taylor, modérateur, n'en fait pas partie. Taylor l'ouvre depuis la
   modération (iPhone) ; Benoît a la discussion ouverte (Android) ; Chloé est
   à l'accueil.
     1. de l'extérieur, Taylor a la barre d'écriture : le bouclier à la place
        de la manette, « Au nom de la modération… » ; il n'en devient
        pas membre ;
     2. son message part : le serveur le garde, marqué « moderation », et
        Taylor le voit à droite, comme un message à lui ;
     3. chez Benoît, il arrive en direct, signé « La modération » d'un
        bouclier — le nom de Taylor n'apparaît nulle part ;
     4. son menu, chez Benoît : « La modération » en titre, « Copier », et ni
        « Signaler » ni « Bloquer » ;
     5. la liste de Benoît : « La modération : … » ;
     6. Chloé, à l'accueil : le bandeau dit « La modération : … » ;
     7. Benoît répond en le touchant : la citation dit « La modération » ;
     8. le serveur refuse : un joueur qui n'est ni membre ni modérateur ; une
        partie lancée de l'extérieur par la modération ; et un membre ne
        peut pas se faire passer pour elle (la marque est ignorée) ;
     9. un serveur d'avant (sans « moderation_ecrit ») : « Lecture seule »,
        comme avant ;
    10. aucune erreur.
   Usage : node banc-essai/moderation-ecrit.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a9', B = 'bbbbbbbb-0000-4000-8000-0000000000b9', C = 'cccccccc-0000-4000-8000-0000000000c9', D = 'dddddddd-0000-4000-8000-0000000000d9';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 260) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8498, 5700);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B'], [D, 'dora@essai', 'Dora', '#8E5BD8']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(A); await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const recule = () => m.sql("update public.messages set cree_le = cree_le - interval '3 seconds'");
    await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: 'Bonjour le club', p_genre: 'texte', p_donnees: null });
    await recule();
    await m.rpc(C, 'envoyer_message', { p_groupe: g.id, p_texte: 'Salut Benoît', p_genre: 'texte', p_donnees: null });
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'; update public.membres set rejoint_le = rejoint_le - interval '3 hours'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n, c]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [id, nom, couleur]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      return { ctx, p, cdp: await ctx.newCDPSession(p) };
    };

    /* Benoît, la discussion ouverte ; Chloé, à l'accueil, ses groupes chargés. */
    const ben = await telephone(B, 'Benoît', '#E8734C', AND);
    await ben.p.evaluate((gid) => ouvrirGroupe(gid), g.id);
    await attendre(ben.p, () => state.screen === 'groupe' && document.querySelectorAll('#fil .b-bulle').length >= 2, null, 9000);
    const chl = await telephone(C, 'Chloé', '#7BC86B', IOS);
    await chl.p.evaluate(() => chargerListes());
    await attendre(chl.p, (gid) => (grp.liste || []).some(x => x.id === gid), g.id, 8000);

    /* ---- 1. Taylor, de l'extérieur ---- */
    const tay = await telephone(A, 'Taylor', '#4C86E8', IOS);
    await tay.p.evaluate(() => chargerEtatGroupes());
    await attendre(tay.p, () => !!(grp.etat && grp.etat.moderateur), null, 6000);
    await tay.p.evaluate(() => ouvrirModeration());
    await attendre(tay.p, () => [...document.querySelectorAll('#modGroupes .grp-ligne')].some(l => /club de Benoît/.test(l.textContent)), null, 9000);
    await tay.p.evaluate(() => [...document.querySelectorAll('#modGroupes .grp-ligne')].find(l => /club de Benoît/.test(l.textContent)).click());
    await attendre(tay.p, () => state.screen === 'groupe' && document.querySelectorAll('#fil .b-bulle').length >= 2, null, 9000);
    await tay.p.waitForTimeout(600);
    const barre = await tay.p.evaluate(() => { const t = document.getElementById('compoTexte');
      return { champ: !!t, place: t ? t.placeholder : '', bouclier: !!document.querySelector('#compo .compo-mod svg'), manette: !!document.querySelector('#compo .compo-jeu'), lecture: !!document.querySelector('.compo-lecture') }; });
    dit('1. de l\'extérieur, la barre de la modération : un champ, le bouclier à la place de la manette',
      barre.champ && barre.bouclier && !barre.manette && !barre.lecture && /^Au nom de la modération…$/.test(barre.place), JSON.stringify(barre));
    dit('   … et Taylor n\'en devient pas membre', (await m.sql(`select count(*) from public.membres where groupe = '${g.id}' and membre = '${A}'`)) === '0');

    /* ---- 2. le message part ---- */
    await recule();
    await tay.p.evaluate(() => { const t = document.getElementById('compoTexte'); t.focus(); t.value = 'Merci de rester bienveillants dans ce groupe.'; surSaisie(t); });
    await tay.p.evaluate(() => document.getElementById('compoEnvoi').click());
    const parti = await attendre(tay.p, () => { const f = grp.fils[grp.courant]; return !!f && f.messages.some(x => x.id > 0 && /bienveillants/.test(x.texte || '')); }, null, 8000);
    const ligne = await m.sql(`select auteur || ' / ' || (donnees->>'moderation') from public.messages where texte like 'Merci de rester%'`);
    const cote = await tay.p.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-bulle')].find(x => /bienveillants/.test(x.textContent)); return b ? !!b.closest('.b-moi') : null; });
    dit('2. le message part : gardé par le serveur, marqué « moderation » ; Taylor le voit à droite', parti && ligne === A + ' / true' && cote === true, 'serveur « ' + ligne + ' » · à droite ' + cote);

    /* ---- 3. chez Benoît ---- */
    const arrive = await attendre(ben.p, () => [...document.querySelectorAll('#fil .b-bulle')].some(b => /bienveillants/.test(b.textContent)), null, 9000);
    await ben.p.waitForTimeout(400);
    const vu = await ben.p.evaluate(() => {
      const b = [...document.querySelectorAll('#fil .b-bulle')].find(x => /bienveillants/.test(x.textContent));
      const s = b && b.closest('.b');
      return s ? { eux: s.classList.contains('b-eux'), nom: (s.querySelector('.b-nom') || {}).textContent || '', bouclier: !!s.querySelector('.b-av .avatar.a-mod svg'), texte: s.textContent } : null;
    });
    dit('3. chez Benoît, en direct, signé « La modération » d\'un bouclier, sans le nom de Taylor',
      arrive && vu && vu.eux && vu.nom === 'La modération' && vu.bouclier && !/Taylor/.test(vu.texte), JSON.stringify(vu));

    /* ---- 4. son menu ---- */
    const id = await ben.p.evaluate(() => { const f = grp.fils[grp.courant]; const x = f.messages.find(y => /bienveillants/.test(y.texte || '')); return x ? x.id : null; });
    await ben.p.evaluate((id) => actionsMessage(String(id)), id);
    await attendre(ben.p, () => !!document.querySelector('#grpActionsVeil.posee'), null, 5000);
    const menu = await ben.p.evaluate(() => { const v = document.getElementById('grpActionsVeil');
      return { titre: (v.querySelector('.sheet-title') || {}).textContent || '', lignes: [...v.querySelectorAll('.grp-act-l')].map(x => x.textContent.trim()), bouclier: !!v.querySelector('.avatar.a-mod') }; });
    dit('4. son menu : « La modération », « Copier », ni « Signaler » ni « Bloquer »',
      /La modération/.test(menu.titre) && menu.bouclier && menu.lignes.some(l => /Copier/.test(l)) && !menu.lignes.some(l => /Signaler|Bloquer/.test(l)), JSON.stringify(menu));
    await ben.p.evaluate(() => fermerFeuilleGroupe('grpActionsVeil'));
    await ben.p.waitForTimeout(500);

    /* ---- 5. la liste de Benoît ---- */
    await ben.p.evaluate(() => { retourGroupes(); });
    await attendre(ben.p, () => state.screen === 'groupes', null, 5000);
    await ben.p.evaluate(() => chargerListes());
    const apercu = await attendre(ben.p, () => [...document.querySelectorAll('#grpMes .grp-ligne')].some(l => /La modération\s*:\s*Merci de rester/.test(l.textContent)), null, 8000);
    dit('5. la liste de Benoît : « La modération : … »', apercu, await ben.p.evaluate(() => [...document.querySelectorAll('#grpMes .grp-ligne small')].map(x => x.textContent).join(' | ')));

    /* ---- 6. Chloé, à l'accueil : le bandeau ---- */
    const bandeau = await attendre(chl.p, () => { const b = document.getElementById('bandeauMsg'); return !!b && /La modération\s*:\s*Merci de rester/.test(b.textContent); }, null, 9000);
    dit('6. Chloé, à l\'accueil : le bandeau dit « La modération : … »', bandeau, await chl.p.evaluate(() => (document.getElementById('bandeauMsg') || {}).textContent || 'pas de bandeau'));

    /* ---- 7. Benoît répond en le touchant ---- */
    await ben.p.evaluate((gid) => ouvrirGroupe(gid), g.id);
    await attendre(ben.p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 8000);
    await ben.p.waitForTimeout(500);
    await ben.p.evaluate((id) => toucherMessage(String(id)), id);
    const cite = await attendre(ben.p, () => { const c = document.querySelector('.compo-cite'); return !!c && /La modération/.test(c.textContent); }, null, 4000);
    dit('7. Benoît répond en le touchant : la citation dit « La modération »', cite, await ben.p.evaluate(() => (document.querySelector('.compo-cite') || {}).textContent || 'pas de citation'));

    /* ---- 8. les refus du serveur ---- */
    await recule();
    const rD = (await m.rpc(D, 'envoyer_message', { p_groupe: g.id, p_texte: 'Je passe', p_genre: 'texte', p_donnees: null })).data || {};
    await recule();
    const rP = (await m.rpc(A, 'envoyer_message', { p_groupe: g.id, p_texte: '', p_genre: 'partie', p_donnees: { code: 'ABCD' } })).data || {};
    await recule();
    const rB = (await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: 'Je suis la modération', p_genre: 'texte', p_donnees: { moderation: true } })).data || {};
    const marqueB = await m.sql(`select coalesce(donnees->>'moderation', 'non') from public.messages where texte = 'Je suis la modération'`);
    dit('8. le serveur refuse un non-membre non modérateur, une partie lancée de l\'extérieur ; et un membre ne se fait pas passer pour la modération',
      rD.ok === false && rD.erreur === 'pas_membre' && rP.ok === false && rP.erreur === 'pas_membre' && rB.ok === true && marqueB === 'non',
      'Dora ' + JSON.stringify(rD) + ' · partie ' + JSON.stringify(rP) + ' · Benoît marqué « ' + marqueB + ' »');

    /* ---- 9. un serveur d'avant ---- */
    await tay.p.evaluate(() => { grp.etat.moderation_ecrit = undefined; render(); });
    await tay.p.waitForTimeout(500);
    const avant = await tay.p.evaluate(() => ({ lecture: !!document.querySelector('.compo-lecture'), champ: !!document.getElementById('compoTexte') }));
    dit('9. un serveur d\'avant : « Lecture seule », comme avant', avant.lecture && !avant.champ, JSON.stringify(avant));

    dit('10. aucune erreur dans les pages', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la modération écrit dans un groupe sans y entrer, et c\'est elle que les membres reconnaissent');
  process.exit(ko ? 1 : 0);
})();
