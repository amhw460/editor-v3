import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import ResizableImageExtension from '../extensions/ResizableImageExtension';
import LaTeXExtension from '../extensions/LaTeXExtension';
import LaTeXBlockExtension from '../extensions/LaTeXBlockExtension';
import TableExtension from '../extensions/TableExtension';
import CodeBlockExtension from '../extensions/CodeBlockExtension';
import FontFamilyExtension from '../extensions/FontFamilyExtension';
import LaTeXBlockModal from './LaTeXBlockModal';
import { useTheme } from '../contexts/ThemeContext';
import styled from 'styled-components';

const EditorContainer = styled.div`
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background-color: ${props => props.theme.editor};
  
  .ProseMirror {
    outline: none;
    max-width: 8.5in;
    margin: 0 auto;
    background: ${props => props.theme.paper};
    padding: 1in;
    box-shadow: 0 0 20px ${props => props.theme.shadow};
    border: 1px solid ${props => props.theme.border};
    min-height: 11in;
    font-size: 16px;
    line-height: 1.6;
    color: ${props => props.theme.text};
    font-family: 'Times New Roman', Times, serif;
    
    /* Force all text elements to inherit theme color */
    * {
      color: inherit;
    }
    
    /* Font family mark styling */
    span[style*="font-family"] {
      /* Let the font-family style through inline styles */
    }
    
    h1 {
      font-size: 2em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      line-height: 1.2;
      color: ${props => props.theme.text};
    }

    h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      line-height: 1.3;
      color: ${props => props.theme.text};
    }

    h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      line-height: 1.4;
      color: ${props => props.theme.text};
    }

    p {
      margin: 0.5em 0;
      color: ${props => props.theme.text};
    }

    ul, ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
      color: ${props => props.theme.text};
    }

    li {
      margin: 0.25em 0;
      color: ${props => props.theme.text};
    }

    a {
      color: ${props => props.theme.accent};
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }

    strong {
      font-weight: 600;
      color: ${props => props.theme.text};
    }

    em {
      font-style: italic;
      color: ${props => props.theme.text};
    }

    u {
      text-decoration: underline;
      color: ${props => props.theme.text};
    }

    s {
      text-decoration: line-through;
      color: ${props => props.theme.text};
    }

    blockquote {
      border-left: 4px solid ${props => props.theme.border};
      padding-left: 1em;
      margin: 1em 0;
      font-style: italic;
      color: ${props => props.theme.textSecondary};
    }

    code {
      background-color: ${props => props.theme.hover};
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }

    pre {
      background-color: ${props => props.theme.hover};
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1em 0;
      
      code {
        background: none;
        padding: 0;
      }
    }



    /* LaTeX styling */
    .latex-placeholder {
      background-color: ${props => props.theme.editor};
      border: 1px dashed ${props => props.theme.accent};
      border-radius: 4px;
      padding: 4px 8px;
      margin: 0 2px;
      display: inline-block;
      font-family: monospace;
      font-size: 0.9em;
      color: ${props => props.theme.textSecondary};
      cursor: text;
      position: relative;

      &:hover {
        background-color: ${props => props.theme.hover};
        border-color: ${props => props.theme.primary};
      }

      &.processing {
        background-color: ${props => props.theme.active};
        border-color: ${props => props.theme.primary};
        color: ${props => props.theme.text};
      }

      &.latex-display {
        display: block;
        text-align: center;
        margin: 1em auto;
        padding: 8px 12px;
        max-width: 80%;
      }

      &.latex-text {
        font-size: 0.9em;
      }

      &.latex-script {
        font-size: 0.8em;
      }

      &.latex-scriptscript {
        font-size: 0.7em;
      }
    }

    /* Force KaTeX to inherit theme colors */
    .katex {
      color: ${props => props.theme.text} !important;
    }
    
    .katex * {
      color: ${props => props.theme.text} !important;
    }
    
    .katex .mathdefault,
    .katex .mathit,
    .katex .mathrm,
    .katex .mathbf,
    .katex .mathsf,
    .katex .mathtt {
      color: ${props => props.theme.text} !important;
    }
    
    .katex-html {
      color: ${props => props.theme.text} !important;
    }
    
    .katex-display {
      color: ${props => props.theme.text} !important;
    }
    
    .katex-display * {
      color: ${props => props.theme.text} !important;
    }

    .latex-rendered {
      display: inline-block;
      margin: 0 2px;
      padding: 2px 4px;
      border-radius: 4px;
      background-color: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      position: relative;

      &:hover {
        background-color: ${props => props.theme.hover};
        border-color: ${props => props.theme.primary};
      }

      &.latex-display {
        display: block;
        text-align: center;
        margin: 1em auto;
        padding: 8px 12px;
        max-width: 80%;
        
        .katex {
          font-size: 1.2em;
        }
      }

      &.latex-text {
        .katex {
          font-size: 0.9em;
        }
      }

      &.latex-script {
        .katex {
          font-size: 0.8em;
        }
      }

      &.latex-scriptscript {
        .katex {
          font-size: 0.7em;
        }
      }
    }

    /* LaTeX Block styling - fix scrollbars and text wrapping */
    .latex-block-rendered {
      .katex-display {
        overflow-x: hidden !important;
        overflow-y: visible !important;
        margin: 0.5em 0;
        max-width: 100% !important;
        
        .katex {
          max-width: 100% !important;
          overflow-x: hidden !important;
          white-space: normal !important;
        }
      }
      
      .katex {
        max-width: 100% !important;
        overflow-x: hidden !important;
        word-break: break-word;
      }
      
      .katex .base {
        max-width: 100%;
        overflow-x: hidden;
      }
      
      .katex .mord, .katex .mrel, .katex .mbin, .katex .mop, .katex .mopen, .katex .mclose {
        word-break: break-word;
      }
      
      /* Hide equation numbers */
      .katex .eqn-num, .katex .tag {
        display: none !important;
      }
    }

    .latex-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: ${props => props.theme.background};
      color: ${props => props.theme.text};
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      margin-bottom: 4px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      border: 1px solid ${props => props.theme.border};

      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: ${props => props.theme.background};
      }
    }

    .latex-rendered:hover .latex-tooltip {
      opacity: 1;
    }

    /* Table styling */
    .table-container {
      margin: 1em 0;
      border: 2px solid transparent;
      border-radius: 8px;
      transition: border-color 0.2s;
      
      &.selected {
        border-color: ${props => props.theme.primary};
        box-shadow: 0 0 0 2px ${props => props.theme.activeBorder};
      }
    }
    
    .editable-table {
      width: auto;
      max-width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      background: ${props => props.theme.paper};
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px ${props => props.theme.shadow};
      margin: 0 auto;
      
      th, td {
        border: 1px solid ${props => props.theme.border};
        padding: 8px 12px;
        text-align: left;
        min-width: 60px;
        max-width: 120px;
        min-height: 36px;
        position: relative;
        cursor: text;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        
        &:hover {
          background-color: ${props => props.theme.hover};
        }
        
        &.focused {
          border-color: ${props => props.theme.primary};
          box-shadow: inset 0 0 0 1px ${props => props.theme.primary};
        }
      }
      
      th {
        background-color: ${props => props.theme.sidebar};
        font-weight: 600;
        color: ${props => props.theme.text};
        border-bottom: 2px solid ${props => props.theme.border};
      }
      
      td {
        background-color: ${props => props.theme.paper};
      }
      
      input {
        width: 100%;
        border: none;
        background: transparent;
        outline: none;
        font-size: inherit;
        font-family: inherit;
        padding: 0;
        color: inherit;
        
        &::placeholder {
          color: ${props => props.theme.textMuted};
          opacity: 0.7;
        }
      }
    }
    
    .table-processing {
      padding: 20px;
      text-align: center;
      background-color: ${props => props.theme.sidebar};
      border: 1px dashed ${props => props.theme.primary};
      border-radius: 4px;
      color: ${props => props.theme.text};
      font-size: 14px;
      margin: 1em 0;
    }

    /* Code block styling */
    .code-block-wrapper {
      margin: 1em 0;
      
      &.editing {
        .code-block-container {
          border-color: ${props => props.theme.primary};
          box-shadow: 0 0 0 2px ${props => props.theme.activeBorder};
        }
      }
    }
    
    .code-block-container {
      background: ${props => props.theme.paper};
      border: 1px solid ${props => props.theme.border};
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.2s;
      cursor: pointer;
      
      &:hover {
        border-color: ${props => props.theme.primary};
        box-shadow: 0 2px 8px ${props => props.theme.shadow};
      }
    }
    
    .code-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: ${props => props.theme.sidebar};
      border-bottom: 1px solid ${props => props.theme.border};
      font-size: 12px;
    }
    
    .language-label {
      font-weight: 600;
      color: ${props => props.theme.accent};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
    }
    
    .edit-hint {
      color: ${props => props.theme.textMuted};
      font-style: italic;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .code-block-container:hover .edit-hint {
      opacity: 1;
    }
    
    .edit-controls {
      display: flex;
      gap: 8px;
    }
    
    .save-btn, .cancel-btn {
      padding: 4px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .save-btn {
      background: ${props => props.theme.primary};
      color: ${props => props.theme.paper};
      
      &:hover {
        background: ${props => props.theme.active};
      }
    }
    
    .cancel-btn {
      background: ${props => props.theme.hover};
      color: ${props => props.theme.textMuted};
      border: 1px solid ${props => props.theme.border};
      
      &:hover {
        background: ${props => props.theme.active};
      }
    }
    
    .code-block {
      margin: 0;
      padding: 16px;
      background: transparent;
      font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      overflow-x: auto;
      white-space: pre;
      
      code {
        background: none !important;
        padding: 0 !important;
        border-radius: 0 !important;
        font-size: inherit !important;
        font-family: inherit !important;
      }
    }
    
    .code-textarea {
      width: 100%;
      min-height: 120px;
      padding: 16px;
      border: none;
      background: transparent;
      font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      color: inherit;
      resize: vertical;
      outline: none;
      
      &::placeholder {
        color: ${props => props.theme.textMuted};
      }
    }

    /* Prism.js theme customizations - ensure they override any conflicting styles */
    .code-block code .token.comment,
    .code-block code .token.prolog,
    .code-block code .token.doctype,
    .code-block code .token.cdata {
      color: #708090 !important;
      font-style: italic;
    }

    .code-block code .token.punctuation {
      color: #999 !important;
    }

    .code-block code .token.property,
    .code-block code .token.tag,
    .code-block code .token.constant,
    .code-block code .token.symbol,
    .code-block code .token.deleted {
      color: #905 !important;
    }

    .code-block code .token.boolean,
    .code-block code .token.number {
      color: #009f00 !important;
    }

    .code-block code .token.selector,
    .code-block code .token.attr-name,
    .code-block code .token.string,
    .code-block code .token.char,
    .code-block code .token.builtin,
    .code-block code .token.inserted {
      color: #690 !important;
    }

    .code-block code .token.operator,
    .code-block code .token.entity,
    .code-block code .token.url,
    .language-css .token.string,
    .style .token.string,
    .code-block code .token.variable {
      color: #9a6e3a !important;
    }

    .code-block code .token.atrule,
    .code-block code .token.attr-value,
    .code-block code .token.function,
    .code-block code .token.class-name {
      color: #dd4a68 !important;
    }

    .code-block code .token.keyword {
      color: #07a !important;
      font-weight: bold;
    }

    .code-block code .token.regex,
    .code-block code .token.important {
      color: #e90 !important;
    }


  }
`;

