# Le banc d'essai du mode en ligne

Le mode en ligne n'avait jamais pu être testé : il faut **deux joueurs à la
fois**, et les essayer contre le vrai Supabase reviendrait à lâcher des clients
de test dans le salon public — au risque de s'apparier avec un vrai joueur et
de lui gâcher sa partie.

Ce banc monte donc un **serveur temps réel local** qui parle la même langue que
Supabase pour ce dont le jeu se sert : présence (qui est là) et broadcast
(messages). Deux vrais navigateurs jouent l'un contre l'autre, sur le vrai code
du jeu, sans toucher à la production.

Ce qui n'est PAS testé ici : le transport de Supabase lui-même. Ce n'est pas
notre code, et il est éprouvé. Tout le reste l'est.

## Lancer

    cd banc-essai
    node syntaxe.js     # EN PREMIER : le fichier s'analyse-t-il encore ?
    node duel.js        # salon privé : création, code, duel complet, départ brutal
    node duel2.js       # appariement aléatoire, fin des deux, revanche, départ avant lancement
    node salle.js       # CINQ joueurs : salon, mêmes questions, scores, classement, départ
    node pleine.js      # NEUF candidats pour huit places : le dernier arrivé ressort
    node exaequo.js     # trois à égalité : partagent-ils le rang ?
    node photos.js      # les trois écrans à plusieurs, en image
    node match-trace.js # la séquence d'appariement, horodatée des deux côtés
    node bascule.js     # le salon change de visage dans les deux sens
    node couleurs.js    # aucune bordure de couleur, écrans ET états
    node appuis.js      # l'onde d'appui se voit-elle sur son propre bouton ?
    node rotation.js    # la mise en page ne bouge pas quand le téléphone tourne
    node coupe.js       # aucun texte coupé, sur cinq tailles d'écran
    node progression.js # la progression ne recule jamais (règle numéro un)
    node jumeaux.js     # même écran, iPhone et Android : rien ne bouge
    node installer.js   # un seul geste sur Android, le guide partout ailleurs
    node entree.js      # l'écran arrive entier : le bas avec le haut
    node verrou.js      # le verrou paysage arrive et s'en va sans clignoter
    node pastille.js    # la pastille d'un joueur ne dépend pas de sa place
    node partage.js     # « Partager le jeu » fait toujours quelque chose
    node enpartie.js    # en partie : une horloge, aucun rebond, le bas avec le haut
    node pli.js         # déplier un testament glisse, et le verre suit
    node englouti.js    # la liste des erreurs ne tombe pas du bord de l'écran
    node plis.js        # tous les plis du jeu tournent-ils sur la même horloge ?
    node ouverture.js   # « créer une partie » s'ouvre-t-il toujours aussi vite ?
    node motfin.js      # le mot de la fin ne se trompe jamais de joueur
    node pied.js        # le pied de l'accueil se tient pareil sur dix appareils
    node bords.js       # l'onde d'appui va-t-elle jusqu'au bord du bouton ?
    node forme.js       # l'onde d'appui a-t-elle la FORME de son bouton ?
    node jeton.js       # une seule pastille de joueur, partout, en quatre tailles
    node paysage.js     # couché, on ne voit rien de l'app sous le voile
    node typo.js        # typographie française sur les 1545 questions et 12 écrans
    node doigt.js       # tout ce qui se touche fait-il 44 px, mesuré au doigt ?
    node fuite.js sansmarge "html.gl-xf .has-gs{ overflow-clip-margin:0px !important; }"
    python3 fuite.py sansmarge     # aucun trou d'un pixel au bord des feuilles
    node matiere.js /tmp/m mat && python3 matiere.py /tmp/m mat   # la matière suffit-elle ?

## Un avertissement, payé cher

La première version de `shim.js` confondait les événements de présence `sync` et
`leave`. Le jeu, lui, les distingue : son gestionnaire de `leave` conclut
« l'hôte a quitté le salon » quand plus personne d'autre n'est là. Résultat, le
banc accusait le jeu d'un bug d'appariement qui n'existait pas.

