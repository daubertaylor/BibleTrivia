-- ============================================================================
-- LA SAUVEGARDE D'UN JOUEUR
-- ============================================================================
-- Une ligne par compte. Une seule colonne de données, parce que la fusion se
-- fait sur le TÉLÉPHONE (voir fusionner() dans index.html, prouvé monotone et
-- idempotent par banc-essai/fusion.js) : le serveur n'a pas à comprendre ce
-- qu'il garde, il doit seulement le rendre intact à son propriétaire.
--
-- CE QUI EST DEDANS : le nom et la couleur choisis, la progression par livre,
-- les compteurs, la flamme et ses jours, les questions déjà vues, le carnet
-- d'erreurs, le goût (traduction, décor).
-- CE QUI N'Y EST PAS : le son, le volume, les notifications — ils
-- appartiennent à l'APPAREIL, pas au joueur. Et aucune adresse e-mail n'est
-- recopiée ici : elle vit dans auth.users, qui est géré par Supabase.

create table if not exists public.sauvegardes (
  id       uuid        primary key references auth.users(id) on delete cascade,
  donnees  jsonb       not null default '{}'::jsonb,
  revision bigint      not null default 1,   -- voir « DEUX TÉLÉPHONES » plus bas
  maj      timestamptz not null default now(),

  -- UNE SAUVEGARDE A UNE TAILLE RAISONNABLE. Mesuré : un joueur très avancé
  -- (600 entrées de carnet, 500 questions vues, 90 jours de flamme) pèse moins
  -- de 300 ko. Le plafond n'est donc pas dans le chemin d'un vrai joueur ; il
  -- est là pour qu'une ligne ne puisse pas servir de dépotoir.
  constraint sauvegarde_raisonnable check (pg_column_size(donnees) < 600000)
);

-- ============================================================================
-- QUI PEUT LIRE ET ÉCRIRE : SON PROPRE COMPTE, ET RIEN D'AUTRE
-- ============================================================================
alter table public.sauvegardes enable row level security;

-- On repose sur auth.uid(), c'est-à-dire sur le jeton signé que Supabase
-- délivre à la connexion. Il n'est pas falsifiable côté client : c'est ce qui
-- sépare cette table de push_subs, plus bas.
create policy "chacun lit la sienne"
  on public.sauvegardes for select to authenticated
  using (auth.uid() = id);

-- AUCUNE POLITIQUE D'ÉCRITURE DIRECTE, ET C'EST LE POINT IMPORTANT.
-- On écrit UNIQUEMENT par poser_sauvegarde(), plus bas, qui refuse d'écraser
-- une version plus récente que celle qu'on a lue. Si on laissait en plus une
-- politique « for update », n'importe quelle écriture directe — y compris une
-- ligne de code à moi, écrite trop vite un soir — contournerait ce contrôle et
-- pourrait effacer des mois de progression. La protection ne doit pas reposer
-- sur ma discipline : elle doit être la seule route ouverte.

-- AUCUNE POLITIQUE DE SUPPRESSION, ET C'EST VOLONTAIRE. Une progression ne se
-- supprime pas depuis un téléphone : un bouton mal placé, un doigt qui glisse,
-- et des mois disparaissent. La seule suppression légitime est celle du compte
-- entier, et elle passe par la suppression de l'utilisateur (on delete cascade
-- ci-dessus).

-- ============================================================================
-- DEUX TÉLÉPHONES QUI ÉCRIVENT EN MÊME TEMPS
-- ============================================================================
-- Le danger classique : le téléphone A lit, le téléphone B lit, A écrit, B
-- écrit — et l'écriture de B, calculée sur une version périmée, efface celle
-- de A. C'est exactement la perte de progression qu'on veut rendre impossible.
--
-- Chaque écriture doit donc annoncer LA RÉVISION QU'ELLE A LUE. Si elle ne
-- correspond plus, la fonction ne touche à rien et rend la version actuelle :
-- le téléphone refusionne (fusionner() est fait pour ça) et retente. Personne
-- n'écrase personne.

-- POURQUOI « security definer ». La table n'a plus aucune politique
-- d'écriture : personne ne peut écrire directement, pas même son propriétaire.
-- Cette fonction doit donc écrire avec les droits de son créateur, et pas avec
-- ceux de l'appelant. C'est précisément ce qui la rend obligatoire — c'est la
-- seule porte, et elle contrôle la révision avant de laisser passer.
-- Ce qui la garde sûre, ligne par ligne :
--   * elle refuse tout appel sans jeton (auth.uid() is null) ;
--   * elle n'écrit QUE sur la ligne auth.uid() — jamais sur un identifiant
--     fourni par l'appelant, qui n'en fournit d'ailleurs aucun ;
--   * elle ne relit QUE la ligne auth.uid() ;
--   * « set search_path = '' » : tous les noms qu'elle emploie sont écrits en
--     entier (public.sauvegardes, auth.uid()), donc plus personne ne peut lui
--     glisser une table ou une fonction de son cru devant les vraies. C'est le
--     réflexe à avoir sur TOUTE fonction « definer » : elle tourne avec les
--     droits de son créateur, autant qu'elle ne puisse appeler que ce qu'on
--     croit.
create or replace function public.poser_sauvegarde(p_donnees jsonb, p_revision bigint)
returns public.sauvegardes
language plpgsql
security definer
set search_path = ''
as $$
declare
  ligne public.sauvegardes;
  moi   uuid := auth.uid();
