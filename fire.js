/* Pagina Firele: copacul și, ca a doua vedere, războiul de țesut („Pe ani”).
   - Copacul crește când ajunge pe ecran: rădăcinile, trunchiul, ramurile, florile an după an, apoi vin păsările și animalele.
   - Atingi numele unui fir: ramura lui (sau firul din pânză) se aprinde, celelalte se sting, iar dedesubt apare ce e pe el.
   - Atingi o floare (un nod): o fișă cu titlul, anul și primul vers. Atingi o pasăre, un animal sau o rădăcină:
     o fișă cu câteva poezii și drumul spre toate.
   - Când se schimbă anotimpul, copacul înflorește din nou. */
(() => {
  const copac = document.querySelector(".copac"), razboi = document.querySelector(".razboi");
  if (!copac && !razboi) return;
  const ales = document.querySelector(".fir-ales"), alegeri = [...document.querySelectorAll(".fire-alege a")];
  const atingere = matchMedia("(pointer: coarse)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const date = JSON.parse(document.getElementById("copac-date")?.textContent || "{}");
  const cate = (n, c) => (n % 100 === 0 || n % 100 >= 20 ? `${n} de ${c}` : `${n} ${c}`);

  // ---------- intrarea: copacul crește, pânza se țese ----------
  const io = "IntersectionObserver" in window && new IntersectionObserver((l) => l.forEach((i) => {
    if (!i.isIntersecting) return;
    io.unobserve(i.target);
    if (i.target === copac) {
      copac.classList.add("creste");
      setTimeout(() => copac.classList.add("crescut"), 5200);   // după creștere, florile nu mai depind de animație
    } else i.target.classList.add("tesut");
  }), { threshold: .12 });
  if (copac) { copac.classList.add("cu-js"); io ? io.observe(copac) : copac.classList.add("crescut"); }
  if (razboi) { razboi.classList.add("cu-js"); io ? io.observe(razboi) : razboi.classList.add("tesut"); }
  document.addEventListener("anotimp", () => {
    if (!copac || !copac.classList.contains("crescut")) return;
    copac.classList.remove("reinfloreste"); void copac.getBBox(); copac.classList.add("reinfloreste");
  });

  // ---------- cele două vederi ----------
  const vederi = document.querySelectorAll(".vederi button");
  vederi.forEach((b) => b.addEventListener("click", () => {
    vederi.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    document.querySelector(".copac-loc").hidden = b.dataset.vedere !== "copac";
    document.querySelector(".razboi-loc").hidden = b.dataset.vedere !== "ani";
    if (b.dataset.vedere === "ani" && razboi && !razboi.classList.contains("tesut")) razboi.classList.add("tesut");
  }));

  // ---------- alegerea unui fir: se aprinde în amândouă vederile ----------
  let firAles = null;
  function alege(fir) {
    firAles = firAles === fir ? null : fir;
    for (const svg of [copac, razboi]) {
      if (!svg) continue;
      svg.classList.toggle("cu-ales", !!firAles);
      svg.querySelectorAll(".fir, .nume-ram").forEach((g) => g.classList.toggle("ales", g.dataset.fir === firAles));
      svg.querySelectorAll(".cusatura").forEach((c) => c.classList.toggle("ales", !!firAles && c.dataset.fire.split(" ").includes(firAles)));
    }
    alegeri.forEach((a) => a.toggleAttribute("aria-current", a.dataset.fir === firAles));
    const a = alegeri.find((x) => x.dataset.fir === firAles);
    if (!a) { ales.hidden = true; return; }
    ales.style.setProperty("--f", a.style.getPropertyValue("--f"));
    ales.innerHTML = `<p class="fir-ales-nume">${esc(a.textContent)}</p><p>${esc(a.dataset.desc)}</p>
      <p class="fir-ales-cate">${esc(a.dataset.cate)} · pe ramură, crenguțele sunt anii</p>
      <p><a href="${a.getAttribute("href")}">Urmează firul, de la prima la ultima poezie →</a></p>`;
    ales.hidden = false;
  }
  alegeri.forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault(); alege(a.dataset.fir); }));
  if (!atingere) [copac, razboi].forEach((svg) => svg && svg.querySelectorAll(".fir").forEach((g) => {
    g.addEventListener("mouseenter", () => { if (!firAles) { svg.classList.add("cu-trecere"); svg.querySelectorAll(`.fir[data-fir="${g.dataset.fir}"]`).forEach((x) => x.classList.add("trecere")); } });
    g.addEventListener("mouseleave", () => { svg.classList.remove("cu-trecere"); svg.querySelectorAll(".trecere").forEach((x) => x.classList.remove("trecere")); });
  }));

  // ---------- fișa: un nod (poezie), o făptură sau o rădăcină ----------
  let index = null;
  const poezii = fetch("../date/cautare.json").then((r) => r.json()).then((d) => {
    index = new Map(d.poezii.map(([slug, titlu, inceput, an, k]) => [slug, { titlu, inceput, an, carte: d.carti[k] }]));
  }).catch(() => {});
  const noduri = (svg) => [...svg.querySelectorAll("[data-s]")].map((c) => ({
    c, x: +(c.getAttribute("cx") ?? c.getAttribute("x")), y: +(c.getAttribute("cy") ?? c.getAttribute("y")), fir: c.parentNode.dataset.fir }));
  const toate = new Map([copac, razboi].filter(Boolean).map((s) => [s, noduri(s)]));
  function celMaiAproape(svg, ev) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    const r = (atingere ? 18 : 10) / m.a;
    let best = null, bd = r * r;
    for (const n of toate.get(svg)) {
      if (firAles && n.fir !== firAles) continue;
      const d = (n.x - pt.x) ** 2 + (n.y - pt.y) ** 2;
      if (d < bd) { bd = d; best = n.c; }
    }
    return best;
  }
  let aprins = null;
  function stinge() { if (aprins) aprins.classList.remove("nod-aprins", "aleasa"); aprins = null; }
  function aseaza(fisa, el) {
    const loc = fisa.parentNode, b = el.getBoundingClientRect(), l = loc.getBoundingClientRect();
    fisa.hidden = false;
    const x = Math.min(Math.max(b.x + b.width / 2 - l.x - fisa.offsetWidth / 2, 0), l.width - fisa.offsetWidth);
    const deasupra = b.y - l.y - fisa.offsetHeight - 12;
    fisa.style.transform = `translate(${x.toFixed(0)}px, ${(deasupra < 0 ? b.y - l.y + b.height + 12 : deasupra).toFixed(0)}px)`;
  }
  async function arataNod(svg, c) {
    const fisa = svg.parentNode.querySelector(".nod-fisa");
    stinge();
    if (!c) { fisa.hidden = true; return; }
    aprins = c; c.classList.add("nod-aprins");
    await poezii;
    const p = index && index.get(c.dataset.s);
    if (!p || aprins !== c) return;
    const fir = alegeri.find((a) => a.dataset.fir === c.parentNode.dataset.fir);
    fisa.style.setProperty("--f", c.parentNode.style.getPropertyValue("--f"));
    fisa.innerHTML = `<p class="nf-fir">${esc(fir ? fir.textContent : "")} · ${p.an || "fără dată"} · ${esc(p.carte)}</p>
      <p class="nf-titlu">${esc(p.titlu)}</p><p class="nf-vers">${esc(p.inceput)}</p>
      <a href="../poezie/${c.dataset.s}/">Citește poezia →</a>`;
    aseaza(fisa, c);
  }
  function arataGrup(el, fel, cheie) {
    const fisa = copac.parentNode.querySelector(".nod-fisa");
    stinge();
    const d = fel === "r" ? date.radacini?.[cheie] : date.fapturi?.[cheie];
    if (!d) return;
    aprins = el; el.classList.add("aleasa");
    const n = fel === "r" ? d.poezii.length : d.cate;
    const lista = d.poezii.map(([s, t, an]) => `<li><a href="../poezie/${s}/">${esc(t)}</a>${an ? ` <span>${an}</span>` : ""}</li>`).join("");
    const pagina = fel === "r" ? `r-${cheie}` : cheie;
    fisa.style.setProperty("--f", fel === "r" ? "#f6e3a8" : "#c9a96a");
    fisa.innerHTML = `<p class="nf-fir">${fel === "r" ? "rădăcina" : "în poezii"} · ${cate(n, "poezii")}</p>
      <p class="nf-titlu">${esc(d.nume)}</p>${d.desc ? `<p class="nf-vers">${esc(d.desc)}</p>` : ""}
      <ul class="nf-lista">${lista}</ul>
      <a href="../copac/${pagina}/">${fel === "r" ? "Toate poeziile rădăcinii" : `Toate cele ${cate(n, "poezii")}`} →</a>
      ${fel === "r" ? ` · <a href="../viata/#${d.ancora}">în viața lui</a>` : ""}`;
    aseaza(fisa, el);
  }
  for (const svg of [copac, razboi]) {
    if (!svg) continue;
    svg.addEventListener("click", (ev) => {
      const g = ev.target.closest(".faptura, .radacina");
      if (g) { arataGrup(g, g.classList.contains("radacina") ? "r" : "f", g.dataset.f || g.dataset.r); return; }
      const c = celMaiAproape(svg, ev);
      if (!c) { arataNod(svg, null); return; }
      if (!atingere) { location.href = `../poezie/${c.dataset.s}/`; return; }
      arataNod(svg, c);
    });
    svg.addEventListener("keydown", (ev) => {
      const g = ev.target.closest(".faptura, .radacina");
      if (g && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); arataGrup(g, g.classList.contains("radacina") ? "r" : "f", g.dataset.f || g.dataset.r); }
    });
    if (!atingere) {
      svg.addEventListener("mousemove", (ev) => {
        if (ev.target.closest(".faptura, .radacina")) { svg.style.cursor = "pointer"; return; }
        if (aprins && aprins.matches(".faptura, .radacina")) return;   // fișa unei făpturi rămâne până la alt clic
        const c = celMaiAproape(svg, ev);
        if (c !== aprins) arataNod(svg, c);
        svg.style.cursor = c ? "pointer" : "";
      });
      svg.parentNode.addEventListener("mouseleave", () => { if (!aprins || !aprins.matches(".faptura, .radacina")) arataNod(svg, null); });
    }
  }
  addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    stinge(); document.querySelectorAll(".nod-fisa").forEach((f) => { f.hidden = true; });
    if (firAles) alege(firAles);
  });
})();
