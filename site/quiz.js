/* ===== LES QUESTIONS DU SITE SE JOUENT (v363) =====
   Sans ce script, chaque question montre ses quatre propositions et un
   « Voir la réponse » qui s'ouvre (le texte est dans la page, pour tout le
   monde, moteurs de recherche compris). Avec lui, on répond d'un toucher :
   la bonne proposition s'allume en vert, la mauvaise en rose, l'explication
   s'ouvre, et le score de la page se tient en bas de l'écran. Rien n'est
   envoyé nulle part, rien n'est gardé. */
(function(){
  var score = 0, total = 0;
  var barre = document.querySelector(".score");
  function maj(){
    if(!barre) return;
    barre.hidden = false;
    barre.querySelector("b").textContent = score + " / " + total;
  }
  var qs = document.querySelectorAll(".q[data-b]");
  for(var n = 0; n < qs.length; n++) (function(q){
    var bonne = +q.getAttribute("data-b");
    var opts = q.querySelectorAll(".q-options li");
    var det = q.querySelector(".q-rep");
    if(!opts[bonne]) return;
    q.classList.add("vivant");
    function finir(i){
      if(q.classList.contains("repondue")) return;
      q.classList.add("repondue");
      opts[bonne].classList.add("ok");
      if(i >= 0){
        total++;
        if(i === bonne) score++; else opts[i].classList.add("ko");
        maj();
      }
      if(det) det.open = true;
      for(var k = 0; k < opts.length; k++){ opts[k].removeAttribute("tabindex"); opts[k].removeAttribute("role"); }
    }
    for(var i = 0; i < opts.length; i++) (function(li, i){
      li.setAttribute("role", "button");
      li.tabIndex = 0;
      li.addEventListener("click", function(){ finir(i); });
      li.addEventListener("keydown", function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); finir(i); } });
    })(opts[i], i);
    /* Ouvrir « Voir la réponse » avant de répondre, c'est passer : la
       question ne compte pas, la bonne réponse s'allume quand même. */
    if(det) det.addEventListener("toggle", function(){ if(det.open && !q.classList.contains("repondue")) finir(-1); });
  })(qs[n]);
})();
