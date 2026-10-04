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
- ajouter `{{ .Token }}` dans les deux modèles de courriel (**Confirm signup**
  et **Magic Link**). C'est l'étape qu'on oublie, et sans elle personne ne peut
  se connecter.

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
  avec un code) ou public (on le trouve dans « Découvrir »), et une couleur.
- **Rejoindre** : un code à 6 caractères, ou le lien d'invitation (le bouton
  **Inviter** partage `…/BibleTrivia/?groupe=CODE`).
- **La discussion** : les messages arrivent en direct. Le bouton manette lance
  une partie en ligne et l'annonce dans le groupe : les autres n'ont qu'à
  toucher **Rejoindre la partie**. Toucher une bulle permet de la copier, la
  signaler, bloquer son auteur ou la supprimer si c'est la sienne.
- **Les admins** (propriétaire, et ceux qu'il nomme) peuvent mettre en
  sourdine une heure, retirer ou bannir un membre, supprimer un message,
  modifier le groupe et changer le code. Un admin ne peut jamais toucher au
  propriétaire.

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
- **Fermer le groupe** : le groupe disparaît pour tous.

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

- **Pas de photos ni d'images dans les groupes.** Une image se modère beaucoup
  plus mal qu'un mot. La photo de profil ne quitte jamais le téléphone.
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
bash groupes/essai.sh      # 155 vérifications sur un vrai PostgreSQL 16
bash comptes/essai.sh      # les comptes, la sauvegarde, la suppression
node banc-essai/groupes.js # le jeu de bout en bout, à deux téléphones, sur le vrai SQL
```
