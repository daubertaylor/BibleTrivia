# Les rappels

Le jeu ne notifie **que deux cas**, et rien d'autre ne le mérite :

1. **Une série en jeu** — les flammes sont sur le point de s'éteindre alors
   qu'elles sont encore rattrapables ce soir.
2. **Une longue absence** — sept jours sans jouer, puis trente. Deux rappels
   par absence, pas un de plus : après le trentième jour, plus rien tant que le
   joueur n'est pas revenu.

Ces deux cas s'excluent l'un l'autre : le premier demande d'avoir joué HIER, le
second d'être absent depuis au moins une semaine. Et un joueur ne peut recevoir
qu'un seul rappel par jour, quel qu'il soit.

**« Jouer » veut dire une partie, dans n'importe quel mode.** Pas seulement le
Défi du jour : quelqu'un qui joue tous les soirs en solo, en groupe ou en ligne
sans jamais toucher au Défi a une série à zéro et une date de dernier défi
vieille de plusieurs mois. Le réveiller serait le pire défaut possible ici. La
date de la dernière PARTIE est donc suivie à part (colonne `vu`).

Tant que la clé publique n'est pas renseignée, **aucun réglage n'apparaît** dans
le jeu — mieux vaut ne rien proposer qu'un interrupteur qui ne fait rien.

**Une seule paire de clés pour tout le monde.** Elle identifie le JEU, pas un
téléphone : chaque appareil qui accepte les rappels dépose sa propre ligne dans
`push_subs`, et la fonction horaire les parcourt toutes. Il n'y a rien à faire
de plus pour couvrir un joueur de plus.

## Les quatre étapes

**1. Créer la table** — coller `table.sql` dans l'éditeur SQL de Supabase.

**2. Générer la paire de clés** (une seule fois, à garder précieusement).

Ouvrir `cles.html` (à la racine du site) et appuyer sur le bouton : le
navigateur fabrique la paire sur l'appareil, rien n'est envoyé ni enregistré.
En ligne de commande, l'équivalent est `npx web-push generate-vapid-keys`.

La clé **publique** va dans `index.html` :

    const VAPID_PUBLIC = "…la clé publique…";

**Fait depuis la v204** — la clé publique est posée et le réglage « Rappel de
série » apparaît dans le jeu. Une clé se VÉRIFIE avant d'être posée : 87
caractères, 65 octets, premier octet `0x04`, et le point qu'elle décrit doit
tomber SUR la courbe P-256. La première envoyée décodait proprement et n'était
pourtant pas une clé — rien ne l'aurait dit avant le jour où aucune
notification ne serait partie.

La clé **privée** ne quitte jamais le serveur. Elle n'a pas à passer par une
conversation, une capture d'écran ou un fichier du dépôt : elle va directement
dans les secrets Supabase (étape 3).

`cles.html` est une page de dépannage : la retirer une fois la clé posée.

**3. Déployer la fonction** :

    supabase functions deploy rappels
    supabase secrets set VAPID_PUBLIQUE="…" VAPID_PRIVEE="…" VAPID_SUJET="mailto:ton@adresse.fr"

**3 bis. Voir la chaîne marcher tout de suite.** Sans essai, la première preuve
que tout est branché arriverait un soir à 19 h, des jours plus tard, et un
défaut se découvrirait à l'aveugle. Appelée avec le corps `{"essai": true}`, la
fonction écrit à TOUS les abonnés sans regarder ni l'heure ni la série, et
l'appareil affiche « Les rappels sont bien branchés ». Ce n'est pas une porte
ouverte : l'appel exige déjà la clé `service_role`. Un essai ne consomme pas le
« déjà prévenu aujourd'hui » — il ne doit pas voler le rappel du jour.

**4. La programmer toutes les heures** — coller `cron.sql` dans l'éditeur SQL
(l'URL du projet y est déjà ; il ne reste que la clé `service_role` à mettre).
Ou passer par Supabase → Database → Cron, avec `0 * * * *`.

Elle tourne toutes les heures parce que les joueurs ne sont pas tous dans le
même fuseau : à chaque passage, elle ne réveille que ceux chez qui il est 19 h.

## Ce que le serveur sait, et ce qu'il ignore

Il connaît trois choses : la date du dernier défi joué, la longueur de la série,
le décalage horaire. Il ne connaît **ni le pseudo, ni les scores, ni les
réponses, ni la progression**.

## Les garde-fous

Ils sont posés **deux fois** : côté serveur (qui n'envoie qu'aux séries
réellement en jeu, le soir) et côté appareil (le service worker revérifie avant
d'afficher). Si le joueur a joué entre la décision du serveur et l'arrivée de
l'envoi, rien ne s'affiche.

Un joueur ne peut recevoir **qu'un seul rappel par jour**, et seulement s'il :

- a explicitement accepté (la demande n'arrive qu'après une série de 2 jours) ;
- a une série d'au moins 2 jours ;
- n'a pas déjà joué aujourd'hui ;
- a joué hier, donc peut encore la sauver ;
- n'a pas déjà été prévenu aujourd'hui.

## Seulement dans le jeu INSTALLÉ, partout

Le réglage n'apparaît que si le jeu a été **ajouté à l'écran d'accueil** — sur
iOS comme sur Android. Sur iOS c'est une obligation technique (16.4+). Ailleurs
c'est un choix : dans un onglet, la permission est accordée au NAVIGATEUR et pas
au jeu. Le joueur verrait arriver « Chrome » au lieu de Yada, la notification
survivrait à la fermeture de l'onglet sans qu'il comprenne d'où elle vient, et
il aurait dépensé le seul « oui » qu'on ait le droit de lui demander : un refus
est définitif, le navigateur ne redemande plus jamais.

**Le nom affiché par le système est celui de l'installation.** La demande de
permission dit le nom qu'avait le jeu au moment où l'icône a été posée sur
l'écran d'accueil — « BibleTrivia » pour une icône posée avant la v202. Il ne
change qu'en retirant l'icône et en la reposant, ce qui n'est PAS anodin sur
iOS : la mémoire de l'app installée part avec elle.
