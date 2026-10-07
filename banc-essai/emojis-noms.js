/* ====== LES EMOJIS DANS LES NOMS (v312) ======
   « Fais en sorte que les noms de groupe prennent en compte les emojis. »
   Le serveur les gardait (vrai PostgreSQL, relus à l'identique) ; le jeu, lui,
   prenait l'initiale des pastilles avec charAt(0) — la MOITIÉ d'un emoji, un
   signe cassé. Le décor de groupes.js, un téléphone :
     1. des groupes nommés « 🔥 Les amis 🙏 », « 🇫🇷 Les Français »,
        « 👨‍👩‍👧 Famille » : la liste les montre entiers, et leur pastille
        porte l'emoji ENTIER (le drapeau, la famille), jamais un demi-signe ;
     2. la discussion, son en-tête et la feuille d'infos aussi ;
     3. en créant un groupe, la pastille suit le nom au fil de la frappe ;
     4. « 🔥🔥 » est refusé tout de suite (deux signes ne font pas un nom),
        « 🙏🙏🙏 » est accepté ;
     5. au mode Groupe, un joueur « 😊 Sam » a l'emoji pour jeton ;
     6. un pseudo à emoji garde son emoji sur l'avatar ;
     7. aucune erreur.
   Usage : node banc-essai/emojis-noms.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };
/* Un demi-emoji : une moitié de paire UTF-16 restée seule. */
const casse = (s) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|�/.test(s || '');

(async () => {
  const m = await monter(8322, 5508);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    await m.compte(A, 'taylor@essai');
    await m.rpc(A, 'poser_profil', { p_nom: 'Taylor', p_couleur: '#4C86E8' });
    await m.rpc(A, 'accepter_regles', { p_version: 1, p_age_ok: true });
    await m.ouvrir(true);
    const noms = ['🔥 Les amis 🙏', '🇫🇷 Les Français', '👨‍👩‍👧 Famille'];
    for (const nom of noms) await m.rpc(A, 'creer_groupe', { p_nom: nom, p_description: 'Avec des emojis 😊', p_ouvert: false, p_langue: 'fr', p_teinte: 3 });
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);

    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript((moi) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: '🙂 Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
    }, A);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });

    /* ---- 6. l'avatar du profil ---- */
    const av = await p.evaluate(() => (document.querySelector('.hero-profile .avatar') || {}).textContent || '');
    dit('l\'avatar d\'un pseudo à emoji porte l\'emoji entier', av.trim() === '🙂' && !casse(av), JSON.stringify(av));

    /* ---- 1. la liste ---- */
    await p.evaluate(() => allerOnglet('groupes'));
    await attendre(p, () => document.querySelectorAll('#grpMes .grp-ligne').length >= 3, null, 9000);
    const liste = await p.evaluate(() => [...document.querySelectorAll('#grpMes .grp-ligne')].map(l => ({ nom: (l.querySelector('b') || {}).textContent || '', av: (l.querySelector('.grp-av') || {}).textContent || '' })));
    for (const nom of noms) {
      const l = liste.find(x => x.nom.indexOf(nom) >= 0);
      const attendu = nom === '🔥 Les amis 🙏' ? '🔥' : (nom === '🇫🇷 Les Français' ? '🇫🇷' : '👨‍👩‍👧');
      dit('« ' + nom + ' » : nom entier, et la pastille porte ' + attendu, !!l && l.av === attendu && !casse(l.av) && !casse(l.nom), JSON.stringify(l));
    }

    /* ---- 2. la discussion ---- */
    const g = await p.evaluate(() => (grp.liste.find(x => /Famille/.test(x.nom)) || {}).id);
    await p.evaluate((id) => ouvrirGroupe(id), g);
    await attendre(p, () => state.screen === 'groupe', null, 6000);
    await p.waitForTimeout(700);
    const tete = await p.evaluate(() => { const t = document.querySelector('.grp-fil-tete'); return { txt: t ? t.textContent : '', av: (t && t.querySelector('.grp-av') || {}).textContent || '' }; });
    dit('l\'en-tête de la discussion : nom et pastille entiers', /👨‍👩‍👧 Famille/.test(tete.txt) && tete.av === '👨‍👩‍👧' && !casse(tete.txt), JSON.stringify(tete));
    await p.evaluate(() => ouvrirInfosGroupe());
    await attendre(p, () => !!document.querySelector('#grpInfosVeil .grp-av'), null, 5000);
    const infos = await p.evaluate(() => { const v = document.getElementById('grpInfosVeil'); return { txt: v.textContent, av: (v.querySelector('.grp-av') || {}).textContent || '' }; });
    dit('la feuille d\'infos aussi', /👨‍👩‍👧 Famille/.test(infos.txt) && infos.av === '👨‍👩‍👧' && !casse(infos.txt), JSON.stringify(infos.av));
    await p.evaluate(() => fermerFeuilleGroupe('grpInfosVeil'));
    await p.waitForTimeout(500);
    await p.evaluate(() => retourGroupes());
    await p.waitForTimeout(700);

    /* ---- 3 et 4. créer ---- */
    await p.evaluate(() => ouvrirCreation());
    await attendre(p, () => !!document.getElementById('grpNom'), null, 5000);
    await p.fill('#grpNom', '🎉 La fête');
    await p.evaluate(() => majPastilleFormulaire());
    const fa = await p.evaluate(() => (document.getElementById('grpFormAv') || {}).textContent || '');
    dit('en créant, la pastille suit le nom : 🎉', fa === '🎉' && !casse(fa), JSON.stringify(fa));
    await p.fill('#grpNom', '🔥🔥');
    await p.evaluate(() => document.querySelector('#grpCreerVeil .btn-primary').click());
    await p.waitForTimeout(600);
    const refus = await p.evaluate(() => (document.querySelector('#grpCreerVeil .grp-mot') || {}).textContent || '');
    const avant = await m.sql("select count(*) from public.groupes");
    dit('« 🔥🔥 » est refusé tout de suite, sans aller au serveur', /entre 3 et 40/.test(refus) && avant === '3', refus + ' / groupes ' + avant);
    await p.fill('#grpNom', '🙏🙏🙏');
    await p.evaluate(() => document.querySelector('#grpCreerVeil .btn-primary').click());
    const cree = await (async () => { for (let i = 0; i < 40; i++) { if ((await m.sql("select count(*) from public.groupes where nom = '🙏🙏🙏'")) === '1') return true; await p.waitForTimeout(200); } return false; })();
    dit('« 🙏🙏🙏 » est accepté, et relu à l\'identique', cree);
    await p.waitForTimeout(1200);
    await p.evaluate(() => { document.querySelectorAll('.sheet-veil').forEach(v => { try { fermerFeuilleGroupe(v.id); } catch (e) {} }); });
    await p.waitForTimeout(600);

    /* ---- 5. le mode Groupe ---- */
    await p.evaluate(() => { state.screen = 'mode'; render(); state.teams = [{ name: '😊 Sam' }, { name: 'Léa' }]; selectMode('group'); });
    await p.waitForTimeout(1200);
    const jetons = await p.evaluate(() => [...document.querySelectorAll('#teamCard .team-token')].map(t => t.textContent));
    dit('au mode Groupe, « 😊 Sam » a l\'emoji pour jeton', jetons[0] === '😊' && jetons[1] === 'L' && !jetons.some(casse), JSON.stringify(jetons));

    dit('aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await ctx.close();
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — les emojis passent entiers, partout');
  process.exit(ko ? 1 : 0);
})();
