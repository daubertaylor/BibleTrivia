#!/usr/bin/env node
/* Pilote headless de BibleTrivia — lance l'app, la conduit, la photographie.
   Mode d'emploi et pièges : voir SKILL.md à côté de ce fichier. */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const require_ = createRequire(import.meta.url);
function loadPlaywright(){
  const tries = ['playwright', process.env.PLAYWRIGHT_DIR, '/opt/node22/lib/node_modules/playwright'].filter(Boolean);
  for(const t of tries){ try { return require_(t); } catch(e){} }
  console.error('playwright introuvable : npm i playwright, ou PLAYWRIGHT_DIR=/chemin/vers/le/module');
  process.exit(2);
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const INDEX = path.join(ROOT, 'index.html');
const CHROMIUM = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
const outDefault = name => path.join(os.tmpdir(), name);

function inlineScript(){
  const h = fs.readFileSync(INDEX, 'utf8');
  return [...h.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(x => x[1]).sort((a, b) => b.length - a.length)[0];
}

/* Démarrage standard : iPhone portrait tactile, attente du splash (~4,5 s),
   puis neutralisation du plein écran déclenché par le premier toucher. */
async function boot(pw){
  const browser = await pw.chromium.launch({ executablePath: CHROMIUM });
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  await page.goto('file://' + INDEX);
  await page.waitForTimeout(4500); // splash -> accueil (state.screen === "mode")
  await page.evaluate(() => { document.documentElement.requestFullscreen = null; });
  return { browser, page, errors };
}

const [,, cmd, ...args] = process.argv;
const pw = loadPlaywright();

(async () => {
  if(cmd === 'smoke' || cmd === undefined){
    try { new Function(inlineScript()); console.log('SYNTAXE OK'); }
    catch(e){ console.log('ERREUR DE SYNTAXE :', e.message); process.exit(1); }
    const { browser, page, errors } = await boot(pw);
    const screen = await page.evaluate(() => state.screen);
    const shot = outDefault('bibletrivia-smoke.png');
    await page.screenshot({ path: shot });
    await browser.close();
    console.log('écran :', screen, '| attendu : mode');
    console.log('capture :', shot);
    console.log('erreurs page :', errors.length ? JSON.stringify(errors) : 'aucune');
    process.exit(screen === 'mode' && errors.length === 0 ? 0 : 1);
  }
  else if(cmd === 'shot'){
    const out = args[0] || outDefault('bibletrivia.png');
    const js = args[1];
    const { browser, page, errors } = await boot(pw);
    if(js){ await page.evaluate(`(async()=>{ ${js} })()`); await page.waitForTimeout(900); }
    await page.screenshot({ path: out });
    await browser.close();
    console.log('capture :', out);
    if(errors.length) console.log('erreurs page :', JSON.stringify(errors));
  }
  else if(cmd === 'eval'){
    const { browser, page, errors } = await boot(pw);
    const r = await page.evaluate(`(async()=>{ return (${args[0] || 'state.screen'}); })()`);
    await browser.close();
    console.log(JSON.stringify(r));
    if(errors.length) console.log('erreurs page :', JSON.stringify(errors));
  }
  else if(cmd === 'play'){
    const out = args[0] || outDefault('bibletrivia-play.png');
    const { browser, page, errors } = await boot(pw);
    await page.click('text=Mode Solo');
    await page.waitForTimeout(800);
    await page.click('text=Commencer la partie');
    await page.waitForTimeout(900);
    await page.click('.option-btn');   // répond à la première question
    await page.waitForTimeout(1200);   // révélation + « Le savais-tu ? »
    await page.screenshot({ path: out });
    const st = await page.evaluate(() => ({ screen: state.screen, revealed: state.revealed, question: state.currentIndex + 1 }));
    await browser.close();
    console.log('état :', JSON.stringify(st));
    console.log('capture :', out);
    if(errors.length) console.log('erreurs page :', JSON.stringify(errors));
    process.exit(st.screen === 'play' && st.revealed && errors.length === 0 ? 0 : 1);
  }
  else {
    console.log('commandes : smoke | shot <sortie.png> ["instructions js"] | eval "expression js" | play <sortie.png>');
    process.exit(2);
  }
})();
