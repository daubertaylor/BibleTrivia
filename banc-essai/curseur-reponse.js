/* ====== BANC « LE CURSEUR, LÀ OÙ L'ON ÉCRIT » (v337) ======
   « Lorsque je clique sur un message pour lui répondre, le curseur
     d'écriture se met au mauvais endroit. » Sur iPhone, le curseur est
   dessiné par iOS, à la place qu'avait le champ quand il a reçu le foyer ;
   le clavier qui monte et la citation qui s'ouvre le déplacent ensuite. Le
   jeu lui fait recalculer sa place, une fois tout posé, par un aller-retour
   de la sélection. Ce banc ne voit pas le curseur d'iOS (Chromium peint le
   sien) : il vérifie le geste et qu'il ne coûte rien.
     1. toucher un message, champ sans foyer, un brouillon dedans : le
        curseur au bout du brouillon ;
     2. une fois tout posé (le tiroir, l'écran qui suit le clavier), l'aller-
        retour a lieu : la sélection va d'un cran et revient au même endroit ;
     3. … sans rien écrire : le texte, le brouillon, le bouton d'envoi sont
        les mêmes, aucun « input » n'est parti ;
     4. un champ vide : le caractère sans largeur entre et ressort dans la
        même tâche — le champ reste vide, l'invite revient, l'envoi reste
        éteint ;
     5. un champ qui avait déjà le foyer, le curseur au milieu : il y reste ;
     6. pendant une saisie en composition : rien ne bouge ;
     7. le clavier qui s'ouvre d'un toucher dans le champ (sans réponse) :
        l'aller-retour aussi, une fois l'écran rétréci ;
     8. sur Android, rien de tout cela : Chrome peint son curseur avec la page ;
     9. aucune erreur.
   Sur la v336 : 2, 4, 5 et 7 rouges — aucun aller-retour. (Le curseur y
   était déjà au bout du brouillon : un texte posé par le jeu y laisse le
   curseur.)
   Usage : node banc-essai/curseur-reponse.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const W = 402, H = 874, KB = 346;
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 300) + ')' : '')); if (!bon) ko++; };

async function telephone(nav, ua, brouillon){
  const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: ua, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.addInitScript((b) => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    /* Les écritures dans le champ, relevées sans rien changer à leur effet. */
    window.__sel = [];
    const vraie = HTMLTextAreaElement.prototype.setSelectionRange;
    HTMLTextAreaElement.prototype.setSelectionRange = function(a, b2, c){ if (this.id === 'compoTexte') window.__sel.push([Math.round(performance.now()), a, b2]); return vraie.apply(this, arguments); };
    window.__inputs = 0;
    document.addEventListener('input', (e) => { if (e.target && e.target.id === 'compoTexte') window.__inputs++; }, true);
    window.__b = b;
  }, brouillon || '');
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.documentElement.classList.add('is-standalone');
    const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
    compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 't@e.net' } }; compte.etape = 'connecte';
    grp.installe = true; grp.ouverts = true;
    grp.etat = { participe: 'ok', moderateur: false, ouverts: true, reponses: true };
    grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Chloé', couleur: '#7BC86B' } };
    grp.liste = [{ id: 'g-1', nom: 'Le club', teinte: 2, ouvert: false, code: 'ABC234', nb_membres: 2, non_lus: 0, dernier_message: il(0.1) }];
    grp.membres = { 'g-1': [{ membre: 'moi-0', role: 'membre', rejoint_le: il(5) }, { membre: 'u-2', role: 'proprietaire', rejoint_le: il(6) }] };
    const m = (id, auteur, texte, h) => ({ id, groupe: 'g-1', auteur, genre: 'texte', texte, donnees: {}, cree_le: il(h), masque: false, supprime_le: null });
    const l = []; for (let i = 1; i <= 14; i++) l.push(m(i, i % 2 ? 'u-2' : 'moi-0', 'Message numéro ' + i, 3 - i * 0.1));
    grp.fils = { 'g-1': { charge: true, tout: false, messages: l } };
    if (window.__b) brouillons['g-1'] = window.__b;
    grp.courant = 'g-1'; state.screen = 'groupe'; render();
  });
  await p.waitForTimeout(1200);
  await p.evaluate(([kb, h]) => {
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => (window.__kb ? h - kb : h) });
  }, [KB, H]);
  return { ctx, p, erreurs };
}
/* Le clavier d'iOS qui monte, en paliers, comme le voit le vrai module. */
const monterClavier = (p) => p.evaluate(([kb, h]) => { let n = 0; const palier = () => { n++; window.__kb = true; Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => h - Math.round(kb * Math.min(1, n / 5)) });
  window.visualViewport.dispatchEvent(new Event('resize')); if (n < 5) setTimeout(palier, 22); }; setTimeout(palier, 30); }, [KB, H]);
