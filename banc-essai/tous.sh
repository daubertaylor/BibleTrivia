#!/bin/bash
# ====== TOUS LES BANCS, D'UN COUP ======
# Quatre pièges, tous rencontrés le 22/09/2026 en écrivant ce lanceur, et
# évités ici une fois pour toutes. Ils se ressemblent : chacun fabriquait des
# rouges qui n'avaient rien à voir avec le jeu.
#
#   1. shim.js et hub.js NE SONT PAS DES BANCS. Le premier est un module de
#      page (le client Supabase réduit), le second un serveur temps réel local
#      que d'autres bancs démarrent eux-mêmes. Lancés en ligne de commande :
#      « ReferenceError: window is not defined » et un délai dépassé. Même
#      chose pour leurs cousins des groupes, shim-groupes.js (le client) et
#      faux-serveur-groupes.js (un vrai PostgreSQL derrière un faux Supabase),
#      et brouillon.js, qui dit seulement aux autres où poser leurs fichiers.
#
#   2. LE PARALLÉLISME FAUSSE LES BANCS DE TEMPS. À trois de front, parite.js
#      annonçait 8 982 pixels d'écart entre Android et iOS ; seul, il est vert
#      et l'écran est identique. On reste donc à deux, et tout échec est rejoué
#      SEUL avant d'être cru.
#
#   3. UNE VARIABLE NON EXPORTÉE EST VIDE DANS LE SOUS-SHELL. Ma première
#      version passait par une fonction exportée qui lisait $NODE ; xargs
#      lançait « timeout 420 "" … » et les 94 bancs sortaient en 127. Le
#      lanceur les rejouait ensuite un par un, donc le verdict final restait
#      juste — mais la passe parallèle ne servait à rien et RIEN NE LE DISAIT.
#      Tout ce dont le sous-shell a besoin lui est passé EN ARGUMENT, et une
#      passe intégralement rouge est désormais refusée comme telle : 94 bancs
#      indépendants ne tombent jamais ensemble, c'est le lanceur qui est cassé.
#
#   4. TOUS LES BANCS N'ATTENDENT PAS UNE URL. syntaxe.js, traductions.js et
#      rappels.js prennent un CHEMIN DE FICHIER en argument. Leur donner une
#      URL les faisait mourir sur « EISDIR ». On ne transmet donc l'URL qu'aux
#      bancs qui en déclarent une par défaut ; les autres tournent sans
#      argument, sur leurs propres valeurs.
#
# Usage : banc-essai/tous.sh [url]        (défaut : http://127.0.0.1:8099/index.html)
set -u
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
URL="${1:-http://127.0.0.1:8099/index.html}"
NODE=/opt/node22/bin/node
SORTIE="$(mktemp -d /tmp/bancs-XXXX)"
PAS_DES_BANCS="shim hub extraire-questions faux-serveur-groupes shim-groupes brouillon"
# CHANTIERS : des bancs commencés dont la MESURE n'est pas encore fiable. Ils
# ne gardent rien tant qu'ils se trompent, et un banc qui crie à tort finit
# par être ignoré — c'est exactement ce qui est arrivé à lisible et fondu.
# On les tient donc hors de la porte, nommément, jusqu'à ce qu'ils tiennent
# debout. Les laisser rouges dans la batterie reviendrait à s'habituer au
# rouge ; les supprimer reviendrait à perdre le travail.
#   acces : l'audit d'accessibilité. Ses mesures de CONTRASTE reposent sur une
#   photo de l'écran sans son texte, et huit écrans « bougent pendant la
#   photo » — le relevé et l'image ne décrivent alors pas le même instant.
#   Ses deux autres relevés, eux, sont déjà sûrs (ils ne photographient rien) :
#   voir DETTE.md point 6.
CHANTIERS="acces"

# OÙ LES BANCS POSENT CE QU'ILS FABRIQUENT (banc-essai/brouillon.js) : le
# même dossier pour tous, BANC_TMP s'il est donné, sinon un dossier à eux
# dans le temporaire de la machine.
export BANC_TMP="${BANC_TMP:-${TMPDIR:-/tmp}/yada-bancs}"
mkdir -p "$BANC_TMP"

