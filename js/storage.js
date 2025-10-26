export const STORAGE_KEY = "webneva_project_v1";

export function saveProject(project) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function pushHistory(project, note = "") {
  const entry = {
    timestamp: new Date().toISOString(),
    note,
    pages: project.pages.map(p => ({ path: p.path, html: p.html, css: p.css, js: p.js }))
  };
  project.history ||= [];
  project.history.unshift(entry);
  saveProject(project);
}
