/* « PARTAGER LE JEU » DOIT FAIRE QUELQUE CHOSE À CHAQUE APPUI.

   Il ne marchait pas toujours, et surtout : quand il ne marchait pas, il ne se
   passait RIEN. Le catch avalait tout, sans distinguer les cas.

   Le banc rejoue les six situations que le navigateur peut produire, en
   remplaçant navigator.share par un faux qui échoue de la manière voulue :

     partage accepté          -> la feuille s'ouvre, rien d'autre
     partage abandonné        -> silence (c'est un choix de l'utilisateur)
     refus asynchrone         -> le lien est copié
     refus SYNCHRONE (throw)  -> le lien est copié
     deuxième appui pendant   -> aucune exception, aucun double appel
     aucun partage possible   -> le lien est copié

       node partage.js        (jeu servi en HTTP sur 8099) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';

const CAS = [
  ['partage accepté',            'ok',        { copie:false, toast:false, part:1 }],
  ['partage abandonné',          'abort',     { copie:false, toast:false, part:1 }],
  ['refus asynchrone',           'refus',     { copie:true,  toast:true,  part:1 }],
  ['refus synchrone (throw)',    'throw',     { copie:true,  toast:true,  part:1 }],
  ['deuxième appui pendant',     'lent2',     { copie:false, toast:false, part:1 }],
  ['aucun partage possible',     'absent',    { copie:true,  toast:true,  part:0 }],
];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ok = true;
  for (const [nom, mode, attendu] of CAS) {
    const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
      userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
    /* On remplace le partage du système et le presse-papiers par des témoins. */
    await p.evaluate((m) => {
      window.__part = 0; window.__copie = 0;
      const err = (n) => { const e = new Error(n); e.name = n; return e; };
      if (m === 'absent') { try { delete navigator.share; } catch(e){}
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); }
      else {
        Object.defineProperty(navigator, 'share', { configurable: true, value: function(){
          window.__part++;
          if (m === 'throw') throw err('NotAllowedError');
          if (m === 'abort') return Promise.reject(err('AbortError'));
          if (m === 'refus') return Promise.reject(err('NotAllowedError'));
          if (m === 'lent2') return new Promise(r => setTimeout(r, 900));
          return Promise.resolve();
        }});
      }
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: function(){ window.__copie++; return Promise.resolve(); } } });
    }, mode);
    await p.evaluate(() => { openSettings(); });
    await p.waitForTimeout(700);
    await p.click('.share-btn');
    if (mode === 'lent2') { await p.waitForTimeout(120); await p.click('.share-btn'); }
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({ part: window.__part, copie: window.__copie,
      toast: !!document.querySelector('.mini-toast.show') }));
    const bon = r.part === attendu.part && (r.copie > 0) === attendu.copie && r.toast === attendu.toast && !errs.length;
    if (!bon) ok = false;
    console.log('   ' + (bon ? '   ' : '<-- ') + nom.padEnd(26) +
      'partage système ' + r.part + '   lien copié ' + r.copie + '   message ' + (r.toast ? 'oui' : 'non') +
      (errs.length ? '   ERREUR JS : ' + errs[0].slice(0,60) : ''));
    await ctx.close();
  }
  console.log(ok ? '\n  OK — le bouton fait toujours quelque chose' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
