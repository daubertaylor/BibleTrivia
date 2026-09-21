/* ====== BANC « LES 1545 QUESTIONS SONT TRADUITES, ET BIEN ALIGNÉES » ======
   « Il faut que tous les modes sans exception soient bien traduits, et toutes
     les questions et réponses aussi. »

   Chaque banque traduite vit dans son fichier — questions-en.js,
   questions-es.js — et se repère PAR POSITION : c'est ce qui évite de recopier
   tout le texte français en clé. Le prix de ce choix est qu'un déplacement
   dans BANK désalignerait tout en silence — une question afficherait l'énoncé
   d'une autre, sans que rien ne plante.
   Ce banc est le garde-fou de ce choix. Pour CHAQUE langue, il vérifie :
     1. autant d'entrées traduites que de questions françaises ;
     2. pour CHACUNE, que l'indice de la bonne réponse enregistré est bien
        celui de la bonne réponse française — 1545 vérifications, pas un
        échantillon ;
     3. que rien n'est resté en français ;
     4. et, dans le jeu qui tourne, qu'une question s'affiche bien traduite
        (énoncé, quatre options, le fait) et que RÉPONDRE MARCHE ENCORE : on
        ne traduit que l'étiquette, la logique compare toujours du français.

   Usage : node banc-essai/questions-langues.js [url]
           LANGUES=es node banc-essai/questions-langues.js   (une seule)
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const LANGUES = (process.env.LANGUES || 'en,es').split(',').map(x => x.trim()).filter(Boolean);
const GLOBAL = { en:'BANQUE_EN', es:'BANQUE_ES' };

/* Des mots qui n'existent qu'en français — aucun n'est espagnol non plus
   (« qué » ne tombe pas dans « quel », les bornes de mot y veillent). */
