import React, { useState } from 'react';
import LEDIndicator from './LEDIndicator';
import RestaurantDisplay from './RestaurantDisplay';
import VotingControls from './VotingControls';
import LoginDialog from './LoginDialog';
import { authService, restaurantService } from '../services/api';
import './MainWindow.css';

const MainWindow: React.FC = () => {
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentGroup, setCurrentGroup] = useState<number | null>(null);

  // Handle login
  const handleLoginClick = () => {
    setShowLoginDialog(true);
  };

  const handleLoginSubmit = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password);
      setIsLoggedIn(true);
      setCurrentUser(username);
      // In a real app, we would get the group ID from the login response
      setCurrentGroup(1); // Temporary hardcoded group ID
      setShowLoginDialog(false);
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials.');
    }
  };

  const handleLoginCancel = () => {
    setShowLoginDialog(false);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setCurrentUser('');
      setCurrentGroup(null);
      setRestaurantName('');
      setConfirmed(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Voting functions
  const handleVoteYes = async () => {
    if (!currentGroup) return;
    
    try {
      await restaurantService.voteYes(currentGroup);
      setConfirmed(true);
      alert('Vote was cast');
    } catch (error) {
      console.error('Failed to vote yes:', error);
      alert('Failed to vote yes');
    }
  };

  const handleVoteNo = async () => {
    if (!currentGroup) return;
    
    try {
      await restaurantService.voteNo(currentGroup);
      alert('Vote was cast');
    } catch (error) {
      console.error('Failed to vote no:', error);
      alert('Failed to vote no');
    }
  };

  const handleNewRandom = async () => {
    if (!currentGroup) return;
    
    try {
      const response = await restaurantService.getRandomRestaurant(currentGroup);
      setRestaurantName(response.name);
      setConfirmed(false);
    } catch (error) {
      console.error('Failed to get random restaurant:', error);
      alert('Failed to get random restaurant');
    }
  };

  return (
    <div className="main-window">
      <div className="top-bar">
        <div className="menu-bar">
          <div className="menu-item">
            <span>Start</span>
            <div className="dropdown-content">
              {!isLoggedIn ? (
                <div className="dropdown-item" onClick={handleLoginClick}>Login</div>
              ) : (
                <div className="dropdown-item" onClick={handleLogout}>Logout</div>
              )}
            </div>
          </div>
          <div className="menu-item">
            <span>Administer</span>
            <div className="dropdown-content">
              <div className="dropdown-item">User Info</div>
              <div className="dropdown-item">Group Info</div>
              <div className="dropdown-item">Restaurants</div>
            </div>
          </div>
          <div className="menu-item">
            <span>About</span>
          </div>
        </div>
        <LEDIndicator confirmed={confirmed} />
      </div>

      <RestaurantDisplay restaurantName={restaurantName} />
      
      <VotingControls
        enabled={isLoggedIn}
        onVoteYes={handleVoteYes}
        onVoteNo={handleVoteNo}
        onNewRandom={handleNewRandom}
      />
      
      <LoginDialog 
        isVisible={showLoginDialog} 
        onLogin={handleLoginSubmit}
        onCancel={handleLoginCancel}
      />
    </div>
  );
};

export default MainWindow; 