// webneva/api/openai.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  // Tillåt endast POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Endast POST-förfrågningar stöds." });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Ingen meddelandetext angiven." });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Du är en hjälpsam AI som förklarar, förbättrar och justerar webbkod och design på ett tydligt sätt."
        },
        { role: "user", content: message }
      ]
    });

    res.status(200).json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error("Fel vid AI-anrop:", error);
    res.status(500).json({ error: "Något gick fel vid kontakt med OpenAI API." });
  }
}
