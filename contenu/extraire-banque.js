/* Le site de Yada (v363) : extrait la banque de questions telle que le jeu la
   lit — le livre de chaque question est celui que le jeu lui attribue (bookOf).
   Usage : node contenu/extraire-banque.js <url du jeu> <sortie.json> */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const SORTIE = process.argv[3];
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Banc', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return typeof BANK === 'object' && typeof bookOf === 'function'; } catch (e) { return false; } }, null, { timeout: 30000 });
  const d = await p.evaluate(() => {
    const out = [];
    for (const tier of ['facile', 'moyen', 'difficile']) BANK[tier].forEach((q, i) => out.push({ tier, i, q: q.q, options: q.options, correct: q.correct, fact: q.fact, book: bookOf(q) }));
    let ordre = null; try { ordre = BIBLE_BOOKS.slice(); } catch (e) {}
    let testament = null; try { testament = out.map(x => (typeof qTestament === 'function') ? qTestament(BANK[x.tier][x.i]) : null); } catch (e) {}
    return { out, ordre, testament, version: VERSION_JEU };
  });
  require('fs').writeFileSync(SORTIE, JSON.stringify(d, null, 1));
  console.log('questions', d.out.length, 'avec livre', d.out.filter(x => x.book).length, 'ordre', d.ordre && d.ordre.length, 'version', d.version);
  await nav.close();
})().catch(e => { console.error(e); process.exit(1); });
