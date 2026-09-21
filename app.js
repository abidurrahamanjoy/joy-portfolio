(() => {
  const KEY = "joy_portfolio_v1";
  let data = loadData();
  let activeFilter = "All";

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function loadData(){
    try { const saved = localStorage.getItem(KEY); return saved ? {...clone(window.DEFAULT_PORTFOLIO), ...JSON.parse(saved)} : clone(window.DEFAULT_PORTFOLIO); }
    catch(e){ return clone(window.DEFAULT_PORTFOLIO); }
  }
  function saveLocal(){ localStorage.setItem(KEY, JSON.stringify(data)); }
  function esc(v=""){ return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function validUrl(url){ return /^(https?:|mailto:|tel:|#)/i.test(url||""); }

  function render(){
    const p=data.profile, c=data.contact;
    document.title = `${p.name} — Personal Portfolio`;
    $("#brandName").textContent=p.brandName||p.name; $("#footerName").textContent=p.name;
    $("#availability").textContent=p.availability; $("#heroKicker").textContent=p.kicker; $("#heroTitle").textContent=p.heroTitle;
    $("#heroDescription").textContent=p.heroDescription; $("#profileImage").src=p.profileImage||"assets/profile-placeholder.svg";
    $("#profileImage").alt=`${p.name} profile photo`; $("#floatingTopTitle").textContent=p.floatingTopTitle; $("#floatingTopText").textContent=p.floatingTopText;
    $("#projectCount").textContent=String(data.projects.length).padStart(2,"0");
    $("#aboutHeading").textContent=p.aboutHeading; $("#aboutText").textContent=p.aboutText;
    $("#heroMeta").innerHTML=(p.meta||[]).map(x=>`<span>${esc(x)}</span>`).join("");
    $("#stats").innerHTML=(p.stats||[]).map(s=>`<div class="stat"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join("");
    $("#principles").innerHTML=(p.principles||[]).map(x=>`<div class="principle"><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join("");
    renderProjects(); renderSkills(); renderTimeline(); renderCertificates(); renderContact();
    $("#year").textContent=new Date().getFullYear();
    observeReveals();
  }

  function renderProjects(){
    const cats=["All",...new Set(data.projects.map(x=>x.category))];
    $("#projectFilters").innerHTML=cats.map(c=>`<button class="filter ${activeFilter===c?"active":""}" data-filter="${esc(c)}">${esc(c)}</button>`).join("");
    $$("#projectFilters .filter").forEach(b=>b.onclick=()=>{activeFilter=b.dataset.filter;renderProjects();});
    const list=activeFilter==="All"?data.projects:data.projects.filter(x=>x.category===activeFilter);
    $("#projectGrid").innerHTML=list.length?list.map((x,i)=>`
      <article class="project-card">
        <div class="project-cover"><img loading="lazy" src="${esc(x.image||"assets/project-placeholder.svg")}" alt="${esc(x.title)} preview"><span class="project-number">${String(i+1).padStart(2,"0")}</span></div>
        <div class="project-body"><div class="project-tags">${(x.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>
        <h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>${validUrl(x.link)?`<a class="project-link" href="${esc(x.link)}" target="_blank" rel="noopener">View project ↗</a>`:""}</div>
      </article>`).join(""):`<div class="empty">No projects in this category yet.</div>`;
  }
  function renderSkills(){ $("#skillsGrid").innerHTML=(data.skills||[]).map(x=>`<div class="skill-card"><div class="skill-head"><h3>${esc(x.title)}</h3><span class="skill-icon">${esc(x.icon||"✦")}</span></div><div class="skill-list">${(x.items||[]).map(i=>`<span class="skill-pill">${esc(i)}</span>`).join("")}</div></div>`).join(""); }
  function renderTimeline(){ $("#timeline").innerHTML=(data.timeline||[]).map(x=>`<div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-top"><h3>${esc(x.title)}</h3><span class="timeline-date">${esc(x.date)}</span></div><div class="timeline-place">${esc(x.type)} · ${esc(x.place)}</div><p class="timeline-desc">${esc(x.description)}</p></div>`).join(""); }
  function renderCertificates(){ $("#certificateGrid").innerHTML=(data.certificates||[]).map(x=>`<article class="certificate"><img loading="lazy" src="${esc(x.image||"assets/certificate-placeholder.svg")}" alt="${esc(x.title)}"><div class="certificate-body"><h3>${esc(x.title)}</h3><p>${esc(x.issuer)} ${validUrl(x.link)?`· <a href="${esc(x.link)}" target="_blank" rel="noopener">Verify ↗</a>`:""}</p></div></article>`).join(""); }
  function renderContact(){
    const c=data.contact;
    $("#contactHeading").textContent=c.heading; $("#contactText").textContent=c.text;
    const arr=[];
    if(c.email && c.email!=="your.email@example.com") arr.push(`<a class="btn btn-primary" href="mailto:${esc(c.email)}">Email me ↗</a>`);
    if(validUrl(c.github)) arr.push(`<a class="btn btn-secondary" href="${esc(c.github)}" target="_blank" rel="noopener">GitHub</a>`);
    if(validUrl(c.linkedin)) arr.push(`<a class="btn btn-secondary" href="${esc(c.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
    if(validUrl(c.facebook)) arr.push(`<a class="btn btn-secondary" href="${esc(c.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
    $("#contactActions").innerHTML=arr.join("")||`<a class="btn btn-secondary" href="#top">Back to top ↑</a>`;
  }

  function observeReveals(){
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.08});
    $$(".reveal:not(.visible)").forEach(x=>io.observe(x));
  }

  // Navigation / theme
  $("#menuToggle").onclick=()=>{const open=$("#navLinks").classList.toggle("open");$("#menuToggle").setAttribute("aria-expanded",open)};
  $$("#navLinks a").forEach(a=>a.onclick=()=>$("#navLinks").classList.remove("open"));
  $("#themeToggle").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("joy_theme",document.body.classList.contains("dark")?"dark":"light");$("#themeToggle").textContent=document.body.classList.contains("dark")?"☀":"☾"};
  if(localStorage.getItem("joy_theme")==="dark"){document.body.classList.add("dark");$("#themeToggle").textContent="☀"}
  window.addEventListener("scroll",()=>{const h=document.documentElement.scrollHeight-innerHeight;$("#scrollProgress").style.width=(scrollY/Math.max(h,1)*100)+"%";$(".site-header").classList.toggle("scrolled",scrollY>8)});

  // Editor
  let editorTab="profile";
  const modal=$("#editorModal");
  $("#editOpen").onclick=()=>{modal.classList.add("open");modal.setAttribute("aria-hidden","false");renderEditor()};
  $("#editClose").onclick=closeEditor;
  modal.addEventListener("click",e=>{if(e.target===modal)closeEditor()});
  function closeEditor(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true")}
  $$(".editor-tab").forEach(t=>t.onclick=()=>{editorTab=t.dataset.tab;$$(".editor-tab").forEach(x=>x.classList.toggle("active",x===t));renderEditor()});

  const field=(label,key,value,full=false,type="text")=>`<div class="field ${full?"full":""}"><label>${esc(label)}</label>${type==="textarea"?`<textarea data-key="${esc(key)}">${esc(value||"")}</textarea>`:`<input type="${type}" data-key="${esc(key)}" value="${esc(value||"")}">`}</div>`;
  function renderEditor(){
    let html="";
    if(editorTab==="profile"){
      const p=data.profile;
      html=`<div class="form-grid">
        ${field("Name","name",p.name)}${field("Brand name","brandName",p.brandName)}
        ${field("Availability","availability",p.availability)}${field("Kicker","kicker",p.kicker)}
        ${field("Hero title","heroTitle",p.heroTitle,true,"textarea")}
        ${field("Hero description","heroDescription",p.heroDescription,true,"textarea")}
        ${field("Profile image path or URL","profileImage",p.profileImage,true)}
        ${field("Floating card title","floatingTopTitle",p.floatingTopTitle)}${field("Floating card text","floatingTopText",p.floatingTopText)}
        ${field("About heading","aboutHeading",p.aboutHeading,true,"textarea")}
        ${field("About text","aboutText",p.aboutText,true,"textarea")}
        ${field("Meta items — one per line","meta",(p.meta||[]).join("\\n"),true,"textarea")}
      </div><h3>Edit stats</h3>${repeatEditor("stats",p.stats,["value","label"],["Value","Label"])}
      <h3>Edit principles</h3>${repeatEditor("principles",p.principles,["title","text"],["Title","Text"])}`;
    } else if(editorTab==="projects") html=repeatEditor("projects",data.projects,["title","category","image","description","tags","link"],["Title","Category","Image path / URL","Description","Tags (comma separated)","Project link"]);
    else if(editorTab==="skills") html=repeatEditor("skills",data.skills,["icon","title","items"],["Icon","Title","Items (comma separated)"]);
    else if(editorTab==="timeline") html=repeatEditor("timeline",data.timeline,["type","title","place","date","description"],["Type","Title","Place","Date","Description"]);
    else if(editorTab==="contact"){const c=data.contact;html=`<div class="form-grid">${field("Heading","heading",c.heading,true,"textarea")}${field("Text","text",c.text,true,"textarea")}${field("Email","email",c.email)}${field("Phone","phone",c.phone)}${field("GitHub URL","github",c.github)}${field("Facebook URL","facebook",c.facebook)}${field("LinkedIn URL","linkedin",c.linkedin)}</div>`}
    $("#editorBody").innerHTML=html;
    bindEditor();
  }
  function repeatEditor(name,items,keys,labels){
    return `<div class="repeat-row" data-repeat="${name}">${(items||[]).map((item,i)=>`<div class="repeat-card" data-index="${i}"><div class="repeat-card-head"><strong>${name.slice(0,-1)} #${i+1}</strong><button class="danger remove-item" data-index="${i}">Delete</button></div><div class="form-grid">${keys.map((k,j)=>field(labels[j],k,Array.isArray(item[k])?item[k].join(", "):item[k],k==="description"||k==="text"||k==="image"||k==="link")).join("")}</div></div>`).join("")}<button class="btn btn-secondary add-item" type="button">+ Add item</button></div>`;
  }
  function bindEditor(){
    $$("#editorBody .remove-item").forEach(b=>b.onclick=()=>{const wrap=b.closest("[data-repeat]"),name=wrap.dataset.repeat;data[name].splice(+b.dataset.index,1);renderEditor()});
    $$("#editorBody .add-item").forEach(b=>b.onclick=()=>{const name=b.closest("[data-repeat]").dataset.repeat;const templates={projects:{title:"New project",category:"Web App",image:"assets/project-placeholder.svg",description:"Describe the project.",tags:["Web"],link:"#"},skills:{icon:"✦",title:"New skill group",items:["Skill"]},timeline:{type:"Experience",title:"New experience",place:"Organization",date:"Year",description:"Description."},principles:{title:"New principle",text:"Description."},stats:{value:"00",label:"New stat"}};data[name].push(clone(templates[name]));renderEditor()});
  }
  function collectEditor(){
    const body=$("#editorBody");
    if(editorTab==="profile"){
      body.querySelectorAll("[data-key]").forEach(el=>data.profile[el.dataset.key]=el.value);
      data.profile.meta=(data.profile.meta||"").split(/\n/).map(x=>x.trim()).filter(Boolean);
      return;
    }
    if(editorTab==="contact"){body.querySelectorAll("[data-key]").forEach(el=>data.contact[el.dataset.key]=el.value);return;}
    const wrap=body.querySelector("[data-repeat]"); if(!wrap)return;
    const name=wrap.dataset.repeat;
    [...wrap.querySelectorAll(".repeat-card")].forEach((card,i)=>{
      const item=data[name][i];
      card.querySelectorAll("[data-key]").forEach(el=>{const k=el.dataset.key;item[k]=["tags","items"].includes(k)?el.value.split(",").map(x=>x.trim()).filter(Boolean):el.value});
    });
  }
  $("#saveData").onclick=()=>{collectEditor();saveLocal();render();closeEditor();};
  $("#resetData").onclick=()=>{if(confirm("Reset all browser-saved edits to the demo data?")){localStorage.removeItem(KEY);data=clone(window.DEFAULT_PORTFOLIO);render();renderEditor()}};
  $("#exportData").onclick=()=>{collectEditor();const blob=new Blob(["window.DEFAULT_PORTFOLIO = "+JSON.stringify(data,null,2)+";"],{type:"text/javascript"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="data.js";a.click();URL.revokeObjectURL(a.href)};

  // Keep editor data fresh when typing in one tab
  document.addEventListener("input",()=>{ /* saved only when Save is clicked */ });

  render();
})();
