/* ====== BANC « LA COULEUR D'UN GROUPE, C'EST CELLE DE SON ICÔNE » (v333) ======
   « Quand je modifie un groupe et que je choisis la couleur, je préférerais
     que ce soit uniquement la couleur du logo, et pas la couleur de tout le
     groupe, des messages… Que le jeu ait une couleur très cohérente pour
     tout ce qui est message. » Sur iPhone et sur Android, deux groupes, l'un
   bleu-vert (teinte 5), l'autre or (teinte 1) :
     1. la discussion a EXACTEMENT les mêmes couleurs dans les deux — mes
        bulles, le bouton d'envoi, la manette, « Rejoindre la partie », une
        mention, une citation, les coches « vu par tout le monde » — et ce
        sont celles du jeu (le corail) ;
     2. l'écran d'une discussion ne porte aucune couleur de groupe ;
     3. l'icône du groupe, elle, porte sa couleur : dans l'en-tête de la
        discussion et dans la liste ;
     4. « Modifier le groupe » : toucher une couleur ne change que l'icône
        du formulaire ;
     5. le salon d'une partie lancée depuis le groupe ne porte aucune couleur
        de groupe ;
     6. aucune erreur.
   Usage : node banc-essai/couleur-icone.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 320) + ')' : '')); };

/* Deux groupes, chacun avec ce qui porte (portait) la couleur : une bulle à
   moi vue de tous, une mention de moi, une réponse citée, une partie lancée
   par Sam qu'on peut rejoindre. */
const DECOR = () => {
  window.__grpDecor = () => {
    const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
    document.documentElement.classList.add('is-standalone');
    compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 'j@e.net' } }; compte.etape = 'connecte';
    grp.installe = true; grp.ouverts = true; grp.message = '';
    grp.etat = { participe: 'ok', moderateur: false, ouverts: true, photos: true, logos: true, reponses: true };
    grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' } };
    const fil = (g) => ({ charge: true, tout: true, messages: [
      { id: 1, groupe: g, auteur: 'u-2', genre: 'texte', texte: 'Bonjour @Taylor', donnees: { mentions: ['moi-0'] }, cree_le: il(0.6), masque: false, supprime_le: null },
      { id: 2, groupe: g, auteur: 'moi-0', genre: 'texte', texte: 'Amen', donnees: { reponse: 1 }, cree_le: il(0.5), masque: false, supprime_le: null },
      { id: 3, groupe: g, auteur: 'u-2', genre: 'partie', texte: '', donnees: { code: 'ABCD' }, cree_le: new Date(Date.now() - 60000).toISOString(), masque: false, supprime_le: null },
      { id: 4, groupe: g, auteur: 'moi-0', genre: 'texte', texte: 'On joue ?', donnees: {}, cree_le: new Date(Date.now() - 30000).toISOString(), masque: false, supprime_le: null }] });
    grp.liste = [
      { id: 'g-1', nom: 'Les veilleurs', teinte: 5, ouvert: false, code: 'ABC234', nb_membres: 2, non_lus: 0, dernier_message: il(0.1), apercu: null },
      { id: 'g-2', nom: 'La chorale', teinte: 1, ouvert: false, code: 'DEF567', nb_membres: 2, non_lus: 0, dernier_message: il(0.2), apercu: null }];
    grp.publics = [];
    const membres = () => [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) },
                           { membre: 'u-2', role: 'membre', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) }];
    grp.membres = { 'g-1': membres(), 'g-2': membres() };
    grp.fils = { 'g-1': fil('g-1'), 'g-2': fil('g-2') };
  };
};

