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
const TYPES = { visitor: "Visiteur", student: "Étudiant IPNET", teacher: "Professeur" };
const VERIF = { none: "Non vérifié", pending: "En attente de vérification", verified: "Vérifié" };
const AUD = { all: "Ouvert à tous", ipnet: "Réservé IPNET (étudiants et professeurs vérifiés)", students: "Réservé aux étudiants IPNET vérifiés" };
const ALERTE = {
  matricule_deja_utilise: "Matricule déjà utilisé", reference_reutilisee: "Référence réutilisée",
  capture_reutilisee: "Capture réutilisée", numero_partage: "Numéro T-Money partagé",
  grosse_commande: "Grosse commande", compte_bloque_auto: "Blocage automatique"
};

const ERR = {
  email_ipnet_interdit: "Utilise ton email personnel, pas ton email IPNET.",
  email_jetable: "Les adresses email temporaires ne sont pas acceptées.",
  nom_invalide: "Prénom ou nom invalide.", telephone_invalide: "Numéro de téléphone invalide.",
  non_connecte: "Connecte-toi d'abord.", compte_bloque: "Ton compte est bloqué. Contacte un administrateur.",
  evenement_introuvable: "Cet événement n'existe pas.", ventes_fermees: "La vente n'est pas ouverte en ce moment.",
  reserve_ipnet: "Cet événement est réservé aux étudiants et professeurs IPNET vérifiés.",
  reserve_etudiants: "Cet événement est réservé aux étudiants IPNET vérifiés.",
  quantite_invalide: "Quantité invalide (1 à 10).", trop_de_commandes_en_attente: "Tu as déjà 3 commandes en attente. Attends leur validation.",
  aucun_tarif: "Aucun tarif n'est actif aujourd'hui.", complet: "Plus assez de places disponibles.",
  reference_invalide: "Référence de transaction invalide (6 à 40 lettres/chiffres).", numero_invalide: "Numéro T-Money invalide (8 chiffres).",
  code_invalide: "Code de commande invalide.", capture_invalide: "Capture de paiement invalide.",
  reference_deja_utilisee: "Cette référence de transaction a déjà servi pour une autre commande.",
  capture_deja_utilisee: "Cette capture a déjà été envoyée pour une autre commande.",
  code_deja_pris: "Le code de commande était déjà pris : un nouveau t'a été attribué, renvoie la commande.",
  interdit: "Action réservée aux administrateurs (double authentification requise).",
  deja_traitee: "Cette commande a déjà été traitée.", propre_commande: "Tu ne peux pas traiter ta propre commande.",
  demande_incomplete: "Demande incomplète.", matricule_deja_utilise: "Ce matricule ou cet email IPNET est déjà associé à un autre compte.",
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
  if (error) return { error: errMsg(error) };
  if (data && typeof data === "object" && data.error) return { error: errMsg(data.error), code: data.error };
  return { data };
};

let welcome = false, me = null, profile = null, timer = null, tab = "orders", ofilter = "pending";
let idle = null, idleReset = null, lastUid = null, rid = 0, notice = "", camStream = null, camTimer = null;

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
  const main = getComputedStyle(document.documentElement).getPropertyValue("--c").trim() || "#f796cb";
  const cols = [main, "#ffffff", "#ffd166", "#7cf5c9", "#8b7bff"];
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
const IPNET_RE = /^[a-z0-9-]+\.[a-z0-9-]+@ipnetinstitute\.com$/;
const baseUrl = () => location.origin + location.pathname;

/* ---------- Routage ---------- */
async function route() {
  const my = ++rid;
  clearInterval(timer); stopIdle(); stopCam();
  document.documentElement.style.setProperty("--c", "#f796cb");
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

  $("nav").innerHTML = `<b><a href="#/" style="text-decoration:none">${esc(SITE_NAME)}</a></b><span>` +
    (me ? `<a href="#/me">Mes billets</a>${profile?.role === "admin" ? `<a href="#/admin">Admin</a>` : ""}<a href="#" id="out">Déconnexion</a>`
        : `<a href="#/login">Connexion</a>`) + `</span>`;
  if ($("out")) $("out").onclick = async e => { e.preventDefault(); await sb.auth.signOut(); location.hash = "#/"; };

  const [, a, b] = location.hash.split("/");
  if (a === "e") return eventPage(b);
  if (a === "login") return me ? (location.hash = "#/") : loginPage(b);
  if (a === "reset") return resetPage();
  if (a === "mfa") return mfaPage();
  if (a === "me") return mePage();
  if (a === "admin") {
    if (!me) { location.hash = "#/login"; return; }
    if (profile?.role === "admin" && !aal2) { location.hash = "#/mfa"; return; }
    return adminPage();
  }
  return home();
}
addEventListener("hashchange", route);
sb.auth.onAuthStateChange((ev, s) => {
  if (ev === "PASSWORD_RECOVERY") { location.hash = "#/reset"; route(); return; }
  if (ev === "INITIAL_SESSION") { route(); return; }
  if (ev === "SIGNED_IN" && (s?.user?.id || null) !== lastUid) welcome = true;
  if (ev === "SIGNED_OUT" || ev === "MFA_CHALLENGE_VERIFIED" || (ev === "SIGNED_IN" && (s?.user?.id || null) !== lastUid)) route();
});

