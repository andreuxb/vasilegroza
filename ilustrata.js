/* „Trimite ca ilustrată”: din pagina unei poezii face o carte poștală (imagine), cu ilustrația, titlul, versurile,
   semnătura lui și o ștampilă cu data. Pe telefon se trimite direct (WhatsApp, mesaj); altfel se descarcă sau se tipărește.
   Totul se desenează în pagină, pe un canvas: nimic nu pleacă spre vreun server. */
(() => {
  const buton = document.querySelector("button.ilustrata");
  if (!buton) return;
  const W = 1200, H = 1680, M = 70;

  function linii(ctx, text, lat) {
    const out = [];
    for (const rand of text.split("\n")) {
      if (!rand.trim()) { out.push(""); continue; }
      let cur = "";
      for (const cuv of rand.split(" ")) {
        const inc = cur ? `${cur} ${cuv}` : cuv;
        if (ctx.measureText(inc).width > lat && cur) { out.push(cur); cur = `   ${cuv}`; } else cur = inc;
      }
      out.push(cur);
    }
    return out;
  }

  async function deseneaza() {
    await document.fonts.ready;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    // hârtia
    x.fillStyle = "#f5ecd8"; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2400; i++) {   // fibrele hârtiei
      x.fillStyle = `rgba(120,90,50,${Math.random() * .05})`;
      x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1);
    }
    x.strokeStyle = "#c9a96a"; x.lineWidth = 3; x.strokeRect(28, 28, W - 56, H - 56);
    x.lineWidth = 1; x.strokeRect(40, 40, W - 80, H - 80);
    // ilustrația
    let y = M + 10;
    const img = document.querySelector(".poezie .ilustratie img");
    if (img && img.complete && img.naturalWidth) {
      const hImg = 640, r = Math.max((W - 2 * M) / img.naturalWidth, hImg / img.naturalHeight);
      const sw = (W - 2 * M) / r, sh = hImg / r;
      x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, M, y, W - 2 * M, hImg);
      x.strokeStyle = "rgba(74,51,36,.25)"; x.strokeRect(M, y, W - 2 * M, hImg);
      y += hImg + 70;
    } else y += 120;
    // timbrul și ștampila
    const tx = W - M - 130, ty = img ? M + 30 : M + 10;
    x.fillStyle = "#fffaf0"; x.fillRect(tx, ty, 110, 132);
    x.setLineDash([5, 5]); x.strokeStyle = "#c9682a"; x.lineWidth = 2; x.strokeRect(tx + 6, ty + 6, 98, 120); x.setLineDash([]);
    x.fillStyle = "#c9682a"; x.font = "500 64px 'Cormorant Garamond', serif"; x.textAlign = "center"; x.fillText("✦", tx + 55, ty + 82);
    x.font = "500 15px 'EB Garamond', serif"; x.fillText("O POEZIE PE ZI", tx + 55, ty + 114);
    const data = document.querySelector(".poezie .meta a[href*='/zi/']")?.textContent || "";
    x.save(); x.translate(tx - 40, ty + 120); x.rotate(-.18);
    x.strokeStyle = "rgba(60,70,120,.55)"; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 62, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(0, 0, 48, 0, Math.PI * 2); x.stroke();
    x.fillStyle = "rgba(60,70,120,.65)"; x.font = "600 15px 'EB Garamond', serif";
    x.fillText("VASILEGROZA.RO", 0, -14); x.font = "italic 500 17px 'EB Garamond', serif"; x.fillText(data || "o poezie pe zi", 0, 12);
    x.restore();
    // titlul
    x.textAlign = "left"; x.fillStyle = "#3a2a1e";
    const titlu = document.querySelector(".poezie h1")?.textContent || document.title;
    x.font = "500 76px 'Cormorant Garamond', serif";
    x.fillText(titlu, M + 20, y, W - 2 * M - 40);
    y += 40;
    x.fillStyle = "#c9a96a"; x.fillRect(M + 20, y, 90, 3); y += 60;
    // versurile: cât încap; dacă nu încap toate, continuarea e pe site
    const versuri = [...document.querySelectorAll(".poezie .versuri .strofa")].map((s) => s.innerText.trim()).join("\n\n");
    const loc = H - y - 230;
    let marime = 40, rand = [], inalt = 0;
    for (; marime >= 27; marime -= 1) {
      x.font = `400 ${marime}px 'EB Garamond', serif`;
      rand = linii(x, versuri, W - 2 * M - 60);
      inalt = rand.length * marime * 1.42;
      if (inalt <= loc) break;
    }
    const incap = Math.floor(loc / (marime * 1.42));
    let taiat = false;
    if (rand.length > incap) { rand = rand.slice(0, incap - 1); taiat = true; }
    x.fillStyle = "#33261b";
    rand.forEach((r, i) => x.fillText(r, M + 30, y + i * marime * 1.42));
    y += rand.length * marime * 1.42;
    if (taiat) { x.font = `italic 400 ${marime}px 'EB Garamond', serif`; x.fillStyle = "#8a705c"; x.fillText("…și mai departe, pe vasilegroza.ro", M + 30, y + 10); }
    // semnătura
    x.fillStyle = "#3a2a1e"; x.textAlign = "right";
    x.font = "600 72px 'Caveat', cursive"; x.fillText("Vasile Groza", W - M - 20, H - 120);
    x.font = "400 22px 'EB Garamond', serif"; x.fillStyle = "#8a705c";
    x.fillText(location.host + location.pathname.replace(/\/$/, ""), W - M - 20, H - 76);
    return new Promise((ok) => c.toBlob(ok, "image/jpeg", .92));
  }

  let fereastra = null;
  buton.addEventListener("click", async () => {
    const vechi = buton.textContent;
    buton.textContent = "Se pregătește ilustrata…";
    const blob = await deseneaza();
    buton.textContent = vechi;
    const nume = `ilustrata-${location.pathname.split("/").filter(Boolean).pop() || "poezie"}.jpg`;
    const fisier = new File([blob], nume, { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    if (fereastra) fereastra.remove();
    fereastra = document.createElement("div");
    fereastra.className = "ilustrata-fereastra";
    fereastra.setAttribute("role", "dialog");
    fereastra.setAttribute("aria-label", "Ilustrata");
    const poateTrimite = navigator.canShare && navigator.canShare({ files: [fisier] });
    fereastra.innerHTML = `<div class="ilustrata-carte"><img src="${url}" alt="Ilustrata cu poezia">
      <p class="ilustrata-unelte">${poateTrimite ? '<button type="button" class="i-trimite">Trimite</button>' : ""}
      <a class="i-descarca" href="${url}" download="${nume}">Păstreaz-o</a>
      <button type="button" class="i-tipar">Tipărește</button><button type="button" class="i-inchide">Închide</button></p></div>`;
    document.body.append(fereastra);
    requestAnimationFrame(() => fereastra.classList.add("deschisa"));
    const inchide = () => { fereastra.remove(); fereastra = null; URL.revokeObjectURL(url); buton.focus(); };
    fereastra.querySelector(".i-inchide").addEventListener("click", inchide);
    fereastra.addEventListener("click", (ev) => { if (ev.target === fereastra) inchide(); });
    fereastra.querySelector(".i-trimite")?.addEventListener("click", async () => {
      try { await navigator.share({ files: [fisier], title: document.title, text: `O poezie de Vasile Groza: ${location.href}` }); } catch (e) { /* închisă */ }
    });
    fereastra.querySelector(".i-tipar").addEventListener("click", () => {
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<title>Ilustrata</title><style>@page{margin:0}body{margin:0}img{width:100%;display:block}</style><img src="${url}" onload="print()">`);
      w.document.close();
    });
    fereastra.querySelector(".i-inchide").focus();
    addEventListener("keydown", function esc(ev) { if (ev.key === "Escape" && fereastra) { inchide(); removeEventListener("keydown", esc); } });
  });
})();
