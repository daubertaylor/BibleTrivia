/* LE SALON SUIT LE NOMBRE DE JOUEURS, DANS LES DEUX SENS.

   IL AVAIT TROIS VISAGES, IL N'EN A PLUS QU'UN. Ce banc exigeait autrefois un
   face-à-face « Toi VS Adversaire » à exactement deux, et la liste ailleurs —
   donc un écran qui BASCULAIT sous les yeux du joueur dès qu'un troisième
   arrivait. « Je veux que même s'il n'y en a que deux, ça reste pareil, de
   haut en bas, et pas sur les côtés. Là, s'il y a deux joueurs, ça passe en
   version horizontale, et ensuite ça change d'écran pour revenir en vertical.
   Et ça, j'aime pas. » La liste sert donc de un à huit, et il n'y a plus de
   bascule de FORME à surveiller.

   CE QUI RESTE À SURVEILLER, ET C'EST TOUJOURS LE MÊME PIÈGE. Le salon se met
   à jour par un raccourci qui retouche la liste SANS redessiner l'écran. Ce
   raccourci a déjà menti une fois : il ne repassait jamais par un rendu
   complet, et le salon restait bloqué sur ce qu'il montrait. Le banc n'appelle
   donc que reRenderIfOnline(), exactement comme le vrai jeu à chaque événement
   de présence, et il vérifie que les deux chemins — rendu complet et retouche
   en place — dessinent LA MÊME liste :

     une rangée par joueur, et la place vide UNIQUEMENT quand on est seul
     (à deux, elle répétait ce que la phrase du code dit déjà, pour 58 px) ;
     le MOT qui suit le nombre : « duel » à exactement deux, « partie »
     ailleurs — seul compris, puisqu'on vient d'inviter jusqu'à huit personnes.

       node bascule.js        (le jeu doit être servi en HTTP sur 8099) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const NOMS = ['Marie', 'Paul', 'Ana', 'Luc', 'Jean', 'Eve', 'Noe'];
/* on monte jusqu'a huit PUIS on redescend : c'est la descente qui piegeait */
const ETAPES = [1, 2, 3, 8, 3, 2, 1, 2];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, userAgent: IOS, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
  await p.goto(URL);
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.evaluate(() => { net.isHost = true; net.code = '42CJ'; net.joueurs = {}; majAdversaire(); state.screen = 'online-room'; render(); });
  let ok = true;
  for (const n of ETAPES) {
    const r = await p.evaluate(({ n, NOMS }) => {
      net.joueurs = {};
      for (let i = 0; i < n - 1; i++) net.joueurs['j' + i] = { id: 'j' + i, name: NOMS[i], color: '#E8734C', score: 0, idx: 0, done: false, gone: false, vu: Date.now() };
      majAdversaire(); reRenderIfOnline();
      const q = s => { const e = document.querySelector(s); return e ? e.innerText.trim() : null; };
      return { face: !!document.querySelector('.vs-row, .vs-player, .vs-mid, #oppSlot'),
               li: !!document.querySelector('.salle-liste'),
               lbl: q('.len-label'),
               joueurs: document.querySelectorAll('.salle-ligne:not(.vide)').length,
               vides: document.querySelectorAll('.salle-ligne.vide').length };
    }, { n, NOMS });
    await p.waitForTimeout(280);

    /* 1. UNE SEULE FORME, DE UN À HUIT. */
    const bonneVue = r.li && !r.face;
    /* 2. LE MOT SUIT LE NOMBRE : un duel, c'est exactement deux. */
    const motAttendu = n === 2 ? 'du duel' : 'de la partie';
    const bonMot = (r.lbl || '').indexOf(motAttendu) >= 0;
    /* 3. UNE RANGÉE PAR JOUEUR, et la place vide seulement quand on est seul. */
    const videsAttendues = n === 1 ? 1 : 0;
    const bonnesLignes = r.joueurs === n && r.vides === videsAttendues;
    if (!bonneVue || !bonMot || !bonnesLignes) ok = false;
    console.log('  ' + String(n).padStart(2) + ' joueur(s) -> '
      + (bonneVue ? 'liste  ok   ' : (r.face ? 'FACE-À-FACE ENCORE LÀ  ' : 'AUCUNE LISTE  '))
      + '| ' + (r.lbl || '?').padEnd(22) + (bonMot ? 'ok' : 'MOT FAUX')
      + '  | ' + r.joueurs + ' joueur(s) + ' + r.vides + ' vide(s) '
      + (bonnesLignes ? 'ok' : 'ATTENDU ' + n + ' + ' + videsAttendues));
  }
  console.log('\n  salon : ' + (ok ? 'une seule forme, dans les deux sens' : 'DEFAUT'));
  console.log('  erreurs : ' + (errs.length ? JSON.stringify([...new Set(errs)]) : 'aucune'));
  await ctx.close(); await b.close();
  process.exit(ok ? 0 : 1);
})();
