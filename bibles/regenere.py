# -*- coding: utf-8 -*-
"""Reconstruit d'un coup TOUS les textes bibliques du jeu, a partir des sources.

Le texte par defaut (HERO_VERSES) devient le VRAI Segond 1910 : il etait
auparavant abrege — la carte annoncait « Jean 3:16 · LSG » et n'affichait
qu'une moitie du verset. Les autres versions passent par la meme moulinette,
donc toutes sortent avec la typographie du jeu.
"""
import io, os, re, sys, json
ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import extrait
from typo import normalise

JEU = os.path.join(ICI, "..", "index.html")

# Les numerotations qui divergent : le texte existe, sous un autre numero.
# (numerotation hebraique de l'Ancien Testament)
ALIAS = { ("JOE", 2, 32): ("JOE", 3, 5), ("MAL", 4, 2): ("MAL", 3, 20) }
ACCUEIL = "Hébreux 4:16"      # le verset de la ligne d'accueil

def extrait_source(chemin, jeu):
    d = extrait.charge_vpl(chemin)
    for source, cible in ALIAS.items():
        if source not in d and cible in d: d[source] = d[cible]
    out, absents = {}, []
    for ref, _ in jeu:
        r = extrait.resout(ref)
        if not r: absents.append(ref); continue
        code, ch, vs = r
        bouts = [d.get((code, ch, v)) for v in vs]
        if any(b is None for b in bouts): absents.append(ref); continue
        out[ref] = normalise(extrait.nettoie(" ".join(bouts)))
    return out, absents

def js(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

if __name__ == "__main__":
    jeu = extrait.refs_du_jeu(JEU)
    srcs = json.load(io.open(os.path.join(ICI, "sources.json"), encoding="utf-8"))
    tout = {}
    for cle, chemin in srcs.items():
        out, absents = extrait_source(chemin, jeu)
        # LA LIGNE DE L'ACCUEIL. Elle porte Hebreux 4:16, mais le verset entier
        # y ferait quatre lignes et pousserait les cartes de mode. Elle porte
        # donc sa PREMIERE PROPOSITION, sous la cle « 4:16a » — « a » est la
        # notation biblique de la premiere moitie d'un verset.
        # Elle est calculee ICI, et non deposee a la main dans index.html :
        # sinon la regeneration suivante l'effacerait sans bruit.
        if ACCUEIL in out:
            out[ACCUEIL + "a"] = out[ACCUEIL].split(",")[0].strip()
        tout[cle] = out
        print("%-10s %3d versets  (%d sans correspondance%s)"
              % (cle, len(out), len(absents), (" : " + ", ".join(absents)) if absents else ""))
    json.dump(tout, io.open(os.path.join(ICI, "textes.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=0)
    print("-> bibles/textes.json")
