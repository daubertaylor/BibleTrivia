#!/bin/bash
# ============================================================================
# LES GROUPES : ON N'INSTALLE PAS DU SQL SUR PAROLE
# ============================================================================
# Comme comptes/essai.sh : un vrai PostgreSQL 16 dans un dossier jetable, le
# décor que Supabase fournit (auth.users, auth.uid(), les rôles anon et
# authenticated, la publication du direct), puis comptes/table.sql et
# groupes/table.sql — deux fois chacun, et comptes/ en DERNIER : on recolle
# souvent un fichier qu'on a déjà collé, et dans n'importe quel ordre. Et on
# joue, avec cinq personnes, tout ce qui compte :
#
#   1. tant que les groupes sont fermés, seuls les modérateurs y entrent ;
#   2. un profil, des règles acceptées et 13 ans déclarés avant d'entrer ;
#   3. un groupe privé ne s'ouvre qu'avec son code, un public se trouve ;
#   4. le filtre : mots interdits (même déguisés), coordonnées dans un public,
#      débit — et les mots bibliques qui doivent passer, passent ;
#   5. personne n'écrit directement dans une table, personne n'appelle une
#      fonction interne, un non-connecté ne fait rien ;
#   6. bloquer : les messages disparaissent pour celui qui bloque, seulement ;
#   7. signaler : trois personnes masquent un message, le texte part en lieu
#      sûr, la modération le rend ou bannit ;
#   8. les rôles : un admin fait taire, exclut, bannit un membre — jamais le
#      propriétaire ; le propriétaire qui part passe la main ;
#   9. les non-lus, la découverte, le code qu'on change, le groupe supprimé ;
#  10. supprimer son compte emporte tout ce qui est à soi, et ses groupes
#      passent au suivant ;
#  11. le direct ne diffuse que les messages.
#
# Usage : bash groupes/essai.sh
set -u
ICI=$(cd "$(dirname "$0")/.." && pwd)
if [ "$(id -u)" = "0" ]; then
  exec runuser -u postgres -- bash "$ICI/groupes/essai.sh" "$@"
fi
cd "$ICI" || exit 1
export PATH=/usr/lib/postgresql/16/bin:$PATH
D=$(mktemp -d /tmp/pgessai.XXXXXX)
export PGDATA="$D/data" PGHOST="$D" PGPORT=5434 PGDATABASE=essai
# EN UTF-8, COMME SUPABASE. Sans cela, la base prend l'encodage du conteneur
# (SQL_ASCII) : un « é » y compte pour deux, et le filtre, qui remplace lettre
# pour lettre, se décale — l'essai mentirait dans les deux sens.
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null 2>&1 || { echo "initdb a échoué"; exit 1; }
pg_ctl -D "$PGDATA" -o "-k $D -p $PGPORT -c listen_addresses=" -l "$D/log" start >/dev/null 2>&1
for i in $(seq 1 30); do pg_isready -h "$D" -p $PGPORT >/dev/null 2>&1 && break; sleep 0.3; done
createdb -h "$D" -p $PGPORT -U postgres essai 2>/dev/null
Q(){ psql -h "$D" -p $PGPORT -U postgres -d essai -v ON_ERROR_STOP=1 -qtAX "$@"; }
fin(){ pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1; rm -rf "$D"; }

# ---- le décor que Supabase fournit -----------------------------------------
Q -c "
create schema if not exists auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as \$\$
  select nullif(current_setting('essai.moi', true), '')::uuid \$\$;
create role anon nologin; create role authenticated nologin;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
-- Supabase crée cette publication vide ; le fichier y ajoute ses tables.
create publication supabase_realtime;
-- La table des rappels existe déjà chez Supabase : comptes/table.sql la corrige.
create table public.push_subs (endpoint text primary key);
alter table public.push_subs enable row level security;
" >/dev/null 2>&1 || { echo "le décor n'a pas pu être monté"; fin; exit 1; }

ko=0
dit(){ if [ "$2" = "$3" ]; then printf '  %-62s %s\n' "$1" "ok"; else printf '  %-62s ATTENDU %s, OBTENU %s\n' "$1" "$3" "$2"; ko=$((ko+1)); fi; }
titre(){ printf '\n  — %s\n' "$1"; }

