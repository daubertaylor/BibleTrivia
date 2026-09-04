# Les traductions de la Bible utilisées

Aucun texte n'a été écrit ni reconstitué de mémoire. Les versets viennent tous
de **eBible.org**, au format « un verset par ligne », et les 248 références du
jeu y ont été extraites par script.

| sigle | version | année | licence | source |
|---|---|---|---|---|
| LSG | Louis Segond | 1910 | domaine public | `fraLSG` |
| JND | Bible J. N. Darby | 1885 | domaine public | `frajnd` |
| OST | La Sainte Bible, Ostervald | 1744 | domaine public | `fra_fob` |
| NCL | Sainte Bible néo-Crampon Libre | 2022 | **CC BY-SA 4.0** — © Fraternité de Tibériade | `francl` |
| NEG | Nouvelle Édition de Genève | 1979 | © Société Biblique de Genève — **non livrée** | — |

## Le néo-Crampon demande une attribution

Sa licence Creative Commons Attribution — Partage dans les mêmes conditions 4.0
**oblige** à citer la Fraternité de Tibériade partout où son texte est montré.
C'est fait : sa mention s'affiche dans les Réglages dès qu'elle est retenue.
Ne pas la retirer.

## Pourquoi la Genève 1979 n'est pas là

Elle appartient à la Société Biblique de Genève. La livrer sans licence
exposerait le jeu ; la reconstituer approximativement tromperait le lecteur sur
la Parole, sous une étiquette exacte. Elle figure donc au catalogue, éteinte,
avec sa raison affichée. Ils accordent souvent des autorisations gratuites pour
un usage non commercial : il suffit de demander.

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
