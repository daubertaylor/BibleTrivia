-- =====================================================================
--  BibleTrivia — compter l'audience du jeu
--  À coller dans Supabase > SQL Editor > New query, puis « Run ».
--  Tant que ce script n'a pas été exécuté, le jeu n'enregistre RIEN :
--  l'appel échoue en silence et aucune donnée ne quitte les téléphones.
-- =====================================================================

-- 1. La table. Une ligne par appareil, trois colonnes, rien d'autre.
--    « id » est un nombre tiré au hasard sur le téléphone : il ne dit rien
--    de la personne, il sert seulement à ne pas compter dix fois le même
--    appareil. Aucun nom, aucune couleur, aucun score, aucune adresse.
create table if not exists public.visites (
  id               text primary key,
  premiere_visite  timestamptz not null default now(),
  derniere_visite  timestamptz not null default now(),
  installe         boolean     not null default false
);

-- 2. Chaque appareil peut créer et rafraîchir SA ligne, mais personne ne
--    peut lire la table : le jeu n'a besoin que d'écrire.
alter table public.visites enable row level security;

drop policy if exists "un appareil cree sa ligne" on public.visites;
create policy "un appareil cree sa ligne"
  on public.visites for insert to anon with check (true);

drop policy if exists "un appareil rafraichit sa ligne" on public.visites;
create policy "un appareil rafraichit sa ligne"
  on public.visites for update to anon using (true) with check (true);

-- 3. La lecture passe UNIQUEMENT par cette fonction, qui ne rend que des
--    totaux. Même en fouillant, on ne peut pas récupérer la liste des
--    appareils : il n'existe aucune permission de lecture sur la table.
create or replace function public.stats_visites()
returns table (appareils bigint, installations bigint, actifs_30j bigint)
language sql
security definer
set search_path = public
as $$
  select count(*),
         count(*) filter (where installe),
         count(*) filter (where derniere_visite > now() - interval '30 days')
  from public.visites;
$$;

grant execute on function public.stats_visites() to anon;

-- =====================================================================
--  C'est tout. Les chiffres apparaissent dans le jeu, écran Profil,
--  visibles du seul compte Créateur.
--
--  POUR TOUT ARRÊTER plus tard, et effacer ce qui a été collecté :
--    drop function if exists public.stats_visites();
--    drop table    if exists public.visites;
--  Le jeu repart aussitôt en mode « rien n'est compté », sans autre
--  changement et sans erreur visible.
-- =====================================================================
