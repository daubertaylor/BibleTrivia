-- ============================================================================
--  REMPLACÉ PAR installer.sql (v326) — NE PLUS COLLER CE FICHIER.
--  installer.sql pose la même tâche, toutes les cinq minutes, avec une clé
--  interne que la base fabrique elle-même : plus de clé service_role à
--  recopier. Ce fichier reste pour l'histoire.
-- ============================================================================

-- Programmer les rappels : toutes les cinq minutes (v326), en UTC.
-- (Étape 5 du LISEZMOI. À coller dans l'éditeur SQL de Supabase.)
--
-- Pourquoi si souvent : les rappels de prière et de lecture tombent à l'heure
-- que le joueur a choisie, à la minute près (v326) ; avant, une fois par heure
-- suffisait. La fonction ne fait presque toujours RIEN : à chaque passage,
-- elle ne réveille que ceux dont c'est l'heure, et chacun au plus une fois
-- par jour et par sorte de rappel (jeu_le, priere_le, lecture_le). Coût :
-- 288 appels par jour, très loin des limites gratuites de Supabase.
-- (Si la tâche « rappels » existe déjà, la même commande la remplace.)

-- 1. Les deux extensions nécessaires (une seule fois).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. La tâche. REMPLACE <CLÉ_SERVICE_ROLE> par la clé « service_role » du
--    projet (Supabase → Project Settings → API). Elle donne tous les droits :
--    elle ne doit JAMAIS se retrouver dans index.html ni dans le dépôt.
select cron.schedule(
  'rappels',
  '*/5 * * * *',
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
