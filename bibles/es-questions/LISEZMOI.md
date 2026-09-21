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

## C'est fini : 1545 sur 1545

Les vingt-sept lots sont là, de `0000.json` à `1470.json`. `assemble_es.py`
refuse d'écrire tant qu'il en manque une seule, et il a écrit :
`questions-es.js`, 1545 entrées, 312 Ko.

Ce qui a été vérifié après coup, et pas supposé :

- `banc-essai/questions-langues.js` — 1545 entrées pour 1545 questions, et
  pour CHACUNE l'indice de la bonne réponse comparé à la banque française :
  aucun désalignement. C'est le garde-fou du repérage par position.
- Aucune trace de français : zéro accent que l'espagnol n'écrit pas (à, è, ê,
  ç, œ) dans tout le fichier, et zéro mot-outil français qui ne soit pas
  aussi espagnol. Les sept qui ressortent au comptage sont de l'espagnol :
  la ×1370, que ×386, le ×74, tu ×47, les ×6, deja ×3, sur ×1.
- `banc-essai/langues-ecrans.js` — 125 écrans en espagnol, rien qui reste
  français.

Deux libertés prises, et toujours les mêmes : quand la Reina-Valera ne dit pas
ce que dit la Segond (« piedras preciosas » là où le français a « perles »,
« la palabra de Dios » là où il a « la parole de Christ »), c'est la Bible
espagnole qui gagne — le joueur hispanophone lit la sienne. La bonne réponse
ne bouge pas pour autant : elle est repérée par sa POSITION dans les options
françaises, jamais par son texte.
