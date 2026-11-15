/* ====== BANC « LE SALON DANS LA DISCUSSION, LA PARTIE EN PLEIN ÉCRAN » (v365) ======
   « Que le mode jeu dans les groupes puisse se lancer sans devoir rester
     dans le jeu : tu lances dans le chat, il y a un message avec le jeu, les
     joueurs peuvent rejoindre directement sans avoir à quitter les messages. »
   « Je ne t'ai pas dit de mettre la partie entière dans le chat, juste le
     truc de la demande de partie. »
   Un VRAI PostgreSQL (le décor de groupes.js), de vrais salons en direct.
   Benoît (iPhone) et Chloé (Android) ont la discussion de leur groupe ouverte.
     1. Benoît touche la manette : il RESTE dans la discussion ; le salon s'y
        loge (son visage, « Commencer ») ; l'invitation arrive dans le fil,
        chez lui et chez Chloé ;
     2. Chloé touche « Rejoindre la partie » : elle reste dans la discussion,
        sa carte dit qu'on attend l'hôte ; chez Benoît, deux visages et
        « Commencer » prêt ;
     3. on parle pendant le salon : le message de Chloé arrive chez Benoît,
        sous la carte ;
     4. la carte se plie et se déplie — (v369) en glissant : à mi-chemin, sa
        hauteur est entre les deux ; elle se plie seule quand on écrit ;
     5. (v369) Benoît quitte la discussion avec Chloé dans son salon : rien
        n'est demandé, le salon reste — sa barre l'attend aux groupes ; il
        revient par elle, et la carte est là ;
     6. Benoît lance : chez les deux, la partie arrive EN PLEIN ÉCRAN — la
        question, ses quatre réponses, le chrono —, plus de carte ;
     7. la partie finie : les résultats en plein écran, chez les deux ;
     8. « Quitter » : retour dans la discussion du groupe, barre d'écriture
        là, plus de salon ;
     9. un salon rejoint qu'on quitte par sa croix : la carte s'en va, on
        reste dans la discussion, et l'hôte voit partir le visage ;
    10. aucune erreur.
   Usage : node banc-essai/salon-dans-le-fil.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const B = 'bbbbbbbb-0000-4000-8000-0000000000d1', C = 'cccccccc-0000-4000-8000-0000000000d2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 360) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8533, 5735);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(B, 'creer_groupe', { p_nom: 'Le club de Benoît', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 5 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });

    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n, c]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
        localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
      }, [id, nom, couleur]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => chargerListes());
      await attendre(p, (gid) => (grp.liste || []).some(x => x.id === gid), g.id, 8000);
      await p.evaluate((gid) => ouvrirGroupe(gid), g.id);
      await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
      await p.waitForTimeout(500);
      return { ctx, p };
    };
    /* Ce que montre la discussion : l'écran, le panneau, le fil, la barre d'écriture. */
    const VUE = () => {
      const e = [...document.querySelectorAll('#app > .screen.groupe-ecran')].find(x => !x.classList.contains('screen-exit'));
      const pn = e && e.querySelector(':scope > .grp-partie');
      const fil = document.getElementById('fil'), compo = document.getElementById('compo');
      const r = (x) => x ? x.getBoundingClientRect() : null;
      const visible = (x) => !!x && x.getClientRects().length > 0 && getComputedStyle(x).display !== 'none';
      return {
        ecran: state.screen, phase: (typeof ecranEnLigne === 'function') ? ecranEnLigne() : null,
        panneau: pn ? pn.getAttribute('data-phase') : null, reduit: !!(pn && pn.classList.contains('reduit')),
        corps: !!(pn && visible(pn.querySelector('.gp-corps'))), panneauH: pn ? Math.round(r(pn).height) : 0,
        visages: pn ? pn.querySelectorAll('.gp-joueur').length : 0,
        lancer: pn && pn.querySelector('#roomStartBtn') ? { pret: !pn.querySelector('#roomStartBtn').classList.contains('is-waiting'), txt: pn.querySelector('#roomStartBtn').textContent.trim() } : null,
        attente: pn && pn.querySelector('.gp-note') ? pn.querySelector('.gp-note').textContent.trim() : '',
        question: pn && pn.querySelector('.question-card .qtext') ? pn.querySelector('.question-card .qtext').textContent.trim() : '',
        reponses: pn ? pn.querySelectorAll('.options-grid > .option-btn').length : 0,
        chrono: (document.querySelector('#grpPartieChrono, .grp-partie #qTimerChip .tv-n') || {}).textContent || '',
        rangs: pn ? pn.querySelectorAll('.rank-row').length : 0,
        resume: pn && pn.querySelector('.gp-resume') ? pn.querySelector('.gp-resume').textContent : '',
        filH: fil ? Math.round(fil.clientHeight) : 0, compo: !!compo && visible(compo),
        derniers: [...document.querySelectorAll('#fil .b-texte, #fil .b-bulle')].slice(-3).map(x => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)),
        bulle: !!document.querySelector('#fil .b-partie'), modale: !!document.getElementById('modalVeil')
      };
    };
    const ecrire = async (t, txt) => {
      await t.p.evaluate((x) => { const z = document.getElementById('compoTexte'); z.value = x; z.dispatchEvent(new Event('input', { bubbles: true })); }, txt);
      await t.p.evaluate(() => { const b = document.getElementById('compoEnvoi'); if (b) b.click(); });
    };

    const ben = await telephone(B, 'Benoît', '#E8734C', IOS);
    const chl = await telephone(C, 'Chloé', '#7BC86B', AND);

    /* 1 */
    await ben.p.evaluate(() => document.querySelector('.compo-jeu').click());
    const ok1 = await attendre(ben.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    const ok1c = await attendre(chl.p, () => !!document.querySelector('#fil .b-partie .grp-pill'), null, 9000);
    await attendre(ben.p, () => !!document.querySelector('#fil .b-partie'), null, 9000);
    const vb1 = await ben.p.evaluate(VUE);
    dit('1. Benoît touche la manette : il reste dans la discussion, le salon s\'y loge (son visage, « Commencer »), l\'invitation arrive chez les deux',
      ok1 && ok1c && vb1.ecran === 'groupe' && vb1.panneau === 'room' && vb1.visages === 1 && !!vb1.lancer && vb1.compo && vb1.bulle, JSON.stringify(vb1));

    /* 2 */
    await chl.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].pop().click());
    const ok2 = await attendre(chl.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!net.oppPresent, null, 9000);
    const ok2b = await attendre(ben.p, () => document.querySelectorAll('.grp-partie .gp-joueur').length === 2 && !!document.querySelector('.grp-partie #roomStartBtn:not(.is-waiting)'), null, 9000);
    const vc2 = await chl.p.evaluate(VUE), vb2 = await ben.p.evaluate(VUE);
    dit('2. Chloé rejoint par la bulle : elle reste dans la discussion, sa carte attend l\'hôte ; chez Benoît, deux visages et « Commencer » prêt',
      ok2 && ok2b && vc2.ecran === 'groupe' && vc2.panneau === 'room' && vc2.visages === 2 && !!vc2.attente && !vc2.lancer && vb2.lancer && vb2.lancer.pret, JSON.stringify({ vc2, vb2 }));

    /* 3 */
    await ecrire(chl, 'On fait une partie ?');
    const ok3 = await attendre(ben.p, () => [...document.querySelectorAll('#fil .b-bulle')].some(b => /On fait une partie/.test(b.textContent)), null, 9000);
    const vb3 = await ben.p.evaluate(VUE);
    dit('3. on parle pendant le salon : le message de Chloé arrive chez Benoît, sous la carte', ok3 && vb3.panneau === 'room' && vb3.ecran === 'groupe', JSON.stringify(vb3.derniers));

    /* 4 (v369 : la carte se plie en glissant, sur l'horloge du pli) */
    const hCarte = () => chl.p.evaluate(() => { const c = document.querySelector('#app > .screen:not(.screen-exit) > .grp-partie'); return c ? Math.round(c.getBoundingClientRect().height) : 0; });
    await chl.p.waitForTimeout(800);                       // une arrivée de carte encore en vol se pose
    const hAvant = await hCarte();
    await chl.p.evaluate(() => reduirePartie());
    await chl.p.waitForTimeout(120);
    const hMilieu = await hCarte();
    await chl.p.waitForTimeout(800);
    const v4a = await chl.p.evaluate(VUE);
    await chl.p.evaluate(() => reduirePartie());
    await chl.p.waitForTimeout(800);
    const v4b = await chl.p.evaluate(VUE);
    await chl.p.evaluate(() => document.documentElement.classList.add('kb'));
    const v4c = await chl.p.evaluate(VUE);
    await chl.p.evaluate(() => document.documentElement.classList.remove('kb'));
    const v4d = await chl.p.evaluate(VUE);
    dit('4. la carte se plie (sa ligne de tête et le nombre de joueurs) et se déplie ; elle se plie seule quand le clavier est ouvert',
      v4a.reduit && !v4a.corps && /2\/\d+/.test(v4a.resume) && v4a.filH > v4b.filH + 20 && !v4b.reduit && v4b.corps && !v4c.corps && v4d.corps
        && hMilieu < hAvant - 2 && hMilieu > v4a.panneauH + 2,
      JSON.stringify({ plie: [v4a.reduit, v4a.corps, v4a.resume, v4a.filH, v4a.panneauH], deplie: [v4b.corps, v4b.filH], glisse: [hAvant, hMilieu], clavier: v4c.corps }));

    /* 5 (v369) */
    await ben.p.evaluate(() => retourGroupes());
    await attendre(ben.p, () => state.screen === 'groupes' && !!document.querySelector('#barrePartie:not(.cachee)'), null, 6000);
    await ben.p.waitForTimeout(400);
    const v5a = await ben.p.evaluate(() => ({ ecran: state.screen, modale: !!document.getElementById('modalVeil'), salon: !!(net.room && net.fil),
      barre: !!document.querySelector('#barrePartie:not(.cachee) .bp-go') }));
    await ben.p.evaluate(() => document.querySelector('#barrePartie .bp-zone').click());
    await attendre(ben.p, () => state.screen === 'groupe' && !!document.querySelector('#app > .screen:not(.screen-exit) > .grp-partie[data-phase="room"]'), null, 8000);
    await ben.p.waitForTimeout(500);
    const v5b = await ben.p.evaluate(VUE);
    dit('5. (v369) l\'hôte qui quitte la discussion avec un joueur dans son salon : rien n\'est demandé, le salon reste, sa barre l\'attend aux groupes ; il revient par elle',
      !v5a.modale && v5a.ecran === 'groupes' && v5a.salon && v5a.barre && !v5b.modale && v5b.ecran === 'groupe' && v5b.panneau === 'room' && v5b.visages === 2,
      JSON.stringify({ v5a, v5b: [v5b.modale, v5b.ecran, v5b.panneau, v5b.visages] }));

    /* 6 */
    const PLEIN = () => {
      const e = [...document.querySelectorAll('#app > .screen')].find(x => !x.classList.contains('screen-exit'));
      return { ecran: state.screen, carte: !!document.querySelector('.grp-partie'), reponses: e ? e.querySelectorAll('.options-grid > .option-btn').length : 0,
        question: e && e.querySelector('.question-card .qtext') ? e.querySelector('.question-card .qtext').textContent.trim() : '', fil: !!document.getElementById('fil'),
        rangs: e ? e.querySelectorAll('.rank-row').length : 0 };
    };
    await ben.p.evaluate(() => { const k = Object.keys(LENGTHS).sort((a, b) => LENGTHS[a] - LENGTHS[b])[0]; selectRoomOpt('len', k); hostStart(); });
    const ok6 = await attendre(ben.p, () => state.screen === 'online-play' && !document.querySelector('.grp-partie'), null, 9000);
    const ok6c = await attendre(chl.p, () => state.screen === 'online-play' && !document.querySelector('.grp-partie'), null, 9000);
    await ben.p.waitForTimeout(1400);
    const vb6 = await ben.p.evaluate(PLEIN), vc6 = await chl.p.evaluate(PLEIN);
    const chronoTourne = await ben.p.evaluate(() => typeof qTimerLeft === 'number' && qTimerLeft > 0 && !!qTimerId);
    dit('6. Benoît lance : chez les deux, la partie arrive en plein écran — la question, ses quatre réponses, le chrono —, plus de carte ni de discussion',
      ok6 && ok6c && vb6.reponses === 4 && vc6.reponses === 4 && !!vb6.question && vb6.question === vc6.question && chronoTourne && !vb6.fil && !vc6.fil,
      JSON.stringify({ vb6, vc6, chronoTourne }));

    /* 7 */
    const jouerTout = (t) => t.p.evaluate(async () => {
      for (let i = 0; i < 40 && !net.myDone; i++) {
        if (!net.revealed) onlineAnswer(0);
        await new Promise(r => setTimeout(r, 60));
        onlineNext();
        await new Promise(r => setTimeout(r, 60));
      }
      return net.myDone;
    });
    const [fb, fc] = await Promise.all([jouerTout(ben), jouerTout(chl)]);
    const FIN = () => state.screen === 'online-end' && !!document.querySelector('#app > .screen:not(.screen-exit) .btn-quit');
    const ok7 = await attendre(ben.p, FIN, null, 12000);
    const ok7c = await attendre(chl.p, FIN, null, 12000);
    const vb7 = await ben.p.evaluate(PLEIN), vc7 = await chl.p.evaluate(PLEIN);
    dit('7. la partie finie : les résultats en plein écran, chez les deux (et « Quitter »)', fb && fc && ok7 && ok7c && !vb7.carte && !vc7.carte && !vb7.fil && !vc7.fil, JSON.stringify({ vb7, vc7 }));

    /* 8 */
    await chl.p.evaluate(() => { const b = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .end-actions button')].find(x => /Quitter/.test(x.textContent)); if (b) b.click(); });
    const ok8 = await attendre(chl.p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte') && !net.room, null, 8000);
    await chl.p.waitForTimeout(600);
    const vc8 = await chl.p.evaluate(VUE);
    dit('8. « Quitter » : retour dans la discussion du groupe, la barre d\'écriture là, plus de salon',
      ok8 && vc8.ecran === 'groupe' && !vc8.panneau && vc8.compo, JSON.stringify(vc8));

    /* 9 */
    await ben.p.evaluate(() => { const b = [...document.querySelectorAll('#app > .screen:not(.screen-exit) .end-actions button')].find(x => /Quitter/.test(x.textContent)); if (b) b.click(); });
    await attendre(ben.p, () => state.screen === 'groupe' && !net.room, null, 8000);
    await ben.p.waitForTimeout(5600);                       // une partie à la fois : cinq secondes entre deux
    await ben.p.evaluate(() => document.querySelector('.compo-jeu').click());
    await attendre(ben.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    await attendre(chl.p, () => [...document.querySelectorAll('#fil .b-partie .grp-pill')].some(x => /Rejoindre/.test(x.textContent)), null, 9000);
    await chl.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].filter(x => /Rejoindre/.test(x.textContent)).pop().click());
    await attendre(ben.p, () => document.querySelectorAll('.grp-partie .gp-joueur').length === 2, null, 9000);
    await chl.p.evaluate(() => quitterPartieDuFil());
    const ok9 = await attendre(chl.p, () => !document.querySelector('.grp-partie') && !net.room && state.screen === 'groupe', null, 8000);
    const ok9b = await attendre(ben.p, () => document.querySelectorAll('.grp-partie .gp-joueur').length === 1, null, 9000);
    const vc9 = await chl.p.evaluate(VUE);
    dit('9. un salon rejoint qu\'on quitte par sa croix : la carte s\'en va, on reste dans la discussion ; chez l\'hôte, le visage part',
      ok9 && ok9b && vc9.ecran === 'groupe' && vc9.compo, JSON.stringify(vc9));

    for (const t of [ben, chl]) await t.ctx.close();
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('10. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le salon se tient dans la discussion, la partie se joue en plein écran');
  process.exit(ko ? 1 : 0);
})();
