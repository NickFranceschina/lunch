import React from 'react';
import './ShutdownDialog.css';

interface ShutdownDialogProps {
  isVisible: boolean;
  onCancel: () => void;
  onShutdown: () => void;
}

const ShutdownDialog: React.FC<ShutdownDialogProps> = ({ 
  isVisible, 
  onCancel, 
  onShutdown 
}) => {
  if (!isVisible) return null;

  return (
    <div className="shutdown-overlay">
      <div className="shutdown-dialog">
        <div className="shutdown-dialog-title">
          <span>Shut Down Windows</span>
          <button className="close-button" onClick={onCancel}>✕</button>
        </div>
        <div className="shutdown-dialog-content">
          <div className="shutdown-icon">
            <img 
              src="/icons/shutdown.png" 
              alt="Shutdown" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  // Fallback SVG if image fails to load
                  parent.innerHTML = `
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="14" fill="#c0c0c0" stroke="#808080" strokeWidth="1" />
                      <rect x="14" y="6" width="4" height="12" fill="#808080" />
                      <circle cx="16" cy="16" r="10" fill="none" stroke="#808080" strokeWidth="2" />
                    </svg>
                  `;
                }
              }}
            />
          </div>
          <div className="shutdown-text">
            Are you sure you want to shut down your computer?
          </div>
        </div>
        <div className="shutdown-dialog-buttons">
          <button className="win98-button" onClick={onShutdown}>Yes</button>
          <button className="win98-button" onClick={onCancel}>No</button>
        </div>
      </div>
    </div>
  );
};

export default ShutdownDialog; 