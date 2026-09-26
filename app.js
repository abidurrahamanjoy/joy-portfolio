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

// email -> mailto:, phone -> tel:, WhatsApp label -> wa.me, "facebook.com/x" -> https://facebook.com/x
function linkHref(v, label) {
  v = String(v ?? "").trim();
  if (!v) return "";
  const digits = v.replace(/[^\d+]/g, "");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "mailto:" + v;
  if (/whatsapp/i.test(label || "")) {
    if (/wa\.me|api\.whatsapp\.com/i.test(v)) return safeUrl(/^https?:/i.test(v) ? v : "https://" + v.replace(/^\/+/, ""));
    return digits ? "https://wa.me/" + digits.replace(/^\+/, "") : "";
  }
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return "tel:" + digits;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^[#\/]/.test(v) && !v.startsWith("assets/")) v = "https://" + v;
  return safeUrl(v);
}

// tags/skills accept a plain string (legacy) or {name, description}
const tagName = x => (typeof x === "string" ? x : (x && x.name) || "").trim();
const tagDesc = x => (typeof x === "object" && x ? (x.description || "") : "").trim();

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
  testimonials: "মতামত",
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
  { icon: "💬", name: "মতামত / রিভিউ", hint: "ক্লায়েন্ট বা সহকর্মীর মন্তব্য", type: "testimonials", o: { title: "What people say", eyebrow: "Testimonials" } },
  { icon: "📞", name: "যোগাযোগ", hint: "ইমেইল, ফোন, সোশ্যাল লিংক, মেসেজ ফর্ম", type: "contact", o: {} }
];

const SOCIALS = ["Email", "Phone", "WhatsApp", "Facebook", "LinkedIn", "GitHub", "YouTube", "Instagram"];
const SWATCHES = ["#ff4d78", "#7c5cff", "#1f6b45", "#0f766e", "#1d4ed8", "#7c3aed", "#c2410c", "#334155"];

function newSection(type, id, o = {}) {
  const base = { id: id || rid(), type, title: "নতুন সেকশন", eyebrow: "", desc: "", image: "", imgPos: "", visible: true, nav: true };
  let extra = { items: [] };
  if (type === "text") extra = { body: "" };
  if (type === "cards") extra = { showFilter: false, items: [] };
  if (type === "contact") extra = { title: "Let's connect.", eyebrow: "Contact", body: "", formEndpoint: "", items: [] };
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
    settings: { brand: "Joy", footer: "Built with care", pageTitle: "Abidur Rahman Joy (Joy) | Web, Software & Facebook Ads — Baniachong, Habiganj, Sylhet, Bangladesh", metaDesc: "Abidur Rahman Joy (Joy) — website, software, e-commerce & shop website developer and Facebook Ads specialist, serving Baniachong, Habiganj, Sylhet, Dhaka, Bangladesh and India.", accent: "#ff4d78", hideAdmin: false, cvUrl: "", analyticsId: "", welcome: { enabled: false, emoji: "👋", title: "আসসালামু আলাইকুম!", body: "", whatsapp: "" } },
    sections: [
      S("text", "about", { title: "Who I am", eyebrow: "About", body: "I combine agriculture, digital marketing, and graphic design to build practical projects and useful digital experiences." }),
      S("cards", "projects", { title: "Projects", eyebrow: "Selected work", showFilter: true }),
      S("tags", "skills", { title: "Skills", eyebrow: "Capabilities", items: ["Agriculture", "Digital Marketing", "Graphic Design", "AI Content Creation", "Web/App Projects"].map(name => ({ name, description: "" })) }),
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
  let result;
  if (!saved) {
    result = d;
  } else if (Array.isArray(saved.sections)) {
    result = {
      profile: { ...d.profile, ...saved.profile },
      settings: { ...d.settings, ...saved.settings },
      sections: saved.sections.map(s => ({ ...newSection(s.type || "text", s.id), ...s }))
    };
  } else {
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
    result = d;
  }
  // Migrate legacy plain-string skill/tag items to {name, description}
  result.sections.forEach(s => {
    if (s.type === "tags" && Array.isArray(s.items)) {
      s.items = s.items.map(x => (typeof x === "string" ? { name: x, description: "" } : x));
    }
  });
  return result;
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
    case "cards": case "timeline": case "testimonials": return it.length > 0;
    case "tags": return it.some(x => tagName(x));
    case "gallery": return it.some(x => x.image);
    case "contact": return !!(s.body || it.some(x => linkHref(x.url, x.label)));
  }
  return true;
};

