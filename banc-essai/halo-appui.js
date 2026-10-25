/* ====== BANC « LE HALO CORAIL, LÀ OÙ IL A UN SENS » (v334) ======
   « Vérifie tous les endroits où il y a le halo rose quand j'appuie avec mon
     doigt, qu'il s'affiche parfaitement. Et vérifie aussi les endroits où il
     ne doit pas y en avoir, où malheureusement il y est. » Chaque famille de
   boutons du jeu (une cinquantaine, de l'accueil à la modération), sur
   iPhone et sur Android, photographiée au repos puis sous un doigt posé
   0,3 s (relevé sans clic, par un toucher annulé). On lit la couleur
   moyenne de la boîte, avant et pendant :
     1. là où il n'a pas de sens — un interrupteur, un onglet de la barre du
        bas, un succès, le verset ouvert, l'en-tête d'une discussion, une
        photo, un lien, la poignée d'une page —, AUCUN halo : ni rose, ni
        blanc ;
     2. un message s'assombrit à peine, sans rosir — et (v335) une LIGNE de
        liste aussi (un groupe, une ligne des Réglages, une action d'une
        page) : « la lueur rose qui sélectionne les groupes… fais mieux » ;
     3. partout ailleurs, le halo se voit (au moins 4 unités de différence
        moyenne dans la boîte) ; sur un bouton corail, il est blanc ;
     4. aucune erreur.
   Avant la v334 : le rose sur l'interrupteur, les onglets, les bulles, les
   badges, l'en-tête, le verset ; « Rejoindre » pressé ne changeait que de
   2,6 unités.
   Usage : node banc-essai/halo-appui.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
let ko = 0;
const dit = (q, b, d) => { if (!b) ko++; console.log('  ' + (b ? 'OK  ' : 'KO  ') + q + (d ? '   (' + String(d).slice(0, 420) + ')' : '')); };
/* Le décor des groupes et la liste des écrans : ceux de doigt.js. */
const GRP_DECOR = `window.__grpDecor = () => {
  const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
  compte.dispo = true;
  compte.session = { user:{ id:'moi-0', email:'joueur@exemple.net' } }; compte.etape = 'connecte';
  grp.installe = true; grp.ouverts = true; grp.message = '';
  grp.etat = { participe:'ok', moderateur:true, ouverts:true, a_traiter:2 };
  grp.profils = { 'moi-0':{ nom:'Taylor', couleur:'#4C86E8' }, 'u-2':{ nom:'Sam', couleur:'#E8574C' },
                  'u-3':{ nom:'Lee', couleur:'#4CE88A' }, 'u-4':{ nom:'Kim', couleur:'#E8C84C' } };
  grp.liste = [
    { id:'g-1', nom:'Lee', teinte:2, ouvert:false, code:'ABC234', nb_membres:4, non_lus:2, dernier_message:il(1),
      apercu:{ id:9, auteur:'u-2', genre:'texte', texte:'Amen', nom:'Sam', le:il(1) } },
    { id:'g-2', nom:'Sam', teinte:0, ouvert:true, code:'DEF567', nb_membres:2, non_lus:0, dernier_message:il(26),
      apercu:{ id:7, auteur:'moi-0', genre:'texte', texte:'Amen', nom:'Taylor', le:il(26) } } ];
  grp.publics = [ { id:'g-2', nom:'Sam', description:'', nb_membres:2, teinte:0, membre:true },
                  { id:'g-5', nom:'Ruth', description:'', nb_membres:1, teinte:3, membre:false } ];
  grp.membres = { 'g-1':[ { membre:'moi-0', role:'proprietaire', muet_jusqu:null },
                          { membre:'u-2', role:'admin', muet_jusqu:null },
                          { membre:'u-4', role:'membre', muet_jusqu:null } ] };
  const m = (id, auteur, genre, texte, extra) => Object.assign({ id, groupe:'g-1', auteur, genre, texte, donnees:{},
    cree_le:il(0.5), masque:false, supprime_le:null }, extra || {});
  grp.fils = { 'g-1':{ charge:true, tout:false, messages:[
    m(1, null, 'systeme', 'cree', { donnees:{ nom:'Taylor' } }),
    m(7, 'u-2', 'texte', 'Amen'),
    m(10, 'u-2', 'partie', '', { donnees:{ code:'ABCD' } }),
    m(12, 'moi-0', 'texte', 'Amen') ] } };
  grp.courant = null; grp.nonLus = 2; moderation = null;
};`;
const ECRANS = [
  ['accueil',      "state.screen='mode'; render();"],
  ['solo',         "state.mode='solo'; state.screen='setup'; render();"],
  ['groupe',       "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'},{name:'C'}]; state.screen='setup'; render();"],
  ['jeu',          "state.mode='solo'; startGame();"],
  ['fin',          "state.screen='end'; state.soloScore=80; state.soloCorrect=3; state.soloBestStreak=2; state.soloMissed=[{q:'a',correct:'b',chosen:'c',fact:'d'}]; render();"],
  ['erreurs',      "openMissedReview();"],
  ['progression',  "closeMissedReview(); state.screen='parcours'; render();"],
  ['profil',       "state.screen='profile'; render();"],
  ['réglages',     "state.screen='mode'; render(); openSettings();"],
  ['versions',     "openBibles();"],
  ['en ligne',     "closeBibles(); closeSettings(); state.screen='online'; render();"],
  ['salon',        "net.isHost=true; net.code='42CJ'; net.joueurs={}; majAdversaire(); state.screen='online-room'; render();"],
  /* LES GROUPES. Sans serveur : un décor posé à la main (le même que celui
     de langues-ecrans.js), puis chaque écran ouvert par la fonction du jeu
     qui l'ouvre. On mesure ce que le doigt touche, pas ce que le serveur dit. */
  ['groupes · barre', GRP_DECOR + "try{ leaveRoomToOnline(); }catch(e){} __grpDecor(); state.screen='mode'; render(); majBarre();"],
  ['groupes',          "__grpDecor(); state.screen='groupes'; render(); majBarre();"],
  ['groupes · sans compte', "__grpDecor(); compte.session=null; compte.etape='repos'; grp.etat=null; state.screen='groupes'; render();"],
  ['groupes · bienvenue', "__grpDecor(); grp.etat={ participe:'regles', moderateur:false }; state.screen='groupes'; render();"],
  ['discussion',       "__grpDecor(); grp.courant='g-1'; state.screen='groupe'; render(); majCompo();"],
  ['infos du groupe',  "ouvrirInfosGroupe(true);"],
  ['un membre',        "fermerFeuilleGroupe('grpInfosVeil'); ouvrirMembre('u-4');"],
  ['un message',       "fermerFeuilleGroupe('grpMembreVeil'); actionsMessage('7');"],
  ['signaler',         "fermerFeuilleGroupe('grpActionsVeil'); signalerMessage('7');"],
  ['créer un groupe',  "fermerFeuilleGroupe('grpSignalerVeil'); __grpDecor(); state.screen='groupes'; render(); ouvrirCreation();"],
  ['j\'ai un code',    "fermerFeuilleGroupe('grpCreerVeil'); ouvrirCode();"],
  /* La file vient du serveur : on répond à sa place, pour que la carte soit
     posée par le chemin du jeu (chargerModeration), pas écrite par le banc. */
  ['modération',       "fermerFeuilleGroupe('grpCodeVeil'); __grpDecor(); window.__lg = window.__lg || listeGroupe;" +
                       " listeGroupe = async (n, a) => n === 'moderation_ouverte' ? [{ id:1, raison:'harcelement', details:'', le:new Date().toISOString()," +
                       " groupe:'g-1', groupe_nom:'Lee', message:7, texte:'Amen', cible:'u-2', cible_nom:'Sam', par_nom:'Lee', nb:2 }] : __lg(n, a);" +
                       " state.screen='groupes'; render(); ouvrirModeration();"],
];
const PLUS = [
  ['groupes · découvrir', "__grpDecor(); state.screen='groupes'; render();"],
  ['discussion · écrire', "__grpDecor(); grp.courant='g-1'; state.screen='groupe'; render(); majCompo(); const t=document.getElementById('compoTexte'); if(t){ t.value='Amen'; surSaisie(t); }"],
  ['verset ouvert', "document.querySelectorAll('[id$=\"Veil\"]').forEach(v=>{ try{ fermerFeuilleGroupe(v.id); }catch(e){} try{ v.remove(); }catch(e){} }); __grpDecor(); state.screen='mode'; render(); setTimeout(()=>{ try{ showHeroVerse(); }catch(e){} }, 50);"],
  ['quitter la partie', "try{ hideHeroVerse(); }catch(e){} state.mode='solo'; startGame(); setTimeout(()=>{ try{ confirmLeaveGame(); }catch(e){} }, 50);"],
  ['choisis ton nom', "document.querySelectorAll('.modal-veil').forEach(v=>v.remove()); state.screen='online-name'; render();"],
];
/* Ce qui ne doit JAMAIS se colorer sous le doigt. (La lueur du bonhomme
   qui prie est la sienne : clignote.js la suit.) */
