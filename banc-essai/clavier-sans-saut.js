/* ====== BANC « LE CLAVIER S'OUVRE SANS FAIRE SAUTER L'ÉCRAN » (v335) ======
   « Lorsque j'ouvre le clavier, je ne veux pas que le haut de l'écran saute :
     juste le clavier qui s'ouvre proprement. » Sa vidéo, image par image :
   au toucher de la barre d'écriture, iOS fait glisser la vue de 314 pt pour
   montrer le champ (son « reveal », animé avec le clavier), la zone visible
   annonce d'un coup sa position d'arrivée, le jeu s'y recale d'un coup :
   l'écran tombe d'une hauteur de clavier, puis remonte. WebKit ne fait pas
   ce glissement quand c'est la page qui donne le foyer avec preventScroll
   (WKContentView, _zoomToRevealFocusedElement). Ce banc ne peut pas faire
   glisser une vue comme iOS ; il vérifie ce qui l'en empêche. Sur un iPhone :
     1. un toucher bref sur la barre d'écriture d'une discussion : elle a le
        foyer, donné par la page AVEC preventScroll, le toucher lui-même
        n'ayant rien fait (son geste par défaut est retenu) ;
     2. le curseur est au bout du brouillon, et le clic du toucher a bien eu
        lieu (la liste des @ s'y règle) ;
     3. un doigt qui fait défiler en partant du champ : pas de foyer ;
     4. un appui long (coller) : laissé à iOS ;
     5. un champ qui a déjà le foyer : le toucher reste à iOS (placer le
        curseur) ;
     6. un champ d'une page (le nom d'un nouveau groupe) : le même foyer
        sans glissement ;
   et sur un Android :
     7. rien de tout cela — Chrome pose son clavier sans rien faire glisser,
        le toucher garde son chemin habituel ;
     8. aucune erreur.
   Avant la v335 : 1 et 6 rouges — le foyer venait du toucher lui-même.
   Usage : node banc-essai/clavier-sans-saut.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

/* Une discussion à deux, posée à la main (comme mentions-geste). */
const DECOR = () => {
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  compte.dispo = true; profile.name = 'Taylor';
  compte.session = { user: { id: 'moi-0', email: 'joueur@exemple.net' } }; compte.etape = 'connecte';
  grp.installe = true; grp.ouverts = true; grp.message = '';
  grp.etat = { participe: 'ok', moderateur: false, ouverts: true, photos: true };
  grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' } };
  grp.liste = [{ id: 'g-1', nom: 'Teste', teinte: 2, ouvert: false, code: 'ABC234', nb_membres: 2, non_lus: 0, dernier_message: il(1), apercu: null }];
  grp.membres = { 'g-1': [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) },
    { membre: 'u-2', role: 'membre', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) }] };
  const m = (id, auteur, texte) => ({ id, groupe: 'g-1', auteur, genre: 'texte', texte, donnees: {}, cree_le: il(0.5), masque: false, supprime_le: null });
  grp.fils = { 'g-1': { charge: true, tout: true, messages: [m(1, 'u-2', 'Bonjour'), m(2, 'moi-0', 'Amen')] } };
  grp.courant = 'g-1'; state.screen = 'groupe'; render();
};
/* Chaque foyer donné par la page est noté, avec ses options ; chaque clic
   et chaque toucher retenu aussi. */
