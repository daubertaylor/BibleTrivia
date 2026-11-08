-- ============================================================================
--  LÀ OÙ ARRIVENT LES ERREURS DES JOUEURS
-- ============================================================================
--  À COLLER DANS L'ÉDITEUR SQL DE SUPABASE. Une seule fois.
--
--  POURQUOI CETTE TABLE EXISTE
--  Le jeu compte cent onze blocs try/catch. C'est une force — rien ne s'arrête
--  brutalement — et c'est exactement pour ça que tout échec est SILENCIEUX. Un
--  bouton qui ne répond plus sur un modèle de téléphone précis peut durer des
--  mois sans que personne ne l'apprenne. Le seul capteur du jeu, jusqu'ici,
--  c'était Taylor qui l'utilise. Ça ne tient plus avec des joueurs.
--
--  CE QU'ELLE CONTIENT, ET CE QU'ELLE NE CONTIENDRA JAMAIS
--  Le message de l'erreur, l'endroit dans le fichier, l'écran où on était, la
--  version du jeu, la langue, et une signature d'appareil grossière
--  (« Android 13 · Chrome · Redmi Note 12 »).
--  Pas de nom, pas d'adresse, pas de score, pas une question, et AUCUN
--  identifiant qui suivrait quelqu'un d'une fois sur l'autre. Une erreur doit
--  pouvoir se lire sans rien apprendre de celui à qui elle est arrivée.
-- ============================================================================

create table if not exists public.erreurs (
  id        bigint      generated always as identity primary key,
  quand     timestamptz not null default now(),
  message   text        not null,
  ou        text,                       -- ligne:colonne dans index.html
  ecran     text,                       -- l'écran du jeu (mode, play, revoir…)
  version   text,                       -- « v276 » : sans elle, un rapport ne vaut rien
  langue    text,
  appareil  text,
  combien   int         not null default 1,   -- la même erreur, répétée

  -- UNE LIGNE NE PEUT PAS SERVIR DE DÉPOTOIR. Le client coupe déjà (300
  -- signes pour le message) ; le serveur ne fait pas confiance au client.
  constraint erreur_courte   check (length(message) <= 400),
  constraint ou_court        check (ou is null or length(ou) <= 80),
  constraint ecran_court     check (ecran is null or length(ecran) <= 40),
  constraint version_courte  check (version is null or length(version) <= 16),
  constraint langue_courte   check (langue is null or length(langue) <= 8),
  constraint appareil_court  check (appareil is null or length(appareil) <= 90),
  constraint combien_sain    check (combien between 1 and 100000)
);
create index if not exists erreurs_quand on public.erreurs (quand desc);

-- ============================================================================
--  QUI PEUT FAIRE QUOI : DÉPOSER, ET RIEN D'AUTRE
-- ============================================================================
--  Le jeu n'a que la clé publique, écrite en clair dans index.html : il faut
--  donc qu'avec cette clé on puisse DÉPOSER une erreur et rien de plus. Pas la
--  lire (sinon n'importe qui lit les pannes de tout le monde), pas la modifier,
--  pas l'effacer (sinon n'importe qui vide la table en silence).
--  C'est la leçon de push_subs, qui était ouverte à tous (voir
--  notifications/verrouiller.sql) : une règle RLS ne voit pas le filtre de la
--  requête, donc « using (true) » autorise vraiment tout le monde à tout.
alter table public.erreurs enable row level security;

drop policy if exists erreurs_tout on public.erreurs;
drop policy if exists erreurs_depot on public.erreurs;
create policy erreurs_depot on public.erreurs
  for insert to anon, authenticated
  with check (true);

-- DEUX SERRURES, comme pour la table des comptes : la règle RLS ci-dessus, et
-- les droits de table en dessous. Si l'une venait à sauter, l'autre tient.
revoke all on public.erreurs from anon, authenticated;
grant insert on public.erreurs to anon, authenticated;

-- ============================================================================
--  ET ÇA NE GROSSIT PAS INDÉFINIMENT
-- ============================================================================
--  Une erreur de plus de trente jours n'apprend plus rien : la version qui la
--  portait n'existe plus.
--  (v350) SANS pg_cron, LA TABLE SE CRÉE QUAND MÊME. Le 08/11/2026, Taylor a
--  lancé la requête de lecture : « relation "public.erreurs" does not exist ».
--  La table n'avait jamais été créée — et un « select cron.schedule » qui
--  échoue annule TOUT ce qui a été collé avec lui (l'éditeur de Supabase joue
--  le texte collé comme une seule transaction). La purge passe donc dans un
--  bloc qui rattrape son échec, comme dans notifications/installer.sql : la
--  table est là, seule la purge attend pg_cron (Database → Extensions).
--  Vérifié sur un vrai PostgreSQL sans pg_cron : la table se crée, un joueur
--  (anon) dépose et ne lit pas, et le script se recolle sans dommage.
do $do$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('purge-erreurs', '17 4 * * *',
    $c$ delete from public.erreurs where quand < now() - interval '30 days' $c$);
exception when others then
  raise notice 'pg_cron indisponible (%) : la table est là, seule la purge automatique manque', sqlerrm;
end
$do$;

-- ============================================================================
--  POUR LIRE LES ERREURS : depuis le tableau de bord Supabase (Table editor),
--  ou en SQL. La clé publique ne peut pas les lire, c'est voulu.
--
--    select version, appareil, ecran, count(*) n, max(quand) derniere,
--           left(message, 80) apercu
--      from public.erreurs
--     where quand > now() - interval '7 days'
--     group by 1,2,3,6
--     order by n desc;
-- ============================================================================
