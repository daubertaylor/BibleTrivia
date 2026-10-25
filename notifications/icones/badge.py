# ====== LE PETIT PICTOGRAMME DES NOTIFICATIONS (v335) ======
# Android ne garde que la FORME de cette image : Chrome la peint en blanc
# (NotificationBuilderBase.applyWhiteOverlay) et la pose dans la barre d'état
# et, sur la plupart des Android, dans le rond de la notification. On lui
# donnait l'icône du jeu, un carré plein : un carré blanc. C'est maintenant la
# silhouette de l'icône — l'enfant qui lit, agenouillé —, découpée dans
# icon-512.png (ses pixels sombres), arrêtée aux genoux (dessous, le sol
# s'élargit), en blanc sur transparent, sur 20 dp des 24 du pictogramme
# (les deux dp de marge d'Android), centrée.
# Usage : python3 notifications/icones/badge.py
import os
from PIL import Image
import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ICI, "..", "..", "icon-512.png")
DST = os.path.join(ICI, "badge.png")
COTE = 96                      # 24 dp sur l'écran le plus dense (4x)

a = np.asarray(Image.open(SRC).convert("RGB")).astype(float)
L = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
m = L < 40                     # la silhouette est presque noire, le ciel jamais sous 45
m[465:, :] = False             # le sol commence à s'élargir sous les genoux
ys, xs = np.nonzero(m)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
masque = Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8), "L")
haut = round(COTE * 20 / 24)
larg = round((x1 - x0) * haut / (y1 - y0))
alpha = Image.new("L", (COTE, COTE), 0)
alpha.paste(masque.resize((larg, haut), Image.LANCZOS), ((COTE - larg) // 2, (COTE - haut) // 2))
blanc = Image.new("RGBA", (COTE, COTE), (255, 255, 255, 0))
blanc.putalpha(alpha)
blanc.save(DST, optimize=True)
print("  badge.png", blanc.size, "— silhouette", (x1 - x0), "x", (y1 - y0), "de l'icône")
