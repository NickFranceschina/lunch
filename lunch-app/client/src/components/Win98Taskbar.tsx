import React, { useState, useEffect } from 'react';
import './Win98Taskbar.css';

interface Win98TaskbarProps {
  toggleMainWindowVisibility: () => void;
}

const Win98Taskbar: React.FC<Win98TaskbarProps> = ({ toggleMainWindowVisibility }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    
    // Update immediately
    updateClock();
    
    // Set interval for updates - check every second to ensure minute changes are caught promptly
    const interval = setInterval(updateClock, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="win98-taskbar">
      <div className="win98-taskbar-start">
        <button className="win98-start-button">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            xmlns="http://www.w3.org/2000/svg" 
            className="win98-start-icon"
          >
            {/* Windows 98 Flag Logo */}
            <g>
              {/* Top-left quadrant (red) */}
              <path d="M1,1 L7,1 L7,7 L1,7 L1,1 Z" fill="#FF0000" />
              
              {/* Top-right quadrant (green) */}
              <path d="M9,1 L15,1 L15,7 L9,7 L9,1 Z" fill="#00A000" />
              
              {/* Bottom-left quadrant (blue) */}
              <path d="M1,9 L7,9 L7,15 L1,15 L1,9 Z" fill="#0000FF" />
              
              {/* Bottom-right quadrant (yellow) */}
              <path d="M9,9 L15,9 L15,15 L9,15 L9,9 Z" fill="#FFD700" />
              
              {/* Waving effect */}
              <path d="M1,1 C3,2 5,3 7,1 M9,1 C11,2 13,3 15,1" stroke="white" strokeWidth="0.7" fill="none" />
              <path d="M1,15 C3,14 5,13 7,15 M9,15 C11,14 13,13 15,15" stroke="white" strokeWidth="0.7" fill="none" />
              <path d="M1,1 C2,3 3,5 1,7 M1,9 C2,11 3,13 1,15" stroke="white" strokeWidth="0.7" fill="none" />
              <path d="M15,1 C14,3 13,5 15,7 M15,9 C14,11 13,13 15,15" stroke="white" strokeWidth="0.7" fill="none" />
            </g>
          </svg>
          <span>Start</span>
        </button>
      </div>
      <div className="win98-taskbar-middle">
        {/* Task buttons would go here if needed */}
      </div>
      <div className="win98-taskbar-tray">
        <div 
          className="win98-tray-icon lunch-icon" 
          title="Lunch App" 
          onClick={toggleMainWindowVisibility}
        >
          <img src="/favicon.ico" alt="Lunch App" width="20" height="20" />
        </div>
        <div className="win98-tray-clock">
          {currentTime}
        </div>
      </div>
    </div>
  );
};

export default Win98Taskbar; 