/* ====== BANC « LA SOURDINE ET LA PAROLE RENDUE, TOUT DE SUITE » (v331) ======
   « Lorsque je mets quelqu'un en sourdine et que je lui rends la parole, ça
     doit être instantané pour qu'il puisse avoir la parole. » Une sourdine ne
   s'annonce pas dans la discussion : le téléphone de la personne ne
   l'apprenait qu'en rouvrant le groupe. Le décor de groupes.js — un VRAI
   PostgreSQL, les vraies règles. Taylor (iPhone) est propriétaire du groupe ;
   Benoît (Android) a la discussion ouverte, un message à moitié écrit.
     1. Taylor met Benoît en sourdine : la barre d'écriture de Benoît le dit
        en moins de 2 s ;
     2. Taylor lui rend la parole : la barre revient en moins de 2 s, avec ce
        qu'il avait commencé d'écrire ;
     3. Benoît écrit : le message part ;
     4. une sourdine qui finit à son heure : la barre revient d'elle-même ;
     5. Taylor le nomme admin : les infos du groupe, ouvertes chez Benoît,
        lui proposent aussitôt « Modifier le groupe » ;
     6. un signal inventé (« retiré », alors que non) : Benoît reste dans la
        discussion, rien ne change ;
     7. un signal perdu en route : la relève de la discussion rattrape la
        sourdine, puis la parole rendue (10 s au plus) ;
     8. Taylor le retire du groupe : Benoît revient à ses groupes, « Tu ne
        fais plus partie de ce groupe. », le groupe a quitté sa liste ;
     9. aucune erreur.
   Usage : node banc-essai/sourdine-direct.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000e1', B = 'bbbbbbbb-0000-4000-8000-0000000000e2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8488, 5690);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'; update public.membres set rejoint_le = rejoint_le - interval '1 minute'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua) => {
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
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
    const ouvrir = async (p) => { await p.evaluate((id) => ouvrirGroupe(id), g.id); return attendre(p, () => state.screen === 'groupe' && !!document.querySelector('#compo .compo-in'), null, 9000); };
    /* Le canal personnel de Benoît est ouvert (sinon un signal partirait dans le vide). */
    const persoPret = (p) => attendre(p, () => !!persoCanal && persoCanal.state === 'joined', null, 8000);
    const barre = (p) => p.evaluate(() => { const c = document.querySelector('#compo .compo-in'); if (!c) return null;
      const t = document.getElementById('compoTexte'), mu = c.querySelector('.compo-muet');
      return { muet: mu ? mu.textContent.trim() : null, texte: t ? t.value : null }; });
    /* Taylor agit comme depuis la page d'un membre : le vrai chemin du jeu. */
    const agir = (action) => pa.evaluate(([qui, a]) => modererMembre(qui, a), [B, action]);

    const { p: pa } = await telephone(A, 'Taylor', '#4C86E8', IOS);
    const { p: pb } = await telephone(B, 'Benoît', '#E8734C', AND);
    await ouvrir(pa); await ouvrir(pb);
    await persoPret(pb);
    await pa.waitForFunction(() => (grp.membres[grp.courant] || []).length === 2, null, { timeout: 8000 }).catch(() => {});
    await pb.locator('#compoTexte').tap();
    await pb.keyboard.type('Je voulais dire');
    await pb.waitForTimeout(300);

    /* 1 */
    let t0 = Date.now();
    await agir('muet');
    const muet = await attendre(pb, () => { const c = document.querySelector('#compo .compo-muet'); return !!c && /sourdine jusqu/.test(c.textContent); }, null, 6000);
    const d1 = Date.now() - t0;
    const b1 = await barre(pb);
    dit('1. Taylor met Benoît en sourdine : sa barre le dit en moins de 2 s', muet && d1 < 2000, d1 + ' ms · ' + JSON.stringify(b1));

    /* 2 */
    await pb.waitForTimeout(700);    // (une rafale se relit une fois toutes les 600 ms)
    t0 = Date.now();
    await agir('parler');
    const parle = await attendre(pb, () => !!document.getElementById('compoTexte') && !document.querySelector('#compo .compo-muet'), null, 6000);
    const d2 = Date.now() - t0;
    const b2 = await barre(pb);
    dit('2. Taylor lui rend la parole : la barre revient en moins de 2 s', parle && d2 < 2000, d2 + ' ms');
    dit('   avec ce qu\'il avait commencé d\'écrire', b2 && b2.texte === 'Je voulais dire', JSON.stringify(b2));

    /* 3 */
    await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
    await pb.evaluate(() => { const z = document.getElementById('compoTexte'); z.value = 'Je voulais dire merci'; surSaisie(z); envoyerMessageGroupe(); });
    const parti = await attendre(pb, () => [...document.querySelectorAll('#fil .b-moi [data-m]')].some(b => +b.getAttribute('data-m') > 0 && /merci/.test(b.textContent)), null, 6000);
    dit('3. Benoît écrit : le message part', parti && (await m.sql("select count(*) from public.messages where texte = 'Je voulais dire merci'")) === '1');

    /* 4 — une sourdine de quelques secondes (posée au serveur, signalée comme le fait le jeu). */
    await pb.waitForTimeout(700);
    await m.sql(`update public.membres set muet_jusqu = now() + interval '3 seconds' where groupe = '${g.id}' and membre = '${B}'`);
    await pa.evaluate(([qui, gid]) => signalerMembre(qui, gid, 'muet'), [B, g.id]);
    const muet4 = await attendre(pb, () => !!document.querySelector('#compo .compo-muet'), null, 3000);
    const revient = muet4 && await attendre(pb, () => !!document.getElementById('compoTexte') && !document.querySelector('#compo .compo-muet'), null, 6000);
    dit('4. une sourdine qui finit à son heure : la barre revient d\'elle-même', muet4 && revient, 'sourdine vue ' + muet4 + ' · revenue ' + revient);

    /* 5 */
    await pb.waitForTimeout(700);
    await pb.evaluate(() => ouvrirInfosGroupe());
    await attendre(pb, () => !!document.querySelector('#grpInfosVeil .grp-liste-act'), null, 4000);
    await pb.waitForTimeout(500);
    const avant5 = await pb.evaluate(() => /Modifier le groupe/.test((document.getElementById('grpInfosVeil') || {}).textContent || ''));
    t0 = Date.now();
    await agir('promouvoir');
    const admin = await attendre(pb, () => { const v = document.getElementById('grpInfosVeil'); return !!v && !v.classList.contains('closing') && /Modifier le groupe/.test(v.textContent); }, null, 6000);
    dit('5. nommé admin : ses infos ouvertes lui proposent aussitôt « Modifier le groupe »', !avant5 && admin && Date.now() - t0 < 2500, (Date.now() - t0) + ' ms · avant ' + avant5);
    await pb.evaluate(() => fermerFeuilleGroupe('grpInfosVeil'));
    await pb.waitForTimeout(700);

    /* 6 — n'importe qui peut écrire sur le canal de Benoît : rien d'autre qu'une relecture. */
    await pa.evaluate(([qui, gid]) => signalerMembre(qui, gid, 'exclure'), [B, g.id]);
    await pb.waitForTimeout(1500);
    const e6 = await pb.evaluate((gid) => ({ ecran: state.screen, courant: grp.courant, liste: (grp.liste || []).some(x => x.id === gid), barre: !!document.getElementById('compoTexte') }), g.id);
    dit('6. un signal inventé (« retiré », alors que non) : Benoît reste dans la discussion', e6.ecran === 'groupe' && e6.courant === g.id && e6.liste && e6.barre, JSON.stringify(e6));

    /* 7 — aucun signal : le serveur change, et c'est tout. */
    await m.sql(`update public.membres set muet_jusqu = now() + interval '1 hour' where groupe = '${g.id}' and membre = '${B}'`);
    t0 = Date.now();
    const rattrape = await attendre(pb, () => !!document.querySelector('#compo .compo-muet'), null, 12500);
    const d7 = Date.now() - t0;
    await m.sql(`update public.membres set muet_jusqu = null where groupe = '${g.id}' and membre = '${B}'`);
    t0 = Date.now();
    const rendue = await attendre(pb, () => !!document.getElementById('compoTexte') && !document.querySelector('#compo .compo-muet'), null, 12500);
    dit('7. un signal perdu en route : la relève rattrape la sourdine, puis la parole rendue', rattrape && rendue, d7 + ' ms · ' + (Date.now() - t0) + ' ms');

    /* 8 */
    await pb.waitForTimeout(700);
    await agir('exclure');
    await attendre(pa, () => !!document.getElementById('modalOk'), null, 3000);
    await pa.locator('#modalOk').tap();
    const sorti = await attendre(pb, (gid) => state.screen === 'groupes' && !(grp.liste || []).some(x => x.id === gid), g.id, 6000);
    const mot = await attendre(pb, () => { const t = document.querySelector('.mini-toast'); return !!t && /Tu ne fais plus partie de ce groupe/.test(t.textContent); }, null, 2000);
    dit('8. retiré : Benoît revient à ses groupes, le groupe a quitté sa liste', sorti, await pb.evaluate(() => state.screen));
    dit('   « Tu ne fais plus partie de ce groupe. »', mot);

    dit('9. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — sourdine, parole rendue, rôle, retrait : le téléphone de la personne le sait dans la seconde' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
