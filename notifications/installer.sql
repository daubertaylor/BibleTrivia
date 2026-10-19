-- ============================================================================
--  LES RAPPELS — TOUT LE SERVEUR, EN UN SEUL COLLAGE (v326, messages v329)
-- ============================================================================
--  Supabase → SQL Editor → New query → colle ce fichier EN ENTIER → Run.
--  Une fois suffit ; il se recolle sans risque, autant de fois qu'on veut, par-
--  dessus n'importe quelle installation d'avant : rien n'est effacé, aucun
--  joueur ne perd son abonnement.
--
--  CE QU'IL FAIT
--    A. la table des abonnements (si elle n'existe pas) et ses colonnes ;
--    B. il la FERME : plus aucune lecture de l'extérieur, le téléphone passe
--       par une porte qui n'agit que sur SA ligne (push_enregistrer) ;
--    C. il fabrique une CLÉ INTERNE que seule la base connaît, et programme la
--       tâche des cinq minutes qui appelle la fonction « rappels » avec elle :
--       plus aucune clé « service_role » à recopier nulle part ;
--    D. il pose rappels_etat(), que le jeu interroge pour dire, depuis le
--       téléphone, ce qui marche et ce qui manque (Modération → Rappels) ;
--    E. (v329) les MESSAGES DES GROUPES : chaque téléphone sait à quel compte
--       il appartient, et un message posté dans un groupe prévient ceux qui
--       ne l'ont pas encore lu — selon ce que chacun a choisi pour ce groupe
--       (Tout, Mentions, Muet). Rien de cette partie n'empêche jamais un
--       message de partir.
--
--  CE QUI RESTE À FAIRE DANS SUPABASE, UNE FOIS :
--    Edge Functions → « rappels » → remplacer son code par
--    notifications/rappels.ts → Deploy, et DÉSACTIVER « Verify JWT » (la
--    fonction vérifie elle-même la clé interne). Ses trois secrets VAPID
--    restent ceux qui y sont déjà.
-- ============================================================================

-- ---------------------------------------------------------------- A. la table
create table if not exists public.push_subs (
  endpoint   text primary key,          -- adresse d'envoi fournie par le navigateur
  abonnement jsonb       not null,      -- les clés de chiffrement de cet appareil
  dernier    date,                      -- date du dernier DÉFI joué
  serie      int         not null default 0,
  vu         date,                      -- date de la dernière PARTIE, tous modes
  revoir     int         not null default 0,   -- questions à revoir aujourd'hui (un COMPTE, pas leur contenu)
  decalage   int         not null default 0,   -- minutes par rapport à UTC
  maj        timestamptz not null default now()
);
create index if not exists push_subs_dernier on public.push_subs (dernier, serie);
create index if not exists push_subs_vu on public.push_subs (vu);

-- Si la table existe déjà sans la colonne « vu » (installée avant la v205) :
alter table public.push_subs add column if not exists vu date;
-- Et sans « revoir » (installée avant la v219) :
alter table public.push_subs add column if not exists revoir int not null default 0;
-- Et sans les rappels à l'heure choisie (v326 : prière, lecture) :
alter table public.push_subs add column if not exists jeu        boolean not null default true;  -- les rappels du JEU sont-ils allumés ?
alter table public.push_subs add column if not exists priere     int;    -- minutes après minuit, chez le joueur ; null = pas de rappel
alter table public.push_subs add column if not exists lecture    int;    -- idem, pour la lecture de la Bible
alter table public.push_subs add column if not exists jeu_le     date;   -- dernier jour (chez lui) où un rappel du jeu est parti
alter table public.push_subs add column if not exists priere_le  date;   -- … un rappel de prière
alter table public.push_subs add column if not exists lecture_le date;   -- … un rappel de lecture

-- ---------------------------------------------------------------- B. le verrou
-- 1. La colonne « revoir » (v219) n'a jamais été ajoutée à la table en ligne.
--    C'est elle qui faisait échouer toute l'écriture de l'état du joueur.
alter table public.push_subs add column if not exists revoir int not null default 0;

-- 1 bis. (v326) Les rappels à l'heure choisie — prière, lecture de la Bible —
--    et le jour du dernier envoi de chaque sorte : la tâche passe désormais
--    toutes les cinq minutes (cron.sql), et ces dates l'empêchent de répéter
--    un rappel. Rien de personnel : deux heures, trois dates, un oui/non.
alter table public.push_subs add column if not exists jeu        boolean not null default true;  -- les rappels du JEU sont-ils allumés ?
alter table public.push_subs add column if not exists priere     int;    -- minutes après minuit, chez le joueur ; null = pas de rappel
alter table public.push_subs add column if not exists lecture    int;    -- idem, pour la lecture de la Bible
alter table public.push_subs add column if not exists jeu_le     date;   -- dernier jour (chez lui) où un rappel du jeu est parti
alter table public.push_subs add column if not exists priere_le  date;   -- … un rappel de prière
alter table public.push_subs add column if not exists lecture_le date;   -- … un rappel de lecture

-- 2. On retire l'ancienne règle et tout accès direct à la table.
drop policy if exists "un appareil gère son propre abonnement" on public.push_subs;
revoke all on public.push_subs from anon, authenticated;
alter table public.push_subs enable row level security;

-- 3. Le téléphone s'enregistre par une fonction, jamais en écrivant la table.
--    « security definer » : la fonction agit avec les droits du propriétaire,
--    et le « where endpoint = ... » est écrit ICI, pas par l'appelant.
--    (v326) Trois réglages de plus : les rappels du jeu (p_jeu), l'heure de
--    la prière et celle de la lecture (en minutes après minuit, chez le
--    joueur ; -1 = éteint ; absent = on n'y touche pas — un jeu d'avant la
--    v326 ne les envoie pas, et ne doit rien éteindre). L'ancienne signature
--    est retirée d'abord : deux fonctions du même nom rendraient l'appel
--    ambigu.
--    (v329) Et le COMPTE : la fonction note qui est connecté sur ce téléphone
--    (auth.uid(), nul si personne) — c'est à lui qu'iront les messages de ses
--    groupes ; et s'il veut les recevoir (p_messages ; absent = on n'y touche
--    pas). Un jeu d'avant la v329 n'envoie pas p_messages : sa ligne reste à
--    « messages » vide, et la fonction ne lui écrit AUCUN message — son
--    service worker ne saurait pas les montrer. Seul un « oui » posé par un
--    jeu qui les connaît les ouvre.
alter table public.push_subs add column if not exists membre   uuid;
alter table public.push_subs add column if not exists messages boolean;
create index if not exists push_subs_membre on public.push_subs (membre);
drop function if exists public.push_enregistrer(text, jsonb, date, int, date, int, int);
drop function if exists public.push_enregistrer(text, jsonb, date, int, date, int, int, boolean, int, int);
create or replace function public.push_enregistrer(
  p_endpoint   text,
  p_abonnement jsonb   default null,
  p_dernier    date    default null,
  p_serie      int     default 0,
  p_vu         date    default null,
  p_revoir     int     default 0,
  p_decalage   int     default 0,
  p_jeu        boolean default null,
  p_priere     int     default null,
  p_lecture    int     default null,
  p_messages   boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  -- L'heure qu'il est CHEZ LE JOUEUR : une heure choisie déjà passée
  -- aujourd'hui commence demain, au lieu de sonner dans la minute.
  ici  timestamp := (now() at time zone 'utc') + make_interval(mins => coalesce(p_decalage, 0));
  mn   int  := extract(hour from ici)::int * 60 + extract(minute from ici)::int;
  jour date := ici::date;
  pr   int  := case when p_priere  between 0 and 1439 then p_priere  end;
  le   int  := case when p_lecture between 0 and 1439 then p_lecture end;
begin
  if p_endpoint is null or length(p_endpoint) < 20 then
    raise exception 'adresse d''envoi invalide';
  end if;
  insert into public.push_subs (endpoint, abonnement, dernier, serie, vu, revoir, decalage, maj,
                                jeu, priere, lecture, priere_le, lecture_le, membre, messages)
  values (p_endpoint, coalesce(p_abonnement, '{}'::jsonb), p_dernier,
          coalesce(p_serie, 0), p_vu, coalesce(p_revoir, 0), coalesce(p_decalage, 0), now(),
          coalesce(p_jeu, true), pr, le,
          case when pr <= mn then jour end, case when le <= mn then jour end,
          auth.uid(), p_messages)
  on conflict (endpoint) do update set
    -- le compte connecté MAINTENANT sur ce téléphone (personne : plus aucun)
    membre     = auth.uid(),
    messages   = coalesce(p_messages, public.push_subs.messages),
    -- un appel qui ne porte pas l'abonnement ne l'efface pas
    abonnement = case when p_abonnement is null then public.push_subs.abonnement else p_abonnement end,
    dernier    = p_dernier,
    serie      = coalesce(p_serie, 0),
    vu         = p_vu,
    revoir     = coalesce(p_revoir, 0),
    decalage   = coalesce(p_decalage, 0),
    maj        = now(),
    jeu        = coalesce(p_jeu, public.push_subs.jeu),
    priere     = case when p_priere  is null then public.push_subs.priere  else pr end,
    lecture    = case when p_lecture is null then public.push_subs.lecture else le end,
    -- la même heure garde son « déjà envoyé aujourd'hui » ; une heure
    -- nouvelle déjà passée attend demain, une heure à venir sonnera
    priere_le  = case when p_priere is null or pr is not distinct from public.push_subs.priere then public.push_subs.priere_le
                      when pr <= mn then jour end,
    lecture_le = case when p_lecture is null or le is not distinct from public.push_subs.lecture then public.push_subs.lecture_le
                      when le <= mn then jour end;
end; $$;

-- 4. Et il se retire de la même façon.
create or replace function public.push_oublier(p_endpoint text)
returns void
language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;

-- 5. Ces deux portes-là, et rien d'autre.
revoke all on function public.push_enregistrer(text, jsonb, date, int, date, int, int, boolean, int, int, boolean) from public;
revoke all on function public.push_oublier(text) from public;
grant execute on function public.push_enregistrer(text, jsonb, date, int, date, int, int, boolean, int, int, boolean) to anon, authenticated;
grant execute on function public.push_oublier(text) to anon, authenticated;

-- ============================================================================
--  C. CE QU'IL N'Y A PLUS À FAIRE À LA MAIN
-- ============================================================================
-- C1. La clé interne. Fabriquée ici, lue par la tâche et par la fonction, et
--     par personne d'autre (aucun droit pour anon ni authenticated).
create table if not exists public.rappels_reglage (
  id   int primary key default 1 check (id = 1),
  cle  text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  cree timestamptz not null default now()
);
alter table public.rappels_reglage enable row level security;
revoke all on public.rappels_reglage from anon, authenticated;
insert into public.rappels_reglage (id) values (1) on conflict (id) do nothing;
-- La fonction lit la table des abonnements et la clé avec le rôle
-- « service_role » : on le lui accorde nommément, sans compter sur les droits
-- que Supabase donne d'ordinaire aux tables nouvelles.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on public.push_subs to service_role;
    grant select on public.rappels_reglage to service_role;
  end if;
end $$;

-- C2. Le dernier essai qu'un téléphone a demandé pour lui-même (« M'envoyer
--     un essai ») : un par minute au plus.
alter table public.push_subs add column if not exists essai_le timestamptz;

