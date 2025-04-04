import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
  message: string;
  isVisible: boolean;
  username?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ message, isVisible, username }) => {
  // Always show the status bar, with "Ready" as the default message
  const displayMessage = (isVisible && message) ? message : 'Ready';
  
  return (
    <div className="status-bar">
      <div className="status-message">{displayMessage}</div>
      {username && (
        <>
          <div className="status-separator"></div>
          <div className="status-username">{username}</div>
        </>
      )}
    </div>
  );
};

export default StatusBar; 