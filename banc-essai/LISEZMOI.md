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
    node ouverture.js   # « créer une partie » : même vitesse, et sans saccade
    node motfin.js      # le mot de la fin ne se trompe jamais de joueur
    node pied.js        # le pied de l'accueil se tient pareil sur dix appareils
    node bords.js       # l'onde d'appui va-t-elle jusqu'au bord du bouton ?
    node forme.js       # l'onde d'appui a-t-elle la FORME de son bouton ?
    node jeton.js       # une seule pastille de joueur, partout, en quatre tailles
    node notifs.js      # un appareil qui n'a jamais joué en ligne est-il inscrit ?
    node rappels.js     # qui reçoit un rappel, et quand (le vrai code du serveur)
    node lignes.js      # ajouter, retirer, clavier : les lignes de joueurs ne sautent pas
    node feuille.js     # une feuille est-elle FINIE avant de commencer à monter ?
    node gels.js        # les gels de série : généreux, mais jamais abusifs
    node echeance.js    # « quand dois-je faire ma série ? » — le compte à rebours du jour
    node traductions.js # les barrières statiques du dictionnaire (rien à lancer, tout à lire)
    node langues-ecrans.js  # écran par écran, en anglais et en espagnol : rien ne reste français
    node questions-langues.js # les 1545 questions traduites, alignées, et répondre marche encore
    node socle.js       # chacun ne télécharge que la banque de SA langue, et l'a hors ligne
    node reprise.js     # une partie sauvegardée reprend où elle en était, même celle d'avant
    node recul.js       # la feuille qui recule garde-t-elle son décor, et son fond ?
    node plein.js       # l'onde d'appui recouvre-t-elle TOUT le bouton, logo compris ?
    node camera.js      # le recadrage à l'ouverture du clavier bégaie-t-il ?
    node charge.js      # le moteur de verre paie-t-il pour une feuille qui ne recule pas ?
    node logo.js        # cinq taps rapides sur le logo : cinq appuis nets ?
    node revoir.js      # les erreurs reviennent-elles, espacées, et tout le carnet tient-il ?
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


## Un banc qui ne trouve rien mesure peut-être la mauvaise chose (v219)

Deux fois dans la même journée, un relevé propre a dit « rien à signaler » sur
un défaut que Taylor voyait de ses yeux.

**Le clavier.** `lignes.js` annonçait « 0 image morte » sur le recadrage à
l'ouverture du clavier, et c'était exact — pour ce qu'il mesurait. Il faisait
monter le clavier **d'un seul coup** (`setViewportSize` une fois), alors qu'iOS
le fait GLISSER par paliers sur un quart de seconde. `clavier.js` le fait
monter en douze paliers, et le défaut apparaît immédiatement : cent
millisecondes d'immobilité entre la fin de la montée et le premier pixel, puis
soixante-quinze pixels d'un coup. La page ne suivait pas le clavier, elle le
rattrapait.

