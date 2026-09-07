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
   — `--rebord-pose` (posée sur le décor : filet + ombre douce),
   `--rebord` (plate, dans une autre surface : filet **deux fois plus
   léger**), `--rebord-plein` (pleine et colorée : ombre de sa propre
   couleur). Chaque surface déclare son rôle dans `--mon-rebord`, une
   seule règle le peint. Ajouter une famille demain = l'écrire dans le
   bon rôle — et le rôle se choisit d'après CE QU'IL Y A DERRIÈRE, pas
   d'après ce qu'est la surface : un bouton dans une feuille claire est
   « plat », pas « posé ».

   Pourquoi deux filets : un même brun à 10 % se devine sur le décor
   sombre mais descend de 16 à 19 unités de luminance sous une carte
   crème — là, ce n'est plus un contact, c'est un trait. Mesurable :
   `scratchpad/arete.js` + `arete2.py` traversent chaque arête en pixels
   et donnent la hauteur du trait (médiane sur dix points, sinon la
   texture de la photo fait de faux positifs). Repère : au-dessus de
   ~10, l'œil lit une ligne dessinée. Maximum actuel dans le jeu : 9,5.
2. **Le rythme vertical** : `--e-1` à `--e-4` (0,4 / 0,62 / 1 / 1,5 rem,
   rapport constant d'environ 1,55). `--e-3` est le pas courant. Les
   micro-espacements internes d'un composant n'en font pas partie.
3. **`--hu`**, la hauteur *utile* : 1 % de ce qui reste une fois les
   zones système retirées, mesuré en JS (`mesurerHauteurUtile`). Tout ce
   qui doit céder quand la place manque s'y accroche, avec la taille
   actuelle comme plafond.

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

- `scratchpad/couleur.js` — les rebords **saturés** (or, corail, vert).
  Doit rapporter 0.
- `scratchpad/arete.js` + `arete2.py` — les traits **sombres**, bords
  gauche et droite. Repère : au-dessus de ~10, l'œil lit une ligne.
  Maximum actuel : 6,9 — le filet ne délimite plus rien à lui seul, il
  ne fait que poser le contact. Ce qui délimite, c'est la MATIÈRE : une
  surface crème se détache de sa carte de 44 à 69 unités, du décor de
  158. Le filet est un raffinement, pas une nécessité.
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


### L'écran se déchire au retour en portrait

Signalé plusieurs fois, jamais reproduit en machine — la rotation de
Chromium est atomique (une image en paysage, la suivante en portrait,
toutes les couches suivent).

Quatre causes ont été éliminées, mesures à l'appui :

| Cause | Vérification |
|---|---|
| Le verre calculé pour le mauvais viewport | 170 images fautives sur 364 → 0 |
| L'échange de photo au redressement | 2 échanges par aller-retour → 0 |
| La hauteur de `#app` périmée | reproduit puis réparé (402 → 874) |
| La mise en page qui se refait couché | debout et couché désormais identiques |

**Hypothèse restante** : l'app maintient en permanence une soixantaine de
couches GPU (chaque surface de verre est promue, chaque couche de flou fait
563×1748 px). À la rotation, iOS doit toutes les re-rastériser ; celles qui
ne le sont pas à temps affichent leur ancien contenu, et l'écran se déchire
le long des frontières de couches. Piste : dé-promouvoir temporairement les
couches pendant la rotation.

Ce qui aiderait le plus : **une vidéo** de la rotation. Elle dirait si
l'écran se coupe *pendant* l'animation ou *après* — deux causes sans
rapport, indiscernables sur une photo.
