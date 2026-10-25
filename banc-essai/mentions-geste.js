/* ====== BANC « LA LISTE DES @ S'OUVRE COMME LE RESTE DU JEU » (v335) ======
   « Lorsque j'appuie sur arobase, j'ai le petit truc “@tout le monde” qui
     s'affiche : vérifie l'animation d'ouverture pour qu'elle soit cohérente
     avec le reste du jeu, et que ce soit vraiment, vraiment parfait. »
   La liste fondait en entier, fond compris (0,2 s) : pendant plus de 100 ms
   on lisait les bulles de la discussion AU TRAVERS des noms ; taper une
   lettre la faisait sauter de quatre noms à un ; elle disparaissait sèche.
   Dans une discussion, sur un iPhone et un Android :
     1. l'ouverture a le geste d'une bulle qui arrive (bArrive : même durée,
        même courbe, depuis son bas), et la liste est OPAQUE dès le premier
        tiers du mouvement ;
     2. taper une lettre : sa hauteur suit en douceur, et son bas reste posé
        sur la barre d'écriture ;
     3. une espace : elle se retire (cnPart) avant de se cacher, et plus
        rien ne s'y choisit pendant qu'elle part ;
     4. un « @ » pendant qu'elle se retire : elle revient, entière ;
     5. Échap la retire de la même façon ;
     6. aucune erreur.
   Usage : node banc-essai/mentions-geste.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 400) + ')' : '')); };

/* Une discussion à quatre, posée à la main (comme langues-ecrans). */
const DECOR = () => {
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  compte.dispo = true; profile.name = 'Taylor';
  compte.session = { user: { id: 'moi-0', email: 'joueur@exemple.net' } }; compte.etape = 'connecte';
  grp.installe = true; grp.ouverts = true; grp.message = '';
  grp.etat = { participe: 'ok', moderateur: false, ouverts: true, photos: true };
  grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Sam', couleur: '#E8574C' },
                  'u-3': { nom: 'Lee', couleur: '#4CE88A' }, 'u-4': { nom: 'Kim', couleur: '#E8C84C' } };
  grp.liste = [{ id: 'g-1', nom: 'Les amis', teinte: 2, ouvert: false, code: 'ABC234', nb_membres: 4, non_lus: 0, dernier_message: il(1), apercu: null }];
  grp.membres = { 'g-1': [{ membre: 'moi-0', role: 'proprietaire', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) },
    { membre: 'u-2', role: 'membre', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) },
    { membre: 'u-3', role: 'membre', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) },
    { membre: 'u-4', role: 'membre', muet_jusqu: null, lu_jusqu: 9, rejoint_le: il(5) }] };
  const m = (id, auteur, texte) => ({ id, groupe: 'g-1', auteur, genre: 'texte', texte, donnees: {}, cree_le: il(0.5), masque: false, supprime_le: null });
  grp.fils = { 'g-1': { charge: true, tout: true, messages: [m(1, 'u-2', 'Bonjour à tous'), m(2, 'u-3', 'On joue ce soir ?'), m(3, 'moi-0', 'Amen')] } };
  grp.courant = 'g-1'; state.screen = 'groupe'; render();
};
const ECRIRE = (v) => { const t = document.getElementById('compoTexte'); t.value = v; t.setSelectionRange(v.length, v.length); majNoms(t); };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(DECOR);
      await p.waitForTimeout(1300);
      await p.evaluate(() => document.getElementById('compoTexte').focus({ preventScroll: true }));

      /* 1. l'ouverture, gelée et parcourue */
      const o = await p.evaluate((ECRIRE) => {
        eval('(' + ECRIRE + ')')('@');
        const z = document.getElementById('compoNoms');
        const a = z.getAnimations().find(x => x.animationName);
        if (!a) return { anim: null };
        a.pause();
        const t = a.effect.getTiming(), d = t.duration;
        const op = (f) => { a.currentTime = d * f; return +getComputedStyle(z).opacity; };
        /* (la courbe d'une animation CSS se lit dans son style : l'effet dit « linear ») */
        const res = { anim: a.animationName, d, easing: getComputedStyle(z).animationTimingFunction, origine: getComputedStyle(z).transformOrigin,
          a20: op(0.2), a35: op(0.35), a100: op(1), noms: z.querySelectorAll('.cn-nom').length };
        a.play();
        return res;
      }, ECRIRE.toString());
      const bulle = await p.evaluate(() => {
        const e = document.createElement('div'); e.className = 'b-arrive'; document.body.appendChild(e);
        const cs = getComputedStyle(e), r = { d: parseFloat(cs.animationDuration) * 1000, easing: cs.animationTimingFunction };
        e.remove(); return r;
      });
      const [ox, oy] = (o.origine || '').split(' ').map(parseFloat);
      dit('1. ' + tel + ' : le geste d\'une bulle qui arrive, depuis le bas, opaque dès le premier tiers',
        o.anim === 'cnArrive' && Math.abs(o.d - bulle.d) < 1 && o.easing === bulle.easing && oy > 0 && o.a35 >= 0.99 && o.a20 < 0.99 && o.a100 === 1 && o.noms === 4,
        JSON.stringify(Object.assign({}, o, { bulle })));
      await p.waitForTimeout(400);

      /* 2. taper une lettre */
      const f = await p.evaluate(async (ECRIRE) => {
        const z = document.getElementById('compoNoms'), r0 = z.getBoundingClientRect();
        eval('(' + ECRIRE + ')')('@S');
        const an = z.getAnimations().filter(x => !x.animationName);
        const etapes = [];
        for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 40)); const r = z.getBoundingClientRect(); etapes.push([Math.round(r.height), Math.round(r.bottom * 10) / 10]); }
        await new Promise(r => setTimeout(r, 200));
        const r1 = z.getBoundingClientRect();
        return { avant: Math.round(r0.height), apres: Math.round(r1.height), bas0: r0.bottom, bas1: r1.bottom, anime: an.length, etapes };
      }, ECRIRE.toString());
      const intermediaires = f.etapes.filter(([h]) => h < f.avant - 1 && h > f.apres + 1).length;
      const basFixe = f.etapes.every(([, b]) => Math.abs(b - f.bas0) < 0.6) && Math.abs(f.bas1 - f.bas0) < 0.6;
      dit('2. ' + tel + ' : une lettre de plus, la hauteur suit en douceur et le bas reste posé', f.anime >= 1 && f.apres < f.avant && intermediaires >= 2 && basFixe,
        f.avant + ' → ' + f.apres + ' px, étapes ' + f.etapes.map(x => x[0]).join('/') + ', bas ' + (basFixe ? 'fixe' : 'bouge'));

      /* 3. une espace : elle se retire */
      const r3 = await p.evaluate(async (ECRIRE) => {
        const z = document.getElementById('compoNoms');
        eval('(' + ECRIRE + ')')('@S ');
        const juste = { visible: !z.hidden, part: z.classList.contains('part'), pe: getComputedStyle(z).pointerEvents, proposes: nomsProposes.length,
          anim: (z.getAnimations().find(x => x.animationName) || {}).animationName };
        await new Promise(r => setTimeout(r, 320));
        return Object.assign(juste, { apresCache: z.hidden, vide: z.innerHTML === '' });
      }, ECRIRE.toString());
      dit('3. ' + tel + ' : une espace, elle se retire (cnPart) puis se cache ; rien ne se choisit pendant qu\'elle part',
        r3.visible && r3.part && r3.anim === 'cnPart' && r3.pe === 'none' && r3.proposes === 0 && r3.apresCache && r3.vide, JSON.stringify(r3));

      /* 4. rappelée pendant qu'elle part */
      const r4 = await p.evaluate(async (ECRIRE) => {
        const z = document.getElementById('compoNoms'), E = eval('(' + ECRIRE + ')');
        E('@S'); await new Promise(r => setTimeout(r, 300));
        E('@S '); await new Promise(r => setTimeout(r, 60));
        E('@');
        await new Promise(r => setTimeout(r, 400));
        return { visible: !z.hidden, part: z.classList.contains('part'), noms: z.querySelectorAll('.cn-nom').length, op: +getComputedStyle(z).opacity };
      }, ECRIRE.toString());
      dit('4. ' + tel + ' : un « @ » pendant qu\'elle part, elle revient entière', r4.visible && !r4.part && r4.noms === 4 && r4.op === 1, JSON.stringify(r4));

      /* 5. Échap */
      const r5 = await p.evaluate(async () => {
        const t = document.getElementById('compoTexte'), z = document.getElementById('compoNoms');
        toucheCompo(new KeyboardEvent('keydown', { key: 'Escape' }));
        const part = z.classList.contains('part');
        await new Promise(r => setTimeout(r, 320));
        return { part, cache: z.hidden };
      });
      dit('5. ' + tel + ' : Échap la retire de la même façon', r5.part && r5.cache, JSON.stringify(r5));
      await ctx.close();
    }
    dit('6. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — la liste des @ arrive comme une bulle, suit ce qu\'on tape, et se retire');
  process.exit(ko ? 1 : 0);
})();
