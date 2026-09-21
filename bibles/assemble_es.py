# -*- coding: utf-8 -*-
"""Assemble les lots de bibles/es-questions/ en questions-es.js.

L'INDICE DE LA BONNE RÉPONSE N'EST PAS TRADUIT, IL EST RECALCULÉ. Les lots ne
portent que du texte ; l'indice vient de la banque FRANÇAISE, en cherchant la
bonne réponse française dans ses propres options. Il ne peut donc pas diverger
de ce que le jeu considère juste — et le jour où une option française change
d'ordre, il suit tout seul.

    python3 bibles/assemble_es.py          (écrit questions-es.js si tout est là)
    python3 bibles/assemble_es.py --etat   (dit seulement où on en est)
"""
import io, os, sys, json, glob, subprocess

ICI = os.path.dirname(os.path.abspath(__file__))
JEU = os.path.join(ICI, "..", "index.html")
SORTIE = os.path.join(ICI, "..", "questions-es.js")

ENTETE = u"""/* Yada — las 1545 preguntas en español.
   ============================================================================
   CE FICHIER EST CHARGÉ SEULEMENT EN ESPAGNOL, comme questions-en.js l'est en
   anglais, et pour la même raison : trois cent mille signes collés dans
   index.html seraient analysés par TOUS les joueurs, y compris ceux qui ne
   verront jamais un mot d'espagnol, et sur le téléphone le plus lent. Le
   service worker le met en cache dès la première partie.

   L'ORDRE EST CELUI DE BANK, exactement : facile, puis moyen, puis difficile.
   C'est ce qui permet de se repérer par POSITION, sans recopier le français.
   Les options sont dans le MÊME ORDRE que les françaises, et le quatrième
   champ est l'indice de la bonne réponse, RECALCULÉ depuis la banque
   française par bibles/assemble_es.py — jamais écrit à la main.

   NE PAS ÉDITER CE FICHIER : il est produit. La source est
   bibles/es-questions/, un fichier par lot de 45.
   ============================================================================ */
self.BANQUE_ES = [
"""

def banque_francaise():
    """Lit BANK dans index.html, dans l'ordre du jeu."""
    code = ("const fs=require('fs');const h=fs.readFileSync(%r,'utf8');"
            "const i=h.indexOf('const BANK = {');const j=h.indexOf('\\n};', i);"
            "const B=eval('('+h.slice(i+'const BANK = '.length, j+2)+')');"
            "const o=[];for(const t of ['facile','moyen','difficile'])for(const q of B[t])"
            "o.push({q:q.q,options:q.options,correct:q.correct,fact:q.fact});"
            "process.stdout.write(JSON.stringify(o));") % JEU
    s = subprocess.check_output(["/opt/node22/bin/node", "-e", code])
    return json.loads(s.decode("utf-8"))

def lots():
    out = []
    for f in sorted(glob.glob(os.path.join(ICI, "es-questions", "*.json"))):
        out.extend(json.load(io.open(f, encoding="utf-8")))
    return out

def js(s):
    return json.dumps(s, ensure_ascii=False)

if __name__ == "__main__":
    fr = banque_francaise()
    es = lots()
    print("français : %d   espagnol : %d   (%d %%)" % (len(fr), len(es), 100 * len(es) // max(1, len(fr))))
    if "--etat" in sys.argv: sys.exit(0)
    if len(es) != len(fr):
        print("PAS ENCORE COMPLET — il manque %d question(s), rien n'est écrit." % (len(fr) - len(es)))
        sys.exit(1)
    lignes, ko = [], 0
    for i, (f, e) in enumerate(zip(fr, es)):
        if len(e) != 3 or len(e[1]) != 4:
            print("lot mal formé au rang %d" % i); ko += 1; continue
        try: idx = f["options"].index(f["correct"])
        except ValueError:
            print("bonne réponse introuvable dans les options, rang %d" % i); ko += 1; continue
        lignes.append("[%s, [%s], %s, %d]," % (js(e[0]), ", ".join(js(o) for o in e[1]), js(e[2]), idx))
    if ko: sys.exit(1)
    io.open(SORTIE, "w", encoding="utf-8").write(ENTETE + "\n".join(lignes) + "\n];\n")
    print("-> questions-es.js : %d entrées, %d octets" % (len(lignes), os.path.getsize(SORTIE)))
