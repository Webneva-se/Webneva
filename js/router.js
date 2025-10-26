export function createEmptyProject() {
  return {
    projectName: "Mitt projekt",
    pages: [
      {
        name: "Home",
        path: "index.html",
        html: `<!DOCTYPE html>
<html lang="sv"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nytt projekt</title>
<script src="https://cdn.tailwindcss.com"></script>
</head><body class="bg-slate-50 text-slate-900">
<header class="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
  <a href="index.html" class="font-bold">Home</a>
  <nav class="flex gap-5">
    <a href="about.html" class="text-slate-600 hover:text-slate-900">Om oss</a>
    <a href="contact.html" class="text-slate-600 hover:text-slate-900">Kontakt</a>
  </nav>
</header>
<main class="max-w-5xl mx-auto px-6 py-20">
  <h1 class="text-4xl font-black">Välkommen till din nya sajt</h1>
  <p class="mt-4 text-slate-600">Redigera mig i Webneva Studio.</p>
</main>
</body></html>`,
        css: "",
        js: ""
      }
    ],
    history: []
  };
}

export function addPage(project, name = "Ny sida") {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const path = `${slug}.html`;
  const baseNav = `<a href="index.html" class="text-slate-600 hover:text-slate-900">Hem</a>`;
  project.pages.push({
    name,
    path,
    html: `<!DOCTYPE html>
<html lang="sv"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title>
<script src="https://cdn.tailwindcss.com"></script>
</head><body class="bg-slate-50 text-slate-900">
<header class="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
  <a href="index.html" class="font-bold">Home</a>
  <nav class="flex gap-5">
    ${baseNav}
  </nav>
</header>
<main class="max-w-5xl mx-auto px-6 py-20">
  <h1 class="text-3xl font-bold">${name}</h1>
  <p class="mt-3 text-slate-600">Ny sida genererad i Webneva.</p>
</main>
</body></html>`,
    css: "",
    js: ""
  });
}

export function getPage(project, path) {
  return project.pages.find(p => p.path === path);
}

export function upsertPage(project, page) {
  const i = project.pages.findIndex(p => p.path === page.path);
  if (i >= 0) project.pages[i] = page; else project.pages.push(page);
}
