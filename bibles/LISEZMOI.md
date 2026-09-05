# Les traductions de la Bible utilisées

Aucun texte n'a été écrit ni reconstitué de mémoire. Les versets viennent tous
de **eBible.org**, au format « un verset par ligne », et les 248 références du
jeu y ont été extraites par script.

| sigle | version | année | licence | source |
|---|---|---|---|---|
| LSG | Louis Segond | 1910 | domaine public | `fraLSG` |
| JND | Bible J. N. Darby | 1885 | domaine public | `frajnd` |
| OST | La Sainte Bible, Ostervald | 1744 | domaine public | `fra_fob` |

Trois traductions protestantes, toutes dans le **domaine public** : aucune
attribution imposée, aucune licence à renouveler, rien qui puisse être retiré.

## Ce qui a été écarté, et pourquoi

**La néo-Crampon (catholique, 2022).** Techniquement disponible sous licence
Creative Commons, mais hors du public du jeu — et sa licence aurait obligé à
afficher une attribution à perpétuité. Retirée à la demande de Taylor.

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
