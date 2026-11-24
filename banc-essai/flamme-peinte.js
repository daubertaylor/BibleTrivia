/* ====== LA FLAMME DE PROGRESSION EST PEINTE AVEC SA CARTE (v379) ======
   « Lorsque j'entre dans le mode Progression, il y a l'icône de la flamme
     qui clignote au moment de l'ouverture… qu'elle ne s'affiche pas en
     retard. »
   Allumée, la pastille était une surface de verre posée dans une autre :
   sa propre couche, et sous elle une couche de décor de la taille du décor
   entier, sous une teinte opaque. Progression arrive par la droite et la
   flamme est au bout à droite de sa carte : sur iPhone, ces couches se
   garnissaient en plein glissement, après la carte. Chromium garnit tout
   d'avance — le retard ne se filme pas ici : ce banc vérifie donc ce qui
   l'empêche.
     1. allumée : plus de couche de verre (ni .gs, ni rebord, ni has-gs), et
        AUCUNE couche graphique à elle (arbre des couches du compositeur) —
        elle est peinte dans la couche de sa carte ;
     2. elle garde son aspect : l'orange du feu, le relief commun, et ses
        pixels sont bien orange au repos ;
     3. les jours (or, gel) de la carte n'ont plus de flou d'arrière-plan
        (une couche chacun, sous un fond opaque) ;
     4. elle s'enfonce toujours sous le doigt, et la toucher ouvre son
        histoire ;
     5. éteinte (translucide), elle reste du verre ;
     6. aucune erreur.
   Usage : node banc-essai/flamme-peinte.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };
const attends = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const ouvre = async (serie) => {
    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    await ctx.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await ctx.route('**/*.supabase.co/**', r => r.abort());
    await ctx.route('**/pagead2.googlesyndication.com/**', r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_settings', JSON.stringify({ sfx: false, music: false })); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 30000 });
    await p.evaluate((n) => {
      const d = loadDaily(); d.streak = n; d.best = Math.max(n, 5); d.last = n ? dayKey(0) : null; d.geles = n ? [] : d.geles || [];
      saveDaily(d); render();
    }, serie);
    await attends(900);
    const b = await p.locator('.parcours-card').boundingBox();
    await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await attends(1500);
    return { ctx, p };
  };

  /* --- allumée --- */
  {
    const { ctx, p } = await ouvre(5);
    const e = await p.evaluate(() => {
      const f = document.querySelector('#app > .screen.parcours-ecran .parcours-sum .sem-flamme');
      if (!f) return null;
      const cs = getComputedStyle(f), feu = getComputedStyle(document.documentElement).getPropertyValue('--feu').trim();
      const tmp = document.createElement('i'); tmp.style.color = feu; document.body.appendChild(tmp); const feuRgb = getComputedStyle(tmp).color; tmp.remove();
      const rel = document.createElement('i'); rel.style.boxShadow = 'var(--relief)'; document.body.appendChild(rel); const relief = getComputedStyle(rel).boxShadow; rel.remove();
      const jours = [...document.querySelectorAll('.parcours-sum .sj')];
      const r = f.getBoundingClientRect();
      return { cls: f.className, gs: !!f.querySelector(':scope > .gs'), rim: !!f.querySelector(':scope > .glass-rim'), bg: cs.backgroundColor, bi: cs.backgroundImage, feuRgb,
               bs: cs.boxShadow, relief, tr: cs.transform, n: (f.querySelector('b:not(.glass-rim)') || {}).textContent,
               jours: jours.length, joursFlous: jours.filter(j => { const c = getComputedStyle(j); return (c.backdropFilter && c.backdropFilter !== 'none') || (c.webkitBackdropFilter && c.webkitBackdropFilter !== 'none'); }).length,
               faits: jours.filter(j => j.classList.contains('fait')).length, box: [r.left, r.top, r.width, r.height] };
    });
    dit('Progression montre la pastille allumée', !!e && e.n === '5', e && ('« ' + e.n + ' »'));
    if (e) {
      dit('1. plus de verre sur la pastille allumée (ni .gs, ni rebord, ni has-gs)', !e.gs && !e.rim && !/\bhas-gs\b/.test(e.cls), e.cls);
      dit('2. l\'orange du feu, peint par la pastille elle-même', e.bg === e.feuRgb && e.bi === 'none', e.bg + ' / ' + e.feuRgb);
      dit('2. le relief commun, et rien d\'autre (aucun filet)', e.bs === e.relief, e.bs);
      dit('1. pas de transformation au repos (aucune couche forcée)', e.tr === 'none', e.tr);
      dit('3. les jours de la carte n\'ont plus de flou d\'arrière-plan', e.jours === 7 && e.joursFlous === 0, e.joursFlous + ' flou(s) sur ' + e.jours + ', ' + e.faits + ' fait(s)');
      /* L'arbre des couches : aucune couche pour la pastille, ni pour ce qu'elle porte, ni pour les jours. */
      const cdp = await ctx.newCDPSession(p);
      await cdp.send('DOM.enable');
      const arbre = new Promise(res => cdp.once('LayerTree.layerTreeDidChange', ev => res(ev.layers || [])));
      await cdp.send('LayerTree.enable');
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const couches = await Promise.race([arbre, attends(3000).then(() => null)]);
      const doc = await cdp.send('DOM.getDocument', { depth: -1 });
      const ids = async (sel) => { const q = await cdp.send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: sel }); const out = []; for (const id of q.nodeIds) { const d = await cdp.send('DOM.describeNode', { nodeId: id }); out.push(d.node.backendNodeId); } return out; };
      const pastille = await ids('.parcours-ecran .parcours-sum .sem-flamme, .parcours-ecran .parcours-sum .sem-flamme *');
      const jours = await ids('.parcours-ecran .parcours-sum .sj');
      const carte = await ids('.parcours-ecran .parcours-sum');
      if (!couches) dit('1. arbre des couches lu', false, 'pas de réponse du compositeur');
      else {
        const de = (l) => couches.filter(c => c.backendNodeId && l.indexOf(c.backendNodeId) >= 0).length;
        dit('1. la pastille n\'a aucune couche à elle (peinte dans celle de sa carte)', de(pastille) === 0, de(pastille) + ' couche(s) ; la carte en a ' + de(carte));
        dit('3. les jours n\'ont aucune couche à eux', de(jours) === 0, de(jours) + ' couche(s)');
      }
      /* Ses pixels : orange au repos, à gauche de l'icône (là où rien n'est écrit). */
      const png = await p.screenshot({ clip: { x: Math.round(e.box[0] + 6), y: Math.round(e.box[1] + e.box[3] / 2 - 2), width: 4, height: 4 } });
      const px = await p.evaluate(async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return [...x.getImageData(1, 1, 1, 1).data].slice(0, 3); }, png.toString('base64'));
      dit('2. ses pixels sont l\'orange du feu', Math.abs(px[0] - 237) <= 3 && Math.abs(px[1] - 111) <= 3 && Math.abs(px[2] - 31) <= 3, px.join(','));
      /* L'appui : elle s'enfonce, puis elle ouvre son histoire. */
      const cx = e.box[0] + e.box[2] / 2, cy = e.box[1] + e.box[3] / 2;
      await p.mouse.move(cx, cy); await p.mouse.down(); await attends(160);
      const enfonce = await p.evaluate(() => getComputedStyle(document.querySelector('.parcours-ecran .sem-flamme')).transform);
      const m = /matrix\(([^,]+)/.exec(enfonce); const ech = m ? parseFloat(m[1]) : 1;
      dit('4. elle s\'enfonce toujours sous le doigt', ech < 0.99, enfonce);
      await p.mouse.up(); await attends(700);
      const histoire = await p.evaluate(() => !!document.querySelector('.sheet-veil:not(.closing) .settings-sheet'));
      dit('4. la toucher ouvre son histoire', histoire);
    }
    await ctx.close();
  }
  /* --- éteinte --- */
  {
    const { ctx, p } = await ouvre(0);
    const e = await p.evaluate(() => { const f = document.querySelector('#app > .screen.parcours-ecran .parcours-sum .sem-flamme'); return f ? { cls: f.className, gs: !!f.querySelector(':scope > .gs') } : null; });
    dit('5. éteinte, elle reste du verre (sa teinte est translucide)', !!e && /\beteinte\b/.test(e.cls) && /\bhas-gs\b/.test(e.cls) && e.gs, e && e.cls);
    await ctx.close();
  }
  dit('6. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(ko ? `\n${ko} échec(s)` : '\nTout est bon.');
  process.exit(ko ? 1 : 0);
})();
