/* ====== BANC « SE CONNECTER NE RETIRE JAMAIS RIEN » ======
   C'est la règle qui compte plus que toutes les autres réunies : entre vingt
   et cinquante personnes ont, aujourd'hui, une progression qui n'existe que
   sur leur téléphone. Le jour où on leur propose un compte, la seule faute
   impardonnable serait qu'en se connectant l'un d'eux perde quelque chose.

   CE BANC NE FAIT PAS CONFIANCE AU CODE, IL LE MET À L'ÉPREUVE. Il sème un
   téléphone RICHE (progression, flamme, carnet, succès), pose sur le serveur
   une sauvegarde PAUVRE, connecte, puis compare la photo d'avant à celle
   d'après, compteur par compteur et ensemble par ensemble. Rien ne doit avoir
   baissé, rien ne doit avoir disparu.

   IL ÉPROUVE AUSSI LE CHEMIN COMPLET, tel que le joueur le vit :
     — la carte ne s'affiche PAS tant que la table n'existe pas côté serveur ;
     — Google, quand le fournisseur n'est pas ouvert, cesse d'être proposé et
       renvoie vers l'adresse e-mail, en le disant ;
     — un mauvais code est refusé sans connecter personne ;
     — le bon code connecte, et la sauvegarde part ;
     — un deuxième téléphone qui écrit entre-temps ne fait rien perdre : la
       repose est refusée, on refusionne, et on retente ;
     — un téléphone VIDE qui se connecte retrouve tout ;
     — se déconnecter n'efface rien sur l'appareil.

   Le serveur est un Supabase de poche (banc-essai/faux-supabase.js) injecté à
   la place du script CDN. On ne teste pas Supabase ; on teste notre code.
   Usage : node banc-essai/comptes.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const FAUX = require('./faux-supabase.js');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

let ko = 0;
const v = (nom, bon, detail) => {
  if(!bon) ko++;
  console.log('  ' + (bon ? 'ok   ' : 'KO   ') + nom + (detail ? '\n        ' + detail : ''));
};

/* ===== LA PHOTO RICHE, ET POURQUOI ELLE EST FAITE COMME ÇA =====
   Mon premier semis était incohérent, et le banc a eu raison de me le dire :
   j'annonçais une série de 41 avec trois jours dans la liste. Or la fusion
   DÉDUIT la série des jours joués — « quand last et jours se contredisent, ce
   sont les jours qui ont raison ». Elle rendait donc 3, et j'ai failli prendre
   ce comportement juste pour une perte de progression. On sème maintenant 41
   jours consécutifs qui se terminent aujourd'hui : la série 41 est alors vraie.
   Et les entrées de carnet portent une clé « k », comme celles qu'écrit
   errbookAdd() ; le cas SANS clé a son propre essai, plus bas. */
function joursAvant(n){
  const out = [];
  for(let i = n - 1; i >= 0; i--){
    const d = new Date(Date.now() - i * 86400000);
    out.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
  }
  return out;
}
const JOURS = joursAvant(41);
const RICHE = {
  progres: { books:{ 'Genèse':40, 'Exode':25, 'Matthieu':18 }, totalCorrect:430, bestStreak:19, flawless:4, ach:{} },
  stats:   { bestScore:940, bestPct:96, games:87 },
  flamme:  { last:JOURS[JOURS.length-1], streak:41, score:900, total:5400, jours:JOURS, geles:[],
             gels:3, palier:4, parties:87, palierParties:3, annonce:'' },
  vues:    Array.from({length:120}, (_,i)=>'v'+i),
  carnet:  Array.from({length:30}, (_,i)=>({ k:'c'+i, n:2, p:0, du:'2026-01-01', maj:1000+i,
                                             q:'Q'+i, options:['a','b','c','d'], correct:'a', tier:'moyen' })),
  acquises:{ pas:1, marcheur:1, pelerin:1 }
};
/* Et la sauvegarde PAUVRE qu'on pose sur le serveur : elle doit être incapable
   de faire baisser quoi que ce soit. */
