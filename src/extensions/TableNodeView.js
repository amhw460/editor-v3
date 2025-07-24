import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { convertTablePrompt, parseTableText, addRowToTable, removeRowFromTable, addColumnToTable, removeColumnFromTable } from '../services/tableService';
import { Edit2, Plus, Minus, Trash2 } from 'lucide-react';
import styled from 'styled-components';

const TableContainer = styled.div`
  position: relative;
  margin: 1em 0;
  border: 2px solid transparent;
  border-radius: 8px;
  background: #1e1e1e;

  /* Add these two lines to center the table */
  display: flex;
  justify-content: center;
  
  &.selected {
    border-color: #4285f4;
    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
  }
`;

const StyledTable = styled.table`
  width: auto;
  max-width: 100%;
  border-collapse: collapse;
  color: white;
  border: 1px solid #333;
  
  th, td {
    border: 1px solid #e1e5e9;
    padding: 8px 12px;
    text-align: left;
    min-width: 60px;
    max-width: 120px;
    min-height: 36px;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    
    &.focused {
      box-shadow: inset 0 0 0 1px transparent;
    }
    
    &.editing {
      background-color: #rgba(0, 0, 0, 0.15);
    }
  }
  
  th {
    background-color: #333;
    font-weight: 600;
    color: white;
    
    &.focused {
      box-shadow: inset 0 0 0 1px transparent;
    }
  }
  
  input {
    width: 100%;
    max-width: 100%;
    border: none;
    background: transparent;
    outline: none;
    color: white;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    overflow: hidden;
    white-space: nowrap;
    
    &::placeholder {
      color: #ccc;
      opacity: 0.7;
    }
  }
`;

const ProcessingIndicator = styled.div`
  padding: 20px;
  text-align: center;
  background-color: #e3f2fd;
  border: 1px dashed #2196f3;
  border-radius: 4px;
  color: #1565c0;
  font-size: 14px;
`;

const FloatingToolbar = styled.div`
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  background: #121212;
  padding: 4px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
`;

const ToolbarButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: #5f6368;
  
  &:hover {
    background-color: #f8f9fa;
  }
  
  &:active {
    background-color: #e8f0fe;
  }
