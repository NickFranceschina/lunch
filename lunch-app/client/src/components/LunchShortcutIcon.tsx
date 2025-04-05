import React from 'react';
import './LunchShortcutIcon.css';

interface LunchShortcutIconProps {
  onClick: () => void;
}

const LunchShortcutIcon: React.FC<LunchShortcutIconProps> = ({ onClick }) => {
  return (
    <div className="desktop-icon lunch-shortcut-icon" onClick={onClick}>
      <div className="icon-image">
        <img src="/favicon.ico" alt="Lunch App" width="32" height="32" className="shortcut-icon" />
        <div className="shortcut-arrow">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.5 14C4.5 14 4.5 8 4.5 6.5C4.5 5 5.5 4 7 4C8.5 4 14.5 4 14.5 4" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <path d="M4.5 14C4.5 14 4.5 8 4.5 6.5C4.5 5 5.5 4 7 4C8.5 4 14.5 4 14.5 4" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M11 1.5L14.5 4L11 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 1.5L14.5 4L11 7" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <div className="icon-label">Lunch</div>
    </div>
  );
};

export default LunchShortcutIcon; 