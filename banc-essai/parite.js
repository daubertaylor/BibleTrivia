/* ============ BANC « LE MÊME JEU SUR ANDROID ET SUR iOS » ============
   « Je remarque que le jeu n'est pas exactement le même sur Android et sur
     iOS. Vérifie que ce soit exactement pareil, partout, partout, partout. »

   Le code ne se branche sur la plateforme qu'à CINQ endroits, et deux
   catégories seulement :
     — le moteur du verre (glassIsAndroid, GLASS_STILL, GLASS_IOS_PRED) :
       deux chemins pour OBTENIR LE MÊME RÉSULTAT, chacun compensant un défaut
       propre à son navigateur pendant le défilement. Au REPOS, ils doivent
       converger au pixel : c'est exactement ce que ce banc mesure ;
     — les instructions d'installation (IS_IOS) : là, la différence est juste,
       les gestes ne sont pas les mêmes sur les deux systèmes. Cet écran-là
       est donc exclu, et il est le SEUL.

   CE QUE CE BANC PEUT DIRE, ET CE QU'IL NE PEUT PAS. Il compare deux rendus
   du MÊME moteur (Chromium) avec deux identités différentes : il isole donc
   ce que NOTRE code fait différemment, et rien d'autre. Une différence qui
   viendrait de Safari lui-même (lissage des polices, arrondi du verre) lui
   échappe — aucun banc tournant ici ne peut l'attraper, et il vaut mieux le
   dire que de le laisser croire.

   Usage : node banc-essai/parite.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const TMP = fs.mkdtempSync('/tmp/parite-');
const URL = process.argv[2] || process.env.URL_ESSAI || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

/* Les écrans qu'on compare, et comment y aller. */
const ECRANS = [
  ['accueil',        () => { state.screen = 'mode'; render(); }],
  /* ===== ON POSE LES JOUEURS, COULEURS COMPRISES =====
     Elles sont tirées au hasard (« TEAM_COLORS[Math.random()...] »), si bien
     que deux passes du même appareil ne donnaient pas la même image — et mon
     banc a d'abord pris ce hasard pour une différence entre Android et iOS :
     28 % de l'écran, annoncés avec aplomb.
     Tentative intermédiaire, notée parce qu'elle était pire : remplacer
     Math.random par une suite fixe. Le jeu n'en consomme pas le même NOMBRE
     d'un instant à l'autre, donc la suite se décale et les couleurs changent
     quand même. On ne fige pas le hasard : on écrit les valeurs. */
  ['réglages Groupe',() => { state.mode = 'group'; state.screen = 'setup';
                             state.players = [{ name:'Joueur 1', color:'#4C86E8', score:0 },
                                              { name:'Joueur 2', color:'#E8734C', score:0 }];
                             render(); }],
  ['réglages Solo',  () => { state.mode = 'solo'; state.screen = 'setup'; render(); }],
  ['une question',   () => { state.mode = 'solo'; state.screen = 'play'; state.currentIndex = 0; state.revealed = false;
                             state.questions = [Object.assign({}, BANK.facile[0], { tier:'facile', shuffledOptions: BANK.facile[0].options.slice() })];
                             render(); }],
  ['la réponse',     () => { state.revealed = true; render(); }],
  ['Progression',    () => { state.screen = 'parcours'; render(); }],
  ['flamme',         () => { state.screen = 'mode'; render(); ouvrirFlamme(); }],
];

