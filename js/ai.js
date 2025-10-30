// /js/ai.js – OpenAI-klient

async function call(body) {
  const res = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI backend fel ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function aiGenerate(prompt) {
  if (!prompt) throw new Error("Prompt saknas.");
  const { html, reply } = await call({ type: "generate", prompt });
  return html || reply || "";
}

export async function aiImprove(prompt, html) {
  const { html: result, reply } = await call({ type: "improve", prompt, html });
  return result || reply || "";
}

export async function aiExplain(html) {
  const { reply } = await call({ type: "explain", html });
  return reply || "";
}
