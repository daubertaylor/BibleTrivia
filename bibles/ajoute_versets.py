# -*- coding: utf-8 -*-
"""AJOUTER DES VERSETS AU RECUEIL, SANS RIEN RECONSTRUIRE.

« Rajoute des questions et des versets. Il faut impérativement qu'il prenne en
compte toutes les versions de Bible, toutes les langues. » (Taylor.)

POURQUOI UN SCRIPT DE PLUS. Le recueil a été bâti par quatre chemins, un par
famille de sources, chacun avec sa méthode d'alignement :
  · français (LSG, Darby, Ostervald, BA) : par numéro, avec les ALIAS de
    regenere.py pour Joël et Malachie ;
  · Martin 1744 : PAR SON CONTENU, parce que son module suit la versification
    « Calvin » (Romains 8 y compte 38 versets) — voir martin.py ;
  · anglais : aux coordonnées de coords_en.json, retrouvées par le contenu
    d'une table anglaise déjà relue une à une (aligne_en.py) ;
  · espagnol : aux MÊMES coordonnées, après avoir démontré que la Reina-Valera
    numérote comme les éditions anglaises (aligne_es.py).
Ces scripts RECONSTRUISENT tout, et l'un d'eux porte une liste d'ordre qui a
vieilli (injecte.py). Les relancer pour ajouter vingt versets, c'était risquer
d'abîmer les 244 autres. Ici, on AJOUTE — exactement comme injecte_es.py.

LA PREUVE QUE CE SCRIPT TRAITE UN VERSET COMME LES AUTRES :
    python3 bibles/ajoute_versets.py --temoin
relit des versets DÉJÀ présents et exige qu'il retrouve, au caractère près, le
texte stocké dans chacune des dix versions. Il utilise les MÊMES fonctions que
les scripts d'origine (charge_vpl, nettoie, les trois normalise, le score du
Martin) — il n'en réécrit aucune.

L'ANGLAIS ET L'ESPAGNOL, POUR UNE RÉFÉRENCE NEUVE. aligne_en.py retrouvait
chaque verset anglais grâce à une table déjà relue ; une référence neuve n'en a
pas. On lit donc aux MÊMES numéros que le français — c'est juste partout où les
deux numérotations coïncident, et faux ailleurs (psaumes à suscription, Jonas
1:17 / 2:1, Joël, Malachie…). Deux garde-fous :
  1. le script compare le NOMBRE de versets du chapitre en Segond et en King
     James, et refuse la référence s'ils diffèrent — sauf coordonnées anglaises
     données explicitement, verset relu à l'appui ;
  2. il imprime les dix textes côte à côte pour qu'on les RELISE avant
     d'injecter. Aucun texte n'est écrit à la main : ils sont tous extraits.

    python3 bibles/ajoute_versets.py candidats.json            (montre)
    python3 bibles/ajoute_versets.py candidats.json --injecte  (dépose)
candidats.json : [ {"r":"Lévitique 19:18"}, {"r":"Jonas 2:10","en":["JON",2,[9]]} ]
"""
import io, os, re, sys, json
ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
from extrait import charge_vpl, resout, nettoie
import typo, typo_en, typo_es
from regenere import ALIAS
from aligne_en import SOURCES as SRC_EN
from aligne_es import SOURCES as SRC_ES

JEU = os.path.join(ICI, "..", "index.html")
SP = os.environ.get("SP") or "/tmp/claude-0/-home-user-BibleTrivia/fb9bf869-826b-5523-9825-ea1b24c294d0/scratchpad"
SRC_FR = json.load(io.open(os.path.join(ICI, "sources.json"), encoding="utf-8"))

