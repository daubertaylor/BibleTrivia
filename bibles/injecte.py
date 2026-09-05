# -*- coding: utf-8 -*-
"""Depose les textes regeneres dans index.html : le Segond complet devient le
   texte par defaut des versets, et VERSETS_ALT recoit les autres versions."""
import io, os, re, json, sys
ICI = os.path.dirname(os.path.abspath(__file__))
JEU = os.path.join(ICI, "..", "index.html")
ORDRE = ["sbl", "darby", "ostervald", "ba"]      # l'ordre du registre, sans le defaut

def js(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

def bloc(h, debut):
    """Renvoie (i, j) du litteral qui suit `debut`, accolades/crochets equilibres."""
    m = re.search(re.escape(debut), h)
    i = m.end()
    while h[i] in " \n\t=": i += 1
    ouvre, ferme = h[i], {"[": "]", "{": "}"}[h[i]]
    prof, j = 0, i
    while j < len(h):
        if h[j] == ouvre: prof += 1
        elif h[j] == ferme:
            prof -= 1
            if prof == 0: return i, j + 1
        j += 1
    raise SystemExit("bloc non termine : " + debut)

h = io.open(JEU, encoding="utf-8").read()
T = json.load(io.open(os.path.join(ICI, "textes.json"), encoding="utf-8"))
avant = len(h)

# --- 1. HERO_VERSES : le texte par defaut devient le vrai Segond 1910 -------
i, j = bloc(h, "const HERO_VERSES")
src = h[i:j]
remplaces = [0]
def refait(m):
    entree = m.group(0)
    r = re.search(r'r:"((?:[^"\\]|\\.)*)"', entree)
    if not r: return entree
    neuf = T["lsg1910"].get(r.group(1))
    if not neuf: return entree
    remplaces[0] += 1
    return '{ t:' + js(neuf) + ', r:' + js(r.group(1)) + ' }'
neuf = re.sub(r'\{[^{}]*\}', refait, src)
h = h[:i] + neuf + h[j:]
print("HERO_VERSES : %d versets passes au Segond complet" % remplaces[0])

# --- 2. VERSETS_ALT : toutes les autres versions ----------------------------
i, j = bloc(h, "const VERSETS_ALT")
lignes = ["{"]
for cle in ORDRE:
    lignes.append("  %s: {" % cle)
    for ref in sorted(T[cle]):
        lignes.append("    %s:%s," % (js(ref), js(T[cle][ref])))
    lignes.append("  },")
lignes.append("}")
h = h[:i] + "\n".join(lignes) + h[j:]
print("VERSETS_ALT : " + ", ".join("%s=%d" % (c, len(T[c])) for c in ORDRE))

io.open(JEU, "w", encoding="utf-8").write(h)
print("index.html : %d -> %d octets (%+d)" % (avant, len(h), len(h) - avant))