const etat = (p) => p.evaluate(() => { const t = document.getElementById('compoTexte'); return { v: t.value, s: t.selectionStart, e: t.selectionEnd, foyer: document.activeElement === t,
  envoi: document.getElementById('compoEnvoi').disabled, brouillon: brouillons['g-1'] || '', inputs: window.__inputs, sel: window.__sel.slice() }; });

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    /* 1 à 3 : un brouillon, le champ sans foyer */
    {
      const { ctx, p, erreurs: e } = await telephone(nav, IOS, 'Bonjour à tous');
      await p.evaluate(() => { window.__sel = []; toucherMessage('13'); });
      await monterClavier(p);
      const a = await etat(p);
      dit('1. toucher un message, un brouillon dans le champ : le foyer, le curseur au bout du brouillon', a.foyer && a.s === 14 && a.e === 14, JSON.stringify({ s: a.s, e: a.e, foyer: a.foyer }));
      await p.waitForTimeout(1100);
      const b = await etat(p);
      const apres = b.sel.slice(1).map(x => [x[1], x[2]]);
      dit('2. tout posé, la sélection va d\'un cran et revient', JSON.stringify(apres) === JSON.stringify([[13, 13], [14, 14]]) && b.s === 14 && b.e === 14, JSON.stringify(b.sel));
      dit('3. … sans rien écrire : même texte, même brouillon, envoi allumé, aucun « input »', b.v === 'Bonjour à tous' && b.brouillon === 'Bonjour à tous' && b.envoi === false && b.inputs === 0, JSON.stringify({ v: b.v, br: b.brouillon, envoi: b.envoi, inputs: b.inputs }));
      erreurs.push(...e);
      await ctx.close();
    }
    /* 4 : un champ vide */
    {
      const { ctx, p, erreurs: e } = await telephone(nav, IOS, '');
      const vide = await p.evaluate(() => new Promise(res => {
        window.__sel = []; toucherMessage('13');
        const t = document.getElementById('compoTexte'), vus = [];
        /* Ce qu'une image peindrait : relevé à chaque image jusqu'au recalage. */
        const t0 = performance.now();
        const pas = () => { vus.push(t.value); if (performance.now() - t0 < 1000) requestAnimationFrame(pas); else res({ vus: [...new Set(vus)], sel: window.__sel.slice(), v: t.value, s: t.selectionStart, inputs: window.__inputs,
          envoi: document.getElementById('compoEnvoi').disabled, invite: getComputedStyle(t, '::placeholder').opacity }); };
        requestAnimationFrame(pas);
      }));
      dit('4. un champ vide : l\'aller-retour a lieu, et aucune image ne voit le caractère sans largeur ; le champ reste vide, l\'envoi éteint, aucun « input »',
        vide.sel.length >= 2 && JSON.stringify(vide.vus) === JSON.stringify(['']) && vide.v === '' && vide.s === 0 && vide.inputs === 0 && vide.envoi === true, JSON.stringify(vide));
      erreurs.push(...e);
      await ctx.close();
    }
    /* 5 et 6 : le foyer déjà là, le curseur au milieu ; une composition */
    {
      const { ctx, p, erreurs: e } = await telephone(nav, IOS, 'Bonjour');
      await p.evaluate(() => { const t = document.getElementById('compoTexte'); t.focus({ preventScroll: true }); t.setSelectionRange(3, 3); window.__sel = []; toucherMessage('12'); });
      await p.waitForTimeout(1100);
      const c = await etat(p);
      dit('5. le foyer déjà là, le curseur au milieu : il y reste (et y revient après l\'aller-retour)', c.s === 3 && c.e === 3 && c.sel.length && c.sel[c.sel.length - 1][1] === 3, JSON.stringify({ s: c.s, sel: c.sel }));
      await p.evaluate(() => { const t = document.getElementById('compoTexte'); t.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); window.__sel = []; toucherMessage('11'); });
      await p.waitForTimeout(1100);
      const d = await etat(p);
      await p.evaluate(() => { document.getElementById('compoTexte').dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); });
      dit('6. pendant une saisie en composition : la sélection ne bouge pas', d.sel.length === 0 && d.s === 3, JSON.stringify(d.sel));
      erreurs.push(...e);
      await ctx.close();
    }
    /* 7 : le clavier ouvert d'un toucher dans le champ, sans réponse */
    {
      const { ctx, p, erreurs: e } = await telephone(nav, IOS, 'Salut');
      await p.evaluate(() => { window.__sel = []; const t = document.getElementById('compoTexte'); t.focus({ preventScroll: true }); t.setSelectionRange(5, 5); window.__sel = []; });
      await monterClavier(p);
      await p.waitForTimeout(1100);
      const f = await etat(p);
      dit('7. le clavier ouvert d\'un toucher dans le champ : l\'aller-retour aussi, une fois l\'écran rétréci', JSON.stringify(f.sel.map(x => [x[1], x[2]])) === JSON.stringify([[4, 4], [5, 5]]) && f.s === 5 && f.inputs === 0,
        JSON.stringify({ sel: f.sel, kb: await p.evaluate(() => document.documentElement.classList.contains('kb-fil')) }));
      erreurs.push(...e);
      await ctx.close();
    }
    /* 8 : Android */
    {
      const { ctx, p, erreurs: e } = await telephone(nav, AND, 'Bonjour');
      await p.evaluate(() => { window.__sel = []; toucherMessage('13'); });
      await monterClavier(p);
      await p.waitForTimeout(1100);
      const g = await etat(p);
      dit('8. sur Android : le curseur au bout du brouillon, et pas d\'aller-retour', g.s === 7 && g.sel.length <= 1 && g.sel.every(x => x[1] === 7 && x[2] === 7), JSON.stringify(g.sel));
      erreurs.push(...e);
      await ctx.close();
    }
    dit('9. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le curseur rejoint le champ, sans rien écrire');
  process.exit(ko ? 1 : 0);
})();
