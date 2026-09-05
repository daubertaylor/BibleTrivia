# -*- coding: utf-8 -*-
"""LA TYPOGRAPHIE DU JEU, en un seul endroit.

Les sources ne se ressemblent pas : le Segond et l'Ostervald d'eBible collent la
ponctuation haute (« crainte? »), le Segond oublie parfois l'espace apres une
virgule (« unique,afin que »), la Sainte Bible libre melange les deux
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
    t = re.sub(r"[ ]{2,}", " ", t)
    return t.strip()
