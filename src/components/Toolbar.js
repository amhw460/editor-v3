import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link,
  Undo,
  Redo,
  Download,
  FileText,
  ChevronDown,
  Calculator,
  Type,
  Code,
  FileText as FileTextIcon,
  Image as ImageIcon
} from 'lucide-react';
import { exportToPdf, exportToLatex } from '../services/exportService';

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 20px;
  background-color: #222222;
  border-bottom: 1px solid #666666;
  flex-wrap: wrap;
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
  padding-right: 12px;
  border-right: 1px solid #e1e5e9;

  &:last-child {
    border-right: none;
    margin-right: 0;
    padding-right: 0;
  }
`;

const ToolbarButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: ${props => props.isActive ? '#e0b0ff' : 'transparent'};
  border: 1px solid ${props => props.isActive ? '#800080' : 'transparent'};
  border-radius: 4px;
  cursor: pointer;
  color: ${props => props.isActive ? '#800080' : '#5f6368'};
  transition: all 0.2s;

  &:hover {
    background-color: ${props => props.isActive ? '#e8f0fe' : '#f8f9fa'};
    border-color: ${props => props.isActive ? '#4285f4' : '#e1e5e9'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 6px 8px;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: #4285f4;
  }
`;

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  padding: 0 8px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #5f6368;
  transition: all 0.2s;
  font-size: 14px;

  &:hover {
    background-color: #f8f9fa;
    border-color: #e1e5e9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 120px;
  margin-top: 4px;
`;

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background-color: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #5f6368;
  text-align: left;

  &:hover {
    background-color: #f8f9fa;
  }

  &:first-child {
    border-radius: 4px 4px 0 0;
  }

  &:last-child {
    border-radius: 0 0 4px 4px;
  }
`;

function Toolbar({ editor, documentTitle = 'Document' }) {
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState(() => {
    return localStorage.getItem('documentFont') || 'computer-modern';
  });
  const dropdownRef = useRef(null);
  const fontDropdownRef = useRef(null);

  // Available document fonts
  const documentFonts = [
    { 
      value: 'computer-modern', 
      label: 'Computer Modern', 
      cssName: '"Computer Modern Serif", "CMU Serif", "Computer Modern", serif',
      description: 'Classic TeX/LaTeX font'
    },
    { 
      value: 'times', 
      label: 'Times New Roman', 
      cssName: '"Times New Roman", Times, serif',
      description: 'Traditional serif font'
    },
    { 
      value: 'garamond', 
      label: 'EB Garamond', 
      cssName: '"EB Garamond", Garamond, serif',
      description: 'Classic book font'
    },
    { 
      value: 'source-serif', 
      label: 'Source Serif Pro', 
      cssName: '"Source Serif Pro", Georgia, serif',
      description: 'Adobe serif font'
    },
    { 
      value: 'georgia', 
      label: 'Georgia', 
      cssName: 'Georgia, serif',
      description: 'Web-optimized serif'
    },
    { 
      value: 'palatino', 
      label: 'Palatino', 
      cssName: 'Palatino, "Palatino Linotype", "Book Antiqua", serif',
      description: 'Elegant serif font'
    },
    { 
      value: 'inter', 
      label: 'Inter', 
      cssName: 'Inter, "Segoe UI", system-ui, sans-serif',
      description: 'Modern UI font'
    },
    { 
      value: 'fira', 
      label: 'Fira Sans', 
      cssName: '"Fira Sans", Arial, sans-serif',
      description: 'Technical sans-serif'
    },
    { 
      value: 'helvetica', 
      label: 'Helvetica', 
      cssName: 'Helvetica, Arial, sans-serif',
      description: 'Clean sans-serif'
    },
    { 
      value: 'arial', 
      label: 'Arial', 
      cssName: 'Arial, Helvetica, sans-serif',
      description: 'Modern sans-serif'
    },
    { 
      value: 'verdana', 
      label: 'Verdana', 
      cssName: 'Verdana, Geneva, sans-serif',
      description: 'Readable sans-serif'
    },
    { 
      value: 'courier', 
      label: 'Courier New', 
      cssName: '"Courier New", "Monaco", "Menlo", monospace',
      description: 'Monospace font'
    }
  ];

  // Apply font to document
  useEffect(() => {
    const applyDocumentFont = () => {
      const font = documentFonts.find(f => f.value === selectedFont);
      if (font) {
        // Apply to editor content
        const editorElement = document.querySelector('.ProseMirror');
        if (editorElement) {
          editorElement.style.fontFamily = font.cssName;
        }
        
        // Apply to body for consistent styling
        document.body.style.setProperty('--document-font-family', font.cssName);
        
        // Apply to KaTeX elements specifically
        const style = document.getElementById('dynamic-font-style') || document.createElement('style');
        style.id = 'dynamic-font-style';
        style.textContent = `
          .ProseMirror {
            font-family: ${font.cssName} !important;
          }
          .katex {
            font-family: ${font.cssName} !important;
          }
          .katex .mathdefault {
            font-family: ${font.cssName} !important;
          }
          .latex-rendered {
            font-family: ${font.cssName} !important;
          }
          .latex-placeholder {
            font-family: ${font.cssName} !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    applyDocumentFont();
    
    // Save selection
    localStorage.setItem('documentFont', selectedFont);
  }, [selectedFont, documentFonts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!editor) return;
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsExportDropdownOpen(false);
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target)) {
        setIsFontDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editor]);

  // Handle font selection
  const handleFontChange = (fontValue) => {
    setSelectedFont(fontValue);
    setIsFontDropdownOpen(false);
  };

  // Get current font label
  const getCurrentFontLabel = () => {
    const font = documentFonts.find(f => f.value === selectedFont);
    return font ? font.label : 'Computer Modern';
  };

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const setHeading = (level) => {
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  // Test function to insert LaTeX
  const testLatexInsertion = () => {
    if (editor.commands.insertLatexExpression) {
      editor.commands.insertLatexExpression('square root of 2', 'text');
    } else {
      console.error('LaTeX command not available');
    }
  };

  // Function to insert code block
  const insertCodeBlock = () => {
    if (editor.commands.insertCodeBlock) {
      const javaCode = `for (int j = 0; j < numberOfValues; j++) {
    elements.add((int) (Math.random() * maxValue + 1));
}

return elements;

public static void displayValues(Collection<Integer> data) {
    if (data.isEmpty()) {
        System.out.println("Empty Collection");
    } else {
        for (Integer value : data)
            System.out.print(value + " ");
    }
}`;
      editor.commands.insertCodeBlock(javaCode, 'java');
    } else {
      console.error('Code block command not available');
    }
  };

  // Function to insert LaTeX block (opens modal)
  const insertLatexBlock = () => {
    if (editor.commands.openLatexBlockModal) {
      editor.commands.openLatexBlockModal();
    } else {
      console.error('LaTeX block command not available');
    }
  };

  // Function to insert image
  const insertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target.result;
          editor.chain().focus().setImage({ src, alt: file.name }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleExportPdf = async () => {
    setIsExportDropdownOpen(false);
    try {
      await exportToPdf(editor, documentTitle);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportLatex = () => {
    setIsExportDropdownOpen(false);
    try {
      exportToLatex(editor, documentTitle);
    } catch (error) {
      console.error('Error exporting LaTeX:', error);
      alert('Failed to export LaTeX. Please try again.');
    }
  };

  return (
    <ToolbarContainer>
      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <Select
          value={
            editor.isActive('heading', { level: 1 }) ? '1' :
            editor.isActive('heading', { level: 2 }) ? '2' :
            editor.isActive('heading', { level: 3 }) ? '3' :
            '0'
          }
          onChange={(e) => setHeading(parseInt(e.target.value))}
        >
          <option value="0">Normal text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </Select>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <DropdownContainer ref={fontDropdownRef}>
          <DropdownButton
            onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
            title="Document Font"
          >
            <Type size={16} />
            {getCurrentFontLabel()}
            <ChevronDown size={14} />
          </DropdownButton>
          {isFontDropdownOpen && (
            <DropdownMenu style={{ minWidth: '200px', maxHeight: '400px', overflowY: 'auto' }}>
              {documentFonts.map((font) => (
                <DropdownItem
                  key={font.value}
                  onClick={() => handleFontChange(font.value)}
                  style={{
                    backgroundColor: selectedFont === font.value ? '#e8f0fe' : 'transparent',
                    color: selectedFont === font.value ? '#4285f4' : '#5f6368',
                    padding: '12px 16px',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ 
                    fontWeight: selectedFont === font.value ? 'bold' : 'normal',
                    fontSize: '14px',
                    fontFamily: font.cssName,
                    marginBottom: '2px'
                  }}>
                    {font.label}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#888', 
                    fontStyle: 'italic'
                  }}>
                    {font.description}
                  </div>
                </DropdownItem>
              ))}
            </DropdownMenu>
          )}
        </DropdownContainer>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <Link size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={testLatexInsertion}
          title="Test LaTeX (Debug)"
        >
          <Calculator size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={insertCodeBlock}
          title="Insert Code Block"
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={insertLatexBlock}
          title="Insert LaTeX Block (English → LaTeX)"
        >
          <FileTextIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={insertImage}
          title="Insert Image"
        >
          <ImageIcon size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <DropdownContainer>
          <DropdownButton
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            title="Export Document"
          >
            <Download size={16} />
            Export
            <ChevronDown size={14} />
          </DropdownButton>
          {isExportDropdownOpen && (
            <DropdownMenu>
              <DropdownItem onClick={handleExportPdf}>
                <Download size={14} />
                Export as PDF
              </DropdownItem>
              <DropdownItem onClick={handleExportLatex}>
                <FileText size={14} />
                Export as LaTeX
              </DropdownItem>
            </DropdownMenu>
          )}
        </DropdownContainer>
      </ToolbarGroup>
    </ToolbarContainer>
  );
}

export default Toolbar; 