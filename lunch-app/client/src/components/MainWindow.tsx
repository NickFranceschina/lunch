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
import useDraggable from '../hooks/useDraggable';
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

  // Use draggable hook
  const { position, containerRef, dragHandleRef, resetPosition } = useDraggable();

  // Handle toggle functions
  const handleRestaurantPanelToggle = () => {
    setShowRestaurantPanel(!showRestaurantPanel);
  };

  const handleUserPanelToggle = () => {
    setShowUserPanel(!showUserPanel);
  };

  const handleGroupPanelToggle = () => {
    setShowGroupPanel(!showGroupPanel);
  };

  const handleStartUserChat = async (userId: number) => {
    try {
      const userData = await userService.getUserById(userId, token);
      setChatWithUser(userData);
      setShowUserChat(true);
    } catch (error) {
      console.error('Failed to get user data:', error);
    }
  };

  const handleCloseUserChat = () => {
    setShowUserChat(false);
    setChatWithUser(null);
  };

  const handleStartGroupChat = async () => {
    if (!currentGroup) {
      console.error('Cannot start group chat: No current group selected');
      showStatusMessage('Unable to start group chat: No group selected', 3000);
      return;
    }
    
    console.log('Starting group chat for group ID:', currentGroup);
    
    // Ensure WebSocket connection is active before opening chat
    if (!websocketService.isConnected() && token) {
      console.log('MainWindow - Ensuring WebSocket connection before opening chat');
      try {
        await websocketService.connect(token);
        setWsConnected(websocketService.isConnected());
      } catch (error) {
        console.error('MainWindow - Failed to connect WebSocket before chat:', error);
        // Continue anyway, the GroupChat will try to reconnect
      }
    }
    
    try {
      const response = await groupService.getGroupById(currentGroup, token);
      
      if (!response.success || !response.data) {
        console.error('Failed to get group data:', response);
        showStatusMessage('Unable to load group chat data', 3000);
        return;
      }
      
      const groupData = response.data;
      
      // Validate group data
      if (!groupData.id) {
        console.error('Invalid group data received:', groupData);
        showStatusMessage('Invalid group data received', 3000);
        return;
      }
      
      console.log('Loaded group data for chat:', groupData);
      
      // Don't disconnect WebSocket when opening chat
      setGroupChatData(groupData);
      setShowGroupChat(true);
    } catch (error) {
      console.error('Failed to get group data:', error);
      showStatusMessage('Failed to load group chat', 3000);
    }
  };

  const handleCloseGroupChat = () => {
    setShowGroupChat(false);
    setGroupChatData(null);
  };

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
      console.log("MainWindow - Attempting WebSocket connection with token:", token.substring(0, 10) + "...");
      
      // Clean up any existing message listeners before reconnecting
      websocketService.clearMessageListeners('restaurant_selection');
      websocketService.clearMessageListeners('vote_update');
      websocketService.clearMessageListeners('notification');
      websocketService.clearMessageListeners('chat_message');
      
      // Connect to WebSocket
      websocketService.connect(token)
        .then(() => {
          setWsConnected(true);
          console.log('MainWindow - WebSocket connected successfully');
          showStatusMessage('Connected to server');
          
          // Add event listeners after successful connection
          const selectionUnsubscribe = websocketService.addMessageListener('restaurant_selection', (data: any) => {
            setRestaurantName(data.restaurantName);
            setConfirmed(data.confirmed);
          });
          
          const voteUnsubscribe = websocketService.addMessageListener('vote_update', (data: any) => {
            console.log('MainWindow - Vote update:', data);
          });
          
          const notificationUnsubscribe = websocketService.addMessageListener('notification', (data: any) => {
            showStatusMessage(data.message, 5000);
          });
          
          const chatUnsubscribe = websocketService.addMessageListener('chat_message', (data: any) => {
            console.log('MainWindow - Received chat notification for message:', data);
            
            // Enhanced handling of incoming chat messages
            if (data.groupId) {
              // This is a group chat message
              console.log('MainWindow - Received group message:', {
                groupId: data.groupId,
                currentGroup: currentGroup,
                chatOpen: showGroupChat,
                sender: data.senderName || data.username,
                content: data.message?.substring(0, 20) + (data.message?.length > 20 ? '...' : '')
              });
              
              // Show notification
              showStatusMessage(`New group chat message from ${data.senderName || data.username}`, 3000);
              
              // Auto-open group chat window when a group message is received
              // and this message belongs to our current group
              if (!showGroupChat && currentGroup === data.groupId) {
                console.log('Auto-opening group chat for message from:', 
                  data.senderName || data.username);
                
                handleStartGroupChat();
              }
            } else {
              // This is a direct message
              showStatusMessage(`New chat message from ${data.senderName || data.username}`, 3000);
              
              // Could add handling for direct messages here too
              console.log('MainWindow - Received direct message from:', data.senderName || data.username);
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
            console.log("MainWindow - Cleaning up event listeners");
            selectionUnsubscribe();
            voteUnsubscribe();
            notificationUnsubscribe();
            chatUnsubscribe();
            clearInterval(pingInterval);
            
            // Only disconnect if no active chat windows (this was causing the disconnection issue)
            if (!showGroupChat && !showUserChat) {
              console.log("MainWindow - Cleaning up WebSocket connection - no active chat windows");
              websocketService.disconnect();
              setWsConnected(false);
            } else {
              console.log("MainWindow - Keeping WebSocket connection active for chat windows");
            }
          };
        })
        .catch(error => {
          console.error('MainWindow - WebSocket connection failed:', error);
          setWsConnected(false);
          showStatusMessage('Failed to connect to server', 5000);
        });
    } else if (!isLoggedIn && websocketService.isConnected()) {
      // Ensure connection is closed when user logs out
      console.log("MainWindow - Disconnecting WebSocket due to logout");
      websocketService.disconnect();
      setWsConnected(false);
    }
    
    // Return cleanup function
    return () => {
      if (cleanupFunction) {
        console.log("MainWindow - Unmounting, cleaning up WebSocket listeners");
        cleanupFunction();
      }
    };
  }, [isLoggedIn, token, currentGroup, showGroupChat, showUserChat]);

  // Reset position when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      resetPosition();
    }, 100);
    return () => clearTimeout(timer);
  }, []); // Only run on mount, not when resetPosition changes

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
      
      // Save token and user data to localStorage for reconnection
      localStorage.setItem('token', response.token);
      localStorage.setItem('userId', response.user.id.toString());
      localStorage.setItem('username', username);
      
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
      
      // Clear localStorage data
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      
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
        showStatusMessage('Selected a new random restaurant');
      } catch (error) {
        console.error('Failed to get random restaurant:', error);
        showStatusMessage('Failed to select a new restaurant', 5000);
      }
    }
  };

  return (
    <div className="main-window-container">
      <div
        className="main-window"
        style={{
          position: 'absolute',
          top: `${position.y}px`,
          left: `${position.x}px`
        }}
        ref={containerRef}
      >
        <div 
          className="title-bar"
          ref={dragHandleRef}
        >
          <div className="title-bar-text">LUNCH</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize">_</button>
            <button aria-label="Maximize">□</button>
            <button aria-label="Close">×</button>
          </div>
        </div>
        
        <div className="window-body">
          <div className="top-section">
            <div className="menu-bar">
              <div className="menu-item">
                <button className="menu-button">{isLoggedIn ? 'File' : 'File'}</button>
                <div className="dropdown-content">
                  {isLoggedIn ? (
                    <button onClick={handleLogout}>Logout</button>
                  ) : (
                    <button onClick={handleLoginClick}>Login</button>
                  )}
                </div>
              </div>
              
              {isLoggedIn && (
                <>
                  <div className="menu-item">
                    <button className="menu-button">Chat</button>
                    <div className="dropdown-content">
                      <button onClick={handleStartGroupChat}>Group Chat</button>
                      <button onClick={handleUserPanelToggle}>User Chat</button>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="menu-item">
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
            
            {wsConnected && (
              <div className="ws-indicator">●</div>
            )}
          </div>
          
          <div className="application-content">
            {isLoggedIn ? (
              <>
                <RestaurantDisplay restaurantName={restaurantName} />
                <div style={{ marginTop: '20px' }}>
                  <LEDIndicator confirmed={confirmed} currentUser={currentUser} />
                </div>
                <VotingControls 
                  onVoteYes={handleVoteYes} 
                  onVoteNo={handleVoteNo} 
                  onNewRandom={handleNewRandom}
                  enabled={isLoggedIn && wsConnected}
                />
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '40px' }}>
                Please login to use the application
              </div>
            )}
          </div>
        </div>
        
        <StatusBar message={statusMessage} isVisible={showStatus} />
      </div>
      
      <LoginDialog
        isVisible={showLoginDialog}
        onLogin={handleLoginSubmit}
        onCancel={handleLoginCancel}
      />
      
      {showRestaurantPanel && (
        <RestaurantPanel
          token={token}
          onClose={() => setShowRestaurantPanel(false)}
          isVisible={showRestaurantPanel}
          groupId={currentGroup || undefined}
        />
      )}
      
      {showUserPanel && (
        <UserPanel
          token={token}
          onClose={() => setShowUserPanel(false)}
          onStartChat={handleStartUserChat}
          isVisible={showUserPanel}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
      )}
      
      {showGroupPanel && (
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