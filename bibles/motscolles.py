# -*- coding: utf-8 -*-
"""LES MOTS COLLÉS DE L'EXTRACTION.

Quand un texte biblique est extrait d'une source où le mot se coupe en fin de
ligne, l'espace disparaît parfois : « car je suis doux » devient « suisdoux ».
Le mot obtenu reste court — huit lettres — donc chercher les mots ANORMALEMENT
LONGS ne le trouve pas (essayé : au-dessus de 14 lettres, il n'y a que de vrais
mots français, « irrépréhensibles », « merveilleusement »…).

La signature d'un mot collé est ailleurs : il est RARE, et il se coupe en deux
mots COURANTS. On se sert donc du corpus comme dictionnaire — les quatre
versions plus tout le texte français du jeu — et on ne garde que les mots vus
au plus deux fois qui se scindent en deux mots vus au moins quatre fois.

La liste sort à environ quatre-vingts entrées, dont l'immense majorité sont de
vrais mots (« surface » = sur + face) ou des identifiants JavaScript. Elle se
relit en une minute, et c'est ce qui compte : elle a trouvé « suisdoux »
(Segond, Matthieu 11:29) et « servirDieu » (Darby, Matthieu 6:24).

    python3 bibles/motscolles.py
"""
import json, re, collections, sys, os

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOT = re.compile(r"[A-Za-zÀ-ÿŒœ]+")

def corpus():
    textes = []
    with open(os.path.join(RACINE, "bibles/textes.json"), encoding="utf-8") as f:
        for version, table in json.load(f).items():
            if isinstance(table, dict):
                textes += list(table.values())
    with open(os.path.join(RACINE, "index.html"), encoding="utf-8") as f:
        h = f.read()
    for m in re.finditer(r'"((?:[^"\\]|\\.){25,400})"', h):
        s = m.group(1)
        if " " in s and re.search(r"[a-zà-ÿ]{3}", s) and "<" not in s and "base64" not in s:
            textes.append(s)
    return textes

def main():
    textes = corpus()
    freq = collections.Counter()
    for t in textes:
        for w in MOT.findall(t):
            freq[w.lower()] += 1
    suspects = []
    for w, n in freq.items():
        if len(w) < 6 or n > 2:
            continue
        for i in range(3, len(w) - 2):
            a, b = w[:i], w[i:]
            if freq.get(a, 0) >= 4 and freq.get(b, 0) >= 4:
                suspects.append((w, a, b, n)); break
    suspects.sort()
    print("  %d segments de texte, %d mots distincts" % (len(textes), len(freq)))
    print("  mots rares qui se coupent en deux mots courants : %d\n" % len(suspects))
    for w, a, b, n in suspects:
        print("   %-20s = %-11s + %-11s  (vu %dx)" % (w, a, b, n))
    print("\n  À relire à l'œil : un vrai mot français n'est pas un défaut.")

if __name__ == "__main__":
    main()
