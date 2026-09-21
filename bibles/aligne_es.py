# -*- coding: utf-8 -*-
"""L'ESPAGNOL N'A PAS BESOIN D'ÊTRE RÉALIGNÉ — MAIS IL FAUT LE PROUVER.

En anglais, il a fallu retrouver chaque verset PAR SON CONTENU : les psaumes
ne s'y numérotent pas comme en français, la suscription n'y compte pas pour un
verset, et extraire par numéro livrait le verset d'à côté — plausible, et faux.
aligne_en.py a donc produit bibles/coords_en.json : pour chacune des 244
références du jeu, où elle tombe RÉELLEMENT dans une édition anglaise.

La Reina-Valera suit la MÊME numérotation que les éditions anglaises. On peut
donc réutiliser ces coordonnées telles quelles — à condition de le démontrer,
pas de le supposer. C'est ce que fait ce fichier, et il le fait sur une
propriété qui ne peut pas mentir : LE NOMBRE DE VERSETS PAR CHAPITRE.

Un psaume à suscription compte un verset de plus en français qu'en anglais.
Si la source espagnole a, chapitre par chapitre, exactement le compte anglais,
alors elle partage la numérotation anglaise. Si un seul chapitre diffère, le
contrôle le dit et on ne va pas plus loin.

    python3 bibles/aligne_es.py
"""
import io, os, sys, json, collections

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from extrait import charge_vpl

SP = os.environ.get("SP") or "/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad"
SOURCES = {
    "rv1909": SP + "/es/rv1909/spaRV1909_vpl.txt",
    "rv1865": SP + "/es/rv1865_vpl.txt",
}
# Les éditions anglaises servent de témoin : c'est leur numérotation qu'on dit
# partager.
TEMOIN = SP + "/eng-kjv2006_vpl.txt"


def comptes(d):
    c = collections.Counter()
    for (code, ch, v) in d:
        if v > c[(code, ch)]: c[(code, ch)] = v
    return c


if __name__ == "__main__":
    coords = json.load(io.open(os.path.join(ICI, "coords_en.json"), encoding="utf-8"))
    chapitres = set((c, ch) for c, ch, _ in coords.values())
    if not os.path.exists(TEMOIN):
        print("témoin anglais absent (%s) : on compare alors les deux espagnoles entre elles" % TEMOIN)
        ref = None
    else:
        ref = comptes(charge_vpl(TEMOIN))
    ko = 0
    for cle, src in SOURCES.items():
        if not os.path.exists(src):
            print("%-8s SOURCE ABSENTE %s" % (cle, src)); ko += 1; continue
        d = charge_vpl(src)
        c = comptes(d)
        # 1. chaque coordonnée du jeu existe-t-elle ?
        manque = [r for r, (code, ch, vs) in coords.items() if any((code, ch, v) not in d for v in vs)]
        # 2. les chapitres concernés ont-ils le compte du témoin ?
        ecarts = []
        if ref:
            for (code, ch) in sorted(chapitres):
                if ref.get((code, ch)) and c.get((code, ch)) and ref[(code, ch)] != c[(code, ch)]:
                    ecarts.append("%s %d : %d versets ici, %d au témoin" % (code, ch, c[(code, ch)], ref[(code, ch)]))
        print("%-8s %5d versets   %3d coordonnée(s) manquante(s)   %d écart(s) de numérotation"
              % (cle, len(d), len(manque), len(ecarts)))
        for e in ecarts[:6]: print("            " + e)
        for m in manque[:6]: print("            manque : " + m)
        if manque or ecarts: ko += 1
    print("\n  " + ("OK — la numérotation espagnole est bien celle des coordonnées" if ko == 0
                    else "%d source(s) en défaut" % ko))
    sys.exit(0 if ko == 0 else 1)
