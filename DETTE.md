# Ce qui ne va pas encore

Liste tenue à jour de ce qui manque ou ce qui est fragile dans Yada. Rien ici
n'est une opinion : chaque point porte le fait mesuré qui le justifie, la
raison pour laquelle il compte, le moment où il faut s'en occuper, et ce qui
comptera comme « fait ».

Relue avant chaque grande étape. Quand un point est réglé, il descend dans
« Réglés » avec la date et le numéro de version.

---

## ⚠ CE QUI CHANGE TOUT : IL Y A DÉJÀ DES JOUEURS

Entre vingt et cinquante personnes utilisent Yada, et ça se répand. Cette
liste avait été écrite en supposant qu'on avait le temps — « à faire avant
d'ouvrir le jeu à des gens qu'on ne connaît pas ». Ce moment est passé.

Trois conséquences, et elles ne sont pas théoriques.

**Le risque de perte est en cours, pas à venir.** Vingt à cinquante personnes
ont une progression qui n'existe QUE sur leur téléphone. Chaque jour sans
compte est un jour où l'un d'eux peut tout perdre — réinstallation, changement
de téléphone, iOS qui vide le stockage d'une app web restée fermée trop
longtemps. Ce ne sera pas récupérable, et ça ne préviendra pas.

**On est aveugles en direct.** Si quelque chose casse chez cinq d'entre eux sur
un modèle de téléphone précis, personne ne l'apprendra. Les 111 blocs
`try/catch` garantissent que le jeu ne s'arrête pas ; ils garantissent aussi
que l'échec est silencieux.

**Chaque publication va directement chez eux.** Il n'y a pas de préproduction :
je pousse sur `main`, GitHub Pages sert, le service worker met à jour. Plusieurs
fois par jour. Ça a bien marché jusqu'ici parce que la suite de bancs tourne
avant chaque publication — c'est justement pour ça qu'elle existe, et c'est
maintenant qu'elle vaut son prix. Elle reste obligatoire, sans exception.

---

## 1. Les données d'un joueur vivent sur son téléphone — CÔTÉ JEU, C'EST FAIT (v279)

**Le fait.** Toute la progression — livres, bonnes réponses, série de flammes,
gels, carnet d'erreurs, succès — est dans le stockage local de l'appareil.
Aucune copie ailleurs.

**Pourquoi ça compte.** Désinstaller l'app efface tout. Changer de téléphone
efface tout. Sur iPhone, iOS peut aussi vider le stockage d'une app web restée
longtemps sans être ouverte. Un joueur qui perd trois mois de série ne revient
pas, et il a raison.

**Où ça en est, exactement (22/09/2026, v279).** Tout le côté téléphone est
écrit, éprouvé et publié : la carte de sauvegarde dans le Profil, les deux
portes (Google, ou un code à six chiffres par e-mail), la synchro à la
connexion, au retour sur l'app et en fin de partie, la gestion du conflit entre
deux téléphones. `banc-essai/comptes.js` joue le scénario complet contre un
Supabase de poche, et prouve la règle absolue : un téléphone RICHE qui se
connecte sur un compte PAUVRE ne perd rien, compteur par compteur, ensemble par
ensemble.

**Ce qui reste, et ce n'est pas du code.** Une action de Taylor, une seule :
lancer `comptes/table.sql` dans l'éditeur SQL de Supabase et vérifier les deux
fournisseurs. Tout est écrit dans `comptes/LISEZMOI.md`. Le jeu sonde la table
et n'affiche la carte que si elle existe — donc rien à rebasculer le jour où
c'est fait, et personne ne voit d'ici là un bouton qui échoue.

