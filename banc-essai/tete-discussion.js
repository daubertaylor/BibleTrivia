/* ====== LA BARRE D'UNE DISCUSSION A LA HAUTEUR DES AUTRES (v314) ======
   « Quand je reviens en arrière d'un groupe, en arrivant sur la page, le haut
     se déforme légèrement. » La barre d'une discussion faisait 63,9 px, celle
     de la liste des groupes 58,5 : au retour, elle perdait 5 px d'un coup.
   Sur un iPhone 16 Pro et sur un SE :
     1. la barre d'une discussion a EXACTEMENT la hauteur et la place de celle
        de la liste ;
     2. le nom du groupe et sa ligne « membres » s'y lisent en entier (rien de
        coupé) ;
     3. aucune erreur.
   Usage : node banc-essai/tete-discussion.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + d + ')' : '')); };
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  for (const [W, H, nom] of [[402, 874, 'iPhone 16 Pro'], [375, 667, 'iPhone SE']]) {
    const ctx = await nav.newContext({ viewport: { width: W, height: H }, userAgent: IOS, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    const r = await p.evaluate(async () => {
      for (const f of ['compteDemarrer', 'sonderComptes', 'ouvrirGroupes', 'chargerListes', 'chargerMembres', 'chargerEtatGroupes', 'chargerProfils', 'abonnerGroupes', 'chargerTousGroupes', 'chargerModeration']) window[f] = function(){ return Promise.resolve(); };
      window.chargerFil = async function(){};
      compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
      grp.installe = true; grp.ouverts = true; grp.etat = { participe: 'ok', moderateur: true, a_traiter: 0 };
      grp.liste = [{ id: 'g1', nom: 'Les amis du jeudi soir, et leurs familles', teinte: 2, non_lus: 0, nb_membres: 12, code: '7UHF5T', role: 'proprietaire', ouvert: true }];
      grp.membres = { g1: [] }; grp.profils = {}; grp.fils = { g1: { charge: true, tout: true, messages: [] } };
      const boite = () => { const e = document.querySelector('#app > .screen:not(.screen-exit) .app-header'); const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1) }; };
      state.screen = 'groupes'; render(); await new Promise(r => setTimeout(r, 900));
      const liste = boite();
      grp.courant = 'g1'; state.screen = 'groupe'; render(); await new Promise(r => setTimeout(r, 900));
      const fil = boite();
      const coupe = [...document.querySelectorAll('.grp-fil-tete .grp-txt > *')].map(e => {
        const b = e.getBoundingClientRect(), t = document.querySelector('.grp-fil-tete').getBoundingClientRect();
        return b.top >= t.top - 0.5 && b.bottom <= t.bottom + 0.5 && e.scrollHeight <= e.clientHeight + 1; });
      return { liste, fil, entier: coupe.length === 2 && coupe.every(Boolean) };
    });
    dit(nom + ' : la barre d\'une discussion a la hauteur et la place de celle de la liste', Math.abs(r.liste.h - r.fil.h) < 0.5 && Math.abs(r.liste.top - r.fil.top) < 0.5, 'liste ' + r.liste.h + ' px, discussion ' + r.fil.h + ' px');
    dit(nom + ' : le nom du groupe et ses membres s\'y lisent en entier', r.entier);
    await ctx.close();
  }
  dit('aucune erreur', errs.length === 0, errs.slice(0, 2).join(' | '));
  await nav.close();
  console.log(ko ? '\n  ECHEC — ' + ko + ' point(s)' : '\n  OK — la barre ne change plus de taille d\'un écran à l\'autre');
  process.exit(ko ? 1 : 0);
})();