function cardHtml(x) {
  const href = linkHref(x.url, x.linkText);
  const href2 = linkHref(x.url2, x.linkText2);
  const longDesc = (x.description || "").length > 110;
  const iconHtml = x.icon ? `<span class="card-icon">${esc(x.icon)}</span>` : "";
  return `<article class="card" tabindex="0" data-modal-title="${esc(x.title)}" data-modal-cat="${esc(x.category || "")}" data-modal-desc="${esc(x.description || "")}" data-modal-img="${esc(x.image ? opt(x.image, 1000) : "")}" data-modal-url="${esc(href)}" data-modal-linktext="${esc(x.linkText || "Open")}">${x.image ? `<img class="card-img" loading="lazy" src="${esc(opt(x.image))}" alt="${esc(x.title)}">` : ""}<div class="card-body">${iconHtml}${x.category ? `<p class="eyebrow">${esc(x.category)}</p>` : ""}<h3>${esc(x.title)}</h3>${x.description ? `<p>${nl(x.description)}</p>` : ""}${longDesc ? `<span class="card-more">আরও দেখুন</span>` : ""}<div class="card-links">${href ? `<a class="btn card-link-btn" href="${esc(href)}" target="_blank" rel="noopener">${esc(x.linkText || "Open")}</a>` : ""}${href2 ? `<a class="btn card-link-btn ghost" href="${esc(href2)}" target="_blank" rel="noopener">${esc(x.linkText2 || "Source")}</a>` : ""}</div></div></article>`;
}
const cardsGrid = (s, cat = "All") => (s.items || []).filter(x => cat === "All" || x.category === cat).map(cardHtml).join("");

