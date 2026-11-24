#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LE SITE DE YADA (v363) — les pages à lire, à côté du jeu.

AdSense a refusé yadaquiz.app pour « contenu de faible valeur » : le jeu est
une page d'application, qui ne montre presque aucun texte à qui la lit sans
jouer — un robot, un relecteur. Ces pages donnent à lire ce que le jeu
contient vraiment : ses 1 796 questions, rangées par livre, chacune avec sa
réponse, son explication et sa référence ; un guide de chaque mode ; les
questions fréquentes ; le journal des nouveautés ; qui fait Yada et comment.

RIEN N'EST ÉCRIT DE MÉMOIRE. Les questions et leurs explications sont celles
du jeu, lues dans le jeu lui-même (extraire-banque.js : le livre de chaque
question est celui que le jeu lui attribue, bookOf). Les chapitres et les
versets de chaque livre sont comptés dans le texte Segond 1910 d'eBible.org
(lsg-comptes.json). Les présentations des livres (livres.json) sont des
résumés : les rares mots entre guillemets y ont été vérifiés dans ce texte.

Usage :
  node contenu/extraire-banque.js http://127.0.0.1:8099/index.html /chemin/banque.json
  python3 contenu/genere.py <racine du dépôt> /chemin/banque.json [AAAA-MM-JJ]

