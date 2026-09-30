/* ====== BANC « CHAQUE QUESTION CRÉDITE SON LIVRE, ET RIEN NE RECULE » ======
   Deux cent cinquante questions ne créditaient aucun livre : leur « Le
   savais-tu ? » écrit la référence ailleurs qu'entre parenthèses à la fin
   (« Néhémie 8:10, le jour où… »), ou n'en écrit pas. Y répondre juste
   comptait au total, jamais dans la Progression. bookOf lit maintenant la
   première référence du texte, puis une table relue dans la Segond
   (bibles/rattache_livres.py) ; seize questions restent volontairement sans
   livre.

   CE QUE CE BANC EXIGE :
     1. toute question a un livre, ou figure dans SANS_LIVRE — une question
        ajoutée sans référence tombe ici, au lieu de ne rien créditer en
        silence ;
     2. aucune question déjà rattachée ne change de livre : on refait ici
        l'ANCIENNE lecture, recopiée telle quelle, et on compare ;
     3. AUCUNE CIBLE NE BOUGE : elle se calcule sur les questions à référence
        finale, comme avant — sinon la barre d'un joueur à 4 sur 5 en Josué
        retombait à 4 sur 8 ;
     4. le thème « Ancien / Nouveau Testament » suit le livre, comme la
        pastille AT/NT : « Où Jésus changea-t-il l'eau en vin ? » est dans le
        Nouveau ;
     5. une réponse juste à une ancienne orpheline crédite son livre, et une
        COPIE de question (partie en cours, carnet) se lit comme l'original ;
     6. l'énoncé corrigé (« 2 Pierre 3:20 » n'existe pas) : une vieille copie
        du carnet garde son livre, sa version anglaise, et s'affiche corrigée ;
     7. le tirage par thème ne ralentit pas (la banque est lue une fois).
   Usage : node banc-essai/livres-rattaches.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(62) + (det || '')); };

  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });

  const r = await p.evaluate(() => {
    /* L'ANCIENNE LECTURE, recopiée de v297 : la seule référence qu'elle
       connaissait est entre parenthèses, en toute fin. */
    const ancienne = (q) => {
      const f = (q && q.fact) || "";
      const m = f.match(/\(([^()]*)\)\s*\.?\s*$/);
      const ref = m ? m[1] : "";
      if (!ref) return null;
      for (let i = 0; i < BOOK_MATCH.length; i++) { if (BOOK_MATCH[i].re.test(ref)) return BOOK_MATCH[i].name; }
      return null;
    };
    const tout = [];
    ["facile", "moyen", "difficile"].forEach(t => BANK[t].forEach(q => tout.push(q)));
    const sans = tout.filter(q => !bookOf(q));
    const nonDeclarees = sans.filter(q => !Object.prototype.hasOwnProperty.call(SANS_LIVRE, q.q)).map(q => q.q);
    const declareesMaisRattachees = Object.keys(SANS_LIVRE).filter(e => { const q = tout.find(x => x.q === e); return !q || bookOf(q); });
    const changees = tout.filter(q => { const a = ancienne(q); return a && a !== bookOf(q); }).map(q => q.q);
    const avant = tout.filter(q => ancienne(q)).length;
    /* La cible de v297, recalculée avec l'ancienne lecture. */
    const base = {}; tout.forEach(q => { const b = ancienne(q); if (b) base[b] = (base[b] || 0) + 1; });
    const ciblesBougees = BIBLE_BOOKS.filter(b => bookTarget(b) !== Math.max(1, Math.min(9, Math.round((base[b] || 1) * 0.45))));
    const theme = tout.filter(q => { const b = bookOf(q); const t = b ? (BIBLE_BOOKS.indexOf(b) < BIBLE_AT_COUNT ? "at" : "nt") : SANS_LIVRE[q.q]; return qTestament(q) !== t; }).map(q => q.q);
    const cana = tout.find(q => q.q === "Où Jésus changea-t-il l'eau en vin ?");
    const copieDiffere = tout.filter(q => bookOf(Object.assign({}, q)) !== bookOf(q)).length;
    return { n: tout.length, sans: sans.length, nonDeclarees, declareesMaisRattachees, changees, avant,
             apres: tout.length - sans.length, ciblesBougees, theme,
             cana: cana ? { livre: bookOf(cana), theme: qTestament(cana), pastille: testamentTag(cana).indexOf(">NT<") >= 0 } : null,
             copieDiffere };
  });
  v('toute question a un livre, ou est déclarée sans livre', r.nonDeclarees.length === 0,
    r.apres + ' rattachées sur ' + r.n + ' (avant : ' + r.avant + '), ' + r.sans + ' sans livre' + (r.nonDeclarees.length ? ' — non déclarées : ' + r.nonDeclarees.slice(0, 3).join(' | ') : ''));
  v('SANS_LIVRE ne déclare que de vraies questions sans livre', r.declareesMaisRattachees.length === 0, r.declareesMaisRattachees.slice(0, 3).join(' | '));
  v('aucune question déjà rattachée ne change de livre', r.changees.length === 0, r.changees.slice(0, 3).join(' | '));
  v('aucune cible ne bouge (barres des joueurs intactes)', r.ciblesBougees.length === 0, r.ciblesBougees.join(', '));
  v('le thème AT/NT suit le livre, partout', r.theme.length === 0, r.theme.length ? r.theme.length + ' en désaccord : ' + r.theme.slice(0, 2).join(' | ') : '');
  v('« l\'eau en vin » : Jean, Nouveau Testament, pastille NT', !!r.cana && r.cana.livre === 'Jean' && r.cana.theme === 'nt' && r.cana.pastille, JSON.stringify(r.cana));
  v('une copie de question se lit comme l\'original', r.copieDiffere === 0, r.copieDiffere + ' différence(s)');

  /* 5 : une bonne réponse à une ancienne orpheline crédite son livre. */
  const credit = await p.evaluate(() => {
    const q = BANK.facile.find(x => x.q === "Où Jésus changea-t-il l'eau en vin ?");
    const avant = (loadProgress().books || {})['Jean'] || 0;
    progressCredit(Object.assign({}, q, { tier: 'facile' }), 1);
    const apres = (loadProgress().books || {})['Jean'] || 0;
    return { avant, apres };
  });
  v('répondre juste à « l\'eau en vin » fait avancer Jean', credit.apres === credit.avant + 1, credit.avant + ' -> ' + credit.apres);

  /* 6 : la vieille copie du carnet, avec l'ancien énoncé fautif. */
  const vieux = "Combien de personnes ont été sauvées dans l'arche de Noé, selon 2 Pierre 3:20 ?";
  const corr = await p.evaluate((vieux) => {
    const neuf = ENONCES_CORRIGES[vieux];
    const dansBanque = ["facile", "moyen", "difficile"].some(t => BANK[t].some(q => q.q === neuf));
    const copie = { q: vieux, options: ["4", "6", "8", "10"], correct: "8", fact: "Noé, sa femme, ses trois fils et leurs femmes.", tier: "facile" };
    const vieuxDansBanque = ["facile", "moyen", "difficile"].some(t => BANK[t].some(q => q.q === vieux));
    return { neuf, dansBanque, vieuxDansBanque, livre: bookOf(copie), fr: texteQuestion(copie), rang: rangDeQuestion(copie),
             rangNeuf: rangDeQuestion({ q: neuf }) };
  }, vieux);
  v('l\'énoncé corrigé est dans la banque, l\'ancien n\'y est plus', corr.dansBanque && !corr.vieuxDansBanque, corr.neuf);
  v('la vieille copie garde son livre (1 Pierre)', corr.livre === '1 Pierre', String(corr.livre));
  v('la vieille copie s\'affiche corrigée en français', corr.fr === corr.neuf, corr.fr);
  v('la vieille copie garde son adresse dans les banques traduites', corr.rang >= 0 && corr.rang === corr.rangNeuf, corr.rang + ' / ' + corr.rangNeuf);
  await p.addScriptTag({ url: 'questions-en.js' });
  await p.addScriptTag({ url: 'questions-es.js' });
  const langues = await p.evaluate((vieux) => {
    const copie = { q: vieux, options: ["4", "6", "8", "10"], correct: "8", fact: "Noé, sa femme, ses trois fils et leurs femmes." };
    const garde = LANGUE; const out = {};
    for (const l of ["en", "es"]) { LANGUE = l; out[l] = texteQuestion(copie); }
    LANGUE = garde;
    return out;
  }, vieux);
  v('… et s\'affiche en anglais : 1 Peter 3:20', /1 Peter 3:20/.test(langues.en), langues.en);
  v('… et en espagnol : 1 Pedro 3:20, comme les deux autres', /1 Pedro 3:20/.test(langues.es), langues.es);

  /* 7 : le tirage par thème reste rapide (4x plus lent qu'ici sur un vieux téléphone). */
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const ms = await p.evaluate(() => {
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) seededDeck(1000 + i, 'normale', i % 2 ? 'at' : 'nt');
    return (performance.now() - t0) / 20;
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  v('un tirage par thème, processeur ralenti 4x', ms < 40, ms.toFixed(1) + ' ms');

  v('aucune erreur dans la page', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n' + ko + ' KO' : '\nTOUT EST VERT');
  process.exit(ko ? 1 : 0);
})();
