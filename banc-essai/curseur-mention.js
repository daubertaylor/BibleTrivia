/* ====== BANC « LE CURSEUR APRÈS UNE MENTION, ET APRÈS LE CLAVIER » (v339) ======
   « Lorsque je mentionne quelqu'un, le curseur d'écriture se met au mauvais
     endroit. » (capture : une réponse en cours, le clavier de l'iPhone levé.)
   Deux choses changeaient le texte ou la place du champ sans qu'iOS le sache :
   - le nom choisi remplaçait le texte d'un coup (t.value = …) : le clavier
     de l'iPhone — suggestions, correction, curseur — croyait encore le mot
     « @Ch » en cours. Il s'écrit maintenant comme une saisie (insertText) ;
   - le recalage du curseur (v337) partait à heure fixe, 0,58 s après le
     premier pas du clavier ; or l'écran se rétrécit en 0,52 s APRÈS LE
     DERNIER pas, et le clavier d'un iPhone monte en plusieurs. Il part
     maintenant de la fin du mouvement.
   Ce banc ne voit pas le curseur d'iOS (Chromium peint le sien) : il
   vérifie les gestes.
     1. « @Ch », puis Chloé dans la liste : le nom s'écrit par une saisie
        (insertText, « @Chloé  »), le curseur au bout, la liste refermée, le
        foyer gardé ;
     2. au milieu d'une phrase (« Salut @Ch et bonjour ») : « Salut @Chloé et
        bonjour », sans double espace, le curseur après l'espace qui suit ;
     3. « Annuler » défait le nom (la saisie est dans l'historique du champ) ;
     4. sur iPhone, le curseur se recale juste après (l'aller-retour de la
        sélection) ; sur Android, non ;
     5. répondre à un message, le clavier montant en huit pas sur 0,4 s :
        le recalage n'a lieu qu'UNE fois, et seulement quand l'écran a fini
        de se rétrécir (après la fin de sa transition) ;
     6. aucune erreur.
   Sur la v338 : 1, 3, 4 et 5 rouges.
   Usage : node banc-essai/curseur-mention.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const W = 402, H = 874, KB = 346;
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 320) + ')' : '')); if (!bon) ko++; };

async function telephone(nav, ua){
  const ctx = await nav.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: ua, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
    window.__in = [];
    document.addEventListener('input', (e) => { if (e.target && e.target.id === 'compoTexte') window.__in.push([e.inputType || '', e.data || '']); }, true);
    window.__sel = [];
    const vraie = HTMLTextAreaElement.prototype.setSelectionRange;
    HTMLTextAreaElement.prototype.setSelectionRange = function(a, b2){ if (this.id === 'compoTexte') window.__sel.push([Math.round(performance.now()), a, b2]); return vraie.apply(this, arguments); };
    window.__fin = [];
    document.addEventListener('transitionend', (e) => { if (e.target && e.target.id === 'app' && e.propertyName === 'height') window.__fin.push(Math.round(performance.now())); }, true);
  });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.documentElement.classList.add('is-standalone');
    const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
    compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 't@e.net' } }; compte.etape = 'connecte';
    grp.installe = true; grp.ouverts = true;
    grp.etat = { participe: 'ok', moderateur: false, ouverts: true, reponses: true };
    grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Chloé', couleur: '#7BC86B' }, 'u-3': { nom: 'Benoît', couleur: '#E8734C' } };
    grp.liste = [{ id: 'g-1', nom: 'Le club', teinte: 2, ouvert: false, code: 'ABC234', nb_membres: 3, non_lus: 0, dernier_message: il(0.1) }];
    grp.membres = { 'g-1': [{ membre: 'moi-0', role: 'membre', rejoint_le: il(5) }, { membre: 'u-2', role: 'proprietaire', rejoint_le: il(6) }, { membre: 'u-3', role: 'membre', rejoint_le: il(4) }] };
    const m = (id, auteur, texte, h) => ({ id, groupe: 'g-1', auteur, genre: 'texte', texte, donnees: {}, cree_le: il(h), masque: false, supprime_le: null });
    const l = []; for (let i = 1; i <= 14; i++) l.push(m(i, i % 2 ? 'u-2' : 'moi-0', 'Message numéro ' + i, 3 - i * 0.1));
    grp.fils = { 'g-1': { charge: true, tout: false, messages: l } };
    grp.courant = 'g-1'; state.screen = 'groupe'; render();
  });
  await p.waitForTimeout(1200);
  await p.evaluate(([kb, h]) => {
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => (window.__kb ? h - kb : h) });
  }, [KB, H]);
  return { ctx, p, erreurs };
}
/* Écrire dans le champ comme au clavier, le champ ayant le foyer. */
const ecrire = async (p, texte, curseur) => {
  await p.evaluate(([texte, curseur]) => {
    const t = document.getElementById('compoTexte');
    t.focus({ preventScroll: true });
    t.value = texte; t.setSelectionRange(curseur, curseur);
    t.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: texte.slice(-1) }));
    window.__in = []; window.__sel = [];
  }, [texte, curseur]);
  await p.waitForTimeout(350);
};
const choisir = async (p, nom) => {
  const ok = await p.evaluate((nom) => { const b = [...document.querySelectorAll('#compoNoms .cn-nom')].find(x => x.textContent.includes(nom)); if (!b) return false; b.click(); return true; }, nom);
  await p.waitForTimeout(450);
  return ok;
};
const lire = (p) => p.evaluate(() => { const t = document.getElementById('compoTexte'), z = document.getElementById('compoNoms');
  return { v: t.value, s: t.selectionStart, e: t.selectionEnd, foyer: document.activeElement === t, liste: !z.hidden && !z.classList.contains('part'),
    in: window.__in.slice(), sel: window.__sel.slice() }; });

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    /* 1 à 4 : sur iPhone */
    {
      const { ctx, p, erreurs: e } = await telephone(nav, IOS);
      await ecrire(p, '@Ch', 3);
      const liste1 = await p.evaluate(() => !document.getElementById('compoNoms').hidden);
      const c1 = await choisir(p, 'Chloé');
      const a = await lire(p);
      dit('1. « @Ch », puis Chloé : le nom s\'écrit par une saisie (insertText), le curseur au bout, la liste refermée, le foyer gardé',
        liste1 && c1 && a.v === '@Chloé ' && a.s === 7 && a.e === 7 && !a.liste && a.foyer && a.in.length >= 1 && a.in[0][0] === 'insertText' && a.in[0][1] === '@Chloé ',
        JSON.stringify(a));
      /* 4 (iPhone) : l'aller-retour de la sélection, juste après */
      const r4 = a.sel.slice(1).map(x => [x[1], x[2]]);
      dit('4a. sur iPhone, le curseur se recale juste après le nom (la sélection va d\'un cran et revient)', JSON.stringify(r4.slice(-2)) === JSON.stringify([[6, 6], [7, 7]]), JSON.stringify(a.sel));

      await ecrire(p, 'Salut @Ch et bonjour', 9);
      const c2 = await choisir(p, 'Chloé');
      const b = await lire(p);
      dit('2. au milieu d\'une phrase : « Salut @Chloé et bonjour », sans double espace, le curseur après l\'espace qui suit',
        c2 && b.v === 'Salut @Chloé et bonjour' && b.s === 13 && b.e === 13 && b.foyer, JSON.stringify(b));

      const u = await p.evaluate(() => { const t = document.getElementById('compoTexte'); t.focus(); const ok = document.execCommand('undo'); return { ok, v: t.value }; });
      dit('3. « Annuler » défait le nom : la saisie est dans l\'historique du champ', u.ok && u.v === 'Salut @Ch et bonjour', JSON.stringify(u));
      erreurs.push(...e);
      await ctx.close();
    }
    /* 4 (Android) */
    {
      const { ctx, p, erreurs: e } = await telephone(nav, AND);
      await ecrire(p, '@Be', 3);
      await choisir(p, 'Benoît');
      const a = await lire(p);
      dit('4b. sur Android, le nom s\'écrit pareil, et rien ne bouge ensuite (Chrome peint son curseur avec la page)',
        a.v === '@Benoît ' && a.s === 8 && a.in.length >= 1 && a.in[0][0] === 'insertText'
          && JSON.stringify(a.sel.map(x => [x[1], x[2]])) === JSON.stringify([[0, 3], [8, 8]]), JSON.stringify(a));
      erreurs.push(...e);
      await ctx.close();
    }
    /* 5 : répondre, le clavier en huit pas */
    {
      const { ctx, p, erreurs: e } = await telephone(nav, IOS);
      const r = await p.evaluate(([kb, h]) => new Promise(res => {
        window.__sel = []; window.__fin = [];
        const t0 = Math.round(performance.now());
        toucherMessage('13');
        let n = 0;
        const pas = () => { n++; window.__kb = true; Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => h - Math.round(kb * Math.min(1, n / 8)) });
          window.visualViewport.dispatchEvent(new Event('resize')); if (n < 8) setTimeout(pas, 55); };
        setTimeout(pas, 30);
        setTimeout(() => res({ t0, sel: window.__sel.slice(), fin: window.__fin.slice(), kb: document.documentElement.classList.contains('kb-fil') }), 2200);
      }), [KB, H]);
      /* le premier relevé est le curseur posé au foyer ; puis les allers-retours */
      const allers = r.sel.slice(1);
      const finT = r.fin.length ? r.fin[r.fin.length - 1] : null;
      dit('5. répondre, le clavier en huit pas : un seul recalage, et seulement quand l\'écran a fini de se rétrécir',
        r.kb && allers.length === 2 && finT !== null && allers[0][0] >= finT, JSON.stringify({ t0: r.t0, sel: r.sel, fin: r.fin }));
      erreurs.push(...e);
      await ctx.close();
    }
    dit('6. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — le nom s\'écrit comme une saisie, et le curseur se recale quand tout est posé');
  process.exit(ko ? 1 : 0);
})();
