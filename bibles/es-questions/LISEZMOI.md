# Les 1545 questions en espagnol

Un fichier par lot de 45, numéroté par le RANG de la première question dans
BANK (facile, puis moyen, puis difficile — l'ordre du jeu, exactement).
Chaque entrée est `[énoncé, [quatre options], fait]`, **dans l'ordre des
options françaises**.

L'indice de la bonne réponse n'est PAS écrit ici : il est recalculé à
l'assemblage depuis la banque française, pour qu'il ne puisse pas diverger.
C'est `bibles/assemble_es.py` qui produit `questions-es.js`.

Pourquoi des lots et pas un seul fichier : la traduction se fait par tranches,
et un lot terminé est un lot enregistré. Rien ne se perd en route.
