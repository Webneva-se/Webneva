// webneva/api/deepsite.js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Endast POST stöds.' });

  const { prompt, html, settings, mode = 'generate' } = req.body || {};
  const apiUrl = process.env.DEEPSITE_API_URL;
  const apiKey = process.env.DEEPSITE_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.status(500).json({ error: 'Saknar DEEPSITE_API_URL/DEEPSITE_API_KEY i miljövariabler.' });
  }
  try {
    const payload = mode === 'improve'
      ? { action: 'improve', prompt, html, settings }
      : { action: 'generate', prompt, settings };

    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'DeepSite svarade med fel.', body: t });
    }
    const data = await r.json(); // {files:[{name,content}] } eller {html}
    return res.status(200).json(data);
  } catch (e) {
    console.error('DeepSite proxy error:', e);
    return res.status(500).json({ error: 'Kunde inte nå DeepSite.' });
  }
}
