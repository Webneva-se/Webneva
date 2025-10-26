import OpenAI from "openai";

export const config = { runtime: "edge" }; // snabbare kallstart på Vercel Edge

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Endast POST-förfrågningar stöds." }), { status: 405 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY saknas i miljövariabler." }), { status: 500 });
    }

    const body = await req.json();
    const { mode, prompt, html, css, js } = body || {};

    if (!mode) {
      return new Response(JSON.stringify({ error: "Saknar 'mode' (generate|transform|explain)." }), { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    if (mode === "generate") {
      // Be modellen returnera ett strikt JSON-paket med flera sidor.
      const sys = `
Du är en sajt-generator. Returnera ENDAST giltig JSON enligt detta schema:
{
  "projectName": "string",
  "pages": [
    { "name":"Home", "path":"index.html", "html":"...komplett HTML...", "css":"/*css*/", "js":"//js" },
    { "name":"About", "path":"about.html", "html":"...", "css":"", "js":"" }
  ]
}
Strikta krav:
- Inga backticks, inga kommentarer utanför JSON.
- HTML ska vara komplett (<!DOCTYPE html> + <html>...).
- Lägg in bra layout / call-to-actions / sektioner (hero, features, CTA, footer).
- Använd Tailwind CDN i varje HTML (snabb utveckling).
- Navigationsmeny med länkar mellan sidorna (href="index.html", "about.html", "contact.html").
- Bilder: använd tydliga placeholder-bilder (via unsplash).
- Ton och stil: modern, ren, hög kontrast, följsam typografi.
      `;

      const user = `
Skapa en flersidig sajt utifrån denna prompt:
"${prompt}"

Inkludera sidor: Home (index.html), About (about.html), Contact (contact.html). Gärna fler om relevant.
Ge attraktiva komponenter (cards, listor, testimonials, formulär).
      `;

      const chat = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ]
      });

      const raw = chat.choices?.[0]?.message?.content || "{}";
      return new Response(raw, { status: 200, headers: { "content-type": "application/json" } });
    }

    if (mode === "transform") {
      const sys = `
Du är en kodförbättrare. Du får HTML, CSS, JS och en kort instruktion.
Returnera ENDAST giltig JSON:
{ "html":"...", "css":"...", "js":"..." }
- Ändra minimalt men uppfyll instruktionen.
- HTML ska vara komplett om du gör större ändringar; annars returnera bara "html" som fragment funkar (Webneva byter in delarna korrekt).
- Skriv ren, semantisk kod.
      `;

      const user = `
Instruktion: ${prompt}

Aktuell kod:
HTML:
${html || ""}

CSS:
${css || ""}

JS:
${js || ""}
      `;

      const chat = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ]
      });

      const raw = chat.choices?.[0]?.message?.content || "{}";
      return new Response(raw, { status: 200, headers: { "content-type": "application/json" } });
    }

    if (mode === "explain") {
      const sys = "Du förklarar kod på svenska, kort och tydligt, punktvis.";
      const user = `
Förklara följande kod och ge förbättringstips:

HTML:
${html || ""}

CSS:
${css || ""}

JS:
${js || ""}
      `;

      const chat = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ]
      });

      const ans = chat.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ explanation: ans }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Okänt mode." }), { status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Serverfel: ${e.message}` }), { status: 500 });
  }
}
