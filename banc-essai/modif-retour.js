/* ====== BANC « MODIFIER LE GROUPE » : REVENIR, C'EST REVENIR AUX INFOS (v323) ======
   « Lorsque je suis dans la modification de groupe, si je reviens en arrière
     en glissant mon doigt sur le côté, je veux que ça revienne à l'écran
     précédent, pas au groupe directement. »
   Un vrai PostgreSQL derrière un faux Supabase (le décor de groupes.js), un
   téléphone, de vrais doigts (événements tactiles) :
     1. les infos du groupe → « Modifier le groupe » : la page des infos reste
        ouverte DESSOUS (elle recule), elle ne se ferme pas ;
     2. glisser depuis le bord gauche referme la modification et ramène les
        infos au premier plan — pas la discussion ;
     3. la flèche retour fait de même ;
     4. « Enregistrer » ramène aussi aux infos, À JOUR : le nouveau nom, la
        nouvelle description et le nouveau logo y sont, comme dans l'en-tête
        de la discussion ;
     5. aucune erreur.
   Usage : node banc-essai/modif-retour.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 240) + ')' : '')); };
(async () => {
  const m = await monter(8452, 5652);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    await m.compte(A, 'taylor@essai');
    await m.rpc(A, 'poser_profil', { p_nom: 'Taylor', p_couleur: '#4C86E8' });
    await m.rpc(A, 'accepter_regles', { p_version: 1, p_age_ok: true });
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: 'Avant', p_ouvert: false, p_langue: 'fr', p_teinte: 2, p_logo: 0 })).data;
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript((moi) => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1'); }, A);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && grp.etat && grp.etat.participe === 'ok'; } catch (e) { return false; } }, null, { timeout: 25000 });
    const cdp = await ctx.newCDPSession(p);
    const doigt = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const glisserDuBord = async () => { await doigt('touchStart', 6, 420); for (let i = 1; i <= 12; i++) { await doigt('touchMove', 6 + i * 18, 422); await p.waitForTimeout(16); } await doigt('touchEnd'); await p.waitForTimeout(900); };
    const etat = () => p.evaluate(() => {
      const v = (id) => { const x = document.getElementById(id); return x ? (x.classList.contains('closing') ? 'part' : (x.querySelector('.settings-sheet.feuille-recule') ? 'recule' : 'devant')) : 'absente'; };
      return { infos: v('grpInfosVeil'), modif: v('grpModifVeil'), ecran: state.screen };
    });
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await p.waitForFunction(() => state.screen === 'groupe', null, { timeout: 8000 });
    await p.waitForTimeout(800);
    await p.evaluate(() => ouvrirInfosGroupe());
    await p.waitForTimeout(800);

    /* 1. Modifier : les infos restent dessous */
    await p.tap('#grpInfosVeil .grp-act-l');           // la première ligne : « Modifier le groupe »
    await p.waitForTimeout(900);
    let e = await etat();
    dit('« Modifier le groupe » s\'ouvre par-dessus les infos, qui reculent sans se fermer', e.modif === 'devant' && e.infos === 'recule', JSON.stringify(e));

    /* 2. le doigt depuis le bord gauche */
    await glisserDuBord();
    e = await etat();
    dit('glisser depuis le bord ramène aux infos, pas à la discussion', e.modif === 'absente' && e.infos === 'devant' && e.ecran === 'groupe', JSON.stringify(e));

    /* 3. la flèche retour */
    await p.tap('#grpInfosVeil .grp-act-l');
    await p.waitForTimeout(900);
    await p.tap('#grpModifVeil .page-tete .sheet-grab');
    await p.waitForTimeout(900);
    e = await etat();
    dit('la flèche retour ramène aussi aux infos', e.modif === 'absente' && e.infos === 'devant', JSON.stringify(e));

    /* 4. Enregistrer : retour aux infos, à jour */
    await p.tap('#grpInfosVeil .grp-act-l');
    await p.waitForTimeout(900);
    await p.fill('#grpNom', 'Les amis du jeudi');
    await p.fill('#grpDesc', 'Après');
    await p.evaluate(() => choisirLogoGroupe(3));
    await p.waitForTimeout(500);
    await p.tap('#grpModifVeil .btn-primary');
    const fait = await (async () => { for (let i = 0; i < 40; i++) { if ((await m.sql("select nom || '/' || description || '/' || logo from public.groupes where id = '" + g.id + "'")) === 'Les amis du jeudi/Après/3') return true; await p.waitForTimeout(150); } return false; })();
    await p.waitForTimeout(900);
    e = await etat();
    const infos = await p.evaluate(() => { const v = document.getElementById('grpInfosVeil'); if (!v) return null; const av = v.querySelector('.sheet-title .grp-av');
      return { titre: (v.querySelector('.sheet-title .st-mot') || {}).textContent, desc: (v.querySelector('.grp-desc') || {}).textContent, logo: !!(av && av.classList.contains('a-logo') && av.querySelector('svg')),
               tete: (document.querySelector('#grpTete b') || {}).textContent }; });
    dit('« Enregistrer » enregistre, et ramène aux infos', fait && e.modif === 'absente' && e.infos === 'devant', JSON.stringify(e));
    dit('… à jour : le nouveau nom, la nouvelle description, le logo, et l\'en-tête de la discussion', infos && infos.titre === 'Les amis du jeudi' && infos.desc === 'Après' && infos.logo && infos.tete === 'Les amis du jeudi', JSON.stringify(infos));
    dit('aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await ctx.close();
  } catch (e) { console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++; }
  finally { await nav.close().catch(() => {}); await m.arreter().catch(() => {}); }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — revenir de « Modifier le groupe » ramène aux infos, au doigt comme à la flèche');
  process.exit(ko ? 1 : 0);
})();
