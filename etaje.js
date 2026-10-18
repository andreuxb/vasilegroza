/* Coborârea pe etaje: lumea de sub cer „se întrupează” din stele.
   Fiecare scenă (svg.lume) e desenată dintr-o singură cerneală. Cât derulezi, praful de stele
   cade pe începutul liniilor, apoi liniile se trag, fiecare la rândul ei (data-o, între 0 și 1).
   Porțile sunt cărți: la atingere, poarta se deschide și abia apoi pleci. */
(() => {
  const scene = [...document.querySelectorAll("svg.lume")];
  if (!scene.length) return;
  const linistit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const lim = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };

  const stari = scene.map((svg, k) => {
    const linii = [...svg.querySelectorAll("[data-o]")].map((el) => {
      el.setAttribute("pathLength", "1");
      el.style.strokeDasharray = "1";
      return { el, o: +el.dataset.o };
    });
    // un fir de praf pentru fiecare linie: pornește de sus, aterizează pe primul punct al liniei
    const praf = svg.querySelector(".praf");
    const fire = linii.map(({ el, o }, i) => {
      const t = el.tagName === "circle"
        ? [+el.getAttribute("cx") + +el.getAttribute("r"), +el.getAttribute("cy")]
        : (({ x, y }) => [x, y])(el.getPointAtLength(0));
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", "1.6");
      praf.append(c);
      return { c, o, de: [400 * hash(`${k}x${i}`), -80 - 140 * hash(`${k}y${i}`)], la: t };
    });
    return { svg, linii, fire, rest: svg.querySelectorAll(".ochi, text, .lumina") };
  });

  function deseneaza(s, p) {
    for (const { el, o } of s.linii) el.style.strokeDashoffset = (1 - ease(lim((p - o) / 0.3))).toFixed(4);
    for (const f of s.fire) {
      // praful cade cu puțin înainte ca linia lui să înceapă, apoi se stinge în ea
      const k = lim((p - (f.o - 0.16)) / 0.16), e = ease(k);
      f.c.setAttribute("cx", (f.de[0] + (f.la[0] - f.de[0]) * e).toFixed(1));
      f.c.setAttribute("cy", (f.de[1] + (f.la[1] - f.de[1]) * e).toFixed(1));
      f.c.style.opacity = k <= 0 ? 0 : (k < 1 ? 0.9 : Math.max(0, 0.9 - (p - f.o) * 6)).toFixed(2);
    }
    const r = lim((p - 0.55) / 0.2);
    s.rest.forEach((el) => { el.style.opacity = r.toFixed(2); });
  }

  // p = 0 când scena intră pe ecran, 1 când partea ei de jos a urcat la 90% din înălțime
  function progres(svg) {
    const r = svg.getBoundingClientRect(), vh = innerHeight;
    return lim((vh - r.top) / (r.height + vh * 0.1));
  }

  // ---------- firul: un singur drum de aur prin toate etajele ----------
  // Pleacă de sub cer, coboară pe margine și intră în fiecare scenă pe prima ei linie
  // (data-intrare), apoi iese pe ultima (data-iesire). În vârful lui merge o stea.
  const etaje = document.querySelector(".etaje");
  const fir = { svg: document.createElementNS(NS, "svg"), cale: document.createElementNS(NS, "path"), stea: document.createElementNS(NS, "circle"), probe: [] };
  fir.svg.classList.add("fir"); fir.svg.setAttribute("aria-hidden", "true");
  fir.stea.setAttribute("r", "2.6");
  fir.svg.append(fir.cale, fir.stea);
  etaje.prepend(fir.svg);

  function punct(svg, atr) {
    const [x, y] = svg.dataset[atr].split(",").map(Number), vb = svg.viewBox.baseVal;
    const r = svg.getBoundingClientRect(), e = etaje.getBoundingClientRect(), k = r.width / vb.width;
    return [r.left - e.left + x * k, r.top - e.top + y * k];
  }
  function traseazaFir() {
    const W = etaje.clientWidth, H = etaje.scrollHeight;
    fir.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    fir.svg.style.height = `${H}px`;
    const marg = (x) => (x < W / 2 ? Math.max(8, x - 26) : Math.min(W - 8, x + 26));
    let [ax, ay] = [W / 2, 0], d = `M${ax} ${ay}`, primul = true;
    for (const s of stari) {
      const [bx, by] = punct(s.svg, "intrare"), dy = by - ay;
      const c1 = primul ? [Math.max(8, bx - 26), ay + dy * 0.2] : [marg(ax), ay + dy * 0.4];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${marg(bx).toFixed(1)} ${(by - dy * 0.4).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
      [ax, ay] = punct(s.svg, "iesire");
      d += ` M${ax.toFixed(1)} ${ay.toFixed(1)}`;
      primul = false;
    }
    fir.cale.setAttribute("d", d);
    // probe de-a lungul firului, ca să știm ce lungime corespunde unei înălțimi
    const L = fir.cale.getTotalLength();
    fir.L = L; fir.probe = [];
    for (let l = 0; l <= L; l += 6) fir.probe.push([l, fir.cale.getPointAtLength(l)]);
    fir.cale.style.strokeDasharray = `${L} ${L}`;
  }
  function deseneazaFir() {
    if (!fir.probe.length) return;
    const tinta = scrollY + innerHeight * 0.72 - (etaje.getBoundingClientRect().top + scrollY);
    // firul e desenat până la ultimul punct aflat deasupra țintei
    let l = 0, p = fir.probe[0][1];
    for (const [lp, pt] of fir.probe) { if (pt.y > tinta) break; l = lp; p = pt; }
    fir.cale.style.strokeDashoffset = (fir.L - l).toFixed(1);
    fir.stea.setAttribute("cx", p.x.toFixed(1)); fir.stea.setAttribute("cy", p.y.toFixed(1));
    fir.stea.style.opacity = l > 2 && l < fir.L - 6 ? 1 : 0;
  }

  let cerut = false;
  function actualizeaza() {
    cerut = false;
    for (const s of stari) deseneaza(s, progres(s.svg));
    deseneazaFir();
  }
  traseazaFir();
  if (linistit) { stari.forEach((s) => deseneaza(s, 1)); fir.cale.style.strokeDasharray = "none"; }
  else {
    actualizeaza();
    addEventListener("scroll", () => { if (!cerut) { cerut = true; requestAnimationFrame(actualizeaza); } }, { passive: true });
  }
  const refa = () => { traseazaFir(); if (!linistit) actualizeaza(); };
  addEventListener("resize", refa);
  if (document.fonts) document.fonts.ready.then(refa);
  addEventListener("load", refa);

  // poarta se deschide, apoi pleci
  document.querySelectorAll(".usa-lume").forEach((a) => a.addEventListener("click", (ev) => {
    if (linistit || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    a.classList.add("deschis");
    setTimeout(() => { location.href = a.getAttribute("href"); }, 520);
  }));
  addEventListener("pageshow", () => document.querySelectorAll(".usa-lume.deschis").forEach((a) => a.classList.remove("deschis")));
})();
