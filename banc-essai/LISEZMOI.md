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
    node match-trace.js # la séquence d'appariement, horodatée des deux côtés

## Un avertissement, payé cher

La première version de `shim.js` confondait les événements de présence `sync` et
`leave`. Le jeu, lui, les distingue : son gestionnaire de `leave` conclut
« l'hôte a quitté le salon » quand plus personne d'autre n'est là. Résultat, le
banc accusait le jeu d'un bug d'appariement qui n'existait pas.

**Une imitation approximative fabrique de faux coupables.** Avant de conclure
qu'un défaut vient du jeu, vérifier qu'il ne vient pas d'ici.
