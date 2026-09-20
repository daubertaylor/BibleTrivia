# Les rappels

> ## ⚠️ POURQUOI AUCUN RAPPEL N'EST JAMAIS ARRIVÉ (relevé le 20/09/2026)
>
> « Je les ai activées et je n'ai jamais rien reçu depuis. » C'était vrai, et
> ce n'était pas un réglage trop prudent : **aucun rappel ne POUVAIT partir**.
> Trois ruptures, chacune suffisante à elle seule.
>
> **1. Le jeu n'écrivait jamais l'état du joueur.** Le client Supabase est
> paresseux : `from().update().eq()` ne construit qu'un objet, et la requête ne
> part qu'au moment où on l'attend. Le repli « réessayer sans la colonne
> *revoir* » était écrit sans `then` ni `await` — il n'a jamais quitté le
> téléphone. Comme le premier essai échouait toujours (la colonne n'existe pas
> en ligne), toute l'écriture se perdait en silence. Relevé sur la vraie table :
> les **huit** abonnements portaient `dernier = null`, `serie = 0`, `vu = null`.
> Or les cinq motifs lisent chacun un de ces champs.
> Corrigé dans le jeu (v251). Banc : `banc-essai/rappels-ecriture.js`, qui
> compte les requêtes réellement émises — rouge sur la version publiée.
>
> **2. La colonne `revoir` n'a jamais été ajoutée** à la table en ligne. C'est
> elle qui déclenchait le refus de toute l'écriture. → `verrouiller.sql`.
>
> **3. La fonction déployée est encore celle à DEUX motifs.** Appelée, elle
> répond `{"envoyes":0,"series":0,"absences":0,...}` — les clés de la version
> d'avant la v219. Les cinq motifs de `rappels.ts` ne sont pas en ligne.
> → `supabase functions deploy rappels`.
>
> **Et la table était grande ouverte.** L'ancienne règle d'accès
> (`for all to anon using (true)`) autorisait n'importe qui, avec la seule clé
> publique écrite en clair dans `index.html`, à lire les huit abonnements
> (`keys.p256dh` et `keys.auth` compris — de quoi écrire sur le téléphone d'un
> joueur sous le nom de Yada), à en insérer, et à tous les supprimer. Vérifié :
> `SELECT` 200, `INSERT` 201, `DELETE` 204. → `verrouiller.sql`.
>
> ### Ce qu'il reste à faire, dans cet ordre
> 1. Coller **`notifications/verrouiller.sql`** dans l'éditeur SQL de Supabase.
> 2. `supabase functions deploy rappels`
> 3. Vérifier que la tâche horaire existe (Database → Cron, `0 * * * *`) —
>    c'est le seul maillon que je ne peux pas contrôler d'ici.
> 4. Pour tout voir marcher tout de suite, sans attendre 19 h :
>    appeler la fonction avec `{"essai": true}` **et la clé service_role**.

Le jeu notifie **cinq motifs**, jamais plus d'un par jour :

| motif | heure locale | condition |
|---|---|---|
| **Série en jeu** | 19 h | série ≥ 2 jours, jouée hier, pas encore aujourd'hui |
| **Défi du jour** | 19 h | pas relevé aujourd'hui, mais relevé dans les 7 derniers jours |
| **À revoir** | 12 h | au moins une question arrive à échéance aujourd'hui |
| **Verset** | 9 h, le dimanche | le joueur n'a pas disparu (≤ 14 jours) |
| **Longue absence** | 19 h | exactement 3, 7 ou 30 jours sans jouer |

**« Fait le Défi d'habitude », pas « a joué récemment ».** La première écriture
du motif « Défi du jour » disait *« a joué dans les 14 derniers jours »*. Le
banc `banc-essai/rappels.js`, qui exécute la VRAIE fonction serveur, l'a
cassée sur deux cas :

- un joueur absent depuis 7 jours recevait *« le défi du jour t'attend »* au
  lieu de *« ça fait une semaine »* — le motif mordait sur celui de l'absence ;
- et surtout, **celui qui joue tous les jours en solo ou en ligne sans jamais
  toucher au Défi** le recevait tous les soirs, indéfiniment. C'est la
  définition du spam, et c'est exactement le cas que la version d'avant
  protégeait.

On ne rappelle un rendez-vous qu'à ceux qui l'ont pris : la condition porte
donc sur la date du dernier **Défi**, pas sur celle de la dernière partie.
Sept jours de mémoire — au-delà, ce n'est plus un oubli, c'est un choix, et un
choix ne se rappelle pas tous les soirs.

**Pourquoi c'est passé de deux motifs à cinq (v219).** On avait volontairement
restreint à deux pour ne pas spammer. Bonne intention, mauvais réglage :
*« si ça sonne presque jamais, ça n'a aucun intérêt »*. Un rappel qui ne part
jamais ne protège personne — il occupe seulement une case dans les réglages.

Le garde-fou n'a jamais été la rareté des motifs, c'est **le plafond d'un envoi
par jour**. Il est tenu deux fois : côté serveur par l'exclusion mutuelle des
cas et leurs heures distinctes, côté appareil par le champ `prevenu`. Ce qui a
changé, ce sont les RAISONS d'envoyer, pas la fréquence maximale.

Et les mots tournent : chaque motif a trois à cinq formulations, tirées de la
date du jour (donc stables pour un même jour, différentes d'un jour à l'autre).
Le même texte reçu trois lundis de suite cesse d'être lu ; c'est une autre
façon de ne rien dire.

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
- n'a pas déjà été prévenu aujourd'hui (`prevenu`) ;
- et remplit ENCORE, à l'instant où l'envoi arrive, la condition du motif —
  le service worker les revérifie toutes, une par une. Entre la décision du
  serveur et l'arrivée du message, le joueur a pu jouer, vider son carnet, ou
  revenir : dans ce cas rien ne s'affiche.

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
