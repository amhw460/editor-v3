import axios from 'axios';

// Cache for converted table structures
const tableCache = new Map();

// Built-in patterns for common table types
const builtInTablePatterns = [
  {
    pattern: /(\d+)x(\d+) table with headers (.+)/i,
    handler: (match) => {
      const rows = parseInt(match[1]);
      const cols = parseInt(match[2]);
      const headerText = match[3];
      return createTableWithHeaders(rows, cols, headerText);
    }
  },
  {
    pattern: /(\d+)x(\d+) table/i,
    handler: (match) => {
      const rows = parseInt(match[1]);
      const cols = parseInt(match[2]);
      return createEmptyTable(rows, cols);
    }
  },
  {
    pattern: /multiplication table from (\d+) to (\d+)/i,
    handler: (match) => {
      const start = parseInt(match[1]);
      const end = parseInt(match[2]);
      return createMultiplicationTable(start, end);
    }
  },
  {
    pattern: /multiplication table (\d+)x(\d+)/i,
    handler: (match) => {
      const rows = parseInt(match[1]);
      const cols = parseInt(match[2]);
      return createMultiplicationTable(1, Math.max(rows, cols));
    }
  },
  {
    pattern: /simple table/i,
    handler: () => createEmptyTable(3, 3)
  }
];

// Create table with headers
function createTableWithHeaders(rows, cols, headerText) {
  const headers = headerText.split(',').map(h => h.trim());
  const tableData = [];
  
  // First row: headers
  tableData.push({
    cells: headers.slice(0, cols).map(header => ({
      content: header,
      isHeader: true
    }))
  });
  
  // Fill remaining header cells if needed
  while (tableData[0].cells.length < cols) {
    tableData[0].cells.push({
      content: '',
      isHeader: true
    });
  }
  
  // Remaining rows: empty cells
  for (let i = 1; i < rows; i++) {
    tableData.push({
      cells: Array(cols).fill().map(() => ({
        content: '',
        isHeader: false
      }))
    });
  }
  
  return tableData;
}

// Create empty table
function createEmptyTable(rows, cols) {
  return Array(rows).fill().map(() => ({
    cells: Array(cols).fill().map(() => ({
      content: '',
      isHeader: false
    }))
  }));
}

// Create multiplication table
function createMultiplicationTable(start, end) {
  const tableData = [];
  
  // Header row
  const headerRow = {
    cells: [{ content: '×', isHeader: true }]
  };
  for (let i = start; i <= end; i++) {
    headerRow.cells.push({ content: i.toString(), isHeader: true });
  }
  tableData.push(headerRow);
  
  // Data rows
  for (let i = start; i <= end; i++) {
    const row = {
      cells: [{ content: i.toString(), isHeader: true }]
    };
    for (let j = start; j <= end; j++) {
      row.cells.push({ content: (i * j).toString(), isHeader: false });
    }
    tableData.push(row);
  }
  
  return tableData;
}

// Parse pipe-separated table text
export function parseTableText(text) {
  const lines = text.trim().split('\n').filter(line => line.trim());
  const tableData = lines.map((line, index) => ({
    cells: line.split('|').map(cell => ({
      content: cell.trim(),
      isHeader: index === 0
    }))
  }));
  return tableData;
}

// Try built-in patterns first
function tryBuiltInTableConversion(prompt) {
  for (const { pattern, handler } of builtInTablePatterns) {
    const match = prompt.match(pattern);
    if (match) {
      return handler(match);
    }
  }
  return null;
}

// Convert natural language prompt to table structure
export async function convertTablePrompt(prompt) {
  console.log('TableService: Converting table prompt:', prompt);
  const trimmedPrompt = prompt.trim();
  
  // Check cache first
  if (tableCache.has(trimmedPrompt)) {
    console.log('TableService: Found in cache');
    return tableCache.get(trimmedPrompt);
  }
  
  // ALWAYS try built-in patterns first - they're more reliable
  const builtInResult = tryBuiltInTableConversion(trimmedPrompt);
  if (builtInResult) {
    console.log('TableService: Built-in pattern matched for:', trimmedPrompt);
    tableCache.set(trimmedPrompt, builtInResult);
    return builtInResult;
  }
  
  // For simple dimension patterns, force local handling
  const simplePattern = trimmedPrompt.match(/^(\d+)x(\d+)$/i);
  if (simplePattern) {
    const rows = parseInt(simplePattern[1]);
    const cols = parseInt(simplePattern[2]);
    console.log('TableService: Creating simple table:', rows, 'x', cols);
    const simpleTable = createEmptyTable(rows, cols);
    tableCache.set(trimmedPrompt, simpleTable);
    return simpleTable;
  }
  
  // Try AI conversion via API only for complex descriptions
  try {
    console.log('TableService: Trying AI conversion for:', trimmedPrompt);
    const response = await axios.post('/api/convert-table', {
      prompt: trimmedPrompt
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const tableData = response.data.tableData;
    if (tableData && Array.isArray(tableData) && tableData.length > 0) {
      console.log('TableService: AI conversion succeeded');
      tableCache.set(trimmedPrompt, tableData);
      return tableData;
    }
  } catch (error) {
    console.error('Table API conversion failed:', error);
  }
  
  // Fallback: create a simple 3x3 table
  console.log('TableService: Using fallback 3x3 table');
  const fallbackTable = createEmptyTable(3, 3);
  tableCache.set(trimmedPrompt, fallbackTable);
  return fallbackTable;
}

// Validate table structure
export function validateTableData(tableData) {
  if (!Array.isArray(tableData) || tableData.length === 0) {
    return false;
  }
  
  const firstRowLength = tableData[0].cells?.length || 0;
  if (firstRowLength === 0) {
    return false;
  }
  
  // Check that all rows have the same number of cells
  return tableData.every(row => 
    row.cells && Array.isArray(row.cells) && row.cells.length === firstRowLength
  );
}

// Helper to add row to table
export function addRowToTable(tableData, insertIndex = -1) {
  const colCount = tableData[0]?.cells?.length || 0;
  const newRow = {
    cells: Array(colCount).fill().map(() => ({
      content: '',
      isHeader: false
    }))
  };
  
  const newTableData = [...tableData];
  if (insertIndex === -1) {
    newTableData.push(newRow);
  } else {
    newTableData.splice(insertIndex, 0, newRow);
  }
  
  return newTableData;
}

// Helper to remove row from table
export function removeRowFromTable(tableData, rowIndex) {
  if (tableData.length <= 1) return tableData; // Don't remove if only one row
  
  const newTableData = [...tableData];
  newTableData.splice(rowIndex, 1);
  return newTableData;
}

// Helper to add column to table
export function addColumnToTable(tableData, insertIndex = -1) {
  const newTableData = tableData.map(row => ({
    cells: [...row.cells]
  }));
  
  newTableData.forEach(row => {
    const newCell = {
      content: '',
      isHeader: row.cells[0]?.isHeader || false
    };
    
    if (insertIndex === -1) {
      row.cells.push(newCell);
    } else {
      row.cells.splice(insertIndex, 0, newCell);
    }
  });
  
  return newTableData;
}

// Helper to remove column from table
export function removeColumnFromTable(tableData, colIndex) {
  if (tableData[0]?.cells?.length <= 1) return tableData; // Don't remove if only one column
  
  const newTableData = tableData.map(row => ({
    cells: row.cells.filter((_, index) => index !== colIndex)
  }));
  
  return newTableData;
} 