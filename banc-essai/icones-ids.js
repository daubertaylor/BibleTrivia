/* ================== BANC « LA FLAMME NE DISPARAÎT JAMAIS » ==================
   « Les flammes doivent être fixes, et pas réapparaître à chaque ouverture ou
   fermeture. » (v345)
   La flamme (et la flamme gelée, la cible, la coupe, l'anneau du score, le
   drapeau anglais) se peignait PAR RÉFÉRENCE : fill="url(#flA)". Avec deux
   copies dans la page — l'accueil et la page qui s'ouvre, l'écran qui part et
   celui qui arrive — toutes peignaient avec le dégradé de la première du
   document ; masquée, elle emportait la couleur de toutes les autres : la
   flamme perdait son dégradé pendant chaque changement d'écran, puis
   « réapparaissait ». Filmé : 450 ms sans flamme à chaque retour à l'accueil.
   La règle vérifiée ici, à l'arrêt ET au milieu des passages : chaque
   référence url(#…) d'une icône pointe sur un identifiant UNIQUE dans la page,
   et qui appartient à SA PROPRE icône.
   Usage : node banc-essai/icones-ids.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';

let ko = 0;
function verifier(nom, bon, detail){
  if(!bon) ko++;
  console.log('  ' + (bon ? 'OK ' : 'KO ') + nom + (bon || !detail ? '' : '   ' + detail));
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await nav.newContext({ viewport:{ width:393, height:852 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.route('**/supabase-js@2*', r => r.fulfill({ status:200, contentType:'application/javascript', body:'' }));
  await p.addInitScript(() => {
    const c = (d) => { const t = new Date(Date.now() + d*86400000), z = n => String(n).padStart(2,'0');
      return t.getFullYear()+'-'+z(t.getMonth()+1)+'-'+z(t.getDate()); };
    localStorage.setItem('bt_profile', JSON.stringify({ name:'Taylor', color:'#4C86E8' }));
    localStorage.setItem('bt_fs_hint', '1');
    localStorage.setItem('bt_daily', JSON.stringify({ last:c(0), streak:4, jours:[c(0),c(-1),c(-2),c(-3)],
      geles:[], gels:1, palier:0, parties:3, palierParties:0, annonce:'' }));
  });
  await p.goto(URL, { waitUntil:'networkidle' });
  await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch(e){ return false; } }, null, { timeout:20000 });
  await p.waitForTimeout(900);

  /* L'inspection : toutes les références url(#…) des icônes de la page. */
  const inspecter = () => p.evaluate(() => {
    const parId = {};
    document.querySelectorAll('svg [id]').forEach(e => { (parId[e.id] = parId[e.id] || []).push(e); });
    const fautes = [];
    let refs = 0;
    document.querySelectorAll('svg *').forEach(e => {
      const sources = [e.getAttribute('fill'), e.getAttribute('stroke'), e.getAttribute('clip-path'),
                       e.getAttribute('mask'), e.getAttribute('filter'), e.getAttribute('style')].filter(Boolean).join(' ');
      const re = /url\(#([^)]+)\)/g; let m;
      while((m = re.exec(sources))){
        refs++;
        const cibles = parId[m[1]] || [];
        const chez = e.ownerSVGElement || e.closest('svg');
        if(cibles.length !== 1) fautes.push(m[1] + ' ×' + cibles.length);
        else if(chez && !chez.contains(cibles[0])) fautes.push(m[1] + ' hors de son icône');
      }
    });
    return { refs, fautes: Array.from(new Set(fautes)) };
  });
  const etape = async (nom) => {
    const r = await inspecter();
    verifier(nom + ' (' + r.refs + ' références)', r.fautes.length === 0, r.fautes.slice(0, 6).join(', '));
    return r;
  };

  // ---------- 1. À L'ARRÊT ----------
  const repos = await etape("l'accueil, à l'arrêt");
  verifier("la pastille de la flamme est bien là", await p.evaluate(() => !!document.querySelector('.parcours-card .pc-feu svg')), '');
  verifier("l'inspection voit des références", repos.refs > 0, 'aucune référence trouvée');

  // ---------- 2. AU MILIEU DES PASSAGES ----------
  await p.evaluate(() => { openParcours(); });
  await p.waitForTimeout(140);
  await etape("Progression arrive par-dessus l'accueil");
  await p.waitForTimeout(900);
  await etape("Progression posée");
  await p.evaluate(() => { goToModeSelect(); });
  await p.waitForTimeout(140);
  await etape("Progression repart, l'accueil dessous");
  await p.waitForTimeout(900);
  await etape("retour à l'accueil, posé");

  // ---------- 3. LA PAGE DE LA FLAMME, LES RÉGLAGES, LA LANGUE ----------
  await p.evaluate(() => { ouvrirFlamme(); });
  await p.waitForTimeout(140);
  await etape("la page de la flamme s'ouvre");
  await p.waitForTimeout(800);
  await p.evaluate(() => { closeFlamme(); });
  await p.waitForTimeout(140);
  await etape("la page de la flamme se referme");
  await p.waitForTimeout(800);

  // ---------- 4. CHAQUE LECTURE D'UNE ICÔNE EST UNE COPIE AUTONOME ----------
  const copies = await p.evaluate(() => {
    const lots = { flame:[ICONS.flame, ICONS.flame], flammeGelee:[ICONS.flammeGelee, ICONS.flammeGelee],
                   target:[ICONS.target, ICONS.target], coupe:[idsPropres(TROPHY_GOLD), idsPropres(TROPHY_GOLD)],
                   drapeau:[idsPropres(DRAPEAUX.en), idsPropres(DRAPEAUX.en)] };
    const res = {};
    for(const k in lots){
      const [a, b] = lots[k];
      const ids = s => (s.match(/\bid="([^"]+)"/g) || []).map(x => x.slice(4, -1));
      const refs = s => (s.match(/url\(#([^)]+)\)/g) || []).map(x => x.slice(5, -1));
      const ia = ids(a), ib = ids(b);
      res[k] = { distincts: ia.length > 0 && ia.every(x => ib.indexOf(x) < 0),
                 locales: refs(a).every(r => ia.indexOf(r) >= 0) && refs(b).every(r => ib.indexOf(r) >= 0) };
    }
    return res;
  });
  for(const k in copies){
    verifier(k + " : deux emplois, deux jeux d'identifiants", copies[k].distincts, JSON.stringify(copies[k]));
    verifier(k + " : ses références restent chez elle", copies[k].locales, JSON.stringify(copies[k]));
  }

  // ---------- 5. LA FIN DE PARTIE SOLO (ANNEAU ET COUPE) ----------
  await p.evaluate(() => {
    state.mode = 'solo'; startGame();
    state.currentIndex = state.questions.length - 1; state.revealed = true; state.soloSelected = 0;
    nextQuestion();
  });
  await p.waitForFunction(() => state.screen === 'end', null, { timeout:8000 });
  await p.waitForTimeout(160);
  await etape("la fin de partie arrive (anneau, coupe, cible, flamme)");
  await p.waitForTimeout(1200);
  const fin = await etape("la fin de partie posée");
  verifier("l'anneau du score est peint par son propre dégradé",
    await p.evaluate(() => { const c = document.querySelector('.ring-fg'); if(!c) return false;
      const s = getComputedStyle(c).stroke; const id = (/url\("?#([^")]+)"?\)/.exec(s) || [])[1];
      return !!id && !!document.getElementById(id) && c.ownerSVGElement.contains(document.getElementById(id)); }), '');

  await nav.close();
  console.log(ko === 0 ? '\n  OK — chaque icône peint avec ses propres dégradés, à chaque instant' : '\n  ' + ko + ' règle(s) en défaut');
  process.exit(ko === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