**Depuis la v302 (4/10/2026), le compte se supprime depuis le jeu** : Profil →
« Supprimer mon compte ». Apple l'exige (5.1.1(v)) pour toute app où l'on crée
un compte. Partent : le compte, la sauvegarde en ligne, les messages, les
groupes (un groupe dont ce compte était propriétaire passe à son plus ancien
admin, à défaut à son plus ancien membre ; un groupe resté vide s'éteint).
Reste : la
progression sur le téléphone — aucune ligne du stockage local n'est touchée, et
la fenêtre de confirmation le dit. La fonction est dans `comptes/table.sql` :
**si la table a été collée avant la v302, il faut la recoller une fois** (elle
se recolle sans risque), sinon le bouton répond « La suppression n'a pas
abouti ». `comptes/essai.sh` vérifie la suppression sur un vrai PostgreSQL.

**Ce point ne descendra dans « Réglés » que le jour où un vrai joueur aura
retrouvé sa progression sur un deuxième téléphone.** Tant que la table n'existe
pas, le risque de perte est intact — du code prêt ne sauve personne.

---

## 3. On ne sait pas ce que les joueurs font

**Le fait.** Aucune mesure d'usage, d'aucune sorte.

**Pourquoi ça compte.** Combien abandonnent à la troisième question ? Quel mode
sert vraiment ? Le mode en ligne trouve-t-il des adversaires ? On répond à tout
ça à l'intuition. Celle de Taylor est bonne, mais elle ne peut pas voir ce que
font cent personnes.

**Quand.** Peu après la connexion au compte.

**Fait quand.** On sait répondre à cinq questions simples avec des chiffres, et
la mesure reste anonyme, minimale et refusable.

---

## 4. Un seul fichier de 2,12 Mo et 14 849 lignes

**Le fait mesuré.** `index.html` fait 2,12 Mo pour 14 849 lignes — tout le CSS,
tout le JS, toutes les questions, toutes les images en base64.

**Pourquoi ça compte.** Deux choses différentes.
*Pour travailler :* ça tient très bien à deux (un humain, un agent). Ça ne
survit pas à un deuxième développeur — tout le monde modifie le même fichier,
le moindre conflit de fusion devient ingérable. C'est le point que personne ne
laisserait passer en revue de code.
*Pour le joueur :* le premier chargement télécharge 2,12 Mo avant de montrer
quoi que ce soit. Le service worker règle les visites suivantes, pas la
première — et la première est celle qui décide si on reste.

**Quand.** Le jour où quelqu'un d'autre touche au code, ou le jour où le
premier chargement devient un problème mesuré. Pas avant : découper un fichier
qui marche, sans raison, c'est du risque gratuit.

**Fait quand.** Les questions et les images sortent du fichier et se chargent à
part (elles pèsent l'essentiel des 2,12 Mo), et le jeu lui-même reste lisible
d'un bloc.

---

## 5. ~~Le sélecteur de décor ne propose qu'un seul décor~~ — J'AVAIS TORT

**Correction.** J'avais annoncé un menu à une seule option. C'est faux, et je
ne l'avais pas vérifié avant de l'écrire : la rangée « Arrière-plan » est déjà
conditionnée à `SCENES.length > 1`. Avec un seul décor, **elle ne s'affiche
pas du tout**. Et elle revient toute seule le jour où un second décor entre
dans le catalogue — rien à se rappeler de remettre.

**La décision, elle, tient : on GARDE la machinerie.** Un jeu qu'on ouvre tous
les jours pendant des mois est exactement ce dont on se lasse en premier par
l'image ; le décor est l'axe de personnalisation le moins cher et le plus
juste de ton (paysages bibliques). Et tout est déjà écrit et éprouvé : deux
cadrages par décor, la texture pré-floutée que le moteur de verre consomme, le
retour au Canyon si un décor disparaît du catalogue. Supprimer du code qui
marche pour le réécrire dans six mois, c'est du risque gratuit.

**Ce qu'il faut pour ajouter un décor** (donc ce n'est plus une dette, c'est du
contenu) : une image dont on détient les droits ou libre de droits, en deux
cadrages — vertical pour le téléphone, horizontal — plus sa version floutée
pour le verre. Le reste est automatique.

---

## 6b. Le toucher sur la croix tient encore le fil vingt millisecondes

**Le fait.** Retirer un joueur du mode Groupe bloque le fil principal 2 à 4 ms
sur un appareil rapide, et **17 à 27 ms avec le processeur bridé six fois** —
soit un à deux téléphones Android d'entrée de gamme. Pendant ce temps l'écran
est figé : rien ne bondit, mais l'animation part en retard, et l'oeil lit « un
cran ». C'est le défaut que Taylor décrit, et la v286 en a retiré la plus
grosse part (le recalage du verre, 15 ms, sorti du gestionnaire de clic ; pire
toucher de 47 à 27 ms).

**Ce qui reste, mesuré jalon par jalon dans `removeTeam`, bridage x6 :**

| segment | ms | |
|---|---|---|
| entrée du gestionnaire | 4 | dispatch, onde d'appui, son |
| `syncTeamRows` + bouton | 4 | |
| relevés de style | 11 | `getComputedStyle` x3 + `offsetHeight` |
| les trois essais muets | 8 | la mesure du résidu |
| pose du pli | 10 | `poser` + relevé du défilement |

**Pourquoi je n'ai pas touché aux essais muets.** Ils mesurent, dans l'état
exact où la ligne va s'animer, les quelques pixels qu'une ligne « à zéro »
occupe encore. J'ai vérifié que ce résidu vaut **0 pour toutes les lignes sauf
la dernière quand « Ajouter » est visible**, où il vaut exactement la marge du
bas (5,83 px à 360, 6,56 à 393, 6,80 à 412) — donc il est prévisible. Mais le
prédire, c'est remettre à côté du DOM un fait qui doit en sortir : c'est
EXACTEMENT la faute qui a produit le saut de verre corrigé en v285 (un nom de
feuille tenu à part qui avait cessé de correspondre). Le mettre en cache
demande de connaître, sans le mesurer, la position de la ligne dans le flux au
moment du repli — avec le bouton « Ajouter » qui renaît replié à zéro dans la
même image. Huit millisecondes ne paient pas ce risque-là aujourd'hui.

**Et le contexte audio.** `getCtx()` construit l'AudioContext à la première
note : **27 ms**, dans le doigt. Ça n'arrive qu'une fois par session, et
presque jamais dans le mode Groupe (les touchers d'avant l'ont déjà créé), mais
c'est le plus gros temps d'arrêt unique du jeu. Le déplacer sur le premier
`pointerdown` le rendrait invisible — à faire, avec la prudence que demande
tout ce qui touche au son sur iOS (point 56 des tâches).

**Le banc :** `banc-essai/joueurs.js` — douze situations, trois écrans, la
géométrie ET le temps d'arrêt.

## 6c. Deux bancs de minutage au bord de leur seuil — pas des défauts du jeu (05/10/2026)

En publiant la v303, la suite s'est arrêtée sur deux bancs, même rejoués
seuls. Ni l'un ni l'autre ne mesure un défaut de la v303 : la comparaison
**A/B avec la v302 publiée, sur la même machine au même moment**, donne la
même chose.

- `joueurs.js`, clic sur la croix, **processeur bridé x6**, seuil 45 ms de
  médiane. Dans ce conteneur, la médiane varie de **29 à 65 ms** d'une manche
  à l'autre. Trois essais chacune : v302 échoue 2 fois sur 3 (médianes 52,8 ·
  32,7 · 47,2 / 37,6 · 43,0 · 39,6 / 50,3 · 41,5 · 45,4), v303 aussi (37,7 ·
  29,2 · 41,0 / 40,9 · 38,4 · 58,3 / 28,6 · 65,1 · 37,4). Moyenne des
  médianes : 43 contre 42 ms. Le bridage x6 multiplie le bruit de la
  machine par six : le seuil a été posé un jour plus calme (17 à 27 ms).
