/* ====== BANC « LA BARRE DU BAS PART AVEC SA PAGE » (v333) ======
   « Lorsque je change de page, l'icône en bas où il y a Accueil et Messages
     ne disparaît pas parfaitement bien. » Capture de Taylor, de l'accueil au
   Profil : la barre encore là, à moitié fondue, glissée de côté, par-dessus
   la page qui arrive. Avec le verre du jeu (gl-xf, sur tous les téléphones),
   la page qu'on quitte disparaît net ; la barre prenait encore 0,2 s de
   fondu, seule. Filmé image par image, sur iPhone et sur Android :
     1. Accueil → Profil : à la première image du changement, la page qu'on
        quitte ET la barre ont disparu, et la barre ne reparaît à aucune
        image pendant que le Profil arrive ;
     2. Groupes → une discussion : pareil ;
     3. Accueil → une partie Solo (son réglage) : pareil ;
     4. Profil → Accueil : la barre revient AVEC la page, au même pas (son
        décalage suit celui de la page à chaque image), et se pose ;
     5. avec le verre peint (#paintedglass), où la page qu'on quitte s'efface
        de côté : la barre s'efface avec elle (même opacité à chaque image),
        et sous la page qui arrive ;
     6. aucune erreur.
   Usage : node banc-essai/barre-depart.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 320) + ')' : '')); };

const OUTILS = () => {
  /* Les groupes ouverts, sans serveur : la barre est là. */
  window.__grpDecor = () => {
    const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
    document.documentElement.classList.add('is-standalone');
    compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
    grp.installe = true; grp.ouverts = true; grp.message = '';
    grp.etat = { participe: 'ok', moderateur: false, ouverts: true };
    grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' } };
    grp.liste = [{ id: 'g-1', nom: 'Les amis', teinte: 2, ouvert: false, code: 'ABC234', nb_membres: 2, non_lus: 0, dernier_message: il(1), apercu: null }];
    grp.publics = [];
    grp.membres = { 'g-1': [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) }, { membre: 'u-2', role: 'membre', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) }] };
    grp.fils = { 'g-1': { charge: true, tout: true, messages: [{ id: 1, groupe: 'g-1', auteur: 'u-2', genre: 'texte', texte: 'Amen', donnees: {}, cree_le: il(0.5), masque: false, supprime_le: null }] } };
  };
  /* Ce qu'on voit d'un élément : son opacité (celle de ses parents comprise),
     et s'il est dans l'écran. */
  const vu = (e) => {
    if (!e || !e.isConnected) return 0;
    let o = 1;
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return 0;
      o *= parseFloat(s.opacity);
    }
    const r = e.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth || !r.width || !r.height) return 0;
    return o;
  };
  /* Filmer un changement de page : à chaque image, la barre, la page qui
     part, la page qui arrive (leurs décalages, leurs opacités). */
  window.__filmerChangement = (agir, ms) => new Promise((ok) => {
    const app = document.getElementById('app');
    const avant = [...app.children].find(c => c.classList && c.classList.contains('screen') && !c.classList.contains('screen-exit'));
    const film = [];
    let t0 = 0;
    const pas = () => {
      const t = performance.now() - t0;
      const b = document.getElementById('barreBas');
      const apres = [...app.children].find(c => c.classList && c.classList.contains('screen') && !c.classList.contains('screen-exit') && c !== avant);
      const rb = b ? b.getBoundingClientRect() : null;
      const dx = (e) => { if (!e) return null; const m = new DOMMatrixReadOnly(getComputedStyle(e).transform); return m.m41; };
      film.push({ t: Math.round(t), barre: +vu(b).toFixed(3), barreX: rb ? Math.round((rb.left + rb.width / 2 - innerWidth / 2) * 10) / 10 : null,
        barreZ: b ? getComputedStyle(b).zIndex : null, part: +vu(avant).toFixed(3), arrive: apres ? +vu(apres).toFixed(3) : 0,
        arriveX: apres ? dx(apres) : null });
      if (t < ms) requestAnimationFrame(pas); else ok(film);
    };
    requestAnimationFrame(() => { t0 = performance.now(); agir(); pas(); });
  });
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    const ouvrir = async (ua, hash) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL + (hash || ''));
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(OUTILS);
      await p.evaluate(() => { __grpDecor(); state.screen = 'mode'; render(); majBarre(); });
      await p.waitForTimeout(1300);
      return { ctx, p };
    };
    /* Le départ : aucune image où la barre se voit après le changement. */
    const depart = (film) => {
      const premiere = film[1] || film[0];
      const restes = film.slice(1).filter(f => f.barre > 0.01);
      return { ok: premiere.part === 0 && premiere.barre === 0 && !restes.length,
        d: 'image 1 : page ' + premiere.part + ', barre ' + premiere.barre + (restes.length ? ' · barre encore vue à ' + restes.slice(0, 4).map(f => f.t + ' ms (' + f.barre + ')').join(', ') : ' · jamais revue') };
    };
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      console.log('  — ' + tel);
      const { ctx, p } = await ouvrir(ua);
      const pret = await p.evaluate(() => { const b = document.getElementById('barreBas'); return !!b && !b.classList.contains('cachee') && document.documentElement.classList.contains('gl-xf'); });
      if (!pret) { dit('la barre est là à l\'accueil (verre du jeu)', false, 'absente'); await ctx.close(); continue; }

      /* 1 */
      let film = await p.evaluate(() => window.__filmerChangement(() => openProfile(), 700));
      let r = depart(film);
      dit('1. Accueil → Profil : la barre disparaît dans la même image que l\'accueil, et ne reparaît jamais', r.ok, r.d);

      /* 4 — le retour, avec la page. */
      await p.waitForTimeout(500);
      film = await p.evaluate(() => window.__filmerChangement(() => { state.screen = 'mode'; render(); }, 800));
      const suivi = film.filter(f => f.arriveX !== null && f.barre > 0.5).map(f => Math.abs((f.barreX || 0) - f.arriveX));
      const fin = film[film.length - 1];
      dit('4. Profil → Accueil : la barre revient avec la page, au même pas, et se pose',
        suivi.length >= 5 && Math.max(...suivi) <= 3 && fin.barre > 0.99 && Math.abs(fin.barreX) < 1,
        'écart page/barre au plus ' + (suivi.length ? Math.max(...suivi).toFixed(1) : '?') + ' px sur ' + suivi.length + ' images · posée à ' + (fin.barreX === null ? '?' : fin.barreX) + ' px');

      /* 2 */
      await p.evaluate(() => { __grpDecor(); state.screen = 'groupes'; render(); });
      await p.waitForTimeout(900);
      film = await p.evaluate(() => window.__filmerChangement(() => { grp.courant = 'g-1'; state.screen = 'groupe'; render(); }, 700));
      r = depart(film);
      dit('2. Groupes → une discussion : pareil', r.ok, r.d);

      /* 3 */
      await p.evaluate(() => { grp.courant = null; state.screen = 'mode'; render(); });
      await p.waitForTimeout(900);
      film = await p.evaluate(() => window.__filmerChangement(() => { state.mode = 'solo'; state.screen = 'setup'; render(); }, 700));
      r = depart(film);
      dit('3. Accueil → une partie Solo : pareil', r.ok, r.d);
      await ctx.close();

      /* 5 — le verre peint. */
      const v = await ouvrir(ua, '#paintedglass');
      const peint = await v.p.evaluate(() => !document.documentElement.classList.contains('gl-xf') && !document.documentElement.classList.contains('gl-native'));
      film = await v.p.evaluate(() => window.__filmerChangement(() => openProfile(), 700));
      const pendant = film.filter(f => f.part > 0.02 || f.barre > 0.02);
      const ecart = pendant.length ? Math.max(...pendant.map(f => Math.abs(f.barre - f.part))) : 1;
      const dessous = film.filter(f => f.barre > 0.02).every(f => +f.barreZ < 1);
      const finie = film[film.length - 1].barre === 0;
      dit('5. verre peint : la barre s\'efface avec la page (même opacité à chaque image), sous la page qui arrive',
        peint && pendant.length >= 3 && ecart <= 0.1 && dessous && finie,
        (peint ? '' : 'verre peint non actif · ') + pendant.length + ' images · écart max ' + ecart.toFixed(2) + ' · sous la page ' + dessous + ' · finie ' + finie);
      await v.ctx.close();
    }
    dit('6. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la barre du bas part et revient avec sa page, à l\'image près');
  process.exit(ko ? 1 : 0);
})();
