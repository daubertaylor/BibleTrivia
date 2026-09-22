#!/bin/bash
# ====== TOUS LES BANCS, D'UN COUP ======
# Deux pièges, rencontrés le 22/09/2026 et évités ici une fois pour toutes :
#   — shim.js et hub.js NE SONT PAS DES BANCS. Le premier est un module de
#     page (le client Supabase réduit), le second un serveur temps réel local
#     que d'autres bancs démarrent eux-mêmes. Les lancer en ligne de commande
#     donne « ReferenceError: window is not defined » et un délai dépassé :
#     deux faux échecs qui font perdre une heure.
#   — le parallélisme fausse les bancs de TEMPS. À trois de front, parite.js
#     échouait sur 8 982 pixels ; seul, il est vert. On reste donc à deux, et
#     tout échec est rejoué SEUL avant d'être cru.
# Usage : banc-essai/tous.sh [url]        (défaut : http://127.0.0.1:8099/index.html)
set -u
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
URL="${1:-http://127.0.0.1:8099/index.html}"
NODE=/opt/node22/bin/node
SORTIE="$(mktemp -d /tmp/bancs-XXXX)"
PAS_DES_BANCS="shim hub extraire-questions"

if ! curl -s -o /dev/null --max-time 5 "$URL"; then
  echo "Le serveur ne répond pas sur $URL"
  echo "  (nohup python3 -m http.server 8099 --bind 127.0.0.1 &)   depuis $RACINE"
  exit 2
fi

liste=()
for f in "$RACINE"/banc-essai/*.js; do
  n="$(basename "$f" .js)"
  case " $PAS_DES_BANCS " in *" $n "*) continue;; esac
  liste+=("$f")
done
echo "${#liste[@]} bancs sur $URL"

lancer(){ n="$(basename "$1" .js)"; timeout 420 "$NODE" "$1" "$2" > "$3/$n.txt" 2>&1; echo "$? $n" >> "$3/etats.txt"; }
export -f lancer
printf '%s\n' "${liste[@]}" | xargs -P 2 -I{} bash -c 'lancer "$@"' _ {} "$URL" "$SORTIE"

rouges=$(awk '$1!=0{print $2}' "$SORTIE/etats.txt" | sort)
if [ -z "$rouges" ]; then echo; echo "  TOUT EST VERT — ${#liste[@]} bancs"; exit 0; fi

echo; echo "  on rejoue SEUL ce qui est tombé :"
restants=""
for n in $rouges; do
  printf '    %-22s ' "$n"
  if timeout 420 "$NODE" "$RACINE/banc-essai/$n.js" "$URL" > "$SORTIE/$n.txt" 2>&1
  then echo "vert seul (c'était le parallélisme)"
  else echo "ROUGE"; restants="$restants $n"; fi
done
if [ -z "$restants" ]; then echo; echo "  TOUT EST VERT — ${#liste[@]} bancs"; exit 0; fi
echo; echo "  DÉFAUTS RÉELS :$restants"
for n in $restants; do echo; echo "===== $n ====="; tail -20 "$SORTIE/$n.txt"; done
exit 1
