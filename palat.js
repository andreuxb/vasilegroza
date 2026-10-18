/* Palatul copiilor: ghicitori (scorul), colorat (umplere cu un clic) și teatru (citit pe roluri). */
(() => {
  // ---------- ghicitori: câte ai deschis ----------
  const ghicitori = document.querySelectorAll(".ghicitoare details");
  const scor = document.querySelector(".scor");
  if (ghicitori.length && scor) {
    const numara = () => {
      const n = [...ghicitori].filter((d) => d.open || d.dataset.vazut).length;
      scor.textContent = n ? `Ai deschis ${n} din ${ghicitori.length}.` : "";
    };
    ghicitori.forEach((d) => d.addEventListener("toggle", () => { if (d.open) d.dataset.vazut = "1"; numara(); }));
  }

  // ---------- teatru: rolul ales se aprinde ----------
  const roluri = document.querySelector(".roluri");
  if (roluri) {
    const replici = [...document.querySelectorAll(".replica")];
    let ales = null;
    const urmatoarea = document.createElement("button");
    urmatoarea.type = "button"; urmatoarea.className = "replica-urmatoare"; urmatoarea.hidden = true;
    urmatoarea.textContent = "Replica mea următoare ↓";
    document.body.append(urmatoarea);
    roluri.addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-rol]");
      if (!b) return;
      ales = ales === b.dataset.rol ? null : b.dataset.rol;
      roluri.querySelectorAll("button").forEach((x) => x.toggleAttribute("aria-pressed", x.dataset.rol === ales));
      document.body.classList.toggle("cu-rol", !!ales);
      replici.forEach((r) => r.classList.toggle("a-mea", !!ales && r.dataset.cine.split(/,| ȘI /).map((x) => x.trim()).includes(ales)));
      urmatoarea.hidden = !ales;
    });
    urmatoarea.addEventListener("click", () => {
      const ale = replici.filter((r) => r.classList.contains("a-mea"));
      const sus = 120, urm = ale.find((r) => r.getBoundingClientRect().top > sus + 10) || ale[0];
      if (urm) scrollTo({ top: scrollY + urm.getBoundingClientRect().top - sus, behavior: "smooth" });
    });
  }

  // ---------- colorat: umplere pe canvas ----------
  const masa = document.querySelector(".masa");
  if (!masa) return;
  const canvas = document.getElementById("plansa"), ctx = canvas.getContext("2d", { willReadFrequently: true });
  const CULORI = ["#e4572e", "#f3a712", "#f6d743", "#8cc63f", "#2e8b57", "#4fb3d9", "#2d5ba8", "#7b4fa0",
    "#f28fb1", "#a0522d", "#f5deb3", "#9aa0a6", "#ffffff"];
  let culoare = CULORI[0], plansa = null, istoric = [];
  const paleta = masa.querySelector(".paleta");
  paleta.innerHTML = CULORI.map((c, i) => `<button type="button" role="radio" aria-checked="${i === 0}" aria-label="culoarea ${i + 1}" style="--c:${c}"></button>`).join("");
  paleta.addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    culoare = getComputedStyle(b).getPropertyValue("--c").trim();
    paleta.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", x === b));
  });
  const deschide = (cheie) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      // conturul devine negru curat: tot ce e închis la culoare e linie, restul e alb
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const v = (p[i] + p[i + 1] + p[i + 2]) / 3 < 150 ? 20 : 255; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; }
      ctx.putImageData(d, 0, 0);
      istoric = []; plansa = cheie; masa.hidden = false;
      masa.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    img.src = `../../media/colorat/${cheie}.png`;
  };
  document.querySelectorAll("[data-plansa]").forEach((b) => b.addEventListener("click", () => deschide(b.dataset.plansa)));
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  canvas.addEventListener("click", (ev) => {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) * canvas.width / r.width), y = Math.floor((ev.clientY - r.top) * canvas.height / r.height);
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height), p = d.data, w = canvas.width, h = canvas.height;
    const i0 = (y * w + x) * 4;
    if (p[i0] < 60 && p[i0 + 1] < 60 && p[i0 + 2] < 60) return; // pe linie
    const [nr, ng, nb] = hex(culoare), [or, og, ob] = [p[i0], p[i0 + 1], p[i0 + 2]];
    if (or === nr && og === ng && ob === nb) return;
    istoric.push(ctx.getImageData(0, 0, w, h)); if (istoric.length > 20) istoric.shift();
    const la = (i) => Math.abs(p[i] - or) + Math.abs(p[i + 1] - og) + Math.abs(p[i + 2] - ob) < 90;
    const stiva = [x, y], vazut = new Uint8Array(w * h);
    while (stiva.length) {
      const yy = stiva.pop(), xx0 = stiva.pop();
      let xx = xx0;
      while (xx >= 0 && !vazut[yy * w + xx] && la((yy * w + xx) * 4)) xx--;
      xx++;
      let sus = false, jos = false;
      for (; xx < w && !vazut[yy * w + xx] && la((yy * w + xx) * 4); xx++) {
        const k = yy * w + xx, i = k * 4;
        vazut[k] = 1; p[i] = nr; p[i + 1] = ng; p[i + 2] = nb;
        if (yy > 0) { const s = la(i - w * 4) && !vazut[k - w]; if (s && !sus) stiva.push(xx, yy - 1); sus = s; }
        if (yy < h - 1) { const j = la(i + w * 4) && !vazut[k + w]; if (j && !jos) stiva.push(xx, yy + 1); jos = j; }
      }
    }
    ctx.putImageData(d, 0, 0);
  });
  masa.querySelector(".inapoi-colorat").addEventListener("click", () => { const s = istoric.pop(); if (s) ctx.putImageData(s, 0, 0); });
  masa.querySelector(".sterge-colorat").addEventListener("click", () => plansa && deschide(plansa));
  masa.querySelector(".salveaza-colorat").addEventListener("click", () => {
    const a = document.createElement("a");
    a.download = `desen-${plansa}.png`; a.href = canvas.toDataURL("image/png"); a.click();
  });
})();
