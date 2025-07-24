import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Type, FileText } from 'lucide-react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #e1e5e9;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const ModalContent = styled.div`
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const HelpText = styled.div`
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  line-height: 1.5;
`;

const TextArea = styled.textarea`
  flex: 1;
  min-height: 200px;
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s ease;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-wrap: break-word;
  
  &:focus {
    border-color: #4285f4;
    box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const ModalFooter = styled.div`
  padding: 24px;
  border-top: 1px solid #e1e5e9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const Button = styled.button`
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: #4285f4;
  color: white;
  
  &:hover:not(:disabled) {
    background: #3367d6;
    transform: translateY(-1px);
  }
`;

const SecondaryButton = styled(Button)`
  background: #f3f4f6;
  color: #374151;
  
  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
`;

const CharacterCount = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-left: auto;
`;

const LaTeXBlockModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [englishText, setEnglishText] = useState('');
  const [editorRef, setEditorRef] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [isProofMode, setIsProofMode] = useState(false);
  const textAreaRef = useRef(null);

  // Handle modal open/close events
  useEffect(() => {
    const handleOpenModal = (event) => {
      const { editor, currentText, currentLatex, nodePos, isProofMode } = event.detail;
      setEditorRef(editor);
      setEnglishText(currentText || '');
      setEditingNode(nodePos !== undefined ? { pos: nodePos, latex: currentLatex } : null);
      setIsProofMode(isProofMode || false);
      setIsOpen(true);
    };

    window.addEventListener('openLatexBlockModal', handleOpenModal);
    return () => {
      window.removeEventListener('openLatexBlockModal', handleOpenModal);
    };
  }, []);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textAreaRef.current) {
      setTimeout(() => {
        textAreaRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setEnglishText('');
    setEditorRef(null);
    setEditingNode(null);
    setIsProofMode(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!englishText.trim() || !editorRef) return;

    if (editingNode !== null) {
      // Update existing node
      const tr = editorRef.state.tr;
      tr.setNodeMarkup(editingNode.pos, null, {
        originalText: englishText.trim(),
        latexCode: '',
        isProcessing: true,
        isRendered: false,
        errorMessage: '',
      });
      editorRef.view.dispatch(tr);
    } else {
      // Insert new LaTeX block
      editorRef.commands.insertLatexBlock(englishText.trim());
    }

    handleClose();
  }, [englishText, editorRef, editingNode, handleClose]);

  const handleKeyDown = useCallback((event) => {
    // Ctrl/Cmd + Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            <FileText size={20} />
            {editingNode 
              ? (isProofMode ? 'Edit Proof Block' : 'Edit LaTeX Block')
              : (isProofMode ? 'Create Proof Block' : 'Create LaTeX Block')
            }
          </ModalTitle>
          <CloseButton onClick={handleClose}>
            <X size={18} />
          </CloseButton>
        </ModalHeader>

        <ModalContent>
          <HelpText>
            <strong>
              {isProofMode 
                ? 'Enter your proof steps below and they will be converted to LaTeX.'
                : 'Enter your English text below and it will be converted to LaTeX.'
              }
            </strong>
            <br />
            {isProofMode ? (
              <>
                • Structure your proof with clear steps (Given, To prove, Steps, Therefore)
                <br />
                • Use logical connectives like "and", "or", "implies", "therefore"
                <br />
                • Mathematical statements will be formatted properly
                <br />
                • Each line becomes a separate step in your proof
              </>
            ) : (
              <>
                • Use line breaks to separate different expressions
                <br />
                • Mathematical expressions like "square root of x plus 2" become LaTeX
                <br />
                • Add supporting text: "x^2 + y^2 = r^2 - This is a circle equation"
                <br />
                • The AI will format your text into proper mathematical notation
              </>
            )}
          </HelpText>

          <TextArea
            ref={textAreaRef}
            value={englishText}
            onChange={(e) => setEnglishText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isProofMode 
              ? `Enter your proof here...

Press Ctrl+Enter to convert to LaTeX`
              : `Enter your English text here...

Examples:
• The derivative of x squared is 2x
• The square root of a squared plus b squared
• If p and q then r, by modus ponens
• The integral from 0 to infinity of e to the power of negative x

Press Ctrl+Enter to convert to LaTeX`
            }
          />
        </ModalContent>

        <ModalFooter>
          <div>
            <CharacterCount>
              {englishText.length} characters
            </CharacterCount>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <SecondaryButton onClick={handleClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton 
              onClick={handleSubmit}
              disabled={!englishText.trim()}
            >
              <Type size={16} />
              {editingNode 
                ? (isProofMode ? 'Update Proof' : 'Update LaTeX')
                : (isProofMode ? 'Create Proof' : 'Convert to LaTeX')
              }
            </PrimaryButton>
          </div>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default LaTeXBlockModal; 