- `entree.js`, « ouvrir Progression », au plus 4 % de l'écran encore dehors à
  250 ms. Machine au calme, trois essais chacune : **3,8 % pour les deux
  versions, à chaque fois** (et la v303 fait mieux à 100 ms : 10,2 % contre
  10,8 à 12 %). Sous charge, les deux montent à 4,8–5,4 %. Progression est
  l'écran le plus haut ; il frôle ce seuil depuis avant la v303.

**Ce qui comptera comme fait.** Un banc de minutage doit se juger contre la
version publiée, sur la même machine, dans la même minute — pas contre un
seuil absolu posé un autre jour. Les deux bancs devraient mesurer l'ÉCART à
la version de référence, ou rejouer chaque manche jusqu'à une médiane stable.
D'ici là : un rouge de ces deux-là se vérifie par un A/B, comme ici, avant
d'être cru.

---

## 6. Aucun audit d'accessibilité

**Le fait.** Contrastes, lecteurs d'écran, taille de texte dynamique : jamais
vérifiés. Des `aria-label` existent, posés au fil de l'eau, sans relecture
d'ensemble.

**Pourquoi ça compte.** Un texte clair sur du verre clair peut passer sous le
seuil lisible sans que personne ne le remarque — sauf ceux qui en ont besoin.
Et l'App Store comme le Play Store regardent ce point.

