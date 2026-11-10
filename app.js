"use strict";
/* ===== À ADAPTER (Supabase > Project Settings > API) ===== */
const SB_URL = "https://quvrtgljyuughwjoemxv.supabase.co";
const SB_KEY = "sb_publishable_HuR-G5c-v08hxTIjNevpZg_XHMXRarE";
const SITE_NAME = "IPNET Events";
const TURNSTILE_SITEKEY = ""; // clé publique Cloudflare Turnstile ; vide = anti-robot désactivé
/* ========================================================= */

document.documentElement.classList.add("js");
const sb = supabase.createClient(SB_URL, SB_KEY, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const app = document.getElementById("app"), modal = document.getElementById("modal");
const $ = id => document.getElementById(id);
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Number(n).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ") + " FCFA";
const dt = s => new Date(s).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" });
const dts = s => new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" });
const flash = (t, ok) => `<div class="msg ${ok ? "ok" : ""}" role="alert">${esc(t)}</div>`;

const STATUT = { pending: "En attente de validation", confirmed: "Confirmé", rejected: "Refusé" };
const BILLET = { valid: "Valide", used: "Utilisé", cancelled: "Annulé" };
const TYPES = { visitor: "Visiteur", student: "Étudiant" };
const AUD = { all: "Ouvert à tous", students: "Réservé aux étudiants" };
const ALERTE = {
  reference_reutilisee: "Référence réutilisée",
  capture_reutilisee: "Capture réutilisée", numero_partage: "Numéro Mixx by Yas partagé",
  grosse_commande: "Grosse commande", compte_bloque_auto: "Blocage automatique"
};

const ERR = {
  email_jetable: "Les adresses email temporaires ne sont pas acceptées.",
  nom_invalide: "Prénom ou nom invalide.", telephone_invalide: "Numéro de téléphone invalide.",
  non_connecte: "Connecte-toi d'abord.", compte_bloque: "Ton compte est bloqué. Contacte un administrateur.",
  evenement_introuvable: "Cet événement n'existe pas.", ventes_fermees: "La vente n'est pas ouverte en ce moment.",
  reserve_etudiants: "Cet événement est réservé aux étudiants.",
  quantite_invalide: "Quantité invalide (1 à 10).", trop_de_commandes_en_attente: "Tu as déjà 3 commandes en attente. Attends leur validation.",
  aucun_tarif: "Aucun tarif n'est actif aujourd'hui.", complet: "Plus assez de places disponibles.",
  reference_invalide: "Référence de transaction invalide (6 à 40 lettres/chiffres).", numero_invalide: "Numéro Mixx by Yas invalide (8 chiffres).",
  code_invalide: "Code de commande invalide.", capture_invalide: "Capture de paiement invalide.",
  reference_deja_utilisee: "Cette référence de transaction a déjà servi pour une autre commande.",
  capture_deja_utilisee: "Cette capture a déjà été envoyée pour une autre commande.",
  code_deja_pris: "Le code de commande était déjà pris : un nouveau t'a été attribué, renvoie la commande.",
  interdit: "Action réservée aux administrateurs (double authentification requise).",
  deja_traitee: "Cette commande a déjà été traitée.", propre_commande: "Tu ne peux pas traiter ta propre commande.",
  donnees_invalides: "Données invalides.", propre_compte: "Tu ne peux pas bloquer ton propre compte.",
  "rate limit": "Trop d'essais. Réessaie dans quelques minutes.", "over_email_send_rate_limit": "Trop d'emails demandés. Réessaie plus tard.",
  "captcha": "Le test anti-robot a échoué. Réessaie."
};
const errMsg = e => {
  const m = String(e?.message || e || "").toLowerCase();
  for (const k in ERR) if (m.includes(k.toLowerCase())) return ERR[k];
  return "Une erreur est survenue. Réessaie.";
};
const rpc = async (name, args) => {
  const { data, error } = await sb.rpc(name, args);
  if (error) return { error: errMsg(error), raw: error.message };
  if (data && typeof data === "object" && data.error) return { error: errMsg(data.error), code: data.error };
  return { data };
};

let welcome = false, me = null, profile = null, timer = null, tab = "orders", ofilter = "pending";
let idle = null, idleReset = null, lastUid = null, rid = 0, notice = "", camStream = null, camTimer = null;

/* ---------- Logo vivant (billet étincelle) ---------- */
let lgN = 0;
const logo = () => { const i = ++lgN; return `<svg class="lg" viewBox="0 0 512 512" role="img" aria-label="IPNET Events" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="lgg${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc4e1"/><stop offset=".5" style="stop-color:var(--c,#ff6fae)"/><stop offset="1" stop-color="#8b6bff"/></linearGradient>
<clipPath id="lgc${i}"><path d="M96 130H416a32 32 0 0 1 32 32V226a30 30 0 0 0 0 60V350a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V286a30 30 0 0 0 0-60V162a32 32 0 0 1 32-32Z"/></clipPath><filter id="lgf${i}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter></defs>
<ellipse class="lg-glow" cx="256" cy="256" rx="200" ry="140" style="fill:var(--c,#ff6fae)" filter="url(#lgf${i})"/>
<g class="lg-tilt"><path fill="url(#lgg${i})" d="M96 130H416a32 32 0 0 1 32 32V226a30 30 0 0 0 0 60V350a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V286a30 30 0 0 0 0-60V162a32 32 0 0 1 32-32Z"/>
<g clip-path="url(#lgc${i})"><rect class="lg-shine" x="30" y="110" width="70" height="290" fill="#fff" opacity=".38"/></g>
<path class="lg-perf" d="M366 156V356" fill="none" stroke="#14091f" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>
<circle cx="398" cy="256" r="14" fill="#14091f" fill-opacity=".35"/><path class="lg-spark" d="M232 170Q246 242 318 256Q246 270 232 342Q218 270 146 256Q218 242 232 170Z" fill="#fff"/></g>
<path class="lg-tw" style="animation-delay:0s" d="M104 70Q107.12 92.88 130 96Q107.12 99.12 104 122Q100.88 99.12 78 96Q100.88 92.88 104 70Z" fill="#fff"/><path class="lg-tw" style="animation-delay:0.8s" d="M424 86Q426.16 101.84 442 104Q426.16 106.16 424 122Q421.84 106.16 406 104Q421.84 101.84 424 86Z" fill="#fff"/><path class="lg-tw" style="animation-delay:1.5s" d="M412 402Q414.64 421.36 434 424Q414.64 426.64 412 446Q409.36 426.64 390 424Q409.36 421.36 412 402Z" fill="#fff"/><path class="lg-tw" style="animation-delay:2.1s" d="M96 403Q97.8 416.2 111 418Q97.8 419.8 96 433Q94.2 419.8 81 418Q94.2 416.2 96 403Z" fill="#fff"/>
</svg>`; };

/* ---------- Animations ---------- */
const io = ("IntersectionObserver" in window && !REDUCE)
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vu"); io.unobserve(e.target); } }), { threshold: .12 })
  : null;
function observeReveal() { document.querySelectorAll(".rv:not(.vu)").forEach(el => io ? io.observe(el) : el.classList.add("vu")); }
function show(html) {
  app.innerHTML = html;
  app.classList.remove("ecran"); void app.offsetWidth; app.classList.add("ecran");
  observeReveal();
}
function confetti() {
  if (REDUCE) return;
  const c = document.createElement("canvas"); c.className = "confetti"; document.body.appendChild(c);
  const x = c.getContext("2d"), W = c.width = innerWidth, H = c.height = innerHeight;
  const main = getComputedStyle(document.documentElement).getPropertyValue("--c").trim() || "#ff6fae";
  const cols = [main, "#ffffff", "#ffd166", "#22d3ee", "#a78bfa"];
  const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[Math.random() * cols.length | 0] }));
  let t = 0;
  (function f() {
    x.clearRect(0, 0, W, H);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .04; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); x.restore(); });
    if (++t < 170) requestAnimationFrame(f); else c.remove();
  })();
}