# ---- Le Martin : ON NE RECOPIE PAS SA MÉTHODE, ON LA CHARGE -------------------
# martin.py se lance tout seul (main() sans garde) : on exécute son source
# privé de ce dernier appel, pour garder UNE seule définition du score.
def charge_martin():
    src = io.open(os.path.join(SP, "martin.py"), encoding="utf-8").read()
    src = re.sub(r"\nmain\(\)\s*$", "\n", src)
    ns = {"__name__": "martin_importe"}
    exec(compile(src, "martin.py", "exec"), ns)
    sys.path.insert(0, SP)
    from pysword.modules import SwordModules
    mods = SwordModules(SP + "/sword/FreBDM1744"); mods.parse_modules()
    ns["BIBLE"] = mods.get_bible_from_module("FreBDM1744")
    return ns

def martin_de(M, ref, segond):
    """La règle de martin.py, telle quelle : décalage 0 par défaut, un voisin
    ne le remplace que s'il ressemble VRAIMENT au Segond ET bat nettement le
    zéro. Une référence douteuse n'est pas livrée : le jeu retombe alors sur
    le Segond, jamais sur un verset voisin."""
    d = M["decoupe"](ref)
    if not d: return None, "référence non comprise"
    livre, ch, versets = d
    cands = []
    for dec in (0, -1, 1, -2, 2):
        try:
            txt = " ".join(M["nettoyer"](M["BIBLE"].get(books=[livre], chapters=[ch], verses=[v + dec]))
                           for v in versets)
        except Exception:
            continue
        if txt: cands.append((M["score"](segond, txt), dec, txt))
    if not cands: return None, "introuvable dans le module"
    cands.sort(key=lambda c: -c[0])
    s, dec, txt = cands[0]
    autre = max((c[0] for c in cands if c[1] != dec), default=0.0)
    if dec == 0:
        if s < 0.20 and autre > s + 0.15: return None, "à relire (score %.2f)" % s
    elif s < 0.45 or (s - autre) < 0.20:
        return None, "à relire (décalage %d, score %.2f)" % (dec, s)
    # UN DÉBRIS DU MODULE, PAS L'ÉCRITURE. Au dernier verset d'un livre, le
    # module Sword FreBDM1744 colle un lien de navigation : « …le Royaume sera
    # à l'Eternel. Retournez au Début ======== » (Abdias 21). On le retire, et
    # lui seul ; s'il restait le moindre signe de ce genre, on refuse.
    #
    # ET CE DÉBRIS ÉTAIT DÉJÀ EN LIGNE. Le témoin l'a trouvé en relisant les
    # versets existants : trois versets Martin l'affichaient aux joueurs, dont
    # Matthieu 28:20 — « …jusques à la fin du monde. Amen. Retournez au Début
    # This Website is Hosted by ../../lilacsandbutterflies/images/
    # EClilacsbanner.gif ===== ». Une bannière d'hébergeur, présentée comme de
    # l'Écriture. On coupe donc TOUT à partir du lien, pas seulement les « = ».
    txt = re.sub(r"\s*Retournez au D[ée]but.*$", "", txt, flags=re.S).strip()
    if re.search(r"Retournez|===|https?:|www\.|\.gif|Hosted", txt):
        return None, "débris de navigation dans le module"
    # Les crochets des mots suppléés : même règle que pour le Darby et la Bible
    # Annotée — on garde les mots, on retire les crochets (2 Pierre 3:9).
    txt = re.sub(r"\[([^\]]*)\]", r"\1", txt)
    # La césure de fin de ligne mal recollée : « Jésus- Christ », « au- dessus »,
    # « ratifiera- t-il ». Un trait d'union COLLÉ au mot qui le précède n'est
    # jamais suivi d'une espace en français ; un tiret de ponctuation, lui, a une
    # espace des deux côtés, et n'est donc pas touché.
    txt = re.sub(r"(\w)- (\w)", r"\1-\2", txt)
    return txt, ("décalé de %d" % dec) if dec else ""

# ---- Les sources par numéro ----------------------------------------------------
_cache = {}
def vpl(chemin):
    if chemin not in _cache:
        d = charge_vpl(chemin)
        for s, c in ALIAS.items():
            if s not in d and c in d: d[s] = d[c]
        _cache[chemin] = d
    return _cache[chemin]