On écrit : quiz-biblique/ (le sommaire et 66 pages), guide/, a-propos/, faq/,
nouveautes/, site/site.css, site/quiz.js, sitemap.xml et robots.txt. Les
pages écrites à la main sont dans contenu/pages/ : on les modifie là, puis
on relance ce programme. Toujours relancer après un ajout de questions. """
import io, os, re, sys, json, html, random, hashlib, datetime

ICI = os.path.dirname(os.path.abspath(__file__))
DEPOT = os.path.abspath(sys.argv[1])
BANQUE = sys.argv[2]
DATE = sys.argv[3] if len(sys.argv) > 3 else datetime.date.today().isoformat()
SITE = "https://yadaquiz.app/"
NB = " "
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]

def date_fr(iso):
    a, m, j = (int(x) for x in iso.split("-"))
    return ("1er" if j == 1 else str(j)) + " " + MOIS[m - 1] + " " + str(a)

def nombre(n):
    """1796 -> « 1 796 » (espace insécable, à la française)."""
    return "{:,}".format(n).replace(",", NB)

def typo(s):
    """Les espaces insécables de la typographie française — sur du TEXTE."""
    s = re.sub(r"[  ]([?!:;»])", NB + r"\1", s)
    s = re.sub(r"«[  ]", "«" + NB, s)
    # (v367) Et dans un nombre : « 185 000 hommes » ne se coupe pas en deux.
    s = re.sub(r"(\d) (\d{3})(?!\d)", r"\1" + NB + r"\2", s)
    return s

def typo_html(h):
    """La même chose sur du HTML : seulement entre les balises."""
    morceaux = re.split(r"(<[^>]+>)", h)
    return "".join(m if m.startswith("<") else typo(m) for m in morceaux)

def e(s):
    return html.escape(typo(s), quote=False)

def attr(s):
    return html.escape(s, quote=True)

def lire(chemin):
    return io.open(chemin, encoding="utf-8").read()

def ecrire(rel, contenu):
    p = os.path.join(DEPOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8", newline="\n").write(contenu)

# ---------------------------------------------------------------- les données
DONNEES = json.loads(lire(os.path.join(ICI, "livres.json")))
LIVRES = DONNEES["livres"]
SECTIONS = {s["id"]: s for s in DONNEES["sections"]}
COMPTES = json.loads(lire(os.path.join(ICI, "lsg-comptes.json")))
B = json.loads(lire(BANQUE))
QUESTIONS = B["out"]
ORDRE = B["ordre"]
assert [l["nom"] for l in LIVRES] == ORDRE, "livres.json ne suit plus BIBLE_BOOKS"
TOTAL = len(QUESTIONS)
PAR_LIVRE = {l["nom"]: [] for l in LIVRES}
SANS_LIVRE = []
for q in QUESTIONS:
    (PAR_LIVRE[q["book"]] if q["book"] in PAR_LIVRE else SANS_LIVRE).append(q)
NIVEAUX = [("facile", "Facile", 10), ("moyen", "Moyen", 20), ("difficile", "Difficile", 30)]
NIV = {k: (lab, pts) for k, lab, pts in NIVEAUX}
UNITES = [  # le Parcours du jeu (PARCOURS) : l'unité de chaque livre
    ("Au commencement", ["Genèse"]),
    ("L'Exode et le désert", ["Exode", "Lévitique", "Nombres", "Deutéronome"]),
    ("La Terre promise", ["Josué", "Juges", "Ruth"]),
    ("Les rois d'Israël", ["1 Samuel", "2 Samuel", "1 Rois", "2 Rois", "1 Chroniques", "2 Chroniques"]),
    ("L'exil et le retour", ["Esdras", "Néhémie", "Esther"]),
    ("Sagesse et poésie", ["Job", "Psaumes", "Proverbes", "Ecclésiaste", "Cantique des cantiques"]),
    ("Les grands prophètes", ["Ésaïe", "Jérémie", "Lamentations", "Ézéchiel", "Daniel"]),
    ("Les petits prophètes", ORDRE[27:39]),
    ("La vie de Jésus", ["Matthieu", "Marc", "Luc", "Jean"]),
    ("L'Église naissante", ["Actes"]),
    ("Les lettres de Paul", ORDRE[44:57]),
    ("Lettres et Apocalypse", ORDRE[57:]),
]
UNITE_DE = {}
for i, (nom, livres) in enumerate(UNITES):
    for l in livres: UNITE_DE[l] = (i + 1, nom)
assert len(UNITE_DE) == 66

LIVRE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.4 5.3 8.2 4.8 5 4.8a1 1 0 0 0-1 1V17a1 1 0 0 0 1 1c3.1 0 5.3.5 7 1.8 1.7-1.3 3.9-1.8 7-1.8a1 1 0 0 0 1-1V5.8a1 1 0 0 0-1-1c-3.2 0-5.4.5-7 1.7z"/><path d="M12 6.5v13.3"/></svg>'

# ---------------------------------------------------------------- la mise en page
MENU = [("quiz-biblique/", "Quiz par livre"), ("guide/", "Guide"), ("nouveautes/", "Nouveautés"), ("faq/", "FAQ"), ("a-propos/", "À propos")]
PAGES = []   # (chemin, priorité) pour le plan du site

def fil_json(miettes):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + c} for i, (c, n) in enumerate(miettes)]}

def page(chemin, titre, description, corps, *, rubrique=None, bandeau=None, miettes=None, jsonld=(), script_quiz=False, priorite="0.7"):
    prof = chemin.count("/")
    r = "../" * prof
    menu = "".join('<a href="%s%s"%s>%s</a>' % (r, c, ' aria-current="page"' if c == rubrique else "", e(n)) for c, n in MENU)
    ld = list(jsonld)
    if miettes: ld.append(fil_json(miettes))
    ld_html = "".join('<script type="application/ld+json">%s</script>\n' % json.dumps(x, ensure_ascii=False, separators=(",", ":")) for x in ld)
    haut = ""
    if bandeau:
        sur, h1, chapeau, extra = bandeau
        haut = ('<section class="bandeau"><div class="bandeau-in">'
                + ('<p class="sur-titre">%s</p>' % e(sur) if sur else "")
                + "<h1>%s</h1>" % e(h1)
                + ('<p class="chapeau">%s</p>' % e(chapeau) if chapeau else "")
                + extra + "</div></section>\n")
    fil = ""
    if miettes and len(miettes) > 1:
        fil = '<nav class="fil" aria-label="Fil d\'Ariane">' + " › ".join(
            ('<a href="%s%s">%s</a>' % (r, c, e(n)) if i < len(miettes) - 1 else '<span aria-current="page">%s</span>' % e(n))
            for i, (c, n) in enumerate(miettes)) + "</nav>\n"
    at = [l for l in LIVRES if SECTIONS[l["section"]]["testament"] == "at"]
    nt = [l for l in LIVRES if SECTIONS[l["section"]]["testament"] == "nt"]
    def liste(ls):
        return "".join('<li><a href="%squiz-biblique/%s/">%s</a></li>' % (r, l["slug"], e("Quiz " + l["sur"])) for l in ls)
    vedette_at = [l for l in at if l["nom"] in ("Genèse", "Exode", "Psaumes", "Proverbes", "Ésaïe", "Daniel")]
    vedette_nt = [l for l in nt if l["nom"] in ("Matthieu", "Luc", "Jean", "Actes", "Romains", "Apocalypse")]
    pied = ('<footer class="pied"><div class="pied-in">'
            '<div><b>Yada</b><p>%s</p><a class="jouer" href="%s">Jouer à Yada</a></div>' % (e("Le quiz biblique gratuit : %s questions sur les 66 livres de la Bible, à jouer seul, en famille ou entre amis." % nombre(TOTAL)), r)
            + '<div><b>Le site</b><ul><li><a href="%squiz-biblique/">Quiz biblique par livre</a></li><li><a href="%sguide/">Guide du jeu</a></li><li><a href="%snouveautes/">Nouveautés</a></li><li><a href="%sfaq/">Questions fréquentes</a></li><li><a href="%sa-propos/">À propos</a></li></ul></div>' % (r, r, r, r, r)
            + "<div><b>Ancien Testament</b><ul>%s</ul></div>" % liste(vedette_at)
            + "<div><b>Nouveau Testament</b><ul>%s</ul></div>" % liste(vedette_nt)
            + '<div><b>Contact</b><ul><li><a href="mailto:yadaquiz.app@gmail.com">yadaquiz.app@gmail.com</a></li><li><a href="%sconfidentialite">%s</a></li></ul></div>' % (r, e("Confidentialité et mentions légales"))
            + '<p class="bas">%s</p>' % e("© 2026 Yada · yadaquiz.app — Les citations bibliques sont tirées de versions du domaine public (Louis Segond 1910 par défaut). Mis à jour le %s." % date_fr(DATE))
            + "</div></footer>")
    doc = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>try{{if(self!==top&&top.location.host===location.host)document.documentElement.classList.add("dans-app")}}catch(e){{}}</script>
<title>{titre}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Yada">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{titre}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{site}site/partage.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F6F1E8">
<meta name="google-adsense-account" content="ca-pub-4777080561806498">
<link rel="icon" href="{r}icon-192.png">
<link rel="apple-touch-icon" href="{r}apple-touch-icon.png">
<link rel="stylesheet" href="{r}site/site.css">
<link rel="preload" href="{r}site/decor.jpg" as="image" fetchpriority="high">
<link rel="preload" href="{r}fonts/poppins-700-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{r}fonts/poppins-600-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{r}fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<script type="speculationrules">{{"prefetch":[{{"where":{{"and":[{{"href_matches":"/*"}},{{"not":{{"href_matches":"/"}}}}]}},"eagerness":"moderate"}}]}}</script>
{ld}</head>
<body>
<header class="entete"><div class="entete-in"><a class="marque" href="{r}"><img src="{r}icon-192.png" alt="" width="34" height="34">Yada</a><nav class="menu" aria-label="Le site">{menu}</nav><a class="jouer" href="{r}">Jouer</a></div><nav class="menu-mobile" aria-label="Le site (mobile)">{menu}</nav><script>(function(){{try{{var m=document.querySelector(".menu-mobile");if(!m)return;var k="yada-onglets";m.scrollLeft=+sessionStorage.getItem(k)||0;var a=m.querySelector("[aria-current]");if(a){{var r=a.getBoundingClientRect(),n=m.getBoundingClientRect();if(r.left<n.left+12||r.right>n.right-12)m.scrollLeft+=(r.left+r.width/2)-(n.left+n.width/2);}}var l=[].slice.call(m.querySelectorAll("a")),i=a?l.indexOf(a):l.length,p=sessionStorage.getItem("yada-onglet-i");if(p!==null&&i<+p)document.documentElement.setAttribute("data-vt","gauche");sessionStorage.setItem("yada-onglet-i",i);var v=[].slice.call(document.querySelectorAll(".entete [aria-current]")).filter(function(x){{return x.getClientRects().length}})[0];if(v)v.style.viewTransitionName="onglet";addEventListener("pagehide",function(){{try{{sessionStorage.setItem(k,m.scrollLeft)}}catch(e){{}}}});}}catch(e){{}}}})();</script></header>
{haut}<main class="contenu">
{fil}{corps}
</main>
{pied}
{js}</body>
</html>
""".format(titre=attr(typo(titre)), desc=attr(typo(description)), url=SITE + chemin, site=SITE, r=r, ld=ld_html, menu=menu,
           haut=haut, fil=fil, corps=corps, pied=pied,
           js=('<script src="%ssite/quiz.js" defer></script>\n' % r) if script_quiz else "")
    ecrire(chemin + "index.html", doc)
    PAGES.append((chemin, priorite))

