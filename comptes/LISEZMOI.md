# La progression ne doit plus mourir avec le téléphone

Entre vingt et cinquante personnes jouent à Yada aujourd'hui. Tout ce qu'elles
ont fait — livres, série de flammes, gels, carnet d'erreurs, succès — vit dans
le stockage local de leur téléphone, et **nulle part ailleurs**. Désinstaller
efface tout. Changer de téléphone efface tout. iOS vide le stockage d'une app
web restée trop longtemps fermée, sans prévenir et sans retour possible.

Quelqu'un qui perd trois mois de série ne revient pas, et il a raison.

## Ce qu'il y a à faire (une fois)

### 1. La table

Supabase → **SQL Editor** → New query → colle `comptes/table.sql` en entier →
**Run**. C'est tout : la table, les règles d'accès et la fonction d'écriture
sont posées d'un coup.

### 2. LES DEUX MODÈLES DE COURRIEL — l'étape qu'on oublie, et qui casse tout

Supabase → **Authentication → Emails → Templates**
(`supabase.com/dashboard/project/_/auth/templates`).

**Par défaut, Supabase envoie un LIEN, pas un code.** C'est écrit noir sur
blanc dans leur documentation : « Though the method is labelled OTP, it sends a
Magic Link by default. » Le jeu, lui, demande six chiffres. Sans cette étape,
le joueur reçoit un lien, n'a aucun code à taper, et rien ne marche — en
silence, sans message d'erreur.

Il faut donc ajouter la variable `{{ .Token }}` dans **DEUX** modèles :

- **Confirm sign up** — celui que reçoit un joueur qui se connecte pour la
  PREMIÈRE fois. C'est le cas de tout le monde au départ, donc c'est le plus
  important des deux.
- **Magic link or OTP** (« Magic Link » sur les anciens tableaux de bord) —
  celui que reçoit un joueur qui revient.

Dans chacun, remplace le corps par quelque chose comme :

```html
<h2>Ton code Yada</h2>
<p>Entre ce code dans le jeu :</p>
<p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
<p>Il est valable une heure. Si tu n'as rien demandé, ignore ce message.</p>
```

Le lien peut rester en dessous si tu veux, ça ne gêne pas — ce qui compte,
c'est que `{{ .Token }}` soit là.

### 2b. L'ENVOI DES COURRIELS (SMTP) — sans lui, personne d'autre que toi ne reçoit de code

Le service de courriel intégré à Supabase est un service **d'essai** : il
n'envoie **qu'aux membres de ton équipe Supabase**, et **deux messages par
heure** au plus (documentation Supabase, « Send emails with custom SMTP »). Toi,
tu recevras ton code ; un joueur, jamais. Il faut donc brancher un vrai
serveur d'envoi.

**On peut la remettre à plus tard, mais pas longtemps.** Tant qu'elle n'est
pas faite, tes propres essais marchent avec l'adresse de ton compte Supabase ;
un joueur qui touche « Sauvegarder ma progression » lit « Impossible d'envoyer
le code pour l'instant. » — rien n'est perdu, il ne peut juste pas
sauvegarder. En attendant, laisse **Enable custom SMTP** éteint : n'enregistre
jamais cette page à moitié remplie. Et elle doit être faite avant d'ouvrir les
groupes à tout le monde.

Le plus simple sans nom de domaine : **une adresse Gmail dédiée à Yada**
(elle peut servir aussi d'adresse de contact pour les stores). C'est elle que
les joueurs voient arriver avec leur code :

- au nom du jeu, neutre dans les trois langues — par exemple
  `yada.quiz@gmail.com`, sinon `yada.bible`, `yadaquiz.app`, `contact.yada`
  (Gmail ignore les points : si `yada.quiz` est prise, `yadaquiz` aussi) ;
- ni ton nom, ni chiffres, ni « noreply » : un joueur sans code doit pouvoir
  répondre ;
- prénom du compte Google : `Yada`, nom vide — c'est ce que voit un joueur à
  qui tu réponds (modifiable à tout moment : Gérer votre compte Google →
  Informations personnelles → Nom) ;
- adresse et téléphone de récupération : les tiens. Ils restent privés, et
  perdre ce compte couperait l'envoi de tous les codes.

1. Sur ce compte Google : **Sécurité → Validation en deux étapes** → l'activer.
2. Puis `myaccount.google.com/apppasswords` → nom « Supabase » → **Créer** →
   Google affiche un mot de passe de 16 lettres. **Il ne va nulle part
   ailleurs que dans Supabase** — ni dans le dépôt, ni dans une conversation.
3. Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom
   SMTP** :
   - Sender email : l'adresse Gmail · Sender name : `Yada`
   - Host : `smtp.gmail.com` · Port : `465`
   - Username : l'adresse Gmail · Password : les 16 lettres, sans espaces
   - **Save**.

Gmail envoie jusqu'à 500 messages par jour : largement de quoi faire pour
vingt à cinquante joueurs. Autres services possibles (Brevo, Resend…), mais
ils demandent de vérifier un expéditeur ou un domaine.

### 3. Google (facultatif)

Authentication → **Providers** → Google : colle l'identifiant et le secret
OAuth. L'adresse de retour à déclarer côté Google est celle que Supabase
affiche sur cette page. Si tu ne le fais pas, ce n'est pas grave : le jeu s'en
aperçoit au premier essai et cesse d'afficher le bouton.

**Rien à changer dans le jeu.** Il sonde la table au passage par le Profil et
n'affiche la carte de sauvegarde que si elle existe. Une réponse « elle existe »
est gardée une journée ; une réponse « pas encore » seulement une demi-heure —
pour que la carte apparaisse vite après ton SQL, et pas le lendemain.

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

**Monte** : le nom, la couleur et la **photo de profil**, la progression par
livre, les compteurs, la flamme et ses jours, les questions déjà vues, le
carnet d'erreurs, les succès, le goût (traduction, décor).

La photo pèse une **seizaine de kilo-octets** : elle est recadrée au carré et
réduite à 256 pixels avant d'être enregistrée, jamais gardée telle que
l'appareil photo l'a produite (quatre à douze méga-octets). Elle se départage
entre deux téléphones **par la date**, et c'est la seule chose de la sauvegarde
qui marche ainsi : sans ça, retirer sa photo sur un téléphone la verrait
revenir au premier échange avec l'autre, indéfiniment. Retirer sa photo est un
acte explicite, fait sur son propre compte — la date dit lequel des deux gestes
est le dernier. Tout le reste (compteurs, ensembles, carnet) reste monotone :
la fusion ne peut rien retirer.

**Les autres joueurs la voient**, en partie en ligne. Elle ne passe PAS par la
présence — celle-ci est re-diffusée à chaque changement de score, et y glisser
seize kilo-octets les renverrait à chaque bonne réponse. Elle part par une
diffusion ponctuelle sur le canal du salon : une fois en arrivant, une fois de
plus quand quelqu'un arrive après nous. Personne ne demande rien, tout le monde
se présente.

**Ne monte pas** : le son, la musique, le volume, les notifications. Ils
appartiennent à l'**appareil**, pas au joueur — un volume réglé sur une
tablette n'a rien à faire sur un téléphone.

Et **le jeu reste le même pour tout le monde** : rien de ce qui se synchronise
ne change une règle, une question ou un barème.

## Quand ça se synchronise

À la connexion, au retour sur l'app (si plus d'une minute s'est écoulée), et à
la fin de chaque partie — après le rendu et le confetti, jamais pendant.