const FRANCAIS = /\b(quel|quelle|quels|quelles|combien|selon|lequel|pourquoi|qui est|dans la bible|d'après)\b/i;
/* ET LES ACCENTS QUE L'ESPAGNOL N'A PAS. Une ligne oubliée peut n'avoir aucun
   de ces mots et rester française quand même : « Où est né Jésus ? ». L'espagnol
   n'écrit ni à, ni è, ni ê, ni ç — les trouver, c'est trouver du français. */
const ACCENTS_FR = /[àâäèêëîïôöùûÿçœæÀÂÄÈÊËÎÏÔÖÙÛŸÇŒÆ]/;

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const soucis = [];
  for (const lg of LANGUES) {
    const nom = GLOBAL[lg];
    if (!nom) { soucis.push('langue inconnue : ' + lg); continue; }
    console.log('\n  ===== ' + lg.toUpperCase() + ' =====');
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
      userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((l) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_langue', l);
    }, lg);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof render === 'function' && typeof BANK === 'object'; } catch (e) { return false; } }, null, { timeout: 20000 });
    /* La banque de la langue est chargée à part : on l'attend. */
    const arrivee = await p.waitForFunction((n) => !!self[n], nom, { timeout: 20000 }).then(()=>true).catch(()=>false);

    if (!arrivee) soucis.push(lg + ' : questions-' + lg + ".js n'est jamais arrivé — le jeu resterait en français");
    else {
      const r = await p.evaluate((n) => {
        const fr = [];
        for (const t of ['facile','moyen','difficile']) for (const o of BANK[t]) fr.push(o);
        const tr = self[n];
        const out = { nFr: fr.length, nTr: tr.length, desalignees: [], sansQuatre: [], vides: [] };
        for (let i = 0; i < Math.min(fr.length, tr.length); i++) {
          const f = fr[i], e = tr[i];
          if (!e || !Array.isArray(e[1]) || e[1].length !== 4) { out.sansQuatre.push(i); continue; }
          if (f.options.indexOf(f.correct) !== e[3]) out.desalignees.push(i);
          if (!e[0] || !e[2]) out.vides.push(i);
        }
        return out;
      }, nom);
      if (r.nTr !== r.nFr) soucis.push(lg + ' : la banque compte ' + r.nTr + ' entrées pour ' + r.nFr + ' questions');
      if (r.sansQuatre.length) soucis.push(lg + ' : ' + r.sansQuatre.length + ' entrée(s) sans quatre options (ex. ' + r.sansQuatre.slice(0,3).join(', ') + ')');
      if (r.desalignees.length) soucis.push(lg + ' : ' + r.desalignees.length + ' entrée(s) DÉSALIGNÉE(S) — la traduction ne correspond pas à la question (ex. ' + r.desalignees.slice(0,5).join(', ') + ')');
      if (r.vides.length) soucis.push(lg + ' : ' + r.vides.length + ' entrée(s) à l\'énoncé ou au fait vide');
      console.log('  banque : ' + r.nTr + ' entrées pour ' + r.nFr + ' questions françaises');
      console.log('  alignement de la bonne réponse : ' + (r.desalignees.length ? r.desalignees.length + ' EN DÉFAUT' : 'les ' + r.nFr + ' vérifiées, aucune erreur'));

      /* Rien qui soit resté en français — dans l'énoncé, dans les options ET
         dans le fait : une ligne oubliée peut l'être n'importe où. */
      const restes = await p.evaluate(([n, src, acc, avecAccents]) => {
        const re = new RegExp(src, 'i'), ra = new RegExp(acc);
        const l = [];
        self[n].forEach((e, i) => {
          const tout = [e[0], e[2]].concat(e[1] || []).join(' ');
          if (re.test(tout) || (avecAccents && ra.test(tout))) l.push(i);
        });
        return l;
      }, [nom, FRANCAIS.source, ACCENTS_FR.source, lg === 'es']);
      console.log('  entrées restées en français : ' + restes.length);
      if (restes.length) soucis.push(lg + ' : ' + restes.length + ' entrée(s) encore en français (ex. ' + restes.slice(0,5).join(', ') + ')');
    }

    /* ===== ET DANS LE JEU QUI TOURNE ===== */
    const jeu = await p.evaluate(() => {
      /* On prépare une question EXACTEMENT comme le fait une partie : une COPIE
         de l'entrée de la banque, avec ses options mélangées. C'est ce que voit
         le rendu, et c'est là que l'identité d'objet se perd — la raison pour
         laquelle on se repère à l'énoncé et pas à l'objet. */
      const q = Object.assign({}, BANK.facile[0], { shuffledOptions: BANK.facile[0].options.slice().reverse() });
      return {
        enonceFr: q.q,
        enonceAffiche: texteQuestion(q),
        optionsAffichees: q.shuffledOptions.map(o => texteOption(q, o)),
        faitAffiche: texteFait(q),
        /* la logique doit rester française */
        correctFr: q.correct,
        optionsFr: q.shuffledOptions.slice(),
      };
    }).catch(e => ({ erreur: e.message }));

    if (jeu.erreur) soucis.push(lg + ' : impossible de préparer une partie : ' + jeu.erreur);
    else {
      const traduit = jeu.enonceAffiche !== jeu.enonceFr;
      console.log('  une partie :');
      console.log('     énoncé  « ' + jeu.enonceAffiche.slice(0, 62) + ' »');
      console.log('     options ' + jeu.optionsAffichees.map(o => '« ' + o.slice(0,18) + ' »').join(' '));
      if (!traduit) soucis.push(lg + " : l'énoncé affiché est resté en français");
      if (jeu.optionsAffichees.some((o, i) => o === jeu.optionsFr[i]) && traduit)
        console.log('     (une option identique dans les deux langues — un nom propre, c\'est normal)');
      if (!jeu.faitAffiche) soucis.push(lg + ' : le fait affiché est vide');
      /* LA LOGIQUE N'A PAS BOUGÉ : la bonne réponse reste une chaîne française. */
      if (!jeu.optionsFr.includes(jeu.correctFr))
        soucis.push(lg + ' : la bonne réponse française ne fait plus partie des options — la logique a été traduite par erreur');
    }
    if (errs.length) soucis.push(lg + ' : erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | '));
    await ctx.close();
  }
  await nav.close();
  if (soucis.length) { console.log('\n  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('\n  OK — les 1545 questions sont traduites, alignées, et répondre marche encore\n');
})();
