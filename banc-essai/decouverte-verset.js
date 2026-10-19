/* ====== BANC « LE VERSET SURPRISE SE DÉCOUVRE — UNE FOIS » (v331) ======
   « Fais en sorte que la personne qui arrive pour la première fois sur le jeu
     comprenne qu'en appuyant 5 fois sur l'icône du petit bonhomme qui prie,
     ça affiche un verset — de manière interactive, dans la DA du jeu, ultra
     clean, sans gros message, sans pavé à l'écran. Ensuite elle le saura :
     elle n'aura plus besoin de cette interaction. » Puis : « sans le
     message » — le geste seul, pas une phrase.
   Le jeu cache la découverte aux navigateurs pilotés (les autres bancs
   photographient l'accueil) : celui-ci l'appelle (window.__essaiDecouverte).
     1. première arrivée : la découverte se lance d'elle-même — et rien ne
        s'écrit : la petite ligne sous le titre reste la sienne ;
     2. le doigt fantôme touche l'icône cinq fois : elle s'enfonce, les cinq
        points s'allument un à un — et le verset ne s'ouvre PAS tout seul ;
     3. le doigt s'en va, les points se vident ;
     4. deux touches du joueur : deux points ; il s'arrête, ils se vident ;
     5. cinq touches : le verset s'ouvre, la découverte s'en va, c'est
        retenu (bt_verset_appris) ;
     6. relancé : plus rien, jamais ;
     7. UNE FOIS : elle revient sur l'accueil pendant ce lancement (le doigt
        trois fois en tout), mais qui passe son chemin ne la revoit pas au
        lancement suivant ;
     8. une fenêtre ouverte : elle attend qu'elle parte ;
     9. « Réduire les animations » du téléphone n'y change rien : le jeu est
        le même pour tout le monde (le doigt touche, l'icône s'enfonce) ;
    10. en anglais non plus, pas un mot ;
    11. sans l'appel du banc, un navigateur piloté ne voit rien (les autres
        bancs gardent leur accueil) ;
    12. rien ne déborde : ni le doigt, ni les points ;
    13. aucune erreur.
   Usage : node banc-essai/decouverte-verset.js [url] [dossier des captures] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const CAPT = process.argv[3] || null;
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 240) + ')' : '')); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    /* Un téléphone ; « etat » : ce que ce téléphone a déjà vécu (localStorage gardé d'un lancement à l'autre). */
    const telephone = async (o) => {
      o = o || {};
      const ctx = await nav.newContext({ viewport: o.vue || { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: o.ua || IOS,
        serviceWorkers: 'block', reducedMotion: o.reduit ? 'reduce' : 'no-preference', storageState: o.etat || undefined });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(([essai, langue]) => {
        if (!localStorage.getItem('bt_profile')) localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1');
        if (langue) localStorage.setItem('bt_langue', langue);
        if (essai) window.__essaiDecouverte = true;
        /* Ce que la page a montré, image par image : les points allumés, l'icône enfoncée, le verset. */
        window.__vu = { points: [], vif: false, verset: false };
        const regarder = () => {
          const n = document.querySelectorAll('#heroZone .hero-points i.plein').length;
          const l = window.__vu.points; if (!l.length || l[l.length - 1] !== n) l.push(n);
          const w = document.querySelector('#heroZone .hero-icon-wrap'); if (w && w.classList.contains('vif')) window.__vu.vif = true;
          const z = document.getElementById('heroZone'); if (z && z.classList.contains('show-verse')) window.__vu.verset = true;
          requestAnimationFrame(regarder);
        };
        requestAnimationFrame(regarder);
      }, [o.essai !== false, o.langue || '']);
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!document.getElementById('heroZone'); } catch (e) { return false; } }, null, { timeout: 25000 });
      return { ctx, p };
    };
    const etatDe = (p) => p.evaluate(() => {
      const hero = document.querySelector('.accueil .hero'), z = document.getElementById('heroZone'), d = z && z.querySelector('.hero-doigt'), l = document.getElementById('homeVerse');
      return { decouverte: !!(hero && hero.classList.contains('decouverte')), doigt: !!(d && d.classList.contains('vu')), points: document.querySelectorAll('#heroZone .hero-points i.plein').length,
        /* (le jeu met une espace insécable devant « : » — la même à l'œil) */
        verset: !!(z && z.classList.contains('show-verse')), ligne: l ? l.textContent.replace(/\u00a0/g, ' ').trim() : null, appris: localStorage.getItem('bt_verset_appris'), montre: localStorage.getItem('bt_verset_montre') };
    });
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 6000, polling: 30 }).then(() => true).catch(() => false);
    const toucher = async (p, n, ecart) => { for (let i = 0; i < n; i++) { await p.locator('#heroZone .hero-icon-btn').tap(); await p.waitForTimeout(ecart || 120); } };
    const capture = async (p, nom) => { if (CAPT) await p.screenshot({ path: CAPT + '/' + nom + '.png' }); };

    /* 1 à 6 — la première arrivée, iPhone puis Android. */
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      console.log('  — ' + tel);
      const { ctx, p } = await telephone({ ua });
      const ligneAvant = await p.evaluate(() => document.getElementById('homeVerse').innerHTML);
      const lancee = await attendre(p, () => document.querySelector('.accueil .hero').classList.contains('decouverte'), null, 4000);
      await p.waitForTimeout(600);
      let e = await etatDe(p);
      const ligne1 = await p.evaluate(() => document.getElementById('homeVerse').innerHTML);
      dit('1. première arrivée : la découverte se lance, et rien ne s\'écrit (la ligne reste « ' + e.ligne + ' »)', lancee && e.doigt && ligne1 === ligneAvant, JSON.stringify(e));
      await attendre(p, () => document.querySelectorAll('#heroZone .hero-points i.plein').length === 3, null, 3000);
      await capture(p, tel + '-1-doigt');
      await attendre(p, () => document.querySelectorAll('#heroZone .hero-points i.plein').length === 5, null, 3000);
      const vu2 = await p.evaluate(() => window.__vu);
      const montee = vu2.points.filter(n => n > 0);
      dit('2. le doigt touche cinq fois : l\'icône s\'enfonce, les points s\'allument un à un', vu2.vif && montee.join('') === '12345', 'points ' + vu2.points.join(','));
      await p.waitForTimeout(400);
      await capture(p, tel + '-2-cinq');
      const vide = await attendre(p, () => document.querySelectorAll('#heroZone .hero-points i.plein').length === 0 && !document.querySelector('#heroZone .hero-doigt.vu'), null, 3000);
      e = await etatDe(p);
      dit('   le verset ne s\'ouvre PAS tout seul', !e.verset && !(await p.evaluate(() => window.__vu.verset)) && e.appris !== '1', JSON.stringify(e));
      const ligne3 = await p.evaluate(() => document.getElementById('homeVerse').innerHTML);
      dit('3. le doigt s\'en va, les points se vident', vide && e.decouverte && ligne3 === ligneAvant, JSON.stringify(e));
      await capture(p, tel + '-3-a-toi');

      /* 4 */
      await toucher(p, 2);
      const deux = (await etatDe(p)).points;
      await p.waitForTimeout(1700);
      const apres = (await etatDe(p)).points;
      dit('4. deux touches : deux points ; il s\'arrête, ils se vident', deux === 2 && apres === 0, deux + ' puis ' + apres);

      /* 5 */
      await toucher(p, 5, 110);
      const ouvert = await attendre(p, () => document.getElementById('heroZone').classList.contains('show-verse'), null, 2000);
      await p.waitForTimeout(600);
      e = await etatDe(p);
      const ligneApres = await p.evaluate(() => document.getElementById('homeVerse').innerHTML);
      dit('5. cinq touches : le verset s\'ouvre, la découverte s\'en va', ouvert && !e.decouverte && !e.doigt, JSON.stringify(e));
      dit('   c\'est retenu, et la ligne n\'a jamais bougé', ligneApres === ligneAvant && e.appris === '1', JSON.stringify({ appris: e.appris, pareille: ligneApres === ligneAvant }));
      await capture(p, tel + '-5-verset');

      /* 6 */
      const etat = await ctx.storageState();
      await ctx.close();
      const { ctx: c6, p: p6 } = await telephone({ ua, etat });
      await p6.waitForTimeout(3200);
      e = await etatDe(p6);
      dit('6. relancé : plus rien, jamais', !e.decouverte && !e.doigt && e.points === 0, JSON.stringify(e));
      await c6.close();
    }

    /* 7 — une fois : ce lancement-ci, pas le suivant. */
    {
      const { ctx, p } = await telephone();
      const premiere = await attendre(p, () => document.querySelector('.accueil .hero').classList.contains('decouverte'), null, 4000);
      await p.evaluate(() => { state.screen = 'parcours'; render(); });
      await p.waitForTimeout(900);
      await p.evaluate(() => { state.screen = 'mode'; render(); });
      const revient = await attendre(p, () => document.querySelector('.accueil .hero').classList.contains('decouverte'), null, 4000);
      /* Le doigt ne joue que trois fois en tout, retours compris. */
      await p.waitForTimeout(26000);
      const joues = await p.evaluate(() => decVerset.joues);
      const etat = await ctx.storageState();
      await ctx.close();
      const { ctx: c2, p: p2 } = await telephone({ etat });
      const suivant = await attendre(p2, () => document.querySelector('.accueil .hero').classList.contains('decouverte'), null, 3500);
      await c2.close();
      dit('7. une fois : elle revient sur l\'accueil pendant ce lancement, le doigt trois fois en tout', premiere && revient && joues === 3, 'revient ' + revient + ' · doigt ' + joues + ' fois');
      dit('   qui passe son chemin ne la revoit pas au lancement suivant', !suivant);
    }

    /* 8 — une fenêtre ouverte à l'arrivée. */
    {
      const { ctx, p } = await telephone();
      await p.evaluate(() => showModal({ title: 'Essai', message: 'Une fenêtre.', okLabel: 'OK', hideCancel: true, onOk: () => true }));
      await p.waitForTimeout(3200);
      const pendant = (await etatDe(p)).decouverte;
      await p.evaluate(() => closeModal());
      const ensuite = await attendre(p, () => document.querySelector('.accueil .hero').classList.contains('decouverte'), null, 5000);
      dit('8. une fenêtre ouverte : la découverte attend qu\'elle parte', !pendant && ensuite, 'pendant ' + pendant + ' · ensuite ' + ensuite);
      await ctx.close();
    }

    /* 9 — « réduire les animations » : le même jeu. */
    {
      const { ctx, p } = await telephone({ reduit: true });
      await attendre(p, () => document.querySelectorAll('#heroZone .hero-points i.plein').length === 5, null, 5000);
      const r = await p.evaluate(() => ({ vu: window.__vu, flotte: getComputedStyle(document.querySelector('#heroZone .hero-doigt')).animationName }));
      dit('9. « Réduire les animations » n\'y change rien : le doigt touche, l\'icône s\'enfonce, les points s\'allument', r.vu.points.filter(n => n > 0).join('') === '12345' && r.vu.vif && r.flotte === 'heroFlotte', JSON.stringify(r));
      await ctx.close();
    }

    /* 10 — en anglais : pas un mot non plus. */
    {
      const { ctx, p } = await telephone({ langue: 'en', ua: AND });
      const avant = await p.evaluate(() => document.getElementById('homeVerse').innerHTML);
      await attendre(p, () => document.querySelector('.accueil .hero').classList.contains('decouverte'), null, 4000);
      await p.waitForTimeout(800);
      const pendant = await p.evaluate(() => document.getElementById('homeVerse').innerHTML);
      const l = (await etatDe(p)).ligne;
      dit('10. en anglais non plus, pas un mot (la ligne reste « ' + l + ' »)', avant === pendant);
      await ctx.close();
    }

    /* 11 — un navigateur piloté, sans l'appel du banc. */
    {
      const { ctx, p } = await telephone({ essai: false });
      await p.waitForTimeout(3500);
      const e = await etatDe(p);
      dit('11. sans l\'appel du banc, un navigateur piloté ne voit rien', !e.decouverte && !e.doigt && e.montre === null, JSON.stringify(e));
      await ctx.close();
    }

    /* 12 — rien ne déborde, du petit iPhone au grand Android. */
    {
      const defauts = [];
      for (const [nom, vue, ua] of [['iPhone SE', { width: 375, height: 667 }, IOS], ['iPhone 16', { width: 393, height: 852 }, IOS], ['Pixel 9 Pro XL', { width: 427, height: 952 }, AND], ['petit Android', { width: 360, height: 740 }, AND]]) {
        const { ctx, p } = await telephone({ vue, ua });
        await attendre(p, () => document.querySelectorAll('#heroZone .hero-points i.plein').length === 5, null, 5000);
        await p.waitForTimeout(250);
        const m = await p.evaluate(() => {
          const d = document.querySelector('#heroZone .hero-doigt'), pts = document.querySelector('#heroZone .hero-points'), ic = document.querySelector('#heroZone .hero-icon');
          const b = (e) => { const r = e.getBoundingClientRect(); return { g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.top), b: Math.round(r.bottom) }; };
          const premiere = document.querySelector('.mode-card, .daily-card');
          return { largeur: innerWidth, doigt: b(d), points: b(pts), icone: b(ic), cartes: premiere ? Math.round(premiere.getBoundingClientRect().top) : null };
        });
        const dedans = (r) => r.g >= 0 && r.d <= m.largeur;
        /* Les points sont posés SUR l'icône, au bas de son image. */
        if (m.points.h < m.icone.h || m.points.b > m.icone.b + 1) defauts.push(nom + ' : les points ne sont pas sur l\'icône (' + JSON.stringify(m.points) + ' / ' + JSON.stringify(m.icone) + ')');
        if (!dedans(m.doigt) || !dedans(m.points)) defauts.push(nom + ' : le doigt ou les points sortent de l\'écran');
        if (m.cartes != null && m.points.b > m.cartes) defauts.push(nom + ' : les points passent sous la première carte');
        await capture(p, 'taille-' + nom.replace(/ /g, '-'));
        await ctx.close();
      }
      dit('12. rien ne déborde : le doigt et les points sur l\'écran, les points sur l\'icône, au-dessus des cartes', !defauts.length, defauts.join(' · '));
    }

    dit('13. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — un doigt de verre montre le geste, cinq points le comptent : la première fois, puis plus jamais');
  process.exit(ko ? 1 : 0);
})();
