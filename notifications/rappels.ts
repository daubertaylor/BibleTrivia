/* Fonction Supabase (Deno) — les rappels.
   À déclencher TOUTES LES CINQ MINUTES (cron.sql, depuis la v326 : les
   rappels de prière et de lecture tombent à l'heure que le joueur choisit,
   à la minute près). Deux familles :

   LES RAPPELS DU JEU — cinq motifs, jamais plus d'un envoi par joueur et par
   jour (jeu_le), seulement s'il les a allumés (jeu), et toujours à une heure
   qui a du sens chez lui :

     série en jeu       19 h   la série peut encore être sauvée ce soir
     défi du jour       19 h   pas relevé aujourd'hui, mais relevé dans la semaine
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
   « ce site a été mis à jour en arrière-plan » — exactement ce qu'on évite.

   LA PRIÈRE ET LA LECTURE (v326) — demandées par le joueur, à l'heure qu'il a
   choisie (priere, lecture : des minutes après minuit, chez lui ; null =
   éteint). Une fois par jour chacune (priere_le, lecture_le), au premier
   passage qui suit l'heure choisie. Elles ne comptent pas dans le plafond du
   jeu : ce ne sont pas des rappels du jeu, c'est un rendez-vous que le joueur
   s'est donné. */
/* DÉPLOIEMENT (v326) : Edge Functions → rappels → coller ce fichier → Deploy,
   et « Verify JWT » DÉSACTIVÉ (voir QUI A LE DROIT D'APPELER, plus bas). La
   tâche des cinq minutes est posée par notifications/installer.sql. */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const HEURE_DU_SOIR = 19;          // 19 h chez le joueur
const HEURE_DE_MIDI = 12;          // pour ce qui est à revoir : au milieu de la journée
const HEURE_DU_VERSET = 9;         // le dimanche matin
const SERIE_MINIMALE = 2;          // en dessous, il n'y a rien à sauver
/* ===== À QUI RAPPELLE-T-ON LE DÉFI DU JOUR ? =====
   Première écriture : « à tout joueur ayant joué dans les 14 derniers jours ».
   Le banc (banc-essai/rappels.js, qui exécute la vraie fonction) l'a
   immédiatement cassée sur deux cas, et il avait raison les deux fois :
     — un joueur absent depuis 7 jours recevait « le défi du jour t'attend »
       au lieu de « ça fait une semaine » : le motif du défi mordait sur celui
       de l'absence ;
     — et surtout, celui qui joue TOUS LES JOURS en solo ou en ligne sans
       jamais toucher au Défi le recevait tous les soirs, indéfiniment. C'est
       la définition du spam, et c'est précisément le cas que l'ancienne
       version protégeait — « le réveiller serait le pire défaut possible ».
   La bonne condition n'est pas « a joué récemment », c'est « FAIT LE DÉFI
   d'habitude » : on ne rappelle un rendez-vous qu'à ceux qui l'ont pris. Sept
   jours de mémoire — au-delà, ce n'est plus un oubli, c'est un choix, et un
   choix ne se rappelle pas tous les soirs. */
const DEFI_MEMOIRE = 7;
/* Le verset du dimanche, lui, ne demande rien : il peut aller à qui n'a pas
   disparu, qu'il fasse le Défi ou non. */
const VERSET_JOURS = 14;
/* LE RETOUR APRÈS UNE LONGUE ABSENCE — le deuxième et dernier cas notifié.
   Trois rappels par absence, pas un de plus : à trois jours, à une semaine,
   puis à un mois.
   Ensuite plus rien, tant que le joueur n'a pas rejoué. Ce sont des égalités
   STRICTES, pas des seuils : « exactement 7 jours » ne peut être vrai qu'un
   seul jour, et l'heure du soir n'arrive qu'une fois ce jour-là. Il n'y a donc
   aucun compteur à tenir côté serveur pour éviter la répétition — c'est la
   forme de la condition qui l'empêche. */
const ABSENCES = [3, 7, 30];
/* LA FENÊTRE D'UN RENDEZ-VOUS À HEURE CHOISIE : le premier passage dans
   l'heure qui suit. Toutes les cinq minutes, il tombe dans les cinq minutes ;
   si un passage saute, le suivant le rattrape ; et une tâche restée à une
   fois par heure le servirait encore. Le « déjà envoyé aujourd'hui »
   (priere_le, lecture_le) empêche qu'il parte deux fois. */
const FENETRE = 60;
/* La version de ce code, dans chaque réponse : la page « Rappels » de la
   Modération dit ainsi si la fonction déployée est bien celle-ci. */
