# La VARIATION LOCALE, pas l'amplitude globale : le fond de la feuille varie
# doucement d'un bord a l'autre (un degrade), alors que des lettres qui
# traversent produisent des sauts d'un pixel a l'autre. On mesure donc la
# moyenne des ecarts entre pixels VOISINS.
import json, sys
from PIL import Image
D='/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/'
tag=sys.argv[1]
r=json.load(open(D+'f2-'+tag+'.json')); im=Image.open(D+'f2-'+tag+'.png').convert('RGB')
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
S=3
x0=(r['left']+60)*S; x1=min((r['right']-60)*S, im.size[0]-1); y0=r['top']*S
print('  ligne : variation locale (sauts entre pixels voisins)')
pics=[]
for d in range(-4, 16):
    y=y0+d
    if y<0 or y>=im.size[1]: continue
    v=[lum(im.getpixel((x,y))) for x in range(x0,x1)]
    loc=sum(abs(v[i]-v[i-1]) for i in range(1,len(v)))/(len(v)-1)
    ou='au-dessus' if d<0 else '  dedans '
    fuite = d>=0 and loc>1.2
    if d>=0: pics.append(loc)
    print('   %+3d (%s) : %6.2f%s' % (d, ou, loc, '   <-- LETTRES VISIBLES' if fuite else ''))
print('\n  variation maximale DANS la feuille : %.2f' % max(pics))
