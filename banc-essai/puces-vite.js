/* ====== BANC « TOUT, MENTIONS, MUET : TOUCHÉES VITE, SANS UN À-COUP » (v328) ======
   « Sur iOS, les puces Tout / Mentions / Muet buguent au niveau de
     l'animation lorsque je clique un peu partout. »
   La page des infos d'un groupe, sur un faux serveur qui note chaque demande
   et y répond plus ou moins vite. Un vrai doigt (écran tactile, iPhone), et
   l'encre relevée IMAGE PAR IMAGE sur les trois puces (l'échelle de la
   couche ::after, et son état). Ce qu'on exige :
     1. UN CHANGEMENT D'AVIS EN PLEIN GESTE NE SAUTE PAS : Mentions touchée,
        puis Muet 150 ms après — Mentions, à moitié remplie, se vide D'OÙ ELLE
        EN EST (avant : elle redevenait pleine d'un coup) ;
     2. REPRISE EN PLEIN RETRAIT : Tout touchée, puis Muet aussitôt reprise —
        Muet, à moitié vidée, se remplit d'où elle en est (avant : elle
        redevenait vide d'un coup) ;
     3. CINQ TOUCHERS EN RAFALE (toutes les 90 ms) : jamais un saut d'une
        image à l'autre ;
     4. après chaque geste : une seule puce choisie, aria-checked et la phrase
        d'aide d'accord, plus aucune encre en vol ;
     5. LE SERVEUR GARDE LE DERNIER CHOIX : la première demande est lente
        (600 ms) — avant, la dernière arrivée gagnait, et le serveur gardait
        un choix déjà dépassé ; une seule demande en route à la fois ;
     6. un refus du serveur ramène la page à ce que le serveur a vraiment ;
     7. dans une page, l'encre animée n'a plus de masque ;
     8. aucune erreur de page.
   Usage : node banc-essai/puces-vite.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dire = (bon, txt) => { if (!bon) ko++; console.log('  ' + (bon ? 'OK  ' : 'KO  ') + txt); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    /* LE SERVEUR. « lents » : la durée de chaque demande, dans l'ordre des
       départs ; « refus » : combien des prochaines sont refusées. Il garde la
       valeur de la DERNIÈRE ARRIVÉE, comme une vraie base. */
    window.__srv = { valeur: 'tout', departs: [], arrivees: [], lents: [], refus: 0, enVol: 0, maxEnVol: 0 };
    window.supabase = { createClient(){
      return {
        rpc(nom, a){
          const s = window.__srv;
          if (nom !== 'regler_notifs') return Promise.resolve({ data: null, error: null });
          const lent = s.lents.length ? s.lents.shift() : 40;
          s.departs.push(a.p_notifs); s.enVol++; s.maxEnVol = Math.max(s.maxEnVol, s.enVol);
          const refuse = s.refus > 0 ? (s.refus--, true) : false;
          return new Promise((res) => setTimeout(() => {
            s.enVol--;
            if (refuse) return res({ data: { ok: false, erreur: 'interdit' }, error: null });
            s.valeur = a.p_notifs; s.arrivees.push(a.p_notifs);
            res({ data: { ok: true, notifs: a.p_notifs }, error: null });
          }, lent));
        },
        from(){ const q = { select: () => q, eq: () => q, in: () => q, gt: () => q, lt: () => q, order: () => q, limit: () => q, is: () => q,
          maybeSingle: () => Promise.resolve({ data: null, error: null }), then: (r) => Promise.resolve({ data: [], error: null }).then(r) }; return q; },
        channel(){ const c = { on: () => c, subscribe(){ return c; }, unsubscribe(){ return Promise.resolve('ok'); } }; return c; },
        removeChannel(){ return Promise.resolve('ok'); },
        auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }), onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; } },
      };
    } };
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
  await p.waitForTimeout(800);
  /* Un groupe, ouvert, et sa page d'infos. */
  await p.evaluate(() => {
    grp.etat = { participe: 'ok' };
    grp.liste = [{ id: 'g1', nom: 'Les amis', teinte: 2, nb_membres: 3, notifs: 'tout', non_lus: 0, mentions: 0, ouvert: false, code: 'ABCDEF' }];
    grp.membres.g1 = [{ membre: 'moi', role: 'proprietaire' }];
    grp.courant = 'g1'; state.screen = 'groupe'; render();
    ouvrirInfosGroupe();
  });
  await p.waitForFunction(() => !!document.querySelector('#grpInfosVeil.posee [data-ngroup="notifs"]'), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(700);
  const centres = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#grpInfosVeil [data-ngroup="notifs"]')].map(b => {
    const r = b.getBoundingClientRect(); return [b.dataset.k, { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 }]; })));

  /* L'encre de chaque puce, image par image, pendant « ms ». */
  const relever = (ms) => p.evaluate((ms) => new Promise((res) => {
    const t0 = performance.now(), images = [];
    const tic = () => {
      const img = { t: Math.round(performance.now() - t0) };
      document.querySelectorAll('#grpInfosVeil [data-ngroup="notifs"]').forEach(b => {
        const a = getComputedStyle(b, '::after');
        const m = /matrix\(([-\d.e]+)/.exec(a.transform || '');
        const vol = b.classList.contains('remplit') || b.classList.contains('devide');
        img[b.dataset.k] = { s: m ? +m[1] : (a.transform === 'none' ? 1 : 0), o: +a.opacity, vol, sel: b.classList.contains('sel') };
      });
      images.push(img);
      if (performance.now() - t0 < ms) requestAnimationFrame(tic); else res(images);
    };
    requestAnimationFrame(tic);
  }), ms);
  /* Le plus grand saut d'échelle d'une image à la suivante, pendant que
     l'encre est en vol des deux côtés (son entrée et sa sortie de scène ne
     comptent pas : au repos, la couche n'existe pas). */
  const sauts = (images, k) => {
    let pire = 0, ou = null;
    for (let i = 1; i < images.length; i++) {
      const a = images[i - 1][k], b = images[i][k];
      if (!a || !b || !a.vol || !b.vol || a.o < 0.05 || b.o < 0.05) continue;
      const d = Math.abs(b.s - a.s);
      if (d > pire) { pire = d; ou = { t: images[i].t, de: +a.s.toFixed(3), a: +b.s.toFixed(3) }; }
    }
    return { pire: +pire.toFixed(3), ou };
  };
  const toucher = (k) => p.touchscreen.tap(centres[k].x, centres[k].y);
  const etat = () => p.evaluate(() => {
    const puces = [...document.querySelectorAll('#grpInfosVeil [data-ngroup="notifs"]')];
    const aide = document.querySelector('#grpNotifsAide > span.vu');
    return { sel: puces.filter(b => b.classList.contains('sel')).map(b => b.dataset.k), aria: puces.filter(b => b.getAttribute('aria-checked') === 'true').map(b => b.dataset.k),
      aide: aide ? aide.dataset.t : null, vol: puces.filter(b => b.classList.contains('remplit') || b.classList.contains('devide')).map(b => b.dataset.k),
      g: (grp.liste[0] || {}).notifs, srv: window.__srv.valeur };
  });
  const coherent = (e, k) => JSON.stringify(e.sel) === JSON.stringify([k]) && JSON.stringify(e.aria) === JSON.stringify([k]) && e.aide === k && !e.vol.length && e.g === k;
  /* Le geste se joue PENDANT le relevé. */
  const jouer = async (gestes, ms) => {
    const rel = relever(ms);
    for (const [k, attente] of gestes) { await toucher(k); if (attente) await p.waitForTimeout(attente); }
    return rel;
  };

  /* ---- 1 : Mentions, puis Muet 150 ms après ---- */
  let im = await jouer([['mentions', 150], ['rien', 0]], 1100);
  let s = sauts(im, 'mentions');
  dire(s.pire <= 0.3, '1. Mentions quittée à mi-remplissage : se vide d\'où elle en est (plus grand saut ' + s.pire + (s.ou ? ' à ' + s.ou.t + ' ms : ' + s.ou.de + ' → ' + s.ou.a : '') + ')');
  let e = await etat();
  dire(coherent(e, 'rien'), '   puis : une seule puce choisie (Muet), aide et serveur d\'accord ' + JSON.stringify(e));

  /* ---- 2 : Tout, puis Muet reprise aussitôt ---- */
  im = await jouer([['tout', 110], ['rien', 0]], 1100);
  s = sauts(im, 'rien');
  dire(s.pire <= 0.3, '2. Muet reprise en plein retrait : se remplit d\'où elle en est (plus grand saut ' + s.pire + (s.ou ? ' à ' + s.ou.t + ' ms : ' + s.ou.de + ' → ' + s.ou.a : '') + ')');
  e = await etat();
  dire(coherent(e, 'rien'), '   puis : Muet choisie, tout d\'accord ' + JSON.stringify(e));

  /* ---- 3 : cinq touchers en rafale ---- */
  im = await jouer([['tout', 90], ['mentions', 90], ['rien', 90], ['tout', 90], ['mentions', 0]], 1400);
  const pires = ['tout', 'mentions', 'rien'].map(k => [k, sauts(im, k)]);
  dire(pires.every(([, x]) => x.pire <= 0.3), '3. cinq touchers en rafale : jamais un saut d\'une image à l\'autre (' + pires.map(([k, x]) => k + ' ' + x.pire).join(', ') + ')');
  e = await etat();
  dire(coherent(e, 'mentions'), '   puis : Mentions choisie, tout d\'accord ' + JSON.stringify(e));

  /* ---- 5 : la première demande lente ---- */
  /* Mentions est choisie. Tout (lente), puis Muet, puis Mentions : la
     dernière choisie est Mentions — la première, lente, ne doit pas
     arriver après elle. */
  await p.evaluate(() => { const s = window.__srv; s.departs = []; s.arrivees = []; s.maxEnVol = 0; s.lents = [600, 40, 40, 40]; });
  await toucher('tout'); await p.waitForTimeout(120);
  await toucher('rien'); await p.waitForTimeout(120);
  await toucher('mentions');
  await p.waitForTimeout(1600);
  e = await etat();
  const srv = await p.evaluate(() => window.__srv);
  dire(e.srv === 'mentions' && coherent(e, 'mentions'), '5. la première demande lente : le serveur garde le DERNIER choix (« ' + e.srv + ' », la page montre « ' + e.sel + ' ») — départs ' + JSON.stringify(srv.departs) + ', arrivées ' + JSON.stringify(srv.arrivees));
  dire(srv.maxEnVol === 1, '   une seule demande en route à la fois (' + srv.maxEnVol + ')');

  /* ---- 6 : un refus ---- */
  await p.evaluate(() => { window.__srv.refus = 1; });
  await toucher('rien');
  await p.waitForTimeout(900);
  e = await etat();
  dire(coherent(e, 'mentions') && e.srv === 'mentions', '6. refusé : la page revient à ce que le serveur a (« ' + e.sel + ' », serveur « ' + e.srv + ' »)');

  /* ---- 7 ---- */
  const masque = await p.evaluate(() => { const b = document.querySelector('#grpInfosVeil [data-ngroup="notifs"]'); const a = getComputedStyle(b, '::after');
    return (a.webkitMaskImage || a.maskImage || 'none'); });
  dire(/none/.test(masque), '7. dans une page, l\'encre animée n\'a plus de masque (' + masque.slice(0, 40) + ')');
  dire(!errs.length, '8. aucune erreur de page' + (errs.length ? ' : ' + errs.slice(0, 2).join(' | ') : ''));

  await nav.close();
  console.log(ko ? `\n  ${ko} défaut(s)` : '\n  OK — touchées vite, les puces continuent leur geste, et le serveur garde le dernier choix');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
