/* ====== UN SUPABASE DE POCHE, POUR ÉPROUVER LE COMPTE ======
   On ne teste pas Supabase — ce n'est pas notre code, et le proxy du bac à
   sable ne laisse de toute façon pas sortir. On teste TOUT LE RESTE : la
   connexion par code, le refus d'un mauvais code, la fusion, le conflit entre
   deux téléphones, et la règle qui compte plus que tout — se connecter ne
   retire jamais rien.

   Ce fichier est un TEXTE, pas un module : le banc l'injecte à la place du
   script CDN de Supabase, exactement comme hub.js le fait pour le temps réel.
   Il reproduit les seules signatures dont le jeu se sert, et la sémantique de
   poser_sauvegarde() telle qu'elle est écrite dans comptes/table.sql : une
   écriture qui n'annonce pas la bonne révision ne touche à rien. */
module.exports = `
(function(){
  /* L'état du « serveur », visible du banc pour être semé et relu. */
  window.__faux = {
    table: true,           // la table « sauvegardes » existe-t-elle ?
    google: false,         // le fournisseur Google est-il ouvert ?
    ligne: null,           // { id, donnees, revision }
    codeAttendu: "123456",
    courriel: "",
    poses: 0,              // combien d'appels à poser_sauvegarde
    conflitUneFois: false  // simule un autre téléphone qui écrit entre-temps
  };
  var session = null, ecouteurs = [];
  function previens(evt){ ecouteurs.forEach(function(cb){ try{ cb(evt, session); }catch(e){} }); }

  function promesse(v){ return { then:function(r){ return Promise.resolve(v).then(r); },
                                 catch:function(){ return this; } }; }
  function requete(table, F){
    var col = "", filtre = null;
    var q = {
      select:function(c){ col = c; return q; },
      insert:function(){ return promesse({ data:null, error:null }); },
      eq:function(k,v){ filtre = v; return q; },
      limit:function(){ return promesse(sondage(table, F)); },
      maybeSingle:function(){ return promesse(lecture(table, F, filtre)); },
      then:function(r){ return Promise.resolve(sondage(table, F)).then(r); }
    };
    return q;
  }
  function sondage(table, F){
    if(table !== "sauvegardes") return { data:[], error:null };
    if(!F.table) return { data:null, error:{ code:"42P01", message:"relation does not exist" } };
    return { data:[], error:null };          // la règle RLS filtre tout : liste vide
  }
  function lecture(table, F, id){
    if(!F.table) return { data:null, error:{ code:"42P01", message:"relation does not exist" } };
    if(!F.ligne) return { data:null, error:null };
    return { data:{ donnees:F.ligne.donnees, revision:F.ligne.revision }, error:null };
  }

  window.supabase = {
    createClient:function(){
      var F = window.__faux;
      return {
        from:function(t){ return requete(t, F); },
        rpc:function(nom, args){
          if(nom !== "poser_sauvegarde") return promesse({ data:null, error:{ message:"inconnue" } });
          F.poses++;
          if(!session) return promesse({ data:null, error:{ message:"non connecté" } });
          /* Un autre téléphone est passé juste avant nous : la révision du
             serveur avance sans nous, et notre écriture doit être refusée. */
          if(F.conflitUneFois && F.ligne){
            F.conflitUneFois = false;
            F.ligne.revision++;              // l'autre téléphone vient d'écrire
            return promesse({ data:{ ecrit:false, revision:F.ligne.revision, donnees:F.ligne.donnees }, error:null });
          }
          var rev = F.ligne ? F.ligne.revision : 0;
          if(rev !== (args.p_revision|0)){
            return promesse({ data:{ ecrit:false, revision:rev, donnees:(F.ligne?F.ligne.donnees:null) }, error:null });
          }
          F.ligne = { id:session.user.id, donnees:args.p_donnees, revision:rev + 1 };
          return promesse({ data:{ ecrit:true, revision:F.ligne.revision }, error:null });
        },
        channel:function(){ var c={ on:function(){return c;}, subscribe:function(cb){ if(cb) cb("SUBSCRIBED"); return c; },
                                    track:function(){return Promise.resolve();}, untrack:function(){return Promise.resolve();},
                                    send:function(){return Promise.resolve();}, unsubscribe:function(){return Promise.resolve();} }; return c; },
        removeChannel:function(){ return Promise.resolve("ok"); },
        auth:{
          getSession:function(){ return Promise.resolve({ data:{ session:session } }); },
          onAuthStateChange:function(cb){ ecouteurs.push(cb); return { data:{ subscription:{ unsubscribe:function(){} } } }; },
          signInWithOtp:function(o){ window.__faux.courriel = o.email; return Promise.resolve({ error:null }); },
          verifyOtp:function(o){
            if(String(o.token) !== window.__faux.codeAttendu) return Promise.resolve({ error:{ message:"Token has expired or is invalid" } });
            session = { user:{ id:"11111111-2222-3333-4444-555555555555", email:o.email } };
            previens("SIGNED_IN");
            return Promise.resolve({ error:null });
          },
          signInWithOAuth:function(){
            if(!window.__faux.google) return Promise.resolve({ error:{ message:"Unsupported provider: provider is not enabled" } });
            session = { user:{ id:"11111111-2222-3333-4444-555555555555", email:"google@essai.test" } };
            previens("SIGNED_IN");
            return Promise.resolve({ error:null });
          },
          signOut:function(){ session = null; previens("SIGNED_OUT"); return Promise.resolve({ error:null }); }
        }
      };
    }
  };
})();
`;
