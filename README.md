# BibleTrivia

Quiz biblique — application web installable (PWA), en un seul fichier
`index.html`. Publiée par GitHub Pages sur
<https://daubertaylor.github.io/BibleTrivia/>.

Déploiement : pousser sur `claude/ios-app-polish-ui-ndgqle`, puis avancer
`main` en avance rapide. **Toujours incrémenter `CACHE` dans `sw.js`** —
sans ça, les appareils continuent de servir l'ancienne version.

Depuis la v130, l'app se met à jour toute seule : au retour d'arrière-plan,
sur l'écran d'accueil, rien d'ouvert, jamais pendant une partie.

---

## À FAIRE — demandé, pas encore commencé

### Connexion simple (type Google)

Idée de Taylor, à traiter plus tard. Aujourd'hui le profil (nom, couleur,
progression, série) vit uniquement dans le `localStorage` de l'appareil :
changer de téléphone, ou vider les données du navigateur, efface tout.

Une connexion permettrait de retrouver sa progression ailleurs. Points à
trancher le moment venu :

- **Ce qu'on synchronise** : progression, série, objectifs, profil. Pas les
  réglages d'appareil (volume, décor), qui sont propres au téléphone.
- **Rester jouable sans compte.** Le jeu doit continuer de fonctionner
  entièrement hors ligne et sans connexion — le compte est un plus, jamais
  une porte d'entrée.
- **Fusion des données** : que faire quand un joueur se connecte alors
  qu'il a déjà une progression locale ? Garder la meilleure des deux, par
  livre et par objectif — jamais écraser (règle de Taylor : *ne jamais
  remettre la progression à zéro*).
- **Où** : Supabase est déjà utilisé pour le mode en ligne et gère
  l'authentification Google — ce serait le même projet, sans service
  supplémentaire.

### Idées proposées à Taylor (en attente de sa réponse)

1. **Jouer un livre depuis la Progression.** La grille des 66 livres est
   aujourd'hui un tableau de bord : on la regarde, on n'agit pas dessus.
   Toucher « Marc » lancerait une partie tirée de ce seul livre, et sa
   barre monterait. Aucune donnée nouvelle, aucun serveur — le suivi par
   livre existe déjà.
2. **Les erreurs reviennent, espacées dans le temps.** Le jeu retient
   déjà les questions ratées (« Revoir mes 8 erreurs »), mais on ne les
   revoit qu'une fois. Les faire revenir le lendemain, puis trois jours
   après, puis une semaine : c'est ce qui transformerait le quiz en un
   jeu qui fait vraiment retenir. Se greffe sur le Défi du jour.

---

## EN ATTENTE DE TAYLOR

### Rappels de série (notifications)

Tout le code est en place et testé ; il manque uniquement les clés et la
table. Voir `notifications/LISEZMOI.md`. Tant que `VAPID_PUBLIC` est vide,
la ligne « Rappel de série » **n'apparaît pas** dans les Réglages — c'est
volontaire, aucune option morte n'est affichée.

---

## L'ACCUEIL

De haut en bas : l'icône et le nom, le verset (il suit la version de la
Bible choisie), les cinq cartes, puis **les sept derniers jours**.

La bande des sept jours (`semaineHtml`) montre le rythme du joueur : une
case par jour, allumée quand le Défi du jour a été relevé. Elle ne stocke
rien de neuf — `last` et `streak` suffisent à retrouver les jours faits,
puisqu'une série est par définition une suite de jours consécutifs. Sept
jours GLISSANTS, pas une semaine de calendrier : la série du jeu ne se
remet pas à zéro le lundi, l'affichage non plus.

C'est de l'information, pas une commande : aucune ombre de bouton, aucun
chevron. Le geste pour jouer reste la carte du Défi. La série n'est dite
qu'une fois : la pastille « flamme + nombre » de la carte du Défi
s'efface là où la bande existe, et reparaît sur les petits écrans, où la
bande n'a pas de place.

**RETOUR À LA FORME D'ORIGINE (v161).** Deux essais ont voulu lui faire
occuper toute la colonne : cases étirées à 47 px (v158, « trop gros »),
puis cases carrées mais réparties d'un bord à l'autre (v160). Taylor
préfère nettement la forme de départ — une grappe COMPACTE et centrée.
La leçon vaut d'être écrite : **le pied de l'accueil n'est pas une carte
de plus.** C'est une note en bas de page, et une note se lit resserrée ;
lui donner le poids des cartes au-dessus, c'est lui donner une
importance qu'elle n'a pas.

Un seul ajout des essais est gardé : la série dite en toutes lettres,
posée sur la MÊME ligne centrée que l'intitulé, séparée d'un point
médian. Sans elle, sept lettres et quatre cases dorées ne disent pas
d'eux-mêmes qu'on tient une série de quatre jours ; avec elle, rien ne
s'élargit.

*(Historique conservé pour mémoire :)* **Elle occupait toute la colonne
(v158).** Sept cases carrées centrées
mesuraient 275 px sous une colonne de cartes de 370 : 48 px de vide de
chaque côté, et le pied de l'écran se lisait comme une petite grappe
oubliée — le « ça fait vide » de Taylor. Les cases s'étirent maintenant
en `flex:1` sur la MÊME colonne que les cartes, **sans un pixel de
hauteur en plus** : l'accueil du 14 Pro tient à zéro près (mesuré :
+1 px sur la hauteur des cases et il déborde, `scratchpad/n1/bande.js`),
donc tout le gain devait venir de la largeur. La ligne de titre reprend
la mise en page des en-têtes de la Progression — intitulé à gauche,
chiffre à droite — et la série y est dite en toutes lettres : sans elle,
sept lettres et trois cases dorées ne disent pas d'eux-mêmes qu'on tient
une série de trois jours. Rien à droite quand la série est nulle ou
perdue (`scratchpad/n1/cas.js` couvre les quatre états).

**Deux paliers, pas un (v159).** Le palier unique à 700 px effaçait d'un
coup le verset ET la bande. C'est juste sur un SE (568 px : la bande
déborderait de 33 px), faux dès 600. Point de rupture mesuré case par
case : ~588 px (`scratchpad/n1/seuil.js`). La bande revient donc à
partir de 610 px de hauteur visible — ce qui couvre le navigateur, où
elle manquait alors qu'il restait 109 px de vide sous la dernière
carte. Le verset, lui, reste masqué sous 700 px : il tient au-dessus,
là où le logo vient de reprendre sa taille.

