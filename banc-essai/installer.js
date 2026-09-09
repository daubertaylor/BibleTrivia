/* INSTALLER LE JEU : TROIS CHEMINS, ET UN SEUL GESTE QUAND C'EST POSSIBLE.

   Chrome prévient l'application dès qu'elle est installable
   (« beforeinstallprompt ») et lui laisse déclencher l'invitation officielle.
   Le jeu ignorait cet événement : un joueur Android suivait trois gestes pour
   ce que son téléphone fait en un seul, et Chrome posait par-dessus sa propre
   bannière. Le banc vérifie les trois situations :

     Android, invitation reçue  -> une fenêtre qui INSTALLE (deux lignes,
                                   bouton « Installer », bannière de Chrome
                                   rangée par preventDefault)
     Android, aucune invitation -> le guide en trois gestes, inchangé
     iPhone                     -> le guide Safari, inchangé

   Et deux règles : l'invitation ne sert QU'UNE FOIS (la deuxième ouverture
   retombe sur le guide), et le manifeste doit remplir les critères de Chrome
   — sans quoi l'événement ne viendrait jamais et tout ce chemin serait mort.

       node installer.js        (jeu servi en HTTP sur 8099) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const URL = process.env.URL_ESSAI || process.argv[2] || 'http://127.0.0.1:8099/index.html';
const BASE = URL.replace(/[^/]*$/, '');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let ok = true;
  const dire = (bon, txt) => { if (!bon) ok = false; console.log('   ' + (bon ? '   ' : '<-- ') + txt); };

  /* ===== 0. sans manifeste valable, Chrome n'enverrait jamais l'invitation ===== */
  const ctx0 = await b.newContext({ userAgent: AND, serviceWorkers:'block' });
  const p0 = await ctx0.newPage();
  const man = await p0.evaluate(async (u) => { try { return await (await fetch(u)).json(); } catch(e){ return null; } }, BASE + 'manifest.json')
    .catch(()=>null) || await (async()=>{ await p0.goto(BASE); return p0.evaluate(async(u)=>{ try{ return await (await fetch(u)).json(); }catch(e){ return null; } }, BASE+'manifest.json'); })();
  const sw = await p0.evaluate(async (u) => { try { return (await (await fetch(u)).text()).indexOf('addEventListener("fetch"') >= 0; } catch(e){ return false; } }, BASE + 'sw.js');
  const tailles = man ? (man.icons||[]).map(i=>i.sizes) : [];
  console.log('  critères d\'installation de Chrome');
  dire(!!man && !!man.name && !!man.short_name, 'nom et nom court : ' + (man ? man.name + ' / ' + man.short_name : 'manifeste illisible'));
  dire(!!man && !!man.start_url, 'start_url : ' + (man && man.start_url));
  dire(tailles.indexOf('192x192') >= 0 && tailles.indexOf('512x512') >= 0, 'icônes 192 et 512 : ' + tailles.join(' '));
  dire(!!man && /standalone|fullscreen|minimal-ui/.test(String(man.display) + String(man.display_override)), 'affichage autonome : ' + (man && man.display));
  dire(sw, 'le service worker répond aux requêtes (handler fetch)');
  await ctx0.close();

  /* ===== les trois chemins ===== */
  const essai = async (ua, nom, invite) => {
    const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
      userAgent:ua, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
    if (invite) {
      /* Chrome n'émet pas l'événement sans les critères réunis : on le
         reproduit fidèlement — preventDefault, prompt, userChoice. */
      await p.evaluate(() => {
        window.__prompt = 0; window.__range = false;
        const ev = new Event('beforeinstallprompt');
        ev.prompt = function(){ window.__prompt++; return Promise.resolve(); };
        ev.userChoice = Promise.resolve({ outcome:'accepted' });
        const vrai = ev.preventDefault.bind(ev);
        ev.preventDefault = function(){ window.__range = true; vrai(); };
        window.dispatchEvent(ev);
      });
      await p.waitForTimeout(200);
    }
    await p.evaluate(() => { openSettings(); }); await p.waitForTimeout(600);
    await p.evaluate(() => { openFsGuide(); }); await p.waitForTimeout(800);
    const t = await p.evaluate(() => { const m = document.querySelector('.modal-card'); if (!m) return null;
      return { gestes:[...m.querySelectorAll('.set-row b')].map(x=>x.textContent),
        ok:(m.querySelector('#modalOk')||{}).textContent||'', range: window.__range === true }; });
    console.log('\n  ' + nom);
    if (!t) { dire(false, 'aucune fenêtre ne s\'ouvre'); await ctx.close(); return; }
    console.log('      ' + t.gestes.length + ' geste(s) : ' + t.gestes.join(' / '));
    if (invite) {
      dire(t.gestes.length === 2 && t.ok === 'Installer', 'bouton « ' + t.ok +' »');
      dire(t.range, 'la bannière de Chrome est rangée (preventDefault)');
      await p.click('#modalOk'); await p.waitForTimeout(400);
      const r = await p.evaluate(() => ({ n: window.__prompt, ouvert: !!document.querySelector('.modal-card') }));
      dire(r.n === 1, 'invitation du système déclenchée ' + r.n + ' fois');
      dire(!r.ouvert, 'la fenêtre se referme');
      await p.evaluate(() => { openFsGuide(); }); await p.waitForTimeout(700);
      const r2 = await p.evaluate(() => { const m = document.querySelector('.modal-card');
        return m ? { ok:(m.querySelector('#modalOk')||{}).textContent, n:m.querySelectorAll('.set-row').length } : null; });
      dire(!!r2 && r2.n === 3 && r2.ok === 'Compris', 'une invitation ne sert qu\'une fois : retour au guide (' + (r2 ? r2.n + ' gestes, « ' + r2.ok + ' »' : 'rien') + ')');
    } else {
      dire(t.gestes.length === 3 && t.ok === 'Compris', 'guide en trois gestes, bouton « ' + t.ok + ' »');
    }
    if (errs.length) dire(false, 'ERREURS JS : ' + [...new Set(errs)].slice(0,2).join(' | '));
    await ctx.close();
  };

  await essai(AND, 'Android, invitation reçue', true);
  await essai(AND, 'Android, aucune invitation', false);
  await essai(IOS, 'iPhone', false);

  console.log(ok ? '\n  OK — un seul geste quand le téléphone sait le faire, le guide sinon'
                 : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