/* ---------- Sécurité côté navigateur ---------- */
let tsLoaded = null;
const loadTs = () => tsLoaded || (tsLoaded = new Promise(r => { const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.onload = r; document.head.appendChild(s); }));
async function captcha(box) {
  if (!TURNSTILE_SITEKEY || !box) return { on: false, token: () => undefined, reset() {} };
  await loadTs();
  const id = window.turnstile.render(box, { sitekey: TURNSTILE_SITEKEY, theme: "dark" });
  return { on: true, token: () => window.turnstile.getResponse(id), reset: () => window.turnstile.reset(id) };
}
async function pwned(pw) { // vérification anonyme (k-anonymat) : seul le début de l'empreinte est envoyé
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const h = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const r = await fetch("https://api.pwnedpasswords.com/range/" + h.slice(0, 5), { headers: { "Add-Padding": "true" } });
    if (!r.ok) return false;
    return (await r.text()).split("\n").some(l => { const [s, c] = l.trim().split(":"); return s === h.slice(5) && +c > 0; });
  } catch { return false; }
}
const sha256 = async file => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))].map(b => b.toString(16).padStart(2, "0")).join("");
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ]+([ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
const nameOk = s => NAME_RE.test(s) && s.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "").length >= 2 && !/(.)\1\1/i.test(s);
const pwOk = p => p.length >= 10 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
const normPhone = s => { const t = s.replace(/[\s.-]/g, ""); return /^[0-9]{8}$/.test(t) ? "+228" + t : t; };
const baseUrl = () => location.origin + location.pathname;
const ticketUrl = c => baseUrl() + "#/t/" + c;
const codeOf = t => { const m = String(t).match(/#\/t\/([A-Za-z0-9]{8,40})/); return (m ? m[1] : String(t)).trim(); };
let afterLogin = "", resetBusy = false;

/* ---------- Routage ---------- */
async function route() {
  const my = ++rid;
  clearInterval(timer); clearTimeout(bgTimer); stopIdle(); stopCam();
  document.documentElement.style.setProperty("--c", "#ff6fae");
  document.title = SITE_NAME;
  setBg(null);
  const { data: { session } } = await sb.auth.getSession();
  if (location.search || /access_token|error_description/.test(location.hash)) {
    history.replaceState(null, "", location.pathname + (location.hash.startsWith("#/") ? location.hash : ""));
  }
  me = session?.user || null; lastUid = me?.id || null; profile = null;
  let aal2 = false;
  if (me) {
    profile = (await sb.from("profiles").select("*").eq("id", me.id).maybeSingle()).data;
    if (profile?.role === "admin") {
      const { data: l } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      aal2 = l?.currentLevel === "aal2";
    }
  }
  if (my !== rid) return;

  $("nav").innerHTML = `<b><a href="#/" class="marque">${logo()}<span>${esc(SITE_NAME)}</span></a></b><span>` +
    (me ? `<a href="#/me">Mes billets</a>${profile?.role === "admin" ? `<a href="#/admin">Admin</a>` : ""}<a href="#" id="out">Déconnexion</a>`
        : `<a href="#/login">Connexion</a>`) + `</span>`;
  if ($("out")) $("out").onclick = async e => { e.preventDefault(); await sb.auth.signOut(); location.hash = "#/"; };

  const [, a, b] = location.hash.split("/");
  if (a === "e") return eventPage(b);
  if (a === "login") return me ? (location.hash = "#/") : loginPage(b);
  if (a === "reset") return resetPage();
  if (a === "mfa") return mfaPage();
  if (a === "me") return mePage();
  if (a === "t") {
    if (!me) { afterLogin = location.hash; return ticketPage(b); }
    if (profile?.role === "admin" && !aal2) { afterLogin = location.hash; location.hash = "#/mfa"; return; }
    return ticketPage(b);
  }
  if (a === "admin") {
    if (!me) { location.hash = "#/login"; return; }
    if (profile?.role === "admin" && !aal2) { location.hash = "#/mfa"; return; }
    return adminPage();
  }
  return home();
}
addEventListener("hashchange", route);
sb.auth.onAuthStateChange((ev, s) => {
  if (ev === "PASSWORD_RECOVERY") { if (!resetBusy) { location.hash = "#/reset"; route(); } return; }
  if (ev === "INITIAL_SESSION") { route(); return; }
  if (ev === "SIGNED_IN" && (s?.user?.id || null) !== lastUid) welcome = true;
  if (ev === "SIGNED_OUT" || ev === "MFA_CHALLENGE_VERIFIED" || (ev === "SIGNED_IN" && (s?.user?.id || null) !== lastUid)) route();
});

/* ---------- Accueil ---------- */
/* Fond de la page : diaporama d'images et de vidéos de l'événement + lumières animées */
let bgTimer = null;
function setBg(e) {
  clearTimeout(bgTimer);
  let f = $("fond");
  if (!f) { f = document.createElement("div"); f.id = "fond"; f.setAttribute("aria-hidden", "true"); document.body.prepend(f); }
  if (!e) { f.innerHTML = ""; return; }
  const ok = u => typeof u === "string" && /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(u);
  let items = (Array.isArray(e.bg_media) && e.bg_media.length ? e.bg_media : (e.bg_url ? [{ url: e.bg_url, kind: e.bg_kind }] : []))
    .filter(m => m && ok(m.url) && (m.kind === "image" || m.kind === "video")).slice(0, 8);
  if (REDUCE) items = items.filter(m => m.kind === "image").slice(0, 1); // moins de mouvement : une image fixe
  f.innerHTML = items.map((m, i) => m.kind === "video"
    ? `<video class="bgm" src="${esc(m.url)}" muted playsinline preload="${i ? "metadata" : "auto"}"></video>`
    : `<img class="bgm" src="${esc(m.url)}" alt="">`).join("") + `<div class="teinte"></div><i class="l1"></i><i class="l2"></i><i class="l3"></i>`;
  const els = [...f.querySelectorAll(".bgm")];
  if (!els.length) return;
  let cur = -1;
  const next = () => {
    clearTimeout(bgTimer);
    const prev = els[cur]; cur = (cur + 1) % els.length; const el = els[cur];
    if (prev && prev !== el) { prev.classList.remove("on"); if (prev.pause) setTimeout(() => prev.pause(), 1500); }
    el.classList.add("on");
    if (el.tagName === "VIDEO") {
      el.currentTime = 0; el.play().catch(() => {});
      if (els.length === 1) { el.loop = true; return; }
      el.onended = next; bgTimer = setTimeout(next, 20000);
    } else if (els.length > 1) bgTimer = setTimeout(next, 6500);
  };
  next();
}

/* Écran d'entrée juste après la connexion : l'événement en cours s'anime plein écran */
function splash(e) {
  welcome = false;
  if (REDUCE) return;
  const d = document.createElement("div"); d.className = "accueil";
  d.innerHTML = `<div><div class="grandlogo">${logo()}</div><p class="petit-texte">Bienvenue${profile?.first_name ? " " + esc(profile.first_name) : ""}</p><h1>${esc(e.title)}</h1><p class="quand">${dt(e.starts_at)}${e.venue ? " · " + esc(e.venue) : ""}</p></div>`;
  d.onclick = () => d.remove();
  document.body.appendChild(d); confetti();
  setTimeout(() => d.classList.add("fin"), 2300); setTimeout(() => d.remove(), 3100);
}

/* L'événement en cours s'affiche directement ; les autres sont listés dessous */
async function home() {
  const { data } = await sb.from("events").select("*").eq("active", true).order("starts_at");
  const en = (data || []).filter(e => Date.parse(e.starts_at) + 12 * 36e5 > Date.now());
  if (en.length) return eventPage(en[0].slug, en.slice(1));
  show(`<div class="hero"><div class="wrap"><p class="pill">IPNET Institute of Technology</p><h1>Les événements<br>du campus</h1>
    <p class="sous">Réserve ta place, paie par Mixx by Yas et reçois ton billet avec QR code.</p></div></div>
    <div class="wrap"><h2>À venir</h2>` +
    (data?.length ? data.map(e => `<a class="carte ev rv" style="--ec:${esc(e.color)}" href="#/e/${esc(e.slug)}"><b>${esc(e.title)}</b>
      <span class="badge none" style="margin-left:.5rem">${e.audience === "all" ? "Ouvert à tous" : "Étudiants"}</span><br>${dt(e.starts_at)} · ${esc(e.venue || "Lieu bientôt annoncé")}</a>`).join("")
      : "<p>Aucun événement pour le moment.</p>") + `</div>`);
}

/* ---------- Page événement ---------- */
function palierActuel(tiers) {
  const now = Date.now();
  return tiers.find(p => now >= Date.parse(p.du + "T00:00:00Z") && now <= Date.parse(p.au + "T23:59:59Z"));
}
function eligible(e, p) {
  if (!p) return { ok: false, why: "login" };
  if (p.blocked) return { ok: false, why: "blocked" };
  if (e.audience === "students" && p.account_type !== "student") return { ok: false, why: "students" };
  return { ok: true };
}
const genCode = () => "IPN-" + String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");

async function eventPage(slug, others) {
  const { data: e } = await sb.from("events").select("*").eq("slug", slug || "").maybeSingle();
  if (!e) { show(`<div class="wrap"><h1 class="mini">Introuvable</h1><p>Cet événement n'existe pas.</p></div>`); return; }
  document.documentElement.style.setProperty("--c", e.color || "#ff6fae");
  setBg(e);
  document.title = e.title;
  const { data: left } = await sb.rpc("places_restantes", { p_event: e.id });
  const tiers = e.tiers || [];
  const ouvert = () => Date.now() >= Date.parse(e.sales_open), fini = () => Date.now() >= Date.parse(e.starts_at);
  const parts = [["j", "jours"], ["h", "heures"], ["m", "min"], ["s", "sec"]];

  show(`<div class="hero"><div class="wrap">${e.tagline ? `<p class="pill">${esc(e.tagline)}</p>` : ""}
    <h1>${esc(e.title)}</h1><p class="quand">${dt(e.starts_at)}</p>
    <div class="compte">${parts.map(([k, l]) => `<div><b id="cp-${k}">0</b>${l}</div>`).join("")}</div><p id="phrase"></p></div></div>
    <div class="wrap"><dl class="infos rv"><div><dt>Lieu</dt><dd>${esc(e.venue || "Bientôt annoncé")}</dd></div>
    ${e.dress_code ? `<div><dt>Dress code</dt><dd>${esc(e.dress_code)}</dd></div>` : ""}
    <div><dt>Accès</dt><dd>${esc(AUD[e.audience])}</dd></div>
    <div><dt>Places restantes</dt><dd>${left == null ? "—" : Math.max(0, left)}</dd></div></dl>
    <h2 class="rv">Les tarifs</h2><div id="paliers" class="rv"></div>
    <h2 class="rv">Acheter un billet</h2><div id="achat" class="rv"></div>
    ${others?.length ? `<h2 class="rv">Autres événements</h2>` + others.map(o => `<a class="carte ev rv" style="--ec:${esc(o.color)}" href="#/e/${esc(o.slug)}"><b>${esc(o.title)}</b><br>${dt(o.starts_at)} · ${esc(o.venue || "Lieu bientôt annoncé")}</a>`).join("") : ""}</div>`);

  if (others && welcome) splash(e);
  const prev = {}; let lastP;
  function tick() {
    if (!$("cp-j")) return;
    const now = Date.now(), cible = ouvert() ? Date.parse(e.starts_at) : Date.parse(e.sales_open);
    let d = Math.max(0, cible - now);
    const v = { j: Math.floor(d / 864e5) }; d -= v.j * 864e5;
    v.h = Math.floor(d / 36e5); d -= v.h * 36e5; v.m = Math.floor(d / 6e4); d -= v.m * 6e4; v.s = Math.floor(d / 1e3);
    parts.forEach(([k]) => {
      const el = $("cp-" + k), t = String(v[k]);
      if (prev[k] !== t) { el.textContent = t; prev[k] = t; if (!REDUCE) { el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); } }
    });
    const p = palierActuel(tiers);
    $("phrase").textContent = fini() ? "Événement terminé." : ouvert() ? (p ? `Tarif actuel : ${fmt(p.prix)}. Le prix monte au palier suivant.` : "Billetterie fermée.") : "Ouverture de la billetterie dans :";
    if (p !== lastP || lastP === undefined) {
      lastP = p;
      $("paliers").innerHTML = tiers.map((t, i) => `<div class="palier ${t === p ? "actif" : Date.now() > Date.parse(t.au + "T23:59:59Z") ? "passe" : ""}"><span>${i ? "Ensuite" : "Ouverture"} · ${esc(t.du)} → ${esc(t.au)}</span><b>${fmt(t.prix)}</b></div>`).join("");
    }
  }
  tick(); timer = setInterval(tick, 1000);

  const zone = $("achat"), p0 = palierActuel(tiers);
  if (fini() || !ouvert() || !p0) { zone.innerHTML = `<p>${fini() ? "Les ventes sont terminées." : "La vente n'est pas ouverte en ce moment."}</p>`; return; }
  if (left != null && left <= 0) { zone.innerHTML = `<p>Complet : il n'y a plus de places.</p>`; return; }
  const el = eligible(e, profile);
  if (!el.ok) {
    const msgs = {
      login: `<p style="margin-bottom:1rem">Connecte-toi pour acheter ton billet.</p><a class="btn plein" href="#/login/${esc(e.audience)}">Se connecter ou créer un compte</a>`,
      blocked: flash("Ton compte est bloqué. Contacte un administrateur."),
      students: flash("Cet événement est réservé aux étudiants. Ton compte est de type visiteur.")
    };
    zone.innerHTML = msgs[el.why];
    return;
  }

  let code = genCode();
  zone.innerHTML = `<form id="f" class="formcard">
    <div class="etape"><span class="num">1</span><div><h3>Combien de billets ?</h3>
      <div class="stepper"><button type="button" id="mn" aria-label="Moins">−</button><input type="number" id="qty" min="1" max="10" value="1" required aria-label="Nombre de billets"><button type="button" id="pl" aria-label="Plus">+</button></div>
      <p class="total">Total à payer <b id="tot">${fmt(p0.prix)}</b></p><p class="petit-texte">Le prix final est fixé par le serveur.</p></div></div>
    <div class="etape"><span class="num">2</span><div><h3>Paie par Mixx by Yas</h3>
      <img class="mixx" src="mixx.png" alt="Mixx by Yas" width="150" height="116">
      <div class="paybox"><div><span class="petit-texte">Numéro à payer</span><br><b class="gros">${esc(e.pay_number)}</b></div><button type="button" class="petit" id="cp">Copier</button></div>
      <p style="margin-top:.8rem">Code de commande : <b id="oc">${code}</b></p><p class="petit-texte">Écris-le dans le motif du paiement si Mixx by Yas le permet. Ton billet sera disponible après vérification.</p></div></div>
    <div class="etape"><span class="num">3</span><div><h3>Confirme ton paiement</h3>
      <label>Numéro Mixx by Yas avec lequel tu as payé<input id="pn" type="tel" inputmode="numeric" placeholder="90123456" required></label>
      <label>Référence de la transaction (dans le SMS de confirmation)<input id="ref" required minlength="6" maxlength="40" autocomplete="off" placeholder="Ex : 7H3K29A1B4"></label>
      <label>Capture d'écran du paiement (JPG, PNG ou WebP, 5 Mo max)<input type="file" id="img" accept="image/jpeg,image/png,image/webp" required></label><div id="apercu" class="apercu"></div></div></div>
    <button class="plein large" id="go">Envoyer ma commande</button><div id="err" style="margin-top:1rem"></div></form>`;
  const setQty = n => { $("qty").value = Math.min(10, Math.max(1, n)); $("tot").textContent = fmt(p0.prix * +$("qty").value); };
  $("qty").oninput = () => { if ($("qty").value !== "") setQty(+$("qty").value || 1); };
  $("mn").onclick = () => setQty(+$("qty").value - 1); $("pl").onclick = () => setQty(+$("qty").value + 1);
  $("cp").onclick = async () => { try { await navigator.clipboard.writeText(e.pay_number); $("cp").textContent = "Copié ✓"; setTimeout(() => $("cp").textContent = "Copier", 1800); } catch { $("cp").textContent = "Copie à la main"; } };
  $("img").onchange = () => { const f = $("img").files[0]; $("apercu").innerHTML = f && /^image\//.test(f.type) ? `<img src="${URL.createObjectURL(f)}" alt="Aperçu de la capture">` : ""; };
  $("f").onsubmit = async ev => {
    ev.preventDefault(); const go = $("go"); go.disabled = true; go.textContent = "Envoi…";
    const fail = m => { $("err").innerHTML = flash(m); go.disabled = false; go.textContent = "Envoyer ma commande"; };
    const file = $("img").files[0], ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file?.type];
    if (!ext) return fail("La capture doit être une image JPG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024) return fail("La capture dépasse 5 Mo.");
    const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
    const hash = await sha256(file);
    const up = await sb.storage.from("proofs").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) return fail("Échec de l'envoi de la capture. Réessaie.");
    const r = await rpc("create_order", { p_event: e.id, p_qty: +$("qty").value, p_reference: $("ref").value, p_pay_phone: $("pn").value, p_proof_path: path, p_proof_hash: hash, p_order_code: code });
    if (r.error) {
      if (r.code === "code_deja_pris") { code = genCode(); $("oc").textContent = code; }
      return fail(r.error);
    }
    notice = "Commande envoyée ! Elle passera en « Confirmé » dès que l'administrateur aura vérifié ton paiement.";
    confetti(); location.hash = "#/me";
  };
}

/* ---------- Connexion / inscription / mot de passe oublié ---------- */
function loginPage(aud) {
  aud = ["all", "students"].includes(aud) ? aud : "all";
  let mode = "login", resetMail = "";
  const typesOk = { all: ["visitor", "student"], students: ["student"] }[aud];
  const draw = (m = "") => {
    const titre = { login: "Connexion", signup: "Créer un compte", forgot: "Mot de passe oublié", reset: "Nouveau mot de passe" }[mode];
    show(`<div class="wrap" style="max-width:480px"><h1 class="mini">${titre}</h1><br><div id="m">${m}</div>
      <form id="f" class="formcard" novalidate>
      ${mode === "signup" ? `
        <label>Prénom<input id="pn" autocomplete="given-name" required maxlength="60"></label>
        <label>Nom<input id="nm" autocomplete="family-name" required maxlength="60"></label>
        <label>Téléphone (+228 suivi de 8 chiffres)<input id="tel" type="tel" autocomplete="tel" placeholder="+228 90 12 34 56" required></label>
        <fieldset><legend>Je suis</legend>${typesOk.map((t, i) => `<label class="radio"><input type="radio" name="tp" value="${t}" ${i === 0 ? "checked" : ""}>${t === "student" ? "Étudiant IPNET" : "Visiteur"}</label>`).join("")}
        ${typesOk.includes("student") ? `<p class="petit-texte">Étudiant : une carte d'étudiant pourra être demandée à l'entrée.</p>` : ""}</fieldset>` : ""}
      ${mode === "reset" ? `
        <p style="margin-bottom:1rem">Un code a été envoyé à <b>${esc(resetMail)}</b>. Saisis-le ci-dessous, puis choisis ton nouveau mot de passe.</p>
        <label>Code reçu par email<input id="otp" class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="······" required></label>
        <label>Nouveau mot de passe<input id="pw" type="password" autocomplete="new-password" required></label>
        <label>Confirmer le mot de passe<input id="pw2" type="password" autocomplete="new-password" required></label>
        <p class="petit-texte" style="margin-top:-.6rem;margin-bottom:1rem">10 caractères minimum, avec majuscule, minuscule, chiffre et symbole (ex : ! ? @ #).</p>` : `
      <label>Email personnel<input id="mail" type="email" autocomplete="email" required></label>`}
      ${mode === "signup" ? `<p class="petit-texte" style="margin-top:-.6rem;margin-bottom:1rem">Un lien de confirmation te sera envoyé par email.</p>` : ""}
      ${mode === "login" || mode === "signup" ? `<label>Mot de passe<input id="pw" type="password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required></label>` : ""}
      ${mode === "signup" ? `<p class="petit-texte" style="margin-top:-.6rem;margin-bottom:1rem">10 caractères minimum, avec majuscule, minuscule, chiffre et symbole (ex : ! ? @ #).</p>` : ""}
      <div id="cap" style="margin-bottom:1rem"></div>
      <button class="plein" id="go">${{ login: "Me connecter", signup: "Créer mon compte", forgot: "Recevoir un code", reset: "Changer mon mot de passe" }[mode]}</button></form><br>
      ${mode === "login" ? `<a href="#" data-m="forgot">Mot de passe oublié ?</a><br><br><a href="#" data-m="signup">Pas de compte ? S'inscrire</a>`
        : mode === "reset" ? `<a href="#" id="resend">Renvoyer un code</a><br><br><a href="#" data-m="login">Retour à la connexion</a>`
        : `<a href="#" data-m="login">J'ai déjà un compte</a>`}</div>`);
    document.querySelectorAll("[data-m]").forEach(a => a.onclick = ev => { ev.preventDefault(); mode = a.dataset.m; draw(); });
    boot();
  };
  async function boot() {
    const cap = await captcha($("cap"));
    const say = (t, ok) => $("m").innerHTML = flash(t, ok);
    if ($("otp")) $("otp").oninput = () => { $("otp").value = $("otp").value.replace(/\D/g, ""); };
    if ($("resend")) $("resend").onclick = async ev => {
      ev.preventDefault();
      const token = cap.token(); if (cap.on && !token) return say("Valide le test anti-robot.");
      const { error } = await sb.auth.resetPasswordForEmail(resetMail, { captchaToken: token });
      cap.reset();
      say(error?.status === 429 ? "Attends une minute avant de redemander un code." : "Un nouveau code vient d'être envoyé.", !error);
    };
    $("f").onsubmit = async ev => {
      ev.preventDefault();
      const go = $("go");
      if (mode === "reset") { // changement du mot de passe avec le code reçu par email
        const code = $("otp").value.trim(), pw = $("pw").value;
        if (code.length < 6) return say("Saisis le code reçu par email.");
        if (pw !== $("pw2").value) return say("Les deux mots de passe ne sont pas identiques.");
        if (!pwOk(pw)) return say("Mot de passe trop faible : 10 caractères minimum avec majuscule, minuscule, chiffre et symbole (ex : ! ? @ #).");
        if (await pwned(pw)) return say("Ce mot de passe apparaît dans des fuites connues. Choisis-en un autre.");
        go.disabled = true; resetBusy = true;
        try {
          const v = await sb.auth.verifyOtp({ email: resetMail, token: code, type: "recovery" });
          if (v.error) { go.disabled = false; return say(v.error.status === 429 ? ERR["rate limit"] : "Code incorrect ou expiré. Redemande un code si besoin."); }
          const u = await sb.auth.updateUser({ password: pw });
          if (u.error) { go.disabled = false; return say("Impossible de changer le mot de passe. Redemande un code."); }
          notice = "Mot de passe modifié. Tu es connecté."; welcome = true; location.hash = "#/"; route();
        } finally { resetBusy = false; }
        return;
      }
      const email = $("mail").value.trim().toLowerCase();
      const token = cap.token();
      if (cap.on && !token) return say("Valide le test anti-robot.");
      go.disabled = true;
      const done = () => { go.disabled = false; cap.reset(); };
      if (mode === "forgot") {
        await sb.auth.resetPasswordForEmail(email, { captchaToken: token });
        resetMail = email; mode = "reset";
        return draw(flash("Si cette adresse existe, un code vient d'être envoyé. Vérifie aussi tes spams.", true));
      }
      const password = $("pw").value;
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken: token } });
        if (!error) { welcome = true; const to = afterLogin || "#/"; afterLogin = ""; location.hash = to; route(); return; }
        done();
        if (/not confirmed/i.test(error.message)) return say("Email non confirmé : clique sur le lien reçu par email.");
        if (error.status === 429) return say(ERR["rate limit"]);
        return say("Email ou mot de passe incorrect.");
      }
      // inscription
      const first = $("pn").value.trim(), last = $("nm").value.trim(), phone = normPhone($("tel").value);
      const type = document.querySelector("input[name=tp]:checked")?.value;
      const bad = m => { done(); say(m); };
      if (!nameOk(first) || !nameOk(last) || first.toLowerCase() === last.toLowerCase()) return bad("Entre ton vrai prénom et ton vrai nom, dans les deux champs (lettres uniquement, 2 minimum).");
      if (!/^\+228[0-9]{8}$/.test(phone)) return bad("Téléphone invalide : +228 suivi de 8 chiffres.");
      if (!typesOk.includes(type)) return bad("Choisis ton type de compte.");
      if (!pwOk(password)) return bad("Mot de passe trop faible : 10 caractères minimum avec majuscule, minuscule, chiffre et symbole (ex : ! ? @ #).");
      if (await pwned(password)) return bad("Ce mot de passe apparaît dans des fuites connues. Choisis-en un autre.");
      const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: baseUrl(), captchaToken: token, data: { first_name: first, last_name: last, phone, account_type: type } } });
      done();
      if (error) return say(error.status === 429 ? ERR["rate limit"] : "Inscription impossible. Vérifie tes informations (email valide, nom, téléphone).");
      mode = "login"; draw(flash("Presque fini : clique sur le lien de confirmation reçu par email, puis connecte-toi. (Vérifie aussi tes spams.)", true));
    };
  }
  draw();
}

async function resetPage() {
  if (!me) { show(`<div class="wrap" style="max-width:480px"><h1 class="mini">Lien expiré</h1><p>Demande un nouveau lien depuis la page de connexion.</p></div>`); return; }
  show(`<div class="wrap" style="max-width:480px"><h1 class="mini">Nouveau mot de passe</h1><br><div id="m"></div>
    <form id="f"><label>Nouveau mot de passe<input id="pw" type="password" autocomplete="new-password" required></label>
    <label>Confirmer<input id="pw2" type="password" autocomplete="new-password" required></label><button class="plein">Enregistrer</button></form></div>`);
  $("f").onsubmit = async ev => {
    ev.preventDefault(); const pw = $("pw").value, say = (t, ok) => $("m").innerHTML = flash(t, ok);
    if (pw !== $("pw2").value) return say("Les deux mots de passe ne sont pas identiques.");
    if (!pwOk(pw)) return say("Mot de passe trop faible : 10 caractères minimum avec majuscule, minuscule, chiffre et symbole (ex : ! ? @ #).");
    if (await pwned(pw)) return say("Ce mot de passe apparaît dans des fuites connues. Choisis-en un autre.");
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return say("Impossible de changer le mot de passe. Réessaie avec un nouveau lien.");
    notice = "Mot de passe modifié."; location.hash = "#/"; route();
  };
}

/* ---------- Double authentification des administrateurs ---------- */
async function mfaPage() {
  if (!me || profile?.role !== "admin") { location.hash = "#/"; return; }
  const { data: f } = await sb.auth.mfa.listFactors();
  const verified = f?.totp?.[0];
  let factorId, enrollHtml = "";
  if (verified) factorId = verified.id;
  else {
    for (const x of (f?.all || [])) if (x.status === "unverified") await sb.auth.mfa.unenroll({ factorId: x.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "IPNET Events" });
    if (error) { show(`<div class="wrap"><h1 class="mini">Erreur</h1>${flash("Active l'authentification à deux facteurs (TOTP) dans Supabase : Authentication → Sign In / Providers → Multi-Factor.")}</div>`); return; }
    factorId = data.id;
    enrollHtml = `<p>1. Scanne ce QR code avec une application d'authentification (Google Authenticator, Authy, Microsoft Authenticator…).</p>
      <div class="qr"><img alt="QR code d'enregistrement" width="200" height="200" src="${esc(data.totp.qr_code)}"></div>
      <p class="petit-texte">Ou saisis ce secret à la main : <b>${esc(data.totp.secret)}</b></p><p>2. Saisis le code à 6 chiffres affiché :</p>`;
  }
  show(`<div class="wrap" style="max-width:480px"><h1 class="mini">Double authentification</h1><br>
    <p style="margin-bottom:1rem">Le compte administrateur exige un code à 6 chiffres à chaque connexion.</p><div id="m"></div>${enrollHtml}
    <form id="f"><label>Code à 6 chiffres<input id="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="plein">Valider</button></form></div>`);
  $("f").onsubmit = async ev => {
    ev.preventDefault();
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: $("code").value.trim() });
    if (error) return $("m").innerHTML = flash("Code incorrect.");
    const to = afterLogin || "#/admin"; afterLogin = ""; location.hash = to; route();
  };
}

/* Billet téléchargeable : image PNG avec l'événement, le nom du titulaire et le QR code */
async function downloadTicket(d, holder) {
  try {
    try { await document.fonts.load("700 40px Sora"); await document.fonts.load("500 28px 'DM Sans'"); } catch { /* polices non chargées */ }
    const W = 720, H = 1040, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"), col = getComputedStyle(document.documentElement).getPropertyValue("--c").trim() || "#ff6fae";
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0a0820"); g.addColorStop(1, "#2a1d5c"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = col; x.fillRect(0, 0, W, 14);
    x.textAlign = "center"; x.fillStyle = "#ffffff";
    const fit = (t, size, max) => { do { x.font = `700 ${size}px 'Sora', sans-serif`; size -= 2; } while (x.measureText(t).width > max && size > 20); };
    fit(d.ev, 54, W - 80); x.fillText(d.ev, W / 2, 130);
    x.font = "500 28px 'DM Sans', sans-serif"; x.fillStyle = "#cdc7f0";
    x.fillText(dt(d.when), W / 2, 190); if (d.venue) x.fillText(d.venue, W / 2, 232);
    const qr = new Image(); qr.src = await QRCode.toDataURL(ticketUrl(d.dl), { width: 520, margin: 1 }); await qr.decode();
    x.fillStyle = "#ffffff"; x.beginPath(); if (x.roundRect) x.roundRect(80, 290, 560, 560, 28); else x.rect(80, 290, 560, 560); x.fill(); x.drawImage(qr, 100, 310, 520, 520);
    x.fillStyle = "#ffffff"; x.font = "700 36px 'DM Sans', sans-serif"; x.fillText(holder, W / 2, 915);
    x.font = "700 30px monospace"; x.fillStyle = col; x.fillText(d.dl, W / 2, 965);
    x.font = "400 22px 'DM Sans', sans-serif"; x.fillStyle = "#b8b3dd"; x.fillText("1 billet · valable une seule fois · présente ce QR à l'entrée", W / 2, 1006);
    const blob = await new Promise(r => c.toBlob(r, "image/png"));
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `billet-${d.dl}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch { alert("Téléchargement impossible. Fais plutôt une capture d'écran du billet."); }
}

/* ---------- Dashboard utilisateur ---------- */
async function mePage() {
  if (!me) { location.hash = "#/login"; return; }
  const { data } = await sb.from("orders").select("*, events(title,starts_at,venue), tickets(id,code,status)").eq("user_id", me.id).order("created_at", { ascending: false });
  const p = profile || {};
  const n = notice; notice = "";
  show(`<div class="wrap"><h1 class="mini">Bonjour ${esc(p.first_name || "")}</h1><br>${n ? flash(n, true) : ""}
    <div class="carte"><div class="ligne"><span><b>${esc(p.full_name || "")}</b> · ${esc(TYPES[p.account_type] || "")}</span></div>
      ${p.blocked ? flash("Ton compte est bloqué. Contacte un administrateur.") : ""}
      <div class="ligne g" style="margin-top:.8rem"><button class="petit" id="all">Me déconnecter partout</button></div></div>
    <h2>Mes commandes</h2>` +
    (data?.length ? data.map(o => `<div class="carte rv"><div class="ligne"><b>${esc(o.events.title)}</b><span class="badge ${o.status}">${STATUT[o.status]}</span></div>
      <p>${o.qty} billet(s) · ${fmt(o.total)} · ${dt(o.events.starts_at)}<br><span class="petit-texte">Code de commande ${esc(o.order_code)}</span></p>
      ${o.status === "confirmed" ? `<div class="billets">${(o.tickets || []).map(t => `<div class="billet ${t.status}"><div class="qr"><img alt="QR code du billet" width="180" height="180" data-qr="${esc(ticketUrl(t.code))}"></div>
        <div><b>${esc(t.code)}</b></div><span class="badge ${t.status}">${BILLET[t.status]}</span>${t.status === "valid" ? `<br><button class="petit" style="margin-top:.5rem" data-dl="${esc(t.code)}" data-ev="${esc(o.events.title)}" data-when="${esc(o.events.starts_at)}" data-venue="${esc(o.events.venue || "")}">Télécharger</button>` : ""}</div>`).join("")}</div>
        <p class="petit-texte" style="margin-top:.6rem">Un QR code par billet : il s'ouvre avec l'appareil photo du contrôleur et n'est valable qu'une seule fois.</p>` : ""}
      ${o.status === "rejected" ? `<p>Paiement non reconnu. Vérifie le montant et recommence avec une capture claire.</p>` : ""}</div>`).join("")
      : `<p>Tu n'as pas encore de commande. <a href="#/">Voir les événements</a></p>`) + `</div>`);
  document.querySelectorAll("[data-qr]").forEach(async i => { try { i.src = await QRCode.toDataURL(i.dataset.qr, { width: 180, margin: 1 }); } catch (e) { i.replaceWith(document.createTextNode("QR indisponible : donne le code ci-dessous à l'entrée.")); } });
  document.querySelectorAll("[data-dl]").forEach(btn => btn.onclick = () => downloadTicket(btn.dataset, p.full_name || ""));
  $("all").onclick = async () => { await sb.auth.signOut({ scope: "global" }); location.hash = "#/login"; };
}

/* ---------- Administration ---------- */
function startIdle() {
  stopIdle();
  idleReset = () => {
    clearTimeout(idle);
    idle = setTimeout(async () => { notice = "Déconnecté après 15 minutes d'inactivité."; await sb.auth.signOut(); location.hash = "#/login"; }, 15 * 60 * 1000);
  };
  ["pointerdown", "keydown", "scroll"].forEach(ev => addEventListener(ev, idleReset, { passive: true }));
  idleReset();
}
function stopIdle() { clearTimeout(idle); if (idleReset) { ["pointerdown", "keydown", "scroll"].forEach(ev => removeEventListener(ev, idleReset)); idleReset = null; } }
function stopCam() { clearInterval(camTimer); camTimer = null; if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; } }
const csvCell = v => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
function download(name, rows) {
  const blob = new Blob(["\ufeff" + rows.map(r => r.map(csvCell).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const sansAccent = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();

async function adminPage() {
  clearInterval(timer); startIdle();
  const onglets = [["orders", "Commandes"], ["events", "Événements"], ["accounts", "Comptes"], ["scan", "Contrôle d'entrée"], ["recon", "Rapprochement"], ["log", "Alertes et journal"], ["reset", "Réinitialiser"]];
  show(`<div class="wrap"><h1 class="mini">Administration</h1><br><div class="onglets">` +
    onglets.map(o => `<button class="${tab === o[0] ? "on" : ""}" data-t="${o[0]}">${o[1]}</button>`).join("") + `</div><div id="panel"></div></div>`);
  document.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { tab = b.dataset.t; stopCam(); adminPage(); });
  ({ orders: adminOrders, events: adminEvents, accounts: adminAccounts, scan: adminScan, recon: adminRecon, log: adminLog, reset: adminReset })[tab]($("panel"));
}

async function adminOrders(box) {
  const { data: all, error: oerr } = await sb.from("orders").select("*, events(title), profiles!orders_user_id_fkey(full_name,phone,account_type), tickets(id,code,status)").order("created_at", { ascending: false }).limit(300);
  if (oerr) { box.innerHTML = flash("Impossible de charger les commandes : " + oerr.message); return; }
  const data = all || [], ok = data.filter(o => o.status === "confirmed");
  const list = ofilter === "all" ? data : data.filter(o => o.status === ofilter);
  box.innerHTML = `<div class="stats"><div><b>${data.filter(o => o.status === "pending").length}</b>à valider</div>
    <div><b>${ok.reduce((n, o) => n + o.qty, 0)}</b>billets confirmés</div><div><b>${fmt(ok.reduce((n, o) => n + o.total, 0))}</b>encaissé</div></div>
    <label>Afficher<select id="flt">${[["pending", "À valider"], ["confirmed", "Confirmées"], ["rejected", "Refusées"], ["all", "Toutes"]].map(([v, l]) => `<option value="${v}" ${ofilter === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>` +
    (list.length ? list.map(o => `<div class="carte"><div class="ligne"><b>${esc(o.profiles?.full_name)} · ${esc(o.profiles?.phone)}</b><span class="badge ${o.status}">${STATUT[o.status]}</span></div>
      <p class="petit-texte">${esc(TYPES[o.profiles?.account_type])} · ${esc(o.events.title)} · ${o.qty} billet(s)</p>
      <div class="scroll"><table class="cmp"><tr><th>Montant à retrouver</th><td><b>${fmt(o.total)}</b> (${o.qty} × ${fmt(o.unit_price)})</td></tr>
        <tr><th>Référence Mixx by Yas</th><td>${esc(o.reference)}</td></tr><tr><th>Numéro payeur</th><td>${esc(o.pay_phone)}</td></tr>
        <tr><th>Heure de la commande</th><td>${dts(o.created_at)} (heure de Lomé)</td></tr><tr><th>Code de commande</th><td>${esc(o.order_code)}</td></tr></table></div>
      <div class="ligne g"><button class="petit" data-proof="${esc(o.proof_path)}">Voir la capture</button>
      ${o.status === "pending" ? `<button class="petit plein" data-ok="${o.id}">Confirmer</button><button class="petit danger" data-no="${o.id}">Refuser</button>` : ""}</div>
      ${o.status === "confirmed" ? `<div class="billets">${(o.tickets || []).map(t => `<div class="billet ${t.status}"><b>${esc(t.code)}</b><br><span class="badge ${t.status}">${BILLET[t.status]}</span>${t.status === "valid" ? `<br><button class="petit danger" data-cancel="${t.id}" style="margin-top:.4rem">Annuler</button>` : ""}</div>`).join("")}</div>` : ""}</div>`).join("")
      : "<p>Aucune commande dans cette liste.</p>");
  $("flt").onchange = () => { ofilter = $("flt").value; adminPage(); };
  const act = async (name, args, okMsg) => { const r = await rpc(name, args); if (r.error) alert(r.error); else if (okMsg === "confetti") confetti(); adminPage(); };
  box.querySelectorAll("[data-proof]").forEach(b => b.onclick = async () => {
    const { data: u, error } = await sb.storage.from("proofs").createSignedUrl(b.dataset.proof, 600);
    if (error) return alert("Impossible d'ouvrir la capture.");
    window.open(u.signedUrl, "_blank", "noopener");
  });
  box.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => { if (confirm("Confirmer cette commande ?\nVérifie d'abord que l'argent est bien arrivé dans Mixx by Yas (montant, référence, numéro).")) act("admin_decide_order", { p_order: b.dataset.ok, p_decision: "confirm" }, "confetti"); });
  box.querySelectorAll("[data-no]").forEach(b => b.onclick = () => { if (confirm("Refuser cette commande ?")) act("admin_decide_order", { p_order: b.dataset.no, p_decision: "reject" }); });
  box.querySelectorAll("[data-cancel]").forEach(b => b.onclick = () => { if (confirm("Annuler ce billet ? Il sera refusé à l'entrée.")) act("admin_cancel_ticket", { p_ticket: b.dataset.cancel }); });
}

async function adminEvents(box, editId) {
  const { data } = await sb.from("events").select("*").order("starts_at", { ascending: false });
  const ed = editId ? (data || []).find(x => x.id === editId) : null;
  const loc = s => (s || "").slice(0, 16);
  const tiersTxt = (ed?.tiers || []).map(t => `${t.prix};${t.du};${t.au}`).join("\n");
  const val = k => esc(ed?.[k] ?? "");
  let medias = ed ? (Array.isArray(ed.bg_media) && ed.bg_media.length ? ed.bg_media.slice() : (ed.bg_url ? [{ url: ed.bg_url, kind: ed.bg_kind }] : [])) : [];
  const removed = [];
  box.innerHTML = `<form id="f" class="formcard"><h3 style="margin-bottom:.6rem">${ed ? "Modifier : " + esc(ed.title) : "Nouvel événement"}</h3>
    <div class="section" style="border:0;margin-top:.6rem">L'événement</div>
    <div class="grille"><label>Titre<input id="t" required maxlength="120" value="${val("title")}" placeholder="Soirée Amapiano"></label><label>Slogan (facultatif)<input id="s" maxlength="200" value="${val("tagline")}" placeholder="La nuit de l'amapiano"></label></div>
    <label>Adresse du lien (minuscules et tirets)<input id="slug" pattern="[a-z0-9\\-]{2,60}" required value="${val("slug")}" placeholder="soiree-amapiano"></label>
    <div class="section">Quand et où</div>
    <div class="grille"><label>Date et heure de l'événement<input id="d" type="datetime-local" required value="${loc(ed?.starts_at)}"></label><label>Ouverture de la billetterie<input id="o" type="datetime-local" required value="${loc(ed?.sales_open)}"></label></div>
    <div class="grille"><label>Lieu<input id="v" value="${val("venue")}" placeholder="IPNET Assiyeye"></label><label>Dress code<input id="dc" value="${val("dress_code")}" placeholder="All white"></label></div>
    <p class="petit-texte" style="margin-top:-.5rem">Heures saisies en heure de Lomé (UTC).</p>
    <div class="section">La vente</div>
    <div class="grille"><label>Numéro Mixx by Yas pour le paiement<input id="pay" required value="${val("pay_number")}" inputmode="numeric"></label>
    <label>Nombre de places<input id="cap" type="number" min="1" value="${ed?.capacity ?? 200}" required></label></div>
    <label>Qui peut acheter ?<select id="aud"><option value="all">Tout le monde (visiteurs et étudiants)</option><option value="students">Étudiants seulement</option></select></label>
    <label>Paliers de prix : une ligne par palier, au format prix;début;fin<textarea id="tiers" rows="3" placeholder="2000;2026-11-10;2026-11-20&#10;3000;2026-11-21;2026-12-05">${esc(tiersTxt)}</textarea></label>
    <div class="section">L'ambiance</div>
    <label>Couleur principale de la page<input id="col" type="color" value="${esc(ed?.color || "#ff6fae")}"></label>
    <fieldset><legend>Fonds de la page : images et vidéos (8 maximum, elles défilent toutes seules)</legend>
    <div id="medias" class="medias"></div>
    <label>Ajouter des images (JPG, PNG, WebP) ou des vidéos courtes (MP4, WebM, 40 Mo max chacune)<input id="bg" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"></label></fieldset>
    <p class="petit-texte">Conseil : vidéo de 10 à 20 secondes, sans son, moins de 10 Mo, pour que la page reste rapide sur téléphone.</p><br>
    <div class="ligne g"><button class="plein large" id="sv">${ed ? "Enregistrer les modifications" : "Créer l'événement"}</button>${ed ? `<button type="button" id="cn">Annuler</button>` : ""}</div><div id="err" style="margin-top:1rem"></div></form>
    <h2>Événements existants</h2>` + (data || []).map(e => `<div class="carte"><div class="ligne"><span><b>${esc(e.title)}</b> · ${dt(e.starts_at)}${e.active ? "" : ` <span class="badge none">Masqué</span>`}<br>
    <span class="petit-texte">Lien : #/e/${esc(e.slug)} · ${esc(AUD[e.audience])} · ${e.capacity} places</span></span>
    <span class="ligne g"><button class="petit" data-ed="${e.id}">Modifier</button><button class="petit" data-hide="${e.id}">${e.active ? "Masquer" : "Afficher"}</button><button class="petit danger" data-del="${e.id}">Supprimer</button></span></div></div>`).join("");
  if (ed) $("aud").value = ed.audience;
  const drawMedias = () => {
    $("medias").innerHTML = medias.length ? medias.map((m, i) => `<div class="media">${m.kind === "video" ? `<video src="${esc(m.url)}" muted preload="metadata"></video>` : `<img src="${esc(m.url)}" alt="">`}
      <span class="petit-texte">${i + 1} · ${m.kind === "video" ? "vidéo" : "image"}</span><div class="ligne g"><button type="button" class="petit" data-up="${i}" ${i ? "" : "disabled"}>←</button><button type="button" class="petit" data-dn="${i}" ${i < medias.length - 1 ? "" : "disabled"}>→</button><button type="button" class="petit danger" data-rm="${i}">Retirer</button></div></div>`).join("")
      : `<p class="petit-texte">Aucun fond : seules les lumières colorées bougent derrière la page.</p>`;
    $("medias").querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { removed.push(medias[+b.dataset.rm].url); medias.splice(+b.dataset.rm, 1); drawMedias(); });
    $("medias").querySelectorAll("[data-up]").forEach(b => b.onclick = () => { const k = +b.dataset.up; [medias[k - 1], medias[k]] = [medias[k], medias[k - 1]]; drawMedias(); });
    $("medias").querySelectorAll("[data-dn]").forEach(b => b.onclick = () => { const k = +b.dataset.dn; [medias[k + 1], medias[k]] = [medias[k], medias[k + 1]]; drawMedias(); });
  };
  drawMedias();
  const redo = () => adminEvents(box);
  if ($("cn")) $("cn").onclick = redo;
  box.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => { adminEvents(box, b.dataset.ed); scrollTo({ top: 0 }); });
  box.querySelectorAll("[data-hide]").forEach(b => b.onclick = async () => {
    const e = data.find(x => x.id === b.dataset.hide);
    const { error } = await sb.from("events").update({ active: !e.active }).eq("id", e.id);
    if (error) return alert("Action impossible : " + error.message);
    redo();
  });
  box.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    const e = data.find(x => x.id === b.dataset.del);
    const { count } = await sb.from("orders").select("id", { count: "exact", head: true }).eq("event_id", e.id);
    const warn = count ? `\n\nATTENTION : ${count} commande(s) et leurs billets seront aussi supprimés. Pour seulement retirer l'événement du site, utilise plutôt « Masquer ».` : "";
    if (!confirm(`Supprimer définitivement « ${e.title} » ?${warn}`)) return;
    const { error } = await sb.from("events").delete().eq("id", e.id);
    if (error) return alert("Suppression impossible : " + error.message);
    redo();
  });
  $("f").onsubmit = async ev => {
    ev.preventDefault();
    const btn = $("sv"); btn.disabled = true;
    const fail = m => { $("err").innerHTML = flash(m); btn.disabled = false; };
    const tiers = $("tiers").value.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const [prix, du, au] = l.split(";"); return { prix: +prix, du: (du || "").trim(), au: (au || "").trim() }; });
    const row = { title: $("t").value, tagline: $("s").value || null, slug: $("slug").value, starts_at: $("d").value + ":00Z", sales_open: $("o").value + ":00Z", venue: $("v").value, dress_code: $("dc").value, color: $("col").value, pay_number: $("pay").value, audience: $("aud").value, capacity: +$("cap").value, tiers };
    const files = [...$("bg").files];
    if (medias.length + files.length > 8) return fail("8 fonds maximum : retire-en quelques-uns avant d'en ajouter.");
    const kinds = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };
    for (const f of files) {
      if (!kinds[f.type]) return fail(`« ${f.name} » : format non accepté (JPG, PNG, WebP, MP4 ou WebM).`);
      if (f.size > 40 * 1024 * 1024) return fail(`« ${f.name} » est trop lourd (40 Mo maximum).`);
    }
    const label = ed ? "Enregistrer les modifications" : "Créer l'événement";
    const added = [];
    for (let k = 0; k < files.length; k++) {
      btn.textContent = `Envoi du fond ${k + 1}/${files.length}…`;
      const f = files[k], path = `${crypto.randomUUID()}.${kinds[f.type]}`;
      const up = await sb.storage.from("event-media").upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) { btn.textContent = label; return fail("Envoi du fond impossible : " + up.error.message); }
      added.push({ url: sb.storage.from("event-media").getPublicUrl(path).data.publicUrl, kind: f.type.startsWith("video") ? "video" : "image" });
    }
    btn.textContent = label;
    medias = medias.concat(added);
    row.bg_media = medias; row.bg_url = medias[0]?.url ?? null; row.bg_kind = medias[0]?.kind ?? null;
    const { error } = ed ? await sb.from("events").update(row).eq("id", ed.id) : await sb.from("events").insert(row);
    if (error) {
      const m = error.message || "";
      let why = "vérifie les champs (lien unique, paliers au format prix;début;fin, billetterie avant l'événement).";
      if (/row-level security|permission denied/i.test(m)) why = "ton compte n'a pas le droit (il faut être administrateur avec la double authentification, puis te reconnecter).";
      else if (/duplicate key|events_slug_key/i.test(m)) why = "ce lien existe déjà, change l'adresse du lien.";
      else if (/events_check|sales_open/i.test(m)) why = "la billetterie doit s'ouvrir AVANT la date de l'événement.";
      else if (/valid_tiers|tiers/i.test(m)) why = "paliers invalides. Format exact : 2000;2026-11-10;2026-11-20 (une ligne par palier, prix > 0).";
      else if (/slug/i.test(m)) why = "lien invalide : minuscules, chiffres et tirets seulement (ex : soiree-amapiano).";
      else if (/bg_media|bg_/i.test(m)) why = "la base n'est pas à jour : lance d'abord le fichier migration_v3.sql dans Supabase.";
      return fail((ed ? "Modification" : "Création") + " impossible : " + why + " [" + m + "]");
    }
    const names = removed.map(u => u.split("/event-media/")[1]).filter(Boolean);
    if (names.length) sb.storage.from("event-media").remove(names).catch(() => {}); // nettoyage, sans bloquer
    btn.disabled = false; confetti(); redo();
  };
}

async function adminAccounts(box) {
  const { data: users } = await sb.from("profiles").select("*").neq("role", "admin").order("created_at", { ascending: false }).limit(300);
  const list = users || [];
  box.innerHTML = `<div class="stats"><div><b>${list.length}</b>comptes</div><div><b>${list.filter(u => u.account_type === "student").length}</b>étudiants</div><div><b>${list.filter(u => u.blocked).length}</b>bloqués</div></div>
    <label>Rechercher un nom ou un numéro<input id="q" autocomplete="off"></label><div id="ul"></div>`;
  const draw = () => {
    const q = sansAccent($("q").value), d = $("q").value.replace(/\D/g, "");
    const f = list.filter(u => !q && !d || (q && sansAccent(u.full_name).includes(q)) || (d.length >= 3 && String(u.phone).includes(d)));
    $("ul").innerHTML = f.map(u => `<div class="carte"><div class="ligne"><span><b>${esc(u.full_name)}</b> · ${esc(TYPES[u.account_type])}<br><span class="petit-texte">${esc(u.phone)} · inscrit le ${dts(u.created_at)}</span>
      ${u.blocked ? ` <span class="badge blocked">Bloqué</span>` : ""}</span><button class="petit ${u.blocked ? "" : "danger"}" data-b="${u.blocked ? 0 : 1}" data-id="${u.id}">${u.blocked ? "Débloquer" : "Bloquer"}</button></div></div>`).join("") || "<p>Aucun compte.</p>";
    $("ul").querySelectorAll("[data-b]").forEach(b => b.onclick = async () => { const r = await rpc("admin_block_user", { p_profile: b.dataset.id, p_blocked: b.dataset.b === "1" }); if (r.error) alert(r.error); adminPage(); });
  };
  $("q").oninput = draw; draw();
}

/* ---------- Contrôle d'entrée ---------- */
let audioCtx = null;
function bip(ok) {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = ok ? 880 : 220; g.gain.value = .15; o.start(); o.stop(audioCtx.currentTime + (ok ? .15 : .45)); } catch { /* pas de son */ }
  navigator.vibrate?.(ok ? 120 : [200, 100, 200]);
}
function scanHtml(d) {
  if (!d.found) return `<div class="scanres ko"><b>CODE INCONNU</b><span>Ce billet n'existe pas.</span></div>`;
  const ok = d.result === "entered", valid = d.result === "valid";
  const titre = { entered: "ENTRÉE VALIDÉE", valid: "BILLET VALIDE", already_used: "DÉJÀ UTILISÉ", cancelled: "BILLET ANNULÉ" }[d.result];
  const sous = d.result === "already_used" ? `Déjà entré à ${dts(d.used_at)} : refuser l'entrée.` : d.result === "cancelled" ? "Refuser l'entrée." : "";
  return `<div class="scanres ${ok || valid ? "ok" : "ko"}"><b>${titre}</b>${sous ? `<span>${esc(sous)}</span>` : ""}
    <div class="scanbig">${esc(d.entered)} / ${esc(d.total)} entrées</div></div>
    <div class="carte"><b style="font-size:1.2rem">${esc(d.holder)}</b><div class="scroll"><table class="cmp">
      <tr><th>Téléphone</th><td>${esc(d.phone)}</td></tr><tr><th>Type</th><td>${esc(TYPES[d.account_type])}</td></tr>
      <tr><th>Événement</th><td>${esc(d.event)}</td></tr><tr><th>Commande</th><td>${esc(d.order_code)} (${esc(d.qty)} billet(s))</td></tr></table></div>
    ${d.account_type === "student" && (ok || valid) ? `<p class="petit-texte">Étudiant déclaré : demande la carte d'étudiant si besoin.</p>` : ""}
    ${valid ? `<button class="plein" id="use">Valider l'entrée</button>` : ""}</div>`;
}

/* Page ouverte quand on scanne le QR d'un billet avec l'appareil photo du téléphone */
async function ticketPage(code) {
  code = String(code || "").replace(/[^A-Za-z0-9]/g, "");
  const wrap = h => show(`<div class="wrap" style="max-width:520px"><div class="grandlogo">${logo()}</div>${h}</div>`);
  if (!me) return wrap(`<h1 class="mini">Billet IPNET Events</h1><br><p style="margin-bottom:1rem">Ceci est un billet. Il se valide à l'entrée, par l'équipe de contrôle.</p>
    <a class="btn plein" href="#/login">Je suis du contrôle : me connecter</a>`);
  if (profile?.role !== "admin") return wrap(`<h1 class="mini">Billet IPNET Events</h1><br><p>Ce billet est à présenter à l'entrée. Seule l'équipe de contrôle peut le valider.</p>`);
  startIdle();
  wrap(`<p>Vérification du billet…</p>`);
  const r = await rpc("admin_scan_ticket", { p_code: code, p_mark: true });
  if (r.error) return wrap(flash(r.error));
  wrap(`${scanHtml(r.data)}<div class="ligne g" style="margin-top:1rem"><a class="btn" href="#/admin">Ouvrir le scanner</a></div>
    <p class="petit-texte" style="margin-top:1rem">Pour le billet suivant, scanne simplement son QR avec l'appareil photo.</p>`);
  if (r.data.found) { bip(r.data.result === "entered"); if (r.data.result === "entered") confetti(); }
}