**Une imitation approximative fabrique de faux coupables.** Avant de conclure
qu'un défaut vient du jeu, vérifier qu'il ne vient pas d'ici.


## Le départ doit nommer celui qui part

Supabase joint à l'événement `leave` les métadonnées de ceux qui s'en vont
(`leftPresences`). À deux, on pouvait s'en passer : « quelqu'un est parti »
suffisait, il n'y avait qu'un candidat. À huit, non — il faut savoir **lequel**.
Le hub les envoie donc désormais, comme le vrai service.

## Ce que le banc a attrapé

Le salon restait en **face-à-face VS** même à cinq joueurs. La cause n'était pas
dans le rendu mais dans le raccourci de rafraîchissement : `reRenderIfOnline()`
voyait la case de l'adversaire (`#oppSlot`) et se contentait de la retoucher,
sans jamais redessiner l'écran. Le salon ne pouvait donc pas BASCULER en liste.
Le raccourci est maintenant réservé aux salons à deux.

**Une capture vaut une assertion.** C'est en regardant l'image du salon à cinq
que le défaut a sauté aux yeux ; les compteurs, eux, disaient tous « 5 joueurs ».


## Le salon ne présume pas de ce qu'il ne sait pas

Un salon vide affichait un face-à-face « Taylor VS ? · Adversaire »,
« Longueur du duel » et « puis lance le duel » — trois promesses de duel
posées juste sous la ligne qui annonce jusqu'à huit joueurs, et affichées
précisément pendant que l'hôte décide combien de personnes inviter.

Le face-à-face n'apparaît donc qu'à **exactement deux**. Seul, le salon montre
la même liste qu'à plusieurs, avec les places restantes : elle dit ce qu'on
sait, et rien de plus.

Conséquence à ne pas manquer : le raccourci de `reRenderIfOnline()` valait
`nbJoueurs() <= 2`, ce qui laissait le face-à-face à l'écran quand l'invité
repartait. Il vaut maintenant `=== 2`. C'est `bascule.js` qui garde ce sens-là,
en descendant de huit à un après y être monté.


## Un retour d'appui peut exister et rester invisible

Le jeu répond au doigt de deux façons : le bouton s'enfonce, et une onde
colorée s'allume dessous. Vérifier que l'onde est bien *appliquée* ne prouve
rien — sur les 94 boutons du jeu, tous l'avaient. Ce qui compte, c'est
l'écart entre la teinte de l'onde et la couleur du bouton.

« Quitter » de la confirmation de sortie est un `.modal-btn.ok`, il héritait
donc de l'onde **blanche** des boutons corail. Mais lui est **crème**. Deux
unités et demie d'écart : l'appui ne se sentait pas, sur le seul bouton qu'on
presse pour abandonner une partie. `appuis.js` compose chaque teinte sur la
couleur réelle de son bouton et le dit.


## Un test qui bascule proprement ne prouve rien

La déchirure de rotation n'apparaît que dans une fenêtre de quelques images où
iOS a déjà changé la géométrie mais pas encore les requêtes média. Playwright,
lui, bascule les deux d'un coup : le défaut y était **invisible**, alors qu'il
était bien là.

`rotation.js` neutralise donc toutes les règles dont la condition parle
d'orientation — et rien d'autre — avant de basculer. Une mise en page qui ne
dépend pas de l'orientation traverse cet état sans bouger ; c'est tout ce qu'on
lui demande. Le test échoue sur la version d'avant et passe sur celle d'après :
c'est la seule preuve qui vaille.


## Une onde d'appui doit avoir la forme de son bouton

Elle était peinte en dégradé radial s'éteignant à 88 %. Mesuré sur un bouton
pleine largeur : **centre 100 %, milieu des bords 84 %, coins 39 à 67 %**. Le
doigt appuyait sur un bouton entier et voyait s'allumer une tache au milieu.

La teinte est maintenant posée à plat — profil mesuré : 100 % sur toute la
largeur. Le geste d'onde ne venait pas du dégradé mais de l'agrandissement
(`scale(0.001)` → `scale(1)`), qui est intact ; vérifié en cours d'animation,
à 55 ms la couverture est déjà nette et sans arête dure.