/* ---------- Accueil ---------- */
/* Fond de la page : image ou vidéo de l'événement + lumières animées */
function setBg(e) {
  let f = $("fond");
  if (!f) { f = document.createElement("div"); f.id = "fond"; f.setAttribute("aria-hidden", "true"); document.body.prepend(f); }
  if (!e) { f.innerHTML = ""; return; }
  const url = e.bg_url && /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(e.bg_url) ? e.bg_url : null;
  let media = "";
  if (url && e.bg_kind === "video" && !REDUCE) media = `<video src="${esc(url)}" autoplay muted loop playsinline preload="auto"></video>`;
  else if (url && e.bg_kind === "image") media = `<img src="${esc(url)}" alt="">`;
  f.innerHTML = media + `<div class="teinte"></div><i class="l1"></i><i class="l2"></i><i class="l3"></i>`;
  const v = f.querySelector("video"); if (v) v.play().catch(() => {});
}

/* Écran d'entrée juste après la connexion : l'événement en cours s'anime plein écran */
function splash(e) {
  welcome = false;
  if (REDUCE) return;
  const d = document.createElement("div"); d.className = "accueil";
  d.innerHTML = `<div><p class="petit-texte">Bienvenue${profile?.first_name ? " " + esc(profile.first_name) : ""}</p><h1>${esc(e.title)}</h1><p class="quand">${dt(e.starts_at)}${e.venue ? " · " + esc(e.venue) : ""}</p></div>`;
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
    <p class="sous">Réserve ta place, paie par T-Money et reçois ton billet avec QR code.</p></div></div>
    <div class="wrap"><h2>À venir</h2>` +
    (data?.length ? data.map(e => `<a class="carte ev rv" style="--ec:${esc(e.color)}" href="#/e/${esc(e.slug)}"><b>${esc(e.title)}</b>
      <span class="badge none" style="margin-left:.5rem">${e.audience === "all" ? "Ouvert à tous" : "IPNET"}</span><br>${dt(e.starts_at)} · ${esc(e.venue || "Lieu bientôt annoncé")}</a>`).join("")
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
  const v = p.verification_status === "verified";
  if (e.audience === "ipnet" && !(["student", "teacher"].includes(p.account_type) && v)) return { ok: false, why: "ipnet" };
  if (e.audience === "students" && !(p.account_type === "student" && v)) return { ok: false, why: "students" };
  return { ok: true };
}
const genCode = () => "IPN-" + String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");

async function eventPage(slug, others) {
  const { data: e } = await sb.from("events").select("*").eq("slug", slug || "").maybeSingle();
  if (!e) { show(`<div class="wrap"><h1 class="mini">Introuvable</h1><p>Cet événement n'existe pas.</p></div>`); return; }
  document.documentElement.style.setProperty("--c", e.color || "#f796cb");
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
      ipnet: `${flash("Cet événement est réservé aux étudiants et professeurs IPNET dont le statut est vérifié.")}${profile?.account_type !== "visitor" ? `<button class="plein" id="vf">Vérifier mon statut</button>` : ""}`,
      students: `${flash("Cet événement est réservé aux étudiants IPNET dont le statut est vérifié.")}${profile?.account_type === "student" ? `<button class="plein" id="vf">Vérifier mon statut</button>` : ""}`
    };
    zone.innerHTML = msgs[el.why];
    if ($("vf")) $("vf").onclick = verifModal;
    return;
  }

  let code = genCode();
  zone.innerHTML = `<form id="f" class="carte">
    <label>Nombre de billets<input type="number" id="qty" min="1" max="10" value="1" required></label>
    <p>Total à payer : <b id="tot">${fmt(p0.prix)}</b> <span class="petit-texte">(le prix final est fixé par le serveur)</span></p><br>
    <div class="carte pay"><b>Comment payer :</b><br>Envoie le montant par <b>T-Money</b> au <b>${esc(e.pay_number)}</b>.<br>
      Code de commande : <b id="oc">${code}</b> — écris-le dans le motif du paiement si T-Money le permet.<br>
      Ensuite remplis les champs ci-dessous. Ton billet sera disponible après vérification.</div>
    <label>Numéro T-Money avec lequel tu as payé<input id="pn" type="tel" inputmode="numeric" placeholder="90123456" required></label>
    <label>Référence de la transaction (dans le SMS de confirmation)<input id="ref" required minlength="6" maxlength="40" autocomplete="off"></label>
    <label>Capture d'écran du paiement (JPG, PNG ou WebP, 5 Mo max)<input type="file" id="img" accept="image/jpeg,image/png,image/webp" required></label>
    <button class="plein" id="go">Envoyer ma commande</button><div id="err" style="margin-top:1rem"></div></form>`;
  $("qty").oninput = () => $("tot").textContent = fmt(p0.prix * Math.min(10, Math.max(1, +$("qty").value || 1)));
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
  aud = ["all", "ipnet", "students"].includes(aud) ? aud : "all";
  let mode = "login";
  const typesOk = { all: ["visitor", "student", "teacher"], ipnet: ["student", "teacher"], students: ["student"] }[aud];
  const draw = (m = "") => {
    const titre = { login: "Connexion", signup: "Créer un compte", forgot: "Mot de passe oublié" }[mode];
    show(`<div class="wrap" style="max-width:480px"><h1 class="mini">${titre}</h1><br><div id="m">${m}</div>
      <form id="f" novalidate>
      ${mode === "signup" ? `
        <label>Prénom<input id="pn" autocomplete="given-name" required maxlength="60"></label>
        <label>Nom<input id="nm" autocomplete="family-name" required maxlength="60"></label>
        <label>Téléphone (+228 suivi de 8 chiffres)<input id="tel" type="tel" autocomplete="tel" placeholder="+228 90 12 34 56" required></label>
        <fieldset><legend>Je suis</legend>${typesOk.map((t, i) => `<label class="radio"><input type="radio" name="tp" value="${t}" ${i === 0 ? "checked" : ""}>${TYPES[t]}${t === "visitor" ? "" : " <span class='petit-texte'>(statut à vérifier après la connexion)</span>"}</label>`).join("")}</fieldset>` : ""}
      <label>Email personnel<input id="mail" type="email" autocomplete="email" required></label>
      ${mode === "signup" ? `<p class="petit-texte" style="margin-top:-.6rem;margin-bottom:1rem">Utilise ton email personnel, jamais ton email IPNET. Un lien de confirmation te sera envoyé.</p>` : ""}
      ${mode !== "forgot" ? `<label>Mot de passe<input id="pw" type="password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required></label>` : ""}
      ${mode === "signup" ? `<p class="petit-texte" style="margin-top:-.6rem;margin-bottom:1rem">10 caractères minimum, avec majuscule, minuscule, chiffre et symbole (ex : ! ? @ #).</p>` : ""}
      <div id="cap" style="margin-bottom:1rem"></div>
      <button class="plein" id="go">${{ login: "Me connecter", signup: "Créer mon compte", forgot: "Envoyer le lien" }[mode]}</button></form><br>
      ${mode === "login" ? `<a href="#" data-m="forgot">Mot de passe oublié ?</a><br><br><a href="#" data-m="signup">Pas de compte ? S'inscrire</a>` : `<a href="#" data-m="login">J'ai déjà un compte</a>`}</div>`);
    document.querySelectorAll("[data-m]").forEach(a => a.onclick = ev => { ev.preventDefault(); mode = a.dataset.m; draw(); });
    boot();
  };
  async function boot() {
    const cap = await captcha($("cap"));
    const say = (t, ok) => $("m").innerHTML = flash(t, ok);
    $("f").onsubmit = async ev => {
      ev.preventDefault();
      const go = $("go"); const email = $("mail").value.trim().toLowerCase();
      const token = cap.token();
      if (cap.on && !token) return say("Valide le test anti-robot.");
      go.disabled = true;
      const done = () => { go.disabled = false; cap.reset(); };
      if (mode === "forgot") {
        await sb.auth.resetPasswordForEmail(email, { redirectTo: baseUrl(), captchaToken: token });
        done(); return say("Si cette adresse existe, un lien a été envoyé.", true);
      }
      const password = $("pw").value;
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken: token } });
        if (!error) { welcome = true; location.hash = "#/"; route(); return; }
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
      if (/@ipnetinstitute\.com$/i.test(email)) return bad("Utilise ton email personnel, pas ton email IPNET.");
      if (!typesOk.includes(type)) return bad("Choisis ton type de compte.");
      if (!pwOk(password)) return bad("Mot de passe trop faible : 10 caractères minimum avec majuscule, minuscule, chiffre et symbole (ex : ! ? @ #).");
      if (await pwned(password)) return bad("Ce mot de passe apparaît dans des fuites connues. Choisis-en un autre.");
      const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: baseUrl(), captchaToken: token, data: { first_name: first, last_name: last, phone, account_type: type } } });
      done();
      if (error) return say(error.status === 429 ? ERR["rate limit"] : "Inscription impossible. Vérifie tes informations (email personnel valide, nom, téléphone).");
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
    location.hash = "#/admin"; route();
  };
}

/* ---------- Vérification du statut (étudiant / professeur) ---------- */
function closeModal() { modal.innerHTML = ""; document.removeEventListener("keydown", escClose); }
const escClose = ev => { if (ev.key === "Escape") closeModal(); };
function verifModal() {
  if (!profile || profile.account_type === "visitor") return;
  const stu = profile.account_type === "student";
  modal.innerHTML = `<div class="voile"><div class="boite" role="dialog" aria-modal="true" aria-labelledby="vt"><h2 id="vt">Vérifier mon statut</h2><div id="vm"></div><div id="vb"></div></div></div>`;
  document.addEventListener("keydown", escClose);
  const say = (t, ok) => $("vm").innerHTML = flash(t, ok);
  const finish = async (t, ok) => {
    profile = (await sb.from("profiles").select("*").eq("id", me.id).maybeSingle()).data;
    $("vm").innerHTML = ""; $("vb").innerHTML = `${flash(t, ok)}<button class="plein" id="x">Fermer</button>`;
    $("x").onclick = () => { closeModal(); route(); };
    if (ok) confetti();
  };
  let ipmail = "", mat = "";
  async function step1() {
    $("vb").innerHTML = `<p class="petit-texte" style="margin-bottom:1rem">Ton prénom et ton nom viennent de ton inscription. Ton email IPNET sert seulement à la vérification : il ne sert jamais à te connecter.</p>
      <form id="vf">${stu ? `<label>Matricule (sur ta carte d'étudiant)<input id="mat" autocomplete="off" required maxlength="25"></label>` : ""}
      <label>Email IPNET (prenom.nom@ipnetinstitute.com)<input id="ipm" type="email" autocomplete="off" required></label><div id="cap" style="margin-bottom:1rem"></div>
      <div class="ligne g"><button class="plein" id="go">Recevoir un code de confirmation</button><button type="button" id="cl">Annuler</button></div></form>
      <p class="petit-texte" style="margin-top:1rem">Un code est envoyé à ton email personnel pour confirmer que la demande vient bien de toi.</p>`;
    $("cl").onclick = closeModal;
    const cap = await captcha($("cap"));
    $("vf").onsubmit = async ev => {
      ev.preventDefault(); ipmail = $("ipm").value.trim().toLowerCase(); mat = stu ? $("mat").value.trim().toUpperCase() : "";
      if (!IPNET_RE.test(ipmail)) return say("L'email IPNET doit avoir la forme prenom.nom@ipnetinstitute.com.");
      const token = cap.token(); if (cap.on && !token) return say("Valide le test anti-robot.");
      $("go").disabled = true;
      const { error } = await sb.auth.signInWithOtp({ email: me.email, options: { shouldCreateUser: false, captchaToken: token } });
      if (error) { $("go").disabled = false; cap.reset(); return say(error.status === 429 ? ERR["rate limit"] : "Impossible d'envoyer le code. Réessaie plus tard."); }
      step2();
    };
  }
  function step2() {
    $("vm").innerHTML = "";
    $("vb").innerHTML = `${flash("Un code a été envoyé à ton email personnel.", true)}<form id="vf"><label>Code reçu par email<input id="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label>
      <div class="ligne g"><button class="plein" id="go">Confirmer</button><button type="button" id="cl">Annuler</button></div></form>`;
    $("cl").onclick = closeModal;
    $("vf").onsubmit = async ev => {
      ev.preventDefault(); $("go").disabled = true;
      const v = await sb.auth.verifyOtp({ email: me.email, token: $("otp").value.trim(), type: "email" });
      if (v.error) { $("go").disabled = false; return say("Code incorrect ou expiré."); }
      const r = await sb.rpc("submit_verification", { p_matricule: mat, p_ipnet_email: ipmail });
      const out = r.error ? "refuse" : r.data;
      if (out === "verified") return finish("Ton compte est vérifié !", true);
      if (out === "pending") return finish("Demande reçue. Un administrateur va la vérifier.", true);
      if (out === "verrouille") return finish("Trop d'essais. Contacte un administrateur.", false);
      if (out === "email_code") return finish("Le code n'a pas pu être confirmé. Recommence.", false);
      return finish("Vérification refusée. Contrôle tes informations ou contacte un administrateur.", false);
    };
  }
  step1();
}

/* ---------- Dashboard utilisateur ---------- */
async function mePage() {
  if (!me) { location.hash = "#/login"; return; }
  const { data } = await sb.from("orders").select("*, events(title,starts_at,venue), tickets(id,code,status)").eq("user_id", me.id).order("created_at", { ascending: false });
  const p = profile || {};
  const n = notice; notice = "";
  const aVerifier = p.account_type && p.account_type !== "visitor" && p.verification_status !== "verified";
  show(`<div class="wrap"><h1 class="mini">Bonjour ${esc(p.first_name || "")}</h1><br>${n ? flash(n, true) : ""}
    <div class="carte"><div class="ligne"><span><b>${esc(p.full_name || "")}</b> · ${esc(TYPES[p.account_type] || "")}</span>
      ${p.account_type !== "visitor" ? `<span class="badge ${esc(p.verification_status)}">${esc(VERIF[p.verification_status] || "")}</span>` : ""}</div>
      ${p.blocked ? flash("Ton compte est bloqué. Contacte un administrateur.") : ""}
      ${aVerifier && p.verification_status === "none" ? `<p style="margin:.8rem 0">Vérifie ton statut pour acheter des billets réservés à IPNET.</p>` : ""}
      ${p.verification_status === "pending" ? `<p style="margin:.8rem 0" class="petit-texte">Ta demande est en cours d'examen par un administrateur.</p>` : ""}
      <div class="ligne g" style="margin-top:.8rem">${aVerifier && p.verification_status === "none" ? `<button class="plein petit" id="vf">Vérifier mon statut</button>` : ""}
      <button class="petit" id="all">Me déconnecter partout</button></div></div>
    <h2>Mes commandes</h2>` +
    (data?.length ? data.map(o => `<div class="carte rv"><div class="ligne"><b>${esc(o.events.title)}</b><span class="badge ${o.status}">${STATUT[o.status]}</span></div>
      <p>${o.qty} billet(s) · ${fmt(o.total)} · ${dt(o.events.starts_at)}<br><span class="petit-texte">Code de commande ${esc(o.order_code)}</span></p>
      ${o.status === "confirmed" ? `<div class="billets">${(o.tickets || []).map(t => `<div class="billet ${t.status}"><div class="qr"><img alt="QR code du billet" width="170" height="170" data-qr="${esc(t.code)}"></div>
        <div><b>${esc(t.code)}</b></div><span class="badge ${t.status}">${BILLET[t.status]}</span></div>`).join("")}</div>
        <p class="petit-texte" style="margin-top:.6rem">Un QR code par billet : chaque billet n'est valable qu'une seule fois.</p>` : ""}
      ${o.status === "rejected" ? `<p>Paiement non reconnu. Vérifie le montant et recommence avec une capture claire.</p>` : ""}</div>`).join("")
      : `<p>Tu n'as pas encore de commande. <a href="#/">Voir les événements</a></p>`) + `</div>`);
  document.querySelectorAll("[data-qr]").forEach(async i => { try { i.src = await QRCode.toDataURL(i.dataset.qr, { width: 170, margin: 1 }); } catch (e) { i.replaceWith(document.createTextNode("QR indisponible : donne le code ci-dessous à l'entrée.")); } });
  if ($("vf")) $("vf").onclick = verifModal;
  $("all").onclick = async () => { await sb.auth.signOut({ scope: "global" }); location.hash = "#/login"; };
  if (aVerifier && p.verification_status === "none" && !sessionStorage.getItem("vf-ask")) { sessionStorage.setItem("vf-ask", "1"); verifModal(); }
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
  startIdle();
  const onglets = [["orders", "Commandes"], ["events", "Événements"], ["accounts", "Comptes à vérifier"], ["scan", "Contrôle d'entrée"], ["recon", "Rapprochement"], ["log", "Alertes et journal"]];
  show(`<div class="wrap"><h1 class="mini">Administration</h1><br><div class="onglets">` +
    onglets.map(o => `<button class="${tab === o[0] ? "on" : ""}" data-t="${o[0]}">${o[1]}</button>`).join("") + `</div><div id="panel"></div></div>`);
  document.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { tab = b.dataset.t; stopCam(); adminPage(); });
  ({ orders: adminOrders, events: adminEvents, accounts: adminAccounts, scan: adminScan, recon: adminRecon, log: adminLog })[tab]($("panel"));
}

