// api/openai.js
import OpenAI from 'openai';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not configured');
  }
  return new OpenAI({ apiKey });
};

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
    const { type, message, code, brief } = req.body || {};

    // Validate request body
    if (!type) {
      return res.status(400).json({ 
        error: 'Type is required',
        details: 'Please specify the type of operation: explain, improve, or refine'
      });
    }

    const openai = getOpenAIClient();

    switch (type) {
      case 'explain':
        return await handleExplain(openai, code, res);
      
      case 'improve':
        return await handleImprove(openai, message, code, res);
      
      case 'refine':
        return await handleRefine(openai, brief, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid type',
          details: 'Type must be one of: explain, improve, refine'
        });
    }

  } catch (error) {
    console.error('OpenAI handler error:', error);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (error.message.includes('API key') || error.message.includes('configuration')) {
      return res.status(500).json({
        error: 'OpenAI not configured',
        details: 'Please configure OPENAI_API_KEY environment variable',
        configured: false
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function handleExplain(openai, code, res) {
  if (!code || code.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Code is required for explanation',
      details: 'Please provide the HTML/CSS/JS code you want explained'
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert web developer and educator. Explain the provided code in a clear, concise, and helpful manner.

EXPLANATION GUIDELINES:
- Focus on the structure, purpose, and functionality
- Point out key design patterns and best practices
- Note any potential issues or improvements
- Explain responsive design considerations
- Mention accessibility features if present
- Keep explanations practical and actionable
- Use bullet points for clarity
- Write in Swedish

Format your response in clear sections with bullet points.`
        },
        {
          role: "user",
          content: `Please explain this code:\n\n${code}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const explanation = completion.choices[0]?.message?.content?.trim();
    
    if (!explanation) {
      throw new Error('No explanation generated');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ 
      reply: explanation,
      model: 'gpt-4'
    });

  } catch (error) {
    console.error('Explanation error:', error);
    throw new Error(`Failed to generate explanation: ${error.message}`);
  }
}

async function handleImprove(openai, message, code, res) {
  if (!code || code.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Code is required for improvement',
      details: 'Please provide the HTML/CSS/JS code you want to improve'
    });
  }

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Improvement instructions are required',
      details: 'Please describe what you want to improve'
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert web developer specializing in code improvement. Your task is to improve the provided code based on the user's instructions.

IMPROVEMENT GUIDELINES:
- Maintain all existing functionality
- Improve code quality, readability, and maintainability
- Enhance design, layout, and user experience
- Ensure full responsiveness
- Follow web standards and best practices
- Use semantic HTML
- Improve accessibility (ARIA, contrast, keyboard navigation)
- Optimize performance
- Use Tailwind CSS for styling
- Return ONLY the complete improved HTML code
- Include proper <!DOCTYPE>, <html>, <head>, and <body> tags
- No explanations, no markdown, just pure HTML

Return only the improved code with no additional text.`
        },
        {
          role: "user",
          content: `Improvement instructions: ${message}

Code to improve:
${code}`
        }
      ],
      temperature: 0.4,
      max_tokens: 4000
    });

    const improvedCode = completion.choices[0]?.message?.content?.trim();
    
    if (!improvedCode) {
      throw new Error('No improved code generated');
    }

    // Validate that we got HTML back
    if (!isValidHTML(improvedCode)) {
      throw new Error('Generated response is not valid HTML');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ 
      reply: improvedCode,
      model: 'gpt-4'
    });

  } catch (error) {
    console.error('Improvement error:', error);
    throw new Error(`Failed to improve code: ${error.message}`);
  }
}

async function handleRefine(openai, brief, res) {
  if (!brief || brief.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Brief is required for refinement',
      details: 'Please provide a project brief or description'
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a project specification expert. Refine the user's brief into a clear, structured specification for web development.

REFINEMENT GUIDELINES:
- Extract key requirements and goals
- Define target audience and user needs
- Suggest appropriate design style and color scheme
- Outline necessary pages and sections
- Identify key features and functionality
- Consider responsive design requirements
- Note any special requirements (e-commerce, forms, etc.)
- Structure the response in clear sections
- Write in Swedish
- Be concise but comprehensive

Format the response as a well-structured project specification.`
        },
        {
          role: "user",
          content: `Refine this project brief:\n\n${brief}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const refinedBrief = completion.choices[0]?.message?.content?.trim();
    
    if (!refinedBrief) {
      throw new Error('No refined brief generated');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ 
      refined: refinedBrief,
      model: 'gpt-4'
    });

  } catch (error) {
    console.error('Refinement error:', error);
    throw new Error(`Failed to refine brief: ${error.message}`);
  }
}

function isValidHTML(html) {
  if (!html || typeof html !== 'string') return false;
  
  // Basic HTML validation
  const hasHTMLTag = /<html[\s>]/i.test(html);
  const hasBodyTag = /<body[\s>]/i.test(html);
  
  return hasHTMLTag && hasBodyTag;
}
