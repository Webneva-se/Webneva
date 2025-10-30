// /webneva/js/ai.js

export async function aiGenerate(prompt) {
  const res = await fetch("/api/deepsite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, mode: "generate" })
  });
  if (!res.ok) throw new Error(`DeepSite-fel: ${res.status}`);
  const data = await res.json();
  return data?.html || data?.files?.[0]?.content || "";
}

export async function aiImprove(prompt, html) {
  const res = await fetch("/api/deepsite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, html, mode: "improve" })
  });
  if (!res.ok) throw new Error(`DeepSite-förbättring fel: ${res.status}`);
  const data = await res.json();
  return data?.html || data?.files?.[0]?.content || "";
}

export async function aiExplain(code) {
  const res = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "explain", code })
  });
  if (!res.ok) throw new Error(`OpenAI-fel: ${res.status}`);
  const data = await res.json();
  return data?.reply || "";
}
