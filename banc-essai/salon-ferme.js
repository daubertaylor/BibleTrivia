/* ====== BANC « FERMER UNE PARTIE QUI N'A PAS COMMENCÉ » (v379) ======
   « Vérifie la fermeture d'une partie lorsqu'elle n'a pas encore commencé
     mais que j'ai décidé de la fermer. Si par exemple pas de joueurs
     arrivent et que je décide de me dire : les joueurs ne viendront pas, je
     ferme la partie. Fais ça proprement. »
   Un VRAI PostgreSQL (le décor de groupes.js), de vrais salons en direct.
   Benoît (iPhone) lance, Chloé (Android) a la discussion ouverte.
     1. personne ne vient, Benoît touche la croix de la carte : rien n'est
        demandé ; la carte se replie, il reste dans la discussion, la barre
        d'écriture est là, plus rien du salon (ni carte, ni barre, ni état) ;
     2. l'invitation quitte son fil tout de suite, et celui de Chloé ensuite
        (le serveur l'a retirée) : plus de « Rejoindre la partie » nulle part ;
     3. Chloé a rejoint, Benoît touche la croix : la question est posée
        (« Fermer la partie ? ») — « Rester » ne ferme rien ;
     4. « Fermer » : la carte part chez les deux, Chloé reste dans la
        discussion, avec un mot ; l'invitation dit « Partie annulée » (pas
        « terminée » : elle n'a jamais commencé), sans bouton ;
     5. Chloé touche « Rejoindre » d'une invitation que Benoît vient de
        fermer : elle reste dans la discussion, sans carte bloquée ;
     6. aucune erreur.
   Usage : node banc-essai/salon-ferme.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const B = 'bbbbbbbb-0000-4000-8000-0000000000f1', C = 'cccccccc-0000-4000-8000-0000000000f2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 420) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8561, 5761);
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
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
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
    const VUE = () => {
      const e = [...document.querySelectorAll('#app > .screen.groupe-ecran')].find(x => !x.classList.contains('screen-exit'));
      const pn = e && [...e.querySelectorAll(':scope > .grp-partie')].find(x => !x._part);
      const compo = document.getElementById('compo');
      const visible = (x) => !!x && x.getClientRects().length > 0 && getComputedStyle(x).display !== 'none';
      const bulles = [...document.querySelectorAll('#fil .b-partie')];
      const der = bulles[bulles.length - 1];
      return {
        ecran: state.screen, carte: !!pn, visages: pn ? pn.querySelectorAll('.gp-joueur').length : 0,
        compo: !!compo && visible(compo), modale: !!document.querySelector('#modalVeil:not(.closing)'),
        modaleTitre: (document.querySelector('#modalVeil .modal-title') || {}).textContent || '',
        barre: !!document.getElementById('barrePartie') && document.documentElement.classList.contains('partie-vue'),
        room: !!net.room, fil: net.fil || null, pg: !!net.partieGroupe,
        bulles: bulles.length, pill: !!(der && der.querySelector('.grp-pill')), dit: der ? der.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : '',
        toast: (document.querySelector('.mini-toast') || {}).textContent || ''
      };
    };
    const ben = await telephone(B, 'Benoît', '#E8734C', IOS);
    const chl = await telephone(C, 'Chloé', '#7BC86B', AND);
    const lancer = async () => {
      await ben.p.evaluate(() => document.querySelector('.compo-jeu').click());
      const a = await attendre(ben.p, () => !!document.querySelector('.grp-partie[data-phase="room"]') && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
      const b = await attendre(chl.p, () => [...document.querySelectorAll('#fil .b-partie .grp-pill')].some(x => /Rejoindre/.test(x.textContent)), null, 9000);
      return a && b;
    };
    const croix = (t) => t.p.evaluate(() => { const b = document.querySelector('#app > .screen:not(.screen-exit) > .grp-partie .gp-quitter'); if (b) b.click(); return !!b; });

    /* 1-2 */
    const l1 = await lancer();
    await ben.p.waitForTimeout(400);
    const x1 = await croix(ben);
    await ben.p.waitForTimeout(150);
    const vb1q = await ben.p.evaluate(VUE);
    await ben.p.waitForTimeout(900);
    const vb1 = await ben.p.evaluate(VUE);
    dit('1. personne n\'est venu, la croix : rien n\'est demandé ; la carte part, la discussion reste (barre d\'écriture), plus rien du salon',
      l1 && x1 && !vb1q.modale && vb1.ecran === 'groupe' && !vb1.carte && vb1.compo && !vb1.barre && !vb1.room && !vb1.fil && !vb1.pg, JSON.stringify({ vb1q, vb1 }));
    const ok2 = await attendre(chl.p, () => ![...document.querySelectorAll('#fil .b-partie')].some(b => b.querySelector('.grp-pill')), null, 9000);
    const vc2 = await chl.p.evaluate(VUE);
    const reste = await m.sql(`select count(*) from public.messages where genre = 'partie' and groupe = '${g.id}'`);
    dit('2. l\'invitation quitte le fil de Benoît tout de suite, celui de Chloé ensuite : plus de « Rejoindre » nulle part',
      vb1.bulles === 0 && ok2 && !vc2.pill, JSON.stringify({ ben: vb1.bulles, chl: vc2, serveur: reste }));

    /* 3-4 */
    await ben.p.waitForTimeout(5600);                      // une partie à la fois : cinq secondes entre deux
    const l3 = await lancer();
    await chl.p.evaluate(() => [...document.querySelectorAll('#fil .b-partie .grp-pill')].filter(x => /Rejoindre/.test(x.textContent)).pop().click());
    const j3 = await attendre(ben.p, () => document.querySelectorAll('.grp-partie .gp-joueur').length === 2, null, 9000);
    await ben.p.waitForTimeout(300);
    await croix(ben);
    await ben.p.waitForTimeout(500);
    const vb3 = await ben.p.evaluate(VUE);
    let rester = false;
    if (vb3.modale) {
      await ben.p.evaluate(() => { const b = document.querySelector('#modalVeil .modal-btn:not(.ok)') || document.querySelector('#modalVeil .modal-btn.cancel'); if (b) b.click(); });
      await ben.p.waitForTimeout(700);
      const vb3b = await ben.p.evaluate(VUE);
      rester = vb3b.carte && vb3b.visages === 2 && vb3b.room;
    }
    dit('3. Chloé a rejoint, la croix : « Fermer la partie ? » — « Rester » ne ferme rien',
      l3 && j3 && vb3.modale && /Fermer la partie/.test(vb3.modaleTitre) && rester, JSON.stringify(vb3));
    await croix(ben);
    await ben.p.waitForTimeout(500);
    await ben.p.evaluate(() => { const b = document.querySelector('#modalVeil .modal-btn.ok'); if (b) b.click(); });
    const ok4 = await attendre(chl.p, () => !document.querySelector('#app > .screen:not(.screen-exit) > .grp-partie') && !net.room, null, 9000);
    await chl.p.waitForTimeout(200);
    const vc4 = await chl.p.evaluate(VUE);
    await ben.p.waitForTimeout(900);
    const vb4 = await ben.p.evaluate(VUE);
    const ok4b = await attendre(chl.p, () => { const b = [...document.querySelectorAll('#fil .b-partie')].pop(); return !!b && /annulée/.test(b.textContent) && !b.querySelector('.grp-pill'); }, null, 9000);
    const vc4b = await chl.p.evaluate(VUE);
    dit('4. « Fermer » : la carte part chez les deux, Chloé reste dans la discussion avec un mot ; l\'invitation dit « Partie annulée », sans bouton',
      ok4 && vc4.ecran === 'groupe' && vc4.compo && !!vc4.toast && !vb4.carte && !vb4.room && vb4.compo && ok4b && /annulée/.test(vb4.dit), JSON.stringify({ vc4, vb4, vc4b }));

    /* 5 */
    await ben.p.waitForTimeout(5600);
    const l5 = await lancer();
    await croix(ben);
    await chl.p.evaluate(() => { const p = [...document.querySelectorAll('#fil .b-partie .grp-pill')].filter(x => /Rejoindre/.test(x.textContent)).pop(); if (p) p.click(); });
    await chl.p.waitForTimeout(3500);
    const vc5 = await chl.p.evaluate(VUE);
    dit('5. Chloé rejoint une invitation que Benoît vient de fermer : elle reste dans la discussion, sans carte bloquée',
      l5 && vc5.ecran === 'groupe' && !vc5.carte && !vc5.room && vc5.compo, JSON.stringify(vc5));

    for (const t of [ben, chl]) await t.ctx.close();
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('6. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — une partie qui n\'a pas commencé se ferme proprement');
  process.exit(ko ? 1 : 0);
})();
