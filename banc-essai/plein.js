/* ============ BANC « L'ONDE REMPLIT TOUT LE BOUTON » ============
   « Lorsque j'appuie sur un bouton qui se sélectionne, le remplissage rosé ne
   se fait pas à cent pour cent. C'est toujours quelques manques. »
   Les manques ne sont pas aux bords : mesuré au pixel APPAREIL, l'onde
   s'arrête exactement là où s'arrête le bouton. Ce sont des TROUS, au milieu.
   L'onde vivait en z-index:-1, donc DERRIÈRE le contenu : chaque enfant opaque
   y découpait sa silhouette — 10 % de la surface d'une carte de mode pour sa
   seule pastille d'icône.
   COMMENT ON MESURE SANS SE FAIRE PIÉGER. La teinte d'appui est un corail, et
   plusieurs pastilles du jeu SONT corail : comparer les images ne dirait rien
   sur elles (corail sur corail ne change pas). On injecte donc une teinte
   d'essai bleue et franche : tout pixel réellement recouvert change beaucoup,
   tout pixel « en trou » ne change pas du tout. Le jeu, lui, garde sa teinte.
   Usage : node banc-essai/plein.js [url]
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { execSync } = require('child_process');
const SC = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad';
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const S = 3;
const OUVRE_BIBLES = "state.screen='mode'; render(); openSettings(); setTimeout(()=>openBibles(), 60);";
const CIBLES = [
  ['version',   OUVRE_BIBLES, '.bible-item'],
  ['puce',      "state.mode='group'; state.teams=[{name:'Taylor'},{name:'B'}]; state.screen='setup'; render();", '.chip'],
  ['carte',     "state.screen='mode'; render();", '.mode-card'],
  ['défi',      "state.screen='mode'; render();", '.daily-card'],
  ['réponse',   "state.mode='solo'; startGame();", '.option-btn'],
  ['testament', "state.screen='parcours'; render();", '.tst-head'],
];
(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport:{width:393,height:852}, deviceScaleFactor:S, hasTouch:true, serviceWorkers:'block' });
  const p = await ctx.newPage();
  await p.addInitScript(()=>{ localStorage.setItem('bt_profile',JSON.stringify({name:'Taylor',color:'#4C86E8'})); localStorage.setItem('bt_fs_hint','1'); });
  await p.goto(URL);
  await p.waitForFunction(()=>{ try{ return state.screen==='mode'; }catch(e){ return false; } }, null, {timeout:20000});
  /* l'enfoncement est neutralisé (sinon tout bouge), la teinte devient franche */
  await p.addStyleTag({ content:
    'button:active, .mode-card:active{ transform:translateZ(0) scale(1) !important; }' +
    'button, .mode-card{ --press-tint: rgba(0,40,255,0.86) !important; }' });
  const mesures = [];
  for (const [nom, prep, sel] of CIBLES) {
    await p.evaluate(()=>{ try{ closeBibles(); }catch(e){} try{ closeSettings(); }catch(e){} });
    await p.waitForTimeout(600);
    await p.evaluate(s=>{ new Function(s)(); }, prep);
    await p.waitForTimeout(1400);
    const el = p.locator(sel).first();
    if (!(await el.count())) { console.log('  ' + nom + ' introuvable'); continue; }
    const box = await el.boundingBox();
    const r = await el.evaluate(e=>parseFloat(getComputedStyle(e).borderTopLeftRadius)||0);
    const clip = { x: Math.floor(box.x)-2, y: Math.floor(box.y)-2, width: Math.ceil(box.width)+4, height: Math.ceil(box.height)+4 };
    await p.screenshot({ path: SC+'/p-'+nom+'-repos.png', clip });
    await p.mouse.move(box.x+box.width/2, box.y+box.height/2);
    await p.mouse.down(); await p.waitForTimeout(600);
    await p.screenshot({ path: SC+'/p-'+nom+'-appui.png', clip });
    await p.mouse.up(); await p.waitForTimeout(400);
    mesures.push([nom, box.x, box.y, box.width, box.height, clip.x, clip.y, r]);
  }
  await b.close();
  const py = `
import sys
from PIL import Image
S=${S}
CIB=${JSON.stringify(mesures)}
SC='${SC}'
# ON IGNORE LE DERNIER PIXEL DU CONTOUR. Un bouton du jeu porte
# transform:translateZ(0) : il est composé sur sa propre couche, dont les
# bords sont CALES SUR LA GRILLE de l'appareil. Sa geometrie, elle, est
# fractionnaire (106,27 px de large a x=28,91). Le dernier pixel du contour
# n'appartient donc ni tout a fait au bouton ni tout a fait au dehors, et il
# fausserait le compte. Verifie a la loupe : l'onde s'arrete exactement ou
# s'arrete le fond du bouton, pas un pixel avant.
MARGE = 1.0
def dedans(px,py,w,h,r):
    px -= MARGE; py -= MARGE; w -= 2*MARGE; h -= 2*MARGE; r = max(0.0, r-MARGE)
    if px<0 or py<0 or px>w or py>h: return False
    if (px<r or px>w-r) and (py<r or py>h-r):
        cx = r if px<r else w-r; cy = r if py<r else h-r
        return (px-cx)**2+(py-cy)**2 <= r*r
    return True
ko=0
for nom,bx,by,bw,bh,cx0,cy0,r in CIB:
    A=Image.open(SC+'/p-%s-repos.png'%nom).convert('RGB')
    B=Image.open(SC+'/p-%s-appui.png'%nom).convert('RGB')
    a=A.load(); b=B.load(); W,H=A.size
    ox=(bx-cx0)*S; oy=(by-cy0)*S
    tot=0; trous=0
    for iy in range(H):
        for ix in range(W):
            px=(ix+0.5-ox)/S; py=(iy+0.5-oy)/S
            if not dedans(px,py,bw,bh,r): continue
            tot+=1
            v=abs(a[ix,iy][0]-b[ix,iy][0])+abs(a[ix,iy][1]-b[ix,iy][1])+abs(a[ix,iy][2]-b[ix,iy][2])
            if v<=6: trous+=1
    pc=100.0*trous/tot if tot else 100.0
    bon = pc <= 0.6
    if not bon: ko+=1
    print('  %-10s %s %6.2f %% du bouton non recouvert  (%d px sur %d)' % (nom, 'OK ' if bon else 'KO ', pc, trous, tot))
print('')
print('  OK' if ko==0 else '  %d bouton(s) avec des trous' % ko)
sys.exit(0 if ko==0 else 1)
`;
  require('fs').writeFileSync(SC+'/plein.py', py);
  try { console.log(execSync('python3 ' + SC + '/plein.py').toString()); }
  catch(e){ console.log(e.stdout ? e.stdout.toString() : String(e)); process.exit(1); }
})();
