# -*- coding: utf-8 -*-
"""Les versions ANGLAISES des 248 references, extraites de leur source publiee.

Meme chemin que regenere.py, meme fichier de sortie (textes.json), deux
differences :
  · la typographie passe par typo_en.py, parce que l'anglais ne met pas
    d'espace devant « ? » et n'emploie pas les chevrons ;
  · les references restent celles du JEU, en francais (« Jean 3:16 ») : ce sont
    des CLES, pas du texte affiche. Le code de livre qu'en tire resout() —
    « JHN » — est le meme dans les six sources, francaises comme anglaises.
"""
import io, os, sys, json
ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import extrait
from typo_en import normalise
from regenere import ALIAS, ACCUEIL

JEU = os.path.join(ICI, "..", "index.html")
SP = "/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/en-bibles"
SOURCES = {
    "kjv1769": os.path.join(SP, "eng-kjv2006_vpl.txt"),   # eBible « eng-kjv2006 », texte de 1769
    "asv1901": os.path.join(SP, "eng-asv_vpl.txt"),       # eBible « eng-asv »
    "web":     os.path.join(SP, "engwebp_vpl.txt"),       # eBible « engwebp », canon protestant
}

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
        out[ref] = normalise(" ".join(bouts))
    return out, absents

if __name__ == "__main__":
    jeu = extrait.refs_du_jeu(JEU)
    chemin = os.path.join(ICI, "textes.json")
    tout = json.load(io.open(chemin, encoding="utf-8"))
    for cle, src in SOURCES.items():
        out, absents = extrait_source(src, jeu)
        if ACCUEIL in out:
            out[ACCUEIL + "a"] = out[ACCUEIL].split(",")[0].strip()
        tout[cle] = out
        print("%-10s %3d versets  (%d sans correspondance%s)"
              % (cle, len(out), len(absents), (" : " + ", ".join(absents)) if absents else ""))
    json.dump(tout, io.open(chemin, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("-> bibles/textes.json :", ", ".join(tout.keys()))
