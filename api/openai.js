// webneva/api/openai.js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Endast POST stöds.' });

  const { type = 'explain', message, code } = req.body || {};
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Saknar OPENAI_API_KEY.' });

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: type === 'explain' ? 0.2 : 0.5,
        messages: [
          {
            role: 'system',
            content:
              'Du är en senior webbutvecklare som ger tydliga, punktvisa förklaringar eller förbättrar HTML/CSS/JS med modern, responsiv design. Skriv svenska.'
          },
          {
            role: 'user',
            content:
              type === 'explain'
                ? `Förklara kort och tydligt vad koden gör och hur man förbättrar den:\n\n${code}`
                : `Förbättra denna kod baserat på instruktionen: "${message}". Svara ENDAST med komplett HTML (och inline CSS/JS om nödvändigt):\n\n${code}`
          }
        ]
      })
    });

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'OpenAI fel', body: t });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ reply });
  } catch (e) {
    console.error('OpenAI error', e);
    return res.status(500).json({ error: 'Kunde inte nå OpenAI.' });
  }
}
