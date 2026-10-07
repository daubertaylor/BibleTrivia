/* ====== EN LIGNE, ON S'AFFRONTE SUR UN TESTAMENT (v312) ======
   « Pouvoir s'affronter sur un testament en particulier, pour le mode en
     ligne, vu qu'en mode solo on peut déjà faire ça. »
   Le serveur temps réel local (hub.js), plusieurs téléphones :
     1. l'écran En ligne propose le testament (Tout / Ancien / Nouveau) ;
     2. Ancien contre Nouveau : ils cherchent ensemble, et ne sont JAMAIS
        appariés ;
     3. arrive « Tout » : il est apparié à l'un des deux, et la partie se joue
        sur le testament de celui-là — chez les deux ;
     4. dans le salon, l'hôte tiré au sort ne peut plus changer ce testament ;
     5. la partie lancée, les deux jouent bien ce testament ;
     6. un vrai téléphone resté en v311 (il n'annonce aucun testament) est
        apparié à « Tout », et jamais à qui a choisi un testament ;
     7. « Créer une partie » part du testament choisi, et reste modifiable ;
     8. un « je cherche » reçu APRÈS l'appariement de son auteur ne le remet
        pas dans le vivier (v313) — mais sa recherche suivante, si ;
     9. aucune erreur.
   Usage : node banc-essai/testament-enligne.js */
