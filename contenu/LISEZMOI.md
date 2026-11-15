# Le site de Yada (v363)

Le jeu est une application d'une seule page : à qui le lit sans jouer — un
moteur de recherche, le relecteur d'AdSense —, il ne montre presque aucun
texte. AdSense l'a refusé deux fois pour « contenu de faible valeur ». Le site
donne à lire ce que le jeu contient vraiment, avec la même matière que le jeu
(crème, corail, bronze ; Inter, Poppins, Fraunces ; aucune bordure).

| adresse | ce qu'on y trouve | d'où ça vient |
|---|---|---|
| `/quiz-biblique/` | le sommaire : 66 livres, la culture biblique générale | `genere.py` |
| `/quiz-biblique/<livre>/` | toutes les questions du livre, jouables, avec réponse, explication et référence | la banque du jeu (`BANK`, livre attribué par `bookOf`) |
| `/guide/` | chaque mode de jeu, avec de vraies captures | `pages/guide.html` |
| `/a-propos/` | qui fait Yada, comment les questions sont écrites | `pages/a-propos.html` |
| `/faq/` | les questions fréquentes (+ données structurées FAQPage) | `pages/faq.json` |
| `/nouveautes/` | le journal des mises à jour | `pages/nouveautes.html` |
| `/sitemap.xml`, `/robots.txt` | le plan du site, et où le trouver | `genere.py` |

## Rien n'est écrit de mémoire

- Les questions, leurs réponses et leurs explications sont **celles du jeu**,
  lues dans le jeu lui-même par `extraire-banque.js` (le livre de chaque
  question est celui que le jeu lui attribue).
- Les chapitres et les versets de chaque livre sont **comptés** dans le texte
  Louis Segond 1910 d'eBible.org (`lsg-comptes.json` : 1 189 chapitres,
  31 170 versets — les titres des psaumes comptent pour un verset dans la
  Segond).
- Les présentations des livres (`livres.json`) sont des résumés ; les rares
  mots entre guillemets y ont été vérifiés dans ce même texte.
- Le guide, la FAQ et le journal ont été vérifiés contre le code du jeu
  (règles, nombres, libellés), pas contre un souvenir.

## Régénérer (après un ajout de questions, une page modifiée…)

```bash
python3 -m http.server 8099 --bind 127.0.0.1 &        # à la racine du dépôt
node contenu/extraire-banque.js http://127.0.0.1:8099/index.html /tmp/banque.json
python3 contenu/genere.py . /tmp/banque.json AAAA-MM-JJ
```

`banc-essai/site.js` vérifie que **chaque** question du jeu est sur le site,
une seule fois, avec sa bonne réponse et son explication : si la banque
change sans que le site soit régénéré, il le dit.

Les images ne sont pas générées par `genere.py` : `site/decor.jpg` est le
décor du jeu (SCENE_LARGE), `site/partage.jpg` l'image des aperçus de liens
(1200 × 630), `site/captures/*.webp` de vraies captures du jeu (un joueur qui a
un peu joué : profil « Élise », quelques livres maîtrisés).
