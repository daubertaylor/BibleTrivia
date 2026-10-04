-- ============================================================================
-- LES GROUPES DE YADA : PARLER ET JOUER ENSEMBLE
-- ============================================================================
-- « Créer des groupes publics et privés, pouvoir parler, jouer ensemble via
--   les groupes facilement, avec un système de modération — les admins, etc.
--   Et pour la conformité des stores, ajoute-le. »  (Taylor)
--
-- PRÉREQUIS : comptes/table.sql (les comptes). Un groupe n'a de sens qu'entre
-- personnes qu'on peut reconnaître, bloquer et, au besoin, exclure : sans
-- compte, il n'y a personne à exclure.
--
-- LA RÈGLE QUI TIENT TOUT LE RESTE : AUCUNE ÉCRITURE DIRECTE.
-- Comme pour la sauvegarde, le téléphone n'écrit JAMAIS dans une table : il
-- appelle une fonction, qui vérifie (membre ? muet ? banni ? trop vite ? mot
-- interdit ?) avant de toucher à quoi que ce soit. Une politique d'écriture
-- laissée ouverte « pour plus tard » serait la porte par laquelle passerait
-- tout ce qu'on prétend empêcher.
--
-- CE QUE LES STORES DEMANDENT pour du contenu écrit par les joueurs
-- (Apple 1.2, Google « User Generated Content »), et où c'est ici :
--   * un FILTRE avant publication ........ _interdit(), _coordonnees(), débit
--   * SIGNALER un contenu ................. signaler()  (+ masquage auto)
--   * BLOQUER quelqu'un ................... bloquer()   (ses messages disparaissent pour toi)
--   * des RÈGLES acceptées (tolérance 0) .. accepter_regles()
--   * une RÉPONSE rapide aux signalements . moderation_ouverte(), traiter_signalement()
--   * SUPPRIMER son compte dans l'app ..... supprimer_mon_compte()  (comptes/table.sql, Apple 5.1.1(v))
-- Et côté jeu : un contact publié et une page de confidentialité.
--
-- Comment l'installer : groupes/LISEZMOI.md (l'ordre compte).
-- ============================================================================


-- ============================================================================
-- 0. L'INTERRUPTEUR : D'ABORD TOI, ENSUITE TOUT LE MONDE
-- ============================================================================
-- Tant que « groupes_ouverts » est faux, seuls les modérateurs voient les
-- groupes dans le jeu et peuvent s'en servir : Taylor essaie tout sur son
-- téléphone, avec ses propres groupes, avant que quiconque ne les voie. Le
-- jour où c'est bon : une ligne (voir LISEZMOI).
create table if not exists public.reglages_jeu (
  cle              boolean primary key default true check (cle),   -- une seule ligne, toujours
  groupes_ouverts  boolean not null default false,
  regles_version   int     not null default 1
);
insert into public.reglages_jeu (cle) values (true) on conflict (cle) do nothing;
alter table public.reglages_jeu enable row level security;
drop policy if exists "tout le monde lit les réglages du jeu" on public.reglages_jeu;
create policy "tout le monde lit les réglages du jeu"
  on public.reglages_jeu for select to anon, authenticated using (true);

-- Les modérateurs du jeu (Taylor). On s'y ajoute À LA MAIN, dans l'éditeur
-- SQL : aucun chemin du jeu ne permet de s'y inscrire.
create table if not exists public.moderateurs (
  id uuid primary key references auth.users(id) on delete cascade
);
alter table public.moderateurs enable row level security;
drop policy if exists "chacun sait s'il est modérateur" on public.moderateurs;
create policy "chacun sait s'il est modérateur"
  on public.moderateurs for select to authenticated using (id = auth.uid());


-- ============================================================================
-- 1. LES TABLES
-- ============================================================================

-- CE QUE LES AUTRES VOIENT DE TOI dans un groupe : un nom, une couleur.
-- Rien d'autre — pas d'adresse, pas de photo pour l'instant (une image
-- envoyée par un joueur se modère beaucoup plus mal qu'un mot).
create table if not exists public.profils (
  id                uuid primary key references auth.users(id) on delete cascade,
  nom               text not null check (char_length(nom) between 1 and 20),
  couleur           text not null default '#4C86E8' check (couleur ~ '^#[0-9A-Fa-f]{6}$'),
  regles_acceptees  timestamptz,                 -- les règles de la communauté
  regles_version    int,
  age_ok            boolean not null default false,   -- « j'ai 13 ans ou plus »
  banni_le          timestamptz,                 -- exclu de TOUS les groupes par la modération
  maj               timestamptz not null default now()
);

create table if not exists public.groupes (
  id               uuid primary key default gen_random_uuid(),
  nom              text not null check (char_length(nom) between 3 and 40),
  description      text not null default '' check (char_length(description) <= 160),
  ouvert           boolean not null default false,   -- vrai = public (on le trouve dans « Découvrir »)
  code             text not null unique,             -- invitation : six caractères, sans 0/O ni 1/I
  langue           text not null default 'fr' check (langue in ('fr','en','es')),
  teinte           smallint not null default 0 check (teinte between 0 and 7),
  createur         uuid references auth.users(id) on delete set null,
  nb_membres       int not null default 0,
  dernier_message  timestamptz,
  cree_le          timestamptz not null default now(),
  supprime_le      timestamptz
);

create table if not exists public.membres (
  groupe      uuid not null references public.groupes(id) on delete cascade,
  membre      uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'membre' check (role in ('proprietaire','admin','membre')),
  rejoint_le  timestamptz not null default now(),
  muet_jusqu  timestamptz,
  lu_jusqu    bigint not null default 0,          -- le dernier message vu : les non-lus
  primary key (groupe, membre)
);
create index if not exists membres_par_membre on public.membres (membre);

