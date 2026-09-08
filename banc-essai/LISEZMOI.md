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
    node duel.js        # salon privé : création, code, duel complet, départ brutal
    node duel2.js       # appariement aléatoire, fin des deux, revanche, départ avant lancement
    node salle.js       # CINQ joueurs : salon, mêmes questions, scores, classement, départ
    node pleine.js      # NEUF candidats pour huit places : le dernier arrivé ressort
    node exaequo.js     # trois à égalité : partagent-ils le rang ?
    node photos.js      # les trois écrans à plusieurs, en image
    node match-trace.js # la séquence d'appariement, horodatée des deux côtés
    node bascule.js     # le salon change de visage dans les deux sens

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