**Quand.** Avant les stores.

**Fait quand.** Un banc mesure les contrastes réels sur chaque écran, et un
passage au lecteur d'écran a été fait de bout en bout sur un vrai téléphone.

### Où ça en est (27/09/2026)

`banc-essai/acces.js` est écrit et relève trois choses. **Deux sont déjà
sûres** — elles ne photographient rien, elles lisent le DOM :

- **118 cibles tactiles sous 44 x 44 points** (le minimum d'Apple ; Material
  demande 48). Les plus nombreuses sont les deux boutons d'en-tête, **Retour et
  Réglages, à 39 x 39 sur presque tous les écrans** — 5 points de trop peu, sur
  les deux boutons qu'on touche le plus souvent. Viennent ensuite la poignée de
  fermeture des feuilles (56 x 25) et le bouton de langue (58 x 26).
  *Ce n'est pas corrigé* : agrandir ces boutons déplace la composition de tous
  les écrans, et c'est une décision de dessin, pas une réparation mécanique.
- **3 champs sans nom accessible** : les deux champs de nom d'équipe du Mode
  Groupe, et le champ de nom du Profil. Un lecteur d'écran annonce « champ de
  texte » sans dire lequel. Celui-là est petit et sans risque.

**La troisième — les contrastes — n'est PAS fiable, et le banc le dit.** Il
photographie chaque écran avec tout le texte rendu transparent pour lire le
fond réel sous chaque mot (le verre rend tout calcul théorique faux). Mais huit
écrans « bougent pendant la photo » : le relevé des boîtes et l'image ne
décrivent alors pas le même instant, et les 195 « défauts » annoncés
contiennent des rectangles tombés entre deux cartes, sur le décor. J'ai cru
trois fois tenir la cause et je me suis trompé trois fois.

Le banc est donc **hors de la batterie** (`CHANTIERS` dans `banc-essai/tous.sh`)
tant qu'il n'est pas sûr. Un banc qui crie à tort finit par être ignoré : c'est
exactement ce qui était arrivé à `lisible` et `fondu`.

---

## 7. Les règles d'accès du mode en ligne n'ont pas été auditées

**Le fait.** La clé publique Supabase est dans le code — c'est normal et prévu
pour. Ce qui protège vraiment les données, ce sont les règles d'accès côté
serveur, et elles n'ont pas été relues dans cette session.

**Pourquoi ça compte.** Le jour où un compte porte la progression d'un joueur,
une règle trop permissive laisse n'importe qui lire ou écrire chez les autres.

**Ce que j'ai trouvé en écrivant la table des comptes.** La politique actuelle
de `push_subs` est `for all to anon using (true) with check (true)` :
**n'importe qui peut lire, modifier et supprimer toutes les lignes**. Le
commentaire d'origine l'assumait, en s'appuyant sur le fait qu'aucune donnée
personnelle n'y est stockée. Deux nuances aujourd'hui :

- la LECTURE permet d'énumérer tous les abonnements, donc les clés de
  chiffrement de chaque appareil. Envoyer une notification reste impossible
  sans la clé privée VAPID, qui ne quitte pas le serveur — mais il n'y a aucune
  raison de laisser lire.
- la SUPPRESSION permet de vider la table : tous les joueurs perdraient leurs
  rappels, en silence.

