/* ====== BANC « LES SIX PLACES » (v344) ======
   « Revois toute la partie où on ajoute les membres, totalement : sur
     Android elle bug toujours. Fais en sorte qu'elle soit mieux, et
     parfaitement identique sur tous les OS. »
   Avant la v344, ce banc chassait le « cran » des LIGNES qui naissaient et se
   repliaient : marches finales, demi-tours, chevauchements, sur douze
   situations. Il était vert, et Taylor voyait encore le défaut sur Android —
   parce que la carte changeait de hauteur et que tout ce qui était dessous
   bougeait avec elle. La v344 retire la cause : six places fixes, le nom dans
   une page. Ce banc vérifie donc ce qui ne doit PLUS JAMAIS arriver, et que
   les gestes restent justes :
     1. six places, toujours ; la carte garde la même hauteur de deux à six
        joueurs, sur trois téléphones ;
     2. ajouter : la place « Ajouter » devient le joueur (son numéro sur la
        pastille, « Joueur n »), la suivante devient « Ajouter » ; à six, il
        n'y a plus d'« Ajouter » ;
     3. retirer (au milieu, en tête, en dernier) : les suivants glissent d'une
        place, dans l'ordre, sans jamais repartir en arrière ; la dernière
        place occupée redevient « Ajouter » ; à deux, plus de croix ;
     4. IMAGE PAR IMAGE, RIEN NE BOUGE SOUS LA CARTE pendant les gestes (la
        durée, le chrono, le testament, « Commencer ») — ni la carte
        elle-même ;
     5. des gestes enchaînés vite (deux retraits, un ajout pendant un retrait)
        finissent dans le bon état, sans transformation ni classe oubliée ;
     6. le toucher ne tient pas le fil : médiane de cinq retraits, processeur
        bridé six fois (un Android d'entrée de gamme) ;
     7. la page d'un joueur : le nom s'écrit, la place suit en direct ; un nom
        vide rend le numéro ; un emoji donne sa pastille ; « Retirer de la
        partie » referme la page puis retire la place ;
     7b. la croix puis « Commencer » (ou un rendu) dans le même instant : la
        partie part sans le joueur retiré, et rien ne coupe plus dans sa liste ;
     8. aucune erreur.
   Usage : node banc-essai/joueurs.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_AND = 'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const S_FIL = 25;          // ms : médiane du toucher, processeur bridé six fois
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d !== undefined ? '   (' + String(d).slice(0, 260) + ')' : '')); };

const ECRANS = [['iPhone 393x852', 393, 852, UA_IOS, 3], ['Android 412x915', 412, 915, UA_AND, 2.625], ['petit 360x740', 360, 740, UA_AND, 3]];

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [nom, W, H, ua, dpr] of ECRANS) {
    console.log('\n  — ' + nom);
    const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, userAgent: ua, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    const poser = (noms) => p.evaluate((noms) => { state.mode = 'group'; state.teams = noms.map(n => ({ name: n })); state.screen = 'setup'; render(); }, noms);
    const etat = () => p.evaluate(() => {
      const g = document.querySelector('#teamCard .places');
      const pl = [...g.querySelectorAll('.place')].map(el => { const b = el.querySelector('.pl-btn'); const t = b.querySelector('.team-token');
        return { k: b.classList.contains('pl-joueur') ? 'joueur' : b.classList.contains('pl-ajout') ? 'ajout' : b.classList.contains('pl-libre') ? 'libre' : '?',
          signe: t ? t.textContent : '', nom: (b.querySelector('.pl-nom') || {}).textContent || '', x: !!el.querySelector('.pl-x'),
          xVisible: !!el.querySelector('.pl-x') && getComputedStyle(el.querySelector('.pl-x')).opacity !== '0',
          reste: el.style.transform || el.className.replace('place', '').trim() }; });
      return { pl, h: +document.getElementById('teamCard').getBoundingClientRect().height.toFixed(2), noms: state.teams.map(t => t.name) }; });
    /* 1 */
    const hauteurs = [];
    for (const n of [2, 3, 4, 5, 6]) { await poser(['Taylor', 'Joueur 2', 'Joueur 3', 'Joueur 4', 'Joueur 5', 'Joueur 6'].slice(0, n)); await p.waitForTimeout(250); const e = await etat(); hauteurs.push(e.h); if (e.pl.length !== 6) dit('six places à ' + n + ' joueurs', false, e.pl.length); }
    dit('1. six places, et la carte garde sa hauteur de deux à six joueurs', Math.max(...hauteurs) - Math.min(...hauteurs) < 0.5, hauteurs.join(' / '));
    /* 2 */
    await poser(['Taylor', 'Joueur 2', 'Joueur 3']); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('#teamCard .pl-ajout').click()); await p.waitForTimeout(800);
    let e = await etat();
    dit('2. « Ajouter » devient le joueur 4 (pastille 4), la place suivante devient « Ajouter »',
      e.pl[3].k === 'joueur' && e.pl[3].signe === '4' && e.pl[3].nom === 'Joueur 4' && e.pl[4].k === 'ajout' && e.pl[5].k === 'libre' && e.noms.length === 4, JSON.stringify(e.pl.map(x => x.k + ':' + x.signe)));
    await p.evaluate(() => { ajouterJoueur(); }); await p.waitForTimeout(700);
    await p.evaluate(() => { ajouterJoueur(); }); await p.waitForTimeout(700);
    e = await etat();
    dit('   à six : six joueurs, plus d\'« Ajouter »', e.pl.every(x => x.k === 'joueur') && e.noms.length === 6, JSON.stringify(e.pl.map(x => x.k)));
    await p.evaluate(() => { ajouterJoueur(); }); await p.waitForTimeout(300);
    dit('   un septième n\'entre pas', (await etat()).noms.length === 6);
    /* 3 + 4 : retirer, en mesurant chaque image */
    const filmer = (geste, ms) => p.evaluate(([geste, ms]) => new Promise(res => {
      const dessous = [...document.querySelectorAll('#app .screen > .card, #app .screen > .rules, #app .screen > .btn-primary')].filter(x => x.id !== 'teamCard');
      const carte = document.getElementById('teamCard');
      const places = [...document.querySelectorAll('#teamCard .place')];
      const pos0 = dessous.map(x => x.getBoundingClientRect().top), c0 = carte.getBoundingClientRect();
      /* On suit chaque JOUEUR, pas chaque place : au moment du glissement,
         une place se met à porter le joueur suivant, posée là où il était —
         elle « saute », lui ne bouge pas. Ni par son nom : « Joueur 3 »
         devient « Joueur 2 » en glissant. Par son identité. */
      state.teams.forEach((t, i) => { t.__id = 'j' + i; });
      let pireDessous = 0, pireCarte = 0; const traces = {};
      const t0 = performance.now();
      const tic = () => {
        dessous.forEach((x, i) => { pireDessous = Math.max(pireDessous, Math.abs(x.getBoundingClientRect().top - pos0[i])); });
        const c = carte.getBoundingClientRect(); pireCarte = Math.max(pireCarte, Math.abs(c.top - c0.top), Math.abs(c.height - c0.height));
        places.forEach((pl, j) => { const b = pl.querySelector('.pl-joueur'); const t = state.teams[j]; if (!b || !t || pl.classList.contains('pl-part')) return; const r = pl.getBoundingClientRect(); (traces[t.__id] = traces[t.__id] || []).push([r.left, r.top]); });
        if (performance.now() - t0 < ms) requestAnimationFrame(tic);
        else {
          /* un glissement va toujours vers sa place : la distance qui reste ne
             remonte jamais (aucun demi-tour) */
          let demiTours = 0, saut = 0;
          Object.values(traces).forEach((t) => { const fin = t[t.length - 1]; let prec = Infinity, avant = null;
            t.forEach(([x, y]) => { const d = Math.hypot(x - fin[0], y - fin[1]); if (d > prec + 0.3) demiTours++; prec = d;
              if (avant) saut = Math.max(saut, Math.hypot(x - avant[0], y - avant[1])); avant = [x, y]; }); });
          res({ pireDessous: +pireDessous.toFixed(2), pireCarte: +pireCarte.toFixed(2), demiTours, saut: +saut.toFixed(1), images: Object.values(traces)[0].length });
        }
      };
      requestAnimationFrame(tic);
      new Function(geste)();
    }), [geste, ms]);
    let f = await filmer('retirerJoueur(1);', 1000);
    e = await etat();
    dit('3. retirer le 2e : les suivants glissent d\'une place, la 6e redevient « Ajouter »',
      JSON.stringify(e.noms) === JSON.stringify(['Taylor', 'Joueur 2', 'Joueur 3', 'Joueur 4', 'Joueur 5']) && e.pl[5].k === 'ajout' && e.pl.every(x => !x.reste), JSON.stringify(e.pl.map(x => x.k + ':' + x.signe + (x.reste ? '!' + x.reste : ''))));
    dit('4. image par image, rien ne bouge sous la carte, ni la carte (et aucun demi-tour)', f.pireDessous === 0 && f.pireCarte === 0 && f.demiTours === 0, JSON.stringify(f));
    f = await filmer('retirerJoueur(0);', 1000); e = await etat();
    dit('   retirer le premier : idem', e.noms[0] === 'Joueur 1' && e.noms.length === 4 && f.pireDessous === 0 && f.pireCarte === 0 && f.demiTours === 0, JSON.stringify([e.noms, f]));
    f = await filmer('retirerJoueur(state.teams.length - 1);', 1000); e = await etat();
    dit('   retirer le dernier : sa place redevient « Ajouter » sur place', e.noms.length === 3 && e.pl[3].k === 'ajout' && e.pl[4].k === 'libre' && f.pireDessous === 0 && f.pireCarte === 0, JSON.stringify([e.pl.map(x => x.k), f]));
    f = await filmer('retirerJoueur(2);', 900); e = await etat();
    dit('   à deux : plus de croix (elles s\'effacent)', e.noms.length === 2 && e.pl.filter(x => x.k === 'joueur').every(x => !x.xVisible), JSON.stringify(e.pl.map(x => x.k + (x.xVisible ? '×' : ''))));
    await p.evaluate(() => retirerJoueur(1)); await p.waitForTimeout(500);
    dit('   à deux, on ne retire plus personne', (await etat()).noms.length === 2);
    /* 5 : gestes enchaînés */
    await poser(['A', 'B', 'C', 'D', 'E', 'F']); await p.waitForTimeout(300);
    /* B part ; C part pendant que les autres glissent encore ; un ajout tombe
       pendant que C s'efface (le retrait de C se pose d'abord) ; puis F. Le
       joueur visé est celui qu'on touche — pas un numéro qui aurait glissé. */
    await p.evaluate(() => { retirerJoueur(1); setTimeout(() => retirerJoueur(1), 250); setTimeout(() => ajouterJoueur(), 330); setTimeout(() => retirerJoueur(3), 420); });
    await p.waitForTimeout(1300);
    e = await etat();
    dit('5. deux retraits, un ajout, un retrait, enchaînés vite : le bon état, rien d\'oublié',
      JSON.stringify(e.noms) === JSON.stringify(['A', 'D', 'E', 'Joueur 4']) && e.pl[4].k === 'ajout' && e.pl[5].k === 'libre' && e.pl.every(x => !x.reste), JSON.stringify([e.noms, e.pl.map(x => x.k + (x.reste ? '!' + x.reste : ''))]));
    /* 6 : le fil, processeur bridé */
    if (ua === UA_AND && W === 412) {
      const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
      const durees = [];
      for (let k = 0; k < 5; k++) {
        await poser(['A', 'B', 'C', 'D']); await p.waitForTimeout(400);
        durees.push(await p.evaluate(() => { const x = document.querySelectorAll('#teamCard .pl-x')[1]; const t = performance.now(); x.click(); return +(performance.now() - t).toFixed(1); }));
        await p.waitForTimeout(900);
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const med = durees.slice().sort((a, b) => a - b)[2];
      dit('6. le toucher de la croix ne tient pas le fil (médiane, bridé ×6)', med < S_FIL, durees.join(' / ') + ' ms');
    }
    /* 7 : la page d'un joueur */
    await poser(['Taylor', 'Joueur 2', 'Joueur 3']); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelectorAll('#teamCard .pl-joueur')[1].click());
    await p.waitForTimeout(900);
    const page = await p.evaluate(() => { const v = document.getElementById('joueurVeil'); const z = document.getElementById('joueurNom');
      return { ouverte: !!v && !v.classList.contains('closing'), page: !!v && v.classList.contains('page'), valeur: z ? z.value : null, jeton: (document.querySelector('#joueurVeil .jp-jeton') || {}).textContent, retirer: !!document.querySelector('#joueurVeil .jp-retirer') }; });
    dit('7. toucher un joueur ouvre SA page : champ vide pour un numéro, pastille 2, « Retirer de la partie »', page.ouverte && page.page && page.valeur === '' && page.jeton === '2' && page.retirer, JSON.stringify(page));
    await p.locator('#joueurNom').fill('Marie');
    await p.waitForTimeout(200);
    e = await etat();
    const jp = await p.evaluate(() => document.querySelector('#joueurVeil .jp-jeton').textContent);
    dit('   on écrit : la place suit en direct (M, « Marie »), la pastille de la page aussi', e.pl[1].signe === 'M' && e.pl[1].nom === 'Marie' && jp === 'M', JSON.stringify([e.pl[1], jp]));
    await p.evaluate(() => validerJoueur()); await p.waitForTimeout(700);
    dit('   « Enregistrer » referme la page, le nom reste', !(await p.evaluate(() => { const v = document.getElementById('joueurVeil'); return v && !v.classList.contains('closing'); })) && (await etat()).noms[1] === 'Marie');
    await p.evaluate(() => document.querySelectorAll('#teamCard .pl-joueur')[1].click()); await p.waitForTimeout(800);
    await p.locator('#joueurNom').fill(''); await p.waitForTimeout(150);
    await p.evaluate(() => validerJoueur()); await p.waitForTimeout(700);
    e = await etat();
    dit('   un nom vidé rend le numéro (« Joueur 2 », pastille 2)', e.noms[1] === 'Joueur 2' && e.pl[1].signe === '2', JSON.stringify(e.pl[1]));
    await p.evaluate(() => document.querySelectorAll('#teamCard .pl-joueur')[2].click()); await p.waitForTimeout(800);
    await p.locator('#joueurNom').fill('🦁 Les Lions'); await p.waitForTimeout(150);
    e = await etat();
    dit('   un emoji en tête donne sa pastille, entière', e.pl[2].signe === '🦁', JSON.stringify(e.pl[2]));
    await p.evaluate(() => { const b = [...document.querySelectorAll('#joueurVeil .grp-act-l')].find(x => /Retirer de la partie/.test(x.textContent)); b.click(); });
    await p.waitForTimeout(250);
    const pendant = await p.evaluate(() => ({ page: !!document.querySelector('#joueurVeil:not(.closing)'), n: state.teams.length }));
    await p.waitForTimeout(1100);
    e = await etat();
    dit('   « Retirer de la partie » : la page repart d\'abord, puis la place s\'efface', !pendant.page && pendant.n === 3 && e.noms.length === 2 && !e.noms.includes('🦁 Les Lions'), JSON.stringify([pendant, e.noms]));
    /* 7b : la croix, puis « Commencer » dans le même instant. La partie part
       avec ceux qui restent — et le retrait, qui se posait 170 ms plus tard,
       ne coupe plus dans la liste de la partie lancée (v344). Sans chrono :
       aucune minuterie de jeu ne court après le retour à l'écran du mode. */
    await poser(['A', 'B', 'C', 'D']); await p.evaluate(() => { state.timerKey = 'off'; }); await p.waitForTimeout(300);
    const vite = await p.evaluate(() => new Promise(res => {
      retirerJoueur(1);
      setTimeout(() => {
        startGame();
        const a = { ecran: state.screen, noms: state.teams.map(t => t.name), scores: state.scores.length };
        setTimeout(() => res({ a, b: { noms: state.teams.map(t => t.name), scores: state.scores.length } }), 900);
      }, 40);
    }));
    dit('7b. une croix puis « Commencer » aussitôt : la partie part sans le joueur retiré, et sa liste n\'est plus touchée',
      vite.a.ecran === 'play' && JSON.stringify(vite.a.noms) === '["A","C","D"]' && vite.a.scores === 3 && JSON.stringify(vite.b.noms) === '["A","C","D"]' && vite.b.scores === 3, JSON.stringify(vite));
    /* un rendu complet pendant le retrait : l'écran neuf montre la liste posée */
    await poser(['A', 'B', 'C', 'D']); await p.waitForTimeout(300);
    await p.evaluate(() => { retirerJoueur(1); setTimeout(() => render(), 60); }); await p.waitForTimeout(900);
    e = await etat();
    dit('    un rendu pendant le retrait : la carte montre la liste posée, rien d\'oublié',
      JSON.stringify(e.noms) === '["A","C","D"]' && e.pl.filter(x => x.k === 'joueur').map(x => x.nom).join() === 'A,C,D' && e.pl[3].k === 'ajout' && e.pl.every(x => !x.reste), JSON.stringify([e.noms, e.pl.map(x => x.k + ':' + x.nom + (x.reste ? '!' + x.reste : ''))]));
    dit('8. aucune erreur', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  await nav.close();
  console.log(ko ? `\n  ECHEC — ${ko} point(s)` : '\n  OK — six places fixes : rien ne bouge sous la carte, les gestes restent justes');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
