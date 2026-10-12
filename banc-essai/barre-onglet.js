/* ====== L'ONGLET ACTIF SE LIT DÈS QU'ON QUITTE UNE PAGE (v318) ======
   « Lorsque je quitte une page, ça s'affiche pas directement là où je t'ai
     mis le crayon rouge. » (capture de Taylor, iPhone : de retour sur
     l'écran des Groupes, la pastille corail de la barre du bas est là, mais
     VIDE — ni la bulle ni le mot « Groupes » dessus. L'Accueil, à côté, est
     entier.)
   CE QUI SÉPARE LES DEUX ONGLETS. Sur Groupes, la pastille se posait par un
   translate3d ; sur Accueil, elle n'a aucune transformation. Une
   transformation 3D donne à l'élément SA PROPRE couche, dessinée par-dessus
   la barre : le mot blanc ne reste alors devant que si le moteur, voyant
   qu'il chevauche la pastille, le sort lui aussi de la barre. Que Safari
   oublie ce calcul en ré-affichant la barre cachée sous une page
   (html.sous-page), et le mot reste peint dans la barre, sous la pastille :
   exactement la capture. Sans couche à part, il n'y a rien à calculer —
   c'est pour ça que l'Accueil est toujours entier. (L'autre chemin possible
   vers la même image — le geste retour d'iOS, qui montrait une photo de
   l'écran — est gardé par historique-page.js.)
   Le moteur qu'on pilote en machine refait ce calcul et ne montre pas le
   défaut. Ce banc garde donc sa CAUSE, sur les règles de la feuille de style
   (ce que lisent les deux moteurs pour décider d'une couche), et vérifie à
   l'image que l'onglet actif est entier à chaque retour.
   La pastille rouge du bouclier de modération est dans le même cas : elle
   passe devant un rond de verre qui, lui, DOIT avoir sa couche. Elle prend
   donc la sienne, et passe devant par son rang, sans calcul.
   CE QU'IL EXIGE, sur l'écran des Groupes :
     1. au repos, rien dans la barre n'a de couche à soi (aucune
        transformation 3D, aucun will-change, aucune animation qui traîne) —
        hormis la couche de verre (.gs), qui est SOUS tout le reste ;
     2. la référence : au repos, l'icône et le mot de l'onglet actif, en
        blanc sur la pastille ;
     3. retour des Réglages (une page, la barre cachée pendant qu'elle est
        posée) : dès que la page est partie, l'onglet actif est entier, et
        la barre n'a toujours pas de couche à part ;
     4. retour du Profil (un écran : la barre part, puis revient de côté) :
        même chose ;
     5. Groupes -> Accueil -> Groupes : la pastille glisse encore, et une
        fois arrivée elle ne garde aucune couche ; l'onglet est entier ;
     6. la pastille du bouclier a sa couche à elle, et se voit entière au
        retour des Réglages ;
     7. aucune erreur.
   Usage : node banc-essai/barre-onglet.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ENTIER = 0.85; // part des pixels de la référence qu'il faut retrouver
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0 } }).catch(() => {});
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe: true, ouverts: true, version: 1, modo: false, quand: Date.now() }));
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !document.getElementById('barreBas').classList.contains('cachee'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.waitForTimeout(1200);
    await p.evaluate(() => allerOnglet('groupes'));
    await p.waitForTimeout(1500);

    /* Les règles qui donnent une couche à un élément (transformation 3D,
       will-change), lues dans la feuille de style telle qu'elle s'applique
       maintenant, et les animations en cours. On lit les RÈGLES et non la
       matrice calculée : translate3d(x, 0, 0) se calcule en une matrice
       plate, mais c'est bien une opération 3D, et c'est elle que les moteurs
       regardent pour créer une couche. */
    await p.evaluate(() => {
      window.__couches = (els) => {
        const d3 = (s) => /translate3d|translateZ|rotate3d|rotateX|rotateY|scale3d|scaleZ|perspective|matrix3d/i.test(s || '');
        const regles = [];
        const visite = (liste) => {
          for (const r of liste) {
            if (r.media && r.cssRules) { if (matchMedia(r.media.mediaText).matches) visite(r.cssRules); continue; }
            if (r.cssRules && !r.selectorText) { visite(r.cssRules); continue; }
            if (r.selectorText && r.style && (d3(r.style.transform) || (r.style.willChange && r.style.willChange !== 'auto'))) regles.push(r);
          }
        };
        for (const f of document.styleSheets) { try { visite(f.cssRules); } catch (e) {} }
        const out = [];
        for (const el of els) {
          const nom = '.' + (el.getAttribute('class') || el.tagName.toLowerCase()).split(' ')[0];
          for (const r of regles) {
            let oui = false; try { oui = el.matches(r.selectorText); } catch (e) {}
            if (oui) out.push(nom + ' ← ' + r.selectorText + ' { ' + (d3(r.style.transform) ? 'transform:' + r.style.transform : 'will-change:' + r.style.willChange) + ' }');
          }
          if (d3(el.style.transform) || (el.style.willChange && el.style.willChange !== 'auto')) out.push(nom + ' ← style « ' + el.style.cssText + ' »');
          if (el.getAnimations && el.getAnimations().length) out.push(nom + ' ← animation en cours');
        }
        return out;
      };
    });
    const couchesBarre = () => p.evaluate(() => window.__couches([...document.getElementById('barreBas').querySelectorAll('*')].filter(el => !el.closest('.gs'))));

    /* Des pixels, dans un rectangle : les blancs (l'icône et le mot sur la
       pastille), ou ceux d'une couleur donnée. */
    const compte = async (r, quoi) => {
      const png = (await p.screenshot({ clip: { x: r.x, y: r.y, width: r.width, height: r.height } })).toString('base64');
      return p.evaluate(async ([b64, quoi]) => {
        const im = new Image(); await new Promise(res => { im.onload = res; im.src = 'data:image/png;base64,' + b64; });
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let k = 0; k < d.length; k += 4) {
          if (quoi === 'blanc' ? (d[k] > 238 && d[k + 1] > 238 && d[k + 2] > 238) : (d[k] > 200 && d[k + 1] < 120 && d[k + 2] < 100)) n++;
        }
        return n;
      }, [png, quoi]);
    };
    /* L'onglet actif : la pastille, rognée de quelques pixels pour ne lire qu'elle. */
    const onglet = async () => {
      const r = await p.evaluate(() => {
        const b = document.getElementById('barreBas'), o = b && b.querySelector('.bb-onglet.actif'), c = b && b.querySelector('.bb-curseur');
        if (!o || !c) return null;
        const ro = o.getBoundingClientRect(), rc = c.getBoundingClientRect();
        const x = Math.max(ro.left, rc.left) + 10, y = Math.max(ro.top, rc.top) + 6;
        return { x, y, width: Math.min(ro.right, rc.right) - 10 - x, height: Math.min(ro.bottom, rc.bottom) - 6 - y, onglet: o.dataset.o };
      });
      if (!r || r.width < 20 || r.height < 10 || r.y + r.height > 852) return { n: 0, onglet: r ? r.onglet : null };
      return { n: await compte(r, 'blanc'), onglet: r.onglet };
    };
    /* Revenir des Réglages : la page s'ouvre, se pose (la barre est alors
       cachée dessous), puis on touche son bouton retour. On rend la main
       dès que la page a quitté le document. */
    const allerRetourReglages = async () => {
      await p.evaluate(() => openSettings());
      await p.waitForFunction(() => document.documentElement.classList.contains('sous-page'), null, { timeout: 5000 }).catch(() => {});
      const vis = await p.evaluate(() => getComputedStyle(document.getElementById('barreBas')).visibility);
      await p.waitForTimeout(400);
      await p.evaluate(() => { const b = document.querySelector('#settingsVeil .page-tete .sheet-grab, #settingsVeil .sheet-grab'); if (b) b.click(); else closeSettings(); });
      await p.waitForFunction(() => !document.getElementById('settingsVeil'), null, { timeout: 5000 });
      return vis;
    };

    /* ---- 1 et 2 ---- */
    const repos = await couchesBarre();
    dit('1. au repos, rien dans la barre n\'a de couche à soi (hors verre)', repos.length === 0, repos.join(' | ') || 'aucune transformation 3D, aucun will-change, aucune animation');
    const ref = await onglet();
    dit('2. la référence : l\'icône et le mot de Groupes, en blanc sur la pastille', ref.onglet === 'groupes' && ref.n > 150, ref.n + ' pixels blancs, onglet ' + ref.onglet);

    /* ---- 3 ---- les Réglages : une page, la barre cachée dessous */
    const vis = await allerRetourReglages();
    const r3 = await onglet();
    const c3 = await couchesBarre();
    dit('3. retour des Réglages : l\'onglet actif est entier dès que la page est partie', r3.onglet === 'groupes' && r3.n >= ENTIER * ref.n, r3.n + ' pixels blancs contre ' + ref.n + ' ; barre « ' + vis + ' » pendant la page');
    dit('   … et la barre n\'a toujours pas de couche à part', c3.length === 0, c3.join(' | ') || 'aucune');
    await p.waitForTimeout(600);

    /* ---- 4 ---- le Profil : un écran, la barre part et revient de côté */
    await p.evaluate(() => openProfile());
    await p.waitForTimeout(900);
    await p.evaluate(() => { const b = document.querySelector('.app-header [onclick*="saveProfileAndBack"]'); if (b) b.click(); });
    await p.waitForFunction(() => state.screen === 'groupes', null, { timeout: 5000 });
    await p.waitForFunction(() => { const b = document.getElementById('barreBas'); return b && !/arrive|cachee|part-cote/.test(b.className); }, null, { timeout: 5000 });
    const r4 = await onglet();
    const c4 = await couchesBarre();
    dit('4. retour du Profil : l\'onglet actif est entier dès que la barre est posée', r4.onglet === 'groupes' && r4.n >= ENTIER * ref.n, r4.n + ' pixels blancs contre ' + ref.n);
    dit('   … et la barre n\'a toujours pas de couche à part', c4.length === 0, c4.join(' | ') || 'aucune');
    await p.waitForTimeout(600);

    /* ---- 5 ---- Groupes -> Accueil -> Groupes */
    const film = await p.evaluate(() => new Promise(res => {
      const xs = []; const t0 = performance.now();
      const tic = () => {
        const c = document.querySelector('#barreBas .bb-curseur');
        xs.push(c ? new DOMMatrixReadOnly(getComputedStyle(c).transform).m41 : 0);
        if (performance.now() - t0 < 1700) requestAnimationFrame(tic); else res(xs);
      };
      requestAnimationFrame(tic);
      allerOnglet('accueil');
      setTimeout(() => allerOnglet('groupes'), 850);
    }));
    const fin = film[film.length - 1];
    const enRoute = film.filter(x => x > 1 && x < fin - 1).length;
    await p.waitForTimeout(300);
    const r5 = await onglet();
    const c5 = await couchesBarre();
    dit('5. la pastille glisse encore d\'un onglet à l\'autre', fin > 100 && enRoute >= 6, enRoute + ' images en route, arrivée à ' + Math.round(fin) + ' px');
    dit('   … arrivée, elle ne garde aucune couche, et l\'onglet est entier', c5.length === 0 && r5.onglet === 'groupes' && r5.n >= ENTIER * ref.n, (c5.join(' | ') || 'aucune couche') + ', ' + r5.n + ' pixels blancs');

    /* ---- 6 ---- le bouclier du modérateur et sa pastille */
    await p.evaluate(() => { grp.etat = Object.assign({}, grp.etat || {}, { moderateur: true, a_traiter: 3 }); render(); majBouclier(); });
    await p.waitForTimeout(900);
    const pastille = () => p.evaluate(() => {
      const e = document.querySelector('.grp-modo .bb-pastille'); if (!e || e.hidden) return null;
      const r = e.getBoundingClientRect();
      return { x: r.left + 2, y: r.top + 2, width: r.width - 4, height: r.height - 4, couche: window.__couches([e]) };
    });
    const pa = await pastille();
    const refP = pa ? await compte(pa, 'corail') : 0;
    await allerRetourReglages();
    const pb = await pastille();
    const apresP = pb ? await compte(pb, 'corail') : 0;
    dit('6. la pastille du bouclier a sa couche à elle', !!pa && pa.couche.some(x => /transform:/.test(x)), pa ? (pa.couche.join(' | ') || 'aucune règle ne lui en donne') : 'pas de pastille');
    dit('   … et se voit entière au retour des Réglages', !!pb && refP > 40 && apresP >= ENTIER * refP, apresP + ' pixels corail contre ' + refP);
    dit('7. aucune erreur', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — l\'onglet actif se lit dès qu\'on quitte une page');
  process.exit(ko ? 1 : 0);
})();
