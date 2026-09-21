import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { cloudinaryConfig } from "./cloudinary-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);

// The only Firebase Authentication UID allowed to use the editor.
const ADMIN_UID = "X8IuyH0h6nSUqn7066tGQKodEWV2";
const defaultData = {
 profile:{name:"Joy",tagline:"D. Agriculturist | Entrepreneur | Digital Creator",about:"I combine agriculture, entrepreneurship, digital skills and AI-powered content creation to build practical projects and useful digital experiences.",profileImage:"assets/profile-placeholder.svg"},
 projects:[
  {title:"Amader Baniachong",category:"App",description:"A mobile-first community platform concept for local news, services, education, marketplace and opportunities.",image:"assets/project-placeholder.svg",url:"#"},
  {title:"Joy Agro",category:"Agriculture",description:"Agriculture and nursery-focused digital business concept connecting products, stock and customers.",image:"assets/project-placeholder.svg",url:"#"},
  {title:"Baniachong Tuition Seba",category:"Education",description:"A local tutor and parent service concept designed around trusted home tutoring.",image:"assets/project-placeholder.svg",url:"#"}
 ],
 skills:["Agriculture","Entrepreneurship","AI Content Creation","Prompt Engineering","Digital Marketing","Graphic Design","Web/App Projects","Canva","ChatGPT","Gemini","Microsoft Copilot"],
 timeline:[
  {type:"Experience",title:"Owner — Joy Pigeon Farm",period:"Since 2020",description:"Practical experience in pigeon rearing and small-scale livestock management."},
  {type:"Experience",title:"Manager — Md. Saddik Plant Nursery",period:"Feb 2022 – Aug 2023",description:"Nursery management and practical agricultural work."},
  {type:"Education",title:"BAgEd — Bangladesh Open University",period:"Current · 5th semester",description:"Bachelor in Agricultural Education."},
  {type:"Education",title:"Diploma in Agriculture",period:"CGPA 3.77 / 4.00",description:"Agriculture Training Institute, Araihazer, Narayanganj."}
 ],
 certificates:[],
 contact:{text:"For collaborations, projects and professional opportunities, feel free to get in touch.",email:"",phone:"",facebook:"",linkedin:"",github:""}
};

let data = structuredClone(defaultData);
const $=s=>document.querySelector(s);

