/* ====== BANC « UN VISAGE NE SE TEINTE PAS » (v332) ======
   « Je pensais qu'il serait bien de supprimer le halo rose lorsque je clique
     sur ma photo de profil ou sur la photo de quelqu'un d'autre. » Le halo,
   c'était l'onde d'appui du bouton qui porte le visage : un voile corail
   (rgba(238,74,40,0.18)) posé sur la photo tant que le doigt y reste.
   Sur iPhone et sur Android, avec des photos unies (un vert franc pour moi,
   un bleu pour Sam), le doigt posé 0,3 s — l'onde a fini de se remplir. La
   couleur se lit sur une vraie capture ; ce qui s'enfonce se lit au style
   (« :active », qu'un doigt simulé ne pose pas, est posé par l'outil de
   développement sur le bouton qui porte le visage) :
     1. l'accueil, mon visage (en haut à gauche) : sa couleur ne bouge pas
        (moins de 6 unités par canal), il s'enfonce, et le toucher ouvre
        toujours le Profil ;
     2. le Profil, mon grand visage : pareil ; le toucher l'ouvre en grand ;
     3. les Groupes, mon visage en haut : pareil ;
     4. les infos d'un groupe, le visage d'un membre : la couleur ne bouge
        pas, le visage s'enfonce et PAS la ligne ; il s'ouvre en grand ;
     5. la discussion, le visage de qui écrit : pareil ;
     6. le reste de la ligne d'un membre garde son onde : on ne l'a retirée
        qu'aux visages ;
     7. aucune erreur.
   Sur la v331, les étapes 1 à 4 tombent : le vert du visage prend +35 de
   rouge sous le doigt.
   Usage : node banc-essai/visages.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 300) + ')' : '')); };

/* Le décor des groupes, sans serveur : Sam (admin, avec sa photo) a écrit. */
const DECOR = () => {
  window.__grpDecor = () => {
    const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
    document.documentElement.classList.add('is-standalone');
    compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
    grp.installe = true; grp.ouverts = true; grp.message = '';
    grp.etat = { participe: 'ok', moderateur: false, ouverts: true, photos: true };
    grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' }, 'u-4': { nom: 'Kim', couleur: '#E8C84C' } };
    grp.liste = [{ id: 'g-1', nom: 'Les amis', teinte: 2, ouvert: false, code: 'ABC234', nb_membres: 3, non_lus: 0, dernier_message: il(1), apercu: null }];
    grp.publics = [];
    grp.membres = { 'g-1': [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) },
                            { membre: 'u-2', role: 'admin', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) },
                            { membre: 'u-4', role: 'membre', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) }] };
    grp.fils = { 'g-1': { charge: true, tout: true, messages: [
      { id: 1, groupe: 'g-1', auteur: 'u-2', genre: 'texte', texte: 'Amen', donnees: {}, cree_le: il(0.5), masque: false, supprime_le: null }] } };
    /* La photo de Sam : un bleu franc, comme si le serveur l'avait donnée. */
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#2F5FB3'; x.fillRect(0, 0, 64, 64);
    poserPhotoSrv('u:u-2', 1, c.toDataURL('image/jpeg', 0.95));
  };
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      console.log('  — ' + tel);
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
        x.fillStyle = '#2E7D5B'; x.fillRect(0, 0, 64, 64);
        localStorage.setItem('bt_photo', c.toDataURL('image/jpeg', 0.95));
      });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(DECOR);
      await p.waitForTimeout(1200);
      const cdp = await ctx.newCDPSession(p);

      /* La couleur moyenne d'un carré de la boîte (« ou » : son centre, en
         fractions ; « t » : son côté), lue sur une vraie capture de l'écran. */
      const couleur = async (r, ou, t) => {
        const w = Math.max(4, Math.round(r.width * t)), h = Math.max(4, Math.round(r.height * t));
        const clip = { x: r.x + r.width * ou[0] - w / 2, y: r.y + r.height * ou[1] - h / 2, width: w, height: h };
        const png = (await p.screenshot({ clip })).toString('base64');
        return p.evaluate(async (b64) => {
          const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
          const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0);
          const d = x.getImageData(0, 0, c.width, c.height).data; let R = 0, G = 0, B = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
          return [Math.round(R / n), Math.round(G / n), Math.round(B / n)];
        }, png);
      };
      /* « :active » ne se pose pas sous un doigt simulé (Chromium sans écran) :
         on le pose par l'outil de développement, sur le bouton qui porte le
         visage, le temps de lire de combien il s'enfonce. */
      const echelleActive = async (selBouton) => {
        const s = await ctx.newCDPSession(p);
        await s.send('DOM.enable'); await s.send('CSS.enable');
        const { root } = await s.send('DOM.getDocument', { depth: -1 });
        const { nodeId } = await s.send('DOM.querySelector', { nodeId: root.nodeId, selector: selBouton });
        if (!nodeId) { await s.detach(); return null; }
        await s.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] });
        await p.waitForTimeout(260);
        const k = await p.evaluate((sb) => { const m = /matrix\(([^,]+)/.exec(getComputedStyle(document.querySelector(sb)).transform || ''); return m ? Math.round(parseFloat(m[1]) * 1000) / 1000 : 1; }, selBouton);
        await s.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
        await s.detach();
        return k;
      };
      /* Poser le doigt sur « sel » (à « ou » de sa boîte), l'y laisser 0,3 s,
         relever. « bouton » : le bouton qui le porte, s'il y en a un. */
      const toucher = async (sel, bouton, ou) => {
        ou = ou || [0.5, 0.5];
        const loc = p.locator(sel).first();
        await loc.scrollIntoViewIfNeeded().catch(() => {});
        await p.waitForTimeout(250);
        const r = await loc.boundingBox();
        const avant = await couleur(r, ou, 0.22);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.width * ou[0], y: r.y + r.height * ou[1] }] });
        await p.waitForTimeout(320);
        const sous = await couleur(r, ou, 0.22);
        const vu = await p.evaluate((sel) => {
          const a = document.querySelector(sel);
          const cs = getComputedStyle(a);
          return { ondes: [...document.querySelectorAll('.onde')].map(b => (b.className || '').toString().split(' ').slice(0, 2).join('.')),
            visage: cs.scale && cs.scale !== 'none' ? Math.round(parseFloat(cs.scale) * 1000) / 1000 : 1 };
        }, sel);
        vu.bouton = bouton ? await echelleActive(bouton) : null;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await p.waitForTimeout(650);
        const ecart = Math.max(...avant.map((v, i) => Math.abs(v - sous[i])));
        return { avant, sous, ecart, ...vu };
      };
      const detail = (m) => 'repos ' + m.avant.join(',') + ' · sous le doigt ' + m.sous.join(',') + ' · ondes ' + (m.ondes.join(' ') || 'aucune')
        + ' · visage ' + m.visage + (m.bouton !== null ? ' · bouton ' + m.bouton : '');
      const grand = () => p.evaluate(() => { const v = document.getElementById('photoGrandVeil'); const l = !!v; if (v) v.remove(); return l; });
      /* Rien ne doit rester par-dessus l'écran suivant (une feuille ouverte). */
      const ranger = () => p.evaluate(() => { document.querySelectorAll('.photo-veil, [id$="Veil"]').forEach(v => { try { if (v.id && typeof fermerFeuilleGroupe === 'function') fermerFeuilleGroupe(v.id); } catch (e) {} try { v.remove(); } catch (e) {} }); });

      /* 1 */
      let m = await toucher('.hero-profile .avatar', '.hero-profile');
      let ecran = await p.evaluate(() => state.screen);
      dit('1. accueil, mon visage : il ne se teinte pas, il s\'enfonce, il ouvre le Profil', m.ecart < 6 && !m.ondes.length && m.bouton < 0.99 && ecran === 'profile', detail(m) + ' · écran ' + ecran);
      await ranger();

      /* 2 */
      await p.evaluate(() => { state.screen = 'profile'; render(); });
      await p.waitForTimeout(700);
      /* Loin du petit appareil photo : sa zone de toucher (44 px) mord sur
         le visage, et lui ouvre le menu de la photo. */
      m = await toucher('.avatar-tap .avatar', '.avatar-tap', [0.32, 0.32]);
      const g2 = await grand();
      dit('2. Profil, mon visage : il ne se teinte pas, il s\'enfonce, il s\'ouvre en grand', m.ecart < 6 && !m.ondes.length && m.bouton < 0.99 && g2, detail(m) + ' · en grand ' + g2);
      await ranger();

      /* 3 */
      await p.evaluate(() => { __grpDecor(); state.screen = 'groupes'; render(); });
      await p.waitForTimeout(900);
      const a3 = await p.evaluate(() => !!document.querySelector('.grp-profil .avatar'));
      if (a3) {
        m = await toucher('.grp-profil .avatar', '.grp-profil');
        ecran = await p.evaluate(() => state.screen);
        dit('3. Groupes, mon visage en haut : il ne se teinte pas, il s\'enfonce, il ouvre le Profil', m.ecart < 6 && !m.ondes.length && m.bouton < 0.99 && ecran === 'profile', detail(m) + ' · écran ' + ecran);
        await ranger();
      } else dit('3. Groupes, mon visage en haut : présent', false, 'absent');

      /* 4 */
      await p.evaluate(() => { __grpDecor(); grp.courant = 'g-1'; state.screen = 'groupe'; render(); ouvrirInfosGroupe(true); });
      await p.waitForTimeout(1100);
      const selSam = '.grp-ligne .avatar[data-pid="u:u-2"]';
      const la4 = await p.evaluate((s) => !!document.querySelector(s), selSam);
      if (la4) {
        await p.evaluate((s) => document.querySelector(s).closest('.grp-ligne').setAttribute('data-banc', 'sam'), selSam);
        m = await toucher(selSam, '.grp-ligne[data-banc="sam"]');
        const g4 = await grand();
        dit('4. infos du groupe, le visage de Sam : il ne se teinte pas, lui s\'enfonce, pas la ligne ; il s\'ouvre en grand',
          m.ecart < 6 && !m.ondes.length && m.visage < 0.99 && m.bouton > 0.999 && g4, detail(m) + ' · en grand ' + g4);
        /* 6 — le nom, sur la même ligne : l'onde y est toujours. */
        const r6 = await p.locator('.grp-ligne[data-banc="sam"] .grp-txt').boundingBox();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r6.x + 20, y: r6.y + r6.height / 2 }] });
        await p.waitForTimeout(200);
        const onde6 = await p.evaluate(() => [...document.querySelectorAll('.onde')].map(b => (b.className || '').toString().split(' ').slice(0, 2).join('.')));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await p.waitForTimeout(700);
        dit('6. le reste de la ligne garde son onde', onde6.some(c => /grp-ligne/.test(c)), onde6.join(' ') || 'aucune');
      } else dit('4. infos du groupe : la ligne de Sam porte sa photo', false, 'absente');

      /* 5 */
      await ranger();
      await p.evaluate(() => { __grpDecor(); grp.courant = 'g-1'; state.screen = 'groupe'; render(); });
      await p.waitForTimeout(1100);
      const la5 = await p.evaluate(() => !!document.querySelector('#fil .b-av .avatar.a-photo'));
      if (la5) {
        m = await toucher('#fil .b-av .avatar', null);
        const g5 = await grand();
        dit('5. la discussion, le visage de Sam : il ne se teinte pas, il s\'enfonce, il s\'ouvre en grand', m.ecart < 6 && !m.ondes.length && m.visage < 0.99 && g5, detail(m) + ' · en grand ' + g5);
      } else dit('5. la discussion : le visage de Sam porte sa photo', false, 'absente');
      await ctx.close();
    }
    dit('7. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — un visage s\'enfonce sous le doigt, sans jamais prendre de couleur');
  process.exit(ko ? 1 : 0);
})();