-- C3. La tâche, toutes les cinq minutes. Si pg_cron ou pg_net manquent, on le
--     dit et on passe : tout le reste est installé quand même. Une tâche
--     « rappels » posée autrefois (une fois par heure, avec la clé
--     service_role) est remplacée par celle-ci.
--     (Chacune à part : si l'une manque, l'autre s'installe quand même.)
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  begin
    grant usage on schema cron to postgres;
    grant all privileges on all tables in schema cron to postgres;
  exception when others then null;
  end;
exception when others then
  raise notice 'pg_cron indisponible (%) : Database → Extensions → pg_cron, puis recolle ce fichier', sqlerrm;
end $$;
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net indisponible (%) : Database → Extensions → pg_net, puis recolle ce fichier', sqlerrm;
end $$;
do $$
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null then
    raise notice 'pas de pg_cron ou de pg_net : la tâche des rappels n''est pas posée';
    return;
  end if;
  perform cron.schedule('rappels', '*/5 * * * *', $tache$
    select net.http_post(
      url     := 'https://chyuckryusxzssezesuw.supabase.co/functions/v1/rappels',
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'x-rappels', (select cle from public.rappels_reglage where id = 1)),
      body    := '{}'::jsonb,
      timeout_milliseconds := 25000);
  $tache$);
