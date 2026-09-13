/* Fonction Supabase (Deno) — les rappels.
   À déclencher une fois par heure. CINQ MOTIFS, jamais plus d'un envoi par
   joueur et par jour, et toujours à une heure qui a du sens chez lui :

     série en jeu       19 h   la série peut encore être sauvée ce soir
     défi du jour       19 h   pas encore relevé, et le joueur est actif
     à revoir           12 h   des questions arrivent à échéance aujourd'hui
     verset             9 h    le dimanche seulement
     longue absence     19 h   à 3, 7 et 30 jours, puis plus rien

   POURQUOI C'EST PASSÉ DE DEUX À CINQ. On avait volontairement restreint à
   deux, pour ne pas spammer. C'était la bonne intention et le mauvais réglage :
   « si ça sonne presque jamais, ça n'a aucun intérêt » — un rappel qui ne part
   pas ne protège personne. Le garde-fou n'est pas la RARETÉ des motifs, c'est
   le plafond d'un envoi par jour (tenu ici par l'exclusion mutuelle des cas,
   et une seconde fois sur l'appareil par « prevenu »), plus l'exigence que
   chaque motif soit une raison que le joueur reconnaîtrait.
   Ce plafond n'est pas décoratif : un abonnement push est déclaré
   « userVisibleOnly », donc chaque envoi DOIT produire une notification.
   Envoyer à tout le monde ferait afficher au navigateur son propre message
   « ce site a été mis à jour en arrière-plan » — exactement ce qu'on évite. */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const HEURE_DU_SOIR = 19;          // 19 h chez le joueur
const HEURE_DE_MIDI = 12;          // pour ce qui est à revoir : au milieu de la journée
const HEURE_DU_VERSET = 9;         // le dimanche matin
const SERIE_MINIMALE = 2;          // en dessous, il n'y a rien à sauver
/* Le défi du jour n'est rappelé qu'à un joueur ENCORE LÀ : au-delà, c'est
   « absence » qui parle, et avec d'autres mots. */
const ACTIF_JOURS = 14;
/* LE RETOUR APRÈS UNE LONGUE ABSENCE — le deuxième et dernier cas notifié.
   Trois rappels par absence, pas un de plus : à trois jours, à une semaine,
   puis à un mois.
   Ensuite plus rien, tant que le joueur n'a pas rejoué. Ce sont des égalités
   STRICTES, pas des seuils : « exactement 7 jours » ne peut être vrai qu'un
   seul jour, et l'heure du soir n'arrive qu'une fois ce jour-là. Il n'y a donc
   aucun compteur à tenir côté serveur pour éviter la répétition — c'est la
   forme de la condition qui l'empêche. */
const ABSENCES = [3, 7, 30];

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

Deno.serve(async (req: Request) => {
  /* ===== UN ESSAI, POUR VOIR LA CHAÎNE MARCHER TOUT DE SUITE =====
     Sans lui, la première preuve que tout est branché arriverait un soir à
     19 h, des jours plus tard, et un défaut se découvrirait à l'aveugle.
     Appelée avec { "essai": true }, la fonction écrit à TOUS les abonnés sans
     regarder ni l'heure ni la série. Ce n'est pas une porte ouverte : l'appel
     exige déjà la clé service_role, celle qui ouvre tout le projet. */
  let essai = false;
  try { essai = !!(await req.json())?.essai; } catch { /* pas de corps : passage normal */ }

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

  const compte: Record<string, number> = { serie: 0, defi: 0, revoir: 0, verset: 0, absence: 0, essai: 0 };
  let envoyes = 0, retires = 0;
  for (const a of abos ?? []) {
    const dec = a.decalage | 0;
    if (essai) {
      try {
        await webpush.sendNotification(a.abonnement, JSON.stringify({ genre: "essai", decalage: dec }));
        envoyes++; compte.essai++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await db.from("push_subs").delete().eq("endpoint", a.endpoint); retires++;
        }
      }
      continue;
    }
    const dLocale = new Date(Date.now() + dec * 60000);
    const heureLocale = dLocale.getUTCHours();
    const jourSemaine = dLocale.getUTCDay();          // 0 = dimanche
    const aujourdhui = jour(dec);
    const joueAujourdhui = a.dernier === aujourdhui;
    const depuis = a.vu ? ecart(a.vu, aujourdhui) : 9999;

    /* CINQ MOTIFS, ET UN SEUL PEUT PARTIR. Ils sont examinés dans l'ordre de
       ce qui compte le plus pour le joueur : ce qu'il peut PERDRE ce soir
       d'abord, ce qu'il gagnerait à faire ensuite, la douceur en dernier.
       Chacun a son heure, si bien qu'à un instant donné il y en a au plus un
       de possible — l'ordre ne sert qu'à rendre l'intention lisible. */
    let charge: Record<string, unknown> | null = null;

    /* 1. LA SÉRIE EN JEU — elle peut encore être sauvée ce soir. */
    if (heureLocale === HEURE_DU_SOIR &&
        (a.serie | 0) >= SERIE_MINIMALE &&
        !joueAujourdhui &&
        a.dernier === jour(dec, -1)) {
      charge = { genre: "serie", decalage: dec };
      compte.serie++;
    }

    /* 2. LE DÉFI DU JOUR — pour le joueur ENCORE LÀ qui n'a pas de série à
          perdre. C'est le motif qui fait « sonner un minimum » : sans lui, un
          joueur régulier sans série ne recevait strictement jamais rien.
          Il ne double jamais le premier : celui-là exige une série d'au moins
          deux jours ET d'avoir joué hier, celui-ci prend tout le reste. */
    if (!charge && heureLocale === HEURE_DU_SOIR &&
        !joueAujourdhui && depuis >= 0 && depuis <= ACTIF_JOURS) {
      charge = { genre: "defi", decalage: dec };
      compte.defi++;
    }

    /* 3. CE QUI EST À REVOIR — à midi, quand il y a vraiment des échéances.
          Le nombre vient de l'appareil ; l'appareil le recompte avant
          d'afficher, donc un carnet vidé entre-temps ne dit rien. */
    if (!charge && heureLocale === HEURE_DE_MIDI && (a.revoir | 0) >= 1) {
      charge = { genre: "revoir", decalage: dec, n: a.revoir | 0 };
      compte.revoir++;
    }

    /* 4. LE VERSET DU DIMANCHE — le seul rappel qui ne demande rien. Il ne
          part qu'aux joueurs qui n'ont pas disparu : à quelqu'un parti depuis
          deux mois, un verset du dimanche est une carte postale d'un jeu
          qu'il a quitté, et c'est « absence » qui doit parler. */
    if (!charge && jourSemaine === 0 && heureLocale === HEURE_DU_VERSET && depuis <= ACTIF_JOURS) {
      charge = { genre: "verset", decalage: dec };
      compte.verset++;
    }

    /* 5. LA LONGUE ABSENCE — trois jours, sept, trente, puis plus rien. */
    if (!charge && heureLocale === HEURE_DU_SOIR && a.vu && ABSENCES.includes(depuis)) {
      charge = { genre: "absence", jours: depuis, decalage: dec };
      compte.absence++;
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
  return Response.json({ envoyes, ...compte, retires, examines: abos?.length ?? 0 });
});