## Un cache de positions doit être relu quand la mise en page BOUGE

Le moteur de verre garde la position de chaque surface en cache : c'est ce qui
le rend gratuit au défilement. Mais pendant qu'un accordéon se déplie, les
surfaces situées dessous voyagent **sans que personne ne le lui dise**.

`toggleTst` recalait à quatre instants pendant que la carte parcourait 354 px :
mesuré, la couche de décor restait immobile 130 ms puis se téléportait, jusqu'à
**257 px de retard**. `glassSuivre(ms)` existe exactement pour ça — une
relecture par image, le temps de l'animation. Retard ramené à **1 px**.

La leçon : quatre `setTimeout` ne remplacent pas une boucle par image.


## Ce qui fait « englouti »

La feuille « Revoir mes erreurs » s'arrêtait à **10 px** du bord bas de
l'écran, et y tranchait une carte en plein milieu d'une phrase — sous
l'indicateur d'accueil de l'iPhone. 588 px restaient à lire, plus d'un
écran entier, sans rien pour le dire.

La première version d'`englouti.js` relevait le plus fort saut de
luminance dans les 40 px du bas. Elle criait au loup : ce qu'elle voyait
était un bord de carte parfaitement normal, au milieu de la liste. Ce qui
fait « englouti » se lit **sur la ligne du bord et nulle part ailleurs** —
le dedans juste avant, le dehors juste après. Reformulé ainsi : 33,0 avant,
5,6 après.