end $$;

-- ============================================================================
--  D. L'ÉTAT, LISIBLE DEPUIS LE JEU
-- ============================================================================
--  Ce que le téléphone peut savoir, et rien d'autre : la version installée,
--  le NOMBRE d'abonnements, si SA propre adresse est inscrite (il la connaît
--  déjà), si la tâche existe et tourne, son dernier passage, et la dernière
--  réponse de la fonction (son code, et le début de ce qu'elle a dit — des
--  compteurs, ou ce qui manque ; jamais une clé).
create or replace function public.rappels_etat(p_endpoint text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := jsonb_build_object('version', 329);
  t jsonb;
begin
  r := r || jsonb_build_object(
    'abonnes', (select count(*) from public.push_subs),
    'inscrit', case when p_endpoint is null then null
                    else exists (select 1 from public.push_subs where endpoint = p_endpoint) end,
    'cle_interne', exists (select 1 from public.rappels_reglage),
    -- (v329) les téléphones rattachés à un compte : ceux que les messages
    -- des groupes peuvent prévenir
    'lies', (select count(*) from public.push_subs where membre is not null),
    'messages_branches', exists (select 1 from pg_trigger where tgname = 'messages_a_prevenir'));
  -- Chaque lecture dans son propre filet : un droit qui manque sur le schéma
  -- de pg_cron ou de pg_net ne doit pas faire tomber tout le diagnostic.
  r := r || jsonb_build_object('cron', to_regclass('cron.job') is not null,
                               'net', to_regnamespace('net') is not null);
  if to_regclass('cron.job') is not null then
    begin
      execute $q$select to_jsonb(x) from (select active, schedule from cron.job where jobname = 'rappels' limit 1) x$q$ into t;
      r := r || jsonb_build_object('tache', t);
    exception when others then
      r := r || jsonb_build_object('tache', jsonb_build_object('erreur', sqlerrm));
    end;
    if to_regclass('cron.job_run_details') is not null then
      begin
        execute $q$select to_jsonb(x) from (
                     select d.status, d.start_time, left(d.return_message, 200) as message
                       from cron.job_run_details d join cron.job c on c.jobid = d.jobid
                      where c.jobname = 'rappels' order by d.start_time desc limit 1) x$q$ into t;
        r := r || jsonb_build_object('passage', t);
      exception when others then
        r := r || jsonb_build_object('passage', jsonb_build_object('erreur', sqlerrm));
      end;
    end if;
  end if;
  if to_regclass('net._http_response') is not null then
    begin
      -- La dernière réponse de la TÂCHE : celles des messages (v329, « sorte »
      -- message) parlent d'autre chose, on les lit à part.
      execute $q$select to_jsonb(x) from (
                   select status_code, left(content, 400) as contenu, error_msg, created
                     from net._http_response
                    where coalesce(content, '') not like '%"sorte":"message"%'
                    order by created desc limit 1) x$q$ into t;
      r := r || jsonb_build_object('reponse', t);
      execute $q$select to_jsonb(x) from (
                   select status_code, left(content, 300) as contenu, error_msg, created
                     from net._http_response
                    where coalesce(content, '') like '%"sorte":"message"%'
                    order by created desc limit 1) x$q$ into t;
      r := r || jsonb_build_object('reponse_message', t);
    exception when others then
      r := r || jsonb_build_object('reponse', jsonb_build_object('erreur', sqlerrm));
    end;
  end if;
  return r;
end; $$;
revoke all on function public.rappels_etat(text) from public;
grant execute on function public.rappels_etat(text) to anon, authenticated;

-- ============================================================================
--  E. LES MESSAGES DES GROUPES (v329)
-- ============================================================================
--  « Je veux aussi que tu fasses les notifications des messages. » Un message
--  posté dans un groupe (un texte, ou une partie lancée — jamais une ligne du
--  jeu comme « X a rejoint ») appelle la fonction « rappels » avec la clé
--  interne. C'est ELLE qui décide qui prévenir : les membres qui ne l'ont pas
--  encore lu, selon Tout / Mentions / Muet, sauf l'auteur et ceux qui l'ont
--  bloqué. L'appel part de pg_net, en arrière-plan : le message est déjà posé,
--  et RIEN ici ne peut le faire échouer — sans pg_net, sans clé, sur une
--  panne, on se tait.
create or replace function public._messages_a_prevenir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.genre in ('texte', 'partie') and to_regnamespace('net') is not null then
    begin
      perform net.http_post(
        url     := 'https://chyuckryusxzssezesuw.supabase.co/functions/v1/rappels',
        headers := jsonb_build_object('Content-Type', 'application/json',
                                      'x-rappels', (select cle from public.rappels_reglage where id = 1)),
        body    := jsonb_build_object('message', new.id),
        timeout_milliseconds := 25000);
    exception when others then
      null;   -- une notification ne vaut pas un message perdu
    end;
  end if;
  return new;
end $$;
revoke all on function public._messages_a_prevenir() from public, anon, authenticated;
do $$
begin
  if to_regclass('public.messages') is null then
    raise notice 'pas encore de groupes (public.messages) : colle groupes/table.sql, puis recolle ce fichier';
    return;
  end if;
  drop trigger if exists messages_a_prevenir on public.messages;
  create trigger messages_a_prevenir after insert on public.messages
    for each row execute function public._messages_a_prevenir();
end $$;

-- Et PostgREST relit les fonctions tout de suite (la nouvelle signature de
-- push_enregistrer) : sans cela, il peut garder l'ancienne quelques minutes.
notify pgrst, 'reload schema';
