import React from 'react';
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

const IframeWindow: React.FC<IframeWindowProps> = ({ 
  title, 
  url, 
  width = 800, 
  height = 600, 
  isVisible, 
  onClose 
}) => {
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - width) / 2),
    y: Math.max(0, (window.innerHeight - height) / 2)
  };

  const { position, containerRef, dragHandleRef } = useDraggable(`iframe-window-${title.replace(/\s+/g, '-').toLowerCase()}`, initialPosition, true);

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
        width: `${width}px`,
        height: `${height}px`
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
    </div>
  );
};

export default IframeWindow; 