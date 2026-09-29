# -*- coding: utf-8 -*-
"""AJOUTER DES QUESTIONS DANS LES TROIS LANGUES, SANS RIEN DÉSALIGNER.

« Rajoute des questions et des versets… et que ce soit vraiment bien fourni.
L'objectif à terme est de remplir la Bible. » (Taylor.)

POURQUOI CE SCRIPT, ET PAS UNE ÉDITION À LA MAIN. Les banques anglaise
(questions-en.js) et espagnole (bibles/es-questions/*.json, assemblées en
questions-es.js) sont alignées SUR LA BANQUE FRANÇAISE PAR POSITION : facile,
puis moyen, puis difficile, sans recopier le texte français en clé. Une
question insérée au mauvais rang décale TOUT ce qui suit, en silence — chaque
énoncé anglais se retrouverait sous la question française voisine. Ce script
insère au même rang dans les trois banques, et questions-langues.js le vérifie
ensuite sur l'ensemble.

CE QU'IL VÉRIFIE AVANT DE TOUCHER À QUOI QUE CE SOIT :
  · quatre options distinctes par langue, la bonne réponse parmi elles, au
    MÊME rang dans les trois langues (l'anglais et l'espagnol ne portent que
    l'indice de la réponse française) ;
  · la référence de l'anecdote, qui fait le livre de la question (bookOf) ;
  · LES CITATIONS : tout ce qui est entre guillemets — dans l'énoncé,
    l'anecdote et la BONNE réponse — doit se trouver mot pour mot dans le
    verset cité, dans la Bible par défaut de SA langue (Segond, King James,
    Reina-Valera 1909). Une citation « de mémoire » est refusée. Les « … »
    d'une question « Complète » marquent un trou : les morceaux autour doivent
    s'y trouver, dans l'ordre ;
  · aucune question déjà présente, et les quasi-jumelles SIGNALÉES pour
    relecture (jumelles.py tranche ensuite sur la banque entière).
Il imprime chaque question à côté des versets qu'elle cite : on la RELIT avant
d'injecter.

    python3 bibles/ajoute_questions.py lot.json             (montre)
    python3 bibles/ajoute_questions.py lot.json --injecte   (dépose)
lot.json : [ { "niveau":"moyen", "ref":"Hébreux 13:2",
               "fr":{"q":…, "options":[…4], "correct":…, "fact":"… (Hébreux 13:2)."},
               "en":{"q":…, "options":[…4], "fact":"… (Hebrews 13:2)."},
               "es":{"q":…, "options":[…4], "fact":"… (Hebreos 13:2)."} } ]
"""
import io, os, re, sys, json, glob, subprocess, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from extrait import charge_vpl, resout, nettoie, LIVRES
import typo, typo_en, typo_es
from aligne_en import SOURCES as SRC_EN
from aligne_es import SOURCES as SRC_ES

RACINE = os.path.join(ICI, "..")
JEU = os.path.join(RACINE, "index.html")
EN_JS = os.path.join(RACINE, "questions-en.js")
LOTS = os.path.join(ICI, "es-questions")
SRC_FR = json.load(io.open(os.path.join(ICI, "sources.json"), encoding="utf-8"))
NIVEAUX = ["facile", "moyen", "difficile"]

# ---- la banque française, lue par le moteur du jeu lui-même ----------------------
def banque():
    code = ("const fs=require('fs');const h=fs.readFileSync(%r,'utf8');"
            "const i=h.indexOf('const BANK = {');const j=h.indexOf('\\n};', i);"
            "const B=eval('('+h.slice(i+'const BANK = '.length, j+2)+')');"
            "process.stdout.write(JSON.stringify(B));") % JEU
    return json.loads(subprocess.check_output(["/opt/node22/bin/node", "-e", code]).decode("utf-8"))

def table_js(nom):
    s = io.open(JEU, encoding="utf-8").read()
    return json.loads(re.search(r"const %s = (\{.*?\});" % nom, s).group(1))

# ---- les textes cités ------------------------------------------------------------
_c = {}
def vpl(chemin):
    if chemin not in _c: _c[chemin] = charge_vpl(chemin)
    return _c[chemin]

def coords(ref):
    """« Hébreux 13:2 », « Job 1:9-11 », « Hébreux 11 » (chapitre entier),
    « Jude 24 » (livre à un seul chapitre) -> (code, ch, [versets] | None)."""
    m = re.match(r"^((?:[123] )?[^\d]+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$", ref.strip())
    if not m: return None
    code = LIVRES.get(m.group(1).strip())
    if not code: return None
    if m.group(3) is None:
        # un seul nombre : chapitre entier, sauf pour les livres d'un chapitre
        if code in ("OBA", "PHM", "2JO", "3JO", "JUD"): return (code, 1, [int(m.group(2))])
        return (code, int(m.group(2)), None)
    v1 = int(m.group(3)); v2 = int(m.group(4) or v1)
    return (code, int(m.group(2)), list(range(v1, v2 + 1)))

