/* ====== LE CLAVIER NE CACHE JAMAIS CE QU'ON ÉCRIT — iOS ET ANDROID, POUR DE VRAI (v314) ======
   « Sur le truc pour se connecter, le clavier cache ce qu'on écrit. Règle ça
     sur iOS et Android. »

   LES AUTRES BANCS DU CLAVIER RÉTRÉCISSENT LA FENÊTRE (setViewportSize). Ce
   n'est le comportement d'AUCUN des deux téléphones aujourd'hui :
     - iOS ne touche pas à la page : seule la zone visible (visualViewport)
       rétrécit ;
     - Android, avec interactive-widget=overlays-content (l'en-tête du jeu
       depuis la v254), ne rétrécit RIEN DU TOUT — ni la page, ni la zone
       visible. Le clavier ne se connaît que par navigator.virtualKeyboard
       (boundingRect, « geometrychange »).
   Ce banc remplace donc visualViewport et navigator.virtualKeyboard par des
   doublures fidèles, fait monter le clavier par paliers sans redimensionner
   la page, et regarde où finit le champ actif. Avant la v314, sur Android, le
   jeu ne voyait jamais le clavier : l'adresse et le code de la connexion, au
   bas du Profil, finissaient dessous, bouton compris.

   Pour chaque téléphone (deux iPhone, deux Android) : l'adresse et le code de
   la connexion au Profil et aux Groupes, le nom du Profil, le dernier joueur
   du mode Groupe. Exigé : le champ entièrement au-dessus du clavier ; dans la
   carte de connexion, le bouton qui envoie aussi ; aucune erreur.

   Usage : node banc-essai/clavier-vrai.js [url]   (défaut : http://127.0.0.1:8099/index.html) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const TEL = [['SE', 375, 667, 260, 'ios'], ['iPhone 15', 393, 852, 336, 'ios'], ['Pixel 8', 412, 915, 320, 'android'], ['Petit Android', 360, 740, 290, 'android']];
const FAUX = (sys) => {
  window.__sys = sys;
  const ev = new EventTarget();
  const etat = { kb: 0 };
  const fauxVV = {
    get width(){ return innerWidth; },
    get height(){ return sys === 'ios' ? innerHeight - etat.kb : innerHeight; },
    get offsetTop(){ return 0; }, get offsetLeft(){ return 0; }, get pageTop(){ return 0; }, get pageLeft(){ return 0; }, get scale(){ return 1; },
    addEventListener: ev.addEventListener.bind(ev), removeEventListener: ev.removeEventListener.bind(ev), dispatchEvent: ev.dispatchEvent.bind(ev),
  };
  Object.defineProperty(window, 'visualViewport', { configurable:true, get(){ return fauxVV; } });
  const vk = new EventTarget();
  let rect = new DOMRect(0, 0, 0, 0);
  vk.overlaysContent = false; vk.show = () => {}; vk.hide = () => {};
  Object.defineProperty(vk, 'boundingRect', { get(){ return rect; } });
  if (sys === 'android') Object.defineProperty(navigator, 'virtualKeyboard', { configurable:true, get(){ return vk; } });
  window.__clavier = (h) => {
    etat.kb = h;
    if (sys === 'ios') fauxVV.dispatchEvent(new Event('resize'));
    else { rect = h > 0 ? new DOMRect(0, innerHeight - h, innerWidth, h) : new DOMRect(0, 0, 0, 0); vk.dispatchEvent(new Event('geometrychange')); }
  };
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let caches = 0;
  for (const [nom, W, H, K, sys] of TEL) {
    const ctx = await b.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:2, userAgent: sys === 'ios' ? IOS : AND, isMobile:true, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/supabase-js@2*', (route) => route.fulfill({ status:200, contentType:'application/javascript', body:'' }));
    await p.addInitScript(FAUX, sys);
    await p.addInitScript(() => {
      /* Un compte et un groupe, pour la feuille et la discussion (le décor de
         couleurs.js, réduit) ; et le retour « sans compte » pour la connexion. */
      window.__grpDecor = () => {
        compte.dispo = true; compte.session = { user:{ id:'moi-0', email:'joueur@exemple.net' } }; compte.etape = 'connecte';
        grp.installe = true; grp.ouverts = true; grp.message = '';
        grp.etat = { participe:'ok', moderateur:false, ouverts:true, a_traiter:0 };
        grp.profils = { 'moi-0':{ nom:'Taylor', couleur:'#4C86E8' }, 'u-2':{ nom:'Sam', couleur:'#E8574C' } };
        grp.liste = [{ id:'g-1', nom:'Lee', teinte:2, ouvert:false, code:'ABC234', nb_membres:2, non_lus:0, dernier_message:new Date().toISOString(), apercu:null }];
        grp.publics = []; grp.membres = { 'g-1':[ { membre:'moi-0', role:'proprietaire', muet_jusqu:null }, { membre:'u-2', role:'membre', muet_jusqu:null } ] };
        const m = (id, auteur, texte) => ({ id, groupe:'g-1', auteur, genre:'texte', texte, donnees:{}, cree_le:new Date().toISOString(), masque:false, supprime_le:null });
        grp.fils = { 'g-1':{ charge:true, tout:true, messages:[ m(1, 'u-2', 'Bonjour'), m(2, 'moi-0', 'Amen') ] } };
        grp.courant = 'g-1';
      };
      window.__sansCompte = () => { compte.session = null; grp.etat = null; grp.courant = null; };
    });
    await p.addInitScript(() => {
      localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1');
      localStorage.setItem('bt_compte_ok', JSON.stringify({ ok:true, quand:Date.now() }));
      localStorage.setItem('bt_google_ok', JSON.stringify({ ok:false, quand:Date.now() }));
      localStorage.setItem('bt_groupes_sonde', JSON.stringify({ installe:true, ouverts:false, version:1, modo:false, quand:Date.now() }));
    });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const cas = [['profile', 'choix', '#compteMail'], ['profile', 'code', '#compteCode'], ['groupes', 'choix', '#compteMail'], ['groupes', 'code', '#compteCode'],
                 ['profile', 'nom', '#profileName, .profile-name-input, input.text-input'], ['setup', 'joueur', '.team-row:nth-last-child(1 of .team-row) input'],
                 /* Ce qui se règle sur la même mesure : une feuille posée en bas
                    (« J'ai un code »), et le champ d'une discussion. */
                 ['groupes', 'feuille', '#grpCode'], ['groupe', 'fil', '#compoTexte']];
    for (const [ou, etape, sel] of cas) {
      await p.evaluate(([ou, etape]) => {
        window.__clavier(0);
        document.activeElement && document.activeElement.blur && document.activeElement.blur();
        compte.etape = 'repos'; compte.message = '';
        document.querySelectorAll('.sheet-veil, .modal-veil').forEach(v => v.remove());
        if (ou === 'setup') { state.mode = 'group'; state.teams = Array.from({length:6}, (_, i) => ({ name:'Joueur ' + (i + 1) })); }
        if (etape === 'feuille' || etape === 'fil') window.__grpDecor(); else window.__sansCompte();
        state.screen = ou; render();
        if (ou === 'groupes' && etape !== 'feuille') ouvrirGroupes();
        if (etape === 'feuille') ouvrirCode();
        if (etape === 'fil') majCompo();
        if (etape === 'choix' || etape === 'code') setTimeout(() => { if (etape === 'code') { compte.etape = 'code'; compte.courriel = 'taylor@exemple.net'; } else compte.etape = 'choix'; majCarteCompte(); }, 500);
      }, [ou, etape]);
      await p.waitForTimeout(1500);
      await p.evaluate((sel) => { const i = document.querySelector(sel); i && i.focus(); }, sel);
      await p.waitForTimeout(80);
      for (let i = 1; i <= 12; i++) { await p.evaluate((h) => window.__clavier(h), Math.round(K * i / 12)); await p.waitForTimeout(22); }
      await p.waitForTimeout(1300);
      const m = await p.evaluate(([sel, K]) => {
        const i = document.activeElement; const c = document.getElementById('compteCarte');
        const bt = c && c.contains(i) ? c.querySelector('.btn-primary') : null;
        const r = i ? i.getBoundingClientRect() : null, rb = bt ? bt.getBoundingClientRect() : null;
        const haut = innerHeight - K;   // le haut du clavier
        return { haut, champ: r ? [Math.round(r.top), Math.round(r.bottom)] : null, bouton: rb ? [Math.round(rb.top), Math.round(rb.bottom)] : null,
                 defil: document.getElementById('app').scrollTop, kb: document.documentElement.classList.contains('kb'), actif: i && (i.id || i.className) };
      }, [sel, K]);
      const vu = m.champ && m.champ[0] >= 0 && m.champ[1] <= m.haut;
      const bvu = !m.bouton || (m.bouton[0] >= 0 && m.bouton[1] <= m.haut);
      if (!vu || !bvu) caches++;
      console.log(`${nom.padEnd(13)} ${sys.padEnd(7)} ${ou.padEnd(8)} ${etape.padEnd(6)} clavier à ${m.haut}px  champ ${JSON.stringify(m.champ)} ${vu ? 'VU' : 'CACHÉ'}  bouton ${m.bouton ? JSON.stringify(m.bouton) + (bvu ? ' vu' : ' caché') : '-'}  défil ${m.defil} kb=${m.kb} (${m.actif})`);
    }
    if (errs.length) { console.log('  erreurs : ' + errs.join(' | ')); caches++; }
    await ctx.close();
  }
  console.log(caches ? '\n  ÉCHEC — ' + caches + ' cas où le clavier cache ce qu\'on écrit' : '\n  OK — sur iOS comme sur Android, le clavier ne cache jamais ce qu\'on écrit');
  await b.close();
  process.exit(caches ? 1 : 0);
})();
