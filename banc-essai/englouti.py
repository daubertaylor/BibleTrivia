# DEUX MESURES SUR LE MÊME BORD.
#
# « bord » — LA COUPE FRANCHE SE MESURE SUR LA LIGNE DU BORD, PAS AILLEURS.
#   Un bord de carte au milieu de la liste est normal (une carte finit,
#   l'autre commence) ; ce qui fait « englouti », c'est que le contenu soit
#   tranché NET par le bord BAS du conteneur. On compare donc la luminance
#   moyenne des quatre lignes juste DEDANS avec celle des quatre lignes juste
#   DEHORS. Contenu avalé -> gros écart. Fondu -> le dedans a déjà pris la
#   couleur de la feuille, l'écart tombe à rien.
#
# « rampe » — DROITE OU COURBE ? Sur un bloc parfaitement uni posé dans la
#   liste, le profil de luminance à travers le fondu EST la rampe du masque.
#   Sa dérivée seconde dit tout : une droite fait deux pics (là où la pente
#   démarre et là où elle s'arrête, deux lignes fantômes en travers du texte),
#   une courbe smoothstep n'en fait aucun. Elle sert AUSSI de garde-fou contre
#   la disparition pure et simple du masque : amplitude nulle = plus de fondu.
import json, sys
from PIL import Image
D = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/'
mode = sys.argv[1] if len(sys.argv) > 1 else 'bord'
r = json.load(open(D + 'englouti-' + mode + '.json'))
im = Image.open(D + 'englouti-' + mode + '.png').convert('RGB')
S = 3
x0, x1 = (r['left'] + 30) * S, min((r['right'] - 30) * S, im.size[0] - 1)

def ligne(y):
    px = [im.getpixel((x, y)) for x in range(x0, x1, 4)]
    return sum(0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2] for c in px) / len(px)

if mode == 'bord':
    def bande(d0, d1):
        v = [ligne((r['bot'] + d) * S) for d in range(d0, d1) if 0 <= (r['bot'] + d) * S < im.size[1]]
        return sum(v) / len(v)
    print(abs(bande(-5, -1) - bande(1, 5)))
else:
    y1 = r['bot'] * S
    y0 = max(0, y1 - 70 * S)          # le voile fait 46 px : 70 couvre large
    prof = [ligne(y) for y in range(y0, min(y1, im.size[1] - 1))]
    k = 5                              # lissage : tue le grain du verre, pas la forme
    liss = [sum(prof[max(0,i-k):i+k+1]) / len(prof[max(0,i-k):i+k+1]) for i in range(len(prof))]
    d1 = [liss[i] - liss[i-1] for i in range(1, len(liss))]
    d2 = [abs(d1[i] - d1[i-1]) for i in range(1, len(d1))]
    amp = max(liss) - min(liss)
    print('%.1f %.5f' % (amp, (max(d2) / amp) if amp > 1 else 9.999))
