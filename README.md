# BibleTrivia

Quiz biblique — application web installable (PWA), en un seul fichier
`index.html`. Publiée par GitHub Pages sur
<https://daubertaylor.github.io/BibleTrivia/>.

Déploiement : pousser sur `claude/ios-app-polish-ui-ndgqle`, puis avancer
`main` en avance rapide. **Toujours incrémenter `CACHE` dans `sw.js`** —
sans ça, les appareils continuent de servir l'ancienne version.

Depuis la v130, l'app se met à jour toute seule : au retour d'arrière-plan,
sur l'écran d'accueil, rien d'ouvert, jamais pendant une partie.

---

## À FAIRE — demandé, pas encore commencé

### Connexion simple (type Google)

Idée de Taylor, à traiter plus tard. Aujourd'hui le profil (nom, couleur,
progression, série) vit uniquement dans le `localStorage` de l'appareil :
changer de téléphone, ou vider les données du navigateur, efface tout.

Une connexion permettrait de retrouver sa progression ailleurs. Points à
trancher le moment venu :

- **Ce qu'on synchronise** : progression, série, objectifs, profil. Pas les
  réglages d'appareil (volume, décor), qui sont propres au téléphone.
- **Rester jouable sans compte.** Le jeu doit continuer de fonctionner
  entièrement hors ligne et sans connexion — le compte est un plus, jamais
  une porte d'entrée.
- **Fusion des données** : que faire quand un joueur se connecte alors
  qu'il a déjà une progression locale ? Garder la meilleure des deux, par
  livre et par objectif — jamais écraser (règle de Taylor : *ne jamais
  remettre la progression à zéro*).
- **Où** : Supabase est déjà utilisé pour le mode en ligne et gère
  l'authentification Google — ce serait le même projet, sans service
  supplémentaire.

### Reste de la passe visuelle

- **Espacements** des écrans autres que l'accueil (padding, gaps,
  distances titre/sous-titre).
- **Safe areas** : rapport aux bords, à la Dynamic Island, à la barre du
  bas.

---

## EN ATTENTE DE TAYLOR

### Rappels de série (notifications)

Tout le code est en place et testé ; il manque uniquement les clés et la
table. Voir `notifications/LISEZMOI.md`. Tant que `VAPID_PUBLIC` est vide,
la ligne « Rappel de série » **n'apparaît pas** dans les Réglages — c'est
volontaire, aucune option morte n'est affichée.

---

## NON RÉSOLU

### L'écran se déchire au retour en portrait

Signalé plusieurs fois, jamais reproduit en machine — la rotation de
Chromium est atomique (une image en paysage, la suivante en portrait,
toutes les couches suivent).

Quatre causes ont été éliminées, mesures à l'appui :

| Cause | Vérification |
|---|---|
| Le verre calculé pour le mauvais viewport | 170 images fautives sur 364 → 0 |
| L'échange de photo au redressement | 2 échanges par aller-retour → 0 |
| La hauteur de `#app` périmée | reproduit puis réparé (402 → 874) |
| La mise en page qui se refait couché | debout et couché désormais identiques |

**Hypothèse restante** : l'app maintient en permanence une soixantaine de
couches GPU (chaque surface de verre est promue, chaque couche de flou fait
563×1748 px). À la rotation, iOS doit toutes les re-rastériser ; celles qui
ne le sont pas à temps affichent leur ancien contenu, et l'écran se déchire
le long des frontières de couches. Piste : dé-promouvoir temporairement les
couches pendant la rotation.

Ce qui aiderait le plus : **une vidéo** de la rotation. Elle dirait si
l'écran se coupe *pendant* l'animation ou *après* — deux causes sans
rapport, indiscernables sur une photo.