`comptes/table.sql` retire la lecture (ce qui supprime l'énumération) et garde
l'écriture. La suppression en masse reste théoriquement possible tant qu'il n'y
a pas d'identité — c'est réglé pour de bon quand chaque abonnement sera
rattaché à un compte.

**Ce que j'ai trouvé ENSUITE, en relisant ma propre table des comptes.** Elle
avait exactement le défaut contre lequel elle est censée protéger. La fonction
`poser_sauvegarde()` refuse d'écraser une version plus récente que celle qu'on
a lue — c'est elle qui rend la perte de progression impossible. Mais je
laissais AUSSI une politique `for update` : n'importe quelle écriture directe
(`.update()` depuis le téléphone) contournait le contrôle et pouvait écraser.
La protection reposait donc sur ma discipline, pas sur le serveur.

Corrigé : la table n'a plus aucune politique d'écriture. On écrit uniquement
par la fonction, devenue `security definer` avec `search_path = ''`, qui
vérifie le jeton, n'écrit que sur la ligne de son appelant, et refuse une
sauvegarde qui ne serait pas un objet. Les droits de table `insert/update/
delete` sont retirés à `anon` et `authenticated` par-dessus : deux serrures.

**Et le SQL n'est plus installé sur parole.** `comptes/essai.sh` monte un vrai
PostgreSQL 16 jetable, y recrée le décor de Supabase (schéma `auth`, fonction
`auth.uid()`, rôles `anon` et `authenticated`), applique le fichier et vérifie
les sept propriétés qui comptent — dont « deux téléphones écrivent en même
temps, le retardataire n'efface rien » et « l'écriture directe est refusée,
même à son propriétaire ».

**Les groupes (v302) sont partis de ces deux leçons.** Aucune table des
groupes n'a de politique d'écriture, et les droits `insert/update/delete` sont
retirés : tout passe par des fonctions `security definer` à `search_path = ''`
qui vérifient avant d'écrire. Les règles de lecture font qu'un membre ne lit que
ses groupes, et ne reçoit plus rien d'une personne bloquée. Le direct de
Supabase applique ces règles à chaque abonné, SAUF pour une suppression : seule
la table `messages` est diffusée, et un message n'est jamais effacé en direct
— il est masqué, ce qui est une modification, donc filtrée. `groupes/essai.sh`
le vérifie sur un vrai PostgreSQL 16 (155 vérifications, dont les
tentatives de contournement : écrire directement, lire le groupe d'un autre,
promouvoir le propriétaire, se débannir), et `banc-essai/groupes.js` joue deux
téléphones de bout en bout sur ce même SQL.

**Quand.** En même temps que la table des comptes (#37), pas après.

---

## 8. Yada n'est pas sur les stores, et « demain » n'est pas possible

**Le fait.** C'est une application web installable, pas une application native.

**Pourquoi ça compte.** Le Play Store accepte ce genre d'app via un habillage
standard. L'App Store refuse en règle générale les simples habillages de site
web : il exige un apport natif réel. On en a deux — les notifications et le
fonctionnement hors ligne — donc c'est jouable, mais ça se prépare, ça ne
s'improvise pas la veille.

**Ce qui est en place depuis la v302** (ce que les deux stores exigent d'une
app où les gens écrivent) : un filtre avant publication, signaler un message,
un membre ou un groupe, bloquer quelqu'un, des règles acceptées avant
d'écrire, une file de modération, la suppression du compte dans l'app, une
page de confidentialité, un âge minimum déclaré (13 ans). Le détail, et où
c'est dans le jeu : `groupes/LISEZMOI.md`.

**Ce qui manque encore pour une fiche de store.**

- **Un moyen de contact publié** (une adresse e-mail de support). Il me faut
  celle que Taylor veut afficher.
- **La politique de confidentialité à une adresse web** : les deux stores
  demandent un lien, pas une page dans l'app. Une page `confidentialite.html`
  sur le même site suffira, avec le même texte.
- **L'habillage lui-même** (TWA pour Android, enveloppe native pour iOS), les
  captures, la fiche. Rien de tout ça n'est commencé.

**Quand.** Après les points 1, 2 et 6.

---

## 10. Les groupes reposent sur une personne qui modère

**Le fait.** Le serveur filtre seul ce qui peut l'être (mots, coordonnées
dans les groupes publics, débit) et masque seul un message signalé par trois
personnes. Tout le reste attend un modérateur : aujourd'hui, Taylor seul.

**Pourquoi ça compte.** Un message blessant signalé une fois reste visible
jusqu'à ce que quelqu'un ouvre la file. Les groupes publics mettent en
présence des inconnus, et des mineurs. Apple (1.2) et Google demandent d'agir
vite sur un signalement. Depuis la v302, un modérateur le voit en ouvrant le
jeu (une pastille sur le bouclier, et dans l'onglet Groupes de l'accueil) — mais
rien ne le prévient tant que le jeu reste fermé.

**Une limite connue.** Un bannissement tient à un compte, pas à une
personne : un banni peut revenir avec une autre adresse e-mail, comme sur tout
service qui ne demande pas de pièce d'identité. Il peut aussi supprimer son
compte et le recréer avec la MÊME adresse, puisque la suppression efface tout,
bannissement compris. Ce second chemin se fermerait en gardant, à la
suppression d'un compte banni, une empreinte de son adresse (pas l'adresse)
qui rebannit à l'inscription — et en le disant dans la page de
confidentialité. Le premier reste ouvert quoi qu'on fasse.

