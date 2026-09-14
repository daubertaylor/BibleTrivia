# Ce qui ne va pas encore

Liste tenue à jour de ce qui manque ou ce qui est fragile dans Yada. Rien ici
n'est une opinion : chaque point porte le fait mesuré qui le justifie, la
raison pour laquelle il compte, le moment où il faut s'en occuper, et ce qui
comptera comme « fait ».

Relue avant chaque grande étape. Quand un point est réglé, il descend dans
« Réglés » avec la date et le numéro de version.

---

## 1. Les données d'un joueur vivent sur son téléphone, et nulle part ailleurs

**Le fait.** Toute la progression — livres, bonnes réponses, série de flammes,
gels, carnet d'erreurs, succès — est dans le stockage local de l'appareil.
Aucune copie ailleurs.

**Pourquoi ça compte.** Désinstaller l'app efface tout. Changer de téléphone
efface tout. Sur iPhone, iOS peut aussi vider le stockage d'une app web restée
longtemps sans être ouverte. Un joueur qui perd trois mois de série ne revient
pas, et il a raison.

**Quand.** MAINTENANT. C'est la tâche en cours (#37).

**Fait quand.** Un joueur peut se connecter, changer de téléphone, retrouver sa
progression entière — et se connecter n'a JAMAIS pu retirer quoi que ce soit.
Le moteur de fusion est écrit et prouvé (banc `fusion.js`) ; il reste la table
côté serveur et le bouton.

---

## 2. Aucune remontée d'erreur : si ça casse chez un joueur, personne ne le sait

**Le fait mesuré.** Zéro occurrence de `window.onerror` ou d'un écouteur
`error` dans tout le code. Et **111 blocs `try/catch`**.

**Pourquoi ça compte.** Ces 111 blocs sont une force — rien ne casse
brutalement — et exactement pour cette raison, **tout échec est silencieux**.
Un bouton qui ne répond plus sur un modèle de téléphone précis peut durer des
mois sans que personne ne l'apprenne. Aujourd'hui, le seul capteur du jeu,
c'est Taylor qui l'utilise. Ça ne tient plus dès qu'il y a des joueurs.

**Quand.** Avant d'ouvrir le jeu à des gens qu'on ne connaît pas.

**Fait quand.** Une erreur survenue sur le téléphone d'un joueur arrive
quelque part où on la lit, avec la version du jeu, l'écran, et sans aucune
donnée personnelle. Petit, sobre, et désactivable.

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

## 5. Le sélecteur de décor ne propose qu'un seul décor

**Le fait mesuré.** `SCENES.length === 1`.

**Pourquoi ça compte.** Un menu à une seule option est une promesse non tenue :
on ouvre, on choisit ce qui est déjà choisi, on referme. C'est petit, et c'est
exactement le genre de détail qui fait dire « c'est pas fini ».

**Quand.** Vite, c'est peu cher. Soit on ajoute des décors, soit on retire le
sélecteur jusqu'à ce qu'il y en ait.

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

## 9. Une seule langue

**Le fait.** Tout est en français : interface, questions, faits, versets.

**Quand.** Le jour où on vise au-delà du francophone. À noter surtout parce que
ça change la façon d'écrire le code **maintenant** : chaque texte codé en dur
aujourd'hui sera à retrouver plus tard.

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

_(vide pour l'instant — chaque point réglé descend ici avec sa date et sa
version)_
