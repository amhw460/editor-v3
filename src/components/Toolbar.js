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
  Image as ImageIcon,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { exportToPdf, exportToLatex } from '../services/exportService';

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 20px;
  background-color: ${props => props.theme.toolbar};
  border-bottom: 1px solid ${props => props.theme.border};
  flex-wrap: wrap;
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
  padding-right: 12px;
  border-right: 1px solid ${props => props.theme.borderLight};

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
  background-color: ${props => props.isActive ? props.theme.active : 'transparent'};
  border: 1px solid ${props => props.isActive ? props.theme.activeBorder : 'transparent'};
  border-radius: 4px;
  cursor: pointer;
  color: ${props => props.isActive ? props.theme.activeBorder : props.theme.textSecondary};
  transition: all 0.2s;

  &:hover {
    background-color: ${props => props.isActive ? props.theme.active : props.theme.hover};
    border-color: ${props => props.isActive ? props.theme.activeBorder : props.theme.borderLight};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 6px 8px;
  border: 1px solid ${props => props.theme.border};
  border-radius: 4px;
  background-color: ${props => props.theme.dropdown};
  color: ${props => props.theme.text};
  font-size: 14px;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${props => props.theme.activeBorder};
  }

  option {
    background-color: ${props => props.theme.dropdown};
    color: ${props => props.theme.text};
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
  color: ${props => props.theme.textSecondary};
  transition: all 0.2s;
  font-size: 14px;

  &:hover {
    background-color: ${props => props.theme.hover};
    border-color: ${props => props.theme.borderLight};
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
  background-color: ${props => props.theme.dropdown};
  border: 1px solid ${props => props.theme.border};
  border-radius: 4px;
  box-shadow: 0 2px 8px ${props => props.theme.shadow};
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
  color: ${props => props.theme.textSecondary};
  text-align: left;

  &:hover {
    background-color: ${props => props.theme.dropdownHover};
  }

  &:first-child {
    border-radius: 4px 4px 0 0;
  }

  &:last-child {
    border-radius: 0 0 4px 4px;
  }
`;

function Toolbar({ editor, documentTitle = 'Document' }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fontDropdownRef = useRef(null);

  // Available fonts for inline formatting
  const fontFamilies = [
    { 
      label: 'Default', 
      value: null,
      cssName: null,
      description: 'Document default'
    },
    { 
      label: 'Computer Modern', 
      value: '"Computer Modern Serif", "CMU Serif", "Computer Modern", serif',
      cssName: '"Computer Modern Serif", "CMU Serif", "Computer Modern", serif',
      description: 'Classic TeX/LaTeX font'
    },
    { 
      label: 'Times New Roman', 
      value: '"Times New Roman", Times, serif',
      cssName: '"Times New Roman", Times, serif',
      description: 'Traditional serif font'
    },
    { 
      label: 'EB Garamond', 
      value: '"EB Garamond", Garamond, serif',
      cssName: '"EB Garamond", Garamond, serif',
      description: 'Classic book font'
    },
    { 
      label: 'Source Serif Pro', 
      value: '"Source Serif Pro", Georgia, serif',
      cssName: '"Source Serif Pro", Georgia, serif',
      description: 'Adobe serif font'
    },
    { 
      label: 'Georgia', 
      value: 'Georgia, serif',
      cssName: 'Georgia, serif',
      description: 'Web-optimized serif'
    },
    { 
      label: 'Palatino', 
      value: 'Palatino, "Palatino Linotype", "Book Antiqua", serif',
      cssName: 'Palatino, "Palatino Linotype", "Book Antiqua", serif',
      description: 'Elegant serif font'
    },
    { 
      label: 'Inter', 
      value: 'Inter, "Segoe UI", system-ui, sans-serif',
      cssName: 'Inter, "Segoe UI", system-ui, sans-serif',
      description: 'Modern UI font'
    },
    { 
      label: 'Fira Sans', 
      value: '"Fira Sans", Arial, sans-serif',
      cssName: '"Fira Sans", Arial, sans-serif',
      description: 'Technical sans-serif'
    },
    { 
      label: 'Helvetica', 
      value: 'Helvetica, Arial, sans-serif',
      cssName: 'Helvetica, Arial, sans-serif',
      description: 'Clean sans-serif'
    },
    { 
      label: 'Arial', 
      value: 'Arial, Helvetica, sans-serif',
      cssName: 'Arial, Helvetica, sans-serif',
      description: 'Modern sans-serif'
    },
    { 
      label: 'Verdana', 
      value: 'Verdana, Geneva, sans-serif',
      cssName: 'Verdana, Geneva, sans-serif',
      description: 'Readable sans-serif'
    },
    { 
      label: 'Courier New', 
      value: '"Courier New", "Monaco", "Menlo", monospace',
      cssName: '"Courier New", "Monaco", "Menlo", monospace',
      description: 'Monospace font'
    }
  ];

  // Get current font family from selection
  const getCurrentFontFamily = () => {
    if (!editor) return 'Default';
    const { fontFamily } = editor.getAttributes('fontFamily');
    if (!fontFamily) return 'Default';
    const font = fontFamilies.find(f => f.value === fontFamily);
    return font ? font.label : 'Default';
  };

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
    if (!editor) return;
    
    if (fontValue === null) {
      // Remove font family mark
      editor.chain().focus().unsetFontFamily().run();
    } else {
      // Apply font family mark to selection
      editor.chain().focus().setFontFamily(fontValue).run();
    }
    
    setIsFontDropdownOpen(false);
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
    <ToolbarContainer theme={theme}>
      <ToolbarGroup theme={theme}>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          theme={theme}
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          theme={theme}
        >
          <Redo size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup theme={theme}>
        <Select theme={theme}
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

      <ToolbarGroup theme={theme}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
          theme={theme}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
          theme={theme}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
          theme={theme}
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
          theme={theme}
        >
          <Strikethrough size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup theme={theme}>
        <DropdownContainer ref={fontDropdownRef} theme={theme}>
          <DropdownButton
            onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
            title="Font Family"
            theme={theme}
          >
            <Type size={16} />
            {getCurrentFontFamily()}
            <ChevronDown size={14} />
          </DropdownButton>
          {isFontDropdownOpen && (
            <DropdownMenu theme={theme} style={{ minWidth: '200px', maxHeight: '400px', overflowY: 'auto' }}>
              {fontFamilies.map((font, index) => {
                const isSelected = getCurrentFontFamily() === font.label;
                return (
                  <DropdownItem
                    key={index}
                    onClick={() => handleFontChange(font.value)}
                    theme={theme}
                    style={{
                      backgroundColor: isSelected ? theme.dropdownSelected : 'transparent',
                      color: isSelected ? theme.dropdownSelectedText : theme.textSecondary,
                      padding: '12px 16px',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      borderBottom: `1px solid ${theme.borderLight}`
                    }}
                  >
                    <div style={{ 
                      fontWeight: isSelected ? 'bold' : 'normal',
                      fontSize: '14px',
                      fontFamily: font.cssName || 'inherit',
                      marginBottom: '2px'
                    }}>
                      {font.label}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: theme.textMuted, 
                      fontStyle: 'italic'
                    }}>
                      {font.description}
                    </div>
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          )}
        </DropdownContainer>
      </ToolbarGroup>

      <ToolbarGroup theme={theme}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
          theme={theme}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
          theme={theme}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup theme={theme}>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
          theme={theme}
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
          theme={theme}
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
          theme={theme}
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
          theme={theme}
        >
          <AlignJustify size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup theme={theme}>
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          title="Add Link"
          theme={theme}
        >
          <Link size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={testLatexInsertion}
          title="Test LaTeX (Debug)"
          theme={theme}
        >
          <Calculator size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={insertCodeBlock}
          title="Insert Code Block"
          theme={theme}
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={insertLatexBlock}
          title="Insert LaTeX Block (English → LaTeX)"
          theme={theme}
        >
          <FileTextIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={insertImage}
          title="Insert Image"
          theme={theme}
        >
          <ImageIcon size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup theme={theme}>
        <DropdownContainer theme={theme}>
          <DropdownButton
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            title="Export Document"
            theme={theme}
          >
            <Download size={16} />
            Export
            <ChevronDown size={14} />
          </DropdownButton>
          {isExportDropdownOpen && (
            <DropdownMenu theme={theme}>
              <DropdownItem onClick={handleExportPdf} theme={theme}>
                <Download size={14} />
                Export as PDF
              </DropdownItem>
              <DropdownItem onClick={handleExportLatex} theme={theme}>
                <FileText size={14} />
                Export as LaTeX
              </DropdownItem>
            </DropdownMenu>
          )}
        </DropdownContainer>
      </ToolbarGroup>

      <ToolbarGroup theme={theme}>
        <ToolbarButton
          onClick={toggleTheme}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          theme={theme}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </ToolbarButton>
      </ToolbarGroup>
    </ToolbarContainer>
  );
}

export default Toolbar; 