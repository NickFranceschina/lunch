import React, { useState, useEffect, useRef } from 'react';
import { Group } from '../types/Group';
import './GroupChat.css';
import useDraggable from '../hooks/useDraggable';
import { useWebSocket } from '../services/WebSocketContext';
import { useAuth } from '../services/AuthContext';
import { websocketService } from '../services/websocket.service';

interface GroupChatProps {
  group: Group;
  onClose: () => void;
}

interface ChatMessage {
  id?: number;
  message: string;
  senderId: number;
  senderName: string;
  timestamp: string;
  groupId: number;
}

const GroupChat: React.FC<GroupChatProps> = ({ group, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHeight = 500; // Fixed height of chat window
  const { connected } = useWebSocket();
  const { authState } = useAuth();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string>('');
  
  // Use a ref instead of state to track outgoing messages
  // This prevents useEffect dependency issues and infinite loops
  const outgoingMessageIdsRef = useRef<Set<string>>(new Set());
  
  // Use another ref to track all messages we've ever processed from this user
  // This helps prevent duplicate messages even if they come from different connections
  const seenMessagesRef = useRef<Set<string>>(new Set());
  
  // Helper function to ensure consistent sender names for messages
  const determineCorrectSenderName = (data: any): string => {
    // Get the sender name from the data
    const providedName = data.username || data.senderName || 'Unknown';
    
    // Check if this message is from the current user
    const currentUserIdNum = Number(authState.user?.id || currentUserId || 0);
    const senderIdNum = Number(data.userId || data.senderId || 0);
    
    if (senderIdNum === currentUserIdNum) {
      // This is from the current user, return 'You' for consistent display
      return 'You';
    }
    
    // For other users, use their provided name
    return providedName;
  };

  // Log group data for debugging
  useEffect(() => {
    console.log('GroupChat - Group data:', { 
      group, 
      id: group?.id, 
      name: group?.name 
    });
  }, [group]);

  // Keep track of user ID
  useEffect(() => {
    console.log('GroupChat - Current AuthState:', { 
      isAuthenticated: authState.isAuthenticated,
      hasToken: !!authState.token,
      hasUser: !!authState.user,
      userId: authState.user?.id
    });
    
    // Set current user ID from local state if authState.user is not available
    if (!currentUserId) {
      // Try to get user ID from localStorage or other parts of the app
      const localUserId = localStorage.getItem('userId');
      if (localUserId) {
        setCurrentUserId(parseInt(localUserId, 10));
      }
    }
    
    // Update currentUserId whenever authState.user changes
    if (authState.user?.id) {
      setCurrentUserId(authState.user.id);
      localStorage.setItem('userId', authState.user.id.toString());
    }
  }, [authState, currentUserId]);

  // Add auto-reconnection effect
  useEffect(() => {
    const autoConnect = async () => {
      if (!websocketService.isConnected()) {
        console.log('GroupChat - WebSocket not connected, attempting to reconnect');
        setConnectionError('Connecting...');
        
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('GroupChat - No authentication token found');
          setConnectionError('Authentication error. Please try logging in again.');
          return;
        }
        
        try {
          await websocketService.connect(token);
          console.log('GroupChat - Auto-reconnection successful');
          setIsWebSocketConnected(true);
          setConnectionError('');
        } catch (error) {
          console.error('GroupChat - Auto-reconnection failed:', error);
          setConnectionError('Failed to connect. Please try again.');
        }
      } else {
        console.log('GroupChat - WebSocket already connected');
      }
    };
    
    autoConnect();
  }, []);

  // Just check WebSocket connection status without creating our own connection
  useEffect(() => {
    const checkWsConnection = () => {
      const isConnected = websocketService.isConnected();
      setIsWebSocketConnected(isConnected);
      
      // Clear error message if connected
      if (isConnected && connectionError) {
        setConnectionError('');
      }
    };
    
    // Initial check
    checkWsConnection();
    
    // Automatically attempt reconnection on mount if not connected
    if (!websocketService.isConnected()) {
      console.log('GroupChat - Auto-reconnecting on mount');
      const token = localStorage.getItem('token');
      if (token) {
        setConnectionError('Connecting to server...');
        websocketService.connect(token)
          .then(() => {
            console.log('GroupChat - Auto-reconnection successful');
            setIsWebSocketConnected(true);
            setConnectionError('');
          })
          .catch(error => {
            console.error('GroupChat - Auto-reconnection failed:', error);
            setConnectionError('Connection failed. Click Reconnect to try again.');
          });
      }
    }
    
    // Set up interval to check connection status
    const interval = setInterval(checkWsConnection, 2000);
    
    // Listen to connection status changes
    const handleConnectionChange = (event: any) => {
      console.log('GroupChat - Connection event received:', event.detail);
      setIsWebSocketConnected(event.detail);
      if (event.detail) {
        setConnectionError('');
      }
    };
    
    window.addEventListener('websocket:connection_changed', handleConnectionChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('websocket:connection_changed', handleConnectionChange);
    };
  }, [connectionError]);

  // Function to reconnect using existing MainWindow connection
  const forceConnectionCheck = async () => {
    try {
      if (!websocketService.isConnected()) {
        const token = localStorage.getItem('token');
        if (token) {
          setConnectionError('Attempting to reconnect...');
          await websocketService.connect(token);
          const connected = websocketService.isConnected();
          setIsWebSocketConnected(connected);
          if (connected) {
            setConnectionError('');
          } else {
            setConnectionError('Reconnection failed');
          }
        } else {
          setConnectionError('No authentication token available');
        }
      } else {
        setIsWebSocketConnected(true);
        setConnectionError('');
      }
    } catch (error) {
      console.error('GroupChat - Connection check error:', error);
      setConnectionError('Connection failed');
      setIsWebSocketConnected(false);
    }
  };

  // Position at bottom right
  const initialPosition = {
    x: Math.max(20, window.innerWidth - 420),
    y: window.innerHeight - chatHeight - 5 // 5px from bottom of screen
  };
  
  const { position, containerRef, dragHandleRef } = useDraggable(initialPosition, true);
  
  // Listen for incoming messages - use message content and sender for deduplication
  useEffect(() => {
    // Function to handle new messages
    const handleChatMessage = (data: any) => {
      console.log('GroupChat received message from websocket:', data);
      
      // Only add messages from this group
      if (data && data.groupId === group.id) {
        // Create a more detailed log to track message flow
        console.log('GroupChat processing group message:', {
          messageContent: data.message,
          fromUser: data.username || data.senderName,
          userId: data.userId || data.senderId,
          isCurrentUser: String(data.userId || data.senderId) === String(authState.user?.id || currentUserId),
          groupId: data.groupId,
          timestamp: data.timestamp,
          currentGroupId: group.id
        });
        
        // Create a unique fingerprint for this message that includes all relevant data
        const messageFingerprint = `${data.userId || data.senderId}-${data.message}-${data.timestamp}`;
        
        // First check if we've already seen this exact message before
        if (seenMessagesRef.current.has(messageFingerprint)) {
          console.log('Already seen this exact message before, skipping:', messageFingerprint);
          return;
        }
        
        // Also check if this is a message we just sent ourselves
        const incomingSenderId = String(data.userId || data.senderId);
        const currentUserIdStr = String(authState.user?.id || currentUserId);
        
        if (incomingSenderId === currentUserIdStr) {
          // Create an identifier for this message to check against our outgoing IDs
          const outgoingId = `${data.timestamp}-${data.message}`;
          
          if (outgoingMessageIdsRef.current.has(outgoingId)) {
            console.log('Skipping message from server that we sent ourselves:', outgoingId);
            return;
          }
        }
        
        // Add to seen messages
        seenMessagesRef.current.add(messageFingerprint);
        
        // Limit the size of seenMessagesRef to prevent memory leaks
        if (seenMessagesRef.current.size > 1000) {
          // Convert to array, keep only the last 500 items, convert back to set
          seenMessagesRef.current = new Set(
            Array.from(seenMessagesRef.current).slice(-500)
          );
        }
        
        const message: ChatMessage = {
          message: data.message,
          senderId: Number(data.userId || data.senderId || 0),
          senderName: determineCorrectSenderName(data),
          timestamp: data.timestamp || new Date().toISOString(),
          groupId: data.groupId
        };
        
        // Enhanced deduplication logic as a final failsafe
        const currentMessages = [...messages];
        const isDuplicate = currentMessages.some((existingMsg) => {
          const contentMatch = existingMsg.message === message.message;
          const senderMatch = existingMsg.senderId === message.senderId;
          
          if (!contentMatch || !senderMatch) return false;
          
          const timeDiff = Math.abs(
            new Date(existingMsg.timestamp).getTime() - 
            new Date(message.timestamp).getTime()
          );
          
          // Use a 30-second window for deduplication
          return timeDiff < 30000;
        });
        
        if (isDuplicate) {
          console.log('Detected duplicate message in state, skipping:', message.message);
          return;
        }
        
        console.log('Adding new message to state:', message);
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages, message];
          console.log('Updated messages state has', updatedMessages.length, 'messages');
          return updatedMessages;
        });
      } else if (data) {
        console.log('Message not for this group, ignoring. Message groupId:', data.groupId, 'Current group:', group.id);
      }
    };
    
    // Fetch chat history when component mounts
    const fetchChatHistory = async () => {
      try {
        setIsLoading(true);
        
        // Check if we already have messages (from a previous fetch or WebSocket)
        if (messages.length > 0) {
          console.log('GroupChat - Already have messages, skipping dummy history');
          setIsLoading(false);
          return;
        }
        
        // In a real app, you would fetch chat history from an API
        // For now, we'll just set some dummy data
        const dummyHistory: ChatMessage[] = [
          {
            message: `Welcome to the ${group.name} group chat!`,
            senderId: 1, // Admin user ID
            senderName: 'Admin',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            groupId: group.id
          }
        ];
        
        // Only add the user message if we have a user ID
        if (currentUserId || authState.user?.id) {
          const userId = Number(currentUserId || authState.user?.id || 0);
          dummyHistory.push({
            message: `Let's discuss lunch options for today.`,
            senderId: userId,
            senderName: 'You',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            groupId: group.id
          });
        }
        
        console.log('GroupChat - Setting dummy history:', dummyHistory);
        setMessages(dummyHistory);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching group chat history:', error);
        setIsLoading(false);
      }
    };
    
    fetchChatHistory();
    
    // Add chat message listener
    console.log('Adding chat_message listener for group:', group.id);
    const removeListener = websocketService.addMessageListener('chat_message', handleChatMessage);
    
    // Clean up on unmount
    return () => {
      console.log('Removing chat_message listener');
      removeListener();
    };
  }, [group.id, group.name, authState.user, currentUserId]);
  
  // Add logging in the render cycle to track messages
  useEffect(() => {
    console.log('RENDER CYCLE - GroupChat messages changed:', messages.length);
    // Log first 3 messages for debugging
    if (messages.length > 0) {
      console.log('RENDER CYCLE - First few messages:', messages.slice(0, 3));
    }
  }, [messages]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    console.log('Send button clicked or form submitted');
    
    // Force a direct connection check right before sending
    const directConnectionCheck = websocketService.isConnected();
    setIsWebSocketConnected(directConnectionCheck);
    
    // Get trimmed message once
    const trimmedMessage = newMessage.trim();
    
    console.log('Validation:', {
      messageEmpty: !trimmedMessage,
      connected,
      webSocketConnected: isWebSocketConnected,
      directConnectionCheck,
      userLoggedIn: !!authState.user,
      currentUserId,
      groupId: group?.id
    });
    
    // Check if we have a message
    if (!trimmedMessage) {
      console.log('Message empty, returning');
      return;
    }
    
    // Check if group ID is valid
    if (!group || !group.id) {
      console.error('No valid group ID available');
      setConnectionError('Group ID not available');
      return;
    }
    
    // Get user ID from either authState or local state
    const userId = Number(authState.user?.id || currentUserId || 0);
    if (!userId) {
      console.error('No user ID available');
      setConnectionError('User ID not available');
      return;
    }
    
    // Store group ID in a local variable to ensure it's used consistently
    const groupId = group.id;
    
    // Generate a unique timestamp for this message
    const timestamp = new Date().toISOString();
    
    // Create an identifier for this outgoing message
    const outgoingId = `${timestamp}-${trimmedMessage}`;
    
    // Create a fingerprint to add to seenMessages
    const messageFingerprint = `${userId}-${trimmedMessage}-${timestamp}`;
    
    // Add to both tracking collections to prevent duplication
    outgoingMessageIdsRef.current.add(outgoingId);
    seenMessagesRef.current.add(messageFingerprint);
    
    // Clean up old outgoing IDs after a while
    setTimeout(() => {
      outgoingMessageIdsRef.current.delete(outgoingId);
    }, 10000); // Keep for 10 seconds
    
    // Construct the message
    const newMessageObj: ChatMessage = {
      message: trimmedMessage,
      senderId: Number(userId),
      senderName: authState.user?.username || localStorage.getItem('username') || 'You',
      timestamp: timestamp,
      groupId: groupId
    };
    
    console.log('New message object created:', newMessageObj);
    
    // ALWAYS display the message locally for better UX, regardless of WebSocket status
    setMessages(prev => {
      const updatedMessages = [...prev, newMessageObj];
      console.log('Updated messages state (local):', updatedMessages.length);
      return updatedMessages;
    });
    
    // Clear the input field immediately
    setNewMessage('');
    
    // If we're connected, try to send via WebSocket
    if (directConnectionCheck) {
      try {
        console.log('Attempting to send message via WebSocket:', {
          trimmedMessage,
          groupId,
          userId
        });
        
        websocketService.sendChatMessage(trimmedMessage, groupId, true);
        console.log('Message sent successfully via WebSocket');
      } catch (error) {
        console.error('Failed to send message via websocket:', error);
        setConnectionError('Message displayed locally but not sent to server');
      }
    } else {
      console.log('WebSocket not connected, message only displayed locally');
      setConnectionError('Message displayed locally but not sent to server (offline)');
    }
  };
  
  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };
  
  // Add logging to every render
  useEffect(() => {
    console.log('RENDER - GroupChat render with messages length:', messages.length);
    if (messages.length > 0) {
      console.log('RENDER - Messages in state:', messages);
    }
  });
  
  return (
    <div 
      className="group-chat-window win98-draggable"
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 1100
      }}
      ref={containerRef}
    >
      <div 
        className="group-chat-header"
        ref={dragHandleRef}
      >
        <div className="chat-title">Group Chat: {group.name}</div>
        <button className="close-button" onClick={handleCloseClick}>×</button>
      </div>
      
      <div className="chat-messages">
        {isLoading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg, index) => {
            // Use a direct ID comparison like UserChat, but keep our simplified approach
            // This ensures consistent styling between direct and group chats
            const isSentByMe = 
              // Primary check - if the senderName is 'You' (already set by our code)
              msg.senderName === 'You' || 
              // Fallback check - direct ID comparison (same as UserChat)
              Number(msg.senderId) === Number(authState.user?.id);
            
            return (
              <div 
                key={index} 
                className={`message ${isSentByMe ? 'sent' : 'received'}`}
              >
                <div className="message-content">{msg.message}</div>
                <div className="message-meta">
                  <span className="sender">{isSentByMe ? 'You' : msg.senderName}</span>
                  <span className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {!websocketService.isConnected() && (
        <div className="connection-warning">
          Not connected to server. Messages will not be sent.
          {connectionError && <div className="error-details">{connectionError}</div>}
          <button 
            onClick={forceConnectionCheck} 
            style={{marginLeft: '5px', fontSize: '10px'}}
          >
            Reconnect
          </button>
        </div>
      )}
      
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message to the group..."
          className="message-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              console.log('Enter key pressed');
              e.preventDefault();
              handleSendMessage(e as unknown as React.FormEvent);
            }
          }}
        />
        <button 
          type="button" 
          className="send-button"
          disabled={!newMessage.trim() || !websocketService.isConnected()}
          onClick={() => handleSendMessage(null as unknown as React.FormEvent)}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default GroupChat; 