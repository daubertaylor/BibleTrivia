/* ====== BANC « UN MESSAGE ARRIVE, LE RESTE NE BOUGE PAS » (v329) ======
   « Vérifie l'animation des messages lorsqu'ils apparaissent. » Chaque
   message redessinait toute la discussion d'un bloc (avatars recréés, que
   l'iPhone repeint en clignant), et la bulle nouvelle surgissait sans
   transition. Le décor de groupes.js — un VRAI PostgreSQL, le vrai direct.
   Taylor (iPhone) a la discussion ouverte ; Benoît écrit depuis son
   téléphone (le banc parle au serveur en son nom).
     1. ouvrir une discussion : rien n'« arrive », tout est déjà là ;
     2. Taylor envoie : sa bulle arrive au toucher (elle part transparente et
        se pose) ;
     3. confirmée par le serveur, elle ne repart pas de zéro : son opacité ne
        fait que monter, jusqu'à 1 ; sur un réseau lent (confirmée après
        l'arrivée), elle reste pleine en attendant (elle retombait à 62 %) et
        ne rejoue pas son arrivée ;
     4. le message de Benoît arrive en direct : il se pose, une fois ;
     5. pendant ce temps, les bulles et les avatars déjà là sont restés les
        MÊMES éléments (rien de recréé, rien qui cligne) ;
     6. l'arrivée finie, la bulle ne garde ni classe ni style ;
     7. rouvrir la discussion : rien n'arrive ;
     8. quelqu'un qu'on débloque : ses anciens messages reviennent sans
        « arriver » ;
     9. « réduire les animations » : la bulle est là tout de suite ;
    10. aucune erreur.
   Usage : node banc-essai/fil-arrivee.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000f1', B = 'bbbbbbbb-0000-4000-8000-0000000000f2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8497, 5699);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 1 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    /* L'histoire : Benoît et Taylor, chacun son tour (une suite chacun). */
    const ecrit = async (qui, texte) => {
      await m.sql("update public.messages set cree_le = cree_le - interval '6 minutes'");
      const r = await m.rpc(qui, 'envoyer_message', { p_groupe: g.id, p_texte: texte, p_genre: 'texte', p_donnees: {} });
      if (!r.data || !r.data.ok) throw new Error('envoi refusé : ' + JSON.stringify(r));
    };
    for (const [qui, t] of [[B, 'Salut tout le monde'], [A, 'Coucou Benoît'], [B, 'On fait une partie ?'], [A, 'Oui, ce soir'], [B, 'Parfait']]) await ecrit(qui, t);
    await m.sql("update public.messages set cree_le = cree_le - interval '6 minutes'; update public.membres set rejoint_le = rejoint_le - interval '1 hour'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 100 }).then(() => true).catch(() => false);

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
    await attendre(p, () => !!document.querySelector('#grpMes .grp-ligne'), null, 9000);
    /* Chaque arrivée est notée : qui, et d'où repart son mouvement. */
    await p.evaluate(() => {
      window.__arr = [];
      const vrai = arriver;
      arriver = function(e, depuis){ window.__arr.push({ id: e.getAttribute('data-m'), retard: Math.round(performance.now() - depuis) }); return vrai(e, depuis); };
    });
    const ouvrir = async () => { await p.evaluate((id) => ouvrirGroupe(id), g.id); return attendre(p, () => state.screen === 'groupe' && document.querySelectorAll('#fil .b-bulle').length >= 5, null, 9000); };
    /* L'opacité de la bulle qui porte ce texte, image après image. */
    const sonder = (texte, ms) => p.evaluate(([texte, ms]) => new Promise(res => {
      const pts = [], t0 = performance.now();
      const pas = () => {
        const b = [...document.querySelectorAll('#fil [data-m]')].find(x => x.textContent.includes(texte));
        if (b) pts.push({ t: Math.round(performance.now() - t0), id: +b.getAttribute('data-m'), op: Math.round(+getComputedStyle(b).opacity * 1000) / 1000 });
        if (performance.now() - t0 < ms) requestAnimationFrame(pas); else res(pts);
      };
      requestAnimationFrame(pas);
    }), [texte, ms]);
    const monte = (pts) => pts.every((x, i) => !i || x.op >= pts[i - 1].op - 0.02);
    const resume = (pts) => pts.filter((x, i) => !i || x.op !== pts[i - 1].op || x.id !== pts[i - 1].id).slice(0, 9).map(x => x.t + 'ms:' + (x.id < 0 ? 'attente' : x.id) + '@' + x.op).join(' ');

    /* ===== 1 ===== */
    await ouvrir();
    await p.waitForTimeout(900);
    const r1 = await p.evaluate(() => ({ arr: window.__arr.length, classe: document.querySelectorAll('#fil .b-arrive').length, bulles: document.querySelectorAll('#fil .b-bulle').length }));
    dit('1. ouvrir la discussion : rien n\'arrive, tout est déjà là', r1.arr === 0 && r1.classe === 0 && r1.bulles === 5, JSON.stringify(r1));

    /* Les témoins : bulles et avatars déjà à l'écran. (Plus rien ne touche à
       l'heure des messages déjà écrits : la changer change vraiment leur
       bulle, et le vrai serveur ne le fait jamais. Le débit — une seconde
       entre deux messages d'une même personne — est respecté de lui-même.) */
    await p.evaluate(() => { window.__refs = [...document.querySelectorAll('#fil .b-eux .b-bulle, #fil .b-eux .b-av, #fil .b-jour')]; });

    /* ===== 2 & 3 ===== */
    const s2 = sonder('Je ramène le gâteau', 900);
    await p.evaluate(() => { const z = document.getElementById('compoTexte'); z.value = 'Je ramène le gâteau'; surSaisie(z); envoyerMessageGroupe(); });
    const pts2 = await s2;
    const confirme = await attendre(p, () => [...document.querySelectorAll('#fil .b-moi [data-m]')].some(b => +b.getAttribute('data-m') > 0 && b.textContent.includes('gâteau')), null, 6000);
    const enAttente = pts2.filter(x => x.id < 0), confirmes = pts2.filter(x => x.id > 0);
    dit('2. Taylor envoie : sa bulle arrive au toucher (transparente, puis posée)', enAttente.length > 0 && enAttente[0].op < 0.6, resume(pts2));
    const idOk = confirmes.length ? confirmes[0].id : 0;
    const relance = (await p.evaluate(() => window.__arr)).filter(x => +x.id === idOk && x.retard < 5);
    dit('3. confirmée par le serveur, elle ne repart pas de zéro : l\'opacité ne fait que monter, jusqu\'à 1',
      confirme && monte(pts2) && pts2[pts2.length - 1].op === 1 && pts2[pts2.length - 1].id > 0 && !relance.length,
      resume(pts2) + (relance.length ? ' · relancée : ' + JSON.stringify(relance) : ''));

    /* ===== 4 ===== */
    await p.waitForTimeout(600);
    const s4 = sonder('Bien reçu', 4500);
    await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: 'Bien reçu, merci', p_genre: 'texte', p_donnees: {} });
    const pts4 = await s4;
    const id4 = +(await m.sql("select max(id) from public.messages where texte = 'Bien reçu, merci'"));
    const arr4 = (await p.evaluate(() => window.__arr)).filter(x => +x.id === id4);
    dit('4. le message de Benoît arrive en direct : il se pose, une fois', pts4.length > 0 && pts4[0].op < 0.6 && monte(pts4) && pts4[pts4.length - 1].op === 1 && arr4.length === 1, resume(pts4) + ' · arrivées ×' + arr4.length);

    /* ===== 3 bis ===== un réseau lent : la confirmation tombe APRÈS
       l'arrivée (400 ms après le toucher). La bulle confirmée prend la place
       de celle qui attendait sans rejouer son arrivée : elle reste posée. */
    await p.route('**/faux/rpc', async (r) => {
      if (/"nom":"envoyer_message"/.test(r.request().postData() || '')) await new Promise(f => setTimeout(f, 400));
      r.continue();
    });
    const s3 = sonder('Et des bougies', 1400);
    await p.evaluate(() => { const z = document.getElementById('compoTexte'); z.value = 'Et des bougies'; surSaisie(z); envoyerMessageGroupe(); });
    const pts3 = await s3;
    await p.unroute('**/faux/rpc');
    const iOk = pts3.findIndex(x => x.id > 0);
    const id3 = iOk >= 0 ? pts3[iOk].id : 0;
    const arr3 = (await p.evaluate(() => window.__arr)).filter(x => +x.id === id3);
    dit('   réseau lent : pleine en attendant, et confirmée après l\'arrivée, elle ne la rejoue pas',
      iOk > 0 && pts3[iOk - 1].op === 1 && pts3.slice(iOk).every(x => x.op === 1) && !arr3.length,
      'confirmée à ' + (iOk >= 0 ? pts3[iOk].t + ' ms' : '—') + ' · ' + pts3.filter((x, i) => !i || x.op !== pts3[i - 1].op || x.id !== pts3[i - 1].id).map(x => x.t + ':' + x.id + '@' + x.op).join(' '));

    /* ===== 5 ===== */
    const r5 = await p.evaluate(() => ({ n: window.__refs.length, la: window.__refs.filter(e => e.isConnected).length }));
    dit('5. les bulles, avatars et dates déjà là sont restés les mêmes éléments (rien de recréé)', r5.n >= 6 && r5.la === r5.n, r5.la + '/' + r5.n);

    /* ===== 6 ===== */
    await p.waitForTimeout(500);
    const r6 = await p.evaluate(() => ({ classe: document.querySelectorAll('#fil .b-arrive').length, style: [...document.querySelectorAll('#fil [data-m]')].filter(e => e.hasAttribute('style')).length }));
    dit('6. l\'arrivée finie, la bulle ne garde ni classe ni style', r6.classe === 0 && r6.style === 0, JSON.stringify(r6));

    /* ===== 7 ===== */
    await p.evaluate(() => retourGroupes());
    await p.waitForTimeout(700);
    const avant7 = await p.evaluate(() => window.__arr.length);
    await ouvrir();
    await p.waitForTimeout(900);
    const r7 = await p.evaluate((n) => ({ arr: window.__arr.length - n, classe: document.querySelectorAll('#fil .b-arrive').length }), avant7);
    dit('7. rouvrir la discussion : rien n\'arrive', r7.arr === 0 && r7.classe === 0, JSON.stringify(r7));

    /* ===== 8 ===== */
    const avant8 = await p.evaluate(() => window.__arr.length);
    await p.evaluate((b) => { grp.bloques.add(b); majFil(); }, B);
    await p.waitForTimeout(1200);
    const caches = await p.evaluate(() => document.querySelectorAll('#fil .b-eux .b-bulle').length);
    await p.evaluate((b) => { grp.bloques.delete(b); majFil(); }, B);
    await p.waitForTimeout(1200);
    const r8 = await p.evaluate((n) => ({ arr: window.__arr.length - n, eux: document.querySelectorAll('#fil .b-eux .b-bulle').length }), avant8);
    dit('8. quelqu\'un qu\'on débloque : ses anciens messages reviennent sans « arriver »', caches === 0 && r8.eux === 4 && r8.arr === 0, 'cachés → ' + caches + ', revenus ' + JSON.stringify(r8));

    /* ===== 9 ===== */
    await p.emulateMedia({ reducedMotion: 'reduce' });
    const s9 = sonder('À ce soir', 4500);
    await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: 'À ce soir alors', p_genre: 'texte', p_donnees: {} });
    const pts9 = await s9;
    dit('9. « réduire les animations » : la bulle est là tout de suite', pts9.length > 0 && pts9.every(x => x.op === 1), resume(pts9));

    dit('10. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — un message arrive en se posant, une fois ; le reste de la discussion ne bouge pas' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
