/* ====== BANC « LE RÉCAP D'UNE PARTIE, EN GRAND » (v374) ======
   « Cette page, je la trouve un peu fade, on peut faire mieux. » (Capture de
   Taylor : une coupe, une phrase, deux lignes, une carte de deux lignes, et
   les deux tiers de l'écran vides.)
   Sur un iPhone, avec des parties fabriquées (le serveur et le direct sont
   ceux de partie-recap.js) :
     1. EN TÊTE : le médaillon et sa coupe, le nom du groupe, « Tu
        l'emportes », qui l'a lancée et quand, et ce qu'on a joué en
        pastilles — « 15 questions », « Toute la Bible », « 4 joueurs » ;
     2. LE PODIUM : le deuxième, le premier, le troisième, de gauche à droite,
        la couronne au seul premier, les marches or, argent, bronze de plus en
        plus basses ; ex æquo, même marche (deux « 2 » argent) ; seul à avoir
        fini, sa marche seule ;
     3. LE CLASSEMENT : chaque jauge vaut ses bonnes réponses (au pixel près),
        de la couleur de sa marche ; ma ligne éclairée, « Toi » à côté de mon
        nom ; qui n'a pas fini, sans jauge ni points, en dernier ;
     4. TA PARTIE : l'anneau vaut ma réussite (67 % : 10 sur 15), ma place
        (« 1/4 »), mes points, ma meilleure série (gardée sur le téléphone) ;
        « Revoir mes 2 erreurs » ouvre la page des erreurs, deux questions,
        la bonne réponse et la mienne ; sans détail gardé, ni série ni
        bouton ; quand je n'ai pas joué, pas de « Ta partie » ;
     5. CE QUE J'AI JOUÉ EST GARDÉ : une partie de groupe finie inscrit, sous
        une clé à part (bt_parties_groupe), ma série et mes erreurs ; dix
        parties au plus, les plus récentes ;
     6. « RELANCER UNE PARTIE » : seulement dans la discussion du groupe ; le
        toucher ferme la page et lance la partie (la manette) ;
     7. RIEN N'ARRIVE APRÈS LA PAGE : l'anneau est plein et les marches à leur
        hauteur dès la première image (aucune animation, aucune transition) ;
     8. EN ANGLAIS ET EN ESPAGNOL, tout est traduit ;
     9. aucune erreur.
   Usage : node banc-essai/recap-grand.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, bon ? 460 : 1600) + ')' : '')); if (!bon) ko++; };
const n = (s) => String(s || '').replace(/[\s  ]+/g, ' ').trim();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await ctx.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false }));
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(600);

    /* Le décor : un groupe, ses joueurs, et des parties finies. */
    await p.evaluate(() => {
      window.monId = () => 'moi';
      window.__lances = 0;
      window.lancerPartieGroupe = () => { window.__lances++; };
      grp.profils = Object.assign(grp.profils || {}, { k: { nom: 'Kirens', couleur: '#E8A06A' }, s: { nom: 'Sarah', couleur: '#7BC86B' }, j: { nom: 'Jonas', couleur: '#9B7BE8' } });
      grp.liste = [{ id: 'g1', nom: 'Les amis du jeudi', teinte: 2 }];
      grp.courant = 'g1';
      const hier = new Date(Date.now() - 86400000); hier.setHours(21, 52, 0, 0);
      const partie = (id, venus, scores) => ({ id, genre: 'partie', groupe: 'g1', auteur: 'k', cree_le: hier.toISOString(),
        donnees: { code: 'C' + id, venus, scores, total: 15, theme: 'tout', fermee: true, lancee: true } });
      const tous = [{ id: 'moi', nom: 'Taylor' }, { id: 'k', nom: 'Kirens' }, { id: 's', nom: 'Sarah' }, { id: 'j', nom: 'Jonas' }];
      grp.fils = { g1: { messages: [
        partie(41, tous, { moi: [200, 10], s: [150, 8], j: [90, 5] }),                 // je gagne, Kirens n'a pas fini
        partie(42, tous, { s: [180, 9], j: [120, 7], moi: [120, 7], k: [60, 3] }),      // Sarah gagne, Jonas et moi ex æquo
        partie(43, tous.slice(0, 2), { moi: [200, 10] }),                               // seul à avoir fini
        partie(44, tous.slice(1), { s: [150, 8], j: [90, 5] })                          // je n'en étais pas
      ] } };
      localStorage.setItem('bt_parties_groupe', JSON.stringify({ 41: { quand: Date.now(), serie: 5, bonnes: 10, total: 15, rates: [
        { q: "Qui a construit l'arche ?", options: ['Noé', 'Moïse', 'Abraham', 'David'], correct: 'Noé', chosen: 'Moïse', fact: 'Genèse 6:14.' },
        { q: 'Combien de livres compte la Bible ?', options: ['66', '72', '39', '27'], correct: '66', chosen: '72', fact: '39 + 27.' }] } }));
    });

    /* La page ouverte, telle qu'on la voit : à sa toute première image, puis posée. */
    const ouvrir = (id) => p.evaluate((id) => new Promise(res => {
      document.querySelectorAll('.sheet-veil').forEach(v => v.remove());
      ouvrirRecapPartie(id);
      const v = document.getElementById('grpRecapVeil');
      const lire = () => {
        const t = (s) => { const e = v.querySelector(s); return e ? e.textContent : ''; };
        const anneau = v.querySelector('.rp-moi .ring-fg');
        return {
          medaille: !!v.querySelector('.rp-medaille .rp-coupe svg'), groupe: t('.rp-sur'), titre: t('.rp-titre'), meta: t('.rp-meta'),
          puces: [...v.querySelectorAll('.rp-puce')].map(e => e.textContent),
          podium: [...v.querySelectorAll('.rp-podium .podium-col')].map(c => ({ nom: c.querySelector('.podium-name').textContent,
            couronne: getComputedStyle(c.querySelector('.podium-crown')).visibility !== 'hidden' && !!c.querySelector('.podium-crown svg'),
            marche: c.querySelector('.podium-bar').className.replace('podium-bar', '').trim(), chiffre: c.querySelector('.podium-bar').textContent,
            haut: Math.round(c.querySelector('.podium-bar').getBoundingClientRect().height) })),
          rangs: [...v.querySelectorAll('.rp-rang')].map(r => { const j = r.querySelector('.rp-jauge'), i = j && j.querySelector('i');
            return { nom: (r.querySelector('.rp-nom') || {}).textContent, toi: !!r.querySelector('.rp-toi'), moi: r.classList.contains('moi'),
              badge: r.querySelector('.rank-badge').className.replace('rank-badge', '').trim(), sous: (r.querySelector('small') || {}).textContent || '',
              pts: (r.querySelector('.rp-pts') || {}).textContent || '', jauge: j ? j.className.replace('rp-jauge', '').trim() : null,
              part: j ? Math.round(1000 * i.getBoundingClientRect().width / j.getBoundingClientRect().width) / 1000 : null,
              fond: getComputedStyle(r).backgroundColor }; }),
          ta: !!v.querySelector('.rp-moi'), pourcent: t('.rp-moi .ring-score'),
          anneau: anneau ? { dash: +anneau.getAttribute('stroke-dasharray'), off: +anneau.getAttribute('stroke-dashoffset'), vu: parseFloat(getComputedStyle(anneau).strokeDashoffset) } : null,
          chiffres: [...v.querySelectorAll('.rp-moi .solo-stat')].map(s => n2(s.querySelector('.val').textContent) + '|' + s.querySelector('.lbl').textContent),
          erreurs: t('.rp-erreurs'), relancer: !!v.querySelector('.rp-relancer'),
          animations: v.getAnimations({ subtree: true }).filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.rp-podium, .rp-moi, .rp-rangs, .rp-haut')).length
        };
      };
      const n2 = (s) => String(s || '').replace(/[\s  ]+/g, ' ').trim();
      const premiere = lire();
      setTimeout(() => res({ premiere, posee: lire() }), 900);
    }), id);

    /* ---- 1, 2, 3, 4 : la partie 41 (je gagne ; Kirens n'a pas fini) ---- */
    const a = await ouvrir(41);
    const v = a.posee;
    dit('1. en tête : le médaillon, le groupe, « Tu l\'emportes », qui l\'a lancée et quand, les pastilles de la partie',
      v.medaille && v.groupe === 'Les amis du jeudi' && v.titre === "Tu l'emportes" && /^Lancée par Kirens · Hier · 21:52$/.test(n(v.meta))
        && JSON.stringify(v.puces.map(n)) === JSON.stringify(['15 questions', 'Toute la Bible', '4 joueurs']),
      JSON.stringify({ groupe: v.groupe, titre: v.titre, meta: v.meta, puces: v.puces }));
    const pod = v.podium;
    const b = await ouvrir(42), b2 = b.posee.podium;
    const c = await ouvrir(43), c2 = c.posee.podium;
    dit('2. le podium : 2e, 1er, 3e ; la couronne au seul premier ; or, argent, bronze de plus en plus bas ; ex æquo sur la même marche ; seul à avoir fini, sa marche seule',
      pod.length === 3 && pod.map(x => x.nom).join(',') === 'Sarah,Taylor,Jonas' && pod.map(x => x.couronne).join(',') === 'false,true,false'
        && pod.map(x => x.marche).join(',') === 'p2,p1,p3' && pod[1].haut > pod[0].haut && pod[0].haut > pod[2].haut
        && b2.map(x => x.nom).join(',') === 'Jonas,Sarah,Taylor' && b2.map(x => x.chiffre).join(',') === '2,1,2' && b2[0].marche === 'p2' && b2[2].marche === 'p2' && b2[0].haut === b2[2].haut
        && c2.length === 1 && c2[0].nom === 'Taylor' && c2[0].couronne && c2[0].marche === 'p1',
      JSON.stringify({ pod, b2: b2.map(x => [x.nom, x.chiffre, x.marche, x.haut]), c2: c2.map(x => [x.nom, x.marche]) }));
    const r = v.rangs;
    dit('3. le classement : chaque jauge vaut ses bonnes réponses, de la couleur de sa marche ; ma ligne éclairée avec « Toi » ; Kirens n\'a pas fini, en dernier, sans jauge ni points',
      r.length === 4 && r.map(x => x.nom).join(',') === 'Taylor,Sarah,Jonas,Kirens'
        && Math.abs(r[0].part - 10 / 15) < 0.01 && Math.abs(r[1].part - 8 / 15) < 0.01 && Math.abs(r[2].part - 5 / 15) < 0.01
        && r.slice(0, 3).map(x => x.jauge).join(',') === 'g1,g2,g3' && r[0].toi && r[0].moi && !r[1].toi && r[0].fond !== r[1].fond
        && r[3].jauge === null && !r[3].pts && /N'a pas fini/.test(r[3].sous),
      JSON.stringify(r.map(x => [x.nom, x.part, x.jauge, x.toi, x.pts, x.sous])));
    const ta44 = (await ouvrir(44)).posee, ta43 = c.posee;
    /* l'anneau vaut le pourcentage affiché (67 %, arrondi comme partout dans le jeu) */
    const reAnneau = Math.abs(v.anneau.off - v.anneau.dash * (1 - Math.round(100 * 10 / 15) / 100)) < 0.6;
    const rev = await p.evaluate(async () => {
      document.querySelectorAll('.sheet-veil').forEach(v => v.remove());
      ouvrirRecapPartie(41);
      document.querySelector('#grpRecapVeil .rp-erreurs').click();
      await new Promise(r => setTimeout(r, 700));
      const rv = document.getElementById('reviewVeil');
      return rv ? [...rv.querySelectorAll('.rev-item')].map(i => [i.querySelector('.rev-q').textContent, i.querySelector('.rev-right').textContent.trim(), i.querySelector('.rev-wrong').textContent.trim()]) : null;
    });
    dit('4. ta partie : l\'anneau vaut 10 sur 15 (67 %), ma place 1/4, mes points, ma série 5 ; « Revoir mes 2 erreurs » ouvre leurs deux questions, la bonne réponse et la mienne ; sans détail gardé, ni série ni bouton ; pas joué, pas de « Ta partie »',
      v.ta && n(v.pourcent) === '67%' && reAnneau && JSON.stringify(v.chiffres) === JSON.stringify(['1/4|Place', '200|Points', '5|Meilleure série'])
        && n(v.erreurs) === 'Revoir mes 2 erreurs' && rev && rev.length === 2 && rev[0][1] === 'Noé' && rev[0][2] === 'Moïse'
        && ta43.ta && JSON.stringify(ta43.chiffres) === JSON.stringify(['1/2|Place', '200|Points']) && !ta43.erreurs && !ta44.ta,
      JSON.stringify({ pourcent: v.pourcent, anneau: v.anneau, chiffres: v.chiffres, erreurs: v.erreurs, rev, ta43: ta43.chiffres, ta44: ta44.ta }));

    /* ---- 5 ---- ce que j'ai joué est gardé */
    const g5 = await p.evaluate(() => {
      document.querySelectorAll('.sheet-veil').forEach(v => v.remove());
      localStorage.removeItem('bt_parties_groupe');
      const avant = window.recapsServeur, appel = window.appelGroupe;
      window.recapsServeur = () => true; window.appelGroupe = () => Promise.resolve({ ok: true });
      net.resultats = {};
      for (let k = 0; k < 12; k++) {
        net.deck = new Array(15).fill(0).map(() => ({}));
        net.correct = 10; net.score = 200; net.bestStreak = 4 + (k % 3);
        net.missed = [{ q: 'Q' + k, options: ['a', 'b'], correct: 'a', chosen: 'b', fact: 'F' }];
        net.code = 'Z' + k; net.partieGroupe = { code: 'Z' + k, message: 100 + k }; net.partieVenue = null;
        envoyerResultatPartie();
        const v = JSON.parse(localStorage.getItem('bt_parties_groupe')); v[100 + k].quand = 1000 + k; localStorage.setItem('bt_parties_groupe', JSON.stringify(v));
      }
      window.recapsServeur = avant; window.appelGroupe = appel;
      const v = JSON.parse(localStorage.getItem('bt_parties_groupe') || '{}');
      const cles = Object.keys(v).map(Number).sort((a, b) => a - b);
      return { cles, serie: v[111] && v[111].serie, rates: v[111] && v[111].rates.length, q: v[111] && v[111].rates[0].q, autres: Object.keys(localStorage).filter(k => /^bt_parties/.test(k)) };
    });
    dit('5. ce que j\'ai joué est gardé, sous sa clé à part : ma série et mes erreurs ; dix parties au plus, les plus récentes',
      JSON.stringify(g5.cles) === JSON.stringify([102, 103, 104, 105, 106, 107, 108, 109, 110, 111]) && g5.serie === 6 && g5.rates === 1 && g5.q === 'Q11'
        && JSON.stringify(g5.autres) === JSON.stringify(['bt_parties_groupe']), JSON.stringify(g5));

    /* ---- 6 ---- « Relancer une partie » */
    const r6 = await p.evaluate(async () => {
      document.querySelectorAll('.sheet-veil').forEach(v => v.remove());
      const hors = (() => { ouvrirRecapPartie(41); return !!document.querySelector('#grpRecapVeil .rp-relancer'); })();
      document.querySelectorAll('.sheet-veil').forEach(v => v.remove());
      window.compteConnecte = () => true; state.screen = 'groupe';
      const b = document.createElement('button'); b.className = 'compo-jeu'; b.id = '__manette'; document.querySelector('#app > .screen').appendChild(b);
      ouvrirRecapPartie(41);
      const dans = !!document.querySelector('#grpRecapVeil .rp-relancer');
      document.querySelector('#grpRecapVeil .rp-relancer').click();
      await new Promise(r => setTimeout(r, 600));
      const v = document.getElementById('grpRecapVeil');
      const r = { hors, dans, ferme: !v || v.classList.contains('closing'), lances: window.__lances };
      b.remove(); state.screen = 'mode';
      return r;
    });
    dit('6. « Relancer une partie » : seulement dans la discussion du groupe ; le toucher ferme la page et lance la partie',
      !r6.hors && r6.dans && r6.ferme && r6.lances === 1, JSON.stringify(r6));

    /* ---- 7 ---- rien n'arrive après */
    const pr = a.premiere;
    dit('7. rien n\'arrive après la page : l\'anneau plein et les marches à leur hauteur dès la première image, aucune animation',
      pr.anneau && Math.abs(pr.anneau.vu - pr.anneau.off) < 0.6 && JSON.stringify(pr.podium.map(x => x.haut)) === JSON.stringify(v.podium.map(x => x.haut)) && pr.animations === 0,
      JSON.stringify({ anneau: pr.anneau, marches: pr.podium.map(x => x.haut), posees: v.podium.map(x => x.haut), animations: pr.animations }));

    /* ---- 8 ---- en anglais et en espagnol */
    const langues = await p.evaluate(() => {
      /* le détail de la partie 41 de nouveau gardé (l'étape 5 a vidé la mémoire) */
      localStorage.setItem('bt_parties_groupe', JSON.stringify({ 41: { quand: Date.now(), serie: 5, bonnes: 10, total: 15, rates: [] } }));
      const avant = LANGUE, o = {};
      for (const lg of ['en', 'es']) {
        LANGUE = lg;
        document.querySelectorAll('.sheet-veil').forEach(v => v.remove());
        ouvrirRecapPartie(41);
        const v = document.getElementById('grpRecapVeil');
        o[lg] = [v.querySelector('.rp-h').textContent, [...v.querySelectorAll('.rp-h')][1].textContent, v.querySelector('.rp-moi .ring-label').textContent,
          [...v.querySelectorAll('.rp-moi .solo-stat .lbl')].map(e => e.textContent).join('/'), v.querySelector('.rp-toi').textContent,
          [...v.querySelectorAll('.rp-puce')].map(e => e.textContent).join('/')];
      }
      LANGUE = avant;
      document.querySelectorAll('.sheet-veil').forEach(v => v.remove());
      return o;
    });
    dit('8. en anglais et en espagnol, tout est traduit',
      JSON.stringify(langues.en) === JSON.stringify(['Ranking', 'Your game', 'Accuracy', 'Place/Points/Best streak', 'You', '15 questions/Whole Bible/4 players'])
        && JSON.stringify(langues.es.slice(0, 5)) === JSON.stringify(['Clasificación', 'Tu partida', 'Aciertos', 'Puesto/Puntos/Mejor racha', 'Tú']),
      JSON.stringify(langues));
    await ctx.close();
  } catch (e) {
    dit('le banc s\'est arrêté', false, (e.stack || e).toString().slice(0, 500));
  } finally {
    dit('9. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le récap d\'une partie a la voix d\'une fin de partie');
  process.exit(ko ? 1 : 0);
})();
