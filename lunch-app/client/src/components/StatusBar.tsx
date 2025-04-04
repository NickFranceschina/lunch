import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
  message: string;
  isVisible: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ message, isVisible }) => {
  // Always show the status bar, with "Ready" as the default message
  const displayMessage = (isVisible && message) ? message : 'Ready';
  
  return (
    <div className="status-bar">
      <div className="status-message">{displayMessage}</div>
    </div>
  );
};

export default StatusBar; 