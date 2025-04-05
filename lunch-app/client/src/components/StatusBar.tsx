import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
  message: string;
  isVisible: boolean;
  username?: string;
  groupName?: string;
  lunchTime?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ message, isVisible, username, groupName, lunchTime }) => {
  // Always show the status bar, with "Ready" as the default message
  const displayMessage = (isVisible && message) ? message : 'Ready';
  
  return (
    <div className="status-bar">
      <div className="status-message">{displayMessage}</div>
      <div className="status-right">
        {username && (
          <>
            <div className="status-separator"></div>
            <div className="status-username">{username}</div>
          </>
        )}
        {groupName && lunchTime && (
          <>
            <div className="status-separator"></div>
            <div className="status-group">{groupName} @ {lunchTime}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default StatusBar; 