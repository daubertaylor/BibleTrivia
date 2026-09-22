# -*- coding: utf-8 -*-
"""LES QUESTIONS TROP SEMBLABLES ENTRE ELLES.

   « Vérifie que certaines questions ne soient pas trop similaires au point
     d'être pareilles, juste un peu modifiées. »

   Trois relevés, parce qu'un seul se trompe :

     1. MÊME RÉPONSE, ÉNONCÉ TRÈS PROCHE — le vrai doublon. Deux questions qui
        partagent leur réponse ET l'essentiel de leurs mots.
     2. MÊME NOMBRE ÉCRIT AUTREMENT — « Sept » et « 7 » sont la même réponse,
        et le premier relevé ne le voyait pas : seize doublons se cachaient
        derrière cette seule différence d'écriture.
     3. ÉNONCÉ PROCHE, RÉPONSE DIFFÉRENTE — pour l'œil, sans déclarer de faute :
        « Où Jésus est-il né ? » et « Où a-t-il grandi ? » se ressemblent et
        sont deux bonnes questions. C'est là, en revanche, que se cachent les
        CONTRADICTIONS (la même question, deux réponses), qu'il faut lire.

   Une paire qui partage la réponse avec un énoncé différent est légitime
   (« Qui a construit l'arche ? » / « Qui a vécu 950 ans ? » -> Noé) : elle
   n'apparaît nulle part.

   Usage :  node banc-essai/extraire-questions.js questions.json index.html
            python3 bibles/jumelles.py questions.json [seuil]

   État au moment où ces lignes sont écrites : 0 et 0. Il y en avait 39 et 16.
"""
import json, io, re, sys, unicodedata
from itertools import combinations

VIDES = set("""le la les un une des du de d a à au aux et ou ni mais donc or car
que qui quoi dont où est sont était étaient a ont avait avaient quel quelle quels
quelles combien comment pourquoi quand dans sur sous par pour avec sans vers
chez en y il elle ils elles on se sa son ses leur leurs ce cet cette ces
selon d'après lequel laquelle lesquels premier première dernier dernière
bible biblique verset livre chapitre nom appelle appelé appelée""".split())

MOTS = {'zero':0,'un':1,'une':1,'deux':2,'trois':3,'quatre':4,'cinq':5,'six':6,'sept':7,
 'huit':8,'neuf':9,'dix':10,'onze':11,'douze':12,'treize':13,'quatorze':14,'quinze':15,
 'seize':16,'vingt':20,'trente':30,'quarante':40,'cinquante':50,'soixante':60,'cent':100,
 'cents':100,'mille':1000,'million':1000000}
UNITES = set('jour jours nuit nuits an ans annee annees annee coudee coudees fois personne personnes homme hommes '
             'environ pres de du la le les et siecles siecle livres livre chapitres chapitres pieces'.split())

def plat(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]+", " ", s)

def valeur(rep):
    """Le NOMBRE que porte une réponse, ou None si elle n'en porte pas."""
    mots = [m for m in plat(rep).split() if m and m not in UNITES]
    if not mots: return None
    total, courant, vu = 0, 0, False
    for m in mots:
        if m.isdigit(): courant += int(m); vu = True
        elif m in MOTS:
            v = MOTS[m]; vu = True
            if v >= 100: courant = (courant or 1) * v
            else: courant += v
        else: return None          # un mot qui n'est pas un nombre : ce n'est pas un compte
    return (total + courant) if vu else None

def plat(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]+", " ", s)

def mots(s):
    return {m for m in plat(s).split() if len(m) > 2 and m not in {plat(v) for v in VIDES}}

def jaccard(a, b):
    if not a or not b: return 0.0
    return len(a & b) / len(a | b)

d = json.load(io.open(sys.argv[1], encoding="utf-8"))
for i, q in enumerate(d):
    q["_i"] = i; q["_m"] = mots(q["q"]); q["_r"] = plat(q["correct"]).strip()
    q["_v"] = valeur(q["correct"])

# On ne compare pas 1545x1545 à l'aveugle : on regroupe par mot rare partagé.
index = {}
for q in d:
    for m in q["_m"]: index.setdefault(m, []).append(q)
paires = set()
for m, gr in index.items():
    if len(gr) > 60: continue          # mot trop courant : n'apprend rien
    for a, b in combinations(gr, 2): paires.add((a["_i"], b["_i"]))

doublons, chiffres, memeRep = [], [], []
for i, j in paires:
    a, b = d[i], d[j]
    js = jaccard(a["_m"], b["_m"])
    if js < 0.5: continue
    if a["_r"] == b["_r"]: doublons.append((js, i, j))
    # « Sept » et « 7 » : la même réponse, écrite autrement.
    elif a["_v"] is not None and a["_v"] == b["_v"]: chiffres.append((js, i, j))
    else: memeRep.append((js, i, j))

doublons.sort(reverse=True); chiffres.sort(reverse=True); memeRep.sort(reverse=True)
print("=== MÊME RÉPONSE ET ÉNONCÉ TRÈS PROCHE (%d paires) ===" % len(doublons))
for js, i, j in doublons[:40]:
    print("  %.2f  #%-5d %s" % (js, i, d[i]["q"]))
    print("        #%-5d %s" % (j, d[j]["q"]))
    print("        -> %s" % d[i]["correct"])
print()
print("=== MÊME NOMBRE ÉCRIT AUTREMENT, ÉNONCÉ TRÈS PROCHE (%d paires) ===" % len(chiffres))
for js, i, j in chiffres[:40]:
    print("  %.2f  #%-5d %s  -> %s" % (js, i, d[i]["q"], d[i]["correct"]))
    print("        #%-5d %s  -> %s" % (j, d[j]["q"], d[j]["correct"]))
print()
print("=== ÉNONCÉ TRÈS PROCHE MAIS RÉPONSE DIFFÉRENTE (%d paires) ===" % len(memeRep))
for js, i, j in memeRep[:25]:
    print("  %.2f  #%-5d %s  -> %s" % (js, i, d[i]["q"], d[i]["correct"]))
    print("        #%-5d %s  -> %s" % (j, d[j]["q"], d[j]["correct"]))
