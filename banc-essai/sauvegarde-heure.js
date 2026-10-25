/* ====== BANC « SAUVEGARDÉ À L'INSTANT… VRAIMENT ? » (v335) ======
   « Lorsque j'ouvre la progression sauvegardée, ça me dit sauvegardé à
     l'instant, mais toujours — alors que ça doit forcément être faux. » Ça
   l'était, dans ce que la phrase voulait dire : chaque retour sur l'app
   reposait la MÊME sauvegarde au serveur, et c'est cette repose qu'on
   datait. Sur le Supabase de poche (faux-supabase.js, qui date chaque
   écriture comme la vraie table, colonne maj) :
     1. se connecter avec une progression : elle part, « à l'instant » ;
     2. revenir sur l'app sans avoir joué : RIEN n'est reposé ;
     3. la dernière écriture date de trois heures : « il y a 3 h », dans
        Mon compte ;
     4. de cinq jours : la date (« le 20 octobre »), pas « il y a 120 h » ;
     5. une partie jouée (la progression bouge) : elle part, « à
        l'instant » ;
     6. l'autre téléphone a sauvegardé il y a une heure, avec plus : on le
        reprend, et c'est son heure qui s'affiche ;
     7. rien n'a été perdu, à aucun moment (la règle absolue) ;
     8. en anglais et en espagnol aussi.
   Avant la v335 : le 2 repose à chaque retour, et le 3 dit « à l'instant ».
   Usage : node banc-essai/sauvegarde-heure.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const FAUX = require('./faux-supabase.js');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 300) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.route('**/supabase-js@2**', r => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: FAUX }));
    await p.route('**/auth/v1/settings', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external: { email: true, google: false } }) }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && typeof compteDemarrer === 'function'; } catch (e) { return false; } }, null, { timeout: 25000 });
    /* Une vraie progression sur ce téléphone. */
    await p.evaluate(() => {
      saveProgress({ books: { 'Genèse': 12, 'Matthieu': 7 }, totalCorrect: 140, bestStreak: 9, flawless: 1, ach: {} });
      saveStats({ bestScore: 620, bestPct: 88, games: 23 });
      saveSeen(new Set(Array.from({ length: 40 }, (_, i) => 'v' + i)));
    });
    const avant = await p.evaluate(() => sauvegardeIci());
    const perdus = (a, b) => {
      const l = [];
      if ((b.stats.games | 0) < (a.stats.games | 0)) l.push('parties ' + a.stats.games + ' → ' + b.stats.games);
      if ((b.progres.totalCorrect | 0) < (a.progres.totalCorrect | 0)) l.push('bonnes réponses');
      const s = new Set(b.vues); if (a.vues.some(x => !s.has(x))) l.push('questions vues');
      for (const k of Object.keys(a.progres.books || {})) if ((b.progres.books[k] | 0) < (a.progres.books[k] | 0)) l.push('livre ' + k);
      return l;
    };

    /* 1. se connecter */
    await p.evaluate(() => { state.screen = 'profile'; render(); });
    await p.waitForTimeout(700);
    await p.evaluate(() => compteOuvrir());
    await p.waitForTimeout(150);
    await p.evaluate(() => { document.getElementById('compteMail').value = 'taylor@essai.test'; envoyerCode(); });
    await p.waitForTimeout(350);
    await p.evaluate(() => { document.getElementById('compteCode').value = '123456'; verifierCode(); });
    await p.waitForFunction(() => compteConnecte() && window.__faux.poses >= 1 && !compte.occupe, null, { timeout: 8000 }).catch(() => {});
    const e1 = await p.evaluate(() => ({ poses: window.__faux.poses, q: quandSauvegarde(), jeux: window.__faux.ligne && window.__faux.ligne.donnees.stats.games }));
    dit('1. se connecter : la progression part, « à l\'instant »', e1.poses === 1 && e1.q === 'Sauvegardé à l\'instant' && e1.jeux === 23, JSON.stringify(e1));

    /* 2. revenir sans avoir joué */
    const e2 = await p.evaluate(async () => { const f = await synchroniser(); await synchroniser(); return { fait: !!f, poses: window.__faux.poses, rev: window.__faux.ligne.revision }; });
    dit('2. revenir sur l\'app sans avoir joué, deux fois : rien n\'est reposé', e2.fait && e2.poses === 1 && e2.rev === 1, JSON.stringify(e2));

    /* 3. trois heures */
    const lire = () => p.evaluate(async () => {
      await synchroniser();
      ouvrirMonCompte();
      await new Promise(r => setTimeout(r, 450));
      const t = (document.querySelector('.mc-qui small') || {}).textContent || '';
      try { fermerFeuilleGroupe('compteVeil'); } catch (e) {}
      await new Promise(r => setTimeout(r, 450));
      return { t, poses: window.__faux.poses };
    });
    await p.evaluate(() => { window.__faux.ligne.maj = new Date(Date.now() - 3 * 3600000 - 120000).toISOString(); });
    const e3 = await lire();
    dit('3. la dernière écriture a trois heures : Mon compte dit « il y a 3 h »', e3.t === 'Sauvegardé il y a 3 h' && e3.poses === 1, JSON.stringify(e3));

    /* 4. cinq jours */
    const cinq = Date.now() - 5 * 86400000;
    await p.evaluate((t) => { window.__faux.ligne.maj = new Date(t).toISOString(); }, cinq);
    const e4 = await lire();
    const date = await p.evaluate((t) => new Date(t).toLocaleDateString('fr', { day: 'numeric', month: 'long' }), cinq);
    dit('4. cinq jours : la date (« le ' + date + ' »), pas un nombre d\'heures', e4.t === 'Sauvegardé le ' + date && e4.poses === 1, JSON.stringify(e4));

    /* 5. une partie jouée */
    await p.evaluate(() => { const s = loadStats(); s.games = (s.games | 0) + 1; saveStats(s); });
    const e5 = await p.evaluate(async () => { await synchroniser(); return { poses: window.__faux.poses, q: quandSauvegarde(), jeux: window.__faux.ligne.donnees.stats.games }; });
    dit('5. une partie jouée : elle part, « à l\'instant »', e5.poses === 2 && e5.q === 'Sauvegardé à l\'instant' && e5.jeux === 24, JSON.stringify(e5));

    /* 6. l'autre téléphone, il y a une heure, avec plus */
    await p.evaluate(() => {
      const d = JSON.parse(JSON.stringify(window.__faux.ligne.donnees));
      d.stats.games = 31; d.progres.books['Exode'] = 5;
      window.__faux.ligne = { id: window.__faux.ligne.id, donnees: d, revision: window.__faux.ligne.revision + 1, maj: new Date(Date.now() - 3600000 - 60000).toISOString() };
    });
    const e6 = await lire();
    const ici = await p.evaluate(() => ({ jeux: loadStats().games, exode: (loadProgress().books || {})['Exode'] | 0 }));
    dit('6. l\'autre téléphone a sauvegardé il y a une heure : repris ici, et c\'est son heure', e6.t === 'Sauvegardé il y a 1 h' && e6.poses === 2 && ici.jeux === 31 && ici.exode === 5,
      JSON.stringify(Object.assign(e6, ici)));

    /* 7. rien de perdu */
    const apres = await p.evaluate(() => sauvegardeIci());
    const l = perdus(avant, apres);
    dit('7. rien n\'a été perdu, à aucun moment', l.length === 0, l.join(' | '));

    /* 8. les langues */
    const lg = await p.evaluate(() => {
      const r = {}, avant = LANGUE, t0 = compte.derniere;
      for (const l of ['en', 'es']) { LANGUE = l; compte.derniere = Date.now() - 3 * 3600000 - 1000; const h = quandSauvegarde(); compte.derniere = Date.now() - 5 * 86400000; r[l] = [h, quandSauvegarde()]; }
      LANGUE = avant; compte.derniere = t0; return r;
    });
    dit('8. en anglais et en espagnol', lg.en[0] === 'Saved 3h ago' && /^Saved on \S/.test(lg.en[1]) && lg.es[0] === 'Guardado hace 3 h' && /^Guardado el \S/.test(lg.es[1]), JSON.stringify(lg));
    dit('   aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — « sauvegardé » dit l\'heure de la dernière vraie sauvegarde, et rien n\'est reposé pour rien');
  process.exit(ko ? 1 : 0);
})();
