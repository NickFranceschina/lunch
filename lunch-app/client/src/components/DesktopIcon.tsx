import React from 'react';
import './DesktopIcon.css';

interface DesktopIconProps {
  name: string;
  position: { top: number; left: number };
  icon: React.ReactNode;
  onClick: () => void;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({ name, position, icon, onClick }) => {
  return (
    <div 
      className="desktop-icon" 
      onClick={onClick}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="icon-image">
        {icon}
      </div>
      <div className="icon-label">{name}</div>
    </div>
  );
};

export default DesktopIcon; 