# ---- 0. les fichiers s'installent, et se recollent -------------------------
titre "installation"
for f in comptes/table.sql groupes/table.sql groupes/table.sql comptes/table.sql; do
  if out=$(psql -h "$D" -p $PGPORT -U postgres -d essai -v ON_ERROR_STOP=1 -qX -f "$ICI/$f" 2>&1); then
    dit "$f s'installe" "ok" "ok"
  else
    dit "$f s'installe" "NON" "ok"; echo "$out" | sed 's/^/      /' | head -20
    fin; exit 1
  fi
done

A=aaaaaaaa-0000-4000-8000-000000000001   # Taylor, modérateur du jeu
B=bbbbbbbb-0000-4000-8000-000000000002
C=cccccccc-0000-4000-8000-000000000003
E=eeeeeeee-0000-4000-8000-000000000004
F=ffffffff-0000-4000-8000-000000000005
Q -c "insert into auth.users values ('$A','a@essai'),('$B','b@essai'),('$C','c@essai'),('$E','e@essai'),('$F','f@essai');" >/dev/null

moi(){ printf "set local role authenticated; set local essai.moi = '%s';" "$1"; }
# R <qui> <requête> : la requête, au nom de quelqu'un, dans sa transaction.
R(){ Q -c "begin; $(moi "$1") $2; commit;" 2>&1 | head -1; }
# Ce que dit une fonction : « ok », ou le code d'erreur qu'elle rend.
F_(){ R "$1" "select case when (x->>'ok')::boolean then 'ok' else x->>'erreur' end from (select $2 as x) s"; }
refuse(){ if echo "$1" | grep -qi 'denied\|permission'; then echo refusé; else echo "PASSÉ($1)"; fi; }
# Les messages vieillissent de deux secondes : le débit ne gêne pas l'essai
# suivant (une seconde entre deux messages d'une même personne).
vieillir(){ Q -c "update public.messages set cree_le = cree_le - interval '2 seconds';" >/dev/null; }

# ---- 1. fermé : seuls les modérateurs ---------------------------------------
titre "fermé à tous sauf aux modérateurs"
dit "B voit les groupes fermés" "$(R $B "select mon_etat_groupes()->>'participe'")" "ferme"
dit "B ne peut pas créer de groupe" "$(F_ $B "creer_groupe('Les amis', '', false, 'fr', 0)")" "ferme"
Q -c "insert into public.moderateurs values ('$A');" >/dev/null
dit "A, modérateur, sans profil" "$(R $A "select mon_etat_groupes()->>'participe'")" "sans_profil"
dit "A pose son profil" "$(F_ $A "poser_profil('Taylor', '#4C86E8')")" "ok"
dit "  ... il lui reste les règles" "$(R $A "select mon_etat_groupes()->>'participe'")" "regles"
dit "  ... refusées sans les 13 ans" "$(F_ $A "accepter_regles(1, false)")" "age"
dit "  ... acceptées avec" "$(F_ $A "accepter_regles(1, true)")" "ok"
dit "A peut participer" "$(R $A "select mon_etat_groupes()->>'participe'")" "ok"
dit "A se sait modérateur" "$(R $A "select mon_etat_groupes()->>'moderateur'")" "true"
GP=$(R $A "select creer_groupe('Les amis', 'Entre nous', false, 'fr', 2)->>'id'")
CP=$(R $A "select code from groupes where id = '$GP'")
dit "A crée un groupe privé, avec un code de 6 caractères" "$(echo "$CP" | grep -cE '^[A-HJ-NP-Z2-9]{6}$')" "1"
vieillir
GO=$(R $A "select creer_groupe('Bible pour tous', 'Ouvert à tous', true, 'fr', 0)->>'id'")
dit "A crée un groupe public" "$(R $A "select ouvert from groupes where id = '$GO'")" "t"
dit "le créateur en est propriétaire" "$(R $A "select role from membres where groupe = '$GO' and membre = '$A'")" "proprietaire"

Q -c "update public.reglages_jeu set groupes_ouverts = true;" >/dev/null

