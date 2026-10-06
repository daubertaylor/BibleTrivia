/* ====== LES MESSAGES RESTENT (v311) ======
   « Lorsque je relance le jeu, mon message doit rester. » « Les données de
     message s'effacent lorsque je change de langue. » « Lorsque je supprime
     un message, il doit rester définitivement supprimé. » « Lorsque je ferme
     ou que je rouvre une page, le bas doit rester sur les messages. »
   Le décor de groupes.js — un VRAI PostgreSQL —, un téléphone, et :
     1. Taylor supprime un message : il disparaît du fil, sans bulle « Message
        supprimé », et l'aperçu de la liste reprend le message d'avant ;
     2. Taylor commence un message sans l'envoyer ;
     3. Taylor change de langue : le jeu redémarre ;
     4. LE RÉSEAU EST LENT (2,5 s par réponse) : la liste des groupes et la
        discussion sont là quand même, tout de suite, depuis ce téléphone —
        sans le message supprimé, avec le brouillon dans le champ, et le fil
        posé en bas dès la première image ;
     5. le serveur répond : rien ne bouge, rien ne revient ;
     6. Taylor se déconnecte : la mémoire de ce téléphone est vide.
   Usage : node banc-essai/memoire-groupes.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'bbbbbbbb-0000-4000-8000-0000000000b2';

let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8292, 5478);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    await m.compte(A, 'taylor@essai'); await m.compte(B, 'benoit@essai');
    for (const [id, nom] of [[A, 'Taylor'], [B, 'Benoît']]) {
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.moderateur(A); await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis du jeudi', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    for (const [qui, t] of [[A, 'Un'], [A, 'Deux, à effacer'], [B, 'Salut à tous'], [A, 'Trois']]) {
      await m.rpc(qui, 'envoyer_message', { p_groupe: g.id, p_texte: t, p_genre: 'texte', p_donnees: null });
      await m.sql("update public.messages set cree_le = cree_le - interval '3 seconds'");
    }
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);

    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript((moi) => {
      if (!localStorage.getItem('bt_profile')) localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      if (!sessionStorage.getItem('essai_sorti')) { localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1'); }
    }, A);
    const accueil = () => p.waitForFunction(() => { try { return state.screen === 'mode' && compteConnecte() && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.goto(m.url);
    await accueil();

    /* ---- 1. supprimer un message ---- */
    await p.evaluate(() => allerOnglet('groupes'));
    await attendre(p, () => !!document.querySelector('#grpMes .grp-ligne'), null, 9000);
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(p, () => [...document.querySelectorAll('.b-bulle')].some(b => /Trois/.test(b.textContent)), null, 9000);
    await p.waitForTimeout(700);
    await p.evaluate(() => [...document.querySelectorAll('.b-moi .b-bulle')].find(b => /Deux/.test(b.textContent)).click());
    await p.waitForTimeout(500);
    await p.evaluate(() => [...document.querySelectorAll('#grpActionsVeil .grp-act-l')].find(x => /Supprimer/.test(x.textContent)).click());
    await p.waitForTimeout(400);
    await p.evaluate(() => document.getElementById('modalOk').click());
    dit('Taylor supprime « Deux » : il disparaît du fil', await attendre(p, () => ![...document.querySelectorAll('#fil .b-bulle')].some(b => /Deux/.test(b.textContent)), null, 6000));
    dit('… sans laisser de bulle « Message supprimé »', await p.evaluate(() => !/Message supprimé/.test(document.getElementById('fil').textContent)));
    await m.rpc(A, 'envoyer_message', { p_groupe: g.id, p_texte: 'Quatre', p_genre: 'texte', p_donnees: null });
    await attendre(p, () => [...document.querySelectorAll('.b-bulle')].some(b => /Quatre/.test(b.textContent)), null, 8000);
    await p.evaluate(() => [...document.querySelectorAll('.b-moi .b-bulle')].find(b => /Quatre/.test(b.textContent)).click());
    await p.waitForTimeout(500);
    await p.evaluate(() => [...document.querySelectorAll('#grpActionsVeil .grp-act-l')].find(x => /Supprimer/.test(x.textContent)).click());
    await p.waitForTimeout(400);
    await p.evaluate(() => document.getElementById('modalOk').click());
    await attendre(p, () => ![...document.querySelectorAll('#fil .b-bulle')].some(b => /Quatre/.test(b.textContent)), null, 6000);
    await p.waitForTimeout(1200);
    await p.evaluate(() => retourGroupes());
    dit('le dernier message supprimé : l\'aperçu reprend celui d\'avant', await attendre(p, () => {
      const l = document.querySelector('#grpMes .grp-ligne small'); return !!l && /Trois/.test(l.textContent) && !/supprimé/.test(l.textContent); }, null, 8000),
      await p.evaluate(() => (document.querySelector('#grpMes .grp-ligne small') || {}).textContent));

    /* ---- 2. un brouillon ---- */
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(p, () => !!document.getElementById('compoTexte'), null, 6000);
    await p.fill('#compoTexte', 'Un brouillon pas encore envoyé');
    await p.waitForTimeout(900);

    /* ---- 3. changer de langue : le jeu redémarre ---- */
    await p.evaluate(() => { state.screen = 'mode'; render(); setLangue('en'); });
    await p.waitForEvent('load', { timeout: 15000 });
    /* ---- 4. un réseau lent ---- */
    let lent = true;
    await p.route('**/faux/{select,rpc}', async (r) => { if (lent) await new Promise(x => setTimeout(x, 2500)); r.continue(); });
    await p.waitForFunction(() => { try { return state.screen === 'mode' && compteConnecte(); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(300);
    await p.evaluate(() => allerOnglet('groupes'));
    const t0 = Date.now();
    const liste = await attendre(p, () => !!document.querySelector('#grpMes .grp-ligne'), null, 1500);
    dit('après le redémarrage, réseau lent : la liste des groupes est là tout de suite', liste, (Date.now() - t0) + ' ms');
    const ouvre = await p.evaluate((id) => new Promise(res => {
      ouvrirGroupe(id);
      /* La toute première image après l'ouverture : où en est le fil ? */
      requestAnimationFrame(() => {
        const z = document.getElementById('fil');
        res(z ? { textes: [...z.querySelectorAll('.b-bulle')].map(b => b.textContent.trim()), bas: Math.round(z.scrollHeight - z.scrollTop - z.clientHeight), compo: (document.getElementById('compoTexte') || {}).value || '' } : null);
      });
    }), g.id);
    dit('… la discussion aussi, dès la première image', !!ouvre && ouvre.textes.some(t => /Trois/.test(t)) && ouvre.textes.some(t => /Salut/.test(t)), JSON.stringify(ouvre && ouvre.textes));
    dit('… sans le message supprimé', !!ouvre && !ouvre.textes.some(t => /Deux|Quatre|supprimé|Deleted/.test(t)));
    dit('… posée en bas, sans glisser', !!ouvre && ouvre.bas <= 1, ouvre && ouvre.bas + ' px du bas');
    dit('… et le brouillon dans le champ', !!ouvre && ouvre.compo === 'Un brouillon pas encore envoyé', ouvre && ouvre.compo);

    /* ---- 5. le serveur répond : rien ne revient ---- */
    lent = false;
    await p.waitForTimeout(6000);
    const apres = await p.evaluate(() => [...document.querySelectorAll('#fil .b-bulle')].map(b => b.textContent.trim()));
    dit('le serveur a répondu : rien de supprimé n\'est revenu', !apres.some(t => /Deux|Quatre|supprimé|Deleted/.test(t)) && apres.some(t => /Trois/.test(t)), JSON.stringify(apres));
    dit('… et le brouillon est toujours là', (await p.evaluate(() => document.getElementById('compoTexte').value)) === 'Un brouillon pas encore envoyé');

    /* ---- 6. se déconnecter vide la mémoire ---- */
    await p.evaluate(() => { sessionStorage.setItem('essai_sorti', '1'); state.screen = 'mode'; render(); deconnexion(); });
    await p.waitForTimeout(1500);
    const reste = await p.evaluate(() => new Promise(res => {
      const r = indexedDB.open('yada-groupes', 1);
      r.onsuccess = () => {
        const db = r.result, n = {}; let k = 0;
        ['fils', 'meta', 'photos'].forEach(t => {
          const q = db.transaction(t).objectStore(t).count();
          q.onsuccess = () => { n[t] = q.result; if (++k === 3) res({ n, cle: localStorage.getItem('bt_groupes_memoire') }); };
        });
      };
      r.onerror = () => res(null);
    }));
    dit('se déconnecter : plus rien des groupes sur ce téléphone', !!reste && !reste.n.fils && !reste.n.meta && !reste.n.photos && !reste.cle, JSON.stringify(reste));
    dit('aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — les messages restent, les supprimés ne reviennent pas');
  process.exit(ko ? 1 : 0);
})();
