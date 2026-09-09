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

/* ===== UN 500 NE DIT RIEN. CETTE FONCTION, SI. =====
   Trois secrets à poser à la main, donc trois occasions de se tromper : un nom
   mal orthographié, un espace invisible collé au bout, une moitié de paire qui
   ne va pas avec l'autre. La bibliothèque d'envoi, elle, lève « no key set » —
   le même message que le secret soit absent, vide ou vraiment mauvais.
   On vérifie donc AVANT, et on répond en français ce qui manque exactement. */
const b64urlVersOctets = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  const o = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
  return o;
};
const octetsVersB64url = (o: Uint8Array) =>
  btoa(String.fromCharCode(...o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/* Les deux moitiés vont-elles VRAIMENT ensemble ? On signe puis on vérifie :
   c'est la seule preuve, et elle ne coûte qu'une milliseconde. */
async function paireCoherente(pub: string, priv: string): Promise<string> {
  let octets: Uint8Array;
  try { octets = b64urlVersOctets(pub); }
  catch { return "VAPID_PUBLIQUE n'est pas du base64url lisible"; }
  if (octets.length !== 65) return `VAPID_PUBLIQUE fait ${octets.length} octets une fois décodée, il en faut 65`;
  if (octets[0] !== 4) return `VAPID_PUBLIQUE commence par 0x${octets[0].toString(16)} au lieu de 0x04 : ce n'est pas une clé`;
  const jwk = {
    kty: "EC", crv: "P-256", ext: true, d: priv,
    x: octetsVersB64url(octets.slice(1, 33)),
    y: octetsVersB64url(octets.slice(33, 65)),
  };
  try {
    const cleP = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    const cleV = await crypto.subtle.importKey("raw", octets, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const m = new TextEncoder().encode("yada");
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cleP, m);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, cleV, sig, m);
    if (!ok) return "les deux moitiés ne vont pas ensemble : refais une paire et remets les DEUX";
  } catch {
    return "les deux moitiés ne vont pas ensemble : refais une paire et remets les DEUX";
  }
  return "";
}

Deno.serve(async () => {
  /* Les espaces au bout sont invisibles et suffisent à tout casser. */
  const sujet = (Deno.env.get("VAPID_SUJET") ?? "").trim();
  const pub   = (Deno.env.get("VAPID_PUBLIQUE") ?? "").trim();
  const priv  = (Deno.env.get("VAPID_PRIVEE") ?? "").trim();

  const soucis: string[] = [];
  if (!sujet) soucis.push("VAPID_SUJET est absent ou vide");
  else if (!/^mailto:\S+@\S+$/.test(sujet)) soucis.push(`VAPID_SUJET doit ressembler à « mailto:toi@exemple.fr » (reçu : « ${sujet} »)`);
  if (!pub) soucis.push("VAPID_PUBLIQUE est absente ou vide — vérifie l'orthographe du nom du secret");
  else if (pub.length !== 87) soucis.push(`VAPID_PUBLIQUE fait ${pub.length} caractères au lieu de 87`);
  if (!priv) soucis.push("VAPID_PRIVEE est absente ou vide — vérifie l'orthographe du nom du secret");
  else if (priv.length !== 43) soucis.push(`VAPID_PRIVEE fait ${priv.length} caractères au lieu de 43`);
  if (!soucis.length) {
    const m = await paireCoherente(pub, priv);
    if (m) soucis.push(m);
  }
  if (soucis.length) return Response.json({ erreur: "clés VAPID", details: soucis }, { status: 400 });

  webpush.setVapidDetails(sujet, pub, priv);
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