const PREP = () => {
  localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
  localStorage.setItem('bt_fs_hint', '1');
  localStorage.setItem('bt_progress', JSON.stringify({ books:{'Genèse':12,'Exode':8}, correct:126 }));
  const k = (n)=>{ const d=new Date(Date.now()-n*86400000); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  localStorage.setItem('bt_daily', JSON.stringify({ last:k(0), streak:5, jours:[k(0),k(1),k(2)], geles:[], gels:1, parties:12 }));
  localStorage.setItem('bt_errbook', JSON.stringify([{ q:'Q1', options:['a','b','c','d'], correct:'a', p:0 }]));
};

/* ===== ON ARRÊTE LE TEMPS AVANT DE PHOTOGRAPHIER =====
   L'accueil ne se posait JAMAIS : quatorze photos d'affilée, toujours
   différentes, et le banc concluait « l'écran n'est pas reproductible ».
   Trois animations y tournent en permanence, toutes autour du logo —
   heroShadow sur .hero-zone::after, heroSpin sur .hero-icon-wrap::before,
   heroFloat sur .hero-icon. Le banc ignorait bien une zone, mais elle était
   trop petite : querySelector('.hero-icon, .hero-zone') prend le PREMIER des
   deux dans le document, donc l'icône (106 x 106) — alors que l'ombre qui
   respire s'étend sur 338 x 160. Tout ce qui dépassait de l'angle mort
   comptait comme une différence.
   AGRANDIR L'ANGLE MORT AURAIT ÉTÉ LE MAUVAIS GESTE : c'est le logo, la
   partie la plus visible de l'écran, qu'on aurait cessé de comparer. On
   arrête plutôt les horloges et on les remet à zéro : les deux plateformes
   sont alors photographiées au MÊME instant de la même animation, l'image
   est reproductible, et on compare l'écran ENTIER — logo compris, ce que le
   banc ne faisait plus depuis qu'il avait un angle mort.
   On regèle avant chaque photo : un render() relance des animations. */
const figer = (p) => p.evaluate(() => {
  document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e){} });
});

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const prendre = async (ua, etiquette) => {
    const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
      userAgent:ua, hasTouch:true, serviceWorkers:'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(PREP);
    await p.goto(URL);
    await p.waitForFunction(() => { try { return typeof render === 'function'; } catch(e){ return false; } }, null, { timeout:20000 });
    const sorties = [];
    for (const [nom, aller] of ECRANS) {
      await p.evaluate(aller);
      /* ===== ON ATTEND QUE L'IMAGE SE POSE, ON NE PARIE PAS SUR UN DÉLAI =====
         Le moteur du verre lisse la position du décor derrière les cartes et
         converge vers sa valeur de repos. Photographier trop tôt saisit un
         décor encore décalé de quelques pixels — et comme il est DERRIÈRE
         toutes les surfaces, c'est un tiers de l'écran qui change. Avec un
         délai fixe de 1,5 s, deux passes du même appareil différaient de
         552 000 pixels, et le banc appelait ça « Android n'est pas comme
         iOS ». On photographie donc en boucle jusqu'à obtenir deux images
         IDENTIQUES d'affilée : tant que ça bouge, ce n'est pas un écran,
         c'est un mouvement. */
      const f = TMP + '/' + etiquette + '-' + nom.replace(/[^a-z]/gi,'') + '.png';
      const g = f.replace('.png', '-prec.png');
      let pose = false;
      await p.waitForTimeout(700);
      await figer(p);
      await p.screenshot({ path:g });
      for (let k = 0; k < 14; k++) {
        await p.waitForTimeout(320);
        await figer(p);
        await p.screenshot({ path:f });
        const m = execSync('python3 -c "from PIL import Image,ImageChops;'
          + ' a=Image.open(\'' + g + '\').convert(\'RGB\'); b=Image.open(\'' + f + '\').convert(\'RGB\');'
          + ' d=ImageChops.difference(a,b).getbbox(); print(0 if d is None else 1)"').toString().trim();
        if (m === '0') { pose = true; break; }
        fs.copyFileSync(f, g);
      }
      if (!pose) console.log('     (« ' + nom + ' » ne s\'est jamais posé côté ' + etiquette + ')');
      sorties.push([nom, f]);
    }
    /* La boîte du logo, en pixels d'image (densité 2). */
    const logo = await p.evaluate(() => {
      const e = document.querySelector('.hero-icon, .hero-zone');
      if (!e) return null; const r = e.getBoundingClientRect();
      return [Math.floor(r.left*2)-4, Math.floor(r.top*2)-4, Math.ceil(r.right*2)+4, Math.ceil(r.bottom*2)+4].join(',');
    });
    /* Et ce que le code croit de la plateforme. */
    const dit = await p.evaluate(() => ({
      ios: typeof IS_IOS !== 'undefined' ? IS_IOS : null,
      android: typeof IS_ANDROID !== 'undefined' ? IS_ANDROID : null,
      verreAndroid: typeof glassIsAndroid !== 'undefined' ? glassIsAndroid : null,
    }));
    await ctx.close();
    return { sorties, errs, dit, logo };
  };

  /* ===== DEUX FOIS CHAQUE PLATEFORME, ET VOICI POURQUOI =====
     Première version : une passe par plateforme, puis comparaison. Elle a
     annoncé « 28 % de l'écran diffère » sur les réglages du Mode Groupe. Le
     contrôle que j'aurais dû lancer d'abord — LA MÊME PLATEFORME DEUX FOIS —
     donne zéro pixel d'écart, et la comparaison croisée aussi, une fois les
     deux passes faites dans les mêmes conditions. Les vingt-huit pour cent
     n'étaient pas une différence entre Android et iOS : c'était une image
     saisie à un autre moment de la vie de l'écran.
     On prend donc DEUX captures par plateforme. Tant que les deux ne sont pas
     identiques, l'écran n'est pas posé et on ne compare rien : un banc qui
     compare deux instants différents mesure le temps, pas la plateforme. */
  const a = await prendre(IOS, 'ios');
  const a2 = await prendre(IOS, 'ios-bis');
  const b = await prendre(AND, 'android');
  const b2 = await prendre(AND, 'android-bis');
  await nav.close();

  console.log('  ce que le code croit : iOS -> ' + JSON.stringify(a.dit));
  console.log('                         Android -> ' + JSON.stringify(b.dit));
  const soucis = [];
  if (a.errs.length) soucis.push('erreurs JS côté iOS : ' + [...new Set(a.errs)].slice(0,2).join(' | '));
  if (b.errs.length) soucis.push('erreurs JS côté Android : ' + [...new Set(b.errs)].slice(0,2).join(' | '));

  /* La comparaison, pixel par pixel. On tolère le bruit d'anticrénelage d'un
     point ou deux ; ce qu'on cherche, ce sont des ZONES différentes. */
  const py = `
import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
if a.size != b.size:
    print('TAILLE %sx%s vs %sx%s' % (a.size + b.size)); sys.exit()
d = ImageChops.difference(a, b)
px = d.load(); W, H = d.size
# ZONE IGNORÉE : le logo respire en continu (animation voulue), il ne se pose
# jamais. La comparer, c'est comparer deux instants d'une animation.
zx1 = zy1 = zx2 = zy2 = -1
if len(sys.argv) > 3 and sys.argv[3] != '-':
    zx1, zy1, zx2, zy2 = [int(v) for v in sys.argv[3].split(',')]
n = 0; pire = 0; boite = None
for y in range(H):
    for x in range(W):
        if zx1 <= x <= zx2 and zy1 <= y <= zy2: continue
        v = max(px[x, y])
        if v > 12:
            n += 1
            if v > pire: pire = v
            if boite is None: boite = [x, y, x, y]
            else:
                boite[0] = min(boite[0], x); boite[1] = min(boite[1], y)
                boite[2] = max(boite[2], x); boite[3] = max(boite[3], y)
print('%d %d %s' % (n, pire, (','.join(map(str, boite)) if boite else '-')))
`;
  fs.writeFileSync(TMP + '/cmp.py', py);
  const ecart = (f1, f2) => {
    const out = execSync('python3 ' + TMP + '/cmp.py ' + f1 + ' ' + f2 + ' -').toString().trim();
    if (out.startsWith('TAILLE')) return { taille: out };
    const [n, pire, boite] = out.split(' ');
    return { n: parseInt(n, 10), pire: parseInt(pire, 10), boite };
  };
  const total = 393 * 852 * 4;
  for (let i = 0; i < a.sorties.length; i++) {
    const nom = a.sorties[i][0];
    /* 1. L'ÉCRAN EST-IL POSÉ ? Deux passes de la MÊME plateforme. */
    const stabIos = ecart(a.sorties[i][1], a2.sorties[i][1]);
    const stabAnd = ecart(b.sorties[i][1], b2.sorties[i][1]);
    const instable = Math.max(stabIos.n || 0, stabAnd.n || 0);
    if (instable > total / 1000) {
      console.log('  ' + nom.padEnd(16) + 'PAS POSÉ — deux passes de la même plateforme diffèrent de '
        + instable + ' px : rien à comparer (un élément change tout seul)');
      soucis.push(nom + " : l'écran n'est pas reproductible (" + instable + ' px entre deux passes identiques)');
      continue;
    }
    /* 2. Seulement alors, les deux plateformes. */
    const d = ecart(a.sorties[i][1], b.sorties[i][1]);
    if (d.taille) { soucis.push(nom + ' : ' + d.taille); continue; }
    const pc = (100 * d.n / total).toFixed(3);
    console.log('  ' + nom.padEnd(16) + (d.n === 0 ? 'IDENTIQUE'
      : d.n + ' pixels différents (' + pc + ' %), écart max ' + d.pire + ', zone ' + d.boite)
      + '   [stabilité ' + (stabIos.n || 0) + '/' + (stabAnd.n || 0) + ']');
    if (d.n > total / 1000) soucis.push(nom + ' : ' + d.n + ' pixels diffèrent (' + pc + ' %) entre Android et iOS');
  }

  if (soucis.length) { console.log('\n  DÉFAUTS :'); soucis.forEach(s => console.log('   ' + s)); process.exit(1); }
  console.log('\n  OK — au repos, les ' + ECRANS.length + ' écrans sont les mêmes sur les deux plateformes');
})();
