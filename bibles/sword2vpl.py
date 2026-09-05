# -*- coding: utf-8 -*-
"""Convertit un module SWORD en fichier « un verset par ligne », le format que
   sait deja lire bibles/extrait.py. Ainsi la chaine d'extraction reste unique."""
import sys, re
sys.path.insert(0, '.')
from pysword.modules import SwordModules

OT = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SOL ISA JER LAM EZE DAN HOS JOE AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL".split()
NT = "MAT MAR LUK JOH ACT ROM 1CO 2CO GAL EPH PHI COL 1TH 2TH 1TI 2TI TIT PHM HEB JAM 1PE 2PE 1JO 2JO 3JO JUD REV".split()

def convertit(dossier, sortie):
    mods = SwordModules(dossier); d = mods.parse_modules()
    cle = list(d.keys())[0]
    bible = mods.get_bible_from_module(cle)
    struct = bible.get_structure()
    n = 0
    with open(sortie, "w", encoding="utf-8") as f:
        for test, codes in (("ot", OT), ("nt", NT)):
            livres = struct.get_books()[test]
            for i, livre in enumerate(livres):
                code = codes[i]
                for ch in range(1, len(livre.chapter_lengths) + 1):
                    for v in range(1, livre.chapter_lengths[ch-1] + 1):
                        try:
                            t = bible.get(books=[livre.name], chapters=[ch], verses=[v], clean=True)
                        except Exception:
                            continue
                        t = re.sub(r"\s+", " ", t or "").strip()
                        if not t: continue
                        f.write("%s %d:%d %s\n" % (code, ch, v, t)); n += 1
    return cle, n

if __name__ == "__main__":
    cle, n = convertit(sys.argv[1], sys.argv[2])
    print("module %s -> %s : %d versets" % (cle, sys.argv[2], n))