function sectionHtml(s) {
  const items = s.items || [];

  if (s.type === "contact") {
    const form = s.formEndpoint ? `<form class="contact-form" data-endpoint="${esc(s.formEndpoint)}"><input name="name" placeholder="আপনার নাম" required><input type="email" name="email" placeholder="ইমেইল" required><textarea name="message" rows="4" placeholder="বার্তা" required></textarea><button type="submit" class="btn primary full">মেসেজ পাঠান</button><p class="form-msg" aria-live="polite"></p></form>` : "";
    return `<section id="${esc(s.id)}" data-sec="${esc(s.id)}" class="section contact"><div><p class="eyebrow">${esc(s.eyebrow || "Contact")}</p><h2>${esc(s.title)}</h2>${s.body ? `<p class="lead">${nl(s.body)}</p>` : ""}${form}</div><div class="contact-links">${items.filter(x => linkHref(x.url, x.label)).map(x => `<a href="${esc(linkHref(x.url, x.label))}" target="_blank" rel="noopener">${esc(x.label || x.url)}</a>`).join("")}</div></section>`;
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
      body = `<div class="skill-grid">${items.filter(x => tagName(x)).map(x => {
        const name = tagName(x), desc = tagDesc(x), ic = typeof x === "object" && x.icon ? esc(x.icon) + " " : "";
        return desc
          ? `<button type="button" class="skill has-desc" data-modal-title="${esc(name)}" data-modal-desc="${esc(desc)}">${ic}${esc(name)} <span class="i">ⓘ</span></button>`
          : `<span class="skill">${ic}${esc(name)}</span>`;
      }).join("")}</div>`;
      break;
    case "timeline":
      body = `<div class="timeline">${items.map(x => `<article class="timeline-item">${x.type ? `<p class="eyebrow">${esc(x.type)}</p>` : ""}<h3>${esc(x.title)}</h3>${x.period ? `<div class="muted">${esc(x.period)}</div>` : ""}${x.description ? `<p>${nl(x.description)}</p>` : ""}</article>`).join("")}</div>`;
      break;
    case "gallery":
      body = `<div class="grid gallery">${items.filter(x => x.image).map(x => `<figure class="shot"><a href="${esc(safeUrl(x.image))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(opt(x.image, 700))}" alt="${esc(x.caption)}"></a>${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`;
      break;
    case "testimonials":
      body = `<div class="grid testi-grid">${items.filter(x => x.quote || x.name).map(x => `<figure class="testi">${x.avatar ? `<img class="testi-avatar" loading="lazy" src="${esc(opt(x.avatar, 200))}" alt="">` : `<span class="testi-avatar ph">👤</span>`}<blockquote>“${nl(x.quote || "")}”</blockquote><figcaption><b>${esc(x.name || "")}</b>${x.role ? `<span>${esc(x.role)}</span>` : ""}</figcaption></figure>`).join("")}</div>`;
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
  injectAnalytics(st.analyticsId);

  $("#brand").innerHTML = `${esc(st.brand)}<span>.</span>`;
  $("#heroEyebrow").textContent = p.eyebrow || "";
  $("#heroEyebrow").hidden = !p.eyebrow;
  $("#heroName").textContent = p.name;
  $("#heroName").classList.remove("skel");
  $("#heroTagline").textContent = p.tagline || "";
  $("#heroTagline").classList.remove("skel");
  $("#profileImage").src = opt(p.image || "assets/profile-placeholder.svg", 700);
  const b1 = $("#btn1"), b2 = $("#btn2"), b3 = $("#btn3");
  b1.textContent = p.btn1Text || ""; b1.href = safeUrl(p.btn1Link) || "#"; b1.hidden = !p.btn1Text;
  b2.textContent = p.btn2Text || ""; b2.href = safeUrl(p.btn2Link) || "#"; b2.hidden = !p.btn2Text;
  if (b3) { b3.href = safeUrl(st.cvUrl) || "#"; b3.hidden = !safeUrl(st.cvUrl); }
  $("#adminBtn").hidden = !!st.hideAdmin;

  const shown = data.sections.filter(s => s.visible !== false && hasContent(s));
  $("#navItems").innerHTML = shown.filter(s => s.nav !== false && s.title).map(s => `<a href="#${esc(s.id)}">${esc(s.type === "contact" ? (s.eyebrow || "Contact") : s.title)}</a>`).join("");
  $("#sections").innerHTML = shown.map(sectionHtml).join("");
  $("#footerName").textContent = p.name;
  $("#footerText").textContent = st.footer || "";
  $("#year").textContent = new Date().getFullYear();

  setupReveal();
  setupScrollSpy();
  setupImageFade();
  maybeShowWelcome();
}

// Loads Plausible analytics only if the owner set a domain, and only once
function injectAnalytics(domain) {
  if (!domain || document.getElementById("plausible-script")) return;
  const s = document.createElement("script");
  s.id = "plausible-script";
  s.defer = true;
  s.dataset.domain = domain;
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
}

// Fade images in once they've loaded instead of popping in abruptly
function setupImageFade() {
  document.querySelectorAll("#sections img, .hero-photo img").forEach(img => {
    if (img.complete) img.classList.add("loaded");
    else img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
  });
}

// Fade + slide sections/cards/etc into view as the visitor scrolls to them
let revealObserver;
function setupReveal() {
  document.querySelectorAll("#sections .section, #sections .card, #sections .timeline-item, #sections .skill, #sections .shot, #sections .testi").forEach(el => el.classList.add("reveal"));
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); revealObserver.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  } else revealObserver.disconnect();
  document.querySelectorAll("#sections .reveal").forEach(el => revealObserver.observe(el));
}

// Highlights the current section's link in the nav while scrolling
let spyObserver;
function setupScrollSpy() {
  if (spyObserver) spyObserver.disconnect();
  spyObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const link = document.querySelector(`#navItems a[href="#${CSS.escape(en.target.id)}"]`);
      if (link) link.classList.toggle("active", en.isIntersecting);
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  document.querySelectorAll("#sections [data-sec]").forEach(el => spyObserver.observe(el));
}

$("#sections").addEventListener("click", e => {
  const filterBtn = e.target.closest(".filter");
  if (filterBtn) {
    const box = filterBtn.closest("[data-sec]");
    const s = data.sections.find(x => x.id === box.dataset.sec);
    box.querySelectorAll(".filter").forEach(x => x.classList.toggle("active", x === filterBtn));
    box.querySelector(".grid").innerHTML = cardsGrid(s, filterBtn.dataset.cat);
    return;
  }
  if (e.target.closest(".card-link-btn")) return; // let the project link navigate normally
  const card = e.target.closest(".card, .skill.has-desc");
  if (card) openInfoModal(card.dataset);
});
$("#sections").addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".card, .skill.has-desc");
  if (card) { e.preventDefault(); openInfoModal(card.dataset); }
});
$("#menuBtn").onclick = () => $("#navLinks").classList.toggle("open");
$("#navLinks").addEventListener("click", e => { if (e.target.tagName === "A") $("#navLinks").classList.remove("open"); });

