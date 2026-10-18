/* Comportament comun tuturor paginilor: tastele ← → răsfoiesc cartea. */
document.addEventListener("keydown", (ev) => {
  if (ev.target.closest("input, textarea, button, [contenteditable]")) return;
  const rel = ev.key === "ArrowLeft" ? "prev" : ev.key === "ArrowRight" ? "next" : null;
  const link = rel && document.querySelector(`a[rel="${rel}"]`);
  if (link) location.href = link.href;
});

/* „Trimite poezia”: pe telefon deschide fereastra de trimis a sistemului (WhatsApp, mesaj, e-mail);
   unde nu există, copiază linkul. Merge pentru orice buton .trimite, și pentru cele puse mai târziu. */
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("button.trimite");
  if (!b) return;
  const url = b.dataset.url ? new URL(b.dataset.url, location.href).href : location.href.split("#")[0];
  const titlu = b.dataset.titlu || document.title;
  const vechi = b.dataset.text || (b.dataset.text = b.textContent);
  const spune = (t) => { b.textContent = t; setTimeout(() => { b.textContent = vechi; }, 2200); };
  if (navigator.share) {
    try { await navigator.share({ title: titlu, text: `„${titlu}”, de Vasile Groza`, url }); } catch (e) { /* închisă */ }
    return;
  }
  try { await navigator.clipboard.writeText(url); spune("Linkul e copiat"); }
  catch (e) { prompt("Copiază linkul:", url); }
});

/* „Ascultă-l”: un singur buton care pornește și oprește fragmentul din interviu. */
document.querySelectorAll(".asculta-buton").forEach((b) => {
  const a = document.getElementById(b.getAttribute("aria-controls"));
  if (!a) return;
  const semn = b.querySelector(".semn");
  b.addEventListener("click", () => (a.paused ? a.play() : a.pause()));
  a.addEventListener("play", () => { semn.textContent = "❚❚"; b.setAttribute("aria-pressed", "true"); });
  a.addEventListener("pause", () => { semn.textContent = "▶"; b.removeAttribute("aria-pressed"); });
  a.addEventListener("ended", () => { a.currentTime = 0; });
});

/* Site-ul se poate păstra pe telefon și citi fără internet (service worker, doar pe https sau localhost). */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