const PAUVRE = {
  v:1, profil:{ name:'Ancien', color:'#888888' },
  progres:{ 'Genèse':2 },
  stats:{ bestScore:10, bestPct:5, games:1 },
  flamme:{ last:'', streak:1, score:10, total:10, jours:['2020-01-01'], geles:[], gels:0, palier:0, parties:1, palierParties:0, annonce:'' },
  vues:['vieille-question'], carnet:[], acquises:{}, modes:{}, gout:{ bible:'', scene:'', maj:0 }
};

/* Rien ne doit baisser : chaque nombre au moins égal, chaque ensemble au moins
   inclus. C'est la définition mesurable de « ne retire jamais rien ». */
function riensPerdu(avant, apres){
  const perdus = [];
  const nb = (a, b, ou) => { if((+b||0) < (+a||0)) perdus.push(ou + ' : ' + a + ' -> ' + b); };
  nb(avant.stats.bestScore, apres.stats.bestScore, 'meilleur score');
  nb(avant.stats.bestPct,   apres.stats.bestPct,   'meilleur pourcentage');
  nb(avant.stats.games,     apres.stats.games,     'parties');
  for(const k of ['streak','score','total','gels','palier','parties','palierParties'])
    nb(avant.flamme[k], apres.flamme[k], 'flamme.' + k);
  const la = (avant.progres && avant.progres.books) || {}, lb = (apres.progres && apres.progres.books) || {};
  for(const livre of Object.keys(la)) nb(la[livre], lb[livre], 'livre ' + livre);
  nb((avant.progres||{}).totalCorrect, (apres.progres||{}).totalCorrect, 'bonnes réponses');
  const dedans = (a, b, ou) => { const s = new Set(b); for(const x of a) if(!s.has(x)) { perdus.push(ou + ' : « ' + x +' » a disparu'); return; } };
  dedans(avant.vues, apres.vues, 'questions vues');
  dedans(avant.flamme.jours, apres.flamme.jours, 'jours de flamme');
  dedans(Object.keys(avant.acquises||{}), Object.keys(apres.acquises||{}), 'succès');
  if((apres.carnet||[]).length < (avant.carnet||[]).length)
    perdus.push('carnet : ' + avant.carnet.length + ' -> ' + apres.carnet.length);
  return perdus;
}

async function ouvrir(nav, semer){
  const ctx = await nav.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:2,
    userAgent:IOS, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.route('**/supabase-js@2**', r => r.fulfill({ status:200, contentType:'text/javascript; charset=utf-8', body:FAUX }));
  await p.addInitScript(()=>{
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint','1');
  });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return typeof render === 'function' && typeof compteDemarrer === 'function'; }catch(e){ return false; } }, null, {timeout:20000});
  if(semer) await p.evaluate(semer);
  return p;
}
const versProfil = (p) => p.evaluate(()=>{ state.screen='profile'; render(); });
const photo = (p) => p.evaluate(()=> sauvegardeIci());