function TextEditor({ document, onContentChange, onEditorReady }) {
  const { theme } = useTheme();
  const isInitializing = useRef(true);

  // Memoize the content change handler
  const handleContentChange = useCallback((content) => {
    if (!isInitializing.current) {
      onContentChange(content);
    }
  }, [onContentChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      ResizableImageExtension,
      LaTeXExtension,
      LaTeXBlockExtension,
      TableExtension,
      CodeBlockExtension,
      FontFamilyExtension,
    ],
    content: document?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      console.log('TextEditor: Content updated, HTML:', html);
      console.log('TextEditor: Content updated, JSON:', json);
      
      // Check if HTML contains table data attributes
      if (html.includes('data-table-data')) {
        console.log('TextEditor: HTML contains table data attributes');
        const tableDataMatch = html.match(/data-table-data="([^"]+)"/);
        if (tableDataMatch) {
          console.log('TextEditor: Found table data in HTML:', tableDataMatch[1]);
        }
      }
      
      // Use HTML for persistence - table data is preserved in data attributes
      handleContentChange(html);
    },
    onCreate: ({ editor }) => {
      onEditorReady(editor);
      // Small delay to ensure editor is fully initialized
      setTimeout(() => {
        isInitializing.current = false;
      }, 100);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // Update editor content when document changes
  useEffect(() => {
    if (editor && document && editor.getHTML() !== document.content) {
      console.log('TextEditor: Loading document content:', document.content);
      isInitializing.current = true;
      editor.commands.setContent(document.content);
      setTimeout(() => {
        isInitializing.current = false;
        console.log('TextEditor: Editor content after loading:', editor.getHTML());
        console.log('TextEditor: Editor JSON after loading:', editor.getJSON());
      }, 100);
    }
  }, [document?.id, document?.content, editor, document]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <EditorContainer theme={theme}>
      <EditorContent editor={editor} />
      <LaTeXBlockModal />
    </EditorContainer>
  );
}

export default TextEditor; 