# CINQ BANCS SERVENT UNE COPIE DE supabase-js (leur constante SUPA). Sans
# elle, le mode en ligne se croit « non configuré », et une trentaine de
# phrases ne s'affichent plus — des rouges qui n'ont rien à voir avec le jeu.
# On la reprend si elle manque (un dossier temporaire se vide).
SUPA="${SUPA_UMD:-$BANC_TMP/supabase.js}"
if [ ! -s "$SUPA" ]; then
  mkdir -p "$(dirname "$SUPA")"
  curl -sSL --max-time 60 "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" -o "$SUPA" \
    || echo "supabase.js introuvable ($SUPA) : cinq bancs vont échouer"
fi

if ! curl -s -o /dev/null --max-time 5 "$URL"; then
  echo "Le serveur ne répond pas sur $URL"
  echo "  (nohup python3 -m http.server 8099 --bind 127.0.0.1 &)   depuis $RACINE"
  exit 2
fi
[ -x "$NODE" ] || { echo "node introuvable : $NODE"; exit 2; }

liste=()
for f in "$RACINE"/banc-essai/*.js; do
  n="$(basename "$f" .js)"
  case " $PAS_DES_BANCS " in *" $n "*) continue;; esac
  case " $CHANTIERS " in *" $n "*) continue;; esac
  liste+=("$f")
done
total=${#liste[@]}
# Un banc reçoit l'URL s'il en déclare une par défaut ; sinon il tourne nu.
prend_url(){ grep -q "process\.argv\[2\][^;]*http" "$1"; }
avec=0; for f in "${liste[@]}"; do prend_url "$f" && avec=$((avec+1)); done
echo "$total bancs — $avec reçoivent $URL, $((total-avec)) tournent sur leurs propres valeurs"
[ -n "$CHANTIERS" ] && echo "  (hors batterie, chantier en cours :$CHANTIERS — voir DETTE.md)"

# Tout est passé en argument : $1 node, $2 banc, $3 url, $4 dossier de sortie.
printf '%s\n' "${liste[@]}" | xargs -P 2 -I{} bash -c '
  n="$(basename "$2" .js)"
  if grep -q "process\.argv\[2\][^;]*http" "$2"
  then timeout 420 "$1" "$2" "$3" > "$4/$n.txt" 2>&1
  else timeout 420 "$1" "$2"      > "$4/$n.txt" 2>&1
  fi
  echo "$? $n" >> "$4/etats.txt"' _ "$NODE" {} "$URL" "$SORTIE"

rouges=$(awk '$1!=0{print $2}' "$SORTIE/etats.txt" 2>/dev/null | sort)
nb=$(printf '%s\n' $rouges | grep -c .)
if [ "$nb" -eq "$total" ]; then
  echo
  echo "  LE LANCEUR EST CASSÉ, PAS LE JEU : les $total bancs sont tombés."
  echo "  Un échec universel vient du lanceur (chemin, serveur, variable vide),"
  echo "  jamais de $total bancs indépendants. Premier relevé :"
  tail -6 "$SORTIE/$(printf '%s\n' $rouges | head -1).txt"
  exit 3
fi
if [ -z "$rouges" ]; then echo; echo "  TOUT EST VERT — $total bancs"; exit 0; fi

echo; echo "  on rejoue SEUL ce qui est tombé :"
restants=""
for n in $rouges; do
  printf '    %-22s ' "$n"
  b="$RACINE/banc-essai/$n.js"
  if prend_url "$b"; then timeout 420 "$NODE" "$b" "$URL" > "$SORTIE/$n.txt" 2>&1
  else                    timeout 420 "$NODE" "$b"        > "$SORTIE/$n.txt" 2>&1; fi
  if [ $? -eq 0 ]; then echo "vert seul (c'était le parallélisme)"
  else echo "ROUGE"; restants="$restants $n"; fi
done
if [ -z "$restants" ]; then echo; echo "  TOUT EST VERT — $total bancs"; exit 0; fi
echo; echo "  DÉFAUTS RÉELS :$restants"
for n in $restants; do echo; echo "===== $n ====="; tail -20 "$SORTIE/$n.txt"; done
exit 1
