import { createEmptyProject, addPage, getPage, upsertPage } from "./router.js";
import { saveProject, loadProject, pushHistory } from "./storage.js";
import { aiGenerate, aiTransform, aiExplain } from "./ai.js";

// --------- State ---------
let project = loadProject() || createEmptyProject();
let currentPath = project.pages[0].path;
let autosave = true;
let dark = false;

const el = {
  tabs: document.getElementById("tabs"),
  addPageBtn: document.getElementById("addPageBtn"),
  updatePreviewBtn: document.getElementById("updatePreviewBtn"),
  newProjectBtn: document.getElementById("newProjectBtn"),
  saveProjectBtn: document.getElementById("saveProjectBtn"),
  formatBtn: document.getElementById("formatBtn"),
  aiInput: document.getElementById("aiInput"),
  generateBtn: document.getElementById("generateBtn"),
  transformBtn: document.getElementById("transformBtn"),
  explainBtn: document.getElementById("explainBtn"),
  aiLog: document.getElementById("aiLog"),
  explanations: document.getElementById("explanations"),
  history: document.getElementById("history"),
  tabExplain: document.getElementById("tabExplain"),
  tabHistory: document.getElementById("tabHistory"),
  fileIndicator: document.getElementById("fileIndicator"),
  profileBtn: document.getElementById("profileBtn"),
  profileMenu: document.getElementById("profileMenu"),
  preview: document.getElementById("previewFrame")
};

// --------- CodeMirror Editor ---------
const cm = CodeMirror.fromTextArea(document.getElementById("editor"), {
  mode: "xml",
  theme: "default",
  lineNumbers: true,
  styleActiveLine: true,
  autoCloseTags: true,
  autoCloseBrackets: true
});
cm.setValue(getPage(project, currentPath).html);
cm.on("change", () => {
  if (autosave) {
    const page = getPage(project, currentPath);
    page.html = cm.getValue();
    saveProject(project);
  }
});