function adminScan(box) {
  box.innerHTML = `<div id="stats"></div>
    <div class="carte"><p class="petit-texte" style="margin-bottom:.8rem">Astuce : tu peux aussi scanner les QR avec l'appareil photo normal du téléphone, la page de validation s'ouvre toute seule.</p>
    <label class="radio"><input type="checkbox" id="auto" checked> Valider l'entrée automatiquement au scan</label>
    <div class="ligne g"><button class="plein" id="cam">Ouvrir le scanner</button><button type="button" id="camoff" hidden>Arrêter la caméra</button></div><div id="camz"></div>
    <form id="f" style="margin-top:1rem"><label>Ou saisis le code du billet<input id="code" autocomplete="off" required></label><button>Vérifier</button></form></div>
    <div id="res"></div>`;
  const res = $("res");
  let last = "", lastT = 0, busy = false;

  async function loadStats() {
    const r = await rpc("admin_entry_stats", {});
    if (!$("stats") || r.error) return;
    $("stats").innerHTML = `<div class="stats">` + (r.data || []).map(s => `<div><b>${s.entered} / ${s.total}</b>entrées · ${esc(s.event)}<br>${Math.max(0, s.total - s.entered)} à venir</div>`).join("") + `</div>`;
  }
  loadStats(); clearInterval(timer); timer = setInterval(loadStats, 8000);

  function render(d, code) {
    bip(d.found && (d.result === "entered" || d.result === "valid"));
    res.innerHTML = scanHtml(d);
    if ($("use")) $("use").onclick = async () => { const u = await rpc("admin_scan_ticket", { p_code: code, p_mark: true }); if (u.error) res.innerHTML = flash(u.error); else { render(u.data, code); confetti(); loadStats(); } };
    if (d.result === "entered") confetti();
  }
  async function scan(raw) {
    const code = codeOf(raw);
    if (busy || !code) return; busy = true;
    try {
      const r = await rpc("admin_scan_ticket", { p_code: code, p_mark: $("auto").checked });
      if (r.error) res.innerHTML = flash(`${r.error} [${r.raw || ""}] · lu : ${code}`); else { render(r.data, code); loadStats(); }
    } finally { busy = false; }
  }
  $("f").onsubmit = ev => { ev.preventDefault(); scan($("code").value); };

  $("camoff").onclick = () => { stopCam(); $("camz").innerHTML = ""; $("camoff").hidden = true; $("cam").hidden = false; };
  $("cam").onclick = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return $("camz").innerHTML = flash("Ce navigateur ne permet pas d'utiliser la caméra. Scanne avec l'appareil photo du téléphone ou saisis le code.");
    if (typeof jsQR === "undefined") return $("camz").innerHTML = flash("Le fichier jsQR.js est absent du site. Ajoute-le sur GitHub (au même niveau que index.html), puis recharge la page.");
    try {
      stopCam();
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      $("camz").innerHTML = `<div class="viseur"><video class="cam" id="vid" playsinline muted autoplay></video><i></i></div><p class="petit-texte" id="etat">Recherche d'un QR code…</p>`;
      $("cam").hidden = true; $("camoff").hidden = false;
      const v = $("vid"); v.srcObject = camStream; await v.play();
      const cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
      let det = null;
      try { if ("BarcodeDetector" in window && (await BarcodeDetector.getSupportedFormats()).includes("qr_code")) det = new BarcodeDetector({ formats: ["qr_code"] }); } catch { det = null; }
      const lire = async () => {
        if (det) { try { const c = await det.detect(v); if (c[0]?.rawValue) return c[0].rawValue; } catch { det = null; } }
        const k = Math.min(1, 960 / v.videoWidth); cv.width = v.videoWidth * k | 0; cv.height = v.videoHeight * k | 0;
        cx.drawImage(v, 0, 0, cv.width, cv.height);
        const img = cx.getImageData(0, 0, cv.width, cv.height);
        return jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data || "";
      };
      camTimer = setInterval(async () => {
        if (!v.videoWidth || busy) return;
        let raw = "";
        try { raw = await lire(); } catch (e) { if ($("etat")) $("etat").textContent = "Erreur de lecture : " + e.message; return; }
        const code = codeOf(raw);
        if (!code) return;
        if (code === last && Date.now() - lastT < 6000) return; // même billet encore devant la caméra
        last = code; lastT = Date.now();
        if ($("etat")) $("etat").textContent = "QR lu : " + raw.slice(0, 60);
        scan(code);
      }, 150);
    } catch (e) { $("camz").innerHTML = flash("Impossible d'accéder à la caméra (" + (e.name || "erreur") + "). Autorise-la dans le navigateur, ou saisis le code à la main."); }
  };
}