# ---- 2. le profil et les règles ---------------------------------------------
titre "profil, règles, 13 ans"
dit "un nom grossier, même déguisé, est refusé" "$(F_ $B "poser_profil('c0nn4rd', '#E84C4C')")" "mot_interdit"
dit "un nom vide est refusé" "$(F_ $B "poser_profil('   ', '#E84C4C')")" "nom_longueur"
dit "B pose son profil" "$(F_ $B "poser_profil('Benoît', '#E84C4C')")" "ok"
dit "une couleur malformée est remplacée" "$(F_ $C "poser_profil('Chloé', 'rouge')")" "ok"
dit "  ... par la couleur par défaut" "$(R $C "select couleur from profils where id = '$C'")" "#4C86E8"
for u in $B $C $E $F; do R $u "select accepter_regles(1, true)" >/dev/null; done
for u in $E $F; do R $u "select poser_profil('Joueur', '#4CE88A')" >/dev/null; R $u "select accepter_regles(1, true)" >/dev/null; done
dit "B peut participer" "$(R $B "select mon_etat_groupes()->>'participe'")" "ok"
Q -c "update public.reglages_jeu set regles_version = 2;" >/dev/null
dit "des règles nouvelles : il faut les relire" "$(R $B "select mon_etat_groupes()->>'participe'")" "regles"
dit "  ... on ne peut rien envoyer d'ici là" "$(F_ $B "creer_groupe('Mon groupe', '', false, 'fr', 0)")" "regles"
Q -c "update public.reglages_jeu set regles_version = 1;" >/dev/null

# ---- 3. entrer --------------------------------------------------------------
titre "entrer dans un groupe"
dit "le privé ne s'ouvre pas sans code" "$(F_ $B "rejoindre_groupe('$GP', null)")" "code_inconnu"
dit "un code faux" "$(F_ $B "groupe_par_code('ZZZZZZ')")" "code_inconnu"
dit "le code, tapé en minuscules, donne l'aperçu" "$(R $B "select groupe_par_code(lower('$CP'))->>'nom'")" "Les amis"
dit "  ... sans faire entrer" "$(R $B "select groupe_par_code('$CP')->>'membre'")" "false"
dit "B entre avec le code" "$(F_ $B "rejoindre_groupe(null, '$CP')")" "ok"
dit "  ... deux fois, sans compter double" "$(R $B "select rejoindre_groupe(null, '$CP')->>'deja'")" "true"
dit "  ... le groupe compte 2 membres" "$(R $A "select nb_membres from groupes where id = '$GP'")" "2"
dit "C entre dans le public sans code" "$(F_ $C "rejoindre_groupe('$GO', null)")" "ok"
R $E "select rejoindre_groupe('$GO', null)" >/dev/null
R $F "select rejoindre_groupe('$GO', null)" >/dev/null
dit "C ne voit pas le groupe privé" "$(R $C "select count(*) from groupes where id = '$GP'")" "0"
dit "C voit le groupe public" "$(R $C "select count(*) from groupes where id = '$GO'")" "1"
dit "C ne lit pas les messages du privé" "$(R $C "select count(*) from messages where groupe = '$GP'")" "0"
dit "C ne voit pas qui est dans le privé" "$(R $C "select count(*) from membres where groupe = '$GP'")" "0"
dit "C ne voit pas le profil de B (aucun groupe commun)" "$(R $C "select count(*) from profils where id = '$B'")" "0"
dit "C voit le profil de A (groupe commun)" "$(R $C "select count(*) from profils where id = '$A'")" "1"

