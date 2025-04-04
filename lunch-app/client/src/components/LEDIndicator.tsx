import React from 'react';
import './LEDIndicator.css';

interface LEDIndicatorProps {
  confirmed: boolean;
  currentUser?: string;
  yesVotes?: number;
  noVotes?: number;
}

const LEDIndicator: React.FC<LEDIndicatorProps> = ({ 
  confirmed, 
  currentUser, 
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
      <div className={`led ${getLedClass()}`} />
      <span className="led-label">
        {currentUser ? `${currentUser} - ` : ''}
        Status: {confirmed ? 'Confirmed' : (yesVotes + noVotes === 0 ? 'Waiting for votes' : 'Voting in progress')}
      </span>
    </div>
  );
};

export default LEDIndicator; 