# -*- coding: utf-8 -*-
"""LA BIBLE MARTIN 1744, LUE DANS SON MODULE SWORD (CrossWire FreBDM1744).

RECONSTRUIT LE 27/10/2026. L'original vivait dans le scratchpad et a disparu
avec un redémarrage du conteneur ; bibles/ajoute_versets.py le charge pourtant
(charge_martin) et y prend trois fonctions. Il vit désormais ICI, dans le dépôt
(seuls pysword et le module SWORD restent dans le scratchpad, voir LISEZMOI) :
  · decoupe(ref)        -> (nom du livre pour pysword, chapitre, [versets]) ;
  · nettoyer(texte)     -> le verset tel que le jeu le stocke ;
  · score(segond, autre) -> leur ressemblance, de 0 à 1 (elle sert aussi à
                           reconnaître le bon verset du Darby, de l'Ostervald
                           et de la Bible Annotée quand leur numéro diffère).
CE FICHIER N'EST FIABLE QUE SI LE TÉMOIN LE DIT :
    python3 bibles/ajoute_versets.py --temoin
doit retrouver, au caractère près, les versets Martin (et ceux des neuf autres
versions) déjà en ligne. Sinon, on ne s'en sert pas.

    python3 martin.py "Jean 3:16" "1 Jean 4:8"     (montre le texte lu)"""
import os, re, sys, unicodedata
SP = os.environ.get("SP") or "/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad"
if SP not in sys.path: sys.path.insert(0, SP)

# L'ordre des livres du module, celui de sword2vpl.py : l'index dans la
# structure de pysword donne le livre, sans dépendre de son nom anglais.
OT = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SOL ISA JER LAM EZE DAN HOS JOE AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL".split()
NT = "MAT MAR LUK JOH ACT ROM 1CO 2CO GAL EPH PHI COL 1TH 2TH 1TI 2TI TIT PHM HEB JAM 1PE 2PE 1JO 2JO 3JO JUD REV".split()

BIBLE = None       # posé par charge_martin() ; chargé ici sinon
def _bible():
    global BIBLE
    if BIBLE is None:
        from pysword.modules import SwordModules
        m = SwordModules(SP + "/sword/FreBDM1744"); m.parse_modules()
        BIBLE = m.get_bible_from_module("FreBDM1744")
    return BIBLE

def decoupe(ref):
    from extrait import resout
    r = resout(ref)
    if not r: return None
    code, ch, vs = r
    S = _bible().get_structure().get_books()
    if code in OT: livre = S["ot"][OT.index(code)].name
    elif code in NT: livre = S["nt"][NT.index(code)].name
    else: return None
    return livre, ch, list(vs)

def nettoyer(t):
    """Le module met une espace fine insécable devant ; ? ! : — le jeu stocke
    une espace simple, et rien d'autre ne change."""
    t = (t or "").replace("\u202f", " ").replace("\xa0", " ")
    return re.sub(r"\s+", " ", t).strip()

def _mots(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = t.replace("œ", "oe").replace("æ", "ae")
    # Le pluriel ne fait pas un autre mot : « détresse » et « détresses ».
    return set(re.sub(r"(?<=...)[sx]$", "", w) for w in re.findall(r"[a-z]+", t) if len(w) >= 3)

def score(a, b):
    """Les mots (trois lettres et plus, sans accents, singulier et pluriel
    confondus) que les deux textes partagent, comptés des deux côtés (Dice).
    CHOISIE PAR LE TÉMOIN ET PAR LA RELECTURE, PAS AU JUGÉ :
      · sur les 279 références en ligne et les dix versions, elle ne laisse
        AUCUN écart ; Jaccard en laissait trois, Dice sans le pluriel un
        (l'Ostervald du Psaume 46:2, « détresse » / « détresses ») ;
      · les « racines » du banc versets-propres.js (cinq lettres, part du plus
        court) passaient le témoin elles aussi, mais lisaient la Martin du
        Psaume 121:8 au verset VOISIN : le 121:7, plus court (« L'Eternel te
        gardera de tout mal »), y était contenu tout entier et l'emportait.
        La part du plus court donne raison au verset le plus bref : écartée."""
    A, B = _mots(a), _mots(b)
    if not A or not B: return 0.0
    return 2.0 * len(A & B) / (len(A) + len(B))

def main():
    if len(sys.argv) < 2:
        print(__doc__); return
    sys.path.insert(0, os.path.join(os.getcwd(), "bibles"))
    for ref in sys.argv[1:]:
        d = decoupe(ref)
        if not d: print("%s : référence non comprise" % ref); continue
        livre, ch, vs = d
        t = " ".join(nettoyer(_bible().get(books=[livre], chapters=[ch], verses=[v])) for v in vs)
        print("%s (%s %d:%s)\n  %s" % (ref, livre, ch, ",".join(map(str, vs)), t))

main()