(async () => {
  const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });

  /* ---------- 1. PAS DE TABLE, PAS DE CARTE ---------- */
  {
    const p = await ouvrir(nav);
    await p.evaluate(()=>{ window.__faux.table = false; localStorage.removeItem('bt_compte_ok'); compte.dispo = null; });
    await versProfil(p);
    await p.waitForTimeout(900);
    const carte = await p.evaluate(()=> !!document.getElementById('compteCarte'));
    v("table absente : aucune carte n'est proposée", carte === false);
    await p.context().close();
  }

  /* ---------- 2. LA TABLE EXISTE : LA CARTE ARRIVE ---------- */
  {
    const p = await ouvrir(nav);
    await p.evaluate(()=>{ localStorage.removeItem('bt_compte_ok'); compte.dispo = null; });
    await versProfil(p);
    await p.waitForTimeout(900);
    const t = await p.evaluate(()=>{ const c=document.getElementById('compteCarte'); return c ? c.textContent : ''; });
    v("table présente : la carte propose de sauvegarder", /Sauvegarder ma progression/.test(t), t.slice(0,90));
    await p.context().close();
  }

  /* ---------- 3. GOOGLE FERMÉ : ON LE DIT, ET L'E-MAIL RESTE ---------- */
  {
    const p = await ouvrir(nav);
    await versProfil(p); await p.waitForTimeout(700);
    await p.evaluate(()=>{ compteOuvrir(); });
    await p.waitForTimeout(150);
    const avait = await p.evaluate(()=> !!document.querySelector('.compte-google'));
    await p.evaluate(()=> connexionGoogle());
    await p.waitForTimeout(400);
    const apres = await p.evaluate(()=>({ bouton: !!document.querySelector('.compte-google'),
                                          mot: (document.querySelector('.compte-mot')||{}).textContent || '',
                                          mail: !!document.getElementById('compteMail') }));
    v("Google était proposé", avait === true);
    v("Google refusé : le bouton disparaît", apres.bouton === false);
    v("Google refusé : on renvoie vers l'e-mail, en le disant", /adresse e-mail/.test(apres.mot), apres.mot);
    v("Google refusé : le champ e-mail est toujours là", apres.mail === true);
    await p.context().close();
  }

  /* ---------- 4. MAUVAIS CODE : REFUSÉ, ET PERSONNE N'EST CONNECTÉ ---------- */
  {
    const p = await ouvrir(nav);
    await versProfil(p); await p.waitForTimeout(700);
    await p.evaluate(()=>{ compteOuvrir(); });
    await p.waitForTimeout(150);
    await p.evaluate(()=>{ document.getElementById('compteMail').value = 'taylor@essai.test'; envoyerCode(); });
    await p.waitForTimeout(400);
    const etape = await p.evaluate(()=> compte.etape);
    v("code demandé : on passe à la saisie du code", etape === 'code');
    await p.evaluate(()=>{ document.getElementById('compteCode').value = '999999'; verifierCode(); });
    await p.waitForTimeout(400);
    const r = await p.evaluate(()=>({ connecte: compteConnecte(), mot: compte.message }));
    v("mauvais code : refusé", r.connecte === false);
    v("mauvais code : on le dit sans détour", /ne correspond pas/.test(r.mot), r.mot);
    await p.context().close();
  }

  /* ---------- 5. LA RÈGLE ABSOLUE : RICHE ICI, PAUVRE AU SERVEUR ---------- */
  {
    const p = await ouvrir(nav, null);
    await p.evaluate((R)=>{
      saveProgress(R.progres); saveStats(R.stats);
      saveDaily(R.flamme);
      saveSeen(new Set(R.vues)); saveErrbook(R.carnet); saveAcquises(R.acquises);
    }, RICHE);
    const avant = await photo(p);
    await p.evaluate((PAUVRE)=>{ window.__faux.ligne = { id:'x', donnees:PAUVRE, revision:7 }; }, PAUVRE);
    await versProfil(p); await p.waitForTimeout(700);
    await p.evaluate(()=>{ compteOuvrir(); });
    await p.waitForTimeout(120);
    await p.evaluate(()=>{ document.getElementById('compteMail').value='taylor@essai.test'; envoyerCode(); });
    await p.waitForTimeout(350);
    await p.evaluate(()=>{ document.getElementById('compteCode').value='123456'; verifierCode(); });
    await p.waitForTimeout(1400);
    const apres = await photo(p);
    const perdus = riensPerdu(avant, apres);
    v("SE CONNECTER N'A RIEN RETIRÉ", perdus.length === 0, perdus.slice(0,4).join(' | '));
    const etat = await p.evaluate(()=>({ connecte: compteConnecte(), poses: window.__faux.poses,
                                         rev: window.__faux.ligne ? window.__faux.ligne.revision : 0,
                                         jeux: window.__faux.ligne ? window.__faux.ligne.donnees.stats.games : -1 }));
    v("connecté", etat.connecte === true);
    v("la sauvegarde est partie au serveur", etat.rev === 8, 'révision ' + etat.rev);
    v("et c'est la RICHE qui est au serveur, pas la pauvre", etat.jeux === RICHE.stats.games, 'parties au serveur : ' + etat.jeux);
    /* Et le distant, même pauvre, a bien été absorbé : sa question vue est là. */
    const absorbe = apres.vues.indexOf('vieille-question') >= 0;
    v("le distant a été absorbé, pas ignoré", absorbe === true);
    await p.context().close();
  }

  /* ---------- 6. DEUX TÉLÉPHONES : LE CONFLIT NE FAIT RIEN PERDRE ---------- */
  {
    const p = await ouvrir(nav, null);
    await p.evaluate((R)=>{ saveProgress(R.progres); saveStats(R.stats); saveSeen(new Set(R.vues)); }, RICHE);
    const avant = await photo(p);
    await p.evaluate((PAUVRE)=>{ window.__faux.ligne = { id:'x', donnees:PAUVRE, revision:3 };
                                 window.__faux.conflitUneFois = true; }, PAUVRE);
    await versProfil(p); await p.waitForTimeout(700);
    await p.evaluate(()=>{ compteOuvrir(); });
    await p.waitForTimeout(120);
    await p.evaluate(()=>{ document.getElementById('compteMail').value='taylor@essai.test'; envoyerCode(); });
    await p.waitForTimeout(350);
    await p.evaluate(()=>{ document.getElementById('compteCode').value='123456'; verifierCode(); });
    await p.waitForTimeout(1800);
    const apres = await photo(p);
    const perdus = riensPerdu(avant, apres);
    const etat = await p.evaluate(()=>({ poses: window.__faux.poses, rev: window.__faux.ligne.revision,
                                         jeux: window.__faux.ligne.donnees.stats.games }));
    v("conflit : rien n'a été perdu sur le téléphone", perdus.length === 0, perdus.slice(0,4).join(' | '));
    v("conflit : on a retenté au lieu d'abandonner", etat.poses >= 2, etat.poses + ' repose(s)');
    v("conflit : c'est bien la riche qui finit au serveur", etat.jeux === RICHE.stats.games, 'parties : ' + etat.jeux);
    await p.context().close();
  }

  /* ---------- 7. TÉLÉPHONE VIDE : IL RETROUVE TOUT ---------- */
  {
    const p = await ouvrir(nav, null);
    await p.evaluate((R)=>{
      window.__faux.ligne = { id:'x', revision:2, donnees:{
        v:1, profil:{ name:'Taylor', color:'#4C86E8' },
        progres:R.progres, stats:R.stats,
        flamme:R.flamme,
        vues:R.vues, carnet:R.carnet, acquises:R.acquises, modes:{}, gout:{ bible:'', scene:'', maj:0 } } };
    }, RICHE);
    await versProfil(p); await p.waitForTimeout(700);
    await p.evaluate(()=>{ compteOuvrir(); });
    await p.waitForTimeout(120);
    await p.evaluate(()=>{ document.getElementById('compteMail').value='taylor@essai.test'; envoyerCode(); });
    await p.waitForTimeout(350);
    await p.evaluate(()=>{ document.getElementById('compteCode').value='123456'; verifierCode(); });
    await p.waitForTimeout(1400);
    const apres = await photo(p);
    v("appareil neuf : la progression est revenue", apres.progres.books['Genèse'] === RICHE.progres.books['Genèse'], 'Genèse : ' + apres.progres.books['Genèse']);
    v("appareil neuf : les compteurs sont revenus", apres.stats.games === RICHE.stats.games, 'parties : ' + apres.stats.games);
    v("appareil neuf : la flamme est revenue", apres.flamme.streak === RICHE.flamme.streak, 'série : ' + apres.flamme.streak);
    v("appareil neuf : les questions vues sont revenues", apres.vues.length >= RICHE.vues.length, apres.vues.length + ' vues');
    v("appareil neuf : les succès sont revenus", Object.keys(apres.acquises).length >= 3);
    await p.context().close();
  }

  /* ---------- 8. SE DÉCONNECTER N'EFFACE RIEN ---------- */
  {
    const p = await ouvrir(nav, null);
    await p.evaluate((R)=>{ saveProgress(R.progres); saveStats(R.stats); saveSeen(new Set(R.vues)); saveAcquises(R.acquises); }, RICHE);
    await versProfil(p); await p.waitForTimeout(700);
    await p.evaluate(()=>{ compteOuvrir(); });
    await p.waitForTimeout(120);
    await p.evaluate(()=>{ document.getElementById('compteMail').value='taylor@essai.test'; envoyerCode(); });
    await p.waitForTimeout(350);
    await p.evaluate(()=>{ document.getElementById('compteCode').value='123456'; verifierCode(); });
    await p.waitForTimeout(1200);
    const avant = await photo(p);
    await p.evaluate(()=> deconnexion());
    await p.waitForTimeout(500);
    const apres = await photo(p);
    const perdus = riensPerdu(avant, apres);
    const etat = await p.evaluate(()=>({ connecte: compteConnecte(),
                                         texte: (document.getElementById('compteCarte')||{}).textContent || '' }));
    v("déconnecté", etat.connecte === false);
    v("SE DÉCONNECTER N'A RIEN EFFACÉ", perdus.length === 0, perdus.slice(0,4).join(' | '));
    v("et on repropose de sauvegarder", /Sauvegarder ma progression/.test(etat.texte));
    await p.context().close();
  }

  /* ---------- 9. UNE ENTRÉE DE CARNET SANS CLÉ NE DOIT PAS TOMBER ----------
     errbookAdd() pose toujours un « k ». « Ne devrait pas exister » n'est pas
     une garantie : une vieille entrée, un import, une main qui écrit dans le
     stockage. La fusion jetait ces entrées-là en silence, et c'est exactement
     la faute que tout ce mécanisme existe pour empêcher. */
  {
    const p = await ouvrir(nav, null);
    await p.evaluate(()=>{
      saveErrbook([{ q:'Une vieille erreur sans clé', options:['a','b','c','d'], correct:'a', p:0 },
                   { k:'avec-cle', n:1, p:0, du:'2026-01-01', maj:5, q:'Une erreur normale', options:['a','b','c','d'], correct:'a' }]);
    });
    const avant = await photo(p);
    await versProfil(p); await p.waitForTimeout(700);
    await p.evaluate(()=>{ compteOuvrir(); });
    await p.waitForTimeout(120);
    await p.evaluate(()=>{ document.getElementById('compteMail').value='taylor@essai.test'; envoyerCode(); });
    await p.waitForTimeout(350);
    await p.evaluate(()=>{ document.getElementById('compteCode').value='123456'; verifierCode(); });
    await p.waitForTimeout(1400);
    const apres = await photo(p);
    const sansCle = (apres.carnet||[]).some(e => e && e.q === 'Une vieille erreur sans clé');
    v("une entrée de carnet SANS CLÉ survit à la connexion", sansCle === true,
      avant.carnet.length + ' entrée(s) avant, ' + (apres.carnet||[]).length + ' après');
    /* Et refusionner ne la duplique pas : la clé fabriquée est déterministe. */
    await p.evaluate(()=> synchroniser());
    await p.waitForTimeout(900);
    const encore = await photo(p);
    v("et refusionner ne la duplique pas", (encore.carnet||[]).length === (apres.carnet||[]).length,
      (apres.carnet||[]).length + ' -> ' + (encore.carnet||[]).length);
    await p.context().close();
  }

  await nav.close();
  console.log(ko === 0
    ? "\n  OK — se connecter ne retire jamais rien, et un téléphone perdu ne perd plus rien"
    : "\n  " + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