# ---- 4. le filtre ------------------------------------------------------------
titre "envoyer : filtre, coordonnées, débit"
vieillir
dit "B écrit dans le privé" "$(F_ $B "envoyer_message('$GP', 'Salut tout le monde', 'texte', null)")" "ok"
dit "  ... et tout de suite après : trop vite" "$(F_ $B "envoyer_message('$GP', 'Encore moi', 'texte', null)")" "trop_vite"
envoie(){ vieillir; F_ "$1" "envoyer_message('$2', '$3', 'texte', null)"; }
dit "« c0nn4rd »" "$(envoie $B $GP 't es un c0nn4rd')" "mot_interdit"
dit "« fuuuuuck »" "$(envoie $B $GP 'fuuuuuck')" "mot_interdit"
dit "« connnnnard »" "$(envoie $B $GP 'quel connnnnard')" "mot_interdit"
dit "« SALOPE » en majuscules" "$(envoie $B $GP 'SALOPE')" "mot_interdit"
dit "« conduire » passe (con n'est pas un mot entier)" "$(envoie $B $GP 'je vais conduire')" "ok"
dit "« le baiser de Judas » passe" "$(envoie $B $GP 'le baiser de Judas')" "ok"
dit "« the cock crew » passe (Pierre)" "$(envoie $B $GP 'and the cock crew')" "ok"
dit "« Niger » passe" "$(envoie $B $GP 'le Niger est un pays')" "ok"
dit "« Samson a eu les yeux crevés » passe" "$(envoie $B $GP 'Samson a eu les yeux crevés')" "ok"
dit "« a bite to eat » passe" "$(envoie $B $GP 'a bite to eat')" "ok"
dit "une adresse dans le PRIVÉ passe" "$(envoie $B $GP 'ecris moi a jean@exemple.com')" "ok"
dit "une adresse dans le PUBLIC est refusée" "$(envoie $C $GO 'ecris moi a jean@exemple.com')" "coordonnees"
dit "un numéro de téléphone dans le public" "$(envoie $C $GO 'appelle le 06 12 34 56 78')" "coordonnees"
dit "un lien dans le public" "$(envoie $C $GO 'va sur www.monsite.fr')" "coordonnees"
dit "des références bibliques passent" "$(envoie $C $GO 'Jean 3:16 et 1 Jean 4:8, Psaume 119:105')" "ok"
dit "écrire dans un groupe dont on n'est pas" "$(envoie $B $GO 'coucou')" "pas_membre"
dit "un message vide" "$(envoie $B $GP '   ')" "vide"
long=$(printf 'a%.0s' $(seq 1 501))
dit "501 caractères" "$(envoie $B $GP "$long")" "trop_long"
vieillir
dit "une invitation à jouer (code de salon)" "$(F_ $B "envoyer_message('$GP', '', 'partie', '{\"code\":\"AB2C\"}')")" "ok"
dit "  ... elle ne garde que le code" "$(R $B "select donnees::text || '|' || texte from messages where groupe = '$GP' and genre = 'partie'")" '{"code": "AB2C"}|'
vieillir
dit "une invitation qui cache du texte" "$(F_ $B "envoyer_message('$GP', '', 'partie', '{\"code\":\"<b>salut</b>\"}')")" "partie_invalide"
dit "un genre inconnu" "$(F_ $B "envoyer_message('$GP', 'x', 'image', null)")" "genre"
Q -c "insert into public.messages (groupe, auteur, texte, cree_le) select '$GO', '$F', 'x', now() - interval '30 seconds' from generate_series(1, 20);" >/dev/null
dit "vingt messages dans la minute : on attend" "$(F_ $F "envoyer_message('$GO', 'un de plus', 'texte', null)")" "trop_vite"
Q -c "delete from public.messages where auteur = '$F';" >/dev/null

# ---- 5. les serrures ---------------------------------------------------------
titre "aucune écriture directe, aucune fonction interne"
dit "insérer un message directement" "$(refuse "$(R $B "insert into messages (groupe, auteur, texte) values ('$GP', '$B', 'x')")")" "refusé"
dit "modifier un message directement" "$(refuse "$(R $B "update messages set texte = 'x'")")" "refusé"
dit "supprimer des messages directement" "$(refuse "$(R $B "delete from messages")")" "refusé"
dit "se rendre propriétaire directement" "$(refuse "$(R $B "update membres set role = 'proprietaire'")")" "refusé"
dit "se lever un bannissement" "$(refuse "$(R $B "update profils set banni_le = null")")" "refusé"
dit "s'inscrire modérateur" "$(refuse "$(R $B "insert into moderateurs values ('$B')")")" "refusé"
dit "ouvrir ou fermer les groupes" "$(refuse "$(R $B "update reglages_jeu set groupes_ouverts = false")")" "refusé"
dit "lire la liste des mots interdits" "$(refuse "$(R $B "select count(*) from mots_interdits")")" "refusé"
dit "appeler _annoncer" "$(refuse "$(R $B "select _annoncer('$GP', 'x', '{}')")")" "refusé"
dit "appeler _masquer" "$(refuse "$(R $B "select _masquer(1)")")" "refusé"
dit "appeler _passer_la_main" "$(refuse "$(R $B "select _passer_la_main('$GP', '$A')")")" "refusé"
dit "appeler _peut_participer" "$(refuse "$(R $B "select _peut_participer('$B')")")" "refusé"
dit "un non-connecté n'appelle rien" "$(refuse "$(Q -c "begin; set local role anon; select mon_etat_groupes(); commit;" 2>&1 | head -1)")" "refusé"
dit "un non-connecté ne lit aucun message" "$(Q -c "begin; set local role anon; select count(*) from messages; commit;" 2>&1 | head -1)" "0"