// --------- UI Helpers ---------
function renderTabs() {
  el.tabs.innerHTML = "";
  project.pages.forEach(p => {
    const b = document.createElement("button");
    b.className = "px-3 py-1.5 rounded text-sm border " + (p.path === currentPath ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50");
    b.textContent = p.name || p.path;
    b.onclick = () => {
      currentPath = p.path;
      cm.setValue(p.html);
      el.fileIndicator.textContent = p.path;
      buildPreview();
    };
    el.tabs.appendChild(b);
  });
}

function buildPreview() {
  // Bygger ett enkelt "fil-system" i srcdoc där länkar mellan sidor funkar.
  const current = getPage(project, currentPath);
  const filesMap = {};
  project.pages.forEach(p => filesMap[p.path] = p.html);
  const boot = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box} body{margin:0}
  #wrap{height:100vh}
  iframe{border:0;width:100%;height:100%}
</style>
</head><body>
<div id="wrap"></div>
<script>
  const files = ${JSON.stringify(filesMap)};
  const wrap = document.getElementById('wrap');
  function load(path){
    const html = files[path] || "<h1 style='font-family:sans-serif'>404 – Page not found</h1>";
    // rewrite links to stay in sandbox
    const blob = new Blob([html], {type:"text/html"});
    const url = URL.createObjectURL(blob);
    const ifr = document.createElement('iframe');
    ifr.onload = () => {
      const doc = ifr.contentDocument;
      // intercept a-hrefs
      [...doc.querySelectorAll('a[href]')].forEach(a=>{
        const href=a.getAttribute('href');
        if (files[href]) {
          a.addEventListener('click', (e)=>{ e.preventDefault(); load(href); });
        }
      });
    };
    ifr.src = url;
    wrap.innerHTML="";
    wrap.appendChild(ifr);
  }
  load(${JSON.stringify(current.path)});
</script>
</body></html>`;
  el.preview.srcdoc = boot;
}

function toast(msg) {
  el.aiLog.textContent = msg;
  setTimeout(()=>{ el.aiLog.textContent = ""; }, 4000);
}

// --------- Actions ---------
el.addPageBtn.onclick = () => {
  const name = prompt("Namn på ny sida:", "Tjänster");
  if (!name) return;
  addPage(project, name);
  saveProject(project);
  renderTabs();
};

el.updatePreviewBtn.onclick = () => {
  const page = getPage(project, currentPath);
  page.html = cm.getValue();
  saveProject(project);
  buildPreview();
};

el.newProjectBtn.onclick = () => {
  if (!confirm("Starta nytt projekt? Osparade ändringar försvinner.")) return;
  project = createEmptyProject();
  currentPath = project.pages[0].path;
  cm.setValue(getPage(project, currentPath).html);
  renderTabs();
  buildPreview();
  saveProject(project);
};

el.saveProjectBtn.onclick = () => {
  const page = getPage(project, currentPath);
  page.html = cm.getValue();
  saveProject(project);
  toast("Projekt sparat.");
};

el.formatBtn.onclick = () => {
  // enkel "formatter" – bara indentering via CodeMirror.
  cm.execCommand("selectAll");
  cm.indentSelection("smart");
  cm.setCursor({ line: 0, ch: 0 });
};

document.addEventListener("keydown", (e)=>{
  if (e.ctrlKey && e.key === "Enter") {
    el.updatePreviewBtn.click();
    e.preventDefault();
  }
});

// Profil dropdown
el.profileBtn.onclick = () => {
  el.profileMenu.classList.toggle("hidden");
};
el.profileMenu.addEventListener("click", async (e)=>{
  const act = e.target?.dataset?.action;
  if (act === "theme") {
    dark = !dark;
    document.documentElement.classList.toggle("dark");
    toast("Tema: " + (dark ? "Mörkt" : "Ljust"));
  }
  if (act === "autosave") {
    autosave = !autosave;
    toast("Autospara: " + (autosave ? "På" : "Av"));
  }
  if (act === "export") {
    await exportZip();
  }
  el.profileMenu.classList.add("hidden");
});

// AI generate
el.generateBtn.onclick = async () => {
  const prompt = el.aiInput.value.trim();
  if (!prompt) return alert("Skriv vad du vill skapa först.");
  el.generateBtn.disabled = true;
  el.transformBtn.disabled = true;
  el.explainBtn.disabled = true;
  el.aiLog.textContent = "Genererar…";
  try {
    const data = await aiGenerate(prompt);
    project = { projectName: data.projectName || "Webneva Project", pages: data.pages || [], history: [] };
    currentPath = project.pages[0].path;
    cm.setValue(getPage(project, currentPath).html);
    renderTabs();
    buildPreview();
    saveProject(project);
    pushHistory(project, "Genererade ny sajt");
    toast("Klar!");
  } catch (e) {
    console.error(e);
    alert("Fel vid generering: " + e.message);
  } finally {
    el.generateBtn.disabled = false;
    el.transformBtn.disabled = false;
    el.explainBtn.disabled = false;
    el.aiLog.textContent = "";
  }
};

// AI transform
el.transformBtn.onclick = async () => {
  const prompt = el.aiInput.value.trim();
  if (!prompt) return alert("Skriv vad du vill ändra.");
  const page = getPage(project, currentPath);
  const html = cm.getValue();
  el.aiLog.textContent = "Förbättrar sida…";
  el.transformBtn.disabled = true;
  try {
    const data = await aiTransform(prompt, { html, css: page.css, js: page.js });
    if (data.html) page.html = data.html;
    if (data.css !== undefined) page.css = data.css;
    if (data.js !== undefined) page.js = data.js;
    upsertPage(project, page);
    saveProject(project);
    pushHistory(project, "Transform: " + prompt);
    cm.setValue(page.html);
    buildPreview();
    toast("Ändring tillämpad.");
  } catch (e) {
    console.error(e);
    alert("Fel vid förändring: " + e.message);
  } finally {
    el.transformBtn.disabled = false;
    el.aiLog.textContent = "";
  }
};

// AI explain
el.explainBtn.onclick = async () => {
  const page = getPage(project, currentPath);
  el.aiLog.textContent = "Förklarar kod…";
  try {
    const { explanation } = await aiExplain({ html: page.html, css: page.css, js: page.js });
    el.explanations.textContent = explanation || "(Ingen förklaring.)";
    el.tabExplain.click();
    toast("Förklaring klar.");
  } catch (e) {
    console.error(e);
    alert("Fel vid förklaring: " + e.message);
  } finally {
    el.aiLog.textContent = "";
  }
};

// Explain/History tabs
el.tabExplain.onclick = () => {
  el.tabExplain.classList.add("bg-slate-100");
  el.tabHistory.classList.remove("bg-slate-100");
  el.explanations.classList.remove("hidden");
  el.history.classList.add("hidden");
};
el.tabHistory.onclick = () => {
  el.tabHistory.classList.add("bg-slate-100");
  el.tabExplain.classList.remove("bg-slate-100");
  el.explanations.classList.add("hidden");
  el.history.classList.remove("hidden");
  // render history
  el.history.innerHTML = (project.history||[]).map(h => `
  <div class="border rounded-lg p-2 mb-2 bg-white">
    <div class="text-xs text-slate-500">${new Date(h.timestamp).toLocaleString()}</div>
    <div class="text-sm font-medium">${h.note || "(ändring)"}</div>
  </div>
  `).join("") || "<div class='text-slate-500'>Ingen historik än.</div>";
};

// Export ZIP (klient-sida, minimal — packar HTML-filerna till en “data:zip” och laddar ned)
async function exportZip() {
  // för enklare demo – skapar en zip via JS-blob (ingen server)
  const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  const zip = new JSZip();
  project.pages.forEach(p => zip.file(p.path, p.html));
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (project.projectName || "webneva") + ".zip";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Init
renderTabs();
buildPreview();
el.tabExplain.click();
