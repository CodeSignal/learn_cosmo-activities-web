/**
 * Utility function to render LaTeX math expressions in HTML content using KaTeX
 * Supports both inline math ($...$ or \(...\)) and display math ($$...$$ or \[...\])
 * 
 * @param {HTMLElement} element - HTML element to process
 * @param {Object} options - KaTeX rendering options
 * @returns {void}
 */
export function renderMath(element, options = {}) {
  if (!element) return;

  // Default options for KaTeX
  const defaultOptions = {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false }
    ],
    throwOnError: false,
    errorColor: '#cc0000',
    ...options
  };

  // Function to actually render math
  const doRender = () => {
    if (window.renderMathInElement && element) {
      window.renderMathInElement(element, defaultOptions);
    }
  };

  // Check if KaTeX auto-render is available
  if (typeof window !== 'undefined' && window.renderMathInElement) {
    // KaTeX is already loaded, render immediately
    doRender();
  } else {
    // Wait for KaTeX to load
    if (typeof window !== 'undefined') {
      // Check if scripts are loading
      const checkKaTeX = setInterval(() => {
        if (window.renderMathInElement) {
          clearInterval(checkKaTeX);
          doRender();
        }
      }, 50);
      
      // Stop checking after 5 seconds
      setTimeout(() => {
        clearInterval(checkKaTeX);
      }, 5000);
      
      // Also listen for load event as fallback
      window.addEventListener('load', () => {
        clearInterval(checkKaTeX);
        doRender();
      }, { once: true });
    }
  }
}
