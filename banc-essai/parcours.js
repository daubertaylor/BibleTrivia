/* ====== LE PARCOURS : LA BIBLE, LEÇON PAR LEÇON (v353) ======
   « Le Duolingo de la Bible. » Un chemin de la Genèse à l'Apocalypse :
   douze unités, cinq leçons de six questions. Sur un iPhone :
     1. l'accueil propose le Parcours en tête, avec l'unité en cours ;
     2. le chemin : douze unités dans l'ordre de la Bible, cinq pierres
        chacune ; une seule à faire, les suivantes fermées ; rien ne dépasse ;
     3. une leçon : six questions des livres de son unité, les faciles
        d'abord, sans chrono, le nom de l'unité en titre ;
     4. une erreur revient à la fin, une seule fois ;
     5. la leçon finie : « Leçon terminée », le compte du premier coup, un seul
        bouton ; elle est gardée ; la flamme du jour s'allume ; les livres de
        la Progression avancent ; le record du Solo n'est pas touché ;
     6. « Continuer » ramène au chemin : la pierre faite s'allume, la
        suivante s'ouvre ;
     7. une leçon fermée ne s'ouvre pas ;
     8. une leçon interrompue (l'app fermée) reprend où elle en était ;
     9. quitter une leçon en cours ramène au chemin, sans la compter ;
    10. jamais en arrière : écrire moins ne retire rien ; le compte fusionne
        les leçons des deux côtés, à la date la plus ancienne ;
    11. en anglais et en espagnol, le chemin parle la langue du joueur ;
    12. chaque unité a de quoi faire ses cinq leçons : six questions, de ses
        livres, sans doublon ;
    13. aucune erreur.
   Usage : node banc-essai/parcours.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };

async function ouvrir(nav, lg) {
  const ctx = await nav.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript((lg) => {
    if (!/^http/.test(location.protocol)) return;
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    if (lg) localStorage.setItem('bt_langue', lg);
  }, lg || null);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
  await p.waitForTimeout(600);
  return { ctx, p };
}
/* Répond à la question en cours (juste ou faux), puis passe à la suivante. */
const repondre = (p, juste) => p.evaluate((juste) => {
  const q = currentQ(); const k = q.shuffledOptions.findIndex(o => juste ? o === q.correct : o !== q.correct); soloAnswer(k);
}, juste);
const suivante = (p) => p.evaluate(() => nextQuestion());
async function finirLecon(p, fautes) {
  for (let garde = 0, i = 0; garde < 40; garde++, i++) {
    if (await p.evaluate(() => state.screen) !== 'play') break;
    await repondre(p, !(fautes || []).includes(i));
    await p.waitForTimeout(60);
    await suivante(p);
    await p.waitForTimeout(80);
  }
  await p.waitForTimeout(400);
  await p.evaluate(() => { const v = document.getElementById('modalVeil'); if (v && v.querySelector('.fete-flamme')) document.getElementById('modalOk').click(); });
  await p.waitForTimeout(500);
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const { ctx, p } = await ouvrir(nav);

    /* 1 */
    const c1 = await p.evaluate(() => { const c = document.querySelector('.home-cartes .mode-card'); return c ? c.querySelector('.mode-title').textContent + ' | ' + c.querySelector('.mode-desc').textContent : null; });
    await p.evaluate(() => { [...document.querySelectorAll('.mode-card')].find(x => /Parcours/.test(x.textContent)).click(); });
    await p.waitForTimeout(1300);
    const e1 = await p.evaluate(() => state.screen);
    dit('1. l\'accueil propose le Parcours en tête, avec l\'unité en cours', c1 === 'Parcours | Unité 1 · Au commencement' && e1 === 'chemin', JSON.stringify({ c1, e1 }));

    /* 2 */
    const c2 = await p.evaluate(() => {
      const unites = [...document.querySelectorAll('.ch-unite')];
      return { n: unites.length, pierres: unites.map(u => u.querySelectorAll('.ch-noeud').length),
        noms: unites.map(u => u.querySelector('.ch-bandeau b').textContent),
        courante: [...document.querySelectorAll('.ch-noeud')].findIndex(x => x.classList.contains('courante')),
        fermees: document.querySelectorAll('.ch-noeud.fermee .ch-pierre[disabled]').length,
        livres: document.querySelector('.ch-bandeau small').textContent,
        deborde: document.documentElement.scrollWidth - innerWidth,
        horsCadre: [...document.querySelectorAll('.ch-pierre, .ch-bulle, .ch-bandeau')].filter(e => { const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; }).length };
    });
    dit('2. le chemin : douze unités dans l\'ordre de la Bible, cinq pierres chacune, une seule à faire, les autres fermées ; rien ne dépasse',
      c2.n === 12 && c2.pierres.every(x => x === 5) && c2.noms[0] === 'Au commencement' && c2.noms[11] === 'Lettres et Apocalypse' && c2.livres === 'Genèse'
      && c2.courante === 0 && c2.fermees === 59 && c2.deborde <= 0 && c2.horsCadre === 0, JSON.stringify(c2));

    /* 3 */
    await p.locator('.ch-bulle').tap();
    await p.waitForTimeout(700);
    const c3 = await p.evaluate(() => ({ ecran: state.screen, n: state.questions.length, livres: [...new Set(state.questions.map(q => bookOf(q)))], tiers: state.questions.map(q => q.tier).join(','),
      chrono: !!document.querySelector('.timer-chip'), titre: document.querySelector('.header-title').textContent }));
    dit('3. une leçon : six questions de la Genèse, les faciles d\'abord, sans chrono, le nom de l\'unité en titre',
      c3.ecran === 'play' && c3.n === 6 && c3.livres.join() === 'Genèse' && c3.tiers === 'facile,facile,facile,facile,moyen,moyen' && !c3.chrono && c3.titre === 'Au commencement', JSON.stringify(c3));

    /* 4 */
    const avant = await p.evaluate(() => ({ stats: localStorage.getItem('bt_stats'), progres: JSON.parse(localStorage.getItem('bt_progress') || '{}').totalCorrect || 0 }));
    const premiere = await p.evaluate(() => qKey(currentQ()));
    await repondre(p, false); await p.waitForTimeout(60);
    const c4a = await p.evaluate(() => ({ n: state.questions.length, derniere: qKey(state.questions[state.questions.length - 1]), relance: !!state.questions[state.questions.length - 1].relance }));
    await suivante(p);
    for (let i = 1; i < 6; i++) { await repondre(p, true); await suivante(p); await p.waitForTimeout(40); }
    await repondre(p, false); await p.waitForTimeout(60);   // la relance, encore fausse
    const c4b = await p.evaluate(() => state.questions.length);
    dit('4. une erreur revient à la fin, une seule fois', c4a.n === 7 && c4a.derniere === premiere && c4a.relance && c4b === 7, JSON.stringify({ c4a, c4b }));

    /* 5 */
    await suivante(p);
    /* La flamme du jour se fête APRÈS les résultats (voir relacherToasts). */
    const fete = await p.waitForFunction(() => !!document.querySelector('#modalVeil .fete-flamme'), null, { timeout: 6000 }).then(() => true, () => false);
    await p.evaluate(() => { const v = document.getElementById('modalVeil'); if (v && v.querySelector('.fete-flamme')) document.getElementById('modalOk').click(); });
    await p.waitForTimeout(600);
    const c5 = await p.evaluate(() => {
      const jour = cleDeDate(new Date());
      return { ecran: state.screen, sourcil: document.querySelector('.end-eyebrow').textContent.trim(), titre: document.querySelector('.end-title').textContent.trim(),
        boutons: [...document.querySelectorAll('.end-actions button')].map(b => b.textContent.trim()), faite: JSON.parse(localStorage.getItem('bt_parcours') || '{}').faites,
        jour, flamme: (JSON.parse(localStorage.getItem('bt_daily') || '{}').last === jour), stats: localStorage.getItem('bt_stats'),
        progres: JSON.parse(localStorage.getItem('bt_progress') || '{}').totalCorrect || 0 };
    });
    dit('5. la leçon finie : « Leçon terminée », le compte du premier coup, un seul bouton ; gardée ; la flamme s\'allume ; les livres avancent ; le record du Solo intact',
      c5.ecran === 'end' && c5.sourcil === 'Leçon terminée' && c5.titre === '5 sur 6 du premier coup' && c5.boutons.join() === 'Continuer'
      && c5.faite && c5.faite['genese:1'] === c5.jour && c5.flamme && fete && c5.stats === avant.stats && c5.progres === avant.progres + 5,
      JSON.stringify({ fete, ...c5, avant }));

    /* 6 */
    await p.locator('.end-actions .btn-replay').tap();
    await p.waitForTimeout(1500);
    const c6 = await p.evaluate(() => ({ ecran: state.screen, faites: [...document.querySelectorAll('.ch-noeud')].map((n, i) => n.classList.contains('faite') ? i : -1).filter(i => i >= 0),
      allume: [...document.querySelectorAll('.ch-noeud')].findIndex(n => n.classList.contains('s-allume')), courante: [...document.querySelectorAll('.ch-noeud')].findIndex(n => n.classList.contains('courante')),
      compte: document.querySelector('.ch-compte').textContent }));
    dit('6. « Continuer » ramène au chemin : la pierre faite s\'allume, la suivante s\'ouvre', c6.ecran === 'chemin' && c6.faites.join() === '0' && c6.allume === 0 && c6.courante === 1 && c6.compte === '1 leçon sur 60', JSON.stringify(c6));

    /* 7 */
    const c7 = await p.evaluate(() => { commencerLecon(0, 3); commencerLecon(4, 0); return { ecran: state.screen, lecon: state.lecon }; });
    dit('7. une leçon fermée ne s\'ouvre pas', c7.ecran === 'chemin' && !c7.lecon, JSON.stringify(c7));

    /* 8 */
    await p.evaluate(() => commencerLecon(0, 1));
    await p.waitForTimeout(400);
    await repondre(p, true); await suivante(p); await repondre(p, true); await suivante(p);
    const deck = await p.evaluate(() => { saveState(); return state.questions.map(q => qKey(q)); });
    await p.reload();
    await p.waitForFunction(() => { try { return state.screen === 'play'; } catch (e) { return false; } }, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(500);
    const c8 = await p.evaluate(() => ({ ecran: state.screen, lecon: state.lecon, idx: state.currentIndex, deck: state.questions.map(q => qKey(q)), titre: (document.querySelector('.header-title') || {}).textContent }));
    await finirLecon(p);
    const c8b = await p.evaluate(() => ({ ecran: state.screen, faites: Object.keys(JSON.parse(localStorage.getItem('bt_parcours') || '{}').faites || {}).sort() }));
    dit('8. une leçon interrompue (l\'app fermée) reprend où elle en était, et compte une fois finie',
      c8.ecran === 'play' && c8.lecon && c8.lecon.u === 0 && c8.lecon.l === 1 && c8.idx === 2 && c8.deck.join('|') === deck.join('|') && c8.titre === 'Au commencement'
      && c8b.ecran === 'end' && c8b.faites.join() === 'genese:1,genese:2', JSON.stringify({ ...c8, deck: c8.deck.length, c8b }));

    /* 9 */
    await p.locator('.end-actions .btn-replay').tap();
    await p.waitForTimeout(1200);
    await p.evaluate(() => commencerLecon(0, 2));
    await p.waitForTimeout(400);
    await p.evaluate(() => confirmLeaveGame());
    await p.waitForTimeout(500);
    const titreModal = await p.evaluate(() => (document.querySelector('#modalVeil .modal-title') || {}).textContent);
    await p.evaluate(() => document.getElementById('modalOk').click());
    await p.waitForTimeout(900);
    const c9 = await p.evaluate(() => ({ ecran: state.screen, lecon: state.lecon, faites: Object.keys(JSON.parse(localStorage.getItem('bt_parcours') || '{}').faites || {}).length }));
    dit('9. quitter une leçon en cours ramène au chemin, sans la compter', titreModal === 'Quitter la leçon ?' && c9.ecran === 'chemin' && !c9.lecon && c9.faites === 2, JSON.stringify({ titreModal, ...c9 }));

    /* 10 */
    const c10 = await p.evaluate(() => {
      const tri = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
      saveParcours({ faites: {} });
      const garde = Object.keys(loadParcours().faites).length;
      const ici = sauvegardeIci();
      const loin = Object.assign(sauvegardeVide(), { parcours: { faites: { 'genese:1': '2026-01-02', 'exode:1': '2026-03-04', 'futur:1': '2026-05-05', 'abime:1': 'nimporte' } } });
      const f = fusionner(ici, loin).parcours.faites, f2 = fusionner(loin, ici).parcours.faites;
      appliquerSauvegarde(loin);
      const apres = loadParcours().faites;
      appliquerSauvegarde(Object.assign(sauvegardeVide(), {}));   // un compte qui n'a jamais vu le Parcours
      const apres2 = loadParcours().faites;
      return { garde, f, memes: tri(f) === tri(f2), apres, apres2: tri(apres2) === tri(apres), pos: positionParcours() };
    });
    dit('10. jamais en arrière : écrire moins ne retire rien ; le compte fusionne les leçons des deux côtés, à la date la plus ancienne',
      c10.garde === 2 && c10.f['genese:1'] === '2026-01-02' && !!c10.f['genese:2'] && c10.f['exode:1'] === '2026-03-04' && c10.f['futur:1'] === '2026-05-05' && !('abime:1' in c10.f)
      && c10.memes && Object.keys(c10.apres).length === 4 && c10.apres2 && c10.pos && c10.pos.u === 0 && c10.pos.l === 2, JSON.stringify(c10));
    p._errs.forEach(e => errs.push(e));
    await ctx.close();

    /* 11 */
    const c11 = {};
    for (const lg of ['en', 'es']) {
      const o = await ouvrir(nav, lg);
      await o.p.evaluate(() => ouvrirChemin());
      await o.p.waitForTimeout(1300);
      c11[lg] = await o.p.evaluate(() => ({ entete: document.querySelector('.header-title').textContent, unite: document.querySelector('.ch-bandeau b').textContent,
        livres: document.querySelector('.ch-bandeau small').textContent, num: document.querySelector('.ch-num').textContent, bulle: document.querySelector('.ch-bulle').textContent,
        derniere: [...document.querySelectorAll('.ch-bandeau b')].pop().textContent }));
      o.p._errs.forEach(e => errs.push(lg + ' : ' + e));
      await o.ctx.close();
    }
    dit('11. en anglais et en espagnol, le chemin parle la langue du joueur',
      c11.en.entete === 'Path' && c11.en.unite === 'In the beginning' && c11.en.livres === 'Genesis' && c11.en.num === 'Unit 1' && c11.en.bulle === 'Start' && c11.en.derniere === 'Letters and Revelation'
      && c11.es.entete === 'Camino' && c11.es.unite === 'En el principio' && c11.es.num === 'Unidad 1' && c11.es.bulle === 'Empezar', JSON.stringify(c11));

    /* 12 */
    {
      const o = await ouvrir(nav);
      const c12 = await o.p.evaluate(() => {
        const fautes = [];
        PARCOURS.forEach((u, i) => {
          localStorage.removeItem('bt_seen');
          const vues = new Set();
          for (let l = 0; l < LECONS_PAR_UNITE; l++) {
            const qs = questionsDeLecon(i, l);
            const cles = qs.map(q => qKey(q));
            if (qs.length !== QUESTIONS_PAR_LECON) fautes.push(u.id + ' leçon ' + (l + 1) + ' : ' + qs.length + ' questions');
            if (new Set(cles).size !== cles.length) fautes.push(u.id + ' leçon ' + (l + 1) + ' : doublon');
            qs.forEach(q => { if (!u.livres.includes(bookOf(q))) fautes.push(u.id + ' : ' + bookOf(q)); });
            cles.forEach(k => { if (vues.has(k)) fautes.push(u.id + ' leçon ' + (l + 1) + ' : déjà vue dans l\'unité'); vues.add(k); });
          }
        });
        return fautes;
      });
      dit('12. chaque unité a de quoi faire ses cinq leçons : six questions de ses livres, sans doublon, sans revoir une question de l\'unité', !c12.length, c12.slice(0, 4).join(' | '));
      o.p._errs.forEach(e => errs.push(e));
      await o.ctx.close();
    }
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('13. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le Parcours : un chemin de la Genèse à l\'Apocalypse, des leçons qui comptent, une mémoire qui ne recule jamais');
  process.exit(ko ? 1 : 0);
})();