create table if not exists public.bannis (
  groupe  uuid not null references public.groupes(id) on delete cascade,
  membre  uuid not null references auth.users(id) on delete cascade,
  par     uuid references auth.users(id) on delete set null,
  le      timestamptz not null default now(),
  primary key (groupe, membre)
);

create table if not exists public.messages (
  id           bigint generated always as identity primary key,
  groupe       uuid not null references public.groupes(id) on delete cascade,
  auteur       uuid references auth.users(id) on delete cascade,    -- null : un mot du jeu
  genre        text not null default 'texte' check (genre in ('texte','partie','systeme')),
  texte        text not null default '' check (char_length(texte) <= 500),
  donnees      jsonb not null default '{}'::jsonb check (pg_column_size(donnees) < 2000),
  cree_le      timestamptz not null default now(),
  masque       boolean not null default false,    -- retiré par la modération ou par signalements
  supprime_le  timestamptz
);
create index if not exists messages_par_groupe on public.messages (groupe, id desc);
create index if not exists messages_par_auteur on public.messages (auteur, cree_le desc);

-- Le texte d'un message MASQUÉ ne reste pas dans la table que les membres
-- lisent : il part ici, où seuls les modérateurs et les admins du groupe le
-- relisent pour décider. Un message caché « à l'écran » mais toujours
-- téléchargeable ne serait pas caché.
create table if not exists public.messages_caches (
  message  bigint primary key references public.messages(id) on delete cascade,
  texte    text not null,
  le       timestamptz not null default now()
);

create table if not exists public.signalements (
  id         bigint generated always as identity primary key,
  par        uuid not null references auth.users(id) on delete cascade,
  groupe     uuid references public.groupes(id) on delete cascade,
  message    bigint references public.messages(id) on delete cascade,
  cible      uuid references auth.users(id) on delete cascade,
  raison     text not null check (raison in ('harcelement','inapproprie','spam','danger','autre')),
  details    text not null default '' check (char_length(details) <= 300),
  cree_le    timestamptz not null default now(),
  traite_le  timestamptz,
  decision   text
);
create index if not exists signalements_ouverts on public.signalements (cree_le) where traite_le is null;

create table if not exists public.blocages (
  par     uuid not null references auth.users(id) on delete cascade,
  bloque  uuid not null references auth.users(id) on delete cascade,
  le      timestamptz not null default now(),
  primary key (par, bloque),
  check (par <> bloque)
);

-- LE FILTRE. Des mots entiers, en minuscules et sans accents (voir
-- _normaliser). La liste de départ est en bas du fichier ; on en ajoute
-- depuis l'éditeur SQL, sans toucher au jeu.
create table if not exists public.mots_interdits (
  mot text primary key check (mot ~ '^[a-z]{2,40}$')   -- tel que _normaliser le laisse : a à z, rien d'autre
);


-- ============================================================================
-- 2. LES PETITES FONCTIONS INTERNES
-- ============================================================================
-- « security definer » : elles lisent les tables SANS les règles d'accès, ce
-- qui évite qu'une règle sur « membres » ait besoin de lire « membres » (une
-- boucle sans fin). Elles ne sont JAMAIS exposées au téléphone : on retire le
-- droit de les appeler juste après.

create or replace function public._moderateur(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.moderateurs where id = u)
$$;

