/* UN SERVEUR TEMPS REEL LOCAL, qui parle la meme langue que Supabase Realtime
   pour ce dont le jeu se sert : presence (qui est la) et broadcast (messages).
   Le proxy du bac a sable ne laisse pas passer les WebSockets vers supabase.co ;
   on ne teste donc pas le transport de Supabase — qui n'est pas notre code —
   mais TOUT le reste : salons, presence, deroulement du duel, deconnexions.
   Transport : SSE pour recevoir, POST pour envoyer. Meme origine, aucun proxy. */
const http=require('http'), fs=require('fs'), path=require('path');
const RACINE='/home/user/BibleTrivia';
const D=__dirname;
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};

const canaux = new Map();   // nom -> { clients:Map(id->res), presence:Map(id->meta) }
function canal(n){ if(!canaux.has(n)) canaux.set(n,{clients:new Map(),presence:new Map()}); return canaux.get(n); }
function pousse(c, id, obj, saufMoi){
  for(const [cid,res] of c.clients){ if(saufMoi && cid===id) continue;
    try{ res.write("data: "+JSON.stringify(obj)+"\n\n"); }catch(e){} }
}
/* Supabase distingue trois evenements de presence : sync (l'etat complet),
   join (quelqu'un arrive), leave (quelqu'un part). Le jeu s'abonne SEPAREMENT
   a sync et a leave, et son gestionnaire de leave conclut « l'hote est parti »
   si plus personne d'autre n'est la. Les confondre — comme je l'avais fait —
   fait croire a un depart a chaque arrivee. */
function syncPresence(c, partis, arrives){
  const etat={}; for(const [k,m] of c.presence) etat[k]=[m];
  pousse(c, null, { kind:"presence", event:"sync", etat }, false);
  for(const k of (arrives||[])) pousse(c, null, { kind:"presence", event:"join", cle:k, etat }, false);
  for(const k of (partis||[]))  pousse(c, null, { kind:"presence", event:"leave", cle:k, etat }, false);
}
function corps(rq){ return new Promise(r=>{ let b=""; rq.on("data",d=>b+=d); rq.on("end",()=>{ try{ r(JSON.parse(b||"{}")); }catch(e){ r({}); } }); }); }

const serveur = http.createServer(async (rq,rs)=>{
  const u = new URL(rq.url, "http://x");
  if(u.pathname === "/hub/sub"){
    const c = canal(u.searchParams.get("chan")), id = u.searchParams.get("id");
    rs.writeHead(200,{ "content-type":"text/event-stream", "cache-control":"no-cache", "connection":"keep-alive" });
    rs.write("retry: 500\n\n");
    c.clients.set(id, rs);
    rq.on("close", ()=>{ c.clients.delete(id); if(c.presence.delete(id)) syncPresence(c, [id], []); });
    syncPresence(c);
    return;
  }
  if(u.pathname === "/hub/track"){ const b=await corps(rq); const c=canal(b.chan);
    const neuf = !c.presence.has(b.id);
    c.presence.set(b.id, b.meta||{}); syncPresence(c, [], neuf?[b.id]:[]); rs.writeHead(200); return rs.end("ok"); }
  if(u.pathname === "/hub/untrack"){ const b=await corps(rq); const c=canal(b.chan);
    if(c.presence.delete(b.id)) syncPresence(c, [b.id], []); rs.writeHead(200); return rs.end("ok"); }
  if(u.pathname === "/hub/send"){ const b=await corps(rq); const c=canal(b.chan);
    pousse(c, b.from, { kind:"broadcast", event:b.event, payload:b.payload }, b.self===false);
    rs.writeHead(200); return rs.end("ok"); }
  if(u.pathname === "/hub/etat"){ const out={};
    for(const [n,c] of canaux) out[n]={ clients:[...c.clients.keys()], presence:[...c.presence.keys()] };
    rs.writeHead(200,{'content-type':'application/json'}); return rs.end(JSON.stringify(out)); }

  let p = decodeURIComponent(u.pathname); if(p==="/") p="/index.html";
  if(p === "/shim.js"){ rs.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});
    return fs.createReadStream(D+"/shim.js").pipe(rs); }
  const f = path.join(RACINE, p);
  if(!f.startsWith(RACINE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ rs.writeHead(404); return rs.end("non"); }
  if(p === "/index.html"){
    const h = fs.readFileSync(f,"utf8").replace("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "/shim.js");
    rs.writeHead(200,{'content-type':'text/html; charset=utf-8'}); return rs.end(h);
  }
  rs.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(rs);
});
module.exports = { serveur, canaux };
if(require.main === module) serveur.listen(8240, ()=>console.log("banc d essai sur 8240"));