async function adminReset(box) {
  const cnt = async (t, f) => { let q = sb.from(t).select("id", { count: "exact", head: true }); if (f) q = f(q); return (await q).count ?? 0; };
  const [nT, nO, nE, nU, nA, nL] = await Promise.all([cnt("tickets"), cnt("orders"), cnt("events"), cnt("profiles", q => q.neq("role", "admin")), cnt("alerts"), cnt("admin_log")]);
  const actions = [
    ["journal", "Journal et alertes", `${nL} ligne(s) de journal et ${nA} alerte(s) effacées.`],
    ["commandes", "Commandes, billets et rapprochement", `${nO} commande(s), ${nT} billet(s) et les captures de paiement effacés. Le rapprochement et les compteurs d'entrées repartent à zéro. Les événements et les comptes sont gardés.`],
    ["comptes", "Comptes clients", `${nU} compte(s) clients effacés, avec leurs commandes et billets. Les administrateurs sont gardés.`],
    ["evenements", "Événements", `${nE} événement(s) effacés, avec leurs commandes, billets et fonds d'écran.`],
    ["tout", "TOUT réinitialiser", "Journal, alertes, commandes, billets, comptes clients et événements : le site repart à neuf. Seuls les administrateurs sont gardés."]
  ];
  box.innerHTML = `<p class="petit-texte" style="margin-bottom:1rem">Ces actions sont définitives. Pour confirmer, tape <b>REINITIALISER</b> dans le champ de l'action voulue.</p>` +
    actions.map(([k, t, d]) => `<div class="carte ${k === "tout" ? "pay" : ""}"><b>${t}</b><p class="petit-texte" style="margin:.4rem 0 .8rem">${d}</p>
      <div class="ligne g"><input id="c-${k}" autocomplete="off" placeholder="REINITIALISER" style="margin:0;max-width:14rem"><button class="petit danger" data-r="${k}">${k === "tout" ? "Tout effacer" : "Effacer"}</button></div></div>`).join("") + `<div id="rres"></div>`;
  box.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => {
    const k = b.dataset.r, out = $("rres");
    if ($("c-" + k).value.trim().toUpperCase() !== "REINITIALISER") return out.innerHTML = flash("Tape REINITIALISER dans le champ de cette action pour confirmer.");
    if (!confirm("Dernière confirmation : cette action est définitive. Continuer ?")) return;
    b.disabled = true; out.innerHTML = flash("Effacement en cours…", true);
    // fichiers à nettoyer côté stockage (captures de paiement, fonds d'événements), récupérés avant l'effacement
    const proofs = ["commandes", "comptes", "evenements", "tout"].includes(k) ? ((await sb.from("orders").select("proof_path").limit(5000)).data || []).map(o => o.proof_path).filter(Boolean) : [];
    const media = ["evenements", "tout"].includes(k) ? ((await sb.from("events").select("bg_media,bg_url")).data || []).flatMap(e => [...(e.bg_media || []).map(m => m.url), e.bg_url]).map(u => String(u || "").split("/event-media/")[1]).filter(Boolean) : [];
    const r = await rpc("admin_reset", { p_scope: k });
    if (r.error) { b.disabled = false; return out.innerHTML = flash(`${r.error} [${r.raw || ""}]`); }
    const rm = async (bucket, names) => { for (let i = 0; i < names.length; i += 100) await sb.storage.from(bucket).remove(names.slice(i, i + 100)).catch(() => {}); };
    await rm("proofs", proofs); await rm("event-media", media);
    confetti(); out.innerHTML = flash("Réinitialisation terminée.", true);
    setTimeout(() => adminPage(), 1200);
  });
}

