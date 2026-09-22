# Quand ça casse chez un joueur

Le jeu compte cent onze blocs `try/catch`. C'est une force — rien ne s'arrête
brutalement — et c'est exactement pour ça que **tout échec est silencieux**.
Un bouton qui ne répond plus sur un modèle de téléphone précis peut durer des
mois sans que personne ne l'apprenne.

Ce dossier contient la seule chose qui manquait : l'endroit où l'erreur arrive.

## Ce qu'il y a à faire (une fois)

1. Ouvre l'éditeur SQL de Supabase (Project → SQL Editor).
2. Colle `erreurs/table.sql` en entier, exécute.
3. C'est tout. Le jeu envoie déjà : tant que la table n'existait pas, les
   erreurs restaient sur le téléphone des joueurs et repartaient à chaque
   ouverture — rien n'a été perdu, rien n'a été envoyé non plus.

## Ce qui part, et ce qui ne partira jamais

**Ce qui part** : le message de l'erreur, l'endroit dans le fichier, l'écran où
on était, la version du jeu, la langue, et une signature d'appareil grossière
(« Android 13 · Chrome · Redmi Note 12 »).

**Ce qui ne part pas** : le nom, l'adresse, le score, les réponses, et aucun
identifiant qui suivrait quelqu'un d'une fois sur l'autre. Deux erreurs venues
du même téléphone ne peuvent pas être rapprochées — c'est voulu.

`banc-essai/erreurs.js` ne le lit pas dans le code : il provoque de vraies
pannes, lit ce qui est RÉELLEMENT écrit sur le téléphone, et y cherche le nom
du joueur, sa couleur et sa clé de profil.

## Ce qui ne remonte pas, et pourquoi

Une ressource qui vient d'ailleurs — le script de Supabase sur son CDN, une
police — ne manque que pour une raison : le réseau du joueur. Ce n'est pas une
panne du jeu, c'est le métro. Mesuré au banc : hors ligne, c'était la première
ligne du rapport de tout le monde.

## Pour lire

Depuis le tableau de bord Supabase, ou en SQL — la requête de regroupement est
écrite en bas de `table.sql`. La clé publique du jeu ne peut pas les lire :
elle ne sait que déposer.

## L'interrupteur

Réglages → « Signaler les problèmes ». Allumé par défaut, et c'est le point :
celui à qui le jeu casse est justement celui qui n'ira pas dans les Réglages
l'activer. Éteint, plus rien ne part — et ce qui attendait est effacé.
