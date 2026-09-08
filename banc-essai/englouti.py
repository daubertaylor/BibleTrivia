# LA COUPE FRANCHE SE MESURE SUR LA LIGNE DU BORD, PAS AILLEURS.
# Un bord de carte au milieu de la liste est normal (une carte finit, l'autre
# commence) ; ce qui fait « englouti », c'est que le contenu soit tranche NET
# par le bord BAS du conteneur. On compare donc la luminance moyenne des
# quatre lignes juste DEDANS avec celle des quatre lignes juste DEHORS (la
# feuille). Contenu avale par le bord -> gros ecart. Fondu -> le dedans a deja
# pris la couleur de la feuille, l'ecart tombe a rien.
import json
from PIL import Image
D = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/'
r = json.load(open(D + 'englouti.json'))
im = Image.open(D + 'englouti.png').convert('RGB')
S = 3
x0, x1 = (r['left'] + 30) * S, min((r['right'] - 30) * S, im.size[0] - 1)

def ligne(y):
    px = [im.getpixel((x, y)) for x in range(x0, x1, 4)]
    return sum(0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2] for c in px) / len(px)

def bande(d0, d1):
    v = [ligne((r['bot'] + d) * S) for d in range(d0, d1) if 0 <= (r['bot'] + d) * S < im.size[1]]
    return sum(v) / len(v)

print(abs(bande(-5, -1) - bande(1, 5)))