async function adminRecon(box) {
  const [{ data: evs }, { data: ords }] = await Promise.all([
    sb.from("events").select("id,title,starts_at,capacity").order("starts_at", { ascending: false }),
    sb.from("orders").select("*, profiles!orders_user_id_fkey(full_name,phone)").eq("status", "confirmed")
  ]);
  box.innerHTML = `<p class="petit-texte" style="margin-bottom:1rem">Compare le total attendu avec le total réellement reçu dans Mixx by Yas. Un écart révèle une erreur ou une fraude.</p>` +
    (evs || []).map(e => {
      const o = (ords || []).filter(x => x.event_id === e.id);
      return `<div class="carte"><b>${esc(e.title)}</b><div class="stats" style="margin:.8rem 0 0"><div><b>${o.reduce((n, x) => n + x.qty, 0)} / ${e.capacity}</b>billets confirmés</div>
        <div><b>${fmt(o.reduce((n, x) => n + x.total, 0))}</b>total attendu</div><div><b>${o.length}</b>commandes</div></div>
        <button class="petit" style="margin-top:.8rem" data-exp="${e.id}">Exporter en CSV</button></div>`;
    }).join("");
  box.querySelectorAll("[data-exp]").forEach(b => b.onclick = () => {
    const ev = evs.find(x => x.id === b.dataset.exp), rows = [["Nom", "Téléphone", "Numéro payeur", "Référence", "Code commande", "Billets", "Total", "Date"]];
    (ords || []).filter(x => x.event_id === ev.id).forEach(x => rows.push([x.profiles?.full_name, x.profiles?.phone, x.pay_phone, x.reference, x.order_code, x.qty, x.total, x.created_at]));
    download("commandes-" + ev.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".csv", rows);
  });
}

