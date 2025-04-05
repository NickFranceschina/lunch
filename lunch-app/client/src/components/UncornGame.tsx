import React from 'react';
import './UncornGame.css';
import useDraggable from '../hooks/useDraggable';

interface UncornGameProps {
  isVisible: boolean;
  onClose: () => void;
}

const UncornGame: React.FC<UncornGameProps> = ({ isVisible, onClose }) => {
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - 800) / 2),
    y: Math.max(0, (window.innerHeight - 600) / 2)
  };

  const { position, containerRef, dragHandleRef } = useDraggable('uncorn-game', initialPosition, true);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="uncorn-game-window"
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`
      }}
      ref={containerRef}
    >
      <div 
        className="title-bar"
        ref={dragHandleRef}
      >
        <div className="title-bar-text">
          Uncorn's Adventure
        </div>
        <div className="title-bar-controls">
          <button aria-label="Minimize">_</button>
          <button aria-label="Maximize">□</button>
          <button aria-label="Close" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="window-body">
        <div className="game-container">
          <iframe 
            src="https://nickfranceschina.github.io/uncorn-adventure/" 
            title="Uncorn's Adventure"
            className="game-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-popups"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default UncornGame; 