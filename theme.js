/* Thème clair/sombre et grande taille de texte : appliqués avant l'affichage pour éviter tout clignotement */
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    if (localStorage.getItem("big") === "1") document.documentElement.setAttribute("data-big", "1");
  } catch (e) { document.documentElement.setAttribute("data-theme", "dark"); }
})();
