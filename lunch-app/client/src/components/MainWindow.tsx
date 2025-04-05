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
import { socketIOService } from '../services/socketio.service';
import { useWebSocket } from '../services/WebSocketContext';
import { User } from '../types/User';
import { Group } from '../types/Group';
import useDraggable from '../hooks/useDraggable';
import './MainWindow.css';

interface MainWindowProps {
  isVisible: boolean;
  toggleVisibility: () => void;
}

const MainWindow: React.FC<MainWindowProps> = ({ isVisible, toggleVisibility }) => {
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  // Get initial dialog visibility states from sessionStorage
  const initialLoginDialogVisible = sessionStorage.getItem('window_visibility_login') === 'true';
  const initialRestaurantPanelVisible = sessionStorage.getItem('window_visibility_restaurant') === 'true';
  const initialUserPanelVisible = sessionStorage.getItem('window_visibility_user') === 'true';
  const initialGroupPanelVisible = sessionStorage.getItem('window_visibility_group') === 'true';
  
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(initialLoginDialogVisible);
  const [showRestaurantPanel, setShowRestaurantPanel] = useState<boolean>(initialRestaurantPanelVisible);
  const [showUserPanel, setShowUserPanel] = useState<boolean>(initialUserPanelVisible);
  const [showGroupPanel, setShowGroupPanel] = useState<boolean>(initialGroupPanelVisible);
  
  // Get initial chat visibility states - these depend on having recipient/group data
  const initialUserChatVisible = sessionStorage.getItem('window_visibility_user_chat') === 'true';
  const initialGroupChatVisible = sessionStorage.getItem('window_visibility_group_chat') === 'true';
  
  const [currentUser, setCurrentUser] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [currentGroup, setCurrentGroup] = useState<number | null>(null);
  const [token, setToken] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showStatus, setShowStatus] = useState<boolean>(false);
  const [yesVotes, setYesVotes] = useState<number>(0);
  const [noVotes, setNoVotes] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Chat state
  const [showUserChat, setShowUserChat] = useState<boolean>(initialUserChatVisible);
  const [showGroupChat, setShowGroupChat] = useState<boolean>(initialGroupChatVisible);
  const [chatWithUser, setChatWithUser] = useState<User | null>(null);
  const [groupChatData, setGroupChatData] = useState<Group | null>(null);
  const [pendingGroupMessage, setPendingGroupMessage] = useState<any>(null);

  // Use draggable hook
  // Set skipCentering to true and pass our own initial position for the window
  // to prevent the "jump" effect
  const initialPosition = {
    x: Math.max(0, (window.innerWidth - 600) / 2), // 600px is the window width
    y: Math.max(0, window.innerHeight / 3)
  };
  const { position, containerRef, dragHandleRef, resetPosition } = useDraggable('main-window', initialPosition, true);

  // Get the WebSocketContext
  const { isConnected, sendMessage, addMessageListener } = useWebSocket();

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
      sessionStorage.setItem('chat_user_id', userId.toString());
    } catch (error) {
      console.error('Failed to get user data:', error);
    }
  };

  const handleCloseUserChat = () => {
    setShowUserChat(false);
    setChatWithUser(null);
    sessionStorage.removeItem('chat_user_id');
  };

  const handleStartGroupChat = async (initialMessage?: any) => {
    if (!currentGroup) {
      console.error('Cannot start group chat: No current group selected');
      showStatusMessage('Unable to start group chat: No group selected', 3000);
      return;
    }
    
    console.log('Starting group chat for group ID:', currentGroup);
    
    // Use the WebSocketContext to check connection status
    if (!isConnected && token) {
      console.log('MainWindow - Ensuring Socket.IO connection before opening chat');
      try {
        await socketIOService.connect(token);
      } catch (error) {
        console.error('MainWindow - Failed to connect Socket.IO before chat:', error);
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
      
      // Store the pending message if provided
      if (initialMessage) {
        setPendingGroupMessage(initialMessage);
      }
      
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
    setPendingGroupMessage(null);
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

  // Connect to Socket.IO when logged in
  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;
    let pingInterval: NodeJS.Timeout | undefined;
    let connectionRetryCount = 0;
    let connectionRetryTimeout: NodeJS.Timeout | undefined;
    
    if (isLoggedIn && token) {
      console.log("MainWindow - Attempting Socket.IO connection with token:", token.substring(0, 10) + "...");
      
      // Ensure socketIOService is connected
      const ensureConnection = async () => {
        if (!socketIOService.isConnected()) {
          try {
            console.log('MainWindow - Connecting to Socket.IO...');
            await socketIOService.connect(token);
            setWsConnected(true);
            console.log('MainWindow - Socket.IO connected successfully');
            showStatusMessage('Connected to server');
            // Reset retry count on successful connection
            connectionRetryCount = 0;
          } catch (error) {
            console.error('MainWindow - Failed to connect to Socket.IO:', error);
            setWsConnected(false);
            
            // Increment retry count
            connectionRetryCount++;
            
            // Show appropriate message based on retry count
            if (connectionRetryCount === 1) {
              showStatusMessage('Having trouble connecting to server. Retrying...', 5000);
            } else if (connectionRetryCount > 3) {
              showStatusMessage('Connection issues persist. The app will work in limited mode.', 8000);
            }
            
            // Try to reconnect with exponential backoff, but max 3 retries
            if (connectionRetryCount <= 3) {
              const delay = Math.min(2000 * Math.pow(2, connectionRetryCount - 1), 8000);
              console.log(`MainWindow - Will retry connection in ${delay}ms (attempt ${connectionRetryCount})`);
              
              if (connectionRetryTimeout) {
                clearTimeout(connectionRetryTimeout);
              }
              
              connectionRetryTimeout = setTimeout(() => {
                console.log(`MainWindow - Retrying connection (attempt ${connectionRetryCount})`);
                ensureConnection();
              }, delay);
            }
          }
        } else {
          setWsConnected(true);
          console.log('MainWindow - Socket.IO already connected');
        }
      };
      
      // First ensure we're connected
      ensureConnection().then(() => {
        // Fetch current restaurant and vote counts if user is part of a group
        if (currentGroup) {
          // First, check if there's an active restaurant selection
          try {
            console.log('Fetching current restaurant selection for group:', currentGroup);
            restaurantService.getCurrentRestaurant(currentGroup, token)
              .then((response: { 
                restaurant: { name: string },
                isConfirmed: boolean,
                yesVotes: number,
                noVotes: number,
                activeUsers: number
              }) => {
                if (response.restaurant) {
                  console.log('Current restaurant selection:', response.restaurant);
                  setRestaurantName(response.restaurant.name);
                  setConfirmed(response.isConfirmed);
                  setYesVotes(response.yesVotes || 0);
                  setNoVotes(response.noVotes || 0);
                  
                  // Set total users with fallback to a reasonable number 
                  // (at least 3 users in a group or the sum of current votes)
                  const minUserCount = Math.max(3, (response.yesVotes || 0) + (response.noVotes || 0));
                  setTotalUsers(response.activeUsers || minUserCount);
                  
                  // Don't set hasVoted to true here, so the new user can still vote
                }
              })
              .catch((error: Error) => {
                console.error('Failed to fetch current restaurant:', error);
                // Non-critical error, don't show to user
              });
            
            // We can't fetch users in group directly, so we use a fallback approach
            // Assume at least 3 people in the group as a fallback
            if (!totalUsers) {
              setTotalUsers(3);
            }
          } catch (error) {
            console.error('Error requesting current restaurant:', error);
          }
        }
        
        // Setup message listeners directly from socketIOService - define locally to avoid dependency issues
        const setupLocalListeners = () => {
          // Set up listeners for restaurant selections - using socketIOService directly
          const restaurantListener = socketIOService.addMessageListener('restaurant_selection', (data) => {
            console.log('Received restaurant_selection in MainWindow:', data);
            handleRestaurantUpdate(data);
          });

          // Also listen for alternative event names the server might use
          const randomRestaurantListener = socketIOService.addMessageListener('random_restaurant', (data) => {
            console.log('Received random_restaurant in MainWindow:', data);
            handleRestaurantUpdate(data);
          });

          const restaurantUpdateListener = socketIOService.addMessageListener('restaurant_update', (data) => {
            console.log('Received restaurant_update in MainWindow:', data);
            handleRestaurantUpdate(data);
          });

          // Unified handler for restaurant updates in any format
          const handleRestaurantUpdate = (data: any) => {
            // Try to extract restaurant data from different possible formats
            const restaurantName = 
              // Format 1: { restaurant: { name: 'Restaurant Name' } }
              (data?.restaurant?.name) || 
              // Format 2: { name: 'Restaurant Name' }
              (data?.name) ||
              // Format 3: Just the name as a string
              (typeof data === 'string' ? data : null) ||
              // Format 4: { data: { restaurant: { name: 'Restaurant Name' } } }
              (data?.data?.restaurant?.name) ||
              // Format 5: { data: { name: 'Restaurant Name' } } 
              (data?.data?.name) ||
              // Format 6: { restaurant: 'Restaurant Name' } - restaurant is directly a string
              (typeof data?.restaurant === 'string' ? data.restaurant : null);

            // Log what we found
            console.log('Extracted restaurant name:', restaurantName);
            
            if (restaurantName) {
              setRestaurantName(restaurantName);
              
              // Extract other data with fallbacks
              const isConfirmed = data?.isConfirmed || data?.confirmed || data?.data?.isConfirmed || false;
              const yesVotes = data?.yesVotes || data?.data?.yesVotes || 0;
              const noVotes = data?.noVotes || data?.data?.noVotes || 0;
              
              setConfirmed(isConfirmed);
              setYesVotes(yesVotes);
              setNoVotes(noVotes);
              
              // Reset voting state when new restaurant is selected
              setHasVoted(false);
              
              showStatusMessage(`Restaurant selected: ${restaurantName}`);
              console.log('Updated UI with new restaurant:', restaurantName);
            } else {
              console.error('Could not extract restaurant name from data:', data);
            }
          };
          
          // Set up listeners for vote updates - using socketIOService directly
          const voteListener = socketIOService.addMessageListener('vote_update', (data) => {
            console.log('Received vote update in MainWindow:', data);
            if (data) {
              // Update vote counts
              setYesVotes(data.yesVotes || 0);
              setNoVotes(data.noVotes || 0);
              setConfirmed(data.isConfirmed || false);
              
              // Show a status message about the vote
              const username = data.username || 'Someone';
              const voteText = data.vote ? 'yes' : 'no';
              showStatusMessage(`${username} voted ${voteText}`);
            }
          });
          
          // Set up listeners for notifications - using socketIOService directly
          const notificationListener = socketIOService.addMessageListener('notification', (data) => {
            console.log('Received notification in MainWindow:', data);
            if (data && data.message) {
              showStatusMessage(data.message);
            }
          });
          
          // Listen for group messages to auto-open chat window
          const groupMessageListener = socketIOService.addMessageListener('group_message', (data) => {
            console.log('Received group message in MainWindow:', data);
            // If group chat isn't already open, open it with the triggering message
            if (!showGroupChat && data && data.groupId === currentGroup) {
              console.log('Auto-opening group chat window for incoming message:', data);
              handleStartGroupChat(data);
            }
          });
          
          // Return a cleanup function to remove all listeners
          return () => {
            restaurantListener();
            randomRestaurantListener();
            restaurantUpdateListener();
            voteListener();
            notificationListener();
            groupMessageListener();
          };
        };
        
        // Set up the listeners
        cleanupFunction = setupLocalListeners();
        
        // Set up a ping interval to keep the connection alive
        pingInterval = setInterval(() => {
          if (socketIOService.isConnected()) {
            socketIOService.sendPing();
          } else {
            console.log('MainWindow - Socket.IO disconnected, attempting to reconnect...');
            ensureConnection();
          }
        }, 30000); // Send ping every 30 seconds
      });
    }
    
    // Cleanup function to remove event listeners and clear intervals
    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
      
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      
      if (connectionRetryTimeout) {
        clearTimeout(connectionRetryTimeout);
      }
    };
  }, [isLoggedIn, token, currentGroup, totalUsers]);

  // Add useEffect to check for existing session on component mount
  useEffect(() => {
    // Check if there's a valid session in sessionStorage
    const storedToken = sessionStorage.getItem('token');
    const storedUserId = sessionStorage.getItem('userId');
    const storedUsername = sessionStorage.getItem('username');
    const storedIsAdmin = sessionStorage.getItem('isAdmin');
    const storedGroupId = sessionStorage.getItem('groupId');
    
    // If we have the basic session data, restore the session
    if (storedToken && storedUserId && storedUsername) {
      console.log('Restoring session for user:', storedUsername);
      setIsLoggedIn(true);
      setCurrentUser(storedUsername);
      setCurrentUserId(parseInt(storedUserId, 10));
      setToken(storedToken);
      setIsAdmin(storedIsAdmin === 'true');
      
      // Restore group if available
      if (storedGroupId) {
        setCurrentGroup(parseInt(storedGroupId, 10));
      }
      
      showStatusMessage(`Welcome back, ${storedUsername}!`);
    }
    
    // Mark initialization as complete after checking session
    setIsInitialized(true);
  }, []); // Empty dependency array means this runs once on mount

  // Handle login
  const handleLoginClick = () => {
    setShowLoginDialog(true);
  };

  const handleLoginSubmit = async (username: string, password: string) => {
    try {
      // Trim username and password to prevent errors from whitespace
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      
      const response = await authService.login(trimmedUsername, trimmedPassword);
      setIsLoggedIn(true);
      setCurrentUser(trimmedUsername);
      setCurrentUserId(response.user.id);
      setToken(response.token);
      setIsAdmin(response.user.isAdmin);
      
      // Set current group if available
      if (response.user.currentGroupId) {
        setCurrentGroup(response.user.currentGroupId);
      } else if (response.user.groups && response.user.groups.length > 0) {
        setCurrentGroup(response.user.groups[0].id);
      }
      
      // Save token and user data to sessionStorage for reconnection
      sessionStorage.setItem('token', response.token);
      sessionStorage.setItem('userId', response.user.id.toString());
      sessionStorage.setItem('username', trimmedUsername);
      sessionStorage.setItem('isAdmin', response.user.isAdmin.toString());
      if (response.user.currentGroupId) {
        sessionStorage.setItem('groupId', response.user.currentGroupId.toString());
      } else if (response.user.groups && response.user.groups.length > 0) {
        sessionStorage.setItem('groupId', response.user.groups[0].id.toString());
      }
      
      setShowLoginDialog(false);
      showStatusMessage(`Welcome, ${trimmedUsername}!`);
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
      
      // Ensure Socket.IO is disconnected
      if (socketIOService && isConnected) {
        socketIOService.disconnect();
      }
      
      // Reset connection state first
      setWsConnected(false);
      
      // Close all chat and administration windows
      setShowRestaurantPanel(false);
      setShowUserPanel(false);
      setShowGroupPanel(false);
      setShowUserChat(false);
      setShowGroupChat(false);
      setChatWithUser(null);
      setGroupChatData(null);
      
      // Then clear auth state
      setIsLoggedIn(false);
      setCurrentUser('');
      setCurrentUserId(0);
      setCurrentGroup(null);
      setRestaurantName('');
      setConfirmed(false);
      setToken('');
      setIsAdmin(false);
      
      // Clear sessionStorage data
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('isAdmin');
      sessionStorage.removeItem('groupId');
      sessionStorage.removeItem('chat_user_id');
      
      // Clear all window positions
      clearAllWindowPositions();
      
      // Clear all window visibility states
      clearAllWindowVisibility();
      
      showStatusMessage('You have been logged out');
    } catch (error) {
      console.error('Logout failed:', error);
      showStatusMessage('Logout failed', 5000);
    }
  };

  // Function to clear all saved window positions
  const clearAllWindowPositions = () => {
    // Get all keys from sessionStorage
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('window_position_')) {
        keys.push(key);
      }
    }
    
    // Remove all window position entries
    keys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log(`Cleared ${keys.length} saved window positions`);
  };

  // Function to clear all saved window visibility settings
  const clearAllWindowVisibility = () => {
    // Get all keys from sessionStorage
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('window_visibility_')) {
        keys.push(key);
      }
    }
    
    // Remove all window visibility entries
    keys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log(`Cleared ${keys.length} saved window visibility states`);
  };

  // Update sessionStorage when window visibility changes
  useEffect(() => {
    sessionStorage.setItem('window_visibility_login', showLoginDialog.toString());
  }, [showLoginDialog]);
  
  useEffect(() => {
    sessionStorage.setItem('window_visibility_restaurant', showRestaurantPanel.toString());
  }, [showRestaurantPanel]);
  
  useEffect(() => {
    sessionStorage.setItem('window_visibility_user', showUserPanel.toString());
  }, [showUserPanel]);
  
  useEffect(() => {
    sessionStorage.setItem('window_visibility_group', showGroupPanel.toString());
  }, [showGroupPanel]);
  
  useEffect(() => {
    sessionStorage.setItem('window_visibility_user_chat', showUserChat.toString());
  }, [showUserChat]);
  
  useEffect(() => {
    sessionStorage.setItem('window_visibility_group_chat', showGroupChat.toString());
  }, [showGroupChat]);

  // Restore user chat state if needed
  useEffect(() => {
    const savedChatUserId = sessionStorage.getItem('chat_user_id');
    
    if (initialUserChatVisible && savedChatUserId && isLoggedIn && token) {
      // Only try to restore if we're logged in
      handleStartUserChat(parseInt(savedChatUserId, 10));
    }
  }, [isLoggedIn, token, initialUserChatVisible]);
  
  // Restore group chat state if needed
  useEffect(() => {
    if (initialGroupChatVisible && currentGroup && isLoggedIn && token) {
      // Only try to restore if we're logged in and have a current group
      handleStartGroupChat();
    }
  }, [isLoggedIn, token, currentGroup, initialGroupChatVisible]);

  // Function to close all open windows except the main window
  const closeAllWindows = () => {
    // Close all admin panels
    setShowRestaurantPanel(false);
    setShowUserPanel(false);
    setShowGroupPanel(false);
    
    // Close all chat windows
    setShowUserChat(false);
    setShowGroupChat(false);
    setChatWithUser(null);
    setGroupChatData(null);
    
    showStatusMessage('All windows closed');
  };

  // Update vote functions
  const handleVoteYes = async () => {
    if (hasVoted) {
      showStatusMessage('You have already voted');
      return;
    }
    
    if (!currentGroup) {
      showStatusMessage('You need to be in a group to vote');
      return;
    }
    
    try {
      // Connect if needed
      if (!socketIOService.isConnected() && token) {
        showStatusMessage('Connecting to server...', 1000);
        try {
          await socketIOService.connect(token);
        } catch (error) {
          console.error('Failed to connect before voting:', error);
        }
      }
      
      // Optimistically update UI
      setHasVoted(true);
      setYesVotes(prevYesVotes => prevYesVotes + 1); // Increment yes votes locally
      showStatusMessage('You voted Yes!');
      
      // Use socketIOService directly with the groupId
      socketIOService.sendMessage('vote', { 
        vote: true,
        groupId: currentGroup
      });
    } catch (error) {
      // Revert optimistic updates on error
      setHasVoted(false);
      setYesVotes(prevYesVotes => Math.max(0, prevYesVotes - 1));
      
      console.error('Error sending vote:', error);
      showStatusMessage('Failed to send vote. Please try again.', 3000);
    }
  };
  
  const handleVoteNo = async () => {
    if (hasVoted) {
      showStatusMessage('You have already voted');
      return;
    }
    
    if (!currentGroup) {
      showStatusMessage('You need to be in a group to vote');
      return;
    }
    
    try {
      // Connect if needed
      if (!socketIOService.isConnected() && token) {
        showStatusMessage('Connecting to server...', 1000);
        try {
          await socketIOService.connect(token);
        } catch (error) {
          console.error('Failed to connect before voting:', error);
        }
      }
      
      // Optimistically update UI
      setHasVoted(true);
      setNoVotes(prevNoVotes => prevNoVotes + 1); // Increment no votes locally
      showStatusMessage('You voted No!');
      
      // Use socketIOService directly with the groupId
      socketIOService.sendMessage('vote', { 
        vote: false,
        groupId: currentGroup
      });
    } catch (error) {
      // Revert optimistic updates on error
      setHasVoted(false);
      setNoVotes(prevNoVotes => Math.max(0, prevNoVotes - 1));
      
      console.error('Error sending vote:', error);
      showStatusMessage('Failed to send vote. Please try again.', 3000);
    }
  };
  
  const handleNewRandom = async () => {
    if (!currentGroup) {
      showStatusMessage('You need to be in a group to request a random restaurant');
      return;
    }
    
    try {
      // Connect if needed
      if (!socketIOService.isConnected() && token) {
        showStatusMessage('Connecting to server...', 1000);
        try {
          await socketIOService.connect(token);
        } catch (error) {
          console.error('Failed to connect for random restaurant request:', error);
        }
      }
      
      console.log('Requesting new random restaurant for group:', currentGroup);
      
      // Optimistically update UI before server responds
      setRestaurantName('Requesting...');
      showStatusMessage('Requesting new random restaurant selection');
      
      // Reset votes locally before server response
      setHasVoted(false);
      setYesVotes(0);
      setNoVotes(0);
      
      // Send the request with the group ID
      socketIOService.requestRandomRestaurant(currentGroup);
      
      // Safety timeout - if server doesn't respond in 5 seconds, try to fetch restaurant data directly
      setTimeout(() => {
        // Only run this if we're still showing "Requesting..."
        if (restaurantName === 'Requesting...') {
          console.log('No server response after timeout, fetching restaurant directly...');
          
          // Try to fetch current restaurant through REST API
          restaurantService.getCurrentRestaurant(currentGroup, token)
            .then((response: { 
              restaurant: { name: string },
              isConfirmed: boolean,
              yesVotes: number,
              noVotes: number,
              activeUsers: number
            }) => {
              if (response.restaurant && response.restaurant.name) {
                console.log('Fetched current restaurant directly:', response.restaurant);
                setRestaurantName(response.restaurant.name);
                setConfirmed(response.isConfirmed);
                setYesVotes(response.yesVotes || 0);
                setNoVotes(response.noVotes || 0);
                showStatusMessage(`Restaurant selected: ${response.restaurant.name}`);
              } else {
                // If we cannot fetch a restaurant, show an error
                setRestaurantName('Error - please try again');
                showStatusMessage('Failed to get restaurant selection. Please try again.', 3000);
              }
            })
            .catch((error) => {
              console.error('Failed to fetch current restaurant directly:', error);
              setRestaurantName('Error - please try again');
              showStatusMessage('Failed to get restaurant selection. Please try again.', 3000);
            });
        }
      }, 5000);
    } catch (error) {
      console.error('Error requesting random restaurant:', error);
      showStatusMessage('Failed to request random restaurant. Please try again.', 3000);
    }
  };

  return isVisible && isInitialized ? (
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
          <div className="title-bar-text">
            <img src="/favicon.ico" alt="Lunch App" width="20" height="20" className="title-icon" />
            LUNCH
          </div>
          <div className="title-bar-controls">
            <button aria-label="Minimize">_</button>
            <button aria-label="Maximize">□</button>
            <button aria-label="Close" onClick={toggleVisibility}>×</button>
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
                  
                  <div className="menu-item">
                    <button className="menu-button">Window</button>
                    <div className="dropdown-content">
                      <button onClick={closeAllWindows}>Close All Windows</button>
                      <button onClick={clearAllWindowPositions}>Reset Window Positions</button>
                      <button onClick={() => {
                        clearAllWindowPositions();
                        clearAllWindowVisibility();
                        showStatusMessage('All window settings reset');
                      }}>Reset All Windows</button>
                    </div>
                  </div>
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
                <div className="header-row">
                  <div className="lunch-served">
                    <span>Lunch is Served:</span>
                  </div>
                  <LEDIndicator 
                    confirmed={confirmed} 
                    yesVotes={yesVotes}
                    noVotes={noVotes}
                  />
                </div>
                
                <RestaurantDisplay restaurantName={restaurantName}>
                  {currentGroup && (
                    <div className="vote-counts">
                      <span className="vote-icon">👍 {yesVotes}</span>
                      <span className="vote-separator">|</span>
                      <span className="vote-icon">👎 {noVotes}</span>
                      <span className="vote-separator">|</span>
                      <span className="vote-icon">⏳ {confirmed ? 0 : totalUsers - yesVotes - noVotes}</span>
                    </div>
                  )}
                </RestaurantDisplay>
                
                <VotingControls 
                  onVoteYes={handleVoteYes} 
                  onVoteNo={handleVoteNo} 
                  onNewRandom={handleNewRandom}
                  enabled={isLoggedIn && wsConnected && !hasVoted && restaurantName !== '' && restaurantName !== 'Requesting...' && !confirmed}
                  newRandomEnabled={isLoggedIn}
                />
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '40px' }}>
                Please login to use the application
              </div>
            )}
          </div>
        </div>
        
        <StatusBar 
          message={
            isLoggedIn && statusMessage === '' ? 
            (confirmed ? 'Status: Confirmed' : 
             (yesVotes + noVotes === 0 ? 'Waiting for votes' : 
              (totalUsers <= yesVotes + noVotes ? 'All votes received' : 'Voting in progress'))) 
            : statusMessage
          } 
          isVisible={showStatus || isLoggedIn}
          username={currentUser}
        />
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
          initialMessage={pendingGroupMessage}
        />
      )}
    </div>
  ) : null;
};

export default MainWindow; 