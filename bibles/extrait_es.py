# -*- coding: utf-8 -*-
"""Les deux versions espagnoles, prises AUX MÊMES COORDONNÉES que les
   anglaises (voir aligne_es.py, qui démontre qu'elles partagent leur
   numérotation au lieu de le supposer)."""
import io, os, sys, json
ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from extrait import charge_vpl
from typo_es import normalise
from aligne_es import SOURCES

if __name__ == "__main__":
    coords = json.load(io.open(os.path.join(ICI, "coords_en.json"), encoding="utf-8"))
    chemin = os.path.join(ICI, "textes.json")
    tout = json.load(io.open(chemin, encoding="utf-8"))
    vides = []
    for cle, src in SOURCES.items():
        d = charge_vpl(src)
        out, manquants = {}, []
        for ref, (code, ch, vs) in coords.items():
            bouts = [d.get((code, ch, v)) for v in vs]
            if any(b is None for b in bouts): manquants.append(ref); continue
            t = normalise(" ".join(bouts))
            if not t: vides.append(cle + " " + ref); continue
            # le demi-verset garde sa moitié, pas le verset entier
            if ref.endswith("a") and "," in t: t = t.split(",")[0].strip()
            out[ref] = t
        tout[cle] = out
        print("%-9s %3d versets  (%d manquants%s)" % (cle, len(out), len(manquants),
              (" : " + ", ".join(manquants)) if manquants else ""))
    # LE CONTRÔLE QUI A SAUVÉ LE PSAUME 150 EN ANGLAIS : aucun verset ne sort vide.
    print("versets vidés par le nettoyage : %d%s" % (len(vides), (" — " + ", ".join(vides[:6])) if vides else ""))
    json.dump(tout, io.open(chemin, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("-> bibles/textes.json :", ", ".join(tout.keys()))
