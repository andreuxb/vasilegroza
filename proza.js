/* Proza: trenul intră în haltă, harta moșiei își înfige pionezele, cerul Prințesei Blu își aprinde stelele;
   în paginile de citit: bara de lectură, mărimea literei (ținută minte) și locul unde ai rămas în fiecare carte. */
(() => {
  const linistit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tine = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; };

  // desenele pornesc când ajung pe ecran
  const desene = document.querySelectorAll(".gara, .mosie, .cer-blu");
  desene.forEach((d) => d.classList.add("cu-js"));
  const io = "IntersectionObserver" in window && !linistit && new IntersectionObserver((l) => l.forEach((i) => {
    if (i.isIntersecting) { i.target.classList.add("porneste"); io.unobserve(i.target); }
  }), { threshold: .2 });
  desene.forEach((d) => (io ? io.observe(d) : d.classList.add("porneste")));
  const drum = document.querySelector(".drum-mosie");
  if (drum) drum.style.setProperty("--l", drum.getTotalLength().toFixed(0));

  // pagina cărții: „Continuă de unde ai rămas”
  const cont = document.querySelector(".continua");
  if (cont) {
    const carte = location.pathname.split("/").filter(Boolean).pop();
    const ultim = JSON.parse(tine(`vg-citit-${carte}`) || "null");
    if (ultim) {
      cont.innerHTML = `<a href="${ultim.cap}/">Continuă de unde ai rămas: „${ultim.titlu.replace(/[<>&"]/g, "")}” →</a>`;
      cont.hidden = false;
    }
  }

  // pagina de citit
  const art = document.querySelector(".capitol-proza");
  if (!art) return;
  if (art.dataset.cap && document.querySelector(".rasfoire")) {
    tine(`vg-citit-${art.dataset.carte}`, JSON.stringify({ cap: art.dataset.cap, titlu: art.dataset.titlu }));
  }
  const text = art.querySelector(".text-proza");
  let marime = +(tine("vg-litera") || 0);
  const aplica = () => { text.style.fontSize = `${(1.18 + marime * .1).toFixed(2)}rem`; };
  aplica();
  art.querySelectorAll("[data-litera]").forEach((b) => b.addEventListener("click", () => {
    marime = Math.max(-2, Math.min(4, marime + +b.dataset.litera)); tine("vg-litera", String(marime)); aplica();
  }));
  const bara = document.querySelector(".bara-lectura");
  if (bara) {
    const misca = () => {
      const r = text.getBoundingClientRect(), tot = r.height - innerHeight * .6;
      bara.style.transform = `scaleX(${Math.min(1, Math.max(0, -r.top / Math.max(1, tot))).toFixed(3)})`;
    };
    addEventListener("scroll", misca, { passive: true }); misca();
  }
})();
