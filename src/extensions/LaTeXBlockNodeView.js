import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';

const LaTeXBlockNodeView = ({ node, updateAttributes, getPos, editor }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [localState, setLocalState] = useState({
    isProcessing: node.attrs.isProcessing || false,
    isRendered: node.attrs.isRendered || false,
    latexCode: node.attrs.latexCode || '',
    error: node.attrs.errorMessage || null
  });
  const renderRef = useRef(null);
  const processingTimeoutRef = useRef(null);

  const { originalText } = node.attrs;

  // Parse dash-separated content
  const parseDashSeparatedContent = useCallback((text) => {
    if (!text) return { latexPart: '', textPart: '' };
    
    // Handle multi-line input by processing each line
    const lines = text.split('\n');
    const annotations = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      const dashIndex = trimmedLine.indexOf(' - ');
      if (dashIndex !== -1) {
        const annotation = trimmedLine.substring(dashIndex + 3).trim();
        if (annotation) {
          annotations.push(annotation);
        }
      }
    }
    
    // Join all annotations with line breaks
    const textPart = annotations.join('\n');
    
    return {
      latexPart: '', // Not used in current implementation
      textPart
    };
  }, []);

  // Sync local state with node attributes on prop changes
  useEffect(() => {
    setLocalState(prev => ({
      ...prev,
      isProcessing: node.attrs.isProcessing || false,
      isRendered: node.attrs.isRendered || false,
      latexCode: node.attrs.latexCode || '',
      error: node.attrs.errorMessage || null
    }));
  }, [node.attrs.isProcessing, node.attrs.isRendered, node.attrs.latexCode, node.attrs.errorMessage]);

  // Convert English to LaTeX
  const convertEnglishToLatex = async (englishText) => {
    try {
      const response = await fetch('http://localhost:8000/api/convert-latex-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          englishText: englishText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.latexCode;
    } catch (error) {
      console.error('Error converting English to LaTeX:', error);
      throw new Error('Failed to convert English to LaTeX. Please check your connection and try again.');
    }
  };

  // Process English text to LaTeX when node is created or text changes
  useEffect(() => {
    if (originalText && !localState.latexCode && localState.isProcessing) {
      // Check if we're already processing this specific text to avoid duplicates
      if (processingTimeoutRef.current) {
        return;
      }
      
      // Update local state to processing
      setLocalState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      // Clear any existing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      const processConversion = async () => {
        try {
          const latex = await convertEnglishToLatex(originalText);
          
          // Clear the processing timeout reference
          processingTimeoutRef.current = null;
          
          // Update local state first
          setLocalState(prev => ({
            ...prev,
            latexCode: latex,
            isProcessing: false,
            isRendered: true,
            error: null
          }));
          
          // Then update node attributes
          updateAttributes({
            latexCode: latex,
            isProcessing: false,
            isRendered: true,
            errorMessage: '',
          });
          
        } catch (error) {
          console.error('Error converting LaTeX block:', error);
          
          // Clear the processing timeout reference
          processingTimeoutRef.current = null;
          
          setLocalState(prev => ({
            ...prev,
            latexCode: '',
            isProcessing: false,
            isRendered: false,
            error: error.message
          }));
          updateAttributes({
            latexCode: '',
            isProcessing: false,
            isRendered: false,
            errorMessage: error.message,
          });
        }
      };
      
      // Process immediately
      processingTimeoutRef.current = 'processing'; // Mark as processing
      processConversion();
    }
  }, [originalText, localState.latexCode, localState.isProcessing, updateAttributes]);

  // Render LaTeX with KaTeX when we have latexCode and are rendered
  useEffect(() => {
    if (localState.latexCode && localState.isRendered && renderRef.current) {
      try {
        // Check if KaTeX is available
        if (!katex) {
          console.error('KaTeX not available');
          renderRef.current.textContent = localState.latexCode;
          return;
        }

        // For multi-line LaTeX, wrap in align environment if not already wrapped
        let renderLatex = localState.latexCode;
        
        // Check if it's multi-line LaTeX (contains \\)
        if (renderLatex.includes('\\\\') && !renderLatex.includes('\\begin{')) {
          renderLatex = `\\begin{align*}\n${renderLatex}\n\\end{align*}`;
        }
        
        const katexOptions = {
          throwOnError: false,
          output: 'html',
          displayMode: true, // Always display mode for blocks
          strict: false,
          macros: {},
          fleqn: false,  // Don't left-align equations
          trust: false
        };
        
        katex.render(renderLatex, renderRef.current, katexOptions);
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        // Fallback: try rendering without align environment
        try {
          katex.render(localState.latexCode, renderRef.current, {
            throwOnError: false,
            output: 'html',
            displayMode: true
          });
        } catch (fallbackError) {
          console.error('KaTeX fallback rendering error:', fallbackError);
          // Final fallback to plain text
          renderRef.current.textContent = localState.latexCode;
        }
      }
    }
  }, [localState.latexCode, localState.isRendered]);



  // Click handler to edit - opens modal for editing
  const handleClick = useCallback(() => {
    if (localState.isRendered || localState.error) {
      // Trigger the modal with current content
      const event = new CustomEvent('openLatexBlockModal', {
        detail: { 
          editor,
          currentText: originalText,
          currentLatex: localState.latexCode,
          nodePos: getPos()
        }
      });
      window.dispatchEvent(event);
    }
  }, [localState.isRendered, localState.error, editor, originalText, localState.latexCode, getPos]);

  // Mouse handlers for tooltip
  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current && typeof processingTimeoutRef.current !== 'string') {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // Processing state
  if (localState.isProcessing) {
    return (
      <NodeViewWrapper className="latex-block-processing">
        <div style={{
          margin: '1.5em 0',
          padding: '20px 24px',
          borderRadius: '8px',
          backgroundColor: '#e3f2fd',
          color: '#1565c0',
          fontFamily: 'serif',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
            Converting to LaTeX...
          </div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>
            {originalText.length > 100 ? `${originalText.substring(0, 100)}...` : originalText}
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ 
              width: '20px',
              height: '20px',
              border: '2px solid #2196f3',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </NodeViewWrapper>
    );
  }

  // Error state
  if (localState.error) {
    return (
      <NodeViewWrapper 
        className="latex-block-error"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <div style={{
          margin: '1.5em 0',
          padding: '20px 24px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          fontFamily: 'serif',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
            LaTeX Block Error
          </div>
          <div style={{ fontSize: '13px', marginBottom: '12px' }}>
            {localState.error}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, fontStyle: 'italic' }}>
            Original text: {originalText.length > 200 ? `${originalText.substring(0, 200)}...` : originalText}
          </div>
          <div style={{ fontSize: '11px', marginTop: '12px', opacity: 0.7 }}>
            Click to edit
          </div>
        </div>
        {showTooltip && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            marginBottom: '8px'
          }}>
            Click to edit LaTeX block
          </div>
        )}
      </NodeViewWrapper>
    );
  }

  // Rendered state
  if (localState.isRendered && localState.latexCode) {
    const { textPart } = parseDashSeparatedContent(originalText);
    
    return (
      <NodeViewWrapper 
        className="latex-block-rendered"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '1.5em 0',
          padding: '20px 24px',
          backgroundColor: 'transparent',
          transition: 'all 0.2s ease',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%',
          overflowX: 'hidden',
          minHeight: textPart ? '60px' : 'auto'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div 
          ref={renderRef} 
          style={{
            flex: 1,
            textAlign: 'center',
            lineHeight: '1.6',
            overflowX: 'hidden',
            overflowY: 'visible',
            maxWidth: '100%',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            paddingRight: textPart ? '20px' : '0'
          }}
        />
        {textPart && (
          <div style={{
            width: '200px',
            fontSize: '16px',
            lineHeight: '1.5',
            color: 'inherit',
            flexShrink: 0,
            whiteSpace: 'pre-line'
          }}>
            {textPart}
          </div>
        )}
        {showTooltip && (
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000
          }}>
            Click to edit LaTeX block
          </div>
        )}
        </div>
      </NodeViewWrapper>
    );
  }

  // Fallback for unprocessed state
  return (
    <NodeViewWrapper 
      className="latex-block-placeholder"
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div style={{
        margin: '1.5em 0',
        padding: '20px 24px',
        borderRadius: '8px',
        backgroundColor: '#fff3cd',
        color: '#856404',
        fontFamily: 'serif'
      }}>
        <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
          LaTeX Block
        </div>
        <div style={{ fontSize: '13px', fontStyle: 'italic' }}>
          {originalText || 'Click to add content...'}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default LaTeXBlockNodeView; 