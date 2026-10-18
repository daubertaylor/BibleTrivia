/* ====== BANC « TOUTES LES MENTIONS MARCHENT, MÊME TAPÉES À LA MAIN » (v328) ======
   « Il faut que toutes les mentions avec le @ et le nom d'une personne
     marchent parfaitement. » Le décor de groupes.js — un VRAI PostgreSQL,
   les vraies règles. Taylor (iPhone) écrit ; Benoît et Jean Paul lisent.
   La liste des membres arrive LENTEMENT au téléphone de Taylor (1,5 s), comme
   sur un réseau mobile, pour éprouver les premières secondes.
   CE QU'IL EXIGE :
     1. un « @ » tapé avant que les membres soient là : la liste des noms se
        propose dès leur arrivée, sans retaper ;
     2. une mention envoyée dans la première seconde (« @Benoît », membres
        pas encore arrivés) : le serveur la garde quand même ;
     3. tapée à la main, sans accent ni majuscule (« @benoit ») : le serveur
        la garde ; « @JEAN PAUL » (deux mots, majuscules) aussi ;
     4. chez Benoît : la bulle tapée « @benoit » le nomme (fond doré), le nom
        en gras ;
     5. aucune erreur.
   Usage : node banc-essai/mentions-plus.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000f8', B = 'bbbbbbbb-0000-4000-8000-0000000000f8', C = 'cccccccc-0000-4000-8000-0000000000f8';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8492, 5692);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'jp@essai', 'Jean Paul', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les mentions', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 1 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.sql("update public.messages set cree_le = cree_le - interval '5 seconds'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 100 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua, lent) => {
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      if (lent) await p.route('**/faux/select', async (route) => {
        const b = JSON.parse(route.request().postData() || '{}');
        if (b.table === 'membres') await new Promise(r => setTimeout(r, 1500));
        return route.continue();
      });
      await p.addInitScript(([moi, n, c]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [id, nom, couleur]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => allerOnglet('groupes'));
      await attendre(p, () => !!document.querySelector('#grpMes .grp-ligne'), null, 9000);
      return p;
    };
    const dernier = async () => JSON.parse(await m.sql("select coalesce((select to_jsonb(x) from (select texte, donnees from public.messages where genre = 'texte' order by id desc limit 1) x), 'null'::jsonb)"));
    const attendreMessage = async (motif) => { for (let i = 0; i < 40; i++) { const x = await dernier(); if (x && motif.test(x.texte)) return x; await new Promise(r => setTimeout(r, 150)); } return dernier(); };
    const pa = await telephone(A, 'Taylor', '#4C86E8', IOS, true);
    const pb = await telephone(B, 'Benoît', '#E8734C', AND, false);

    /* ---- 1 : « @ » avant les membres ---- */
    await pa.evaluate((id) => { grp.membres[id] = undefined; ouvrirGroupe(id); }, g.id);
    await attendre(pa, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    const sansMembres = await pa.evaluate((id) => !grp.membres[id], g.id);
    await pa.locator('#compoTexte').tap();
    await pa.locator('#compoTexte').pressSequentially('@');
    const liste = await attendre(pa, () => { const z = document.getElementById('compoNoms'); return !!z && !z.hidden && z.querySelectorAll('.cn-nom').length >= 2; }, null, 4000);
    const noms = await pa.evaluate(() => [...document.querySelectorAll('#compoNoms .cn-nom b')].map(b => b.textContent));
    dit('1. « @ » tapé avant que les membres soient là : la liste se propose à leur arrivée', sansMembres && liste, (sansMembres ? 'membres absents au toucher' : 'membres DÉJÀ là — le banc ne prouve rien') + ' · ' + noms.join(', '));
    await pa.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = ''; surSaisie(t); });

    /* ---- 2 : envoyée dans la première seconde ---- */
    await pa.evaluate(() => retourGroupes());
    await pa.waitForTimeout(400);
    await pa.evaluate((id) => { grp.membres[id] = undefined; ouvrirGroupe(id); }, g.id);
    await attendre(pa, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    const avant2 = await pa.evaluate((id) => !grp.membres[id], g.id);
    await pa.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = '@Benoît tu viens ?'; surSaisie(t); envoyerMessageGroupe(); });
    let msg = await attendreMessage(/tu viens/);
    dit('2. envoyée avant l\'arrivée des membres : le serveur garde la mention', avant2 && msg && JSON.stringify((msg.donnees || {}).mentions) === JSON.stringify([B]),
      (avant2 ? '' : 'membres déjà là — ') + JSON.stringify(msg));

    /* ---- 3 : tapées à la main ---- */
    await pa.waitForTimeout(1300);
    await pa.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = '@benoit on commence'; surSaisie(t); envoyerMessageGroupe(); });
    msg = await attendreMessage(/on commence/);
    dit('3. « @benoit » (sans accent, sans majuscule) : le serveur garde Benoît', msg && JSON.stringify((msg.donnees || {}).mentions) === JSON.stringify([B]), JSON.stringify(msg));
    await pa.waitForTimeout(1300);
    await pa.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = 'merci @JEAN PAUL et @benoît !'; surSaisie(t); envoyerMessageGroupe(); });
    msg = await attendreMessage(/merci/);
    const ids = ((msg && msg.donnees) || {}).mentions || [];
    dit('   « @JEAN PAUL » (deux mots, majuscules) et « @benoît » : les deux', ids.length === 2 && ids.includes(B) && ids.includes(C), JSON.stringify(msg));

    /* ---- 4 : chez Benoît ---- */
    await pb.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pb, () => state.screen === 'groupe' && [...document.querySelectorAll('#fil .b-eux .b-bulle')].some(b => /on commence/.test(b.textContent)), null, 9000);
    await pb.waitForTimeout(1500);
    const bulle = await pb.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-eux .b-bulle')].find(b => /on commence/.test(b.textContent));
      const x = b && b.querySelector('.mention'); return { nomme: !!b && b.classList.contains('me-nomme'), gras: x ? x.textContent : '' }; });
    dit('4. chez Benoît, « @benoit » le nomme : fond doré, nom en gras', bulle.nomme && bulle.gras === '@benoit', JSON.stringify(bulle));

    dit('5. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — une mention marche dès l\'ouverture, et tapée à la main comme on l\'écrit' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
