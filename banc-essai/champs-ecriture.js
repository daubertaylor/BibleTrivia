/* ====== BANC « LE CHAMP OÙ L'ON ÉCRIT SE VOIT » (v332) ======
   « Quand je clique pour ouvrir le clavier, la barre d'écriture devient
     transparente. » « Quand j'ouvre le clavier, je n'ai pas le petit trait
     qui me dit que je suis en train d'écrire. Et si ça fait pareil ailleurs,
     règle aussi. » Sur iPhone et sur Android, chaque champ du jeu, touché :
     1. il devient blanc PLEIN (aucune transparence : le décor ne passe pas
        au travers) ;
     2. son curseur se dessine (jamais transparent) ;
     3. un champ de code vide : l'exemple s'efface quand on le touche (le
        curseur clignote seul, au milieu), et revient quand on le quitte ;
     4. aucun trait de couleur autour du champ actif ;
     5. aucune erreur.
   Usage : node banc-essai/champs-ecriture.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 260) + ')' : '')); };

/* Les écrans à champ, et comment les ouvrir. */
const ECRANS = [
  ['Profil · nom', `state.screen='profile'; render();`, '#profileName'],
  ['Groupes · rejoindre avec un code', `__grp(); state.screen='groupes'; render(); ouvrirCode();`, '#grpCode'],
  ['Groupes · créer (nom)', `__grp(); state.screen='groupes'; render(); ouvrirCreation();`, '#grpNom'],
  ['Groupes · créer (description)', `__grp(); state.screen='groupes'; render(); ouvrirCreation();`, '#grpDesc'],
  ['Groupes · rechercher', `__grp(); state.screen='groupes'; render();`, '.grp-cherche'],
  ['En ligne · code d\'une partie', `state.screen='online-join'; render();`, '#joinCode'],
  ['Compte · le code reçu par e-mail', `compte.dispo = true; compte.etape = 'code'; compte.saisie = 'j@e.net'; state.screen='profile'; render();`, '#compteCode'],
];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      console.log('  — ' + tel);
      for (const [nom, ouvrir, sel] of ECRANS) {
        const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
        const p = await ctx.newPage();
        p.on('pageerror', e => errs.push(e.message));
        await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
        await p.goto(URL);
        await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
        await p.evaluate(() => { window.__grp = () => { document.documentElement.classList.add('is-standalone');
          compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
          grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: false }; grp.liste = []; grp.publics = []; }; });
        await p.evaluate((o) => { new Function(o)(); }, ouvrir);
        await p.waitForTimeout(1200);
        const la = await p.evaluate((s) => !!document.querySelector(s), sel);
        if (!la) { console.log('      (' + nom + ' : champ absent de cet écran, sauté)'); await ctx.close(); continue; }
        const lire = () => p.evaluate((s) => {
          const e = document.querySelector(s), st = getComputedStyle(e), ph = getComputedStyle(e, '::placeholder');
          const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return c === 'transparent' ? 0 : 1; const v = m[1].split(/[ ,/]+/).filter(Boolean); return v.length > 3 ? +v[3] : 1; };
          return { fond: st.backgroundColor, alphaFond: alpha(st.backgroundColor), curseur: st.caretColor, alphaCurseur: alpha(st.caretColor),
            exemple: ph.color, alphaExemple: alpha(ph.color), trait: st.borderTopColor + ' ' + st.borderTopWidth, ombre: st.boxShadow, outline: st.outlineStyle + ' ' + st.outlineWidth,
            focus: document.activeElement === e, vide: !e.value };
        }, sel);
        const r0 = await lire();
        await p.locator(sel).scrollIntoViewIfNeeded().catch(() => {});
        await p.locator(sel).tap();
        await p.waitForTimeout(450);
        const f = await lire();
        const code = await p.evaluate((s) => document.querySelector(s).classList.contains('code-input'), sel);
        dit(nom + ' : blanc plein une fois touché', f.focus && f.alphaFond === 1, f.fond);
        dit('   le curseur se dessine', f.alphaCurseur > 0, f.curseur);
        if (code && f.vide) {
          await p.evaluate((s) => document.querySelector(s).blur(), sel);
          await p.waitForTimeout(300);
          const q = await lire();
          dit('   champ de code vide : l\'exemple s\'efface au toucher, revient quand on le quitte', f.alphaExemple === 0 && q.alphaExemple > 0, f.exemple + ' → ' + q.exemple);
        }
        /* Rien ne s'AJOUTE : pas de contour, un bord qui ne prend pas de
           couleur, une ombre qui reste la même — ou s'efface. */
        const sansCouleur = (c) => /rgba\([^)]*,\s*0\)$/.test(c) || c === 'transparent';
        dit('   aucun trait de couleur ne s\'ajoute autour (ni contour, ni anneau)', f.outline.startsWith('none') && (f.trait === r0.trait || sansCouleur(f.trait.split(' 1px')[0].trim())) && (f.ombre === 'none' || f.ombre === r0.ombre),
          f.outline + ' · ' + f.trait + ' · ' + f.ombre.slice(0, 60) + ' (avant : ' + r0.trait + ')');
        await ctx.close();
      }
    }
    dit('aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le champ où l\'on écrit est blanc plein, et son curseur se voit');
  process.exit(ko ? 1 : 0);
})();
