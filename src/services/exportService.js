import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToLatex = (editor, documentTitle = 'Document') => {
  if (!editor) return;

  const html = editor.getHTML();
  let latex = convertHtmlToLatex(html);
  
  // Create LaTeX document structure
  const latexDocument = `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{geometry}
\\usepackage{hyperref}
\\usepackage[normalem]{ulem}

\\geometry{margin=1in}

\\title{${documentTitle.replace(/[#$%&_{}]/g, '\\$&')}}
\\author{}
\\date{\\today}

\\begin{document}

\\maketitle

${latex}

\\end{document}`;

  // Download the LaTeX file
  downloadFile(latexDocument, `${documentTitle}.tex`, 'text/plain');
};

export const exportToPdf = async (editor, documentTitle = 'Document') => {
  if (!editor) return;

  try {
    // Get the editor element
    const editorElement = document.querySelector('.ProseMirror');
    if (!editorElement) {
      throw new Error('Editor element not found');
    }

    // Wait for KaTeX to be available
    if (!window.katex) {
      await new Promise(resolve => {
        const checkKatex = () => {
          if (window.katex) {
            resolve();
          } else {
            setTimeout(checkKatex, 100);
          }
        };
        checkKatex();
      });
    }

    // Create a clone of the editor content for PDF generation
    const cloneContainer = document.createElement('div');
    cloneContainer.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 800px;
      padding: 40px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #1a1a1a;
    `;
    
    // Add KaTeX CSS to the clone
    const katexCSS = document.querySelector('link[href*="katex"]');
    if (katexCSS) {
      const clonedCSS = katexCSS.cloneNode();
      document.head.appendChild(clonedCSS);
    }
    
    // Get HTML and process LaTeX elements for PDF
    let htmlContent = editor.getHTML();
    
    // Extract LaTeX from data attributes and render with KaTeX for PDF
    htmlContent = htmlContent.replace(/<span[^>]*data-type="latex"[^>]*data-latex="([^"]*)"[^>]*data-style-mode="([^"]*)"[^>]*>.*?<\/span>/gi, (match, latex, styleMode) => {
      try {
        if (window.katex && latex) {
          const isDisplayMode = styleMode === 'display';
          
          // Apply style modifications based on mode
          let renderLatex = latex;
          if (styleMode === 'script') {
            renderLatex = `\\scriptstyle{${latex}}`;
          } else if (styleMode === 'scriptscript') {
            renderLatex = `\\scriptscriptstyle{${latex}}`;
          }
          
          const rendered = window.katex.renderToString(renderLatex, {
            throwOnError: false,
            displayMode: isDisplayMode,
            output: 'html'
          });

          
          const getFontSize = (styleMode) => {
            switch (styleMode) {
              case 'display': return '1.2em';
              case 'text': return '0.9em';
              case 'script': return '0.8em';
              case 'scriptscript': return '0.7em';
              default: return '1em';
            }
          };
          
          const wrapperStyle = isDisplayMode 
            ? `display: block; text-align: center; margin: 1em 0; font-size: ${getFontSize(styleMode)};` 
            : `display: inline; font-size: ${getFontSize(styleMode)};`;
          return `<span class="katex-math" style="${wrapperStyle}">${rendered}</span>`;
        }
      } catch (e) {
        console.error('KaTeX rendering error for PDF:', e);
        console.error('LaTeX that failed:', latex);
      }
      
      // Fallback: render as styled math notation
      const isDisplayMode = styleMode === 'display';
      const getFontSize = (styleMode) => {
        switch (styleMode) {
          case 'display': return '1.2em';
          case 'text': return '0.9em';
          case 'script': return '0.8em';
          case 'scriptscript': return '0.7em';
          default: return '1em';
        }
      };
      const wrapperStyle = isDisplayMode 
        ? `display: block; text-align: center; margin: 1em 0; font-size: ${getFontSize(styleMode)};` 
        : `display: inline; font-size: ${getFontSize(styleMode)};`;
      return `<span style="font-family: 'Times New Roman', serif; font-style: italic; background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #e1e5e9; ${wrapperStyle}">${latex || 'math'}</span>`;
    });

    
    cloneContainer.innerHTML = `
      <h1 style="text-align: center; margin-bottom: 30px; font-size: 24px;">${documentTitle}</h1>
      ${htmlContent}
    `;
    
    document.body.appendChild(cloneContainer);

    // Wait for any dynamic content and KaTeX to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Convert to canvas
    const canvas = await html2canvas(cloneContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: cloneContainer.scrollHeight
    });

    // Remove the clone
    document.body.removeChild(cloneContainer);

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = pdfHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
    }

    // Download the PDF
    pdf.save(`${documentTitle}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Error generating PDF. Please try again.');
  }
};

