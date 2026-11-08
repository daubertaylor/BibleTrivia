/* ====== LA CONFIDENTIALITÉ EN LIGNE (v350) ======
   « Pour le message européen, fais ce qu'il faut. » Le message de
   consentement d'AdSense (Confidentialité et messages) demande l'adresse
   d'une politique de confidentialité ; celle du jeu ne vivait qu'à
   l'intérieur de l'app. La voici à part : /confidentialite.html, avec les
   mentions légales. Elle doit dire EXACTEMENT ce que dit le jeu.
     1. la page est servie, à part (pas le jeu), titrée, en trois langues
        (#fr, #en, #es) ;
     2. chaque ligne de la Confidentialité du jeu s'y lit mot pour mot, dans
        chaque langue (la page est recopiée du jeu : si le jeu change, ce banc
        le dit) ;
     3. les mentions légales : l'éditeur (Taylor Dauber), son téléphone en
        lien tel: (donné par Taylor pour ces pages), son adresse quand elle
        est complète, l'e-mail de Yada en mailto, les deux hébergeurs ; aucun
        autre numéro, aucune autre donnée personnelle ;
     4. ni annonce ni script ; elle tient dans un téléphone (rien ne dépasse
        en largeur) ; ses polices sont celles du jeu ;
     5. le jeu installé (son service worker) laisse passer la page : c'est
        elle qui s'ouvre, pas le jeu ;
     6. aucune erreur.
   Usage : node banc-essai/page-confidentialite.js [url du jeu] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL_JEU = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const URL_PAGE = new URL('confidentialite.html', URL_JEU).href;
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };
const net = (t) => String(t || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    /* 1 et 4 : la page seule, sur un téléphone */
    const ctx = await nav.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('page : ' + e.message));
    await p.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    const rep = await p.goto(URL_PAGE);
    await p.waitForTimeout(500);
    const page = await p.evaluate(async () => {
      await document.fonts.ready;
      const sec = (lg) => { const s = document.getElementById(lg); return s ? [...s.querySelectorAll('p')].map(x => x.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()) : null; };
      return { titre: document.title, jeu: typeof window.state !== 'undefined', langs: ['fr', 'en', 'es'].map(l => { const s = document.getElementById(l); return s ? s.getAttribute('lang') : null; }),
        fr: sec('fr'), en: sec('en'), es: sec('es'), scripts: document.querySelectorAll('script').length, ins: document.querySelectorAll('ins').length,
        deborde: document.documentElement.scrollWidth - innerWidth, polices: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family),
        tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href') + ' ' + a.textContent),
        mail: [...document.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute('href')),
        texte: document.body.textContent.replace(/\s+/g, ' ') };
    });
    dit('1. la page est servie à part (pas le jeu), titrée, en trois langues',
      rep && rep.status() === 200 && page.titre === 'Yada — Confidentialité et mentions légales' && !page.jeu && page.langs.join() === 'fr,en,es',
      JSON.stringify({ statut: rep && rep.status(), titre: page.titre, jeu: page.jeu, langs: page.langs }));
    dit('4. ni annonce ni script ; rien ne dépasse en largeur ; les polices du jeu',
      page.scripts === 0 && page.ins === 0 && page.deborde <= 0 && page.polices.includes('Inter') && page.polices.includes('Poppins'),
      JSON.stringify({ scripts: page.scripts, ins: page.ins, deborde: page.deborde, polices: page.polices }));

    /* 3 : les mentions */
    const adresse = await (async () => {
      const c = await nav.newContext({ serviceWorkers: 'block' }); const q = await c.newPage();
      await q.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await q.route('**/pagead2.googlesyndication.com/**', r => r.abort());
      await q.goto(URL_JEU); await q.waitForFunction(() => { try { return typeof EDITEUR === 'object'; } catch (e) { return false; } }, null, { timeout: 25000 });
      const a = await q.evaluate(() => EDITEUR.adresse); await c.close(); return a;
    })();
    const autres = page.texte.replace(/\+1 888 993 5273/g, '').replace(/07 84 04 57 70/g, '');
    const fuite = /(\+33|\b0\d([ .]?\d\d){4}\b)/.test(autres) || /daubertaylor22/.test(page.texte);
    const fr = page.fr || [];
    dit('3. les mentions : l\'éditeur, son téléphone (tel:), l\'e-mail de Yada (mailto), les deux hébergeurs' + (adresse ? ', son adresse' : '') + ' ; aucun autre numéro, aucune autre donnée personnelle',
      fr.includes('Éditeur et directeur de la publication : Taylor Dauber') && fr.includes('Téléphone : 07 84 04 57 70') && fr.includes('Contact : yadaquiz.app@gmail.com')
      && fr.some(x => /^Hébergeur : Cloudflare, Inc\., 101 Townsend Street, San Francisco, CA 94107, États-Unis — \+1 888 993 5273\. \(yadaquiz\.app\)$/.test(x))
      && fr.some(x => /^Hébergeur : GitHub, Inc\., 88 Colin P\. Kelly Jr\. Street/.test(x))
      && page.tel.length === 3 && page.tel.every(t => t === 'tel:+33784045770 07 84 04 57 70') && page.mail.length === 3 && page.mail.every(m => m === 'mailto:yadaquiz.app@gmail.com')
      && (!adresse || fr.includes('Adresse : ' + adresse)) && !fuite,
      JSON.stringify({ tel: page.tel, mail: page.mail, fuite, adresse, mentions: fr.slice(-6) }));
    await ctx.close();

    /* 2 : ligne à ligne, ce que dit le jeu */
    const manque = [];
    for (const lg of ['fr', 'en', 'es']) {
      const c = await nav.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
      const q = await c.newPage();
      q.on('pageerror', e => errs.push('jeu ' + lg + ' : ' + e.message));
      await q.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await q.route('**/pagead2.googlesyndication.com/**', r => r.abort());
      await q.addInitScript((lg) => { if (!/^http/.test(location.protocol)) return; localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_langue', lg); }, lg);
      await q.goto(URL_JEU);
      await q.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await q.evaluate(() => ouvrirConfidentialite());
      await q.waitForSelector('#confidentialiteVeil .conf-l', { timeout: 5000 });
      const lignes = await q.evaluate(() => [...document.querySelectorAll('#confidentialiteVeil .conf-l')].map(x => x.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()));
      const ici = page[lg] || [];
      lignes.forEach(l => { if (!ici.includes(net(l))) manque.push(lg + ' « ' + l.slice(0, 60) + ' »'); });
      if (lignes.length < 8) manque.push(lg + ' : ' + lignes.length + ' lignes seulement dans le jeu');
      await c.close();
    }
    dit('2. chaque ligne de la Confidentialité du jeu s\'y lit mot pour mot, en français, en anglais et en espagnol', !manque.length, manque.slice(0, 4).join(' | '));

    /* 5 : le jeu installé laisse passer la page */
    {
      const c = await nav.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });
      const q = await c.newPage();
      q.on('pageerror', e => errs.push('sw : ' + e.message));
      await q.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await q.route('**/pagead2.googlesyndication.com/**', r => r.abort());
      await q.addInitScript(() => { if (!/^http/.test(location.protocol)) return; localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await q.goto(URL_JEU);
      const sw = await q.evaluate(async () => { try { await Promise.race([navigator.serviceWorker.ready, new Promise((_, n) => setTimeout(() => n(new Error('pas prêt')), 15000))]); return true; } catch (e) { return String(e.message); } });
      await q.reload(); await q.waitForTimeout(800);
      const pilote = await q.evaluate(() => !!navigator.serviceWorker.controller);
      await q.goto(URL_PAGE); await q.waitForTimeout(600);
      const r5 = await q.evaluate(() => ({ titre: document.title, jeu: typeof window.state !== 'undefined' }));
      dit('5. le jeu installé (son service worker aux commandes) laisse passer la page : c\'est elle qui s\'ouvre, pas le jeu',
        sw === true && pilote && r5.titre === 'Yada — Confidentialité et mentions légales' && !r5.jeu, JSON.stringify({ sw, pilote, ...r5 }));
      await c.close();
    }
  } catch (e) { ko++; console.log('  KO  le banc a échoué : ' + e.message); }
  dit('6. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la Confidentialité et les mentions, en ligne, mot pour mot comme dans le jeu');
  process.exit(ko ? 1 : 0);
})();
