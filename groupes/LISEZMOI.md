# Les groupes : parler et jouer ensemble

> « Le but des groupes : pouvoir parler, jouer ensemble via les groupes
> facilement, qu'il y ait des groupes publics et privés, avec un système de
> modération — les admins, etc. Et pour la conformité des stores, ajoute-le. »

Tout est prêt côté jeu depuis la **v302**. Rien ne s'affiche tant que tu n'as
pas fait les étapes ci-dessous : les joueurs ne voient aucune différence.
Ensuite, **toi seul** vois les groupes, le temps de les essayer. Enfin, une
ligne SQL les ouvre à tout le monde.

## Ce qu'il y a à faire, DANS CET ORDRE

### 1. Les comptes d'abord

Un groupe n'a de sens qu'entre personnes qu'on peut reconnaître, bloquer et,
au besoin, exclure. Sans compte, il n'y a personne à exclure.

Suis `comptes/LISEZMOI.md`, étapes 1 et 2 :

- coller `comptes/table.sql` dans **SQL Editor** → **Run** ;
- ajouter `{{ .Token }}` dans les deux modèles de courriel (**Confirm sign up**
  et **Magic link or OTP**). C'est l'étape qu'on oublie, et sans elle personne
  ne peut se connecter.
- brancher un **serveur d'envoi (SMTP)** — étape 2b : le service intégré de
  Supabase n'envoie qu'aux membres de ton équipe, deux messages par heure. Sans
  lui, toi seul reçois ton code, et personne d'autre n'entrera jamais dans un
  groupe.

`comptes/table.sql` contient aussi la **suppression du compte depuis le jeu**,
qu'Apple exige.

### 2. La table des groupes

Supabase → **SQL Editor** → New query → colle `groupes/table.sql` en entier →
**Run**.

Les deux fichiers se recollent sans risque, autant de fois qu'on veut et dans
n'importe quel ordre.

### 3. Te déclarer modérateur

Connecte-toi d'abord **une fois dans le jeu** (Profil → Sauvegarder ma
progression), pour que ton compte existe. Puis, dans le SQL Editor, avec
**ton** adresse à la place de celle d'exemple :

```sql
insert into public.moderateurs (id)
select id from auth.users where email = 'ton.adresse@exemple.com';
```

Vérification : `select count(*) from public.moderateurs;` doit répondre `1`.

### 4. Essayer, seul

Rouvre le jeu (ou reviens dessus après quelques secondes). La **barre des
onglets** apparaît en bas de l'accueil : **Accueil · Groupes**. Personne
d'autre ne la voit encore.

Essaie tout : crée un groupe, invite un deuxième téléphone avec le code, écris,
lance une partie, signale un message, ouvre la modération (le bouclier en haut
à gauche de l'écran des groupes).

Pour que ton deuxième téléphone puisse entrer pendant l'essai, déclare aussi
ce compte-là modérateur (même requête, autre adresse), ou passe directement à
l'étape 5.

### 5. Ouvrir à tout le monde

```sql
update public.reglages_jeu set groupes_ouverts = true;
```

Les joueurs voient la barre la prochaine fois qu'ils reviennent sur le jeu
(le jeu garde sa réponse une demi-heure au plus).

**Refermer en urgence** : la même ligne avec `false`. Tout le monde, sauf les
modérateurs, perd l'accès aussitôt. Rien n'est effacé.

Une fois ouverts, la barre **Accueil · Groupes** apparaît chez **tout le
monde**, connecté ou non : l'onglet Groupes d'un joueur sans compte lui
explique ce qu'un compte lui apporte et le connecte sur place.

### 6. Les photos (v311) — recoller le fichier une fois

La v311 apporte la **photo de groupe** et les **photos de profil dans les
groupes**. Elles vivent dans les tables elles-mêmes : il suffit de recoller
`groupes/table.sql` **en entier** dans **SQL Editor** → **Run**, comme à
l'étape 2. Rien n'est effacé, rien n'est à refaire ensuite.

Tant que ce n'est pas fait, le jeu ne propose aucune photo et n'en demande
aucune : tout marche exactement comme avant.

### 7. Les mentions et les notifications (v317) — recoller le fichier une fois

La v317 apporte les **mentions** (`@Nom`, et `@tout le monde` pour les admins)
et le choix, groupe par groupe, de ce qu'on veut entendre : **Tout**,
**Mentions** ou **Muet**. Comme à l'étape 6 : recoller `groupes/table.sql`
**en entier** dans **SQL Editor** → **Run**. Rien n'est effacé, et chacun
commence à « Tout ».

Tant que ce n'est pas fait, les messages partent normalement — simplement sans
mention retenue —, et le choix Tout / Mentions / Muet répond « Pas encore
disponible » au lieu de s'enregistrer.

### 8. Le logo d'un groupe (v322) — recoller le fichier une fois

La v322 apporte le **logo de groupe** : au lieu d'une photo, on peut choisir un
des quinze logos dessinés dans le jeu (la croix, la Bible, la colombe, le
poisson, la flamme, le cœur, la couronne, l'étoile, l'église, la musique, la
bougie, le soleil, la montagne, le rameau d'olivier, l'ancre), posé en blanc
sur la couleur du groupe. Comme aux étapes 6 et 7 : recoller
`groupes/table.sql` **en entier** dans **SQL Editor** → **Run**. Les groupes
qui existent gardent leur initiale tant que personne ne leur choisit un logo.

Tant que ce n'est pas fait, le jeu ne propose aucun logo, et crée et modifie
les groupes exactement comme avant.

### 9. Répondre à un message, et 120 membres par groupe (v332) — recoller le fichier une fois

La v332 apporte la **réponse à un message**, comme sur WhatsApp : on touche
une bulle, elle se pose au-dessus de la barre d'écriture, et la réponse part
avec sa citation — la toucher remonte au message d'origine, qui s'éclaire un
instant. L'appui long ouvre toujours le menu (copier, signaler, supprimer,
« Vu par »). Et un groupe compte désormais **120 membres au plus** (c'était
200, sans que le jeu sache le dire) : le nombre des disciples réunis en
Actes 1:15, une assemblée et pas une foule. Le jeu le dit dès qu'on tape le
code d'un groupe plein, avant même « Rejoindre ». Personne n'est jamais retiré
d'un groupe : seules les nouvelles entrées attendent une place.

