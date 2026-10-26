/* ====== BANC « LA MODÉRATION PARLE AUSSI DANS SES GROUPES » (v336) ======
   « Je veux pouvoir écrire dans les groupes avec le truc de modération, et
     cela même si je suis déjà présent dans le groupe en question. » Un VRAI
   PostgreSQL, le vrai groupes/table.sql. Benoît a un groupe privé ; Taylor,
   modératrice, et Chloé en sont membres.
   LE SERVEUR
     1. Taylor, membre, écrit au nom de la modération : le message est marqué ;
     2. Chloé, qui n'est pas modératrice, ne le peut pas : sa marque est
        ignorée, son message part à son nom ;
     3. Taylor en sourdine (Benoît la lui a mise) : à son nom, refusé ; au nom
        de la modération, accepté ;
     4. une partie ne se lance pas au nom de la modération (la marque est
        ignorée) ;
   LE JEU (iPhone de Taylor ; Android de Chloé, la discussion ouverte)
     5. Taylor ouvre le groupe : son visage en tête de barre, puis la
        manette — elle écrit en son nom (« Écris un message… ») ;
     6. un toucher sur son visage : le bouclier, à la même place ; la
        manette s'efface (on ne lance pas une partie au nom de la
        modération), « Au nom de la modération… » a sa place, le bouton
        d'envoi à l'ardoise — et le clavier reste ouvert (le champ garde le
        foyer) ;
     7. le message part marqué ; chez elle, sa bulle porte « La modération »
        et l'ardoise ;
     8. chez Chloé, il arrive signé « La modération », d'un bouclier, sans
        le nom de Taylor ;
     9. un second toucher, au même endroit : de nouveau en son nom, la
        manette revient ; le message part à son nom, sa bulle est corail ;
    10. rouvrir le groupe remet la voix « en son nom » ;
    11. en sourdine, la barre de la modération seule (le bouclier à la place
        de la manette, pas de visage) ; le message part au nom de la
        modération ; la parole rendue, la barre de tous les jours revient ;
    12. Chloé n'a pas de visage à côté du champ ;
    13. un serveur d'avant (sans « moderation_pleine ») : pas de visage non
        plus ;
    14. aucune erreur.
   Avant la v336 : 1, 3 et 5 à 11 rouges — un modérateur membre écrivait
   toujours à son nom.
   Usage : node banc-essai/moderation-voix.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const T_ = 'aaaaaaaa-0000-4000-8000-0000000000f1', B = 'bbbbbbbb-0000-4000-8000-0000000000f2', C = 'cccccccc-0000-4000-8000-0000000000f3';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 300) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8514, 5718);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[T_, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(T_); await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(T_, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const pause = () => m.sql("select pg_sleep(1.05)");
    const envoyer = async (moi, texte, donnees, genre) => ((await m.rpc(moi, 'envoyer_message', { p_groupe: g.id, p_texte: texte, p_genre: genre || 'texte', p_donnees: donnees || null })).data || {});
    const marque = (like) => m.sql(`select coalesce(donnees->>'moderation', 'non') from public.messages where groupe = '${g.id}' and texte like '${like}' order by id desc limit 1`);

    /* 1 à 4 : le serveur */
    const r1 = await envoyer(T_, 'Rappel : restons bienveillants.', { moderation: true }); await pause();
    dit('1. Taylor, membre, écrit au nom de la modération : le message est marqué', r1.ok && (await marque('Rappel : restons%')) === 'true', JSON.stringify(r1));
    const r2 = await envoyer(C, 'Je suis la modération', { moderation: true }); await pause();
    dit('2. Chloé, qui n\'est pas modératrice : sa marque est ignorée', r2.ok && (await marque('Je suis la modération')) === 'non', JSON.stringify(r2));
    await m.rpc(B, 'moderer_membre', { p_groupe: g.id, p_membre: T_, p_action: 'muet', p_minutes: 60 });
    const r3a = await envoyer(T_, 'À mon nom'); await pause();
    const r3b = await envoyer(T_, 'Au nom de la modération, malgré la sourdine', { moderation: true }); await pause();
    dit('3. Taylor en sourdine : à son nom, refusé ; au nom de la modération, accepté',
      r3a.ok === false && r3a.erreur === 'muet' && r3b.ok && (await marque('Au nom de la modération, malgré%')) === 'true', JSON.stringify({ r3a, r3b }));
    await m.rpc(B, 'moderer_membre', { p_groupe: g.id, p_membre: T_, p_action: 'parler', p_minutes: null });
    const r4 = await envoyer(T_, '', { code: 'ABCD', moderation: true }, 'partie');
    const m4 = await m.sql(`select coalesce(donnees->>'moderation', 'non') from public.messages where groupe = '${g.id}' and genre = 'partie' order by id desc limit 1`);
    await m.rpc(T_, 'fermer_partie', { p_message: r4.id });
    dit('4. une partie ne se lance pas au nom de la modération (la marque est ignorée)', r4.ok && m4 === 'non', JSON.stringify({ r4, m4 }));
    await m.sql("update public.messages set cree_le = cree_le - interval '2 minutes'");

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
      return { ctx, p };
    };
    const BARRE = () => {
      const v = document.getElementById('compoVoix'), t = document.getElementById('compoTexte'), e = document.getElementById('compoEnvoi');
      return { visage: !!v, bouclier: !!(v && v.querySelector('.avatar.a-mod')), presse: v ? v.getAttribute('aria-pressed') : null,
        manette: !!document.querySelector('#compo .compo-jeu'), mod: !!document.querySelector('#compo .compo-mod'),
        manetteVue: !!(document.querySelector('#compo .compo-jeu') && document.querySelector('#compo .compo-jeu').offsetParent),
        voixEnTete: !!(v && v.parentElement && v.parentElement.firstElementChild === v),
        place: t ? t.placeholder : null, envoiMod: !!(e && e.classList.contains('mod')), foyer: document.activeElement === t };
    };
    const ouvrir = async (p) => { await p.evaluate((gid) => ouvrirGroupe(gid), g.id); await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000); await p.waitForTimeout(700); };

    const chl = await telephone(C, 'Chloé', '#7BC86B', AND);
    await chl.p.evaluate(() => chargerListes());
    await attendre(chl.p, (gid) => (grp.liste || []).some(x => x.id === gid), g.id, 8000);
    await ouvrir(chl.p);
    const tay = await telephone(T_, 'Taylor', '#4C86E8', IOS);
    await tay.p.evaluate(() => chargerListes());
    await attendre(tay.p, (gid) => (grp.liste || []).some(x => x.id === gid), g.id, 8000);
    await ouvrir(tay.p);

    /* 5 */
    const b5 = await tay.p.evaluate(BARRE);
    dit('5. Taylor ouvre le groupe : son visage en tête de barre, puis la manette, « Écris un message… »',
      b5.manetteVue && b5.visage && b5.voixEnTete && !b5.bouclier && b5.presse === 'false' && b5.place === 'Écris un message…' && !b5.envoiMod, JSON.stringify(b5));

    /* 6 : un vrai toucher, le champ ayant le foyer */
    await tay.p.evaluate(() => { const t = document.getElementById('compoTexte'); t.focus(); });
    const c6 = await tay.p.evaluate(() => { const r = document.getElementById('compoVoix').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await tay.p.touchscreen.tap(c6.x, c6.y);
    await tay.p.waitForTimeout(350);
    const b6 = await tay.p.evaluate(BARRE);
    dit('6. un toucher sur son visage : le bouclier, à la même place ; la manette s\'efface ; « Au nom de la modération… », l\'envoi à l\'ardoise — le clavier reste ouvert',
      b6.bouclier && b6.voixEnTete && !b6.manetteVue && b6.presse === 'true' && b6.place === 'Au nom de la modération…' && b6.envoiMod && b6.foyer, JSON.stringify(b6));

    /* 7 */
    await tay.p.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = 'Merci de garder un ton fraternel.'; surSaisie(t); });
    await tay.p.evaluate(() => document.getElementById('compoEnvoi').click());
    const parti7 = await attendre(tay.p, () => { const f = grp.fils[grp.courant]; return !!f && f.messages.some(x => x.id > 0 && /ton fraternel/.test(x.texte || '')); }, null, 8000);
    const s7 = await m.sql(`select auteur || ' / ' || coalesce(donnees->>'moderation', 'non') from public.messages where texte like 'Merci de garder%'`);
    const v7 = await tay.p.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-bulle')].find(x => /ton fraternel/.test(x.textContent)); const s = b && b.closest('.b');
      return s ? { moi: s.classList.contains('b-moi'), mod: s.classList.contains('b-mod'), nom: (s.querySelector('.b-nom-mod') || {}).textContent || '', fond: getComputedStyle(b).backgroundImage.slice(0, 60) } : null; });
    dit('7. le message part marqué ; chez Taylor, sa bulle porte « La modération » et l\'ardoise',
      parti7 && s7 === T_ + ' / true' && v7 && v7.moi && v7.mod && v7.nom === 'La modération' && /108, 122, 141|86, 100, 122/.test(v7.fond), JSON.stringify({ s7, v7 }));

    /* 8 */
    const arrive8 = await attendre(chl.p, () => [...document.querySelectorAll('#fil .b-bulle')].some(b => /ton fraternel/.test(b.textContent)), null, 9000);
    await chl.p.waitForTimeout(300);
    const v8 = await chl.p.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-bulle')].find(x => /ton fraternel/.test(x.textContent)); const s = b && b.closest('.b');
      return s ? { eux: s.classList.contains('b-eux'), nom: (s.querySelector('.b-nom') || {}).textContent || '', bouclier: !!s.querySelector('.b-av .avatar.a-mod'), texte: s.textContent } : null; });
    dit('8. chez Chloé : signé « La modération », d\'un bouclier, sans le nom de Taylor',
      arrive8 && v8 && v8.eux && v8.nom === 'La modération' && v8.bouclier && !/Taylor/.test(v8.texte), JSON.stringify(v8));

    /* 9 */
    await tay.p.touchscreen.tap(c6.x, c6.y);
    await tay.p.waitForTimeout(350);
    const b9 = await tay.p.evaluate(BARRE);
    await tay.p.waitForTimeout(800);
    await tay.p.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = 'Et moi, je viens jeudi.'; surSaisie(t); document.getElementById('compoEnvoi').click(); });
    const parti9 = await attendre(tay.p, () => { const f = grp.fils[grp.courant]; return !!f && f.messages.some(x => x.id > 0 && /viens jeudi/.test(x.texte || '')); }, null, 8000);
    const s9 = await m.sql(`select coalesce(donnees->>'moderation', 'non') from public.messages where texte like 'Et moi, je viens%'`);
    const v9 = await tay.p.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-bulle')].find(x => /viens jeudi/.test(x.textContent)); const s = b && b.closest('.b'); return s ? { mod: s.classList.contains('b-mod') } : null; });
    dit('9. un second toucher, au même endroit : de nouveau à son nom, la manette revient ; le message part à son nom, bulle corail',
      !b9.bouclier && b9.manetteVue && b9.presse === 'false' && b9.place === 'Écris un message…' && !b9.envoiMod && parti9 && s9 === 'non' && v9 && !v9.mod, JSON.stringify({ b9, s9, v9 }));

    /* 10 */
    await tay.p.touchscreen.tap(c6.x, c6.y);
    await tay.p.waitForTimeout(300);
    const avant10 = (await tay.p.evaluate(BARRE)).bouclier;
    await tay.p.evaluate(() => retourGroupes());
    await attendre(tay.p, () => state.screen === 'groupes', null, 5000);
    await ouvrir(tay.p);
    const b10 = await tay.p.evaluate(BARRE);
    dit('10. rouvrir le groupe remet la voix « en son nom »', avant10 && !b10.bouclier && b10.place === 'Écris un message…', JSON.stringify({ avant10, b10 }));

    /* 11 : en sourdine */
    await m.rpc(B, 'moderer_membre', { p_groupe: g.id, p_membre: T_, p_action: 'muet', p_minutes: 60 });
    await tay.p.evaluate((gid) => chargerMembres(gid), g.id);
    await attendre(tay.p, () => !!document.querySelector('#compo .compo-mod'), null, 6000);
    const b11 = await tay.p.evaluate(BARRE);
    await tay.p.waitForTimeout(600);
    await tay.p.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = 'Je reste là pour veiller.'; surSaisie(t); document.getElementById('compoEnvoi').click(); });
    await attendre(tay.p, () => { const f = grp.fils[grp.courant]; return !!f && f.messages.some(x => x.id > 0 && /pour veiller/.test(x.texte || '')); }, null, 8000);
    const s11 = await m.sql(`select coalesce(donnees->>'moderation', 'non') from public.messages where texte like 'Je reste là%'`);
    await m.rpc(B, 'moderer_membre', { p_groupe: g.id, p_membre: T_, p_action: 'parler', p_minutes: null });
    await tay.p.evaluate((gid) => chargerMembres(gid), g.id);
    await attendre(tay.p, () => !!document.querySelector('#compo .compo-jeu'), null, 6000);
    const b11b = await tay.p.evaluate(BARRE);
    dit('11. en sourdine, la barre de la modération seule, le message part en son nom ; la parole rendue, la barre revient',
      b11.mod && !b11.manette && !b11.visage && b11.place === 'Au nom de la modération…' && s11 === 'true' && b11b.manette && b11b.visage && !b11b.mod,
      JSON.stringify({ b11, s11, b11b }));

    /* 12 */
    const b12 = await chl.p.evaluate(BARRE);
    dit('12. Chloé n\'a pas de visage à côté du champ', !b12.visage && b12.manette, JSON.stringify(b12));

    /* 13 */
    const b13 = await tay.p.evaluate(() => { grp.etat.moderation_pleine = false; render(); return null; });
    await tay.p.waitForTimeout(500);
    const b13b = await tay.p.evaluate(BARRE);
    dit('13. un serveur d\'avant : pas de visage', !b13b.visage && b13b.manette && b13b.place === 'Écris un message…', JSON.stringify(b13b));

    await tay.ctx.close(); await chl.ctx.close();
    dit('14. aucune erreur dans les pages', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — dans ses propres groupes, la modération parle en son nom, d\'un toucher');
  process.exit(ko ? 1 : 0);
})();
