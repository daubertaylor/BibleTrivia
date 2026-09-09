-- Programmer les rappels : une fois par heure, en UTC.
-- (Étape 5 du LISEZMOI. À coller dans l'éditeur SQL de Supabase.)
--
-- Pourquoi toutes les heures : les joueurs ne sont pas dans le même fuseau.
-- À chaque passage, la fonction ne réveille QUE ceux chez qui il est 19 h,
-- et seulement dans les deux cas prévus (série en jeu, ou longue absence).
-- Elle ne fait donc rien 23 fois sur 24 pour un joueur donné.

-- 1. Les deux extensions nécessaires (une seule fois).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. La tâche. REMPLACE <CLÉ_SERVICE_ROLE> par la clé « service_role » du
--    projet (Supabase → Project Settings → API). Elle donne tous les droits :
--    elle ne doit JAMAIS se retrouver dans index.html ni dans le dépôt.
select cron.schedule(
  'rappels',
  '0 * * * *',
  $$
    select net.http_post(
      url     := 'https://chyuckryusxzssezesuw.supabase.co/functions/v1/rappels',
      headers := jsonb_build_object(
                   'Authorization', 'Bearer <CLÉ_SERVICE_ROLE>',
                   'Content-Type',  'application/json'),
      body    := '{}'::jsonb
    );
  $$
);

-- Vérifier que la tâche existe :
--   select jobid, schedule, jobname, active from cron.job;
--
-- Voir les dix derniers passages (statut et durée) :
--   select status, return_message, start_time
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'rappels')
--    order by start_time desc limit 10;
--
-- Tout arrêter :
--   select cron.unschedule('rappels');