begin
  if moi is null then
    raise exception 'non connecté';
  end if;
  -- Une sauvegarde est un OBJET. Un tableau ou un nombre passerait le type
  -- jsonb sans broncher, et ferait échouer la fusion côté téléphone bien plus
  -- tard, une fois la ligne déjà écrite.
  if jsonb_typeof(p_donnees) is distinct from 'object' then
    raise exception 'sauvegarde malformée';
  end if;

  insert into public.sauvegardes (id, donnees, revision, maj)
  values (moi, p_donnees, 1, now())
  on conflict (id) do update
     set donnees  = excluded.donnees,
         revision = public.sauvegardes.revision + 1,
         maj      = now()
   where public.sauvegardes.revision = p_revision   -- la condition qui protège
  returning * into ligne;

  if not found then
    -- Rien n'a été écrit : quelqu'un d'autre est passé entre-temps. On rend
    -- l'état actuel pour que l'appelant refusionne dessus.
    select * into ligne from public.sauvegardes where id = moi;
  end if;

  return ligne;
end;
$$;

-- Qui a le droit d'appeler cette porte : les connectés, et eux seuls. Par
-- défaut PostgreSQL ouvre l'exécution à tout le monde ; on la referme d'abord.
revoke all on function public.poser_sauvegarde(jsonb, bigint) from public;
revoke all on function public.poser_sauvegarde(jsonb, bigint) from anon;
grant execute on function public.poser_sauvegarde(jsonb, bigint) to authenticated;

-- Et on retire aussi les droits de table que Supabase accorde d'office : plus
-- aucune politique d'écriture n'existe, mais autant que les droits le disent
-- aussi. Deux serrures valent mieux qu'une.
revoke insert, update, delete on public.sauvegardes from anon, authenticated;

-- ============================================================================
-- CE QUI DOIT ÊTRE CORRIGÉ SUR LA TABLE EXISTANTE (push_subs)
-- ============================================================================
-- Constat, en relisant notifications/table.sql : sa politique est
--   for all to anon using (true) with check (true)
-- c'est-à-dire que N'IMPORTE QUI peut lire, modifier et supprimer TOUTES les
-- lignes. Le commentaire d'origine l'assume (« ce n'est pas une
-- authentification ») en s'appuyant sur le fait qu'aucune donnée personnelle
-- n'y est stockée. C'était défendable quand la table ne contenait qu'un
-- endpoint. Ça ne l'est plus tout à fait :
--
--   * la LECTURE permet d'énumérer tous les abonnements, donc les clés de
--     chiffrement de chaque appareil. Envoyer une notification reste
--     impossible sans la clé privée VAPID, qui ne quitte pas le serveur — mais
--     il n'y a aucune raison de laisser lire.
--   * la SUPPRESSION permet de vider la table : tout le monde perdrait ses
--     rappels, en silence, sans que personne ne s'en aperçoive.
--
-- Le client ne LIT jamais cette table. On lui retire donc la lecture, ce qui
-- supprime l'énumération. La suppression en masse reste théoriquement possible
-- tant qu'il n'y a pas d'identité : c'est réglé pour de bon à l'étape
-- suivante, quand chaque abonnement sera rattaché à un compte.
drop policy if exists "un appareil gère son propre abonnement" on public.push_subs;

create policy "un appareil pose son abonnement"
  on public.push_subs for insert to anon with check (true);
create policy "un appareil met à jour le sien"
  on public.push_subs for update to anon using (true) with check (true);
create policy "un appareil retire le sien"
  on public.push_subs for delete to anon using (true);
-- (aucune politique de SELECT : plus personne ne peut lire la table)

-- ============================================================================
-- COMMENT L'INSTALLER
-- ============================================================================
-- Dans Supabase : SQL Editor → coller tout ce fichier → Run.
-- Puis Authentication → Providers → activer Google, et y coller l'identifiant
-- et le secret OAuth. L'adresse de retour à déclarer côté Google est celle que
-- Supabase affiche sur cette même page.
-- Rien à changer dans le jeu : l'URL et la clé publique y sont déjà.
