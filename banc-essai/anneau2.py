# -*- coding: utf-8 -*-
"""L'ANNEAU, précisément : le PREMIER pixel CSS à l'intérieur de la boîte de
   bordure, comparé à l'intérieur de la surface 3 à 6 px plus loin. C'est
   exactement la bande que overflow:clip laissait sans peinture."""
import json, sys
from PIL import Image
D=sys.argv[1]; F=sys.argv[2]; S=4
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def med(a):
    a=sorted(a); return a[len(a)//2] if a else None
res={}
for o in json.load(open(D+'/'+F)):
    im=Image.open(o['f']).convert('RGB'); W,H=im.size
    for b in o['boites']:
        x0,y0 = int(round(b['x']*S)), int(round(b['y']*S))
        x1,y1 = int(round((b['x']+b['w'])*S)), int(round((b['y']+b['h'])*S))
        pires=[]
        for cote in ('haut','bas','gauche','droite'):
            anneau=[]; dedans=[]
            for t in (0.42,0.46,0.5,0.54,0.58):
                if cote in ('haut','bas'):
                    px=int(x0+(x1-x0)*t)
                    base, sens = (y0, 1) if cote=='haut' else (y1-1, -1)
                    if not(0<=px<W): continue
                    a=[lum(im.getpixel((px, base+sens*k))) for k in range(0,S) if 0<=base+sens*k<H]
                    d=[lum(im.getpixel((px, base+sens*k))) for k in range(2*S,6*S) if 0<=base+sens*k<H]
                else:
                    py=int(y0+(y1-y0)*t)
                    base, sens = (x0, 1) if cote=='gauche' else (x1-1, -1)
                    if not(0<=py<H): continue
                    a=[lum(im.getpixel((base+sens*k, py))) for k in range(0,S) if 0<=base+sens*k<W]
                    d=[lum(im.getpixel((base+sens*k, py))) for k in range(2*S,6*S) if 0<=base+sens*k<W]
                if len(a)<S or len(d)<3*S: continue
                anneau.append(med(a)); dedans.append(med(d))
            if not anneau: continue
            ec=[abs(a-d) for a,d in zip(anneau,dedans)]
            m=med(ec)
            if m is not None: pires.append((m,cote))
        if not pires: continue
        pires.sort(reverse=True)
        cle=b['c']+('' if b['gs'] else ' (sans verre)')+'  ('+o['vue']+')'
        if cle not in res or pires[0][0]>res[cle][0]: res[cle]=pires[0]
gros=sorted([(v,k) for k,v in res.items() if v[0]>=6], reverse=True)
print("  ANNEAU : 1er pixel CSS du bord vs intérieur de la surface — %s" % F)
for (v,a),k in gros[:18]:
    print("   %-46s %5.1f  %-7s %s" % (k, v, a, '#'*int(min(v,60)/3)))
print("   surfaces : %d  |  anneau >= 6 : %d  |  >= 12 : %d  |  max : %.1f"
      % (len(res), len(gros), len([1 for v,_ in gros if v[0]>=12]), max([v[0] for v in res.values()]) if res else 0))
