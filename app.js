import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { cloudinaryConfig } from "./cloudinary-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_UID = "X8IuyH0h6nSUqn7066tGQKodEWV2";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const nl = v => esc(v).replace(/\n/g, "<br>");
const rid = () => "sec-" + Math.random().toString(36).slice(2, 8);

// Only allow safe URL schemes (blocks javascript: etc.)
const safeUrl = v => {
  v = String(v ?? "").trim();
  return /^(https?:|mailto:|tel:|assets\/|\.?\/|#)/i.test(v) ? v : "";
};

// Turns "abc@mail.com" -> mailto:, "+8801..." -> tel:, "facebook.com/x" -> https://
function linkHref(v) {
  v = String(v ?? "").trim();
  if (!v) return "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "mailto:" + v;
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return "tel:" + v.replace(/[\s()-]/g, "");
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^[#\/]/.test(v) && !v.startsWith("assets/")) v = "https://" + v;
  return safeUrl(v);
}

// Cloudinary automatic format/quality/width for faster loading
const opt = (u, w = 900) => {
  u = safeUrl(u);
  return /res\.cloudinary\.com\/.+\/upload\//.test(u) ? u.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`) : u;
};

const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
};

const getPath = p => p.split(".").reduce((o, k) => (o == null ? o : o[k]), data);
const setPath = (p, val) => {
  const k = p.split(".");
  let o = data;
  for (let i = 0; i < k.length - 1; i++) o = o[k[i]];
  o[k[k.length - 1]] = val;
};

/* ------------------------------------------------------------------ */
/* Section types & default data                                        */
/* ------------------------------------------------------------------ */
const TYPES = {
  text: "টেক্সট (About, Story ইত্যাদি)",
  cards: "কার্ড (Projects, Services, Certificates)",
  tags: "ট্যাগ লিস্ট (Skills, Tools)",
  timeline: "টাইমলাইন (Experience, Education)",
  gallery: "ফটো গ্যালারি",
  contact: "যোগাযোগ / লিংক"
};

function newSection(type, id) {
  const base = { id: id || rid(), type, title: "নতুন সেকশন", eyebrow: "", visible: true, nav: true };
  if (type === "text") return { ...base, body: "", image: "" };
  if (type === "cards") return { ...base, showFilter: true, items: [] };
  if (type === "tags" || type === "timeline" || type === "gallery") return { ...base, items: [] };
  if (type === "contact") return { ...base, title: "Let's connect.", eyebrow: "Contact", body: "", items: [] };
  return base;
}

function defaultData() {
  const s = (type, id, o) => ({ ...newSection(type, id), ...o });
  return {
    profile: {
      name: "Abidur Rahman Joy",
      eyebrow: "D. Agriculturist • Batch Designer • Digital Creator",
      tagline: "D. Agriculturist | Batch Designer | Digital Creator",
      image: "assets/profile-placeholder.svg",
      btn1Text: "View my work", btn1Link: "#projects",
      btn2Text: "Contact", btn2Link: "#contact"
    },
    settings: { brand: "Joy", footer: "Built with care" },
    sections: [
      s("text", "about", { title: "Who I am", eyebrow: "About", body: "I combine agriculture, digital marketing, and graphic design to build practical projects and useful digital experiences." }),
      s("cards", "projects", { title: "Projects", eyebrow: "Selected work" }),
      s("tags", "skills", { title: "Skills", eyebrow: "Capabilities", items: ["Agriculture", "Digital Marketing", "Graphic Design", "AI Content Creation", "Web/App Projects"] }),
      s("timeline", "experience", {
        title: "Experience & Education", eyebrow: "Journey",
        items: [
          { type: "Education", title: "BAgEd — Bangladesh Open University", period: "Current · 5th semester", description: "Bachelor in Agricultural Education." },
          { type: "Education", title: "Diploma in Agriculture", period: "CGPA 3.77 / 4.00", description: "Agriculture Training Institute, Araihazer, Narayanganj." }
        ]
      }),
      s("cards", "certificates", { title: "Certificates", eyebrow: "Credentials", showFilter: false }),
      s("contact", "contact", { title: "Let's connect.", eyebrow: "Contact", body: "For collaborations and professional opportunities, feel free to get in touch." })
    ]
  };
}

// Converts old saved data (projects/skills/timeline at top level) to the new "sections" format
function normalize(saved) {
  const d = defaultData();
  if (!saved) return d;
  if (Array.isArray(saved.sections)) {
    return {
      profile: { ...d.profile, ...saved.profile },
      settings: { ...d.settings, ...saved.settings },
      sections: saved.sections
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
let loaded = false;   // true if Firestore was read successfully
let dirty = false;    // unsaved changes in editor

/* ------------------------------------------------------------------ */
/* Public website rendering                                            */
/* ------------------------------------------------------------------ */
const head = s => `<div class="section-head">${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ""}<h2>${esc(s.title)}</h2></div>`;

function cardHtml(x) {
  const href = linkHref(x.url);
  return `<article class="card">${x.image ? `<img class="card-img" loading="lazy" src="${esc(opt(x.image))}" alt="${esc(x.title)}">` : ""}<div class="card-body">${x.category ? `<p class="eyebrow">${esc(x.category)}</p>` : ""}<h3>${esc(x.title)}</h3>${x.description ? `<p>${nl(x.description)}</p>` : ""}${href ? `<a class="btn" href="${esc(href)}" target="_blank" rel="noopener">${esc(x.linkText || "Open")}</a>` : ""}</div></article>`;
}

function cardsGrid(s, cat = "All") {
  const arr = (s.items || []).filter(x => cat === "All" || x.category === cat);
  return arr.length ? arr.map(cardHtml).join("") : `<p class="muted">শীঘ্রই এখানে কনটেন্ট যোগ হবে।</p>`;
}

function sectionHtml(s) {
  const items = s.items || [];
  let inner = "";
  switch (s.type) {
    case "text":
      inner = `${head(s)}<div class="text-wrap ${s.image ? "has-img" : ""}"><div class="lead">${String(s.body || "").split(/\n+/).filter(Boolean).map(t => `<p>${esc(t)}</p>`).join("")}</div>${s.image ? `<img class="text-img" loading="lazy" src="${esc(opt(s.image, 800))}" alt="">` : ""}</div>`;
      break;
    case "cards": {
      const cats = [...new Set(items.map(x => x.category).filter(Boolean))];
      const filters = s.showFilter && cats.length > 1 ? `<div class="filters">${["All", ...cats].map((c, i) => `<button class="filter ${i === 0 ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : "";
      inner = `${head(s)}${filters}<div class="grid">${cardsGrid(s)}</div>`;
      break;
    }
    case "tags":
      inner = `${head(s)}<div class="skill-grid">${items.filter(Boolean).map(t => `<span class="skill">${esc(t)}</span>`).join("")}</div>`;
      break;
    case "timeline":
      inner = `${head(s)}<div class="timeline">${items.map(x => `<article class="timeline-item">${x.type ? `<p class="eyebrow">${esc(x.type)}</p>` : ""}<h3>${esc(x.title)}</h3>${x.period ? `<div class="muted">${esc(x.period)}</div>` : ""}${x.description ? `<p>${nl(x.description)}</p>` : ""}</article>`).join("")}</div>`;
      break;
    case "gallery":
      inner = `${head(s)}<div class="grid gallery">${items.filter(x => x.image).map(x => `<figure class="shot"><a href="${esc(safeUrl(x.image))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(opt(x.image, 700))}" alt="${esc(x.caption)}"></a>${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`;
      break;
    case "contact":
      inner = `<div><p class="eyebrow">${esc(s.eyebrow || "Contact")}</p><h2>${esc(s.title)}</h2>${s.body ? `<p class="lead">${nl(s.body)}</p>` : ""}</div><div class="contact-links">${items.filter(x => linkHref(x.url)).map(x => `<a href="${esc(linkHref(x.url))}" target="_blank" rel="noopener">${esc(x.label || x.url)}</a>`).join("")}</div>`;
      break;
  }
  return `<section id="${esc(s.id)}" data-sec="${esc(s.id)}" class="section ${s.type === "contact" ? "contact" : ""}">${inner}</section>`;
}

function render() {
  const p = data.profile;
  document.title = `${p.name} — Portfolio`;
  $("#brand").innerHTML = `${esc(data.settings.brand)}<span>.</span>`;
  $("#heroEyebrow").textContent = p.eyebrow || "";
  $("#heroName").textContent = p.name;
  $("#heroTagline").textContent = p.tagline || "";
  $("#profileImage").src = opt(p.image || "assets/profile-placeholder.svg", 700);
  const b1 = $("#btn1"), b2 = $("#btn2");
  b1.textContent = p.btn1Text || ""; b1.href = safeUrl(p.btn1Link) || "#"; b1.hidden = !p.btn1Text;
  b2.textContent = p.btn2Text || ""; b2.href = safeUrl(p.btn2Link) || "#"; b2.hidden = !p.btn2Text;

  const shown = data.sections.filter(s => s.visible !== false);
  $("#navItems").innerHTML = shown.filter(s => s.nav !== false && s.title).map(s => `<a href="#${esc(s.id)}">${esc(s.type === "contact" ? (s.eyebrow || "Contact") : s.title)}</a>`).join("");
  $("#sections").innerHTML = shown.map(sectionHtml).join("");
  $("#footerName").textContent = p.name;
  $("#footerText").textContent = data.settings.footer || "";
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
$("#adminBtn").onclick = () => $("#adminModal").classList.remove("hidden");
document.querySelector("[data-close]").onclick = () => {
  if (dirty && !confirm("সেভ না করা পরিবর্তন আছে। তবুও বন্ধ করবেন?")) return;
  $("#adminModal").classList.add("hidden");
};

/* ------------------------------------------------------------------ */
/* Load data                                                           */
/* ------------------------------------------------------------------ */
async function loadData() {
  try {
    const snap = await getDoc(doc(db, "site", "portfolio"));
    data = normalize(snap.exists() ? snap.data() : null);
    loaded = true;
  } catch (e) {
    console.warn(e);
    data = defaultData();
  }
  render();
}
const ready = loadData();

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
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
  dirty = false;
  signOut(auth);
};

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */
const openIds = new Set();

const fld = (path, label, o = {}) => {
  const v = getPath(path) ?? "";
  const ph = esc(o.ph || "");
  const el = o.area
    ? `<textarea data-path="${path}" rows="${o.rows || 3}" placeholder="${ph}">${esc(v)}</textarea>`
    : `<input data-path="${path}" value="${esc(v)}" placeholder="${ph}">`;
  return `<label class="fld">${label}${el}</label>`;
};

const chk = (path, label, def = true) => `<label class="check"><input type="checkbox" data-path="${path}" ${(getPath(path) ?? def) ? "checked" : ""}> ${label}</label>`;

const imgFld = (path, label) => {
  const v = getPath(path) || "";
  return `<div class="imgfld"><span>${label}</span>${v ? `<img class="upload-preview" src="${esc(opt(v, 300))}" alt="">` : ""}<div class="imgbtns"><label class="small-btn filebtn">📷 ছবি আপলোড<input type="file" accept="image/*" hidden data-upload="${path}"></label>${v ? `<button type="button" class="small-btn danger" data-act="clear-img" data-path="${path}">ছবি সরান</button>` : ""}</div></div>`;
};

const itemBox = (i, j, label, inner) => `<div class="repeat"><div class="repeat-head"><b>${label} ${j + 1}</b><span class="btnrow"><button type="button" class="small-btn" data-act="item-up" data-s="${i}" data-i="${j}">↑</button><button type="button" class="small-btn" data-act="item-down" data-s="${i}" data-i="${j}">↓</button><button type="button" class="small-btn danger" data-act="item-del" data-s="${i}" data-i="${j}">মুছুন</button></span></div>${inner}</div>`;

function sectionEditor(s, i) {
  const P = `sections.${i}`;
  const items = s.items || [];
  let body = `<div class="btnrow toolbar"><button type="button" class="small-btn" data-act="sec-up" data-s="${i}">↑ উপরে</button><button type="button" class="small-btn" data-act="sec-down" data-s="${i}">↓ নিচে</button><button type="button" class="small-btn danger" data-act="sec-del" data-s="${i}">🗑 সেকশন মুছুন</button></div>`;
  body += `<div class="checks">${chk(`${P}.visible`, "ওয়েবসাইটে দেখাও")}${chk(`${P}.nav`, "মেনুতে দেখাও")}</div>`;
  body += `<div class="row">${fld(`${P}.eyebrow`, "ছোট লেখা (উপরে)")}${fld(`${P}.title`, "শিরোনাম")}</div>`;

  const addBtn = label => `<button type="button" class="small-btn add" data-act="item-add" data-s="${i}">+ ${label}</button>`;

  switch (s.type) {
    case "text":
      body += fld(`${P}.body`, "লেখা (নতুন লাইন = নতুন প্যারাগ্রাফ)", { area: 1, rows: 7 }) + imgFld(`${P}.image`, "ছবি (ঐচ্ছিক)");
      break;
    case "cards":
      body += chk(`${P}.showFilter`, "ক্যাটেগরি ফিল্টার দেখাও", false);
      body += items.map((x, j) => itemBox(i, j, "কার্ড",
        `<div class="row">${fld(`${P}.items.${j}.title`, "শিরোনাম")}${fld(`${P}.items.${j}.category`, "ক্যাটেগরি")}</div>` +
        fld(`${P}.items.${j}.description`, "বিবরণ", { area: 1, rows: 3 }) +
        `<div class="row">${fld(`${P}.items.${j}.url`, "লিংক (ঐচ্ছিক)", { ph: "https://..." })}${fld(`${P}.items.${j}.linkText`, "বাটনের লেখা", { ph: "Open project" })}</div>` +
        imgFld(`${P}.items.${j}.image`, "ছবি")
      )).join("");
      body += addBtn("নতুন কার্ড যোগ করুন");
      break;
    case "tags":
      body += `<label class="fld">প্রতি লাইনে একটি করে<textarea data-path="${P}.items" data-lines="1" rows="7">${esc(items.join("\n"))}</textarea></label>`;
      break;
    case "timeline":
      body += items.map((x, j) => itemBox(i, j, "আইটেম",
        `<div class="row">${fld(`${P}.items.${j}.type`, "ধরন", { ph: "Education / Experience" })}${fld(`${P}.items.${j}.period`, "সময়কাল")}</div>` +
        fld(`${P}.items.${j}.title`, "শিরোনাম") +
        fld(`${P}.items.${j}.description`, "বিবরণ", { area: 1, rows: 3 })
      )).join("");
      body += addBtn("নতুন আইটেম যোগ করুন");
      break;
    case "gallery":
      body += items.map((x, j) => itemBox(i, j, "ছবি",
        imgFld(`${P}.items.${j}.image`, "ছবি") + fld(`${P}.items.${j}.caption`, "ক্যাপশন")
      )).join("");
      body += addBtn("নতুন ছবি যোগ করুন");
      break;
    case "contact":
      body += fld(`${P}.body`, "পরিচিতি লেখা", { area: 1, rows: 3 });
      body += `<p class="muted small">ইমেইল, ফোন নম্বর বা লিংক যেকোনোটি লিখতে পারেন — নিজে থেকেই ঠিক লিংক হয়ে যাবে।</p>`;
      body += items.map((x, j) => itemBox(i, j, "লিংক",
        `<div class="row">${fld(`${P}.items.${j}.label`, "নাম", { ph: "Facebook" })}${fld(`${P}.items.${j}.url`, "লিংক / ইমেইল / ফোন", { ph: "facebook.com/yourname" })}</div>`
      )).join("");
      body += addBtn("নতুন লিংক যোগ করুন");
      break;
  }

  return `<details class="editor-section" data-sid="${esc(s.id)}" ${openIds.has(s.id) ? "open" : ""}><summary><b>${esc(s.title || "(শিরোনামহীন)")}</b> <small>${TYPES[s.type] || s.type}${s.visible === false ? " · লুকানো" : ""}</small></summary><div class="sec-body">${body}</div></details>`;
}

function editorHtml() {
  const types = Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  return `
  <details class="editor-section" data-sid="__profile" ${openIds.has("__profile") ? "open" : ""}><summary><b>প্রোফাইল / হিরো</b> <small>নাম, ছবি, বাটন</small></summary><div class="sec-body">
    <div class="row">${fld("profile.name", "নাম")}${fld("profile.eyebrow", "নামের উপরের লেখা")}</div>
    ${fld("profile.tagline", "ট্যাগলাইন")}
    ${imgFld("profile.image", "প্রোফাইল ছবি")}
    <div class="row">${fld("profile.btn1Text", "বাটন ১ লেখা")}${fld("profile.btn1Link", "বাটন ১ লিংক", { ph: "#projects" })}</div>
    <div class="row">${fld("profile.btn2Text", "বাটন ২ লেখা")}${fld("profile.btn2Link", "বাটন ২ লিংক", { ph: "#contact" })}</div>
    <div class="row">${fld("settings.brand", "লোগো লেখা (উপরে বামে)")}${fld("settings.footer", "ফুটার লেখা")}</div>
  </div></details>
  <h3 class="sec-title">সেকশনসমূহ</h3>
  ${data.sections.map(sectionEditor).join("")}
  <div class="add-sec"><select id="newType">${types}</select><button type="button" class="btn primary" data-act="sec-add">+ নতুন সেকশন যোগ করুন</button></div>`;
}

function buildEditor() {
  const box = $(".modal-card");
  const top = box.scrollTop;
  $("#editor").innerHTML = editorHtml();
  box.scrollTop = top;
}

const setMsg = (t, cls = "") => { const m = $("#saveMsg"); m.textContent = t; m.className = "msg " + cls; };

// Typing updates data directly, so nothing is lost when the editor re-renders
$("#editor").addEventListener("input", e => {
  const el = e.target;
  if (!el.dataset.path) return;
  let v = el.type === "checkbox" ? el.checked : el.value;
  if (el.dataset.lines) v = v.split("\n").map(x => x.trim());
  setPath(el.dataset.path, v);
  dirty = true;
});

$("#editor").addEventListener("toggle", e => {
  const d = e.target;
  if (d.dataset && d.dataset.sid) d.open ? openIds.add(d.dataset.sid) : openIds.delete(d.dataset.sid);
}, true);

$("#editor").addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  const si = +b.dataset.s, ii = +b.dataset.i;
  const sec = data.sections[si];

  if (act === "sec-add") {
    const s = newSection($("#newType").value);
    data.sections.push(s);
    openIds.add(s.id);
  } else if (act === "sec-del") {
    if (!confirm(`"${sec.title}" সেকশনটি মুছে ফেলবেন?`)) return;
    data.sections.splice(si, 1);
  } else if (act === "sec-up") move(data.sections, si, -1);
  else if (act === "sec-down") move(data.sections, si, 1);
  else if (act === "item-add") {
    const t = { cards: { title: "নতুন কার্ড", category: "", description: "", image: "", url: "", linkText: "Open" }, timeline: { type: "Experience", title: "নতুন আইটেম", period: "", description: "" }, gallery: { image: "", caption: "" }, contact: { label: "", url: "" } }[sec.type];
    if (t) sec.items.push({ ...t });
  } else if (act === "item-del") {
    if (!confirm("এই আইটেমটি মুছে ফেলবেন?")) return;
    sec.items.splice(ii, 1);
  } else if (act === "item-up") move(sec.items, ii, -1);
  else if (act === "item-down") move(sec.items, ii, 1);
  else if (act === "clear-img") setPath(b.dataset.path, "");
  else return;

  dirty = true;
  buildEditor();
  if (act === "sec-add") {
    const last = [...document.querySelectorAll("#editor details")].pop();
    last && last.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

// Image upload starts immediately when a file is chosen
$("#editor").addEventListener("change", async e => {
  const el = e.target;
  if (!el.dataset.upload) return;
  const f = el.files[0];
  if (!f) return;
  setMsg("ছবি আপলোড হচ্ছে...");
  try {
    const url = await uploadFile(f, "portfolio");
    setPath(el.dataset.upload, url);
    dirty = true;
    buildEditor();
    setMsg("ছবি আপলোড হয়েছে। এখন 'Save all changes' চাপুন।", "success");
  } catch (err) {
    console.error(err);
    setMsg("আপলোড ব্যর্থ: " + err.message, "");
  }
});

async function shrink(file, max = 1600) {
  if (!file.type.startsWith("image/") || /svg|gif/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/webp", 0.86));
    return blob || file;
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
  if (!res.ok) throw new Error(out.error?.message || "Cloudinary upload failed");
  return out.secure_url;
}

async function saveAll() {
  if (!loaded && !confirm("সার্ভার থেকে আগের ডেটা লোড হয়নি। এখন সেভ করলে আগের ডেটা মুছে যেতে পারে। তবুও সেভ করবেন?")) return;
  setMsg("Saving...");
  try {
    const clean = JSON.parse(JSON.stringify(data)); // removes undefined values
    clean.sections.forEach(s => { if (s.type === "tags") s.items = s.items.filter(Boolean); });
    await setDoc(doc(db, "site", "portfolio"), clean);
    data = clean;
    loaded = true;
    dirty = false;
    render();
    buildEditor();
    setMsg("Saved successfully ✓", "success");
  } catch (e) {
    console.error(e);
    setMsg("Save failed: " + (e.code || e.message), "");
  }
}
$("#saveAll").onclick = saveAll;

$("#backupBtn").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = "portfolio-backup.json";
  a.click();
};

window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
