# On compare l'image AU REPOS et l'image PRESSEE : les pixels qui ont change
# sont exactement l'onde. Sa boite englobante, comparee a la boite du bouton,
# donne les deux defauts possibles — un anneau non peint au bord, ou un halo
# qui deborde. On mesure sur la LIGNE MEDIANE (horizontale et verticale) pour
# ne pas confondre l'arrondi des coins avec un anneau.
import json
from PIL import Image
D = '/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/'
m = json.load(open(D + 'bord.json'))
M, S = m['marge'], m['S']
a = Image.open(D + 'bord-repos.png').convert('RGB')
b = Image.open(D + 'bord-presse.png').convert('RGB')
W, H = a.size
pa, pb = a.load(), b.load()
SEUIL = 6          # une difference plus faible n'est que du bruit de rendu

def change(x, y):
    ca, cb = pa[x, y], pb[x, y]
    return max(abs(ca[0]-cb[0]), abs(ca[1]-cb[1]), abs(ca[2]-cb[2])) > SEUIL

total = sum(1 for y in range(0, H, 3) for x in range(0, W, 3) if change(x, y))

# bord gauche du bouton dans l'image : M px de marge
bx0 = M * S
by_mid = H // 2
# ANNEAU : depuis le bord, combien de px avant que ca change ?
anneau = 0
for d in range(0, 8 * S):
    if change(bx0 + d, by_mid):
        anneau = d / S
        break
else:
    anneau = 99
# HALO : combien de px AVANT le bord ont change ?
halo = 0
for d in range(1, M * S):
    if change(bx0 - d, by_mid):
        halo = d / S
print('%.3f %.3f %d' % (anneau, halo, total))