# ---------------------------------------------------------------- une question
def melange(q):
    """Les propositions dans un ordre fixe mais mêlé : dans la banque, la bonne
    réponse vient souvent en premier (le jeu mélange à chaque partie)."""
    graine = int(hashlib.sha1(q["q"].encode("utf-8")).hexdigest()[:12], 16)
    opts = list(q["options"])
    random.Random(graine).shuffle(opts)
    return opts, opts.index(q["correct"])

def question_html(q, num):
    opts, b = melange(q)
    lab, pts = NIV[q["tier"]]
    lis = "".join('<li><span class="l">%s</span><span>%s</span></li>' % ("ABCD"[i], e(o)) for i, o in enumerate(opts))
    return ('<article class="q" id="q-%s-%d" data-b="%d">'
            '<p class="q-tete"><span>Question %d</span><span>%s · %d%spts</span></p>'
            '<h3>%s</h3>'
            '<ol class="q-options">%s</ol>'
            '<details class="q-rep"><summary>Voir la réponse</summary>'
            '<p class="bonne">Réponse%s: <span>%s</span></p>'
            '<div class="savais"><span class="ico" aria-hidden="true">%s</span><div><p class="titre">Le savais-tu%s?</p><p>%s</p></div></div>'
            '</details></article>\n') % (q["tier"], q["i"], b, num, lab, pts, NB, e(q["q"]), lis, NB, e(q["correct"]), LIVRE_ICO, NB, e(q["fact"]))

