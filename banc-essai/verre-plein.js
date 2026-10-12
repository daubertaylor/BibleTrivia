/* ====== UNE SURFACE PLEINE N'A PAS DE DÉCOR À MONTRER (v319) ======
   « Sur Android, lorsque j'ajoute ou que je retire des joueurs, ça ne fait
     pas comme sur iOS, et en plus ça clignote bizarrement » ; « lorsque je
     change les modes, ça ne fait pas tout clean, ça clignote à certains
     endroits. » (photos de Taylor, le Mode Groupe sur son Android)
   L'écran du Mode Groupe portait dix-sept couches de verre de la taille de
   toute la scène floutée (538 x 1664 px sur un téléphone de 384 px), dont dix
   pour des surfaces PLEINES — neuf puces et « Commencer » — où la photo ne se
   voyait jamais sous une teinte opaque. Les choisir repeignait ces couches
   entières ; ajouter un joueur les faisait recaler à chaque image.
   Une surface pleine porte maintenant une couche pleine : la teinte, à sa
   taille, sans photo ni calage. Ce banc vérifie, en Android simulé :
     1. sur le Mode Groupe, chaque surface à teinte OPAQUE porte une couche
        pleine, et chaque surface à teinte TRANSLUCIDE garde sa photo calée —
        aucune confusion dans un sens ni dans l'autre ;
     2. une couche pleine a la taille de sa surface (un pixel de plus tout
        autour), aucune n'a la taille de la scène ;
     3. ajouter puis retirer un joueur : pas une seule écriture sur une couche
        pleine pendant tout le mouvement, alors que les cartes, elles, sont
        recalées ;
     4. choisir une durée : la puce prise devient corail et celle qu'on quitte
        crème, mesuré au pixel au centre de chaque puce, et toutes deux
        restent pleines ;
     5. en partie, les réponses (juste, fausse, estompées) restent pleines ;
     6. les grandes couches de l'écran du Mode Groupe : sept au plus (celles
        des surfaces de verre), contre dix-sept sur la v318 ;
     7. sur dix écrans (accueil, Solo, partie, réponse, fin Solo et Groupe,
        salon en ligne, Progression, Profil, À revoir), TOUTE couche pleine
        est sous une teinte opaque : le moteur ne relit plus les teintes (voir
        GLASS_PLEIN), c'est ce banc qui le fait à sa place ;
     8. aucune erreur.
   Usage : node banc-essai/verre-plein.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const AND = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

/* L'inventaire : pour chaque surface de verre, sa teinte et sa couche. */
const inventaire = () => [...document.querySelectorAll('.has-gs')].map(el => {
  const gs = el.querySelector(':scope > .gs');
  const v = getComputedStyle(el).getPropertyValue('--glass-tint').trim();
  const m = /^rgba?\(([^)]*)\)$/i.exec(v); let a = 0;
  if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean); a = p.length < 4 ? 1 : parseFloat(p[3]); }
  const r = el.getBoundingClientRect(), g = gs ? gs.getBoundingClientRect() : null;
  return { nom: el.className.split(' ').filter(c => c && c !== 'has-gs')[0] || el.tagName, opaque: a >= 0.999,
    plein: !!(gs && gs.classList.contains('gs-plein')), transfo: gs ? gs.style.transform : '',
    dw: g ? +(g.width - r.width).toFixed(2) : null, dh: g ? +(g.height - r.height).toFixed(2) : null, gw: g ? Math.round(g.width) : 0 };
});

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 384, height: 832 }, deviceScaleFactor: 2.8125, userAgent: AND, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      /* le plein écran n'est pas le sujet : il ne doit rien déplacer pendant la mesure */
      Element.prototype.requestFullscreen = function () { return Promise.reject(new Error('hors sujet')); };
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate(() => { state.teams = [{ name: 'Joueur 1' }, { name: 'Joueur 2' }, { name: 'Joueur 3' }]; state.lengthKey = 'normale'; selectMode('group'); });
    await p.waitForTimeout(1800);
    /* ---- 1-2 ---- */
    const inv = await p.evaluate(inventaire);
    const malPleins = inv.filter(s => s.plein !== s.opaque);
    const pleins = inv.filter(s => s.plein), photos = inv.filter(s => !s.plein);
    dit('1. teinte opaque -> couche pleine, teinte translucide -> photo calée', inv.length > 10 && pleins.length >= 10 && malPleins.length === 0 && photos.every(s => /translate3d/.test(s.transfo)),
      pleins.length + ' pleines (' + [...new Set(pleins.map(s => s.nom))].join(', ') + '), ' + photos.length + ' en verre (' + [...new Set(photos.map(s => s.nom))].join(', ') + ')'
      + (malPleins.length ? ' — MAL RANGÉES : ' + malPleins.map(s => s.nom + (s.opaque ? ' opaque' : ' translucide')).join(', ') : ''));
    const tailles = pleins.filter(s => Math.abs(s.dw - 2) > 0.05 || Math.abs(s.dh - 2) > 0.05 || s.transfo);
    dit('2. une couche pleine a la taille de sa surface (+1 px tout autour), sans calage', pleins.length > 0 && tailles.length === 0,
      !pleins.length ? 'aucune couche pleine' : tailles.length ? tailles.map(s => s.nom + ' ' + s.dw + 'x' + s.dh + ' ' + s.transfo).join(' | ') : 'écart ' + pleins[0].dw + ' x ' + pleins[0].dh + ' px, la plus large ' + Math.max(...pleins.map(s => s.gw)) + ' px');
    /* ---- 3 ---- */
    const ecr = await p.evaluate(() => new Promise(res => {
      let surPleines = 0, surVerre = 0;
      const obs = new MutationObserver(l => l.forEach(m => { if (m.target.classList.contains('gs-plein')) surPleines++; else surVerre++; }));
      document.querySelectorAll('.gs').forEach(g => obs.observe(g, { attributes: true, attributeFilter: ['style'] }));
      addTeam();
      setTimeout(() => removeTeam(document.querySelectorAll('#teamCard .team-remove')[3]), 900);
      setTimeout(() => { obs.disconnect(); res({ surPleines, surVerre, joueurs: state.teams.length }); }, 2000);
    }));
    dit('3. ajouter puis retirer un joueur : aucune écriture sur une couche pleine, les cartes recalées', ecr.surPleines === 0 && ecr.surVerre > 0 && ecr.joueurs === 3,
      'couches pleines ' + ecr.surPleines + ' écriture(s), couches de verre ' + ecr.surVerre + ', joueurs ' + ecr.joueurs);
    /* ---- 4 ---- */
    const cdp = await ctx.newCDPSession(p);
    const pos = await p.evaluate(() => { const c = document.querySelector('[data-group="len"][data-k="longue"]').getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.top + c.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pos.x, y: pos.y }] });
    await p.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(1200);
    const puces = await p.evaluate(() => [...document.querySelectorAll('[data-group="len"]')].map(c => { const r = c.getBoundingClientRect(); const gs = c.querySelector(':scope > .gs');
      return { k: c.dataset.k, actif: c.classList.contains('active'), plein: !!(gs && gs.classList.contains('gs-plein')), x: r.left + 10, y: r.top + r.height / 2 }; }));
    /* Les pixels sont lus par le navigateur lui-même (voir coins.js) : pas de
       décodeur PNG à ajouter pour trois points. */
    const shot = (await p.screenshot()).toString('base64');
    const couleurs = await p.evaluate(([b64, pts]) => new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const k = img.width / innerWidth;
        res(pts.map(([x, y]) => [...g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data].slice(0, 3)));
      };
      img.src = 'data:image/png;base64,' + b64;
    }), [shot, puces.map(c => [c.x, c.y])]);
    const proche = (c, t) => c && Math.abs(c[0] - t[0]) <= 3 && Math.abs(c[1] - t[1]) <= 3 && Math.abs(c[2] - t[2]) <= 3;
    const bon = puces.every((c, i) => c.plein && (c.actif === (c.k === 'longue')) && (!couleurs || proche(couleurs[i], c.actif ? [236, 60, 26] : [252, 248, 241])));
    dit('4. choisir « Longue » : corail pour elle, crème pour les autres, toutes pleines', bon,
      puces.map((c, i) => c.k + (c.actif ? '*' : '') + (c.plein ? '' : ' (PAS PLEINE)') + (couleurs ? ' rgb(' + couleurs[i].join(',') + ')' : '')).join('  '));
    /* ---- 5 ---- */
    await p.evaluate(() => { state.mode = 'solo'; startGame(); state.screen = 'play'; render(); });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const b = document.querySelectorAll('.option-btn'); if (b[0]) b[0].click(); });
    await p.waitForTimeout(1500);
    const rep = await p.evaluate(() => [...document.querySelectorAll('.option-btn')].map(b => { const gs = b.querySelector(':scope > .gs'); return { cls: b.className.replace(/has-gs|onde-part|onde/g, '').trim(), plein: !!(gs && gs.classList.contains('gs-plein')) }; }));
    dit('5. en partie, les réponses (juste, fausse, estompées) restent pleines', rep.length === 4 && rep.every(r => r.plein) && rep.some(r => /correct/.test(r.cls)),
      rep.map(r => r.cls.replace('option-btn', '').trim() || 'neutre').join(', '));
    /* ---- 6 ---- */
    await p.evaluate(() => { state.mode = 'group'; state.teams = [{ name: 'Joueur 1' }, { name: 'Joueur 2' }, { name: 'Joueur 3' }]; state.screen = 'setup'; render(); });
    await p.waitForTimeout(1500);
    let couches = [];
    cdp.on('LayerTree.layerTreeDidChange', e => { if (e.layers) couches = e.layers; });
    await cdp.send('LayerTree.enable');
    await p.evaluate(() => { const a = document.getElementById('app'); a.scrollTop = 1; a.scrollTop = 0; });
    await p.waitForTimeout(800);
    const grandes = couches.filter(l => l.drawsContent && l.width * l.height > 400000).length;
    dit('6. sur le Mode Groupe, sept grandes couches au plus (dix-sept sur la v318)', couches.length > 0 && grandes <= 7, grandes + ' grande(s) couche(s) sur ' + couches.filter(l => l.drawsContent).length);
    /* ---- 7 ---- */
    const ECRANS = [
      ['accueil', () => { state.screen = 'mode'; render(); }],
      ['Solo', () => { state.mode = 'solo'; state.screen = 'setup'; render(); }],
      ['partie', () => { state.mode = 'solo'; startGame(); state.screen = 'play'; render(); }],
      ['réponse', () => { const b = document.querySelectorAll('.option-btn'); if (b[1]) b[1].click(); }],
      ['fin Solo', () => { state.screen = 'end'; state.soloScore = 80; state.soloCorrect = 3; state.soloBestStreak = 2;
        state.soloMissed = [{ q: 'a', correct: 'b', chosen: 'c', fact: 'd' }]; render(); }],
      ['fin Groupe', () => { state.mode = 'group'; state.teams = [{ name: 'Ana' }, { name: 'Léo' }, { name: 'Taylor' }]; startGame(); state.scores = [40, 80, 20]; state.screen = 'end'; render(); }],
      ['salon', () => { net.code = 'CHNW'; net.isHost = true; net.joueurs = { j0: { id: 'j0', name: 'Stany', color: '#2FA36B', score: 0, idx: 0, vu: Date.now() } }; majAdversaire(); state.screen = 'online-room'; render(); }],
      ['Progression', () => { state.screen = 'parcours'; render(); }],
      ['Profil', () => { state.screen = 'profile'; render(); }],
      ['À revoir', () => { state.screen = 'revoir'; render(); }],
    ];
    const faux = [];
    let vues = 0;
    for (const [nom, aller] of ECRANS) {
      try { await p.evaluate(`(${aller.toString()})()`); } catch (e) { faux.push(nom + ' : ' + e.message.slice(0, 60)); continue; }
      await p.waitForTimeout(1300);
      const l = await p.evaluate(inventaire);
      l.filter(x => x.plein).forEach(x => { vues++; if (!x.opaque) faux.push(nom + ' : ' + x.nom + ' plein sous une teinte translucide'); });
    }
    dit('7. sur dix écrans, toute couche pleine est sous une teinte opaque', faux.length === 0 && vues > 20, vues + ' couches pleines relues' + (faux.length ? ' — ' + faux.slice(0, 4).join(' | ') : ''));
    await ctx.close();
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  }
  dit('8. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — les surfaces pleines ne portent plus de décor invisible');
  process.exit(ko ? 1 : 0);
})();
