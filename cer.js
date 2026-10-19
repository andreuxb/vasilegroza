/* Cerul poeziilor: fiecare poezie datată e o stea.
   Zilele anului stau pe brațul unei spirale (o „cale lactee” a anului);
   poeziile aceleiași zile, scrise în ani diferiți, se adună într-o constelație.
   La intrare (≈3,5 s, se sare la atingere), cerul se apropie de constelația zilei de azi.
   Stelele zilei sunt butoane etichetate: atingerea schimbă poezia din panou.
   Orice altă stea deschide întâi o fișă jos; plecarea de pe pagină se face doar de acolo.
   „Tot cerul”: stelele pleacă de pe spirală și se adună în 12 constelații, câte una pe carte,
   pe un cer liber cu Calea Lactee; fiecare desenează ceva din cartea ei (arca, pisica, racheta…).
   „Ziua ta”: alegi o zi, iar camera merge pe spirala anului, zi cu zi, până la constelația ei. */
(() => {
  const LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie",
    "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const canvas = document.getElementById("cer");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const sectiune = canvas.closest(".cer");
  const panou = document.getElementById("poezia-zilei");
  const eticheta = document.getElementById("eticheta-stea");
  const linistit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const atingere = matchMedia("(pointer: coarse)").matches;

  // Cronologia intrării, în secunde.
  const T = { zoom0: 0.3, zoom1: 2.6, linie0: 2.1, linie1: 3.0, butoane: 2.3, poezie: 2.8, gata: 3.5 };

  // Zi din an pe un an bisect (29 februarie are și el locul lui).
  const ZILE_LUNA = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const ziDinAn = (mmdd) => {
    const [l, z] = mmdd.split("-").map(Number);
    return ZILE_LUNA.slice(0, l - 1).reduce((a, b) => a + b, 0) + z - 1;
  };
  const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
  const centruZi = (d) => {
    const k = d / 366, th = k * Math.PI * 2 * 1.65 + 0.6, r = 0.1 + 0.86 * k;
    return [r * Math.cos(th), r * Math.sin(th) * 0.64];
  };
  const dataLunga = (iso) => { const [an, l, z] = iso.split("-").map(Number); return `${z} ${LUNI[l - 1]} ${an}`; };
  // Titlul pe cer: întreg dacă încape, altfel primele 2–3 cuvinte și „…”.
  // Titlurile care se repetă în aceeași zi (ghicitorile „Oare cine-i”) primesc anul;
  // dacă se repetă și anul, primesc un număr: „Oare cine-i I”, „Oare cine-i II”.
  const ROMANE = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  function numeDistinct(lista, s, max) {
    const la = lista.filter((q) => q.titlu === s.titlu);
    if (la.length < 2) return scurt(s.titlu, max);
    const an = s.data.slice(0, 4), deAn = la.filter((q) => q.data.slice(0, 4) === an);
    const toateDeAn = deAn.length === la.length;
    const nr = deAn.length > 1 ? ` ${ROMANE[deAn.indexOf(s)] || deAn.indexOf(s) + 1}` : "";
    return `${scurt(s.titlu, max - 4)}${toateDeAn ? "" : ` ’${an.slice(2)}`}${nr}`;
  }
  function scurt(titlu, max = 18) {
    if (titlu.length <= max) return titlu;
    const cuv = titlu.split(/\s+/);
    let s = cuv[0];
    for (let i = 1; i < Math.min(3, cuv.length) && (s + " " + cuv[i]).length <= max; i++) s += " " + cuv[i];
    return s + "…";
  }

  let stele = [], nedatate = [], carti = [], praf = [], azi = [], zile = new Set(), W = 0, H = 0, dpr = 1;
  let cam = { x: 0, y: 0, s: 1 }, start = 0, faza = 0, sub = null, curent = -1, butoane = [];
  // mod: „zi” (constelația zilei, cu poezia) sau „cer” (explorarea tuturor constelațiilor).
  // mCer merge lin de la 0 (spirala anului) la 1 (constelațiile cărților).
  let mod = "zi", mCer = 0, mCerTinta = 0, ultimCadru = 0, linieDe = null, trasDeCurand = 0;

  function redimensioneaza() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (sub) potriveste();
    if (carti.length && carti[0].c) asezaConstelatii();
  }

  // Punctul de pe ecran unde stă centrul camerei: la intrare e mijlocul; la final, pe ecran lat,
  // constelația se mută în stânga, ca poezia să aibă loc în dreapta (pe telefon: sus, deasupra panoului).
  let ox = 0, oy = 0, kAp = 0;
  const lat = () => W > 740;
  function centruEcran() {
    const tx = lat() ? W * 0.3 : W / 2, ty = lat() ? H / 2 : H * 0.27;
    return [W / 2 + (tx - W / 2) * kAp, H / 2 + (ty - H / 2) * kAp];
  }
  function ecran(p) { return [ox + (p[0] - cam.x) * cam.s, oy + (p[1] - cam.y) * cam.s]; }

  // Zoomul final: constelația zilei umple zona ei (pe telefon, fâșia de deasupra panoului),
  // cu loc pentru etichete în lateral.
  // Stelele zilei prea apropiate se împing ușor una pe alta, ca fiecare să aibă ținta ei de 44 px.
  function potriveste() {
    for (let trecere = 0; trecere < 3; trecere++) {
      const xs = azi.map((s) => s.p[0]), ys = azi.map((s) => s.p[1]);
      const bw = Math.max(0.01, Math.max(...xs) - Math.min(...xs)), bh = Math.max(0.01, Math.max(...ys) - Math.min(...ys));
      const zw = lat() ? W * 0.32 : W - 230, zh = lat() ? H * 0.5 : H * 0.26;
      sub.s0 = Math.min(W, H * 1.5) * 0.5;
      sub.s1 = Math.max(sub.s0 * 4, Math.min(zw / bw, zh / bh, Math.min(W, H) * 9));
      sub.tinta = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
      const dmin = 54 / sub.s1;
      for (let it = 0; it < 40; it++) {
        for (let i = 0; i < azi.length; i++) for (let j = i + 1; j < azi.length; j++) {
          const a = azi[i].p, b = azi[j].p, dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6;
          if (d >= dmin) continue;
          const imp = (dmin - d) / 2, ux = d > 1e-5 ? dx / d : 0, uy = d > 1e-5 ? dy / d : 1;
          a[0] -= ux * imp; a[1] -= uy * imp; b[0] += ux * imp; b[1] += uy * imp;
        }
      }
    }
  }

  async function porneste() {
    redimensioneaza();
    addEventListener("resize", redimensioneaza);
    const date = await fetch("date/cer.json").then((r) => r.json());
    carti = date.carti.map(([slug, nume, titlu]) => ({ slug, nume, titlu }));
    const steaNoua = (slug, titlu, data, k) => ({ slug, titlu, data, k, f: hash(slug + "f") * 6, m: 0.6 + hash(slug + "m") * 1.2 });
    stele = date.stele.map(([slug, titlu, data, k]) => {
      const s = steaNoua(slug, titlu, data, k), c = centruZi(ziDinAn(data.slice(5)));
      const a = hash(slug) * Math.PI * 2, r = 0.012 + hash(slug + "r") * 0.03;
      s.p = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; s.p0 = s.p.slice();
      return s;
    });
    nedatate = date.fara_data.map(([slug, titlu, k, inceput]) => Object.assign(steaNoua(slug, titlu, null, k), { inceput }));
    for (let i = 0; i < 900; i++) praf.push({ p: [(hash("x" + i) - 0.5) * 2.6, (hash("y" + i) - 0.5) * 1.8], m: hash("m" + i) * 0.7 });

    zile = new Set(stele.map((s) => s.data.slice(5)));
    const acum = new Date();
    // ?zi=LL-ZZ arată constelația altei zile (așa se și împarte „Ziua ta”).
    const ceruta = new URLSearchParams(location.search).get("zi");
    const ziAzi = `${String(acum.getMonth() + 1).padStart(2, "0")}-${String(acum.getDate()).padStart(2, "0")}`;
    const mmdd = ziCuPoezii(/^\d\d-\d\d$/.test(ceruta || "") ? ceruta : ziAzi);
    alegeZiua(mmdd, await poeziileZilei(mmdd));
    if (ceruta && ceruta !== mmdd) sub.nota = ceruta;

    cam = { x: 0, y: 0, s: sub.s0 };
    creeazaButoane();
    creeazaUnelte();
    start = performance.now();
    if (linistit) sari();
    requestAnimationFrame(deseneaza);
    asculta();
  }

  // O zi fără poezie arată, simplu, ziua următoare care are.
  function ziCuPoezii(mmdd) {
    for (let i = 0; !zile.has(mmdd) && i < 366; i++) {
      const d = new Date(2016, +mmdd.slice(0, 2) - 1, +mmdd.slice(3) + 1);
      mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return mmdd;
  }
  async function poeziileZilei(mmdd) {
    if (!cacheZile.has(mmdd)) cacheZile.set(mmdd, await fetch(`date/zile/${mmdd}.json`).then((r) => r.json()));
    return cacheZile.get(mmdd);
  }
  // Constelația zilei: stelele ei (în ordinea anilor), cu pozițiile de pe spirală refăcute
  // (potriveste() le-a împins ușor una de alta pentru ziua de dinainte).
  function alegeZiua(mmdd, poezii) {
    for (const s of azi) s.p = s.p0.slice();
    azi = stele.filter((s) => s.data.slice(5) === mmdd).sort((a, b) => a.data.localeCompare(b.data));
    sub = { poezii, mmdd };
    potriveste();
  }

  /* Ce poezie apare prima când într-o zi există mai multe (1–9, din ani diferiți)?
     poezii: lista zilei, sortată după an; azi: data reală a vizitei (Date).
     Întoarce indexul poeziei de arătat. */
  function alegePrimaPoezie(poezii, azi) {
    // Rotație după an: toți vizitatorii văd aceeași poezie azi, iar la anul alta.
    // Ghicitorile („Oare cine-i”) nu deschid ziua decât dacă ziua n-are altceva.
    const ghicitoare = (p) => /^(oare-cine-i|cine-i-oare)/.test(p.slug || "");
    const bune = poezii.map((p, i) => i).filter((i) => !ghicitoare(poezii[i]));
    const cand = bune.length ? bune : poezii.map((p, i) => i);
    return cand[azi.getFullYear() % cand.length] || 0;
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const intre = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));

  // Sări peste intrare: camera ajunge direct pe constelație, poezia apare.
  function sari() {
    if (faza >= 2) return;
    start = performance.now() - T.gata * 1000;
  }

  function deseneaza(acum) {
    const t = linistit ? T.gata : (acum - start) / 1000;
    const dt = Math.min(0.1, (acum - (ultimCadru || acum)) / 1000); ultimCadru = acum;
    if (zbor) aplicaZbor(acum);
    else if (mod === "zi") {
      const k = ease(intre(t, T.zoom0, T.zoom1));
      cam.x = sub.tinta[0] * k; cam.y = sub.tinta[1] * k;
      cam.s = sub.s0 * Math.pow(sub.s1 / sub.s0, k);
      kAp = k;
    }
    if (faza === 0 && t >= T.butoane) { faza = 1; sectiune.classList.add("cu-stele"); }
    if (faza === 1 && t >= T.poezie) { faza = 2; arata(alegePrimaPoezie(sub.poezii, new Date())); arataSemn(); }
    // trecerea spirală ⇄ constelații durează ≈1,6 s
    mCer = linistit ? mCerTinta : mCerTinta > mCer ? Math.min(mCerTinta, mCer + dt / 1.6) : Math.max(mCerTinta, mCer - dt / 1.6);
    const mc = ease(mCer);

    [ox, oy] = centruEcran();
    ctx.clearRect(0, 0, W, H);
    const aparitie = linistit ? 1 : Math.min(1, t / 0.8);
    for (const d of praf) {
      const [x, y] = [W / 2 + (d.p[0] - cam.x * 0.3) * sub.s0 * 1.1, H / 2 + (d.p[1] - cam.y * 0.3) * sub.s0 * 1.1];
      ctx.fillStyle = `rgba(214,206,186,${d.m * 0.25 * aparitie})`;
      ctx.fillRect(x, y, 1, 1);
    }
    // Celelalte stele se sting puțin când constelația zilei a ajuns în față; în „Tot cerul” se aprind la loc.
    const k = kAp, stins = 1 - 0.45 * k * (1 - mc);
    // mărimea stelelor în „Tot cerul” crește încet cu apropierea, ca să nu devină discuri
    const rCer = mc > 0 ? Math.min(2.4, Math.max(0.8, Math.pow(cam.s / (carti.sFit || cam.s), 0.35))) : 1;
    if (mc > 0) deseneazaLactee(mc);
    for (const s of mc > 0 ? toateStelele() : stele) {
      const w = pozitie(s, mc);
      const [x, y] = ecran(w);
      if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
      const lic = 0.45 + 0.35 * Math.sin(t * 1.1 + s.f);
      const e = azi.includes(s) ? 1 - mc : 0;
      // În „Tot cerul” stelele obișnuite sunt praf mic; doar cele ale figurii strălucesc.
      const f = s.fig ? mc : 0;
      const r = (0.7 + 1.5 * e) * s.m * ((1 + k * (1.4 - 0.2 * e)) * (1 - mc) + rCer * (0.75 + 1.6 * f) * mc);
      const a = (s.data ? 1 : mc) * aparitie;
      ctx.fillStyle = e > 0.5 || f > 0.5 ? `rgba(255,236,190,${Math.min(1, lic + 0.5) * a})`
        : `rgba(243,234,210,${Math.min(1, lic * stins * (1 - 0.35 * mc) + 0.12 * mc) * a})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    if (mc > 0) deseneazaFiguri(mc);
    const pts = azi.map((s) => ecran(s.p));
    const kl = (linieDe === null ? intre(t, T.linie0, T.linie1) : intre(acum, linieDe, linieDe + 900)) * (1 - mc);
    if (kl > 0 && pts.length > 1) {
      ctx.strokeStyle = `rgba(214,184,120,${0.7 * kl})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(...pts[0]);
      const n = (pts.length - 1) * kl;
      for (let i = 1; i <= Math.ceil(n) && i < pts.length; i++) {
        const f = Math.min(1, n - (i - 1));
        ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f);
      }
      ctx.stroke();
    }
    if (faza >= 1 && mod === "zi" && !zbor) aseazaButoane(pts);
    if (stratNume && mc > 0) aseazaNume();
    requestAnimationFrame(deseneaza);
  }

  // ---------- „Tot cerul”: 12 constelații, câte una pe carte ----------
  const lerp = (a, b, u) => a + (b - a) * u;
  const toateStelele = () => (toateStelele.l ||= stele.concat(nedatate));
  // Poziția de desenat: între spirală (p) și constelația cărții (q). Stelele pleacă decalat,
  // după un hash, ca să curgă, nu să sară toate deodată.
  function pozitie(s, mc) {
    if (!s.q || mc <= 0) return s.p;
    if (!s.p) return s.q;
    const u = ease(Math.min(1, Math.max(0, (mc - s.f / 6 * 0.3) / 0.7)));
    return [lerp(s.p[0], s.q[0], u), lerp(s.p[1], s.q[1], u)];
  }

  // Figurile cărților, ca la constelațiile adevărate (Carul Mare, Lebăda): câteva stele strălucitoare
  // unite cu linii desenează ceva din carte. Coordonate în pătratul [-1, 1], y în jos; fiecare listă e o linie.
  const FIGURI = {
    "pe-aripile-poeziei": [ // o pană de scris
      [[-0.85, 0.95], [-0.4, 0.4], [0.1, -0.25], [0.75, -0.95]],
      [[-0.4, 0.4], [-0.5, -0.15], [-0.05, -0.65], [0.75, -0.95], [0.45, -0.2], [0.1, 0.25], [-0.4, 0.4]]],
    "priveste-ma-in-ochi-2017": [ // abecedarul: o carte deschisă
      [[0, -0.3], [-0.5, -0.55], [-1, -0.3], [-1, 0.5], [-0.5, 0.25], [0, 0.5], [0.5, 0.25], [1, 0.5], [1, -0.3], [0.5, -0.55], [0, -0.3], [0, 0.5]]],
    "priveste-ma-in-ochi-2018": [ // Țoi Vrăbioi: o vrabie
      [[0.95, -0.35], [0.6, -0.55], [0.3, -0.35], [-0.2, -0.2], [-0.95, 0.05], [-0.25, 0.3], [0.35, 0.2], [0.6, -0.1], [0.6, -0.55]],
      [[0.3, -0.35], [-0.1, 0.05]], [[-0.05, 0.27], [-0.1, 0.75]], [[0.2, 0.24], [0.22, 0.72]]],
    "priveste-ma-in-ochi-2019": [ // mingea de cârpă, cu cusătura ei
      Array.from({ length: 11 }, (_, i) => [Math.cos(i / 10 * 2 * Math.PI) * 0.85, Math.sin(i / 10 * 2 * Math.PI) * 0.85]),
      [[-0.6, -0.6], [-0.15, -0.15], [0.15, 0.25], [0.6, 0.6]]],
    "priveste-ma-in-ochi-2020": [ // serialul cosmic: o rachetă
      [[0, -1], [-0.25, -0.5], [-0.25, 0.5], [0.25, 0.5], [0.25, -0.5], [0, -1]],
      [[-0.25, 0.2], [-0.55, 0.75], [-0.25, 0.5]], [[0.25, 0.2], [0.55, 0.75], [0.25, 0.5]],
      [[-0.1, 0.5], [0, 0.95], [0.1, 0.5]]],
    "d-ale-lui-vasalie-si-marie": [ // casa din sat
      [[-0.8, 0.8], [-0.8, -0.1], [0, -0.8], [0.8, -0.1], [0.8, 0.8], [-0.8, 0.8]],
      [[-0.15, 0.8], [-0.15, 0.3], [0.2, 0.3], [0.2, 0.8]], [[0.45, -0.4], [0.45, -0.75], [0.62, -0.75], [0.62, -0.25]]],
    "priveste-ma-in-ochi-2015": [ // anul eclipsei: soarele și luna care trece prin fața lui
      Array.from({ length: 10 }, (_, i) => [-0.3 + Math.cos(i / 9 * 2 * Math.PI) * 0.62, Math.sin(i / 9 * 2 * Math.PI) * 0.62]),
      Array.from({ length: 6 }, (_, i) => [0.3 + Math.cos(-1.9 + i / 5 * 3.8) * 0.62, Math.sin(-1.9 + i / 5 * 3.8) * 0.62])],
    "priveste-ma-in-ochi-2016": [ // pisicuța pianistă: o pisică șezând
      [[-0.55, -0.95], [-0.38, -0.6], [-0.05, -0.6], [0.1, -0.95], [0.15, -0.5], [0, -0.25], [-0.42, -0.25], [-0.6, -0.5], [-0.55, -0.95]],
      [[-0.42, -0.25], [-0.65, 0.4], [-0.5, 0.85], [0.35, 0.85], [0.45, 0.35], [0, -0.25]],
      [[0.35, 0.85], [0.8, 0.75], [0.9, 0.3]]],
    "copile": [ // un zmeu de hârtie, cu coada lui
      [[0, -1], [0.55, -0.25], [0, 0.35], [-0.55, -0.25], [0, -1], [0, 0.35]], [[-0.55, -0.25], [0.55, -0.25]],
      [[0, 0.35], [0.22, 0.6], [-0.1, 0.8], [0.15, 1]]],
    "poezii-de-suflet": [ // o lumânare aprinsă (cartea are doar cinci poezii, deci cinci stele)
      [[0, -0.95], [-0.3, -0.45], [0, -0.2], [0.3, -0.45], [0, -0.95]], [[0, -0.2], [0, 0.9]]],
    "poezii-si-ghicitori": [ // „Oare cine-i?”: un semn de întrebare
      [[-0.45, -0.45], [-0.35, -0.8], [0, -0.95], [0.38, -0.8], [0.45, -0.45], [0.2, -0.15], [0, 0.1], [0, 0.4]], [[0, 0.8]]],
    "poezii-cu-animale": [ // arca lui Noe
      [[-1, -0.05], [-0.7, 0.5], [0.7, 0.5], [1, -0.05], [-1, -0.05]], [[-0.45, -0.05], [-0.45, -0.45], [0, -0.75], [0.45, -0.45], [0.45, -0.05]]],
  };
  const CERC = [Array.from({ length: 8 }, (_, i) => [Math.cos(i / 7 * 2 * Math.PI) * 0.8, Math.sin(i / 7 * 2 * Math.PI) * 0.8])];

  // Un cer liber, nu o grilă: constelațiile pornesc din locuri alese după nume și se împing una pe alta
  // până nu se mai ating (cu loc pentru nume dedesubt), într-un dreptunghi cu forma ecranului.
  // Peste ele trece Calea Lactee, o fâșie de praf pe diagonală.
  function asezaConstelatii() {
    const toate = toateStelele();
    const asp = Math.max(0.45, Math.min(2.2, W / Math.max(1, H - 150)));
    const BX = Math.sqrt(6.8 * asp), BY = 6.8 / BX; // aria cerului rămâne aceeași, forma urmează ecranul
    carti.forEach((c, i) => {
      const membri = toate.filter((s) => s.k === i)
        .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999") || a.slug.localeCompare(b.slug));
      c.n = membri.length; c.membri = membri;
      c.R = 0.09 + 0.0135 * Math.sqrt(c.n);
      c.c = [(hash(c.slug + "x") - 0.5) * BX * 0.8, (hash(c.slug + "y") - 0.5) * BY * 0.8];
    });
    for (let it = 0; it < 400; it++) {
      for (let i = 0; i < carti.length; i++) for (let j = i + 1; j < carti.length; j++) {
        const a = carti[i], b = carti[j], dx = b.c[0] - a.c[0], dy = (b.c[1] - a.c[1]) * 1.15, d = Math.hypot(dx, dy) || 1e-6;
        const min = a.R + b.R + 0.26; // loc și pentru numele scris sub figură
        if (d >= min) continue;
        const imp = (min - d) / 2 * 0.5;
        a.c[0] -= dx / d * imp; a.c[1] -= dy / d * imp; b.c[0] += dx / d * imp; b.c[1] += dy / d * imp;
      }
      for (const c of carti) {
        c.c[0] *= 0.997; c.c[1] *= 0.997;
        c.c[0] = Math.max(-BX / 2 + c.R, Math.min(BX / 2 - c.R, c.c[0]));
        c.c[1] = Math.max(-BY / 2 + c.R, Math.min(BY / 2 - c.R - 0.1, c.c[1]));
      }
    }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    carti.forEach((c) => {
      const fig = FIGURI[c.slug] || CERC, rot = (hash(c.slug + "rot") - 0.5) * 0.5;
      const pune = ([u, v]) => [c.c[0] + (u * Math.cos(rot) - v * Math.sin(rot)) * c.R, c.c[1] + (u * Math.sin(rot) + v * Math.cos(rot)) * c.R];
      // vârfurile figurii (fără dubluri) primesc stele luate la distanțe egale în timp
      const varfuri = [], cheie = new Map();
      const linii = fig.map((l) => l.map((pt) => {
        const k = pt.map((x) => x.toFixed(3)).join();
        if (!cheie.has(k)) { cheie.set(k, varfuri.length); varfuri.push(pune(pt)); }
        return cheie.get(k);
      }));
      const nv = Math.min(varfuri.length, c.n), alese = new Set();
      const steaVarf = varfuri.map((p, k) => {
        if (k >= nv) return null;
        const j = Math.round(k * (c.n - 1) / Math.max(1, nv - 1));
        const s = c.membri[j]; alese.add(s); s.q = p; s.fig = true; return s;
      });
      c.trasee = linii.map((l) => l.map((k) => steaVarf[k]).filter(Boolean)).filter((l) => l.length > 1);
      // celelalte stele curg de-a lungul liniilor figurii, în ordinea datelor, ca un praf în jurul ei;
      // una din cinci se rătăcește mai departe, ca figura să nu pară desenată cu rigla
      const seg = [];
      fig.forEach((l) => { for (let k = 1; k < l.length; k++) { const a = pune(l[k - 1]), b = pune(l[k]); seg.push([a, b, Math.hypot(b[0] - a[0], b[1] - a[1])]); } });
      const total = seg.reduce((t, x) => t + x[2], 0) || 1;
      const rest = c.membri.filter((s) => !alese.has(s));
      rest.forEach((s, j) => {
        let d = (j + 0.5) / rest.length * total, k = 0;
        while (k < seg.length - 1 && d > seg[k][2]) { d -= seg[k][2]; k++; }
        const [a, b, l] = seg[k] || [c.c, c.c, 1], u = Math.min(1, d / (l || 1));
        const departe = hash(s.slug + "d") < 0.2, ab = hash(s.slug + "a") * Math.PI * 2;
        const r = c.R * (departe ? 0.15 + hash(s.slug + "q") * 0.35 : (hash(s.slug + "q") - 0.5) * 0.14);
        s.q = [a[0] + (b[0] - a[0]) * u + Math.cos(ab) * r, a[1] + (b[1] - a[1]) * u + Math.sin(ab) * r];
      });
      x0 = Math.min(x0, c.c[0] - c.R); x1 = Math.max(x1, c.c[0] + c.R);
      y0 = Math.min(y0, c.c[1] - c.R); y1 = Math.max(y1, c.c[1] + c.R + 0.12);
    });
    carti.lim = { x0, x1, y0, y1 };
    // Calea Lactee: praf des pe o fâșie care taie cerul pe diagonală
    const lung = Math.hypot(x1 - x0, y1 - y0), ung = Math.atan2(y1 - y0, x1 - x0) * -0.9 + 0.25;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    carti.lactee = Array.from({ length: 2600 }, (_, i) => {
      const u = (hash("lu" + i) - 0.5) * lung * 1.3;
      const g = (hash("lg1" + i) + hash("lg2" + i) + hash("lg3" + i) - 1.5) * 0.16 * (1 + 0.5 * Math.sin(u * 3.1));
      return [cx + Math.cos(ung) * u - Math.sin(ung) * g, cy + Math.sin(ung) * u + Math.cos(ung) * g, hash("lm" + i)];
    });
    carti.lacteeUng = ung; carti.lacteeC = [cx, cy];
    // tot cerul încape în ecran, cu loc sus pentru butoane
    carti.sFit = Math.min(W / (x1 - x0 + 0.12), (H - 190) / (y1 - y0 + 0.1));   // sus butoanele, jos pașii
  }

  function deseneazaLactee(mc) {
    if (!carti.lactee) return;
    const a = mc * mc;
    // o strălucire moale, apoi praful
    const [cx, cy] = ecran(carti.lacteeC), L = Math.max(W, H) * 1.5, u = carti.lacteeUng;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(u);
    const g = ctx.createLinearGradient(0, -0.3 * cam.s, 0, 0.3 * cam.s);
    g.addColorStop(0, "rgba(150,160,210,0)"); g.addColorStop(0.5, `rgba(170,175,215,${0.12 * a})`); g.addColorStop(1, "rgba(150,160,210,0)");
    ctx.fillStyle = g; ctx.fillRect(-L, -0.3 * cam.s, 2 * L, 0.6 * cam.s);
    ctx.restore();
    for (const [x, y, m] of carti.lactee) {
      const [sx, sy] = ecran([x, y]);
      if (sx < 0 || sy < 0 || sx > W || sy > H) continue;
      ctx.fillStyle = `rgba(222,216,236,${(0.08 + m * 0.3) * a})`;
      ctx.fillRect(sx, sy, m > 0.92 ? 1.6 : 1, m > 0.92 ? 1.6 : 1);
    }
  }

  function deseneazaFiguri(mc) {
    ctx.lineWidth = 1; ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(214,184,120,${0.5 * Math.max(0, mc * 1.6 - 0.6)})`;
    ctx.beginPath();
    for (const c of carti) for (const l of c.trasee || []) {
      l.forEach((s, j) => { const [x, y] = ecran(pozitie(s, mc)); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    }
    ctx.stroke();
  }

  // Numele cărților, scrise pe cer: butoane reale, ca să le poți atinge și citi cu cititorul de ecran.
  let stratNume = null, apropiata = null;
  function creeazaNume() {
    stratNume = document.createElement("div");
    stratNume.className = "constelatii";
    stratNume.setAttribute("role", "group");
    stratNume.setAttribute("aria-label", "Constelațiile cărților");
    carti.forEach((c) => {
      const d = document.createElement("div");
      d.className = "constelatie";
      d.innerHTML = `<button type="button" aria-label="${esc(c.nume)}: ${esc(c.titlu)}">${esc(c.nume)}</button><a href="carte/${c.slug}/">deschide cartea · ${c.n} ${c.n === 1 ? "poezie" : c.n % 100 >= 20 || c.n % 100 === 0 ? "de poezii" : "poezii"}</a>`;
      d.querySelector("button").addEventListener("click", () => zboaraLaCarte(c));
      stratNume.append(d);
      c.el = d;
    });
    sectiune.append(stratNume);
  }
  function aseazaNume() {
    const lat = Math.max(84, Math.min(220, 0.78 * cam.s * 0.92));
    carti.forEach((c) => {
      const [x, y] = ecran([c.c[0], c.c[1] + c.R]);
      const st = Math.min(Math.max(x - lat / 2, 4), W - lat - 4);
      // numele unei constelații ieșite din ecran nu se lipește de margine: dispare
      const afara = x < 8 || x > W - 8 || y < 96 || y > H - 74;   // jos stau pașii „‹ · ›”
      if (c.el.hidden !== afara) c.el.hidden = afara;
      c.el.style.transform = `translate(${st.toFixed(1)}px, ${(y + 4).toFixed(1)}px)`;
      c.el.style.width = `${lat.toFixed(0)}px`;
      c.el.classList.toggle("aproape", c === apropiata && c.R * cam.s > Math.min(W, H) * 0.25);
    });
  }

  // ---------- zborul camerei: de la starea de acum la alta ----------
  // spre: {x, y, s, k}; k e cât de mult stă constelația în zona ei (1) sau în mijlocul ecranului (0).
  // arc: cât se îndepărtează camera la mijlocul drumului; cale(u): un drum al centrului, altul decât dreapta.
  let zbor = null;
  function zboara(spre, dur, opt = {}) {
    zbor = { t0: performance.now(), dur: linistit ? 0 : dur, de: { x: cam.x, y: cam.y, s: cam.s, k: kAp }, spre, ...opt };
  }
  function aplicaZbor(acum) {
    const u = zbor.dur ? Math.min(1, (acum - zbor.t0) / (zbor.dur * 1000)) : 1, e = ease(u), { de, spre } = zbor;
    if (zbor.cale) [cam.x, cam.y] = zbor.cale(e);
    else { cam.x = lerp(de.x, spre.x, e); cam.y = lerp(de.y, spre.y, e); }
    cam.s = Math.exp(lerp(Math.log(de.s), Math.log(spre.s), e) - (zbor.arc || 0) * Math.sin(Math.PI * e));
    kAp = lerp(de.k, spre.k, e);
    if (zbor.pas) zbor.pas(e);
    if (u >= 1) { const gata = zbor.gata; zbor = null; if (gata) gata(); }
  }
  function sariZbor() { if (zbor) zbor.t0 = -1e9; }

  function intraInCer() {
    if (mod === "cer") return;
    sari(); if (faza < 2) { faza = 2; sectiune.classList.add("cu-stele"); arata(alegePrimaPoezie(sub.poezii, new Date())); }
    if (!carti[0].c) asezaConstelatii();
    if (!stratNume) creeazaNume();
    mod = "cer"; mCerTinta = 1; apropiata = null;
    sectiune.classList.add("explorare");
    ascundeSemn();
    actualizeazaUnelte();
    const { x0, x1, y0, y1 } = carti.lim;
    // centrul ecranului e puțin mai jos decât mijlocul: sus butoanele sunt mai înalte decât pașii de jos
    zboara({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 - 14 / carti.sFit, s: carti.sFit, k: 0 }, 1.8, { arc: 0.35 });
    if (!pasi) creeazaPasi();
    actualizeazaPasi();
    arataIndiciu();
  }
  function iesiDinCer() {
    if (mod !== "cer") return;
    mod = "zi"; mCerTinta = 0; apropiata = null;
    sectiune.classList.remove("explorare");
    actualizeazaUnelte();
    zboara({ x: sub.tinta[0], y: sub.tinta[1], s: sub.s1, k: 1 }, 1.6, { arc: 0.3, gata: () => { linieDe = performance.now(); } });
  }
  // De la o constelație la alta: zborul se îndepărtează puțin, cât e de lung drumul, apoi coboară pe figură.
  function zboaraLaCarte(c, dur) {
    const s = Math.min(W, H * 0.8) * 0.36 / c.R;
    const drum = Math.hypot(c.c[0] - cam.x, c.c[1] - cam.y) * Math.min(cam.s, s) / Math.min(W, H);
    apropiata = c;
    zboara({ x: c.c[0], y: c.c[1] + c.R * 0.25, s, k: 0 }, dur || Math.min(2, 1.1 + drum * 0.25), { arc: Math.min(1.1, 0.15 + drum * 0.18) });
    actualizeazaPasi();
  }

  // ---------- pașii: ziua de dinainte / de după; constelația vecină ----------
  const doua = (n) => String(n).padStart(2, "0");
  // Ziua vecină care are poezii, înainte (dir = 1) sau înapoi (dir = -1); anul se închide în cerc.
  function ziVecina(mmdd, dir) {
    let d = ziDinAn(mmdd);
    for (let i = 0; i < 366; i++) {
      d = (d + dir + 366) % 366;
      const [l, z] = mmddDinZi(d), k = `${doua(l)}-${doua(z)}`;
      if (zile.has(k)) return k;
    }
    return mmdd;
  }
  const ziScurta = (mmdd) => `${+mmdd.slice(3)} ${LUNI[+mmdd.slice(0, 2) - 1]}`;
  // Pe cer, constelațiile se parcurg de la stânga la dreapta, ca un rând de citit.
  const ordineCer = () => carti.slice().sort((a, b) => a.c[0] - b.c[0]);
  function constelatiaVecina(dir) {
    const o = ordineCer(), i = o.indexOf(apropiata);
    if (i < 0) return dir > 0 ? o[0] : o[o.length - 1];
    return o[(i + dir + o.length) % o.length];
  }
  function pas(dir) {
    if (zbor && zbor.cale) return;
    if (mod === "cer") { zboaraLaCarte(constelatiaVecina(dir)); return; }
    if (faza < 2) return;
    if (!lat() && scrollY > H * 0.3) sectiune.scrollIntoView({ behavior: "smooth", block: "start" });
    schimbaZiua(ziVecina(sub.mmdd, dir), true);
  }
  // În „Tot cerul”, jos: „‹ Arca lui Noe · Copile ›”. Pentru zile, pașii stau în capul poeziei (arata()).
  let pasi = null;
  function creeazaPasi() {
    pasi = document.createElement("nav");
    pasi.className = "cer-pasi";
    pasi.setAttribute("aria-label", "Constelația vecină");
    pasi.innerHTML = `<button type="button" data-dir="-1"><span aria-hidden="true">‹</span> <span class="p-nume"></span></button>`
      + `<button type="button" data-dir="1"><span class="p-nume"></span> <span aria-hidden="true">›</span></button>`;
    pasi.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => pas(+b.dataset.dir)));
    sectiune.append(pasi);
  }
  function actualizeazaPasi() {
    if (!pasi || mod !== "cer") return;
    pasi.querySelectorAll("button").forEach((b) => {
      const c = constelatiaVecina(+b.dataset.dir);
      b.querySelector(".p-nume").textContent = scurt(c.nume, 20);
      b.setAttribute("aria-label", `${+b.dataset.dir > 0 ? "Constelația următoare" : "Constelația de dinainte"}: ${c.nume}`);
    });
  }
  // Din poezia zilei, drept la constelația cărții ei, fără să mai treci prin tot cerul.
  function zboaraLaCarteaPoeziei(titluCarte) {
    const c = carti.find((q) => q.titlu === titluCarte);
    if (!c) return;
    intraInCer();
    zboaraLaCarte(c, 2.2);
  }

  // ---------- „Ziua ta”: camera merge pe spirala anului până la ziua aleasă ----------
  // scurt: un pas de o zi (săgețile), cu un zbor mic, fără să se îndepărteze mult de cer.
  async function schimbaZiua(ceruta, scurt_ = false) {
    const mmdd = ziCuPoezii(ceruta);
    let poezii;
    try { poezii = await poeziileZilei(mmdd); } catch (e) { return; }
    sari(); faza = 2;
    const d0 = ziDinAn(sub.mmdd), d1 = ziDinAn(mmdd);
    const c0 = centruZi(d0), dx0 = cam.x - c0[0], dy0 = cam.y - c0[1];
    alegeZiua(mmdd, poezii);
    sub.nota = ceruta !== mmdd ? ceruta : null;
    const c1 = centruZi(d1), dx1 = sub.tinta[0] - c1[0], dy1 = sub.tinta[1] - c1[1];
    if (mod === "cer") { mod = "zi"; mCerTinta = 0; sectiune.classList.remove("explorare"); }
    sectiune.classList.remove("cu-stele");
    panou.classList.add("plecat");
    document.querySelector(".stele-zi")?.remove();
    latimi.length = 0;
    creeazaButoane();
    actualizeazaUnelte();
    try { history.replaceState(null, "", `?zi=${mmdd}`); } catch (e) { /* adresa rămâne */ }
    // Drumul: centrul camerei alunecă pe spirală, zi cu zi; data care trece se vede pe ecran.
    const dd = Math.abs(d1 - d0);
    const dur = scurt_ && dd < 30 ? 0.75 + dd * 0.08 : Math.min(3.4, 1.3 + dd / 120);
    const ziua = arataZiuaCareTrece();
    zboara({ x: sub.tinta[0], y: sub.tinta[1], s: sub.s1, k: 1 }, dur, {
      arc: scurt_ && dd < 30 ? 0.12 + dd * 0.04 : Math.min(1.6, 0.5 + dd / 140),
      cale: (e) => { const c = centruZi(lerp(d0, d1, e)); return [c[0] + lerp(dx0, dx1, e), c[1] + lerp(dy0, dy1, e)]; },
      pas: (e) => ziua(Math.round(lerp(d0, d1, e))),
      gata: () => {
        ziua(null);
        linieDe = performance.now();
        sunaAccent();   // constelația noii zile se leagă: câteva note
        sectiune.classList.add("cu-stele");
        panou.classList.remove("plecat");
        arata(alegePrimaPoezie(sub.poezii, new Date()));
      },
    });
  }
  const mmddDinZi = (d) => { const x = new Date(2016, 0, 1 + d); return [x.getMonth() + 1, x.getDate()]; };
  function arataZiuaCareTrece() {
    let el = sectiune.querySelector(".cer-data");
    if (!el) { el = document.createElement("p"); el.className = "cer-data"; el.setAttribute("aria-hidden", "true"); sectiune.append(el); }
    let ultima = -1;
    return (d) => {
      if (d === null) { el.classList.remove("vazut"); return; }
      if (d === ultima) return;
      ultima = d;
      const [l, z] = mmddDinZi(d);
      el.textContent = `${z} ${LUNI[l - 1]}`;
      el.classList.add("vazut");
    };
  }

  // ---------- butoanele de sus: „Tot cerul” și „Ziua ta” ----------
  let unelte = null;
  function creeazaUnelte() {
    unelte = document.createElement("nav");
    unelte.className = "cer-unelte";
    unelte.setAttribute("aria-label", "Cerul");
    unelte.innerHTML = `<button type="button" class="u-cer"></button><button type="button" class="u-zi">Ziua ta</button>`;
    unelte.querySelector(".u-cer").addEventListener("click", () => (mod === "cer" ? iesiDinCer() : intraInCer()));
    unelte.querySelector(".u-zi").addEventListener("click", deschideZiuaTa);
    // sunetul: un difuzor mic, cu unde când cântă și tăiat când tace
    const bs = document.createElement("button");
    bs.type = "button"; bs.className = "u-sunet";
    bs.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" fill-opacity=".25"/>'
      + '<path class="unde" d="M15.5 9.2a4 4 0 0 1 0 5.6M18 7a7 7 0 0 1 0 10"/><path class="taiat" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
    bs.addEventListener("click", comutaSunet);
    unelte.append(bs);
    sectiune.append(unelte);
    actualizeazaUnelte();
    actualizeazaSunet();
  }
  function actualizeazaUnelte() {
    const b = unelte.querySelector(".u-cer");
    b.textContent = mod === "cer" ? "← Înapoi la zi" : "Tot cerul";
    b.setAttribute("aria-label", mod === "cer" ? "Înapoi la constelația zilei" : "Tot cerul: constelațiile celor 12 cărți");
  }

  let indiciu = null;
  function arataIndiciu() {
    try { if (sessionStorage.getItem("cer-indiciu")) return; sessionStorage.setItem("cer-indiciu", "1"); } catch (e) { /* arată oricum */ }
    indiciu = document.createElement("p");
    indiciu.className = "semn-atinge indiciu-cer";
    indiciu.textContent = atingere ? "trage · apropie cu două degete" : "trage · apropie cu rotița";
    sectiune.append(indiciu);
    setTimeout(() => { indiciu.classList.add("dus"); setTimeout(() => indiciu.remove(), 800); }, 5500);
  }

  // Fereastra „Ziua ta”: ziua și luna (anul nu contează: cerul e același în fiecare an).
  let ziuaTa = null;
  function deschideZiuaTa() {
    if (!ziuaTa) {
      ziuaTa = document.createElement("div");
      ziuaTa.className = "fisa-fundal"; ziuaTa.hidden = true;
      ziuaTa.innerHTML = `<form class="fisa ziua-ta" role="dialog" aria-modal="true" aria-labelledby="zt-titlu">
        <button type="button" class="fisa-inchide" aria-label="Închide">×</button>
        <p class="eticheta">Ziua ta</p>
        <h3 id="zt-titlu">Ce a scris Vasile Groza în ziua ta?</h3>
        <p class="fisa-versuri">O zi de naștere, o nuntă, o zi care contează. Cerul se întoarce până la ea.</p>
        <div class="zt-campuri"><label>ziua<select name="zi"></select></label><label>luna<select name="luna">${
          LUNI.map((l, i) => `<option value="${i + 1}">${l}</option>`).join("")}</select></label></div>
        <p class="fisa-actiuni"><button type="submit" class="fisa-citeste">Du-mă acolo</button></p></form>`;
      document.body.append(ziuaTa);
      const f = ziuaTa.querySelector("form"), selZi = f.elements.zi, selLuna = f.elements.luna;
      const umple = () => {
        const n = ZILE_LUNA[selLuna.value - 1], v = Math.min(+selZi.value || 1, n);
        selZi.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
        selZi.value = v;
      };
      selLuna.addEventListener("change", umple);
      const inchide = () => { ziuaTa.classList.remove("deschis"); setTimeout(() => { ziuaTa.hidden = true; }, 250); unelte.querySelector(".u-zi").focus({ preventScroll: true }); };
      ziuaTa.addEventListener("click", (ev) => { if (ev.target === ziuaTa) inchide(); });
      f.querySelector(".fisa-inchide").addEventListener("click", inchide);
      addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !ziuaTa.hidden) inchide(); });
      f.addEventListener("submit", (ev) => {
        ev.preventDefault();
        inchide();
        schimbaZiua(`${String(selLuna.value).padStart(2, "0")}-${String(selZi.value).padStart(2, "0")}`);
      });
      ziuaTa.umple = umple;
    }
    const f = ziuaTa.querySelector("form");
    const zi = sub.nota || sub.mmdd;
    f.elements.luna.value = +zi.slice(0, 2); f.elements.zi.value = +zi.slice(3); ziuaTa.umple();
    f.elements.zi.value = +zi.slice(3);
    ziuaTa.hidden = false;
    requestAnimationFrame(() => ziuaTa.classList.add("deschis"));
    f.elements.zi.focus({ preventScroll: true });
  }

  // ---------- stelele zilei: butoane reale peste canvas ----------
  function creeazaButoane() {
    const strat = document.createElement("div");
    strat.className = "stele-zi";
    strat.setAttribute("role", "group");
    strat.setAttribute("aria-label", "Poeziile zilei de azi");
    butoane = azi.map((s) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "stea-zi";
      const nume = numeDistinct(azi, s, 18);
      b.innerHTML = `<span class="punct" aria-hidden="true"></span><span class="nume">${esc(nume)}</span>`;
      b.setAttribute("aria-label", `${s.titlu}, ${dataLunga(s.data)}`);
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const i = sub.poezii.findIndex((p) => p.slug === s.slug);
        if (i >= 0) arata(i);
        clopotel(s.slug);
        ascundeSemn();
      });
      strat.append(b);
      return b;
    });
    sectiune.append(strat);
  }

  // Butonul are 44×44 px, centrat pe stea; eticheta se așază în jurul lui, acolo unde se ciocnește
  // cel mai puțin cu etichetele deja puse, cu celelalte stele și cu marginea ecranului.
  // Preferă lateralul, în afară, departe de centrul constelației.
  const latimi = [];
  if (document.fonts) document.fonts.ready.then(() => { latimi.length = 0; });
  function aseazaButoane(pts) {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const ordine = pts.map((p, i) => i).sort((a, b) => pts[a][1] - pts[b][1]);
    // stelele ocupă și ele loc (cea curentă are inelul în jur)
    const puse = pts.map(([x, y], i) => { const r = butoane[i].hasAttribute("aria-current") ? 17 : 11; return [x - r, y - r, x + r, y + r]; });
    const suprap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    const jos = lat() ? H - 4 : H * 0.5 - 6; // pe telefon, sub fâșia cerului începe poezia
    for (const i of ordine) {
      const [x, y] = pts[i], b = butoane[i];
      const l = latimi[i] || (latimi[i] = b.querySelector(".nume").offsetWidth);
      // lateral (drept, sau urcat/coborât cu 22 px), apoi dedesubt și deasupra
      const variante = [];
      for (const dy of [0, -22, 22]) {
        variante.push(["d", dy, [x + 20, y - 13 + dy, x + 20 + l, y + 13 + dy]]);
        variante.push(["s", dy, [x - 20 - l, y - 13 + dy, x - 20, y + 13 + dy]]);
      }
      variante.push(["jos", 0, [x - l / 2, y + 15, x + l / 2, y + 41]], ["sus", 0, [x - l / 2, y - 41, x + l / 2, y - 15]]);
      let ales = variante[0], min = Infinity, atins = 0;
      for (const v of variante) {
        const [k, dy, r] = v;
        const lovit = puse.reduce((a, q) => a + suprap(r, q), 0);
        const afara = r[0] < 4 || r[2] > W - 4 || r[1] < 104 || r[3] > jos ? 1e5 : 0;
        const pref = (k === "d" ? (x < cx ? 0 : 1) : k === "s" ? (x < cx ? 1 : 0) : 3) + Math.abs(dy) / 11;
        const c = lovit * 10 + afara + pref;
        if (c < min) { min = c; ales = v; atins = lovit; }
      }
      const [parte, dy, r] = ales;
      puse.push(r);
      if (b.dataset.parte !== parte) b.dataset.parte = parte;
      b.style.setProperty("--dy", `${dy}px`);
      // Dacă nu există niciun loc liber, eticheta se arată doar la atingere / când steaua e cea citită.
      b.classList.toggle("fara-loc", atins > 40);
      b.style.transform = `translate(${(x - 22).toFixed(1)}px, ${(y - 22).toFixed(1)}px)`;
    }
  }

  // Semnul „atinge o stea”, o singură dată pe vizită.
  let semn = null;
  function arataSemn() {
    try { if (sessionStorage.getItem("cer-semn")) return; sessionStorage.setItem("cer-semn", "1"); } catch (e) { /* fără stocare: arată oricum */ }
    if (azi.length < 2) return;
    semn = document.createElement("p");
    semn.className = "semn-atinge";
    semn.textContent = atingere ? "atinge o stea" : "alege o stea";
    sectiune.append(semn);
    setTimeout(ascundeSemn, 6000);
  }
  function ascundeSemn() { if (semn) { semn.classList.add("dus"); setTimeout(() => semn && semn.remove(), 800); } }

  // ---------- panoul cu poezia ----------
  function arata(i) {
    curent = i;
    const p = sub.poezii[i];
    const [an, l, z] = p.data.split("-").map(Number);
    const strofe = p.versuri.trim().split(/\n\s*\n/);
    let n = 0;
    const vers = strofe.map((st) => `<p class="strofa">${st.split("\n").map((v) =>
      `<span class="vers" style="animation-delay:${(n++ * 0.12).toFixed(2)}s">${esc(v)}</span>`).join("")}</p>`).join("");
    const alte = sub.poezii.length > 1 ? `<p class="alte">Alte poezii din această zi: ${sub.poezii.map((q, j) =>
      `<button type="button" data-i="${j}" ${j === i ? 'aria-current="true"' : ""}>${esc(numeDistinct(sub.poezii, q, 24))} <span>${q.data.slice(0, 4)}</span></button>`).join("")}</p>` : "";
    const nota = sub.nota ? `<p class="nota-zi">Pe ${+sub.nota.slice(3)} ${LUNI[+sub.nota.slice(0, 2) - 1]} nu a scris nicio poezie. Iată ziua următoare.</p>` : "";
    const ieri = ziVecina(sub.mmdd, -1), maine = ziVecina(sub.mmdd, 1);
    panou.innerHTML = `${nota}<p class="eticheta zi-pasi"><button type="button" class="zi-pas" data-dir="-1" aria-label="Ziua de dinainte: ${ziScurta(ieri)}" title="${ziScurta(ieri)}">‹</button>
      <span>${z} ${LUNI[l - 1]}<span class="pe-zi"> · o poezie pe zi</span></span><button type="button" class="zi-pas" data-dir="1" aria-label="Ziua de după: ${ziScurta(maine)}" title="${ziScurta(maine)}">›</button></p>
      <h2>${esc(p.titlu)}</h2><div class="versuri">${vers}</div>
      <p class="meta">scrisă pe ${z} ${LUNI[l - 1]} ${an} · <button type="button" class="la-constelatie" title="Vezi constelația cărții">${esc(p.carte)}</button> · <a href="poezie/${p.slug}/">pagina poeziei</a> · <button type="button" class="trimite" data-titlu="${esc(p.titlu)}" data-url="poezie/${p.slug}/">trimite</button></p>${alte}`;
    panou.querySelectorAll(".zi-pas").forEach((b) => b.addEventListener("click", () => pas(+b.dataset.dir)));
    panou.querySelector(".la-constelatie").addEventListener("click", () => {
      if (!lat()) sectiune.scrollIntoView({ behavior: "smooth", block: "start" });
      zboaraLaCarteaPoeziei(p.carte);
    });
    panou.hidden = false;
    panou.scrollTop = 0;
    panou.classList.remove("schimba"); void panou.offsetWidth; panou.classList.add("schimba");
    sectiune.classList.add("cu-poezie");
    panou.querySelectorAll("button[data-i]").forEach((b) => b.addEventListener("click", () => {
      const j = +b.dataset.i;
      arata(j); clopotel(sub.poezii[j].slug);
      if (!lat()) panou.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    azi.forEach((s, j) => butoane[j].toggleAttribute("aria-current", s.slug === p.slug));
  }

  function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // ---------- fișa de jos, pentru orice altă stea ----------
  const cacheZile = new Map();
  async function versuriPentru(s) {
    const zi = s.data.slice(5);
    if (!cacheZile.has(zi)) cacheZile.set(zi, await fetch(`date/zile/${zi}.json`).then((r) => r.json()));
    return cacheZile.get(zi).find((p) => p.slug === s.slug);
  }

  let fisa = null, deUnde = null;
  function creeazaFisa() {
    fisa = document.createElement("div");
    fisa.className = "fisa-fundal"; fisa.hidden = true;
    fisa.innerHTML = `<div class="fisa" role="dialog" aria-modal="true" aria-labelledby="fisa-titlu">
      <button type="button" class="fisa-inchide" aria-label="Închide">×</button>
      <p class="eticheta fisa-data"></p><h3 id="fisa-titlu"></h3><p class="fisa-versuri"></p>
      <p class="fisa-actiuni"><a class="fisa-citeste" href="#">Citește poezia</a></p></div>`;
    document.body.append(fisa);
    fisa.addEventListener("click", (ev) => { if (ev.target === fisa) inchideFisa(); });
    fisa.querySelector(".fisa-inchide").addEventListener("click", inchideFisa);
    addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !fisa.hidden) inchideFisa(); });
  }
  async function deschideFisa(s) {
    if (!fisa) creeazaFisa();
    deUnde = document.activeElement;
    fisa.querySelector(".fisa-data").textContent = s.data ? dataLunga(s.data) : `fără dată · ${carti[s.k].titlu}`;
    fisa.querySelector("#fisa-titlu").textContent = s.titlu;
    fisa.querySelector(".fisa-versuri").textContent = "";
    fisa.querySelector(".fisa-citeste").href = `poezie/${s.slug}/`;
    fisa.hidden = false;
    requestAnimationFrame(() => fisa.classList.add("deschis"));
    fisa.querySelector(".fisa-citeste").focus({ preventScroll: true });
    if (!s.data) {
      fisa.querySelector(".fisa-versuri").innerHTML = s.inceput.split("\n").map(esc).join("<br>") + " …";
      return;
    }
    try {
      const p = await versuriPentru(s);
      if (!p) return;
      const v = p.versuri.trim().split("\n").filter((r) => r.trim()).slice(0, 3);
      fisa.querySelector(".fisa-versuri").innerHTML = v.map(esc).join("<br>") + " …";
      fisa.querySelector(".fisa-data").textContent = `${dataLunga(s.data)} · ${p.carte}`;
    } catch (e) { /* fișa rămâne cu titlul și data */ }
  }
  function inchideFisa() {
    fisa.classList.remove("deschis");
    setTimeout(() => { fisa.hidden = true; }, 250);
    if (deUnde && deUnde.focus) deUnde.focus({ preventScroll: true });
  }

  // ---------- clopoțelul: o notă pentatonică pentru fiecare stea ----------
  let audio = null;
  const PENTA = [0, 2, 4, 7, 9];
  function clopotel(slug) {
    if (!sunetPornit) return;   // butonul de sunet oprește și clopoțeii
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (!audio.intrare) {
        const iesire = audio.createGain(); iesire.gain.value = 0.22;
        // un ecou scurt, înmuiat, ca să sune a spațiu
        const ecou = audio.createDelay(); ecou.delayTime.value = 0.31;
        const intoarcere = audio.createGain(); intoarcere.gain.value = 0.38;
        const moale = audio.createBiquadFilter(); moale.type = "lowpass"; moale.frequency.value = 2600;
        ecou.connect(moale); moale.connect(intoarcere); intoarcere.connect(ecou); moale.connect(iesire);
        iesire.connect(audio.destination);
        audio.intrare = audio.createGain(); audio.intrare.connect(iesire); audio.intrare.connect(ecou);
      }
      if (audio.state === "suspended") audio.resume();
      const h = hash(slug + "clopot"), pas = Math.floor(h * 10);
      const semiton = PENTA[pas % 5] + 12 * Math.floor(pas / 5);
      const f0 = 392 * Math.pow(2, semiton / 12);               // între sol₄ și mi₆
      const interval = [7, 12, 4, 9][Math.floor(hash(slug + "i") * 4)]; // a doua notă, consonantă
      lovitura(f0, audio.currentTime, 1);
      lovitura(f0 * Math.pow(2, interval / 12), audio.currentTime + 0.14, 0.55);
    } catch (e) { /* fără sunet, fără supărare */ }
  }
  // Un clopoțel: parțiale armonice, cele înalte se sting mai repede.
  function lovitura(f, t0, vol) {
    [[1, 1, 4.2], [2, 0.42, 2.6], [3, 0.2, 1.6], [4.01, 0.1, 0.9]].forEach(([m, a, d]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine"; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(a * vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g); g.connect(audio.intrare);
      o.start(t0); o.stop(t0 + d + 0.05);
    });
  }

  // ---------- sunetul paginii, în două straturi ----------
  // 1. ambianța: o noapte de vară vie (greieri, foșnet de frunze), în buclă, foarte încet;
  // 2. accentul: câteva note de harpă / clopoței când se leagă constelația zilei.
  // Browserele nu lasă sunetul să pornească la încărcare: îl pornește prima atingere pe cer.
  // Butonul cu difuzor le oprește pe amândouă; alegerea se ține minte în telefon (implicit: pornit).
  const FOND = "media/cer-noapte.mp3", ACCENT = "media/cer-accent.mp3";
  const VOL_FOND = 0.14, VOL_ACCENT = 0.3, CHEIE_SUNET = "vg-sunet";
  let sunetPornit = true, iesireSunet = null, bucla = null, accent = null, ultimulAccent = -1e9;
  const tampoane = {};
  try { sunetPornit = localStorage.getItem(CHEIE_SUNET) !== "nu"; } catch (e) { /* fără memorie, rămâne pornit */ }
  function deschideSunet() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    if (!iesireSunet) { iesireSunet = audio.createGain(); iesireSunet.connect(audio.destination); }
  }
  const tampon = (url) => tampoane[url] || (tampoane[url] = fetch(url).then((r) => r.arrayBuffer())
    .then((a) => new Promise((ok, nu) => audio.decodeAudioData(a, ok, nu)))
    .catch((e) => { delete tampoane[url]; throw e; }));
  // un strat: sursa, cu propriul volum, care crește din 0 în `urcare` secunde
  function sursa(buf, vol, urcare, inBucla) {
    const s = audio.createBufferSource(), g = audio.createGain(), t = audio.currentTime;
    s.buffer = buf; s.loop = inBucla;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + urcare);
    s.connect(g); g.connect(iesireSunet); s.start();
    return { s, g };
  }
  function stinge(x) {
    if (!x) return;
    const t = audio.currentTime;
    x.g.gain.cancelScheduledValues(t); x.g.gain.setValueAtTime(x.g.gain.value, t);
    x.g.gain.linearRampToValueAtTime(0, t + 0.6);
    try { x.s.stop(t + 0.7); } catch (e) { /* s-a terminat deja */ }
  }
  async function pornesteFond() {
    try {
      deschideSunet();
      const buf = await tampon(FOND);
      if (!sunetPornit || bucla) return;   // între timp s-a oprit, sau cântă deja
      bucla = sursa(buf, VOL_FOND, 2.5, true);   // ambianța urcă încet
    } catch (e) { /* fără sunet, fără supărare */ }
  }
  async function sunaAccent() {
    if (!sunetPornit || !iesireSunet) return;   // înainte de prima atingere, tăcere
    const acum = performance.now();
    if (acum - ultimulAccent < 4000) return;    // pașii repezi între zile nu fac cor
    ultimulAccent = acum;
    try {
      const buf = await tampon(ACCENT);
      if (!sunetPornit) return;
      stinge(accent);
      accent = sursa(buf, VOL_ACCENT, 0.05, false);
    } catch (e) { /* nimic */ }
  }
  function opresteFond() {
    stinge(bucla); stinge(accent);
    bucla = accent = null;
  }
  function comutaSunet() {
    sunetPornit = !sunetPornit;
    try { localStorage.setItem(CHEIE_SUNET, sunetPornit ? "da" : "nu"); } catch (e) { /* nimic */ }
    if (sunetPornit) pornesteFond(); else opresteFond();
    actualizeazaSunet();
    document.querySelectorAll(".a-sunet").forEach((x) => { x.setAttribute("aria-pressed", String(sunetPornit)); x.setAttribute("aria-label", sunetPornit ? "Oprește sunetul" : "Pornește sunetul"); });
  }
  function actualizeazaSunet() {
    const b = unelte && unelte.querySelector(".u-sunet");
    if (!b) return;
    b.setAttribute("aria-pressed", String(sunetPornit));
    b.setAttribute("aria-label", sunetPornit ? "Oprește sunetul" : "Pornește sunetul");
    b.title = b.getAttribute("aria-label");
    b.classList.toggle("oprit", !sunetPornit);
  }
  // selectorul de anotimpuri are și el un difuzor: cele două butoane spun același lucru
  document.addEventListener("vg-sunet", (ev) => {
    sunetPornit = ev.detail;
    if (sunetPornit) pornesteFond(); else opresteFond();
    actualizeazaSunet();
  });
  function ascultaSunet() {
    // prima atingere oriunde pe cer pornește bucla (dacă nu a fost oprită de vizitator)
    const prima = (ev) => {
      if (ev.target.closest(".u-sunet")) return;   // butonul se ocupă singur
      sectiune.removeEventListener("pointerdown", prima, true);
      if (sunetPornit) { pornesteFond(); sunaAccent(); }
    };
    sectiune.addEventListener("pointerdown", prima, true);
    // cât timp pagina nu se vede (alt tab, telefonul blocat), sunetul tace
    document.addEventListener("visibilitychange", () => {
      if (!audio || !bucla) return;
      if (document.hidden) audio.suspend(); else audio.resume();
    });
  }

  // ---------- atingere și mouse pe cer ----------
  function steaLa(mx, my) {
    const raza = atingere ? 22 : 12, mc = ease(mCer);
    let best = null, bd = raza * raza;
    for (const s of mod === "cer" ? toateStelele() : stele) {
      const [x, y] = ecran(pozitie(s, mc)), d = (x - mx) ** 2 + (y - my) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // ---------- gesturile din „Tot cerul”: tragi, apropii cu două degete (sau rotița), atingi ----------
  const lume = (x, y) => [cam.x + (x - ox) / cam.s, cam.y + (y - oy) / cam.s];
  function limiteaza() {
    const { x0, x1, y0, y1 } = carti.lim;
    cam.s = Math.min(Math.max(cam.s, carti.sFit * 0.8), Math.min(W, H) * 9);
    cam.x = Math.min(Math.max(cam.x, x0), x1); cam.y = Math.min(Math.max(cam.y, y0), y1);
  }
  function apropie(x, y, f) {
    const w = lume(x, y);
    cam.s *= f; limiteaza();
    cam.x = w[0] - (x - ox) / cam.s; cam.y = w[1] - (y - oy) / cam.s; limiteaza();
  }
  function atingeCer(x, y) {
    const w = lume(x, y);
    // Departe: atingerea alege constelația. Aproape: alege steaua.
    const c = carti.find((q) => Math.hypot(w[0] - q.c[0], w[1] - q.c[1]) < q.R * 1.2);
    if (c && c.R * cam.s < Math.min(W, H) * 0.22) { zboaraLaCarte(c); return; }
    const s = steaLa(x, y);
    if (s) { clopotel(s.slug); deschideFisa(s); return; }
    if (c && c !== apropiata) zboaraLaCarte(c);
  }
  function gesturi() {
    const degete = new Map();
    let gest = null;
    const punct = (ev) => { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (ev) => {
      if (mod !== "cer") return;
      canvas.setPointerCapture(ev.pointerId);
      degete.set(ev.pointerId, punct(ev));
      if (zbor && !zbor.cale) zbor = null;   // gestul ia camera din zbor
      gest = degete.size === 1 ? { p0: punct(ev), t0: performance.now(), mutat: false } : Object.assign(gest || {}, { mutat: true });
    });
    canvas.addEventListener("pointermove", (ev) => {
      if (mod !== "cer" || !degete.has(ev.pointerId)) return;
      const nou = punct(ev), vechi = degete.get(ev.pointerId);
      if (degete.size === 1) {
        cam.x -= (nou[0] - vechi[0]) / cam.s; cam.y -= (nou[1] - vechi[1]) / cam.s; limiteaza();
        if (gest && Math.hypot(nou[0] - gest.p0[0], nou[1] - gest.p0[1]) > 8) gest.mutat = true;
      } else {
        const [a, b] = [...degete.entries()].map(([id, p]) => (id === ev.pointerId ? nou : p));
        const [a0, b0] = [...degete.values()];
        const d0 = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) || 1, d1 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const m0 = [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2], m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        cam.x -= (m1[0] - m0[0]) / cam.s; cam.y -= (m1[1] - m0[1]) / cam.s;
        apropie(m1[0], m1[1], d1 / d0);
      }
      degete.set(ev.pointerId, nou);
    });
    const ridica = (ev) => {
      if (!degete.has(ev.pointerId)) return;
      degete.delete(ev.pointerId);
      if (degete.size === 0 && gest && !gest.mutat && performance.now() - gest.t0 < 500 && ev.type === "pointerup") atingeCer(...punct(ev));
      if (degete.size === 0) gest = null;
    };
    canvas.addEventListener("pointerup", ridica);
    canvas.addEventListener("pointercancel", ridica);
    canvas.addEventListener("wheel", (ev) => {
      if (mod !== "cer") return;
      ev.preventDefault();
      if (zbor && !zbor.cale) zbor = null;
      apropie(...punct(ev), Math.exp(-ev.deltaY * 0.0016));
    }, { passive: false });
    addEventListener("keydown", (ev) => { if (ev.key === "Escape" && mod === "cer" && (!fisa || fisa.hidden)) iesiDinCer(); });
  }

  function asculta() {
    gesturi();
    ascultaSunet();
    // Săgețile tastaturii: ziua vecină sau constelația vecină (cât timp cerul e pe ecran și nu e deschisă o fișă).
    addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      if (ev.altKey || ev.metaKey || ev.ctrlKey || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || "")) return;
      if ((fisa && !fisa.hidden) || (ziuaTa && !ziuaTa.hidden) || scrollY > H * 0.6) return;
      ev.preventDefault();
      pas(ev.key === "ArrowRight" ? 1 : -1);
    });
    // Glisarea pe cer, în constelația zilei: stânga = ziua de după, dreapta = ziua de dinainte (ca o pagină întoarsă).
    let glisare = null;
    canvas.addEventListener("pointerdown", (ev) => { if (mod === "zi") glisare = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
    canvas.addEventListener("pointerup", (ev) => {
      if (mod !== "zi" || !glisare) return;
      const dx = ev.clientX - glisare.x, dy = ev.clientY - glisare.y, rapid = performance.now() - glisare.t < 700;
      glisare = null;
      if (rapid && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) { trasDeCurand = performance.now(); pas(dx < 0 ? 1 : -1); }
    });
    canvas.addEventListener("pointercancel", () => { glisare = null; });
    // Prima atingere în timpul intrării doar sare peste ea.
    let saritura = false;
    sectiune.addEventListener("pointerdown", () => {
      if (zbor && zbor.cale) sariZbor();   // „Ziua ta” se sare la atingere, ca intrarea
      if (faza < 2 && !linistit) { saritura = true; sari(); setTimeout(() => { saritura = false; }, 500); }
    }, true);
    canvas.addEventListener("mousemove", (ev) => {
      if (atingere || faza < 2 || zbor) return;
      const r = canvas.getBoundingClientRect(), s = steaLa(ev.clientX - r.left, ev.clientY - r.top);
      canvas.style.cursor = s ? "pointer" : "default";
      if (!s) { eticheta.hidden = true; return; }
      eticheta.textContent = `${s.titlu} · ${dataLunga(s.data)}`;
      eticheta.style.left = `${ev.clientX - r.left + 14}px`; eticheta.style.top = `${ev.clientY - r.top + 10}px`;
      eticheta.hidden = false;
    });
    canvas.addEventListener("mouseleave", () => { eticheta.hidden = true; });
    canvas.addEventListener("click", (ev) => {
      if (mod === "cer" || zbor) return;   // în „Tot cerul”, atingerea e tratată de gesturi()
      if (saritura) { saritura = false; return; }
      if (performance.now() - trasDeCurand < 400) return;   // o glisare nu e și o atingere
      const r = canvas.getBoundingClientRect(), s = steaLa(ev.clientX - r.left, ev.clientY - r.top);
      if (!s) return;
      eticheta.hidden = true;
      const j = azi.indexOf(s);
      if (j >= 0) { butoane[j].click(); return; }
      clopotel(s.slug);
      deschideFisa(s);
    });
  }

  porneste().catch(() => {
    panou.innerHTML = '<p>Cerul nu s-a putut încărca. <a href="calendar/">Deschide calendarul</a>.</p>';
    panou.hidden = false;
  });
})();
