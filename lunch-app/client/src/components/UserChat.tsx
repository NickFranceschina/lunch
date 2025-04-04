import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useWebSocket } from '../services';
import { User } from '../types/User';
import './UserChat.css';
import useDraggable from '../hooks/useDraggable';

interface ChatMessage {
  id?: number;
  message: string;
  senderId: number;
  senderName: string;
  timestamp: string;
}

interface UserChatProps {
  recipient: User;
  onClose: () => void;
}

const UserChat: React.FC<UserChatProps> = ({ recipient, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { authState } = useAuth();
  const { connected, sendMessage, addMessageListener } = useWebSocket();
  const { position, containerRef, dragHandleRef } = useDraggable({ x: window.innerWidth - 420, y: window.innerHeight - 520 });
  
  // Listen for incoming messages
  useEffect(() => {
    // Function to handle new messages
    const handleChatMessage = (data: any) => {
      // Only add messages from or to this recipient
      if ((data.userId === recipient.id) || 
          (data.userId === authState.user?.id && data.recipientId === recipient.id)) {
        const message: ChatMessage = {
          message: data.message,
          senderId: data.userId,
          senderName: data.username,
          timestamp: data.timestamp
        };
        
        setMessages(prev => [...prev, message]);
      }
    };
    
    // Add listener for chat messages
    const unsubscribe = addMessageListener('chat_message', handleChatMessage);
    
    // Fetch chat history when component mounts
    const fetchChatHistory = async () => {
      try {
        setIsLoading(true);
        // In a real app, you would fetch chat history from an API
        // For now, we'll just set some dummy data
        const dummyHistory: ChatMessage[] = [
          {
            message: `Hello! What's for lunch today?`,
            senderId: recipient.id,
            senderName: recipient.username,
            timestamp: new Date(Date.now() - 60000).toISOString()
          },
          {
            message: `I'm thinking maybe Italian?`,
            senderId: authState.user?.id || 0,
            senderName: authState.user?.username || 'You',
            timestamp: new Date(Date.now() - 30000).toISOString()
          }
        ];
        
        setMessages(dummyHistory);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching chat history:', error);
        setIsLoading(false);
      }
    };
    
    fetchChatHistory();
    
    // Clean up on unmount
    return () => {
      unsubscribe();
    };
  }, [recipient.id, authState.user, addMessageListener]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !connected || !authState.user) {
      return;
    }
    
    // Create message object
    const messageData = {
      message: newMessage,
      targetId: recipient.id,
      isGroupChat: false
    };
    
    // Send message through WebSocket
    sendMessage('chat_message', messageData);
    
    // Add message to local state immediately (optimistic UI update)
    const localMessage: ChatMessage = {
      message: newMessage,
      senderId: authState.user.id,
      senderName: authState.user.username,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, localMessage]);
    setNewMessage('');
  };
  
  return (
    <div 
      className="user-chat-window"
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`
      }}
      ref={containerRef}
    >
      <div 
        className="user-chat-header"
        ref={dragHandleRef}
        style={{ cursor: 'move' }}
      >
        <div className="chat-title">Chat with {recipient.username}</div>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="chat-messages">
        {isLoading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.senderId === authState.user?.id ? 'sent' : 'received'}`}
            >
              <div className="message-content">{msg.message}</div>
              <div className="message-meta">
                <span className="sender">{msg.senderId === authState.user?.id ? 'You' : msg.senderName}</span>
                <span className="timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
          disabled={!connected}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!connected || !newMessage.trim()}
        >
          Send
        </button>
      </form>
      
      {!connected && (
        <div className="connection-warning">
          Not connected to chat server. Messages won't be sent.
        </div>
      )}
    </div>
  );
};

export default UserChat; 