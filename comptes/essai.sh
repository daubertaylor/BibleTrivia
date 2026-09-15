#!/bin/bash
# ============================================================================
# ON N'INSTALLE PAS DU SQL SUR PAROLE
# ============================================================================
# Ce script monte un vrai PostgreSQL 16 dans un dossier jetable, y recrée le
# décor que Supabase fournit (le schéma auth, la fonction auth.uid(), les rôles
# anon et authenticated), applique comptes/table.sql, et vérifie ce qui compte :
#
#   1. le fichier s'installe sans erreur ;
#   2. un joueur lit et écrit SA ligne ;
#   3. DEUX TÉLÉPHONES qui écrivent en même temps : le retardataire n'efface
#      rien — c'est la garantie « jamais de progression perdue » ;
#   4. l'écriture DIRECTE est refusée, même à son propriétaire (c'est ce qui
#      rend la fonction obligatoire) ;
#   5. un voisin ne voit pas et ne touche pas la ligne d'un autre ;
#   6. un non-connecté ne peut rien faire ;
#   7. une sauvegarde malformée est refusée.
#
# Usage : bash comptes/essai.sh
set -u
# PostgreSQL REFUSE de tourner en root, et il a raison : un serveur qui écrit
# des fichiers ne doit pas pouvoir écrire partout. Si on nous lance en root, on
# se laisse retomber sur un compte ordinaire et on se relance.
ICI=$(cd "$(dirname "$0")/.." && pwd)
if [ "$(id -u)" = "0" ]; then
  exec runuser -u postgres -- bash "$ICI/comptes/essai.sh" "$@"
fi
cd "$ICI" || exit 1
export PATH=/usr/lib/postgresql/16/bin:$PATH
D=$(mktemp -d /tmp/pgessai.XXXXXX)
export PGDATA="$D/data" PGHOST="$D" PGPORT=5433 PGDATABASE=essai
initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null 2>&1 || { echo "initdb a échoué"; exit 1; }
pg_ctl -D "$PGDATA" -o "-k $D -p $PGPORT -c listen_addresses=" -l "$D/log" start >/dev/null 2>&1
for i in $(seq 1 30); do pg_isready -h "$D" -p $PGPORT >/dev/null 2>&1 && break; sleep 0.3; done
createdb -h "$D" -p $PGPORT -U postgres essai 2>/dev/null
Q(){ psql -h "$D" -p $PGPORT -U postgres -d essai -v ON_ERROR_STOP=1 -qtAX "$@"; }

# ---- le décor que Supabase fournit, reproduit au plus juste ----------------
Q -c "
create schema if not exists auth;
create table auth.users (id uuid primary key);
-- auth.uid() de Supabase lit le jeton posé sur la session. On reproduit le
-- mécanisme exactement : un réglage de session, donc quelque chose que le
-- client ne choisit pas lui-même en production.
create function auth.uid() returns uuid language sql stable as \$\$
  select nullif(current_setting('essai.moi', true), '')::uuid \$\$;
create role anon nologin; create role authenticated nologin;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
" >/dev/null 2>&1 || { echo "le décor n'a pas pu être monté"; pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1; rm -rf "$D"; exit 1; }

ko=0
dit(){ if [ "$2" = "$3" ]; then printf '  %-52s %s\n' "$1" "ok"; else printf '  %-52s ATTENDU %s, OBTENU %s\n' "$1" "$3" "$2"; ko=$((ko+1)); fi; }

# ---- 1. le fichier s'installe ---------------------------------------------
if out=$(psql -h "$D" -p $PGPORT -U postgres -d essai -v ON_ERROR_STOP=1 -qX -f "$ICI/comptes/table.sql" 2>&1); then
  printf '  %-52s %s\n' "le fichier s'installe" "ok"
else
  # push_subs n'existe pas dans ce bac à sable : on ne compte pas cette
  # erreur-là, elle est attendue. Toute autre erreur, si.
  reste=$(echo "$out" | grep -v 'push_subs' | grep -i 'erreur\|error')
  if [ -z "$reste" ]; then printf '  %-52s %s\n' "le fichier s'installe (hors push_subs, absente ici)" "ok"
  else printf '  %-52s %s\n' "le fichier s'installe" "NON"; echo "$out" | sed 's/^/      /' | head -20; ko=$((ko+1)); fi
fi

