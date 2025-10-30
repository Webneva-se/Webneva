// /api/openai.js
export default async function handler(req, res) {
  // CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Endast POST stöds." });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY saknas." });

    const body = req.body || {};
    const { type = "generate", prompt = "", html = "" } = body;

    // Gemensam systemprompt för HTML-produktion
    const SYSTEM =
      "Du är en senior webbutvecklare. Returnera **ENDAST** komplett HTML (hela dokumentet med <html><head><body>), utan extratext. " +
      "Använd Tailwind via <script src='https://cdn.tailwindcss.com'></script>. " +
      "Design: mörkt tema, blå accent (#2563eb/#3b82f6), responsiv, tillgänglig, snygga sektioner (hero, features, CTA, footer). " +
      "Lägg gärna till microcopy på svenska.";

    // ====== EXPLAIN =======================================================
    if (type === "explain") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: "Förklara webbkod kort och tydligt i punktlista." },
            { role: "user", content: html || "" },
          ],
        }),
      });
      const j = await r.json();
      const reply = j?.choices?.[0]?.message?.content?.trim() || "Ingen förklaring.";
      return res.status(200).json({ reply });
    }

    // ====== GENERATE / IMPROVE ===========================================
    let userContent = "";
    if (type === "generate") {
      userContent =
        `Skapa en färdig webbsida utifrån beskrivningen nedan (svenska texter om inget annat sägs).\n\n` +
        `Brief:\n${prompt}\n\n` +
        `Krav: använd Tailwind, hero, sektioner (features/om/kontakt), tydliga CTA-knappar, bra kontrast.`;
    } else if (type === "improve") {
      userContent =
        `Förbättra denna befintliga HTML till en snygg, modern och responsiv sida med mörk/blå stil. ` +
        `Behåll funktionalitet men lyft typografi, spacing och tillgänglighet. Lägg gärna till hero/sektioner.\n\n` +
        `HTML:\n${html}\n\n` +
        `Önskemål/brief:\n${prompt}`;
    } else {
      return res.status(400).json({ error: "Ogiltig type. Tillåtna: generate, improve, explain." });
    }

    const r2 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.25,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
      }),
    });

    const j2 = await r2.json();
    let raw = j2?.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```(?:html)?/gi, "").replace(/```/g, "").trim();

    const isHtml = /<html[\s\S]*<\/html>/i.test(raw);
    if (!isHtml) {
      // Wrap om modellen råkar returnera fragment
      const wrapped = `
<!doctype html><html lang="sv"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Genererad sida</title>
<script src="https://cdn.tailwindcss.com"></script>
</head><body class="min-h-screen bg-slate-950 text-slate-100">
<main class="max-w-6xl mx-auto p-8">
${raw}
</main></body></html>`;
      return res.status(200).json({ html: wrapped });
    }

    return res.status(200).json({ html: raw });
  } catch (err) {
    console.error("openai.js error:", err);
    return res.status(500).json({ error: "OpenAI-fel", details: String(err?.message || err) });
  }
}
