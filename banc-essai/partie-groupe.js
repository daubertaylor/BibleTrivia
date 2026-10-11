/* ====== LA MANETTE D'UN GROUPE : TOUT DE SUITE, ET UNE PARTIE À LA FOIS (v314) ======
   « Quand je clique sur la manette pour créer une partie de groupe, que ça se
     lance très rapidement, sans délai. » « Que l'utilisateur ne puisse pas
     créer trop de parties à la chaîne : qu'il ferme sa partie ou qu'il la
     termine avant d'en créer une autre. »
   Le décor de groupes.js — un VRAI PostgreSQL. Le serveur répond lentement
   (0,8 s par appel, comme un réseau mobile) :
     1. la manette ouvre le salon tout de suite, sans attendre le serveur ;
     2. l'invitation arrive ensuite dans la discussion ;
     3. on ferme son salon sans que personne soit venu : l'invitation s'en va ;
     4. relancer dans les cinq secondes : la manette l'explique, pas de salon ;
     5. une partie restée ouverte ailleurs (l'app relancée) : elle est close
        d'office, et la nouvelle invitation part ;
     6. le serveur refuse lui-même une 2e partie ouverte, et une rafale ;
     7. aucune erreur.
   Usage : node banc-essai/partie-groupe.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8362, 5548);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom] of [[A, 'taylor@essai', 'Taylor'], [B, 'benoit@essai', 'Benoît']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis du jeudi', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);
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
    await attendre(p, () => !!document.getElementById('grpMes'), null, 9000);
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(p, () => state.screen === 'groupe' && !!document.querySelector('.compo-jeu'), null, 8000);
    await p.waitForTimeout(1000);
    /* Le serveur devient lent : 0,8 s par appel. */
    await p.evaluate(() => { const o = window.appelGroupe; window.appelGroupe = async function(){ await new Promise(r => setTimeout(r, 800)); return o.apply(this, arguments); }; });
    const parties = () => m.sql("select coalesce(string_agg(id || ':' || (case when supprime_le is not null then 'supprimee' when coalesce((donnees->>'fermee')::boolean, false) then 'fermee' else 'ouverte' end), ',' order by id), '') from public.messages where genre = 'partie'");

    /* ---- 1-2 ---- */
    const delai = await p.evaluate(() => new Promise(res => { const t0 = performance.now(); document.querySelector('.compo-jeu').click();
      const tic = () => { if (state.screen === 'online-room') res(Math.round(performance.now() - t0)); else if (performance.now() - t0 > 3000) res(-1); else requestAnimationFrame(tic); }; tic(); }));
    dit('la manette ouvre le salon tout de suite, sans attendre le serveur', delai >= 0 && delai < 250, delai + ' ms (serveur à 800 ms)');
    dit('… et l\'invitation arrive ensuite dans le groupe', await attendre(p, () => !!(net.partieGroupe && net.partieGroupe.message), null, 6000) && /ouverte/.test(await parties()), await parties());

    /* ---- 3 ---- */
    await p.evaluate(() => document.querySelector('.app-header [onclick*="leaveRoomToOnline"]').click());
    await attendre(p, () => state.screen === 'groupe', null, 6000);
    let fin = false; for (let i = 0; i < 20 && !fin; i++) { await p.waitForTimeout(250); fin = /supprimee/.test(await parties()); }
    dit('salon fermé sans que personne soit venu : l\'invitation s\'en va', fin, await parties());

    /* ---- 4 ---- */
    await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('.compo-jeu').click());
    await p.waitForTimeout(500);
    const t4 = await p.evaluate(() => ({ ecran: state.screen, mot: (document.querySelector('.mini-toast.show') || {}).textContent || '' }));
    dit('relancer dans les cinq secondes : la manette l\'explique, pas de salon', t4.ecran === 'groupe' && /Attends \d+ s/.test(t4.mot), JSON.stringify(t4));

    /* ---- 5 ---- */
    await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds' where genre = 'partie'");
    const vieille = (await m.rpc(A, 'envoyer_message', { p_groupe: g.id, p_texte: '', p_genre: 'partie', p_donnees: { code: 'ZZZZ' } })).data;
    await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds' where genre = 'partie'");
    await p.evaluate(() => { net.partieLancee = 0; });
    await p.evaluate(() => document.querySelector('.compo-jeu').click());
    const ok5 = await attendre(p, () => !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    const etat5 = await parties();
    dit('une partie restée ouverte d\'une session d\'avant est close d\'office, la nouvelle part', ok5 && new RegExp(vieille.id + ':fermee').test(etat5) && /ouverte$/.test(etat5), etat5);

    /* ---- 6 ---- */
    await m.sql("update public.messages set cree_le = cree_le - interval '3 seconds'");
    const deux = (await m.rpc(A, 'envoyer_message', { p_groupe: g.id, p_texte: '', p_genre: 'partie', p_donnees: { code: 'YYYY' } })).data;
    dit('le serveur refuse une 2e partie ouverte', deux && deux.erreur === 'partie_en_cours', JSON.stringify(deux));
    await p.evaluate(() => document.querySelector('.app-header [onclick*="leaveRoomToOnline"]').click());
    await attendre(p, () => state.screen === 'groupe', null, 6000);
    let close = false; for (let i = 0; i < 20 && !close; i++) { await p.waitForTimeout(250); close = !/ouverte/.test(await parties()); }
    /* LA DERNIÈRE PARTIE DATE DE DEUX SECONDES, posé en absolu. Reculer
       toutes les dates « de deux secondes de plus » s'ajoutait aux reculs
       d'avant et au temps que le banc met à arriver ici : la dernière partie
       avait en fait plus de cinq secondes, et le serveur acceptait — à raison.
       Le banc mesurait sa propre lenteur, pas la règle. */
    await m.sql("update public.messages set cree_le = now() - interval '2 seconds' where id = (select max(id) from public.messages where genre = 'partie')");
    const rafale = (await m.rpc(A, 'envoyer_message', { p_groupe: g.id, p_texte: '', p_genre: 'partie', p_donnees: { code: 'XXXX' } })).data;
    dit('… et une partie relancée en rafale, même fermée l\'autre', rafale && rafale.erreur === 'parties_trop_vite', JSON.stringify(rafale));
    dit('aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la manette lance tout de suite, une partie à la fois');
  process.exit(ko ? 1 : 0);
})();
