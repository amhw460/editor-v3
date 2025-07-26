import axios from 'axios';

// Cache for converted expressions to avoid repeated API calls
const conversionCache = new Map();

export async function convertToLatex(naturalLanguage) {
  const trimmedText = naturalLanguage.trim();
  
  if (conversionCache.has(trimmedText)) {
    return conversionCache.get(trimmedText);
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