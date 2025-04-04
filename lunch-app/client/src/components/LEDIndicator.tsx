import React from 'react';
import './LEDIndicator.css';

interface LEDIndicatorProps {
  confirmed: boolean;
  yesVotes?: number;
  noVotes?: number;
}

const LEDIndicator: React.FC<LEDIndicatorProps> = ({ 
  confirmed, 
  yesVotes = 0, 
  noVotes = 0 
}) => {
  // Determine the LED color based on vote status
  const getLedClass = () => {
    if (confirmed) {
      return 'led-green';
    }
    
    const totalVotes = yesVotes + noVotes;
    
    // Keep yellow until we have at least 2 votes (same as confirmation threshold)
    if (totalVotes < 2) {
      return 'led-yellow';
    } else if (yesVotes > noVotes) {
      return 'led-green';
    } else if (noVotes > yesVotes) {
      return 'led-red';
    } else {
      // Equal votes
      return 'led-yellow';
    }
  };
  
  return (
    <div className="led-container">
      <span className="confirmed-label">Confirmed:</span>
      <div className={`led ${getLedClass()}`} />
    </div>
  );
};

export default LEDIndicator; 