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
    node pli.js         # déplier un testament glisse, et le verre suit
    node englouti.js    # la liste des erreurs ne tombe pas du bord de l'écran
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
