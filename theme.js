/* Le site reste toujours en mode nuit ; seule la taille du texte est réglable (appliquée avant l'affichage) */
(function () {
  document.documentElement.setAttribute("data-theme", "dark");
  try { if (localStorage.getItem("big") === "1") document.documentElement.setAttribute("data-big", "1"); } catch (e) {}
})();
