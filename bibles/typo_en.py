# -*- coding: utf-8 -*-
"""LA TYPOGRAPHIE ANGLAISE, en un seul endroit — le pendant de typo.py.

On ne peut pas faire passer l'anglais par les regles francaises : elles posent
une espace insecable devant « ? ! ; : » et remplacent les guillemets par des
chevrons. « Jesus wept ! » n'est pas de l'anglais, et « Follow me » entre
chevrons non plus. Les questions anglaises du jeu, elles, emploient les
guillemets courbes — c'est donc ce que les versets doivent employer aussi.

Ce que les sources anglaises apportent en plus du texte, et qu'on retire :
  · le pied-de-mouche « ¶ » du roi Jacques (2 970 occurrences) : c'est une
    marque de paragraphe, pas un mot ;
  · les crochets des mots suppleés, « the LORD [is] my shepherd » (14 241) :
    l'appareil du traducteur, pas l'Ecriture — on garde les mots, on retire
    les crochets, exactement comme pour le Darby en francais ;
  · les suscriptions de psaume, « A Psalm of David. », que ces editions font
    entrer DANS le verset 1 : c'est un intertitre. Le joueur qui lit
    « Psalm 23:1 » attend « The LORD is my shepherd », pas la notice.
"""
import re

# Les suscriptions, telles qu'elles s'ecrivent dans les trois editions. Chacune
# a ete relevee dans les fichiers sources, pas devinee.
# UN ARTICLE OU RIEN. Ma première liste acceptait « Praise » en tête de phrase
# — et « Praise ye the LORD. » ouvre la moitié des psaumes de louange. Le
# nettoyage mangeait donc de l'Écriture : le psaume 150 perdait ses cinq
# premiers versets, réduits au vide, sans que rien ne le signale. Une
# suscription s'annonce par un article (« A Psalm of David. ») ou par la
# formule du chantre ; un verset, jamais.
SUSCRIPTION = re.compile(
    r"^(?:(?:"
    r"(?:For|To) the [Cc]hief [Mm]usician[^.]{0,90}\."           # « To the chief Musician, A Psalm of David. »
    r"|(?:A|An|The) "
    r"(?:Psalm|Song|Prayer|Maschil|Michtam|Contemplation|Commemorative Poem|"
    r"Meditation|Praise|Instruction|Poem)[^.]{0,90}\."            # « A Psalm of David. »
    r"|(?:Maschil|Michtam) of [^.]{0,60}\."                       # la forme sans article
    r")\s*)+",
    re.I)

def normalise(t):
    if not t: return t
    t = t.replace("¶", " ")
    t = t.replace("’", "'").replace("ʼ", "'")          # une seule apostrophe
    t = re.sub(r"[ \t\r\n   ]+", " ", t).strip()
    # LES CROCHETS D'ABORD, LA SUSCRIPTION ENSUITE. « [A Psalm] of David. »
    # ne ressemble à une suscription qu'une fois les crochets retirés ; dans
    # l'autre ordre, deux psaumes gardaient leur notice.
    t = re.sub(r"\[\s*([^\]]*?)\s*\]", r"\1", t)
    t = re.sub(r"\{\s*([^}]*?)\s*\}", r"\1", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    # ON NE VIDE JAMAIS UN VERSET. Trois versets de la Bible ne sont QUE ce
    # qui ressemble à une suscription — « The song of songs, which is
    # Solomon's. » (Cantique 1:1), « The prayers of David the son of Jesse are
    # ended. » (Psaume 72:20), et la notice d'Habacuc 3:1. Les éditions
    # anglaises les NUMÉROTENT comme des versets : les retirer, c'est effacer
    # de l'Écriture. On ne retire la notice que s'il reste le verset derrière.
    sans = SUSCRIPTION.sub("", t).strip()
    if sans: t = sans
    # guillemets courbes, comme les 1545 questions anglaises
    t = t.replace('"', '“', 1) if t.count('"') == 1 else t
    def paires(m): return "“" + m.group(1) + "”"
    t = re.sub(r'"([^"]*)"', paires, t)
    # une virgule collee a la lettre suivante
    t = re.sub(r"([,;])(?=[A-Za-z])", r"\1 ", t)
    t = re.sub(r"([.!?])(?=[A-Z])", r"\1 ", t)
    # PAS d'espace devant la ponctuation haute : c'est une regle francaise
    t = re.sub(r"\s+([?!;:,.])", r"\1", t)
    t = re.sub(r"\s*\.\.\.", "…", t)
    t = re.sub(r"[ ]{2,}", " ", t)
    return t.strip()