// Dark mode: remembered per visitor, defaults to their OS preference
const THEME_KEY = "joy-theme";
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  const btn = $("#themeBtn");
  if (btn) btn.textContent = t === "dark" ? "☀️" : "🌙";
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
}
$("#themeBtn")?.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});
initTheme();

// Back-to-top button: appears after scrolling past the hero
const backTop = $("#backTop");
if (backTop) {
  window.addEventListener("scroll", () => backTop.classList.toggle("show", window.scrollY > 600), { passive: true });
  backTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
}

// Contact form: posts to the owner's Formspree endpoint, if configured
$("#sections").addEventListener("submit", async e => {
  const form = e.target.closest(".contact-form");
  if (!form) return;
  e.preventDefault();
  const msg = form.querySelector(".form-msg");
  const btn = form.querySelector("button[type=submit]");
  msg.textContent = "পাঠানো হচ্ছে...";
  btn.disabled = true;
  try {
    const res = await fetch(form.dataset.endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error();
    msg.textContent = "ধন্যবাদ! আপনার বার্তা পাঠানো হয়েছে।";
    msg.classList.add("success");
    form.reset();
  } catch {
    msg.textContent = "দুঃখিত, পাঠানো যায়নি। আবার চেষ্টা করুন।";
    msg.classList.remove("success");
  } finally {
    btn.disabled = false;
  }
});

function openInfoModal(d) {
  const img = d.modalImg ? `<img class="info-img" src="${esc(d.modalImg)}" alt="">` : "";
  const cat = d.modalCat ? `<p class="eyebrow">${esc(d.modalCat)}</p>` : "";
  const link = d.modalUrl ? `<a class="btn primary" href="${esc(d.modalUrl)}" target="_blank" rel="noopener">${esc(d.modalLinktext || "Open")}</a>` : "";
  $("#infoModalBody").innerHTML = `${img}${cat}<h3>${esc(d.modalTitle || "")}</h3><p>${nl(d.modalDesc || "")}</p>${link}`;
  $("#infoModal").classList.remove("hidden");
}
const closeInfoModal = () => $("#infoModal").classList.add("hidden");
$("#infoModal").addEventListener("click", e => { if (e.target === $("#infoModal") || e.target.closest(".info-close")) closeInfoModal(); });
window.addEventListener("keydown", e => { if (e.key === "Escape") { closeInfoModal(); closeWelcomeModal(); } });

// Welcome popup: shown once per browser session, only if the owner enabled it and wrote something
const WELCOME_KEY = "joy-welcome-shown";
function maybeShowWelcome() {
  const w = data.settings.welcome;
  if (!w || !w.enabled || (!w.title && !w.body)) return;
  if (sessionStorage.getItem(WELCOME_KEY)) return;
  const wa = linkHref(w.whatsapp, "WhatsApp");
  $("#welcomeModalBody").innerHTML = `${w.emoji ? `<div class="welcome-emoji">${esc(w.emoji)}</div>` : ""}${w.title ? `<h3>${esc(w.title)}</h3>` : ""}${w.body ? `<p>${nl(w.body)}</p>` : ""}${wa ? `<a class="btn whatsapp" href="${esc(wa)}" target="_blank" rel="noopener">💬 WhatsApp-এ মেসেজ করুন</a>` : ""}`;
  $("#welcomeModal").classList.remove("hidden");
  sessionStorage.setItem(WELCOME_KEY, "1");
}
const closeWelcomeModal = () => $("#welcomeModal").classList.add("hidden");
$("#welcomeModal").addEventListener("click", e => { if (e.target === $("#welcomeModal") || e.target.closest(".info-close")) closeWelcomeModal(); });

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
    card("রেজুমে / CV", fld("settings.cvUrl", "CV/Resume-এর লিংক", { ph: "https://drive.google.com/..." }), "PDF আপলোড করে (Google Drive বা অন্য কোথাও) সেই লিংক এখানে বসান — হিরো সেকশনে একটা \"Download CV\" বাটন দেখা যাবে।") +
    card("ভিজিটর অ্যানালিটিক্স (ঐচ্ছিক)", fld("settings.analyticsId", "Plausible ডোমেইন", { ph: "yourdomain.github.io" }), "plausible.io-এ ফ্রি সাইন আপ করে আপনার ডোমেইন এখানে বসালে ভিজিটরের সংখ্যা ট্র্যাক করা যাবে। খালি রাখলে কিছু ট্র্যাক হবে না।") +
    card("অ্যাডমিন বাটন", chk("settings.hideAdmin", "ভিজিটরদের কাছ থেকে Admin বাটন লুকাও", false), "লুকালেও আপনি সাইটের ঠিকানার শেষে <b>#admin</b> লিখে (যেমন yoursite.github.io/#admin) লগইন করতে পারবেন।") +
    card("ব্যাকআপ", `<div class="btnrow"><button type="button" class="btn" data-act="backup">⬇ ব্যাকআপ নামান</button><label class="btn filebtn">⬆ ব্যাকআপ থেকে ফিরিয়ে আনুন<input type="file" accept=".json,application/json" hidden data-import></label></div>`, "বড় পরিবর্তনের আগে একটি ব্যাকআপ রেখে দেওয়া ভালো।") +
    card("স্বাগতম পপ-আপ (গ্লাস এফেক্ট)",
      chk("settings.welcome.enabled", "সাইট খুললেই একবার স্বাগতম পপ-আপ দেখাও", false) +
      row(fld("settings.welcome.emoji", "ইমোজি (ঐচ্ছিক)", { ph: "👋" }), fld("settings.welcome.title", "শিরোনাম / সালাম", { ph: "আসসালামু আলাইকুম!" })) +
      fld("settings.welcome.body", "আপনার সম্পর্কে কয়েক লাইন (ডিজাইনেশনসহ)", { area: 1, rows: 4 }) +
      fld("settings.welcome.whatsapp", "WhatsApp নম্বর (দেশের কোডসহ)", { ph: "8801XXXXXXXXX" }),
      "একবার বন্ধ করলে সেই ব্রাউজারে ঐ সেশনে আর দেখাবে না। ভিজিটর নতুন ট্যাবে বা পরের দিন এলে আবার দেখতে পাবে।");
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
          row(fld(`${P}.items.${j}.url`, "লিংক ১ (ঐচ্ছিক)", { ph: "https://... (Live demo)" }), fld(`${P}.items.${j}.linkText`, "লিংক ১ — বাটনের লেখা", { ph: "Live Demo" })) +
          row(fld(`${P}.items.${j}.url2`, "লিংক ২ (ঐচ্ছিক)", { ph: "https://... (Source code)" }), fld(`${P}.items.${j}.linkText2`, "লিংক ২ — বাটনের লেখা", { ph: "Source Code" })) +
          fld(`${P}.items.${j}.icon`, "ছোট আইকন/ইমোজি (ঐচ্ছিক)", { ph: "🚀" }) +
          imgFld(`${P}.items.${j}.image`, "ছবি")
        )).join("") +
        `<button type="button" class="small-btn add" data-act="item-add" data-s="${i}">+ নতুন কার্ড</button>`);
      break;

    case "tags":
      h += card("স্কিলসমূহ",
        `<p class="muted small">প্রতিটা স্কিলে বিবরণ ও আইকন ঐচ্ছিক — বিবরণ লিখলে ভিজিটর ক্লিক করে বিস্তারিত দেখতে পারবেন।</p>` +
        items.map((x, j) => itemBox(s, i, j, "", tagName(x),
          row(fld(`${P}.items.${j}.name`, "স্কিলের নাম", { ph: "যেমন: Facebook Ads" }), fld(`${P}.items.${j}.icon`, "আইকন/ইমোজি (ঐচ্ছিক)", { ph: "📈" })) +
          fld(`${P}.items.${j}.description`, "বিবরণ (ঐচ্ছিক)", { area: 1, rows: 3 })
        )).join("") +
        `<button type="button" class="small-btn add" data-act="item-add" data-s="${i}">+ নতুন স্কিল</button>`);
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

    case "testimonials":
      h += card("মতামতসমূহ",
        items.map((x, j) => itemBox(s, i, j, x.avatar, x.name,
          fld(`${P}.items.${j}.quote`, "মন্তব্য", { area: 1, rows: 3 }) +
          row(fld(`${P}.items.${j}.name`, "নাম"), fld(`${P}.items.${j}.role`, "পদবি/প্রতিষ্ঠান", { ph: "যেমন: Client, ABC Ltd." })) +
          imgFld(`${P}.items.${j}.avatar`, "ছবি (ঐচ্ছিক)")
        )).join("") +
        `<button type="button" class="small-btn add" data-act="item-add" data-s="${i}">+ নতুন মতামত</button>`);
      break;

    case "contact":
      h += card("পরিচিতি লেখা", fld(`${P}.body`, "লেখা", { area: 1, rows: 3 })) +
        card("লিংকসমূহ",
          `<p class="muted small">ইমেইল, ফোন নম্বর বা লিংক যেকোনোটি লিখুন — নিজে থেকেই সঠিক লিংক হয়ে যাবে। WhatsApp-এর জন্য শুধু ফোন নম্বর লিখলেই চলবে (দেশের কোডসহ, যেমন 8801XXXXXXXXX)।</p>` +
          items.map((x, j) => `<div class="linkrow"><input data-path="${P}.items.${j}.label" value="${esc(x.label || "")}" placeholder="নাম (Facebook)"><input data-path="${P}.items.${j}.url" value="${esc(x.url || "")}" placeholder="লিংক / ইমেইল / ফোন"><button type="button" class="small-btn" data-act="item-up" data-s="${i}" data-i="${j}">↑</button><button type="button" class="small-btn danger" data-act="item-del" data-s="${i}" data-i="${j}">✕</button></div>`).join("") +
          `<div class="btnrow quick">${SOCIALS.map(n => `<button type="button" class="small-btn" data-act="item-add" data-s="${i}" data-label="${n}">+ ${n}</button>`).join("")}<button type="button" class="small-btn add" data-act="item-add" data-s="${i}">+ অন্য লিংক</button></div>`) +
        card("মেসেজ ফর্ম (ঐচ্ছিক)",
          fld(`${P}.formEndpoint`, "Formspree ফর্ম URL", { ph: "https://formspree.io/f/xxxxxxx" }),
          `formspree.io-এ ফ্রি অ্যাকাউন্ট খুলে একটা ফর্ম বানালে এই URL পাবেন। খালি রাখলে ফর্ম দেখাবে না।`);
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
        cards: { title: "নতুন কার্ড", category: "", description: "", image: "", url: "", linkText: "Open", url2: "", linkText2: "", icon: "" },
        timeline: { type: "Experience", title: "নতুন আইটেম", period: "", description: "" },
        tags: { name: "", description: "", icon: "" },
        testimonials: { quote: "", name: "", role: "", avatar: "" },
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
    clean.sections.forEach(s => { if (s.type === "tags") s.items = s.items.filter(x => tagName(x)); });
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