function render(){
 $("#heroName").textContent=data.profile.name; $("#heroTagline").textContent=data.profile.tagline;
 $("#aboutText").textContent=data.profile.about; $("#footerName").textContent=data.profile.name;
 $("#profileImage").src=data.profile.profileImage || "assets/profile-placeholder.svg";
 $("#year").textContent=new Date().getFullYear(); $("#contactText").textContent=data.contact.text;
 const cats=["All",...new Set(data.projects.map(x=>x.category).filter(Boolean))];
 $("#projectFilters").innerHTML=cats.map((c,i)=>`<button class="filter ${i===0?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
 renderProjects("All");
 $("#skillsGrid").innerHTML=data.skills.map(s=>`<span class="skill">${esc(s)}</span>`).join("");
 $("#timeline").innerHTML=data.timeline.map(x=>`<article class="timeline-item"><p class="eyebrow">${esc(x.type)}</p><h3>${esc(x.title)}</h3><div class="muted">${esc(x.period)}</div><p>${esc(x.description)}</p></article>`).join("");
 $("#certGrid").innerHTML=data.certificates.length?data.certificates.map(x=>`<article class="card"><img class="card-img" src="${safeUrl(x.image)}" alt=""><div class="card-body"><h3>${esc(x.title)}</h3><p class="muted">${esc(x.issuer||"")}</p><p>${esc(x.description||"")}</p></div></article>`).join(""):`<p class="muted">Certificates will appear here.</p>`;
 const links=[["Email",data.contact.email?`mailto:${data.contact.email}`:""],["Phone",data.contact.phone?`tel:${data.contact.phone}`:""],["Facebook",data.contact.facebook],["LinkedIn",data.contact.linkedin],["GitHub",data.contact.github]].filter(x=>x[1]);
 $("#contactLinks").innerHTML=links.map(x=>`<a href="${safeUrl(x[1])}" target="_blank" rel="noopener">${esc(x[0])}</a>`).join("");
}
function renderProjects(cat){const arr=cat==="All"?data.projects:data.projects.filter(x=>x.category===cat);$("#projectsGrid").innerHTML=arr.map(x=>`<article class="card"><img class="card-img" src="${safeUrl(x.image)}" alt=""><div class="card-body"><p class="eyebrow">${esc(x.category||"Project")}</p><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>${x.url&&x.url!="#"?`<a class="btn" href="${safeUrl(x.url)}" target="_blank">Open project</a>`:""}</div></article>`).join("")}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function safeUrl(v=""){return String(v).replace(/["'<>]/g,"")}
$("#projectFilters").addEventListener("click",e=>{if(e.target.matches(".filter")){$$(".filter").forEach(x=>x.classList.remove("active"));e.target.classList.add("active");renderProjects(e.target.dataset.cat)}}); function $$(s){return [...document.querySelectorAll(s)]}
$("#menuBtn").onclick=()=>$("#navLinks").classList.toggle("open");
$("#adminBtn").onclick=()=>$("#adminModal").classList.remove("hidden");
document.querySelector("[data-close]").onclick=()=>$("#adminModal").classList.add("hidden");

async function loadData(){try{const snap=await getDoc(doc(db,"site","portfolio"));if(snap.exists())data={...data,...snap.data()};}catch(e){console.warn(e)}render()}
onAuthStateChanged(auth,user=>{
  if(user && user.uid === ADMIN_UID){
    $("#loginView").classList.add("hidden");
    $("#dashboardView").classList.remove("hidden");
    buildEditor();
  }else{
    if(user) signOut(auth);
    $("#loginView").classList.remove("hidden");
    $("#dashboardView").classList.add("hidden");
  }
});
$("#loginBtn").onclick=async()=>{
  try{
    const cred=await signInWithEmailAndPassword(auth,$("#email").value,$("#password").value);
    if(cred.user.uid !== ADMIN_UID){
      await signOut(auth);
      throw new Error("UNAUTHORIZED_ADMIN");
    }
    $("#loginMsg").textContent="";
  }catch(e){
    $("#loginMsg").textContent = e.message === "UNAUTHORIZED_ADMIN"
      ? "This account is not authorized as the site administrator."
      : "Login failed. Check email/password and Firebase setup.";
  }
};
$("#logoutBtn").onclick=()=>signOut(auth);

function buildEditor(){
 $("#editor").innerHTML=`
 <div class="editor-section"><h3>Profile</h3>
 <label>Name<input id="eName"></label><label>Tagline<input id="eTagline"></label><label>About<textarea id="eAbout" rows="4"></textarea></label>
 <label>Profile photo<input id="profileFile" type="file" accept="image/*"></label><img id="profilePreview" class="upload-preview"></div>
 <div class="editor-section"><h3>Projects</h3><div id="projectEdit"></div><button class="small-btn" id="addProject">+ Add project</button></div>
 <div class="editor-section"><h3>Skills</h3><textarea id="eSkills" rows="4" placeholder="One skill per line"></textarea></div>
 <div class="editor-section"><h3>Experience & Education</h3><div id="timelineEdit"></div><button class="small-btn" id="addTimeline">+ Add item</button></div>
 <div class="editor-section"><h3>Certificates</h3><div id="certEdit"></div><button class="small-btn" id="addCert">+ Add certificate</button></div>
 <div class="editor-section"><h3>Contact</h3><div class="row"><input id="eEmail" placeholder="Email"><input id="ePhone" placeholder="Phone"><input id="eFacebook" placeholder="Facebook URL"><input id="eLinkedin" placeholder="LinkedIn URL"><input id="eGithub" placeholder="GitHub URL"></div><textarea id="eContactText" placeholder="Contact text"></textarea></div>
 <div class="save"><button class="btn primary full" id="saveAll">💾 Save all changes</button><p id="saveMsg" class="msg"></p></div>`;
 fillEditor(); bindEditor();
}
function fillEditor(){
 $("#eName").value=data.profile.name;$("#eTagline").value=data.profile.tagline;$("#eAbout").value=data.profile.about;$("#profilePreview").src=data.profile.profileImage;
 $("#eSkills").value=data.skills.join("\n");$("#eEmail").value=data.contact.email\vert{}\vert{}"";$("#ePhone").value=data.contact.phone||"";$("#eFacebook").value=data.contact.facebook\vert{}\vert{}"";$("#eLinkedin").value=data.contact.linkedin||"";$("#eGithub").value=data.contact.github\vert{}\vert{}"";$("#eContactText").value=data.contact.text||"";
 $("#projectEdit").innerHTML=data.projects.map((x,i)=>projectForm(x,i)).join("");
 $("#timelineEdit").innerHTML=data.timeline.map((x,i)=>timelineForm(x,i)).join("");
 $("#certEdit").innerHTML=data.certificates.map((x,i)=>certForm(x,i)).join("");
}
function projectForm(x,i){return `<div class="repeat"><div class="repeat-head"><b>Project ${i+1}</b><button class="small-btn danger" data-remove-project="${i}">Delete</button></div><div class="row"><input data-p="${i}" data-k="title" value="${esc(x.title)}" placeholder="Title"><input data-p="${i}" data-k="category" value="${esc(x.category)}" placeholder="Category"></div><textarea data-p="${i}" data-k="description" placeholder="Description">${esc(x.description)}</textarea><input data-p="${i}" data-k="url" value="${esc(x.url||"")}" placeholder="Project URL"><input type="file" accept="image/*" data-project-file="${i}"><img class="upload-preview" src="${safeUrl(x.image)}"></div>`}
function timelineForm(x,i){return `<div class="repeat"><div class="repeat-head"><b>Item ${i+1}</b><button class="small-btn danger" data-remove-time="${i}">Delete</button></div><div class="row"><input data-t="${i}" data-k="type" value="${esc(x.type)}" placeholder="Experience/Education"><input data-t="${i}" data-k="title" value="${esc(x.title)}" placeholder="Title"><input data-t="${i}" data-k="period" value="${esc(x.period)}" placeholder="Period"></div><textarea data-t="${i}" data-k="description" placeholder="Description">${esc(x.description)}</textarea></div>`}
function certForm(x,i){return `<div class="repeat"><div class="repeat-head"><b>Certificate ${i+1}</b><button class="small-btn danger" data-remove-cert="${i}">Delete</button></div><input data-c="${i}" data-k="title" value="${esc(x.title)}" placeholder="Certificate title"><input data-c="${i}" data-k="issuer" value="${esc(x.issuer||"")}" placeholder="Issuer"><textarea data-c="${i}" data-k="description" placeholder="Description">${esc(x.description||"")}</textarea><input type="file" accept="image/*" data-cert-file="${i}"><img class="upload-preview" src="${safeUrl(x.image||"assets/certificate-placeholder.svg")}"></div>`}
function bindEditor(){
 $("#profileFile").onchange=()=>{const f=$("#profileFile").files[0];if(f)$("#profilePreview").src=URL.createObjectURL(f)};
 $("#addProject").onclick=()=>{data.projects.push({title:"New Project",category:"Project",description:"",image:"assets/project-placeholder.svg",url:"#"});buildEditor()};
 $("#addTimeline").onclick=()=>{data.timeline.push({type:"Experience",title:"New item",period:"",description:""});buildEditor()};
 $("#addCert").onclick=()=>{data.certificates.push({title:"New certificate",issuer:"",description:"",image:"assets/certificate-placeholder.svg"});buildEditor()};
 $("#editor").onclick=e=>{let b=e.target;if(b.dataset.removeProject){data.projects.splice(+b.dataset.removeProject,1);buildEditor()} if(b.dataset.removeTime){data.timeline.splice(+b.dataset.removeTime,1);buildEditor()} if(b.dataset.removeCert){data.certificates.splice(+b.dataset.removeCert,1);buildEditor()}};
 $("#saveAll").onclick=saveAll;
}
async function saveAll(){
 const msg=$("#saveMsg");msg.textContent="Saving...";msg.className="msg";
 data.profile.name=$("#eName").value;data.profile.tagline=$("#eTagline").value;data.profile.about=$("#eAbout").value;
 data.skills=$("#eSkills").value.split("\n").map(x=>x.trim()).filter(Boolean);
 data.contact={text:$("#eContactText").value,email:$("#eEmail").value,phone:$("#ePhone").value,facebook:$("#eFacebook").value,linkedin:$("#eLinkedin").value,github:$("#eGithub").value};
 document.querySelectorAll("[data-p]").forEach(el=>{const i=+el.dataset.p;data.projects[i][el.dataset.k]=el.value});
 document.querySelectorAll("[data-t]").forEach(el=>{const i=+el.dataset.t;data.timeline[i][el.dataset.k]=el.value});
 document.querySelectorAll("[data-c]").forEach(el=>{const i=+el.dataset.c;data.certificates[i][el.dataset.k]=el.value});
 try{
  const pf=$("#profileFile").files[0]; if(pf)data.profile.profileImage=await uploadFile(pf,"profile");
  for(const input of document.querySelectorAll("[data-project-file]")){const f=input.files[0];if(f){const i=+input.dataset.projectFile;data.projects[i].image=await uploadFile(f,"project-"+i)}}
  for(const input of document.querySelectorAll("[data-cert-file]")){const f=input.files[0];if(f){const i=+input.dataset.certFile;data.certificates[i].image=await uploadFile(f,"certificate-"+i)}}
  await setDoc(doc(db,"site","portfolio"),data);
  msg.textContent="Saved successfully.";msg.className="msg success";render();
 }catch(e){console.error(e);msg.textContent="Save failed. Check Firebase Firestore/Storage rules and setup."}
}
async function uploadFile(file,prefix){
  if(!cloudinaryConfig.cloudName || cloudinaryConfig.cloudName==="YOUR_CLOUD_NAME" ||
     !cloudinaryConfig.uploadPreset || cloudinaryConfig.uploadPreset==="YOUR_UNSIGNED_UPLOAD_PRESET"){
    throw new Error("Cloudinary configuration is missing");
  }
  if(!file.type.startsWith("image/")) throw new Error("Only images are allowed");
  if(file.size > 8 * 1024 * 1024) throw new Error("Image is larger than 8 MB");
  const form=new FormData();
  form.append("file",file);
  form.append("upload_preset",cloudinaryConfig.uploadPreset);
  form.append("tags",`portfolio,${prefix}`);
  const res=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`,{method:"POST",body:form});
  if(!res.ok) throw new Error("Cloudinary upload failed");
  const out=await res.json();
  return out.secure_url;
}
loadData();
