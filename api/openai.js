// /api/openai.js
export default async function handler(req, res) {
  // CORS (för säkerhets skull)
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
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY saknas i miljövariabler." });
    }

    const { type = "generate", prompt = "", html = "" } = req.body || {};
    const sysBase =
      "Du är en senior webbutvecklare. Returnera **ENDAST** komplett HTML (inklusive <html><head><body>), utan extratext. " +
      "Använd Tailwind CSS via <script src='https://cdn.tailwindcss.com'></script>. Design: modern, responsiv, tillgänglig.";

    let userContent = "";

    if (type === "generate") {
      userContent =
        `Skapa en färdig webbsida utifrån denna beskrivning:\n${prompt}\n` +
        "Skapa hero, sektioner (t.ex. features/om/kontakt), CTA-knappar, och fin typografi. " +
        "Använd svenska texter om inte annat framgår.";
    } else if (type === "improve") {
      userContent =
        `Förbättra följande HTML. Behåll funktionalitet men modernisera design, lägg till tydlig struktur och responsivitet. ` +
        `Lägg gärna till bättre semantik och följ WCAG-principer.\n\n` +
        `HTML att förbättra:\n${html}\n\n` +
        `Önskemål/förklarande prompt:\n${prompt}\n`;
    } else if (type === "explain") {
      // Kort förklaring i punktlista (returneras som text, inte HTML)
      const explRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: "Förklara webbkod kort, konkret och i punktlista." },
            { role: "user", content: html || "" },
          ],
        }),
      });
      const explJson = await explRes.json();
      const reply = explJson?.choices?.[0]?.message?.content?.trim() || "Ingen förklaring.";
      return res.status(200).json({ reply });
    } else {
      return res.status(400).json({ error: "Ogiltig type." });
    }

    // Generera/ förbättra HTML
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.25,
        messages: [
          { role: "system", content: sysBase },
          { role: "user", content: userContent },
        ],
      }),
    });

    const j = await r.json();

    // För säkerhets skull: plocka ut HTML även om svaret skummar
    const raw = j?.choices?.[0]?.message?.content || "";
    // Vissa modeller kan lägga ```html … ```
    const cleaned = raw.replace(/```(?:html)?/gi, "").replace(/```/g, "").trim();

    // Liten sanity check
    const isHtml = /<html[\s\S]*<\/html>/i.test(cleaned);
    if (!isHtml) {
      // Fallback-omslag
      const wrapped = `
<!doctype html>
<html lang="sv"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Genererad sida</title>
<script src="https://cdn.tailwindcss.com"></script>
</head><body class="min-h-screen bg-slate-50 text-slate-900">
<main class="max-w-6xl mx-auto p-8">
${cleaned}
</main></body></html>`;
      return res.status(200).json({ html: wrapped });
    }

    return res.status(200).json({ html: cleaned });
  } catch (err) {
    console.error("openai.js error:", err);
    return res.status(500).json({ error: "OpenAI-fel", details: String(err?.message || err) });
  }
}
