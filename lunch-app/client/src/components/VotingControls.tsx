import React from 'react';
import './VotingControls.css';

interface VotingControlsProps {
  enabled: boolean;
  newRandomEnabled: boolean;
  onVoteYes: () => void;
  onVoteNo: () => void;
  onNewRandom: () => void;
}

const VotingControls: React.FC<VotingControlsProps> = ({
  enabled,
  newRandomEnabled,
  onVoteYes,
  onVoteNo,
  onNewRandom
}) => {
  return (
    <div className="voting-controls">
      <button 
        className="vote-button" 
        disabled={!enabled}
        onClick={onVoteYes}
      >
        Vote Yes
      </button>
      <button 
        className="vote-button" 
        disabled={!enabled}
        onClick={onVoteNo}
      >
        Vote No
      </button>
      <button 
        className="vote-button" 
        disabled={!newRandomEnabled}
        onClick={onNewRandom}
      >
        New Random
      </button>
    </div>
  );
};

export default VotingControls; 