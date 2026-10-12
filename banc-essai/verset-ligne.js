/* ====== LE VERSET OUVERT NE PASSE JAMAIS SUR LA LIGNE D'HÉBREUX 4:16 (v316) ======
   « Ça se superpose avec le verset, corrige ça. » (capture de Taylor :
   Colossiens 3:16, Segond, sur un iPhone — la carte du verset descendait sur
   la ligne « Approchons-nous donc avec assurance du trône de la grâce », qui
   restait affichée et se peignait par-dessus.)
   La barre des groupes a ramené cette ligne sous le titre ; la carte, qui
   grandit vers le bas jusqu'aux cartes de mode, effaçait le titre quand elle
   l'atteignait, mais pas la ligne.
   CE QU'IL EXIGE, pour chaque verset de chaque version, sur cinq écrans, avec
   et sans la barre :
     1. quand la ligne reste visible, la carte s'arrête au-dessus de ses
        lettres, avec de l'air : aucun chevauchement ;
     2. la ligne ne s'efface pas pour rien : un verset court, qui s'arrête
        bien au-dessus d'elle, la laisse en place ;
     3. le verset refermé, la ligne revient ;
     4. la capture de Taylor (Colossiens 3:16, Segond, 393 × 852) : la ligne
        s'efface ;
     5. aucune erreur.
   Les transitions sont coupées pendant la mesure : on lit l'état FINAL de la
   carte et de la ligne, celui que l'œil voit une fois l'ouverture finie.
   Usage : node banc-essai/verset-ligne.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ECRANS = [['iPhone SE', 375, 667], ['iPhone 15', 393, 852], ['15 Pro Max', 430, 932], ['Xiaomi', 360, 780], ['Pixel 8', 412, 915]];
const AIR = 4;        // px : sous ce blanc, la carte touche la ligne
const POUR_RIEN = 14; // px : au-delà de ce blanc, effacer la ligne serait gratuit
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  let chev = [], pourRien = [], retour = [], vus = 0, effaces = 0;
  try {
    for (const [nom, w, h] of ECRANS) {
      for (const barre of [true, false]) {
        const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
        const p = await ctx.newPage();
        p.on('pageerror', e => errs.push(nom + ' : ' + e.message));
        await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
        await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
        await p.goto(URL);
        await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
        await p.evaluate((b) => { grp.installe = b; grp.ouverts = b; state.screen = 'mode'; render(); majBarre(); }, barre);
        await p.waitForTimeout(1500);
        await p.addStyleTag({ content: '*, *::before, *::after{ transition:none !important; transition-delay:0s !important; }' });
        const r = await p.evaluate(({ AIR, POUR_RIEN }) => {
          const zone = document.getElementById('heroZone'), card = zone.querySelector('.hero-verse-card');
          const ligne = document.getElementById('homeVerse');
          const lettres = () => { const r = ligne.getBoundingClientRect(), cs = getComputedStyle(ligne);
            const fs = parseFloat(cs.fontSize) || 0, lh = parseFloat(cs.lineHeight) || fs * 1.42; return r.top + Math.max(0, (lh - fs) / 2); };
          const presente = () => ligne && ligne.getClientRects().length > 0;
          const out = { chev: [], pourRien: [], retour: [], vus: 0, effaces: 0, presente: presente() };
          if (!out.presente) return out;
          const vrai = Math.random;
          for (const b of BIBLES) {
            settings.bible = b.cle;
            HERO_VERSES.forEach((v, i) => {
              Math.random = () => (i + 0.5) / HERO_VERSES.length; lastVerseIdx = -1;
              showHeroVerse();
              Math.random = vrai;
              const bas = card.getBoundingClientRect().bottom, haut = lettres();
              const op = +getComputedStyle(ligne).opacity;
              out.vus++;
              if (op === 0) out.effaces++;
              const qui = (b.sigle || b.cle) + ' · ' + v.r;
              if (op > 0 && bas > haut - AIR) out.chev.push(qui + ' (' + Math.round(bas - haut + AIR) + ' px)');
              if (op === 0 && bas < haut - POUR_RIEN) out.pourRien.push(qui + ' (' + Math.round(haut - bas) + ' px d\'air)');
              hideHeroVerse();
              if (+getComputedStyle(ligne).opacity !== 1) out.retour.push(qui);
            });
          }
          settings.bible = BIBLES[0].cle;
          return out;
        }, { AIR, POUR_RIEN });
        const tag = nom + (barre ? ' + barre' : '');
        if (!r.presente) { console.log('  ' + tag.padEnd(22) + ' ligne absente (écran court sans barre) : rien à mesurer'); await ctx.close(); continue; }
        console.log('  ' + tag.padEnd(22) + ' ' + String(r.vus).padStart(4) + ' versets · ligne effacée ' + String(r.effaces).padStart(3) + ' fois · chevauchements ' + r.chev.length + ' · effacée pour rien ' + r.pourRien.length);
        chev = chev.concat(r.chev.map(x => tag + ' : ' + x)); pourRien = pourRien.concat(r.pourRien.map(x => tag + ' : ' + x)); retour = retour.concat(r.retour.map(x => tag + ' : ' + x));
        vus += r.vus; effaces += r.effaces;
        await ctx.close();
      }
    }
    console.log('');
    dit('1. la carte ne passe jamais sur la ligne restée visible', chev.length === 0 && vus > 0, chev.slice(0, 4).join(' | ') || vus + ' affichages');
    dit('2. la ligne ne s\'efface jamais pour rien', pourRien.length === 0, pourRien.slice(0, 4).join(' | ') || effaces + ' effacements, tous justifiés');
    dit('3. le verset refermé, la ligne revient', retour.length === 0, retour.slice(0, 3).join(' | '));

    /* ---- 4 ---- la capture de Taylor, par le vrai chemin, transitions comprises */
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('capture : ' + e.message));
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => { grp.installe = true; grp.ouverts = true; state.screen = 'mode'; render(); majBarre(); });
    await p.waitForTimeout(2000);
    const quatre = await p.evaluate(async () => {
      settings.bible = BIBLES[0].cle;
      const i = HERO_VERSES.findIndex(v => v.r === 'Colossiens 3:16');
      const vrai = Math.random; Math.random = () => (i + 0.5) / HERO_VERSES.length; lastVerseIdx = -1;
      showHeroVerse(); Math.random = vrai;
      await new Promise(r => setTimeout(r, 1400));
      const l = document.getElementById('homeVerse');
      return { ref: document.querySelector('.hero-verse-ref').textContent, ligne: getComputedStyle(l).opacity,
        carte: Math.round(document.querySelector('.hero-verse-card').getBoundingClientRect().bottom), haut: Math.round(l.getBoundingClientRect().top) };
    });
    dit('4. Colossiens 3:16 (Segond), 393 × 852 : la ligne s\'efface', /COLOSSIENS 3:16|Colossiens 3:16/i.test(quatre.ref) && quatre.ligne === '0', JSON.stringify(quatre));
    await ctx.close();
    dit('5. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le verset ouvert ne passe jamais sur la ligne d\'Hébreux 4:16');
  process.exit(ko ? 1 : 0);
})();