const VERSION = 338;
/* Un essai demandé par un téléphone pour lui-même : un par minute au plus. */
const ESSAI_DELAI = 60000;
/* ===== LES MESSAGES DES GROUPES (v329) =====
   Un message posté appelle la fonction (le déclencheur de installer.sql, E).
   On écrit à chaque membre qui ne l'a pas lu, selon ce qu'il a choisi pour
   ce groupe : Tout, Mentions (seulement s'il est nommé, ou « tout le
   monde »), Muet (jamais). Jamais à l'auteur, jamais à qui l'a bloqué, et
   seulement aux téléphones rattachés à son compte qui ont DIT oui aux
   messages (un jeu d'avant la v329 ne le dit jamais : son service worker ne
   saurait pas les montrer).
   (v331) TOUT DE SUITE. « Je veux que la notification arrive très très
   rapidement, quasi instantané. » On attendait quatre secondes que ceux qui
   avaient la discussion ouverte disent l'avoir lue. Plus besoin : un
   téléphone où le jeu est à l'écran le dit lui-même — son inscription porte
   « ecran » (dans l'abonnement, que l'envoi ignore), redite toutes les 20 s
   — : il n'est pas prévenu, ni sonné, et les autres le sont sans attendre.
   Un « à l'écran » de plus de PRESENT_MS ne compte plus : un jeu fermé sans
   avoir pu le dire est prévenu comme les autres. « messages » garde son seul
   sens : le choix du joueur. Et l'envoi part en priorité haute (urgency
   « high ») : Android et Apple le livrent sans attendre que le téléphone se
   réveille de lui-même. */
const PRESENT_MS = 45000;
const TEXTE_MAX = 140;
/* Un message reste à livrer un jour au plus à un téléphone éteint. */
const OPTIONS_MESSAGE = { urgency: "high" as const, TTL: 86400 };
/* ===== « ESSAYER CHAQUE RAPPEL » (v327) =====
   « La prière et la lecture ne sonnent pas, et le rappel pour jouer doit
   marcher aussi. » Les rappels du jeu ne partent qu'à leur heure (19 h, midi,
   le dimanche matin) et seulement s'il y a une raison : on ne pouvait donc
   pas les voir avant un soir sans partie. La Modération les fait arriver
   TOUS, tout de suite, sur le seul téléphone qui le demande, avec leurs vrais
   mots (« essai: true » : l'appareil les montre sans ses garde-fous, sous une
   étiquette à part qui ne remplace aucun vrai rappel). Les genres s'écrivent
   en toutes lettres : banc-essai/mots-rappels.js vérifie que l'appareil sait
   dire chacun de ceux qu'on envoie. */
const ESSAIS: Record<string, Record<string, unknown>> = {
  serie:   { genre: "serie", n: 3 },
  defi:    { genre: "defi" },
  revoir:  { genre: "revoir", n: 3 },
  verset:  { genre: "verset" },
  absence: { genre: "absence", jours: 7 },
  priere:  { genre: "priere" },
  lecture: { genre: "lecture" },
};

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

/* ===== QUI A LE DROIT D'APPELER ? (v326) =====
   Avant, la tâche devait porter la clé service_role, recopiée à la main dans
   cron.sql : une clé qui ouvre tout le projet, et une étape de plus où tout
   pouvait casser sans bruit. Maintenant installer.sql fabrique une CLÉ
   INTERNE (public.rappels_reglage, lisible par personne de l'extérieur) et la
   tâche l'envoie dans l'en-tête « x-rappels » ; la fonction la relit avec ses
   propres droits et compare. L'ancienne tâche (service_role) reste acceptée.
   Pourquoi « Verify JWT » doit être désactivé : le jeu parle à Supabase avec
   une clé « publishable » (sb_publishable_…), qui n'est pas un JWT, et la
   tâche n'en porte pas. La porte d'entrée de Supabase les refuserait toutes
   les deux avant même la fonction ; c'est donc la fonction qui garde la
   porte, et elle n'ouvre à un inconnu que deux choses sans danger : son état
   (version, clés valides ou non — jamais leur valeur) et un essai envoyé au
   SEUL téléphone qui le demande, une fois par minute. */
