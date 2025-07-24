import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import TableNodeView from './TableNodeView';

export default Node.create({
  name: 'customTable',

  group: 'block',

  inline: false,

  atom: true,

  addAttributes() {
    return {
      originalPrompt: {
        default: '',
      },
      tableData: {
        default: [],
        parseHTML: (element) => {
          const tableDataStr = element.getAttribute('data-table-data');
          if (tableDataStr) {
            try {
              return JSON.parse(tableDataStr);
            } catch (e) {
              console.error('Failed to parse tableData from HTML:', e);
              return [];
            }
          }
          return [];
        },
        renderHTML: (attributes) => {
          if (Array.isArray(attributes.tableData)) {
            return {
              'data-table-data': JSON.stringify(attributes.tableData),
            };
          }
          return {};
        },
      },
      isProcessing: {
        default: false,
      },
      isRendered: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="custom-table"]',
        getAttrs: (dom) => {
          console.log('TableExtension parseHTML: DOM element:', dom);
          console.log('TableExtension parseHTML: DOM innerHTML:', dom.innerHTML);
          const originalPrompt = dom.getAttribute('data-prompt') || '';
          const isProcessed = dom.getAttribute('data-processed') === 'true';
          const isProcessing = dom.getAttribute('data-is-processing') === 'true';
          const tableDataStr = dom.getAttribute('data-table-data') || '[]';
          
          console.log('TableExtension parseHTML: originalPrompt:', originalPrompt);
          console.log('TableExtension parseHTML: tableDataStr from DOM:', tableDataStr);
          
          let tableData = [];
          try {
            tableData = JSON.parse(tableDataStr);
            console.log('TableExtension parseHTML: parsed tableData:', tableData);
          } catch (e) {
            console.error('Error parsing table data:', e);
            tableData = [];
          }
          
          const attrs = {
            originalPrompt,
            tableData,
            isProcessing,
            isRendered: isProcessed,
          };
          
          console.log('TableExtension parseHTML: returning attributes:', attrs);
          return attrs;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tableData = node.attrs.tableData || [];
    console.log('TableExtension renderHTML: tableData being serialized:', tableData);
    console.log('TableExtension renderHTML: tableData type:', typeof tableData);
    
    let tableDataStr;
    if (Array.isArray(tableData)) {
      tableDataStr = JSON.stringify(tableData);
    } else if (typeof tableData === 'string') {
      // If it's already a string, check if it's valid JSON
      try {
        const parsed = JSON.parse(tableData);
        tableDataStr = JSON.stringify(parsed);
      } catch (e) {
        // If it's not valid JSON, treat as empty array
        console.warn('Invalid tableData string in renderHTML:', tableData);
        tableDataStr = JSON.stringify([]);
      }
    } else {
      tableDataStr = JSON.stringify([]);
    }
    
    console.log('TableExtension renderHTML: final serialized string:', tableDataStr);
    
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'custom-table',
        'data-prompt': node.attrs.originalPrompt || '',
        'data-processed': node.attrs.isRendered ? 'true' : 'false',
        'data-table-data': tableDataStr,
        'data-is-processing': node.attrs.isProcessing ? 'true' : 'false',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableNodeView);
  },

  addInputRules() {
    return [
      // Multi-line table syntax: /table(\n  text | text | text\n)/
      new InputRule({
        find: /\/table\(\s*\n([\s\S]*?)\n\s*\)\/$/,
        handler: ({ state, range, match }) => {
          console.log('Multi-line table input rule triggered:', match[1]);
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const tableText = match[1];

          // Parse the pipe-separated table
          const lines = tableText.trim().split('\n').filter(line => line.trim());
          const tableData = lines.map((line, index) => ({
            cells: line.split('|').map(cell => ({
              content: cell.trim(),
              isHeader: index === 0
            }))
          }));

          tr.replaceWith(start, end, this.type.create({
            originalPrompt: tableText,
            tableData,
            isProcessing: false,
            isRendered: true,
          }));

          return tr;
        },
      }),
      
      // Single line table description: /table(description)/
      new InputRule({
        find: /\/table\(([^)]+)\)\/$/,
        handler: ({ state, range, match }) => {
          console.log('Single-line table input rule triggered:', match[1]);
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const prompt = match[1];

          tr.replaceWith(start, end, this.type.create({
            originalPrompt: prompt,
            tableData: [],
            isProcessing: true,
            isRendered: false,
          }));

          return tr;
        },
      }),
    ];
  },

  addCommands() {
    return {
      setTable: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        });
      },
      updateTable: (pos, attributes) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setNodeMarkup(pos, null, attributes);
        }
        return true;
      },
      insertTable: (prompt, tableData = []) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            originalPrompt: prompt,
            tableData,
            isProcessing: !tableData.length,
            isRendered: !!tableData.length,
          },
        });
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Test shortcut - Ctrl+Shift+T to insert a test table
      'Mod-Shift-t': () => {
        console.log('Table extension keyboard shortcut triggered!');
        this.editor.commands.insertTable('simple 3x3 table');
        return true;
      },
    };
  },
}); 