A=11111111-1111-1111-1111-111111111111
B=22222222-2222-2222-2222-222222222222
Q -c "insert into auth.users values ('$A'),('$B');" >/dev/null

# Un joueur connecté : on prend le rôle « authenticated » ET on pose son jeton.
moi(){ printf "set local role authenticated; set local essai.moi = '%s';" "$1"; }

# ---- 2. il écrit puis relit sa ligne --------------------------------------
r=$(Q -c "begin; $(moi $A) select revision from poser_sauvegarde('{\"pts\":10}'::jsonb, 0); commit;")
dit "A crée sa sauvegarde (révision 1)" "$r" "1"
r=$(Q -c "begin; $(moi $A) select donnees->>'pts' from sauvegardes; commit;")
dit "A relit ses points" "$r" "10"

# ---- 3. deux téléphones en même temps --------------------------------------
# Les deux ont lu la révision 1. Le premier écrit, le second arrive après.
r=$(Q -c "begin; $(moi $A) select revision from poser_sauvegarde('{\"pts\":20}'::jsonb, 1); commit;")
dit "1er téléphone écrit (révision 2)" "$r" "2"
r=$(Q -c "begin; $(moi $A) select donnees->>'pts' from poser_sauvegarde('{\"pts\":15}'::jsonb, 1); commit;")
dit "2e téléphone, périmé : n'écrase RIEN" "$r" "20"
r=$(Q -c "begin; $(moi $A) select revision from poser_sauvegarde('{\"pts\":15}'::jsonb, 1); commit;")
dit "  ... et la révision n'a pas bougé" "$r" "2"
# Il refusionne sur ce qu'on vient de lui rendre, et retente avec la bonne.
r=$(Q -c "begin; $(moi $A) select donnees->>'pts' from poser_sauvegarde('{\"pts\":30}'::jsonb, 2); commit;")
dit "  ... il refusionne et repasse" "$r" "30"

# ---- 4. l'écriture directe est refusée -------------------------------------
r=$(Q -c "begin; $(moi $A) update sauvegardes set donnees='{\"pts\":0}'::jsonb where id='$A'; commit;" 2>&1 | grep -ci 'denied\|refus\|permission' )
[ "$r" -ge 1 ] && r=refusée || r=PASSÉE
dit "écriture directe (contourne le contrôle)" "$r" "refusée"
r=$(Q -c "begin; $(moi $A) select donnees->>'pts' from sauvegardes; commit;")
dit "  ... les points sont intacts" "$r" "30"
r=$(Q -c "begin; $(moi $A) delete from sauvegardes where id='$A'; commit;" 2>&1 | grep -ci 'denied\|refus\|permission')
[ "$r" -ge 1 ] && r=refusée || r=PASSÉE
dit "suppression directe" "$r" "refusée"

# ---- 5. le voisin ----------------------------------------------------------
r=$(Q -c "begin; $(moi $B) select count(*) from sauvegardes; commit;")
dit "B ne voit aucune ligne de A" "$r" "0"
r=$(Q -c "begin; $(moi $B) select revision from poser_sauvegarde('{\"pts\":999}'::jsonb, 0); commit;")
dit "B crée la SIENNE (révision 1)" "$r" "1"
r=$(Q -c "begin; $(moi $A) select donnees->>'pts' from sauvegardes; commit;")
dit "  ... celle de A n'a pas bougé" "$r" "30"

# ---- 6. le non-connecté ----------------------------------------------------
r=$(Q -c "begin; set local role anon; select poser_sauvegarde('{}'::jsonb, 0); commit;" 2>&1 | grep -ci 'denied\|permission\|non connecté')
[ "$r" -ge 1 ] && r=refusé || r=PASSÉ
dit "anon ne peut pas appeler la fonction" "$r" "refusé"

# ---- 7. une sauvegarde malformée -------------------------------------------
r=$(Q -c "begin; $(moi $A) select poser_sauvegarde('[1,2,3]'::jsonb, 3); commit;" 2>&1 | grep -ci 'malform')
[ "$r" -ge 1 ] && r=refusée || r=PASSÉE
dit "une sauvegarde qui n'est pas un objet" "$r" "refusée"

pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1; rm -rf "$D"
echo ""; [ $ko -eq 0 ] && echo "  OK" || echo "  $ko défaut(s)"
exit $([ $ko -eq 0 ] && echo 0 || echo 1)