const SANS = /^button\.(switch|bb-onglet|ach|hero-verse-card|grp-tete|avatar-tap|lien-conf|grp-lien|sheet-grab|icon-btn\.hero-profile|icon-btn\.grp-profil)\b/;
const IGNORE = /^button\.hero-icon-btn\b/;
const BULLE = /^button\.b-bulle\b/;
const LIGNE = /^button\.(grp-ligne|grp-act-l|set-row\.set-lien)\b/;

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  try {
    for (const [tel, ua] of [['iPhone', IOS], ['Android', AND]]) {
      console.log('  — ' + tel);
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, userAgent: ua, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(tel + ' : ' + e.message));
      await p.route('**/supabase-js@2*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      await p.addInitScript(() => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1');
        localStorage.setItem('bt_progress', JSON.stringify({ books: { 'Genèse': 12 }, correct: 126 }));
        localStorage.setItem('bt_compte_ok', JSON.stringify({ ok: true, quand: Date.now() }));
        localStorage.setItem('bt_google_ok', JSON.stringify({ ok: false, quand: Date.now() }));
      });
      await p.goto(URL);
      await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
      const cdp = await ctx.newCDPSession(p);
      /* La couleur moyenne d'une boîte, lue sur une vraie capture. */
      const moyenne = async (r) => {
        const png = (await p.screenshot({ clip: { x: r[0], y: r[1], width: r[2], height: r[3] } })).toString('base64');
        return p.evaluate(async (b64) => {
          const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
          const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
          const d = x.getImageData(0, 0, c.width, c.height).data; let R = 0, G = 0, B = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
          return [R / n, G / n, B / n];
        }, png);
      };
      const combien = {}, sans = [], bulles = [], lignes = [], invisibles = [];
      let total = 0;
      for (const [nom, prep] of ECRANS.concat(PLUS)) {
        try { await p.evaluate((q) => { new Function(q)(); }, prep); } catch (e) { continue; }
        await p.waitForTimeout(900);
        const cibles = await p.evaluate(() => {
          const out = [];
          document.querySelectorAll('button, .mode-card').forEach((e, k) => {
            const r = e.getBoundingClientRect();
            if (r.width < 10 || r.height < 10 || r.top < 0 || r.left < 0 || r.right > innerWidth || r.bottom > innerHeight) return;
            const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.5 || e.disabled) return;
            const x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y);
            if (!t || !(t === e || e.contains(t))) return;
            const cls = (e.className || '').toString().split(/\s+/).filter(c => c && !/^(has-gs|onde|onde-part|arrivee|screen-enter|reveal-in|animate|vu|show|posee|sel|actif|choisie|active|on|off|a-lire|a-pastille|eteinte)$/.test(c)).slice(0, 2).join('.');
            e.setAttribute('data-halo', String(k));
            out.push({ k, cle: e.tagName.toLowerCase() + (cls ? '.' + cls : ''), x, y, r: [Math.ceil(r.left) + 1, Math.ceil(r.top) + 1, Math.floor(r.width) - 2, Math.floor(r.height) - 2] });
          });
          return out;
        });
        for (const c of cibles) {
          /* Une famille SANS halo se vérifie sur deux de ses membres : le
             premier onglet de la barre est celui qui est déjà corail, il ne
             dirait rien du second. */
          const deja = combien[c.cle] || 0;
          if (deja >= (SANS.test(c.cle) ? 2 : 1) || IGNORE.test(c.cle) || c.r[2] < 6 || c.r[3] < 6) continue;
          combien[c.cle] = deja + 1; total++;
          const a = await moyenne(c.r);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
          await p.waitForTimeout(300);
          const b = await moyenne(c.r);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
          await p.waitForTimeout(450);
          const d = b.map((v, i) => v - a[i]), fort = Math.max(...d.map(Math.abs));
          const rose = d[0] - d[1] > 6 && d[0] - d[2] > 6;
          const blanc = Math.min(...d) > 2.5;
          const sorte = fort < 2 ? 'rien' : rose ? 'rose' : blanc ? 'blanc' : (Math.max(...d) < -1.5 ? 'sombre' : 'autre');
          const fiche = nom + ' ' + c.cle + ' : ' + sorte + ' ' + fort.toFixed(1);
          if (SANS.test(c.cle)) { if (sorte !== 'rien' && !(sorte === 'sombre' && fort < 6)) sans.push(fiche); }
          else if (BULLE.test(c.cle)) { if (sorte !== 'sombre' || fort < 2) bulles.push(fiche); }
          else if (LIGNE.test(c.cle)) { if (sorte !== 'sombre' || fort < 4) lignes.push(fiche); }
          else if (fort < 4) invisibles.push(fiche);
        }
      }
      dit('1. aucun halo là où il n\'a pas de sens (interrupteur, onglets, succès, verset, en-tête, photos, liens)', !sans.length, sans.join(' · ') || total + ' familles visitées');
      dit('2. un message s\'assombrit à peine, sans rosir', !bulles.length, bulles.join(' · '));
      dit('2b. une ligne de liste (groupe, Réglages, action) s\'assombrit, sans rosir', !lignes.length, lignes.join(' · '));
      dit('3. partout ailleurs, le halo se voit (blanc sur le corail)', !invisibles.length, invisibles.join(' · '));
      await ctx.close();
    }
    dit('4. aucune erreur', !errs.length, errs.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); ko++; }
  finally { await nav.close(); }
  console.log(ko ? '\n  ' + ko + ' défaut(s)' : '\n  OK — le halo se voit là où il a un sens, et nulle part ailleurs');
  process.exit(ko ? 1 : 0);
})();
