/* ====== BANC « MÊME NOM, MÊME BOUTON » (v322) ======
   « Les boutons Fermer doivent être tous les mêmes. J'aime beaucoup celui du
     badge débloqué : il doit être cohérent avec tous les autres boutons
     Fermer du jeu. Et si c'est le même nom, il faut que ce soit le même
     bouton, pour une cohérence globale. »
   Ce banc lit le CODE (tous les boutons qui portent un même mot) et regarde
   l'ÉCRAN (les styles calculés, côte à côte) :
     1. tout bouton « Fermer » est le bouton du badge (modal-btn ok), et celui
        du signalement a, à l'écran, sa couleur, sa hauteur, son coin et sa
        police ;
     2. « Fermer » ne veut dire qu'une chose : la décision de modération qui
        ferme un groupe s'écrit « Fermer le groupe » ;
     3. « Annuler » est toujours le bouton crème : plus aucune confirmation ne
        le peint en corail, la recherche d'adversaire non plus ; une SORTIE
        dit « Rester » (corail) / « Quitter » (blanc), un groupe aussi ;
     4. la pilule « Rejoindre » a le corail en dégradé des grands boutons ;
     5. la coche d'un objectif débloqué est un rond posé sur le coin, et le
        dessin garde toute sa taille ;
     6. « Changer la photo » / « Retirer la photo » : le même menu pour le
        profil que pour un groupe (le petit appareil photo sur le visage) ;
        toucher le visage, lui, l'ouvre toujours en grand ;
     7. aucune erreur.
   Usage : node banc-essai/meme-bouton.js [url] */
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || process.env.URL || 'http://127.0.0.1:8099/index.html';
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let ko = 0;
const dit = (q, b, d) => { console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '  (' + String(d).slice(0, 260) + ')' : '')); if (!b) ko++; };

