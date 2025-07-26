import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToLatex = (editor, documentTitle = 'Document') => {
  if (!editor) return;

  const json = editor.getJSON();
  let latex = convertJsonToLatex(json);
  
  // Create LaTeX document structure
  const latexDocument = `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{geometry}
\\usepackage{hyperref}
\\usepackage[normalem]{ulem}
\\usepackage{listings}
\\usepackage{color}
\\usepackage{xcolor}

\\geometry{margin=1in}

% Define colors for syntax highlighting
\\definecolor{dkgreen}{rgb}{0,0.6,0}
\\definecolor{gray}{rgb}{0.5,0.5,0.5}
\\definecolor{mauve}{rgb}{0.58,0,0.82}
\\definecolor{lightgray}{rgb}{0.97,0.97,0.97}

% Configure listings package
\\lstset{
  frame=single,
  backgroundcolor=\\color{lightgray},
  aboveskip=3mm,
  belowskip=3mm,
  showstringspaces=false,
  columns=flexible,
  basicstyle={\\small\\ttfamily},
  numbers=none,
  numberstyle=\\tiny\\color{gray},
  keywordstyle=\\color{blue},
  commentstyle=\\color{dkgreen},
  stringstyle=\\color{mauve},
  breaklines=true,
  breakatwhitespace=true,
  tabsize=2,
  rulecolor=\\color{gray},
  framexleftmargin=5pt,
  framexrightmargin=5pt,
  framexbottommargin=3pt,
  framextopmargin=3pt
}

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
    
    // Process custom table nodes for PDF export
    htmlContent = htmlContent.replace(/<div[^>]*data-type="custom-table"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
      // Extract table data from the React component if available
      const tableDataMatch = match.match(/data-prompt="([^"]*)"/);
      if (tableDataMatch) {
        // This is a fallback - we'll try to get the table data from the JSON
        const json = editor.getJSON();
        const tableNode = findTableNodeByPrompt(json, tableDataMatch[1]);
        if (tableNode && tableNode.attrs && tableNode.attrs.tableData) {
          return convertTableDataToHtml(tableNode.attrs.tableData);
        }
      }
      return match;
    });
    
    // Extract code blocks from data attributes for PDF
    htmlContent = htmlContent.replace(/<div[^>]*data-type="code-block"[^>]*data-language="([^"]*)"[^>]*data-code="([^"]*)"[^>]*>.*?<\/div>/gi, (match, language, code) => {
      try {
        const decodedCode = decodeURIComponent(code || '');
        const displayLanguage = language.charAt(0).toUpperCase() + language.slice(1);
        return `<div style="margin: 1.5em 0; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <div style="padding: 8px 16px; background: #ffffff; border-bottom: 1px solid #d1d5db; font-size: 11px; font-weight: 600; color: #4285f4; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">${displayLanguage}</div>
          <pre style="margin: 0; padding: 16px; background: transparent; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 12px; line-height: 1.4; overflow-x: auto; white-space: pre; color: #374151;"><code>${decodedCode}</code></pre>
        </div>`;
      } catch (e) {
        console.error('Code block rendering error for PDF:', e);
        return `<pre style="background: #f8f9fa; padding: 16px; border-radius: 4px; margin: 1em 0; font-family: monospace; border: 1px solid #d1d5db;">${decodeURIComponent(code || '')}</pre>`;
      }
    });

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

    // Extract LaTeX blocks from data attributes for PDF
    htmlContent = htmlContent.replace(/<div[^>]*data-type="latex-block"[^>]*data-latex="([^"]*)"[^>]*>.*?<\/div>/gi, (match, latexCode) => {
      try {
        const decodedLatex = decodeURIComponent(latexCode || '');
        if (window.katex && decodedLatex) {
          // For LaTeX blocks, always use display mode
          let renderLatex = decodedLatex;
          
          // Check if it's multi-line LaTeX that needs align environment
          if (renderLatex.includes('\\\\') && !renderLatex.includes('\\begin{')) {
            renderLatex = `\\begin{align*}${renderLatex}\\end{align*}`;
          }
          
          const rendered = window.katex.renderToString(renderLatex, {
            throwOnError: false,
            displayMode: true,
            output: 'html'
          });
          
          // Parse dash-separated content for supporting text
          const originalText = match.match(/data-original="([^"]*)"/) ? decodeURIComponent(match.match(/data-original="([^"]*)"/)[1]) : '';
          
          // Handle multi-line input by processing each line
          const lines = originalText.split('\n');
          const annotations = [];
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            const dashIndex = trimmedLine.indexOf(' - ');
            if (dashIndex !== -1) {
              const annotation = trimmedLine.substring(dashIndex + 3).trim();
              if (annotation) {
                annotations.push(annotation);
              }
            }
          }
          
          const supportingText = annotations.join('\n');
          
          return `<div style="display: flex; align-items: center; margin: 1.5em 0; padding: 20px 24px; ${supportingText ? 'min-height: 60px;' : ''}">
            <div style="flex: 1; background: transparent; text-align: center; overflow-x: hidden; ${supportingText ? 'padding-right: 20px;' : ''}">
              <div style="line-height: 1.6; overflow-x: hidden; word-wrap: break-word; max-width: 100%;">${rendered}</div>
            </div>
            ${supportingText ? `<div style="width: 200px; font-size: 16px; line-height: 1.5; flex-shrink: 0;">${supportingText}</div>` : ''}
          </div>`;
        }
      } catch (e) {
        console.error('LaTeX block rendering error for PDF:', e);
      }
      
      // Fallback: render as plain LaTeX block
      const originalText = match.match(/data-original="([^"]*)"/) ? decodeURIComponent(match.match(/data-original="([^"]*)"/)[1]) : 'LaTeX Block';
      return `<div style="margin: 1.5em 0; padding: 20px 24px; background: transparent; color: #475569; font-family: serif;">
        <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">LaTeX Block</div>
        <div style="font-style: italic; font-size: 13px;">${originalText}</div>
      </div>`;
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

// Convert HTML table to LaTeX format
const convertHtmlTableToLatex = (tableHtml) => {
  // Extract rows from the table HTML
  const rows = [];
  const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  
  if (!rowMatches) return '';
  
  let isFirstRow = true;
  
  rowMatches.forEach(rowMatch => {
    const cellMatches = rowMatch.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
    if (cellMatches) {
      const cells = cellMatches.map(cellMatch => {
        // Extract cell content, removing any HTML tags
        const content = cellMatch.replace(/<[^>]*>/g, '').trim();
        return content.replace(/[\\{}]/g, '\\$&'); // Escape LaTeX special characters
      });
      
      rows.push({
        cells,
        isHeader: isFirstRow
      });
      
      isFirstRow = false;
    }
  });
  
  if (rows.length === 0) return '';
  
  // Determine column count and alignment
  const colCount = rows[0].cells.length;
  const alignment = Array(colCount).fill('l').join('|');
  
  // Build LaTeX table
  let latex = '\\begin{table}[h]\n\\centering\n';
  latex += `\\begin{tabular}{|${alignment}|}\n`;
  latex += '\\hline\n';
  
  rows.forEach((row, index) => {
    const cells = row.cells.join(' & ');
    latex += `${cells} \\\\\n`;
    
    if (index === 0 && row.isHeader) {
      latex += '\\hline\n';
    }
  });
  
  latex += '\\hline\n';
  latex += '\\end{tabular}\n';
  latex += '\\end{table}';
  
  return latex;
};

// Convert JSON to LaTeX format
const convertJsonToLatex = (json) => {
  let latex = '';
  
  if (json.content) {
    latex = processJsonContent(json.content);
  }
  
  return latex;
};

// Process JSON content array
const processJsonContent = (content) => {
  let latex = '';
  
  content.forEach(node => {
    latex += convertNodeToLatex(node);
  });
  
  return latex;
};

// Convert a single node to LaTeX
const convertNodeToLatex = (node) => {
  switch (node.type) {
    case 'paragraph':
      return convertParagraphToLatex(node);
    case 'heading':
      return convertHeadingToLatex(node);
    case 'bulletList':
      return convertBulletListToLatex(node);
    case 'orderedList':
      return convertOrderedListToLatex(node);
    case 'listItem':
      return convertListItemToLatex(node);
    case 'customTable':
      return convertCustomTableToLatex(node);
    case 'latex':
      return convertLatexNodeToLatex(node);
    case 'codeBlock':
      return convertCodeBlockToLatex(node);
    case 'latexBlock':
      return convertLatexBlockToLatex(node);
    case 'resizableImage':
    case 'image':
      return convertImageToLatex(node);
    default:
      // For unknown node types, try to process their content
      if (node.content) {
        return processJsonContent(node.content);
      }
      return '';
  }
};

// Convert custom table node to LaTeX
const convertCustomTableToLatex = (node) => {
  const tableData = node.attrs?.tableData || [];
  
  if (!tableData || tableData.length === 0) {
    return '';
  }
  
  // Determine column count and alignment
  const colCount = tableData[0]?.cells?.length || 0;
  if (colCount === 0) return '';
  
  const alignment = Array(colCount).fill('l').join('|');
  
  // Build LaTeX table
  let latex = '\\begin{table}[h]\n\\centering\n';
  latex += `\\begin{tabular}{|${alignment}|}\n`;
  latex += '\\hline\n';
  
  tableData.forEach((row, index) => {
    const cells = row.cells.map(cell => {
      const content = cell.content || '';
      return content.replace(/[\\{}]/g, '\\$&'); // Escape LaTeX special characters
    });
    
    latex += `${cells.join(' & ')} \\\\\n`;
    
    if (index === 0 && row.cells[0]?.isHeader) {
      latex += '\\hline\n';
    }
  });
  
  latex += '\\hline\n';
  latex += '\\end{tabular}\n';
  latex += '\\end{table}\n\n';
  
  return latex;
};

// Convert paragraph to LaTeX
const convertParagraphToLatex = (node) => {
  if (!node.content) return '\n';
  
  let content = '';
  node.content.forEach(child => {
    content += convertInlineToLatex(child);
  });
  
  return content ? `${content}\n\n` : '\n';
};

// Convert heading to LaTeX
const convertHeadingToLatex = (node) => {
  const level = node.attrs?.level || 1;
  const commands = {
    1: '\\section',
    2: '\\subsection',
    3: '\\subsubsection'
  };
  
  const command = commands[level] || '\\paragraph';
  
  if (!node.content) return '';
  
  let content = '';
  node.content.forEach(child => {
    content += convertInlineToLatex(child);
  });
  
  return `${command}{${content}}\n\n`;
};

// Convert bullet list to LaTeX
const convertBulletListToLatex = (node) => {
  if (!node.content) return '';
  
  let latex = '\\begin{itemize}\n';
  node.content.forEach(child => {
    latex += convertNodeToLatex(child);
  });
  latex += '\\end{itemize}\n\n';
  
  return latex;
};

// Convert ordered list to LaTeX
const convertOrderedListToLatex = (node) => {
  if (!node.content) return '';
  
  let latex = '\\begin{enumerate}\n';
  node.content.forEach(child => {
    latex += convertNodeToLatex(child);
  });
  latex += '\\end{enumerate}\n\n';
  
  return latex;
};

// Convert list item to LaTeX
const convertListItemToLatex = (node) => {
  if (!node.content) return '';
  
  let content = '';
  node.content.forEach(child => {
    content += convertNodeToLatex(child);
  });
  
  return `  \\item ${content.trim()}\n`;
};

// Convert LaTeX node to LaTeX
const convertLatexNodeToLatex = (node) => {
  const latexCode = node.attrs?.latexCode || '';
  const styleMode = node.attrs?.styleMode || 'display';
  
  if (!latexCode) return '';
  
  let formattedLatex = latexCode;
  
  // Apply style commands based on mode
  if (styleMode === 'script') {
    formattedLatex = `\\scriptstyle{${latexCode}}`;
  } else if (styleMode === 'scriptscript') {
    formattedLatex = `\\scriptscriptstyle{${latexCode}}`;
  }
  
  // Use display mode for 'display' style, inline for others
  const isDisplayMode = styleMode === 'display';
  return isDisplayMode ? `\\[${formattedLatex}\\]` : `\\(${formattedLatex}\\)`;
};

// Convert code block node to LaTeX
const convertCodeBlockToLatex = (node) => {
  const code = node.attrs?.code || '';
  const language = node.attrs?.language || 'text';
  
  if (!code) return '';
  
  // Map our language names to LaTeX listings language names
  const languageMap = {
    'javascript': 'Java', // Close enough for basic highlighting
    'java': 'Java',
    'python': 'Python',
    'c': 'C',
    'cpp': 'C++',
    'csharp': '[Sharp]C',
    'html': 'HTML',
    'css': 'CSS',
    'sql': 'SQL',
    'bash': 'bash',
    'json': 'JavaScript', // Use JavaScript for JSON
    'typescript': 'Java', // Use Java for TypeScript (similar syntax)
    'markdown': 'TeX', // Use TeX for Markdown
    'markup': 'HTML'
  };
  
  const latexLanguage = languageMap[language.toLowerCase()] || '';
  
  // Set language and create listing
  let latexCode = '';
  if (latexLanguage) {
    latexCode += `\\lstset{language=${latexLanguage}}\n`;
  }
  
  latexCode += `\\begin{lstlisting}
${code}
\\end{lstlisting}

`;
  
  return latexCode;
};

// Convert LaTeX block node to LaTeX
const convertLatexBlockToLatex = (node) => {
  const latexCode = node.attrs?.latexCode || '';
  const originalText = node.attrs?.originalText || '';
  
  if (!latexCode && !originalText) return '';
  
  // Parse dash-separated content for supporting text
  const lines = originalText.split('\n');
  const annotations = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    const dashIndex = trimmedLine.indexOf(' - ');
    if (dashIndex !== -1) {
      const annotation = trimmedLine.substring(dashIndex + 3).trim();
      if (annotation) {
        annotations.push(annotation);
      }
    }
  }
  
  const supportingText = annotations.join(' • ');
  
  let latexOutput = '';
  
  // Use the processed LaTeX if available
  if (latexCode) {
    // For multi-line LaTeX, check if we need to wrap in align environment
    if (latexCode.includes('\\\\') && !latexCode.includes('\\begin{')) {
      latexOutput = `\\begin{align*}
${latexCode}
\\end{align*}`;
    } else {
      // Single expression or already wrapped
      latexOutput = `\\[${latexCode}\\]`;
    }
  } else {
    // Fallback: create a text block for unprocessed content
    // Extract only the mathematical parts, removing annotations
    const mathOnlyLines = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      const dashIndex = trimmedLine.indexOf(' - ');
      if (dashIndex !== -1) {
        const mathPart = trimmedLine.substring(0, dashIndex).trim();
        if (mathPart) {
          mathOnlyLines.push(mathPart);
        }
      } else if (trimmedLine) {
        mathOnlyLines.push(trimmedLine);
      }
    }
    const textToUse = mathOnlyLines.join(' ');
    latexOutput = `\\text{${textToUse.replace(/[\\{}]/g, '\\$&')}}`;
  }
  
  // Add supporting text as a margin note if present
  if (supportingText) {
    latexOutput += `\\marginpar{\\tiny ${supportingText.replace(/[\\{}]/g, '\\$&')}}`;
  }
  
  return latexOutput + '\n\n';
};

// Convert image node to LaTeX
const convertImageToLatex = (node) => {
  const { src, alt, width, height } = node.attrs || {};
  
  if (!src) return '';
  
  let latex = '\\begin{figure}[h]\n\\centering\n';
  
  // Handle base64 images by mentioning they need to be saved separately
  if (src.startsWith('data:')) {
    latex += `% Base64 image needs to be saved as a separate file\n`;
    latex += `% \\includegraphics`;
  } else {
    latex += `\\includegraphics`;
  }
  
  // Add width/height options if specified
  const options = [];
  if (width) {
    options.push(`width=${width}px`);
  }
  if (height) {
    options.push(`height=${height}px`);
  }
  
  if (options.length > 0) {
    latex += `[${options.join(',')}]`;
  }
  
  // Use alt text as filename or placeholder
  const filename = alt || 'image';
  latex += `{${filename}}\n`;
  
  // Add caption if alt text is provided
  if (alt) {
    latex += `\\caption{${alt.replace(/[\\{}]/g, '\\$&')}}\n`;
  }
  
  latex += '\\end{figure}\n\n';
  
  return latex;
};

// Convert inline content to LaTeX
const convertInlineToLatex = (node) => {
  if (node.type === 'text') {
    let text = node.text || '';
    
    // Apply marks
    if (node.marks) {
      node.marks.forEach(mark => {
        switch (mark.type) {
          case 'bold':
            text = `\\textbf{${text}}`;
            break;
          case 'italic':
            text = `\\textit{${text}}`;
            break;
          case 'underline':
            text = `\\underline{${text}}`;
            break;
          case 'strike':
            text = `\\sout{${text}}`;
            break;
          case 'link':
            const href = mark.attrs?.href || '';
            text = `\\href{${href}}{${text}}`;
            break;
          default:
            break;
        }
      });
    }
    
    // Escape LaTeX special characters
    text = text.replace(/[&%$#^~_{}]/g, '\\$&');
    
    return text;
  } else if (node.type === 'latex') {
    return convertLatexNodeToLatex(node);
  }
  
  return '';
};

// Convert HTML to LaTeX format (keeping for backward compatibility)
// eslint-disable-next-line no-unused-vars
const convertHtmlToLatex = (html) => {
  let latex = html;

  // STEP 1: Extract and preserve LaTeX expressions and tables
  const preservedMath = [];
  const preservedTables = [];
  let preserveIndex = 0;
  let tableIndex = 0;
  
  // Extract and convert custom tables to LaTeX
  latex = latex.replace(/<div[^>]*data-type="custom-table"[^>]*data-prompt="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi, (match, prompt) => {
    const placeholder = `__TABLE_${tableIndex}__`;
    
    // Try to extract table data from the HTML structure
    const tableMatch = match.match(/<table[^>]*>([\s\S]*?)<\/table>/);
    if (tableMatch) {
      const tableHtml = tableMatch[1];
      const latexTable = convertHtmlTableToLatex(tableHtml);
      preservedTables[tableIndex] = latexTable;
    } else {
      // Fallback: simple table structure
      preservedTables[tableIndex] = '\\begin{table}[h]\n\\centering\n\\begin{tabular}{|l|l|l|}\n\\hline\n & & \\\\\n\\hline\n & & \\\\\n\\hline\n\\end{tabular}\n\\end{table}';
    }
    
    tableIndex++;
    return placeholder;
  });
  
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

  // STEP 3: Restore preserved math expressions and tables BEFORE character escaping
  latex = latex.replace(/__MATH_(\d+)__/g, (match, index) => {
    const mathExpr = preservedMath[parseInt(index)];
    return mathExpr || '';
  });

  // Restore preserved tables
  latex = latex.replace(/__TABLE_(\d+)__/g, (match, index) => {
    const tableExpr = preservedTables[parseInt(index)];
    return tableExpr || '';
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

// Helper function to find table node by prompt in JSON
const findTableNodeByPrompt = (json, prompt) => {
  if (!json || !json.content) return null;
  
  for (const node of json.content) {
    if (node.type === 'customTable' && node.attrs && node.attrs.originalPrompt === prompt) {
      return node;
    }
    // Recursively search in nested content
    if (node.content) {
      const found = findTableNodeByPrompt(node, prompt);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to convert table data to HTML
const convertTableDataToHtml = (tableData) => {
  if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
    return '';
  }
  
  let html = '<table style="border-collapse: collapse; width: auto; max-width: 100%; margin: 1em auto; border: 1px solid #ddd;">';
  
  tableData.forEach((row, rowIndex) => {
    html += '<tr>';
    row.cells.forEach((cell, cellIndex) => {
      const tag = cell.isHeader ? 'th' : 'td';
      const headerStyle = cell.isHeader ? 
        'background-color: #f8f9fa; font-weight: 600; border: 1px solid #ddd; padding: 8px 12px; min-width: 60px; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' : 
        'border: 1px solid #ddd; padding: 8px 12px; min-width: 60px; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
      
      html += `<${tag} style="${headerStyle}">${cell.content || ''}</${tag}>`;
    });
    html += '</tr>';
  });
  
  html += '</table>';
  return html;
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