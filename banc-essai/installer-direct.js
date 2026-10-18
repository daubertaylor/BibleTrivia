/* ====== BANC « INSTALLER INSTALLE, SANS DÉTOUR » (v328) ======
   « Un bouton dans les Réglages : on clique sur télécharger, et ça ouvre
     directement le truc pour télécharger — iOS et Android. » Et : « Sur un
   Android récent, il m'a dit que le jeu avait été conçu pour les vieux
   téléphones. » (C'est Samsung Internet : il fabrique une application que
   Play Protect juge ancienne ; Chrome installe le même jeu sans un mot.)
   Le téléphone simulé reçoit l'invitation d'installer comme Chrome la donne
   (« beforeinstallprompt ») ; le banc note chaque appel à prompt().
     1. Chrome (Android) : « Installer le jeu » ouvre DIRECTEMENT la fenêtre
        du téléphone — aucune page entre les deux ;
     2. une fois installé (« appinstalled ») : la ligne s'en va, et le jeu le
        dit ;
     3. Samsung Internet : jamais son invitation à lui ; une seule question,
        « Ouvrir dans Chrome », qui ouvre CHROME sur le jeu (intent://, avec
        un retour prévu si Chrome manque) ;
     4. arrivé dans Chrome par ce lien : dès que Chrome dit le jeu
        installable, un bouton « Installer » — qui ouvre la fenêtre du
        téléphone ; l'adresse perd son « ?installer » ;
     5. revenu sans Chrome (?installer=guide) : le guide de Samsung Internet,
        qui dit quoi faire si Android avertit ;
     6. iPhone : Apple ne permet aucun raccourci — le guide le plus court ;
     7. aucune erreur.
   Usage : node banc-essai/installer-direct.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const UA = {
  chrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 15; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
};
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const telephone = async (ua, suffixe, invitationApres) => {
    const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript((apres) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      window.__prompts = 0; window.__liens = [];
      /* Le navigateur dit le jeu installable, comme Chrome : un peu après le
         chargement (« apres » ms), ou jamais (-1). */
      if (apres >= 0) window.addEventListener('load', () => setTimeout(() => {
        const e = new Event('beforeinstallprompt', { cancelable: true });
        e.prompt = () => { window.__prompts++; return Promise.resolve(); };
        e.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
        window.dispatchEvent(e);
      }, apres));
    }, invitationApres);
    await p.goto(URL + (suffixe || ''));
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => { window.ouvrirLien = (u) => { window.__liens.push(u); }; });
    return { ctx, p };
  };
  const modale = (p) => p.evaluate(() => { const c = document.querySelector('.modal-card'); if (!c) return null;
    return { titre: (c.querySelector('h2, .modal-title, b') || {}).textContent || '', texte: c.textContent.replace(/\s+/g, ' ').trim(), ok: (document.getElementById('modalOk') || {}).textContent || '' }; });
  const reglagesPuisInstaller = async (p) => {
    await p.evaluate(() => openSettings());
    await p.waitForTimeout(900);
    const ligne = await p.evaluate(() => !!document.getElementById('setInstaller'));
    if (ligne) await p.locator('#setInstaller').tap();
    await p.waitForTimeout(700);
    return ligne;
  };

  /* ---- 1 & 2 : Chrome ---- */
  let { ctx, p } = await telephone(UA.chrome, '', 300);
  await p.waitForTimeout(600);
  let ligne = await reglagesPuisInstaller(p);
  let md = await modale(p);
  let n = await p.evaluate(() => window.__prompts);
  dire(ligne && n === 1 && !md, '1. Chrome : « Installer le jeu » ouvre directement la fenêtre du téléphone (prompt ×' + n + (md ? ', mais une page s\'interpose : « ' + md.texte.slice(0, 60) + ' »' : ', rien entre les deux') + ')');
  await p.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await p.waitForTimeout(500);
  const apres = await p.evaluate(() => ({ ligne: !!document.getElementById('setInstaller'), mot: (document.querySelector('.mini-toast, #miniToast, .toast') || {}).textContent || '' }));
  dire(!apres.ligne && /install/i.test(apres.mot), '2. installé : la ligne s\'en va, le jeu le dit (« ' + apres.mot.trim() + ' »)');
  await ctx.close();

  /* ---- 3 : Samsung Internet ---- */
  ({ ctx, p } = await telephone(UA.samsung, '', 300));
  await p.waitForTimeout(600);
  ligne = await reglagesPuisInstaller(p);
  md = await modale(p);
  n = await p.evaluate(() => window.__prompts);
  dire(ligne && n === 0 && md && /Chrome/.test(md.ok), '3. Samsung Internet : pas son invitation à lui (prompt ×' + n + '), une question : « ' + (md ? md.ok : '—') + ' »');
  if (md) await p.locator('#modalOk').tap();
  await p.waitForTimeout(400);
  const liens = await p.evaluate(() => window.__liens);
  const l = liens[0] || '';
  dire(/^intent:\/\//.test(l) && /package=com\.android\.chrome/.test(l) && /installer=1/.test(l) && /browser_fallback_url=[^;]*installer%3Dguide/.test(l),
    '   … qui ouvre Chrome sur le jeu, avec un retour prévu sans Chrome (' + l.slice(0, 90) + '…)');
  await ctx.close();

  /* ---- 4 : arrivé dans Chrome par ce lien ---- */
  ({ ctx, p } = await telephone(UA.chrome, '?installer=1', 1500));
  const adresse = await p.evaluate(() => location.search);
  await p.waitForTimeout(2600);
  md = await modale(p);
  if (md) await p.locator('#modalOk').tap();
  await p.waitForTimeout(400);
  n = await p.evaluate(() => window.__prompts);
  dire(md && /Install/.test(md.ok) && n === 1 && !/installer/.test(adresse), '4. arrivé dans Chrome : un bouton « ' + (md ? md.ok : '—') + ' » dès que Chrome est prêt, qui ouvre la fenêtre du téléphone (prompt ×' + n + ') ; adresse « ' + adresse + ' »');
  await ctx.close();

  /* ---- 4 bis : Chrome lent — l'invitation arrive après le guide ---- */
  ({ ctx, p } = await telephone(UA.chrome, '?installer=1', 10500));
  await p.waitForTimeout(8200);
  const guideDabord = await modale(p);
  await p.waitForTimeout(3200);
  md = await modale(p);
  if (md) await p.locator('#modalOk').tap();
  await p.waitForTimeout(400);
  n = await p.evaluate(() => window.__prompts);
  dire(guideDabord && md && /Install/.test(md.ok) && n === 1, '   Chrome lent : sans invitation au bout de 8 s, le guide ; l\'invitation venue, elle le remplace (« ' + (md ? md.ok : '—') + ' », prompt ×' + n + ')');
  await ctx.close();

  /* ---- 5 : revenu sans Chrome ---- */
  ({ ctx, p } = await telephone(UA.samsung, '?installer=guide', -1));
  await p.waitForTimeout(1600);
  md = await modale(p);
  dire(md && /Android avertit|Installer quand même/.test(md.texte), '5. sans Chrome : le guide de Samsung Internet, avec quoi faire si Android avertit (« ' + (md ? md.texte.slice(0, 120) : '—') + ' »)');
  await ctx.close();

  /* ---- 6 : iPhone ---- */
  ({ ctx, p } = await telephone(UA.iphone, '', -1));
  await p.waitForTimeout(600);
  ligne = await reglagesPuisInstaller(p);
  md = await modale(p);
  dire(ligne && md && /•••|Partager|écran d'accueil/.test(md.texte), '6. iPhone : le guide le plus court (« ' + (md ? md.texte.slice(0, 110) : '—') + ' »)');
  await ctx.close();

  dire(!errs.length, '7. aucune erreur' + (errs.length ? ' : ' + errs.slice(0, 2).join(' | ') : ''));
  await nav.close();
  console.log(ko ? `\n  ${ko} défaut(s)` : '\n  OK — « Installer » installe : directement avec Chrome, par Chrome depuis Samsung Internet, en deux gestes sur iPhone');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
