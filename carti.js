/* Pagina Cărțile: intrarea într-o carte.
   Cartea atinsă vine în mijlocul ecranului, coperta se deschide spre stânga ca la o carte adevărată,
   dedesubt e foaia de titlu, pe hârtia cărții; foaia umple ecranul și abia atunci se deschide pagina cărții.
   ≈1,4 s. Fără animație pentru cine a cerut mișcare redusă, la Ctrl/Cmd-clic (filă nouă) și fără JS. */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const raft = document.querySelector(".raft-pagina");
  if (!raft) return;
  let scena = null;

  raft.addEventListener("click", (ev) => {
    const a = ev.target.closest(".carte-o a");
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0 || scena) return;
    ev.preventDefault();
    deschide(a.closest(".carte-o"), a.href);
  });

  function deschide(li, href) {
    const coperta = li.querySelector(".coperta"), r = coperta.getBoundingClientRect();
    const stil = [...li.classList].find((c) => c.startsWith("stil-")) || "stil-noapte";
    const nume = li.querySelector(".placa .nume")?.textContent || "";
    const vers = li.querySelector(".vers")?.textContent || "";

    // Cartea în mijloc: înălțimea ei ajunge la ~70% din ecran (cât încape și pe lățime).
    const h = Math.min(innerHeight * 0.7, innerWidth * 0.62 * 1.5), w = h / 1.5;
    const x = (innerWidth - w) / 2, y = (innerHeight - h) / 2;

    scena = document.createElement("div");
    scena.className = `intrare ${stil}`;
    scena.setAttribute("aria-hidden", "true");
    scena.innerHTML = `<div class="intrare-carte"><div class="intrare-foaie"><span class="if-autor">Vasile Groza</span>
      <span class="if-nume">${nume.replace(/[&<>]/g, "")}</span><span class="if-vers">${vers.replace(/[&<>]/g, "")}</span></div>
      <div class="intrare-coperta"></div></div>`;
    const carte = scena.querySelector(".intrare-carte"), cop = scena.querySelector(".intrare-coperta");
    const copie = coperta.cloneNode(true);
    copie.querySelector("img")?.removeAttribute("loading");   // imaginea e deja în cache; fără „lazy”, apare din primul cadru
    cop.append(copie);
    // pornește exact peste coperta din raft (FLIP), apoi zboară în mijloc
    Object.assign(carte.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`,
      transform: `translate(${r.left - x}px, ${r.top - y}px) scale(${r.width / w})` });
    document.body.append(scena);
    raft.classList.add("pleaca");
    li.classList.add("aleasa");
    // plasa de siguranță: dacă browserul nu desenează cadre (filă în fundal), cartea se deschide oricum
    setTimeout(() => { location.href = href; }, 2500);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      scena.classList.add("vine");                 // 0–0,55 s: cartea vine în mijloc
      carte.style.transform = "none";
      setTimeout(() => scena.classList.add("deschisa"), 520);   // 0,5–1,1 s: coperta se deschide
      setTimeout(() => scena.classList.add("umple"), 1050);     // 1,05–1,4 s: foaia umple ecranul
      setTimeout(() => { location.href = href; }, 1380);
    }));
  }

  // Înapoi din carte (pagina vine din cache): raftul revine cum era.
  addEventListener("pageshow", (ev) => {
    if (!ev.persisted || !scena) return;
    scena.remove(); scena = null;
    raft.classList.remove("pleaca");
    raft.querySelectorAll(".aleasa").forEach((li) => li.classList.remove("aleasa"));
  });
})();
