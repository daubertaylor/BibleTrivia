/* ====== BANC « LA SECONDE CHANCE » (v316) ======
   « Il faudrait refaire tout le mode À revoir : il n'est pas intéressant du
     tout. Je ne veux pas un truc qui te rappelle tes erreurs d'il y a trop
     longtemps, mais plus ciblé, vraiment intéressant, qui donne envie au
     joueur de jouer sur ce mode. »

   Ce banc remplace « recurrentes.js », qui jugeait l'écran d'avant (le carnet
   entier, l'entêtement devant, quatre mires). Ce qui était exigé alors —
   « une porte qui annonce un nombre doit le tenir », « on ne montre jamais la
   dette » — l'est toujours ; ce qui change, c'est QUOI réviser.

   Un carnet témoin de seize erreurs, ratées entre aujourd'hui et il y a dix
   jours, certaines déjà sues depuis. CE QUE CE BANC EXIGE :
     1. seules les erreurs des SEPT DERNIERS JOURS (aujourd'hui et les six
        d'avant) pas encore sues depuis sont à rattraper — rien de plus vieux ;
     2. les plus FRAÎCHES d'abord ; à égalité de jour, la plus tenace ;
     3. le grand nombre est ce que le bouton va jouer (cinq au plus), la carte
        de l'accueil dit le même, et le bouton joue exactement ces cinq-là,
        dans l'ordre de la liste ;
     4. chaque ligne dit son livre, son jour (« Aujourd'hui », « Hier », puis
        le nom du jour), et sa question EN ENTIER — elle passe à la ligne, rien
        n'est coupé par « … » (banc-essai/revue.js) — ; les questions
        commencent toutes au même endroit ;
     5. une bonne réponse, et l'erreur est rattrapée : elle quitte la liste et
        la jauge de la semaine avance ; une nouvelle faute la remet en tête ;
     6. une entrée d'avant la v316 (sans « rate ») compte d'après « maj » tant
        qu'elle n'a jamais été sue ;
     7. rien n'est jamais effacé du carnet par cet écran ;
     8. rien à rattraper : « Rien à rattraper » et un bouton vers le Solo ;
        tout rattrapé cette semaine : « Tout est rattrapé » ;
     9. la page ne déborde pas, sur un iPhone SE comme sur un iPhone 15 ;
    10. aucune erreur.
   Usage : node banc-essai/seconde-chance.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(60) + (det || '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    for (const [appareil, W, H] of [['iPhone 15', 393, 852], ['iPhone SE', 375, 667]]) {
      console.log(appareil);
      const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1');
      });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });

      /* Le carnet témoin, fait de VRAIES questions de la banque (le livre se lit
         dans leur fait). Pour chaque entrée : il y a combien de jours, à
         quelle heure, son entêtement, son palier, et si elle a « rate ». */
      const temoin = await p.evaluate(() => {
        const plan = [
          // jours, heure, n, p, rate ?
          [0, 9, 1, 0, true],   // aujourd'hui
          [0, 8, 3, 0, true],   // aujourd'hui, plus tôt mais plus tenace
          [1, 21, 1, 0, true],  // hier soir
          [1, 7, 2, 0, true],   // hier matin
          [2, 12, 1, 0, true],
          [3, 12, 4, 0, true],
          [5, 12, 1, 0, true],
          [6, 23, 1, 0, true],  // le dernier jour de la fenêtre
          [7, 1, 9, 0, true],   // hors fenêtre, même très tenace
          [10, 12, 2, 0, true], // hors fenêtre
          [2, 10, 1, 1, true],  // ratée il y a 2 jours, sue depuis : rattrapée
          [4, 10, 2, 2, true],  // idem
          [3, 15, 1, 0, false], // d'avant la v316, jamais sue : compte par « maj »
          [3, 16, 1, 1, false], // d'avant la v316, déjà sue : on ne sait plus
          [9, 12, 1, 1, true],  // sue, mais ratée il y a 9 jours : hors semaine
          [0, 6, 1, 0, true],   // aujourd'hui, très tôt
        ];
        const tous = [].concat(BANK.facile, BANK.moyen, BANK.difficile).filter(q => bookOf(q));
        const auj = new Date();
        const a = plan.map(([j, h, n, pal, avecRate], i) => {
          const q = tous[i * 7 + 3];
          const t = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - j, h, 0, 0).getTime();
          const e = { k: qKey(q), n, p: pal, du: dayKey(1), maj: t, q: q.q, options: q.options, correct: q.correct, fact: q.fact, tier: 'moyen' };
          if (avecRate) e.rate = t;
          return e;
        });
        /* Une heure « aujourd'hui » encore à venir ferait une erreur dans le
           futur : on ramène tout ce qui serait après maintenant juste avant. */
        const m = Date.now();
        a.forEach((e, i) => { if (e.maj > m) { e.maj = m - (i + 1) * 1000; if (e.rate) e.rate = e.maj; } });
        localStorage.setItem('bt_errbook', JSON.stringify(a));
        return a.map((e, i) => ({ i, k: e.k, q: e.q, livre: livreCourt(bookOf(e)), j: plan[i][0], n: e.n, p: e.p, t: e.rate || e.maj, rate: !!e.rate }));
      });
      const attendues = temoin.filter(e => e.p === 0 && e.j <= 6 && (e.rate || e.p === 0))
        .sort((a, b) => (b.t - a.t) || (b.n - a.n));
      const rattrapeesAtt = temoin.filter(e => e.p > 0 && e.rate && e.j <= 6).length;

      /* ---- 1 & 2 ---- */
      const file = await p.evaluate(() => aRattraper().map(x => x.k));
      v('seules les erreurs des sept derniers jours, pas encore sues', file.length === attendues.length && attendues.every(e => file.includes(e.k)),
        file.length + ' à rattraper, ' + attendues.length + ' attendues');
      v('les plus fraîches d\'abord', JSON.stringify(file) === JSON.stringify(attendues.map(e => e.k)),
        file.map(k => temoin.find(e => e.k === k).j + 'j').join(' '));
      v('une entrée d\'avant la v316 jamais sue compte par « maj »', file.includes(temoin[12].k), '');
      v('… déjà sue, elle ne revient pas', !file.includes(temoin[13].k), '');

      /* ---- 3 & 4 ---- */
      await p.evaluate(() => { state.screen = 'mode'; render(); });
      await p.waitForTimeout(500);
      const pastille = await p.evaluate(() => +((document.querySelector('.revoir-card .rv-n') || {}).textContent || -1));
      await p.evaluate(() => { ouvrirRevoir(); });
      await p.waitForTimeout(900);
      const ecran = await p.evaluate(() => {
        const lignes = [...document.querySelectorAll('.rv-ligne')].map(l => {
          const q = l.querySelector('.rv-q');
          return { livre: (l.querySelector('.rv-bk') || {}).textContent || '', quand: (l.querySelector('.rv-quand') || {}).textContent || '',
            q: q ? q.textContent : '', entiere: !!q && q.scrollWidth <= q.clientWidth + 1 && q.scrollHeight <= q.clientHeight + 1,
            gauche: q ? Math.round(q.getBoundingClientRect().left) : -1 };
        });
        const app = document.getElementById('app');
        return { nb: +((document.querySelector('.rv-nb') || {}).textContent || -1), lignes,
          suite: (document.querySelector('.rv-suite') || {}).textContent || '',
          jauge: (document.querySelector('.rv-pct') || {}).textContent || '',
          bouton: (document.querySelector('.rv-go') || {}).textContent || '',
          largeur: document.documentElement.scrollWidth - innerWidth,
          haut: app.scrollHeight - app.clientHeight };
      });
      const cinq = attendues.slice(0, 5);
      const textes = await p.evaluate((ks) => { const a = loadErrbook(); return ks.map(k => texteQuestion(a.find(x => x.k === k))); }, cinq.map(e => e.k));
      v('le grand nombre est ce que le bouton va jouer (cinq au plus)', ecran.nb === Math.min(5, attendues.length), ecran.nb + ' affiché');
      v('la carte de l\'accueil dit le même nombre', pastille === ecran.nb, 'pastille ' + pastille);
      /* Le jeu pose des espaces insécables devant « ? » et « ! » après le
         rendu (la typographie française) : on compare les mots, pas les
         espaces. */
      const plat = (t) => String(t).replace(/\s+/g, ' ').trim();
      const ecartTexte = ecran.lignes.findIndex((l, i) => plat(l.q) !== plat(textes[i]));
      v('la liste montre ces cinq-là, dans l\'ordre', ecran.lignes.length === cinq.length && ecartTexte < 0,
        ecran.lignes.length + ' lignes' + (ecartTexte >= 0 ? ' ; ligne ' + ecartTexte + ' : « ' + ecran.lignes[ecartTexte].q.slice(0, 50) + ' » / « ' + String(textes[ecartTexte]).slice(0, 50) + ' »' : ''));
      v('chaque ligne dit son livre', ecran.lignes.every((l, i) => l.livre === cinq[i].livre), ecran.lignes.map(l => l.livre).join(', '));
      const jourAttendu = (j) => j === 0 ? 'Aujourd\'hui' : j === 1 ? 'Hier' : null;
      v('… et son jour', ecran.lignes.every((l, i) => { const a = jourAttendu(cinq[i].j); return a ? l.quand === a : /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(l.quand); }),
        ecran.lignes.map(l => l.quand).join(', '));
      v('… et sa question en entier, rien de coupé', ecran.lignes.length > 0 && ecran.lignes.every(l => l.entiere), '');
      v('les questions commencent toutes au même endroit', new Set(ecran.lignes.map(l => l.gauche)).size === 1, ecran.lignes.map(l => l.gauche).join(' '));
      v('le reste se dit en petit sous la liste', attendues.length > 5 ? /\d/.test(ecran.suite) : ecran.suite === '', ecran.suite);
      v('la jauge de la semaine compte les rattrapées', ecran.jauge.indexOf(String(rattrapeesAtt)) === 0 && ecran.jauge.indexOf(String(rattrapeesAtt + attendues.length)) > 0, ecran.jauge);
      v('la page ne déborde pas', ecran.largeur <= 0 && ecran.haut <= 1, 'largeur +' + ecran.largeur + ', hauteur +' + ecran.haut);

      /* ---- 3 (suite) : le bouton joue exactement ces cinq-là ---- */
      const carnetAvant = await p.evaluate(() => loadErrbook().length);
      await p.locator('.rv-go').tap();
      await p.waitForTimeout(700);
      const joue = await p.evaluate(() => ({ n: state.questions.length, rev: state.revision, qs: state.questions.map(q => q.q), titre: (document.querySelector('.app-header .header-title') || {}).textContent }));
      v('le bouton joue exactement ce qui est annoncé', joue.rev === true && joue.n === ecran.nb && joue.qs.every((q, i) => q === temoin.find(e => e.k === cinq[i].k).q), joue.n + ' jouées');
      v('le jeu s\'appelle « Seconde chance »', /Seconde chance/.test(joue.titre || ''), joue.titre);

      /* ---- 5 ---- la première juste, la deuxième fausse, le reste juste. */
      const fin = await p.evaluate(async () => {
        const vus = [];
        for (let t = 0; t < 10 && state.screen === 'play'; t++) {
          const q = currentQ();
          const juste = state.currentIndex !== 1;
          soloAnswer(juste ? q.shuffledOptions.indexOf(q.correct) : q.shuffledOptions.findIndex(o => o !== q.correct));
          await new Promise(r => setTimeout(r, 30));
          vus.push((document.querySelector('.fact-card .fact-label') || {}).textContent || '');
          nextQuestion();
          await new Promise(r => setTimeout(r, 30));
        }
        return { ecran: state.screen, labels: vus, titre: (document.querySelector('.end-title') || {}).textContent || '',
          reste: (document.querySelector('.end-best') || {}).textContent || '' };
      });
      v('« Rattrapée ! » sur une bonne réponse, le fait sur une faute', /Rattrap/.test(fin.labels[0]) && !/Rattrap/.test(fin.labels[1]), fin.labels.join(' | '));
      v('la fin compte les erreurs rattrapées', fin.ecran === 'end' && /4 rattrapées sur 5/.test(fin.titre), fin.titre + ' — ' + fin.reste);
      const apres = await p.evaluate(() => ({ file: aRattraper().map(x => x.k), faites: rattrapees().length, carnet: loadErrbook().length }));
      v('les rattrapées quittent la liste, la ratée reste en tête', apres.file[0] === cinq[1].k && !apres.file.includes(cinq[0].k) && !apres.file.includes(cinq[2].k),
        apres.file.length + ' à rattraper');
      v('la semaine avance de quatre', apres.faites === rattrapeesAtt + 4, apres.faites + ' rattrapées');
      v('rien n\'est effacé du carnet', apres.carnet === carnetAvant, carnetAvant + ' -> ' + apres.carnet);

      /* ---- 8 ---- tout rattraper, puis plus rien du tout. */
      await p.evaluate(() => { const a = loadErrbook(); a.forEach(x => { if ((x.p | 0) === 0 && recente(x)) { x.p = 1; } }); saveErrbook(a); state.screen = 'revoir'; render(); });
      await p.waitForTimeout(700);
      const tout = await p.evaluate(() => ({ titre: (document.querySelector('.rv-titre') || {}).textContent || '', bouton: (document.querySelector('.rv-go') || {}).textContent || '' }));
      v('tout rattrapé : « Tout est rattrapé »', /Tout est rattrapé/.test(tout.titre), tout.titre + ' / ' + tout.bouton);
      await p.evaluate(() => { localStorage.setItem('bt_errbook', '[]'); state.screen = 'revoir'; render(); });
      await p.waitForTimeout(700);
      const rien = await p.evaluate(() => ({ titre: (document.querySelector('.rv-titre') || {}).textContent || '' }));
      await p.locator('.rv-go').tap();
      await p.waitForTimeout(600);
      const solo = await p.evaluate(() => ({ ecran: state.screen, mode: state.mode }));
      v('rien à rattraper : « Rien à rattraper », et le bouton mène au Solo', /Rien à rattraper/.test(rien.titre) && solo.ecran === 'setup' && solo.mode === 'solo', rien.titre + ' -> ' + JSON.stringify(solo));
      v('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) {
    console.log('  KO le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la seconde chance : récente, courte, et ce qu\'elle annonce, elle le joue');
  process.exit(ko ? 1 : 0);
})();
