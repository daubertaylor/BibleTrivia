/* ====== BANC « LA PHOTO EN GRAND : CARRÉE, SUR UN FOND UNI » (v343) ======
   « Lorsque l'on clique pour afficher la photo, je veux que la photo
     s'affiche au carré : une véritable photo au carré, pas une petite
     bulle. » « Je veux que l'arrière-plan, le haut et le bas de l'image
     soient blancs, ou d'une couleur du jeu. Pas de décor derrière : un fond
     uni, très propre, comme la DA du jeu. »
   iPhone et Android, sa photo depuis le Profil, puis la photo d'un groupe :
     1. elle s'ouvre comme une PAGE — l'arrivée des Réglages (pageIn) ;
     2. la photo est CARRÉE (largeur = hauteur), aux coins des cartes (22 px),
        jamais ronde ;
     3. autour d'elle, le fond est UNI : le crème des pages, le même à gauche,
        à droite, au-dessus et au-dessous (aucun décor ne passe) ;
     4. l'en-tête dit le nom, avec le retour ;
     5. toucher n'importe où la referme (elle part comme une page), et elle
        se rouvre tout de suite ;
     6. la photo d'un groupe : la même page, carrée elle aussi ;
     7. aucune erreur.
   Usage : node banc-essai/photo-carree.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const SC = require('./brouillon.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 300) + ')' : '')); };
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  for (const [tel, ua, W, H, dpr] of [['iPhone', IOS, 393, 852, 3], ['Android', AND, 412, 915, 2.625]]) {
    const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.evaluate(() => {
      const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
      g.fillStyle = '#2a5bd7'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#f2a33a'; g.fillRect(0, 0, 512, 80); g.fillRect(0, 432, 512, 80);
      enregistrerPhoto(c.toDataURL('image/jpeg', 0.9));
      state.screen = 'profile'; render();
    });
    await p.waitForTimeout(1000);
    const debut = await p.evaluate(() => { const a = document.querySelector('[data-avatar-preview] .avatar'); if (!a) return null; a.click();
      const v = document.getElementById('photoGrandVeil'); const an = v ? v.getAnimations().map(x => x.animationName) : [];
      return { page: !!v && v.classList.contains('page'), anim: an }; });
    dit('1. ' + tel + ' : sa photo s\'ouvre comme une page, avec l\'arrivée des Réglages', debut && debut.page && debut.anim.includes('pageIn'), JSON.stringify(debut));
    await p.waitForTimeout(900);
    const m = await p.evaluate(() => { const v = document.getElementById('photoGrandVeil'); const im = v.querySelector('.pv-img'); const r = im.getBoundingClientRect();
      return { w: r.width, h: r.height, x: r.left, y: r.top, rayon: getComputedStyle(im).borderTopLeftRadius, nom: (v.querySelector('.pv-nom') || {}).textContent,
        retour: !!v.querySelector('.page-tete .sheet-grab'), fond: getComputedStyle(v).backgroundColor }; });
    dit('2. ' + tel + ' : la photo est CARRÉE, aux coins des cartes', Math.abs(m.w - m.h) <= 1 && m.w > W * 0.8 && m.rayon === '22px', JSON.stringify(m));
    const shot = await p.screenshot();
    const { execFileSync } = require('child_process');
    require('fs').writeFileSync(SC + '/photo-carree-' + tel + '.png', shot);
    const py = `
import sys, json
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); px = im.load(); k = ${dpr}
m = json.loads(sys.argv[2])
pts = [(m['x'] - 8, m['y'] + m['h'] / 2), (m['x'] + m['w'] + 8, m['y'] + m['h'] / 2), (m['x'] + m['w'] / 2, m['y'] - 14), (m['x'] + m['w'] / 2, m['y'] + m['h'] + 30), (m['x'] + m['w'] / 2, m['y'] + m['h'] + 160)]
c = [px[int(x * k), int(y * k)] for x, y in pts]
print(json.dumps(c))`;
    require('fs').writeFileSync(SC + '/photo-carree.py', py);
    const couleurs = JSON.parse(execFileSync('python3', [SC + '/photo-carree.py', SC + '/photo-carree-' + tel + '.png', JSON.stringify(m)], { encoding: 'utf8' }));
    const uni = couleurs.every(c => c.every((v, i) => Math.abs(v - couleurs[0][i]) <= 2)) && couleurs[0][0] > 225 && couleurs[0][1] > 220;
    dit('3. ' + tel + ' : autour, un fond UNI, le crème des pages (aucun décor)', uni, JSON.stringify(couleurs) + ' · ' + m.fond);
    dit('4. ' + tel + ' : l\'en-tête dit le nom, avec le retour', m.nom === 'Taylor' && m.retour, m.nom);
    const f = await p.evaluate(async () => { const v = document.getElementById('photoGrandVeil'); v.querySelector('.pv-img').click(); const part = v.classList.contains('closing');
      await new Promise(r => setTimeout(r, 60)); document.querySelector('[data-avatar-preview] .avatar').click(); const n = document.getElementById('photoGrandVeil');
      return { part, rouvre: !!n && !n.classList.contains('closing') && n !== v }; });
    dit('5. ' + tel + ' : toucher n\'importe où la referme comme une page, et elle se rouvre aussitôt', f.part && f.rouvre, JSON.stringify(f));
    await p.evaluate(() => fermerPhotoGrand()); await p.waitForTimeout(700);
    /* La photo d'un groupe */
    const g = await p.evaluate(async () => {
      /* la photo d'un groupe, telle que le serveur la rend (une adresse) */
      photosSrv['g:g-1'] = { url: localStorage.getItem('bt_photo') };
      grp.liste = [{ id: 'g-1', nom: 'Les amis', teinte: 2 }];
      ouvrirPhotoGrand('g:g-1');
      await new Promise(r => setTimeout(r, 900));
      const v = document.getElementById('photoGrandVeil'); if (!v) return null; const im = v.querySelector('.pv-img'); const r = im.getBoundingClientRect();
      return { w: r.width, h: r.height, rayon: getComputedStyle(im).borderTopLeftRadius, nom: (v.querySelector('.pv-nom') || {}).textContent, groupe: im.classList.contains('pv-groupe') };
    });
    dit('6. ' + tel + ' : la photo d\'un groupe, la même page, carrée', g && Math.abs(g.w - g.h) <= 1 && g.rayon === '22px' && g.nom === 'Les amis' && g.groupe, JSON.stringify(g));
    await ctx.close();
  }
  dit('7. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la photo s\'ouvre en grand, carrée, sur le fond uni des pages');
  process.exit(ko ? 1 : 0);
})();