# ---- 6. bloquer --------------------------------------------------------------
titre "bloquer"
vieillir; MV=$(R $C "select envoyer_message('$GO', 'Bonjour à tous', 'texte', null)->>'id'")
dit "E voit le message de C" "$(R $E "select count(*) from messages where id = $MV")" "1"
dit "E bloque C" "$(F_ $E "bloquer('$C')")" "ok"
dit "  ... E ne voit plus AUCUN message de C" "$(R $E "select count(*) from messages where auteur = '$C'")" "0"
dit "  ... A le voit toujours" "$(R $A "select count(*) from messages where id = $MV")" "1"
dit "  ... ni dans l'aperçu de « mes groupes »" "$(R $E "select count(*) from mes_groupes() x where x->'apercu'->>'auteur' = '$C'")" "0"
dit "E débloque C" "$(F_ $E "debloquer('$C')")" "ok"
dit "  ... et le revoit" "$(R $E "select count(*) from messages where id = $MV")" "1"
dit "se bloquer soi-même" "$(F_ $E "bloquer('$E')")" "cible"

# ---- 7. signaler -------------------------------------------------------------
titre "signaler, masquer, décider"
vieillir
MC=$(R $C "select envoyer_message('$GO', 'message pénible', 'texte', null)->>'id'")
dit "E signale le message" "$(F_ $E "signaler($MC, null, null, 'harcelement', '')")" "ok"
dit "  ... deux fois : compté une fois" "$(R $E "select signaler($MC, null, null, 'harcelement', '')->>'deja'")" "true"
dit "une raison inconnue" "$(F_ $E "signaler($MC, null, null, 'nimporte', '')")" "raison"
dit "B (pas membre) ne peut pas le signaler" "$(F_ $B "signaler($MC, null, null, 'spam', '')")" "introuvable"
F_ $F "signaler($MC, null, null, 'inapproprie', '')" >/dev/null
dit "deux signalements : encore affiché" "$(R $C "select masque from messages where id = $MC")" "f"
F_ $A "signaler($MC, null, null, 'harcelement', 'insulte')" >/dev/null
dit "trois personnes : masqué tout de suite" "$(R $C "select masque from messages where id = $MC")" "t"
dit "  ... et son texte n'est plus dans la table lue" "$(R $E "select texte from messages where id = $MC")" ""
dit "  ... un membre ne lit pas le texte caché" "$(R $E "select count(*) from messages_caches")" "0"
dit "  ... le modérateur, si" "$(R $A "select texte from messages_caches where message = $MC")" "message pénible"
dit "la file de modération : 3 signalements" "$(R $A "select count(*) from moderation_ouverte()")" "3"
dit "  ... qu'un membre ne voit pas" "$(R $E "select count(*) from moderation_ouverte()")" "0"
dit "  ... ni ne traite" "$(F_ $E "traiter_signalement(1, 'rejeter')")" "interdit"
SID=$(R $A "select (x->>'id') from moderation_ouverte() x limit 1")
dit "le modérateur rejette : rien de mal" "$(F_ $A "traiter_signalement($SID, 'rejeter')")" "ok"
dit "  ... le message revient" "$(R $E "select masque::text || '|' || texte from messages where id = $MC")" "false|message pénible"
dit "  ... les 3 signalements sont réglés d'un coup" "$(R $A "select count(*) from moderation_ouverte()")" "0"
dit "signaler une personne" "$(F_ $E "signaler(null, '$C', '$GO', 'spam', 'pub')")" "ok"

