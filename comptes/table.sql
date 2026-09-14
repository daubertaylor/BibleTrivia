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

create policy "chacun crée la sienne"
  on public.sauvegardes for insert to authenticated
  with check (auth.uid() = id);

create policy "chacun met à jour la sienne"
  on public.sauvegardes for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

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
create or replace function public.poser_sauvegarde(p_donnees jsonb, p_revision bigint)
returns public.sauvegardes
language plpgsql
security invoker            -- la fonction n'a pas plus de droits que l'appelant
set search_path = public
as $$
declare
  ligne public.sauvegardes;
begin
  if auth.uid() is null then
    raise exception 'non connecté';
  end if;

  insert into public.sauvegardes (id, donnees, revision, maj)
  values (auth.uid(), p_donnees, 1, now())
  on conflict (id) do update
     set donnees  = excluded.donnees,
         revision = public.sauvegardes.revision + 1,
         maj      = now()
   where public.sauvegardes.revision = p_revision   -- la condition qui protège
  returning * into ligne;

  if ligne.id is null then
    -- Rien n'a été écrit : quelqu'un d'autre est passé entre-temps. On rend
    -- l'état actuel pour que l'appelant refusionne dessus.
    select * into ligne from public.sauvegardes where id = auth.uid();
  end if;

  return ligne;
end;
$$;

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
