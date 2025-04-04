import React, { useState, useEffect, useCallback } from 'react';
import LEDIndicator from './LEDIndicator';
import RestaurantDisplay from './RestaurantDisplay';
import VotingControls from './VotingControls';
import LoginDialog from './LoginDialog';
import RestaurantPanel from './RestaurantPanel';
import UserPanel from './UserPanel';
import GroupPanel from './GroupPanel';
import StatusBar from './StatusBar';
import { authService, restaurantService } from '../services/api';
import { websocketService } from '../services/websocket.service';
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
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showStatus, setShowStatus] = useState<boolean>(false);

  // Show status message with auto-hide after delay
  const showStatusMessage = (message: string, duration: number = 3000) => {
    setStatusMessage(message);
    setShowStatus(true);
    
    // Auto-hide after duration (return to "Ready" state)
    const timer = setTimeout(() => {
      setShowStatus(false);
      setStatusMessage('');  // Clear the message when hiding
    }, duration);
    
    return () => clearTimeout(timer);
  };

  // Set up WebSocket event listeners
  const setupWebSocketListeners = useCallback(() => {
    // Listen for restaurant selection updates
    const selectionUnsubscribe = websocketService.addMessageListener('restaurant_selection', (data: any) => {
      setRestaurantName(data.restaurantName);
      setConfirmed(data.confirmed);
    });

    // Listen for vote updates
    const voteUnsubscribe = websocketService.addMessageListener('vote_update', (data: any) => {
      console.log('Vote update:', data);
      // You could update a UI element showing who voted
    });

    // Listen for notifications
    const notificationUnsubscribe = websocketService.addMessageListener('notification', (data: any) => {
      showStatusMessage(data.message, 5000);
    });

    // Return cleanup function
    return () => {
      selectionUnsubscribe();
      voteUnsubscribe();
      notificationUnsubscribe();
    };
  }, []);

  // Connect to WebSocket when logged in
  useEffect(() => {
    if (isLoggedIn && token) {
      console.log("Attempting WebSocket connection with token:", token.substring(0, 10) + "...");
      
      websocketService.connect(token)
        .then(() => {
          setWsConnected(true);
          console.log('WebSocket connected successfully');
          showStatusMessage('Connected to server');
          
          // Send periodic pings to keep connection alive
          const pingInterval = setInterval(() => {
            if (isLoggedIn) {
              websocketService.ping();
            } else {
              clearInterval(pingInterval);
            }
          }, 30000); // Every 30 seconds
          
          return () => {
            clearInterval(pingInterval);
          };
        })
        .catch(error => {
          console.error('WebSocket connection failed:', error);
          setWsConnected(false);
          showStatusMessage('Failed to connect to server', 5000);
        });
      
      // Set up listeners
      const unsubscribe = setupWebSocketListeners();
      
      // Clean up on unmount or logout
      return () => {
        console.log("Cleaning up WebSocket connection");
        unsubscribe();
        if (wsConnected) {
          websocketService.disconnect();
          setWsConnected(false);
        }
      };
    }
  }, [isLoggedIn, token, setupWebSocketListeners, wsConnected]);

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
      
      // Save token to localStorage for reconnection
      localStorage.setItem('token', response.token);
      
      setShowLoginDialog(false);
      showStatusMessage(`Welcome, ${username}!`);
    } catch (error) {
      console.error('Login failed:', error);
      showStatusMessage('Login failed. Please check your credentials.', 5000);
    }
  };

  const handleLoginCancel = () => {
    setShowLoginDialog(false);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout(token);
      // Disconnect WebSocket
      websocketService.disconnect();
      setWsConnected(false);
      
      // Clear auth state
      setIsLoggedIn(false);
      setCurrentUser('');
      setCurrentUserId(0);
      setCurrentGroup(null);
      setRestaurantName('');
      setConfirmed(false);
      setToken('');
      setIsAdmin(false);
      
      // Remove token from localStorage
      localStorage.removeItem('token');
      showStatusMessage('You have been logged out');
    } catch (error) {
      console.error('Logout failed:', error);
      showStatusMessage('Logout failed', 5000);
    }
  };

  // Voting functions using WebSocket
  const handleVoteYes = async () => {
    if (!currentGroup) return;
    
    if (wsConnected) {
      // Send vote through WebSocket
      websocketService.sendVote(true);
      showStatusMessage('Your vote was cast');
    } else {
      // Fallback to REST API
      try {
        const response = await restaurantService.voteYes(currentGroup, token);
        setConfirmed(response.isConfirmed);
        showStatusMessage('Your vote was cast');
      } catch (error) {
        console.error('Failed to vote yes:', error);
        showStatusMessage('Failed to vote yes', 5000);
      }
    }
  };

  const handleVoteNo = async () => {
    if (!currentGroup) return;
    
    if (wsConnected) {
      // Send vote through WebSocket
      websocketService.sendVote(false);
      showStatusMessage('Your vote was cast');
    } else {
      // Fallback to REST API
      try {
        const response = await restaurantService.voteNo(currentGroup, token);
        setConfirmed(response.isConfirmed);
        showStatusMessage('Your vote was cast');
      } catch (error) {
        console.error('Failed to vote no:', error);
        showStatusMessage('Failed to vote no', 5000);
      }
    }
  };

  const handleNewRandom = async () => {
    if (!currentGroup) return;
    
    if (wsConnected) {
      // Send new random request through WebSocket
      websocketService.sendNewRandom(currentGroup);
      showStatusMessage('Selecting a new random restaurant...');
    } else {
      // Fallback to REST API
      try {
        const response = await restaurantService.getRandomRestaurant(currentGroup, token);
        setRestaurantName(response.restaurant.name);
        setConfirmed(false);
        showStatusMessage(`New restaurant selected: ${response.restaurant.name}`);
      } catch (error) {
        console.error('Failed to get random restaurant:', error);
        showStatusMessage('Failed to get random restaurant', 5000);
      }
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
    <div className="win98-container">
      <div className="win98-titlebar">
        <div className="titlebar-text">Lunch App</div>
      </div>
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
          {wsConnected && <div className="ws-indicator">🔄</div>}
        </div>

        <RestaurantDisplay restaurantName={restaurantName} />
        
        <VotingControls
          enabled={isLoggedIn}
          onVoteYes={handleVoteYes}
          onVoteNo={handleVoteNo}
          onNewRandom={handleNewRandom}
        />
      </div>
      
      <StatusBar 
        message={statusMessage} 
        isVisible={showStatus}
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
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default MainWindow; 