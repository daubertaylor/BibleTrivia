/* L'ÉCHÉANCE DU JOUR : « je veux un moyen de savoir lorsque je dois faire ma
   série, parce que là je ne vois pas ».

   Le jeu savait tout et n'en disait rien : la journée est-elle faite, combien
   de temps reste-t-il avant minuit. L'information ne vivait que dans l'attribut
   « title » d'une case du calendrier — c'est-à-dire nulle part sur un
   téléphone, où personne ne survole. Elle s'écrit désormais à deux endroits :
   l'intitulé de la bande des sept jours, en bas de l'accueil, et une phrase
   entière dans la feuille de la flamme.

   Ce banc vérifie les trois choses qui peuvent la rendre fausse ou illisible :

     1. LES TROIS ÉTATS. Jamais joué, série vivante à relever, journée faite :
        chacun a son mot sur la bande et sa phrase dans la feuille. Et le
        compte à rebours doit SUIVRE l'heure sans qu'on redessine l'écran —
        on avance l'horloge de deux heures et on relit.
     2. L'HEURE JUSTE. La dernière heure (on passe aux minutes), la dernière
        minute (jamais « 0 min »), les premières secondes du jour suivant
        (jamais « 24 h »), et un après-midi ordinaire. Tout est arrondi VERS
        LE BAS : mieux vaut donner une demi-heure de trop au joueur que lui en
        prendre une minute.
     3. LA BANDE TIENT. L'intitulé partage sa ligne avec la pastille de la
        flamme, qui doit rester pile au-dessus de la dernière pastille des
        sept jours. On essaie les textes les PLUS LONGS des trois langues sur
        cinq tailles d'écran : aucun ne doit élargir la bande ni s'approcher
        de la flamme.

   Lancer :  node banc-essai/echeance.js        (le serveur 8099 doit tourner) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL || 'http://127.0.0.1:8099/index.html';
let fautes = 0;
const dit = (ok, ...r) => { if(!ok) fautes++; console.log((ok ? '  ok  ' : 'FAUTE '), ...r); };
/* Le texte affiché porte des espaces INSÉCABLES (« 6 h ») : on les aplatit
   avant de comparer, sans quoi on comparerait des caractères invisibles. */
const plat = s => String(s).replace(/ /g, ' ');
const cle = o => { const p = n => String(n).padStart(2, '0');
  return o.getFullYear() + '-' + p(o.getMonth()+1) + '-' + p(o.getDate()); };
/* Une langue pas encore ouverte se relit quand même : on sert au navigateur une
   copie de la page où elle l'est. Rien n'est modifié sur le disque. */
