import React, { useState, useEffect, useRef } from 'react';
import { Group } from '../types/Group';
import './GroupChat.css';
import useDraggable from '../hooks/useDraggable';

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

  // Position at bottom right
  const initialPosition = {
    x: Math.max(20, window.innerWidth - 420),
    y: window.innerHeight - chatHeight - 5 // 5px from bottom of screen
  };
  
  const { position, containerRef, dragHandleRef } = useDraggable(initialPosition, true);
  
  // Listen for incoming messages
  useEffect(() => {
    // Function to handle new messages
    const handleChatMessage = (data: any) => {
      // Only add messages from this group
      if (data && data.groupId === group.id) {
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
            senderId: 2,
            senderName: 'You',
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
      // Cleanup if needed
    };
  }, [group.id, group.name]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }
    
    // Add message to local state immediately (optimistic UI update)
    const localMessage: ChatMessage = {
      message: newMessage,
      senderId: 2, // Current user ID
      senderName: 'You',
      timestamp: new Date().toISOString(),
      groupId: group.id
    };
    
    setMessages(prev => [...prev, localMessage]);
    setNewMessage('');
  };
  
  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };
  
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
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.senderId === 2 ? 'sent' : 'received'}`}
            >
              <div className="message-content">{msg.message}</div>
              <div className="message-meta">
                <span className="sender">{msg.senderId === 2 ? 'You' : msg.senderName}</span>
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