/* Fonction Supabase (Deno) — les rappels.
   À déclencher une fois par heure. DEUX CAS, et deux seulement : une série
   réellement en jeu ce soir, ou une absence de sept jours puis de trente. Et
   seulement quand il est le soir chez le joueur.
   C'est ce filtre qui garantit l'absence de spam : un abonnement push est
   déclaré « userVisibleOnly », donc chaque envoi doit produire une notification.
   Envoyer à tout le monde ferait afficher au navigateur son propre message
   « ce site a été mis à jour en arrière-plan » — exactement ce qu'on évite. */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const HEURE_DU_SOIR = 19;          // 19 h chez le joueur
const SERIE_MINIMALE = 2;          // en dessous, il n'y a rien à sauver
/* LE RETOUR APRÈS UNE LONGUE ABSENCE — le deuxième et dernier cas notifié.
   Deux rappels par absence, pas un de plus : à une semaine, puis à un mois.
   Ensuite plus rien, tant que le joueur n'a pas rejoué. Ce sont des égalités
   STRICTES, pas des seuils : « exactement 7 jours » ne peut être vrai qu'un
   seul jour, et l'heure du soir n'arrive qu'une fois ce jour-là. Il n'y a donc
   aucun compteur à tenir côté serveur pour éviter la répétition — c'est la
   forme de la condition qui l'empêche. */
const ABSENCES = [7, 30];

Deno.serve(async () => {
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUJET")!,          // ex. "mailto:tonadresse@exemple.fr"
    Deno.env.get("VAPID_PUBLIQUE")!,
    Deno.env.get("VAPID_PRIVEE")!,
  );
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  /* On ne filtre plus sur la série : un joueur absent depuis un mois a
     justement une série à zéro. Le tri se fait plus bas, cas par cas. */
  const { data: abos, error } = await db.from("push_subs").select("*");
  if (error) return new Response(error.message, { status: 500 });

  const jour = (dec: number, decalageJours = 0) => {
    const d = new Date(Date.now() + dec * 60000 + decalageJours * 86400000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  };
  /* Nombre de jours pleins entre deux dates AAAA-MM-JJ. */
  const ecart = (a: string, b: string) =>
    Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

  let envoyes = 0, retires = 0, series = 0, absences = 0;
  for (const a of abos ?? []) {
    const dec = a.decalage | 0;
    const heureLocale = new Date(Date.now() + dec * 60000).getUTCHours();
    if (heureLocale !== HEURE_DU_SOIR) continue;         // pas encore le soir chez lui
    const aujourdhui = jour(dec);

    /* Deux cas, et deux seulement. Ils s'excluent l'un l'autre par
       construction : le premier demande d'avoir joué HIER, le second d'être
       absent depuis au moins une semaine. */
    let charge: Record<string, unknown> | null = null;

    /* 1. LA SÉRIE EN JEU — elle peut encore être sauvée ce soir. */
    if ((a.serie | 0) >= SERIE_MINIMALE &&
        a.dernier !== aujourdhui &&
        a.dernier === jour(dec, -1)) {
      charge = { genre: "serie", decalage: dec };
      series++;
    }

    /* 2. LA LONGUE ABSENCE — sept jours, puis trente, puis plus rien. */
    if (!charge && a.vu) {
      const j = ecart(a.vu, aujourdhui);
      if (ABSENCES.includes(j)) { charge = { genre: "absence", jours: j, decalage: dec }; absences++; }
    }

    if (!charge) continue;
    try {
      await webpush.sendNotification(a.abonnement, JSON.stringify(charge));
      envoyes++;
    } catch (e: any) {
      /* 404/410 : l'appareil a désinstallé ou révoqué — on nettoie. */
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await db.from("push_subs").delete().eq("endpoint", a.endpoint);
        retires++;
      }
    }
  }
  return Response.json({ envoyes, series, absences, retires, examines: abos?.length ?? 0 });
});