const ESPION = () => {
  window.__foyers = []; window.__clics = 0; window.__retenus = 0;
  const f = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (o) { window.__foyers.push({ id: this.id || this.className, sansGlisser: !!(o && o.preventScroll) }); return f.apply(this, arguments); };
  document.addEventListener('click', (e) => { if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) window.__clics++; }, true);
  window.addEventListener('touchend', (e) => { if (e.defaultPrevented) window.__retenus++; });
};
const centre = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width * 0.6, y: r.top + r.height / 2 }; }, sel);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('bt_brouillons', JSON.stringify({ 'g-1': 'Merci pour' })); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(DECOR);
      await p.waitForTimeout(1300);
      await p.evaluate(ESPION);
      const cdp = await ctx.newCDPSession(p);
      const doigt = async (pts, tenir) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0].x, y: pts[0].y }] });
        if (tenir) await p.waitForTimeout(tenir);
        for (const q of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q.x, y: q.y }] }); await p.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await p.waitForTimeout(250);
      };
      const lire = () => p.evaluate(() => {
        const a = document.activeElement, t = document.getElementById('compoTexte');
        return { foyer: a && (a.id || a.className), foyers: window.__foyers.slice(), clics: window.__clics, retenus: window.__retenus,
          curseur: t ? t.selectionStart : -1, long: t ? t.value.length : -1 };
      });
      const raz = () => p.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); window.__foyers = []; window.__clics = 0; window.__retenus = 0; });

      const c = await centre(p, '#compoTexte');
      if (tel === 'iPhone') {
        /* 1 et 2 */
        await p.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = 'Merci pour'; surSaisie(t); });
        await raz();
        await doigt([c]);
        const r1 = await lire();
        const parPage = r1.foyers.filter(f => f.id === 'compoTexte');
        dit('1. iPhone : un toucher bref sur la barre d\'écriture lui donne le foyer, par la page, sans glissement', r1.foyer === 'compoTexte' && parPage.length === 1 && parPage[0].sansGlisser && r1.retenus === 1, JSON.stringify(r1));
        dit('2. iPhone : le curseur au bout du brouillon, et le clic du toucher a eu lieu', r1.curseur === r1.long && r1.long === 10 && r1.clics >= 1, 'curseur ' + r1.curseur + '/' + r1.long + ', clics ' + r1.clics);
        /* 3 */
        await raz();
        await doigt([c, { x: c.x, y: c.y - 30 }, { x: c.x, y: c.y - 70 }]);
        const r3 = await lire();
        dit('3. iPhone : un doigt qui fait défiler en partant du champ ne donne pas le foyer', r3.foyer !== 'compoTexte' && !r3.foyers.length && !r3.retenus, JSON.stringify(r3));
        /* 4 */
        await raz();
        await doigt([c], 650);
        const r4 = await lire();
        dit('4. iPhone : l\'appui long reste à iOS (rien de retenu, pas de foyer donné par la page)', !r4.foyers.some(f => f.sansGlisser) && !r4.retenus, JSON.stringify(r4));
        /* 5 */
        await raz();
        await p.evaluate(() => document.getElementById('compoTexte').focus());
        await p.evaluate(() => { window.__foyers = []; window.__retenus = 0; });
        await doigt([{ x: c.x - 40, y: c.y }]);
        const r5 = await lire();
        dit('5. iPhone : un champ qui a déjà le foyer garde le toucher d\'iOS (placer le curseur)', r5.foyer === 'compoTexte' && !r5.foyers.length && !r5.retenus, JSON.stringify(r5));
        /* 6 : le nom d'un nouveau groupe, dans sa page */
        await raz();
        await p.evaluate(() => { document.activeElement && document.activeElement.blur(); state.screen = 'groupes'; render(); });
        await p.waitForTimeout(900);
        const ouvert = await p.evaluate(() => { try { ouvrirCreation(); return true; } catch (e) { return String(e); } });
        await p.waitForTimeout(1100);
        const sel = await p.evaluate(() => { const i = [...document.querySelectorAll('.sheet-veil input[type=text], .sheet-veil input:not([type])')].find(x => x.getBoundingClientRect().height > 0); if (!i) return null; i.setAttribute('data-banc', '1'); return '[data-banc="1"]'; });
        if (!sel) dit('6. iPhone : le champ du nom d\'un nouveau groupe', false, 'page introuvable (' + ouvert + ')');
        else {
          await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.__foyers = []; window.__retenus = 0; });
          const c6 = await centre(p, sel);
          await doigt([c6]);
          const r6 = await p.evaluate((s) => ({ a: document.activeElement === document.querySelector(s), foyers: window.__foyers.slice(), retenus: window.__retenus }), sel);
          dit('6. iPhone : le nom d\'un nouveau groupe prend le foyer de la même façon', r6.a && r6.foyers.length === 1 && r6.foyers[0].sansGlisser && r6.retenus === 1, JSON.stringify(r6));
        }
      } else {
        /* 7 */
        await raz();
        await doigt([c]);
        const r7 = await lire();
        dit('7. Android : le toucher garde son chemin habituel (foyer donné par le navigateur, rien de retenu)', r7.foyer === 'compoTexte' && !r7.foyers.some(f => f.sansGlisser) && !r7.retenus, JSON.stringify(r7));
      }
      await ctx.close();
    }
    dit('8. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — sur iPhone, le clavier s\'ouvre sans que la vue glisse');
  process.exit(ko ? 1 : 0);
})();