`;

const TableNodeView = ({ node, updateAttributes, getPos, editor }) => {
  console.log('TableNodeView: Component initialized with node:', node);
  console.log('TableNodeView: Node attributes:', node.attrs);
  console.log('TableNodeView: Table data:', node.attrs.tableData);
  
  const [editingCell, setEditingCell] = useState(null);
  const [focusedCell, setFocusedCell] = useState(null);
  const [selectedTable, setSelectedTable] = useState(false);
  const [localTableData, setLocalTableData] = useState(() => {
    const tableData = node.attrs.tableData;
    console.log('TableNodeView: Initial tableData type:', typeof tableData, 'value:', tableData);
    
    // Handle different formats of tableData
    if (Array.isArray(tableData)) {
      return tableData;
    } else if (typeof tableData === 'string') {
      // Try to parse JSON string
      try {
        const parsed = JSON.parse(tableData);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse tableData string:', e);
        return [];
      }
    } else {
      return [];
    }
  });
  const [isProcessing, setIsProcessing] = useState(node.attrs.isProcessing || false);
  const tableRef = useRef(null);
  const inputRef = useRef(null);

  // Process table prompt when node is created
  useEffect(() => {
    if (node.attrs.originalPrompt && !node.attrs.isRendered && !localTableData.length) {
      console.log('TableNodeView: Processing table prompt:', node.attrs.originalPrompt);
      setIsProcessing(true);
      
      const processTable = async () => {
        try {
          let tableData;
          
          // Check if it's pipe-separated syntax
          if (node.attrs.originalPrompt.includes('|')) {
            tableData = parseTableText(node.attrs.originalPrompt);
          } else {
            tableData = await convertTablePrompt(node.attrs.originalPrompt);
          }
          
          setLocalTableData(tableData);
          setIsProcessing(false);
          
          updateAttributes({
            tableData,
            isProcessing: false,
            isRendered: true,
          });
        } catch (error) {
          console.error('Error processing table:', error);
          setIsProcessing(false);
          
          // Try to parse the prompt locally for fallback
          let fallbackTable;
          try {
            // Try built-in patterns first
            const prompt = node.attrs.originalPrompt.trim();
            
            // Check for dimension patterns (e.g., "3x4 table", "5x2 table with headers")
            const dimensionMatch = prompt.match(/(\d+)x(\d+)\s*table/i);
            if (dimensionMatch) {
              const rows = parseInt(dimensionMatch[1]);
              const cols = parseInt(dimensionMatch[2]);
              
              // Check if headers are requested
              const headerMatch = prompt.match(/with headers?\s+(.+)/i);
              if (headerMatch) {
                const headers = headerMatch[1].split(',').map(h => h.trim());
                fallbackTable = [
                  { cells: headers.slice(0, cols).map(header => ({ content: header, isHeader: true })) },
                  ...Array(rows - 1).fill().map(() => ({
                    cells: Array(cols).fill().map(() => ({ content: '', isHeader: false }))
                  }))
                ];
                // Fill remaining header cells if needed
                while (fallbackTable[0].cells.length < cols) {
                  fallbackTable[0].cells.push({ content: '', isHeader: true });
                }
              } else {
                // No headers, just create empty table
                fallbackTable = Array(rows).fill().map(() => ({
                  cells: Array(cols).fill().map(() => ({ content: '', isHeader: false }))
                }));
              }
            } else {
              // Default to 3x3 if no pattern matches
              fallbackTable = [
                { cells: [{ content: '', isHeader: true }, { content: '', isHeader: true }, { content: '', isHeader: true }] },
                { cells: [{ content: '', isHeader: false }, { content: '', isHeader: false }, { content: '', isHeader: false }] },
                { cells: [{ content: '', isHeader: false }, { content: '', isHeader: false }, { content: '', isHeader: false }] }
              ];
            }
          } catch (parseError) {
            // If local parsing fails, use default 3x3
            fallbackTable = [
              { cells: [{ content: '', isHeader: true }, { content: '', isHeader: true }, { content: '', isHeader: true }] },
              { cells: [{ content: '', isHeader: false }, { content: '', isHeader: false }, { content: '', isHeader: false }] },
              { cells: [{ content: '', isHeader: false }, { content: '', isHeader: false }, { content: '', isHeader: false }] }
            ];
          }
          
          setLocalTableData(fallbackTable);
          updateAttributes({
            tableData: fallbackTable,
            isProcessing: false,
            isRendered: true,
          });
        }
      };
      
      processTable();
    }
  }, [node.attrs.originalPrompt, node.attrs.isRendered, localTableData.length, updateAttributes]);

  // Update local state when node attributes change
  useEffect(() => {
    const tableData = node.attrs.tableData;
    console.log('TableNodeView: Node attributes changed, tableData type:', typeof tableData, 'value:', tableData);
    
    if (Array.isArray(tableData) && tableData.length > 0) {
      setLocalTableData(tableData);
    } else if (typeof tableData === 'string' && tableData.length > 0) {
      try {
        const parsed = JSON.parse(tableData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalTableData(parsed);
        }
      } catch (e) {
        console.error('Failed to parse tableData string in useEffect:', e);
      }
    }
  }, [node.attrs.tableData]);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  // Add keyboard event listener for table navigation
  useEffect(() => {
    const handleTableKeyDown = (e) => {
      if (!Array.isArray(localTableData) || localTableData.length === 0) return;
      
      // Only handle navigation when table is focused but not editing a cell
      if (focusedCell && !editingCell) {
        const { row, col } = focusedCell;
        
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            e.stopPropagation();
            if (row > 0) {
              setFocusedCell({ row: row - 1, col });
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            e.stopPropagation();
            if (row < localTableData.length - 1) {
              setFocusedCell({ row: row + 1, col });
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            e.stopPropagation();
            if (col > 0) {
              setFocusedCell({ row, col: col - 1 });
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            e.stopPropagation();
            if (col < localTableData[row].cells.length - 1) {
              setFocusedCell({ row, col: col + 1 });
            }
            break;
          case 'Enter':
            e.preventDefault();
            e.stopPropagation();
            setEditingCell(focusedCell);
            break;
          case 'Escape':
            e.preventDefault();
            e.stopPropagation();
            setFocusedCell(null);
            setSelectedTable(false);
            break;
        }
      }
    };

    // Add both keydown and keyup handlers
    const handleDocumentKeyDown = (e) => {
      if (!Array.isArray(localTableData) || localTableData.length === 0) return;
      
      // Check if the table is focused and we're not editing
      if (focusedCell && !editingCell && tableRef.current && tableRef.current.contains(document.activeElement)) {
        handleTableKeyDown(e);
      }
    };

    if (tableRef.current) {
      tableRef.current.addEventListener('keydown', handleTableKeyDown, { capture: true });
      document.addEventListener('keydown', handleDocumentKeyDown, { capture: true });
      
      return () => {
        if (tableRef.current) {
          tableRef.current.removeEventListener('keydown', handleTableKeyDown, { capture: true });
        }
        document.removeEventListener('keydown', handleDocumentKeyDown, { capture: true });
      };
    }
  }, [focusedCell, editingCell, localTableData]);

  // Handle cell click to start editing
  const handleCellClick = useCallback((rowIndex, colIndex) => {
    setFocusedCell({ row: rowIndex, col: colIndex });
    setEditingCell({ row: rowIndex, col: colIndex });
    setSelectedTable(false);
  }, []);

  // Handle cell click to focus (single click focuses, double click or Enter edits)
  const handleCellFocus = useCallback((rowIndex, colIndex) => {
    setFocusedCell({ row: rowIndex, col: colIndex });
    setSelectedTable(false);
  }, []);

  // Handle cell content change
  const handleCellChange = useCallback((rowIndex, colIndex, newContent) => {
    if (!Array.isArray(localTableData) || !localTableData[rowIndex]) return;
    
    const newTableData = [...localTableData];
    newTableData[rowIndex].cells[colIndex].content = newContent;
    setLocalTableData(newTableData);
    
    console.log('TableNodeView: Updating table data:', newTableData);
    console.log('TableNodeView: Calling updateAttributes with tableData:', newTableData);
    updateAttributes({
      tableData: newTableData,
    });
  }, [localTableData, updateAttributes]);

  // Handle table container click (for selection)
  const handleTableClick = useCallback((e) => {
    if (e.target === tableRef.current || e.target.closest('.table-border')) {
      setSelectedTable(true);
      setEditingCell(null);
      setFocusedCell(null);
    }
  }, []);

  // Helper function to check if entire row is empty
  const isRowEmpty = useCallback((rowIndex) => {
    if (!localTableData[rowIndex]) return false;
    return localTableData[rowIndex].cells.every(cell => !cell.content.trim());
  }, [localTableData]);

  // Helper function to get last cell position
  const getLastCellPosition = useCallback(() => {
    if (!localTableData.length) return { row: 0, col: 0 };
    const lastRow = localTableData.length - 1;
    const lastCol = localTableData[lastRow].cells.length - 1;
    return { row: lastRow, col: lastCol };
  }, [localTableData]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e, rowIndex, colIndex) => {
    if (!Array.isArray(localTableData) || !localTableData[rowIndex]) return;
    
    const currentCell = localTableData[rowIndex].cells[colIndex];
    const isBottomRow = rowIndex === localTableData.length - 1;
    const isLeftmostCell = colIndex === 0;
    const currentCellEmpty = !currentCell.content.trim();
    
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Previous cell (existing logic)
          if (colIndex > 0) {
            setEditingCell({ row: rowIndex, col: colIndex - 1 });
          } else if (rowIndex > 0) {
            setEditingCell({ row: rowIndex - 1, col: localTableData[rowIndex - 1].cells.length - 1 });
          }
        } else {
          // Next cell (existing logic)
          if (colIndex < localTableData[rowIndex].cells.length - 1) {
            setEditingCell({ row: rowIndex, col: colIndex + 1 });
          } else if (rowIndex < localTableData.length - 1) {
            setEditingCell({ row: rowIndex + 1, col: 0 });
          }
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        // Logic 1: If on bottom row, create new row
        if (isBottomRow) {
          const newTableData = addRowToTable(localTableData);
          setLocalTableData(newTableData);
          updateAttributes({ tableData: newTableData });
          // Move to first cell of new row
          setTimeout(() => {
            setEditingCell({ row: rowIndex + 1, col: colIndex });
          }, 10);
        } else {
          // Move to same column on next row
          setEditingCell({ row: rowIndex + 1, col: colIndex });
        }
        break;
        
      case 'Backspace':
        // Logic 4: Delete empty row if in leftmost cell
        if (isLeftmostCell && currentCellEmpty && isRowEmpty(rowIndex) && localTableData.length > 1) {
          e.preventDefault();
          const newTableData = removeRowFromTable(localTableData, rowIndex);
          setLocalTableData(newTableData);
          updateAttributes({ tableData: newTableData });
          // Move to last cell of table
          const lastPos = getLastCellPosition();
          setTimeout(() => {
            setEditingCell(lastPos);
          }, 10);
          return;
        }
        
        // Logic 2: Move left if current cell is empty
        if (currentCellEmpty && !isLeftmostCell) {
          e.preventDefault();
          setEditingCell({ row: rowIndex, col: colIndex - 1 });
          return;
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        // Logic 3: Wrapping - if on top row, wrap to bottom
        if (rowIndex > 0) {
          setEditingCell({ row: rowIndex - 1, col: colIndex });
        } else {
          // Wrap to bottom row, same column
          setEditingCell({ row: localTableData.length - 1, col: colIndex });
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        // Logic 3: Wrapping - if on bottom row, wrap to top
        if (rowIndex < localTableData.length - 1) {
          setEditingCell({ row: rowIndex + 1, col: colIndex });
        } else {
          // Wrap to top row, same column
          setEditingCell({ row: 0, col: colIndex });
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        // Logic 3: Wrapping - like tab navigation
        if (colIndex > 0) {
          setEditingCell({ row: rowIndex, col: colIndex - 1 });
        } else if (rowIndex > 0) {
          // Wrap to last cell of previous row
          setEditingCell({ row: rowIndex - 1, col: localTableData[rowIndex - 1].cells.length - 1 });
        } else {
          // Wrap to last cell of table
          const lastPos = getLastCellPosition();
          setEditingCell(lastPos);
        }
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        // Logic 3: Wrapping - like tab navigation
        if (colIndex < localTableData[rowIndex].cells.length - 1) {
          setEditingCell({ row: rowIndex, col: colIndex + 1 });
        } else if (rowIndex < localTableData.length - 1) {
          // Wrap to first cell of next row
          setEditingCell({ row: rowIndex + 1, col: 0 });
        } else {
          // Wrap to first cell of table
          setEditingCell({ row: 0, col: 0 });
        }
        break;
        
      case 'Escape':
        setEditingCell(null);
        break;
    }
  }, [localTableData, addRowToTable, removeRowFromTable, updateAttributes, isRowEmpty, getLastCellPosition]);

  // Toolbar actions
  const handleEditPrompt = useCallback(() => {
    const pos = getPos();
    if (pos !== undefined) {
      const tr = editor.state.tr;
      tr.replaceWith(pos, pos + 1, editor.schema.text(`/table(${node.attrs.originalPrompt})/`));
      editor.view.dispatch(tr);
      
      setTimeout(() => {
        editor.commands.focus(pos);
      }, 10);
    }
  }, [getPos, editor, node.attrs.originalPrompt]);

  const handleAddRow = useCallback(() => {
    if (!Array.isArray(localTableData)) return;
    const newTableData = addRowToTable(localTableData);
    setLocalTableData(newTableData);
    updateAttributes({ tableData: newTableData });
  }, [localTableData, updateAttributes]);

  const handleRemoveRow = useCallback(() => {
    if (!Array.isArray(localTableData) || localTableData.length === 0) return;
    const newTableData = removeRowFromTable(localTableData, localTableData.length - 1);
    setLocalTableData(newTableData);
    updateAttributes({ tableData: newTableData });
  }, [localTableData, updateAttributes]);

  const handleAddColumn = useCallback(() => {
    if (!Array.isArray(localTableData)) return;
    const newTableData = addColumnToTable(localTableData);
    setLocalTableData(newTableData);
    updateAttributes({ tableData: newTableData });
  }, [localTableData, updateAttributes]);

  const handleRemoveColumn = useCallback(() => {
    if (!Array.isArray(localTableData) || localTableData.length === 0) return;
    const colCount = localTableData[0]?.cells?.length || 0;
    const newTableData = removeColumnFromTable(localTableData, colCount - 1);
    setLocalTableData(newTableData);
    updateAttributes({ tableData: newTableData });
  }, [localTableData, updateAttributes]);

  const handleDeleteTable = useCallback(() => {
    const pos = getPos();
    if (pos !== undefined) {
      const tr = editor.state.tr;
      tr.delete(pos, pos + 1);
      editor.view.dispatch(tr);
    }
  }, [getPos, editor]);

  if (isProcessing) {
    return (
      <NodeViewWrapper>
        <ProcessingIndicator>
          Creating table...
        </ProcessingIndicator>
      </NodeViewWrapper>
    );
  }

  if (!Array.isArray(localTableData) || !localTableData.length) {
    return (
      <NodeViewWrapper>
        <ProcessingIndicator>
          No table data available
        </ProcessingIndicator>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <TableContainer
        className={selectedTable ? 'selected' : ''}
        onClick={handleTableClick}
      >
        {selectedTable && (
          <FloatingToolbar>
            <ToolbarButton onClick={handleEditPrompt}>
              <Edit2 size={14} />
              Edit Prompt
            </ToolbarButton>
            <ToolbarButton onClick={handleAddRow}>
              <Plus size={14} />
              Add Row
            </ToolbarButton>
            <ToolbarButton onClick={handleRemoveRow}>
              <Minus size={14} />
              Remove Row
            </ToolbarButton>
            <ToolbarButton onClick={handleAddColumn}>
              <Plus size={14} />
              Add Column
            </ToolbarButton>
            <ToolbarButton onClick={handleRemoveColumn}>
              <Minus size={14} />
              Remove Column
            </ToolbarButton>
            <ToolbarButton onClick={handleDeleteTable}>
              <Trash2 size={14} />
              Delete
            </ToolbarButton>
          </FloatingToolbar>
        )}
        
        <StyledTable 
          ref={tableRef}
          tabIndex={0}
          onFocus={() => {
            // Set initial focus to first cell if no cell is focused
            if (!focusedCell && localTableData.length > 0) {
              setFocusedCell({ row: 0, col: 0 });
            }
          }}
          onClick={(e) => {
            // Focus the table when clicked
            if (e.target.tagName === 'TABLE') {
              e.currentTarget.focus();
            }
          }}
        >
          <tbody>
            {localTableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.cells.map((cell, colIndex) => {
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                  const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;
                  const CellTag = cell.isHeader ? 'th' : 'td';
                  
                  return (
                    <CellTag
                      key={colIndex}
                      className={`${isFocused ? 'focused' : ''} ${isEditing ? 'editing' : ''}`}
                      onClick={() => handleCellFocus(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellClick(rowIndex, colIndex)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={cell.content}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        />
                      ) : (
                        <span>{cell.content || '\u00A0'}</span>
                      )}
                    </CellTag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </TableContainer>
    </NodeViewWrapper>
  );
};

export default TableNodeView; 