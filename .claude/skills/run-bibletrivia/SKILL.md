---
name: run-bibletrivia
description: Lancer, piloter, tester et photographier BibleTrivia en headless — run the app, take screenshots, drive real flows (solo game, settings), evaluate JS in the live page, smoke-test after a change. Use whenever asked to run/start/screenshot/verify the app.
---

# Lancer et piloter BibleTrivia

BibleTrivia est une PWA mono-fichier : **tout est dans `index.html`**
(CSS + JS inline, ~1 Mo). Aucun build, aucun serveur, aucune dépendance à
installer : on l'ouvre en `file://` dans le Chromium fourni, piloté par
Playwright. Les chemins ci-dessous sont relatifs à la racine du dépôt.

## Chemin agent (le seul utile en headless)

Le pilote est `.claude/skills/run-bibletrivia/driver.mjs`. Il démarre
toujours pareil : viewport iPhone 402×874 @2x **tactile**, attente du
splash (~4,5 s), puis neutralisation du plein-écran-au-premier-toucher.

```bash
# Santé complète : syntaxe du script inline + boot + écran d'accueil + capture
node .claude/skills/run-bibletrivia/driver.mjs smoke
# -> SYNTAXE OK / écran : mode | attendu : mode / capture : /tmp/bibletrivia-smoke.png
#    code retour 0 si tout est bon (1 sinon) — à lancer après CHAQUE modification

# Vraie partie jouée par l'interface (tape Mode Solo, Commencer la partie,
# répond à la question 1, attend la révélation) puis capture
node .claude/skills/run-bibletrivia/driver.mjs play /tmp/play.png
# -> état : {"screen":"play","revealed":true,"question":1}

# Capture d'un écran quelconque : instructions JS exécutées dans la page
# (corps de fonction async), 0,9 s de pose, puis photo
node .claude/skills/run-bibletrivia/driver.mjs shot /tmp/reglages.png "openSettings()"

# Évaluer une EXPRESSION dans la page vivante et récupérer du JSON
node .claude/skills/run-bibletrivia/driver.mjs eval "({ ecran: state.screen, questions: BANK.facile.length + BANK.moyen.length + BANK.difficile.length })"
# -> {"ecran":"mode","questions":1012}
```

Vérification rapide sans navigateur (la même qu'exécute `smoke`) :

```bash
node -e "const h=require('fs').readFileSync('index.html','utf8');const s=[...h.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).sort((a,b)=>b.length-a.length)[0];new Function(s);console.log('SYNTAXE OK')"
```

## Chemin humain

Ouvrir `index.html` dans un navigateur, c'est tout. Sur iPhone, l'app se
joue installée sur l'écran d'accueil (PWA). Inutile en conteneur headless.

## Prérequis

Rien à installer dans le conteneur Anthropic : Chromium est à
`/opt/pw-browsers/chromium` et Playwright à
`/opt/node22/lib/node_modules/playwright` — le pilote trouve les deux tout
seul (surcharges possibles : `PW_CHROMIUM`, `PLAYWRIGHT_DIR`).
Ne PAS lancer `playwright install`.

## Pièges (tous rencontrés pour de vrai)

- **Splash de ~4,5 s au boot.** Cliquer avant, c'est cliquer dans le vide
  (TimeoutError sur `text=Mode Solo`). Le pilote attend déjà.
- **L'écran d'accueil s'appelle `mode`, pas `home`.** `state.screen` prend
  `splash | mode | solo | group | play | end | profile | online…`. Une clé
  inconnue fait tomber `render()` sur l'écran de FIN — si une capture montre
  « Partie terminée » sortie de nulle part, c'est ça.
- **Le premier toucher demande le plein écran.** Toute interaction souris
  part en `requestFullscreen` et avale le geste. Le pilote pose
  `document.documentElement.requestFullscreen = null` après le boot.
- **Relâcher un appui sur une carte = navigation.** Pour photographier
  l'état « enfoncé » sans naviguer : `mouse.down()`, capturer, puis
  `mouse.move()` AILLEURS avant `mouse.up()` (drag-off).
- **`pointer:coarse` exigé par certains écrans.** Le verrou paysage
  (`#rotate-lock`) n'apparaît que si le contexte a `hasTouch:true` (le
  pilote l'active). Sans lui, passer en 874×402 ne montre rien.
- **Ne PAS ouvrir `state.screen="online"` dans une sonde.** Supabase est
  configuré en dur : le conteneur rejoindrait le VRAI salon de présence des
  joueurs. Tester la logique du lobby sur un fragment DOM synthétique.
- **L'audio est suspendu sans geste utilisateur.** `getCtx()` marche, les
  gains sont lisibles, mais rien ne sonne — normal en headless.
- **Le fichier contient de VRAIS U+00A0** (typographie française « ! ? : »).
  Un outil d'édition par chaîne exacte doit reproduire l'octet, pas
  l'entité `&nbsp;`.
- **Les chips du chrono portent `data-group="tmr"`** (pas `"timer"`).
- **L'effet de verre iOS ne se valide pas ici.** La couche `.glass-refl`
  (transform compositeur) s'observe en Chromium via `el._refl.style.opacity`
  / `.transform`, mais le rendu image-par-image pendant un geste est un
  comportement Safari iOS : seule une vérification sur iPhone fait foi.

## Dépannage

- `TimeoutError: waiting for locator('text=…')` → cliqué pendant le splash,
  ou libellé changé dans `index.html` (les libellés sont en français).
- `playwright introuvable` → hors du conteneur Anthropic, faire
  `npm i playwright` puis relancer (ou `PLAYWRIGHT_DIR=…`).
- Capture noire/vide → `page.goto` a reçu un chemin relatif ; le pilote
  construit toujours `file://` + chemin absolu de `index.html`.