create or replace function public._role(g uuid, u uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.membres where groupe = g and membre = u
$$;

create or replace function public._membre(g uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membres where groupe = g and membre = u)
$$;

create or replace function public._partage_un_groupe(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membres x join public.membres y on x.groupe = y.groupe
                 where x.membre = a and y.membre = b)
$$;

create or replace function public._bloque(par uuid, qui uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select qui is not null and exists (select 1 from public.blocages b where b.par = $1 and b.bloque = $2)
$$;

-- Minuscules, sans accents, chiffres « déguisés » remis en lettres
-- (« c0nn4rd » -> « connard »).
create or replace function public._normaliser(t text) returns text
language sql immutable set search_path = '' as $$
  select translate(lower(coalesce(t, '')),
           'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ0134578@$',
           'aaaaaaceeeeiiiinooooouuuuyyoaoieastbas')
$$;

-- Un mot de la liste, ENTIER (« con » ne bloque pas « conduire »). Les
-- lettres répétées pour passer le filtre (« fuuuuck », « connnnard ») sont
-- ramenées à une ET à deux : la liste a des mots à lettre simple et à lettre
-- double, et on ne réduit jamais une lettre doublée d'un vrai mot (« Niger »
-- n'est pas « nigger »).
create or replace function public._interdit(t text) returns boolean
language sql stable security definer set search_path = '' as $$
  with n as (select public._normaliser(t) as base)
  select exists (
    select 1 from public.mots_interdits m, n
     where regexp_replace(n.base, '(.)\1{2,}', '\1', 'g')   ~ ('(^|[^a-z])' || m.mot || '([^a-z]|$)')
        or regexp_replace(n.base, '(.)\1{2,}', '\1\1', 'g') ~ ('(^|[^a-z])' || m.mot || '([^a-z]|$)')
  )
$$;

-- Liens, adresses e-mail, numéros de téléphone : refusés dans les groupes
-- PUBLICS. Des inconnus s'y croisent — et des mineurs : on n'y échange pas de
-- coordonnées. Dans un groupe privé (sur invitation), on se connaît.
create or replace function public._coordonnees(t text) returns boolean
language sql immutable set search_path = '' as $$
  select t ~* '(https?://|www\.|[a-z0-9-]+\.(com|fr|net|org|io|be|ch|ca|es|me|ly|gg|app)(/|\s|$))'
      or t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      or regexp_replace(t, '[\s.\-()+]', '', 'g') ~ '[0-9]{8,}'
$$;

create or replace function public._code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- ni 0/O ni 1/I : se dicte sans erreur
  c text;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groupes where code = c);
  end loop;
  return c;
end $$;

-- Peut-on se servir des groupes ? Ouverts à tous, ou modérateur pendant
-- l'essai ; règles acceptées ; 13 ans déclarés ; pas banni du jeu.
create or replace function public._peut_participer(u uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.reglages_jeu;
  p public.profils;
begin
  if u is null then return 'non_connecte'; end if;
  select * into r from public.reglages_jeu limit 1;
  if not coalesce(r.groupes_ouverts, false) and not public._moderateur(u) then return 'ferme'; end if;
  select * into p from public.profils where id = u;
  if p.id is null then return 'sans_profil'; end if;
  if p.banni_le is not null then return 'banni'; end if;
  if p.regles_acceptees is null or coalesce(p.regles_version, 0) < r.regles_version or not p.age_ok then return 'regles'; end if;
  return 'ok';
end $$;

-- Le nom de quelqu'un, pour l'écrire DANS un mot du jeu. Une fois exclu, il
-- ne partage plus de groupe avec les autres : leur règle d'accès ne leur
-- laisse plus lire son profil, et « X a été exclu » deviendrait « quelqu'un a
-- été exclu ». On garde donc le nom dans le message lui-même, au moment où il
-- est écrit.
create or replace function public._nom(u uuid) returns text
language sql stable security definer set search_path = '' as $$
  select nom from public.profils where id = u
$$;

-- Un mot du jeu dans la discussion (« X a rejoint le groupe »).
create or replace function public._annoncer(g uuid, quoi text, d jsonb) returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.messages (groupe, auteur, genre, texte, donnees) values (g, null, 'systeme', quoi, coalesce(d, '{}'::jsonb));
  update public.groupes set dernier_message = now() where id = g;
$$;


-- ============================================================================
-- 3. QUI PEUT LIRE QUOI
-- ============================================================================
alter table public.profils          enable row level security;
alter table public.groupes          enable row level security;
alter table public.membres          enable row level security;
alter table public.bannis           enable row level security;
alter table public.messages         enable row level security;
alter table public.messages_caches  enable row level security;
alter table public.signalements     enable row level security;
alter table public.blocages         enable row level security;
alter table public.mots_interdits   enable row level security;

drop policy if exists "son profil et ceux de ses groupes" on public.profils;
create policy "son profil et ceux de ses groupes" on public.profils for select to authenticated
  using (id = auth.uid() or public._partage_un_groupe(auth.uid(), id) or public._moderateur(auth.uid()));

-- Un groupe public se voit (pour le trouver et le rejoindre) ; un privé ne
-- se voit que de ses membres. On y entre par son code, via groupe_par_code().
drop policy if exists "groupes publics et les siens" on public.groupes;
create policy "groupes publics et les siens" on public.groupes for select to authenticated
  using (supprime_le is null and (ouvert or public._membre(id, auth.uid()) or public._moderateur(auth.uid())));

drop policy if exists "les membres de ses groupes" on public.membres;
create policy "les membres de ses groupes" on public.membres for select to authenticated
  using (public._membre(groupe, auth.uid()) or public._moderateur(auth.uid()));

drop policy if exists "les admins voient les bannis" on public.bannis;
create policy "les admins voient les bannis" on public.bannis for select to authenticated
  using (public._role(groupe, auth.uid()) in ('proprietaire','admin') or public._moderateur(auth.uid()));

-- Les messages de ses groupes — moins ceux des gens qu'on a bloqués. C'est
-- le SERVEUR qui les retire : même la diffusion en direct ne les apporte pas.
drop policy if exists "les messages de ses groupes" on public.messages;
create policy "les messages de ses groupes" on public.messages for select to authenticated
  using ((public._membre(groupe, auth.uid()) or public._moderateur(auth.uid()))
         and not public._bloque(auth.uid(), auteur));

drop policy if exists "les textes cachés, pour décider" on public.messages_caches;
create policy "les textes cachés, pour décider" on public.messages_caches for select to authenticated
  using (public._moderateur(auth.uid())
         or exists (select 1 from public.messages m where m.id = message
                     and public._role(m.groupe, auth.uid()) in ('proprietaire','admin')));

drop policy if exists "signalements : modérateurs et admins du groupe" on public.signalements;
create policy "signalements : modérateurs et admins du groupe" on public.signalements for select to authenticated
  using (par = auth.uid() or public._moderateur(auth.uid())
         or (groupe is not null and public._role(groupe, auth.uid()) in ('proprietaire','admin')));

drop policy if exists "ses blocages" on public.blocages;
create policy "ses blocages" on public.blocages for select to authenticated using (par = auth.uid());

-- La liste des mots n'est lue par personne d'autre que le serveur.

-- ET AUCUNE POLITIQUE D'ÉCRITURE, NULLE PART. Deux serrures valent mieux
-- qu'une : on retire aussi les droits d'écriture que Supabase accorde d'office.
revoke insert, update, delete on public.profils, public.groupes, public.membres, public.bannis,
  public.messages, public.messages_caches, public.signalements, public.blocages, public.mots_interdits,
  public.reglages_jeu, public.moderateurs from anon, authenticated;
revoke all on public.mots_interdits from anon, authenticated;


-- ============================================================================
-- 4. CE QUE LE TÉLÉPHONE PEUT APPELER
-- ============================================================================
-- Toutes rendent du jsonb : { ok: true, ... } ou { ok: false, erreur: '...' }.
-- Une erreur attendue (mot interdit, trop vite) n'est pas une panne : le jeu
-- la traduit en phrase pour le joueur.

create or replace function public.mon_etat_groupes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  r public.reglages_jeu;
begin
  select * into r from public.reglages_jeu limit 1;
  return jsonb_build_object(
    'ouverts', coalesce(r.groupes_ouverts, false),
    'moderateur', public._moderateur(moi),
    'participe', public._peut_participer(moi),
    'regles_version', r.regles_version,
    'profil', (select to_jsonb(p) - 'banni_le' from public.profils p where p.id = moi)
  );
end $$;

create or replace function public.poser_profil(p_nom text, p_couleur text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare moi uuid := auth.uid(); n text := btrim(coalesce(p_nom, ''));
begin
  if moi is null then return jsonb_build_object('ok', false, 'erreur', 'non_connecte'); end if;
  if char_length(n) < 1 or char_length(n) > 20 then return jsonb_build_object('ok', false, 'erreur', 'nom_longueur'); end if;
  if public._interdit(n) then return jsonb_build_object('ok', false, 'erreur', 'mot_interdit'); end if;
  if coalesce(p_couleur, '') !~ '^#[0-9A-Fa-f]{6}$' then p_couleur := '#4C86E8'; end if;
  insert into public.profils (id, nom, couleur, maj) values (moi, n, p_couleur, now())
  on conflict (id) do update set nom = excluded.nom, couleur = excluded.couleur, maj = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.accepter_regles(p_version int, p_age_ok boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare moi uuid := auth.uid();
begin
  if moi is null then return jsonb_build_object('ok', false, 'erreur', 'non_connecte'); end if;
  if not coalesce(p_age_ok, false) then return jsonb_build_object('ok', false, 'erreur', 'age'); end if;
  if not exists (select 1 from public.profils where id = moi) then return jsonb_build_object('ok', false, 'erreur', 'sans_profil'); end if;
  update public.profils set regles_acceptees = now(), regles_version = p_version, age_ok = true, maj = now() where id = moi;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.creer_groupe(p_nom text, p_description text, p_ouvert boolean, p_langue text, p_teinte int) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  etat text := public._peut_participer(moi);
  n text := btrim(coalesce(p_nom, ''));
  d text := btrim(coalesce(p_description, ''));
  g uuid; c text;
begin
  if etat <> 'ok' then return jsonb_build_object('ok', false, 'erreur', etat); end if;
  if char_length(n) < 3 or char_length(n) > 40 then return jsonb_build_object('ok', false, 'erreur', 'nom_longueur'); end if;
  if char_length(d) > 160 then return jsonb_build_object('ok', false, 'erreur', 'description_longueur'); end if;
  if public._interdit(n) or public._interdit(d) then return jsonb_build_object('ok', false, 'erreur', 'mot_interdit'); end if;
  if coalesce(p_ouvert, false) and (public._coordonnees(n) or public._coordonnees(d)) then return jsonb_build_object('ok', false, 'erreur', 'coordonnees'); end if;
  -- Des limites qu'un joueur ne croise jamais, et qu'un robot croise tout de suite.
  if (select count(*) from public.groupes where createur = moi and cree_le > now() - interval '1 day') >= 5 then
    return jsonb_build_object('ok', false, 'erreur', 'trop_de_groupes'); end if;
  if (select count(*) from public.membres where membre = moi) >= 30 then
    return jsonb_build_object('ok', false, 'erreur', 'trop_de_groupes'); end if;
  c := public._code();
  insert into public.groupes (nom, description, ouvert, code, langue, teinte, createur, nb_membres, dernier_message)
  values (n, d, coalesce(p_ouvert, false), c,
          case when p_langue in ('fr','en','es') then p_langue else 'fr' end,
          greatest(0, least(7, coalesce(p_teinte, 0))), moi, 1, now())
  returning id into g;
  insert into public.membres (groupe, membre, role) values (g, moi, 'proprietaire');
  perform public._annoncer(g, 'cree', jsonb_build_object('par', moi, 'nom', public._nom(moi)));
  return jsonb_build_object('ok', true, 'id', g, 'code', c);
end $$;

-- Un aperçu avant d'entrer : on tape un code, on voit le nom et le nombre de
-- membres — pas les messages, pas la liste des membres.
create or replace function public.groupe_par_code(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare g public.groupes;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'erreur', 'non_connecte'); end if;
  select * into g from public.groupes where code = upper(btrim(coalesce(p_code, ''))) and supprime_le is null;
  if g.id is null then return jsonb_build_object('ok', false, 'erreur', 'code_inconnu'); end if;
  return jsonb_build_object('ok', true, 'id', g.id, 'nom', g.nom, 'description', g.description,
    'ouvert', g.ouvert, 'nb_membres', g.nb_membres, 'teinte', g.teinte, 'membre', public._membre(g.id, auth.uid()));
end $$;

create or replace function public.rejoindre_groupe(p_groupe uuid, p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  etat text := public._peut_participer(moi);
  g public.groupes;
begin
  if etat <> 'ok' then return jsonb_build_object('ok', false, 'erreur', etat); end if;
  if p_code is not null and btrim(p_code) <> '' then
    select * into g from public.groupes where code = upper(btrim(p_code)) and supprime_le is null;
  else
    select * into g from public.groupes where id = p_groupe and supprime_le is null;
    -- Sans code, on n'entre QUE dans un groupe public.
    if g.id is not null and not g.ouvert then g := null; end if;
  end if;
  if g.id is null then return jsonb_build_object('ok', false, 'erreur', 'code_inconnu'); end if;
  if public._membre(g.id, moi) then return jsonb_build_object('ok', true, 'id', g.id, 'deja', true); end if;
  if exists (select 1 from public.bannis where groupe = g.id and membre = moi) then
    return jsonb_build_object('ok', false, 'erreur', 'banni_du_groupe'); end if;
  if g.nb_membres >= 200 then return jsonb_build_object('ok', false, 'erreur', 'groupe_plein'); end if;
  if (select count(*) from public.membres where membre = moi) >= 30 then
    return jsonb_build_object('ok', false, 'erreur', 'trop_de_groupes'); end if;
  insert into public.membres (groupe, membre, role, lu_jusqu)
  values (g.id, moi, 'membre', coalesce((select max(id) from public.messages where groupe = g.id), 0));
  update public.groupes set nb_membres = nb_membres + 1 where id = g.id;
  perform public._annoncer(g.id, 'rejoint', jsonb_build_object('par', moi, 'nom', public._nom(moi)));
  return jsonb_build_object('ok', true, 'id', g.id);
end $$;

-- Quitter. Le propriétaire qui part passe la main au plus ancien admin, à
-- défaut au plus ancien membre ; un groupe vide s'éteint.
create or replace function public._passer_la_main(g uuid, partant uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare suivant uuid;
begin
  select membre into suivant from public.membres
   where groupe = g and membre <> partant
   order by (role = 'admin') desc, rejoint_le asc limit 1;
  if suivant is null then
    update public.groupes set supprime_le = now() where id = g;
  else
    update public.membres set role = 'proprietaire' where groupe = g and membre = suivant;
  end if;
end $$;

create or replace function public.quitter_groupe(p_groupe uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare moi uuid := auth.uid(); r text := public._role(p_groupe, moi);
begin
  if moi is null then return jsonb_build_object('ok', false, 'erreur', 'non_connecte'); end if;
  if r is null then return jsonb_build_object('ok', true); end if;
  if r = 'proprietaire' then perform public._passer_la_main(p_groupe, moi); end if;
  delete from public.membres where groupe = p_groupe and membre = moi;
  update public.groupes set nb_membres = greatest(0, nb_membres - 1) where id = p_groupe;
  perform public._annoncer(p_groupe, 'parti', jsonb_build_object('par', moi, 'nom', public._nom(moi)));
  return jsonb_build_object('ok', true);
end $$;

-- ENVOYER. Toutes les vérifications ont lieu ICI, sur le serveur : un
-- téléphone modifié ne contourne rien.
create or replace function public.envoyer_message(p_groupe uuid, p_texte text, p_genre text, p_donnees jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  etat text := public._peut_participer(moi);
  t text := btrim(coalesce(p_texte, ''));
  genre text := coalesce(p_genre, 'texte');
  d jsonb := '{}'::jsonb;
  m public.membres;
  g public.groupes;
  dernier timestamptz;
  id_ bigint;
begin
  if etat <> 'ok' then return jsonb_build_object('ok', false, 'erreur', etat); end if;
  select * into m from public.membres where groupe = p_groupe and membre = moi;
  if m.groupe is null then return jsonb_build_object('ok', false, 'erreur', 'pas_membre'); end if;
  if m.muet_jusqu is not null and m.muet_jusqu > now() then
    return jsonb_build_object('ok', false, 'erreur', 'muet', 'jusqu', m.muet_jusqu); end if;
  select * into g from public.groupes where id = p_groupe and supprime_le is null;
  if g.id is null then return jsonb_build_object('ok', false, 'erreur', 'groupe_ferme'); end if;
  -- Le débit : une seconde entre deux messages, vingt par minute, cinq cents par jour.
  select max(cree_le) into dernier from public.messages where auteur = moi;
  if dernier is not null and dernier > now() - interval '1 second' then
    return jsonb_build_object('ok', false, 'erreur', 'trop_vite'); end if;
  if (select count(*) from public.messages where auteur = moi and cree_le > now() - interval '1 minute') >= 20
     or (select count(*) from public.messages where auteur = moi and cree_le > now() - interval '1 day') >= 500 then
    return jsonb_build_object('ok', false, 'erreur', 'trop_vite'); end if;
  if genre = 'texte' then
    if char_length(t) < 1 then return jsonb_build_object('ok', false, 'erreur', 'vide'); end if;
    if char_length(t) > 500 then return jsonb_build_object('ok', false, 'erreur', 'trop_long'); end if;
    if public._interdit(t) then return jsonb_build_object('ok', false, 'erreur', 'mot_interdit'); end if;
    if g.ouvert and public._coordonnees(t) then return jsonb_build_object('ok', false, 'erreur', 'coordonnees'); end if;
  elsif genre = 'partie' then
    -- Une invitation à jouer : seulement le code d'un salon en ligne. Aucun
    -- texte libre ne passe par là.
    if coalesce(p_donnees->>'code', '') !~ '^[A-Z0-9]{4,8}$' then return jsonb_build_object('ok', false, 'erreur', 'partie_invalide'); end if;
    t := '';
    d := jsonb_build_object('code', p_donnees->>'code');
  else
    return jsonb_build_object('ok', false, 'erreur', 'genre');
  end if;
  insert into public.messages (groupe, auteur, genre, texte, donnees) values (p_groupe, moi, genre, t, d) returning id into id_;
  update public.groupes set dernier_message = now() where id = p_groupe;
  update public.membres set lu_jusqu = id_ where groupe = p_groupe and membre = moi;
  return jsonb_build_object('ok', true, 'id', id_);
end $$;

create or replace function public.marquer_lu(p_groupe uuid, p_message bigint) returns void
language sql volatile security definer set search_path = '' as $$
  update public.membres set lu_jusqu = greatest(lu_jusqu, coalesce(p_message, 0))
   where groupe = p_groupe and membre = auth.uid();
$$;

-- SUPPRIMER un message : son auteur, un admin du groupe, un modérateur. Le
-- message reste à sa place (« message supprimé »), vidé de son contenu.
create or replace function public.supprimer_message(p_message bigint) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare moi uuid := auth.uid(); m public.messages;
begin
  select * into m from public.messages where id = p_message;
  if m.id is null then return jsonb_build_object('ok', false, 'erreur', 'introuvable'); end if;
  if not (m.auteur = moi or public._role(m.groupe, moi) in ('proprietaire','admin') or public._moderateur(moi)) then
    return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
  update public.messages set texte = '', donnees = '{}'::jsonb, supprime_le = now() where id = p_message;
  delete from public.messages_caches where message = p_message;
  return jsonb_build_object('ok', true);
end $$;

-- MASQUER (interne) : le texte part en lieu sûr, le message reste à sa place.
create or replace function public._masquer(p_message bigint) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare m public.messages;
begin
  select * into m from public.messages where id = p_message;
  if m.id is null or m.masque then return; end if;
  if m.texte <> '' then
    insert into public.messages_caches (message, texte) values (m.id, m.texte) on conflict (message) do nothing;
  end if;
  update public.messages set masque = true, texte = '' where id = m.id;
end $$;

-- SIGNALER. Un message, un membre, ou un groupe entier. TROIS personnes
-- différentes qui signalent le même message suffisent à le masquer tout de
-- suite, sans attendre personne : la modération décidera ensuite, mais le
-- contenu ne reste pas affiché en attendant.
create or replace function public.signaler(p_message bigint, p_cible uuid, p_groupe uuid, p_raison text, p_details text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  m public.messages;
  g uuid := p_groupe;
  v_cible uuid := p_cible;
begin
  if moi is null then return jsonb_build_object('ok', false, 'erreur', 'non_connecte'); end if;
  if p_raison not in ('harcelement','inapproprie','spam','danger','autre') then return jsonb_build_object('ok', false, 'erreur', 'raison'); end if;
  if (select count(*) from public.signalements where par = moi and cree_le > now() - interval '1 day') >= 30 then
    return jsonb_build_object('ok', false, 'erreur', 'trop_vite'); end if;
  if p_message is not null then
    select * into m from public.messages where id = p_message;
    if m.id is null or not public._membre(m.groupe, moi) then return jsonb_build_object('ok', false, 'erreur', 'introuvable'); end if;
    g := m.groupe; v_cible := m.auteur;
  elsif g is not null and not (public._membre(g, moi) or exists (select 1 from public.groupes where id = g and ouvert)) then
    return jsonb_build_object('ok', false, 'erreur', 'introuvable');
  end if;
  if exists (select 1 from public.signalements where par = moi and message is not distinct from p_message
              and cible is not distinct from v_cible and groupe is not distinct from g and traite_le is null) then
    return jsonb_build_object('ok', true, 'deja', true);
  end if;
  insert into public.signalements (par, groupe, message, cible, raison, details)
  values (moi, g, p_message, v_cible, p_raison, left(coalesce(p_details, ''), 300));
  if p_message is not null and
     (select count(distinct par) from public.signalements where message = p_message and traite_le is null) >= 3 then
    perform public._masquer(p_message);
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.bloquer(p_cible uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare moi uuid := auth.uid();
begin
  if moi is null then return jsonb_build_object('ok', false, 'erreur', 'non_connecte'); end if;
  if p_cible is null or p_cible = moi then return jsonb_build_object('ok', false, 'erreur', 'cible'); end if;
  insert into public.blocages (par, bloque) values (moi, p_cible) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.debloquer(p_cible uuid) returns jsonb
language sql volatile security definer set search_path = '' as $$
  delete from public.blocages where par = auth.uid() and bloque = p_cible;
  select jsonb_build_object('ok', true);
$$;

-- MODÉRER UN MEMBRE. Le propriétaire peut tout ; un admin peut faire taire,
-- exclure ou bannir un simple membre, jamais un autre admin ni le
-- propriétaire. Seul le propriétaire nomme ou retire un admin.
create or replace function public.moderer_membre(p_groupe uuid, p_membre uuid, p_action text, p_minutes int) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  mon_role text := public._role(p_groupe, moi);
  son_role text := public._role(p_groupe, p_membre);
  modo boolean := public._moderateur(moi);
begin
  if moi is null then return jsonb_build_object('ok', false, 'erreur', 'non_connecte'); end if;
  if p_membre = moi then return jsonb_build_object('ok', false, 'erreur', 'soi_meme'); end if;
  if not modo and coalesce(mon_role, '') not in ('proprietaire','admin') then return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
  if not modo and mon_role = 'admin' and coalesce(son_role, 'membre') <> 'membre' then return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
  if p_action in ('promouvoir','retrograder') and not (modo or mon_role = 'proprietaire') then
    return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
  if p_action = 'muet' then
    update public.membres set muet_jusqu = now() + make_interval(mins => greatest(5, least(60*24*30, coalesce(p_minutes, 60))))
     where groupe = p_groupe and membre = p_membre;
  elsif p_action = 'parler' then
    update public.membres set muet_jusqu = null where groupe = p_groupe and membre = p_membre;
  elsif p_action in ('exclure','bannir') then
    if son_role = 'proprietaire' then return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
    delete from public.membres where groupe = p_groupe and membre = p_membre;
    if found then update public.groupes set nb_membres = greatest(0, nb_membres - 1) where id = p_groupe; end if;
    if p_action = 'bannir' then
      insert into public.bannis (groupe, membre, par) values (p_groupe, p_membre, moi) on conflict do nothing;
    end if;
    perform public._annoncer(p_groupe, case when p_action = 'bannir' then 'banni' else 'exclu' end,
                             jsonb_build_object('qui', p_membre, 'nom', public._nom(p_membre)));
  elsif p_action = 'debannir' then
    delete from public.bannis where groupe = p_groupe and membre = p_membre;
  elsif p_action = 'promouvoir' then
    update public.membres set role = 'admin' where groupe = p_groupe and membre = p_membre and role = 'membre';
    if found then
      perform public._annoncer(p_groupe, 'admin', jsonb_build_object('qui', p_membre, 'nom', public._nom(p_membre)));
    end if;
  elsif p_action = 'retrograder' then
    update public.membres set role = 'membre' where groupe = p_groupe and membre = p_membre and role = 'admin';
  else
    return jsonb_build_object('ok', false, 'erreur', 'action');
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.modifier_groupe(p_groupe uuid, p_nom text, p_description text, p_ouvert boolean, p_teinte int) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  n text := btrim(coalesce(p_nom, ''));
  d text := btrim(coalesce(p_description, ''));
begin
  if not (public._role(p_groupe, moi) in ('proprietaire','admin') or public._moderateur(moi)) then
    return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
  if char_length(n) < 3 or char_length(n) > 40 then return jsonb_build_object('ok', false, 'erreur', 'nom_longueur'); end if;
  if char_length(d) > 160 then return jsonb_build_object('ok', false, 'erreur', 'description_longueur'); end if;
  if public._interdit(n) or public._interdit(d) then return jsonb_build_object('ok', false, 'erreur', 'mot_interdit'); end if;
  if coalesce(p_ouvert, false) and (public._coordonnees(n) or public._coordonnees(d)) then return jsonb_build_object('ok', false, 'erreur', 'coordonnees'); end if;
  update public.groupes set nom = n, description = d, ouvert = coalesce(p_ouvert, ouvert),
         teinte = greatest(0, least(7, coalesce(p_teinte, teinte))) where id = p_groupe and supprime_le is null;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.nouveau_code(p_groupe uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare c text;
begin
  if not (public._role(p_groupe, auth.uid()) in ('proprietaire','admin') or public._moderateur(auth.uid())) then
    return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
  c := public._code();
  update public.groupes set code = c where id = p_groupe;
  return jsonb_build_object('ok', true, 'code', c);
end $$;

create or replace function public.supprimer_groupe(p_groupe uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not (public._role(p_groupe, auth.uid()) = 'proprietaire' or public._moderateur(auth.uid())) then
    return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
  update public.groupes set supprime_le = now() where id = p_groupe;
  delete from public.membres where groupe = p_groupe;
  return jsonb_build_object('ok', true);
end $$;

-- LES GROUPES PUBLICS À DÉCOUVRIR : par langue, les plus vivants d'abord,
-- avec une recherche sur le nom.
create or replace function public.groupes_publics(p_recherche text, p_langue text, p_limite int) returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', g.id, 'nom', g.nom, 'description', g.description, 'nb_membres', g.nb_membres,
                            'teinte', g.teinte, 'langue', g.langue, 'dernier_message', g.dernier_message,
                            'membre', public._membre(g.id, auth.uid()))
    from public.groupes g
   where g.ouvert and g.supprime_le is null and auth.uid() is not null
     and (p_langue is null or g.langue = p_langue)
     and (coalesce(p_recherche, '') = '' or public._normaliser(g.nom) like '%' || public._normaliser(p_recherche) || '%')
   order by g.dernier_message desc nulls last, g.nb_membres desc
   limit greatest(1, least(50, coalesce(p_limite, 30)))
$$;

-- MES GROUPES, avec le nombre de non-lus et le dernier message visible.
create or replace function public.mes_groupes() returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'id', g.id, 'nom', g.nom, 'ouvert', g.ouvert, 'teinte', g.teinte, 'code', g.code,
           'nb_membres', g.nb_membres, 'role', mb.role, 'muet_jusqu', mb.muet_jusqu,
           'dernier_message', g.dernier_message,
           'non_lus', (select count(*) from public.messages x
                        where x.groupe = g.id and x.id > mb.lu_jusqu and x.auteur is distinct from mb.membre
                          and x.supprime_le is null and not public._bloque(mb.membre, x.auteur) and x.genre <> 'systeme'),
           'apercu', (select jsonb_build_object('id', x.id, 'auteur', x.auteur, 'genre', x.genre, 'texte', x.texte,
                                                'donnees', x.donnees,
                                                'masque', x.masque, 'supprime', x.supprime_le is not null, 'le', x.cree_le,
                                                'nom', (select p.nom from public.profils p where p.id = x.auteur))
                        from public.messages x
                       where x.groupe = g.id and not public._bloque(mb.membre, x.auteur)
                       order by x.id desc limit 1))
    from public.membres mb join public.groupes g on g.id = mb.groupe
   where mb.membre = auth.uid() and g.supprime_le is null
   order by g.dernier_message desc nulls last
$$;


-- ============================================================================
-- 5. LA MODÉRATION DU JEU (Taylor)
-- ============================================================================
create or replace function public.moderation_ouverte() returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'id', s.id, 'raison', s.raison, 'details', s.details, 'le', s.cree_le,
           'groupe', s.groupe, 'groupe_nom', (select nom from public.groupes where id = s.groupe),
           'message', s.message,
           'texte', coalesce((select texte from public.messages_caches where message = s.message),
                             (select texte from public.messages where id = s.message)),
           'cible', s.cible, 'cible_nom', (select nom from public.profils where id = s.cible),
           'par_nom', (select nom from public.profils where id = s.par),
           'nb', (select count(distinct par) from public.signalements t
                   where t.traite_le is null and t.message is not distinct from s.message and t.cible is not distinct from s.cible))
    from public.signalements s
   where s.traite_le is null and public._moderateur(auth.uid())
   order by s.cree_le asc
   limit 100
$$;

create or replace function public.traiter_signalement(p_id bigint, p_decision text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare s public.signalements; moi uuid := auth.uid();
begin
  if not public._moderateur(moi) then return jsonb_build_object('ok', false, 'erreur', 'interdit'); end if;
  select * into s from public.signalements where id = p_id;
  if s.id is null then return jsonb_build_object('ok', false, 'erreur', 'introuvable'); end if;
  if p_decision = 'rejeter' then
    -- Rien de mal : un message masqué par les signalements revient.
    if s.message is not null then
      update public.messages m set masque = false, texte = c.texte
        from public.messages_caches c where c.message = m.id and m.id = s.message and m.supprime_le is null;
      delete from public.messages_caches where message = s.message;
    end if;
  elsif p_decision = 'masquer' then
    if s.message is not null then perform public._masquer(s.message); end if;
  elsif p_decision = 'bannir' then
    if s.message is not null then perform public._masquer(s.message); end if;
    if s.cible is not null then update public.profils set banni_le = now() where id = s.cible; end if;
  elsif p_decision = 'fermer_groupe' then
    if s.groupe is not null then update public.groupes set supprime_le = now() where id = s.groupe; end if;
  else
    return jsonb_build_object('ok', false, 'erreur', 'decision');
  end if;
  -- Tous les signalements du même objet sont réglés d'un coup.
  update public.signalements set traite_le = now(), decision = p_decision
   where traite_le is null and message is not distinct from s.message
     and cible is not distinct from s.cible and groupe is not distinct from s.groupe;
  return jsonb_build_object('ok', true);
end $$;


-- ============================================================================
-- 6. QUAND UN COMPTE PART (Apple 5.1.1(v))
-- ============================================================================
-- La suppression du compte elle-même vit dans comptes/table.sql
-- (supprimer_mon_compte) : elle doit exister même là où les groupes ne sont
-- pas installés. Elle appelle cette fonction-ci si elle la trouve, AVANT
-- d'effacer le compte : les groupes dont on était propriétaire passent au
-- suivant (voir _passer_la_main), et chaque groupe compte un membre de moins.
-- Tout le reste — profil, adhésions, messages, signalements faits, blocages —
-- part tout seul avec le compte (on delete cascade).
create or replace function public._quitter_tout(u uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare g record;
begin
  for g in select groupe from public.membres where membre = u and role = 'proprietaire' loop
    perform public._passer_la_main(g.groupe, u);
  end loop;
  update public.groupes x set nb_membres = greatest(0, nb_membres - 1)
    from public.membres m where m.groupe = x.id and m.membre = u;
end $$;


-- ============================================================================
-- 7. QUI A LE DROIT D'APPELER QUOI
-- ============================================================================
-- PostgreSQL ouvre l'exécution à tout le monde par défaut : on referme tout,
-- puis on rouvre aux connectés ce qui leur est destiné. Les fonctions
-- internes (_…) ne sont rouvertes à personne.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
              and p.proname in ('_moderateur','_role','_membre','_partage_un_groupe','_bloque','_normaliser','_interdit',
                                '_coordonnees','_code','_peut_participer','_annoncer','_passer_la_main','_masquer','_quitter_tout','_nom',
                                'mon_etat_groupes','poser_profil','accepter_regles','creer_groupe','groupe_par_code',
                                'rejoindre_groupe','quitter_groupe','envoyer_message','marquer_lu','supprimer_message',
                                'signaler','bloquer','debloquer','moderer_membre','modifier_groupe','nouveau_code',
                                'supprimer_groupe','groupes_publics','mes_groupes','moderation_ouverte',
                                'traiter_signalement')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if left(f.proname, 1) <> '_' then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;
-- Les règles d'accès appellent les fonctions internes AU NOM du joueur : il
-- doit pouvoir les exécuter là, et seulement là. Elles ne rendent qu'un vrai
-- ou faux, et ne lisent que ce que leur nom dit.
grant execute on function public._moderateur(uuid), public._role(uuid, uuid), public._membre(uuid, uuid),
  public._partage_un_groupe(uuid, uuid), public._bloque(uuid, uuid) to authenticated;


-- ============================================================================
-- 8. LE DIRECT : les nouveaux messages arrivent sans recharger
-- ============================================================================
-- Supabase diffuse les changements des tables de cette publication — en
-- appliquant les règles d'accès ci-dessus à CHAQUE destinataire : un message
-- d'un groupe dont on n'est pas membre, ou d'une personne qu'on a bloquée,
-- n'arrive jamais sur le téléphone.
-- LES MESSAGES SEULEMENT. Une table dont on SUPPRIME des lignes ne doit pas y
-- être : Supabase ne peut pas appliquer les règles d'accès à une ligne qui
-- n'existe plus, et enverrait la suppression à tous les abonnés. Les messages
-- ne sont jamais supprimés (on les vide) ; les adhésions, si — le jeu relit
-- donc « mes groupes » au lieu de les écouter.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then null;
    end;
  end if;
end $$;


-- ============================================================================
-- 9. LA LISTE DE DÉPART DU FILTRE
-- ============================================================================
-- Des mots ENTIERS (« con » ne bloque pas « conduire »), après normalisation
-- (minuscules, sans accents, chiffres remis en lettres). Les insultes et le
-- vocabulaire sexuel les plus courants, en français, en anglais et en
-- espagnol. Elle n'a pas à être complète : la modération la complète au fil
-- des signalements (insert into public.mots_interdits values ('…');).
-- CE QUI N'Y EST PAS, EXPRÈS : des mots que la Bible emploie et dont on
-- parle dans un jeu biblique — « baiser » (le baiser de Judas), « cock » (le
-- coq du reniement de Pierre), « crever » (les yeux de Samson), « suicide »
-- (Judas) — et « bite », qui est l'anglais de « mordre ».
insert into public.mots_interdits (mot) values
  -- français
  ('connard'),('connarde'),('connasse'),('conasse'),('encule'),('enculee'),('enculer'),('salope'),('salaud'),('pute'),('putain'),
  ('ptn'),('fdp'),('ntm'),('nique'),('niquer'),('batard'),('batarde'),('pd'),('pede'),('tapette'),('gouine'),
  ('negro'),('negre'),('bougnoule'),('youpin'),('chinetoque'),('couille'),('couilles'),('chatte'),
  ('branleur'),('branler'),('sucer'),('suceur'),('suceuse'),('porno'),('baise'),('cul'),('merde'),
  ('emmerde'),('abruti'),('debile'),('mongol'),('attarde'),
  -- anglais
  ('fuck'),('fucking'),('fucker'),('motherfucker'),('shit'),('bitch'),('bastard'),('asshole'),('dick'),
  ('pussy'),('cunt'),('whore'),('slut'),('nigger'),('nigga'),('faggot'),('fag'),('retard'),('porn'),('sex'),
  ('kys'),('wanker'),('twat'),
  -- espagnol
  ('puta'),('puto'),('cabron'),('cabrona'),('pendejo'),('pendeja'),('mierda'),('joder'),('cono'),
  ('maricon'),('marica'),('verga'),('polla'),('gilipollas'),('chinga'),('chingar'),('culero'),('zorra'),('hijueputa')
on conflict (mot) do nothing;