Comme aux étapes 6, 7 et 8 : recoller `groupes/table.sql` **en entier** dans
**SQL Editor** → **Run**.

Tant que ce n'est pas fait, toucher un message ouvre le menu, exactement comme
avant (un serveur d'avant perdrait la citation en route), et un groupe reste
plein à 200.

**Une seule fois suffit pour les étapes 6, 7, 8 et 9 ensemble**, quelle que soit
la version déjà installée : le fichier d'aujourd'hui se colle par-dessus
n'importe laquelle de ses versions passées sans rien perdre, et donne
exactement la même base qu'une installation neuve (vérifié par
`banc-essai/sql-montee.js`, sur chacune des versions passées).

## Ce que voit le joueur

- **Accueil** : la barre flottante en bas, **Accueil · Groupes**, avec une
  pastille quand il y a des messages non lus. La rangée des sept jours part
  dans **Progression**, et la flamme reste visible sur la carte Progression.
  Tant que la barre n'est pas là, l'accueil ne change pas.
- **Groupes** : on glisse vers la droite. Sans compte, une carte explique
  pourquoi il en faut un et permet de se connecter sur place. La première fois,
  le joueur voit les **règles de la communauté** et confirme **avoir 13 ans ou
  plus**. Ensuite, il voit ses groupes, avec un aperçu du dernier message, les
  non-lus et les groupes publics à découvrir.
- **Créer un groupe** : un nom, une description facultative, privé (on y entre
  avec un code) ou public (on le trouve dans « Découvrir »), une couleur — celle
  de la discussion : mes bulles, le bouton d'envoi, l'invitation à jouer — et
  son image : une photo, ou un des quinze logos (v322, étape 8). On la choisit
  en touchant la grande pastille, à côté du nom.
- **Rejoindre** : un code à 6 caractères, ou le lien d'invitation (le bouton
  **Inviter** partage `…/BibleTrivia/?groupe=CODE`).
- **La discussion** : les messages arrivent en direct, et restent sur le
  téléphone (relance, changement de langue, réseau lent). Le bouton manette
  lance une partie en ligne et l'annonce dans le groupe : les autres n'ont qu'à
  toucher **Rejoindre la partie** ; quitter la partie ramène à la discussion.
  Toucher une bulle y répond (v332, étape 9) ; la tenir permet de la copier,
  la signaler, bloquer son auteur ou la supprimer si c'est la sienne —
  supprimée, elle disparaît pour tout le monde.
- **Les photos** (v311, étape 6) : chacun voit la photo de profil des membres
  de ses groupes ; toucher un visage l'agrandit.
