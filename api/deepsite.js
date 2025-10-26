// api/deepsite.js
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed. Only POST requests are supported.' });
  }

  try {
    const { prompt, html, settings, mode = 'generate' } = req.body || {};
    
    // Validate input
    if (!prompt && mode === 'generate') {
      return res.status(400).json({ 
        error: 'Prompt is required for generation mode.',
        details: 'Please provide a description of what you want to build.'
      });
    }

    if (!html && mode === 'improve') {
      return res.status(400).json({ 
        error: 'HTML content is required for improvement mode.',
        details: 'Please provide the HTML code you want to improve.'
      });
    }

    const apiUrl = process.env.DEEPSITE_API_URL;
    const apiKey = process.env.DEEPSITE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Check if we have at least one AI service configured
    if ((!apiUrl || !apiKey) && !openaiKey) {
      console.error('Missing API configuration:', {
        hasDeepSite: !!(apiUrl && apiKey),
        hasOpenAI: !!openaiKey
      });
      
      return res.status(500).json({
        error: 'AI services not configured',
        details: 'Please configure either DEEPSITE_API_URL/KEY or OPENAI_API_KEY environment variables.',
        configured: {
          deepsite: !!(apiUrl && apiKey),
          openai: !!openaiKey
        }
      });
    }

    console.log(`Processing ${mode} request with prompt:`, prompt?.substring(0, 100) + '...');

    // Enhanced prompt engineering for better results
    const enhancedPrompt = createEnhancedPrompt(prompt, html, mode);
    
    let result;

    // Try DeepSite first if configured
    if (apiUrl && apiKey) {
      try {
        result = await tryDeepSite(apiUrl, apiKey, enhancedPrompt, mode, html);
        if (result.success) {
          console.log('DeepSite generation successful');
          return res.status(200).json(result.data);
        }
      } catch (deepSiteError) {
        console.warn('DeepSite failed, falling back to OpenAI:', deepSiteError.message);
      }
    }

    // Fallback to OpenAI
    if (openaiKey) {
      try {
        result = await tryOpenAI(openaiKey, enhancedPrompt, mode, html);
        if (result.success) {
          console.log('OpenAI generation successful');
          return res.status(200).json(result.data);
        }
      } catch (openaiError) {
        console.error('OpenAI also failed:', openaiError.message);
      }
    }

    // If both services failed, return a helpful error
    return res.status(500).json({
      error: 'All AI services failed',
      details: 'Both DeepSite and OpenAI services are unavailable or returned invalid responses.',
      fallback: generateFallbackHTML(prompt, html, mode)
    });

  } catch (error) {
    console.error('DeepSite handler error:', error);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

function createEnhancedPrompt(prompt, html, mode) {
  if (mode === 'improve') {
    return `You are an expert web developer. Improve the following HTML code based on the user's instructions.

USER INSTRUCTION: ${prompt || 'Improve the design, layout, typography, and responsiveness. Make it modern and professional.'}

CURRENT HTML:
${html}

IMPROVEMENT GUIDELINES:
1. Use modern, clean design with Tailwind CSS
2. Ensure full responsiveness for mobile, tablet, and desktop
3. Improve typography hierarchy and readability
4. Enhance color scheme and visual appeal
5. Maintain or improve accessibility (ARIA labels, semantic HTML)
6. Keep all existing functionality
7. Use modern CSS features and best practices
8. Ensure fast loading performance

Return ONLY the complete improved HTML code with <html>, <head>, and <body> tags. No explanations, no markdown, just pure HTML.`;
  }

  // Generation mode
  return `You are an expert web developer. Create a complete, professional website based on the user's description.

USER REQUEST: ${prompt}

WEBSITE REQUIREMENTS:
- Use modern, beautiful design with Tailwind CSS
- Fully responsive (mobile-first)
- Professional typography and spacing
- Appropriate color scheme
- Semantic HTML structure
- Accessible (ARIA labels, proper headings)
- Fast loading and performant
- Include a navigation header and footer
- Modern, engaging hero section if appropriate

IMPLEMENTATION:
- Use Tailwind CSS via CDN
- Include proper viewport meta tag
- Use semantic HTML5 elements
- Ensure good contrast ratios
- Add appropriate interactive states (hover, focus)
- Include meaningful placeholder content

Return a complete HTML file with <html>, <head>, and <body> tags. No explanations, no markdown, just the HTML code.

Example structure:
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <!-- Your beautiful, responsive website here -->
</body>
</html>`;
}

async function tryDeepSite(apiUrl, apiKey, prompt, mode, html) {
  const requestBody = {
    action: mode,
    prompt: prompt,
    ...(mode === 'improve' && { html: html }),
    settings: {
      quality: "high",
      framework: "html_tailwind",
      responsiveness: true,
      accessibility: true
    }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    timeout: 60000 // 60 second timeout
  });

  if (!response.ok) {
    throw new Error(`DeepSite API responded with status: ${response.status}`);
  }

  const data = await response.json();
  
  // Validate response structure
  if (isValidDeepSiteResponse(data)) {
    return { success: true, data };
  } else {
    throw new Error('Invalid response format from DeepSite');
  }
}

