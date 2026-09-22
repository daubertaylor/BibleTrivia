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

**Quand.** En même temps que la table des comptes (#37), pas après.

---

## 8. Yada n'est pas sur les stores, et « demain » n'est pas possible

**Le fait.** C'est une application web installable, pas une application native.

**Pourquoi ça compte.** Le Play Store accepte ce genre d'app via un habillage
standard. L'App Store refuse en règle générale les simples habillages de site
web : il exige un apport natif réel. On en a deux — les notifications et le
fonctionnement hors ligne — donc c'est jouable, mais ça se prépare, ça ne
s'improvise pas la veille.

**Quand.** Après les points 1, 2 et 6.

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

