import React from 'react';
import './LEDIndicator.css';

interface LEDIndicatorProps {
  confirmed: boolean;
}

const LEDIndicator: React.FC<LEDIndicatorProps> = ({ confirmed }) => {
  return (
    <div className="led-container">
      <div className={`led ${confirmed ? 'led-green' : 'led-red'}`} />
      <span className="led-label">Confirmed:</span>
    </div>
  );
};

export default LEDIndicator; 