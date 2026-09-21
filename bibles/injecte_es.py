# -*- coding: utf-8 -*-
"""Dépose les deux versions espagnoles dans VERSETS_ALT, SANS toucher aux sept
   autres. injecte.py réécrit le bloc entier à partir d'une liste ORDRE qui a
   vieilli ; ici on ajoute, on ne reconstruit pas."""
import io, os, re, json
ICI = os.path.dirname(os.path.abspath(__file__))
JEU = os.path.join(ICI, "..", "index.html")
AJOUT = ["rv1909", "rv1865"]

def js(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

h = io.open(JEU, encoding="utf-8").read()
T = json.load(io.open(os.path.join(ICI, "textes.json"), encoding="utf-8"))
avant = len(h)

i = h.index("const VERSETS_ALT")
# fin du littéral : accolades équilibrées
k = h.index("{", i); prof, j = 0, k
while j < len(h):
    if h[j] == "{": prof += 1
    elif h[j] == "}":
        prof -= 1
        if prof == 0: break
    j += 1
bloc = h[k:j]            # sans l'accolade fermante

for cle in AJOUT:
    # si la version est déjà là, on la remplace ; sinon on l'ajoute à la fin
    m = re.search(r"\n  " + cle + r": \{.*?\n  \},", bloc, re.S)
    lignes = ["\n  %s: {" % cle]
    for ref in sorted(T[cle]):
        lignes.append("    %s:%s," % (js(ref), js(T[cle][ref])))
    lignes.append("  },")
    neuf = "\n".join(lignes)
    if m: bloc = bloc[:m.start()] + neuf + bloc[m.end():]
    else:
        # LA DERNIÈRE VERSION DU BLOC N'A PAS DE VIRGULE. On ajoute la sienne
        # avant d'écrire la suivante, sinon le fichier ne s'analyse plus.
        q = bloc.rstrip()
        if not q.endswith(","): q += ","
        bloc = q + "\n" + neuf + "\n"

h = h[:k] + bloc + h[j:]
io.open(JEU, "w", encoding="utf-8").write(h)
print("VERSETS_ALT : " + ", ".join("%s=%d" % (c, len(T[c])) for c in AJOUT))
print("index.html : %d -> %d octets (%+d)" % (avant, len(h), len(h) - avant))
