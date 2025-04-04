import React from 'react';
import './HelpIcon.css';

interface HelpIconProps {
  onClick: () => void;
}

const HelpIcon: React.FC<HelpIconProps> = ({ onClick }) => {
  return (
    <div className="desktop-icon help-icon" onClick={onClick}>
      <div className="icon-image">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Windows 98 Help Book Icon */}
          <rect x="4" y="6" width="24" height="20" fill="#FFFFE1" stroke="#000000" strokeWidth="1" />
          <rect x="4" y="6" width="24" height="3" fill="#000080" stroke="#000000" strokeWidth="1" />
          <rect x="6" y="11" width="20" height="2" fill="#000000" />
          <rect x="6" y="15" width="20" height="2" fill="#000000" />
          <rect x="6" y="19" width="14" height="2" fill="#000000" />
          <circle cx="23" cy="20" r="3" fill="#FF0000" stroke="#000000" strokeWidth="1" />
          <text x="22" y="22" fontSize="4" fill="white" textAnchor="middle" dominantBaseline="middle">?</text>
        </svg>
      </div>
      <div className="icon-label">Help</div>
    </div>
  );
};

export default HelpIcon; 