def bloc_questions(qs, ancre_prefixe=""):
    out, num = [], 0
    nav = []
    for k, lab, pts in NIVEAUX:
        l = [q for q in qs if q["tier"] == k]
        if not l: continue
        titre = {"facile": "Questions faciles", "moyen": "Questions de niveau moyen", "difficile": "Questions difficiles"}[k]
        nav.append('<li><a href="#%s%s">%s · %d</a></li>' % (ancre_prefixe, k, e(lab), len(l)))
        out.append('<h2 id="%s%s">%s <span class="note">(%d)</span></h2>\n' % (ancre_prefixe, k, e(titre), len(l)))
        for q in l:
            num += 1
            out.append(question_html(q, num))
    return '<ul class="niveaux" aria-label="Niveaux">%s</ul>\n' % "".join(nav), "".join(out)

SCORE = '<div class="score" hidden role="status" aria-live="polite">Ton score sur cette page%s: <b>0 / 0</b></div>\n' % NB
COMMENT = ('<p class="consigne">%s</p>\n'
           % e("Touche une proposition pour répondre : la bonne réponse s'allume, avec son explication et sa référence. Ce sont les questions du jeu Yada, où tu les retrouves avec un chrono, des points et ta série."))

def appel(titre, texte, bouton, r):
    return '<div class="appel"><p><b>%s</b>%s</p><a class="jouer grand" href="%s">%s</a></div>\n' % (e(titre), e(texte), r, e(bouton))

# ---------------------------------------------------------------- les 66 livres
def ordinal(n):
    return "1er" if n == 1 else "%de" % n

