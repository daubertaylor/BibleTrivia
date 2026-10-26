/* ====== BANC « LES COCHES, EXACTEMENT COMME WHATSAPP » (v338) ======
   « Je veux que la petite encoche devienne bleue une fois que les gens l'ont
     vu. En fait, je veux que ça fonctionne comme WhatsApp. Là, j'ai deux
     encoches, et du coup tout le monde a vu le message — mais je veux que ça
     fonctionne exactement comme WhatsApp. »
   Un VRAI PostgreSQL, le vrai groupes/table.sql, notifications/installer.sql
   et la VRAIE fonction des rappels (fonction-rappels.js). Taylor (iPhone)
   écrit ; Benoît (Android) a le jeu ouvert sur la liste des groupes ; Chloé a
   le jeu fermé — son téléphone ne reçoit que la notification.
   LE SERVEUR
     1. marquer_recu ne dépasse jamais le dernier message du groupe, ne
        recule jamais, et dit si quelque chose a avancé ; écrire et lire font
        aussi avancer l'arrivée ;
   LE JEU ET LA NOTIFICATION
     2. un message en route : une horloge à côté de l'heure ;
     3. parti, arrivé chez personne : UNE coche grise ;
     4. arrivé sur le téléphone de Benoît (le direct, jeu ouvert) : le serveur
        le sait — et c'est toujours une coche grise, Chloé ne l'a pas ;
     5. la notification de Chloé porte un jeton, adressé à la fonction ;
     6. son téléphone le renvoie : arrivé chez Chloé, le jeton est consommé,
        le signal « lu » part sur le canal du groupe ;
     7. chez Taylor : DEUX coches grises ;
     8. toucher son message : « Lu par » personne, « Distribué à » Benoît et
        Chloé ;
     9. Benoît le lit : toujours deux coches grises (Chloé ne l'a pas lu) ;
    10. Chloé le lit : deux coches BLEUES, du ciel de la palette ;
    11. un jeton rejoué, inconnu ou mal formé n'apprend rien et ne change
        rien ; l'arrivée ne recule pas ;
    12. un serveur d'avant (sans « distribues ») : jamais deux coches grises
        au hasard — une grise, puis deux bleues ;
    13. la liste des groupes, à l'ouverture du jeu, dit l'arrivée de tout ;
    14. en anglais : « Read by », « Delivered to » ;
    15. aucune erreur.
   Sur la v337 : 1 et 3 à 14 rouges — deux coches voulaient dire « vu par
   quelqu'un », et rien ne disait l'arrivée.
   Usage : node banc-essai/coches-whatsapp.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const { brancherFonction } = require('./fonction-rappels.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000c1', B = 'bbbbbbbb-0000-4000-8000-0000000000c2', C = 'cccccccc-0000-4000-8000-0000000000c3';
const EP = 'https://push.exemple/appareil-chloe';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 320) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8519, 5724, { rappels: true });
  const fn = await brancherFonction(m.sql);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Le club', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'push_enregistrer', { p_endpoint: EP, p_abonnement: { endpoint: EP, keys: { p256dh: 'p', auth: 'a' } }, p_decalage: 120, p_jeu: true, p_priere: -1, p_lecture: -1, p_messages: true });
    const recu = async (qui) => +(await m.sql(`select recu_jusqu from public.membres where groupe = '${g.id}' and membre = '${qui}'`));
    const vieillir = () => m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");

    /* 1 : le serveur seul */
    await vieillir();
    const e1 = (await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: 'Bonsoir à tous', p_genre: 'texte', p_donnees: null })).data;
    const r1a = (await m.rpc(C, 'marquer_recu', { p_groupe: g.id, p_message: e1.id + 50 })).data;
    const c1a = await recu(C);
    const r1b = (await m.rpc(C, 'marquer_recu', { p_groupe: g.id, p_message: e1.id })).data;
    const r1c = (await m.rpc(C, 'marquer_recu', { p_groupe: g.id, p_message: 0 })).data;
    const c1c = await recu(C);
    dit('1. marquer_recu : jamais au-delà du dernier message, jamais à reculons, et dit si ça a avancé ; l\'auteur l\'a déjà',
      r1a.ok && r1a.change === true && c1a === e1.id && r1b.change === false && r1c.change === false && c1c === e1.id && (await recu(B)) === e1.id,
      JSON.stringify({ r1a, c1a, r1b, r1c, c1c, b: await recu(B) }));
    await fn.nouveaux(); fn.envois.length = 0;

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
    const ouvrir = async (p) => { await p.evaluate((gid) => ouvrirGroupe(gid), g.id); await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000); await p.waitForTimeout(600); };
    const coches = (p, id) => p.evaluate((id) => { const h = document.querySelector(`#fil .b-heure[data-der="${id}"]`); const v = h && h.querySelector('.b-vu');
      return v ? { sorte: [...v.classList].filter(c => c !== 'b-vu').join(' '), traits: v.querySelectorAll('polyline').length, couleur: getComputedStyle(v).color, dit: v.getAttribute('aria-label') } : null; }, id);
    const menu = async (p, id) => { await p.evaluate((id) => actionsMessage(String(id)), id); await p.waitForTimeout(700);
      const r = await p.evaluate(() => { const v = document.querySelector('#grpActionsVeil .grp-vus'); if (!v) return null;
        const out = []; let cur = null; [...v.children].forEach(x => { if (x.classList.contains('gv-h')) { cur = { titre: x.textContent.trim(), noms: [] }; out.push(cur); } else if (cur) cur.noms.push((x.querySelector('b') || x).textContent.trim()); }); return out; });
      await p.evaluate(() => fermerFeuilleGroupe('grpActionsVeil')); await p.waitForTimeout(400); return r; };

    const tay = await telephone(A, 'Taylor', '#4C86E8', IOS);
    const ben = await telephone(B, 'Benoît', '#E8734C', AND);
    await ben.p.evaluate(() => { state.screen = 'groupes'; render(); ouvrirGroupes(); });
    await attendre(ben.p, (gid) => (grp.liste || []).some(x => x.id === gid), g.id, 8000);
    await ouvrir(tay.p);

    /* 2 : en route */
    await vieillir();
    const e2 = await tay.p.evaluate(() => new Promise(res => {
      const vraie = window.appelGroupe;
      window.appelGroupe = async (nom, args) => { if (nom === 'envoyer_message') await new Promise(r => setTimeout(r, 900)); return vraie(nom, args); };
      const t = document.getElementById('compoTexte'); t.value = 'On joue ce soir ?'; surSaisie(t); envoyerMessageGroupe();
      setTimeout(() => { const h = [...document.querySelectorAll('#fil .b-moi .b-heure')].pop(); const v = h && h.querySelector('.b-vu');
        res({ horloge: !!(v && v.classList.contains('attente') && v.querySelector('circle')), dit: v && v.getAttribute('aria-label'), heure: h ? h.textContent.trim() : '' });
        window.appelGroupe = vraie; }, 250);
    }));
    dit('2. un message en route : l\'heure, et une horloge (« Envoi… »)', e2.horloge && e2.dit === 'Envoi…' && /\d/.test(e2.heure), JSON.stringify(e2));
    await attendre(tay.p, () => [...document.querySelectorAll('#fil .b-moi .b-heure[data-der]')].some(h => /On joue/.test(h.parentElement.textContent)), null, 6000);
    const id = +(await m.sql(`select max(id) from public.messages where groupe = '${g.id}' and auteur = '${A}'`));
    await attendre(tay.p, (id) => !!document.querySelector(`#fil .b-heure[data-der="${id}"] .b-vu`), id, 6000);

    /* 3 et 4 */
    const c3 = await coches(tay.p, id);
    const arriveB = await (async () => { for (let i = 0; i < 40; i++) { if ((await recu(B)) >= id) return true; await new Promise(r => setTimeout(r, 150)); } return false; })();
    await tay.p.waitForTimeout(500);
    const c4 = await coches(tay.p, id);
    dit('3. parti, arrivé chez personne : UNE coche grise, « Envoyé »', c3 && c3.sorte === 'envoye' && c3.traits === 1 && c3.dit === 'Envoyé', JSON.stringify(c3));
    dit('4. arrivé sur le téléphone de Benoît (le direct, jeu ouvert) : le serveur le sait — et c\'est toujours une coche grise', arriveB && c4 && c4.sorte === 'envoye', JSON.stringify({ arriveB, c4 }));

    /* 5 : la notification de Chloé */
    const appels = await fn.nouveaux();
    const rep5 = appels.length ? await fn.servir(appels[appels.length - 1]) : null;
    const pourC = fn.envois.filter(x => x.qui === EP).pop();
    const ac = pourC && pourC.charge.accuse;
    dit('5. la notification de Chloé porte un jeton, adressé à la fonction', !!ac && ac.u === 'https://laboratoire.exemple/functions/v1/rappels' && /^[0-9a-f-]{36}$/.test(ac.j || ''),
      JSON.stringify({ rep5: rep5 && rep5.c, accuse: ac }));

    /* 6 : son téléphone le renvoie */
    const r6 = ac ? await fn.servir({ headers: {}, body: { accuse: ac.j } }) : { st: 0, c: {} };
    const jetonsRestants = +(await m.sql(`select count(*) from public.accuses where jeton = '${ac ? ac.j : '00000000-0000-4000-8000-000000000000'}'`));
    const diff = fn.diffusions.pop();
    dit('6. renvoyé : arrivé chez Chloé, le jeton consommé, le signal « lu » sur le canal du groupe',
      r6.st === 200 && r6.c.accuse === true && (await recu(C)) >= id && jetonsRestants === 0 && !!diff && /\/realtime\/v1\/api\/broadcast$/.test(diff.url)
        && diff.corps.messages[0].topic === 'yada-lus-' + g.id && diff.corps.messages[0].event === 'lu',
      JSON.stringify({ r6, c: await recu(C), jetonsRestants, diff: diff && { url: diff.url, m: diff.corps && diff.corps.messages } }));

    /* 7 : le signal arrive chez Taylor (le faux Supabase ne diffuse pas ce
       que la fonction poserait : Benoît relaie le même signal) */
    await ben.p.evaluate((gid) => signalerLu(gid), g.id);
    const vu7 = await attendre(tay.p, (id) => { const v = document.querySelector(`#fil .b-heure[data-der="${id}"] .b-vu`); return !!v && v.classList.contains('distribue'); }, id, 6000);
    const c7 = await coches(tay.p, id);
    dit('7. chez Taylor : DEUX coches grises, « Distribué »', vu7 && c7.traits === 2 && c7.couleur === c3.couleur && c7.dit === 'Distribué', JSON.stringify(c7));

    /* 8 : le menu */
    const m8 = await menu(tay.p, id);
    dit('8. toucher son message : « Lu par » personne, « Distribué à » Benoît et Chloé',
      !!m8 && m8.length === 2 && m8[0].titre === 'Lu par' && /Personne ne l'a encore lu/.test(m8[0].noms.join(' ')) && m8[1].titre === 'Distribué à' && m8[1].noms.slice().sort().join(',') === 'Benoît,Chloé', JSON.stringify(m8));

    /* 9 : Benoît le lit */
    await ouvrir(ben.p);
    await tay.p.waitForTimeout(1200);
    const c9 = await coches(tay.p, id);
    const m9 = await menu(tay.p, id);
    dit('9. Benoît le lit : toujours deux coches grises ; « Lu par » Benoît, « Distribué à » Chloé', c9 && c9.sorte === 'distribue' && m9 && m9[0].noms.join(',') === 'Benoît' && m9[1] && m9[1].noms.join(',') === 'Chloé', JSON.stringify({ c9, m9 }));

    /* 10 : Chloé le lit */
    await m.rpc(C, 'marquer_lu', { p_groupe: g.id, p_message: id });
    await ben.p.evaluate((gid) => signalerLu(gid), g.id);
    const vu10 = await attendre(tay.p, (id) => { const v = document.querySelector(`#fil .b-heure[data-der="${id}"] .b-vu`); return !!v && v.classList.contains('lu'); }, id, 6000);
    const c10 = await coches(tay.p, id);
    dit('10. Chloé le lit : deux coches BLEUES (le ciel de la palette), « Lu »', vu10 && c10.traits === 2 && c10.couleur === 'rgb(39, 125, 196)' && c10.dit === 'Lu', JSON.stringify(c10));

    /* 11 : les jetons */
    const r11a = ac ? await fn.servir({ headers: {}, body: { accuse: ac.j } }) : { st: 0 };
    const r11b = await fn.servir({ headers: {}, body: { accuse: '11111111-2222-4333-8444-555555555555' } });
    const r11c = await fn.servir({ headers: {}, body: { accuse: "x' or 1=1" } });
    await m.sql(`insert into public.accuses (jeton, groupe, membre, message) values ('22222222-3333-4444-8555-666666666666', '${g.id}', '${C}', 1)`);
    const avant11 = await recu(C);
    const r11d = await fn.servir({ headers: {}, body: { accuse: '22222222-3333-4444-8555-666666666666' } });
    await m.sql(`insert into public.accuses (jeton, groupe, membre, message, cree_le) values ('33333333-4444-4555-8666-777777777777', '${g.id}', '${C}', 1, now() - interval '3 days')`);
    await fn.servir({ headers: {}, body: { accuse: '22222222-3333-4444-8555-666666666666' } });
    await m.sql(`insert into public.accuses (jeton, groupe, membre, message) values ('44444444-5555-4666-8777-888888888888', '${g.id}', '${C}', 1)`);
    await fn.servir({ headers: {}, body: { accuse: '44444444-5555-4666-8777-888888888888' } });
    const vieux = +(await m.sql(`select count(*) from public.accuses where jeton = '33333333-4444-4555-8666-777777777777'`));
    dit('11. un jeton rejoué, inconnu ou mal formé : rien ; un jeton plus ancien ne fait pas reculer l\'arrivée ; les jetons de plus de deux jours s\'effacent',
      r11a.st === 404 && r11b.st === 404 && r11c.st === 400 && r11d.st === 200 && (await recu(C)) === avant11 && vieux === 0,
      JSON.stringify({ a: r11a.st, b: r11b.st, c: r11c.st, d: r11d.st, avant11, apres: await recu(C), vieux }));

    /* 12 : un serveur d'avant */
    await ben.p.evaluate(() => { retourGroupes(); }); await ben.p.waitForTimeout(500);
    await tay.p.evaluate(() => { grp.etat.distribues = false; });
    await vieillir();
    const e12 = await tay.p.evaluate(async () => { const t = document.getElementById('compoTexte'); t.value = 'Et demain ?'; surSaisie(t); await envoyerMessageGroupe(); return true; });
    const id12 = +(await m.sql(`select max(id) from public.messages where groupe = '${g.id}' and auteur = '${A}'`));
    await m.rpc(C, 'marquer_recu', { p_groupe: g.id, p_message: id12 });
    for (let i = 0; i < 30 && (await recu(B)) < id12; i++) await new Promise(r => setTimeout(r, 150));
    await ben.p.evaluate((gid) => signalerLu(gid), g.id);
    await tay.p.waitForTimeout(1200);
    const c12a = await coches(tay.p, id12);
    await m.rpc(B, 'marquer_lu', { p_groupe: g.id, p_message: id12 }); await m.rpc(C, 'marquer_lu', { p_groupe: g.id, p_message: id12 });
    await ben.p.evaluate((gid) => signalerLu(gid), g.id);
    const vu12 = await attendre(tay.p, (id) => { const v = document.querySelector(`#fil .b-heure[data-der="${id}"] .b-vu`); return !!v && v.classList.contains('lu'); }, id12, 6000);
    dit('12. un serveur d\'avant : arrivé chez tous mais pas lu, une coche grise (jamais deux au hasard) ; lu par tous, deux bleues',
      e12 && c12a && c12a.sorte === 'envoye' && vu12, JSON.stringify({ c12a, vu12 }));
    await tay.p.evaluate(() => { grp.etat.distribues = true; });

    /* 13 : la liste des groupes, à l'ouverture du jeu */
    await vieillir();
    await m.rpc(A, 'envoyer_message', { p_groupe: g.id, p_texte: 'Dernier mot', p_genre: 'texte', p_donnees: null });
    const id13 = +(await m.sql(`select max(id) from public.messages where groupe = '${g.id}'`));
    const avant13 = await recu(C);
    const chl = await telephone(C, 'Chloé', '#7BC86B', IOS);
    let apres13 = 0; for (let i = 0; i < 40; i++) { apres13 = await recu(C); if (apres13 >= id13) break; await new Promise(r => setTimeout(r, 150)); }
    dit('13. Chloé ouvre le jeu : la liste des groupes dit l\'arrivée du dernier message', avant13 < id13 && apres13 === id13, JSON.stringify({ avant13, apres13, id13 }));
    await chl.ctx.close();

    /* 14 : en anglais (le jeu redémarre dans sa nouvelle langue) */
    await tay.p.evaluate(() => { setLangue('en'); });
    await tay.p.waitForTimeout(800);
    await tay.p.waitForFunction(() => { try { return LANGUE === 'en' && state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await ouvrir(tay.p);
    await attendre(tay.p, (id) => !!document.querySelector(`#fil .b-heure[data-der="${id}"] .b-vu`), id13, 8000);
    await m.rpc(B, 'marquer_recu', { p_groupe: g.id, p_message: id13 });
    await tay.p.evaluate(() => relireLus(grp.courant)); await tay.p.waitForTimeout(600);
    const m14 = await menu(tay.p, id13);
    const c14 = await coches(tay.p, id13);
    dit('14. en anglais : « Read by », « Delivered to », « Delivered »', !!m14 && m14[0].titre === 'Read by' && m14.some(x => x.titre === 'Delivered to') && c14 && c14.dit === 'Delivered', JSON.stringify({ m14, c14 }));

    await tay.ctx.close(); await ben.ctx.close();
    dit('15. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 700)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — envoyé, distribué, lu : les coches disent ce que dit WhatsApp');
  process.exit(ko ? 1 : 0);
})();