**Quand.** Avant `groupes_ouverts = true` : au moins deux modérateurs. Une
alerte hors du jeu (notification ou e-mail) quand un signalement arrive, dès
que les groupes publics comptent des inconnus. L'empreinte des bannis, le jour
où un banni revient.

**Ce qui comptera comme « fait ».** Un signalement fait sur un vrai téléphone
arrive chez un modérateur même quand son jeu est fermé.

---

## En attente d'une mesure sur un vrai téléphone

Ce ne sont pas des dettes mais des défauts signalés que mon instrument ne
reproduit pas. Ils attendent un chiffre venu de l'appareil.

- **Le rebond des feuilles à l'ouverture.** Sept hypothèses mesurées, sept
  réfutées en sans-tête (coût de l'image à l'arrêt, remontée du panneau,
  démontage de couche composée, hauteur, voile, décor qui traînerait, résidu de
  pixels). Une sonde est embarquée : ouvrir le jeu une fois avec `?sonde=1`,
  ouvrir un menu, photographier le cadre noir. `?sonde=0` l'éteint.
- **Mode Groupe sur Android** : l'ajout et le retrait de joueurs « bugue un peu
  à certains moments », et le clavier aussi. Pas encore reproduit.

---

## Réglés

### 2. La remontée d'erreur — v277, 22 septembre 2026

**C'était.** Zéro `window.onerror` dans tout le code, et 111 blocs `try/catch`.
Le jeu ne s'arrêtait jamais, et c'est exactement pour ça que tout échec était
silencieux : le seul capteur, c'était Taylor qui joue.

**C'est.** Les deux portes par où une erreur sort d'elle-même sont branchées
(`error`, `unhandledrejection`). Ce qui est pris se range sur le téléphone,
dédoublonné par message et par ligne — cent fois la même panne fait UNE ligne
avec son compte —, vingt au maximum, et part à l'ouverture suivante. Hors
ligne, rien ne se perd et rien ne bloque.

Ce qui part : le message, l'endroit dans le fichier, l'écran, la version du
jeu, la langue, une signature d'appareil grossière. Ce qui ne part jamais : le
nom, l'adresse, le score, les réponses, et aucun identifiant qui suivrait
quelqu'un d'une fois sur l'autre. `banc-essai/erreurs.js` ne le lit pas dans le
code : il provoque de vraies pannes et cherche le nom du joueur dans ce qui est
RÉELLEMENT écrit. Réglages → « Signaler les problèmes » coupe tout, et efface
ce qui attendait.

Ce qui ne remonte pas, et c'est mesuré : une ressource venue d'ailleurs (le
script de Supabase sur son CDN, une police). Elle ne manque que pour une
raison — le réseau du joueur —, et hors ligne c'était la première ligne du
rapport de tout le monde.

**Il reste une commande à passer**, trente secondes : coller `erreurs/table.sql`
dans l'éditeur SQL de Supabase. Tant qu'elle n'y est pas, les erreurs
s'accumulent sur les téléphones et repartiront le jour où elle y sera — rien
n'est perdu, rien n'est envoyé.

### 9. Une seule langue — v271, 21 septembre 2026

Trois langues complètes : français, anglais, espagnol. Interface, 1545
questions, faits, noms de livres, références et Bibles propres à chaque langue
(KJV/ASV/WEB, Reina-Valera 1909 et 1865). Chaque joueur ne télécharge que la
banque de SA langue (`banc-essai/socle.js`), et trois bancs tiennent la
promesse : `traductions.js` (les barrières statiques), `langues-ecrans.js`
(125 écrans par langue, pas un mot de français hors de sa place) et
`questions-langues.js` (les 1545 alignements comparés un par un).

