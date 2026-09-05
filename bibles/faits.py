# -*- coding: utf-8 -*-
"""Rend exactes les citations des explications, et les fait suivre la version.

Deux choses d'un coup :
  1. la citation par defaut devient un extrait EXACT du Segond ;
  2. le meme extrait est calcule dans les quatre autres versions et depose dans
     CITATIONS_ALT, indexe par l'extrait Segond lui-meme. Aucune modification du
     format des 1545 questions : a l'affichage, on remplace le passage entre
     guillemets par celui de la version choisie, et ce qui manque retombe sur le
     Segond — exactement comme pour les versets.
"""
import io, os, re, sys, json
ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import extrait
from citations import extrait_exact
from typo import normalise

JEU = os.path.join(ICI, "..", "index.html")
ALIAS = { ("JOE",2,32):("JOE",3,5), ("MAL",4,2):("MAL",3,20) }
CITE = re.compile(r'«\s*(.+?)\s*»\s*\(([^)]+)\)')
ORDRE = ["sbl", "darby", "ostervald", "ba"]

def charge(chemin):
    d = extrait.charge_vpl(chemin)
    for a, b in ALIAS.items():
        if a not in d and b in d: d[a] = d[b]
    return d

def verset_de(d, ref):
    r = extrait.resout(ref)
    if not r: return None
    code, ch, vs = r
    bouts = [d.get((code, ch, v)) for v in vs]
    if any(b is None for b in bouts): return None
    return normalise(extrait.nettoie(" ".join(bouts)))

def acceptable(base, autre):
    """Une variante ne doit pas changer de nature. Trois refus :
       - beaucoup plus longue que l'extrait d'origine (la borne de proposition
         d'une autre version peut avaler toute la phrase : « lieu du crane »
         devenait « Jesus, portant sa croix, sortit vers le lieu appele... ») ;
       - des guillemets francais dedans : la citation s'ouvre deja avec eux,
         on obtiendrait « « ... » » ;
       - des crochets editoriaux, propres a l'appareil du Darby. """
    if not autre: return False
    if len(autre) > max(len(base) * 1.6, len(base) + 30): return False
    if "«" in autre or "»" in autre: return False
    if "[" in autre or "]" in autre: return False
    return True

def js(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

if __name__ == "__main__":
    srcs = json.load(io.open(os.path.join(ICI, "sources.json"), encoding="utf-8"))
    D = {c: charge(p) for c, p in srcs.items()}
    h = io.open(JEU, encoding="utf-8").read()
    faits = re.findall(r'fact:"((?:[^"\\]|\\.)*)"', h)

    remplacements = {}          # ancien fait -> nouveau fait
    alt = {c: {} for c in ORDRE}
    stats = dict(exacte=0, corrigee=0, hors=0, sans_ref=0, alt=0, ecartee=0, trop_long=0)
    for f in faits:
        m = CITE.search(f)
        if not m: continue
        q, ref = m.group(1), m.group(2).strip()
        if not re.search(r"\d+:\d+", ref): stats["sans_ref"] += 1; continue
        seg = verset_de(D["lsg1910"], ref)
        if seg is None: stats["sans_ref"] += 1; continue

        if q in seg:
            base = q; stats["exacte"] += 1
        else:
            res = extrait_exact(q, seg)
            bout = res[0] if isinstance(res, tuple) else res
            if not bout: stats["hors"] += 1; continue
            if not acceptable(q, bout): stats["trop_long"] += 1; continue
            base = bout; stats["corrigee"] += 1
            neuf = f[:m.start(1)] + base + f[m.end(1):]
            remplacements[f] = neuf

        # le meme extrait, dans les autres versions
        for c in ORDRE:
            v = verset_de(D[c], ref)
            if not v: continue
            if base in v: continue          # identique : rien a stocker
            res = extrait_exact(base, v)
            b2 = res[0] if isinstance(res, tuple) else res
            if b2 and b2 != base and acceptable(base, b2):
                alt[c][base] = b2; stats["alt"] += 1
            elif b2 and b2 != base:
                stats["ecartee"] += 1

    for k, v in stats.items(): print("  %-10s %d" % (k, v))
    json.dump({"remplacements": remplacements, "alt": alt},
              io.open(os.path.join(ICI, "faits.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("-> bibles/faits.json (%d faits reecrits, %d variantes)" % (len(remplacements), stats["alt"]))
