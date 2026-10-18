/* ====== LA FONCTION « rappels », VUE COMME LA TÂCHE ET LE JEU LA VOIENT ======
   Lancé par .github/workflows/rappels.yml juste après chaque déploiement, et
   à la main quand on veut :   node notifications/verifier.js

   Une seule question, { etat:true }, à laquelle la fonction répond sans rien
   envoyer à personne : sa version, ses clés VAPID (en ordre ou non, jamais la
   valeur de la privée) et sa clé publique. On la pose deux fois :
     1. SANS AUCUNE CLÉ, comme la tâche des cinq minutes. Tant que l'ancienne
        fonction est en place, la porte « Verify JWT » refuse cet appel (401)
        AVANT son code — et c'est ce qu'on veut : l'ancienne fonction ne
        vérifie rien, elle fait un passage de rappels à chaque appel qui lui
        parvient. Or Supabase laisse désormais passer la clé publishable
        devant cette porte (mesuré le 18/10/2026 : 200, et un passage hors de
        la tâche). Sans clé, on peut donc reposer la question sans risque le
        temps que le déploiement prenne — deux minutes au plus.
     2. Une fois la bonne version vue, UNE fois comme le jeu (la carte
        « Rappels » de la Modération) : avec la clé publishable.
   Puis trois vérifications : c'est le code du dépôt (VERSION de rappels.ts),
   ses trois secrets VAPID vont ensemble, et sa clé publique est celle du jeu
   (VAPID_PUBLIC d'index.html) — sinon les téléphones abonnés avec la clé du
   jeu ne recevraient rien. Sortie 0 si tout va, 1 sinon, et le constat en
   français sur la page du déploiement (GITHUB_STEP_SUMMARY).
   RAPPELS_URL, VERIFIER_ESSAIS et VERIFIER_PAUSE_MS ne servent qu'aux essais. */
"use strict";
const fs = require("fs");
const path = require("path");

const jeu = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const code = fs.readFileSync(path.join(__dirname, "rappels.ts"), "utf8");
function lire(re, texte, nom){
  const m = texte.match(re);
  if(!m) throw new Error(nom + " introuvable");
  return m[1];
}
const SUPABASE_URL = lire(/const SUPABASE_URL = "([^"]+)"/, jeu, "SUPABASE_URL dans index.html");
const CLE = lire(/const SUPABASE_ANON_KEY = "([^"]+)"/, jeu, "SUPABASE_ANON_KEY dans index.html");
const VAPID_JEU = lire(/const VAPID_PUBLIC = "([^"]+)"/, jeu, "VAPID_PUBLIC dans index.html");
const ATTENDUE = +lire(/const VERSION = (\d+);/, code, "VERSION dans rappels.ts");
const CIBLE = process.env.RAPPELS_URL || SUPABASE_URL + "/functions/v1/rappels";
const ESSAIS = Math.max(1, +(process.env.VERIFIER_ESSAIS || 12));
const PAUSE = +(process.env.VERIFIER_PAUSE_MS || 10000);

async function demander(commeLeJeu){
  const enTetes = { "Content-Type": "application/json" };
  if(commeLeJeu){ enTetes.apikey = CLE; enTetes.Authorization = "Bearer " + CLE; }
  try{
    const r = await fetch(CIBLE, {
      method: "POST", headers: enTetes, body: JSON.stringify({ etat: true }),
      signal: AbortSignal.timeout(15000)
    });
    const texte = await r.text();
    let c = null;
    try{ c = JSON.parse(texte); }catch(_){}
    return { st: r.status, c, texte };
  }catch(e){
    return { st: 0, c: null, texte: String((e && e.message) || e) };
  }
}
const bonne = f => f.st === 200 && !!f.c && f.c.version === ATTENDUE;
/* Une réponse 200 sans version, c'est l'ancienne fonction qui a tourné : on
   ne la rappelle surtout pas. */
const ancienneSansPorte = f => f.st === 200 && !(f.c && typeof f.c.version === "number");

function constater(f, quiAppelle){
  const ou = "Supabase → Edge Functions → Secrets";
  if(bonne(f)){
    if(f.c.vapid !== "ok"){
      return ["Ses secrets VAPID ne vont pas : " + [].concat(f.c.vapid || "réponse illisible").join(" ; ") +
              ". À corriger dans " + ou + " (VAPID_PUBLIQUE, VAPID_PRIVEE, VAPID_SUJET)."];
    }
    if(f.c.pub !== VAPID_JEU){
      return ["VAPID_PUBLIQUE n'est pas la clé publique du jeu : les téléphones abonnés avec la clé du jeu " +
              "ne recevraient rien. " + ou + " → VAPID_PUBLIQUE = " + VAPID_JEU +
              ", avec VAPID_PRIVEE, la clé privée qui va avec elle."];
    }
    return [];
  }
  if(quiAppelle === "jeu"){
    return [`La fonction répond à la tâche, mais pas au jeu (HTTP ${f.st}) : ${f.texte.slice(0, 200)}`];
  }
  if(ancienneSansPorte(f)){
    return ["URGENT : l'ancienne fonction est en ligne SANS sa porte « Verify JWT » — elle fait un passage de rappels " +
            "à chaque appel de la tâche, toutes les cinq minutes. Le déploiement n'a pas pris : relance-le, ou remets " +
            "« Verify JWT » en attendant (Supabase → Edge Functions → rappels → Details)."];
  }
  if(f.st === 200) return [`La fonction en ligne est la v${f.c.version}, pas la v${ATTENDUE} du dépôt : le déploiement n'a pas pris.`];
  if(f.st === 401) return ["La porte « Verify JWT » est encore fermée (HTTP 401 : la tâche des cinq minutes est refusée) : le déploiement n'a pas pris."];
  if(f.st === 404) return ["La fonction « rappels » n'existe pas sur le projet (HTTP 404)."];
  if(f.st) return [`La fonction a répondu HTTP ${f.st} : ${f.texte.slice(0, 200)}`];
  return ["La fonction ne répond pas : " + f.texte.slice(0, 200)];
}

(async () => {
  let f = null;
  for(let i = 0; i < ESSAIS; i++){
    if(i) await new Promise(r => setTimeout(r, PAUSE));
    f = await demander(false);
    if(bonne(f) || ancienneSansPorte(f)) break;
  }
  let soucis = constater(f, "tâche");
  if(!soucis.length) soucis = constater(await demander(true), "jeu");
  const lignes = soucis.length
    ? ["### ❌ La fonction « rappels » n'est pas prête", "", ...soucis.map(s => "- " + s)]
    : [`### ✅ La fonction « rappels » v${ATTENDUE} est en place`, "",
       "- la porte « Verify JWT » ne bloque plus : la tâche des cinq minutes et le jeu passent ;",
       "- ses trois secrets VAPID vont ensemble, et sa clé publique est celle du jeu.", "",
       "Les rappels partent avec la prochaine tâche (toutes les cinq minutes). Pour en recevoir un tout de suite : " +
       "dans le jeu installé, Groupes → bouclier → Modération → « M'envoyer un essai »."];
  console.log(lignes.join("\n"));
  if(process.env.GITHUB_ACTIONS === "true") for(const s of soucis) console.log("::error::" + s);
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lignes.join("\n") + "\n");
  process.exit(soucis.length ? 1 : 0);
})();