async function adminOrders(box) {
  const { data: all, error: oerr } = await sb.from("orders").select("*, events(title), profiles!orders_user_id_fkey(full_name,phone,account_type,verification_status), tickets(id,code,status)").order("created_at", { ascending: false }).limit(300);
  if (oerr) { box.innerHTML = flash("Impossible de charger les commandes : " + oerr.message); return; }
  const data = all || [], ok = data.filter(o => o.status === "confirmed");
  const list = ofilter === "all" ? data : data.filter(o => o.status === ofilter);
  box.innerHTML = `<div class="stats"><div><b>${data.filter(o => o.status === "pending").length}</b>à valider</div>
    <div><b>${ok.reduce((n, o) => n + o.qty, 0)}</b>billets confirmés</div><div><b>${fmt(ok.reduce((n, o) => n + o.total, 0))}</b>encaissé</div></div>
    <label>Afficher<select id="flt">${[["pending", "À valider"], ["confirmed", "Confirmées"], ["rejected", "Refusées"], ["all", "Toutes"]].map(([v, l]) => `<option value="${v}" ${ofilter === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>` +
    (list.length ? list.map(o => `<div class="carte"><div class="ligne"><b>${esc(o.profiles?.full_name)} · ${esc(o.profiles?.phone)}</b><span class="badge ${o.status}">${STATUT[o.status]}</span></div>
      <p class="petit-texte">${esc(TYPES[o.profiles?.account_type])} · ${esc(VERIF[o.profiles?.verification_status])} · ${esc(o.events.title)} · ${o.qty} billet(s)</p>
      <div class="scroll"><table class="cmp"><tr><th>Montant à retrouver</th><td><b>${fmt(o.total)}</b> (${o.qty} × ${fmt(o.unit_price)})</td></tr>
        <tr><th>Référence T-Money</th><td>${esc(o.reference)}</td></tr><tr><th>Numéro payeur</th><td>${esc(o.pay_phone)}</td></tr>
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
  box.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => { if (confirm("Confirmer cette commande ?\nVérifie d'abord que l'argent est bien arrivé dans T-Money (montant, référence, numéro).")) act("admin_decide_order", { p_order: b.dataset.ok, p_decision: "confirm" }, "confetti"); });
  box.querySelectorAll("[data-no]").forEach(b => b.onclick = () => { if (confirm("Refuser cette commande ?")) act("admin_decide_order", { p_order: b.dataset.no, p_decision: "reject" }); });
  box.querySelectorAll("[data-cancel]").forEach(b => b.onclick = () => { if (confirm("Annuler ce billet ? Il sera refusé à l'entrée.")) act("admin_cancel_ticket", { p_ticket: b.dataset.cancel }); });
}

