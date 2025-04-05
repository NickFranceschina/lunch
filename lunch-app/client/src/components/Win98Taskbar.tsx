import React, { useState, useEffect, useRef } from 'react';
import './Win98Taskbar.css';
import externalApps from '../data/externalApps';

interface Win98TaskbarProps {
  toggleMainWindowVisibility: () => void;
  toggleHelpWindowVisibility: () => void;
}

const Win98Taskbar: React.FC<Win98TaskbarProps> = ({ 
  toggleMainWindowVisibility,
  toggleHelpWindowVisibility
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const startMenuRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  
  // Toggle start menu
  const toggleStartMenu = () => {
    setStartMenuOpen(!startMenuOpen);
  };

  // Open GitHub link
  const openGitHubRepo = () => {
    window.open('https://github.com/NickFranceschina/lunch', '_blank');
  };

  // Toggle external app windows
  const toggleExternalApp = (id: string) => {
    const currentVisibility = sessionStorage.getItem(`window_visibility_${id}`) === 'true';
    sessionStorage.setItem(`window_visibility_${id}`, (!currentVisibility).toString());
    
    // Dispatch a custom event to notify the ExternalApps component
    window.dispatchEvent(new CustomEvent('toggle_app', { 
      detail: { id, visible: !currentVisibility } 
    }));
    
    // Close the start menu
    setStartMenuOpen(false);
  };

  // Close start menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        startMenuOpen && 
        startMenuRef.current && 
        startButtonRef.current && 
        !startMenuRef.current.contains(event.target as Node) &&
        !startButtonRef.current.contains(event.target as Node)
      ) {
        setStartMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [startMenuOpen]);
  
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

  // Listen for external app toggle events
  useEffect(() => {
    const handleExternalAppToggle = (event: CustomEvent) => {
      // This component doesn't need to do anything with this event,
      // but we dispatch it so the ExternalApps component can handle it
    };

    window.addEventListener('toggle_app', handleExternalAppToggle as EventListener);
    return () => {
      window.removeEventListener('toggle_app', handleExternalAppToggle as EventListener);
    };
  }, []);

  return (
    <div className="win98-taskbar">
      <div className="win98-taskbar-start">
        <button 
          className={`win98-start-button ${startMenuOpen ? 'active' : ''}`}
          onClick={toggleStartMenu}
          ref={startButtonRef}
        >
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
        
        {/* Start Menu */}
        {startMenuOpen && (
          <div className="win98-start-menu" ref={startMenuRef}>
            <div className="start-menu-banner">
              <span className="windows-text">Start Me Up</span>
            </div>
            
            <div className="start-menu-items">
              {/* Lunch App */}
              <div 
                className="start-menu-item"
                onClick={() => {
                  toggleMainWindowVisibility();
                  setStartMenuOpen(false);
                }}
              >
                <div className="start-menu-icon">
                  <img src="/favicon.ico" alt="Lunch App" width="16" height="16" />
                </div>
                <span>Lunch</span>
              </div>
              
              {/* Help */}
              <div 
                className="start-menu-item"
                onClick={() => {
                  toggleHelpWindowVisibility();
                  setStartMenuOpen(false);
                }}
              >
                <div className="start-menu-icon">
                  <svg width="16" height="16" viewBox="0 0 32 32">
                    <rect x="4" y="6" width="24" height="20" fill="#FFFFE1" stroke="#000000" strokeWidth="1" />
                    <rect x="4" y="6" width="24" height="3" fill="#000080" stroke="#000000" strokeWidth="1" />
                    <rect x="6" y="11" width="20" height="2" fill="#000000" />
                    <rect x="6" y="15" width="20" height="2" fill="#000000" />
                    <rect x="6" y="19" width="14" height="2" fill="#000000" />
                    <circle cx="23" cy="20" r="3" fill="#FF0000" stroke="#000000" strokeWidth="1" />
                    <text x="22" y="22" fontSize="4" fill="white" textAnchor="middle" dominantBaseline="middle">?</text>
                  </svg>
                </div>
                <span>Help</span>
              </div>
              
              {/* GitHub */}
              <div 
                className="start-menu-item"
                onClick={() => {
                  openGitHubRepo();
                  setStartMenuOpen(false);
                }}
              >
                <div className="start-menu-icon">
                  <svg width="16" height="16" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="15" fill="#000000" stroke="white" strokeWidth="2" />
                    <path
                      d="M16 3C8.83 3 3 8.83 3 16C3 21.55 6.66 26.22 11.73 27.88C12.33 28 12.58 27.64 12.58 27.32C12.58 27.03 12.57 26.11 12.57 25.09C9 25.81 8.21 23.54 8.21 23.54C7.59 22.03 6.69 21.67 6.69 21.67C5.5 20.85 6.77 20.87 6.77 20.87C8.07 20.96 8.79 22.18 8.79 22.18C10 24.23 11.92 23.6 12.61 23.28C12.73 22.42 13.09 21.79 13.48 21.44C10.56 21.09 7.49 19.96 7.49 15.12C7.49 13.72 8.01 12.57 8.81 11.67C8.68 11.37 8.22 9.98 9 8.24C9 8.24 10.08 7.91 12.56 9.55C13.67 9.27 14.84 9.13 16 9.13C17.16 9.13 18.33 9.27 19.44 9.55C21.92 7.91 23 8.24 23 8.24C23.78 9.98 23.32 11.37 23.19 11.67C23.99 12.57 24.51 13.72 24.51 15.12C24.51 19.97 21.44 21.08 18.5 21.43C19 21.86 19.44 22.7 19.44 24C19.44 25.85 19.43 26.92 19.43 27.32C19.43 27.64 19.67 28.01 20.28 27.88C25.34 26.22 29 21.55 29 16C29 8.83 23.17 3 16 3Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <span>GitHub</span>
              </div>
              
              {/* Separator */}
              <div className="start-menu-separator"></div>
              
              {/* External Apps */}
              {externalApps.map(app => (
                <div 
                  key={app.id}
                  className="start-menu-item"
                  onClick={() => toggleExternalApp(app.id)}
                >
                  <div className="start-menu-icon" dangerouslySetInnerHTML={{ __html: app.icon.replace('width="32"', 'width="16"').replace('height="32"', 'height="16"') }} />
                  <span>{app.name}</span>
                </div>
              ))}
              
              {/* Separator */}
              <div className="start-menu-separator"></div>
              
              {/* Shutdown option */}
              <div className="start-menu-item shutdown-item">
                <div className="start-menu-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="7" fill="#c0c0c0" stroke="#808080" />
                    <rect x="7" y="3" width="2" height="6" fill="#808080" />
                  </svg>
                </div>
                <span>Shut Down...</span>
              </div>
            </div>
          </div>
        )}
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