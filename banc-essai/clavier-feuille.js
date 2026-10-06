/* ====== BANC « LE CLAVIER NE CACHE PAS LE CHAMP D'UNE FEUILLE » ======
   « Quand j'écris le nom du groupe ou la description, le clavier cache ce
   que je suis en train d'écrire. Pareil pour rejoindre avec un code. »

   Les feuilles qui montent du bas restaient posées sur le bas de l'écran,
   derrière le clavier. Ce banc fait voir au VRAI module du clavier un clavier
   de la hauteur d'un iPhone (visualViewport.height réduit, puis « resize »),
   pose le doigt dans chaque champ, et refuse un champ dont le bas passe sous
   le bord du clavier — ou dont le haut sort par le haut de l'écran.

   Usage : node banc-essai/clavier-feuille.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
/* nom, largeur, hauteur, zones sûres haut/bas, hauteur du clavier (barre de suggestions comprise) */
const APPAREILS = [ ['iPhone 16 Pro', 402, 874, 62, 34, 346], ['iPhone SE', 375, 667, 20, 0, 260] ];
const CHAMPS = [
  ['Créer · nom',         "ouvrirCreation()", 'grpNom',  'grpCreerVeil'],
  ['Créer · description', "ouvrirCreation()", 'grpDesc', 'grpCreerVeil'],
  ['Rejoindre · code',    "ouvrirCode()",     'grpCode', 'grpCodeVeil'],
];
let ko = 0;
const v = (nom, bon, detail) => { if(!bon) ko++; console.log('  ' + (bon ? 'ok   ' : 'KO   ') + nom + (detail ? '\n        ' + detail : '')); };
(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  for (const [nom, W, H, HT, BS, KB] of APPAREILS) {
    console.log('\n  — ' + nom + ', clavier de ' + KB + ' px —');
    for (const [champNom, ouvrir, champ, veil] of CHAMPS) {
      const ctx = await nav.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:1, userAgent:IOS, hasTouch:true, isMobile:true, serviceWorkers:'block' });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets:{ top:HT, bottom:BS, left:0, right:0 } });
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' })); localStorage.setItem('bt_fs_hint','1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
      await p.evaluate(() => { document.documentElement.classList.add('is-standalone');
        compte.dispo=true; compte.session={ user:{ id:'moi-0', email:'j@e.net' } }; compte.etape='connecte';
        grp.installe=true; grp.ouverts=true; grp.etat={ participe:'ok', moderateur:true }; grp.liste=[]; grp.publics=[];
        state.screen='groupes'; render(); majBarre(); });
      await p.waitForTimeout(800);
      await p.evaluate((o) => { new Function(o)(); }, ouvrir); await p.waitForTimeout(1000);
      await p.evaluate(([c, kb, h]) => {
        Object.defineProperty(window.visualViewport, 'height', { configurable:true, get: () => h - kb });
        document.getElementById(c).focus({ preventScroll:true });
        window.visualViewport.dispatchEvent(new Event('resize'));
      }, [champ, KB, H]);
      await p.waitForTimeout(700);
      const r = await p.evaluate(([c, kb, h]) => { const e = document.getElementById(c).getBoundingClientRect();
        return { haut: Math.round(e.top), bas: Math.round(e.bottom), bord: h - kb, kb: document.documentElement.classList.contains('kb') }; }, [champ, KB, H]);
      v(champNom + ' : visible au-dessus du clavier', r.kb && r.bas <= r.bord && r.haut >= 0, 'champ ' + r.haut + '–' + r.bas + ' px, bord du clavier à ' + r.bord + ' px');
      if (errs.length) v(champNom + ' : aucune erreur JS', false, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  }
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — clavier ouvert, chaque feuille se pose dessus et le champ reste visible');
  process.exit(ko ? 1 : 0);
})();
