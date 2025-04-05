import React from 'react';
import './UncornIcon.css';

interface UncornIconProps {
  onClick: () => void;
}

const UncornIcon: React.FC<UncornIconProps> = ({ onClick }) => {
  return (
    <div className="desktop-icon uncorn-icon" onClick={onClick}>
      <div className="icon-image">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Uncorn Game Icon */}
          <rect x="2" y="2" width="28" height="28" rx="5" fill="#FFC0CB" stroke="#000000" strokeWidth="1" />
          <path d="M16 5L17.5 11H22.5L18.5 15L20 21L16 17L12 21L13.5 15L9.5 11H14.5L16 5Z" fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
          <path d="M16 5L14 8L12 10L16 10L20 10L18 8L16 5Z" fill="#FF69B4" />
        </svg>
      </div>
      <div className="icon-label">Uncorn</div>
    </div>
  );
};

export default UncornIcon; 