function cleServeur(): string {
  const k = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (k) return k;
  /* Un projet passé aux nouvelles clés les reçoit en JSON. */
  try {
    const o = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return String(o.default ?? Object.values(o)[0] ?? "").trim();
  } catch { return ""; }
}
/* ===== (v338) « ARRIVÉ », LE SIGNAL =====
   Une arrivée notée, ceux qui ont la discussion ouverte relisent leurs coches
   dans la seconde : le même signal que le jeu envoie quand quelqu'un lit
   (« yada-lus-<groupe> », événement « lu »), posé par l'API de diffusion de
   Supabase. Ce n'est qu'un raccourci : faute de lui, la relève de la
   discussion (10 s) rattrape. */
async function signalerArrivee(groupe: string, membre: string) {
  try {
    const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
    const k = cleServeur();
    if (!base || !k) return;
    const h: Record<string, string> = { "Content-Type": "application/json", apikey: k };
    if (/^eyJ/.test(k)) h.Authorization = "Bearer " + k;
    await fetch(base + "/realtime/v1/api/broadcast", {
      method: "POST", headers: h, signal: AbortSignal.timeout(4000),
      body: JSON.stringify({ messages: [{ topic: "yada-lus-" + groupe, event: "lu", payload: { m: membre } }] }),
    });
  } catch { /* la relève rattrape */ }
}
/* Ce qu'un service d'envoi répond quand il refuse, sans adresse dedans (une
   adresse d'envoi est propre à un téléphone). */
const raison = (e: any) =>
  String(e?.body || e?.message || e || "").replace(/https?:\/\/\S+/g, "…").replace(/\s+/g, " ").trim().slice(0, 300);

