/* ====== BANC « QUI A VU MON MESSAGE, COMME SUR WHATSAPP » (v329) ======
   « Ajoute aussi un petit détail comme sur WhatsApp pour que les gens voient
     qui a vu les messages. » Le décor de groupes.js — un VRAI PostgreSQL, les
   vraies règles. Taylor (iPhone) écrit ; Benoît (Android) a le jeu ouvert ;
   Jean Paul lit depuis un autre téléphone (le banc parle au serveur en son
   nom) ; Dora arrive plus tard.
   CE QU'IL EXIGE :
     1. un message parti, que personne n'a lu : UNE coche grise ;
     2. Jean Paul l'ouvre : deux coches grises (vu par certains), posées SUR
        PLACE — la bulle n'est pas redessinée ;
     3. Benoît l'ouvre : deux coches de la couleur du groupe (vu par tout le
        monde) ;
     4. les coches ne sont que sous MES messages : Benoît n'en voit aucune
        sous ceux de Taylor ;
     5. toucher son message : « Vu par tout le monde », avec leurs noms ;
     6. un deuxième message, Benoît a la discussion ouverte (il le lit en le
        recevant) : « Vu par » Benoît, « Pas encore vu » Jean Paul ;
     7. Dora arrive après : elle ne compte pas — quand Jean Paul a lu, c'est
        « tout le monde » ;
     8. quelqu'un qui RÉPOND a vu : la réponse de Jean Paul allume les coches
        tout de suite, sans attendre la relève ;
     9. en anglais, les mots du menu ;
    10. aucune erreur.
   Usage : node banc-essai/vus.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000d1', B = 'bbbbbbbb-0000-4000-8000-0000000000d2', C = 'cccccccc-0000-4000-8000-0000000000d3', D = 'dddddddd-0000-4000-8000-0000000000d4';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 220) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8496, 5698);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'jp@essai', 'Jean Paul', '#7BC86B'], [D, 'dora@essai', 'Dora', '#B77BE8']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 3 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.sql("update public.messages set cree_le = cree_le - interval '30 seconds'; update public.membres set rejoint_le = rejoint_le - interval '30 seconds'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 100 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua, langue) => {
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block', locale: langue === 'en' ? 'en-US' : 'fr-FR' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n, c, l]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
        if (l) localStorage.setItem('bt_langue', l);
      }, [id, nom, couleur, langue || '']);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => allerOnglet('groupes'));
      await attendre(p, () => !!document.querySelector('#grpMes .grp-ligne'), null, 9000);
      return { ctx, p };
    };
    const ouvrir = async (p) => { await p.evaluate((id) => ouvrirGroupe(id), g.id); return attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000); };
    const ecrire = async (p, texte) => {
      await m.sql("update public.messages set cree_le = cree_le - interval '5 seconds'");
      await p.evaluate((t) => { const z = document.getElementById('compoTexte'); z.value = t; surSaisie(z); envoyerMessageGroupe(); }, texte);
      await attendre(p, (t) => [...document.querySelectorAll('#fil .b-moi .b-heure[data-der]')].some(h => {
        const f = grp.fils[grp.courant]; const x = f && f.messages.find(y => String(y.id) === h.getAttribute('data-der')); return x && x.texte === t; }), texte, 8000);
      return +(await m.sql("select max(id) from public.messages where genre = 'texte' and texte = '" + texte.replace(/'/g, "''") + "'"));
    };
    /* Les coches sous un de mes messages : leur sorte, leur nombre, leur couleur. */
    const coches = (p, id) => p.evaluate((id) => { const h = document.querySelector('#fil .b-moi .b-heure[data-der="' + id + '"]');
      const v = h && h.querySelector('.b-vu'); if (!v) return null;
      return { sorte: ['envoye', 'certains', 'tous'].find(k => v.classList.contains(k)), traits: v.querySelectorAll('polyline').length, couleur: getComputedStyle(v).color, dit: v.getAttribute('aria-label') }; }, id);
    const sorteDevient = (p, id, sorte, ms) => attendre(p, ([id, s]) => { const v = document.querySelector('#fil .b-moi .b-heure[data-der="' + id + '"] .b-vu'); return !!v && v.classList.contains(s); }, [id, sorte], ms || 14000);

    const { p: pa } = await telephone(A, 'Taylor', '#4C86E8', IOS);
    const { p: pb } = await telephone(B, 'Benoît', '#E8734C', AND);
    await ouvrir(pa);

    /* ---- 1 ---- */
    const id1 = await ecrire(pa, 'Qui vient ce soir ?');
    let c1 = await coches(pa, id1);
    dit('1. parti, personne ne l\'a lu : une coche grise', c1 && c1.sorte === 'envoye' && c1.traits === 1, JSON.stringify(c1));

    /* ---- 2 ---- (le direct rend d'abord à Taylor son propre message : on
       laisse passer cet écho avant de poser le témoin) */
    await pa.waitForTimeout(1500);
    await pa.evaluate(() => { const b = document.querySelector('#fil .b-moi .b-bulle'); if (b) b.__temoin = 1; });
    await m.rpc(C, 'marquer_lu', { p_groupe: g.id, p_message: id1 });
    const t0 = Date.now();
    const vu2 = await sorteDevient(pa, id1, 'certains');
    const c2 = await coches(pa, id1);
    const memeBulle = await pa.evaluate(() => { const b = document.querySelector('#fil .b-moi .b-bulle'); return !!(b && b.__temoin); });
    dit('2. Jean Paul l\'ouvre : deux coches grises (vu par certains)', vu2 && c2.traits === 2 && c2.couleur === c1.couleur, 'en ' + (Date.now() - t0) + ' ms · ' + JSON.stringify(c2));
    dit('   posées sur place : la bulle n\'est pas redessinée', memeBulle);

    /* ---- 3 ---- */
    await ouvrir(pb);
    const vu3 = await sorteDevient(pa, id1, 'tous');
    const c3 = await coches(pa, id1);
    dit('3. Benoît l\'ouvre : deux coches de la couleur du groupe (vu par tout le monde)', vu3 && c3.traits === 2 && c3.couleur !== c2.couleur, JSON.stringify(c3));

    /* ---- 4 ---- */
    await pb.waitForTimeout(600);
    const chezB = await pb.evaluate(() => ({ eux: document.querySelectorAll('#fil .b-eux .b-vu').length, bulles: document.querySelectorAll('#fil .b-eux .b-bulle').length }));
    dit('4. chez Benoît, aucune coche sous les messages de Taylor', chezB.bulles >= 1 && chezB.eux === 0, JSON.stringify(chezB));

    /* ---- 5 ---- */
    await pa.evaluate((id) => actionsMessage(String(id)), id1);
    await attendre(pa, () => !!document.querySelector('#grpActionsVeil .grp-vus'), null, 4000);
    const menu5 = await pa.evaluate(() => { const z = document.querySelector('#grpActionsVeil .grp-vus');
      return z ? { titres: [...z.querySelectorAll('.gv-h')].map(x => x.textContent), noms: [...z.querySelectorAll('.gv-l b')].map(x => x.textContent), pas: z.querySelectorAll('.gv-l.pas').length } : null; });
    dit('5. toucher son message : « Vu par tout le monde », avec leurs noms', menu5 && menu5.titres.join('|') === 'Vu par tout le monde' && menu5.noms.sort().join(',') === 'Benoît,Jean Paul' && !menu5.pas, JSON.stringify(menu5));
    await pa.evaluate(() => fermerFeuilleGroupe('grpActionsVeil'));
    await pa.waitForTimeout(500);

    /* ---- 6 ---- */
    const id2 = await ecrire(pa, 'Je prends le gâteau');
    const vu6 = await sorteDevient(pa, id2, 'certains');
    await pa.evaluate((id) => actionsMessage(String(id)), id2);
    await attendre(pa, () => !!document.querySelector('#grpActionsVeil .grp-vus'), null, 4000);
    const menu6 = await pa.evaluate(() => { const z = document.querySelector('#grpActionsVeil .grp-vus');
      return z ? { titres: [...z.querySelectorAll('.gv-h')].map(x => x.textContent), vus: [...z.querySelectorAll('.gv-l:not(.pas) b')].map(x => x.textContent), pas: [...z.querySelectorAll('.gv-l.pas b')].map(x => x.textContent) } : null; });
    dit('6. Benoît, discussion ouverte, le lit en le recevant : « Vu par » Benoît, « Pas encore vu » Jean Paul',
      vu6 && menu6 && menu6.titres.join('|') === 'Vu par|Pas encore vu' && menu6.vus.join() === 'Benoît' && menu6.pas.join() === 'Jean Paul', JSON.stringify(menu6));
    await pa.evaluate(() => fermerFeuilleGroupe('grpActionsVeil'));

    /* ---- 7 ---- */
    await pa.waitForTimeout(400);
    await m.rpc(D, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await pa.waitForTimeout(1500);
    await m.rpc(C, 'marquer_lu', { p_groupe: g.id, p_message: id2 });
    const vu7 = await sorteDevient(pa, id2, 'tous');
    dit('7. Dora arrivée après ne compte pas : Jean Paul a lu, c\'est « tout le monde »', vu7, JSON.stringify(await coches(pa, id2)));

    /* ---- 8 ---- */
    const id3 = await ecrire(pa, 'Rendez-vous à 20 h');
    await pb.waitForTimeout(300);
    await m.sql("update public.messages set cree_le = cree_le - interval '5 seconds'");
    const r8 = await m.rpc(C, 'envoyer_message', { p_groupe: g.id, p_texte: 'Parfait, à tout à l\'heure', p_genre: 'texte', p_donnees: {} });
    const t8 = Date.now();
    const vu8 = await attendre(pa, (id) => { const v = document.querySelector('#fil .b-moi .b-heure[data-der="' + id + '"] .b-vu'); return !!v && !v.classList.contains('envoye')
      && [...document.querySelectorAll('#fil .b-eux .b-bulle')].some(b => /Parfait/.test(b.textContent)); }, id3, 6000);
    const ms8 = Date.now() - t8;
    dit('8. la réponse de Jean Paul allume les coches tout de suite, sans attendre la relève', r8.data && r8.data.ok && vu8 && ms8 < 4000, ms8 + ' ms · ' + JSON.stringify(await coches(pa, id3)));

    /* ---- 9 ---- */
    const { p: pe } = await telephone(A, 'Taylor', '#4C86E8', IOS, 'en');
    await ouvrir(pe);
    /* (les messages de Taylor qui se suivent font une seule suite : les coches
       sont sous la dernière) */
    await attendre(pe, () => !!document.querySelector('#fil .b-moi .b-heure[data-der] .b-vu'), null, 6000);
    await pe.waitForTimeout(800);
    await pe.evaluate((id) => actionsMessage(String(id)), id1);
    await attendre(pe, () => !!document.querySelector('#grpActionsVeil .grp-vus'), null, 4000);
    const en = await pe.evaluate(() => ({ titre: (document.querySelector('#grpActionsVeil .gv-h') || {}).textContent,
      dit: (document.querySelector('#fil .b-moi .b-heure[data-der] .b-vu') || { getAttribute(){ return ''; } }).getAttribute('aria-label') }));
    dit('9. en anglais : « ' + en.titre + ' », « ' + en.dit + ' »', /^Seen by/.test(en.titre || '') && /^(Seen by|Sent)/.test(en.dit || ''));

    dit('10. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — sous chacun de mes messages, on voit qui l\'a vu, comme sur WhatsApp' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
