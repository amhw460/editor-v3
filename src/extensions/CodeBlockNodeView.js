import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import Prism from 'prismjs';

// Import language components for syntax highlighting (only common, stable ones)
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

const CodeBlockNodeView = ({ node, updateAttributes, getPos, editor }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localCode, setLocalCode] = useState(node.attrs.code || '');
  const codeRef = useRef(null);
  const textareaRef = useRef(null);

  const { language, code } = node.attrs;

  // Language mapping for Prism.js
  const languageMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'html': 'markup',
    'css': 'css',
    'json': 'json',
    'sql': 'sql',
    'bash': 'bash',
    'sh': 'bash',
    'shell': 'bash',
    'c': 'c',
    'cpp': 'cpp',
    'c++': 'cpp',
    'csharp': 'csharp',
    'cs': 'csharp',
    'java': 'java',
    'md': 'markdown',
    'markdown': 'markdown',
  };

  // Get Prism language key
  const getPrismLanguage = (lang) => {
    return languageMap[lang] || lang || 'javascript';
  };

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current && code && !isEditing) {
      const applyHighlighting = () => {
        const prismLanguage = getPrismLanguage(language);
        
        console.log('Applying syntax highlighting:', { language, prismLanguage, code: code.substring(0, 50) + '...' });
        console.log('Prism.languages available:', Object.keys(Prism.languages));
        
        // Check if language is supported by Prism
        if (Prism.languages[prismLanguage]) {
          const html = Prism.highlight(code, Prism.languages[prismLanguage], prismLanguage);
          console.log('Highlighted HTML:', html.substring(0, 100) + '...');
          codeRef.current.innerHTML = html;
          
          // Add the Prism language class to the code element
          codeRef.current.className = `language-${prismLanguage}`;
        } else {
          console.log('Language not supported by Prism:', prismLanguage);
          // Fallback to plain text
          codeRef.current.textContent = code;
          codeRef.current.className = 'language-text';
        }
      };

      // Apply highlighting immediately and also with a small delay to ensure DOM is ready
      applyHighlighting();
      setTimeout(applyHighlighting, 10);
    }
  }, [code, language, isEditing]);

  // Handle edit mode
  const startEditing = useCallback(() => {
    setIsEditing(true);
    setLocalCode(code);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, 10);
  }, [code]);

  // Handle save
  const saveEdit = useCallback(() => {
    updateAttributes({
      code: localCode,
      originalText: localCode,
    });
    setIsEditing(false);
  }, [localCode, updateAttributes]);

  // Handle cancel
  const cancelEdit = useCallback(() => {
    setLocalCode(code);
    setIsEditing(false);
  }, [code]);

  // Handle key down in textarea
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = localCode.substring(0, start) + '  ' + localCode.substring(end);
      setLocalCode(newValue);
      
      // Set cursor position after the inserted tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, [localCode, cancelEdit, saveEdit]);

  // Get language display name
  const getLanguageDisplayName = (lang) => {
    const displayNames = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'csharp': 'C#',
      'markup': 'HTML',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'sql': 'SQL',
      'bash': 'Bash',
      'markdown': 'Markdown',
    };
    return displayNames[lang] || lang.toUpperCase();
  };

  if (isEditing) {
    return (
      <NodeViewWrapper className="code-block-wrapper editing">
        <div className="code-block-container">
          <div className="code-block-header">
            <span className="language-label">{getLanguageDisplayName(language)}</span>
            <div className="edit-controls">
              <button 
                className="save-btn"
                onClick={saveEdit}
                title="Save (Ctrl+Enter)"
              >
                Save
              </button>
              <button 
                className="cancel-btn"
                onClick={cancelEdit}
                title="Cancel (Esc)"
              >
                Cancel
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="code-textarea"
            spellCheck={false}
            placeholder="Enter your code here..."
          />
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div 
        className="code-block-container"
        onClick={startEditing}
        title="Click to edit code"
      >
        <div className="code-block-header">
          <span className="language-label">{getLanguageDisplayName(language)}</span>
          <span className="edit-hint">Click to edit</span>
        </div>
        <pre className="code-block">
          <code ref={codeRef} className={`language-${getPrismLanguage(language)}`}>
            {code || 'No code provided'}
          </code>
        </pre>
      </div>
    </NodeViewWrapper>
  );
};

export default CodeBlockNodeView; 