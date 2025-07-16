import axios from 'axios';

// Cache for converted expressions to avoid repeated API calls
const conversionCache = new Map();

// Built-in patterns for common mathematical expressions
const builtInPatterns = [
  // Basic operations
  { pattern: /integral of (.+) from (.+) to (.+)/i, latex: '\\int_{$2}^{$3} $1 \\, dx' },
  { pattern: /integral of (.+)/i, latex: '\\int $1 \\, dx' },
  { pattern: /derivative of (.+) with respect to (.+)/i, latex: '\\frac{d}{d$2}($1)' },
  { pattern: /derivative of (.+)/i, latex: '\\frac{d}{dx}($1)' },
  { pattern: /partial derivative of (.+) with respect to (.+)/i, latex: '\\frac{\\partial}{\\partial $2}($1)' },
  
  // Powers and roots
  { pattern: /(.+) squared/i, latex: '$1^2' },
  { pattern: /(.+) cubed/i, latex: '$1^3' },
  { pattern: /(.+) to the power of (.+)/i, latex: '$1^{$2}' },
  { pattern: /(.+) to the (.+) power/i, latex: '$1^{$2}' },
  { pattern: /square root of (.+)/i, latex: '\\sqrt{$1}' },
  { pattern: /cube root of (.+)/i, latex: '\\sqrt[3]{$1}' },
  { pattern: /(.+) root of (.+)/i, latex: '\\sqrt[$1]{$2}' },
  
  // Fractions
  { pattern: /(.+) over (.+)/i, latex: '\\frac{$1}{$2}' },
  { pattern: /fraction (.+) over (.+)/i, latex: '\\frac{$1}{$2}' },
  
  // Trigonometric functions
  { pattern: /sine of (.+)/i, latex: '\\sin($1)' },
  { pattern: /cosine of (.+)/i, latex: '\\cos($1)' },
  { pattern: /tangent of (.+)/i, latex: '\\tan($1)' },
  { pattern: /sin (.+)/i, latex: '\\sin($1)' },
  { pattern: /cos (.+)/i, latex: '\\cos($1)' },
  { pattern: /tan (.+)/i, latex: '\\tan($1)' },
  
  // Logarithms
  { pattern: /natural log of (.+)/i, latex: '\\ln($1)' },
  { pattern: /log of (.+)/i, latex: '\\log($1)' },
  { pattern: /logarithm of (.+)/i, latex: '\\log($1)' },
  
  // Summation and products
  { pattern: /sum from (.+) to (.+) of (.+)/i, latex: '\\sum_{$1}^{$2} $3' },
  { pattern: /product from (.+) to (.+) of (.+)/i, latex: '\\prod_{$1}^{$2} $3' },
  
  // Limits
  { pattern: /limit as (.+) approaches (.+) of (.+)/i, latex: '\\lim_{$1 \\to $2} $3' },
  { pattern: /limit of (.+) as (.+) approaches (.+)/i, latex: '\\lim_{$2 \\to $3} $1' },
  
  // Greek letters
  { pattern: /alpha/i, latex: '\\alpha' },
  { pattern: /beta/i, latex: '\\beta' },
  { pattern: /gamma/i, latex: '\\gamma' },
  { pattern: /delta/i, latex: '\\delta' },
  { pattern: /epsilon/i, latex: '\\epsilon' },
  { pattern: /theta/i, latex: '\\theta' },
  { pattern: /lambda/i, latex: '\\lambda' },
  { pattern: /mu/i, latex: '\\mu' },
  { pattern: /pi/i, latex: '\\pi' },
  { pattern: /sigma/i, latex: '\\sigma' },
  { pattern: /phi/i, latex: '\\phi' },
  { pattern: /omega/i, latex: '\\omega' },
  
  // Special symbols
  { pattern: /infinity/i, latex: '\\infty' },
  { pattern: /plus or minus/i, latex: '\\pm' },
  { pattern: /minus or plus/i, latex: '\\mp' },
  { pattern: /approximately equal to/i, latex: '\\approx' },
  { pattern: /not equal to/i, latex: '\\neq' },
  { pattern: /less than or equal to/i, latex: '\\leq' },
  { pattern: /greater than or equal to/i, latex: '\\geq' },
];

// Try to convert using built-in patterns first
function tryBuiltInConversion(text) {
  for (const { pattern, latex } of builtInPatterns) {
    const match = text.match(pattern);
    if (match) {
      let result = latex;
      // Replace placeholders with matched groups
      for (let i = 1; i < match.length; i++) {
        result = result.replace(new RegExp(`\\$${i}`, 'g'), match[i].trim());
      }
      return result;
    }
  }
  return null;
}

export async function convertToLatex(naturalLanguage) {
  const trimmedText = naturalLanguage.trim();
  
  if (conversionCache.has(trimmedText)) {
    return conversionCache.get(trimmedText);
  }
  
  // Try built-in patterns first
  const builtInResult = tryBuiltInConversion(trimmedText);
  if (builtInResult) {
    conversionCache.set(trimmedText, builtInResult);
    return builtInResult;
  }
  
  // If no built-in pattern matches, try API conversion
  try {
    
    const response = await axios.post('/api/convert-latex', {
      text: trimmedText
    }, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const latexCode = response.data.latex;
    if (latexCode) {
      conversionCache.set(trimmedText, latexCode);
      return latexCode;
    }
  } catch (error) {
    console.error('API conversion failed:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('Request failed:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
  
  // Fallback: return the original text as-is
  console.log('Using fallback (original text):', trimmedText);
  const fallback = trimmedText;
  conversionCache.set(trimmedText, fallback);
  return fallback;
}

// Clear the cache (useful for development)
export function clearConversionCache() {
  conversionCache.clear();
  console.log('🗑️ LaTeX conversion cache cleared');
}

// Get cache size (for debugging)
export function getCacheSize() {
  return conversionCache.size;
} 