def texte(chemin, c):
    d = vpl(chemin); code, ch, vs = c
    if vs is None: vs = sorted(v for (k, h, v) in d if k == code and h == ch)
    return " ".join(d.get((code, ch, v), "") for v in vs)

def textes_cites(ref):
    c = coords(ref)
    if not c: return None
    return {"fr": typo.normalise(nettoie(texte(SRC_FR["lsg1910"], c))),
            "en": typo_en.normalise(texte(SRC_EN["kjv1769"], c)),
            "es": typo_es.normalise(texte(SRC_ES["rv1909"], c))}

# ---- les citations ---------------------------------------------------------------
def plat(t):
    t = unicodedata.normalize("NFC", t or "").lower()
    t = t.replace("’", "'").replace(" ", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip()

def citations(t, langue):
    motif = r"«\s*(.+?)\s*»" if langue == "fr" else r"[“«]\s*(.+?)\s*[”»]"
    return re.findall(motif, t or "")

def dans_le_verset(cit, verset):
    """Chaque morceau autour des « … » doit être dans le verset, dans l'ordre."""
    v = plat(verset); pos = 0
    for bout in re.split(r"\s*…\s*", cit):
        b = plat(bout).strip(" ,;:.!?")
        if not b: continue
        i = v.find(b, pos)
        if i < 0: return False
        pos = i + len(b)
    return True

# ---- les quasi-jumelles ----------------------------------------------------------
VIDES = set("le la les un une des de du d l à au aux et en dans quel quelle quels quelles qui que quoi est il elle "
            "a ont sont selon pour par sur avec ce cette ces son sa ses leur leurs ne pas plus fut".split())
def mots(t):
    t = unicodedata.normalize("NFD", plat(t)); t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return set(w for w in re.findall(r"[a-z0-9]+", t) if w not in VIDES and len(w) > 2)

def cle(t):
    return re.sub(r"\s+", " ", (t or "").lower()).strip()

# ---- contrôles --------------------------------------------------------------------
def controle(x, existantes):
    fautes, notes = [], []
    if x.get("niveau") not in NIVEAUX: fautes.append("niveau inconnu : %r" % x.get("niveau"))
    fr, en, es = x.get("fr", {}), x.get("en", {}), x.get("es", {})
    for L, d in (("fr", fr), ("en", en), ("es", es)):
        o = d.get("options") or []
        if len(o) != 4 or len(set(o)) != 4: fautes.append("%s : il faut quatre options distinctes" % L)
        for k in ("q", "fact"):
            if not d.get(k): fautes.append("%s : %s manquant" % (L, k))
    if fr.get("correct") not in (fr.get("options") or []): fautes.append("fr : la bonne réponse n'est pas parmi les options")
    idx = (fr.get("options") or []).index(fr["correct"]) if fr.get("correct") in (fr.get("options") or []) else -1
    ref = x.get("ref", "")
    if not fr.get("fact", "").rstrip(" .").endswith("(" + ref + ")"):
        fautes.append("fr : l'anecdote doit finir par la référence « (%s) »" % ref)
    for L, tab in (("en", "LIVRES_EN"), ("es", "LIVRES_ES")):
        attendu = ref_trad(ref, table_js(tab))
        if not (x.get(L) or {}).get("fact", "").rstrip(" .").endswith("(" + attendu + ")"):
            fautes.append("%s : l'anecdote doit finir par « (%s) »" % (L, attendu))
    t = textes_cites(ref)
    if not t: fautes.append("référence introuvable : %r" % ref); return fautes, notes, idx, None
    for L, d in (("fr", fr), ("en", en), ("es", es)):
        a_verifier = [d.get("q", ""), d.get("fact", "")]
        if idx >= 0 and len(d.get("options") or []) == 4: a_verifier.append(d["options"][idx])
        for bloc in a_verifier:
            for cit in citations(bloc, L):
                if not dans_le_verset(cit, t[L]):
                    fautes.append("%s : citation absente du verset (%s) : « %s »" % (L, ref, cit))
    k = cle(fr.get("q"))
    if k in existantes["cles"]: fautes.append("cette question existe déjà")
    m = mots(fr.get("q", ""))
    for q_ex in existantes["q"]:
        me = mots(q_ex)
        if m and me and len(m & me) / len(m | me) >= 0.5:
            notes.append("JUMELLE ? « %s »" % q_ex[:90])
    return fautes, notes, idx, t

def ref_trad(ref, table):
    m = re.match(r"^(.*?)\s+(\d.*)$", ref)
    livre = {"Cantique": "Cantique des cantiques"}.get(m.group(1).strip(), m.group(1).strip())
    return "%s %s" % (table.get(livre, livre), m.group(2))

# ---- dépôt ------------------------------------------------------------------------
def js(t): return json.dumps(t, ensure_ascii=False)

def injecte(retenus, B):
    s = io.open(JEU, encoding="utf-8").read()
    i0 = s.index("const BANK = {")
    # 1. le français : en fin de chaque niveau
    for niv in NIVEAUX:
        neufs = [x for x in retenus if x["niveau"] == niv]
        if not neufs: continue
        debut = s.index("\n  %s: [" % niv, i0)
        # LE DERNIER NIVEAU SE FERME SANS VIRGULE (« ] » puis « }; »). Chercher
        # « ], » l'aurait fait sortir de la banque et déposer les questions
        # difficiles plus loin dans le fichier — ailleurs que dans BANK.
        m = re.compile(r"\n  \],?\n").search(s, debut)
        fin = m.start()
        assert fin < s.index("\n};", i0), "fermeture du niveau %s hors de BANK" % niv
        lignes = "".join('\n    { q:%s, options:[%s], correct:%s, fact:%s },' % (
            js(x["fr"]["q"]), ",".join(js(o) for o in x["fr"]["options"]), js(x["fr"]["correct"]), js(x["fr"]["fact"]))
            for x in neufs)
        avant = s[:fin].rstrip()
        if not avant.endswith(","): avant += ","
        s = avant + lignes + s[fin:]
    io.open(JEU, "w", encoding="utf-8").write(s)
    # 2. les rangs globaux, niveau après niveau
    rangs, n = [], 0
    for niv in NIVEAUX:
        n += len(B[niv])
        for x in retenus:
            if x["niveau"] == niv: rangs.append((n, x)); n += 1
    # 3. l'anglais
    e = io.open(EN_JS, encoding="utf-8").read()
    a = e.index("self.BANQUE_EN = [\n") + len("self.BANQUE_EN = [\n"); z = e.rindex("\n];")
    lignes = [l.rstrip(",") for l in e[a:z].split("\n") if l.strip()]
    for r, x in rangs:
        lignes.insert(r, "[%s, [%s], %s, %d]" % (js(x["en"]["q"]), ", ".join(js(o) for o in x["en"]["options"]),
                                                  js(x["en"]["fact"]), x["_idx"]))
    io.open(EN_JS, "w", encoding="utf-8").write(e[:a] + ",\n".join(lignes) + e[z:])
    # 4. l'espagnol : dans le lot qui porte le rang d'avant
    fichiers = sorted(glob.glob(os.path.join(LOTS, "*.json")))
    lots = [json.load(io.open(f, encoding="utf-8")) for f in fichiers]
    touches = set()
    for r, x in rangs:
        entree = [x["es"]["q"], x["es"]["options"], x["es"]["fact"]]
        cumul = 0
        for k, lot in enumerate(lots):
            if r <= cumul + len(lot):
                lot.insert(r - cumul, entree); touches.add(k); break
            cumul += len(lot)
        else:
            lots[-1].append(entree); touches.add(len(lots) - 1)
    # ON NE RÉÉCRIT QUE LES LOTS OÙ L'ON INSÈRE, DANS LEUR PROPRE STYLE. La
    # première version réécrivait les vingt-sept : trois lots écrits sans espace
    # après les virgules sortaient « modifiés » de 45 à 60 lignes chacun, pour
    # un contenu strictement identique. Un diff doit montrer ce qui change.
    for k in sorted(touches):
        brut = io.open(fichiers[k], encoding="utf-8").read()
        sep = ", " if '", "' in brut else ","
        io.open(fichiers[k], "w", encoding="utf-8").write(
            "[\n" + ",\n".join("[%s%s[%s]%s%s]" % (js(q), sep, sep.join(js(o) for o in op), sep, js(fa))
                                   for q, op, fa in lots[k]) + "\n]\n")
    subprocess.check_call([sys.executable, os.path.join(ICI, "assemble_es.py")])

if __name__ == "__main__":
    lot = json.load(io.open(sys.argv[1], encoding="utf-8"))
    B = banque()
    tout = [q for niv in NIVEAUX for q in B[niv]]
    existantes = {"cles": set(cle(q["q"]) for q in tout), "q": [q["q"] for q in tout]}
    retenus = []
    for x in lot:
        fautes, notes, idx, t = controle(x, existantes)
        print("\n[%s] %s   (%s)" % (x.get("niveau"), x["fr"].get("q"), x.get("ref")))
        for L in ("fr", "en", "es"):
            d = x.get(L, {})
            if L != "fr": print("  %s  %s" % (L, d.get("q")))
            print("      %s" % " | ".join(("*" + o) if i == idx else o for i, o in enumerate(d.get("options") or [])))
            print("      %s" % d.get("fact"))
        if t:
            for L in ("fr", "en", "es"): print("  verset %s : %s" % (L, t[L][:230]))
        for n in notes: print("  ?? " + n)
        for f in fautes: print("  !! " + f)
        if fautes: print("  -> REFUSÉE"); continue
        x["_idx"] = idx; retenus.append(x)
        existantes["cles"].add(cle(x["fr"]["q"])); existantes["q"].append(x["fr"]["q"])
    print("\n%d question(s) prête(s) sur %d" % (len(retenus), len(lot)))
    if "--injecte" in sys.argv and retenus:
        if len(retenus) != len(lot):
            print("INJECTION REFUSÉE : tout le lot doit passer, ou rien."); sys.exit(1)
        injecte(retenus, B)
        print("déposé : %d question(s) dans BANK, questions-en.js et les lots espagnols" % len(retenus))
