import React, { useState, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import styled from 'styled-components';

const ImageContainer = styled.div`
  position: relative;
  display: inline-block;
  max-width: 100%;
  margin: 1em 0;
  
  &.selected {
    .resize-handle {
      opacity: 1;
    }
  }
  
  &:hover {
    .resize-handle {
      opacity: 0.7;
    }
  }
`;

const ResizableImg = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  display: block;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  &.ProseMirror-selectednode {
    outline: 3px solid #4285f4;
    outline-offset: 2px;
  }
`;

const ResizeHandle = styled.div`
  position: absolute;
  width: 12px;
  height: 12px;
  background: #4285f4;
  border: 2px solid white;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: ${props => props.cursor};
  z-index: 10;
  
  &:hover {
    opacity: 1 !important;
    transform: scale(1.2);
  }
`;

const BottomRightHandle = styled(ResizeHandle)`
  bottom: -6px;
  right: -6px;
  cursor: nw-resize;
`;

const BottomLeftHandle = styled(ResizeHandle)`
  bottom: -6px;
  left: -6px;
  cursor: ne-resize;
`;

const TopRightHandle = styled(ResizeHandle)`
  top: -6px;
  right: -6px;
  cursor: ne-resize;
`;

const TopLeftHandle = styled(ResizeHandle)`
  top: -6px;
  left: -6px;
  cursor: nw-resize;
`;

const ResizableImageNodeView = ({ node, updateAttributes, selected }) => {
  const { src, alt, title, width, height } = node.attrs;
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    setStartPos({ x: e.clientX, y: e.clientY });
    
    const img = imgRef.current;
    if (img) {
      const rect = img.getBoundingClientRect();
      setStartSize({ 
        width: rect.width, 
        height: rect.height 
      });
    }
    
    const handleMouseMove = (e) => {
      if (!imgRef.current) return;
      
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      let newWidth = startSize.width;
      let newHeight = startSize.height;
      
      switch (direction) {
        case 'bottom-right':
          newWidth = Math.max(100, startSize.width + deltaX);
          newHeight = Math.max(60, startSize.height + deltaY);
          break;
        case 'bottom-left':
          newWidth = Math.max(100, startSize.width - deltaX);
          newHeight = Math.max(60, startSize.height + deltaY);
          break;
        case 'top-right':
          newWidth = Math.max(100, startSize.width + deltaX);
          newHeight = Math.max(60, startSize.height - deltaY);
          break;
        case 'top-left':
          newWidth = Math.max(100, startSize.width - deltaX);
          newHeight = Math.max(60, startSize.height - deltaY);
          break;
        default:
          break;
      }
      
      // Maintain aspect ratio if shift key is held
      if (e.shiftKey) {
        const aspectRatio = startSize.width / startSize.height;
        newHeight = newWidth / aspectRatio;
      }
      
      updateAttributes({ 
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <NodeViewWrapper>
      <ImageContainer 
        ref={containerRef}
        className={selected ? 'selected' : ''}
      >
        <ResizableImg
          ref={imgRef}
          src={src}
          alt={alt}
          title={title}
          width={width}
          height={height}
          style={{
            width: width ? `${width}px` : undefined,
            height: height ? `${height}px` : undefined,
          }}
        />
        
        {selected && (
          <>
            <TopLeftHandle
              className="resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'top-left')}
            />
            <TopRightHandle
              className="resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'top-right')}
            />
            <BottomLeftHandle
              className="resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
            />
            <BottomRightHandle
              className="resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
            />
          </>
        )}
      </ImageContainer>
    </NodeViewWrapper>
  );
};

export default ResizableImageNodeView; 