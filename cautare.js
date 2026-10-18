/* Căutarea în poezii: un index mic (date/cautare.json), căutat direct în pagină.
   Se caută fără diacritice și fără majuscule: „mama” găsește și „Mamă”.
   Ordinea: titlul care începe cu ce ai scris, apoi titlul care îl conține, apoi primele versuri. */
(() => {
  const intrare = document.getElementById("q");
  if (!intrare) return;
  const lista = document.querySelector(".rezultate"), stare = document.querySelector(".cautare-stare");
  const curat = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[şș]/gi, "s").replace(/[ţț]/gi, "t").toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let index = null, carti = [];

  fetch("../date/cautare.json").then((r) => r.json()).then((d) => {
    carti = d.carti;
    index = d.poezii.map(([slug, titlu, vers, an, k]) => ({ slug, titlu, vers, an, k, t: curat(titlu), v: curat(vers) }));
    const q = new URLSearchParams(location.search).get("q");
    if (q) intrare.value = q;
    cauta();
  });

  function cauta() {
    if (!index) return;
    const q = curat(intrare.value.trim());
    try { history.replaceState(null, "", q ? `?q=${encodeURIComponent(intrare.value.trim())}` : location.pathname); } catch (e) { /* adresa rămâne */ }
    if (q.length < 2) { lista.innerHTML = ""; stare.textContent = `${index.length} de poezii. Scrie cel puțin două litere.`; return; }
    const gasite = [];
    for (const p of index) {
      const scor = p.t.startsWith(q) ? 0 : p.t.includes(q) ? 1 : p.v.includes(q) ? 2 : -1;
      if (scor >= 0) gasite.push([scor, p]);
    }
    gasite.sort((a, b) => a[0] - b[0] || a[1].t.localeCompare(b[1].t));
    const n = gasite.length;
    stare.textContent = n ? `${n === 1 ? "o poezie" : n < 20 ? `${n} poezii` : `${n} de poezii`}${n > 80 ? ", primele 80" : ""}` : "Nicio poezie nu are aceste cuvinte în titlu sau în primele versuri.";
    lista.innerHTML = gasite.slice(0, 80).map(([, p]) =>
      `<li><a href="../poezie/${p.slug}/"><span class="t">${esc(p.titlu)}</span>` +
      `<span class="v">${esc(p.vers)}</span><span class="c">${esc(carti[p.k] || "")}${p.an ? ` · ${p.an}` : ""}</span></a></li>`).join("");
  }
  let ceas = 0;
  intrare.addEventListener("input", () => { clearTimeout(ceas); ceas = setTimeout(cauta, 120); });
  intrare.focus();
})();
