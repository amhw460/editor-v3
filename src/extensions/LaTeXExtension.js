import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import LaTeXNodeView from './LaTeXNodeView';

export default Node.create({
  name: 'latex',

  group: 'inline',

  inline: true,

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
      styleMode: {
        default: 'display', // 'display', 'text', 'script', 'scriptscript'
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="latex"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const getDelimiters = (styleMode) => {
      switch (styleMode) {
        case 'display': return ['/(', ')/'];
        case 'text': return ['/m(', ')/'];
        case 'script': return ['/s(', ')/'];
        case 'scriptscript': return ['/ss(', ')/'];
        default: return ['/(', ')/'];
      }
    };
    
    const delimiters = getDelimiters(node.attrs.styleMode);
    return [
      'span', 
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'latex',
        'data-latex': node.attrs.latexCode || '',
        'data-original': node.attrs.originalText || '',
        'data-processed': node.attrs.isRendered ? 'true' : 'false',
        'data-style-mode': node.attrs.styleMode
      }),
      node.attrs.isRendered && node.attrs.latexCode 
        ? `${delimiters[0]}${node.attrs.latexCode}${delimiters[1]}` 
        : `${delimiters[0]}${node.attrs.originalText}${delimiters[1]}`
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LaTeXNodeView);
  },

  addInputRules() {
    return [
      // Script script style rule (/ss(text)/) - Handle escaped parentheses
      new InputRule({
        find: /\/ss\(((?:[^)\\]|\\.)*)\)\/$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const originalText = match[1];

          tr.replaceWith(start, end, this.type.create({
            originalText,
            latexCode: '',
            isProcessing: true,
            isRendered: false,
            styleMode: 'scriptscript',
          }));

          return tr;
        },
      }),
      // Script style rule (/s(text)/) - Handle escaped parentheses
      new InputRule({
        find: /\/s\(((?:[^)\\]|\\.)*)\)\/$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const originalText = match[1];

          tr.replaceWith(start, end, this.type.create({
            originalText,
            latexCode: '',
            isProcessing: true,
            isRendered: false,
            styleMode: 'script',
          }));

          return tr;
        },
      }),
      // Text mode rule (/m(text)/) - Handle escaped parentheses
      new InputRule({
        find: /\/m\(((?:[^)\\]|\\.)*)\)\/$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const originalText = match[1];

          tr.replaceWith(start, end, this.type.create({
            originalText,
            latexCode: '',
            isProcessing: true,
            isRendered: false,
            styleMode: 'text',
          }));

          return tr;
        },
      }),
      // Display mode rule (/(text)/) - Handle escaped parentheses
      new InputRule({
        find: /\/\(((?:[^)\\]|\\.)*)\)\/$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const originalText = match[1];

          tr.replaceWith(start, end, this.type.create({
            originalText,
            latexCode: '',
            isProcessing: true,
            isRendered: false,
            styleMode: 'display',
          }));

          return tr;
        },
      }),
    ];
  },

  addCommands() {
    return {
      setLatex: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
      updateLatex: (pos, attributes) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setNodeMarkup(pos, null, attributes);
        }
        return true;
      },
      // Add command to manually insert LaTeX
      insertLatexExpression: (text, styleMode = 'display') => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            originalText: text,
            latexCode: '',
            isProcessing: true,
            isRendered: false,
            styleMode: styleMode,
          },
        });
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Test shortcut - Ctrl+Shift+L to insert a test LaTeX expression
      'Mod-Shift-l': () => {
        this.editor.commands.insertLatexExpression('square root of 2', 'text');
        return true;
      },
      // Handle Enter key to re-parse LaTeX patterns
      'Enter': () => {
        const { state, dispatch } = this.editor.view;
        const { selection } = state;
        const { $from } = selection;
        
        // Get the current line text
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
        
        // Check if we're at the end of any LaTeX pattern
        const patterns = [
          { regex: /\/ss\(((?:[^)\\]|\\.)*)\)\/\s*$/, mode: 'scriptscript' },
          { regex: /\/s\(((?:[^)\\]|\\.)*)\)\/\s*$/, mode: 'script' },
          { regex: /\/m\(((?:[^)\\]|\\.)*)\)\/\s*$/, mode: 'text' },
          { regex: /\/\(((?:[^)\\]|\\.)*)\)\/\s*$/, mode: 'display' }
        ];
        
        for (const pattern of patterns) {
          const match = textBefore.match(pattern.regex);
          if (match) {
            const originalText = match[1];
            const matchStart = $from.pos - match[0].length;
            const matchEnd = $from.pos;
            
            // Replace the matched text with a LaTeX node
            const tr = state.tr.replaceWith(
              matchStart, 
              matchEnd, 
              this.type.create({
                originalText,
                latexCode: '',
                isProcessing: true,
                isRendered: false,
                styleMode: pattern.mode,
              })
            );
            
            if (dispatch) {
              dispatch(tr);
            }
            return true;
          }
        }
        
        return false;
      },
    };
  },
}); 