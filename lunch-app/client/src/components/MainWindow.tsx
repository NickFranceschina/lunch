import React, { useState } from 'react';
import LEDIndicator from './LEDIndicator';
import RestaurantDisplay from './RestaurantDisplay';
import VotingControls from './VotingControls';
import LoginDialog from './LoginDialog';
import RestaurantPanel from './RestaurantPanel';
import UserPanel from './UserPanel';
import GroupPanel from './GroupPanel';
import { authService, restaurantService } from '../services/api';
import './MainWindow.css';

const MainWindow: React.FC = () => {
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(false);
  const [showRestaurantPanel, setShowRestaurantPanel] = useState<boolean>(false);
  const [showUserPanel, setShowUserPanel] = useState<boolean>(false);
  const [showGroupPanel, setShowGroupPanel] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [currentGroup, setCurrentGroup] = useState<number | null>(null);
  const [token, setToken] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Handle login
  const handleLoginClick = () => {
    setShowLoginDialog(true);
  };

  const handleLoginSubmit = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password);
      setIsLoggedIn(true);
      setCurrentUser(username);
      setCurrentUserId(response.user.id);
      setToken(response.token);
      setIsAdmin(response.user.isAdmin);
      
      // Set current group if available
      if (response.user.currentGroupId) {
        setCurrentGroup(response.user.currentGroupId);
      } else if (response.user.groups && response.user.groups.length > 0) {
        setCurrentGroup(response.user.groups[0].id);
      }
      
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
      await authService.logout(token);
      setIsLoggedIn(false);
      setCurrentUser('');
      setCurrentUserId(0);
      setCurrentGroup(null);
      setRestaurantName('');
      setConfirmed(false);
      setToken('');
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Voting functions
  const handleVoteYes = async () => {
    if (!currentGroup) return;
    
    try {
      const response = await restaurantService.voteYes(currentGroup, token);
      setConfirmed(response.isConfirmed);
      alert('Vote was cast');
    } catch (error) {
      console.error('Failed to vote yes:', error);
      alert('Failed to vote yes');
    }
  };

  const handleVoteNo = async () => {
    if (!currentGroup) return;
    
    try {
      const response = await restaurantService.voteNo(currentGroup, token);
      setConfirmed(response.isConfirmed);
      alert('Vote was cast');
    } catch (error) {
      console.error('Failed to vote no:', error);
      alert('Failed to vote no');
    }
  };

  const handleNewRandom = async () => {
    if (!currentGroup) return;
    
    try {
      const response = await restaurantService.getRandomRestaurant(currentGroup, token);
      setRestaurantName(response.restaurant.name);
      setConfirmed(false);
    } catch (error) {
      console.error('Failed to get random restaurant:', error);
      alert('Failed to get random restaurant');
    }
  };

  // Panel toggle functions
  const handleRestaurantPanelToggle = () => {
    setShowRestaurantPanel(!showRestaurantPanel);
  };

  const handleUserPanelToggle = () => {
    setShowUserPanel(!showUserPanel);
  };

  const handleGroupPanelToggle = () => {
    setShowGroupPanel(!showGroupPanel);
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
          {isLoggedIn && isAdmin && (
            <div className="menu-item">
              <span>Administer</span>
              <div className="dropdown-content">
                <div className="dropdown-item" onClick={handleUserPanelToggle}>User Info</div>
                <div className="dropdown-item" onClick={handleGroupPanelToggle}>Group Info</div>
                <div className="dropdown-item" onClick={handleRestaurantPanelToggle}>Restaurants</div>
              </div>
            </div>
          )}
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
      
      <RestaurantPanel
        isVisible={showRestaurantPanel}
        onClose={handleRestaurantPanelToggle}
        token={token}
        groupId={currentGroup || undefined}
      />

      <UserPanel
        isVisible={showUserPanel}
        onClose={handleUserPanelToggle}
        token={token}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />

      <GroupPanel
        isVisible={showGroupPanel}
        onClose={handleGroupPanelToggle}
        token={token}
        currentUserId={currentUserId}
        currentGroupId={currentGroup || undefined}
      />
    </div>
  );
};

export default MainWindow; 