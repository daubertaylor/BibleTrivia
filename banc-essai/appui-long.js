/* ====== L'APPUI LONG OUVRE SOUS LE DOIGT (v314) ======
   « Quand je reste appuyé, au bout d'un certain délai, j'aimerais que ça
     s'ouvre avant que j'aie eu le temps de lâcher mon doigt. »
   Une discussion de groupe, de vrais touchers (CDP) :
     1. doigt posé 0,65 s sur une bulle, SANS lâcher : le menu du message est
        déjà ouvert ;
     2. on lâche : il reste ouvert (le clic du lâcher ne referme rien) ;
     3. une action du menu, touchée ensuite, répond (« Copier » le referme) ;
     4. un simple toucher ouvre toujours le menu ;
     5. un doigt qui glisse (on fait défiler) n'ouvre rien ;
     6. aucune erreur.
   Usage : node banc-essai/appui-long.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };
const attends = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.evaluate(() => {
    document.documentElement.classList.add('is-standalone');
    compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
    grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false };
    grp.liste = [{ id: 'g1', nom: 'Les amis du jeudi', teinte: 2, non_lus: 0, nb_membres: 2, code: '7UHF5T', role: 'membre' }];
    grp.membres = { g1: [{ membre: 'moi-0', role: 'membre', muet_jusqu: null }, { membre: 'u-2', role: 'proprietaire', muet_jusqu: null }] };
    grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' } };
    const t = Date.now(), msgs = [];
    for (let i = 1; i <= 12; i++) msgs.push({ id: i, groupe: 'g1', auteur: i % 3 ? 'u-2' : 'moi-0', genre: 'texte', texte: 'Message numéro ' + i, cree_le: new Date(t - (30 - i) * 60000).toISOString() });
    grp.fils = { g1: { charge: true, tout: true, messages: msgs } };
    grp.courant = 'g1'; state.screen = 'groupe'; render();
  });
  await attends(1300);
  const bulle = () => p.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-eux .b-bulle')].pop(); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const pose = (x, y) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const glisse = (x, y) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  const leve = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const feuille = () => p.evaluate(() => { const v = document.querySelectorAll('#grpActionsVeil'); return { n: v.length, ouverte: v.length === 1 && !v[0].classList.contains('closing') }; });
  const fermer = async () => { await p.evaluate(() => { try { fermerFeuilleGroupe('grpActionsVeil'); } catch (e) {} }); await attends(700); };

  /* 1-2 : l'appui long */
  let b = await bulle();
  await pose(b.x, b.y);
  await attends(650);
  const pendant = await feuille();
  dit('doigt posé 0,65 s, sans lâcher : le menu du message est ouvert', pendant.ouverte, JSON.stringify(pendant));
  await leve();
  await attends(500);
  const apres = await feuille();
  dit('… on lâche : il reste ouvert, une seule fois', apres.ouverte && apres.n === 1, JSON.stringify(apres));
  /* 3 : une action du menu répond */
  const copier = await p.evaluate(() => { const r = [...document.querySelectorAll('#grpActionsVeil .grp-liste-act > *')][0].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await pose(copier.x, copier.y); await attends(60); await leve();
  await attends(700);
  dit('une action touchée ensuite répond (« Copier » referme le menu)', !(await feuille()).ouverte);
  await fermer();

  /* 4 : le simple toucher */
  b = await bulle();
  await pose(b.x, b.y); await attends(80); await leve();
  await attends(500);
  dit('un simple toucher ouvre toujours le menu', (await feuille()).ouverte);
  await fermer();

  /* 5 : on fait défiler */
  b = await bulle();
  await pose(b.x, b.y);
  for (let i = 1; i <= 6; i++) { await glisse(b.x, b.y + i * 8); await attends(30); }
  await attends(600);
  const defile = await feuille();
  await leve(); await attends(400);
  dit('un doigt qui glisse fait défiler, et n\'ouvre rien', !defile.ouverte && !(await feuille()).ouverte, JSON.stringify(defile));

  dit('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — l\'appui long ouvre sous le doigt');
  process.exit(ko ? 1 : 0);
})();