async function adminEvents(box, editId) {
  const { data } = await sb.from("events").select("*").order("starts_at", { ascending: false });
  const ed = editId ? (data || []).find(x => x.id === editId) : null;
  const loc = s => (s || "").slice(0, 16);
  const tiersTxt = (ed?.tiers || []).map(t => `${t.prix};${t.du};${t.au}`).join("\n");
  const val = k => esc(ed?.[k] ?? "");
  box.innerHTML = `<form id="f" class="carte"><b>${ed ? "Modifier : " + esc(ed.title) : "Nouvel événement"}</b><br><br>
    <label>Titre<input id="t" required maxlength="120" value="${val("title")}"></label><label>Slogan<input id="s" maxlength="200" value="${val("tagline")}"></label>
    <label>Adresse du lien (ex : pink-white)<input id="slug" pattern="[a-z0-9\\-]{2,60}" required value="${val("slug")}"></label>
    <label>Date et heure de l'événement<input id="d" type="datetime-local" required value="${loc(ed?.starts_at)}"></label>
    <label>Ouverture de la billetterie<input id="o" type="datetime-local" required value="${loc(ed?.sales_open)}"></label>
    <label>Lieu<input id="v" value="${val("venue")}"></label><label>Dress code<input id="dc" value="${val("dress_code")}"></label>
    <label>Couleur principale<input id="col" type="color" value="${esc(ed?.color || "#f796cb")}"></label>
    <label>Numéro T-Money pour le paiement<input id="pay" required value="${val("pay_number")}"></label>
    <label>Qui peut acheter ?<select id="aud"><option value="all">Tout le monde (visiteurs, étudiants, professeurs)</option><option value="ipnet">IPNET seulement (étudiants et professeurs vérifiés)</option><option value="students">Étudiants vérifiés seulement</option></select></label>
    <label>Nombre de places<input id="cap" type="number" min="1" value="${ed?.capacity ?? 200}" required></label>
    <label>Paliers de prix (une ligne par palier : prix;début;fin)<textarea id="tiers" rows="3" placeholder="5000;2026-11-17;2026-12-05&#10;7000;2026-12-06;2026-12-16">${esc(tiersTxt)}</textarea></label>
    <label>Fond de la page : image (JPG, PNG, WebP) ou courte vidéo (MP4, WebM, 40 Mo max)<input id="bg" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"></label>
    ${ed?.bg_url ? `<label class="radio"><input type="checkbox" id="nobg"> Retirer le fond actuel (${ed.bg_kind === "video" ? "vidéo" : "image"})</label>` : ""}
    <p class="petit-texte">Heures saisies en heure de Lomé (UTC). Conseil : vidéo de 10 à 20 secondes, sans son, moins de 10 Mo, pour que la page reste rapide sur téléphone.</p><br>
    <button class="plein" id="sv">${ed ? "Enregistrer les modifications" : "Créer l'événement"}</button>
    ${ed ? `<button type="button" id="cn">Annuler</button>` : ""}<div id="err" style="margin-top:1rem"></div></form>
    <h2>Événements existants</h2>` + (data || []).map(e => `<div class="carte"><div class="ligne"><span><b>${esc(e.title)}</b> · ${dt(e.starts_at)}${e.active ? "" : ` <span class="badge none">Masqué</span>`}<br>
    <span class="petit-texte">Lien : #/e/${esc(e.slug)} · ${esc(AUD[e.audience])} · ${e.capacity} places</span></span>
    <span class="ligne g"><button class="petit" data-ed="${e.id}">Modifier</button><button class="petit" data-hide="${e.id}">${e.active ? "Masquer" : "Afficher"}</button><button class="petit danger" data-del="${e.id}">Supprimer</button></span></div></div>`).join("");
  if (ed) $("aud").value = ed.audience;
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
    const file = $("bg").files[0];
    if (file) {
      const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" }[file.type];
      if (!ext) return fail("Fond : format non accepté (JPG, PNG, WebP, MP4 ou WebM).");
      if (file.size > 40 * 1024 * 1024) return fail("Fond : fichier trop lourd (40 Mo maximum).");
      btn.textContent = "Envoi du fond…";
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from("event-media").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { btn.textContent = ed ? "Enregistrer les modifications" : "Créer l'événement"; return fail("Envoi du fond impossible : " + up.error.message); }
      row.bg_url = sb.storage.from("event-media").getPublicUrl(path).data.publicUrl;
      row.bg_kind = file.type.startsWith("video") ? "video" : "image";
    } else if ($("nobg")?.checked) { row.bg_url = null; row.bg_kind = null; }
    const { error } = ed ? await sb.from("events").update(row).eq("id", ed.id) : await sb.from("events").insert(row);
    if (error) {
      const m = error.message || "";
      let why = "vérifie les champs (lien unique, paliers au format prix;début;fin, billetterie avant l'événement).";
      if (/row-level security|permission denied/i.test(m)) why = "ton compte n'a pas le droit (il faut être administrateur avec la double authentification, puis te reconnecter).";
      else if (/duplicate key|events_slug_key/i.test(m)) why = "ce lien existe déjà, change l'adresse du lien.";
      else if (/events_check|sales_open/i.test(m)) why = "la billetterie doit s'ouvrir AVANT la date de l'événement.";
      else if (/valid_tiers|tiers/i.test(m)) why = "paliers invalides. Format exact : 2000;2026-11-10;2026-11-20 (une ligne par palier, prix > 0).";
      else if (/slug/i.test(m)) why = "lien invalide : minuscules, chiffres et tirets seulement (ex : soiree-amapiano).";
      else if (/bg_/i.test(m)) why = "la base n'est pas à jour : lance d'abord le fichier migration_fond.sql dans Supabase.";
      return fail((ed ? "Modification" : "Création") + " impossible : " + why + " [" + m + "]");
    }
    btn.disabled = false; confetti(); redo();
  };
}

