/* ====== BANC « LA MODÉRATION S'OUVRE AVEC SON CONTENU » ======
   « Elle se rouvre bien, mais l'affichage apparaît un peu après. Fais en
   sorte que ça se rouvre parfaitement et que rien n'apparaisse après. »
   Avant : l'écran montait vide, un rond tournait, la carte arrivait 365 à
   394 ms plus tard. Ce banc suit l'écran image par image, serveur lent
   (350 ms), dans trois cas — rien à traiter, file préchargée, rien en main —
   et refuse : un rond, un écran ouvert sans son contenu, un contenu qui
   change après l'ouverture.
   Usage : node banc-essai/moderation-pleine.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8099/index.html';
  let ko = 0;
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  for (const [cas, n, prechauffe] of [['rien à traiter', 0, false], ['2 signalements, liste préchargée', 2, true], ['2 signalements, réseau lent, rien en main', 2, false]]) {
    const ctx = await b.newContext({ viewport:{width:402,height:874}, deviceScaleFactor:1, userAgent:IOS, hasTouch:true, isMobile:true, serviceWorkers:'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' })); localStorage.setItem('bt_fs_hint','1'); });
    await p.goto(url);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
    const rel = await p.evaluate(async ([n, pre]) => {
      compte.dispo=true; compte.session={ user:{ id:'moi-0', email:'j@e.net' } }; compte.etape='connecte';
      grp.installe=true; grp.ouverts=true; grp.etat={ participe:'ok', moderateur:true, a_traiter:n }; grp.liste=[]; grp.publics=[]; moderation = null;
      const file = n ? [{ id:1, raison:'harcelement', details:'', le:new Date().toISOString(), groupe:'g-1', groupe_nom:'Lee', message:7, texte:'Amen', cible:'u-2', cible_nom:'Sam', par_nom:'Kim', nb:1 },
                        { id:2, raison:'spam', details:'', le:new Date().toISOString(), groupe:'g-1', groupe_nom:'Lee', message:8, texte:'Pub', cible:'u-3', cible_nom:'Lee', par_nom:'Kim', nb:1 }] : [];
      listeGroupe = async (nom) => { await new Promise(z => setTimeout(z, 350)); return nom === 'moderation_ouverte' ? file : []; };
      state.screen='groupes'; render();
      if (pre) { await chargerModeration(); }
      await new Promise(z => setTimeout(z, 900));
      const t0 = performance.now(), out = [];
      ouvrirModeration();
      await new Promise(res => { const tic = () => { const sc = document.querySelector('#app > .screen:not(.screen-exit)');
        const ecran = state.screen === 'moderation' && !!document.getElementById('modListe');
        out.push([Math.round(performance.now() - t0), ecran, !!document.querySelector('#modListe .spinner'), document.querySelectorAll('#modListe .mod-carte, #modListe .grp-intro').length]);
        if (performance.now() - t0 < 1400) requestAnimationFrame(tic); else res(); }; requestAnimationFrame(tic); });
      return out;
    }, [n, prechauffe]);
    const premiere = rel.find(x => x[1]);
    const rond = rel.some(x => x[1] && x[2]);
    const apres = premiere ? rel.find(x => x[1] && x[3] !== premiere[3]) : null;
    const bon = !!premiere && !rond && !apres && premiere[3] === (n ? 2 : 1) && !errs.length;
    if (!bon) ko++;
    console.log('  ' + (bon ? 'ok   ' : 'KO   ') + cas.padEnd(44) + (premiere ? 'écran à ' + premiere[0] + ' ms avec ' + premiere[3] + ' carte(s)' : 'écran jamais ouvert') + (rond ? ' · ROND VU' : '') + (apres ? ' · contenu changé à ' + apres[0] + ' ms' : ' · rien n\'arrive après') + (errs.length ? ' · ERREURS ' + errs.join('|') : ''));
    await ctx.close();
  }
  await b.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' cas' : '\n  OK — la Modération s\'ouvre avec son contenu, et rien n\'arrive après');
  process.exit(ko ? 1 : 0);
})();
