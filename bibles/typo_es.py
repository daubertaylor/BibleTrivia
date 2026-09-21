# -*- coding: utf-8 -*-
"""LA TYPOGRAPHIE ESPAGNOLE, en un seul endroit — le pendant de typo.py et de
typo_en.py.

L'espagnol ne se ponctue ni comme le français ni tout à fait comme l'anglais :
pas d'espace devant « ? ! ; : » — c'est une règle française — mais il OUVRE
ses questions et ses exclamations par « ¿ » et « ¡ », qui doivent rester
collés au mot qui suit. Un « ¿ Quién » avec une espace n'est pas de
l'espagnol.

CE QUE LES SOURCES APPORTENT EN PLUS DU TEXTE, ET QU'ON RETIRE :

· Les crochets des mots suppléés, « su alabanza [será] siempre en mi boca »
  (3 501 dans la Reina-Valera 1909) : l'appareil du traducteur, pas l'Écriture
  — même traitement que les crochets du Darby en français.
· Le pied-de-mouche « ¶ » (1 659 dans la 1865) : une marque de paragraphe.
· Les suscriptions de psaume, « Salmo de David. », « Al Músico principal :
  sobre Neginoth. », que la 1909 fait entrer DANS le verset 1. Le joueur qui
  lit « Salmo 23:1 » attend « Jehová es mi pastor », pas la notice.
· Les lettres hébraïques du psaume 119 — ALEPH, BETH, GIMEL… — qui ouvrent
  chacune de ses vingt-deux strophes. Ce sont des intertitres, et le psaume
  119 fournit au jeu des versets très connus (« NUN. Lámpara es á mis pies tu
  palabra »).

DEUX PIÈGES PROPRES À CETTE ÉDITION, TOUS DEUX MESURÉS AVANT D'ÊTRE TRAITÉS.

1. LA 1909 OUVRE CHAQUE CHAPITRE PAR UN MOT EN CAPITALES : « EN el principio
   crió Dios », « JEHOVÁ es mi pastor », « Y ACONTECIÓ en los días ». C'est
   une convention d'imprimeur de 1909 ; sur une carte de jeu, ça ressemble à
   quelqu'un qui crie. On remet le mot en minuscules — mais SEULEMENT en tête
   de verset, et seulement s'il est seul de son espèce.
   POURQUOI SEULEMENT LÀ : la même édition met en capitales, au MILIEU d'un
   verset, ce qui est nom divin ou déclaration — « YO SOY EL QUE SOY » (Éxodo
   3:14), « SANTIDAD Á JEHOVÁ » (Éxodo 28:36), « Yo soy JEHOVÁ » (Éxodo 6:2).
   Cela, c'est le texte, et on n'y touche pas. 177 capitales sont dans ce cas.
2. LA 1865 A UNE INTERJECTION CASSÉE. Sa mise à jour orthographique de 2018 a
   retiré l'accent de « ó » (l'ancien « oh » vocatif) et laissé le point
   d'exclamation qui le suivait : « respóndeme, o! Dios de mi justicia ».
   480 occurrences, toutes au même endroit de la phrase. Ce n'est pas le texte
   de 1865, c'est un reste de traitement : on rend « oh ».

ON NE MODERNISE PAS L'ORTHOGRAPHE. La 1909 écrit « á » pour la préposition
« a » (19 320 fois) et « fué » pour « fue » (1 650) : c'est ainsi qu'elle est
imprimée. Corriger cela reviendrait à réécrire le texte, et aucun texte de ce
jeu n'est réécrit.
"""
import re

# Relevées dans la source, pas devinées : ce sont les treize têtes de
# suscription que porte la Reina-Valera 1909 (plus Habacuc 3:1).
SUSCRIPTION = re.compile(
    r"^(?:(?:"
    r"Al Músico principal[^.]{0,120}\."
    r"|Salmo[^.]{0,120}\."
    r"|Cántico[^.]{0,120}\."
    r"|Canción[^.]{0,120}\."
    r"|Oración[^.]{0,120}\."
    r"|Alabanza[^.]{0,120}\."
    r"|Masquil[^.]{0,120}\."
    r"|Michtham[^.]{0,120}\."
    r"|Sigaión[^.]{0,120}\."
    r"|Para Salomón\."
    r"|A los hijos de Coré[^.]{0,120}\."
    r"|Aleluya\."
    r")\s*)+")

