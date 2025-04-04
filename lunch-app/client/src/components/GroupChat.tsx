import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useWebSocket } from '../services';
import { Group } from '../types/Group';
import './GroupChat.css';

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
  const { authState } = useAuth();
  const { connected, sendMessage, addMessageListener } = useWebSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Listen for incoming messages
  useEffect(() => {
    // Function to handle new messages
    const handleChatMessage = (data: any) => {
      // Only add messages from this group
      if (data.groupId === group.id) {
        const message: ChatMessage = {
          message: data.message,
          senderId: data.userId,
          senderName: data.username,
          timestamp: data.timestamp,
          groupId: data.groupId
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
            message: `Welcome to the ${group.name} group chat!`,
            senderId: 1, // Admin user ID
            senderName: 'Admin',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            groupId: group.id
          },
          {
            message: `Let's discuss lunch options for today.`,
            senderId: authState.user?.id || 0,
            senderName: authState.user?.username || 'You',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            groupId: group.id
          }
        ];
        
        setMessages(dummyHistory);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching group chat history:', error);
        setIsLoading(false);
      }
    };
    
    fetchChatHistory();
    
    // Clean up on unmount
    return () => {
      unsubscribe();
    };
  }, [group.id, group.name, authState.user, addMessageListener]);
  
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
      targetId: group.id,
      isGroupChat: true
    };
    
    // Send message through WebSocket
    sendMessage('chat_message', messageData);
    
    // Add message to local state immediately (optimistic UI update)
    const localMessage: ChatMessage = {
      message: newMessage,
      senderId: authState.user.id,
      senderName: authState.user.username,
      timestamp: new Date().toISOString(),
      groupId: group.id
    };
    
    setMessages(prev => [...prev, localMessage]);
    setNewMessage('');
  };
  
  return (
    <div className="group-chat-window">
      <div className="group-chat-header">
        <div className="chat-title">Group Chat: {group.name}</div>
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
          placeholder="Type a message to the group..."
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

export default GroupChat; 