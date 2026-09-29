/* ====== BANC « PERSONNE NE PROPOSE DE TRADUIRE YADA » ======
   « Lorsque tu changes de langue sur un Android, il y a un truc de Google
     Traduction qui s'affiche au-dessus et qui demande de traduire les pages.
     Retire-le, je veux plus que ça soit disponible et que ça s'affiche
     plus. » (Taylor.)

   POURQUOI ÇA ARRIVAIT. Chrome propose de traduire dès que la langue DÉCLARÉE
   de la page diffère de celle du téléphone. Le jeu déclare honnêtement la
   sienne — l'attribut lang suit le choix du joueur, et c'est ce qui fait qu'un
   lecteur d'écran prononce juste. Sur un téléphone en français, passer le jeu
   en anglais déclenchait donc la barre à tous les coups. On ne ment pas sur la
   langue : on refuse la proposition.

   ET C'EST IMPORTANT AU-DELÀ DU CONFORT. Les questions portent des citations
   bibliques d'éditions précises, choisies pour leur exactitude. Les repasser à
   la machine, c'est réécrire l'Écriture au hasard par-dessus un texte vérifié.

   CE QUE CE BANC NE PEUT PAS FAIRE, ET IL FAUT LE DIRE. La barre de traduction
   est une pièce de l'INTERFACE du navigateur, pas de la page : elle n'existe
   pas dans un Chromium piloté, et aucun banc d'ici ne peut la photographier.
   On vérifie donc ce qui la commande — les trois déclarations — et surtout
   qu'elles SURVIVENT au changement de langue, qui est le moment exact où
   Taylor la voyait.
   Usage : node banc-essai/pas-de-traduction.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  /* Un téléphone en FRANÇAIS : c'est le cas de Taylor, et celui où Chrome
     propose de traduire dès que le jeu passe à l'anglais. */
  const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2,
    userAgent: AND, hasTouch: true, serviceWorkers: 'block', locale: 'fr-FR' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });

  let ko = 0;
  const v = (nom, bon, det) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK ' : 'KO ') + nom.padEnd(64) + (det || '')); };

  const lire = () => p.evaluate(() => {
    const h = document.documentElement;
    const m = document.querySelector('meta[name="google"]');
    return { lang: h.getAttribute('lang'),
             attr: h.getAttribute('translate'),
             classe: h.classList.contains('notranslate'),
             meta: m ? m.getAttribute('content') : null,
             /* Un seul élément marqué « traduisible » suffirait à rouvrir la
                porte sur le contenu : on vérifie que personne ne l'a fait. */
             oui: document.querySelectorAll('[translate="yes"]').length };
  });

  const controle = (quand, a) => {
    v(quand + ' : la balise meta coupe la proposition', a.meta === 'notranslate', String(a.meta));
    v(quand + ' : translate="no" sur <html>', a.attr === 'no', String(a.attr));
    v(quand + ' : la classe notranslate est là', a.classe === true, String(a.classe));
    v(quand + ' : rien ne se redéclare traduisible', a.oui === 0, a.oui + ' élément(s)');
  };

  const a = await lire();
  controle('au chargement', a);
  v('  et la page dit la vérité sur sa langue', a.lang === 'fr', String(a.lang));

  /* Le vrai geste : le bouton du drapeau, dans les Réglages. */
  for (const attendu of ['en', 'es', 'fr']) {
    await p.evaluate(() => { try { langueSuivante(); } catch (e) { setLangue(LANGUES.filter(l=>l.dispo)[0].cle); } });
    await p.waitForTimeout(450);
    const b = await lire();
    controle('après passage en « ' + b.lang + ' »', b);
    v('  et l\'attribut lang a bien suivi le joueur', b.lang === attendu,
      b.lang + ' pour ' + attendu + ' attendu');
  }

  /* Et au rendu d'un écran quelconque : render() réécrit #app, jamais <html>. */
  await p.evaluate(() => { state.screen = 'progress'; render(); });
  await p.waitForTimeout(400);
  controle('après un changement d\'écran', await lire());

  if (errs.length) { ko++; console.log('  erreurs JS : ' + [...new Set(errs)].slice(0, 3).join(' | ')); }
  await nav.close();
  console.log(ko === 0
    ? '\n  OK — aucune traduction automatique n\'est proposée, dans aucune langue'
    : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