async function tryOpenAI(apiKey, prompt, mode, html) {
  const systemMessage = mode === 'improve' 
    ? `You are an expert web developer specializing in improving existing websites. Return ONLY the complete HTML code with no explanations. Always include <!DOCTYPE html>, <html>, <head>, and <body> tags. Use Tailwind CSS for styling.`
    : `You are an expert web developer specializing in creating beautiful, responsive websites. Return ONLY the complete HTML code with no explanations. Always include <!DOCTYPE html>, <html>, <head>, and <body> tags. Use Tailwind CSS for styling.`;

  const userMessage = mode === 'improve'
    ? `Improve this HTML code:\n\n${html}\n\nImprovement instructions: ${prompt}`
    : prompt;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
    timeout: 60000
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const htmlContent = data.choices?.[0]?.message?.content?.trim();

  if (!htmlContent || !isValidHTML(htmlContent)) {
    throw new Error('OpenAI returned invalid or empty HTML');
  }

  return {
    success: true,
    data: {
      html: htmlContent,
      files: [
        {
          name: 'index.html',
          content: htmlContent,
          type: 'html'
        }
      ]
    }
  };
}

function isValidDeepSiteResponse(data) {
  // Check for multi-file response
  if (data.files && Array.isArray(data.files)) {
    return data.files.some(file => 
      file.content && isValidHTML(file.content)
    );
  }
  
  // Check for single HTML response
  if (data.html && isValidHTML(data.html)) {
    return true;
  }
  
  return false;
}

function isValidHTML(html) {
  if (!html || typeof html !== 'string') return false;
  
  // Basic HTML validation
  const hasHTMLTag = /<html[\s>]/i.test(html);
  const hasBodyTag = /<body[\s>]/i.test(html);
  const hasHeadTag = /<head[\s>]/i.test(html);
  
  return hasHTMLTag && hasBodyTag && hasHeadTag;
}

function generateFallbackHTML(prompt, html, mode) {
  if (mode === 'improve') {
    return `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Förbättrad Sida</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .fallback-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="fallback-banner text-white py-8">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-3xl font-bold mb-4">🚧 AI-tjänster är tillfälligt otillgängliga</h1>
            <p class="text-xl opacity-90">Vi kunde inte förbättra din kod just nu. Originalkoden visas nedan.</p>
        </div>
    </div>
    <div class="container mx-auto px-4 py-8 max-w-4xl">
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Din Originalkod</h2>
            <div class="bg-gray-100 p-4 rounded border overflow-x-auto">
                <pre class="text-sm text-gray-800 whitespace-pre-wrap">${escapeHtml(html || 'Ingen kod tillgänglig')}</pre>
            </div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-yellow-800 mb-2">Nästa steg</h3>
            <p class="text-yellow-700">Försök igen om några minuter, eller redigera koden manuellt i editorn.</p>
        </div>
    </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webneva Genererad Sida</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .hero-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-lg">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <div class="text-2xl font-bold text-gray-800">Mitt Företag</div>
                <div class="hidden md:flex space-x-8">
                    <a href="#" class="text-gray-600 hover:text-blue-500 transition">Hem</a>
                    <a href="#" class="text-gray-600 hover:text-blue-500 transition">Tjänster</a>
                    <a href="#" class="text-gray-600 hover:text-blue-500 transition">Om oss</a>
                    <a href="#" class="text-gray-600 hover:text-blue-500 transition">Kontakt</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-gradient text-white py-20">
        <div class="container mx-auto px-4 text-center">
            <h1 class="text-5xl font-bold mb-6">Välkommen till din nya hemsida</h1>
            <p class="text-xl mb-8 max-w-2xl mx-auto">
                Denna sida skapades med Webneva. AI-tjänster är tillfälligt otillgängliga, men du kan redigera denna kod direkt i editorn.
            </p>
            <div class="space-x-4">
                <button class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                    Kom Igång
                </button>
                <button class="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition">
                    Läs Mer
                </button>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="py-20 bg-white">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold text-center text-gray-800 mb-12">Våra Tjänster</h2>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="text-center p-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-2xl">🚀</span>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">Modern Design</h3>
                    <p class="text-gray-600">Skräddarsydda lösningar med moderna tekniker och bästa praxis.</p>
                </div>
                <div class="text-center p-6">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-2xl">📱</span>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">Responsiv</h3>
                    <p class="text-gray-600">Perfekt på alla enheter, från mobil till desktop.</p>
                </div>
                <div class="text-center p-6">
                    <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-2xl">⚡</span>
                    </div>
                    <h3 class="text-xl font-semibold mb-3">Snabb</h3>
                    <p class="text-gray-600">Optimerad för hög prestanda och bra användarupplevelse.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Fallback Notice -->
    <section class="py-12 bg-yellow-50 border-t border-yellow-200">
        <div class="container mx-auto px-4 text-center">
            <div class="max-w-2xl mx-auto">
                <h3 class="text-2xl font-bold text-yellow-800 mb-4">AI-tjänster är tillfälligt otillgängliga</h3>
                <p class="text-yellow-700 mb-4">
                    Vi kunde inte generera din sida baserat på: "${prompt || 'din beskrivning'}"
                </p>
                <p class="text-yellow-600">
                    Du kan redigera denna mall direkt i Webneva Studio eller försöka igen om några minuter.
                </p>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white py-12">
        <div class="container mx-auto px-4 text-center">
            <p>&copy; 2024 Mitt Företag. Alla rättigheter förbehållna.</p>
            <p class="mt-2 text-gray-400">Skapad med ❤️ och Webneva</p>
        </div>
    </footer>
</body>
</html>`;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