async function adminLog(box) {
  const [{ data: al }, { data: lg0 }] = await Promise.all([
    sb.from("alerts").select("*, profiles:profile_id(full_name)").order("created_at", { ascending: false }).limit(50),
    sb.from("admin_log").select("*").order("created_at", { ascending: false }).limit(100)
  ]);
  const ids = [...new Set((lg0 || []).map(l => l.admin_id).filter(Boolean))];
  const names = ids.length ? Object.fromEntries(((await sb.from("profiles").select("id,full_name").in("id", ids)).data || []).map(p => [p.id, p.full_name])) : {};
  const lg = (lg0 || []).map(l => ({ ...l, profiles: { full_name: names[l.admin_id] } }));
  box.innerHTML = `<h2 style="margin-top:0">Alertes</h2>` + ((al || []).length ? al.map(a => `<div class="carte"><b>${esc(ALERTE[a.kind] || a.kind)}</b> · ${esc(a.profiles?.full_name || "")}<br>
    <span class="petit-texte">${esc(a.detail)} · ${dts(a.created_at)}</span></div>`).join("") : "<p>Aucune alerte.</p>") +
    `<h2>Journal des actions (non modifiable)</h2><div class="scroll"><table class="cmp"><tr><th>Date</th><th>Admin</th><th>Action</th></tr>` +
    (lg || []).map(l => `<tr><td>${dts(l.created_at)}</td><td>${esc(l.profiles?.full_name || "")}</td><td>${esc(l.action)} <span class="petit-texte">${esc(l.target || "")}</span></td></tr>`).join("") + `</table></div>`;
}
