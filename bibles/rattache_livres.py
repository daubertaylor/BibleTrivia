# -*- coding: utf-8 -*-
"""LES QUESTIONS SANS RÉFÉRENCE : CHAQUE RATTACHEMENT RELU DANS LA SEGOND.

La table LIVRE_SANS_REFERENCE de index.html donne un livre aux questions dont
le « Le savais-tu ? » n'écrit aucune référence (l'arc-en-ciel de Noé, la harpe
de David). Un livre donné de mémoire serait une affirmation sans preuve : ce
script la refait. Pour chaque entrée qui cite un verset, le verset doit exister
dans la Segond 1910 ET contenir le mot qui fait la réponse. Une entrée qui ne
nomme qu'un livre (« Quel est le premier livre de la Bible ? » -> Genèse) n'a
rien à citer : on vérifie seulement que la question existe.

Il vérifie aussi que chaque clé des deux tables (LIVRE_SANS_REFERENCE et
SANS_LIVRE) est bien un énoncé de la banque : une question récrite laisserait
sinon une entrée morte, et sa question retomberait sans livre sans bruit.

    python3 bibles/rattache_livres.py
"""
import io, os, re, sys, json, importlib.util

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
_spec = importlib.util.spec_from_file_location("aq", os.path.join(ICI, "ajoute_questions.py"))
aq = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(aq)

# Le mot que le verset doit porter, par énoncé. Ajouter une entrée à la table
# du jeu, c'est l'ajouter ici avec son mot.
MOTS = {
    "Quel signe Dieu donna-t-il à Noé après le déluge ?": "arc",
    "Quel arbre était interdit dans le jardin d'Éden ?": "connaissance du bien et du mal",
    "Quelle nourriture Dieu envoyait-il chaque matin dans le désert ?": "manne",
    "Quel instrument David jouait-il pour apaiser le roi Saül ?": "harpe",
    "Où Jésus changea-t-il l'eau en vin ?": "Cana",
    "Quel métier exerçait Joseph, le père adoptif de Jésus ?": "charpentier",
    "Que guidait Israël la nuit pendant la traversée du désert ?": "colonne de feu",
    "Combien de fois Israël fit-il le tour de Jéricho le septième jour ?": "sept fois",
    "Sur quelle montagne Moïse reçut-il les tables de la Loi ?": "Sinaï",
    "Quel disciple marcha un instant sur l'eau vers Jésus ?": "Pierre",
    "Quelle première femme fut créée selon la Genèse ?": "Ève",
    "Quel psaume commence par « L'Éternel est mon berger » ?": "berger",
    "Dans quelle ville Jésus est-il né ?": "Bethléhem",
    "Qui était le père terrestre (adoptif) de Jésus ?": "Joseph",
    "Combien de frères Joseph avait-il, selon la Genèse ?": "douze",
    "Dans quelle ville Jésus a-t-il grandi avec ses parents ?": "Nazareth",
    "Combien de personnes ont été sauvées dans l'arche de Noé, selon 1 Pierre 3:20 ?": "huit",
    "Combien de jours Jésus resta-t-il au tombeau avant sa résurrection ?": "trois jours",
    "Sur quelle île l'apôtre Jean reçut-il l'Apocalypse ?": "Patmos",
    "Sur quel chemin Saul fut-il aveuglé puis converti ?": "Damas",
    "Qui, proche parent, racheta et épousa Ruth ?": "Boaz",
    "Quel couple, fabricant de tentes, instruisit Apollos ?": "Priscille",
    "Quel juge vainquit les Madianites avec seulement 300 hommes ?": "trois cents",
    "Qui reconstruisit les murailles de Jérusalem après l'exil ?": "cinquante-deux",
    "Que renfermait l'arche de l'alliance ?": "tables",
    "Pourquoi Jonas fuyait-il vers Tarsis ?": "Tarsis",
    "Quel prophète est appelé « le prophète des larmes » ?": "larmes",
    "Quel est le nom de la femme moabite qui a épousé Booz ?": "Ruth",
    "Quel est le nom du frère jumeau d'Ésaü ?": "Jacob",
    "Quel est le nom du frère de Moïse qui parlait à sa place devant Pharaon ?": "Aaron",
    "Quelle ville est connue comme la ville natale du roi David ?": "Bethléhem",
    "Environ combien d'années a duré le règne du roi Salomon sur Israël ?": "quarante ans",
    "Quelle épître Paul écrit-il au sujet d'un esclave fugitif ?": "Onésime",
    "Qui gardait les vêtements de ceux qui lapidèrent Étienne ?": "Saul",
    "Quelle prophétesse jugea Israël et chanta sa victoire ?": "prophétesse",
    "Quel prophète mineur ne contient qu'un seul chapitre et vise Édom ?": "Édom",
    "Quel prophète mineur annonça la ruine de Ninive ?": "Ninive",
    "À qui Paul renvoie-t-il l'esclave Onésime ?": "renvoie",
    "Que célèbre, presque à chaque verset, le plus long psaume de la Bible ?": "loi",
    "Qui se présente simplement comme « l'ancien » au début de 2 et 3 Jean ?": "ancien",
    "Qui a succédé à Moïse pour conduire le peuple en Terre promise ?": "Moïse",
    "Combien de fruits de l'Esprit l'apôtre Paul énumère-t-il en Galates 5 ?": "fruit de l'Esprit",
    "Quel homme riche et intègre a tout perdu, puis fut éprouvé par Satan avec la permission de Dieu ?": "intègre",
    "Quel prophète annonce la ruine d'Édom en un seul chapitre ?": "Édom",
}

def table(nom, s):
    m = re.search(r"const %s = (\{.*?\n\});" % nom, s, re.S)
    return json.loads(m.group(1))

def main():
    s = io.open(aq.JEU, encoding="utf-8").read()
    refs, sans = table("LIVRE_SANS_REFERENCE", s), table("SANS_LIVRE", s)
    enonces = set(q["q"] for n in aq.NIVEAUX for q in aq.banque()[n])
    ko = 0
    for e in list(refs) + list(sans):
        if e not in enonces:
            ko += 1; print("KO  entrée morte (énoncé absent de la banque) :", e)
    for e, t in sans.items():
        if t not in ("at", "nt", "tout"):
            ko += 1; print("KO  testament inconnu :", t, "|", e)
    for e, ref in refs.items():
        if not re.search(r"\d", ref):
            if e in MOTS: ko += 1; print("KO  un livre seul n'a pas de mot à vérifier :", e)
            continue
        mot = MOTS.get(e)
        verset = (aq.textes_cites(ref) or {}).get("fr", "")
        if not mot or not verset or aq.plat(mot) not in aq.plat(verset):
            ko += 1; print("KO  %-16s %s | mot %r | %s" % (ref, e, mot, verset[:90]))
    for e in MOTS:
        if e not in refs: ko += 1; print("KO  mot sans entrée dans la table du jeu :", e)
    print("%d rattachements, %d sans livre : %s" % (len(refs), len(sans), "tout est relu" if not ko else "%d KO" % ko))
    sys.exit(1 if ko else 0)

if __name__ == "__main__":
    main()