const { serveur } = require('./hub.js');
const fs = require('fs'), path = require('path');
const { execSync } = require('child_process');
const RACINE = path.resolve(__dirname, '..');
const ANCIEN = path.join(RACINE, 'banc-ancien.html');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };
const attends = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + serveur.address().port + '/';
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  const ouvre = async (nom, page) => {
    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, userAgent: IOS, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
    await p.addInitScript((n) => { localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); }, nom);
    await p.goto(base + (page || ''));
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.evaluate(() => openOnline());
    if (process.env.TRACE) {
      await p.exposeFunction('__trace', (q) => console.log('      [' + nom + '] ' + q));
      await p.evaluate(() => {
        for (const n of ['createRoom', 'joinRoom', 'cleanupRoom', 'matchFromLookers']) { const o = window[n]; if (typeof o !== 'function') continue;
          window[n] = function () { if (n !== 'matchFromLookers') window.__trace(n + '(' + [...arguments].slice(0, 2).join(',') + ') moi=' + String(myId).slice(0, 6) + ' ' + (new Error().stack.split('\n')[2] || '').trim().slice(0, 70)); return o.apply(this, arguments); }; }
      });
    }
    await p.waitForFunction(() => !!net.lobby && net.connected > 0, null, { timeout: 15000 }).catch(() => {});
    await attends(500);
    return { ctx, p, nom };
  };
  const etat = (c) => c.p.evaluate(() => ({ cherche: net.searching, salon: !!net.room, hote: net.isHost, theme: net.themeKey, fixe: net.themeFixe, choix: net.themeChoix, ecran: state.screen }));
  const attendre = (c, f, ms) => c.p.waitForFunction(f, null, { timeout: ms || 12000 }).then(() => true).catch(() => false);
  try {
    const A = await ouvre('Anne'), B = await ouvre('Benoît');

    /* ---- 1. le choix est là ---- */
    const puces = await A.p.evaluate(() => [...document.querySelectorAll('[data-ogroup="theme"]')].map(b => b.dataset.k + (b.classList.contains('sel') ? '*' : '')).join(','));
    dit('l\'écran En ligne propose le testament : Tout, Ancien, Nouveau', puces === 'tout*,at,nt', puces);
    await A.p.evaluate(() => document.querySelector('[data-ogroup="theme"][data-k="at"]').click());
    await B.p.evaluate(() => choisirTestamentEnLigne('nt'));
    dit('… toucher « Ancien » le choisit', await A.p.evaluate(() => net.themeChoix === 'at' && document.querySelector('[data-ogroup="theme"][data-k="at"]').classList.contains('sel') && !document.querySelector('[data-ogroup="theme"][data-k="tout"]').classList.contains('sel')));

    /* ---- 2. Ancien contre Nouveau : jamais ---- */
    await A.p.evaluate(() => setSearching(true));
    await B.p.evaluate(() => setSearching(true));
    dit('en recherche, la carte dit le testament cherché', await attendre(A, () => /Ancien Testament/.test((document.querySelector('.searching-card') || {}).textContent || '')));
    await attends(6500);
    const [a2, b2] = [await etat(A), await etat(B)];
    dit('Ancien et Nouveau cherchent ensemble sans être appariés', a2.cherche && b2.cherche && !a2.salon && !b2.salon, JSON.stringify([a2, b2]));
    dit('… et ne se comptent pas l\'un l\'autre comme adversaires possibles', await A.p.evaluate(() => freshLookers() === 0));

    /* ---- 3. « Tout » arrive ---- */
    const C = await ouvre('Chloé');
    await C.p.evaluate(() => setSearching(true));
    const apparie = await attendre(C, () => !!net.room && net.oppPresent, 15000);
    const [a3, b3, c3] = [await etat(A), await etat(B), await etat(C)];
    const P = a3.salon ? A : (b3.salon ? B : null), pe = a3.salon ? a3 : b3, attendu = a3.salon ? 'at' : 'nt';
    dit('« Tout » est apparié à l\'un des deux', apparie && !!P && !(a3.salon && b3.salon), JSON.stringify([a3, b3, c3]));
    dit('… et la partie se joue sur SON testament, chez les deux', !!P && pe.theme === attendu && c3.theme === attendu, P && (pe.theme + ' / ' + c3.theme + ' / attendu ' + attendu));
    dit('… testament fixé chez les deux', !!P && pe.fixe === attendu && c3.fixe === attendu);
    dit('… l\'autre cherche toujours', (P === A ? b3 : a3).cherche && !(P === A ? b3 : a3).salon);
    dit('« Tout » reste « Tout » sur son écran En ligne', c3.choix === 'tout');

    /* ---- 4. le salon : l'hôte ne peut plus changer ---- */
    const H = pe.hote ? P : C;
    await attendre(H, () => state.screen === 'online-room' && !!document.querySelector('[data-rgroup="theme"]'), 6000);
    const salon = await H.p.evaluate(() => [...document.querySelectorAll('[data-rgroup="theme"]')].map(b => b.dataset.k + (b.classList.contains('sel') ? '*' : '') + (b.disabled ? '-' : '')).join(','));
    const bloques = salon.split(',').filter(x => /-$/.test(x)).length;
    dit('dans le salon, l\'hôte voit le testament convenu, les deux autres bloqués', bloques === 2 && salon.indexOf(attendu + '*') >= 0 && salon.indexOf(attendu + '*-') < 0, salon);
    await H.p.evaluate(() => { const b = [...document.querySelectorAll('[data-rgroup="theme"]')].find(x => x.disabled); if (b) b.click(); selectRoomOptTheme('tout'); });
    dit('… et toucher un autre testament n\'y change rien', (await etat(H)).theme === attendu);

    /* ---- 5. la partie ---- */
    await H.p.evaluate(() => hostStart());
    const lance = await attendre(P, () => state.screen === 'online-play', 8000) && await attendre(C, () => state.screen === 'online-play', 8000);
    const [p5, c5] = [await etat(P), await etat(C)];
    dit('la partie lancée, les deux jouent ce testament', lance && p5.theme === attendu && c5.theme === attendu, p5.theme + ' / ' + c5.theme);

    /* ---- 6. un téléphone d'avant ---- */
    const R = P === A ? B : A, rChoix = P === A ? 'nt' : 'at';
    /* DE VRAIS TÉLÉPHONES D'AVANT : la v311 publiée (6ea2c24), servie à côté
       par le même hub. (La simuler en retirant le testament de ses messages
       ne tenait pas : le jeu rouvre son canal de recherche, et la simulation
       tombait avec lui.)
       La v311 ne regarde pas le testament : elle peut CHOISIR quelqu'un qui
       veut l'Ancien ou le Nouveau, et l'attendre en vain — c'est son
       comportement à elle, le temps que chacun reçoive la mise à jour. Ce
       qu'on exige de la nouvelle version : apparier la v311 à qui accepte
       « Tout », et ne JAMAIS entrer chez elle quand on a choisi un testament. */
    fs.writeFileSync(ANCIEN, execSync('git show 6ea2c24:index.html', { cwd: RACINE, maxBuffer: 64 << 20 }));
    await R.p.evaluate(() => setSearching(false));
    const X = await ouvre('Xavier', 'banc-ancien.html');
    const D = await ouvre('Damien');
    await X.p.evaluate(() => setSearching(true));
    await D.p.evaluate(() => setSearching(true));
    dit('un téléphone d\'avant est apparié à « Tout »', await attendre(D, () => !!net.room && net.oppPresent, 15000) && (await etat(X)).salon);
    const X2 = await ouvre('Yvon', 'banc-ancien.html');
    await R.p.evaluate(() => setSearching(true));
    await X2.p.evaluate(() => setSearching(true));
    const rEntre = await R.p.evaluate(() => new Promise(res => { let vu = false; const t0 = Date.now();
      const tic = () => { if (net.room) vu = true; if (Date.now() - t0 < 7000) setTimeout(tic, 100); else res(vu); }; tic(); }));
    const r6 = await etat(R);
    dit('… mais jamais à « ' + (rChoix === 'at' ? 'Ancien' : 'Nouveau') + ' » : on n\'entre pas chez lui', !rEntre && r6.cherche && !r6.salon, JSON.stringify(r6));
    await R.p.evaluate(() => setSearching(false));

    /* ---- 7. « Créer une partie » ---- */
    await R.p.evaluate(() => { choisirTestamentEnLigne(net.themeChoix); createRoomFlow(); });
    await attendre(R, () => state.screen === 'online-room' && !!document.querySelector('[data-rgroup="theme"]'), 6000);
    const cree = await R.p.evaluate(() => [...document.querySelectorAll('[data-rgroup="theme"]')].map(b => b.dataset.k + (b.classList.contains('sel') ? '*' : '') + (b.disabled ? '-' : '')).join(','));
    dit('« Créer une partie » part du testament choisi, et reste modifiable', cree.indexOf(rChoix + '*') >= 0 && cree.indexOf('-') < 0, cree);
    await R.p.evaluate(() => selectRoomOptTheme('tout'));
    dit('… l\'hôte peut le changer', (await etat(R)).theme === 'tout');

    /* ---- 8. un « je cherche » en retard ----
       L'appariement vient de l'initiateur, le dernier « je cherche » de
       l'apparié vient de l'apparié : deux expéditeurs, aucun ordre garanti.
       On rejoue le désordre à la main : l'appariement, PUIS le « je cherche »
       parti juste avant. */
    await X2.p.evaluate(() => setSearching(false));
    const E = await ouvre('Élise'), F = await ouvre('Fabien');
    await F.p.evaluate(() => {
      net.lobby.send({ type: 'broadcast', event: 'matched', payload: { code: '000000', host: 'fantome-a', guest: 'fantome-b', t: 'tout' } });
      net.lobby.send({ type: 'broadcast', event: 'looking', payload: { id: 'fantome-b', ts: Date.now(), t: 'tout' } });
    });
    await attends(800);
    dit('un « je cherche » reçu après l\'appariement ne remet pas l\'apparié dans le vivier', await E.p.evaluate(() => !net.lookers['fantome-b']));
    await attends(2600);
    await F.p.evaluate(() => net.lobby.send({ type: 'broadcast', event: 'looking', payload: { id: 'fantome-b', ts: Date.now(), t: 'tout' } }));
    dit('… et s\'il cherche vraiment de nouveau, son annonce suivante passe', await attendre(E, () => !!net.lookers['fantome-b'], 3000));

    dit('aucune erreur dans les pages', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    for (const c of [A, B, C, X, D, X2, E, F]) await c.ctx.close().catch(() => {});
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await new Promise(r => serveur.close(r));
    try { fs.unlinkSync(ANCIEN); } catch (e) {}
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — en ligne, on s\'affronte sur le testament qu\'on a choisi');
  process.exit(ko ? 1 : 0);
})();