// Convert HTML to LaTeX format
const convertHtmlToLatex = (html) => {
  let latex = html;

  // STEP 1: Extract and preserve LaTeX expressions
  const preservedMath = [];
  let preserveIndex = 0;
  
  // Extract LaTeX from TipTap spans - both converted and original
  latex = latex.replace(/<span[^>]*data-type="latex"[^>]*data-latex="([^"]*)"[^>]*data-style-mode="([^"]*)"[^>]*>.*?<\/span>/gi, (match, latexCode, styleMode) => {
    const placeholder = `__MATH_${preserveIndex}__`;
    // For LaTeX export, use appropriate math format based on style mode
    if (latexCode) {
      let formattedLatex = latexCode;
      
      // Apply style commands based on mode
      if (styleMode === 'script') {
        formattedLatex = `\\scriptstyle{${latexCode}}`;
      } else if (styleMode === 'scriptscript') {
        formattedLatex = `\\scriptscriptstyle{${latexCode}}`;
      }
      
      // Use display mode for 'display' style, inline for others
      const isDisplayMode = styleMode === 'display';
      preservedMath[preserveIndex] = isDisplayMode ? `\\[${formattedLatex}\\]` : `\\(${formattedLatex}\\)`;
    } else {
      preservedMath[preserveIndex] = '';
    }
    preserveIndex++;
    return placeholder;
  });
  
  // Handle spans without converted LaTeX but check for style mode
  latex = latex.replace(/<span[^>]*data-type="latex"[^>]*data-original="([^"]*)"[^>]*(?:data-style-mode="([^"]*)")?[^>]*>.*?<\/span>/gi, (match, original, styleMode) => {
    const placeholder = `__MATH_${preserveIndex}__`;
    // For original text, keep as-is but ensure it's properly escaped
    const isDisplayMode = styleMode === 'display';
    if (original) {
      const escapedOriginal = original.replace(/[\\{}]/g, '\\$&');
      let formattedOriginal = `\\text{${escapedOriginal}}`;
      
      // Apply style commands based on mode
      if (styleMode === 'script') {
        formattedOriginal = `\\scriptstyle{${formattedOriginal}}`;
      } else if (styleMode === 'scriptscript') {
        formattedOriginal = `\\scriptscriptstyle{${formattedOriginal}}`;
      }
      
      preservedMath[preserveIndex] = isDisplayMode 
        ? `\\[${formattedOriginal}\\]` 
        : `\\(${formattedOriginal}\\)`;
    } else {
      preservedMath[preserveIndex] = '';
    }
    preserveIndex++;
    return placeholder;
  });

  // STEP 2: Convert HTML to LaTeX
  latex = latex
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\\section{$1}\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\\subsection{$1}\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\\subsubsection{$1}\n\n')
    
    // Text formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '\\textbf{$1}')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '\\textbf{$1}')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '\\textit{$1}')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '\\textit{$1}')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '\\underline{$1}')
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '\\sout{$1}')
    
    // Lists
    .replace(/<ul[^>]*>/gi, '\\begin{itemize}\n')
    .replace(/<\/ul>/gi, '\\end{itemize}\n\n')
    .replace(/<ol[^>]*>/gi, '\\begin{enumerate}\n')
    .replace(/<\/ol>/gi, '\\end{enumerate}\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '  \\item $1\n')
    
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '\\href{$1}{$2}')
    
    // Paragraphs with alignment - handle these carefully
    .replace(/<p[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>(.*?)<\/p>/gi, '\\begin{center}\n$1\n\\end{center}\n\n')
    .replace(/<p[^>]*style="[^"]*text-align:\s*right[^"]*"[^>]*>(.*?)<\/p>/gi, '\\begin{flushright}\n$1\n\\end{flushright}\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\\\\\n')
    
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');

  // STEP 3: Restore preserved math expressions BEFORE character escaping
  latex = latex.replace(/__MATH_(\d+)__/g, (match, index) => {
    const mathExpr = preservedMath[parseInt(index)];
    return mathExpr || '';
  });

  // STEP 4: Escape special LaTeX characters (but avoid escaping our restored math)
  // We need to temporarily protect the math expressions again
  const finalMathExpressions = [];
  let finalMathIndex = 0;
  
  // Temporarily replace restored math with safe placeholders
  latex = latex.replace(/\\[()[\]]/g, (match) => {
    // This is a math delimiter, protect the whole expression
    return match;
  });
  
  // Protect complete math expressions (both inline \(...\) and display \[...\])
  latex = latex.replace(/\\(\([^)]*\)|\\[[^\\]]*\\])/g, (match) => {
    const placeholder = `TEMP_MATH_${finalMathIndex}`;
    finalMathExpressions[finalMathIndex] = match;
    finalMathIndex++;
    return placeholder;
  });
  
  // Now escape special characters in the remaining text
  latex = latex
    .replace(/&(?!#|\w+;)/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/_/g, '\\_');

  // Restore the protected math expressions (account for escaped underscores)
  latex = latex.replace(/TEMP[_\\]*MATH[_\\]*(\d+)/g, (match, index) => {
    return finalMathExpressions[parseInt(index)] || match;
  });
  
  return latex;
};

// Helper function to download files
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; 