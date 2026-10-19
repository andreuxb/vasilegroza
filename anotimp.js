/* Anotimpurile și sunetul de intrare, comune tuturor paginilor.
   - La intrare, anotimpul e cel adevărat (după dată; capul paginii îl pune devreme, fără pâlpâire).
     Selectorul de pe pagină (.anotimpuri) îl schimbă cu o trecere în cerc pornită din butonul atins.
     Alegerea ține doar cât ține vizita (sessionStorage): la următoarea venire, iar anotimpul adevărat.
   - Pe paginile cu natură (body.cu-anotimp) cad, rar, petale, frunze sau fulgi; vara zboară licurici.
   - Fiecare secțiune are sunetul ei de intrare (body[data-sunet] → media/sunete/<nume>.mp3). Browserele nu lasă
     sunetul să pornească singur: încercăm la încărcare, iar dacă nu se poate, la prima atingere.
     Butonul de difuzor din selector oprește tot sunetul site-ului (aceeași cheie ca pe cer: „vg-sunet”). */
(() => {
  const root = document.documentElement, body = document.body;
  const linistit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ANOTIMPURI = [
    ["primavara", "Primăvara", '<path d="M12 21V11"/><path d="M12 13c-4 0-6-3-6-7 4 0 6 3 6 7z"/><path d="M12 11c0-4 2-7 6-7 0 4-2 7-6 7z"/>'],
    ["vara", "Vara", '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'],
    ["toamna", "Toamna", '<path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z"/><path d="M5 19l9-9"/>'],
    ["iarna", "Iarna", '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/><path d="M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2M4.2 10.4l3-.6-1-2.9M19.8 13.6l-3 .6 1 2.9M4.2 13.6l3 .6-1 2.9M19.8 10.4l-3-.6 1-2.9"/>'],
  ];
  const CHEIE_SUNET = "vg-sunet";
  const sunetPornit = () => { try { return localStorage.getItem(CHEIE_SUNET) !== "nu"; } catch (e) { return true; } };

  // ---------- selectorul ----------
  function pune(a) {
    root.dataset.anotimp = a;
    try { sessionStorage.setItem("vg-anotimp", a); } catch (e) { /* fără memorie */ }
    document.querySelectorAll(".anotimpuri button[data-a]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.a === a)));
    fulgi();
    document.dispatchEvent(new CustomEvent("anotimp", { detail: a }));
  }
  function schimba(a, buton) {
    if (a === root.dataset.anotimp) return;
    const r = buton.getBoundingClientRect();
    root.style.setProperty("--vx", `${r.left + r.width / 2}px`);
    root.style.setProperty("--vy", `${r.top + r.height / 2}px`);
    if (document.startViewTransition && !linistit) document.startViewTransition(() => pune(a));
    else pune(a);
    clinchet(a);
  }
  document.querySelectorAll(".anotimpuri").forEach((loc) => {
    loc.setAttribute("role", "group");
    loc.setAttribute("aria-label", "Alege anotimpul");
    loc.innerHTML = ANOTIMPURI.map(([a, nume, icon]) =>
      `<button type="button" data-a="${a}" aria-pressed="${a === root.dataset.anotimp}" title="${nume}">` +
      `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${nume}</span></button>`).join("") +
      `<button type="button" class="a-sunet" aria-pressed="${sunetPornit()}" aria-label="${sunetPornit() ? "Oprește sunetul" : "Pornește sunetul"}" title="Sunetul">` +
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="unde" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/><path class="taiat" d="M15.5 9.5l5 5M20.5 9.5l-5 5"/></svg></button>`;
    loc.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.classList.contains("a-sunet")) {
        const p = !sunetPornit();
        try { localStorage.setItem(CHEIE_SUNET, p ? "da" : "nu"); } catch (e) { /* nimic */ }
        document.querySelectorAll(".a-sunet").forEach((x) => { x.setAttribute("aria-pressed", String(p)); x.setAttribute("aria-label", p ? "Oprește sunetul" : "Pornește sunetul"); });
        document.dispatchEvent(new CustomEvent("vg-sunet", { detail: p }));
        if (!p && intrare) intrare.pause();
        return;
      }
      schimba(b.dataset.a, b);
    });
  });

  // un clinchet mic la schimbarea anotimpului, sintetizat (fără fișier): note diferite pentru fiecare anotimp
  let ctx = null;
  function clinchet(a) {
    if (!sunetPornit()) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const note = { primavara: [784, 988, 1175], vara: [659, 880, 1319], toamna: [587, 740, 880], iarna: [1047, 1319, 1568] }[a];
      note.forEach((f, i) => {
        const t = ctx.currentTime + i * 0.09, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.4);
      });
    } catch (e) { /* fără sunet */ }
  }

  // ---------- petale, frunze, fulgi, licurici ----------
  let strat = null;
  function fulgi() {
    if (!body.classList.contains("cu-anotimp") || linistit) return;
    if (!strat) { strat = document.createElement("div"); strat.className = "fulgi"; strat.setAttribute("aria-hidden", "true"); body.append(strat); }
    const a = root.dataset.anotimp, n = { primavara: 14, vara: 12, toamna: 14, iarna: 26 }[a];
    let h = "";
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 100, d = 9 + Math.random() * 10, t = -Math.random() * d, s = 0.6 + Math.random() * 0.8;
      h += `<i style="--x:${x.toFixed(1)}vw;--d:${d.toFixed(1)}s;--t:${t.toFixed(1)}s;--s:${s.toFixed(2)};--r:${(Math.random() * 360) | 0}deg"></i>`;
    }
    strat.innerHTML = h;
  }
  fulgi();

  // ---------- sunetul de intrare ----------
  let intrare = null;
  const numeSunet = body.dataset.sunet;
  if (numeSunet && sunetPornit()) {
    const rad = document.querySelector('link[rel="manifest"]').getAttribute("href").replace("manifest.webmanifest", "");
    intrare = new Audio(`${rad}media/sunete/${numeSunet}.mp3`);
    intrare.volume = 0.4;
    const incearca = () => intrare.play().then(() => true, () => false);
    const laAtingere = () => { removeEventListener("pointerdown", laAtingere, true); removeEventListener("keydown", laAtingere, true); if (sunetPornit()) intrare.play().catch(() => {}); };
    incearca().then((merge) => { if (!merge) { addEventListener("pointerdown", laAtingere, true); addEventListener("keydown", laAtingere, true); } });
  }
})();