**Le sursaut des Réglages.** Cinq relevés, cinq fois rien : la position de la
feuille, celle de son titre, celle de sa couche de verre, la page derrière,
trois ouvertures de suite au doigt, des photographies de l'écran entier
comparées deux à deux, et le tout avec le processeur freiné d'un facteur huit.
Il est **noté comme non reproduit**, et le correctif posé (le moteur du verre
écoute la vraie fin de la transition au lieu d'une durée devinée) est présenté
pour ce qu'il est : le retrait d'une supposition, pas la correction d'une
mesure.

Écrire « je n'ai pas su le reproduire » vaut mieux que corriger au hasard. Mais
la première question reste toujours la même : **est-ce que je mesure ce que
l'œil regarde ?**


## Un seuil doit dire pourquoi il vaut ce qu'il vaut

`clavier.js` exige que l'immobilité après la montée du clavier reste sous 65 ms.
Ce n'est pas un chiffre rond : le recadrage doit attendre que les paliers d'iOS
aient cessé — sinon il repart sur une hauteur intermédiaire et la page RECULE,
ce qui a été mesuré (+18, +8, −15, −6, +8, +33) — soit deux fois leur
intervalle, 40 ms, plus l'image où le mouvement démarre. Sous cette valeur, on
n'accélère plus : on casse.

Un seuil arbitraire finit toujours par être relâché « parce que ça passe
presque ». Un seuil dont la valeur est dérivée d'une contrainte réelle se
défend tout seul.


## Un mouvement qui décélère a son plus grand pas au début

Première définition d'un « cran » dans `logo.js` : *une image qui fait plus de
trois fois le pas médian*. Elle condamnait le bon comportement — la première
image d'un ease-out vaut naturellement trois à quatre fois la médiane.

Ce que le doigt sent n'est pas un grand pas, c'est un pas qui **repart** après
avoir ralenti. Le relevé cherche donc le sommet, puis exige que ça ne remonte
plus.


## Une mise en page se balaie, elle ne se pointe pas

`accueil.js` ne vérifie pas une hauteur d'écran, il en vérifie une cinquantaine
de 560 à 1000 px — les deux bords de chaque palier CSS compris. C'est ce qui a
montré que la correction évidente (resserrer les cartes) laissait intacte une
**bande morte de 700 à 780 px**, juste au-dessus du palier « petits écrans »,
où l'accueil redevenait d'un coup grand format alors qu'il n'en avait pas
encore les moyens.

Une mise en page qui tient sur l'appareil du jour et casse sur le suivant n'est
pas une mise en page, c'est une coïncidence.


## Un banc écrasé est un filet retiré (v219)

En écrivant un test des TEXTES de notification, je l'ai nommé `rappels.js` —
un fichier qui existait déjà, et qui faisait bien plus : il transpile le vrai
`notifications/rappels.ts` et **exécute la règle du serveur** contre une table
de joueurs fabriquée pour couvrir tous les cas. Écrasé sans un regard, parce
que `git status` disait `M` et pas `A` et que je ne l'ai pas lu.

Restauré, il a immédiatement cassé la règle que je venais d'écrire — et il
avait raison : mon « rappeler le Défi à qui a joué dans les 14 derniers jours »
réveillait tous les soirs, indéfiniment, le joueur qui joue tous les jours sans
jamais toucher au Défi. C'est-à-dire **exactement le cas que la version d'avant
protégeait**, et dont ce banc portait la garde depuis des mois.

Deux règles, donc :

- **`M` et `A` ne se lisent pas de la même façon.** Un fichier « modifié »
  qu'on croyait créer est un fichier qu'on détruit.
- **Un banc qui garde un cas précis ne se remplace pas, il s'étend.** Celui-ci
  est passé de 13 à 23 cas ; le mien, qui vérifie les 152 formulations
  possibles et leur conformité aux versets du jeu, vit à côté sous
  `mots-rappels.js`.


## Un banc qui observe sans toucher ne trouve pas ce que le toucher déclenche (v220)

Le sursaut des feuilles avait résisté à cinq relevés : position de la feuille
et de son titre image par image, photographies de l'écran entier comparées deux
à deux, la page derrière, trois ouvertures de suite, le décor vu à travers le
verre avec le processeur freiné huit fois. Tous propres, tous muets.

**Ils regardaient tous une feuille que personne ne touchait.** Le défaut se
déclenche au contact : un doigt posé dérive de deux ou trois pixels — c'est la
main, pas l'intention — et le glissement prenait cette dérive pour un geste.

La question « est-ce que je mesure ce que l'œil regarde ? » ne suffisait pas.
Il en fallait une seconde : **est-ce que je reproduis le geste ?** Poser,
dériver de deux pixels, relâcher. Trois lignes de banc, et le défaut apparaît
au premier essai.

Et un correctif de geste doit prouver qu'il n'a pas cassé le geste : le même
banc vérifie que glisser ferme toujours, que taper la poignée ferme toujours,
et qu'un appui avec dérive ne ferme rien.

## Une durée symétrique, c'est un clignotement

La lueur du doigt sur le logo montait en 0,16 s et descendait en 0,16 s. Sur
un tap unique, parfait. Sur cinq taps à cent vingt millisecondes — le geste qui
ouvre le verset — elle avait tout le temps de s'éteindre entre deux appuis :
0,71 puis 0,09 puis 0,78 puis 0,13, cinq fois. Un stroboscope à huit hertz.

**Une lumière qui répond au toucher n'a pas une durée, elle en a deux.** Elle
s'allume à la vitesse du doigt et s'éteint à la vitesse du regard. La règle qui
porte l'état d'arrivée décide : allumage sur la classe active, extinction sur la
règle de base.

Et le corollaire pour les bancs : **un banc qui n'essaie qu'un seul geste ne
voit pas le rythme.** `logo.js` tapait déjà cinq fois — mais il ne regardait que
l'échelle, jamais la lumière. Ce qu'on ne relève pas n'existe pas.

## Un banc mesure le geste, pas ce qui vient après

Première écriture de `clignote.js` : la fenêtre d'observation allait jusqu'à la
dernière image où le logo était à son échelle minimale. Or le cinquième tap
ouvre le verset, qui met le logo à 0,5 — la fenêtre courait donc jusqu'au bout
du repli, et comptait l'extinction NORMALE de la lueur comme un battement
(creux 0,54, contraste 0,295 sur une version pourtant correcte).

## « Revenu » et « posé » ne sont pas le même instant

Le même banc datait la fin du ressort du logo à la première image où l'échelle
revalait un. Mais la courbe de retour DÉPASSE : elle traverse la taille pleine
à 0,10 s, monte à 1,018, puis redescend jusqu'à 0,45 s. Mesurée à la traversée,
l'ancienne version passait le test ; mesurée à la pose, elle échoue — la lumière
mourait à 0,24 s quand le mouvement durait jusqu'à 0,40 s.

**Quand une courbe dépasse, on cherche la dernière image qui bouge, jamais la
première qui retombe juste.**

## Une donnée qui peut venir d'ailleurs se borne DEUX fois

`joursDerives` boucle autant de fois que la série annoncée. Tant que ce nombre
ne venait que de l'appareil, il était sain par construction. Le banc de la
fusion, qui tire des valeurs hostiles, l'a fait tomber à sa première passe :
« série = un milliard » construit un ensemble d'un milliard d'entrées et
l'application se fige à l'ouverture, écran noir, sans message.

Le même banc a trouvé le jumeau silencieux : `progNormalize` écrivait
`+x || 0`, qui laisse passer les NÉGATIFS — `-6` est vrai, donc il survivait, et
`progMergeMax` gardait consciencieusement le plus grand de deux `-6`.

**Borner la VALEUR ne suffit pas, il faut aussi borner la BOUCLE** — et
inversement. Toute donnée qui cesse d'être écrite uniquement par le jeu doit
repasser par les deux.

## Un défaut n'est pas un choix

La traduction et la scène suivent le joueur, pas l'appareil. Règle naïve : « ce
qui est ici l'emporte ». Elle ne peut pas marcher — un téléphone a TOUJOURS une
valeur, celle par défaut, donc le choix du compte n'arriverait jamais. La règle
inverse ne marche pas non plus : on écraserait ce qu'on vient de choisir ici.

**Quand deux côtés ont toujours une réponse, ce n'est pas « qui parle » qu'il
faut départager, c'est « qui a parlé en dernier ».** On date le choix — et
seulement lui, baisser le volume ne fait pas d'un téléphone l'autorité sur la
traduction. Un appareil qui n'a jamais rien choisi ne date rien, et adopte donc
le goût du compte.

## Le bord d'une mémoire bornée n'est pas une fin

La liste des jours est plafonnée à quatre-vingt-dix. Une série de cent vingt
jours, recalculée depuis cette liste, en rendrait quatre-vingt-dix : trente
jours volés à un joueur fidèle. Quand la marche atteint le plus ancien jour
connu ET que la liste est pleine, on ne peut PAS conclure — on garde ce qui
était annoncé. Si la liste n'est pas pleine, atteindre son plus ancien jour
veut dire que la série commence là, et il n'y a rien à croire sur parole.

## Une seule suite à la fois. Une seule.

Trois fois dans la même journée : une suite lancée alors qu'une autre tournait
encore. À chaque fois le même résultat — des rouges qui n'existent pas.
`ouverture`, `plis`, `rotation` et `duel` sont les premiers à tomber : ils
mesurent des millisecondes ou prennent un port, et deux navigateurs sans tête
qui se disputent le processeur suffisent à les faire mentir. Une fois, `duel` a
même échoué sur `EADDRINUSE` — son jumeau tenait le port.

Et le pire n'est pas le faux rouge, c'est le **faux vert** : une suite lancée
sur un arbre qu'on modifie pendant qu'elle tourne ne valide rien du tout. La
moitié des bancs a lu un fichier, l'autre moitié un autre.

**Avant de lancer :**

```
pgrep -f "banc-essa[i]/" && echo "UNE SUITE TOURNE DÉJÀ" || echo "libre"
```

Et surtout PAS `ps aux | grep -c ...` enchaîné avec `&&` : `grep -c` sort avec
le code 1 quand il compte zéro. La commande affiche donc « 0 », ce qui est la
bonne nouvelle, et le `&&` qui suit ne s'exécute jamais. Je viens de perdre une
suite comme ça — elle n'a simplement pas démarré, sans un mot.

Le crochet autour de la lettre n'est pas une coquetterie : sans lui, le motif
se trouve lui-même dans sa propre ligne de commande, et on attend un processus
qui est celui qu'on vient de lancer. Même piège avec `pkill` — un `pkill -f
"suite.sh"` s'est tué lui-même aujourd'hui, parce que « suite.sh » figurait
dans sa propre ligne de commande.

**Et ne jamais toucher à `index.html` pendant qu'une suite tourne.** Si une
mesure est urgente, on arrête la suite, on mesure, et on relance UNE suite
propre qui couvre tout. C'est moins long que d'interpréter des résultats qui ne
veulent rien dire.

## Un banc qui vérifie une compensation doit d'abord constater le mouvement

`recul.js` mesure que le décor reste fixe pendant que la feuille du dessous
rétrécit. Pendant quatre versions, la feuille ne rétrécissait plus du tout —
`both` sur son animation d'entrée battait la règle du recul, une animation
remplie gardant la main sur `transform` pour toujours. Le banc passait au vert
à chaque fois : il n'y avait rien à compenser, donc rien ne glissait.

Taylor l'a vu en trois secondes sur une photo. Aucun banc ne l'a vu en quatre
versions.

**Le vert d'un banc de compensation ne veut rien dire tant qu'on n'a pas
établi que la chose à compenser se produit.** Toute mesure du type « X ne doit
pas bouger pendant que Y bouge » commence donc par vérifier que Y bouge.

Et le corollaire, plus large : **une animation remplie (`both`, `forwards`) ne
rend jamais la main**. Elle bat toute règle ordinaire sur la propriété qu'elle
anime, y compris un style en ligne. Si une autre règle doit pouvoir agir sur
cette propriété plus tard, l'animation ne doit pas être remplie — on lui donne
plutôt une valeur de repos IDENTIQUE à sa fin, et le passage de témoin ne
déplace rien.

## Mesurer au bon moment ne suffit pas quand le défaut est dans les autres

`bords.js` mesurait la couverture de l'onde d'appui UNE FOIS FINIE : 0,00 px
d'anneau non peint, et c'était exact. Taylor a photographié la même puce en
plein vol : un rectangle coloré plus petit que la puce, un anneau clair tout
autour. L'onde GRANDISSAIT depuis un point — donc pendant toute sa montée elle
ne prenait pas les bords, et le banc regardait précisément l'instant où le
défaut n'existait plus.

Deux façons de s'en prémunir :

1. mesurer à plusieurs instants (mieux, mais on choisit encore les instants) ;
2. rendre le défaut impossible par construction, et vérifier la construction.

**J'AI PRIS LA DEUXIÈME, ET C'ÉTAIT UNE ERREUR DE JUGEMENT.** J'avais retiré
toute mise à l'échelle de la couche d'appui : sans transform, elle occupe sa
boîte entière dès la première image, la question du bord ne se pose plus à
aucun instant, et le banc vérifiait cette propriété au lieu d'une mesure.
Techniquement irréprochable — et j'avais supprimé, au passage, l'animation de
remplissage qui grandit. Taylor me l'a dit deux fois : « j'ai perdu mes
animations de remplissage », puis « remet tout ». C'est revenu en v230, et le
contrôle de structure avec.

LA LEÇON N'EST PAS TECHNIQUE. Rendre un défaut impossible par construction est
une bonne méthode ; elle cesse de l'être à la seconde où la construction
supprime quelque chose que le joueur aime. Un artefact d'un pixel sur un bord
pendant 240 ms ne vaut pas une animation entière. Avant de supprimer un
comportement pour régler un défaut, il faut se demander si ce comportement est
voulu — et si la réponse est oui, le défaut se règle AUTREMENT, ou ne se règle
pas.

C'est la deuxième fois que ce reproche revient (la première portait sur les
pastilles de livre). Quand un même reproche revient sous une autre forme, ce
n'est pas le réglage qu'il faut refaire, c'est la règle.

## Une métrique peut punir exactement ce qu'on cherche

« Pour l'ouverture du clavier je veux que ça se règle en douceur, pas de
saccade rapide. » Le banc `camera.js` ne comptait que les IMAGES MORTES — les
images où rien ne bouge. C'était la bonne mesure pour le défaut précédent (la
fin qui rampe), et elle était verte. Mais un geste peut n'avoir aucune image
morte et rester brutal : le suivi amorti avalait 26 % de l'écart par image,
donc sa vitesse était MAXIMALE à l'instant zéro, et il posait les cinq derniers
pixels d'un bloc juste après une image de 1,7 px.

J'ai donc écrit `douceur.js`, avec trois mesures : le départ, l'arrivée, et
« la plus grande variation de vitesse entre deux images ». Les deux premières
étaient bonnes. **La troisième était fausse, et aucune valeur de raideur ne
pouvait la satisfaire** : la variation de vitesse la plus grande d'un geste qui
accélère en douceur se trouve, par définition, au DÉPART — c'est-à-dire
précisément là où tout va bien. La métrique punissait la douceur.

La bonne forme se mesure, pas l'amplitude : un vrai geste MONTE, CULMINE,
DESCEND — une seule bosse. La mesure est donc « la plus forte REMONTÉE de
vitesse après le sommet », qui vaut zéro pour un geste bien formé et attrape
tous les coups. Relevé sur le vrai moteur, course de 54 px :

    avant   pas 4 14 9 7 5 4 3 2 1 5     départ 0,29  arrivée 2,50  à-coup 0,29
    après   pas 1 6 7 7 6 6 4 4 3 2 2 2  départ 0,14  arrivée 1,00  à-coup 0,00

Avant de régler quoi que ce soit sur une métrique, il faut vérifier qu'elle
peut atteindre zéro sur le comportement qu'on VEUT. Si rien ne peut la
satisfaire, c'est elle qui est fausse.


## Trois métriques fausses en une soirée, et ce qu'elles avaient en commun

« L'icône bouge beaucoup trop vite et va trop dans tous les sens, ça fait mal
aux yeux. » Pour le mesurer, j'ai écrit `agitation.js`. Il m'a fallu QUATRE
versions avant qu'il ne voie quoi que ce soit, et les trois premières échouaient
chacune d'une façon différente — qui vaut d'être notée, parce qu'elles se
répètent :

**1. L'horloge a fabriqué une vitesse.** Premier relevé : 1082 px/s au centre.
Faux. Le transform passe de « none » à une matrice en une seule image, et mes
deux points étaient séparés d'UNE milliseconde. Une vitesse ne se lit pas entre
deux relevés tombés dans la même image. → tout intervalle plus court qu'une
demi-image est ignoré.

**2. J'ai compté le geste au lieu de l'agitation.** Sur une salve de cinq taps,
mes « demi-tours » valaient huit — et c'est la bonne réponse : cinq taps font
cinq enfoncements et cinq retours, soit neuf changements de direction par
construction. La question n'était pas « combien de fois ça change de sens »
mais « quand on arrête de toucher, est-ce que ça se pose ». → on ne mesure que
la QUEUE, après le dernier doigt levé.

**3. J'ai mesuré au mauvais endroit, et pas assez d'endroits.** Je suivais un
point à 32 px du centre d'un logo qui en fait 53 de demi-largeur : 40 % de
sous-estimation sur toutes les vitesses. Et je ne suivais qu'UN coin, alors
qu'une bascule en 3D fait pivoter tout le carré. → on lit la taille réelle de
l'élément, on suit les quatre coins, et on retient le pire.

C'est seulement à la quatrième version que le défaut est apparu, et il était
gros : **162 °/s de bascule** au tap sur le bord. Sur un objet de trois
centimètres, une aiguille qui ferait un demi-tour par seconde.

CE QU'ELLES ONT EN COMMUN : à chaque fois, la métrique était verte pendant que
l'œil voyait le défaut, et à chaque fois j'ai été tenté de conclure « le banc
dit que c'est bon ». **Quand celui qui regarde dit qu'il y a un défaut et que
l'instrument dit non, c'est l'instrument qu'on répare.** On ne clôt jamais un
reproche en montrant une mesure verte.

ET LE CORRECTIF QUI A SUIVI ÉTAIT UNE ERREUR DE CONCEPTION, PAS UN RÉGLAGE.
Les quatre ressorts du logo partageaient les mêmes constantes, et ces
constantes sont choisies pour l'ENFONCEMENT : il doit être vif, sinon le logo
tremble au lieu de s'enfoncer quand on tapote vite (c'est `logo.js` qui
l'exige). La BASCULE n'avait aucune raison d'être vive — et c'est elle qu'on
voit tourner. Elle a désormais son propre ressort, presque critique : elle ne
dépasse pas, donc elle ne repart jamais dans l'autre sens.

    tap sur le bord    avant  233 px/s, bascule 162 °/s, 2 demi-tours
                       après  193 px/s, bascule  59 °/s, 1 demi-tour

Deux bancs se tiennent maintenant par les deux bouts : `logo.js` garde les
bornes BASSES (au moins 7 % d'enfoncement, au moins 1,2 % de ressort, au moins
4° de bascule) et `agitation.js` les bornes HAUTES. Un banc qui n'a que des
bornes basses ne freine rien — il pousse. C'est comme ça que j'en étais arrivé
à 162 °/s sans qu'aucun voyant ne s'allume.