def lire(chemin, code, ch, vs):
    d = vpl(chemin)
    bouts = [d.get((code, ch, v)) for v in vs]
    return None if any(b is None for b in bouts) else " ".join(bouts)

def versets_du_chapitre(chemin, code, ch):
    return sum(1 for (c, h, v) in vpl(chemin) if c == code and h == ch)

# ---- LES MOTS COLLÉS -----------------------------------------------------------
# Une espace perdue au saut de ligne du fichier source : « car je suis doux »
# devient « suisdoux ». motscolles.py les a DÉTECTÉS dans le recueil ; ils ont
# été corrigés à la main dans le jeu. Le témoin les a retrouvés : ce sont les
# deux seuls écarts sur 240 références et dix versions. On applique donc ces
# corrections-là — une entrée, une vérification, jamais de règle générale.
COLLES = {"suisdoux": "suis doux", "servirDieu": "servir Dieu"}
def decolle(t):
    for a, b in COLLES.items(): t = t.replace(a, b)
    return t

# Pour les versets NEUFS, un détecteur plus fort que celui de motscolles.py :
# le dictionnaire est la Bible ENTIÈRE de la version. Un mot collé y est rare
# (il n'existe qu'à l'endroit de la coquille) et se coupe en deux mots que
# cette Bible emploie des centaines de fois.
MOT = re.compile(r"[A-Za-zÀ-ÿŒœ]+")
_freq = {}
def frequences(chemin):
    if chemin not in _freq:
        import collections
        c = collections.Counter()
        for t in vpl(chemin).values():
            for w in MOT.findall(t): c[w.lower()] += 1
        _freq[chemin] = c
    return _freq[chemin]

def colles(t, chemin):
    f = frequences(chemin); out = []
    for w in MOT.findall(t or ""):
        lw = w.lower()
        if len(lw) < 6 or f.get(lw, 0) > 2: continue
        for i in range(3, len(lw) - 2):
            if f.get(lw[:i], 0) >= 30 and f.get(lw[i:], 0) >= 30:
                out.append("%s = %s + %s" % (w, lw[:i], lw[i:])); break
    return out

def extrais(ref, en=None):
    """-> {cle: texte|None}, notes"""
    r = resout(ref)
    if not r: return None, ["référence non comprise"]
    code, ch, vs = r
    out, notes = {}, []
    for cle, chemin in SRC_FR.items():
        t = lire(chemin, code, ch, vs)
        out[cle] = decolle(typo.normalise(nettoie(t))) if t else None
    ec = tuple(en) if en else (code, ch, vs)
    # ===== LA NUMÉROTATION EST VÉRIFIÉE DANS CHAQUE SOURCE, PAS DANS DEUX =====
    # Première version : on comparait le Segond à la King James, et c'est tout.
    # Jonas 2:10 a montré pourquoi ça ne suffit pas : Segond, Darby et King
    # James étaient justes, mais l'OSTERVALD y mettait le verset suivant (« Alors
    # l'Éternel commanda au poisson »), la Bible Annotée FUSIONNAIT deux
    # versets, et la Reina-Valera 1909 livrait le verset d'AVANT (« Los que
    # guardan las vanidades ilusorias »). Chaque source numérote Jonas 2 à sa
    # façon. On compte donc les versets du chapitre dans les neuf sources : les
    # françaises contre le Segond, les anglaises et espagnoles contre la King
    # James. Un seul écart, et la référence est refusée — sauf coordonnées
    # données à la main, verset relu à l'appui, et alors seulement si les
    # anglaises et les espagnoles s'accordent ENTRE ELLES à ces coordonnées.
    ref_fr = versets_du_chapitre(SRC_FR["lsg1910"], code, ch)
    for cle, chemin in SRC_FR.items():
        n = versets_du_chapitre(chemin, code, ch)
        if n != ref_fr:
            notes.append("NUMÉROTATION DIVERGENTE : %s %d compte %d versets en %s, %d en Segond" % (code, ch, n, cle, ref_fr))
    en_c, en_ch = (ec[0], ec[1])
    ref_en = versets_du_chapitre(SRC_EN["kjv1769"], en_c, en_ch)
    if not en and ref_en != ref_fr:
        notes.append("NUMÉROTATION DIVERGENTE : %s %d compte %d versets en Segond, %d en King James" % (code, ch, ref_fr, ref_en))
    for cle, chemin in list(SRC_EN.items()) + list(SRC_ES.items()):
        n = versets_du_chapitre(chemin, en_c, en_ch)
        if n != ref_en:
            notes.append("NUMÉROTATION DIVERGENTE : %s %d compte %d versets en %s, %d en King James" % (en_c, en_ch, n, cle, ref_en))
    if any(x.startswith("NUMÉROTATION") for x in notes): ec = None
    for cle, chemin in SRC_EN.items():
        t = lire(chemin, ec[0], ec[1], list(ec[2])) if ec else None
        out[cle] = decolle(typo_en.normalise(t)) if t else None
    for cle, chemin in SRC_ES.items():
        t = lire(chemin, ec[0], ec[1], list(ec[2])) if ec else None
        out[cle] = decolle(typo_es.normalise(t)) if t else None
    return out, notes, (list(ec) if ec else None)

