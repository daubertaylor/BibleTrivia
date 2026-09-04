# -*- coding: utf-8 -*-
"""Extrait les 248 references du jeu depuis un fichier « un verset par ligne »."""
import io, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from livres import LIVRES

def charge_vpl(chemin):
    d = {}
    for ligne in io.open(chemin, encoding="utf-8", errors="replace"):
        m = re.match(r'^([A-Z0-9]{3})\s+(\d+):(\d+)\s+(.*)$', ligne.rstrip("\n"))
        if m: d[(m.group(1), int(m.group(2)), int(m.group(3)))] = m.group(4).strip()
    return d

def refs_du_jeu(html):
    s = io.open(html, encoding="utf-8").read()
    m = re.search(r'const\s+HERO_VERSES\s*=\s*\[', s); i = m.end(); prof = 1; j = i
    while prof and j < len(s):
        if s[j] == '[': prof += 1
        elif s[j] == ']': prof -= 1
        j += 1
    out = []
    for v in re.findall(r'\{[^{}]*\}', s[i:j-1]):
        r = re.search(r'r:"([^"]*)"', v); t = re.search(r't:"((?:[^"\\]|\\.)*)"', v)
        if r and t: out.append((r.group(1), t.group(1)))
    return out

def resout(ref):
    """ -> (code, chapitre, [versets])  |  None """
    m = re.match(r'^((?:[123] )?[^\d]+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?\s*[ab]?$', ref)
    if not m: return None
    livre = LIVRES.get(m.group(1).strip())
    if not livre: return None
    if m.group(3) is None:                      # « Jude 24 » : livre a un seul chapitre
        return (livre, 1, [int(m.group(2))])
    ch = int(m.group(2)); v1 = int(m.group(3)); v2 = int(m.group(4) or v1)
    return (livre, ch, list(range(v1, v2 + 1)))

SUSCRIPTION = re.compile(r'^(Au chef des chantres[^.]*\.|Cantique[^.]*\.|Psaume[^.]*\.|De David\.|Chant[^.]*\.|Prière[^.]*\.)\s*')
def nettoie(t):
    t = re.sub(r'\s+', ' ', t).strip()
    t = SUSCRIPTION.sub('', t)                  # les titres de psaume ne sont pas le verset
    return t.strip()

def extrait(vpl, jeu):
    d = charge_vpl(vpl); out = {}; absents = []
    for ref, _ in jeu:
        r = resout(ref)
        if not r: absents.append(ref); continue
        code, ch, vs = r
        morceaux = [d.get((code, ch, v)) for v in vs]
        if any(x is None for x in morceaux): absents.append(ref); continue
        out[ref] = nettoie(" ".join(morceaux))
    return out, absents
