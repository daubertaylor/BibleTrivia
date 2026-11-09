/* ====== BANC « LES JEUX » (v347) ======
   « Je veux ces modes de jeu avec notre univers. Ça commence à faire
     vraiment beaucoup : imagine vraiment quelque chose de bien au niveau de
     l'interface pour ajouter tout cela. »
   Un onglet « Jeux » entre l'Accueil et les Groupes, l'écran des jeux (le
   jeu du jour en tête, puis les cinq en grille), et cinq jeux. Sans serveur,
   en touchant les vrais boutons, sur un iPhone :
     1. LA BARRE A TROIS ONGLETS — Accueil, Jeux, Groupes — et « Jeux » mène
        à l'écran des jeux, allumé ; le jeu du jour est le même à chaque
        lecture de la journée ; les cinq jeux sont là — sans « Nouveau » pour
        qui les trouve en arrivant : depuis la v350, « Nouveau » ne marque
        qu'un jeu arrivé APRÈS le joueur, tant qu'il n'y a pas joué ;
     2. CHAQUE JEU, JOUÉ JUSTE de la première à la dernière manche : chaque
        manche dit « Bien joué ! » et donne 10 points, « Suivant » puis « Voir
        les résultats » ; la fin dit 100 % et « Nouveau record ! », le record
        est écrit (bt_jeux) et la tuile le montre ;
     3. LE MÊME JEU, JOUÉ FAUX : « Le savais-tu ? », aucun point, 0 % — et le
        record reste celui d'avant ;
     4. LES MANCHES TIENNENT LEURS RÈGLES, sur trente tirages de chaque jeu :
        Range les livres (v354 : quatre puis cinq livres, de plus en plus
        serrés, jamais deux fois le même, jamais rangés d'avance), Qui ? Où ? (chaque personne
        n'a qu'un lieu possible parmi les quatre), Combien ? (la réponse parmi
        quatre nombres différents), Trouve l'erreur (un seul mot a changé, et
        le mot qui le remplace n'est dans AUCUNE version de la langue pour ce
        verset), Verset en morceaux (les morceaux recollés redonnent le verset,
        et ne sont jamais dans l'ordre au départ) ;
     5. UNE PARTIE FINIE ALLUME LA FLAMME DU JOUR, comme toute partie ;
     6. QUITTER EN COURS DEMANDE CONFIRMATION : « Rester » garde la manche,
        « Quitter » ramène aux jeux ;
     7. EN ANGLAIS ET EN ESPAGNOL : l'écran, les consignes, les fins sont
        traduits, et les deux jeux de versets prennent le texte de la version
        de la langue (King James, Reina-Valera) ;
     8. aucune erreur.
   Usage : node banc-essai/jeux.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };
const IDS = ['livres', 'quiou', 'combien', 'erreur', 'morceaux'];

const ouvrir = async (nav, lg) => {
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(lg + ' : ' + e.message));
  /* Jamais le vrai serveur : la bibliothèque du CDN est servie vide. */
  await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  if (lg !== 'fr') await p.route('**/index.html*', async route => {
    const r = await route.fetch();
    await route.fulfill({ response: r, body: (await r.text()).replace(/dispo:false/g, 'dispo:true') });
  });
  await p.addInitScript((lg) => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_langue', lg);
    /* Hier joué, aujourd'hui pas encore : la flamme attend sa partie. */
    const k = (n) => { const d = new Date(Date.now() - n * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    if (!localStorage.getItem('bt_daily')) localStorage.setItem('bt_daily', JSON.stringify({ last: k(1), streak: 3, jours: [k(1), k(2), k(3)], geles: [], gels: 1 }));
  }, lg);
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(700);
  return { ctx, p, errs };
};
const pose = async (p) => { await p.waitForTimeout(80); await p.waitForFunction(() => !document.querySelector('#app > .screen.screen-exit'), null, { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(120); };

/* Une manche, jouée juste ou faux, en touchant les boutons du jeu. */
const jouerManche = async (p, juste) => {
  const { id, m } = await p.evaluate(() => ({ id: jeu.id, m: JSON.parse(JSON.stringify(mancheCourante())) }));
  const touche = async (sel) => { await p.locator(sel).first().click({ timeout: 5000 }); };
  if (id === 'livres') {
    /* (v354) Toucher un livre puis un autre les échange : on range place
       après place. Faux : on valide l'ordre de départ, jamais le bon. */
    if (juste) {
      const cible = m.livres.slice().sort((a, b) => a - b);
      for (let r = 0; r < cible.length; r++) {
        const cur = await p.evaluate(() => mancheCourante().livres.slice());
        if (cur[r] === cible[r]) continue;
        await touche(`#jxZone .jx-livre[data-b="${cur[r]}"]`);
        await touche(`#jxZone .jx-livre[data-b="${cible[r]}"]`);
      }
    }
    await touche('#jxZone .jx-valider');
  } else if (id === 'quiou') {
    const n = m.paires.length;
    for (let i = 0; i < n; i++) {
      await touche(`#jxZone .jx-qui[data-i="${i}"]`);
      await touche(`#jxZone .jx-ou[data-l="${juste ? i : (i + 1) % n}"]`);
    }
    await touche('#jxZone .jx-valider');
  } else if (id === 'combien') {
    const k = m.options.findIndex(o => juste ? o === m.f[1] : o !== m.f[1]);
    await p.locator('#jxZone .jx-nb').nth(k).click({ timeout: 5000 });
  } else if (id === 'erreur') {
    await p.locator('#jxZone .jx-mot').nth(juste ? m.faux : (m.faux === 0 ? 1 : 0)).click({ timeout: 5000 });
  } else {
    const ks = [...Array(m.parts.length).keys()];
    for (const k of (juste ? ks : ks.slice().reverse())) await touche(`#jxZone .jx-bout[data-k="${k}"]`);
    /* (v351) Rien ne se valide tout seul : « Valider ». */
    await touche('#jxZone .jx-valider');
  }
  await p.waitForSelector('.jeu-ecran .fact-card', { timeout: 5000 });
  return p.evaluate(() => ({ label: document.querySelector('.fact-card .fact-label').textContent,
    fait: document.querySelector('.fact-card .ftext').textContent,
    score: document.querySelector('.solo-score-bar .value').textContent, points: jeu.points, juste: jeu.juste,
    i: jeu.i, total: jeu.manches.length, suivant: document.querySelector('.btn-next').textContent }));
};
/* Une partie entière : toutes les manches, puis les résultats. */
const jouerPartie = async (p, id, juste) => {
  await p.evaluate((id) => lancerJeu(id), id);
  await pose(p);
  const manches = [];
  for (let guard = 0; guard < 20; guard++) {
    const r = await jouerManche(p, juste);
    manches.push(r);
    await p.locator('.btn-next').click({ timeout: 5000 });
    if (r.i >= r.total - 1) break;
    await p.waitForFunction((i) => jeu && jeu.i === i && !jeu.revele, r.i + 1, { timeout: 5000 });
  }
  await p.waitForSelector('.jeu-fin .jx-bilan', { timeout: 8000 });
  await pose(p);
  /* LA FÊTE DE LA FLAMME. La première partie du jour la fait monter : une
     fenêtre la célèbre, juste après les résultats (comme toute partie). On
     la referme comme le joueur, par son bouton. */
  const fete = await p.waitForSelector('#modalVeil .fete-flamme', { timeout: 2500 }).then(() => true, () => false);
  if (fete) { await p.locator('#modalOk').click(); await p.waitForTimeout(600); }
  const fin = await p.evaluate((fete) => ({ ecran: state.screen, fete, pct: (document.querySelector('.jx-pct') || {}).textContent,
    bons: (document.querySelector('.jx-bons') || {}).textContent, nouveau: !!document.querySelector('.jx-nouveau'),
    ancien: (document.querySelector('.jx-ancien') || {}).textContent || '', titre: (document.querySelector('.jeu-fin .header-title') || {}).textContent,
    rejouer: (document.querySelector('.jx-rejouer') || {}).textContent, autres: (document.querySelector('.jx-autres') || {}).textContent,
    record: JSON.parse(localStorage.getItem('bt_jeux') || '{}') }), fete);
  return { manches, fin };
};

/* Les règles des manches, vérifiées dans la page, sur des tirages répétés. */
const REGLES = (n) => {
  const fautes = [];
  const mot = (w) => String(w).replace(/[«»"“”,;:.!?()]/g, '');
  for (let t = 0; t < n; t++) {
    /* Range les livres (v354) : 4, 4, puis 5 livres ; toute la Bible à huit
       rangs, puis un Testament à trois rangs, puis huit livres qui se
       suivent ; jamais deux fois le même, jamais rangés d'avance. */
    const ml = manchesLivres(6), vusL = new Set();
    if (ml.length !== 6) fautes.push('livres : ' + ml.length + ' manches');
    ml.forEach((m, k) => {
      const t = m.livres.slice().sort((a, b) => a - b);
      if (m.livres.length !== (k < 2 ? 4 : 5)) fautes.push('livres : manche ' + (k + 1) + ', ' + m.livres.length + ' livres');
      if (m.livres.every((b, i) => i === 0 || m.livres[i - 1] < b)) fautes.push('livres : manche ' + (k + 1) + ' déjà rangée');
      m.livres.forEach(b => { if (!(b >= 0 && b < 66)) fautes.push('livres : livre ' + b); if (vusL.has(b)) fautes.push('livres : ' + BIBLE_BOOKS[b] + ' deux fois'); vusL.add(b); });
      const ecart = Math.min(...t.slice(1).map((b, i) => b - t[i]));
      if (k < 2 && ecart < 8) fautes.push('livres : manche ' + (k + 1) + ', écart ' + ecart);
      if (k >= 2 && k < 4 && (ecart < 3 || (t[0] < 39) !== (t[t.length - 1] < 39))) fautes.push('livres : manche ' + (k + 1) + ', ' + t.join(','));
      if (k >= 4 && t[t.length - 1] - t[0] > 7) fautes.push('livres : manche ' + (k + 1) + ', trop large ' + t.join(','));
    });
    /* Qui ? Où ? */
    for (const m of manchesQuiou(6)) {
      const lieux = m.paires.map(p => p[1][0]), qui = m.paires.map(p => p[0][0]);
      if (new Set(lieux).size !== 4 || new Set(qui).size !== 4) fautes.push('quiou : doublon ' + qui.join(',') + ' / ' + lieux.join(','));
      m.paires.forEach((p, i) => lieux.forEach((l, j) => { if (j !== i && (p[3] || []).includes(l)) fautes.push('quiou : ' + p[0][0] + ' va aussi à ' + l); }));
      if (m.lieux.slice().sort().join() !== '0,1,2,3') fautes.push('quiou : lieux mal mélangés');
    }
    /* Combien ? */
    for (const m of manchesCombien(10)) {
      if (m.options.length !== 4 || new Set(m.options).size !== 4 || !m.options.includes(m.f[1])) fautes.push('combien : ' + m.f[0] + ' ' + m.options.join(','));
    }
    /* Trouve l'erreur */
    for (const m of manchesErreur(8)) {
      const v = HERO_VERSES.find(x => x.r === m.r);
      const vrai = texteVerset(m.r, v.t).split(/\s+/).filter(Boolean);
      const diff = vrai.map((w, i) => w !== m.mots[i] ? i : -1).filter(i => i >= 0);
      if (vrai.length !== m.mots.length || diff.length !== 1 || diff[0] !== m.faux) fautes.push('erreur : ' + m.r + ' — mots changés ' + JSON.stringify(diff));
      else {
        const nouveau = mot(m.mots[m.faux]), tous = versionsDeLaLangue(v).join(' ');
        if (motRe(nouveau).test(tous)) fautes.push('erreur : « ' + nouveau + ' » est dans une version de ' + m.r);
        if (mot(m.juste).toLowerCase() === nouveau.toLowerCase()) fautes.push('erreur : ' + m.r + ' — le mot n\'a pas changé');
      }
    }
    /* Verset en morceaux */
    for (const m of manchesMorceaux(6)) {
      const v = HERO_VERSES.find(x => x.r === m.r);
      const vrai = texteVerset(m.r, v.t).split(/\s+/).filter(Boolean).join(' ');
      if (m.parts.join(' ') !== vrai) fautes.push('morceaux : ' + m.r + ' recollé autrement');
      if (m.parts.length < 4 || m.parts.length > 6) fautes.push('morceaux : ' + m.parts.length + ' morceaux');
      if (m.melange.every((x, i) => m.parts[x] === m.parts[i])) fautes.push('morceaux : ' + m.r + ' déjà dans l\'ordre');
      if (m.parts.some(x => /^[«»"“”:;!?,.—–-]+$/.test(x))) fautes.push('morceaux : une ponctuation seule');
    }
  }
  return fautes;
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    /* ===== FRANÇAIS : tout ===== */
    const { ctx, p, errs: e1 } = await ouvrir(nav, 'fr');
    /* 1 */
    const barre = await p.evaluate(() => [...document.querySelectorAll('#barreBas .bb-onglet')].map(b => b.dataset.o + ':' + b.textContent.trim()));
    await p.locator('#barreBas .bb-onglet[data-o="jeux"]').click();
    await pose(p); await p.waitForTimeout(500);
    const hub = await p.evaluate(() => ({ ecran: state.screen, actif: (document.querySelector('#barreBas .bb-onglet.actif') || {}).dataset?.o,
      titre: document.querySelector('.jeux-ecran .header-title')?.textContent, une: document.querySelector('.jx-une .jx-nom')?.textContent,
      sur: document.querySelector('.jx-une .jx-sur')?.textContent, duJour: jeuDuJour().id, duJour2: jeuDuJour().id,
      tuiles: [...document.querySelectorAll('.jx-grille .jx-tuile .jx-nom')].map(x => x.textContent),
      neufs: document.querySelectorAll('.jx-grille .jx-record.jx-neuf').length, h: document.querySelector('.jx-h')?.textContent }));
    dit('1. la barre a trois onglets : Accueil, Jeux, Groupes', barre.length === 3 && barre[0].startsWith('accueil:') && barre[1] === 'jeux:Jeux' && barre[2].startsWith('groupes:'), barre.join(' · '));
    dit('1. « Jeux » ouvre l\'écran des jeux, onglet allumé ; le jeu du jour en tête, le même à chaque lecture ; les cinq jeux, sans « Nouveau » pour qui arrive',
      hub.ecran === 'jeux' && hub.actif === 'jeux' && hub.titre === 'Jeux' && hub.sur === 'Le jeu du jour' && hub.duJour === hub.duJour2
      && hub.tuiles.length === 5 && hub.neufs === 0 && hub.h === 'Tous les jeux', JSON.stringify(hub));
    /* (v350) Un jeu arrivé après le joueur — ici, comme si Verset en morceaux
       venait d'être ajouté : lui seul dit « Nouveau », jusqu'à ce qu'on y
       joue (la tuile dit alors son record : voir 2). */
    const neuf = await p.evaluate(async () => {
      const connus = JSON.parse(localStorage.getItem('bt_jeux_connus') || 'null');
      localStorage.setItem('bt_jeux_connus', JSON.stringify(JEUX.map(j => j.id).filter(id => id !== 'morceaux')));
      render(); await new Promise(z => setTimeout(z, 400));
      return { connus, neufs: [...document.querySelectorAll('.jx-grille .jx-tuile')].map((t, i) => t.querySelector('.jx-neuf') ? JEUX[i].id : null).filter(Boolean) };
    });
    dit('1. « Nouveau » marque seulement un jeu arrivé après le joueur (les jeux connus à l\'arrivée sont notés)',
      Array.isArray(neuf.connus) && neuf.connus.length === 5 && neuf.neufs.join() === 'morceaux', JSON.stringify(neuf));
    await p.locator('.jx-une').click(); await pose(p);
    const une = await p.evaluate(() => ({ ecran: state.screen, id: jeu && jeu.id, duJour: jeuDuJour().id }));
    dit('1. la carte du jeu du jour lance le jeu du jour', une.ecran === 'jeu' && une.id === une.duJour, JSON.stringify(une));
    await p.evaluate(() => { jeu = null; state.screen = 'jeux'; render(); }); await pose(p);
    /* 2, 3, 5 */
    const flammeAvant = await p.evaluate(() => loadDaily().last === dayKey(0));
    let fetes = 0;
    for (const id of IDS) {
      const J = await jouerPartie(p, id, true);
      if (J.fin.fete) fetes++;
      const toutJuste = J.manches.every((r, k) => r.juste && r.label === 'Bien joué !' && r.points === 10 * (k + 1) && r.score === (10 * (k + 1)) + ' pts')
        && J.manches.slice(0, -1).every(r => r.suivant === 'Suivant') && J.manches[J.manches.length - 1].suivant === 'Voir les résultats';
      dit('2. ' + id + ' joué juste : « Bien joué ! » et +10 à chaque manche, puis 100 %, « Nouveau record ! », record écrit',
        toutJuste && J.fin.ecran === 'jeu-fin' && /^100\s*%$/.test(J.fin.pct) && J.fin.nouveau && J.fin.record[id] && J.fin.record[id].record === 100 && J.fin.record[id].parties === 1,
        J.manches.length + ' manches · ' + JSON.stringify(J.fin).slice(0, 260) + (toutJuste ? '' : ' · ' + JSON.stringify(J.manches.find(r => !r.juste || r.label !== 'Bien joué !') || J.manches)));
      const F = await jouerPartie(p, id, false);
      if (F.fin.fete) fetes++;
      const toutFaux = F.manches.every(r => !r.juste && r.label === 'Le savais-tu ?' && r.points === 0);
      dit('3. ' + id + ' joué faux : « Le savais-tu ? », aucun point, 0 %, et le record reste 100 %',
        toutFaux && /^0\s*%$/.test(F.fin.pct) && !F.fin.nouveau && /100/.test(F.fin.ancien) && F.fin.record[id].record === 100 && F.fin.record[id].parties === 2,
        JSON.stringify(F.fin).slice(0, 260) + (toutFaux ? '' : ' · ' + JSON.stringify(F.manches.find(r => r.juste || r.label !== 'Le savais-tu ?'))));
      /* « Autres jeux » ramène à l'écran des jeux, où la tuile montre son record. */
      await p.locator('.jx-autres').click(); await pose(p); await p.waitForTimeout(400);
      const tuile = await p.evaluate((id) => { const i = JEUX.findIndex(j => j.id === id); const t = document.querySelectorAll('.jx-grille .jx-tuile')[i];
        return { ecran: state.screen, rec: t ? t.querySelector('.jx-record').textContent : null }; }, id);
      dit('2. ' + id + ' : « Autres jeux » revient à l\'écran des jeux, la tuile dit « Record 100 % »', tuile.ecran === 'jeux' && /Record\s*100\s*%/.test(tuile.rec || ''), JSON.stringify(tuile));
    }
    const flamme = await p.evaluate(() => ({ last: loadDaily().last, auj: dayKey(0), streak: loadDaily().streak }));
    dit('5. une partie finie allume la flamme du jour (et la fête, une fois)', !flammeAvant && flamme.last === flamme.auj && flamme.streak === 4 && fetes === 1, JSON.stringify(flamme) + ' · fêtes ' + fetes);
    /* 4 */
    const fautes = await p.evaluate(REGLES, 30);
    dit('4. trente tirages de chaque jeu : chaque manche tient ses règles', !fautes.length, fautes.slice(0, 6).join(' | ') || '0 faute');
    /* 6 */
    await p.evaluate(() => lancerJeu('combien')); await pose(p);
    const avant = await p.evaluate(() => jeu.i);
    await p.locator('.jeu-ecran .app-header .icon-btn').first().click();
    await p.waitForSelector('#modalVeil', { timeout: 3000 });
    const modale = await p.evaluate(() => ({ titre: document.querySelector('#modalVeil')?.textContent || '', ok: document.querySelector('#modalOk')?.textContent, non: document.querySelector('#modalCancel')?.textContent }));
    await p.locator('#modalCancel').click(); await p.waitForTimeout(500);
    const reste = await p.evaluate(() => ({ ecran: state.screen, i: jeu && jeu.i }));
    await p.locator('.jeu-ecran .app-header .icon-btn').first().click();
    await p.waitForSelector('#modalOk', { timeout: 3000 });
    await p.locator('#modalOk').click(); await pose(p); await p.waitForTimeout(500);
    const parti = await p.evaluate(() => ({ ecran: state.screen, jeu: jeu }));
    dit('6. quitter en cours demande confirmation ; « Rester » garde la manche, « Quitter » ramène aux jeux',
      /Quitter la partie/.test(modale.titre) && modale.ok === 'Quitter' && modale.non === 'Rester' && reste.ecran === 'jeu' && reste.i === avant && parti.ecran === 'jeux' && parti.jeu === null,
      JSON.stringify({ modale, reste, parti }));
    errs.push(...e1);
    await ctx.close();

    /* ===== 7. ANGLAIS ET ESPAGNOL ===== */
    const ATTENDU = {
      en: { onglet: 'Games', duJour: 'Game of the day', tous: 'All games', noms: ['Sort the books', 'Who? Where?', 'How many?', 'Spot the error', 'Verse in pieces'], bien: 'Well done!', savais: 'Did you know?', bible: 'kjv1769' },
      es: { onglet: 'Juegos', duJour: 'Juego del día', tous: 'Todos los juegos', noms: ['Ordena los libros', '¿Quién? ¿Dónde?', '¿Cuántos?', 'Encuentra el error', 'Versículo en pedazos'], bien: '¡Bien hecho!', savais: '¿Lo sabías?', bible: 'rv1909' },
    };
    /* Du français dans un écran anglais ou espagnol : un accent que la langue
       n'écrit pas, ou un mot-outil qu'elle n'a pas. L'espagnol écrit « la »,
       « de », l'accent aigu — et « les » (« les dijo ») et « une » (« Une a
       cada personaje con su lugar », du verbe unir) : ils ne trahissent rien
       chez lui. */
    const FRANCAIS = {
      /* (v350) Entre deux LETTRES, pas entre deux « \b » : sans le drapeau u,
         « á » n'est pas une lettre pour \b, et « está » contenait « est ». */
      en: /[àâèéêëîïôöùûç]|(?<!\p{L})(le|la|les|des|une|est|pour|avec|dans|du|au|et)(?!\p{L})/iu,
      es: /[àâèêëîïôöùûç]|(?<!\p{L})(des|est|pour|avec|dans|du|au|et)(?!\p{L})/iu,
    };
    for (const lg of ['en', 'es']) {
      const A = ATTENDU[lg];
      const { ctx: c2, p: q, errs: e2 } = await ouvrir(nav, lg);
      await q.locator('#barreBas .bb-onglet[data-o="jeux"]').click(); await pose(q); await q.waitForTimeout(400);
      const h = await q.evaluate(() => ({ onglet: document.querySelector('#barreBas .bb-onglet[data-o="jeux"]')?.textContent.trim(), titre: document.querySelector('.jeux-ecran .header-title')?.textContent,
        sur: document.querySelector('.jx-une .jx-sur')?.textContent, h: document.querySelector('.jx-h')?.textContent,
        noms: [...document.querySelectorAll('.jx-grille .jx-tuile .jx-nom')].map(x => x.textContent.replace(/ /g, ' ')),
        texte: document.querySelector('.jeux-ecran').innerText, bible: bibleActive().cle }));
      const FR = FRANCAIS[lg];
      const hubOk = h.onglet === A.onglet && h.titre === A.onglet && h.sur === A.duJour && h.h === A.tous && JSON.stringify(h.noms) === JSON.stringify(A.noms) && !FR.test(h.texte) && h.bible === A.bible;
      dit('7. ' + lg + ' : l\'écran des jeux est traduit (onglet, jeu du jour, cinq noms, descriptions)', hubOk, JSON.stringify({ ...h, texte: (h.texte.match(FR) || [''])[0] }));
      let francais = [], versets = [];
      for (const id of IDS) {
        await q.evaluate((id) => lancerJeu(id), id); await pose(q);
        const avantJeu = await q.evaluate(() => ({ texte: document.querySelector('.jeu-ecran').innerText, m: JSON.parse(JSON.stringify(mancheCourante())), id: jeu.id }));
        if (FR.test(avantJeu.texte)) francais.push(id + ' (manche) : ' + avantJeu.texte.match(FR)[0]);
        if (id === 'erreur' || id === 'morceaux') {
          const ok = await q.evaluate(({ id, m, bible }) => {
            const t = (VERSETS_ALT[bible] || {})[m.r];
            if (!t) return 'pas de texte ' + bible + ' pour ' + m.r;
            const vrai = t.split(/\s+/).filter(Boolean);
            if (id === 'morceaux') return m.parts.join(' ') === vrai.join(' ') ? '' : m.r + ' : morceaux ≠ ' + bible;
            return (vrai.length === m.mots.length && vrai.filter((w, i) => w !== m.mots[i]).length === 1) ? '' : m.r + ' : verset ≠ ' + bible;
          }, { id, m: avantJeu.m, bible: A.bible });
          if (ok) versets.push(ok);
        }
        const r = await jouerManche(q, true);
        if (r.label !== A.bien) francais.push(id + ' : « ' + r.label + ' » au lieu de « ' + A.bien + ' »');
        const apres = await q.evaluate(() => document.querySelector('.jeu-ecran').innerText);
        if (FR.test(apres)) francais.push(id + ' (révélée) : ' + apres.match(FR)[0]);
        await q.evaluate(() => { jeu = null; state.screen = 'jeux'; render(); }); await pose(q);
      }
      /* Une fin de partie, dans la langue. */
      const Fin = await jouerPartie(q, 'combien', false);
      const finTxt = await q.evaluate(() => document.querySelector('.jeu-fin').innerText);
      if (FR.test(finTxt)) francais.push('fin : ' + finTxt.match(FR)[0]);
      dit('7. ' + lg + ' : chaque jeu se joue dans la langue (consignes, « ' + A.bien + ' », fin), aucun mot français', !francais.length && Fin.manches.every(x => x.label === A.savais), francais.join(' | ') || Fin.fin.bons);
      dit('7. ' + lg + ' : les versets viennent de la version de la langue (' + A.bible + ')', !versets.length, versets.join(' | ') || 'erreur et morceaux');
      errs.push(...e2);
      await c2.close();
    }
  } catch (e) { console.error(e); ko++; }
  finally {
    dit('8. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
    await nav.close();
  }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — cinq jeux, un onglet, et chaque manche tient ses règles');
  process.exit(ko ? 1 : 0);
})();