# ---- Ce que le jeu porte déjà ---------------------------------------------------
def stockes():
    s = io.open(JEU, encoding="utf-8").read()
    i = s.index("const HERO_VERSES = ["); j = s.index("\n];", i)
    hero = {}
    for m in re.finditer(r'\{\s*t:"((?:[^"\\]|\\.)*)"\s*,\s*r:"((?:[^"\\]|\\.)*)"\s*\}', s[i:j]):
        hero[json.loads('"' + m.group(2) + '"')] = json.loads('"' + m.group(1) + '"')
    alt = {}
    i = s.index("const VERSETS_ALT = {")
    cle = None
    for ligne in s[i:].split("\n")[1:]:
        m = re.match(r'^  ([a-z0-9]+): \{\s*$', ligne)
        if m: cle = m.group(1); alt[cle] = {}; continue
        if re.match(r'^\};', ligne): break
        m = re.match(r'^\s*"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$', ligne)
        if m and cle: alt[cle][json.loads('"' + m.group(1) + '"')] = json.loads('"' + m.group(2) + '"')
    return s, hero, alt

def temoin(M):
    """Relit des versets déjà présents : le script doit retrouver le texte
    stocké, au caractère près, dans chaque version."""
    s, hero, alt = stockes()
    coords = json.load(io.open(os.path.join(ICI, "coords_en.json"), encoding="utf-8"))
    refs = [r for r in hero if not re.search(r"\d[ab]$", r)]
    ecarts, vus = [], 0
    for ref in refs:
        out, notes, _ = extrais(ref, coords.get(ref))
        if out is None: continue
        vus += 1
        attendu = {"lsg1910": hero[ref]}
        for cle, d in alt.items():
            if ref in d: attendu[cle] = d[ref]
        mt, _ = martin_de(M, ref, hero[ref])
        out["martin1744"] = mt
        for cle, t in attendu.items():
            if cle in out and out[cle] is not None and out[cle] != t:
                ecarts.append((ref, cle, t, out[cle]))
    print("témoin : %d références relues, %d écarts" % (vus, len(ecarts)))
    for ref, cle, a, b in ecarts[:12]:
        print("  %-26s %-10s\n      stocké  %s\n      extrait %s" % (ref, cle, a[:110], b[:110]))
    return not ecarts

ORDRE = ["lsg1910", "darby", "ostervald", "ba", "martin1744", "kjv1769", "asv1901", "web", "rv1909", "rv1865"]