# ---- 8. les rôles ------------------------------------------------------------
titre "propriétaire, admins, membres"
R $C "select rejoindre_groupe(null, '$CP')" >/dev/null
dit "A nomme B admin" "$(F_ $A "moderer_membre('$GP', '$B', 'promouvoir', null)")" "ok"
dit "  ... et le groupe le lit (avec son nom)" "$(R $C "select donnees->>'nom' from messages where groupe = '$GP' and texte = 'admin' order by id desc limit 1")" "Benoît"
dit "B (admin) fait taire C" "$(F_ $B "moderer_membre('$GP', '$C', 'muet', 10)")" "ok"
dit "  ... C ne peut plus écrire" "$(envoie $C $GP 'je parle')" "muet"
dit "B lui rend la parole" "$(F_ $B "moderer_membre('$GP', '$C', 'parler', null)")" "ok"
dit "  ... C écrit" "$(envoie $C $GP 'merci')" "ok"
dit "B (admin) ne peut pas exclure A (propriétaire)" "$(F_ $B "moderer_membre('$GP', '$A', 'exclure', null)")" "interdit"
dit "B (admin) ne nomme pas d'admin" "$(F_ $B "moderer_membre('$GP', '$C', 'promouvoir', null)")" "interdit"
dit "C (membre) ne modère pas" "$(F_ $C "moderer_membre('$GP', '$B', 'muet', 10)")" "interdit"
dit "personne ne se modère soi-même" "$(F_ $B "moderer_membre('$GP', '$B', 'muet', 10)")" "soi_meme"
dit "B exclut C" "$(F_ $B "moderer_membre('$GP', '$C', 'exclure', null)")" "ok"
dit "  ... le mot du jeu garde le nom de l'exclu" "$(R $B "select donnees->>'nom' from messages where groupe = '$GP' and texte = 'exclu' order by id desc limit 1")" "Chloé"
dit "  ... C ne lit plus le groupe" "$(R $C "select count(*) from messages where groupe = '$GP'")" "0"
dit "  ... C peut revenir avec le code (exclu, pas banni)" "$(F_ $C "rejoindre_groupe(null, '$CP')")" "ok"
dit "B bannit C" "$(F_ $B "moderer_membre('$GP', '$C', 'bannir', null)")" "ok"
dit "  ... C ne revient pas, même avec le code" "$(F_ $C "rejoindre_groupe(null, '$CP')")" "banni_du_groupe"
dit "B lève le bannissement" "$(F_ $B "moderer_membre('$GP', '$C', 'debannir', null)")" "ok"
dit "  ... C revient" "$(F_ $C "rejoindre_groupe(null, '$CP')")" "ok"
dit "le compte des membres suit (A, B, C)" "$(R $A "select nb_membres from groupes where id = '$GP'")" "3"
dit "A (propriétaire) quitte le groupe" "$(F_ $A "quitter_groupe('$GP')")" "ok"
dit "  ... B, l'admin, devient propriétaire" "$(R $B "select role from membres where groupe = '$GP' and membre = '$B'")" "proprietaire"

# ---- 9. non-lus, découverte, code, suppression --------------------------------
titre "non-lus, découverte, code, suppression"
R $B "select marquer_lu('$GP', (select max(id) from messages where groupe = '$GP'))" >/dev/null
dit "tout lu : aucun non-lu" "$(R $B "select x->>'non_lus' from mes_groupes() x where x->>'id' = '$GP'")" "0"
envoie $B $GP 'quelqu un ?' >/dev/null
R $A "select rejoindre_groupe(null, '$CP')" >/dev/null
envoie $C $GP 'tu es là ?' >/dev/null
dit "B a 1 non-lu (ni les siens, ni les mots du jeu)" "$(R $B "select x->>'non_lus' from mes_groupes() x where x->>'id' = '$GP'")" "1"
DER=$(R $B "select max(id) from messages where groupe = '$GP'")
R $B "select marquer_lu('$GP', $DER)" >/dev/null
dit "  ... lu" "$(R $B "select x->>'non_lus' from mes_groupes() x where x->>'id' = '$GP'")" "0"
dit "chercher « BIBLE » trouve le public" "$(R $B "select count(*) from groupes_publics('BIBLE', 'fr', 10)")" "1"
dit "chercher « amis » ne trouve pas le privé" "$(R $C "select count(*) from groupes_publics('amis', null, 10)")" "0"
dit "B change le code d'invitation" "$(F_ $B "nouveau_code('$GP')")" "ok"
dit "  ... l'ancien ne marche plus" "$(F_ $E "groupe_par_code('$CP')")" "code_inconnu"
dit "C (membre) ne supprime pas le groupe" "$(F_ $C "supprimer_groupe('$GP')")" "interdit"
dit "B (propriétaire) le supprime" "$(F_ $B "supprimer_groupe('$GP')")" "ok"
dit "  ... il disparaît de « mes groupes »" "$(R $C "select count(*) from mes_groupes() x where x->>'id' = '$GP'")" "0"

