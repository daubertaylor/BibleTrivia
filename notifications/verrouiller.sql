-- ============================================================================
--  FERMER LA TABLE DES ABONNEMENTS
-- ============================================================================
--  À COLLER DANS L'ÉDITEUR SQL DE SUPABASE. Une seule fois. Sans danger :
--  aucune ligne n'est supprimée, aucun joueur ne perd son abonnement.
--
--  CE QUI ÉTAIT OUVERT, ET POURQUOI C'EST GRAVE
--  L'ancienne règle disait « for all to anon using (true) with check (true) » :
--  tout le monde peut tout faire. Le raisonnement écrit à l'époque était que
--  l'endpoint, une longue chaîne aléatoire, tenait lieu de mot de passe. C'est
--  faux, et c'est vérifiable en une requête : une règle RLS ne voit PAS le
--  filtre de la requête. « using (true) » autorise donc aussi bien
--  « endpoint = le mien » que « endpoint <> le mien », c'est-à-dire toutes les
--  lignes de tout le monde.
--
--  Mesuré avec la SEULE clé publique, celle qui est écrite en clair dans
--  index.html et que n'importe qui peut lire :
--      SELECT -> 200   les huit abonnements, avec keys.p256dh et keys.auth
--      INSERT -> 201
--      DELETE -> 204
--  keys.p256dh et keys.auth sont les clés de chiffrement de l'appareil : qui
--  les a peut envoyer ce qu'il veut sur le téléphone du joueur, sous le nom de
--  Yada. Et un DELETE sans filtre coupe les rappels de tout le monde.
--
--  CE QU'ON MET À LA PLACE
--  Le téléphone n'écrit plus dans la table : il appelle une fonction qui
--  n'agit que sur LA ligne dont il donne l'adresse, et qui ne renvoie rien.
--  Plus aucune lecture n'est possible de l'extérieur. La fonction horaire, qui
--  utilise la clé service_role, continue de tout voir : elle ne passe pas par
--  ces règles.
-- ============================================================================

-- 1. La colonne « revoir » (v219) n'a jamais été ajoutée à la table en ligne.
--    C'est elle qui faisait échouer toute l'écriture de l'état du joueur.
alter table public.push_subs add column if not exists revoir int not null default 0;

-- 2. On retire l'ancienne règle et tout accès direct à la table.
drop policy if exists "un appareil gère son propre abonnement" on public.push_subs;
revoke all on public.push_subs from anon, authenticated;
alter table public.push_subs enable row level security;

-- 3. Le téléphone s'enregistre par une fonction, jamais en écrivant la table.
--    « security definer » : la fonction agit avec les droits du propriétaire,
--    et le « where endpoint = ... » est écrit ICI, pas par l'appelant.
create or replace function public.push_enregistrer(
  p_endpoint   text,
  p_abonnement jsonb default null,
  p_dernier    date  default null,
  p_serie      int   default 0,
  p_vu         date  default null,
  p_revoir     int   default 0,
  p_decalage   int   default 0
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_endpoint is null or length(p_endpoint) < 20 then
    raise exception 'adresse d''envoi invalide';
  end if;
  insert into public.push_subs (endpoint, abonnement, dernier, serie, vu, revoir, decalage, maj)
  values (p_endpoint, coalesce(p_abonnement, '{}'::jsonb), p_dernier,
          coalesce(p_serie, 0), p_vu, coalesce(p_revoir, 0), coalesce(p_decalage, 0), now())
  on conflict (endpoint) do update set
    -- un appel qui ne porte pas l'abonnement ne l'efface pas
    abonnement = case when p_abonnement is null then public.push_subs.abonnement else p_abonnement end,
    dernier    = p_dernier,
    serie      = coalesce(p_serie, 0),
    vu         = p_vu,
    revoir     = coalesce(p_revoir, 0),
    decalage   = coalesce(p_decalage, 0),
    maj        = now();
end; $$;

-- 4. Et il se retire de la même façon.
create or replace function public.push_oublier(p_endpoint text)
returns void
language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;

-- 5. Ces deux portes-là, et rien d'autre.
revoke all on function public.push_enregistrer(text, jsonb, date, int, date, int, int) from public;
revoke all on function public.push_oublier(text) from public;
grant execute on function public.push_enregistrer(text, jsonb, date, int, date, int, int) to anon, authenticated;
grant execute on function public.push_oublier(text) to anon, authenticated;

-- ============================================================================
--  POUR VÉRIFIER, une fois collé (dans un terminal, avec la clé PUBLIQUE) :
--    curl "https://chyuckryusxzssezesuw.supabase.co/rest/v1/push_subs?select=endpoint" \
--         -H "apikey: LA_CLE_PUBLIQUE" -H "Authorization: Bearer LA_CLE_PUBLIQUE"
--  Avant : la liste des abonnements.  Après : « permission denied ».
-- ============================================================================
