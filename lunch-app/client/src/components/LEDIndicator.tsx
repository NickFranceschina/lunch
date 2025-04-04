import React from 'react';
import './LEDIndicator.css';

interface LEDIndicatorProps {
  confirmed: boolean;
  currentUser?: string;
}

const LEDIndicator: React.FC<LEDIndicatorProps> = ({ confirmed, currentUser }) => {
  return (
    <div className="led-container">
      <div className={`led ${confirmed ? 'led-green' : 'led-red'}`} />
      <span className="led-label">
        {currentUser ? `${currentUser} - ` : ''}
        Confirmed:
      </span>
    </div>
  );
};

export default LEDIndicator; 