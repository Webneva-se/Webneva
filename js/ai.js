// js/ai.js

/**
 * AI service integration for Webneva Studio
 * Handles all AI-related operations including generation, transformation, and explanations
 */

class AIService {
  constructor() {
    this.baseURL = '/api';
    this.timeout = 60000; // 60 seconds
  }

  async _makeRequest(endpoint, data) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - AI service is taking too long to respond');
      }
      
      throw error;
    }
  }

  /**
   * Generate a complete website from a prompt
   */
  async generateSite(prompt, options = {}) {
    try {
      console.log('Generating site with prompt:', prompt.substring(0, 100) + '...');
      
      const data = await this._makeRequest('deepsite', {
        mode: 'generate',
        prompt: prompt,
        settings: {
          quality: options.quality || 'high',
          framework: 'html_tailwind',
          responsiveness: true,
          accessibility: true,
          ...options
        }
      });

      return this._processGenerationResponse(data);
    } catch (error) {
      console.error('Site generation failed:', error);
      throw new Error(`Generation failed: ${error.message}`);
    }
  }

  /**
   * Improve existing code based on instructions
   */
  async improveCode(instruction, currentHTML, options = {}) {
    try {
      console.log('Improving code with instruction:', instruction.substring(0, 100) + '...');
      
      const data = await this._makeRequest('deepsite', {
        mode: 'improve',
        prompt: instruction,
        html: currentHTML,
        settings: {
          preserveFunctionality: true,
          enhanceDesign: true,
          improveResponsiveness: true,
          ...options
        }
      });

      return this._processImprovementResponse(data);
    } catch (error) {
      console.error('Code improvement failed:', error);
      throw new Error(`Improvement failed: ${error.message}`);
    }
  }

  /**
   * Explain the provided code
   */
  async explainCode(code, options = {}) {
    try {
      const data = await this._makeRequest('openai', {
        type: 'explain',
        code: code,
        ...options
      });

      if (!data.reply) {
        throw new Error('No explanation received');
      }

      return {
        explanation: data.reply,
        model: data.model || 'unknown'
      };
    } catch (error) {
      console.error('Code explanation failed:', error);
      throw new Error(`Explanation failed: ${error.message}`);
    }
  }

  /**
   * Refine a project brief
   */
  async refineBrief(brief, options = {}) {
    try {
      const data = await this._makeRequest('openai', {
        type: 'refine',
        brief: brief,
        ...options
      });

      if (!data.refined) {
        throw new Error('No refined brief received');
      }

      return {
        refinedBrief: data.refined,
        model: data.model || 'unknown'
      };
    } catch (error) {
      console.error('Brief refinement failed:', error);
      throw new Error(`Refinement failed: ${error.message}`);
    }
  }

  /**
   * Transform code with specific instructions
   */
  async transformCode(instruction, { html, css, js } = {}, options = {}) {
    try {
      const fullCode = this._combineCode(html, css, js);
      const data = await this._makeRequest('openai', {
        type: 'improve',
        message: instruction,
        code: fullCode,
        ...options
      });

      if (!data.reply) {
        throw new Error('No transformed code received');
      }

      return this._parseTransformedCode(data.reply);
    } catch (error) {
      console.error('Code transformation failed:', error);
      throw new Error(`Transformation failed: ${error.message}`);
    }
  }

  /**
   * Process generation response from AI service
   */
  _processGenerationResponse(data) {
    // Handle multi-file response
    if (data.files && Array.isArray(data.files)) {
      return {
        projectName: data.projectName || 'Webneva Project',
        pages: data.files.map(file => ({
          name: file.name || 'index.html',
          path: file.name || 'index.html',
          html: file.content || '',
          css: file.css || '',
          js: file.js || '',
          type: file.type || 'html'
        })),
        metadata: {
          totalPages: data.files.length,
          generatedAt: new Date().toISOString()
        }
      };
    }

    // Handle single HTML response
    if (data.html) {
      return {
        projectName: 'Webneva Project',
        pages: [{
          name: 'index.html',
          path: 'index.html',
          html: data.html,
          css: '',
          js: '',
          type: 'html'
        }],
        metadata: {
          totalPages: 1,
          generatedAt: new Date().toISOString()
        }
      };
    }

    throw new Error('Invalid response format from AI service');
  }

  /**
   * Process improvement response from AI service
   */
  _processImprovementResponse(data) {
    let improvedHTML = '';

    if (data.files && data.files.length > 0) {
      improvedHTML = data.files[0].content || '';
    } else if (data.html) {
      improvedHTML = data.html;
    } else if (data.reply) {
      improvedHTML = data.reply;
    }

    if (!improvedHTML) {
      throw new Error('No improved code received');
    }

    return {
      html: improvedHTML,
      css: '',
      js: '',
      metadata: {
        improvedAt: new Date().toISOString(),
        model: data.model || 'unknown'
      }
    };
  }

  /**
   * Combine separate code parts into a single string
   */
  _combineCode(html, css, js) {
    let combined = html || '';

    if (css) {
      combined += `\n\n<!-- CSS -->\n<style>\n${css}\n</style>`;
    }

    if (js) {
      combined += `\n\n<!-- JavaScript -->\n<script>\n${js}\n</script>`;
    }

    return combined;
  }

  /**
   * Parse transformed code back into separate parts
   */
  _parseTransformedCode(combinedCode) {
    // Simple parsing - in a real implementation, you'd want more sophisticated parsing
    const htmlMatch = combinedCode.match(/<html[\s\S]*?<\/html>/i) || [combinedCode];
    const cssMatch = combinedCode.match(/<style>([\s\S]*?)<\/style>/i);
    const jsMatch = combinedCode.match(/<script>([\s\S]*?)<\/script>/i);

    return {
      html: htmlMatch[0],
      css: cssMatch ? cssMatch[1] : '',
      js: jsMatch ? jsMatch[1] : ''
    };
  }

  /**
   * Validate if the service is available
   */
  async checkHealth() {
    try {
      // Try a simple request to check if services are responsive
      await Promise.race([
        this._makeRequest('openai', { type: 'explain', code: '<html><body>Test</body></html>' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
      ]);

      return {
        status: 'healthy',
        services: {
          openai: true,
          deepsite: true // Assume deepsite is available if openai works (same infrastructure)
        }
      };
    } catch (error) {
      console.warn('AI service health check failed:', error);
      return {
        status: 'unhealthy',
        services: {
          openai: false,
          deepsite: false
        },
        error: error.message
      };
    }
  }

  /**
   * Get usage statistics (if available)
   */
  async getUsage() {
    // This would typically connect to your backend analytics
    // For now, return mock data
    return {
      requestsToday: 0,
      totalRequests: 0,
      limits: {
        daily: 100,
        monthly: 3000
      }
    };
  }
}

// Create and export a singleton instance
export const aiService = new AIService();

// Legacy export functions for backward compatibility
export async function aiGenerate(prompt) {
  return aiService.generateSite(prompt);
}

export async function aiTransform(prompt, codeParts) {
  return aiService.transformCode(prompt, codeParts);
}

export async function aiExplain(codeParts) {
  const combinedCode = aiService._combineCode(
    codeParts.html,
    codeParts.css,
    codeParts.js
  );
  return aiService.explainCode(combinedCode);
}

export default aiService;