# Les vingt-deux lettres, relevées elles aussi dans le psaume 119 de la source.
LETTRES_119 = re.compile(
    r"^(?:AIN|ALEPH|BETH|CAPH|CHETH|COPH|DALETH|GIMEL|HE|JOD|LAMED|MEM|NUN|PE|"
    r"RESH|SAMECH|SIN|TAU|TETH|TZADDI|VAU|ZAIN)\.?\s+")

# Un mot en capitales EN TÊTE, éventuellement précédé d'un mot d'une lettre
# (« Y ACONTECIÓ », « A JEHOVÁ »), et qui n'est pas suivi d'un autre mot en
# capitales — c'est ce qui distingue l'usage d'imprimeur de la déclaration.
# Le « ¡ » ou le « ¿ » d'ouverture font partie du début du verset : le psaume
# 133 s'ouvre sur « ¡MIRAD cuán bueno… », la capitale est derrière le signe.
CAPITALES_TETE = re.compile(
    r"^([¿¡“«]?(?:[YAEO]\s+)?)([A-ZÁÉÍÓÚÜÑ]{2,})(?![\wÁÉÍÓÚÜÑáéíóúüñ])"
    r"(?!\s+[A-ZÁÉÍÓÚÜÑ]{2,}(?![\wÁÉÍÓÚÜÑáéíóúüñ]))")


def normalise(t):
    if not t: return t
    t = t.replace("¶", " ")
    t = t.replace("’", "'").replace("ʼ", "'")          # une seule apostrophe
    t = re.sub(r"[ \t\r\n   ]+", " ", t).strip()
    # LES CROCHETS D'ABORD, LA SUSCRIPTION ENSUITE — même ordre qu'en anglais,
    # et pour la même raison : « [Salmo] de David. » ne ressemble à une
    # suscription qu'une fois les crochets retirés.
    t = re.sub(r"\[\s*([^\]]*?)\s*\]", r"\1", t)
    t = re.sub(r"\{\s*([^}]*?)\s*\}", r"\1", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    # ON NE VIDE JAMAIS UN VERSET. Certains versets ne SONT que la notice —
    # le contrôle de regenere_es.py vérifie qu'aucun ne sort vide.
    for motif in (SUSCRIPTION, LETTRES_119):
        sans = motif.sub("", t).strip()
        if sans: t = sans
    # l'interjection cassée de la 1865, minuscule comme capitale : elle ouvre
    # aussi des versets (« O! hombre, declarado te ha… », Miqueas 6:8).
    t = re.sub(r"(?<![\wÁÉÍÓÚÜÑáéíóúüñ])O!(?=\s)", "Oh", t)
    t = re.sub(r"(?<![\wÁÉÍÓÚÜÑáéíóúüñ])o!(?=\s)", "oh", t)
    # le mot d'ouverture en capitales redevient un mot
    def calme(m):
        return m.group(1) + m.group(2)[0] + m.group(2)[1:].lower()
    t = CAPITALES_TETE.sub(calme, t)
    # guillemets courbes, comme les questions espagnoles du jeu
    if t.count('"') == 1: t = t.replace('"', '“', 1)
    t = re.sub(r'"([^"]*)"', lambda m: "“" + m.group(1) + "”", t)
    # une virgule collée à la lettre suivante
    t = re.sub(r"([,;])(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])", r"\1 ", t)
    t = re.sub(r"([.!?])(?=[A-ZÁÉÍÓÚÜÑ])", r"\1 ", t)
    # PAS d'espace devant la ponctuation haute : c'est une règle française.
    t = re.sub(r"\s+([?!;:,.])", r"\1", t)
    # ¿ et ¡ restent COLLÉS au mot qui suit
    t = re.sub(r"([¿¡])\s+", r"\1", t)
    t = re.sub(r"\s*\.\.\.", "…", t)
    t = re.sub(r"[ ]{2,}", " ", t)
    return t.strip()
