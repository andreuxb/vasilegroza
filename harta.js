/* Harta locurilor: la intrare, țara se desenează cu peniță, locurile cad pe hartă, iar trenulețul face drumul copilăriei
   (Bichești → Balata, 1946 → Bichești, 1948 → Deva). Atingi un loc: o fișă cu ce spune viața lui și cu poeziile locului. */
(() => {
  const svg = document.querySelector(".harta");
  if (!svg) return;
  const loc = svg.parentNode, fisa = loc.querySelector(".harta-fisa");
  const date = JSON.parse(document.getElementById("harta-date")?.textContent || "{}");
  const linistit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cate = (n, c) => (n === 1 ? `o ${c === "poezii" ? "poezie" : c}` : n % 100 === 0 || n % 100 >= 20 ? `${n} de ${c}` : `${n} ${c}`);

  // pe telefon harta e mai lată decât ecranul: pornim cu Moldova (Bichești) la vedere
  if (loc.scrollWidth > loc.clientWidth) loc.scrollLeft = (loc.scrollWidth - loc.clientWidth) * .62;
  const tara = svg.querySelector(".tara");
  svg.style.setProperty("--L", tara.getTotalLength().toFixed(0));
  svg.querySelectorAll(".drum-viata").forEach((p) => p.style.setProperty("--l", p.getTotalLength().toFixed(0)));
  svg.classList.add("cu-js");
  const tren = svg.querySelector(".trenulet");
  function calatoreste() {
    const bucati = [...svg.querySelectorAll(".drum-viata")];
    if (!tren || !bucati.length || linistit) return;
    let i = 0, t0 = null;
    const DUR = 2200;
    const pas = (t) => {
      if (t0 === null) t0 = t;
      const p = bucati[i], L = p.getTotalLength(), k = Math.min(1, (t - t0) / DUR);
      const e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const a = p.getPointAtLength(e * L), b = p.getPointAtLength(Math.min(L, e * L + 1));
      const ung = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      tren.setAttribute("transform", `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${ung.toFixed(1)})`);
      if (k < 1) requestAnimationFrame(pas);
      else if (++i < bucati.length) { t0 = null; setTimeout(() => requestAnimationFrame(pas), 350); }
    };
    tren.classList.add("pleaca");
    requestAnimationFrame(pas);
  }
  const io = "IntersectionObserver" in window && new IntersectionObserver((l) => {
    if (!l.some((i) => i.isIntersecting)) return;
    io.disconnect();
    svg.classList.add("deseneaza");
    setTimeout(calatoreste, 2600);
    setTimeout(() => svg.classList.add("desenata"), 4200);
  }, { threshold: .2 });
  io ? io.observe(svg) : svg.classList.add("desenata");

  let aprins = null;
  function arata(el) {
    if (aprins) aprins.classList.remove("aprins");
    aprins = el;
    if (!el) { fisa.hidden = true; return; }
    const d = date[el.dataset.l];
    if (!d) return;
    el.classList.add("aprins");
    const lista = d.poezii.map(([s, t, an]) => `<li><a href="../poezie/${s}/">${esc(t)}</a>${an ? ` <span>${an}</span>` : ""}</li>`).join("");
    fisa.innerHTML = `<p class="nf-fir">${d.viata ? "în viața lui" : "în poezii"}${d.cate ? ` · ${cate(d.cate, "poezii")}` : ""}</p>
      <p class="nf-titlu">${esc(d.nume)}</p>${d.viata ? `<p class="nf-vers">${esc(d.viata)}</p>` : ""}
      ${lista ? `<ul class="nf-lista">${lista}</ul>` : ""}
      ${d.cate > 6 ? `<a href="${el.dataset.l}/">Toate cele ${cate(d.cate, "poezii")} →</a>` : ""}
      ${d.ancora ? `${d.cate > 6 ? " · " : ""}<a href="../viata/#${d.ancora}">în pagina Viața</a>` : ""}`;
    fisa.hidden = false;
    const b = el.getBoundingClientRect(), l = loc.getBoundingClientRect();
    const x = loc.scrollLeft + Math.min(Math.max(b.x + b.width / 2 - l.x - fisa.offsetWidth / 2, 0), l.width - fisa.offsetWidth);
    const sus = b.y - l.y - fisa.offsetHeight - 10;
    fisa.style.transform = `translate(${x.toFixed(0)}px, ${(sus < 0 ? b.y - l.y + b.height + 10 : sus).toFixed(0)}px)`;
  }
  svg.addEventListener("click", (ev) => { const p = ev.target.closest(".pin"); arata(p && p !== aprins ? p : null); });
  svg.addEventListener("keydown", (ev) => {
    const p = ev.target.closest(".pin");
    if (p && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); arata(p); }
  });
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") arata(null); });
})();
