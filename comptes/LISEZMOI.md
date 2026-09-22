# La progression ne doit plus mourir avec le téléphone

Entre vingt et cinquante personnes jouent à Yada aujourd'hui. Tout ce qu'elles
ont fait — livres, série de flammes, gels, carnet d'erreurs, succès — vit dans
le stockage local de leur téléphone, et **nulle part ailleurs**. Désinstaller
efface tout. Changer de téléphone efface tout. iOS vide le stockage d'une app
web restée trop longtemps fermée, sans prévenir et sans retour possible.

Quelqu'un qui perd trois mois de série ne revient pas, et il a raison.

## Ce qu'il y a à faire (une fois)

1. Ouvre l'éditeur SQL de Supabase (Project → SQL Editor).
2. Colle `comptes/table.sql` en entier, exécute.
3. Authentication → Providers :
   - **Email** est déjà actif par défaut. Vérifie seulement que
     « Confirm email » est activé : c'est lui qui envoie le code.
   - **Google** : colle l'identifiant et le secret OAuth. L'adresse de retour
     à déclarer côté Google est celle que Supabase affiche sur cette page.
     Si tu ne fais pas Google, ce n'est pas grave : le jeu s'en aperçoit tout
     seul et n'affiche plus le bouton.

**Rien à changer dans le jeu.** Il sonde la table au premier passage par le
Profil, retient la réponse une journée, et n'affiche la carte de sauvegarde que
si la table existe. Le jour où tu lances le SQL, elle apparaît d'elle-même.

## Ce que voit le joueur

Dans **Profil**, sous sa couleur :

> Ta progression n'existe que sur ce téléphone.
> [ Sauvegarder ma progression ]

Puis deux portes : **Continuer avec Google**, ou son adresse e-mail.

## Pourquoi un code à six chiffres et pas un lien

Un lien de connexion ouvre Safari. Sur un iPhone où Yada est installé sur
l'écran d'accueil, c'est **Safari** qui serait connecté, et l'app installée
resterait dehors — sans que le joueur comprenne pourquoi. Un code se tape là où
on est déjà. Pour la même raison, le bouton Google est caché quand l'app est
installée sur iOS : il ouvrirait le navigateur, et le retour ne reviendrait
jamais jusqu'au jeu.

## La règle qui compte plus que toutes les autres

**Se connecter ne retire jamais rien.** Ça ne repose pas sur ma prudence :

- tout passe par `appliquerSauvegarde()`, qui fusionne systématiquement le
  distant avec **ce téléphone** avant d'écrire. Il n'existe aucun chemin, dans
  tout le code, qui écrive une sauvegarde reçue telle quelle ;
- `fusionner()` est prouvé **monotone** (chaque compteur du résultat est
  supérieur ou égal aux deux entrées, chaque ensemble contient leur union) et
  **idempotent** (refusionner ne change rien) sur quatre cents paires tirées au
  hasard — `banc-essai/fusion.js` ;
- `banc-essai/comptes.js` joue le scénario complet : un téléphone RICHE se
  connecte sur un compte PAUVRE, et le banc compare la photo d'avant à celle
  d'après, compteur par compteur et ensemble par ensemble.

**Se déconnecter n'efface rien non plus.** Pas une ligne de stockage local
n'est touchée, et c'est écrit sous le bouton.

## Deux téléphones en même temps

Le danger classique : A lit, B lit, A écrit, B écrit — et l'écriture de B,
calculée sur une version périmée, efface celle de A.

Chaque écriture annonce donc **la révision qu'elle a lue**. Si elle ne
correspond plus, `poser_sauvegarde()` ne touche à rien et rend l'état courant
**avec ses données** : le téléphone refusionne dessus et retente. Personne
n'écrase personne.

Et le serveur **dit s'il a écrit**, il ne laisse pas le téléphone le deviner.
Comparer les révisions ne suffisait pas : si l'autre téléphone écrit exactement
une fois entre notre lecture et notre repose, la révision avance d'un —
exactement comme l'aurait fait notre propre écriture. Les deux cas devenaient
indiscernables, et le téléphone croyait avoir sauvegardé sans rien avoir posé.

## Ce qui monte dans le compte, et ce qui n'y monte pas

**Monte** : le nom et la couleur choisis, la progression par livre, les
compteurs, la flamme et ses jours, les questions déjà vues, le carnet
d'erreurs, les succès, le goût (traduction, décor).

**Ne monte pas** : le son, la musique, le volume, les notifications. Ils
appartiennent à l'**appareil**, pas au joueur — un volume réglé sur une
tablette n'a rien à faire sur un téléphone.

Et **le jeu reste le même pour tout le monde** : rien de ce qui se synchronise
ne change une règle, une question ou un barème.

## Quand ça se synchronise

À la connexion, au retour sur l'app (si plus d'une minute s'est écoulée), et à
la fin de chaque partie — après le rendu et le confetti, jamais pendant.