def js(t):
    return json.dumps(t, ensure_ascii=False)

if __name__ == "__main__":
    M = charge_martin()
    if "--temoin" in sys.argv:
        sys.exit(0 if temoin(M) else 1)
    cands = json.load(io.open(sys.argv[1], encoding="utf-8"))
    s, hero, alt = stockes()
    retenus = []
    for c in cands:
        ref = c["r"]
        if ref in hero: print("\n%s : DÉJÀ DANS LE RECUEIL, ignorée" % ref); continue
        out, notes, ec = extrais(ref, c.get("en"))
        if out is None: print("\n%s : %s" % (ref, notes[0])); continue
        mt, note_m = martin_de(M, ref, out["lsg1910"] or "")
        out["martin1744"] = mt
        if note_m: notes.append("Martin : " + note_m)
        chemins = dict(SRC_FR); chemins.update(SRC_EN); chemins.update(SRC_ES)
        for cle, chemin in chemins.items():
            for x in colles(out.get(cle), chemin): notes.append("MOT COLLÉ ? %s : %s" % (cle, x))
        print("\n%s   (anglais/espagnol lus en %s)" % (ref, ec))
        for n in notes: print("  !! " + n)
        for cle in ORDRE:
            t = out.get(cle)
            print("  %-10s %4s  %s" % (cle, len(t) if t else "—", t if t else "ABSENT"))
        if any(x.startswith("NUMÉROTATION") for x in notes):
            print("  -> REFUSÉE : la numérotation n'est pas la même partout"); continue
        manque = [k for k in ORDRE if not out.get(k)]
        if manque:
            # Pas de repli silencieux sur le Segond pour un verset NEUF : une
            # version choisie doit montrer SON texte, ou le verset n'entre pas.
            print("  -> REFUSÉE : pas de texte en %s" % ", ".join(manque)); continue
        retenus.append((ref, out, ec))
    print("\n%d référence(s) prête(s) sur %d" % (len(retenus), len(cands)))
    if "--injecte" not in sys.argv: sys.exit(0)

    # ---- DÉPÔT : on ajoute en fin de chaque bloc, on ne touche à rien d'autre ---
    j = s.index("\n];", s.index("const HERO_VERSES = ["))
    ajout = "".join('\n  { t:%s, r:%s },' % (js(o["lsg1910"]), js(r)) for r, o, _ in retenus)
    s = s[:j] + ajout + s[j:]
    for cle in ORDRE[1:]:
        m = re.search(r'\n  %s: \{\n' % re.escape(cle), s)
        if not m: print("  bloc %s introuvable : non déposé" % cle); continue
        fin = s.index("\n  }", m.end())
        lignes = "".join('\n    %s:%s,' % (js(r), js(o[cle])) for r, o, _ in retenus if o.get(cle))
        # le dernier élément existant peut ne pas porter de virgule
        avant = s[:fin].rstrip()
        if not avant.endswith(",") and not avant.endswith("{"): avant += ","
        s = avant + lignes + s[fin:]
    io.open(JEU, "w", encoding="utf-8").write(s)
    # Les fichiers de travail suivent, pour qu'une régénération complète future
    # retrouve ces références au lieu de les perdre en silence.
    chemin = os.path.join(ICI, "coords_en.json")
    co = json.load(io.open(chemin, encoding="utf-8"))
    for r, o, ec in retenus: co[r] = ec
    json.dump(co, io.open(chemin, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    chemin = os.path.join(ICI, "textes.json")
    tx = json.load(io.open(chemin, encoding="utf-8"))
    for r, o, _ in retenus:
        for cle, t in o.items():
            if t and cle in tx: tx[cle][r] = t
    json.dump(tx, io.open(chemin, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("déposé : %d verset(s) dans HERO_VERSES et VERSETS_ALT, coords_en.json et textes.json à jour" % len(retenus))
