/* Le client Supabase, réduit à ce que le jeu utilise, branché sur le serveur
   local. Mêmes noms, mêmes signatures, mêmes sémantiques :
   - broadcast self:false -> on ne reçoit pas ses propres messages ;
   - presence sync -> déclenché à chaque changement ;
   - subscribe(cb) -> cb("SUBSCRIBED"). */
(function(){
  function creeCanal(nom, opts){
    const cle = (opts && opts.config && opts.config.presence && opts.config.presence.key) || ("id"+Math.random());
    const self = !(opts && opts.config && opts.config.broadcast && opts.config.broadcast.self === false);
    const ecouteurs = { presence:{}, broadcast:{} };
    let etatPresence = {}, source = null, abonne = false;
    const api = {
      on(type, filtre, cb){
        if(type === "presence"){ const e = (filtre && filtre.event) || "sync";
          (ecouteurs.presence[e] = ecouteurs.presence[e] || []).push(cb); }
        else if(type === "broadcast") (ecouteurs.broadcast[filtre.event] = ecouteurs.broadcast[filtre.event] || []).push(cb);
        return api;
      },
      subscribe(cb){
        source = new EventSource("/hub/sub?chan="+encodeURIComponent(nom)+"&id="+encodeURIComponent(cle));
        source.onmessage = (e)=>{
          const m = JSON.parse(e.data);
          if(m.kind === "presence"){ etatPresence = m.etat;
            (ecouteurs.presence[m.event || "sync"] || []).forEach(f=>{ try{ f({ key:m.cle }); }catch(x){} }); }
          else if(m.kind === "broadcast"){ (ecouteurs.broadcast[m.event]||[]).forEach(f=>{ try{ f({ payload:m.payload }); }catch(x){} }); }
        };
        source.onopen = ()=>{ if(!abonne){ abonne = true; if(cb) cb("SUBSCRIBED"); } };
        return api;
      },
      async track(meta){ await fetch("/hub/track",{method:"POST",body:JSON.stringify({chan:nom,id:cle,meta})}); return "ok"; },
      async untrack(){ await fetch("/hub/untrack",{method:"POST",body:JSON.stringify({chan:nom,id:cle})}); return "ok"; },
      async send(msg){ await fetch("/hub/send",{method:"POST",body:JSON.stringify({chan:nom,from:cle,event:msg.event,payload:msg.payload,self})}); return "ok"; },
      presenceState(){ return etatPresence; },
      unsubscribe(){ if(source) source.close(); return Promise.resolve("ok"); },
    };
    return api;
  }
  window.supabase = {
    createClient(){
      return {
        channel: (nom, opts) => creeCanal(nom, opts),
        removeChannel(ch){ try{ ch.untrack(); ch.unsubscribe(); }catch(e){} return Promise.resolve("ok"); },
        from(){ const q = { select:()=>q, insert:()=>q, upsert:()=>q, update:()=>q, delete:()=>q,
                            eq:()=>q, gte:()=>q, then:(r)=>Promise.resolve({data:[],error:null}).then(r) }; return q; },
      };
    },
  };
})();
