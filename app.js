import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { cloudinaryConfig } from "./cloudinary-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_UID = "X8IuyH0h6nSUqn7066tGQKodEWV2";

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const nl = v => esc(v).replace(/\n/g, "<br>");
const rid = () => "sec-" + Math.random().toString(36).slice(2, 8);
const clone = o => JSON.parse(JSON.stringify(o));

// Blocks javascript: and other unsafe schemes
const safeUrl = v => {
  v = String(v ?? "").trim();
  return /^(https?:|mailto:|tel:|assets\/|\.?\/|#)/i.test(v) ? v : "";
};

// email -> mailto:, phone -> tel:, "facebook.com/x" -> https://facebook.com/x
function linkHref(v) {
  v = String(v ?? "").trim();
  if (!v) return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "mailto:" + v;
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return "tel:" + v.replace(/[\s()-]/g, "");
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^[#\/]/.test(v) && !v.startsWith("assets/")) v = "https://" + v;
  return safeUrl(v);
}

// Cloudinary: automatic format + quality + width
const opt = (u, w = 900) => {
  u = safeUrl(u);
  return /res\.cloudinary\.com\/.+\/upload\//.test(u) ? u.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`) : u;
};

const getPath = p => p.split(".").reduce((o, k) => (o == null ? o : o[k]), data);
const setPath = (p, val) => {
  const k = p.split(".");
  let o = data;
  for (let i = 0; i < k.length - 1; i++) o = o[k[i]];
  o[k[k.length - 1]] = val;
};

/* ================================================================== */
/* Section types, presets, default data                                */
/* ================================================================== */
const TYPES = {
  text: "টেক্সট",
  cards: "কার্ড",
  tags: "ট্যাগ",
  timeline: "টাইমলাইন",
  gallery: "গ্যালারি",
  contact: "যোগাযোগ"
};

const PRESETS = [
  { icon: "📝", name: "টেক্সট সেকশন", hint: "About, Story বা যেকোনো লেখা", type: "text", o: { title: "About me", eyebrow: "About" } },
  { icon: "🗂️", name: "প্রজেক্ট / পোর্টফোলিও", hint: "ছবি, বিবরণ ও লিংকসহ কার্ড", type: "cards", o: { title: "Projects", eyebrow: "My work", showFilter: true } },
  { icon: "🛎️", name: "সার্ভিস", hint: "আপনি কী কী সেবা দেন", type: "cards", o: { title: "Services", eyebrow: "What I do" } },
  { icon: "🎓", name: "সার্টিফিকেট", hint: "সার্টিফিকেটের ছবি ও বিবরণ", type: "cards", o: { title: "Certificates", eyebrow: "Credentials" } },
  { icon: "🏷️", name: "স্কিল / ট্যাগ", hint: "ছোট ছোট দক্ষতার তালিকা", type: "tags", o: { title: "Skills", eyebrow: "Capabilities" } },
  { icon: "🕒", name: "অভিজ্ঞতা / শিক্ষা", hint: "সময় অনুযায়ী তালিকা", type: "timeline", o: { title: "Experience", eyebrow: "Journey" } },
  { icon: "🖼️", name: "ফটো গ্যালারি", hint: "একসাথে অনেক ছবি আপলোড", type: "gallery", o: { title: "Gallery", eyebrow: "Moments" } },
  { icon: "📞", name: "যোগাযোগ", hint: "ইমেইল, ফোন, সোশ্যাল লিংক", type: "contact", o: {} }
];

const SOCIALS = ["Email", "Phone", "WhatsApp", "Facebook", "LinkedIn", "GitHub", "YouTube", "Instagram"];
const SWATCHES = ["#1f6b45", "#0f766e", "#1d4ed8", "#7c3aed", "#c2410c", "#be123c", "#334155"];

function newSection(type, id, o = {}) {
  const base = { id: id || rid(), type, title: "নতুন সেকশন", eyebrow: "", desc: "", image: "", imgPos: "", visible: true, nav: true };
  let extra = { items: [] };
  if (type === "text") extra = { body: "" };
  if (type === "cards") extra = { showFilter: false, items: [] };
  if (type === "contact") extra = { title: "Let's connect.", eyebrow: "Contact", body: "", items: [] };
  return { ...base, ...extra, ...o };
}

function defaultData() {
  const S = (type, id, o) => newSection(type, id, o);
  return {
    profile: {
      name: "Abidur Rahman Joy",
      eyebrow: "D. Agriculturist • Batch Designer • Digital Creator",
      tagline: "D. Agriculturist | Batch Designer | Digital Creator",
      image: "assets/profile-placeholder.svg",
      btn1Text: "View my work", btn1Link: "#projects",
      btn2Text: "Contact", btn2Link: "#contact"
    },
    settings: { brand: "Joy", footer: "Built with care", pageTitle: "Abidur Rahman Joy | Facebook Ads Specialist, Software & Website Builder, Agriculturist", metaDesc: "Abidur Rahman Joy — Facebook Ads specialist, software & website builder, and agriculturist from Bangladesh. See projects, services, and get in touch.", accent: "#1f6b45", hideAdmin: false },
    sections: [
      S("text", "about", { title: "Who I am", eyebrow: "About", body: "I combine agriculture, digital marketing, and graphic design to build practical projects and useful digital experiences." }),
      S("cards", "projects", { title: "Projects", eyebrow: "Selected work", showFilter: true }),
      S("tags", "skills", { title: "Skills", eyebrow: "Capabilities", items: ["Agriculture", "Digital Marketing", "Graphic Design", "AI Content Creation", "Web/App Projects"] }),
      S("timeline", "experience", {
        title: "Experience & Education", eyebrow: "Journey",
        items: [
          { type: "Education", title: "BAgEd — Bangladesh Open University", period: "Current · 5th semester", description: "Bachelor in Agricultural Education." },
          { type: "Education", title: "Diploma in Agriculture", period: "CGPA 3.77 / 4.00", description: "Agriculture Training Institute, Araihazer, Narayanganj." }
        ]
      }),
      S("cards", "certificates", { title: "Certificates", eyebrow: "Credentials" }),
      S("contact", "contact", { body: "For collaborations and professional opportunities, feel free to get in touch." })
    ]
  };
}

// Accepts new format or the old one (projects/skills/timeline at top level)
function normalize(saved) {
  const d = defaultData();
  if (!saved) return d;
  if (Array.isArray(saved.sections)) {
    return {
      profile: { ...d.profile, ...saved.profile },
      settings: { ...d.settings, ...saved.settings },
      sections: saved.sections.map(s => ({ ...newSection(s.type || "text", s.id), ...s }))
    };
  }
  const sec = id => d.sections.find(x => x.id === id);
  const p = saved.profile || {};
  d.profile.name = p.name ?? d.profile.name;
  d.profile.tagline = p.tagline ?? d.profile.tagline;
  d.profile.image = p.profileImage || d.profile.image;
  if (p.about) sec("about").body = p.about;
  if (Array.isArray(saved.projects)) sec("projects").items = saved.projects.map(x => ({ title: x.title || "", category: x.category || "", description: x.description || "", image: x.image || "", url: x.url === "#" ? "" : (x.url || ""), linkText: "Open project" }));
  if (Array.isArray(saved.skills)) sec("skills").items = saved.skills;
  if (Array.isArray(saved.timeline)) sec("experience").items = saved.timeline;
  if (Array.isArray(saved.certificates)) sec("certificates").items = saved.certificates.map(x => ({ title: x.title || "", category: x.issuer || "", description: x.description || "", image: x.image || "", url: "", linkText: "" }));
  const c = saved.contact || {};
  if (c.text) sec("contact").body = c.text;
  sec("contact").items = [["Email", c.email], ["Phone", c.phone], ["Facebook", c.facebook], ["LinkedIn", c.linkedin], ["GitHub", c.github]].filter(x => x[1]).map(x => ({ label: x[0], url: x[1] }));
  return d;
}

let data = defaultData();
let snapshot = JSON.stringify(data); // last saved state (for "discard")
let loaded = false;
let dirty = false;

/* ================================================================== */
/* Public website                                                      */
/* ================================================================== */
const hasContent = s => {
  const it = s.items || [];
  switch (s.type) {
    case "text": return !!(s.body || s.image || s.desc);
    case "cards": case "timeline": return it.length > 0;
    case "tags": return it.some(Boolean);
    case "gallery": return it.some(x => x.image);
    case "contact": return !!(s.body || it.some(x => linkHref(x.url)));
  }
  return true;
};

function cardHtml(x) {
  const href = linkHref(x.url);
  return `<article class="card">${x.image ? `<img class="card-img" loading="lazy" src="${esc(opt(x.image))}" alt="${esc(x.title)}">` : ""}<div class="card-body">${x.category ? `<p class="eyebrow">${esc(x.category)}</p>` : ""}<h3>${esc(x.title)}</h3>${x.description ? `<p>${nl(x.description)}</p>` : ""}${href ? `<a class="btn" href="${esc(href)}" target="_blank" rel="noopener">${esc(x.linkText || "Open")}</a>` : ""}</div></article>`;
}
const cardsGrid = (s, cat = "All") => (s.items || []).filter(x => cat === "All" || x.category === cat).map(cardHtml).join("");

function sectionHtml(s) {
  const items = s.items || [];

  if (s.type === "contact") {
    return `<section id="${esc(s.id)}" data-sec="${esc(s.id)}" class="section contact"><div><p class="eyebrow">${esc(s.eyebrow || "Contact")}</p><h2>${esc(s.title)}</h2>${s.body ? `<p class="lead">${nl(s.body)}</p>` : ""}</div><div class="contact-links">${items.filter(x => linkHref(x.url)).map(x => `<a href="${esc(linkHref(x.url))}" target="_blank" rel="noopener">${esc(x.label || x.url)}</a>`).join("")}</div></section>`;
  }

  const head = `<div class="section-head">${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ""}<h2>${esc(s.title)}</h2>${s.desc ? `<p class="sec-desc">${nl(s.desc)}</p>` : ""}</div>`;
  let body = "";
  switch (s.type) {
    case "text":
      body = `<div class="lead">${String(s.body || "").split(/\n+/).filter(Boolean).map(t => `<p>${esc(t)}</p>`).join("")}</div>`;
      break;
    case "cards": {
      const cats = [...new Set(items.map(x => x.category).filter(Boolean))];
      const filters = s.showFilter && cats.length > 1 ? `<div class="filters">${["All", ...cats].map((c, i) => `<button class="filter ${i === 0 ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : "";
      body = `${filters}<div class="grid">${cardsGrid(s)}</div>`;
      break;
    }
    case "tags":
      body = `<div class="skill-grid">${items.filter(Boolean).map(t => `<span class="skill">${esc(t)}</span>`).join("")}</div>`;
      break;
    case "timeline":
      body = `<div class="timeline">${items.map(x => `<article class="timeline-item">${x.type ? `<p class="eyebrow">${esc(x.type)}</p>` : ""}<h3>${esc(x.title)}</h3>${x.period ? `<div class="muted">${esc(x.period)}</div>` : ""}${x.description ? `<p>${nl(x.description)}</p>` : ""}</article>`).join("")}</div>`;
      break;
    case "gallery":
      body = `<div class="grid gallery">${items.filter(x => x.image).map(x => `<figure class="shot"><a href="${esc(safeUrl(x.image))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(opt(x.image, 700))}" alt="${esc(x.caption)}"></a>${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`;
      break;
  }

  // Optional section image: banner on top, or beside the content
  let inner = body;
  if (s.image) {
    const pos = s.imgPos || (s.type === "text" ? "right" : "top");
    if (pos === "top") inner = `<img class="sec-media banner" loading="lazy" src="${esc(opt(s.image, 1400))}" alt="">${body}`;
    else inner = `<div class="split ${pos === "left" ? "left" : ""}"><div class="split-body">${body}</div><img class="sec-media" loading="lazy" src="${esc(opt(s.image, 800))}" alt=""></div>`;
  }
  return `<section id="${esc(s.id)}" data-sec="${esc(s.id)}" class="section">${head}${inner}</section>`;
}

function applyAccent() {
  const c = /^#[0-9a-f]{6}$/i.test(data.settings.accent || "") ? data.settings.accent : "#1f6b45";
  document.documentElement.style.setProperty("--green", c);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = c;
}

function render() {
  const p = data.profile, st = data.settings;
  document.title = st.pageTitle || `${p.name} — Portfolio`;
  const md = document.querySelector('meta[name="description"]');
  if (md && st.metaDesc) md.content = st.metaDesc;
  applyAccent();

  $("#brand").innerHTML = `${esc(st.brand)}<span>.</span>`;
  $("#heroEyebrow").textContent = p.eyebrow || "";
  $("#heroEyebrow").hidden = !p.eyebrow;
  $("#heroName").textContent = p.name;
  $("#heroTagline").textContent = p.tagline || "";
  $("#profileImage").src = opt(p.image || "assets/profile-placeholder.svg", 700);
  const b1 = $("#btn1"), b2 = $("#btn2");
  b1.textContent = p.btn1Text || ""; b1.href = safeUrl(p.btn1Link) || "#"; b1.hidden = !p.btn1Text;
  b2.textContent = p.btn2Text || ""; b2.href = safeUrl(p.btn2Link) || "#"; b2.hidden = !p.btn2Text;
  $("#adminBtn").hidden = !!st.hideAdmin;

  const shown = data.sections.filter(s => s.visible !== false && hasContent(s));
  $("#navItems").innerHTML = shown.filter(s => s.nav !== false && s.title).map(s => `<a href="#${esc(s.id)}">${esc(s.type === "contact" ? (s.eyebrow || "Contact") : s.title)}</a>`).join("");
  $("#sections").innerHTML = shown.map(sectionHtml).join("");
  $("#footerName").textContent = p.name;
  $("#footerText").textContent = st.footer || "";
  $("#year").textContent = new Date().getFullYear();
}

$("#sections").addEventListener("click", e => {
  const b = e.target.closest(".filter");
  if (!b) return;
  const box = b.closest("[data-sec]");
  const s = data.sections.find(x => x.id === box.dataset.sec);
  box.querySelectorAll(".filter").forEach(x => x.classList.toggle("active", x === b));
  box.querySelector(".grid").innerHTML = cardsGrid(s, b.dataset.cat);
});
$("#menuBtn").onclick = () => $("#navLinks").classList.toggle("open");
$("#navLinks").addEventListener("click", e => { if (e.target.tagName === "A") $("#navLinks").classList.remove("open"); });

const openAdmin = () => $("#adminModal").classList.remove("hidden");
const closeAdmin = () => {
  if (dirty && !confirm("সেভ না করা পরিবর্তন আছে। তবুও বন্ধ করবেন?")) return;
  $("#adminModal").classList.add("hidden");
  if (location.hash === "#admin") history.replaceState(null, "", location.pathname);
};
$("#adminBtn").onclick = openAdmin;
document.querySelector("[data-close]").onclick = closeAdmin;
$("#viewBtn").onclick = closeAdmin;
if (location.hash === "#admin") openAdmin();
window.addEventListener("hashchange", () => { if (location.hash === "#admin") openAdmin(); });

/* ================================================================== */
/* Load                                                                */
/* ================================================================== */
async function loadData() {
  try {
    const snap = await getDoc(doc(db, "site", "portfolio"));
    data = normalize(snap.exists() ? snap.data() : null);
    loaded = true;
  } catch (e) {
    console.warn(e);
    data = defaultData();
  }
  snapshot = JSON.stringify(data);
  render();
}
const ready = loadData();

/* ================================================================== */
/* Auth                                                                */
/* ================================================================== */
onAuthStateChanged(auth, async user => {
  if (user && user.uid === ADMIN_UID) {
    await ready;
    $("#loginView").classList.add("hidden");
    $("#dashboardView").classList.remove("hidden");
    buildEditor();
  } else {
    if (user) signOut(auth);
    $("#loginView").classList.remove("hidden");
    $("#dashboardView").classList.add("hidden");
  }
});

async function doLogin() {
  try {
    const cred = await signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#password").value);
    if (cred.user.uid !== ADMIN_UID) { await signOut(auth); throw new Error("UNAUTHORIZED_ADMIN"); }
    $("#loginMsg").textContent = "";
  } catch (e) {
    $("#loginMsg").textContent = e.message === "UNAUTHORIZED_ADMIN" ? "এই অ্যাকাউন্টের অনুমতি নেই।" : "Login failed: " + (e.code || e.message);
  }
}
$("#loginBtn").onclick = doLogin;
$("#password").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
$("#logoutBtn").onclick = () => {
  if (dirty && !confirm("সেভ না করা পরিবর্তন আছে। তবুও লগআউট করবেন?")) return;
  setDirty(false);
  signOut(auth);
};

/* ================================================================== */
/* Admin editor                                                        */
/* ================================================================== */
const ui = { tab: "sections", sel: 0, adding: false };
const openItems = new Set();

function setDirty(v) {
  dirty = v;
  const b = $("#dirtyBadge");
  b.textContent = v ? "● সেভ হয়নি" : "✓ সব সেভ আছে";
  b.classList.toggle("unsaved", v);
}
const setMsg = (t, cls = "") => { const m = $("#saveMsg"); m.textContent = t; m.className = "msg " + cls; };

/* ---------- field builders ---------- */
const fld = (path, label, o = {}) => {
  const v = getPath(path) ?? "";
  const ph = esc(o.ph || "");
  const list = o.list ? ` list="${o.list}"` : "";
  const el = o.area
    ? `<textarea data-path="${path}" rows="${o.rows || 3}" placeholder="${ph}">${esc(v)}</textarea>`
    : `<input data-path="${path}" value="${esc(v)}" placeholder="${ph}"${list}>`;
  return `<label class="fld">${label}${el}</label>`;
};
const selFld = (path, label, opts) => `<label class="fld">${label}<select data-path="${path}">${opts.map(([v, t]) => `<option value="${v}" ${(getPath(path) || "") === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
const chk = (path, label, def = true) => `<label class="check"><input type="checkbox" data-path="${path}" ${(getPath(path) ?? def) ? "checked" : ""}> ${label}</label>`;
const card = (title, inner, hint = "") => `<div class="ecard"><h4>${title}</h4>${hint ? `<p class="muted small">${hint}</p>` : ""}${inner}</div>`;
const row = (...c) => `<div class="row">${c.join("")}</div>`;

const imgFld = (path, label) => {
  const v = getPath(path) || "";
  return `<div class="imgfld dropzone"><span>${label}</span><div class="imgrow">${v ? `<img class="upload-preview" src="${esc(opt(v, 300))}" alt="">` : `<div class="upload-preview empty">🖼️</div>`}<div><div class="btnrow"><label class="small-btn add filebtn">📷 ${v ? "ছবি বদলান" : "ছবি বেছে নিন"}<input type="file" accept="image/*" hidden data-upload="${path}"></label>${v ? `<button type="button" class="small-btn danger" data-act="clear-img" data-path="${path}">✕ সরান</button>` : ""}</div><p class="muted small">অথবা ছবি এখানে টেনে এনে ছেড়ে দিন</p></div></div></div>`;
};

const itemActions = (i, j) => `<div class="btnrow item-actions"><button type="button" class="small-btn" data-act="item-up" data-s="${i}" data-i="${j}">↑</button><button type="button" class="small-btn" data-act="item-down" data-s="${i}" data-i="${j}">↓</button><button type="button" class="small-btn" data-act="item-dup" data-s="${i}" data-i="${j}">⎘ কপি</button><button type="button" class="small-btn danger" data-act="item-del" data-s="${i}" data-i="${j}">🗑 মুছুন</button></div>`;

const itemBox = (s, i, j, thumb, label, inner) => {
  const key = `${s.id}:${j}`;
  return `<details class="item" data-ikey="${esc(key)}" ${openItems.has(key) ? "open" : ""}><summary>${thumb ? `<img class="thumb" src="${esc(opt(thumb, 120))}" alt="">` : `<span class="thumb">＋</span>`}<span class="it">${esc(label || "(নাম নেই)")}</span></summary><div class="item-body">${inner}${itemActions(i, j)}</div></details>`;
};

/* ---------- tabs ---------- */
function homeTab() {
  const anchors = `<datalist id="anchors">${data.sections.map(s => `<option value="#${esc(s.id)}">${esc(s.title)}</option>`).join("")}</datalist>`;
  return anchors +
    card("প্রোফাইল ছবি", imgFld("profile.image", "আপনার ছবি")) +
    card("নাম ও পরিচিতি", row(fld("profile.name", "নাম"), fld("profile.eyebrow", "নামের উপরের ছোট লেখা")) + fld("profile.tagline", "ট্যাগলাইন / সংক্ষিপ্ত পরিচয়")) +
    card("হিরো বাটন", row(fld("profile.btn1Text", "বাটন ১ — লেখা"), fld("profile.btn1Link", "বাটন ১ — লিংক", { list: "anchors", ph: "#projects" })) + row(fld("profile.btn2Text", "বাটন ২ — লেখা"), fld("profile.btn2Link", "বাটন ২ — লিংক", { list: "anchors", ph: "#contact" })), "লেখা ফাঁকা রাখলে বাটন দেখাবে না। লিংক ঘরে ক্লিক করলে সেকশনের তালিকা পাবেন।");
}

function settingsTab() {
  const a = data.settings.accent || "#1f6b45";
  return card("লোগো ও ফুটার", row(fld("settings.brand", "লোগোর লেখা (উপরে বামে)"), fld("settings.footer", "ফুটারের লেখা"))) +
    card("সাইটের রঙ", `<div class="btnrow"><input type="color" data-path="settings.accent" value="${esc(a)}"><div class="swatches">${SWATCHES.map(c => `<button type="button" class="sw" style="background:${c}" data-act="accent" data-c="${c}" title="${c}"></button>`).join("")}</div></div>`, "বাটন, লিংক ও ডার্ক ব্লকের রঙ বদলে যাবে।") +
    card("Google ও ব্রাউজার ট্যাব", fld("settings.pageTitle", "ট্যাবের শিরোনাম", { ph: "Abidur Rahman Joy — Portfolio" }) + fld("settings.metaDesc", "সাইটের সংক্ষিপ্ত বর্ণনা", { area: 1, rows: 2 })) +
    card("অ্যাডমিন বাটন", chk("settings.hideAdmin", "ভিজিটরদের কাছ থেকে Admin বাটন লুকাও", false), "লুকালেও আপনি সাইটের ঠিকানার শেষে <b>#admin</b> লিখে (যেমন yoursite.github.io/#admin) লগইন করতে পারবেন।") +
    card("ব্যাকআপ", `<div class="btnrow"><button type="button" class="btn" data-act="backup">⬇ ব্যাকআপ নামান</button><label class="btn filebtn">⬆ ব্যাকআপ থেকে ফিরিয়ে আনুন<input type="file" accept=".json,application/json" hidden data-import></label></div>`, "বড় পরিবর্তনের আগে একটি ব্যাকআপ রেখে দেওয়া ভালো।");
}

function sectionsTab() {
  const list = data.sections.map((s, i) => `<button type="button" class="secitem ${!ui.adding && i === ui.sel ? "on" : ""}" data-act="sec-select" data-s="${i}"><span class="dot ${s.visible !== false ? "on" : ""}"></span><span class="t">${esc(s.title || "(শিরোনামহীন)")}</span><small>${TYPES[s.type] || ""}</small></button>`).join("");
  let main;
  if (ui.adding) main = presetGrid();
  else if (data.sections[ui.sel]) main = sectionEditor(data.sections[ui.sel], ui.sel);
  else main = `<p class="muted">বাম পাশ থেকে একটি সেকশন বেছে নিন, অথবা নতুন সেকশন যোগ করুন।</p>`;
  return `<div class="secwrap"><aside class="seclist">${list}<button type="button" class="small-btn add addnew" data-act="sec-new-open">+ নতুন সেকশন</button></aside><div class="secmain">${main}</div></div>`;
}

function presetGrid() {
  return `<div class="ecard"><h4>কী ধরনের সেকশন যোগ করবেন?</h4><div class="presets">${PRESETS.map((p, k) => `<button type="button" class="preset" data-act="sec-add" data-p="${k}"><span>${p.icon}</span><b>${p.name}</b><small>${p.hint}</small></button>`).join("")}</div><p><button type="button" class="small-btn" data-act="sec-new-cancel">← ফিরে যান</button></p></div>`;
}

function sectionEditor(s, i) {
  const P = `sections.${i}`;
  const items = s.items || [];
  let h = `<div class="ecard toolbar"><div class="btnrow"><button type="button" class="small-btn" data-act="sec-up" data-s="${i}">↑ উপরে</button><button type="button" class="small-btn" data-act="sec-down" data-s="${i}">↓ নিচে</button><button type="button" class="small-btn" data-act="sec-dup" data-s="${i}">⎘ কপি</button><span class="grow"></span><button type="button" class="small-btn danger" data-act="sec-del" data-s="${i}">🗑 সেকশন মুছুন</button></div></div>`;

  h += card("সাধারণ তথ্য",
    row(fld(`${P}.title`, "শিরোনাম"), fld(`${P}.eyebrow`, "শিরোনামের উপরের ছোট লেখা")) +
    fld(`${P}.desc`, "সংক্ষিপ্ত বর্ণনা (শিরোনামের নিচে, ঐচ্ছিক)", { area: 1, rows: 2 }) +
    `<div class="checks">${chk(`${P}.visible`, "ওয়েবসাইটে দেখাও")}${chk(`${P}.nav`, "উপরের মেনুতে দেখাও")}</div>`);

  if (s.type !== "contact") {
    h += card("সেকশনের ছবি", imgFld(`${P}.image`, "ছবি (ঐচ্ছিক)") + selFld(`${P}.imgPos`, "ছবি কোথায় থাকবে", [["", "স্বয়ংক্রিয়"], ["top", "উপরে (বড় ব্যানার)"], ["right", "ডান পাশে"], ["left", "বাম পাশে"]]));
  }

  switch (s.type) {
    case "text":
      h += card("লেখা", fld(`${P}.body`, "মূল লেখা (নতুন লাইন = নতুন প্যারাগ্রাফ)", { area: 1, rows: 8 }));
      break;

    case "cards":
      h += card("কার্ডসমূহ",
        chk(`${P}.showFilter`, "ক্যাটেগরি ফিল্টার দেখাও", false) +
        items.map((x, j) => itemBox(s, i, j, x.image, x.title,
          row(fld(`${P}.items.${j}.title`, "শিরোনাম"), fld(`${P}.items.${j}.category`, "ক্যাটেগরি")) +
          fld(`${P}.items.${j}.description`, "বিবরণ", { area: 1, rows: 3 }) +
          row(fld(`${P}.items.${j}.url`, "লিংক (ঐচ্ছিক)", { ph: "https://..." }), fld(`${P}.items.${j}.linkText`, "বাটনের লেখা", { ph: "Open project" })) +
          imgFld(`${P}.items.${j}.image`, "ছবি")
        )).join("") +
        `<button type="button" class="small-btn add" data-act="item-add" data-s="${i}">+ নতুন কার্ড</button>`);
      break;

    case "tags":
      h += card("ট্যাগসমূহ", `<label class="fld">প্রতি লাইনে একটি করে লিখুন<textarea data-path="${P}.items" data-lines="1" rows="8">${esc(items.join("\n"))}</textarea></label>`);
      break;

    case "timeline":
      h += card("আইটেমসমূহ",
        items.map((x, j) => itemBox(s, i, j, "", x.title,
          row(fld(`${P}.items.${j}.type`, "ধরন", { ph: "Education / Experience" }), fld(`${P}.items.${j}.period`, "সময়কাল", { ph: "2023 – Present" })) +
          fld(`${P}.items.${j}.title`, "শিরোনাম") +
          fld(`${P}.items.${j}.description`, "বিবরণ", { area: 1, rows: 3 })
        )).join("") +
        `<button type="button" class="small-btn add" data-act="item-add" data-s="${i}">+ নতুন আইটেম</button>`);
      break;

    case "gallery":
      h += card("ছবিসমূহ",
        `<div class="dropzone gal-drop"><label class="small-btn add filebtn">📷 একসাথে অনেক ছবি আপলোড<input type="file" accept="image/*" multiple hidden data-upload-multi="${P}"></label><p class="muted small">ছবি এখানে টেনে এনে ছেড়ে দিলেও হবে।</p>` +
        `<div class="gal">${items.map((x, j) => `<div class="tile">${x.image ? `<img src="${esc(opt(x.image, 300))}" alt="">` : ""}<input data-path="${P}.items.${j}.caption" value="${esc(x.caption || "")}" placeholder="ক্যাপশন">${itemActions(i, j)}</div>`).join("")}</div></div>`);
      break;

    case "contact":
      h += card("পরিচিতি লেখা", fld(`${P}.body`, "লেখা", { area: 1, rows: 3 })) +
        card("লিংকসমূহ",
          `<p class="muted small">ইমেইল, ফোন নম্বর বা লিংক যেকোনোটি লিখুন — নিজে থেকেই সঠিক লিংক হয়ে যাবে। (WhatsApp: wa.me/8801XXXXXXXXX)</p>` +
          items.map((x, j) => `<div class="linkrow"><input data-path="${P}.items.${j}.label" value="${esc(x.label || "")}" placeholder="নাম (Facebook)"><input data-path="${P}.items.${j}.url" value="${esc(x.url || "")}" placeholder="লিংক / ইমেইল / ফোন"><button type="button" class="small-btn" data-act="item-up" data-s="${i}" data-i="${j}">↑</button><button type="button" class="small-btn danger" data-act="item-del" data-s="${i}" data-i="${j}">✕</button></div>`).join("") +
          `<div class="btnrow quick">${SOCIALS.map(n => `<button type="button" class="small-btn" data-act="item-add" data-s="${i}" data-label="${n}">+ ${n}</button>`).join("")}<button type="button" class="small-btn add" data-act="item-add" data-s="${i}">+ অন্য লিংক</button></div>`);
      break;
  }
  return h;
}

function editorHtml() {
  const TABS = [["home", "🏠 হোম / প্রোফাইল"], ["sections", "🧩 সেকশন"], ["settings", "⚙️ সেটিংস"]];
  const body = ui.tab === "home" ? homeTab() : ui.tab === "settings" ? settingsTab() : sectionsTab();
  return `<div class="tabs">${TABS.map(([k, l]) => `<button type="button" class="tab ${ui.tab === k ? "on" : ""}" data-act="tab" data-tab="${k}">${l}</button>`).join("")}</div><div class="pane">${body}</div>`;
}

function buildEditor() {
  const box = $(".modal-card");
  const top = box.scrollTop;
  if (ui.sel >= data.sections.length) ui.sel = Math.max(0, data.sections.length - 1);
  $("#editor").innerHTML = editorHtml();
  box.scrollTop = top;
}

/* ---------- editor events ---------- */
$("#editor").addEventListener("input", e => {
  const el = e.target;
  if (!el.dataset.path) return;
  let v = el.type === "checkbox" ? el.checked : el.value;
  if (el.dataset.lines) v = v.split("\n").map(x => x.trim());
  setPath(el.dataset.path, v);
  setDirty(true);
  if (el.dataset.path === "settings.accent") applyAccent();
  const m = el.dataset.path.match(/^sections\.(\d+)\.title$/);
  if (m) { const t = document.querySelector(`.secitem[data-s="${m[1]}"] .t`); if (t) t.textContent = v || "(শিরোনামহীন)"; }
});

$("#editor").addEventListener("toggle", e => {
  const d = e.target;
  if (d.dataset && d.dataset.ikey) d.open ? openItems.add(d.dataset.ikey) : openItems.delete(d.dataset.ikey);
}, true);

const swap = (arr, i, j) => { if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };

$("#editor").addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  const si = +b.dataset.s, ii = +b.dataset.i;
  const sec = data.sections[si];
  let changed = true, rebuild = true;

  switch (act) {
    case "tab": ui.tab = b.dataset.tab; ui.adding = false; changed = false; break;
    case "sec-select": ui.sel = si; ui.adding = false; changed = false; break;
    case "sec-new-open": ui.adding = true; changed = false; break;
    case "sec-new-cancel": ui.adding = false; changed = false; break;
    case "sec-add": {
      const p = PRESETS[+b.dataset.p];
      data.sections.push(newSection(p.type, null, p.o));
      ui.sel = data.sections.length - 1;
      ui.adding = false;
      break;
    }
    case "sec-del":
      if (!confirm(`"${sec.title}" সেকশনটি মুছে ফেলবেন?`)) return;
      data.sections.splice(si, 1);
      ui.sel = Math.max(0, Math.min(si, data.sections.length - 1));
      break;
    case "sec-up": if (swap(data.sections, si, si - 1)) ui.sel = si - 1; break;
    case "sec-down": if (swap(data.sections, si, si + 1)) ui.sel = si + 1; break;
    case "sec-dup": {
      const c = clone(sec);
      c.id = rid();
      c.title += " (কপি)";
      data.sections.splice(si + 1, 0, c);
      ui.sel = si + 1;
      break;
    }
    case "item-add": {
      const t = {
        cards: { title: "নতুন কার্ড", category: "", description: "", image: "", url: "", linkText: "Open" },
        timeline: { type: "Experience", title: "নতুন আইটেম", period: "", description: "" },
        contact: { label: b.dataset.label || "", url: "" }
      }[sec.type];
      if (t) { sec.items.push({ ...t }); openItems.add(`${sec.id}:${sec.items.length - 1}`); }
      break;
    }
    case "item-del":
      if (!confirm("এই আইটেমটি মুছে ফেলবেন?")) return;
      sec.items.splice(ii, 1);
      openItems.clear();
      break;
    case "item-up": swap(sec.items, ii, ii - 1); openItems.clear(); break;
    case "item-down": swap(sec.items, ii, ii + 1); openItems.clear(); break;
    case "item-dup": sec.items.splice(ii + 1, 0, clone(sec.items[ii])); openItems.clear(); break;
    case "clear-img": setPath(b.dataset.path, ""); break;
    case "accent": setPath("settings.accent", b.dataset.c); applyAccent(); break;
    case "backup": {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      a.download = "portfolio-backup.json";
      a.click();
      changed = false; rebuild = false;
      break;
    }
    default: return;
  }
  if (changed) setDirty(true);
  if (rebuild) buildEditor();
});

/* ---------- image upload (button, or drag & drop) ---------- */
async function handleFiles(el, files) {
  files = [...files].filter(f => f.type.startsWith("image/"));
  if (!files.length) return;
  try {
    if (el.dataset.uploadMulti) {
      const sec = getPath(el.dataset.uploadMulti);
      let n = 0;
      for (const f of files) {
        setMsg(`ছবি আপলোড হচ্ছে (${++n}/${files.length})...`);
        sec.items.push({ image: await uploadFile(f, "gallery"), caption: "" });
        setDirty(true);
      }
    } else {
      setMsg("ছবি আপলোড হচ্ছে...");
      setPath(el.dataset.upload, await uploadFile(files[0], "portfolio"));
      setDirty(true);
    }
    setMsg("ছবি আপলোড হয়েছে ✓ — এখন Save চাপুন।", "success");
  } catch (err) {
    console.error(err);
    setMsg("আপলোড ব্যর্থ: " + err.message);
  } finally {
    buildEditor();
  }
}

$("#editor").addEventListener("change", async e => {
  const el = e.target;
  if (el.dataset.upload || el.dataset.uploadMulti) {
    await handleFiles(el, el.files);
  } else if (el.dataset.import) {
    const f = el.files[0];
    if (!f) return;
    try {
      data = normalize(JSON.parse(await f.text()));
      setDirty(true);
      render();
      buildEditor();
      setMsg("ব্যাকআপ লোড হয়েছে। ঠিক থাকলে Save চাপুন।", "success");
    } catch { setMsg("ব্যাকআপ ফাইলটি পড়া যায়নি।"); }
  }
});

const zoneOf = e => e.target.closest && e.target.closest(".dropzone");
$("#editor").addEventListener("dragover", e => { const z = zoneOf(e); if (z) { e.preventDefault(); z.classList.add("over"); } });
$("#editor").addEventListener("dragleave", e => { const z = zoneOf(e); if (z) z.classList.remove("over"); });
$("#editor").addEventListener("drop", e => {
  const z = zoneOf(e);
  if (!z) return;
  e.preventDefault();
  z.classList.remove("over");
  const inp = z.querySelector("[data-upload],[data-upload-multi]");
  if (inp) handleFiles(inp, e.dataTransfer.files);
});

// Resize big photos before upload (faster, saves Cloudinary quota)
async function shrink(file, max = 1600) {
  if (!file.type.startsWith("image/") || /svg|gif/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return (await new Promise(r => c.toBlob(r, "image/webp", 0.86))) || file;
  } catch { return file; }
}

async function uploadFile(file, prefix) {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) throw new Error("Cloudinary config missing");
  const blob = await shrink(file);
  const form = new FormData();
  form.append("file", blob, (file.name || "image").replace(/\.[^.]+$/, "") + ".webp");
  form.append("upload_preset", cloudinaryConfig.uploadPreset);
  form.append("tags", `portfolio,${prefix}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`, { method: "POST", body: form });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((out.error && out.error.message) || "Cloudinary upload failed");
  return out.secure_url;
}

/* ---------- save / discard ---------- */
async function saveAll() {
  if (!loaded && !confirm("সার্ভার থেকে আগের ডেটা লোড হয়নি। এখন সেভ করলে আগের ডেটা মুছে যেতে পারে। তবুও সেভ করবেন?")) return;
  setMsg("Saving...");
  try {
    const clean = clone(data);
    clean.sections.forEach(s => { if (s.type === "tags") s.items = s.items.filter(Boolean); });
    await setDoc(doc(db, "site", "portfolio"), clean);
    data = clean;
    snapshot = JSON.stringify(data);
    loaded = true;
    setDirty(false);
    render();
    buildEditor();
    setMsg("Saved successfully ✓", "success");
  } catch (e) {
    console.error(e);
    setMsg("Save failed: " + (e.code || e.message));
  }
}
$("#saveAll").onclick = saveAll;

$("#discardBtn").onclick = () => {
  if (!dirty) return;
  if (!confirm("সেভ না করা সব পরিবর্তন বাতিল করবেন?")) return;
  data = normalize(JSON.parse(snapshot));
  setDirty(false);
  render();
  buildEditor();
  setMsg("পরিবর্তন বাতিল হয়েছে।");
};

window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
