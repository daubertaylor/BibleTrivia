# -*- coding: utf-8 -*-
"""RETROUVER CHAQUE VERSET ANGLAIS PAR SON CONTENU, PAS PAR SON NUMÉRO.

Les numéros ne se correspondent pas d'une langue à l'autre : dans les psaumes,
le français compte la suscription comme verset 1, l'anglais non — « Psaume
34:18 » en français, c'est le 34:17 anglais. Extraire par numéro livre donc le
verset d'à côté, et ça ne se voit pas : le texte est plausible, il est juste
faux. Mesuré : 6 psaumes décalés sur les 244 références.

Le jeu porte déjà une table anglaise dont l'alignement a été relu un par un.
On s'en sert comme d'une CARTE : pour chaque référence, on cherche son texte
DANS la source, et on note où il tombe. Ces coordonnées-là sont vraies, et
elles servent ensuite aux trois versions — King James, American Standard,
World English — qui partagent toutes la numérotation anglaise.

C'est la méthode déjà employée pour la Martin 1744 en français, et pour la même
raison : « chaque verset a été retrouvé par son contenu, pas par son numéro ».
"""
import io, os, re, sys, json, collections
ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from extrait import charge_vpl, resout
from typo_en import normalise

SP = "/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad/en-bibles"
SOURCES = {
    "kjv1769": os.path.join(SP, "eng-kjv2006_vpl.txt"),
    "asv1901": os.path.join(SP, "eng-asv_vpl.txt"),
    "web":     os.path.join(SP, "engwebp_vpl.txt"),
}

def cle(t):
    """La forme qu'on compare : ni casse, ni ponctuation, ni apostrophe, ni
       ESPACES. Assez lâche pour que « the Lord » retrouve « the LORD »,
       « Cesar » « Cæsar » et « whereunto » « where unto » — cette édition
       coupe deux mots composés ; assez stricte pour ne jamais confondre deux
       versets voisins, qui ne partagent jamais toutes leurs lettres."""
    t = t.lower().replace("æ", "e").replace("œ", "oe")
    t = re.sub(r"[^a-z0-9]+", "", t)
    return t

def table_du_jeu(html):
    s = io.open(html, encoding="utf-8").read()
    i = s.index("const VERSETS_EN = {"); k = s.index("\n};", i)
    paires = re.findall(r'"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"', s[i:k])
    return {json.loads('"'+a+'"'): json.loads('"'+b+'"') for a, b in paires}

def cherche(src, code, ch, texte, fenetre=3, demi=""):
    """Une suite de versets consécutifs dont le texte, mis bout à bout, est
       celui qu'on cherche. On balaie le chapitre annoncé et ses voisins.
       UN DEMI-VERSET (« Hébreux 4:16a ») ne peut pas être égal à un verset :
       on le cherche alors en DÉBUT (a) ou en FIN (b) de verset — c'est
       exactement ce que la notation biblique veut dire."""
    vise = cle(texte)
    if not vise: return None
    for dch in (0, -1, 1):
        c = ch + dch
        versets = sorted(v for (a, b, v) in src if a == code and b == c)
        if not versets: continue
        for i, v1 in enumerate(versets):
            morceaux = []
            for v2 in versets[i:i+6]:
                morceaux.append(src[(code, c, v2)])
                k = cle(normalise(" ".join(morceaux)))
                if k == vise: return (code, c, list(range(v1, v2+1)))
                # UN DEMI-VERSET TIENT DANS UN VERSET. Sans cette borne, la
                #  fin de « Michée 6:8b » se retrouvait aussi à la fin d une
                #  suite de six versets — vrai, et inutile : on aurait livré
                #  six versets là où le jeu en cite une moitié.
                if len(morceaux) == 1 and demi == "a" and k.startswith(vise): return (code, c, [v1])
                if len(morceaux) == 1 and demi == "b" and k.endswith(vise): return (code, c, [v1])
    return None

if __name__ == "__main__":
    jeu = table_du_jeu(os.path.join(ICI, "..", "index.html"))
    kjv = charge_vpl(SOURCES["kjv1769"])
    coords, perdus, decales = {}, [], []
    for ref, texte in jeu.items():
        demi = ref[-1] if ref[-1] in "ab" else ""
        base = ref[:-1] if demi else ref
        r = resout(base)
        if not r: perdus.append((ref, "référence illisible")); continue
        code, ch, vs = r
        t = cherche(kjv, code, ch, texte, demi=demi)
        if not t: perdus.append((ref, "texte introuvable dans la source")); continue
        coords[ref] = t
        if t[1] != ch or t[2] != vs:
            decales.append((ref, "%s %d:%s" % (code, ch, "-".join(map(str, vs))),
                                 "%s %d:%s" % (t[0], t[1], "-".join(map(str, t[2])))))
    print("références du jeu : %d | retrouvées : %d | perdues : %d"
          % (len(jeu), len(coords), len(perdus)))
    print("\nDÉCALAGES ENTRE NUMÉROTATION FRANÇAISE ET ANGLAISE (%d) :" % len(decales))
    for ref, a, b in decales: print("   %-28s fr %-14s -> en %s" % (ref, a, b))
    if perdus:
        print("\nPERDUES :")
        for ref, pourquoi in perdus: print("   %-28s %s" % (ref, pourquoi))
    json.dump({k: list(v[:2]) + [v[2]] for k, v in coords.items()},
              io.open(os.path.join(ICI, "coords_en.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=0)
    print("\n-> bibles/coords_en.json")
