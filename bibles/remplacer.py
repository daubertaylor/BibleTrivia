# -*- coding: utf-8 -*-
"""REMPLACER UNE QUESTION, DANS LES TROIS LANGUES À LA FOIS.

   Les trois banques se repèrent PAR POSITION : la 459e entrée de
   questions-en.js traduit la 459e question de BANK, et rien ne le dit sinon
   l'ordre. Toucher une question à la main dans index.html sans toucher les
   deux autres fichiers, c'est décaler une traduction en silence — la faute la
   plus facile à commettre et la plus difficile à voir.

   Cet outil fait les trois d'un coup, ou aucun :
     - la ligne de BANK dans index.html ;
     - la ligne de questions-en.js ;
     - l'entrée du lot bibles/es-questions/NNNN.json, puis assemble_es.py
       régénère questions-es.js.

   L'INDICE DE LA BONNE RÉPONSE N'EST JAMAIS ÉCRIT À LA MAIN : il est recalculé
   depuis les options françaises. C'est ce que vérifie ensuite
   banc-essai/questions-langues.js, qui compare les 1545.

   Usage :  python3 bibles/remplacer.py remplacements.json [--essai]

   Un remplacement :
     { "rang": 459,
       "avant": "Quel repas Jésus partagea",     (facultatif : garde-fou)
       "fr": { "q":…, "options":[4], "correct":…, "fact":… },
       "en": { "q":…, "options":[4], "fact":… },   options DANS L'ORDRE FRANÇAIS
       "es": { "q":…, "options":[4], "fact":… } }
"""
import json, io, os, re, subprocess, sys, unicodedata

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX  = os.path.join(RACINE, 'index.html')
ENJS = os.path.join(RACINE, 'questions-en.js')
LOTS = os.path.join(RACINE, 'bibles', 'es-questions')

def lire(p): return io.open(p, encoding='utf-8').read()
def ecrire(p, s): io.open(p, 'w', encoding='utf-8').write(s)

def lignes_bank(src):
    """Les numéros de ligne des 1545 questions, dans l'ordre du jeu."""
    d = src.index('const BANK = ')
    fin = src.index('\n};', d)
    hors = src[:d].count('\n')
    out = []
    for n, l in enumerate(src[d:fin].split('\n')):
        if l.lstrip().startswith('{ q:'): out.append(hors + n)
    return out

def js(x):  # une chaîne JS, échappée comme il faut
    return json.dumps(x, ensure_ascii=False)

def ligne_fr(f):
    return '    { q:%s, options:[%s], correct:%s, fact:%s },' % (
        js(f['q']), ",".join(js(o) for o in f['options']), js(f['correct']), js(f['fact']))

def ligne_trad(t, indice):
    return '[%s, [%s], %s, %d],' % (
        js(t['q']), ", ".join(js(o) for o in t['options']), js(t['fact']), indice)


# ===== LE GARDE-FOU : NE PAS REMPLACER UNE JUMELLE PAR UNE AUTRE =====
# « Vérifie que certaines questions ne soient pas trop similaires au point
#   d'être pareilles, juste un peu modifiées. » L'outil qui répare les doublons
#   serait le premier à pouvoir en créer : on lui interdit ici. Une question
#   neuve qui partage SA RÉPONSE et l'essentiel de ses mots avec une question
#   existante est refusée, et le banc dit laquelle.
VIDES = set("""le la les un une des du de d a à au aux et ou ni mais donc or car
que qui quoi dont où est sont était étaient a ont avait avaient quel quelle quels
quelles combien comment pourquoi quand dans sur sous par pour avec sans vers
chez en y il elle ils elles on se sa son ses leur leurs ce cet cette ces
selon d'après lequel laquelle lesquels premier première dernier dernière
bible biblique verset livre chapitre nom appelle appelé appelée""".split())

def _plat(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]+", " ", s).strip()

def _mots(s):
    return set(m for m in _plat(s).split() if m and m not in VIDES and len(m) > 2)

