/* ====== BANC « L'HÔTE QUI S'EN VA AVANT DE LANCER FERME LE SALON » (v335) ======
   « En mode groupe, lorsque je quitte la partie et que je suis l'hôte, mais
     que je ne l'ai pas lancée, il faut que la partie se ferme, pour que les
     joueurs ne restent pas dedans. » Seul l'hôte peut lancer ; les invités ne
   sortaient que lorsque PLUS PERSONNE n'était là — à deux invités, ils
   attendaient ensemble, pour toujours. Trois joueurs dans un vrai salon (le
   serveur temps réel local, hub.js) :
     1. l'hôte quitte son salon avant de lancer : les DEUX invités sortent
        aussitôt (moins de deux secondes), avec « L'hôte a quitté le salon. » ;
     2. seul invité : il sort aussi, comme avant ;
     3. l'hôte passe l'application derrière quelques secondes, puis revient :
        personne n'est mis dehors (trente secondes de grâce) ;
     4. l'hôte disparaît sans rien dire (application fermée) : les deux
        invités sortent une fois la grâce passée ;
     5. une partie LANCÉE continue sans l'hôte : personne n'est mis dehors ;
     6. aucune erreur.
   Avant la v335 : 1 et 4 rouges — les deux invités restaient dans le salon.
   Usage : node banc-essai/hote-ferme.js */
const { serveur } = require('./hub.js');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const PORT = 8247;
const attends = (ms) => new Promise(r => setTimeout(r, ms));
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

(async () => {
  await new Promise(r => serveur.listen(PORT, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  const ouvre = async (nom, couleur) => {
    const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, userAgent: AND, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message.slice(0, 160)));
    await p.addInitScript(([n, c]) => { localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c })); localStorage.setItem('bt_fs_hint', '1'); }, [nom, couleur]);
    await p.goto('http://localhost:' + PORT + '/');
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => openOnline());
    return { ctx, p, nom };
  };
  const etat = (c) => c.p.evaluate(() => ({ ecran: state.screen, salon: !!net.room, joueurs: nbJoueurs(), mot: net.error || '' }));
  /* Un salon à trois (ou deux), lancé par l'hôte, les invités entrés. */
  const salon = async (H, invites) => {
    const code = await H.p.evaluate(() => { createRoomFlow(); return new Promise(r => setTimeout(() => r(net.code), 1500)); });
    for (const c of invites) { await c.p.evaluate((k) => { joinRoom(k, false); }, code); await attends(700); }
    await attends(1800);
    return code;
  };
  try {
    const H = await ouvre('Taylor', '#4C86E8'), A = await ouvre('Sarah', '#E8734C'), B = await ouvre('Jonas', '#2FA36B');
    await attends(1500);

    /* 1 */
    await salon(H, [A, B]);
    const avant = [await etat(A), await etat(B)];
    await H.p.evaluate(() => leaveRoomToOnline());
    await attends(1800);
    const apres1 = [await etat(A), await etat(B)];
    dit('1. l\'hôte quitte avant de lancer : les deux invités sortent aussitôt, avec le mot',
      avant.every(e => e.ecran === 'online-room' && e.joueurs === 3) && apres1.every(e => e.ecran === 'online' && !e.salon && /hôte/.test(e.mot)),
      JSON.stringify({ avant, apres1 }));

    /* 2 */
    await attends(800);
    await salon(H, [A]);
    const avant2 = await etat(A);
    await H.p.evaluate(() => leaveRoomToOnline());
    await attends(1800);
    const apres2 = await etat(A);
    dit('2. seul invité : il sort aussi', avant2.ecran === 'online-room' && apres2.ecran === 'online' && !apres2.salon, JSON.stringify({ avant2, apres2 }));

    /* 3 */
    await attends(800);
    await salon(H, [A, B]);
    await H.p.evaluate(() => handleAppHidden());
    await attends(4000);
    await H.p.evaluate(() => handleAppVisible());
    await attends(31000);
    const apres3 = [await etat(A), await etat(B), await etat(H)];
    dit('3. l\'hôte passe derrière quelques secondes puis revient : personne n\'est mis dehors',
      apres3.every(e => e.ecran === 'online-room' && e.salon), JSON.stringify(apres3));

    /* 4 : l'hôte disparaît sans rien dire */
    await H.ctx.close();
    await attends(2500);
    const pendant = [await etat(A), await etat(B)];
    await attends(30000);
    const apres4 = [await etat(A), await etat(B)];
    dit('4. l\'hôte disparaît sans rien dire : les invités attendent la grâce, puis sortent',
      pendant.every(e => e.ecran === 'online-room') && apres4.every(e => e.ecran === 'online' && !e.salon && /hôte/.test(e.mot)),
      JSON.stringify({ pendant, apres4 }));

    /* 5 : une partie lancée continue sans l'hôte */
    const H2 = await ouvre('Myriam', '#9B5DE5');
    await attends(1500);
    await salon(H2, [A, B]);
    await H2.p.evaluate(() => hostStart());
    await attends(2500);
    const lance = [await etat(A), await etat(B)];
    await H2.p.evaluate(() => { cleanupRoom(); state.screen = 'online'; render(); });
    await attends(33000);
    const apres5 = [await etat(A), await etat(B)];
    dit('5. une partie lancée continue sans l\'hôte', lance.every(e => e.ecran === 'online-play') && apres5.every(e => e.ecran === 'online-play' && e.salon),
      JSON.stringify({ lance, apres5 }));
    dit('6. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await b.close(); serveur.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — l\'hôte qui s\'en va avant de lancer ferme le salon pour tout le monde');
  process.exit(ko ? 1 : 0);
})();
