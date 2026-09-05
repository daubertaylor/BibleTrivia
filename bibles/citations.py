# -*- coding: utf-8 -*-
"""LES CITATIONS DES EXPLICATIONS, RENDUES EXACTES.

Une explication qui ouvre des guillemets promet le texte biblique. Beaucoup
resumaient de memoire : « la plus grande, c'est l'amour » la ou Segond ecrit
« la charite ». On ne reecrit pas la citation a la main : on cherche, DANS le
verset reel, le plus court passage continu qui contient tous les mots pleins de
la citation, et c'est lui qu'on garde. Le sens est preserve, les mots sont ceux
de la Bible.

Le meme calcul tourne sur chaque version : l'extrait suit donc la version
choisie. Quand un mot de la citation n'existe pas dans une version (« amour »
contre « charite »), aucun passage ne le contient : la citation est signalee
plutot que devinee.
"""
import re, unicodedata

VIDES = {
 "le","la","les","un","une","des","de","du","d","l","et","ou","a","au","aux","en","dans","par",
 "pour","sur","sous","avec","sans","que","qui","quoi","dont","ce","cet","cette","ces","son","sa",
 "ses","leur","leurs","mon","ma","mes","ton","ta","tes","notre","nos","votre","vos","il","elle",
 "ils","elles","je","tu","nous","vous","on","se","s","ne","pas","point","est","sont","etre","c",
 "y","n","me","te","lui","eux","moi","toi","si","car","mais","donc","or","ni","comme","tout",
 "toute","tous","toutes","plus","tres","bien","the","of"
}

def _mots(t):
    t = unicodedata.normalize("NFKD", t.replace("’", "'").replace(" ", " "))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    return re.findall(r"[a-z0-9]+", t)

def _pleins(t):
    return [m for m in _mots(t) if m not in VIDES and len(m) > 2]

def extrait_exact(citation, verset):
    """Le plus court passage CONTINU du verset contenant tous les mots pleins
       de la citation. None si l'un d'eux n'y figure pas."""
    besoin = _pleins(citation)
    if not besoin: return None
    # on decoupe le verset en mots en gardant leur position dans le texte
    jetons = [(m.group(0), m.start(), m.end()) for m in re.finditer(r"\S+", verset)]
    norm = [_mots(j[0]) for j in jetons]
    plats = [(n[0] if n else "", i) for i, n in enumerate(norm)]
    presents = set(w for n in norm for w in n)
    manquants = [b for b in besoin if b not in presents]
    if manquants: return None, manquants
    cible = set(besoin)
    meilleur = None
    for i in range(len(jetons)):
        vus = set()
        for j in range(i, len(jetons)):
            vus.update(w for w in norm[j] if w in cible)
            if vus >= cible:
                if meilleur is None or (j - i) < (meilleur[1] - meilleur[0]):
                    meilleur = (i, j)
                break
    if meilleur is None: return None, besoin
    i, j = meilleur
    # ON ETEND AUX BORNES DE LA PROPOSITION. Le passage le plus court est
    # exact mais illisible : « Il n'est pas ici » se reduisait a « ici », les
    # mots outils etant ignores. On repart donc du debut de la proposition qui
    # porte le premier mot plein, jusqu'a la fin de celle qui porte le dernier.
    deb = jetons[i][1]
    while deb > 0 and verset[deb-1] not in ".;:!?":
        deb -= 1
    fin = jetons[j][2]
    while fin < len(verset) and verset[fin-1] not in ".;:!?,":
        fin += 1
    bout = verset[deb:fin].strip()
    bout = bout.strip(" ,;:").rstrip(".").strip()
    return bout, []
