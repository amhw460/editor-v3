import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';
import { convertToLatex } from '../services/latexService';

const LaTeXNodeView = ({ node, updateAttributes, getPos, editor }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [localState, setLocalState] = useState({
    isProcessing: node.attrs.isProcessing || false,
    isRendered: node.attrs.isRendered || false,
    latexCode: node.attrs.latexCode || '',
    error: null
  });
  const renderRef = useRef(null);
  const processingTimeoutRef = useRef(null);

  const { originalText, styleMode } = node.attrs;

  // Memoize delimiters to prevent recalculation
  const delimiters = useMemo(() => {
    switch (styleMode) {
      case 'display': return ['/(', ')/'];
      case 'text': return ['/m(', ')/'];
      case 'script': return ['/s(', ')/'];
      case 'scriptscript': return ['/ss(', ')/'];
      default: return ['/(', ')/'];
    }
  }, [styleMode]);

  // Sync local state with node attributes on prop changes
  useEffect(() => {
    setLocalState(prev => ({
      ...prev,
      isProcessing: node.attrs.isProcessing || false,
      isRendered: node.attrs.isRendered || false,
      latexCode: node.attrs.latexCode || ''
    }));
  }, [node.attrs.isProcessing, node.attrs.isRendered, node.attrs.latexCode]);

  // Process natural language to LaTeX when node is created or text changes
  useEffect(() => {
    if (originalText && !localState.latexCode) {
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
          const latex = await convertToLatex(originalText);
          
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
          });
          
        } catch (error) {
          console.error('Error converting LaTeX:', error);
          
          // Clear the processing timeout reference
          processingTimeoutRef.current = null;
          
          setLocalState(prev => ({
            ...prev,
            latexCode: originalText,
            isProcessing: false,
            isRendered: false,
            error: error.message
          }));
          updateAttributes({
            latexCode: originalText,
            isProcessing: false,
            isRendered: false,
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

        // For script and scriptscript styles, wrap the LaTeX in appropriate commands
        let renderLatex = localState.latexCode;
        if (styleMode === 'script') {
          renderLatex = `\\scriptstyle{${localState.latexCode}}`;
        } else if (styleMode === 'scriptscript') {
          renderLatex = `\\scriptscriptstyle{${localState.latexCode}}`;
        }
        
        const katexOptions = {
          throwOnError: false,
          output: 'html',
          displayMode: styleMode === 'display'
        };
        
        katex.render(renderLatex, renderRef.current, katexOptions);
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        // Fallback to plain text
        renderRef.current.textContent = localState.latexCode;
      }
    }
  }, [localState.latexCode, localState.isRendered, styleMode]);

  // Click handler to edit
  const handleClick = useCallback(() => {
    if (localState.isRendered) {
      const pos = getPos();
      if (pos !== undefined) {
        const tr = editor.state.tr;
        tr.replaceWith(pos, pos + 1, editor.schema.text(`${delimiters[0]}${originalText}${delimiters[1]}`));
        editor.view.dispatch(tr);
        
        setTimeout(() => {
          editor.commands.focus(pos);
        }, 10);
      }
    }
  }, [localState.isRendered, getPos, editor, delimiters, originalText]);

  // Mouse handlers
  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // Determine what to render based on local state
  if (localState.isProcessing) {
    return (
      <NodeViewWrapper className="latex-placeholder processing">
        <span style={{ 
          backgroundColor: '#e3f2fd',
          border: '1px dashed #2196f3',
          borderRadius: '4px',
          padding: '4px 8px',
          color: '#1565c0',
          fontFamily: 'monospace',
          fontSize: '0.9em'
        }}>
          Processing: {delimiters[0]}{originalText}{delimiters[1]}
        </span>
      </NodeViewWrapper>
    );
  }

  if (localState.isRendered && localState.latexCode) {
    return (
      <NodeViewWrapper
        className={`latex-rendered latex-${styleMode}`}
        data-latex={localState.latexCode}
        data-original={originalText}
        data-style-mode={styleMode}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ 
          display: styleMode === 'display' ? 'block' : 'inline-block',
          margin: styleMode === 'display' ? '1em 0' : '0 2px',
          padding: '2px 4px',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          border: '1px solid transparent',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <span ref={renderRef} />
        {showTooltip && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            marginBottom: '4px'
          }}>
            Click to edit: {delimiters[0]}{originalText}{delimiters[1]}
          </div>
        )}
      </NodeViewWrapper>
    );
  }

  // Fallback for unprocessed or failed processing
  return (
    <NodeViewWrapper className="latex-placeholder">
      <span style={{ 
        backgroundColor: localState.error ? '#f8d7da' : '#fff3cd',
        border: `1px dashed ${localState.error ? '#dc3545' : '#ffc107'}`,
        borderRadius: '4px',
        padding: '4px 8px',
        color: localState.error ? '#721c24' : '#856404',
        fontFamily: 'monospace',
        fontSize: '0.9em'
      }}>
        {localState.error ? `Error: ${localState.error}` : `${delimiters[0]}${originalText}${delimiters[1]}`}
      </span>
    </NodeViewWrapper>
  );
};

export default LaTeXNodeView; 