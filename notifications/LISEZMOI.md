# Les rappels de série

Le jeu ne notifie **qu'un seul cas** : une série de flammes sur le point de
s'éteindre alors qu'elle est encore rattrapable. Rien d'autre ne le mérite.

Tant que la clé publique n'est pas renseignée, **aucun réglage n'apparaît** dans
le jeu — mieux vaut ne rien proposer qu'un interrupteur qui ne fait rien.

## Les trois étapes

**1. Créer la table** — coller `table.sql` dans l'éditeur SQL de Supabase.

**2. Générer la paire de clés** (une seule fois, à garder précieusement) :

    npx web-push generate-vapid-keys

La clé **publique** va dans `index.html` :

    const VAPID_PUBLIC = "…la clé publique…";

La clé **privée** ne quitte jamais le serveur.

**3. Déployer la fonction** :

    supabase functions deploy rappel-serie
    supabase secrets set VAPID_PUBLIQUE="…" VAPID_PRIVEE="…" VAPID_SUJET="mailto:ton@adresse.fr"

Puis la programmer **toutes les heures** (Supabase → Database → Cron) :

    0 * * * *   →   appel de la fonction rappel-serie

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

## iOS

Les notifications n'existent que si le jeu a été **ajouté à l'écran d'accueil**
(iOS 16.4+). Dans Safari, le réglage n'est pas proposé du tout : une demande y
serait refusée d'office, et un refus est définitif.