for idx, l in enumerate(LIVRES):
    qs = PAR_LIVRE[l["nom"]]
    sec = SECTIONS[l["section"]]
    test = "Ancien Testament" if sec["testament"] == "at" else "Nouveau Testament"
    c = COMPTES[l["code"]]
    n = len(qs)
    chemin = "quiz-biblique/%s/" % l["slug"]
    resume = l["resume"]
    desc = "%s questions %s, avec la réponse et l'explication de chacune. %s" % (nombre(n), l["sur"], resume)
    if len(desc) > 158:
        desc = desc[:157].rsplit(" ", 1)[0].rstrip(",;:—– ") + "…"
    chiffres = ('<ul class="chiffres"><li>%s <span>questions</span></li><li>%s <span>chapitres</span></li><li>%s <span>versets</span></li><li><span>Livre</span> %d <span>sur 66</span></li></ul>'
                % (nombre(n), nombre(c["chapitres"]), nombre(c["versets"]), idx + 1)) if c["chapitres"] > 1 else (
                '<ul class="chiffres"><li>%s <span>questions</span></li><li>1 <span>chapitre</span></li><li>%s <span>versets</span></li><li><span>Livre</span> %d <span>sur 66</span></li></ul>'
                % (nombre(n), nombre(c["versets"]), idx + 1))
    nav, corps_q = bloc_questions(qs)
    u_num, u_nom = UNITE_DE[l["nom"]]
    avant = LIVRES[idx - 1] if idx > 0 else None
    apres = LIVRES[idx + 1] if idx < 65 else None
    suite = '<nav class="suite" aria-label="Livres voisins">'
    if avant: suite += '<a href="../%s/"><span>%s</span><b>%s</b></a>' % (avant["slug"], e("← Livre précédent"), e(avant["nom"]))
    if apres: suite += '<a class="apres" href="../%s/"><span>%s</span><b>%s</b></a>' % (apres["slug"], e("Livre suivant →"), e(apres["nom"]))
    suite += "</nav>\n"
    groupe = {"pentateuque": "le Pentateuque", "historiques": "les livres historiques", "poetiques": "les livres poétiques et de sagesse",
              "grands-prophetes": "les grands prophètes", "petits-prophetes": "les petits prophètes", "evangiles": "les quatre évangiles",
              "paul": "les épîtres de Paul", "generales": "les épîtres générales"}.get(l["section"])
    phrase = "%s est le %s livre de la Bible (%s)" % (l["titre"][0].upper() + l["titre"][1:], ordinal(idx + 1), test)
    phrase += (", parmi %s." % groupe) if groupe else "."
    lsg = '<p class="note">%s</p>\n' % e(phrase + " Ses chapitres et ses versets sont comptés dans la Louis Segond 1910.")
    parcours = "<p>%s</p>\n" % (e("Dans le Parcours de Yada, %s fait partie de l'unité %d, « %s »." % (l["titre"], u_num, u_nom)).replace("Parcours de Yada", '<a href="../../guide/#parcours">Parcours de Yada</a>', 1))
    corps = (nav + COMMENT + corps_q + SCORE + lsg + parcours
             + appel("Joue à ce quiz dans Yada", "Avec un chrono, des points, ta série et tes erreurs à revoir. Gratuit, sans compte.", "Jouer à Yada", "../../")
             + suite)
    page(chemin, "Quiz biblique %s : %s questions avec réponses | Yada" % (l["sur"], nombre(n)), desc, corps,
         rubrique="quiz-biblique/", script_quiz=True, priorite="0.8",
         bandeau=("%s · %s" % (test, sec["nom"]), "Quiz " + l["sur"], resume, chiffres),
         miettes=[("", "Yada"), ("quiz-biblique/", "Quiz biblique"), (chemin, l["nom"])])

# ---------------------------------------------------------------- le sommaire du quiz
def grille(ls):
    return '<ul class="livres">' + "".join(
        '<li><a href="%s/"><b>%s</b><span>%s</span></a></li>' % (l["slug"], e(l["nom"]),
            e("%s questions · %s" % (nombre(len(PAR_LIVRE[l["nom"]])), ("%s chapitres" % nombre(COMPTES[l["code"]]["chapitres"])) if COMPTES[l["code"]]["chapitres"] > 1 else "1 chapitre")))
        for l in ls) + "</ul>\n"

corps = []
for test, titre in (("at", "L'Ancien Testament"), ("nt", "Le Nouveau Testament")):
    nb_l = sum(1 for l in LIVRES if SECTIONS[l["section"]]["testament"] == test)
    nb_q = sum(len(PAR_LIVRE[l["nom"]]) for l in LIVRES if SECTIONS[l["section"]]["testament"] == test)
    corps.append('<h2 id="%s">%s <span class="note">(%d livres, %s questions)</span></h2>\n' % (test, e(titre), nb_l, nombre(nb_q)))
    for s in DONNEES["sections"]:
        if s["testament"] != test: continue
        ls = [l for l in LIVRES if l["section"] == s["id"]]
        corps.append("<h3>%s</h3>\n" % e(s["nom"])); corps.append(grille(ls))
methode = ('<div class="carte" id="methode"><h2>Comment ces questions sont écrites</h2>'
           + "<p>%s</p>" % e("Ces %s questions sont celles du jeu Yada. Chacune propose quatre réponses, dont une seule est juste, et chacune a son niveau : facile, moyen ou difficile." % nombre(TOTAL))
           + "<p>%s</p>" % e("Chaque réponse est suivie d'une explication, « Le savais-tu ? », qui donne la référence du passage : on peut toujours aller vérifier dans sa Bible. Les citations sont extraites par programme du texte publié de la Louis Segond 1910, jamais recopiées de mémoire.")
           + "<p>%s</p></div>\n" % e("Sur chaque page, touche une proposition pour répondre : la bonne réponse s'allume, avec son explication."))
nav_g, corps_g = bloc_questions(SANS_LIVRE, "general-")
generales = ('<h2 id="culture-generale">%s</h2>\n<p>%s</p>\n' % (e("Culture biblique générale"), e("Quelques questions qui ne tiennent pas dans un seul livre : les langues de la Bible, le nombre de ses livres, les évangiles, les apôtres."))
             + corps_g)