**Le verset (les cinq tapes sur l'icône).** La carte grandit, le texte
ne rétrécit jamais sous 0,94 rem. C'était l'inverse : la carte était
plafonnée et le corps tombait à 10,5 px sur les versets longs. Deux
tailles suffisent (16,4 et 15,4 px sur un iPhone), là où il en fallait
quatre. Le temps de l'affichage, le bloc du héros passe au-dessus des
cartes — sinon un verset long se glissait derrière la première et sa
référence disparaissait. Test : `scratchpad/verset.js` (les 992 versets
des quatre versions) et `vtop.js` (les trois plus longs).

**Le jour tourne pendant que le jeu dort.** L'accueil est calculé au
moment où on le dessine, et sur iOS une app posée sur l'écran d'accueil
est REPRISE, pas relancée : on peut rouvrir le jeu le lendemain sans
qu'une ligne de code n'ait tourné entre-temps. `verifierJour()` retient
le jour affiché et redessine quand la date a changé — au retour au
premier plan, et à minuit si le jeu est resté ouvert. Jamais en pleine
partie, jamais sous une feuille ouverte. Test : `scratchpad/jour.js`
(l'horloge avance d'un jour) et `scratchpad/garde.js` (les quatre
situations où il ne doit rien interrompre).

Le verset a été essayé en bas de l'écran (v145) : Taylor n'en a pas
voulu. Il est remonté sous le titre, sa place d'origine.

**La rangée de couleurs du Profil** a raté deux fois pour une raison
invisible dans la feuille de style : `background-clip:content-box` y
était bien écrit, mais l'attribut `style="background:…"` du bouton est
un RACCOURCI — il remet `background-clip` à `border-box`. Le
remplissage ne rognait donc rien, les six pastilles faisaient 44 px
pleins et se touchaient presque (« ça fait pavé »). Les enfermer dans
un champ crème n'a fait qu'ajouter un pavé blanc par-dessus (« encore
pire »). Depuis la v156 le bouton écrit `background-color` (une
longhand ne touche pas au clip) : disque visible, cible de 44 px,
aucune surface pour les porter, et la couleur retenue GRANDIT avec sa
coche au lieu de s'entourer de quoi que ce soit.

Réparties sur toute la largeur du champ, elles étaient **trop
espacées** (v157) : l'écart vaut `(largeur − 6 × diamètre) / 5`, donc
42 px pour des disques de 28 — une fois et demie la pastille. Le
resserrer à largeur constante demanderait des disques de 40 px,
c'est-à-dire refaire le pavage. La rangée n'occupe donc plus toute la
largeur : c'est un GROUPE compact calé à gauche sur l'étiquette et sur
le bord du champ. Rapport écart/disque mesuré sur cinq appareils :
0,48 à 0,52 (contre 1,39 à 1,50), une seule ligne partout,
`scratchpad/n1/larg.js`.

---

## LE SYSTÈME VISUEL (depuis la v141)

Trois choses tiennent tout le rendu, et rien d'autre ne doit s'y
substituer :

1. **Le rebord** (fin de la feuille de style, dernier bloc). Trois rôles
   — `--rebord-pose` (posée sur le décor : une ombre douce, rien d'autre),
   `--rebord` (plate, dans une autre surface : **rien**), `--rebord-plein`
   (pleine et colorée : une ombre de sa propre couleur). Chaque surface
   déclare son rôle dans `--mon-rebord`, une seule règle le peint. Ajouter
   une famille demain = l'écrire dans le bon rôle — et le rôle se choisit
   d'après CE QU'IL Y A DERRIÈRE, pas d'après ce qu'est la surface : un
   bouton dans une feuille claire est « plat », pas « posé ».

   **Aucune surface du jeu n'a de bord dessiné (v167).** Le filet brun a
   été allégé trois fois de suite ; à chaque fois la réponse a été « je
   trouve les bords toujours trop gros ». La mesure a fini par expliquer
   pourquoi : `banc-essai/matiere.js` + `matiere.py` comparent, sur 71
   surfaces à travers dix écrans, la luminance 6-12 px dedans à celle
   6-12 px dehors — donc SANS le filet. L'écart ne descend jamais sous
   **27,8** unités, la médiane est à **110,6**, et aucune surface n'est
   sous 12. La frontière se lisait déjà partout : le filet ne délimitait
   rien, il posait un trait sur une limite existante. Et là où l'écart
   était le plus faible (crème sur crème : versions de Bible, lignes de
   joueurs), c'est là qu'il se voyait le plus, parce qu'il creusait 4 à 5
   unités SOUS le fond — un sillon, pas un contact.

   Ce qui délimite, c'est donc la MATIÈRE, l'ombre portée de ce qui est
   posé, l'espacement et la typographie. `--filet` et `--filet-plat`
   restent déclarés en `transparent` : le `box-shadow` garde sa forme,
   rien ne se déplace, et le rôle reste lisible dans la feuille.

   **Il ne reste plus AUCUN trait dessiné (v178).** Il en restait un,
   `--separateur`, entre les chiffres du bilan solo — gardé parce que
   « trois colonnes du même crème, rien d'autre ne peut les séparer ». Le
   bilan est passé à DEUX chiffres et la phrase a cessé d'être vraie sans
   que personne ne relise le commentaire. Mesuré sur le pire cas (iPhone
   SE, « 118/120 » et une série à 100, donc les contenus les plus larges
   possible) : **72 px d'espace libre** entre les deux colonnes, 4,5 rem,
   sur une carte où rien d'autre n'est dessiné. L'espacement faisait déjà
   tout le travail. La déclaration reste, en `transparent` : la géométrie
   ne bouge pas d'un pixel.

   La leçon vaut au-delà du trait : **une justification écrite en
   commentaire ne se vérifie pas toute seule.** Celle-ci parlait de trois
   colonnes devant deux, depuis des mois.
2. **Le rythme vertical** : `--e-1` à `--e-4` (0,4 / 0,62 / 1 / 1,5 rem,
   rapport constant d'environ 1,55). `--e-3` est le pas courant. Les
   micro-espacements internes d'un composant n'en font pas partie.
3. **`--hu`**, la hauteur *utile* : 1 % de ce qui reste une fois les
   zones système retirées, mesuré en JS (`mesurerHauteurUtile`). Tout ce
   qui doit céder quand la place manque s'y accroche, avec la taille
   actuelle comme plafond.

**La barre de progression ne se remplissait qu'aux trois quarts (v183).** Un
balayage de tout le jeu à la recherche du défaut de la v182 — enfant absolu
calé sur 0 dans un parent bordé — n'a trouvé qu'UN autre cas, et c'est celui
qu'on voit à chaque partie : `.progress-fill` dans `.progress-track`. Sur une
piste de 8 px, le remplissage n'en couvrait que **6**, avec un anneau pâle
tout autour du corail.

Ici l'enfant ne peut pas déborder — `overflow:hidden` découpe justement à la
boîte de padding. C'est donc la **bordure** qui part : elle ne servait qu'à la
géométrie, or la piste n'a aucun contenu, aucun padding et une hauteur fixe.
Boîte extérieure inchangée, remplissage à **100 %**.

**Deux typographies dans le même écran (v183).** L'interface écrivait ses
espaces insécables à la main — 160 occurrences — pendant que les **1545
questions**, leurs réponses et leurs anecdotes portaient toutes une espace
ordinaire devant `?`, `!` et `»`. On corrige au RENDU : `escapeHtml` est le
passage obligé de tout texte affiché, donc une seule fonction (`typoFr`)
suffit, et le contenu écrit demain en hérite. Les espaces sont converties, pas
ajoutées : « Jean 3:16 » ne bouge pas, et les citations Segond 1910 (« ne lui
dites pas: Salut! ») restent au texte exact.

**Et une leçon de mesure, payée sur place.** La première version du relevé
annonçait **78 ponctuations orphelines** — un « ? » seul en début de ligne — et
je m'apprêtais à en faire la justification du correctif. Elle remplaçait le
contenu de la CARTE au lieu de celui de son bloc de texte : la mise en page se
refaisait dans un conteneur flex centré plus large, avec d'autres points de
coupure. Mesuré au bon endroit, sur les énoncés, les anecdotes et les options,
à quatorze largeurs de 250 à 380 px : **zéro, avant comme après**.

Le correctif reste — c'est une incohérence réelle — mais **il ne corrige pas
ce que je croyais**. Le détecteur, lui, a été éprouvé sur un cas fabriqué
exprès (il voit bien une dernière ligne de 9,3 px) avant d'accepter ses zéros :
*un test qui ne trouve rien doit d'abord prouver qu'il sait trouver.*

**Un enfant absolu s'arrête au PADDING, pas au bord (v182).** « L'aura de
couleur s'applique, mais elle ne prend pas tous les bords. » L'onde d'appui
est un pseudo-élément en position absolue avec `inset:0` — or un enfant
absolu se cale sur la boîte de **padding**. Toutes les surfaces du jeu portant
`border:1px solid transparent`, l'onde s'arrêtait un pixel avant le bord, tout
autour : il restait un anneau à la couleur du bouton. C'est le même trou d'un
pixel que celui des feuilles, à l'envers.

| famille | anneau avant | après |
|---|---|---|
| `.chip`, `.add-team`, `.set-go` | 1,00 px | **0** |
| `.icon-btn` | 1,33 px | **0** |
| `.mode-card`, `.daily-card`, `.parcours-card`, `.btn-primary`, `.option-btn`, `.tst-head`, `.share-btn` | 0,67 px | **0** |

L'onde déborde donc de l'épaisseur de la bordure (`--onde-debord`, 1px par
défaut) : sa boîte devient exactement la boîte de bordure, et comme
`border-radius:inherit` reprend le rayon de cette même boîte, **les coins
coïncident au pixel près** — ce qui n'était pas le cas avant. Les six familles
sans bordure (`.switch`, `.color-dot`, `.ach`, `.team-remove`…) remettent la
variable à zéro, sinon l'onde déborderait autour d'elles : le défaut inverse,
que le même test relève.

**Mesurer un appui exige de figer l'enfoncement — sans le supprimer.**
`banc-essai/bords.js` compare l'image pressée à l'image au repos ; mais le
bouton s'enfonce aussi, et tout bouge. Le neutraliser avec `transform:none`
serait pire : **c'est ce transform qui crée le contexte d'empilement** grâce
auquel l'onde (`z-index:-1`) passe devant le fond du bouton — sans lui, elle
disparaît et le test mesurerait un bouton éteint. `translateZ(0) scale(1)`
garde le contexte et fige la géométrie. Deux autres pièges relevés au passage :
un bouton qui porte une **ombre portée** voit sa silhouette changer avec
l'onde, donc le relevé « halo » n'a pas de sens pour lui et le test le dit ; et
relâcher le doigt sur le voile d'une feuille produit un clic qui **referme la
feuille**, ce qui faisait disparaître les cibles suivantes.

**Effacer un délai d'animation la RELANCE (v181).** Le salon s'ouvre
maintenant avant que la présence Supabase ne réponde ; quand elle arrive, un
rendu sur place le rafraîchit, et ce rendu reprend l'animation d'entrée là où
elle en était grâce à un `animation-delay` négatif (v170). Le nettoyage qui
suivait remettait ce délai à zéro — **alors que la classe `screen-enter`
était encore posée**. Changer le délai d'une animation en cours la fait
repartir de son premier instant : l'écran, posé depuis 40 ms, sautait de 18 px
et refaisait toute son entrée, cartes en cascade comprises.

Mesuré image par image à 400 ms de latence :

| | avant | après |
|---|---|---|
| saut vers le bas après la pose | 134,4 px à 600 ms | **0,1 px** |
| dernière image qui bouge | 833 ms | **452 ms** |

La classe est donc retirée **dans le même souffle** que le délai : sans elle
il n'y a plus d'animation, et le délai qu'on efface ne peut plus rien
relancer. L'état final de `screenIn` étant l'état naturel de l'élément, rien
ne bouge à cet instant.

Le défaut ne touchait pas que le salon : **tout rendu sur place pendant
l'entrée d'un écran** le déclenchait. Et il ne se produisait que dans une
fenêtre étroite (~300 à 500 ms d'attente), d'où un défaut « très rapide » et
intermittent, impossible à attraper à l'œil. `banc-essai/ouverture.js` suit
désormais la position image par image après la première et échoue sur la
version d'avant.

**Un fondu, ça a une FORME (v180).** Le voile qui dissout le bas de la liste
des erreurs était une rampe droite. Une droite a deux coudes — là où la pente
démarre et là où elle s'arrête — et l'œil les voit : deux lignes fantômes en
travers du texte, et entre elles une bande où chaque ligne se lit à moitié, ce
qui donne du texte **à demi effacé** plutôt que du texte qui **s'éloigne**. La
rampe suit maintenant un smoothstep en six paliers (pente nulle aux deux bouts,
maximale au milieu), et elle est plus longue : 34 px couvraient 1,7 ligne de
texte, 46 en couvrent 2,3.

| | avant | après |
|---|---|---|
| coude maximal de la rampe (normalisé) | 0,00504 | **0,00150** |
| netteté de la coupe au bord | 5,6 | **2,4** |
| pose du cran après un lancer | 34 px **dans** le fondu | **0 px** sous le fondu |

Le dernier point est un défaut que l'allongement du fondu a CRÉÉ : le cran de
défilement aligne le haut d'une carte sur le haut de la zone défilante — c'est
-à-dire dans le fondu. On atterrissait donc sur une carte à moitié effacée.
`scroll-padding-top` décale la ligne de pose de la hauteur du voile.

**Une variable qui en contient une autre se résout là où elle est DÉCLARÉE
(v180).** Pour n'écrire le dessin du fondu qu'une fois, il avait été posé sur
`:root` sous forme de `--voile-vertical`, avec des `var(--voile-h)` dedans.
Résultat : **plus de fondu du tout** — pas « un peu moins bien », plus rien.
Une propriété personnalisée contenant un `var()` est substituée au moment où
ELLE est calculée, sur l'élément où elle est déclarée ; sur `:root`,
`--voile-h` n'existe pas, toute la valeur devenait invalide, et les surfaces
n'héritaient que de ce vide. Le dessin vit donc sur la surface elle-même, à
côté des longueurs qu'il consomme — recopié deux fois (vertical, horizontal)
plutôt que partagé.

**Et c'est la mesure qui l'a vu.** À l'œil, sur une capture, un fondu absent
sur une carte crème posée sur une feuille crème ne saute pas aux yeux. Le banc,
lui, pose un bloc noir uni dans la liste et lit le profil de luminance à
travers le bord : amplitude 0. `banc-essai/englouti.js` relève désormais cette
amplitude ET la courbure, donc ni la disparition ni le retour à une droite ne
peuvent passer.

**Un vide « ce qui reste » n'est pas une mesure (v179).** « Sur certain
appareil ça s'affiche pas comme sur le mien au niveau des 7 jours. » L'écart
entre la dernière carte de l'accueil et la bande des sept jours n'était pas
décidé : c'était la hauteur restante. Tous les objets de l'accueil ont un
plafond — le logo, les cartes, le pied — si bien qu'au-delà de ~860 px plus
rien ne grandit et **toute** la hauteur en trop tombait dans ce seul vide :

| écran | écart carte → bande | en % de la hauteur utile |
|---|---|---|
| iPhone 15 en navigateur (643) | 58 px | 9,2 % |
| iPhone 15 (852) | 119 px | 14,2 % |
| Pixel 8 (915) | 156 px | 17,3 % |
| Android très haut (1000) | 213 px | **21,6 %** |

L'espaceur reçoit donc un plafond proportionnel, calé sur sa valeur actuelle
sur iPhone 15. Le vide qui reste ne va ni en haut du bloc (un trou au milieu
de l'écran, déjà refusé une fois) ni sous la bande seulement : `justify-content:
safe center` le partage à parts égales au-dessus de l'en-tête et sous le pied.
C'est une **marge de page**, pas un trou.

Après : 14,2 % partout à partir de 852, et **l'appareil de référence ne bouge
pas d'un pixel** (vérifié élément par élément : déplacement maximum 0 px sur
iPhone 15 ; sur l'écran de 1000, le bloc descend de 37 px, soit la moitié du
vide récupéré). `banc-essai/pied.js` balaie dix appareils et échoue sur la
version d'avant.

**La bonne unité n'est pas toujours le pixel.** La première version du test
exigeait un écart en pixels dans une fourchette étroite — infaisable, puisqu'un
écran court comprime légitimement tout. Ce qui n'est pas légitime, c'est que
l'écart GRANDISSE quand plus rien d'autre ne grandit. Mesuré en fraction de la
hauteur utile, le défaut se lit d'un coup, et le seuil devient évident.

**Un seul PLI pour tout le jeu (v178).** Un pli, c'est ce qui s'ouvre, se
ferme ou se remplit SUR PLACE en poussant le reste : un testament qui se
déplie, une ligne de joueur qui naît, une barre qui avance, l'anneau des
résultats, un compteur qui monte. L'œil SUIT ces mouvements-là — contrairement
à un écran qui arrive (`--tr-ouvre`) ou à un voile qui s'efface
(`--tr-ferme`). Ils tournaient sur **sept horloges** :

| | avant | après |
|---|---|---|
| pli d'un testament | 0,52s `(0.33,1,0.68,1)` | `--tr-plie` |
| son chevron | 0,26s `(0.3,1,0.4,1)` | `--tr-plie` |
| ligne de joueur | 0,34s `(0.25,0.4,0.25,1)` | `--tr-plie` |
| barre de progression | 0,55s `(0.16,1,0.3,1)` | `--tr-plie` |
| anneau des résultats | 1s `(0.32,0.72,0,1)` | `--tr-plie` |
| feuille qui recule | 0,34s `(0.32,0.72,0,1)` | `--tr-plie` |
| compteurs (points, %, duel) | 0,6 / 0,9 / 1s | `msPli()` |

Aucune raison à cet éparpillement, juste l'ordre dans lequel les lignes ont
été écrites. Deux conséquences visibles : le chevron d'un testament arrivait
quand son panneau en était à la moitié de sa course, et sur l'écran des
résultats l'anneau, le pourcentage et les points finissaient à trois instants
différents.

La valeur est désormais **LUE dans la feuille de style** (`tempoPli()` lit
`--tr-plie`, `msPli()` en tire les millisecondes) au lieu d'être recopiée en
JS : deux copies d'un même nombre finissent toujours par diverger, c'est
exactement ce qui s'était passé. Et la courbe n'a pas eu à changer —
`cubic-bezier(0.33,1,0.68,1)` **EST** easeOutCubic, celle des compteurs JS
depuis toujours. Seules les horloges étaient à recaler.

Effet mesuré sur la ligne de joueur : saut maximum 6,4 → **5,1 px/image**, et
80 % du chemin fait à 173 ms → **240 ms**, c'est-à-dire en même temps que le
pli d'un testament (242 ms). `banc-essai/plis.js` relève les sept horloges et
échoue sur la version d'avant.

**Un écran ne doit pas s'ouvrir à la vitesse du réseau (v178).** « Créer une
partie » n'affichait le salon qu'une fois le canal Supabase abonné. Mesuré en
fixant la latence (`banc-essai/ouverture.js`) :

| latence | salon à l'écran |
|---|---|
| 0 ms | 27 ms |
| 150 ms | 176 ms |
| 600 ms | 635 ms |
| 1500 ms | 1533 ms |

Un rapport de 1 pour 1 : le bouton répondait à la vitesse du wifi, et la
première partie d'une session payait en plus la poignée de main du socket —
d'où « des fois plus lent que d'autres ». Rien n'obligeait à attendre : le
code est tiré localement, l'hôte est connu, la liste est vide. Le salon se
peint donc tout de suite et l'abonnement se règle derrière lui. **Écart entre
la latence la plus forte et la plus faible : 1506 ms → 15 ms.**

**Le mot de la fin doit savoir à qui il parle (v178).** « Beau début ! Chaque
partie t'apprend un peu plus. » s'affichait à un joueur à sa 85e partie avec
100 % de record, parce que le message ne lisait QUE le score du jour — et il
le lisait à chaque partie basse, c'est-à-dire souvent. Il lit maintenant aussi
l'historique (nombre de parties, meilleur pourcentage) et il TOURNE : trois
formulations par palier, choisies sur le numéro de la partie, donc
déterministes (un re-rendu ne change rien, et le jeu reste identique pour tout
le monde). `banc-essai/motfin.js` balaie cinq profils de joueur × huit scores
et refuse toute phrase de débutant chez quelqu'un qui a de la bouteille.

**Une liste qui défile doit dire où elle s'arrête (v177).** « Revoir mes
erreurs » donnait la sensation d'être *englouti*. Trois causes, toutes
mesurables, et aucune n'était le contenu :

| | avant | après |
|---|---|---|
| feuille visible sous la liste | 10 px | 22 px |
| écart de luminance sur la ligne du bord bas | 33,0 | 5,6 |
| distance au haut d'une carte après un lancer | 57 px | 0 px |

La liste s'arrêtait à dix pixels du bord de l'écran — sous l'indicateur
d'accueil de l'iPhone — et y tranchait une carte en plein milieu d'une
phrase, avec 588 px encore à lire, soit plus d'un écran entier, et rien
pour le dire. Le contenu n'était pas coupé PAR une liste, il tombait DU
bord. Trois gestes, ensemble : un repos sous la liste, un voile en fondu
haut et bas qui ne s'ouvre que du côté où il reste quelque chose (même
idiome que la barre des scores à plusieurs, en vertical), et un cran de
défilement par carte. Le compte du titre devient un rang — « 3 / 7 » — et
atteint « 7 / 7 » pile quand la dernière carte se lit en entier.

**La mesure qui compte n'est pas celle qu'on croit** : la première version
du test relevait le plus fort saut de luminance dans les 40 px du bas, et
accusait un fond de carte parfaitement normal (une carte finit, la suivante
commence). Ce qui fait « englouti » se lit sur **la ligne du bord**, et
nulle part ailleurs : le dedans juste avant, le dehors juste après.
`banc-essai/englouti.js` échoue sur la version d'avant.

**Une porte à deux secondes vaut mieux qu'un délai d'attente de vingt
(v177).** Un `const` déclaré deux fois dans la même portée a mis tout le
jeu à terre — page blanche. Les essais du banc l'ont bien vu, mais sous la
forme d'un `waitForFunction` qui expire : le symptôme d'un serveur mort.
`banc-essai/syntaxe.js` fait simplement analyser le bloc `<script>` par
node et nomme la ligne. À lancer en premier, toujours.

**Un test incomplet est pire qu'aucun test (v174).** La déchirure de
rotation a survécu à un correctif ET à un test qui passait au vert. La
raison : le test ne mesurait que la **largeur** de la colonne. Elle était
bien figée — et tout le reste bougeait. Mesuré en comparant la boîte
**complète** :

| | debout | couché (requêtes média en retard) |
|---|---|---|
| `#app` | `[0, 0, 393, 852]` | `[229,5, 0, 393, 393]` |

La colonne se **recentre de 229,5 px** (`margin:0 auto` dans une fenêtre
devenue large) et sa **hauteur s'effondre** (`100lvh` suit l'écran). Une fois
ces deux-là figés, il restait **14 px** de glissement vertical : les unités
`vw` et `svh`, jusque dans la taille du **rem**, qui commande toute l'échelle
du jeu.

Trois choses sont donc épinglées en pixels, mesurées debout et jamais relues
couché : la **largeur**, la **hauteur**, la **marge**. Et deux unités de mise
en page gelées, `--lw` et `--lh`, remplacent partout `vw` et `svh` — plus rien
dans la feuille de style ne dépend de l'orientation. La classe `tel-fige` est
posée par le JS, jamais par une requête média : elle ne peut donc pas être en
retard. **Résultat : 0 px de déplacement**, contre 459 avant.

`banc-essai/rotation.js` compare désormais la boîte complète de sept éléments.
Il échoue sur la version d'avant (459 px) et passe sur celle-ci (0).
**La leçon : un test qui ne mesure qu'une dimension donne un feu vert faux, et
un feu vert faux coûte plus cher que pas de test du tout.**

**La mise en page ne doit pas dépendre de l'orientation (v172).** C'est la
cause de la « déchirure » à la rotation : des cartes dont le fond s'arrête
avant leur propre texte. Ce n'était pas un défaut de peinture. La largeur de
la colonne dépendait de l'orientation **deux fois** — `#app` est borné à
430 px (debout sur un écran de 393 il fait 393, couché il atteint 430), et
au-delà de 620 px de large un palier « grand écran » le pousse à 31 rem.
Couché, les deux se déclenchent : **393 → 509 px**, les cartes 370 → 486, et
les couches de verre restent à 393. Mesuré : **25,3 px de carte au-delà de
son verre**.

Une règle `(orientation:landscape)` gelait tout cela — mais iOS ne bascule pas
la géométrie et les requêtes média dans la même passe, et il reste quelques
images où l'écran est déjà couché et où la règle n'a pas encore pris. La
largeur est donc **épinglée en pixels**, mesurée debout et jamais relue
couché : plus aucune requête média n'entre dans le calcul. Le voile
« tourne ton téléphone » se lève lui aussi sur la GÉOMÉTRIE (classe `couche`),
sans attendre la requête média.

`banc-essai/rotation.js` reproduit précisément cette fenêtre : il neutralise
toutes les règles dont la condition parle d'orientation, bascule la géométrie
et vérifie que rien ne bouge. **Un navigateur de test bascule tout d'un coup et
ne montrerait jamais le défaut** — il faut simuler le retard. Le test échoue
sur la version d'avant (colonne 509, 6 images sans voile) et passe sur celle-ci.

**Un rendu sur place ne doit pas couper une entrée d'écran (v170).**
« Créer une partie » ouvrait le salon autrement que le reste du jeu : l'écran
commençait à monter, la présence Supabase répondait vers 140 ms,
`reRenderIfOnline()` refaisait un rendu complet, et le nœud en train d'animer
était REMPLACÉ par un nœud neuf sans animation. Mesuré image par image : une
entrée normale descend 874 → 726 → 374 → 175 → 78 → 33 → 3 → 0 ; celle du
salon faisait 874 → 874 → 473 → **0**.
Le nouveau nœud reprend désormais l'animation là où l'ancien en était
(`animation-delay` négatif), et l'écoulement est lu sur `getAnimations()` et
non sur une horloge : un écran lourd met parfois 50 ms à peindre sa première
image, et l'horloge le croirait en retard. N'importe quel rendu sur place
devient inoffensif pendant les cinq premiers dixièmes d'un écran.

**Une surface de VERRE ne doit jamais être le conteneur qui défile (v170).**
Le bandeau des scores à plusieurs portait `overflow-x:auto`. Or il porte aussi
un enfant `.gs` — une copie floue du décor, large de tout l'écran — et cette
copie entre dans la zone défilable. À trois joueurs, qui tiennent largement :
`scrollWidth` 470 pour `clientWidth` 377, soit **93 px de défilement fantôme**.
D'où deux défauts d'un coup : le dégradé de fin s'affichait toujours (le bord
droit se dissolvait dans le vide) et un glissement du doigt faisait défiler le
VERRE sous le contenu. Le défilement est descendu d'un cran, sur une piste
intérieure. **Règle : le défilement va sur un enfant, jamais sur la surface.**

**Une taille fixe posée sur un objet de taille variable finit par le manger
(v170).** Le badge « Créateur » était figé à 1,2 rem pendant que les avatars
vont de 1,55 rem (classement) à 4,2 rem (profil) : 77 % du plus petit, 29 % du
plus grand — il couvrait entièrement le visage dans les lignes de classement.
Il se mesure maintenant en fraction de l'avatar (`--av`), bornée aux deux
bouts. Écart ramené de 48,8 à 15,2 points.

**Le son doit revenir, quoi qu'il se soit passé avant (v170).** Deux trous.
`reviveAudioHard()` appelait `close()` puis créait le contexte suivant sans
attendre la promesse : iOS n'en autorise qu'un petit nombre à la fois, et au
bout de quelques interruptions la création échouait — le son ne revenait plus
JAMAIS. Et un seul essai au retour au premier plan ne suffit pas : quand une
autre app tenait la sortie audio, iOS rend la main avec du retard et refuse
`resume()`. On attend donc la fermeture avant de reconstruire, et on insiste :
six tentatives sur trois secondes, qui s'arrêtent dès que le son est reparti.

**Comment remplacer une bordure de couleur (v169).** Quatre en portaient
encore une, chacune pour dire « celle-ci compte ». Aucune n'avait besoin
d'un trait, et chacune s'est réglée par le même raisonnement — *qu'est-ce
qui, dans la MATIÈRE, dit déjà la même chose ?* :

| ce qui portait le trait | ce qui le remplace |
|---|---|
| bonne / mauvaise réponse | leur remplissage vert ou rouge, plus une ombre de leur propre couleur |
| vainqueur d'un duel | une matière OR — le liseré d'avant se voyait à peine, la teinte se lit tout de suite |
| champ de saisie actif | un halo FLOU (+30 unités de rouge sous le champ) — une lueur n'a pas d'arête |
| vignette de fond retenue | sa coche dorée, qui était déjà là : le liseré répétait l'information |

La règle qui en sort : une couleur qui doit désigner quelque chose se pose
en REMPLISSAGE ou en OMBRE, jamais en contour. Les deux se voient mieux
qu'un pixel de bord, et aucune ne dessine de ligne.

**Le « bord blanc » peut être un TROU, pas de la peinture (v160).** Toutes
les surfaces portent `border:1px solid transparent` — un reste utile,
puisque `box-sizing` est en `border-box` et que cette bordure garde la
géométrie exacte. Mais la couche de flou `.gs` est découpée par
`overflow:clip`, et `overflow` découpe sur la boîte de PADDING : le
cheveu d'un pixel de la bordure n'est peint par personne. Sur une carte
crème, un bouton corail laissait donc voir la carte tout autour de lui —
mesuré sur la capture de Taylor : L=208 juste au-dessus du bouton contre
201 pour la carte, et un liseré complet en bas et sur les côtés.

Correctif : rendre la teinte à la surface elle-même. Un
`background-color` est peint SOUS la bordure (`background-clip` vaut
`border-box` par défaut), donc il bouche exactement l'anneau.

Deux garde-fous appris en le faisant :

- **Seulement les teintes OPAQUES.** Sur une teinte translucide, le
  décor qui passe par l'anneau a déjà, à l'œil, la couleur du flou
  teinté (mesuré : 208,8 dans l'anneau contre 210,8 dedans). Lui donner
  la teinte à plat le rend au contraire VISIBLE (233,7). Le premier jet,
  appliqué à toutes les surfaces, a créé un liseré sur `.icon-btn` — le
  détecteur de traits clairs l'a attrapé tout de suite.
- **La liste se mesure, elle ne se devine pas.**
  `scratchpad/n1/fonds.js` balaie dix vues et sort les surfaces ayant À
  LA FOIS une teinte opaque et un fond vide : il y en a exactement
  trois, toutes des boutons de modale. Partout ailleurs la surface pose
  déjà son fond.

`overflow-clip-margin:border-box` a aussi été essayé : la découpe
s'étend bien jusqu'à la bordure, mais elle découvre du même coup l'ombre
portée du `.glass-rim`, jusque-là rognée — l'anneau devient un trait
SOMBRE (236 au lieu de 248). Rejeté.

Sonde dédiée : `scratchpad/n1/pleins.js` + `pleins.py` (pic clair sur les
quatre arêtes des boutons pleins, médiane de neuf sondes par arête).
`modal-btn.ok` : 5,8 -> 0,0.

**LE CHEVEU TRANSPARENT DU BORD (v163).** Chaque surface porte
`border:1px solid transparent` — `box-sizing` est en `border-box`, c'est
ce qui garde la géométrie exacte. Mais la couche `.gs` est découpée par
`overflow:clip`, et `overflow` découpe sur la boîte de **padding** : ce
cheveu d'un pixel n'était peint par personne, et on voyait à travers,
jusqu'au vrai décor. Sur une feuille de réglages posée sur un fond
assombri, l'écart est énorme — intérieur mesuré à **L=215**, anneau à
**L=37**. C'est le « bord transparent » que Taylor voyait dans les
Réglages.

`overflow-clip-margin:1px` étend la découpe d'exactement l'épaisseur de
la bordure. Le rayon suit (la boîte de padding gonflée d'1 px retrouve
le rayon de la boîte de bordure), et `.gs`, bien plus grande que la
surface, peint enfin l'anneau avec la MÊME matière que l'intérieur :
l'anneau passe de 37 à 215, il disparaît.

Une précaution : `.glass-rim` porte une ombre portée (`--rim-cast`) qui
était jusque-là **entièrement rognée** par la découpe. L'élargir la
ferait apparaître dans l'anneau, en trait sombre (mesuré 236 au lieu de
248 sur un bouton de réponse). On la retire donc en voie XF — l'ombre
visible des surfaces vient de `--mon-rebord`, portée par la surface
elle-même, hors découpe.

C'est le troisième et dernier visage du même bug : d'abord vu en clair
sur les boutons de modale (v160, bouché au `background-color`), puis en
sombre sur les feuilles. La cause était identique.
*(`overflow-clip-margin` demande Safari 16+ ; plus ancien, la
déclaration est ignorée et on retrouve le comportement d'avant — aucune
régression possible.)*

**LA LÈVRE BLANCHE EST SUPPRIMÉE (v160).** `--levre` posait un trait blanc
d'un pixel sur l'arête haute de CHAQUE surface. Mesuré sur la capture de
Taylor : 13 unités de luminance au-dessus de l'intérieur de la carte ;
mesuré en interne : +6,5 sur les cartes de mode, +18,2 sur le Défi du
jour, +21,2 sur Progression. C'est ce qu'il a montré du doigt quatre
fois de suite. `--levre` et `--levre-pleine` valent maintenant
`transparent` — après, le pic tombe à +0,7 / +1,1 / +0,0
(`scratchpad/n1/levre.js` + `levre2.py`, qui cherche la marche du bord
puis compare la lèvre à l'INTÉRIEUR de la surface, pas au décor).

La pastille d'objectif VERROUILLÉE a perdu la sienne aussi : désaturée à
14 % et posée à 62 % d'opacité, son reflet ne restait qu'un trait blanc
sur du gris (9,9 — le plus voyant du jeu une fois les surfaces
traitées). Les pastilles COLORÉES gardent le leur : là, c'est de la
lumière de matière, pas un contour.

Résultat : **aucun trait clair au-dessus de 4 nulle part dans le jeu**,
pour la première fois.

**Aucun rebord coloré, nulle part. Aucun contour blanc non plus.**
Règles absolues posées par Taylor. Un état se dit par un fond, une
encre, une coche — jamais par un trait, de quelque couleur qu'il soit.

**Le quatrième test, celui de l'UNIFORMITÉ** (`banc-essai/anneau.js` +
`anneau2.py`) : il mesure, sur toutes les surfaces de douze vues, le
PREMIER pixel CSS du bord comparé à l'intérieur de la surface 3 à 6 px
plus loin — exactement la bande que `overflow:clip` laissait sans
peinture. Il ne juge que des surfaces plates et bien visibles : un
cercle n'a pas d'arête droite au milieu de ses côtés, et une carte
repliée à opacité nulle n'est pas à l'écran.

Bilan mesuré, 59 surfaces sur 12 vues :

| | anneau ≥ 12 | pire écart |
|---|---|---|
| sans `overflow-clip-margin` | **30 sur 59** | 192 |
| avec (v163) | **0** | 6,2 |

*(Deux surfaces ressortent encore dans le listing — une carte de
l'accueil à moitié cachée sous une feuille ouverte : ce qui est mesuré
est le bord de la FEUILLE qui la traverse, pas un anneau. Preuve : la
valeur est identique avec et sans le correctif.)*

Trois tests, trois angles, parce qu'un rebord peut échapper à deux
d'entre eux :

- `banc-essai/couleurs.js` — les rebords **saturés** (or, corail, vert).
  Doit rapporter 0. **Il a déjà menti** : sa première version ne visitait
  que des écrans AU REPOS, et les quatre dernières bordures colorées du
  jeu vivaient toutes dans un ÉTAT — la bonne réponse révélée (vert), la
  mauvaise (rouge), le vainqueur d'un duel en ligne (or), le champ de
  saisie actif (corail). Il annonçait « 0 » pendant que quatre liserés
  vivaient dans le jeu. Il visite désormais les états, et la vignette de
  fond retenue en injectant un second décor (`SCENES` n'en a qu'un, donc
  la rangée ne s'affiche pas et ce liseré-là était intestable).
  **Un écran au repos n'est pas un écran.**
- `scratchpad/arete.js` + `arete2.py` — les traits **sombres**, bords
  gauche et droite. Repère : au-dessus de ~10, l'œil lit une ligne.
  Depuis la v167 il n'y a plus de filet du tout : ce qui reste au bord
  d'une carte posée est son ombre, pas un trait.
- `banc-essai/matiere.js` + `matiere.py` — le test qui a permis de le
  retirer : l'écart de luminance que la MATIÈRE seule produit, de part
  et d'autre de chaque arête. Sous 12, une surface ne tiendrait plus
  sans aide. Relevé actuel : minimum 27,8 sur 71 surfaces.
- `scratchpad/blanc.js` + `blanc.py` — les traits **clairs**, sur les
  QUATRE arêtes (un contour blanc, ici, c'est souvent une lèvre
  `inset 0 1px 0` : le bord du haut, que les deux autres tests ne
  regardent pas).

Les trois prennent la médiane sur plusieurs points par arête : sinon la
texture de la photo produit de faux positifs. Le test des traits clairs
écarte en plus les sondes qui traversent du texte.

---

## L'ÉCRAN NE DOIT PAS GLISSER POUR VINGT PIXELS (v156)

`fitScroll()` ouvre le défilement dès que le contenu dépasse de plus de
2 px. Sur un écran qui a l'air complet, un débord de vingt pixels donne
donc un glissement d'un centimètre puis un arrêt sec : Taylor l'a lu
comme « un petit décalage » sur la Progression, et c'en est un.

**Le piège de mesure** : sans marges de sécurité (encoche, barre
d'accueil), un iPhone 14 Pro fait 852 px et tout tient. Posé sur
l'écran d'accueil, il n'en reste que 747 — et la Progression dépassait
de 29 px, l'accueil de 12 (la bande des sept jours était coupée). Toute
mesure de tenue à l'écran DOIT simuler ces marges :
`scratchpad/n1/hauteur2.js` le fait pour huit appareils (le padding de
`#app` est forcé à `max(safe + 0,4rem, 0,7rem)`, comme
`html.is-standalone`).

Le test de tenue ne peut pas lire `scrollHeight - clientHeight` quand
ça tient : `.flex-sp` absorbe le reste et les deux s'égalisent. Il faut
comparer le BAS DU DERNIER BLOC réel au bas de la zone utile — c'est ce
que fait `hauteur2.js`, et c'est ce qui donne la marge réelle.

État après v156, marge sous le dernier bloc de la Progression : 16 px
(14 Pro), 22 (13), 30 (15 Pro), 63 (Pro Max), 21 (Android), 3 (iPhone 8).
Le SE déborde de 83 px : là le défilement est vrai, et personne ne le
confond avec un décalage.

---

## L'ICÔNE DU JEU (v162)

Une seule image sert **partout** : le héros de l'accueil, l'écran de
chargement (même constante `DOVE_ICON`), la favicon, l'icône de l'écran
d'accueil (`apple-touch-icon.png`) et celles du manifeste
(`icon-192.png`, `icon-512.png`). Changer l'icône, c'est donc changer
ces cinq endroits d'un coup, sinon la cohérence casse.

**La règle de forme : un CARRÉ PLEIN, peint jusqu'aux quatre coins.**
L'arrondi ne vient jamais du fichier — il vient du CSS
(`border-radius:23%` sur `.hero-icon` / `.splash-dove`) et du système
d'exploitation sur l'écran d'accueil. Une image dont les coins sont
déjà arrondis produirait soit un liseré blanc, soit un croissant de
décor visible dans l'angle, selon que le rayon cuit est plus petit ou
plus grand que celui appliqué par-dessus.

L'image fournie par Taylor était un rendu d'icône : coins arrondis
cuits (une squircle, pas un arc de cercle — mesuré, l'insertion vaut
259 px en haut et s'annule à 280 px, là où un cercle donnerait 176 à
mi-hauteur), marge blanche et ombre portée autour. La procédure, dans
`scratchpad/n1/icone.py` :

1. cadrage exact sur le logo (bornes trouvées par balayage : le noir du
   relief descend jusqu'à la dernière ligne de l'arc, ce qui donne le
   bas réel) ;
2. le fond est ce qui est **neutre et pas noir**, et **relié à un coin**
   de la découpe — un remplissage par diffusion depuis les quatre coins,
   qui n'atteint donc jamais les étoiles blanches de l'intérieur ;
3. élargissement de 3 px pour emporter la frange anti-crénelée, qui
   n'est ni tout à fait blanche ni tout à fait logo ;
4. les coins sont **rebouchés par propagation en largeur** depuis la
   frontière du logo : le ciel prolonge le ciel, le relief prolonge le
   relief. Zéro pixel gris neutre restant (vérifié).

---

## LE LOGO DE L'ACCUEIL (v156)

Il valait 19,4 % de la largeur sur un iPhone 8 et 28,5 % sur un 13 —
une marche de 46 % entre deux téléphones voisins, parce que la taille
suivait la HAUTEUR (`13.3 * var(--hu)`) et qu'un palier de media query
(`max-height:700px`) la coupait en deux.

La taille suit maintenant la LARGEUR, plafonnée par la hauteur utile :
`clamp(3.9rem, min(24vw, calc(12.5 * var(--hu))), 6.6rem)`. Résultat
mesuré sur huit appareils : 21,9 % à 24,1 %. Le palier de la media
query a été supprimé — le `min()` fait déjà le travail sur écran court.
`scratchpad/n1/logo.js` mesure la taille, la proportion et l'air
au-dessus, marges de sécurité comprises.

**QUAND L'IMAGE CHANGE, LA TAILLE DU CADRE N'EST PLUS LA BONNE (v165).**
Le cadre était réglé à 24 % de la largeur pour l'ANCIENNE illustration.
La nouvelle a sa propre marge intégrée : mesuré, l'enfant occupait
315×387 px dans un cadre de 512, il n'en occupe plus que 265×344 —
**16 % de moins en largeur, 11 % en hauteur**. À cadre constant, le
logo a donc rétréci de lui-même le jour où l'image a changé, sans qu'une
seule ligne de mise en page ne bouge. Taylor l'a vu.

Le cadre rend ces 16 % : 24 % → **27 %** de la largeur. La leçon générale :
*une taille de cadre n'est jamais absolue, elle vaut pour un remplissage
donné.* Changer l'illustration, c'est devoir remesurer le cadre.

Les 12 px que ça coûte en hauteur ne sont pas volés aux cartes : ils
viennent de l'espaceur du haut (11,8 → 6 px) et de la marge sous la zone
du logo (9 → 5,8 px). Du vide, contre un objet.

**Le plafond dépend de la mise en page, pas seulement de l'écran
(v159).** 12,5 % de la hauteur utile est calibré pour la page COMPLÈTE.
Sur écran court le verset et la bande sont masqués : il reste 110 à
155 px inutilisés en bas, et le logo rétrécissait quand même. C'est le
cas du NAVIGATEUR — la barre d'adresse ramène un 14 Pro de 852 à 643 px
de haut, et le logo tombait à 20,1 % de la largeur (capture de Taylor).
Le palier court relève donc le plafond à 17 % : la largeur redevient le
facteur décisif, 23,3 % à 24,0 % partout, et le plafond ne reprend la
main qu'en dessous de ~555 px de hauteur utile.
Les deux cas se mesurent ensemble avec `scratchpad/n1/nav.js`
(navigateur : hauteur visible réduite, aucune marge système ; app :
hauteur pleine, marges système simulées).

---

## NON RÉSOLU

### Léger flou en haut de l'écran (iOS) — DÉCIDÉ : on laisse

Signalé après une mise à jour d'iOS. **Prouvé par la mesure**, pas par
déduction : on rend l'accueil au format exact du téléphone (402x874 @3x)
et on compare bande par bande. Au même endroit, la capture du téléphone
est deux fois plus sombre et a **neuf fois moins de détail local** que le
rendu — et la frontière tombe pile sous la barre d'état. Le jeu, lui, ne
peint rien de flou : ses couches de fond ne contiennent que des dégradés
et un grain, aucun `blur`.

C'est donc le traitement système de la barre d'état pour les apps
installées, qu'aucune API web ne permet de désactiver. Une page ne peut
que lui retirer sa MATIÈRE : un flou appliqué à une couleur unie redonne
la même couleur unie.

Deux contournements ont été chiffrés et présentés à Taylor :

- **barre d'état opaque** (`apple-mobile-web-app-status-bar-style: black`)
  — seul résultat garanti, mais la photo s'arrête sous la barre ;
- **capot sombre** sur la hauteur de la barre — testé à 0,80 et 0,93
  d'opacité : quasi aucun effet, parce que le dégradé remonte à 0,28 dès
  22 % de la hauteur, bien avant la fin de la bande floutée.

**Taylor a choisi de laisser comme c'est.** Ne pas y revenir sans qu'il
le redemande.


### L'écran se déchire au retour en portrait — RÉSOLU en v174

**Cette entrée ne décrit plus l'état du jeu.** Elle disait « jamais
reproduit en machine » : c'était vrai tant que le banc basculait la
géométrie et les requêtes média d'un seul coup, comme Playwright le fait
par défaut. En les dissociant, la déchirure se reproduit — 459 px de
déplacement — et le correctif la ramène à 0.

Voir « Un test incomplet est pire qu'aucun test (v174) » plus haut, et
`banc-essai/rotation.js`, qui échoue sur la version d'avant et passe sur
celle d'après.