- **Les admins** (propriétaire, et ceux qu'il nomme) peuvent mettre en
  sourdine une heure, retirer ou bannir un membre, supprimer un message,
  modifier le groupe et changer le code. Un admin ne peut jamais toucher au
  propriétaire.
- **Les mentions** (v317, étape 7) : taper `@` propose les membres du groupe ;
  le nom choisi s'écrit en entier et ressort en gras dans la bulle, et la bulle
  qui me nomme prend un fond doré. `@tout le monde` (`@everyone`, `@todos`)
  n'est proposé qu'aux admins du groupe et aux modérateurs — le serveur le
  refuse aux autres, et ne le laisse passer que **trois fois par heure** dans
  un même groupe. Le serveur ne retient que de vrais membres du groupe.
- **Les notifications d'un groupe** (v317) : dans la page du groupe, chacun
  choisit **Tout**, **Mentions** (seulement ce qui le nomme, ou s'adresse à
  tout le monde) ou **Muet**. Ce choix décide de ce qui compte dans la pastille
  de « Messages » ; les non-lus restent comptés sur la ligne du groupe, en gris.
  Personne d'autre ne voit ce choix.

## La modération

**Ce qui se fait tout seul, sur le serveur** (un téléphone modifié ne
contourne rien) :

- un **filtre** de mots, même déguisés (« c0nn4rd », « fuuuuck »). Il laisse
  passer les mots de la Bible : « le baiser de Judas », « the cock crew », « les
  yeux crevés de Samson » ;
- **aucune coordonnée dans un groupe public** : pas de lien, pas d'adresse
  e-mail, pas de numéro de téléphone. Des inconnus s'y croisent, et des
  mineurs ;
- **un débit maximum** : une seconde entre deux messages, 20 par minute, 500
  par jour ;
- **trois personnes qui signalent le même message le masquent aussitôt**, sans
  attendre personne.

**Ce que tu fais, toi** : le bouclier de l'écran des groupes ouvre la file des
signalements, une carte par message (ou personne, ou groupe) signalé, avec le
nombre de personnes qui l'ont signalé. Pour chacune :

- **Rien de mal** : le signalement est classé, et un message masqué
  réapparaît ;
- **Masquer** : le message disparaît pour tout le monde ;
- **Bannir l'auteur** : il perd l'accès à tous les groupes ;
- **Retirer la photo** (si la personne ou le groupe signalé en a une) : elle
  disparaît partout, et aucune nouvelle photo n'est possible pendant sept
  jours ;
- **Fermer le groupe** : le groupe disparaît pour tous.

**Voir avant de décider** : « Voir le groupe », sur la carte, ouvre la
discussion telle que ses membres la voient, en lecture seule — tu n'en deviens
pas membre et rien n'est marqué « lu » à leur place. Sous les cartes, **Tous
les groupes** liste chaque groupe du jeu, et ouvre n'importe lequel de la même
façon.

**Quand un signalement attend, tu le vois en ouvrant le jeu** : le bouclier
porte une pastille avec le nombre de choses à décider, et l'onglet **Groupes**
de l'accueil le compte avec les messages non lus. Rien ne te prévient quand le
jeu est fermé : les stores demandent une **réponse rapide**, alors ouvre-le au
moins une fois par jour.

**Depuis le SQL Editor**, si besoin :

```sql
-- les signalements en attente
select * from public.signalements where traite_le is null order by cree_le;

-- ajouter un mot au filtre (minuscules, sans accents, lettres seulement)
insert into public.mots_interdits values ('motinterdit');

-- lever un bannissement
update public.profils set banni_le = null
 where id = (select id from auth.users where email = 'adresse@exemple.com');

-- les règles ont changé : tout le monde les relira avant d'écrire
update public.reglages_jeu set regles_version = regles_version + 1;
```

Si tu changes les règles, dis-le-moi : le texte affiché dans le jeu doit
changer en même temps.

## Ce que demandent les stores, et où c'est

| Exigence (Apple 1.2, Google « contenu des utilisateurs ») | Dans le jeu |
|---|---|
| Un filtre avant publication | `_interdit`, `_coordonnees`, le débit — sur le serveur |
| Signaler un contenu | toucher une bulle → **Signaler** ; aussi un membre ou un groupe entier |
| Bloquer quelqu'un | toucher une bulle → **Bloquer** : ses messages disparaissent dans tous les groupes |
| Des règles acceptées, tolérance zéro | la page de bienvenue, à accepter avant d'écrire |
| Agir vite sur les signalements | la modération, au bouclier |
| Supprimer son compte dans l'app (Apple 5.1.1(v)) | Profil → **Supprimer mon compte** |
| Une politique de confidentialité | Réglages → **Confidentialité** |
| Un âge minimum | 13 ans, déclaré à l'entrée |
| **Un moyen de contact publié** | **à compléter** : il me faut l'adresse à afficher |

## Ce qui n'y est pas, exprès

- **Pas d'images dans les messages.** Une image se modère beaucoup plus mal
  qu'un mot. Seules la photo de profil (384 px, vue des seuls membres d'un
  groupe partagé) et la photo d'un groupe (propriétaire et admins) existent ;
  la modération les voit sur la carte d'un signalement et peut les **retirer**
  — aucune nouvelle photo n'est alors possible pendant sept jours.
- **Pas de liens cliquables.** Un lien dans un message reste du texte.
- **Pas de messages privés à une seule personne.** Un groupe privé à deux en
  tient lieu, avec les mêmes protections.

## Sécurité

- Le jeu ne contient que la **clé publique** (« publishable »). La clé
  `service_role` ne doit **jamais** entrer dans le jeu, ni être envoyée à qui
  que ce soit.
- Aucune table n'est écrite directement par un téléphone : tout passe par des
  fonctions qui vérifient avant d'écrire. Les règles d'accès (RLS) décident
  qui lit quoi : un membre ne lit que ses groupes, et ne voit pas les messages
  des personnes qu'il a bloquées. Le direct applique les mêmes règles.

## Vérifier sans le jeu

```bash
bash groupes/essai.sh      # 189 vérifications sur un vrai PostgreSQL 16
bash comptes/essai.sh      # les comptes, la sauvegarde, la suppression
node banc-essai/groupes.js # le jeu de bout en bout, à deux téléphones, sur le vrai SQL
```
