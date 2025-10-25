// /api/openai.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Endast POST-förfrågningar stöds." });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY saknas i miljövariablerna.");
      return res.status(500).json({ error: "Ingen API-nyckel hittades." });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { message } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: "Ingen text skickades till AI." });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Du är en hjälpsam AI som förbättrar HTML, CSS och JS." },
        { role: "user", content: message }
      ],
    });

    const reply = completion.choices[0]?.message?.content || "Inget svar från AI.";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("❌ AI-fel:", error);
    return res.status(500).json({ error: "Fel vid anrop till AI.", details: error.message });
  }
}
