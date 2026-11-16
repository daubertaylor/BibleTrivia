/* ====== BANC « UN PARCOURS TRÈS VASTE, OÙ L'ON JOUE AUSSI » (v376) ======
   « Pour le mode Parcours, je veux qu'il soit vraiment très vaste et qu'il
     ne se finisse pas rapidement. » — « Mélanger un peu les modes de jeu à
     certains moments : des modes du mode Jeux dans le Parcours. »
   Sur un iPhone :
   LE CHEMIN
     1. trois étapes, cinquante-quatre unités, deux cent soixante-dix leçons
        et quatre-vingt-seize jeux ; les douze unités d'avant n'ont pas bougé
        (rang, clé, nom, livres) ; aucune clé de pierre en double ;
     2. chaque question de la banque qui a un livre est dans UNE unité de la
        première étape, et dans UNE unité de l'étape de son Testament (les
        chapitres découpent sans trou ni chevauchement) ; chaque nouvelle
        unité a au moins vingt questions ;
   PERSONNE NE RECULE
     3. un joueur d'avant (Genèse et Exode faits, trois leçons de la Terre
        promise) : la pierre à faire est le jeu de la Terre promise ; les jeux
        posés derrière lui (Genèse, Exode) sont ouverts, en bonus ; aucune
        leçon faite ne se ferme ; la leçon d'après attend le jeu ; la carte
        dit toujours « 13 leçons sur 60 » ;
   UN JEU DU CHEMIN
     4. il se joue sur l'écran des Jeux, en quatre manches tirées des livres
        de l'unité et de leurs voisins ; la barre du bas reste sur Parcours ;
     5. fini sans faute : fait pour toujours (« terre:j1 »), quinze diamants
        une fois, les records de l'onglet Jeux intacts ; « Continuer » ramène
        au chemin, où la tuile s'allume et la leçon d'après s'ouvre ;
     6. quitter un jeu du chemin : « Quitter le jeu ? », et retour au chemin ;
   LES ÉTAPES
     7. l'en-tête dit « Étape 1 sur 3 » ; la page des étapes les montre
        toutes ; la deuxième se regarde (vingt-trois unités, « Genèse 1–11 »),
        ses pierres fermées ; au bout, la suivante dit quand elle s'ouvre ;
     8. la dernière leçon de l'étape 1 : « Étape terminée ! » ; le chemin
        montre alors l'étape 2, sa première leçon à faire, et l'étape 1 finie
        mène à la suivante ;
   L'ÉCRAN
     9. dans les étapes 2 et 3, rien ne se chevauche et rien ne sort de
        l'écran (pierres, tuiles et leurs noms, quêtes) ;
    10. en anglais et en espagnol, les unités et les étapes parlent la langue ;
    11. aucune erreur.
   Usage : node banc-essai/parcours-vaste.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 480) + ')' : '')); if (!bon) ko++; };

const ANCIEN = { 'genese:1':'2026-10-01', 'genese:2':'2026-10-01', 'genese:3':'2026-10-02', 'genese:4':'2026-10-02', 'genese:5':'2026-10-03',
  'exode:1':'2026-10-04', 'exode:2':'2026-10-04', 'exode:3':'2026-10-05', 'exode:4':'2026-10-05', 'exode:5':'2026-10-06',
  'terre:1':'2026-10-07', 'terre:2':'2026-10-07', 'terre:3':'2026-10-08' };

async function ouvrir(nav, lg, faites) {
  const ctx = await nav.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  const p = await ctx.newPage();
  p._errs = [];
  p.on('pageerror', e => p._errs.push(e.message));
  await p.addInitScript(([lg, faites]) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    if (lg) localStorage.setItem('bt_langue', lg);
    localStorage.setItem('bt_parcours', JSON.stringify({ v: 1, faites: faites || {} }));
    localStorage.setItem('bt_tresor', JSON.stringify({ v: 1, gains: {}, depenses: {} }));
    localStorage.setItem('bt_jeux', JSON.stringify({ livres: { record: 50, parties: 3 } }));
  }, [lg || null, faites || null]);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode' && typeof sequenceParcours === 'function'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.evaluate(() => { try { achToastPause = true; } catch (e) {} });
  return { ctx, p };
}
const fermerFete = (p) => p.evaluate(() => { const b = document.querySelector('#modalVeil.fete-page #modalOk'); if (b) b.click(); });

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    /* ---- 1, 2 ---- la carte du chemin */
    {
      const o = await ouvrir(nav, null, {});
      const r = await o.p.evaluate(() => {
        const { S, rang } = sequenceParcours();
        const avant = [['genese','Au commencement','Genèse'],['exode',"L'Exode et le désert",'Exode'],['terre','La Terre promise','Josué'],['rois',"Les rois d'Israël",'1 Samuel'],
          ['exil',"L'exil et le retour",'Esdras'],['sagesse','Sagesse et poésie','Job'],['grands','Les grands prophètes','Ésaïe'],['petits','Les petits prophètes','Osée'],
          ['jesus','La vie de Jésus','Matthieu'],['eglise',"L'Église naissante",'Actes'],['paul','Les lettres de Paul','Romains'],['fin','Lettres et Apocalypse','Hébreux']];
        const intacts = avant.every(([id, nom, b], i) => PARCOURS[i].id === id && PARCOURS[i].nom === nom && PARCOURS[i].livres[0] === b && !PARCOURS[i].e && !PARCOURS[i].chap);
        const ids = new Set(PARCOURS.map(u => u.id));
        const lecons = S.filter(x => x.k === 'l').length, jeux = S.filter(x => x.k === 'j').length;
        const parEtape = ETAPES.map((E, e) => unitesDeLEtape(e).length);
        /* 2 : chaque question à sa place */
        const fautes = [], tailles = [];
        ['facile','moyen','difficile'].forEach(t => (BANK[t] || []).forEach(q => {
          const b = bookOf(q); if (!b) return;
          const nt = BIBLE_BOOKS.indexOf(b) >= BIBLE_AT_COUNT;
          const e1 = unitesDeLEtape(0).filter(u => dansLUnite(PARCOURS[u], q)).length;
          const e2 = unitesDeLEtape(nt ? 2 : 1).filter(u => dansLUnite(PARCOURS[u], q)).length;
          if (e1 !== 1 || e2 !== 1) fautes.push(b + ' ' + chapitreDe(q) + ' : ' + e1 + '/' + e2 + ' — ' + String(q.q).slice(0, 40));
        }));
        PARCOURS.forEach((U, u) => { if (!U.e) return; const k = new Set(); ['facile','moyen','difficile'].forEach(t => (BANK[t] || []).forEach(q => { if (dansLUnite(U, q)) k.add(qKey(q)); })); if (k.size < 20) tailles.push(U.id + ':' + k.size); });
        return { intacts, unites: PARCOURS.length, ids: ids.size, lecons, jeux, cles: rang.size, pierres: S.length, parEtape, etapes: ETAPES.length, fautes: fautes.slice(0, 4), nFautes: fautes.length, tailles };
      });
      dit('1. trois étapes, cinquante-quatre unités, 270 leçons et 96 jeux ; les douze unités d\'avant n\'ont pas bougé ; aucune clé de pierre en double',
        r.etapes === 3 && r.unites === 54 && r.ids === 54 && r.lecons === 270 && r.jeux === 96 && r.cles === r.pierres && r.pierres === 366 && r.intacts && r.parEtape.join() === '12,23,19', JSON.stringify(r).slice(0, 300));
      dit('2. chaque question à livre est dans une seule unité de l\'étape 1 et une seule de l\'étape de son Testament ; chaque nouvelle unité a au moins vingt questions',
        r.nFautes === 0 && r.tailles.length === 0, r.nFautes + ' : ' + r.fautes.join(' | ') + ' ; petites : ' + r.tailles.join(', '));
      o.p._errs.forEach(e => errs.push(e));
      await o.ctx.close();
    }

    /* ---- 3 → 6 ---- un joueur d'avant */
    {
      const o = await ouvrir(nav, null, ANCIEN), p = o.p;
      await p.evaluate(() => allerOnglet('parcours'));
      await p.waitForTimeout(1400);
      const r3 = await p.evaluate(() => {
        const t = (sel) => [...document.querySelectorAll(sel)];
        const unite = (i) => document.querySelectorAll('.ch-unite')[i];
        const jeux = t('.ch-jeu').slice(0, 4).map(j => j.className.replace('ch-jeu ', '').trim());
        const lecFaitesFermees = t('.ch-noeud.faite .ch-pierre[disabled]').length;
        return { pos: positionParcours(), jeux, lecFaitesFermees, terre4: leconOuverte(2, 3), genJeu: pierreOuverte(0, { k:'j', g:0 }), compte: document.querySelector('.ch-compte').textContent,
          bulle: unite(2).querySelector('.ch-jeu.courante .ch-bulle') && unite(2).querySelector('.ch-jeu.courante .ch-bulle').textContent, faites: Object.keys(loadParcours().faites).length };
      });
      dit('3. un joueur d\'avant : la pierre à faire est le jeu de la Terre promise, les jeux derrière lui sont ouverts, aucune leçon faite ne se ferme, la leçon d\'après attend le jeu',
        r3.pos && r3.pos.u === 2 && r3.pos.jeu && r3.pos.g === 0 && r3.jeux.join() === 'ouverte,ouverte,courante,fermee' && r3.lecFaitesFermees === 0 && !r3.terre4 && r3.genJeu
        && r3.compte === '13 leçons sur 60' && r3.bulle === 'Jouer' && r3.faites === 13, JSON.stringify(r3));

      await p.evaluate(() => { const b = document.querySelectorAll('.ch-unite')[2].querySelector('.ch-jeu.courante .ch-bulle'); b.click(); });
      await p.waitForTimeout(1300);
      const r4 = await p.evaluate(() => {
        const idx = PARCOURS[2].livres.map(b => BIBLE_BOOKS.indexOf(b));
        const de = Math.min(...idx) - 6, a = Math.max(...idx) + 6;
        return { ecran: state.screen, id: jeu && jeu.id, n: jeu && jeu.manches.length, dedans: jeu && jeu.manches.every(m => m.livres.every(b => b >= de && b <= a)),
          onglet: (document.querySelector('.bb-onglet.actif') || {}).dataset ? document.querySelector('.bb-onglet.actif').dataset.o : null, titre: (document.querySelector('.header-title') || {}).textContent };
      });
      dit('4. le jeu du chemin : l\'écran des Jeux, quatre manches de Range les livres tirées de la Terre promise et de ses voisins ; la barre reste sur Parcours',
        r4.ecran === 'jeu' && r4.id === 'livres' && r4.n === 4 && r4.dedans && (r4.onglet === 'parcours' || r4.onglet === null), JSON.stringify(r4));

      await p.evaluate(() => { for (let k = 0; k < 10 && state.screen === 'jeu'; k++) { conclureManche(true); mancheSuivante(); } });
      await p.waitForTimeout(1400);
      await fermerFete(p);
      await p.waitForTimeout(700);
      const r5a = await p.evaluate(() => ({ ecran: state.screen, gain: jeu && jeu.gain, fait: loadParcours().faites['terre:j1'], solde: soldeDiamants(), jeux: localStorage.getItem('bt_jeux'),
        carte: (document.querySelector('.jx-bilan') || {}).innerText }));
      await p.evaluate(() => { const b = document.querySelector('.jeu-fin .jx-rejouer'); b.click(); });
      await p.waitForTimeout(1600);
      const r5b = await p.evaluate(() => ({ ecran: state.screen, allume: !!document.querySelector('.ch-jeu.s-allume'), pos: positionParcours(),
        courante: !!document.querySelectorAll('.ch-unite')[2].querySelectorAll('.ch-noeud')[3].classList.contains('courante') }));
      dit('5. fini sans faute : fait pour toujours, quinze diamants une fois, les records des Jeux intacts ; « Continuer » ramène au chemin, la tuile s\'allume, la leçon 4 s\'ouvre',
        r5a.ecran === 'jeu-fin' && r5a.gain === 15 && !!r5a.fait && r5a.solde >= 15 && r5a.jeux === JSON.stringify({ livres: { record: 50, parties: 3 } }) && /\+15/.test(r5a.carte || '')
        && r5b.ecran === 'chemin' && r5b.allume && r5b.pos && r5b.pos.u === 2 && r5b.pos.l === 3 && r5b.courante, JSON.stringify({ r5a, r5b }));

      /* 6 : le jeu de la Genèse, en bonus, quitté */
      await p.evaluate(() => commencerJeuDuChemin(0, 0));
      await p.waitForTimeout(1200);
      const r6a = await p.evaluate(() => ({ ecran: state.screen, id: jeu && jeu.id }));
      await p.evaluate(() => quitterJeu());
      await p.waitForTimeout(500);
      const titre = await p.evaluate(() => (document.querySelector('#modalVeil .modal-title') || {}).textContent);
      await p.evaluate(() => document.getElementById('modalOk').click());
      await p.waitForTimeout(1300);
      const r6b = await p.evaluate(() => ({ ecran: state.screen, jeu: jeu, fait: !!loadParcours().faites['genese:j1'] }));
      dit('6. le jeu de la Genèse, en bonus : il se lance ; quitté (« Quitter le jeu ? »), on revient au chemin et rien n\'est compté',
        r6a.ecran === 'jeu' && r6a.id === 'combien' && titre === 'Quitter le jeu ?' && r6b.ecran === 'chemin' && r6b.jeu === null && !r6b.fait, JSON.stringify({ r6a, titre, r6b }));

      /* ---- 7 ---- les étapes */
      const r7a = await p.evaluate(() => ({ sur: document.querySelector('.ch-sur').textContent, titre: document.querySelector('.ch-titre').textContent,
        suite: (document.querySelector('.ch-suite') || {}).className, cle: !!document.querySelector('.ch-suite .ch-suite-cle') }));
      await p.evaluate(() => ouvrirEtapes());
      await p.waitForTimeout(900);
      const r7b = await p.evaluate(() => [...document.querySelectorAll('#etapesVeil .et-ligne')].map(l => l.className.replace('et-ligne', '').trim() + '|' + l.querySelector('b').textContent + '|' + l.querySelector('.et-etat').textContent));
      await p.evaluate(() => document.querySelectorAll('#etapesVeil .et-ligne')[1].click());
      await p.waitForTimeout(1300);
      const r7c = await p.evaluate(() => ({ voile: !!document.querySelector('#etapesVeil:not(.closing)'), sur: document.querySelector('.ch-sur').textContent, unites: document.querySelectorAll('.ch-unite').length,
        premiere: document.querySelector('.ch-bandeau small').textContent, ouvertes: document.querySelectorAll('.ch-pierre:not([disabled]), .ch-tuile:not([disabled])').length,
        haut: document.getElementById('app').scrollTop, suite: (document.querySelector('.ch-suite-titre') || {}).textContent }));
      dit('7. « Étape 1 sur 3 » ; la page des étapes les montre toutes ; l\'étape 2 se regarde (23 unités, « Genèse 1–11 »), ses pierres fermées ; au bout, la suivante dit quand elle s\'ouvre',
        r7a.sur === 'Étape 1 sur 3' && r7a.titre === 'Les grands récits' && /fermee/.test(r7a.suite) && r7a.cle
        && r7b.length === 3 && /^\|Les grands récits\|En cours/.test(r7b[0]) && /^fermee\|L'Ancien Testament, livre par livre\|Après l'étape 1/.test(r7b[1]) && /^fermee\|Le Nouveau/.test(r7b[2])
        && r7c.sur === 'Étape 2 sur 3' && r7c.unites === 23 && r7c.premiere === 'Genèse 1–11' && r7c.ouvertes === 0 && r7c.haut === 0 && r7c.suite === 'Le Nouveau Testament, livre par livre',
        JSON.stringify({ r7a, r7b, r7c }));
      o.p._errs.forEach(e => errs.push(e));
      await o.ctx.close();
    }

    /* ---- 8 ---- la dernière leçon de l'étape 1 */
    {
      const presque = {};
      for (const id of ['genese','exode','terre','rois','exil','sagesse','grands','petits','jesus','eglise','paul','fin']) for (let l = 1; l <= 5; l++) presque[id + ':' + l] = '2026-10-10';
      delete presque['fin:5'];
      const o = await ouvrir(nav, null, presque), p = o.p;
      await p.evaluate(() => commencerLecon(11, 4));
      await p.waitForTimeout(900);
      await p.evaluate(() => { for (let i = 0; i < 20 && state.screen === 'play'; i++) { const q = currentQ(); soloAnswer(q.shuffledOptions.findIndex(x => x === q.correct)); nextQuestion(); } });
      await p.waitForTimeout(1400);
      await fermerFete(p);
      await p.waitForTimeout(600);
      const fin = await p.evaluate(() => ({ ecran: state.screen, etape: !!(state.lecon && state.lecon.etapeFinie), texte: (document.querySelector('.end-best') || {}).textContent }));
      await p.evaluate(() => continuerParcours());
      await p.waitForTimeout(1600);
      const apres = await p.evaluate(() => ({ sur: document.querySelector('.ch-sur').textContent, pos: positionParcours(), suite: (document.querySelector('.ch-suite') || {}).className,
        bouton: (document.querySelector('.ch-suite-btn') || {}).textContent }));
      await p.evaluate(() => voirEtape(1));
      await p.waitForTimeout(1200);
      const e2 = await p.evaluate(() => ({ sur: document.querySelector('.ch-sur').textContent, courante: !!document.querySelector('.ch-unite .ch-noeud.courante'), bulle: (document.querySelector('.ch-noeud.courante .ch-bulle') || {}).textContent }));
      dit('8. la dernière leçon de l\'étape 1 : « Étape terminée ! » ; l\'étape 1 finie mène à la suivante, où la première leçon est à faire',
        fin.etape && /Étape terminée/.test(fin.texte || '') && apres.sur === 'Étape 1 sur 3' && apres.pos && apres.pos.u === 12 && apres.pos.l === 0 && !/fermee/.test(apres.suite || 'fermee') && apres.bouton === 'Aller à l\'étape 2'
        && e2.sur === 'Étape 2 sur 3' && e2.courante && e2.bulle === 'Commencer', JSON.stringify({ fin, apres, e2 }));
      o.p._errs.forEach(e => errs.push(e));
      await o.ctx.close();
    }

    /* ---- 9 ---- rien ne se chevauche, rien ne sort */
    {
      const o = await ouvrir(nav, null, {}), p = o.p;
      const fautes = [];
      for (const e of [1, 2]) {
        await p.evaluate((e) => { etapeVue = e; state.screen = 'chemin'; render(); }, e);
        await p.waitForTimeout(1100);
        const r = await p.evaluate(() => {
          const out = [], W = innerWidth;
          document.querySelectorAll('.ch-unite').forEach((u, ui) => {
            const boites = [...u.querySelectorAll('.ch-pierre, .ch-tuile, .ch-jeu-nom, .ch-bulle, .ch-medaillon, .ch-quete .ch-etiq, .ch-coffre-btn')].map(x => ({ x, r: x.getBoundingClientRect() }));
            boites.forEach(b => { if (b.r.left < 2 || b.r.right > W - 2) out.push(ui + ' sort : ' + b.x.className); });
            for (let i = 0; i < boites.length; i++) for (let j = i + 1; j < boites.length; j++) {
              const a = boites[i].r, b = boites[j].r;
              if (boites[i].x.contains(boites[j].x) || boites[j].x.contains(boites[i].x)) continue;
              const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (ix > 1 && iy > 1) out.push(ui + ' : ' + boites[i].x.className + ' × ' + boites[j].x.className);
            }
          });
          return out;
        });
        r.forEach(x => fautes.push('étape ' + (e + 1) + ' · ' + x));
      }
      dit('9. dans les étapes 2 et 3, rien ne se chevauche et rien ne sort de l\'écran (pierres, tuiles et leurs noms, quêtes, coffres)', !fautes.length, fautes.slice(0, 4).join(' | '));
      o.p._errs.forEach(e => errs.push(e));
      await o.ctx.close();
    }

    /* ---- 10 ---- les langues */
    {
      const c = {};
      for (const lg of ['en', 'es']) {
        const o = await ouvrir(nav, lg, {}), p = o.p;
        c[lg] = await p.evaluate(() => {
          etapeVue = 2; state.screen = 'chemin'; render();
          const noms = PARCOURS.map(u => T(u.nom)), francais = PARCOURS.filter(u => T(u.nom) === u.nom && !/^(Abraham|Joseph)$/.test(u.nom)).map(u => u.nom);
          return { sur: document.querySelector('.ch-sur').textContent, titre: document.querySelector('.ch-titre').textContent, premiere: document.querySelector('.ch-bandeau b').textContent,
            livres: document.querySelector('.ch-bandeau small').textContent, francais, etapes: ETAPES.map(E => T(E.nom)).join(' / '), jeu: (document.querySelector('.ch-jeu-nom small') || {}).textContent };
        });
        o.p._errs.forEach(e => errs.push(lg + ' : ' + e));
        await o.ctx.close();
      }
      dit('10. en anglais et en espagnol, les unités et les étapes parlent la langue du joueur',
        c.en.sur === 'Stage 3 of 3' && c.en.titre === 'The New Testament, book by book' && c.en.premiere === 'The birth and the Sermon' && c.en.livres === 'Matthew 1–7' && !c.en.francais.length
        && c.es.sur === 'Etapa 3 de 3' && c.es.titre === 'El Nuevo Testamento, libro por libro' && c.es.premiere === 'El nacimiento y el Sermón' && !c.es.francais.length, JSON.stringify(c));
    }
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + (e.stack || e.message).slice(0, 400)); }
  dit('11. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — un Parcours en trois étapes, cinquante-quatre unités et des jeux sur le chemin ; personne ne recule');
  process.exit(ko ? 1 : 0);
})();