async function adminAccounts(box) {
  const [{ data: pend }, { data: users }] = await Promise.all([
    sb.from("profiles").select("*").eq("verification_status", "pending").order("created_at"),
    sb.from("profiles").select("*").neq("role", "admin").order("created_at", { ascending: false }).limit(100)
  ]);
  const mats = (pend || []).map(p => p.req_matricule).filter(Boolean);
  const reg = mats.length ? (await sb.from("registre_etudiants").select("*").in("matricule", mats)).data || [] : [];
  box.innerHTML = `<h2 style="margin-top:0">Demandes en attente</h2>` +
    ((pend || []).length ? pend.map(p => {
      const r = reg.find(x => x.matricule === p.req_matricule);
      const same = r && sansAccent(r.prenom) === sansAccent(p.first_name) && sansAccent(r.nom) === sansAccent(p.last_name);
      return `<div class="carte"><div class="ligne"><b>${esc(p.full_name)}</b><span class="badge none">${esc(TYPES[p.account_type])}</span></div>
        <div class="scroll"><table class="cmp"><tr><th>Téléphone</th><td>${esc(p.phone)}</td></tr><tr><th>Email IPNET déclaré</th><td>${esc(p.req_ipnet_email)}</td></tr>
        ${p.account_type === "student" ? `<tr><th>Matricule déclaré</th><td>${esc(p.req_matricule)}</td></tr><tr><th>Registre</th><td>${r ? `${esc(r.prenom)} ${esc(r.nom)} (${esc(r.filiere || "—")}) · <b>${same ? "noms identiques" : "noms différents"}</b>` : "matricule absent du registre"}</td></tr>` : `<tr><th>Contrôle</th><td>Un professeur est toujours validé à la main (liste du personnel).</td></tr>`}
        <tr><th>Essais de vérification</th><td>${p.verify_attempts} / 5</td></tr></table></div>
        <div class="ligne g"><button class="petit plein" data-v="approve" data-id="${p.id}">Valider</button><button class="petit danger" data-v="reject" data-id="${p.id}">Refuser</button>
        <button class="petit" data-v="unlock" data-id="${p.id}">Débloquer les essais</button></div></div>`;
    }).join("") : "<p>Aucune demande en attente.</p>") +
    `<h2>Registre des étudiants (liste officielle)</h2><form id="imp" class="carte"><p class="petit-texte" style="margin-bottom:.8rem">Une ligne par étudiant : <b>matricule;prénom;nom;filière</b> (séparateur ; , ou tabulation). Importe le fichier CSV ou colle les lignes.</p>
      <label>Fichier CSV<input type="file" id="csvf" accept=".csv,.txt,text/csv,text/plain"></label><label>Lignes<textarea id="csv" rows="5"></textarea></label><button class="plein">Importer</button><div id="ires" style="margin-top:1rem"></div></form>
    <h2>Derniers comptes</h2>` +
    (users || []).map(u => `<div class="carte"><div class="ligne"><span><b>${esc(u.full_name)}</b> · ${esc(TYPES[u.account_type])} · <span class="petit-texte">${esc(VERIF[u.verification_status])}</span>
      ${u.blocked ? ` <span class="badge blocked">Bloqué</span>` : ""}</span><button class="petit ${u.blocked ? "" : "danger"}" data-b="${u.blocked ? 0 : 1}" data-id="${u.id}">${u.blocked ? "Débloquer" : "Bloquer"}</button></div></div>`).join("");
  box.querySelectorAll("[data-v]").forEach(b => b.onclick = async () => { const r = await rpc("admin_set_verification", { p_profile: b.dataset.id, p_action: b.dataset.v }); if (r.error) alert(r.error); adminPage(); });
  box.querySelectorAll("[data-b]").forEach(b => b.onclick = async () => { const r = await rpc("admin_block_user", { p_profile: b.dataset.id, p_blocked: b.dataset.b === "1" }); if (r.error) alert(r.error); adminPage(); });
  $("csvf").onchange = async () => { const f = $("csvf").files[0]; if (f) $("csv").value = await f.text(); };
  $("imp").onsubmit = async ev => {
    ev.preventDefault();
    const rows = $("csv").value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(/[;,\t]/).map(x => x.trim().replace(/^"|"$/g, ""))).filter(c => c.length >= 3 && !/matricule/i.test(c[0])).map(c => ({ matricule: c[0], prenom: c[1], nom: c[2], filiere: c[3] || "" }));
    if (!rows.length) return $("ires").innerHTML = flash("Aucune ligne valide trouvée.");
    let n = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const r = await rpc("admin_import_registre", { p_rows: rows.slice(i, i + 500) });
      if (r.error) return $("ires").innerHTML = flash(r.error);
      n += r.data;
    }
    $("ires").innerHTML = flash(`${n} étudiant(s) importé(s) sur ${rows.length} ligne(s).`, true);
  };
}

