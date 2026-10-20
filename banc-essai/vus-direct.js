/* ====== BANC « VU », TOUT DE SUITE (v332) ======
   « Si quelqu'un voit ton message, je veux que tu sois informé quasiment
     instantanément qu'il a vu ton message. » Les coches suivaient la relève
   de la discussion (10 s). Le décor de groupes.js — un VRAI PostgreSQL.
   Taylor (iPhone) écrit ; Benoît (Android) et Chloé lisent.
     1. Benoît a la discussion ouverte : le message de Taylor est vu chez
        Taylor en moins de 1,5 s (deux coches) ;
     2. Chloé ouvre la discussion plus tard : « vu par tout le monde » chez
        Taylor en moins de 1,5 s ;
     3. le signal n'est qu'un signal : un « lu » inventé ne fait rien passer
        à « vu » (Taylor relit le serveur, qui dit la vérité) ;
     4. Taylor hors de la discussion ne relit rien (pas de requête pour
        rien) ;
     5. aucune erreur.
   Usage : node banc-essai/vus-direct.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a6', B = 'bbbbbbbb-0000-4000-8000-0000000000b6', C = 'cccccccc-0000-4000-8000-0000000000c6';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8484, 5686);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 3 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'; update public.membres set rejoint_le = rejoint_le - interval '1 minute'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 30 }).then(() => true).catch(() => false);
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
    const ouvrir = async (p) => { await p.evaluate((id) => ouvrirGroupe(id), g.id); return attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000); };
    const sorte = (p, id) => p.evaluate((id) => { const v = document.querySelector('#fil .b-moi .b-heure[data-der="' + id + '"] .b-vu'); return v ? ['envoye', 'certains', 'tous'].find(k => v.classList.contains(k)) : null; }, id);
    const devient = (p, id, s, ms) => attendre(p, ([id, s]) => { const v = document.querySelector('#fil .b-moi .b-heure[data-der="' + id + '"] .b-vu'); return !!v && v.classList.contains(s); }, [id, s], ms);

    const { p: pa } = await telephone(A, 'Taylor', '#4C86E8', IOS);
    const { p: pb } = await telephone(B, 'Benoît', '#E8734C', AND);
    await ouvrir(pa); await ouvrir(pb);
    await pa.waitForTimeout(1200);
    /* Les relèves de Taylor ne comptent pas : on mesure le chemin direct. */
    await pa.evaluate(() => { window.__relectures = 0; const vrai = relireLus; relireLus = function(){ window.__relectures++; return vrai.apply(this, arguments); }; });

    /* 1 */
    await m.sql("update public.messages set cree_le = cree_le - interval '5 seconds'");
    await pa.evaluate(() => { const z = document.getElementById('compoTexte'); z.value = 'Vous êtes là ?'; surSaisie(z); envoyerMessageGroupe(); });
    await attendre(pa, () => [...document.querySelectorAll('#fil .b-moi .b-heure[data-der]')].some(h => +h.getAttribute('data-der') > 0), null, 6000);
    const id1 = +(await m.sql("select max(id) from public.messages where texte = 'Vous êtes là ?'"));
    let t0 = Date.now();
    const vu1 = await devient(pa, id1, 'certains', 6000);
    const d1 = Date.now() - t0;
    dit('1. Benoît a la discussion ouverte : vu chez Taylor en moins de 1,5 s', vu1 && d1 < 1500, d1 + ' ms · ' + await sorte(pa, id1));

    /* 2 */
    const { p: pc } = await telephone(C, 'Chloé', '#7BC86B', AND);
    t0 = Date.now();
    await ouvrir(pc);
    const vu2 = await devient(pa, id1, 'tous', 6000);
    const d2 = Date.now() - t0;
    dit('2. Chloé ouvre la discussion : « vu par tout le monde » chez Taylor en moins de 1,5 s', vu2 && d2 < 1500, d2 + ' ms (ouverture comprise)');

    /* 3 */
    await m.sql("update public.messages set cree_le = cree_le - interval '5 seconds'");
    await pc.evaluate(() => retourGroupes());
    await pb.evaluate(() => retourGroupes());
    await pa.waitForTimeout(500);
    await pa.evaluate(() => { const z = document.getElementById('compoTexte'); z.value = 'Et maintenant ?'; surSaisie(z); envoyerMessageGroupe(); });
    await pa.waitForTimeout(800);
    const id3 = +(await m.sql("select max(id) from public.messages where texte = 'Et maintenant ?'"));
    await pb.evaluate((gid) => signalerLu(gid), g.id);          // un « lu » sans avoir rien lu
    await pa.waitForTimeout(1200);
    const s3 = await sorte(pa, id3);
    dit('3. un « lu » inventé ne fait rien passer à « vu » (le serveur dit la vérité)', s3 === 'envoye', s3);

    /* 4 */
    await pa.evaluate(() => retourGroupes());
    await pa.waitForTimeout(400);
    const avant = await pa.evaluate(() => window.__relectures);
    await pb.evaluate((gid) => signalerLu(gid), g.id);
    await pa.waitForTimeout(1000);
    const apres = await pa.evaluate(() => window.__relectures);
    dit('4. Taylor hors de la discussion ne relit rien', apres === avant, avant + ' → ' + apres);

    dit('5. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — « Vu » arrive dans la seconde où l\'autre lit' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
