import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { websocketService } from './websocket.service';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  connected: boolean;
  sendMessage: (type: string, data: any) => void;
  addMessageListener: (type: string, callback: Function) => () => void;
}

const defaultContext: WebSocketContextType = {
  connected: false,
  sendMessage: () => {
    console.warn('WebSocketContext not initialized');
  },
  addMessageListener: () => {
    console.warn('WebSocketContext not initialized');
    return () => {};
  }
};

const WebSocketContext = createContext<WebSocketContextType>(defaultContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const { authState } = useAuth();
  
  // Set up connection when authenticated
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.token) {
      if (connected) {
        websocketService.disconnect();
        setConnected(false);
      }
      return;
    }
    
    const connectWebSocket = async () => {
      try {
        if (authState.token) {
          await websocketService.connect(authState.token);
          setConnected(true);
          console.log('WebSocket connected successfully');
        }
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnected(false);
      }
    };
    
    connectWebSocket();
    
    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (websocketService.isConnected()) {
        websocketService.ping();
      }
    }, 30000); // Send ping every 30 seconds
    
    // Listen for reconnect events
    const handleReconnectNeeded = () => {
      if (authState.token) {
        connectWebSocket();
      }
    };
    
    window.addEventListener('websocket:reconnect_needed', handleReconnectNeeded);
    
    // Clean up on unmount
    return () => {
      websocketService.disconnect();
      setConnected(false);
      clearInterval(pingInterval);
      window.removeEventListener('websocket:reconnect_needed', handleReconnectNeeded);
    };
  }, [authState.isAuthenticated, authState.token]);
  
  // Update connected state when connection status changes
  useEffect(() => {
    const checkConnectionStatus = () => {
      const isConnected = websocketService.isConnected();
      if (connected !== isConnected) {
        setConnected(isConnected);
      }
    };
    
    // Check status every 5 seconds
    const statusInterval = setInterval(checkConnectionStatus, 5000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, [connected]);
  
  // Wrapper for sendMessage
  const sendMessage = useCallback((type: string, data: any) => {
    websocketService.sendMessage(type, data);
  }, []);
  
  // Wrapper for addMessageListener
  const addMessageListener = useCallback((type: string, callback: Function) => {
    return websocketService.addMessageListener(type, callback);
  }, []);
  
  const contextValue: WebSocketContextType = {
    connected,
    sendMessage,
    addMessageListener
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);

export default WebSocketContext; 