/* ---- le code ---- */
const fermers = [...SRC.matchAll(/<button class="([^"]*)"[^>]*>\$\{T\("Fermer"\)\}<\/button>/g)].map(m => m[1]);
dit('tous les boutons « Fermer » du code sont le bouton du badge (modal-btn ok)', fermers.length >= 2 && fermers.every(c => /\bmodal-btn\b/.test(c) && /\bok\b/.test(c)), JSON.stringify(fermers));
dit('la décision de modération s\'écrit « Fermer le groupe »', /okLabel:decision === "bannir" \? T\("Bannir"\) : T\("Fermer le groupe"\)/.test(SRC));
const dangers = [...SRC.matchAll(/okLabel:[^\n]*cancelLabel:T\("([^"]+)"\)[^\n]*danger:true/g)].map(m => m[1]);
dit('danger:true ne sert plus qu\'aux sorties (« Rester »)', dangers.length >= 3 && dangers.every(l => l === 'Rester'), JSON.stringify(dangers));
dit('le départ d\'un groupe est une sortie : « Rester » / « Quitter »', /okLabel:T\("Quitter"\), cancelLabel:T\("Rester"\), danger:true,\s*onOk:\(\)=>\{ \(async \(\)=>\{\s*const r = await appelGroupe\("quitter_groupe"/.test(SRC));

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_progress', JSON.stringify({ books: { 'Genèse': 14 }, totalCorrect: 12, bestStreak: 3, flawless: 0, ach: { pas: 1 } }));
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.waitForTimeout(1200);
    const style = (sel) => p.evaluate((sel) => { const b = document.querySelector(sel); if (!b) return null; const c = getComputedStyle(b), r = b.getBoundingClientRect();
      return { fond: c.backgroundColor, image: c.backgroundImage.slice(0, 60), texte: c.color, police: c.fontSize + ' ' + c.fontWeight, coin: c.borderTopLeftRadius, h: Math.round(r.height), w: Math.round(r.width) }; }, sel);

    /* 5. la coche du badge débloqué */
    await p.evaluate(() => openAchInfo('pas'));
    await p.waitForSelector('.modal-card.ach-info .ach-check');
    await p.waitForTimeout(900);
    const coche = await p.evaluate(() => {
      const t = document.querySelector('.modal-card.ach-info .ach-tile'), d = t.querySelector(':scope > svg'), c = t.querySelector('.ach-check');
      const rt = t.getBoundingClientRect(), rd = d.getBoundingClientRect(), rc = c.getBoundingClientRect();
      return { pos: getComputedStyle(c).position, dessin: Math.round(rd.width), centre: Math.round((rd.left + rd.width / 2) - (rt.left + rt.width / 2)),
               coin: rc.right > rt.right - 2 && rc.bottom > rt.bottom - 2, rond: getComputedStyle(c).borderTopLeftRadius };
    });
    dit('la coche d\'un objectif débloqué est un rond posé sur le coin', coche.pos === 'absolute' && coche.coin && coche.rond === '50%', JSON.stringify(coche));
    dit('… et le dessin garde sa taille, au centre de la tuile', coche.dessin >= 29 && Math.abs(coche.centre) <= 1, JSON.stringify(coche));
    const badge = await style('.modal-card.ach-info .modal-btn.ok');

    /* 1. « Fermer » du signalement = « Fermer » du badge */
    await p.evaluate(() => closeModal());
    await p.waitForTimeout(500);
    await p.evaluate(() => { ouvrirFeuilleGroupe('grpSignalerVeil', 'Signaler ce message', ICONS.drapeau,
      `<div class="grp-merci"><span class="gi-ico vert">${ICONS.coche}</span><b>Merci.</b><p>…</p></div><button class="modal-btn ok grp-fermer">Fermer</button>`); });
    await p.waitForTimeout(1000);
    const sig = await style('#grpSignalerVeil .modal-btn.ok.grp-fermer');
    const pareil = badge && sig && badge.fond === sig.fond && badge.texte === sig.texte && badge.police === sig.police && badge.coin === sig.coin && Math.abs(badge.h - sig.h) <= 1 && badge.image === sig.image;
    dit('« Fermer » du signalement a la couleur, la hauteur, le coin et la police de celui du badge', pareil, JSON.stringify({ badge, sig }));
    await p.evaluate(() => fermerFeuilleGroupe('grpSignalerVeil'));
    await p.waitForTimeout(600);

    /* 3. « Annuler » : crème dans une confirmation ; « Rester » corail dans une sortie */
    const fenetre = async (opts) => { await p.evaluate((o) => showModal(Object.assign({ title: 'Essai', message: '…', onOk: () => true }, o)), opts); await p.waitForTimeout(700);
      const r = { annuler: await style('#modalCancel'), ok: await style('#modalOk') }; await p.evaluate(() => closeModal()); await p.waitForTimeout(400); return r; };
    const simple = await fenetre({ okLabel: 'OK', cancelLabel: 'Annuler' });
    const bloquer = await fenetre({ okLabel: 'Bloquer', cancelLabel: 'Annuler' });
    const sortie = await fenetre({ okLabel: 'Quitter', cancelLabel: 'Rester', danger: true });
    const corail = (s) => /rgba?\((2[2-4]\d), (5\d|6\d|7\d), (2\d|3\d|4\d)/.test(s.fond + ' ' + s.image);
    dit('« Annuler » d\'une confirmation est le même bouton crème qu\'ailleurs', JSON.stringify(bloquer.annuler) === JSON.stringify(simple.annuler) && !corail(bloquer.annuler), JSON.stringify(bloquer.annuler));
    dit('… et l\'action confirmée est le bouton corail', JSON.stringify(bloquer.ok) === JSON.stringify(simple.ok), JSON.stringify(bloquer.ok));
    dit('une sortie garde « Rester » en corail et « Quitter » en clair', corail(sortie.annuler) && !corail(sortie.ok), JSON.stringify(sortie));

    /* 3 bis. « Annuler » de la recherche d'adversaire */
    const recherche = await p.evaluate(() => { const d = document.createElement('div'); d.className = 'searching-card'; d.innerHTML = '<button class="btn-ghost btn-cancel">Annuler</button>';
      document.querySelector('#app > .screen').appendChild(d); const c = getComputedStyle(d.firstChild); const r = { tint: c.getPropertyValue('--glass-tint').trim(), texte: c.color }; d.remove(); return r; });
    dit('« Annuler » de la recherche n\'est plus en corail', !/236, ?60, ?26/.test(recherche.tint) && recherche.texte !== 'rgb(255, 255, 255)', JSON.stringify(recherche));

    /* 4. la pilule « Rejoindre » */
    const pilule = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = '<button class="grp-pill">Rejoindre</button><button class="grp-pill calme">Ouvrir</button>';
      document.body.appendChild(d); const a = getComputedStyle(d.children[0]).backgroundImage, b = getComputedStyle(d.children[1]).backgroundImage; d.remove(); return { a, b }; });
    dit('la pilule « Rejoindre » a le dégradé corail des grands boutons', /linear-gradient/.test(pilule.a) && /251, 106, 69/.test(pilule.a) && pilule.b === 'none', JSON.stringify(pilule).slice(0, 200));

    /* 6. la photo du profil : le petit appareil, et le menu des groupes */
    await p.evaluate(() => { state.screen = 'profile'; render(); });
    await p.waitForTimeout(900);
    const visage = await p.evaluate(() => { const b = document.querySelector('.avatar-tap'); const i = b && b.querySelector('.gpb-ico'); return { badge: !!i, liens: !!document.querySelector('.photo-lien, #photoLiens') }; });
    dit('le visage du profil porte le petit appareil photo, plus de liens dessous', visage.badge && !visage.liens, JSON.stringify(visage));
    await p.evaluate(() => { window.__ph = 0; window.__ouvrirPhoto = window.ouvrirPhoto; window.ouvrirPhoto = () => { window.__ph++; }; });
    await p.tap('.avatar-tap');
    await p.waitForTimeout(400);
    dit('sans photo : toucher le visage ouvre la photothèque', await p.evaluate(() => window.__ph === 1 && !document.getElementById('profilPhotoVeil')));
    await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#C8874A'; g.fillRect(0, 0, 64, 64);
      localStorage.setItem('bt_photo', c.toDataURL('image/jpeg', 0.8)); photoCache = localStorage.getItem('bt_photo'); majPhotoRacine(); majAvatarsPhoto(); window.ouvrirPhoto = window.__ouvrirPhoto; });
    await p.waitForTimeout(300);
    await p.tap('.avatar-tap .gpb-ico');
    await p.waitForSelector('#profilPhotoVeil .grp-act-l');
    await p.waitForTimeout(500);
    const menu = await p.evaluate(() => { const v = document.getElementById('profilPhotoVeil'); return { menu: v.classList.contains('menu'), lignes: [...v.querySelectorAll('.grp-act-l')].map(x => x.textContent.trim() + (x.classList.contains('danger') ? ' (rouge)' : '')) }; });
    dit('avec une photo : le même menu qu\'un groupe, « Changer la photo » et « Retirer la photo »', menu.menu && JSON.stringify(menu.lignes) === '["Changer la photo","Retirer la photo (rouge)"]', JSON.stringify(menu));
    await p.evaluate(() => fermerFeuilleGroupe('profilPhotoVeil'));
    await p.waitForTimeout(600);
    await p.tap('.avatar-tap .avatar');
    await p.waitForTimeout(600);
    dit('… et toucher le visage l\'ouvre toujours en grand', await p.evaluate(() => !!document.getElementById('photoGrandVeil') && !document.getElementById('profilPhotoVeil')));
    dit('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
    await ctx.close();
  } catch (e) { console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++; }
  finally { await nav.close().catch(() => {}); }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — même nom, même bouton');
  process.exit(ko ? 1 : 0);
})();