def jumelles(src, rang, fr, seuil=0.45):
    """Les questions existantes trop proches de la nouvelle, la sienne exclue."""
    out = []
    for n, l in enumerate(src.split('\n')):
        t = l.lstrip()
        if not t.startswith('{ q:'): continue
        m = re.match(r'\{ q:"((?:[^"\\]|\\.)*)".*correct:"((?:[^"\\]|\\.)*)"', t)
        if not m: continue
        q, c = json.loads('"' + m.group(1) + '"'), json.loads('"' + m.group(2) + '"')
        if q == fr['q']: continue
        if _plat(c) != _plat(fr['correct']): continue
        a, b = _mots(q), _mots(fr['q'])
        r = len(a & b) / len(a | b) if (a | b) else 0
        if r >= seuil: out.append((round(r, 2), q))
    return sorted(out, reverse=True)

def main():
    rempl = json.load(io.open(sys.argv[1], encoding='utf-8'))
    essai = '--essai' in sys.argv
    src = lire(IDX)
    lignes = src.split('\n')
    rangs = lignes_bank(src)
    assert len(rangs) == 1545, 'BANK compte %d questions' % len(rangs)
    en = lire(ENJS).split('\n')
    en_rangs = [i for i, l in enumerate(en) if l.startswith('[')]
    assert len(en_rangs) == 1545, 'questions-en.js compte %d entrées' % len(en_rangs)

    lots = {}   # fichier -> liste chargée
    def lot_de(rang):
        noms = sorted(int(n[:-5]) for n in os.listdir(LOTS) if n.endswith('.json'))
        debut = max(n for n in noms if n <= rang)
        nom = '%04d.json' % debut
        if nom not in lots: lots[nom] = json.load(io.open(os.path.join(LOTS, nom), encoding='utf-8'))
        return nom, rang - debut

    for r in rempl:
        rang, fr = r['rang'], r['fr']
        assert len(fr['options']) == 4, '#%d : il faut quatre options' % rang
        assert len(set(fr['options'])) == 4, '#%d : deux options identiques' % rang
        assert fr['correct'] in fr['options'], '#%d : la bonne réponse n\'est pas dans les options' % rang
        indice = fr['options'].index(fr['correct'])
        vieille = lignes[rangs[rang]]
        if 'avant' in r:
            assert r['avant'] in vieille, '#%d : ce n\'est pas la question attendue :\n  %s' % (rang, vieille[:120])
        print('#%-5d %s' % (rang, fr['q'][:88]))
        if essai:
            print('        avant : %s' % vieille.strip()[:110])
        lignes[rangs[rang]] = ligne_fr(fr)
        if essai: continue
        for cle, tab, rgs in (('en', en, en_rangs),):
            t = r[cle]
            assert len(t['options']) == 4, '#%d : quatre options en %s' % (rang, cle)
            tab[rgs[rang]] = ligne_trad(t, indice)
        nom, k = lot_de(rang)
        e = r['es']
        lots[nom][k] = [e['q'], e['options'], e['fact']]

    final = '\n'.join(lignes)
    for r in rempl:
        j = jumelles(final, r['rang'], r['fr'])
        assert not j, ('#%d : la question neuve est la jumelle d\'une autre (%.2f) :\n  %s\n  %s'
                       % (r['rang'], j[0][0], r['fr']['q'], j[0][1]))
    print('\ngarde-fou des jumelles : aucune des %d questions neuves n\'en double une autre.' % len(rempl))
    if essai: return
    ecrire(IDX, final)
    ecrire(ENJS, '\n'.join(en))
    for nom, contenu in lots.items():
        p = os.path.join(LOTS, nom)
        ecrire(p, '[\n' + ',\n'.join(json.dumps(e, ensure_ascii=False) for e in contenu) + '\n]\n')
    print('\nfr, en, lots espagnols : écrits.')
    subprocess.run([sys.executable, os.path.join(RACINE, 'bibles', 'assemble_es.py')], check=True)

main()