Trois relevés en tout, un par correction : le repos sous la liste (10 →
22 px), la netteté de la coupe (33,0 → 5,6) et l'endroit où l'on se pose
après un lancer (57 → 0 px du haut d'une carte).


## Deux secondes valent mieux que vingt

Un `const` déclaré deux fois dans la même portée met **tout** le jeu à
terre : index.html est un seul fichier, une seule balise `<script>`. Les
essais du banc l'ont vu — mais sous la forme d'un `waitForFunction` qui
expire au bout de 20 s, ce qui ressemble à un serveur mort, pas à une faute
de frappe. On a redémarré le serveur deux fois avant de comprendre.

`syntaxe.js` extrait le bloc et le fait simplement analyser par node : deux
secondes, et l'erreur est nommée avec sa ligne dans le fichier. Sa propre
première version cherchait le `type` du script dans TOUT le bloc et tombait
sur `masterFilter.type = "lowpass"` au milieu du code audio : elle sautait
le fichier entier en annonçant « ignoré », c'est-à-dire en ne testant rien.
Elle se vérifie donc sur un fichier volontairement cassé :

    node syntaxe.js /tmp/casse.html   # doit ECHOUER
    node syntaxe.js                   # doit passer


## Une horloge par FAMILLE, pas une par ligne de code

Le jeu a trois familles de mouvement, et rien d'autre ne devrait exister :
ce qui ARRIVE (`--tr-ouvre`), ce qui S'EN VA (`--tr-ferme`), et le PLI —
tout ce qui s'ouvre, se ferme ou se remplit sur place en poussant le reste
(`--tr-plie`). Le pli tournait sur **sept horloges** : 0,26s le chevron
d'un testament, 0,34s une ligne de joueur, 0,52s le pli lui-même, 0,55s la
barre, 1s l'anneau, et 0,6 / 0,9 / 1s les trois compteurs.

Deux choses le rendaient invisible en relecture : les valeurs sont
éparpillées sur 9 000 lignes, et trois d'entre elles vivent en JS, pas en
CSS. `plis.js` va donc les CHERCHER là où elles s'appliquent — sur l'écran
de chacune, sur un vrai élément — et lit la durée et la courbe réellement
calculées par le navigateur. Sept lignes, sept horloges, en une capture.

Il mesure ensuite image par image les deux seuls plis qui DÉPLACENT la mise
en page. C'est là que la coïncidence se voit : le testament et la ligne de
joueur atteignent maintenant 80 % de leur course à 242 et 240 ms. Avant,
173 et 242.


## Une latence, ça se FIXE pour être mesurée

« Créer une partie » s'ouvrait « parfois plus lentement ». Impossible à
reproduire en regardant : c'est le réseau, et il n'est jamais deux fois le
même. `ouverture.js` remplace donc Supabase par un canal de laboratoire qui
ne fait qu'une chose — répondre `SUBSCRIBED` au bout de N millisecondes — et
mesure du clic à la première image du salon.

Le rapport était de **1 pour 1** : 27 ms à 0 de latence, 1533 ms à 1500. Le
défaut n'était pas « parfois lent », il était « exactement aussi lent que le
réseau ». Une fois écrit comme ça, le correctif est évident.


## Un vide qui grandit, et le seuil qui le dit

Le pied de l'accueil « ne s'affiche pas pareil » selon le téléphone. La
première version de `pied.js` mesurait l'écart en PIXELS et demandait une
fourchette étroite : impossible à tenir, puisqu'un écran court comprime
légitimement tout — la bande y est plus près des cartes, et c'est très bien.

Ce qui n'est pas légitime, c'est que l'écart GRANDISSE quand plus rien
d'autre ne grandit. Mesuré en **fraction de la hauteur utile**, le défaut
saute aux yeux : 9,2 % sur un écran de 643 px, 14,2 % sur un iPhone 15,
17,3 % sur un Pixel 8, **21,6 %** sur un écran de 1000. Le seuil s'écrit tout
seul : ne jamais dépasser ce que fait l'appareil de référence.

Le test relève aussi les deux marges de page (au-dessus de l'en-tête, sous le
pied) : elles doivent rester ÉGALES, sinon le vide n'est pas partagé mais
déplacé.

Et une vérification que le test ne fait pas : que l'appareil de référence n'ait
pas bougé. Elle se fait élément par élément, en comparant l'ancien fichier et
le nouveau à la même taille — 0 px sur iPhone 15. Sans elle, « ça se tient
pareil partout » pourrait vouloir dire « c'est cassé partout de la même
façon ».


## Un effet peut disparaître sans que rien ne casse

En voulant n'écrire le dessin du fondu qu'une seule fois, il a été posé sur
`:root` sous forme de `--voile-vertical`, avec des `var(--voile-h)` dedans.
Une propriété personnalisée qui contient un `var()` est substituée sur
l'élément où elle est DÉCLARÉE : sur `:root`, `--voile-h` n'existe pas, la
valeur devenait invalide, et **le fondu disparaissait entièrement**.

Rien ne casse dans ce cas-là. Aucune erreur, aucune mise en page décalée, une
capture qui a l'air normale — une carte crème coupée net sur une feuille
crème, ça ne crie pas. Seule une mesure le dit.

D'où le relevé « rampe » d'`englouti.js` : on pose un bloc NOIR UNI dans la
liste, on force le voile à sa pleine longueur, et on lit le profil de
luminance à travers le bord. Ce profil EST la rampe du masque. On en tire
deux chiffres :

    amplitude   y a-t-il un fondu ? (0 = il a disparu)
    coude       sa dérivée seconde maximale : une droite fait deux pics,
                un smoothstep n'en fait aucun (0,00504 -> 0,00150)

Le premier est un garde-fou, le second une mesure de qualité. Les deux
étaient nécessaires : le garde-fou a servi le jour même où il a été écrit.


## Un correctif crée son propre défaut, et le banc doit le voir

Ouvrir le salon tout de suite (v178) a rendu FRÉQUENT un chemin qui était
rare : le rendu sur place pendant l'animation d'entrée. C'est là qu'un vieux
nettoyage — remettre `animation-delay` à zéro sans retirer la classe — s'est
mis à relancer l'animation. Le défaut n'existait pas avant, il a été RÉVÉLÉ.

Il ne se produit que si la présence répond entre ~300 et ~500 ms : plus tôt,
la reprise est indolore ; plus tard, l'entrée est finie et on ne reprend rien.
D'où quelque chose de « très rapide » et intermittent, que le premier essai
d'`ouverture.js` ne voyait pas — il ne mesurait que le temps de la PREMIÈRE
image, et celle-ci était parfaite.

Leçon : **mesurer l'instant où ça commence ne dit rien de ce qui se passe
ensuite.** Le test suit maintenant la position image par image pendant 2,2 s
après le clic, et relève deux choses : le plus fort mouvement VERS LE BAS
(l'entrée, elle, ne fait que monter) et l'instant de la dernière image qui
bouge.


## Mesurer un appui sans casser ce qu'on mesure

`bords.js` compare l'image d'un bouton PRESSÉ à celle du même bouton au
repos : les pixels qui changent sont l'onde, et sa boîte englobante dit si
elle atteint le bord.

Sauf que sous le doigt le bouton s'ENFONCE aussi. Tout bouge, et la
comparaison ne dit plus rien. Le réflexe — `transform:none` — est le pire des
choix : **c'est ce transform qui crée le contexte d'empilement** grâce auquel
l'onde (`z-index:-1`) passe devant le fond du bouton. Sans lui elle disparaît
complètement, et le test conclurait tranquillement que le bouton ne s'allume
pas. `translateZ(0) scale(1)` garde le contexte et fige la géométrie. La
leçon avait déjà été payée pour `appuis.js` ; elle se repaie à chaque nouveau
test d'appui.

Deux autres pièges, trouvés en écrivant celui-ci :

- un bouton qui porte une **ombre portée** (`filter:drop-shadow`) voit sa
  silhouette d'ombre changer en même temps que l'onde : des pixels bougent
  DEHORS sans que l'onde y soit pour rien. Le relevé « halo » ne veut alors
  rien dire, et le test l'annonce au lieu de faire semblant ;
- pour ne pas déclencher le clic du bouton, on relâche le doigt AILLEURS —
  mais un relâchement sur le voile d'une feuille produit un clic sur ce voile,
  qui **referme la feuille**. Les cibles suivantes ne trouvaient plus rien.
  Chaque cible d'une feuille rouvre donc la feuille.


## Un test qui ne trouve rien doit prouver qu'il sait trouver

`typo.js` compte les ponctuations ORPHELINES : un « ? » tombé seul en début
de ligne. Sa première version en annonçait 78 sur iPhone SE — un chiffre que
j'ai failli mettre dans un message de commit comme justification.

Il était faux. Le test écrivait dans la CARTE de question au lieu d'écrire
dans son bloc de texte : la mise en page se refaisait alors dans un conteneur
flex centré, 37 px plus large, avec d'autres points de coupure. Au bon
endroit — le vrai bloc, par le vrai chemin d'affichage — le compte est ZÉRO,
avant comme après, sur les énoncés, les anecdotes et les options, à quatorze
largeurs.

Un zéro n'est crédible que si l'on a montré que le détecteur sait dire autre
chose que zéro. Celui-ci a donc été éprouvé sur un cas FABRIQUÉ pour
orpheliner : il voit bien une dernière ligne de 9,3 px, sur 4 largeurs sur 22.

Le correctif de typographie reste — l'interface et les données écrivaient
deux typographies différentes dans le même écran — mais il ne corrige pas ce
que je croyais qu'il corrigeait, et le commentaire du code le dit.


## Une zone tactile ne se mesure pas à la règle

La première version de `doigt.js` lisait `getBoundingClientRect`. Elle mentait
dans les deux sens : un bouton peut être plus GRAND que sa zone (un parent en
`overflow:clip` — et une surface de verre en porte toujours une — coupe aussi
le test de survol) ou plus PETIT (un pseudo-élément l'étend).

On demande donc à la page qui reçoit le toucher, point par point, en
s'éloignant du centre dans les quatre directions : `elementFromPoint` respecte
les pseudo-éléments, les découpes et les recouvrements, exactement comme un
doigt. C'est cette mesure qui a montré qu'un même correctif marchait sur le
rond du Profil et pas sur celui des Réglages — le premier est en
`overflow:visible` parce que son verre est masqué.

Le relevé porte aussi ses **exceptions écrites**, avec leur raison. Une
exception qu'on n'écrit pas est un défaut qu'on a oublié ; une exception qu'on
écrit est une décision.
