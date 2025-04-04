import React, { useState, useEffect } from 'react';
import LEDIndicator from './LEDIndicator';
import RestaurantDisplay from './RestaurantDisplay';
import VotingControls from './VotingControls';
import LoginDialog from './LoginDialog';
import RestaurantPanel from './RestaurantPanel';
import UserPanel from './UserPanel';
import GroupPanel from './GroupPanel';
import StatusBar from './StatusBar';
import UserChat from './UserChat';
import GroupChat from './GroupChat';
import { authService, restaurantService, userService, groupService } from '../services/api';
import { websocketService } from '../services/websocket.service';
import { User } from '../types/User';
import { Group } from '../types/Group';
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
  
  // Chat state
  const [showUserChat, setShowUserChat] = useState<boolean>(false);
  const [showGroupChat, setShowGroupChat] = useState<boolean>(false);
  const [chatWithUser, setChatWithUser] = useState<User | null>(null);
  const [groupChatData, setGroupChatData] = useState<Group | null>(null);

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

  // Connect to WebSocket when logged in
  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;
    let pingInterval: NodeJS.Timeout | undefined;
    
    if (isLoggedIn && token) {
      console.log("Attempting WebSocket connection with token:", token.substring(0, 10) + "...");
      
      // Connect to WebSocket
      websocketService.connect(token)
        .then(() => {
          setWsConnected(true);
          console.log('WebSocket connected successfully');
          showStatusMessage('Connected to server');
          
          // Add event listeners after successful connection
          const selectionUnsubscribe = websocketService.addMessageListener('restaurant_selection', (data: any) => {
            setRestaurantName(data.restaurantName);
            setConfirmed(data.confirmed);
          });
          
          const voteUnsubscribe = websocketService.addMessageListener('vote_update', (data: any) => {
            console.log('Vote update:', data);
          });
          
          const notificationUnsubscribe = websocketService.addMessageListener('notification', (data: any) => {
            showStatusMessage(data.message, 5000);
          });
          
          const chatUnsubscribe = websocketService.addMessageListener('chat_message', (data: any) => {
            if (data.groupId) {
              showStatusMessage(`New group chat message from ${data.senderName}`, 3000);
            } else {
              showStatusMessage(`New chat message from ${data.senderName}`, 3000);
            }
          });
          
          // Setup ping interval
          pingInterval = setInterval(() => {
            if (websocketService.isConnected()) {
              websocketService.ping();
            }
          }, 30000);
          
          // Create cleanup function
          cleanupFunction = () => {
            selectionUnsubscribe();
            voteUnsubscribe();
            notificationUnsubscribe();
            chatUnsubscribe();
            clearInterval(pingInterval);
            websocketService.disconnect();
            setWsConnected(false);
          };
        })
        .catch(error => {
          console.error('WebSocket connection failed:', error);
          setWsConnected(false);
          showStatusMessage('Failed to connect to server', 5000);
        });
    }
    
    // Return cleanup function
    return () => {
      if (cleanupFunction) {
        console.log("Cleaning up WebSocket connection");
        cleanupFunction();
      }
    };
  }, [isLoggedIn, token]);

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
      // Only call the API logout if we have a token
      if (token) {
        await authService.logout(token);
      }
      
      // Ensure WebSocket is disconnected
      if (websocketService && wsConnected) {
        websocketService.disconnect();
      }
      
      // Reset connection state first
      setWsConnected(false);
      
      // Then clear auth state
      setIsLoggedIn(false);
      setCurrentUser('');
      setCurrentUserId(0);
      setCurrentGroup(null);
      setRestaurantName('');
      setConfirmed(false);
      setToken('');
      setIsAdmin(false);
      
      // Finally remove token from localStorage
      localStorage.removeItem('token');
      showStatusMessage('You have been logged out');
    } catch (error) {
      console.error('Logout failed:', error);
      showStatusMessage('Logout failed', 5000);
      
      // Still clear local state even if the API call fails
      setIsLoggedIn(false);
      setWsConnected(false);
      setToken('');
      localStorage.removeItem('token');
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
  
  // Chat functions
  const handleStartUserChat = async (userId: number) => {
    try {
      const response = await userService.getUserById(userId, token);
      setChatWithUser(response.data);
      setShowUserChat(true);
      setShowUserPanel(false); // Optionally close the user panel
    } catch (error) {
      console.error('Failed to get user info:', error);
      showStatusMessage('Failed to start chat', 3000);
    }
  };
  
  const handleCloseUserChat = () => {
    setShowUserChat(false);
    setChatWithUser(null);
  };
  
  const handleStartGroupChat = async () => {
    if (!currentGroup) {
      showStatusMessage('You need to be in a group to start a group chat', 3000);
      return;
    }
    
    try {
      const response = await groupService.getGroupById(currentGroup, token);
      setGroupChatData(response.data);
      setShowGroupChat(true);
    } catch (error) {
      console.error('Failed to get group info:', error);
      showStatusMessage('Failed to start group chat', 3000);
    }
  };
  
  const handleCloseGroupChat = () => {
    setShowGroupChat(false);
    setGroupChatData(null);
  };

  return (
    <div className="main-window">
      <div className="title-bar">
        <div className="title-bar-text">LUNCH Application</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      
      <div className="window-body">
        <div className="top-section">
          <div className="menu-bar">
            <div className="menu-item">
              <button 
                onClick={isLoggedIn ? handleLogout : handleLoginClick}
                className="menu-button"
              >
                {isLoggedIn ? 'Logout' : 'Login'}
              </button>
            </div>
            
            {isLoggedIn && (
              <>
                <div className="menu-item">
                  <button 
                    onClick={handleStartGroupChat}
                    className="menu-button"
                  >
                    Group Chat
                  </button>
                </div>
                
                {isAdmin && (
                  <div className="menu-item dropdown">
                    <button className="menu-button">Administer</button>
                    <div className="dropdown-content">
                      <button onClick={handleRestaurantPanelToggle}>Restaurants</button>
                      <button onClick={handleUserPanelToggle}>Users</button>
                      <button onClick={handleGroupPanelToggle}>Groups</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <LEDIndicator confirmed={confirmed} currentUser={currentUser} />
        </div>
        
        <div className="content">
          <div className="application-content">
            <RestaurantDisplay restaurantName={restaurantName} />
            <VotingControls 
              onVoteYes={handleVoteYes} 
              onVoteNo={handleVoteNo} 
              onNewRandom={handleNewRandom}
              enabled={isLoggedIn && wsConnected}
            />
          </div>
        </div>
      </div>
      
      <StatusBar 
        message={statusMessage} 
        isVisible={showStatus}
      />
      
      {showLoginDialog && (
        <LoginDialog 
          onLogin={handleLoginSubmit} 
          onCancel={handleLoginCancel} 
          isVisible={showLoginDialog}
        />
      )}
      
      {showRestaurantPanel && isLoggedIn && (
        <RestaurantPanel 
          token={token} 
          onClose={() => setShowRestaurantPanel(false)} 
          isVisible={showRestaurantPanel}
          groupId={currentGroup || undefined}
        />
      )}
      
      {showUserPanel && isLoggedIn && (
        <UserPanel 
          token={token} 
          onClose={() => setShowUserPanel(false)}
          onStartChat={handleStartUserChat}
          isVisible={showUserPanel}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
      )}
      
      {showGroupPanel && isLoggedIn && (
        <GroupPanel 
          token={token} 
          onClose={() => setShowGroupPanel(false)} 
          isVisible={showGroupPanel}
          currentUserId={currentUserId}
          currentGroupId={currentGroup || undefined}
          isAdmin={isAdmin}
        />
      )}
      
      {showUserChat && chatWithUser && (
        <UserChat 
          recipient={chatWithUser}
          onClose={handleCloseUserChat}
        />
      )}
      
      {showGroupChat && groupChatData && (
        <GroupChat
          group={groupChatData}
          onClose={handleCloseGroupChat}
        />
      )}
    </div>
  );
};

export default MainWindow; 