# ---- 10. supprimer son compte -------------------------------------------------
titre "supprimer son compte"
vieillir; R $F "select envoyer_message('$GO', 'au revoir', 'texte', null)" >/dev/null
vieillir
GF=$(R $F "select creer_groupe('Le groupe de F', '', false, 'fr', 3)->>'id'")
CF=$(R $F "select code from groupes where id = '$GF'")
R $A "select rejoindre_groupe(null, '$CF')" >/dev/null
avant=$(R $A "select nb_membres from groupes where id = '$GO'")
dit "F supprime son compte" "$(F_ $F "supprimer_mon_compte()")" "ok"
dit "  ... plus de compte" "$(Q -c "select count(*) from auth.users where id = '$F'")" "0"
dit "  ... plus de messages de F" "$(Q -c "select count(*) from public.messages where auteur = '$F'")" "0"
dit "  ... plus de profil" "$(Q -c "select count(*) from public.profils where id = '$F'")" "0"
dit "  ... le groupe compte un membre de moins" "$(R $A "select nb_membres from groupes where id = '$GO'")" "$((avant-1))"
dit "  ... son groupe passe à A, qui y était" "$(R $A "select role from membres where groupe = '$GF' and membre = '$A'")" "proprietaire"
dit "  ... et compte un membre" "$(R $A "select nb_membres from groupes where id = '$GF'")" "1"
vieillir
GE=$(R $E "select creer_groupe('Le groupe de E', '', false, 'fr', 0)->>'id'")
dit "E supprime son compte, seul dans son groupe" "$(F_ $E "supprimer_mon_compte()")" "ok"
dit "  ... le groupe vide s'éteint" "$(Q -c "select (supprime_le is not null)::text from public.groupes where id = '$GE'")" "true"
dit "un non-connecté ne supprime rien" "$(refuse "$(Q -c "begin; set local role anon; select supprimer_mon_compte(); commit;" 2>&1 | head -1)")" "refusé"

# ---- 11. le direct -------------------------------------------------------------
titre "le direct"
dit "les messages sont diffusés" "$(Q -c "select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages'")" "1"
dit "les adhésions ne le sont pas (suppressions)" "$(Q -c "select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'membres'")" "0"

# ---- et la modération du jeu bannit -------------------------------------------
titre "bannir du jeu"
vieillir
MB=$(R $C "select envoyer_message('$GO', 'encore pénible', 'texte', null)->>'id'")
F_ $A "signaler($MB, null, null, 'harcelement', '')" >/dev/null
SID=$(R $A "select (x->>'id') from moderation_ouverte() x where (x->>'message')::bigint = $MB limit 1")
dit "le modérateur bannit l'auteur" "$(F_ $A "traiter_signalement($SID, 'bannir')")" "ok"
dit "  ... le message est masqué" "$(R $A "select masque from messages where id = $MB")" "t"
dit "  ... C ne participe plus" "$(R $C "select mon_etat_groupes()->>'participe'")" "banni"
dit "  ... et n'écrit plus nulle part" "$(envoie $C $GO 'je reviens')" "banni"
dit "  ... ni ne crée de groupe" "$(F_ $C "creer_groupe('Mon retour', '', true, 'fr', 0)")" "banni"

fin
echo ""; [ $ko -eq 0 ] && echo "  OK" || echo "  $ko défaut(s)"
exit $([ $ko -eq 0 ] && echo 0 || echo 1)
