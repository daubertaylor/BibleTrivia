/* Fonction Supabase (Deno) — le rappel de série.
   À déclencher une fois par heure. Elle ne réveille QUE les joueurs dont la
   série est réellement en jeu, et seulement quand il est le soir chez eux.
   C'est ce filtre qui garantit l'absence de spam : un abonnement push est
   déclaré « userVisibleOnly », donc chaque envoi doit produire une notification.
   Envoyer à tout le monde ferait afficher au navigateur son propre message
   « ce site a été mis à jour en arrière-plan » — exactement ce qu'on évite. */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const HEURE_DU_SOIR = 19;          // 19 h chez le joueur
const SERIE_MINIMALE = 2;          // en dessous, il n'y a rien à sauver

Deno.serve(async () => {
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUJET")!,          // ex. "mailto:tonadresse@exemple.fr"
    Deno.env.get("VAPID_PUBLIQUE")!,
    Deno.env.get("VAPID_PRIVEE")!,
  );
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: abos, error } = await db.from("push_subs").select("*").gte("serie", SERIE_MINIMALE);
  if (error) return new Response(error.message, { status: 500 });

  const jour = (dec: number, decalageJours = 0) => {
    const d = new Date(Date.now() + dec * 60000 + decalageJours * 86400000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  };
  let envoyes = 0, retires = 0;
  for (const a of abos ?? []) {
    const dec = a.decalage | 0;
    const heureLocale = new Date(Date.now() + dec * 60000).getUTCHours();
    if (heureLocale !== HEURE_DU_SOIR) continue;         // pas encore le soir chez lui
    if (a.dernier === jour(dec)) continue;               // il a déjà joué aujourd'hui
    if (a.dernier !== jour(dec, -1)) continue;           // série déjà perdue : inutile
    try {
      await webpush.sendNotification(a.abonnement, JSON.stringify({ decalage: dec }));
      envoyes++;
    } catch (e: any) {
      /* 404/410 : l'appareil a désinstallé ou révoqué — on nettoie. */
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await db.from("push_subs").delete().eq("endpoint", a.endpoint);
        retires++;
      }
    }
  }
  return Response.json({ envoyes, retires, examines: abos?.length ?? 0 });
});
