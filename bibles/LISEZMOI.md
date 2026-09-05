# Les traductions de la Bible utilisées

Aucun texte n'a été écrit ni reconstitué de mémoire. Les versets sont extraits
par script de leur source publiée — **eBible.org** au format « un verset par
ligne », **CrossWire** pour les modules SWORD.

| sigle | version | année | licence | source |
|---|---|---|---|---|
| LSG | Louis Segond | 1910 | domaine public | eBible `fraLSG` |
| SBL | Sainte Bible libre pour le monde | 2026 | domaine public | eBible `frasbl` |
| JND | Bible J. N. Darby | 1885 | domaine public | eBible `frajnd` |
| OST | La Sainte Bible, Ostervald | 1744 | domaine public | eBible `fra_fob` |
| BA | La Bible Annotée, Bonnet et Bovet | 1900 | domaine public | SWORD `FreBA` |

Cinq traductions, toutes dans le **domaine public** : aucune attribution
imposée, aucune licence à renouveler, rien qui puisse être retiré.

## Le texte par défaut était abrégé

Le recueil d'origine ne portait pas le Segond : il portait de **courtes
citations** rédigées à la main. Sur les 248 références, **28 seulement**
correspondaient au verset réel ; 176 en faisaient moins des trois quarts.
La carte annonçait « Jean 3:16 · LSG » et n'affichait que la première moitié
du verset.

    avant   Dieu a tant aimé le monde qu'il a donné son Fils unique.
    après   Car Dieu a tant aimé le monde qu'il a donné son Fils unique,
            afin que quiconque croit en lui ne périsse point, mais qu'il
            ait la vie éternelle.

Les 248 références sont maintenant le Segond 1910 **entier**, extrait de la
source comme les autres versions. C'est aussi ce qui a rendu la carte trop
petite : voir plus bas.

## Une seule typographie

`typo.py` est le passage obligé de **toutes** les versions. Les sources ne se
ressemblent pas : le Segond et l'Ostervald d'eBible collent la ponctuation
haute (« crainte? »), le Segond oublie parfois l'espace après une virgule
(« unique,afin que »), la Sainte Bible libre mélange les deux apostrophes dans
un même verset. Avant ce passage, une version sur deux jurait avec le reste
du jeu.

| | apostrophe | ponctuation collée | guillemets orphelins |
|---|---|---|---|
| avant | 3 versions sur 5 en `’` | 403 | 5 |
| après | toutes en `'` | 0 | 0 |

L'espace devant `? ! ; :` est **insécable** : la ponctuation ne part jamais
seule à la ligne.

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
2. Déclarer son chemin dans `sources.json` (le fichier n'est pas versionné :
   il pointe vers les archives décompressées, propres à chaque machine).
3. `python3 bibles/regenere.py` puis `python3 bibles/injecte.py` : le texte
   passe par `typo.py` et se dépose dans `VERSETS_ALT`. Ajouter l'entrée au
   registre `BIBLES` avec `dispo:true`.

Pour une source **SWORD** (CrossWire) plutôt qu'eBible, `sword2vpl.py` la
convertit d'abord au format « un verset par ligne ».

Une version **incomplète fonctionne** : ce qui manque retombe sur le Segond,
donc jamais de trou à l'écran.

## Les pièges rencontrés

**Les codes de livres.** Les fichiers eBible utilisent les anciens codes à trois
lettres, pas l'USFM moderne : `JOH` et non `JHN`, `MAR` et non `MRK`, `JAM`,
`PHI`, `EZE`, `JOE`, `NAH`, `SOL`, `1JO`…

**Les numérotations divergentes.** Joël 2:32 et Malachie 4:2 n'existent pas sous
ce numéro dans les traductions suivant la numérotation hébraïque : ce sont
Joël 3:5 et Malachie 3:20. Les correspondances sont dans `regenere.py` (`ALIAS`).
Sans elles, le Darby perdait deux versets.

**La carte était trop petite pour un vrai verset.** Elle était clouée en haut
ET en bas de la zone du héros, donc figée à 80 px sur iPhone SE. Mesuré avant
correction : **243 versets sur 248** débordaient par-dessus le bord doré, la
première ligne coupée et la référence tombant sur le décor. La carte part
maintenant du haut et grandit vers le bas, dans la place que le titre libère
— vers le bas et non des deux côtés, car centrée elle passait 9 px au-dessus
du haut de l'écran, sous l'encoche. Après : **0 sur 248**, sur les trois
tailles d'iPhone et dans les cinq versions.

**Ce qui a l'air d'une version nouvelle et n'en est pas une.** La Bible
Martin 1744 était le candidat évident — Textus Receptus, encore lue dans
certaines assemblées. Lecture faite, c'est le texte de l'Ostervald déjà livré :
Jean 3:16 et Psaume 23:1 y sont mot pour mot identiques (l'Ostervald de 1744
est une révision de Martin). Elle n'a pas été ajoutée : deux entrées qui disent
la même chose n'aident personne à choisir.

**Le `scrollHeight` d'une surface de verre ne mesure pas son texte.** Le moteur
de verre glisse un enfant `.gs` — une copie floutée de la scène — dans chaque
surface. Il fait la page entière. Trois mesures ont été faussées par là :
la carte semblait déborder de 906 px, toujours du même verset, y compris sur
les textes courts. **Mesurer les enfants réels, jamais la carte.**
