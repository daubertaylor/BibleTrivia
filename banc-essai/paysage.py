# Cherche UNE COUTURE VERTICALE dans l'image : une colonne de pixels ou la
# couleur saute, sur beaucoup de lignes a la fois. C'est la signature de
# « l'ecran coupe en deux » — l'app figee a 393 px collee a gauche d'un ecran
# de 852, dont le bord droit tranche la photo du haut jusqu'en bas.
# On rend le pourcentage de lignes qui sautent a la colonne la plus marquee,
# d'abord DANS la bande du bord de l'app, puis AILLEURS (temoin : la photo a
# elle seule contient toujours quelques bords verticaux).
import json, sys
from PIL import Image
D = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/'
m = json.load(open(D + 'paysage.json'))
S = m['echelle']            # pixels physiques par pixel CSS
bord = m['bord'] * S        # bord droit de la colonne, en pixels physiques
BANDE = 18 * S              # on cherche a +/- 18 px CSS de ce bord
SEUIL = 24                  # somme des trois canaux : en dessous, c'est du bruit

im = Image.open(D + 'paysage.png').convert('RGB')
W, H = im.size
px = im.load()
lignes = list(range(0, H, 4))

def sauts(x):
    n = 0
    for y in lignes:
        a, b = px[x-1, y], px[x, y]
        if abs(a[0]-b[0]) + abs(a[1]-b[1]) + abs(a[2]-b[2]) > SEUIL: n += 1
    return n

dans, hors = 0, 0
for x in range(1, W):
    n = sauts(x)
    if abs(x - bord) <= BANDE: dans = max(dans, n)
    else:                      hors = max(hors, n)

print('%.1f %.1f' % (100.0*dans/len(lignes), 100.0*hors/len(lignes)))
