// webneva/api/openai.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Endast POST stöds.' });

  try {
    const { type, brief, message, code } = req.body || {};

    // 1) Förfina brief (för DeepSite)
    if (type === 'refine') {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content:
            "Du är en expert på att skriva programspecifikationer för AI-site generators. Du returnerar EN tydlig, kortfattad och strukturerad brief med: syfte/mål, målgrupp, varumärkeston, färgtema, typsnittskänsla, komponenter (hero, CTA, features, testimonials, formulär, footer), sidor (lista med namn och kort syfte), samt eventuella specialkrav. Inga förklaringar runt om, endast själva briefen." },
          { role: "user", content: brief || "" }
        ],
        temperature: 0.2
      });
      const refined = completion.choices[0]?.message?.content?.trim() || brief || '';
      return res.status(200).json({ refined });
    }

    // 2) Förklara kod
    if (type === 'explain') {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content:
            "Du förklarar webbkod kort, konkret och i punktlista. Belys struktur, layout, responsivitet och tillgänglighet." },
          { role: "user", content: code || "" }
        ],
        temperature: 0.2
      });
      const reply = completion.choices[0]?.message?.content || '';
      return res.status(200).json({ reply });
    }

    // 3) Förbättra kod (fallback/komplement)
    if (type === 'improve') {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content:
            "Du förbättrar HTML/CSS/JS för modern, responsiv och tillgänglig design. Behåll funktion men städa markup, typografi och färger (Tailwind tillåtet). Returnera ENBART den fullständiga HTML (inkl. head/body) – inga kommentarer runtom." },
          { role: "user", content: `Instruktion: ${message || ''}\n\n---\nKOD:\n${code || ''}` }
        ],
        temperature: 0.3
      });
      const reply = completion.choices[0]?.message?.content || '';
      return res.status(200).json({ reply });
    }

    return res.status(400).json({ error: "Okänt type." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Något gick fel med OpenAI." });
  }
}
