import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import LaTeXBlockNodeView from './LaTeXBlockNodeView';

export default Node.create({
  name: 'latexBlock',

  group: 'block',

  inline: false,

  atom: true,

  addAttributes() {
    return {
      originalText: {
        default: '',
      },
      latexCode: {
        default: '',
      },
      isProcessing: {
        default: false,
      },
      isRendered: {
        default: false,
      },
      errorMessage: {
        default: '',
      },

    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="latex-block"]',
        getAttrs: (dom) => {
          return {
            originalText: dom.getAttribute('data-original') || '',
            latexCode: decodeURIComponent(dom.getAttribute('data-latex') || ''),
            isProcessing: dom.getAttribute('data-processing') === 'true',
            isRendered: dom.getAttribute('data-rendered') === 'true',
            errorMessage: dom.getAttribute('data-error') || '',

          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'latex-block',
        'data-original': node.attrs.originalText,
        'data-latex': encodeURIComponent(node.attrs.latexCode || ''),
        'data-processing': node.attrs.isProcessing,
        'data-rendered': node.attrs.isRendered,
        'data-error': node.attrs.errorMessage,

      }),
      node.attrs.latexCode || node.attrs.originalText,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LaTeXBlockNodeView);
  },

  addInputRules() {
    return [
      // Multi-line LaTeX block: /latex(\n  english content\n)/
      new InputRule({
        find: /\/latex\(\s*\n([\s\S]*?)\n\s*\)\/$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const originalText = match[1].trim();

          tr.replaceWith(start, end, this.type.create({
            originalText,
            latexCode: '',
            isProcessing: true,
            isRendered: false,
            errorMessage: '',
          }));

          return tr;
        },
      }),
      
      // Single line LaTeX block: /latex(english content)/
      new InputRule({
        find: /\/latex\(([^)]+)\)\/$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const originalText = match[1].trim();

          tr.replaceWith(start, end, this.type.create({
            originalText,
            latexCode: '',
            isProcessing: true,
            isRendered: false,
            errorMessage: '',
          }));

          return tr;
        },
      }),

      // LaTeX block with double dollar signs: $$english content$$
      new InputRule({
        find: /\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const originalText = match[1].trim();

          tr.replaceWith(start, end, this.type.create({
            originalText,
            latexCode: '',
            isProcessing: true,
            isRendered: false,
            errorMessage: '',
          }));

          return tr;
        },
      }),

      // Proof command: /proof
      new InputRule({
        find: /\/proof$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;

          // Delete the /proof text
          tr.delete(start, end);
          
          // Open proof modal
          setTimeout(() => {
            const event = new CustomEvent('openLatexBlockModal', {
              detail: { 
                editor: state.tr.doc.editor || this.editor,
                currentText: '',
                isProofMode: true
              }
            });
            window.dispatchEvent(event);
          }, 10);

          return tr;
        },
      }),
    ];
  },

  addCommands() {
    return {
      setLatexBlock: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
      insertLatexBlock: (originalText) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            originalText: originalText || '',
            latexCode: '',
            isProcessing: !!originalText,
            isRendered: false,
            errorMessage: '',
          },
        });
      },
      openLatexBlockModal: () => ({ editor }) => {
        // This will be handled by the modal component
        // The modal will call insertLatexBlock when ready
        const event = new CustomEvent('openLatexBlockModal', {
          detail: { editor }
        });
        window.dispatchEvent(event);
        return true;
      },
      openProofBlockModal: () => ({ editor }) => {
        // Open modal with proof-specific default content
        const proofTemplate = `Given: [state your given conditions]
To prove: [state what you want to prove]
Proof:
Step 1: [first logical step]
Step 2: [second logical step] 
Therefore: [conclusion]`;
        
        const event = new CustomEvent('openLatexBlockModal', {
          detail: { 
            editor,
            currentText: proofTemplate,
            isProofMode: true
          }
        });
        window.dispatchEvent(event);
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Keyboard shortcut - Ctrl+Shift+L to open LaTeX block modal
      'Mod-Shift-l': () => {
        this.editor.commands.openLatexBlockModal();
        return true;
      },
      // Keyboard shortcut - Ctrl+Shift+P to create proof block
      'Mod-Shift-p': () => {
        this.editor.commands.openProofBlockModal();
        return true;
      },
    };
  },
}); 