const ouvrirLaLangue = async (p, lg) => {
  if(lg === 'fr') return;
  await p.route('**/index.html*', async route => {
    const r = await route.fetch();
    await route.fulfill({ response:r, body:(await r.text()).replace(/dispo:false/g, 'dispo:true') });
  });
};
const accueil = async (ctx, { heure, daily, langue }) => {
  const p = await ctx.newPage();
  if(heure) await p.clock.install({ time:heure });
  await ouvrirLaLangue(p, langue || 'fr');
  await p.addInitScript(([d, l]) => {
    try { if(d) localStorage.setItem('bt_daily', JSON.stringify(d)); } catch(e){}
    try { if(l) localStorage.setItem('bt_langue', l); } catch(e){}
  }, [daily || null, langue || null]);
  await p.goto(URL, { waitUntil:'domcontentloaded' });
  /* L'écran de chargement dure quatre secondes : tant qu'il est là, la bande
     n'existe pas encore. On attend l'accueil, pas un délai. */
  await p.waitForFunction(() => typeof state !== 'undefined' && state.screen === 'mode', null, { timeout:20000 });
  return p;
};

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const tel = { viewport:{ width:390, height:844 }, deviceScaleFactor:2,
                serviceWorkers:'block', isMobile:true, hasTouch:true };

  /* ===== 1. LES TROIS ÉTATS ===== */
  console.log('\n  1. LES TROIS ÉTATS DE LA JOURNÉE');
  const T0 = new Date(2026, 8, 21, 14, 0, 0);          /* 14 h : dix heures avant minuit */
  const hier = cle(new Date(2026, 8, 20)), auj = cle(T0);
  /* L'horloge du banc avance de quelques secondes pendant le chargement, et le
     compte est arrondi vers le bas : à 14 h pile il reste dix heures, quatre
     secondes plus tard neuf heures ENTIÈRES. Les deux sont justes ; c'est
     l'arrondi vers le haut qui serait une faute. */
  const CAS = [
    ['jamais joué', null, ['Plus que 10 h', 'Plus que 9 h'],
      "Joue une partie avant minuit pour allumer ta flamme. Il te reste {t}."],
    ['série à relever', { last:hier, streak:4, jours:[hier], geles:[], gels:1 }, ['Plus que 10 h', 'Plus que 9 h'],
      "Joue une partie avant minuit pour garder ta flamme. Il te reste {t}."],
    ['journée faite', { last:auj, streak:5, jours:[auj], geles:[], gels:1 }, ["Fait pour aujourd'hui"],
      "C'est fait pour aujourd'hui. Reviens demain pour continuer."],
  ];
  for(const [nom, daily, attendu, phrase] of CAS){
    const ctx = await nav.newContext(tel);
    const p = await accueil(ctx, { heure:T0, daily });
    const fait = attendu[0].indexOf('Fait') === 0;
    const v = await p.evaluate(() => { const t = document.querySelector('.sem-t');
      return { txt:t.textContent, afaire:t.classList.contains('afaire') }; });
    dit(attendu.indexOf(plat(v.txt)) >= 0, `${nom} : la bande dit « ${plat(v.txt)} »`);
    /* La mise en avant (blanc franc, graisse de plus) ne s'allume que s'il
       reste quelque chose à faire — sinon elle crierait pour rien. */
    dit(v.afaire === !fait, `${nom} : mise en avant ${v.afaire ? 'allumée' : 'éteinte'}`);
    await p.evaluate(() => ouvrirFlamme());
    await p.waitForTimeout(100);
    const f = await p.evaluate(() => { const n = document.querySelector('.flam-jour');
      if(!n) return { absent:true };
      const r = n.getBoundingClientRect(), s = n.closest('.settings-sheet').getBoundingClientRect();
      return { txt:n.textContent, deborde:+(r.right - s.right).toFixed(1) }; });
    const veut = attendu.map(a => phrase.replace('{t}', (a.match(/\d+ (?:h|min)/) || [''])[0]));
    dit(!f.absent && veut.indexOf(plat(f.txt)) >= 0, `${nom} : la feuille dit « ${plat(f.txt || 'RIEN')} »`);
    dit(!f.absent && f.deborde < 0, `${nom} : la phrase tient dans la feuille`);
    await p.evaluate(() => closeFlamme());
    /* DEUX HEURES PLUS TARD, SANS REDESSINER : c'est la minuterie de trente
       secondes qui doit avoir réécrit le texte toute seule. */
    await p.clock.fastForward('02:00:00');
    await p.waitForTimeout(150);
    const apres = plat(await p.evaluate(() => document.querySelector('.sem-t').textContent));
    const deux = fait ? attendu : ['Plus que 8 h', 'Plus que 7 h'];
    dit(deux.indexOf(apres) >= 0, `${nom} : deux heures plus tard « ${apres} »`);
    await ctx.close();
  }

  /* ===== 2. L'HEURE JUSTE ===== */
  console.log('\n  2. L\'HEURE JUSTE, AUX MOMENTS OÙ UN COMPTE À REBOURS MENT');
  /* Le 21 septembre 2026 est un LUNDI, le 22 un mardi : la dernière pastille
     de la bande doit porter l'initiale du jour en cours. */
  const HEURES = [
    ['23 h 19',        new Date(2026,8,21,23,19,0),  ['Plus que 41 min','Plus que 40 min'], 'L'],
    ['23 h 59 min 55', new Date(2026,8,21,23,59,55), ['Plus que 1 min'],                    'L'],
    ['00 h 00 min 03', new Date(2026,8,22, 0, 0,3),  ['Plus que 23 h'],                     'M'],
    ['12 h 00',        new Date(2026,8,22,12, 0,0),  ['Plus que 12 h','Plus que 11 h'],     'M'],
  ];
  for(const [nom, heure, veut, jour] of HEURES){
    const ctx = await nav.newContext(tel);
    const p = await accueil(ctx, { heure, daily:{ last:'2026-09-20', streak:4, jours:['2026-09-20'], geles:[], gels:1 } });
    const v = await p.evaluate(() => { const n = document.querySelector('.sem-t'), j = document.querySelectorAll('.sj');
      return { txt:n.textContent, auj:j[j.length-1].textContent, h:new Date().toString().slice(16,24) }; });
    dit(veut.indexOf(plat(v.txt)) >= 0 && v.auj === jour,
        `${nom} (${v.h}) → « ${plat(v.txt)} », dernière pastille « ${v.auj} »`);
    await ctx.close();
  }

  /* ===== 3. LA BANDE TIENT, DANS LES TROIS LANGUES ===== */
  console.log('\n  3. LA BANDE TIENT, AVEC LES TEXTES LES PLUS LONGS');
  const PIRES = {
    fr: ['Plus que 59 min', 'Plus que 23 h', "Fait pour aujourd'hui"],
    en: ['59 min left', '23h left', 'Done for today'],
    es: ['Quedan 59 min', 'Quedan 23 h', 'Hecho por hoy'],
  };
  const ECRANS = [[320,568],[360,640],[360,780],[390,844],[430,932]];
  for(const lg of ['fr','en','es']){
    let pire = 0, rendu = '';
    for(const [w,h] of ECRANS){
      const ctx = await nav.newContext({ ...tel, viewport:{ width:w, height:h } });
      const p = await accueil(ctx, { langue:lg, daily:{ last:'2026-09-19', streak:4, jours:[], geles:[], gels:1 } });
      const v = await p.evaluate(pires => {
        const out = [], j = document.querySelector('.sem-j'), t = document.querySelector('.sem-t'),
              f = document.querySelector('.sem-flamme'), cases = j.querySelectorAll('.sj');
        out.push({ rendu:t.textContent });
        for(const txt of pires){
          t.textContent = txt;
          const rf = f.getBoundingClientRect(), rt = t.getBoundingClientRect(),
                rd = cases[cases.length-1].getBoundingClientRect();
          /* « ecart » : de combien la flamme dépasse la dernière pastille.
             « air » : ce qui sépare le texte de la flamme. */
          out.push({ txt, ecart:+(rf.right - rd.right).toFixed(2), air:+(rf.left - rt.right).toFixed(1),
                     defile:document.documentElement.scrollWidth > document.documentElement.clientWidth });
        }
        return out;
      }, PIRES[lg]);
      rendu = plat(v[0].rendu);
      for(const r of v.slice(1)){
        if(r.ecart > 0.5 || r.air < 4 || r.defile){
          pire++;
          console.log(`FAUTE  ${lg} ${w}x${h} « ${r.txt} » : flamme décalée de ${r.ecart} px, air ${r.air} px`);
        }
      }
      await ctx.close();
    }
    fautes += pire;
    dit(pire === 0, `${lg} : cinq écrans, trois textes — la flamme reste au-dessus de la dernière pastille (rendu : « ${rendu} »)`);
  }

  await nav.close();
  console.log(fautes ? `\n  ${fautes} FAUTES\n` : '\n  OK — l\'échéance se voit, reste vraie, et ne déforme rien\n');
  process.exit(fautes ? 1 : 0);
})();
