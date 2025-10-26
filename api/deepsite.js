// webneva/api/deepsite.js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Endast POST stöds.' });

  const { prompt, html, settings, mode = 'generate' } = req.body || {};
  const apiUrl = process.env.DEEPSITE_API_URL;
  const apiKey = process.env.DEEPSITE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY; // fallback

  if (!apiUrl || !apiKey) {
    return res.status(500).json({ error: 'Saknar DEEPSITE_API_URL/DEEPSITE_API_KEY i miljövariabler.' });
  }

  // Nytt: tvinga DeepSite att förstå att det ska returnera full kod
  const deepPrompt =
    mode === 'improve'
      ? `
Du är en AI som förbättrar existerande webbsidor.
Returnera alltid komplett HTML (med <html>, <head>, <body>) och använd modern, professionell design (gärna Tailwind CSS).
Behåll funktionalitet men förbättra utseendet och strukturen.
Prompt: ${prompt || ''}
HTML att förbättra:
${html || ''}
`
      : `
Du är en AI som bygger kompletta webbsidor.
Skapa en färdig HTML + CSS + ev. JS med struktur, hero, sektioner, färger, typsnitt, och CTA-knappar.
Använd Tailwind CSS.
Returnera ENDAST fullständig HTML – ingen förklaring.
Brief:
${prompt || ''}
`;

  try {
    // -----------------------------
    // 1️⃣ Försök generera via DeepSite
    // -----------------------------
    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ action: mode, prompt: deepPrompt, settings }),
    });

    let data = null;
    try {
      data = await r.json();
    } catch (e) {
      data = null;
    }

    // DeepSite kan ibland svara med text istället för HTML – då kollar vi
    const isHtml = (txt) => /<html[\s\S]*<\/html>/i.test(txt || '');

    if (data?.files?.length && isHtml(data.files[0]?.content)) {
      return res.status(200).json(data);
    }

    if (data?.html && isHtml(data.html)) {
      return res.status(200).json({ html: data.html });
    }

    // -----------------------------
    // 2️⃣ Fallback: Generera med OpenAI
    // -----------------------------
    console.warn("DeepSite returnerade ingen HTML, kör fallback via OpenAI...");

    const r2 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Du är en professionell webbutvecklare. Skapa en komplett HTML/CSS/JS-fil utifrån användarens beskrivning. Använd TailwindCSS för styling. Returnera ENDAST fullständig HTML (inklusive <html>, <head>, <body>), inga förklaringar."
          },
          { role: "user", content: prompt || "" }
        ],
        temperature: 0.3,
      }),
    });

    const j2 = await r2.json();
    const htmlCode = j2?.choices?.[0]?.message?.content || '';
    if (isHtml(htmlCode)) {
      return res.status(200).json({ html: htmlCode });
    }

    // -----------------------------
    // 3️⃣ Om även OpenAI misslyckas
    // -----------------------------
    return res.status(200).json({
      html: `
<!doctype html><html lang="sv"><head><meta charset="utf-8">
<title>Genererad sida</title><link rel="stylesheet" href="https://cdn.tailwindcss.com">
</head><body class="bg-gray-50 text-gray-800 flex items-center justify-center h-screen">
<div class="text-center">
<h1 class="text-3xl font-bold text-red-600 mb-4">Kunde inte generera design automatiskt</h1>
<p class="max-w-md mx-auto text-gray-600">DeepSite och OpenAI misslyckades att returnera giltig HTML.
Prova igen eller justera prompten.</p>
</div>
</body></html>`
    });
  } catch (e) {
    console.error("DeepSite proxy error:", e);
    return res.status(500).json({ error: "Kunde inte nå DeepSite eller OpenAI.", details: e.message });
  }
}
