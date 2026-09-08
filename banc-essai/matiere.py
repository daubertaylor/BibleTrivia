# Lit ce que matiere.js a capturé et donne, par surface, l'écart de matière.
# Deux colonnes de contrôle : « creux » mesure le pixel juste hors de la boîte
# (là où se peindrait un bord) — s'il plonge sous le fond, c'est qu'un trait
# est encore dessiné quelque part.
import json, sys, os
from PIL import Image

D = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mesure'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'mat'
SEUIL = 12          # sous cet écart, l'œil ne sépare plus les deux fonds

def lum(px):
    r, g, b = px[:3]
    return 0.2126*r + 0.7152*g + 0.0722*b

boites = json.load(open(os.path.join(D, TAG + '.json')))
lignes = []
for ecran, els in boites.items():
    im = Image.open(os.path.join(D, TAG + '-' + ecran + '.png')).convert('RGB')
    W, H = im.size
    for e in els:
        x = int(round(e['x'] * 2)); y = int(round(e['yM'] * 2))   # capture en 2x
        if y < 0 or y >= H or x < 14 or x + 12 >= W:
            continue
        dedans = sum(lum(im.getpixel((x + d, y))) for d in (6, 8, 10, 12)) / 4
        dehors = sum(lum(im.getpixel((x - d, y))) for d in (6, 8, 10, 12)) / 4
        bord = min(lum(im.getpixel((x - d, y))) for d in (1, 2))
        lignes.append((abs(dedans - dehors), ecran, e['cls'], dedans, dehors, dehors - bord))

lignes.sort()
print('%6s  %-9s %-18s %7s %7s %7s' % ('ecart', 'ecran', 'surface', 'dedans', 'dehors', 'creux'))
for c, ec, cl, di, do, cr in lignes:
    marque = '   <-- SOUS LE SEUIL' if c < SEUIL else ''
    print('%6.1f  %-9s %-18s %7.1f %7.1f %7.1f%s' % (c, ec, cl[:18], di, do, cr, marque))

faibles = [l for l in lignes if l[0] < SEUIL]
print('\n  %d surfaces — ecart minimum %.1f, mediane %.1f' % (len(lignes), lignes[0][0], lignes[len(lignes)//2][0]))
print('  sous %d : %d%s' % (SEUIL, len(faibles), '' if not faibles else '   <-- ces surfaces ne tiennent PAS par la matiere'))
