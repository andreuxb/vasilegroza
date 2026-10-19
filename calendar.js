/* Calendarul-spirală: la intrare, spirala se desface din mijloc (de la Sfântul Vasile) spre margine, zi după zi.
   Ziua de azi bate ușor. Treci (sau atingi) o zi: o fișă cu data și poeziile ei; încă o atingere te duce la zi. */
(() => {
  const svg = document.querySelector(".spirala");
  if (!svg) return;
  const fisa = document.querySelector(".zi-fisa"), loc = svg.parentNode;
  const atingere = matchMedia("(pointer: coarse)").matches;
  const LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // spirala se desface când ajunge pe ecran
  const cale = svg.querySelector(".cale-s");
  const L = cale.getTotalLength();
  svg.style.setProperty("--L", L.toFixed(0));
  svg.classList.add("cu-js");
  const io = "IntersectionObserver" in window && new IntersectionObserver((l) => {
    if (l.some((i) => i.isIntersecting)) { svg.classList.add("desfasoara"); io.disconnect(); setTimeout(() => svg.classList.add("desfacuta"), 5200); }
  }, { threshold: .15 });
  io ? io.observe(svg) : svg.classList.add("desfacuta");

  // azi
  const d = new Date(), azi = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const elAzi = svg.querySelector(`[data-k="${azi}"]`);
  if (elAzi) {
    elAzi.classList.add("azi");
    const c = elAzi.querySelector("circle:last-child") || elAzi;
    const ns = "http://www.w3.org/2000/svg", inel = document.createElementNS(ns, "circle");
    inel.setAttribute("class", "inel-azi"); inel.setAttribute("cx", c.getAttribute("cx")); inel.setAttribute("cy", c.getAttribute("cy")); inel.setAttribute("r", "16");
    const t = document.createElementNS(ns, "text");
    t.setAttribute("class", "azi-t"); t.setAttribute("x", c.getAttribute("cx")); t.setAttribute("y", +c.getAttribute("cy") - 22); t.setAttribute("text-anchor", "middle");
    t.textContent = "azi";
    svg.querySelector(".zile-s").append(inel, t);
  }

  // fișa unei zile
  const zile = [...svg.querySelectorAll("[data-k]")].map((el) => {
    const c = el.matches("circle") ? el : el.querySelector(".miez-s");
    return { el, k: el.dataset.k, x: +c.getAttribute("cx"), y: +c.getAttribute("cy") };
  });
  const cache = new Map();
  let arata = null;
  function aproape(ev) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    const r = (atingere ? 20 : 14) / m.a;
    let best = null, bd = r * r;
    for (const z of zile) { const dd = (z.x - p.x) ** 2 + (z.y - p.y) ** 2; if (dd < bd) { bd = dd; best = z; } }
    return best;
  }
  async function fisaZi(z) {
    if (arata) arata.el.classList.remove("aprinsa");
    arata = z;
    if (!z) { fisa.hidden = true; return; }
    z.el.classList.add("aprinsa");
    const [l, zi] = z.k.split("-").map(Number);
    const n = +(z.el.dataset.n || 0);
    let poezii = [];
    if (n) {
      if (!cache.has(z.k)) cache.set(z.k, fetch(`../date/zile/${z.k}.json`).then((r) => r.json()).catch(() => []));
      poezii = await cache.get(z.k);
      if (arata !== z) return;
    }
    fisa.innerHTML = `<p class="nf-fir">${z.k === "01-01" ? "Sfântul Vasile · " : ""}${n ? (n === 1 ? "o poezie" : n < 20 ? `${n} poezii` : `${n} de poezii`) : "nicio poezie în ziua asta"}</p>
      <p class="nf-titlu">${zi} ${LUNI[l - 1]}</p>
      ${poezii.length ? `<ul class="nf-lista">${poezii.slice(0, 5).map((p) => `<li><a href="../poezie/${p.slug}/">${esc(p.titlu)}</a> <span>${p.data.slice(0, 4)}</span></li>`).join("")}</ul>
      <a href="../zi/${z.k}/">Ziua întreagă →</a>` : `<p class="nf-vers">Pe 7 februarie, poezia vine din zilele vecine.</p>`}`;
    fisa.hidden = false;
    const m = svg.getScreenCTM(), lr = loc.getBoundingClientRect();
    const px = z.x * m.a + m.e - lr.left, py = z.y * m.d + m.f - lr.top;
    const x = Math.min(Math.max(px - fisa.offsetWidth / 2, 0), lr.width - fisa.offsetWidth);
    const y = py - fisa.offsetHeight - 16 < 0 ? py + 16 : py - fisa.offsetHeight - 16;
    fisa.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
  }
  svg.addEventListener("click", (ev) => {
    if (ev.target.closest(".sf-vasile")) return;
    const z = aproape(ev);
    if (atingere) {
      ev.preventDefault();
      if (z && arata === z && z.el.dataset.n) location.href = `../zi/${z.k}/`;
      else fisaZi(z);
    } else if (z && !ev.target.closest("a") && z.el.dataset.n) location.href = `../zi/${z.k}/`;
  });
  if (!atingere) {
    svg.addEventListener("mousemove", (ev) => { const z = aproape(ev); if (z !== arata) fisaZi(z); });
    loc.addEventListener("mouseleave", () => fisaZi(null));
  }
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") fisaZi(null); });
})();
