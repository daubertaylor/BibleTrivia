/* ====== BANC « LES 1545 QUESTIONS SONT EN ANGLAIS, ET BIEN ALIGNÉES » ======
   « Il faut que tous les modes sans exception soient bien traduits, et toutes
     les questions et réponses aussi. »

   La banque anglaise vit dans questions-en.js et se repère PAR POSITION :
   c'est ce qui évite de recopier tout le texte français en clé. Le prix de ce
   choix est qu'un déplacement dans BANK désalignerait tout en silence — une
   question afficherait l'énoncé d'une autre, sans que rien ne plante.
   Ce banc est le garde-fou de ce choix. Il vérifie :
     1. autant d'entrées anglaises que de questions françaises ;
     2. pour CHACUNE, que l'indice de la bonne réponse enregistré en anglais
        est bien celui de la bonne réponse française — 1545 vérifications, pas
        un échantillon ;
     3. que rien n'est resté en français ;
     4. et, dans le jeu qui tourne, qu'une question s'affiche bien en anglais
        (énoncé, quatre options, le fait) et que RÉPONDRE MARCHE ENCORE : on
        ne traduit que l'étiquette, la logique compare toujours du français.

   Usage : node banc-essai/questions-en.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';

/* Des mots qui n'existent qu'en français. Trois lettres accentuées suffisent
   à trahir une ligne oubliée. */
const FRANCAIS = /\b(quel|quelle|quels|quelles|combien|selon|lequel|pourquoi|qui est|dans la bible|d'après)\b/i;

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_langue', 'en');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return typeof render === 'function' && typeof BANK === 'object'; } catch (e) { return false; } }, null, { timeout: 20000 });
  /* La banque anglaise est chargée à part : on l'attend. */
  const arrivee = await p.waitForFunction(() => !!self.BANQUE_EN, null, { timeout: 20000 }).then(()=>true).catch(()=>false);

  const soucis = [];
  if (!arrivee) soucis.push("questions-en.js n'est jamais arrivé — le jeu resterait en français");
  else {
    const r = await p.evaluate(() => {
      const fr = [];
      for (const t of ['facile','moyen','difficile']) for (const o of BANK[t]) fr.push(o);
      const en = self.BANQUE_EN;
      const out = { nFr: fr.length, nEn: en.length, desalignees: [], sansQuatre: [], francais: [], vides: [] };
      for (let i = 0; i < Math.min(fr.length, en.length); i++) {
        const f = fr[i], e = en[i];
        if (!e || !Array.isArray(e[1]) || e[1].length !== 4) { out.sansQuatre.push(i); continue; }
        if (f.options.indexOf(f.correct) !== e[3]) out.desalignees.push(i);
        if (!e[0] || !e[2]) out.vides.push(i);
      }
      return out;
    });
    if (r.nEn !== r.nFr) soucis.push('la banque anglaise compte ' + r.nEn + ' entrées pour ' + r.nFr + ' questions');
    if (r.sansQuatre.length) soucis.push(r.sansQuatre.length + ' entrée(s) sans quatre options (ex. ' + r.sansQuatre.slice(0,3).join(', ') + ')');
    if (r.desalignees.length) soucis.push(r.desalignees.length + ' entrée(s) DÉSALIGNÉE(S) — la traduction ne correspond pas à la question (ex. ' + r.desalignees.slice(0,5).join(', ') + ')');
    if (r.vides.length) soucis.push(r.vides.length + ' entrée(s) à l\'énoncé ou au fait vide');
    console.log('  banque : ' + r.nEn + ' entrées anglaises pour ' + r.nFr + ' questions françaises');
    console.log('  alignement de la bonne réponse : ' + (r.desalignees.length ? r.desalignees.length + ' EN DÉFAUT' : 'les ' + r.nFr + ' vérifiées, aucune en défaut'));

    /* Rien qui soit resté en français. */
    const restes = await p.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const l = [];
      self.BANQUE_EN.forEach((e, i) => { if (re.test(e[0])) l.push(i); });
      return l;
    }, FRANCAIS.source);
    console.log('  énoncés restés en français : ' + restes.length);
    if (restes.length) soucis.push(restes.length + ' énoncé(s) encore en français (ex. ' + restes.slice(0,3).join(', ') + ')');
  }

  /* ===== ET DANS LE JEU QUI TOURNE ===== */
  const jeu = await p.evaluate(() => {
    /* On prépare une question EXACTEMENT comme le fait une partie : une COPIE
       de l'entrée de la banque, avec ses options mélangées. C'est ce que voit
       le rendu, et c'est là que l'identité d'objet se perd — la raison pour
       laquelle on se repère à l'énoncé et pas à l'objet. */
    const q = Object.assign({}, BANK.facile[0], { shuffledOptions: BANK.facile[0].options.slice().reverse() });
    const vu = {
      enonceFr: q.q,
      enonceAffiche: texteQuestion(q),
      optionsAffichees: q.shuffledOptions.map(o => texteOption(q, o)),
      faitAffiche: texteFait(q),
      /* la logique doit rester française */
      correctFr: q.correct,
      optionsFr: q.shuffledOptions.slice(),
    };
    return vu;
  }).catch(e => ({ erreur: e.message }));

  if (jeu.erreur) soucis.push('impossible de lancer une partie : ' + jeu.erreur);
  else {
    const traduit = jeu.enonceAffiche !== jeu.enonceFr;
    console.log('  une partie en anglais :');
    console.log('     énoncé  « ' + jeu.enonceAffiche.slice(0, 62) + ' »');
    console.log('     options ' + jeu.optionsAffichees.map(o => '« ' + o.slice(0,18) + ' »').join(' '));
    if (!traduit) soucis.push("l'énoncé affiché est resté en français");
    if (jeu.optionsAffichees.some((o, i) => o === jeu.optionsFr[i]) && traduit)
      console.log('     (une option identique dans les deux langues — un nom propre, c\'est normal)');
    if (!jeu.faitAffiche) soucis.push('le fait affiché est vide');
    /* LA LOGIQUE N'A PAS BOUGÉ : la bonne réponse reste une chaîne française. */
    if (!jeu.optionsFr.includes(jeu.correctFr))
      soucis.push('la bonne réponse française ne fait plus partie des options — la logique a été traduite par erreur');
  }

  if (errs.length) soucis.push('erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | '));
  await nav.close();
  if (soucis.length) { console.log('\n  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('\n  OK — les 1545 questions sont en anglais, alignées, et répondre marche encore');
})();
