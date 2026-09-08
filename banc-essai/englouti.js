/* « ÇA FAIT UN PEU ENGLOUTI. »
   La feuille « Revoir mes erreurs », ouverte sur 7 erreurs. Mesuré avant :
   la liste s'arrêtait à 10 px du bord bas de l'écran et la troisieme carte y
   etait TRANCHEE net, en plein milieu d'une phrase, sous l'indicateur
   d'accueil de l'iPhone. 588 px restaient a lire — plus d'un ecran entier —
   sans rien pour le dire. D'ou la sensation : les cartes sont avalees par le
   bas, elles ne defilent pas dans une liste.

   Quatre releves, chacun sur une des trois corrections :

     repos    px de feuille visible SOUS la liste. C'est ce qui fait que la
              liste finit DANS un contenant au lieu de tomber du bord.
     tranche  le plus fort saut de luminance d'une ligne a l'autre dans les
              40 px au-dessus du bord bas : une coupe franche fait un MUR,
              un fondu fait une PENTE.
     cran     apres un lancer au doigt, distance entre le haut de la carte en
              tete et la LIGNE DU VOILE (haut de la liste + fondu). Sans cran
              on se pose n'importe ou, souvent au milieu d'une ligne ; et sans
              scroll-padding on se pose DANS le fondu, donc sur une carte a
              moitie effacee.
     rampe    la forme du fondu : amplitude (y en a-t-il un ?) et coude
              maximal (une droite fait deux coudes, une courbe aucun).
     rang     le compteur du titre suit-il le defilement (« 3 / 7 ») ?

       node englouti.js                 (jeu servi en HTTP sur 8099)
       node englouti.js "<css d essai>" (pour comparer un autre reglage)

   Reperes : repos >= 16 px, tranche <= 12, cran <= 2 px, amplitude du fondu
   > 40, coude <= 0.0025, rang qui bouge. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execSync } = require('child_process');
const D = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/';
const CSS = process.argv[2] || '';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const FAUX = [
  ["Qui a reconstruit les murailles de Jérusalem après l'exil ?","Néhémie","Esdras","Néhémie obtint du roi Artaxerxès la permission de rentrer."],
  ["Quel compagnon de Daniel fut jeté dans la fournaise ?","Schadrak","Gédéon","Avec Méschak et Abed-Nego (Daniel 3)."],
  ["Combien de livres compte le Nouveau Testament ?","27","39","Vingt-sept livres, de Matthieu à l'Apocalypse."],
  ["Qui a écrit la majorité des Psaumes ?","David","Salomon","David en a composé environ la moitié."],
  ["Sur quelle montagne Moïse reçut-il les commandements ?","Sinaï","Carmel","Aussi appelée Horeb dans le Deutéronome."],
  ["Quel est le premier miracle de Jésus ?","L'eau changée en vin","La multiplication des pains","Aux noces de Cana, en Galilée (Jean 2)."],
  ["Qui a trahi Jésus pour trente pièces d'argent ?","Judas Iscariot","Pierre","Il le livra d'un baiser au jardin de Gethsémané."]
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:3,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  if (CSS) await p.addStyleTag({ content: CSS });
  await p.evaluate((faux) => {
    state.screen='end'; state.mode='solo'; state.soloScore=740; state.soloCorrect=13;
    state.questions = new Array(20).fill(0).map((_,i)=>({ q:'q'+i, tier:'moyen' }));
    state.soloMissed = faux.map(f => ({ q:f[0], correct:f[1], chosen:f[2], fact:f[3] }));
    render();
  }, FAUX);
  await p.waitForTimeout(900);
  await p.evaluate(() => openMissedReview());
  await p.waitForTimeout(1000);

  const g = await p.evaluate(() => {
    const li = document.querySelector('.review-sheet .rev-list');
    const r = li.getBoundingClientRect();
    return { top:Math.round(r.top), bot:Math.round(r.bottom), left:Math.round(r.left),
             right:Math.round(r.right), vp:innerHeight, dep:li.scrollHeight-li.clientHeight,
             rang:document.querySelector('.review-sheet .sheet-title small').textContent };
  });
  const repos = g.vp - g.bot;

  await p.screenshot({ path: D + 'englouti-bord.png' });
  const bande = JSON.stringify({ left:g.left, right:g.right, bot:g.bot });
  require('fs').writeFileSync(D + 'englouti-bord.json', bande);
  const tranche = parseFloat(execSync('python3 ' + __dirname + '/englouti.py bord').toString().trim());

  /* LA FORME DU FONDU. On pose un bloc parfaitement uni dans la liste et on
     force le voile bas a sa pleine longueur : le profil de luminance lu a
     travers ne dit plus que le masque, sans le bruit du texte ni du verre. */
  await p.evaluate(() => {
    const li = document.querySelector('.rev-list');
    const bloc = document.createElement('div');
    bloc.id = 'blocEssai';
    bloc.style.cssText = 'flex:0 0 auto;height:600px;background:#0a0a0a;';
    li.appendChild(bloc);
    /* on descend DANS le bloc : le bas de la liste ne montre plus que lui,
       sinon on mesurerait la rampe par-dessus du texte. Le cran est coupe
       le temps de la mesure, il ramenerait la vue sur une carte. */
    li.style.scrollSnapType = 'none';
    li.scrollTop = li.scrollHeight - li.clientHeight - 100;
    li.style.setProperty('--voile-h', '0px');
    li.style.setProperty('--voile-b', getComputedStyle(li).getPropertyValue('--voile-max').trim() || '46px');
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: D + 'englouti-rampe.png' });
  require('fs').writeFileSync(D + 'englouti-rampe.json', bande);
  const [amp, coude] = execSync('python3 ' + __dirname + '/englouti.py rampe').toString().trim().split(' ').map(parseFloat);
  await p.evaluate(() => {
    const b = document.getElementById('blocEssai'); if (b) b.remove();
    const li = document.querySelector('.rev-list');
    li.style.scrollSnapType = '';
    li.scrollTop = 0;
    li.style.removeProperty('--voile-h'); li.style.removeProperty('--voile-b');
    majVoilesErreurs();
  });
  await p.waitForTimeout(200);

  /* Le cran : un lancer au doigt, puis on regarde ou ca s'est pose. */
  await p.mouse.move(196, g.top + 200);
  await p.mouse.wheel(0, 230);
  await p.waitForTimeout(1400);
  const fin = await p.evaluate(() => {
    const li = document.querySelector('.review-sheet .rev-list');
    /* la ligne de pose attendue : sous le fondu, pas dedans */
    const y = li.getBoundingClientRect().top + parseFloat(getComputedStyle(li).getPropertyValue('--voile-h'));
    let mieux = 1e9;
    li.querySelectorAll('.rev-item').forEach(e => {
      const d = Math.abs(e.getBoundingClientRect().top - y);
      if (d < mieux) mieux = d;
    });
    return { cran:Math.round(mieux), st:Math.round(li.scrollTop),
             rang:document.querySelector('.review-sheet .sheet-title small').textContent,
             vh:getComputedStyle(li).getPropertyValue('--voile-h'),
             vb:getComputedStyle(li).getPropertyValue('--voile-b') };
  });
  await p.screenshot({ path: D + 'englouti-defile.png' });

  console.log('  liste  : haut ' + g.top + ', bas ' + g.bot + ', ecran ' + g.vp + ', reste a lire ' + g.dep + ' px');
  console.log('  repos  : ' + repos + ' px de feuille sous la liste' + (repos >= 16 ? '' : '   <-- LA LISTE TOMBE DU BORD'));
  console.log('  tranche: ' + tranche.toFixed(1) + (tranche <= 12 ? '' : '   <-- COUPE FRANCHE'));
  console.log('  cran   : ' + fin.cran + ' px de la ligne du voile apres un lancer' + (fin.cran <= 2 ? '' : '   <-- POSE AU MILIEU D UNE CARTE'));
  console.log('  rampe  : amplitude ' + amp.toFixed(1) + (amp > 40 ? '' : '   <-- PLUS DE FONDU DU TOUT') +
    '   |   coude ' + coude.toFixed(5) + (coude <= 0.0025 ? '' : '   <-- RAMPE DROITE'));
  console.log('  rang   : « ' + g.rang + ' » en haut -> « ' + fin.rang +' » apres (defile de ' + fin.st + ' px)');
  console.log('  voiles : haut ' + fin.vh.trim() + ', bas ' + fin.vb.trim());
  if (errs.length) console.log('  ERREURS JS : ' + errs.slice(0,3).join(' | '));
  const ok = repos >= 16 && tranche <= 12 && fin.cran <= 2 && amp > 40 && coude <= 0.0025 && fin.rang !== g.rang && !errs.length;
  console.log(ok ? '\n  OK' : '\n  ECHEC');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
