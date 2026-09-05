# -*- coding: utf-8 -*-
"""LA TYPOGRAPHIE DU JEU, en un seul endroit.

Les sources ne se ressemblent pas : le Segond et l'Ostervald d'eBible collent la
ponctuation haute (« crainte? »), le Segond oublie parfois l'espace apres une
virgule (« unique,afin que »), une version essayee melangeait les deux
apostrophes dans un meme verset. Tout passe donc par ici, et TOUTES les
versions en sortent avec la meme allure — celle des 1545 questions du jeu :
apostrophe droite, espace avant la ponctuation haute, guillemets francais.
"""
import re

INSEC = " "   # espace insecable : le « ? » ne part jamais seul a la ligne

LETTRE = "A-Za-zÀ-ÖØ-öø-ÿŒœ"

def apparies(t):
    """Vrai si chaque « trouve son » , dans le bon ordre."""
    prof = 0
    for c in t:
        if c == "«": prof += 1
        elif c == "»":
            prof -= 1
            if prof < 0: return False
    return prof == 0

# LES LETTRES DES PSAUMES ACROSTICHES. Les psaumes 25, 34, 37, 111, 112, 119,
# 145 sont batis sur l'alphabet hebreu : chaque strophe s'ouvre par une lettre,
# imprimee en tete comme un titre. La Bible Annotee la fait entrer DANS le
# verset — « Nun. Ta parole est une lampe a mes pieds ». Sur une carte de jeu,
# ce « Nun. » ressemble a une coquille. C'est un intertitre, pas l'Ecriture.
LETTRES_HEBREUX = ("Aleph|Beth|Guimel|Ghimel|Daleth|Hé|He|Vav|Vau|Zaïn|Zain|Heth|Teth|"
                   "Yod|Jod|Caph|Kaph|Lamed|Mem|Nun|Samech|Aïn|Ain|Phé|Pe|Tsadé|Tsade|"
                   "Koph|Resch|Rech|Schin|Shin|Thav|Tav")

# LES COQUILLES DE NUMERISATION, une par une. On ne devine pas : chaque entree
# a ete verifiee dans le fichier source, et n'est corrigee que parce qu'aucune
# edition francaise n'ecrit cela. Pas de regle generale — une regle attraperait
# des tournures legitimes (« pardonne-leur, car », « l'un, et aimera l'autre »).
ERRATA = {
    "Et une, lumière sur mon sentier": "Et une lumière sur mon sentier",
}

def normalise(t):
    if not t: return t
    t = t.replace("’", "'").replace("ʼ", "'")      # une seule apostrophe
    t = t.replace("“", "«").replace("”", "»")
    t = re.sub(r"[ \t\r\n   ]+", " ", t).strip()

    # une virgule / un point suivis d'une lettre : il manque l'espace
    t = re.sub(r"([,;])(?=[" + LETTRE + r"])", r"\1 ", t)
    t = re.sub(r"([.!?])(?=[A-ZÀ-ÖØ-Þ])", r"\1 ", t)

    # ponctuation haute : espace insecable devant, jamais deux
    t = re.sub(r"[  ]*([?!;:])", lambda m: INSEC + m.group(1), t)
    #   ... sauf le deux-points d'une reference : « Genese 2:7 », jamais « 2 : 7 »
    t = re.sub(r"(\d)" + INSEC + r":(?=\d)", r"\1:", t)

    # guillemets francais : insecable a l'interieur, rien a l'exterieur
    t = re.sub(r"«[  ]*", "«" + INSEC, t)
    t = re.sub(r"[  ]*»", INSEC + "»", t)

    # un guillemet orphelin : le verset a ete coupe au milieu d'une citation, et
    # il resterait un « » » qui n'ouvre rien. On verifie l'appariement DANS
    # L'ORDRE — compter les deux ne suffit pas, « » ... « » passerait pour bon.
    if not apparies(t):
        t = t.replace("«" + INSEC, "").replace(INSEC + "»", "").replace("«", "").replace("»", "")

    # LES CROCHETS DU DARBY. Sa traduction signale entre crochets les mots
    # ajoutes pour la clarte : « pour [avoir du] secours ». C'est l'appareil du
    # savant, pas le verset : sur une carte de jeu, ces crochets ressemblent a
    # une coquille. On garde les mots, on retire les crochets.
    t = re.sub(r"\[\s*([^\]]*?)\s*\]", r"\1", t)
    t = re.sub(r"\s*\.\.\.", "…", t)                    # points de suspension
    # l'intertitre de strophe part avec son point
    t = re.sub(r"^(?:" + LETTRES_HEBREUX + r")\s*\.\s+", "", t)
    for faux, vrai in ERRATA.items():
        if faux in t: t = t.replace(faux, vrai)
    t = re.sub(r"[ ]{2,}", " ", t)
    return t.strip()