function adminScan(box) {
  box.innerHTML = `<form id="f" class="carte"><label>Code du billet (lu depuis le QR)<input id="code" autocomplete="off" required></label>
    <div class="ligne g"><button class="plein">Vérifier</button><button type="button" id="cam">Scanner avec la caméra</button></div><div id="camz"></div></form><div id="res"></div>`;
  const res = $("res");
  const check = async code => {
    const r = await rpc("admin_check_ticket", { p_code: code });
    if (r.error) { res.innerHTML = flash(r.error); return; }
    const d = r.data;
    if (!d.found) { res.innerHTML = flash("Code invalide."); return; }
    const verifOk = d.account_type === "visitor" || d.verification === "verified";
    res.innerHTML = `<div class="carte"><b>${esc(d.holder)}</b> · ${esc(TYPES[d.account_type])} <span class="badge ${esc(d.verification)}">${esc(VERIF[d.verification])}</span><br>
      <span class="petit-texte">${esc(d.event)} · commande ${esc(d.order_code)}</span><br><br>` +
      (d.status === "used" ? flash("Déjà utilisé : refuser l'entrée.") : d.status === "cancelled" ? flash("Billet annulé : refuser l'entrée.") :
        `${flash("Billet valide.", true)}${verifOk ? "" : flash("Statut non vérifié : contrôle la carte d'étudiant ou la pièce d'identité.")}<button class="plein" id="use">Valider l'entrée</button>`) + `</div>`;
    if ($("use")) $("use").onclick = async () => { const u = await rpc("admin_use_ticket", { p_code: code }); res.innerHTML = u.error ? flash(u.error) : u.data ? flash("Entrée validée.", true) : flash("Déjà utilisé : refuser l'entrée."); if (u.data) confetti(); };
  };
  $("f").onsubmit = ev => { ev.preventDefault(); check($("code").value.trim()); };
  $("cam").onclick = async () => {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) return $("camz").innerHTML = flash("Le scan par caméra n'est pas pris en charge par ce navigateur (essaie Chrome sur Android). Saisis le code à la main.");
    try {
      stopCam();
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      $("camz").innerHTML = `<video class="cam" id="vid" playsinline muted></video>`;
      const v = $("vid"); v.srcObject = camStream; await v.play();
      const det = new BarcodeDetector({ formats: ["qr_code"] });
      camTimer = setInterval(async () => {
        try {
          const c = await det.detect(v);
          if (c[0]) { stopCam(); $("camz").innerHTML = ""; $("code").value = c[0].rawValue; check(c[0].rawValue.trim()); }
        } catch { /* image pas prête */ }
      }, 300);
    } catch { $("camz").innerHTML = flash("Impossible d'accéder à la caméra."); }
  };
}

async function adminRecon(box) {
  const [{ data: evs }, { data: ords }] = await Promise.all([
    sb.from("events").select("id,title,starts_at,capacity").order("starts_at", { ascending: false }),
    sb.from("orders").select("*, profiles!orders_user_id_fkey(full_name,phone)").eq("status", "confirmed")
  ]);
  box.innerHTML = `<p class="petit-texte" style="margin-bottom:1rem">Compare le total attendu avec le total réellement reçu dans T-Money. Un écart révèle une erreur ou une fraude.</p>` +
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
