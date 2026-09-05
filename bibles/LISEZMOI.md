# Les traductions de la Bible utilisées

Aucun texte n'a été écrit ni reconstitué de mémoire. Les versets viennent tous
de **eBible.org**, au format « un verset par ligne », et les 248 références du
jeu y ont été extraites par script.

| sigle | version | année | licence | source |
|---|---|---|---|---|
| LSG | Louis Segond | 1910 | domaine public | `fraLSG` |
| SBL | Sainte Bible libre pour le monde | 2026 | domaine public | `frasbl` |
| JND | Bible J. N. Darby | 1885 | domaine public | `frajnd` |
| OST | La Sainte Bible, Ostervald | 1744 | domaine public | `fra_fob` |

Quatre traductions, toutes dans le **domaine public** : aucune attribution
imposée, aucune licence à renouveler, rien qui puisse être retiré.

## Pourquoi une version en français d'aujourd'hui

Les trois premières datent de 1744, 1885 et 1910. Or les versions que lisent
réellement les évangéliques francophones aujourd'hui — Segond 21, Semeur,
Nouvelle Édition de Genève — sont **toutes sous droits**, et aucune n'est
livrable. La Sainte Bible libre comble ce trou : c'est la seule traduction
française en langue contemporaine qui soit vraiment libre.

    SBL   Je peux tout par Christ qui me fortifie.
    LSG   Je puis tout par celui qui me fortifie.

    SBL   Confie-toi au SEIGNEUR de tout ton cœur, et ne t'appuie pas
          sur ta propre intelligence.
    LSG   Confie-toi en l'Éternel de tout ton cœur, Et ne t'appuie pas
          sur ta sagesse ;

eBible la présente comme un travail encore en cours. Vérifiée sur un échantillon
des 248 versets du jeu : la langue est propre et naturelle de bout en bout.

## Ce qui a été écarté, et pourquoi

**La néo-Crampon (catholique, 2022).** Techniquement disponible sous licence
Creative Commons, mais hors du public du jeu — et sa licence aurait obligé à
afficher une attribution à perpétuité. Retirée à la demande de Taylor.

**La « Bible de l'Épée ».** Écartée après lecture du texte, pas de l'étiquette :
elle rend Jean 3:16 par « Car Dieu a tant aimé CEUX QU'IL A DISPOSÉS » au lieu
de « le monde ». C'est une révision fortement marquée doctrinalement, pas une
traduction courante. La livrer aurait déformé l'Écriture pour la plupart des
joueurs. **Toujours lire le texte avant d'ajouter une version.**

**La Nouvelle Édition de Genève 1979.** Sous droits de la Société Biblique de
Genève. Une entrée « en attente de licence » a été essayée puis retirée : une
version qu'on ne peut pas choisir n'a rien à faire dans une liste de choix, elle
ne fait qu'encombrer. Si la licence est obtenue un jour, il suffira d'ajouter
l'entrée au registre — la mécanique est prête.

## Ajouter une version

1. Récupérer son texte (`https://ebible.org/Scriptures/<code>_vpl.zip`) après
   avoir **lu sa licence** sur `https://ebible.org/find/details.php?id=<code>`.
2. Extraire les 248 références avec les scripts du bac à sable
   (`extrait.py` + `livres.py`).
3. Déposer le résultat dans `VERSETS_ALT`, ajouter l'entrée au registre
   `BIBLES` avec `dispo:true`.

Une version **incomplète fonctionne** : ce qui manque retombe sur le Segond,
donc jamais de trou à l'écran.

## Deux pièges rencontrés

**Les codes de livres.** Les fichiers eBible utilisent les anciens codes à trois
lettres, pas l'USFM moderne : `JOH` et non `JHN`, `MAR` et non `MRK`, `JAM`,
`PHI`, `EZE`, `JOE`, `NAH`, `SOL`, `1JO`…

**Les numérotations divergentes.** Joël 2:32 et Malachie 4:2 n'existent pas sous
ce numéro dans les traductions suivant la numérotation hébraïque : ce sont
Joël 3:5 et Malachie 3:20. Les correspondances sont dans le script d'extraction.
