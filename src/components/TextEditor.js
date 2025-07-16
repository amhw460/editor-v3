import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import LaTeXExtension from '../extensions/LaTeXExtension';
import styled from 'styled-components';

const EditorContainer = styled.div`
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background-color: #f8f9fa;
  
  .ProseMirror {
    outline: none;
    max-width: 8.5in;
    margin: 0 auto;
    background: white;
    padding: 1in;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    min-height: 11in;
    font-size: 16px;
    line-height: 1.6;
    color: #1a1a1a;
    font-family: 'Computer Modern Serif', 'Latin Modern Roman', 'Times New Roman', 'Times', serif;
    
    h1 {
      font-size: 2em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      line-height: 1.2;
    }

    h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      line-height: 1.3;
    }

    h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin: 1em 0 0.5em 0;
      line-height: 1.4;
    }

    p {
      margin: 0.5em 0;
    }

    ul, ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }

    li {
      margin: 0.25em 0;
    }

    a {
      color: #4285f4;
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }

    strong {
      font-weight: 600;
    }

    em {
      font-style: italic;
    }

    u {
      text-decoration: underline;
    }

    s {
      text-decoration: line-through;
    }

    blockquote {
      border-left: 4px solid #e1e5e9;
      padding-left: 1em;
      margin: 1em 0;
      font-style: italic;
      color: #5f6368;
    }

    code {
      background-color: #f8f9fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }

    pre {
      background-color: #f8f9fa;
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
      background-color: #fff3cd;
      border: 1px dashed #ffc107;
      border-radius: 4px;
      padding: 4px 8px;
      margin: 0 2px;
      display: inline-block;
      font-family: monospace;
      font-size: 0.9em;
      color: #856404;
      cursor: text;
      position: relative;

      &:hover {
        background-color: #fff3cd;
        border-color: #ffb300;
      }

      &.processing {
        background-color: #e3f2fd;
        border-color: #2196f3;
        color: #1565c0;
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
        background-color: #f0f8ff;
        border-color: #4285f4;
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

    .latex-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      margin-bottom: 4px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;

      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: #333;
      }
    }

    .latex-rendered:hover .latex-tooltip {
      opacity: 1;
    }
  }
`;

function TextEditor({ document, onContentChange, onEditorReady }) {
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
      LaTeXExtension,
    ],
    content: document?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      handleContentChange(editor.getHTML());
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
      isInitializing.current = true;
      editor.commands.setContent(document.content);
      setTimeout(() => {
        isInitializing.current = false;
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
    <EditorContainer>
      <EditorContent editor={editor} />
    </EditorContainer>
  );
}

export default TextEditor; 