export async function aiGenerate(prompt) {
  const res = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "generate", prompt })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { projectName, pages:[{path, html, css, js}...] }
}

export async function aiTransform(prompt, { html, css, js }) {
  const res = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "transform", prompt, html, css, js })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { html, css, js }
}

export async function aiExplain({ html, css, js }) {
  const res = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "explain", html, css, js })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { explanation }
}
