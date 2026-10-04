/* Le client Supabase, réduit à ce que le jeu utilise — version GROUPES.
   Servi à la place du script CDN par faux-serveur-groupes.js. Mêmes noms,
   mêmes signatures, mêmes réponses ({ data, error }) que supabase-js v2 :
   - from(table).select().eq().in().lt().gt().order().limit()
     .maybeSingle() / .single() / await   -> un vrai select sous les règles
                                             d'accès du joueur ;
   - rpc(nom, args)                        -> la vraie fonction SQL ;
   - channel().on("postgres_changes", ...) -> le direct, relu au nom du joueur ;
   - channel().on("presence"|"broadcast")  -> les salons, par hub.js ;
   - auth.getSession / onAuthStateChange / signOut / signInWithOtp / verifyOtp.
   L'IDENTITÉ est posée par le banc : localStorage « essai_moi », ou
   window.__seConnecter(id). Ce n'est pas un banc (voir tous.sh). */
(function(){
  function moi(){ try{ return localStorage.getItem("essai_moi") || ""; }catch(e){ return ""; } }
  function session(){
    const m = moi();
    return m ? { user:{ id:m, email:(localStorage.getItem("essai_courriel") || (m.slice(0, 8) + "@essai")) }, access_token:"essai" } : null;
  }
  const ecouteursAuth = [];
  function previens(evt){ ecouteursAuth.forEach(function(cb){ try{ cb(evt, session()); }catch(e){} }); }
  window.__seConnecter = function(id, courriel){
    try{ localStorage.setItem("essai_moi", id); if(courriel) localStorage.setItem("essai_courriel", courriel); }catch(e){}
    previens("SIGNED_IN");
  };
  window.__seDeconnecter = function(){
    try{ localStorage.removeItem("essai_moi"); localStorage.removeItem("essai_courriel"); }catch(e){}
    previens("SIGNED_OUT");
  };
  /* Pour la connexion par code : l'adresse -> l'identifiant, semé par le banc. */
  window.__comptesEssai = window.__comptesEssai || {};
  window.__codeEssai = "123456";

  function poste(chemin, corps){
    return fetch(chemin, { method:"POST", headers:{ "x-moi": moi(), "content-type":"application/json" }, body: JSON.stringify(corps) })
      .then(function(r){ return r.json(); })
      .catch(function(e){ return { data:null, error:{ message:String(e) } }; });
  }

  function requete(table){
    const q = { table:table, cols:"*", filtres:[], ordre:null, limite:0, un:null };
    const exec = function(){ return poste("/faux/select", q); };
    const refus = function(){ return Promise.resolve({ data:null, error:{ code:"42501", message:"permission denied (écriture directe)" } }); };
    const b = {
      select:function(c){ q.cols = c || "*"; return b; },
      eq:function(c, v){ q.filtres.push([c, "eq", v]); return b; },
      neq:function(c, v){ q.filtres.push([c, "neq", v]); return b; },
      lt:function(c, v){ q.filtres.push([c, "lt", v]); return b; },
      lte:function(c, v){ q.filtres.push([c, "lte", v]); return b; },
      gt:function(c, v){ q.filtres.push([c, "gt", v]); return b; },
      gte:function(c, v){ q.filtres.push([c, "gte", v]); return b; },
      in:function(c, v){ q.filtres.push([c, "in", v || []]); return b; },
      is:function(c, v){ q.filtres.push([c, "is", v]); return b; },
      order:function(c, o){ q.ordre = [c, !(o && o.ascending === false)]; return b; },
      limit:function(n){ q.limite = n; return b; },
      maybeSingle:function(){ q.un = "peut"; return exec(); },
      single:function(){ q.un = "exact"; return exec(); },
      /* Le jeu n'écrit jamais directement dans les tables des groupes ; les
         autres tables (rapports d'erreur, rappels) n'existent pas ici. */
      insert:refus, upsert:refus, update:refus, delete:refus,
      then:function(res, rej){ return exec().then(res, rej); }
    };
    return b;
  }

  function creeCanal(nom, opts){
    const cle = (opts && opts.config && opts.config.presence && opts.config.presence.key) || ("id" + Math.random());
    const self = !(opts && opts.config && opts.config.broadcast && opts.config.broadcast.self === false);
    const ecouteurs = { presence:{}, broadcast:{}, pg:[] };
    let etatPresence = {}, source = null, sources = [], abonne = false;
    const api = {
      on:function(type, filtre, cb){
        if(type === "presence"){ const e = (filtre && filtre.event) || "sync";
          (ecouteurs.presence[e] = ecouteurs.presence[e] || []).push(cb); }
        else if(type === "broadcast") (ecouteurs.broadcast[filtre.event] = ecouteurs.broadcast[filtre.event] || []).push(cb);
        else if(type === "postgres_changes") ecouteurs.pg.push({ filtre:filtre || {}, cb:cb });
        return api;
      },
      subscribe:function(cb){
        let attendus = 0, ouverts = 0;
        const pret = function(){ ouverts++; if(!abonne && ouverts >= attendus){ abonne = true; if(cb) cb("SUBSCRIBED"); } };
        const aPresence = Object.keys(ecouteurs.presence).length || Object.keys(ecouteurs.broadcast).length;
        if(aPresence || !ecouteurs.pg.length){
          attendus++;
          source = new EventSource("/hub/sub?chan=" + encodeURIComponent(nom) + "&id=" + encodeURIComponent(cle));
          source.onmessage = function(e){
            const m = JSON.parse(e.data);
            if(m.kind === "presence"){ etatPresence = m.etat;
              (ecouteurs.presence[m.event || "sync"] || []).forEach(function(f){
                try{ f({ key:m.cle, leftPresences:m.partis || [], currentPresences:m.etat }); }catch(x){} }); }
            else if(m.kind === "broadcast"){ (ecouteurs.broadcast[m.event] || []).forEach(function(f){ try{ f({ payload:m.payload }); }catch(x){} }); }
          };
          source.onopen = pret;
        }
        ecouteurs.pg.forEach(function(l){
          attendus++;
          const f = l.filtre;
          const ev = (f.event || "*");
          const s = new EventSource("/faux/direct?moi=" + encodeURIComponent(moi()) + "&table=" + encodeURIComponent(f.table || "")
            + "&filtre=" + encodeURIComponent(f.filter || "") + "&events=" + encodeURIComponent(ev));
          s.onmessage = function(e){
            const m = JSON.parse(e.data);
            const p = { eventType:m.eventType, schema:"public", table:f.table, new:m.new, old:m.old || {}, commit_timestamp:new Date().toISOString() };
            try{ l.cb(p); }catch(x){}
          };
          s.onopen = pret;
          sources.push(s);
        });
        return api;
      },
      track:async function(meta){ await fetch("/hub/track", { method:"POST", body:JSON.stringify({ chan:nom, id:cle, meta:meta }) }); return "ok"; },
      untrack:async function(){ await fetch("/hub/untrack", { method:"POST", body:JSON.stringify({ chan:nom, id:cle }) }); return "ok"; },
      send:async function(msg){ await fetch("/hub/send", { method:"POST", body:JSON.stringify({ chan:nom, from:cle, event:msg.event, payload:msg.payload, self:self }) }); return "ok"; },
      presenceState:function(){ return etatPresence; },
      unsubscribe:function(){ if(source) source.close(); sources.forEach(function(s){ s.close(); }); sources = []; return Promise.resolve("ok"); }
    };
    return api;
  }

  window.supabase = {
    createClient:function(){
      return {
        from:function(t){ return requete(t); },
        rpc:function(nom, args){ return poste("/faux/rpc", { nom:nom, args:args || {} }); },
        channel:function(nom, opts){ return creeCanal(nom, opts); },
        removeChannel:function(ch){ try{ ch.untrack && ch.untrack(); ch.unsubscribe(); }catch(e){} return Promise.resolve("ok"); },
        auth:{
          getSession:function(){ return Promise.resolve({ data:{ session:session() }, error:null }); },
          getUser:function(){ const s = session(); return Promise.resolve({ data:{ user:s ? s.user : null }, error:null }); },
          onAuthStateChange:function(cb){ ecouteursAuth.push(cb); return { data:{ subscription:{ unsubscribe:function(){} } } }; },
          signOut:function(){ window.__seDeconnecter(); return Promise.resolve({ error:null }); },
          signInWithOtp:function(o){ return Promise.resolve({ data:{}, error:null }); },
          verifyOtp:function(o){
            const id = window.__comptesEssai[o && o.email];
            if(!id || String(o.token) !== window.__codeEssai) return Promise.resolve({ data:null, error:{ message:"code faux" } });
            try{ localStorage.setItem("essai_moi", id); localStorage.setItem("essai_courriel", o.email); }catch(e){}
            setTimeout(function(){ previens("SIGNED_IN"); }, 0);
            return Promise.resolve({ data:{ session:session() }, error:null });
          },
          signInWithOAuth:function(){ return Promise.resolve({ error:{ message:"pas de Google ici" } }); }
        }
      };
    }
  };
})();
