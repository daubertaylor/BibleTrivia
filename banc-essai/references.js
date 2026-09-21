/* ============ BANC « UNE RÉFÉRENCE DÉSIGNE LE VERSET QU'ON LIT » ============
   « Je veux que tout soit parfait, même au niveau des références. »

   Traduire le nom du livre ne suffit pas. Dans les psaumes, le français compte
   la suscription comme verset 1 et l'anglais non : sous « Psalm 34:18 », le
   jeu affichait en anglais le texte du 34:17. Vrai sur le texte, faux sur la
   référence — le pire des deux, puisque c'est la référence qu'on recopie pour
   aller vérifier dans sa propre Bible.

   ON NE COMPARE PAS À CE QUE JE CROIS. Le fichier bibles/refs_en.json donne,
   pour chacune des 244 références du jeu, sa forme anglaise — dérivée des
   coordonnées retrouvées PAR LE CONTENU dans les sources publiées (voir
   bibles/aligne_en.py). Le banc demande au jeu ce qu'il affiche, et compare.

   Usage : node banc-essai/references.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const ATTENDU = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'bibles', 'refs_en.json'), 'utf8'));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_langue', 'en');
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return typeof render === 'function' && LANGUE === 'en'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(500);

  const vu = await p.evaluate(() => {
    const out = {};
    /* Les références que le jeu affiche vraiment : celles des versets de
       l'accueil, plus celle de la ligne signature. */
    for (const v of HERO_VERSES) out[v.r] = refLivre(v.r);
    out["Hébreux 4:16"] = refLivre("Hébreux 4:16");
    return out;
  });

  const soucis = [];
  let n = 0;
  for (const ref of Object.keys(vu)) {
    /* La moitié de verset garde sa lettre — « Micah 6:8b » est la notation
       biblique courante, en anglais comme en français. Le fichier la garde
       donc, et on compare la clé exacte. */
    const attendu = ATTENDU[ref];
    if (!attendu) { soucis.push('« ' + ref +' » : absente de bibles/refs_en.json'); continue; }
    n++;
    if (vu[ref] !== attendu)
      soucis.push('« ' + ref + ' » affichée « ' + vu[ref] + ' » au lieu de « ' + attendu + ' »');
  }

  /* Et en français, rien ne doit changer : une référence française s'affiche
     telle quelle. UN CONTEXTE NEUF, pas un rechargement : le script d'amorce
     du banc réécrit la langue à chaque chargement, et la page revenait donc
     en anglais — le banc attendait « fr » jusqu'à expirer. */
  const ctxFr = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
    userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const pFr = await ctxFr.newPage();
  await pFr.addInitScript(() => {
    localStorage.setItem('bt_langue', 'fr');
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor' }));
    localStorage.setItem('bt_fs_hint', '1');
  });
  await pFr.goto(URL);
  await pFr.waitForFunction(() => { try { return typeof render === 'function' && LANGUE === 'fr'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await pFr.waitForTimeout(400);
  const fr = await pFr.evaluate(() => {
    const out = {};
    for (const v of HERO_VERSES) out[v.r] = refLivre(v.r);
    return out;
  });
  for (const ref of Object.keys(fr))
    if (fr[ref] !== ref) soucis.push('en français, « ' + ref + ' » devient « ' + fr[ref] + ' »');

  if (errs.length) soucis.push('erreurs JS : ' + [...new Set(errs)].slice(0, 2).join(' | '));
  await nav.close();
  if (soucis.length) { console.log('  DÉFAUTS (' + soucis.length + ') :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('  OK — ' + n + ' références affichées en anglais, toutes conformes à bibles/refs_en.json');
  console.log('       (dont les douze psaumes et Ésaïe 64, décalés d\'un verset entre les deux numérotations)');
})();
