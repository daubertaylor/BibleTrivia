/* ============ BANC « LES PLACES NE TOUCHENT PAS AU VERRE » (v344) ============
   Avant la v344 : « Lorsque j'ajoute un joueur, que je le retire, ou que je
   touche le champ pour ouvrir le clavier, ça saute — une sorte de
   clignotement. » Ce banc mesurait alors trois façons de sauter : la carte
   qui grandit, la ligne qui quitte le DOM, le clavier qui se lève sur l'écran
   de la partie. La v344 a retiré les trois causes (voir LES SIX PLACES dans
   index.html) ; il vérifie maintenant qu'elles ne reviennent pas :
     1. l'écran du Mode Groupe n'a plus AUCUN champ — le clavier ne peut plus
        s'y lever ;
     2. aucun geste ne détruit puis ne recrée une couche de verre (une surface
        qui perd son verre une image apparaît nue : c'est un clignotement que
        la géométrie ne montre pas) — ajouter, retirer au milieu, retirer le
        dernier, passer par la page d'un joueur et revenir ;
     3. la hauteur de la carte ne bouge pas d'une seule image pendant ces
        gestes ;
     4. aucune erreur.
   (joueurs.js vérifie le reste : les places, les glissements, la page.)
   Usage : node banc-essai/lignes.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d !== undefined ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [nom, ua, W, H] of [['iPhone', IOS, 393, 852], ['Android', AND, 412, 915]]) {
    console.log('  — ' + nom);
    const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, userAgent: ua, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.evaluate(() => { state.mode = 'group'; state.teams = [{ name: 'Taylor' }, { name: 'Bea' }, { name: 'Chris' }]; state.screen = 'setup'; render(); });
    await p.waitForTimeout(1200);
    /* 1 */
    const champs = await p.evaluate(() => document.querySelectorAll('#app .screen input, #app .screen textarea').length);
    dit('1. l\'écran du Mode Groupe n\'a aucun champ : le clavier ne peut plus s\'y lever', champs === 0, champs + ' champ(s)');
    /* 2 + 3 */
    const sceller = () => {
      window.__n = window.__n || 0;
      document.querySelectorAll('#app .gs, #app .gs-plein, #app .glass-rim').forEach(e => { if (!e.dataset.sceau) e.dataset.sceau = 's' + (++window.__n); });
      return [...document.querySelectorAll('#app .gs, #app .gs-plein, #app .glass-rim')].map(e => e.dataset.sceau);
    };
    const hauteurs = (ms) => p.evaluate((ms) => new Promise(res => { const c = document.getElementById('teamCard'); const h0 = c.getBoundingClientRect().height; let pire = 0; const t0 = performance.now();
      const tic = () => { pire = Math.max(pire, Math.abs(c.getBoundingClientRect().height - h0)); if (performance.now() - t0 < ms) requestAnimationFrame(tic); else res(+pire.toFixed(2)); }; requestAnimationFrame(tic); }), ms);
    for (const [geste, code, ms] of [
      ['ajouter', 'ajouterJoueur()', 900],
      ['retirer au milieu', 'retirerJoueur(1)', 1000],
      ['retirer le dernier', 'retirerJoueur(state.teams.length - 1)', 900],
      ['la page d\'un joueur, aller et retour', 'ouvrirJoueur(1); setTimeout(() => { const z = document.getElementById("joueurNom"); z.value = "Noé"; nommerJoueur(z); validerJoueur(); }, 700)', 1700],
    ]) {
      const avant = await p.evaluate(sceller);
      const mesure = hauteurs(ms);
      await p.evaluate((c) => { new Function(c)(); }, code);
      const pire = await mesure;
      await p.waitForTimeout(300);
      const apres = await p.evaluate(sceller);
      const perdus = avant.filter(s => !apres.includes(s)).length;
      dit('2-3. ' + geste + ' : aucune couche de verre recréée, la carte ne change pas de hauteur', perdus === 0 && pire === 0, perdus + ' couche(s) perdue(s) · ' + pire + ' px');
    }
    dit('4. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await nav.close();
  console.log(ko ? '\n  ÉCHEC' : '\n  OK — les places ne touchent ni au verre, ni à la hauteur, ni au clavier');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
