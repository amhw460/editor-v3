import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CodeBlockNodeView from './CodeBlockNodeView';

export default Node.create({
  name: 'codeBlock',

  group: 'block',

  inline: false,

  atom: true,

  addAttributes() {
    return {
      language: {
        default: 'javascript',
      },
      code: {
        default: '',
      },
      originalText: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="code-block"]',
        getAttrs: (dom) => {
          return {
            language: dom.getAttribute('data-language') || 'javascript',
            code: dom.getAttribute('data-code') || '',
            originalText: dom.getAttribute('data-original') || '',
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'code-block',
        'data-language': node.attrs.language,
        'data-code': encodeURIComponent(node.attrs.code || ''),
        'data-original': node.attrs.originalText,
      }),
      node.attrs.code || node.attrs.originalText,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },

  addInputRules() {
    return [
      // Multi-line code block: /code-language(\n  code content\n)/
      new InputRule({
        find: /\/code-([a-zA-Z0-9+-]+)\(\s*\n([\s\S]*?)\n\s*\)\/$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const language = match[1] || 'javascript';
          const code = match[2];

          tr.replaceWith(start, end, this.type.create({
            language: language.toLowerCase(),
            code: code,
            originalText: code,
          }));

          return tr;
        },
      }),
      
      // Single line code block: /code-language(code)/
      new InputRule({
        find: /\/code-([a-zA-Z0-9+-]+)\(([^)]+)\)\/$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const language = match[1] || 'javascript';
          const code = match[2];

          tr.replaceWith(start, end, this.type.create({
            language: language.toLowerCase(),
            code: code,
            originalText: code,
          }));

          return tr;
        },
      }),
    ];
  },

  addCommands() {
    return {
      setCodeBlock: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
      insertCodeBlock: (code, language = 'javascript') => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            language: language.toLowerCase(),
            code: code,
            originalText: code,
          },
        });
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Test shortcut - Ctrl+Shift+C to insert a test code block
      'Mod-Shift-c': () => {
        this.editor.commands.insertCodeBlock('console.log("Hello World!");', 'javascript');
        return true;
      },
    };
  },
}); 