/* Ce qui se lit des couleurs d'une discussion ouverte. */
const COULEURS = () => {
  const cs = (sel, pr) => { const e = document.querySelector(sel); if (!e) return 'ABSENT'; const s = getComputedStyle(e); return pr.map(k => s[k]).join(' | '); };
  const ecran = document.querySelector('#app > .screen.groupe-ecran:not(.screen-exit)');
  return {
    bulle: cs('.b-moi .b-bulle:not(.b-partie)', ['backgroundImage', 'backgroundColor', 'color', 'boxShadow']),
    envoi: cs('#compoEnvoi', ['backgroundImage', 'backgroundColor', 'color', 'boxShadow']),
    manette: cs('.compo-jeu', ['color']),
    rejoindre: cs('.b-partie .grp-pill:not(.calme)', ['backgroundImage', 'backgroundColor', 'color']),
    icoPartie: cs('.b-partie .bp-ico', ['color']),
    mention: cs('.b-eux .b-bulle .mention', ['color']),
    citation: cs('.b-cite', ['backgroundColor']),
    citationNom: cs('.b-cite b', ['color']),
    vus: cs('.b-vu.tous', ['color']),
    styleEcran: ecran ? (ecran.getAttribute('style') || '') : 'PAS D\'ÉCRAN',
    icone: (document.querySelector('#grpTete .grp-av') || {}).getAttribute ? document.querySelector('#grpTete .grp-av').getAttribute('style') : '',
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
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(DECOR);
      const lire = async (g) => {
        await p.evaluate((g) => { __grpDecor(); grp.courant = g; state.screen = 'groupe'; render(); }, g);
        await p.waitForTimeout(900);
        return p.evaluate(COULEURS);
      };
      const a = await lire('g-1'), b = await lire('g-2');

      /* 1 */
      const ecarts = Object.keys(a).filter(k => !['styleEcran', 'icone'].includes(k) && a[k] !== b[k]);
      const absents = Object.keys(a).filter(k => a[k] === 'ABSENT');
      const corail = /240, 74, 38|218, 52, 20/.test(a.bulle) && /240, 74, 38|218, 52, 20/.test(a.envoi);
      dit('1. bleu-vert ou or : la discussion a exactement les mêmes couleurs, celles du jeu', !ecarts.length && !absents.length && corail,
        ecarts.length ? ecarts.map(k => k + ' : ' + a[k].slice(0, 70) + ' ≠ ' + b[k].slice(0, 70)).join(' · ') : (absents.length ? 'absents : ' + absents.join(', ') : 'bulle ' + a.bulle.slice(0, 90)));
      /* 2 */
      dit('2. l\'écran d\'une discussion ne porte aucune couleur de groupe', !a.styleEcran && !b.styleEcran, (a.styleEcran || '—') + ' / ' + (b.styleEcran || '—'));
      /* 3 */
      await p.evaluate(() => { state.screen = 'groupes'; render(); });
      await p.waitForTimeout(800);
      const liste = await p.evaluate(() => [...document.querySelectorAll('#grpMes .grp-ligne .grp-av')].map(e => e.getAttribute('style') || ''));
      const icone = /2FC1C6|14989E/i.test(a.icone) && /FBBF3C|F29A16/i.test(b.icone) && liste.length === 2 && /2FC1C6|14989E/i.test(liste.join(' ')) && /FBBF3C|F29A16/i.test(liste.join(' '));
      dit('3. l\'icône porte la couleur du groupe : en-tête de la discussion et liste', icone, 'en-tête ' + a.icone.slice(0, 50) + ' / ' + b.icone.slice(0, 50) + ' · liste ' + liste.map(x => x.slice(0, 50)).join(' / '));

      /* 4 — « Modifier le groupe », depuis la discussion. */
      await p.evaluate(() => { __grpDecor(); grp.courant = 'g-1'; state.screen = 'groupe'; render(); });
      await p.waitForTimeout(700);
      const avant = await p.evaluate(COULEURS);
      await p.evaluate(() => { ouvrirInfosGroupe(true); });
      await p.waitForTimeout(500);
      await p.evaluate(() => { ouvrirModifGroupe(); });
      await p.waitForTimeout(700);
      const f0 = await p.evaluate(() => (document.getElementById('grpFormAv') || {}).getAttribute ? document.getElementById('grpFormAv').getAttribute('style') : 'ABSENT');
      await p.locator('.grp-teinte').nth(2).tap();
      await p.waitForTimeout(500);
      const f1 = await p.evaluate(() => (document.getElementById('grpFormAv') || {}).getAttribute ? document.getElementById('grpFormAv').getAttribute('style') : 'ABSENT');
      const pendant = await p.evaluate(COULEURS);
      const bouge = Object.keys(avant).filter(k => k !== 'icone' && avant[k] !== pendant[k]);
      dit('4. Modifier le groupe : toucher une couleur ne change que l\'icône du formulaire', /2FC1C6|14989E/i.test(f0) && /5B9BF0|3A76DD/i.test(f1) && !bouge.length,
        'icône ' + f0.slice(0, 50) + ' → ' + f1.slice(0, 50) + (bouge.length ? ' · a bougé : ' + bouge.join(', ') : ''));
      await p.evaluate(() => { document.querySelectorAll('[id$="Veil"]').forEach(v => { try { fermerFeuilleGroupe(v.id); } catch (e) {} try { v.remove(); } catch (e) {} }); });

      /* 5 — le salon d'une partie lancée depuis le groupe. */
      await p.evaluate(() => { __grpDecor(); net.depuisGroupe = 'g-1'; net.isHost = true; net.code = '42CJ'; net.joueurs = {}; majAdversaire(); state.screen = 'online-room'; render(); });
      await p.waitForTimeout(800);
      const salon = await p.evaluate(() => { const e = document.querySelector('#app > .screen:not(.screen-exit)'); return { style: e ? e.getAttribute('style') || '' : 'ABSENT', groupe: !!document.querySelector('.salon-groupe') }; });
      dit('5. le salon d\'une partie du groupe ne porte aucune couleur de groupe', salon.groupe && !/--grp-/.test(salon.style), JSON.stringify(salon));
      await p.evaluate(() => { net.depuisGroupe = null; });
      await ctx.close();
    }
    dit('6. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la couleur d\'un groupe ne colore que son icône ; la discussion garde celle du jeu');
  process.exit(ko ? 1 : 0);
})();
