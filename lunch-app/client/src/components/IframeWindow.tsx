import React, { useState, useRef, useEffect } from 'react';
import './IframeWindow.css';
import useDraggable from '../hooks/useDraggable';

interface IframeWindowProps {
  title: string;
  url: string;
  width?: number;
  height?: number;
  isVisible: boolean;
  onClose: () => void;
}

interface Size {
  width: number;
  height: number;
}

const IframeWindow: React.FC<IframeWindowProps> = ({ 
  title, 
  url, 
  width = 800, 
  height = 600, 
  isVisible, 
  onClose 
}) => {
  // Create state for storing the current window size
  const [windowSize, setWindowSize] = useState<Size>({ width, height });
  const [resizing, setResizing] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState<Size>({ width, height });
  
  // Initialize position
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - windowSize.width) / 2),
    y: Math.max(0, (window.innerHeight - windowSize.height) / 2)
  };

  const { position, containerRef, dragHandleRef } = useDraggable(
    `iframe-window-${title.replace(/\s+/g, '-').toLowerCase()}`, 
    initialPosition, 
    true
  );

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ width: windowSize.width, height: windowSize.height });
  };

  // Handle resize move and end events
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!resizing) return;
      
      // Calculate new size based on mouse movement
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      // Enforce minimum size constraints
      const newWidth = Math.max(300, resizeStartSize.width + deltaX);
      const newHeight = Math.max(200, resizeStartSize.height + deltaY);
      
      setWindowSize({ width: newWidth, height: newHeight });
    };
    
    const handleResizeEnd = () => {
      setResizing(false);
    };
    
    if (resizing) {
      // Add global event listeners for move and mouseup
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizing, resizeStartPos, resizeStartSize]);

  // Save window size to sessionStorage
  useEffect(() => {
    if (isVisible) {
      sessionStorage.setItem(`window_size_${title.replace(/\s+/g, '-').toLowerCase()}`, 
        JSON.stringify(windowSize));
    }
  }, [windowSize, isVisible, title]);

  // Load saved window size from sessionStorage on mount
  useEffect(() => {
    const savedSize = sessionStorage.getItem(`window_size_${title.replace(/\s+/g, '-').toLowerCase()}`);
    if (savedSize) {
      try {
        const parsed = JSON.parse(savedSize);
        setWindowSize(parsed);
      } catch (e) {
        console.error('Failed to parse saved window size:', e);
      }
    }
  }, [title]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="iframe-window"
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${windowSize.width}px`,
        height: `${windowSize.height}px`,
        cursor: resizing ? 'se-resize' : 'default'
      }}
      ref={containerRef}
    >
      <div 
        className="title-bar"
        ref={dragHandleRef}
      >
        <div className="title-bar-text">
          {title}
        </div>
        <div className="title-bar-controls">
          <button aria-label="Minimize">_</button>
          <button aria-label="Maximize">□</button>
          <button aria-label="Close" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="window-body">
        <div className="iframe-container">
          <iframe 
            src={url} 
            title={title}
            className="iframe-content"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-popups"
          ></iframe>
        </div>
      </div>
      
      {/* Resize handle */}
      <div 
        className="resize-handle"
        onMouseDown={handleResizeStart}
      ></div>
    </div>
  );
};

export default IframeWindow; 