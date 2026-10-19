/* Service worker: site-ul merge și fără internet.
   - la instalare: prima pagină, stilul, scripturile, fonturile, cerul (date/cer.json) și pagina „fără internet”;
   - paginile (HTML): întâi rețeaua, iar dacă nu e, copia păstrată (fiecare poezie citită rămâne în telefon);
   - imaginile, fonturile, datele: întâi copia, apoi rețeaua (se păstrează pe măsură ce le vezi).
   Versiunea se schimbă la fiecare build, ca să nu rămână un site vechi în cache. */
const VERSIUNE = "vg-202610191258";
// stilul și scripturile au în adresă versiunea build-ului (?v=), exact ca în pagini
const ESENTIAL = ["/", "/stil.css?v=202610191258", "/cer.js?v=202610191258", "/etaje.js?v=202610191258", "/pagina.js?v=202610191258", "/fonturi/fonturi.css?v=202610191258",
  "/fonturi/eb-garamond-normal-latin.woff2", "/fonturi/eb-garamond-normal-latin-ext.woff2",
  "/fonturi/cormorant-garamond-normal-latin.woff2", "/date/cer.json", "/offline.html", "/favicon.svg"];

self.addEventListener("install", (ev) => {
  // cache: "reload" ocolește cache-ul HTTP al browserului, care poate ține o versiune veche până la 30 de zile
  ev.waitUntil(caches.open(VERSIUNE).then((c) => c.addAll(ESENTIAL.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (ev) => {
  ev.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== VERSIUNE).map((x) => caches.delete(x))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (ev) => {
  const r = ev.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  const pagina = r.mode === "navigate" || (r.headers.get("accept") || "").includes("text/html");
  if (pagina) {
    ev.respondWith(fetch(r).then((res) => {
      const copie = res.clone(); caches.open(VERSIUNE).then((c) => c.put(r, copie)); return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match("/offline.html"))));
    return;
  }
  // potrivire exactă, cu tot cu ?v=: un stil nou nu poate fi înlocuit de unul vechi
  ev.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => {
    if (res.ok) { const copie = res.clone(); caches.open(VERSIUNE).then((c) => c.put(r, copie)); }
    return res;
  })));
});
