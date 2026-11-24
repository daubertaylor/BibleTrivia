/* ====== LES QUÊTES, LES COFFRES, LES DIAMANTS ET LA BOUTIQUE (v368) ======
   « Pour le mode Parcours, je veux que tu l'améliores au maximum, qu'il soit
     vraiment intéressant, avec des espaces de quête secondaire sur les
     côtés… et si tu penses que c'est bien d'avoir des diamants pour par
     exemple acheter des gels de série… »
   Un joueur qui a déjà fait sept leçons (la Genèse entière, deux de l'Exode),
   sur un iPhone :
     1. ses leçons d'avant les diamants sont créditées une fois (70), et il
        le lit ; rouvrir le chemin ne crédite rien de plus ;
     2. chaque unité a ses deux quêtes, au bord du chemin, du côté où il ne
        va pas, sans toucher aucune pierre (ni sa bulle) ni sortir de
        l'écran — en français comme en espagnol, où les noms sont les plus
        longs : ouvertes après la 2e et la 4e leçon, fermées avant ;
     3. le coffre de la Genèse est prêt, les autres fermés ; l'ouvrir donne
        30, une seule fois, et le dit ; il reste ouvert ;
     4. une leçon finie sans faute : +15 (10 + 5), dit à la fin ; refaite
        sans faute : plus rien ;
     5. le Défi éclair a son chrono de 15 s et six questions ; raté (deux
        erreurs) : « Réessayer », aucun diamant ; réussi : +20, une fois, et
        sa coche sur le chemin ;
     6. « Sans faute » : cinq questions, une erreur suffit à le rater, et
        l'erreur ne revient pas à la fin ;
     7. la boutique : un gel coûte 50 ; acheté, le solde baisse et la
        réserve monte ; réserve pleine (2) ou solde trop court : bouton
        éteint, et la raison dite — un achat forcé ne coûte rien ;
     8. deux téléphones : les registres s'unissent, aucun gain compté deux
        fois, aucune dépense oubliée ; le compte emporte le registre ;
     9. jamais négatif, et un registre abîmé ne casse rien ;
    10. rechargé, le solde est le même ; la page de la flamme dit où
        acheter un gel ;
    11. aucune erreur.
   Usage : node banc-essai/tresor.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 500) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(() => {
    if (!/^http/.test(location.protocol) || sessionStorage.getItem('banc-pose')) return;
    sessionStorage.setItem('banc-pose', '1');
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
    const f = {}; ['genese:1','genese:2','genese:3','genese:4','genese:5','exode:1','exode:2'].forEach(k => f[k] = '2026-11-10');
    localStorage.setItem('bt_parcours', JSON.stringify({ v:1, faites:f }));
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  await p.waitForTimeout(1200);
  const fermer = () => p.evaluate(() => { try { closeModal(); } catch (e) {} document.querySelectorAll('#modalVeil').forEach(e => e.remove()); });

  /* 1. le rattrapage */
  await p.evaluate(() => allerOnglet('parcours')); await p.waitForTimeout(1300);
  const r1 = await p.evaluate(() => ({ solde: soldeDiamants(), puce: +(document.querySelector('.ch-diamants b') || {}).textContent,
    toast: [...document.querySelectorAll('.ach-toast')].map(t => t.textContent).join(' | '), gains: Object.keys(loadTresor().gains).length }));
  await p.evaluate(() => { state.screen = 'mode'; render(); }); await p.waitForTimeout(700);
  await p.evaluate(() => allerOnglet('parcours')); await p.waitForTimeout(1300);
  const r1b = await p.evaluate(() => soldeDiamants());
  dit('1. les sept leçons d\'avant sont créditées une fois (70), et c\'est dit ; rouvrir ne crédite rien de plus',
    r1.solde === 70 && r1.puce === 70 && r1.gains === 7 && /\+70/.test(r1.toast) && r1b === 70, JSON.stringify({ r1, apres: r1b }));

  /* 2. les quêtes au bord du chemin (ce qui se voit : le losange et l'étiquette) */
  const geometrie = () => p.evaluate(() => {
    const W = innerWidth, unites = [...document.querySelectorAll('.ch-unite')];
    const pierres = [...document.querySelectorAll('.ch-pierre, .ch-bulle, .ch-coffre-btn')].map(e => e.getBoundingClientRect());
    const vus = [...document.querySelectorAll('.ch-medaillon, .ch-etiq')].filter(e => e.closest('.ch-quete'));
    const croise = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const etats = unites.slice(0, 3).map(u => [...u.querySelectorAll('.ch-quete')].map(q => q.className.replace('ch-quete ', '').trim()));
    const cotes = unites.slice(0, 2).map((u, i) => { const pas = u.querySelector('.ch-pas').getBoundingClientRect(), mil = pas.left + pas.width / 2;
      return [...u.querySelectorAll('.ch-medaillon')].every(m => { const r = m.getBoundingClientRect(), c = r.left + r.width / 2; return i % 2 ? c > mil + 20 : c < mil - 20; }); });
    const touche = vus.filter(q => { const r = q.getBoundingClientRect(); return pierres.some(pr => croise(r, pr)); }).length;
    const dehors = vus.filter(q => { const r = q.getBoundingClientRect(); return r.left < 4 || r.right > W - 4; }).length;
    return { n: unites.map(u => u.querySelectorAll('.ch-quete').length), etats, cotes, touche, dehors };
  });
  const r2 = await geometrie();
  /* Le même joueur, en espagnol, sur un autre téléphone : les noms les plus longs. */
  const ctxEs = await nav.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const pe = await ctxEs.newPage(); pe.on('pageerror', e => errs.push('es : ' + e.message));
  await pe.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await pe.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await pe.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_langue', 'es');
    const f = {}; ['genese:1','genese:2','genese:3','genese:4','genese:5','exode:1','exode:2'].forEach(k => f[k] = '2026-11-10');
    localStorage.setItem('bt_parcours', JSON.stringify({ v:1, faites:f }));
  });
  await pe.goto(URL);
  await pe.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  await pe.waitForTimeout(900);
  await pe.evaluate(() => allerOnglet('parcours')); await pe.waitForTimeout(1300);
  const r2es = await (async () => pe.evaluate(() => {
    const W = innerWidth, croise = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const pierres = [...document.querySelectorAll('.ch-pierre, .ch-bulle, .ch-coffre-btn')].map(e => e.getBoundingClientRect());
    const vus = [...document.querySelectorAll('.ch-medaillon, .ch-etiq')].filter(e => e.closest('.ch-quete'));
    return { noms: [...document.querySelectorAll('.ch-quete small')].slice(0, 2).map(e => e.textContent),
      touche: vus.filter(q => { const r = q.getBoundingClientRect(); return pierres.some(pr => croise(r, pr)); }).length,
      dehors: vus.filter(q => { const r = q.getBoundingClientRect(); return r.left < 4 || r.right > W - 4; }).length };
  }))();
  await ctxEs.close();
  dit('2. deux quêtes par unité, du côté où le chemin ne va pas, sans toucher une pierre ni sortir de l\'écran ; ouvertes après la 2e et la 4e leçon',
    r2.n.every(x => x === 2) && JSON.stringify(r2.etats) === JSON.stringify([['ouverte','ouverte'],['ouverte','fermee'],['fermee','fermee']]) && r2.cotes.every(Boolean) && r2.touche === 0 && r2.dehors === 0
    && r2es.touche === 0 && r2es.dehors === 0 && r2es.noms[0] === 'Desafío relámpago', JSON.stringify({ fr: r2, es: r2es }));

  /* 3. le coffre */
  const r3a = await p.evaluate(() => [...document.querySelectorAll('.ch-coffre')].slice(0, 3).map(c => c.className.replace('ch-coffre ', '')));
  await p.evaluate(() => ouvrirCoffre(0)); await p.waitForTimeout(700);
  const r3b = await p.evaluate(() => ({ solde: soldeDiamants(), modal: (document.querySelector('.coffre-modal') || {}).textContent || '' }));
  await fermer(); await p.waitForTimeout(400);
  const r3c = await p.evaluate(() => { ouvrirCoffre(0); ouvrirCoffre(1); return { solde: soldeDiamants(), etat: (document.querySelector('.ch-coffre') || {}).className, modal: !!document.querySelector('.coffre-modal') }; });
  dit('3. le coffre de la Genèse est prêt, les autres fermés ; ouvert : +30 une seule fois, dit, et il reste ouvert',
    JSON.stringify(r3a) === JSON.stringify(['pret','ferme','ferme']) && r3b.solde === 100 && /Coffre ouvert/.test(r3b.modal) && /\+30/.test(r3b.modal) && r3c.solde === 100 && /ouvert/.test(r3c.etat) && !r3c.modal,
    JSON.stringify({ r3a, r3b: { solde: r3b.solde, modal: r3b.modal.replace(/\s+/g, ' ') }, r3c }));

  /* une partie jouée par le banc : juste ou faux, question après question */
  const jouer = async (fautes) => {
    for (let i = 0; i < 12; i++) {
      const fin = await p.evaluate((faux) => {
        if (state.screen !== 'play') return true;
        const q = currentQ(); const bon = q.shuffledOptions.indexOf(q.correct);
        soloAnswer(faux ? (bon + 1) % q.shuffledOptions.length : bon); return false;
      }, fautes.includes(i));
      if (fin) break;
      await p.waitForTimeout(200);
      await p.evaluate(() => { if (state.screen === 'play') nextQuestion(); });
      await p.waitForTimeout(260);
    }
    await p.waitForTimeout(700);
  };

  /* 4. une leçon sans faute */
  await p.evaluate(() => commencerLecon(1, 2)); await p.waitForTimeout(900);
  await jouer([]);
  const r4a = await p.evaluate(() => ({ ecran: state.screen, gain: (document.querySelector('.end-diamants') || {}).textContent || '', solde: soldeDiamants() }));
  await p.evaluate(() => continuerParcours()); await p.waitForTimeout(1000); await fermer();
  await p.evaluate(() => commencerLecon(1, 2)); await p.waitForTimeout(900);
  await jouer([]);
  const r4b = await p.evaluate(() => ({ gain: (document.querySelector('.end-diamants') || {}).textContent || '', solde: soldeDiamants() }));
  await p.evaluate(() => continuerParcours()); await p.waitForTimeout(1000); await fermer();
  dit('4. une leçon finie sans faute : +15, dit à la fin ; refaite sans faute : plus rien',
    r4a.ecran === 'end' && /\+15/.test(r4a.gain) && r4a.solde === 115 && r4b.gain === '' && r4b.solde === 115, JSON.stringify({ r4a, r4b }));

  /* 5. le Défi éclair */
  await p.evaluate(() => lancerQuete(0, 0)); await p.waitForTimeout(1000);
  const r5a = await p.evaluate(() => ({ titre: (document.querySelector('.header-title') || {}).textContent, chrono: (document.querySelector('.timer-chip') || {}).textContent || '', n: state.questions.length }));
  await jouer([0, 1]);
  const r5b = await p.evaluate(() => ({ titre: (document.querySelector('.end-title') || {}).textContent, gain: !!document.querySelector('.end-diamants'),
    boutons: [...document.querySelectorAll('.end-actions button')].map(b => b.textContent.trim()), solde: soldeDiamants() }));
  await p.evaluate(() => relancerQuete()); await p.waitForTimeout(1000);
  const r5c = await p.evaluate(() => ({ ecran: state.screen, q: state.lecon && state.lecon.quete }));
  await jouer([]);
  const r5d = await p.evaluate(() => ({ titre: (document.querySelector('.end-title') || {}).textContent, gain: (document.querySelector('.end-diamants') || {}).textContent || '', solde: soldeDiamants() }));
  await p.evaluate(() => continuerParcours()); await p.waitForTimeout(1200); await fermer();
  const r5e = await p.evaluate(() => ({ etat: (document.querySelector('.ch-quete') || {}).className, allume: !!document.querySelector('.ch-quete.s-allume') }));
  await p.evaluate(() => lancerQuete(0, 0)); await p.waitForTimeout(900);
  await jouer([]);
  const r5f = await p.evaluate(() => ({ gain: (document.querySelector('.end-diamants') || {}).textContent || '', solde: soldeDiamants() }));
  await p.evaluate(() => continuerParcours()); await p.waitForTimeout(1000); await fermer();
  dit('5. le Défi éclair : chrono de 15 s, six questions ; raté, « Réessayer » et rien ; réussi, +20 une fois, et sa coche sur le chemin',
    r5a.titre === 'Défi éclair' && /1[45]\s*s/.test(r5a.chrono) && r5a.n === 6 && /Presque|Pas cette fois/.test(r5b.titre) && !r5b.gain && r5b.boutons.includes('Réessayer') && r5b.solde === 115
    && r5c.ecran === 'play' && r5c.q === 0 && /réussie/.test(r5d.titre) && /\+20/.test(r5d.gain) && r5d.solde === 135 && /reussie/.test(r5e.etat) && r5e.allume && r5f.gain === '' && r5f.solde === 135,
    JSON.stringify({ r5a, r5b, r5c, r5d, r5e, r5f }));

  /* 6. Sans faute */
  await p.evaluate(() => lancerQuete(0, 1)); await p.waitForTimeout(900);
  const r6a = await p.evaluate(() => ({ n: state.questions.length, chrono: !!document.querySelector('.timer-chip') }));
  await jouer([4]);
  const r6b = await p.evaluate(() => ({ total: state.questions.length, titre: (document.querySelector('.end-title') || {}).textContent, solde: soldeDiamants() }));
  await p.evaluate(() => continuerParcours()); await p.waitForTimeout(1000); await fermer();
  dit('6. « Sans faute » : cinq questions, sans chrono ; une erreur suffit à le rater, et elle ne revient pas à la fin',
    r6a.n === 5 && !r6a.chrono && r6b.total === 5 && /Presque|Pas cette fois/.test(r6b.titre) && r6b.solde === 135, JSON.stringify({ r6a, r6b }));

  /* 7. la boutique */
  await p.evaluate(() => { saveDaily({ gels:0 }); ouvrirBoutique(); }); await p.waitForTimeout(900);
  const lire = () => p.evaluate(() => ({ solde: soldeDiamants(), gels: loadDaily().gels, eteint: !!(document.querySelector('#boutiqueVeil .bq-acheter') || {}).disabled,
    raison: (document.querySelector('#boutiqueVeil .bq-etat') || {}).textContent || '', affiche: +((document.querySelector('#boutiqueVeil .bq-n b') || {}).textContent || -1) }));
  const b0 = await lire();
  await p.evaluate(() => acheterGel()); await p.waitForTimeout(300);
  const b1 = await lire();
  await p.evaluate(() => acheterGel()); await p.waitForTimeout(300);
  const b2 = await lire();
  await p.evaluate(() => acheterGel()); await p.waitForTimeout(300);
  const b3 = await lire();
  await p.evaluate(() => { saveDaily({ gels:0 }); majBoutique(); }); await p.waitForTimeout(200);
  const b4 = await lire();
  await p.evaluate(() => fermerFeuilleGroupe('boutiqueVeil')); await p.waitForTimeout(600);
  dit('7. la boutique : un gel à 50 ; acheté, le solde baisse et la réserve monte ; pleine ou solde trop court, bouton éteint et la raison dite ; un achat forcé ne coûte rien',
    b0.solde === 135 && b0.affiche === 135 && !b0.eteint && b1.solde === 85 && b1.gels === 1 && b2.solde === 35 && b2.gels === 2 && b2.eteint && /pleine/.test(b2.raison)
    && b3.solde === 35 && b3.gels === 2 && b4.eteint && /manque 15/.test(b4.raison), JSON.stringify({ b0, b1, b2, b3, b4 }));

  /* 8. deux téléphones */
  const r8 = await p.evaluate(() => {
    const A = { gains: { 'lecon:genese:1': { n:10, t:'2026-11-01' }, 'coffre:genese': { n:30, t:'2026-11-02' } }, depenses: { 'gel:aaa': { n:50, t:'2026-11-03' } } };
    const B = { gains: { 'lecon:genese:1': { n:10, t:'2026-10-30' }, 'quete:genese:eclair': { n:20, t:'2026-11-04' } }, depenses: {} };
    const u = unionTresor(A, B), f = fusionner(Object.assign(sauvegardeVide(), { tresor:A }), Object.assign(sauvegardeVide(), { tresor:B }));
    return { solde: soldeDiamants(u), date: u.gains['lecon:genese:1'].t, fusion: soldeDiamants(tresorValide(f.tresor)), compte: !!sauvegardeIci().tresor && Object.keys(sauvegardeIci().tresor.gains).length };
  });
  dit('8. deux téléphones : les registres s\'unissent (10 + 30 + 20 − 50), aucun gain deux fois, la date la plus ancienne ; le compte emporte le registre',
    r8.solde === 10 && r8.fusion === 10 && r8.date === '2026-10-30' && r8.compte > 5, JSON.stringify(r8));

  /* 9. jamais négatif, registre abîmé */
  const r9 = await p.evaluate(() => {
    const neg = soldeDiamants(tresorValide({ gains:{ a:{ n:10 } }, depenses:{ b:{ n:50 }, c:'x', d:{ n:-5 }, e:{ n:1e9 } } }));
    const sauve = localStorage.getItem('bt_tresor');
    localStorage.setItem('bt_tresor', '{pas du json');
    const casse = soldeDiamants();
    localStorage.setItem('bt_tresor', sauve);
    return { neg, casse, retour: soldeDiamants() };
  });
  dit('9. jamais négatif ; un registre abîmé ne casse rien', r9.neg === 0 && r9.casse === 0 && r9.retour === 35, JSON.stringify(r9));

  /* 10. rechargé ; la flamme dit où acheter */
  await p.reload();
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  await p.waitForTimeout(900);
  const r10 = await p.evaluate(() => { const s = soldeDiamants(); ouvrirFlamme(); return s; });
  await p.waitForTimeout(900);
  const flamme = await p.evaluate(() => [...document.querySelectorAll('.flam-regle')].map(e => e.textContent).join(' | '));
  dit('10. rechargé, le même solde ; la page de la flamme dit où acheter un gel', r10 === 35 && /boutique du Parcours, pour 50 gemmes/.test(flamme), JSON.stringify({ r10, flamme: flamme.slice(0, 200) }));

  dit('11. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — des quêtes au bord du chemin, un coffre au bout de chaque unité, des diamants qui ne se perdent jamais, et un gel à la boutique');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
