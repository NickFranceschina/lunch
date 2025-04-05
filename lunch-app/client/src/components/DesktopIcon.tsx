import React, { useState, useRef, useEffect } from 'react';
import './DesktopIcon.css';

interface DesktopIconProps {
  name: string;
  position: { top: number; left: number };
  icon: React.ReactNode;
  onClick: () => void;
  url?: string; // URL to open in new window
}

const DesktopIcon: React.FC<DesktopIconProps> = ({ name, position, icon, onClick, url }) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleOpenInNewWindow = (e: React.MouseEvent) => {
    // Stop propagation to prevent triggering the parent's onClick
    e.stopPropagation();
    
    if (url) {
      window.open(url, '_blank');
    }
    setShowContextMenu(false);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div 
      className="desktop-icon" 
      onClick={onClick}
      onContextMenu={handleContextMenu}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="icon-image">
        {icon}
      </div>
      <div className="icon-label">{name}</div>
      
      {showContextMenu && url && (
        <div 
          className="context-menu"
          ref={contextMenuRef}
          style={{ 
            top: `${contextMenuPos.y}px`, 
            left: `${contextMenuPos.x}px` 
          }}
          // Add onClick to prevent clicks on the menu from bubbling to the desktop icon
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleOpenInNewWindow}>
            Open in new window
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopIcon; 