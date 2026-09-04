-- Les abonnements aux rappels de série.
-- Le serveur ne stocke QUE ce qu'il lui faut pour décider s'il doit frapper,
-- et à quelle heure il fait soir chez ce joueur. Aucun pseudo, aucun score,
-- aucune réponse, aucune progression.
create table if not exists public.push_subs (
  endpoint   text primary key,          -- adresse d'envoi fournie par le navigateur
  abonnement jsonb       not null,      -- les clés de chiffrement de cet appareil
  dernier    date,                      -- date du dernier défi joué
  serie      int         not null default 0,
  decalage   int         not null default 0,   -- minutes par rapport à UTC
  maj        timestamptz not null default now()
);
create index if not exists push_subs_dernier on public.push_subs (dernier, serie);

alter table public.push_subs enable row level security;

-- L'app n'a pas de comptes : l'autorisation repose sur la connaissance de
-- l'endpoint, qui est une longue chaîne aléatoire connue du seul appareil
-- concerné. C'est suffisant ici (on ne protège aucune donnée personnelle), mais
-- il faut le savoir : ce n'est pas une authentification.
create policy "un appareil gère son propre abonnement"
  on public.push_subs for all to anon
  using (true) with check (true);
