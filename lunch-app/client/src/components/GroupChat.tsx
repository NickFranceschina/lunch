import React, { useState, useEffect, useRef } from 'react';
import { Group } from '../types/Group';
import './GroupChat.css';
import useDraggable from '../hooks/useDraggable';
import { useWebSocket } from '../services/WebSocketContext';
import { useAuth } from '../services/AuthContext';
import { socketIOService } from '../services/socketio.service';

interface GroupChatProps {
  group: Group;
  onClose: () => void;
  initialMessage?: any;
}

interface ChatMessage {
  id?: number;
  message: string;
  senderId: number;
  senderName: string;
  timestamp: string;
  groupId: number;
}

const GroupChat: React.FC<GroupChatProps> = ({ group, onClose, initialMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { authState } = useAuth();
  const { isConnected } = useWebSocket();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // Track messages we've already seen
  const processedMessagesRef = useRef<Set<string>>(new Set());
  
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

  // Keep track of user ID
  useEffect(() => {
    console.log('GroupChat - Current AuthState:', { 
      isAuthenticated: authState.isAuthenticated,
      hasToken: !!authState.token,
      hasUser: !!authState.user,
      userId: authState.user?.id
    });
    
    // Set current user ID from authState
    if (authState.user?.id) {
      setCurrentUserId(authState.user.id);
    }
  }, [authState]);

  // Process the initial message if provided
  useEffect(() => {
    if (initialMessage && !isLoading) {
      // Add a slight delay to ensure other initialization is complete
      setTimeout(() => {
        const messageId = initialMessage.messageId || 
          `${initialMessage.senderId || initialMessage.userId}-${initialMessage.message}-${initialMessage.timestamp}`;
        
        // Only process if not already seen
        if (!processedMessagesRef.current.has(messageId)) {
          console.log('Processing initial message:', initialMessage);
          
          // Add to processed messages set
          processedMessagesRef.current.add(messageId);
          
          // Create message object and add to state
          const message: ChatMessage = {
            message: initialMessage.message,
            senderId: Number(initialMessage.userId || initialMessage.senderId || 0),
            senderName: determineCorrectSenderName(initialMessage),
            timestamp: initialMessage.timestamp || new Date().toISOString(),
            groupId: initialMessage.groupId || group.id
          };
          
          setMessages(prevMessages => [...prevMessages, message]);
        }
      }, 300);
    }
  }, [initialMessage, isLoading, group.id]);

  // Initialize component
  useEffect(() => {
    console.log('GroupChat mounted for group:', group.id);
    
    // Check connection status
    const connected = socketIOService.isConnected();
    setIsSocketConnected(connected);
    
    if (!connected) {
      setConnectionError('Not connected to server. Attempting to connect...');
      
      // Try to connect if we have a token
      const token = localStorage.getItem('token');
      if (token) {
        socketIOService.connect(token)
          .then(() => {
            setIsSocketConnected(true);
            setConnectionError('');
          })
          .catch(() => {
            setConnectionError('Connection failed. Try reconnecting.');
          });
      }
    }
    
    // Set up initial chat history
    fetchChatHistory();
    
    // Set up connection status listener
    const connectionListener = (connected: boolean) => {
      setIsSocketConnected(connected);
      if (connected) {
        setConnectionError('');
      } else {
        setConnectionError('Connection lost. Messages will appear when reconnected.');
      }
    };
    
    // Add connection listener
    const removeListener = socketIOService.addConnectionListener(connectionListener);
    
    // Focus on the input field when the component mounts
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    
    // Clean up on unmount
    return () => {
      removeListener();
      console.log('GroupChat unmounted for group:', group.id);
    };
  }, [group.id]);
  
  // Listen for group messages
  useEffect(() => {
    const handleGroupMessage = (data: any) => {
      // Only process messages for this group
      if (data.groupId !== group.id) {
        return;
      }
      
      console.log('Received group message:', data);
      
      // Check if we've already processed this message
      const messageId = data.messageId || `${data.senderId}-${data.message}-${data.timestamp}`;
      if (processedMessagesRef.current.has(messageId)) {
        console.log('Already processed message:', messageId);
        return;
      }
      
      // Mark as processed
      processedMessagesRef.current.add(messageId);
      
      // Handle messages from the current user differently
      const isFromCurrentUser = String(data.userId) === String(authState.user?.id || currentUserId);
      
      // Check if we already have this message locally (for current user's own messages)
      if (isFromCurrentUser) {
        const hasDuplicate = messages.some(msg => 
          msg.senderId === Number(data.userId) && 
          msg.message === data.message &&
          Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp).getTime()) < 10000
        );
        
        if (hasDuplicate) {
          console.log('Message already in state, skipping:', data.message);
          return;
        }
      }
      
      // Create the message object
      const message: ChatMessage = {
        message: data.message,
        senderId: Number(data.userId),
        senderName: determineCorrectSenderName(data),
        timestamp: data.timestamp,
        groupId: data.groupId
      };
      
      // Add to state
      setMessages(prev => [...prev, message]);
    };
    
    // Register listener for group messages
    const removeListener = socketIOService.addMessageListener('group_message', handleGroupMessage);
    
    return () => {
      removeListener();
    };
  }, [group.id, authState.user, currentUserId, messages]);
  
  // Fetch initial chat history
  const fetchChatHistory = () => {
    setIsLoading(true);
    
    // In a real app, you'd fetch history from the server
    // For now, just set up a welcome message
    const dummyHistory: ChatMessage[] = [
      {
        message: `Welcome to the ${group.name} group chat!`,
        senderId: 1, // Admin user ID
        senderName: 'Admin',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        groupId: group.id
      }
    ];
    
    // Add a sample user message
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
    
    setMessages(dummyHistory);
    setIsLoading(false);
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Function to reconnect to socket
  const reconnect = async () => {
    setConnectionError('Attempting to reconnect...');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setConnectionError('No token available. Please log in again.');
        return;
      }
      
      // First disconnect if already connected
      socketIOService.disconnect();
      
      // Short delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reconnect
      await socketIOService.connect(token);
      
      // Check connection status
      if (socketIOService.isConnected()) {
        setIsSocketConnected(true);
        setConnectionError('');
      } else {
        setConnectionError('Reconnection failed. Please try again.');
      }
    } catch (error) {
      console.error('Error reconnecting:', error);
      setConnectionError('Connection failed. Please try again.');
    }
  };
  
  // Handle sending a message
  const handleSendMessage = (e: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) {
      return;
    }
    
    // Clear input immediately for better UX
    setNewMessage('');
    
    // Check connection
    if (!socketIOService.isConnected()) {
      setConnectionError('Not connected to server. Message will be sent when reconnected.');
      
      // Add message to local state anyway for better UX
      const localMessage: ChatMessage = {
        message: trimmedMessage,
        senderId: Number(authState.user?.id || currentUserId || 0),
        senderName: 'You',
        timestamp: new Date().toISOString(),
        groupId: group.id
      };
      
      setMessages(prev => [...prev, localMessage]);
      return;
    }
    
    try {
      // Generate a message ID for tracking
      const messageId = socketIOService.sendChatMessage(trimmedMessage, group.id);
      
      // Add to processed messages to prevent duplication
      processedMessagesRef.current.add(messageId);
      
      // Add to local state for immediate feedback - Socket.IO will handle deduplication
      const localMessage: ChatMessage = {
        message: trimmedMessage,
        senderId: Number(authState.user?.id || currentUserId || 0),
        senderName: 'You',
        timestamp: new Date().toISOString(),
        groupId: group.id
      };
      
      setMessages(prev => [...prev, localMessage]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionError('Failed to send message');
    }
  };
  
  // Position at bottom right
  const initialPosition = {
    x: window.innerWidth - 400 - 20, // 400px width, 20px from right edge
    y: window.innerHeight - 500 - 5 // 500px height, 5px from bottom
  };
  
  const { position, containerRef, dragHandleRef } = useDraggable(`group-chat-${group.id}`, initialPosition, true);
  
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
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="chat-messages">
        {isLoading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg, index) => {
            const isSentByMe = 
              msg.senderName === 'You' || 
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
      
      {!isSocketConnected && (
        <div className="connection-warning">
          <div className="connection-status-icon">⚠️</div>
          <div className="connection-message">
            Not connected to server
            {connectionError && <div className="error-details">{connectionError}</div>}
          </div>
          <button 
            onClick={reconnect} 
            className="reconnect-button"
          >
            Reconnect
          </button>
        </div>
      )}
      
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message to the group..."
          className="message-input"
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default GroupChat; 