page("quiz-biblique/", "Quiz biblique : %s questions avec réponses, livre par livre | Yada" % nombre(TOTAL),
     "%s questions de quiz biblique sur les 66 livres de la Bible, de la Genèse à l'Apocalypse, avec la réponse, l'explication et la référence de chacune. Gratuit." % nombre(TOTAL),
     "".join(corps) + methode + generales + SCORE
     + appel("Joue à toutes ces questions dans Yada", "Un Parcours de 60 leçons, cinq jeux, des parties entre amis. Gratuit, sans compte.", "Jouer à Yada", "../"),
     rubrique="quiz-biblique/", script_quiz=True, priorite="0.9",
     bandeau=("Le quiz biblique", "Quiz biblique : %s questions, livre par livre" % nombre(TOTAL),
              "Choisis un livre de la Bible et réponds à ses questions, de la plus facile à la plus difficile. Chaque réponse est expliquée, avec sa référence.",
              '<ul class="chiffres"><li>%s <span>questions</span></li><li>66 <span>livres</span></li><li>3 <span>niveaux</span></li></ul>' % nombre(TOTAL)
              + '<div class="actions"><a class="jouer grand" href="../">Jouer dans Yada</a><a class="bouton-clair" href="#methode">Comment c\'est fait</a></div>'),
     miettes=[("", "Yada"), ("quiz-biblique/", "Quiz biblique")])

# ---------------------------------------------------------------- les pages écrites à la main
def entete(fragment):
    m = re.match(r"\s*<!--(\{.*?\})-->\s*", fragment, re.S)
    return json.loads(m.group(1)), fragment[m.end():]

for nom in ("guide", "a-propos", "nouveautes"):
    meta, corps = entete(lire(os.path.join(ICI, "pages", nom + ".html")))
    corps = typo_html(corps.replace("1 796", nombre(TOTAL)))
    ch = meta["chemin"]
    page(ch, meta["titre"], meta["description"], corps, rubrique=ch, priorite="0.8" if nom == "guide" else "0.6",
         bandeau=(meta.get("sur_titre"), meta["h1"], meta.get("chapeau"), '<div class="actions"><a class="jouer grand" href="../">Jouer à Yada</a></div>' if nom != "nouveautes" else ""),
         miettes=[("", "Yada"), (ch, meta["titre_court"])])

faq = json.loads(lire(os.path.join(ICI, "pages", "faq.json")))
items = []
ld_q = []
for qu, rep in faq["questions"]:
    rep = rep.replace("1 796", nombre(TOTAL))
    items.append("<details><summary>%s</summary><div>%s</div></details>\n" % (e(qu), typo_html(rep)))
    ld_q.append({"@type": "Question", "name": typo(qu), "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", " ", typo(rep)).replace("  ", " ").strip()}})
page(faq["chemin"], faq["titre"], faq["description"], '<div class="faq">' + "".join(items) + "</div>\n"
     + appel("Le plus simple, c'est d'essayer", "Une partie dure quelques minutes. Pas de compte, rien à installer.", "Jouer à Yada", "../"),
     rubrique=faq["chemin"], priorite="0.6",
     bandeau=(faq["sur_titre"], faq["h1"], faq["chapeau"], ""),
     miettes=[("", "Yada"), (faq["chemin"], faq["titre_court"])],
     jsonld=[{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": ld_q}])

# ---------------------------------------------------------------- les fichiers communs
os.makedirs(os.path.join(DEPOT, "site"), exist_ok=True)
ecrire("site/site.css", "/* Généré par contenu/genere.py — modifier contenu/site/*.css */\n"
       + lire(os.path.join(ICI, "site", "polices.css")) + "\n" + lire(os.path.join(ICI, "site", "base.css")))
ecrire("site/quiz.js", lire(os.path.join(ICI, "site", "quiz.js")))

urls = [("", "1.0")] + PAGES + [("confidentialite", "0.3")]
plan = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for ch, prio in urls:
    plan.append("  <url><loc>%s%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>" % (SITE, ch, DATE, prio))
plan.append("</urlset>")
ecrire("sitemap.xml", "\n".join(plan) + "\n")
ecrire("robots.txt", "# Yada — yadaquiz.app\nUser-agent: *\nAllow: /\n\nSitemap: %ssitemap.xml\n" % SITE)
print("pages :", len(PAGES), "· questions :", TOTAL, "· sans livre :", len(SANS_LIVRE), "· plan :", len(urls), "adresses")