Deno.serve(async (req: Request) => {
  /* Le jeu appelle depuis le navigateur (github.io) : sans ces en-têtes, le
     navigateur bloquerait la réponse avant que le jeu ne la lise. */
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": req.headers?.get?.("access-control-request-headers") || "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const repondre = (corps: Record<string, unknown>, status = 200) =>
    Response.json({ version: VERSION, ...corps }, { status, headers: cors });

  /* ===== UN ESSAI, POUR VOIR LA CHAÎNE MARCHER TOUT DE SUITE =====
     Sans lui, la première preuve que tout est branché arriverait un soir à
     19 h, des jours plus tard, et un défaut se découvrirait à l'aveugle.
     Appelée avec { "essai": true }, la fonction écrit à TOUS les abonnés sans
     regarder ni l'heure ni la série — réservé à la tâche (clé interne) et à
     la clé service_role. Avec { "essai_moi": "<adresse>" }, elle n'écrit
     qu'à ce téléphone-là : c'est le bouton « M'envoyer un essai » de la
     Modération, et la confirmation qu'un joueur reçoit en allumant un rappel
     (« bienvenue »). */
  let corpsRecu: any = {};
  try { corpsRecu = (await req.json()) ?? {}; } catch { /* pas de corps : passage normal */ }
  const essai = !!corpsRecu.essai;

  /* ===== (v338) « ARRIVÉ » : UNE NOTIFICATION EST LÀ =====
     Le téléphone qui reçoit la notification d'un message renvoie son jeton
     (sw.js, accuserReception) : le message est arrivé chez ce membre. Le
     jeton est à usage unique ; il ne permet rien d'autre que cela, et un
     jeton inconnu n'apprend rien. Ouvert à tous, comme l'état et l'essai :
     c'est le jeton qui fait foi. L'arrivée n'avance jamais à reculons. */
  if (typeof corpsRecu.accuse === "string") {
    const j = corpsRecu.accuse;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(j)) return repondre({ accuse: false }, 400);
    try {
      const db0 = createClient(Deno.env.get("SUPABASE_URL")!, cleServeur());
      const { data, error } = await db0.from("accuses").select("groupe,membre,message").eq("jeton", j);
      if (error) return repondre({ accuse: false, erreur: "table" }, 500);
      const a = (data ?? [])[0];
      if (!a) return repondre({ accuse: false }, 404);
      const { error: e2 } = await db0.from("membres").update({ recu_jusqu: a.message }).eq("groupe", a.groupe).eq("membre", a.membre).lt("recu_jusqu", a.message);
      if (e2) return repondre({ accuse: false, erreur: "table" }, 500);
      await db0.from("accuses").delete().eq("jeton", j);
      /* Les jetons qui ne reviendront pas (un téléphone éteint pour de bon). */
      await db0.from("accuses").delete().lt("cree_le", new Date(Date.now() - 2 * 86400000).toISOString());
      await signalerArrivee(a.groupe, a.membre);
      return repondre({ accuse: true });
    } catch {
      return repondre({ accuse: false, erreur: "table" }, 500);
    }
  }

  /* Les espaces au bout sont invisibles et suffisent à tout casser. */
  const sujet = (Deno.env.get("VAPID_SUJET") ?? "").trim();
  const pub   = (Deno.env.get("VAPID_PUBLIQUE") ?? "").trim();
  const priv  = (Deno.env.get("VAPID_PRIVEE") ?? "").trim();

  const soucis: string[] = [];
  if (!sujet) soucis.push("VAPID_SUJET est absent ou vide");
  else if (!/^mailto:\S+@\S+$/.test(sujet)) soucis.push(`VAPID_SUJET doit ressembler à « mailto:toi@exemple.fr » (il fait ${sujet.length} caractères et ne commence pas ainsi)`);
  if (!pub) soucis.push("VAPID_PUBLIQUE est absente ou vide — vérifie l'orthographe du nom du secret");
  else if (pub.length !== 87) soucis.push(`VAPID_PUBLIQUE fait ${pub.length} caractères au lieu de 87`);
  if (!priv) soucis.push("VAPID_PRIVEE est absente ou vide — vérifie l'orthographe du nom du secret");
  else if (priv.length !== 43) soucis.push(`VAPID_PRIVEE fait ${priv.length} caractères au lieu de 43`);
  if (!soucis.length) {
    const m = await paireCoherente(pub, priv);
    if (m) soucis.push(m);
  }
  /* L'ÉTAT, POUR LE JEU : la version, et les clés sont-elles bonnes ? La clé
     PUBLIQUE est rendue en entier — elle est publique par définition, et le
     jeu la compare à la sienne : un téléphone abonné avec une autre clé
     publique ne recevra jamais rien (le service d'envoi refuse la signature). */
  if (corpsRecu.etat) {
    const corps: Record<string, unknown> = { vapid: soucis.length ? soucis : "ok", pub: pub || null };
    /* (v327) CE QUE LE SERVEUR SAIT DE CE TÉLÉPHONE. Relevé le 18/10/2026 :
       la Modération disait tout vert, et la prière ne sonnait pas — le
       téléphone n'avait plus rien envoyé depuis 15 h 42, et rien ne le
       montrait. Le jeu donne son adresse d'envoi (lui seul la connaît), et
       reçoit les heures telles qu'elles sont rangées ici, pour les comparer
       aux siennes. Jamais les clés de l'abonnement : on choisit les champs un
       à un. */
    if (typeof corpsRecu.moi === "string" && corpsRecu.moi) {
      try {
        const lecteur = createClient(Deno.env.get("SUPABASE_URL")!, cleServeur());
        const { data, error } = await lecteur.from("push_subs").select("*").eq("endpoint", corpsRecu.moi);
        const l = (data ?? [])[0];
        corps.moi = error ? { erreur: error.message }
          : !l ? { inscrit: false }
          : { inscrit: true, decalage: l.decalage, jeu: l.jeu, priere: l.priere, lecture: l.lecture,
              priere_le: l.priere_le, lecture_le: l.lecture_le, jeu_le: l.jeu_le, maj: l.maj };
      } catch (e: any) {
        corps.moi = { erreur: String(e?.message || e) };
      }
    }
    return repondre(corps);
  }
  if (soucis.length) return repondre({ erreur: "clés VAPID", details: soucis }, 400);

  webpush.setVapidDetails(sujet, pub, priv);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, cleServeur());

  /* ===== L'ESSAI D'UN SEUL TÉLÉPHONE ===== */
  if (typeof corpsRecu.essai_moi === "string" && corpsRecu.essai_moi) {
    const ep = corpsRecu.essai_moi;
    const { data: lignes, error: e1 } = await db.from("push_subs").select("*").eq("endpoint", ep);
    if (e1) return repondre({ erreur: "table", details: [e1.message] }, 500);
    const a = (lignes ?? [])[0];
    if (!a) return repondre({ erreur: "inconnu", details: ["ce téléphone n'est pas inscrit sur le serveur"] }, 404);
    if (!("essai_le" in a)) return repondre({ erreur: "table", details: ["la table n'a pas la colonne essai_le : colle notifications/installer.sql dans l'éditeur SQL"] }, 400);
    if (a.essai_le && Date.now() - Date.parse(a.essai_le) < ESSAI_DELAI) return repondre({ erreur: "patience", details: ["un essai par minute"] }, 429);
    if (!a.abonnement || !a.abonnement.endpoint) return repondre({ erreur: "abonnement", details: ["l'abonnement enregistré est incomplet : rouvre le jeu, il se réinscrit"] }, 400);
    await db.from("push_subs").update({ essai_le: new Date(Date.now()).toISOString() }).eq("endpoint", ep);
    /* (v327) Plusieurs sortes d'un coup (« Essayer chaque rappel ») : une
       seule minute de patience pour toutes, et seulement celles de ESSAIS. */
    if (Array.isArray(corpsRecu.genres)) {
      const voulus = [...new Set(corpsRecu.genres)].filter((g) => typeof g === "string" && Object.hasOwn(ESSAIS, g)) as string[];
      if (!voulus.length) return repondre({ erreur: "genres", details: ["aucune sorte de rappel connue"] }, 400);
      let n = 0;
      for (const g of voulus) {
        try {
          await webpush.sendNotification(a.abonnement, JSON.stringify({ ...ESSAIS[g], decalage: a.decalage | 0, essai: true }));
          n++;
        } catch (e: any) {
          const code = e?.statusCode | 0;
          if (code === 404 || code === 410) await db.from("push_subs").delete().eq("endpoint", ep);
          return repondre({ erreur: "envoi", code, details: [raison(e)], envoyes: n }, 502);
        }
      }
      return repondre({ envoye: true, envoyes: n });
    }
    try {
      /* Les genres s'écrivent en toutes lettres : banc-essai/mots-rappels.js
         vérifie que l'appareil sait dire chacun de ceux qu'on envoie. */
      const charge = corpsRecu.genre === "bienvenue" ? { genre: "bienvenue", decalage: a.decalage | 0 }
                                                     : { genre: "essai", decalage: a.decalage | 0 };
      await webpush.sendNotification(a.abonnement, JSON.stringify(charge));
      return repondre({ envoye: true });
    } catch (e: any) {
      const code = e?.statusCode | 0;
      if (code === 404 || code === 410) await db.from("push_subs").delete().eq("endpoint", ep);
      return repondre({ erreur: "envoi", code, details: [raison(e)] }, 502);
    }
  }

  /* ===== LE RESTE EST RÉSERVÉ : LA TÂCHE, OU LA CLÉ SERVICE_ROLE ===== */
  const enTete = (req.headers?.get?.("x-rappels") ?? "").trim();
  const porteur = (req.headers?.get?.("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const service = cleServeur();
  let interne = !!porteur && !!service && porteur === service;
  let sansCle = false;
  if (!interne && enTete) {
    const { data: r, error: e2 } = await db.from("rappels_reglage").select("cle").eq("id", 1);
    if (e2) sansCle = true;
    const cle = (r ?? [])[0]?.cle;
    interne = typeof cle === "string" && cle.length >= 32 && cle === enTete;
  }
  if (!interne) {
    return repondre({ erreur: "accès", details: [sansCle
      ? "la clé interne est introuvable : colle notifications/installer.sql dans l'éditeur SQL"
      : "appel sans la clé interne : la tâche « rappels » doit être celle de notifications/installer.sql"] }, 401);
  }

  /* ===== UN MESSAGE DE GROUPE (v329) ===== */
  if (corpsRecu.message != null) {
    const id = Number(corpsRecu.message);
    if (!(id > 0)) return repondre({ sorte: "message", erreur: "message", envoyes: 0 }, 400);
    const lire = async (table: string, colonnes: string, filtre: (q: any) => any) => {
      const { data, error } = await filtre(db.from(table).select(colonnes));
      if (error) throw new Error(table + " : " + error.message);
      return (data ?? []) as any[];
    };
    try {
      const m = (await lire("messages", "id,groupe,auteur,genre,texte,donnees,masque,supprime_le", (q) => q.eq("id", id)))[0];
      if (!m || m.supprime_le || m.masque || !["texte", "partie"].includes(m.genre)) return repondre({ sorte: "message", envoyes: 0, rien: "message absent, retiré ou du jeu" });
      /* Les quatre lectures en même temps : chacune attendait la précédente. */
      const [gs, membres, blocs, auteurs] = await Promise.all([
        lire("groupes", "id,nom,supprime_le", (q) => q.eq("id", m.groupe)),
        lire("membres", "membre,notifs,lu_jusqu", (q) => q.eq("groupe", m.groupe)),
        lire("blocages", "par", (q) => q.eq("bloque", m.auteur)),
        lire("profils", "nom", (q) => q.eq("id", m.auteur)),
      ]);
      const g = gs[0];
      if (!g || g.supprime_le) return repondre({ sorte: "message", envoyes: 0, rien: "groupe absent" });
      const bloqueurs = new Set(blocs.map((b) => b.par));
      const d = m.donnees ?? {};
      const nommes = new Set(Array.isArray(d.mentions) ? d.mentions : []);
      const pourTous = d.tous === true;
      const dest = membres.filter((x) => {
        const mode = x.notifs ?? "tout";
        if (x.membre === m.auteur || bloqueurs.has(x.membre)) return false;
        if ((+x.lu_jusqu || 0) >= m.id) return false;            // déjà lu : la discussion était ouverte
        if (mode === "rien") return false;
        return mode === "tout" || pourTous || nommes.has(x.membre);
      });
      if (!dest.length) return repondre({ sorte: "message", envoyes: 0, membres: membres.length });
      const de = auteurs[0]?.nom ?? "";
      const abos = await lire("push_subs", "*", (q) => q.in("membre", dest.map((x) => x.membre)));
      let envoyesM = 0, retiresM = 0, echecsM = 0, presentsM = 0;
      let dernierEchecM: Record<string, unknown> | null = null;
      const texte = m.genre === "texte" ? String(m.texte ?? "").replace(/\s+/g, " ").trim() : "";
      const maintenant = Date.now();
      /* (v338) UN JETON PAR MEMBRE PRÉVENU : son téléphone le renverra en
         recevant la notification, et le message sera « arrivé » chez lui
         (voir « ARRIVÉ » : UNE NOTIFICATION EST LÀ). Une table absente (le
         fichier des groupes pas encore recollé) n'empêche aucun envoi : la
         notification part sans jeton. */
      const prevenu = (a: any) => a.messages === true && !!a.abonnement?.endpoint
        && !(a.abonnement.ecran === true && maintenant - (Date.parse(a.maj ?? "") || 0) < PRESENT_MS);
      const jetons: Record<string, string> = {};
      const aJeton = [...new Set(abos.filter(prevenu).map((a) => a.membre).filter(Boolean))] as string[];
      if (aJeton.length) {
        const lignes = aJeton.map((mb) => ({ jeton: crypto.randomUUID(), groupe: g.id, membre: mb, message: m.id }));
        try {
          const { error: eJ } = await db.from("accuses").insert(lignes);
          if (!eJ) lignes.forEach((l) => { jetons[l.membre] = l.jeton; });
        } catch { /* sans jeton */ }
      }
      const urlAccuse = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "") + "/functions/v1/rappels";
      /* Tous les téléphones à la fois : chacun attendait la réponse du
         précédent. */
      await Promise.all(abos.map(async (a) => {
        if (a.messages !== true || !a.abonnement || !a.abonnement.endpoint) return;
        /* (v331) Le jeu à l'écran sur ce téléphone, il y a moins de
           PRESENT_MS : il montre déjà le message, on ne le fait pas sonner. */
        const vu = Date.parse(a.maj ?? "") || 0;
        if (a.abonnement.ecran === true && maintenant - vu < PRESENT_MS) { presentsM++; return; }
        const charge = {
          /* (v334) Pour la modération, son nom ne quitte pas le serveur. */
          genre: "message", groupe: g.id, nom: g.nom, de: d.moderation === true ? "" : de, id: m.id,
          texte: texte.length > TEXTE_MAX ? texte.slice(0, TEXTE_MAX - 1) + "…" : texte,
          partie: m.genre === "partie", mention: nommes.has(a.membre),
          decalage: a.decalage | 0,
          /* (v334) La modération parle : le téléphone signe « La modération »
             (dans la langue du joueur), pas du nom de la personne. La marque
             ne voyage que pour elle : un message ordinaire part tel qu'avant. */
          ...(d.moderation === true ? { moderation: true } : {}),
          ...(jetons[a.membre] ? { accuse: { u: urlAccuse, j: jetons[a.membre] } } : {}),
        };
        try {
          await webpush.sendNotification(a.abonnement, JSON.stringify(charge), OPTIONS_MESSAGE);
          envoyesM++;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) { await db.from("push_subs").delete().eq("endpoint", a.endpoint); retiresM++; }
          else { echecsM++; if (!dernierEchecM) dernierEchecM = { code: e?.statusCode | 0, raison: raison(e) }; }
        }
      }));
      return repondre({ sorte: "message", envoyes: envoyesM, destinataires: dest.length, telephones: abos.length,
                        presents: presentsM, retires: retiresM, echecs: echecsM, dernier_echec: dernierEchecM });
    } catch (e: any) {
      return repondre({ sorte: "message", erreur: "table", details: [String(e?.message || e).slice(0, 200)] }, 500);
    }
  }

  /* ===== (v335) UN SIGNALEMENT PRÉVIENT LA MODÉRATION =====
     « Vérifie aussi que je reçois bien les notifs sur la modération. » Un
     signalement ne prévenait personne : il attendait que le modérateur
     ouvre le jeu et voie la pastille du bouclier. Chaque nouveau
     signalement appelle maintenant cette fonction (groupes/table.sql,
     signalement_a_prevenir), qui prévient les téléphones des modérateurs —
     sauf celui qui signale, s'il l'est. Même jeu ouvert : il n'y a pas de
     direct pour les signalements, et c'est une chose à décider. Rien de ce
     qui est signalé ne quitte le serveur : la notification dit seulement
     combien de choses attendent une décision (une par objet signalé, comme
     la pastille). */
  if (corpsRecu.signalement != null) {
    const id = Number(corpsRecu.signalement);
    if (!(id > 0)) return repondre({ sorte: "signalement", erreur: "signalement", envoyes: 0 }, 400);
    const lire = async (table: string, colonnes: string, filtre: (q: any) => any) => {
      const { data, error } = await filtre(db.from(table).select(colonnes));
      if (error) throw new Error(table + " : " + error.message);
      return (data ?? []) as any[];
    };
    try {
      const s = (await lire("signalements", "id,par,traite_le", (q) => q.eq("id", id)))[0];
      if (!s || s.traite_le) return repondre({ sorte: "signalement", envoyes: 0, rien: "signalement absent ou déjà traité" });
      const [mods, tous] = await Promise.all([
        lire("moderateurs", "id", (q) => q),
        lire("signalements", "message,cible,groupe,traite_le", (q) => q),
      ]);
      const ids = mods.map((x) => x.id).filter((x) => x && x !== s.par);
      if (!ids.length) return repondre({ sorte: "signalement", envoyes: 0, rien: "aucun modérateur à prévenir" });
      const n = new Set(tous.filter((x) => !x.traite_le).map((x) => [x.message ?? "", x.cible ?? "", x.groupe ?? ""].join("|"))).size || 1;
      const abos = await lire("push_subs", "*", (q) => q.in("membre", ids));
      let envoyesS = 0, retiresS = 0, echecsS = 0;
      let dernierEchecS: Record<string, unknown> | null = null;
      await Promise.all(abos.map(async (a) => {
        if (a.messages !== true || !a.abonnement || !a.abonnement.endpoint) return;
        try {
          await webpush.sendNotification(a.abonnement, JSON.stringify({ genre: "signalement", n, decalage: a.decalage | 0 }), OPTIONS_MESSAGE);
          envoyesS++;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) { await db.from("push_subs").delete().eq("endpoint", a.endpoint); retiresS++; }
          else { echecsS++; if (!dernierEchecS) dernierEchecS = { code: e?.statusCode | 0, raison: raison(e) }; }
        }
      }));
      return repondre({ sorte: "signalement", envoyes: envoyesS, moderateurs: ids.length, telephones: abos.length, a_traiter: n,
                        retires: retiresS, echecs: echecsS, dernier_echec: dernierEchecS });
    } catch (e: any) {
      return repondre({ sorte: "signalement", erreur: "table", details: [String(e?.message || e).slice(0, 200)] }, 500);
    }
  }

  /* On ne filtre plus sur la série : un joueur absent depuis un mois a
     justement une série à zéro. Le tri se fait plus bas, cas par cas. */
  const { data: abos, error } = await db.from("push_subs").select("*");
  if (error) return repondre({ erreur: "table", details: [error.message] }, 500);
  /* UNE TABLE D'AVANT LA V326 FERAIT SONNER DOUZE FOIS PAR HEURE. Sans
     jeu_le, rien n'empêche un motif du soir de repartir à chaque passage de
     cinq minutes. On refuse donc de tourner, en disant quoi faire, plutôt
     que de déranger quelqu'un douze fois. */
  if (abos && abos.length && !("jeu_le" in abos[0])) {
    return repondre({ erreur: "table", details: ["la table push_subs n'a pas les colonnes de la v326 (jeu, priere, lecture…) : colle notifications/installer.sql dans l'éditeur SQL, puis relance"] }, 400);
  }

  const jour = (dec: number, decalageJours = 0) => {
    const d = new Date(Date.now() + dec * 60000 + decalageJours * 86400000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  };
  /* Nombre de jours pleins entre deux dates AAAA-MM-JJ. */
  const ecart = (a: string, b: string) =>
    Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

  const compte: Record<string, number> = { serie: 0, defi: 0, revoir: 0, verset: 0, absence: 0, priere: 0, lecture: 0, essai: 0 };
  let envoyes = 0, retires = 0, echecs = 0;
  /* Le premier refus du passage, pour la page « Rappels » : le code du
     service d'envoi et ce qu'il dit (403 : la signature ne va pas avec la clé
     publique de l'abonnement ; 400 : abonnement abîmé…). */
  let dernierEchec: Record<string, unknown> | null = null;
  /* Un envoi, et le ménage si l'appareil n'existe plus (404/410 : il a
     désinstallé ou révoqué). Rend vrai si c'est parti. */
  const envoyer = async (a: any, charge: Record<string, unknown>) => {
    try {
      await webpush.sendNotification(a.abonnement, JSON.stringify(charge));
      envoyes++;
      return true;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await db.from("push_subs").delete().eq("endpoint", a.endpoint);
        retires++;
        a.__parti = true;
      } else {
        echecs++;
        if (!dernierEchec) dernierEchec = { code: e?.statusCode | 0, raison: raison(e) };
      }
      return false;
    }
  };
  for (const a of abos ?? []) {
    const dec = a.decalage | 0;
    if (essai) {
      try {
        await webpush.sendNotification(a.abonnement, JSON.stringify({ genre: "essai", decalage: dec }));
        envoyes++; compte.essai++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await db.from("push_subs").delete().eq("endpoint", a.endpoint); retires++;
        } else {
          echecs++;
          if (!dernierEchec) dernierEchec = { code: e?.statusCode | 0, raison: raison(e) };
        }
      }
      continue;
    }
    const dLocale = new Date(Date.now() + dec * 60000);
    const heureLocale = dLocale.getUTCHours();
    const minutesLocales = heureLocale * 60 + dLocale.getUTCMinutes();
    const jourSemaine = dLocale.getUTCDay();          // 0 = dimanche
    const aujourdhui = jour(dec);

    /* 0. LA PRIÈRE ET LA LECTURE, à l'heure choisie (v326). */
    for (const [g, charge] of [["priere", { genre: "priere", decalage: dec }], ["lecture", { genre: "lecture", decalage: dec }]] as const) {
      const h = a[g];
      if (typeof h !== "number" || !(h >= 0 && h < 1440)) continue;
      if (a[g + "_le"] === aujourdhui) continue;
      if (!(minutesLocales >= h && minutesLocales < h + FENETRE)) continue;
      if (a.__parti) break;
      if (await envoyer(a, charge)) {
        compte[g]++;
        a[g + "_le"] = aujourdhui;
        await db.from("push_subs").update({ [g + "_le"]: aujourdhui }).eq("endpoint", a.endpoint);
      }
    }
    if (a.__parti) continue;
    /* LES RAPPELS DU JEU : seulement s'ils sont allumés, et une fois par jour.
       La tâche passe toutes les cinq minutes : sans « jeu_le », un motif du
       soir repartirait douze fois dans l'heure. */
    if (a.jeu === false) continue;
    if (a.jeu_le === aujourdhui) continue;
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

    /* 2. LE DÉFI DU JOUR — pour celui qui le fait D'HABITUDE et l'a oublié
          aujourd'hui. C'est le motif qui fait « sonner un minimum » : sans
          lui, un joueur régulier sans série de deux jours ne recevait
          strictement jamais rien.
          Il ne double jamais le premier (qui exige une série d'au moins deux
          jours ET d'avoir joué hier), et il ne mord pas sur l'absence : passé
          une semaine sans Défi, c'est « absence » qui parle. */
    const defiRecent = a.dernier ? ecart(a.dernier, aujourdhui) : 9999;
    if (!charge && heureLocale === HEURE_DU_SOIR &&
        !joueAujourdhui && defiRecent >= 1 && defiRecent <= DEFI_MEMOIRE) {
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
    if (!charge && jourSemaine === 0 && heureLocale === HEURE_DU_VERSET && depuis <= VERSET_JOURS) {
      charge = { genre: "verset", decalage: dec };
      compte.verset++;
    }

    /* 5. LA LONGUE ABSENCE — trois jours, sept, trente, puis plus rien. */
    if (!charge && heureLocale === HEURE_DU_SOIR && a.vu && ABSENCES.includes(depuis)) {
      charge = { genre: "absence", jours: depuis, decalage: dec };
      compte.absence++;
    }

    if (!charge) continue;
    if (await envoyer(a, charge)) {
      a.jeu_le = aujourdhui;
      await db.from("push_subs").update({ jeu_le: aujourdhui }).eq("endpoint", a.endpoint);
    }
  }
  return repondre({ envoyes, ...compte, retires, echecs, dernier_echec: dernierEchec, examines: abos?.length ?? 0 });
});
