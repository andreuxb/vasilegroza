/* Pagina Despre: opririle se aprind când ajung pe ecran (desenul se trage, trenul pleacă spre Deva,
   zilele cu poezie se aprind una după alta), iar fotografiile, întoarse cu fața în jos, se întorc la atingere. */
(() => {
  const linistit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelector(".despre-drum")?.classList.add("cu-js");   // fără JS, totul e desenat de la început

  document.querySelectorAll(".fotografii button").forEach((b) => b.addEventListener("click", () => {
    const intoarsa = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", intoarsa);
    b.closest("li").classList.toggle("intoarsa", intoarsa);
  }));

  const opriri = document.querySelectorAll(".oprire");
  const porneste = (el) => {
    el.classList.add("vazut");
    const tren = el.querySelector("animateMotion");
    if (tren && !linistit) { el.querySelector(".vagon").classList.add("pornit"); tren.beginElement(); }
  };
  if (linistit || !("IntersectionObserver" in window)) { opriri.forEach((el) => el.classList.add("vazut", "linistit")); return; }
  const io = new IntersectionObserver((intrari) => intrari.forEach((i) => {
    if (!i.isIntersecting) return;
    io.unobserve(i.target);
    porneste(i.target);
  }), { rootMargin: "0px 0px -25% 0px" });   // o oprire mai înaltă decât ecranul pornește și ea
  opriri.forEach((el) => io.observe(el));
})();
