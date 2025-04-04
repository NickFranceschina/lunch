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
  const [connected, setConnected] = useState<boolean>(websocketService.isConnected());
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
          console.log('WebSocketContext - Attempting to connect with token');
          await websocketService.connect(authState.token);
          const isConnected = websocketService.isConnected();
          setConnected(isConnected);
          console.log('WebSocketContext - Connection attempt result:', isConnected);
        }
      } catch (error) {
        console.error('WebSocketContext - Failed to connect to WebSocket:', error);
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
      console.log('WebSocketContext - Reconnect needed event received');
      if (authState.token) {
        connectWebSocket();
      }
    };
    
    // Listen for connection status changes
    const handleConnectionChange = (event: any) => {
      console.log('WebSocketContext - Connection event received:', event.detail);
      setConnected(event.detail);
    };
    
    // Set up interval to check connection status more frequently
    const connectionCheckInterval = setInterval(() => {
      const isConnected = websocketService.isConnected();
      if (connected !== isConnected) {
        console.log('WebSocketContext - Connection status changed:', { from: connected, to: isConnected });
        setConnected(isConnected);
      }
    }, 1000); // Check every second
    
    window.addEventListener('websocket:reconnect_needed', handleReconnectNeeded);
    window.addEventListener('websocket:connection_changed', handleConnectionChange);
    
    // Clean up on unmount
    return () => {
      clearInterval(pingInterval);
      clearInterval(connectionCheckInterval);
      window.removeEventListener('websocket:reconnect_needed', handleReconnectNeeded);
      window.removeEventListener('websocket:connection_changed', handleConnectionChange);
      
      // Only disconnect if we're the one who initiated the connection
      if (authState.isAuthenticated) {
        console.log('WebSocketContext - Cleaning up WebSocket connection on unmount');
        websocketService.disconnect();
        setConnected(false);
      }
    };
  }, [authState.isAuthenticated, authState.token]);
  
  // Wrapper for sendMessage
  const sendMessage = useCallback((type: string, data: any) => {
    console.log('WebSocketContext - sending message:', { type, data });
    
    // Force a direct connection check first
    const isConnected = websocketService.isConnected();
    if (!isConnected) {
      console.error('WebSocketContext - Cannot send message: WebSocket not connected');
      
      // Attempt reconnection if we have a token
      if (authState.token) {
        console.log('WebSocketContext - Attempting reconnection before sending...');
        websocketService.connect(authState.token)
          .then(() => {
            if (websocketService.isConnected()) {
              console.log('WebSocketContext - Reconnected successfully, now sending message');
              try {
                websocketService.sendMessage(type, data);
              } catch (sendError) {
                console.error('WebSocketContext - Failed to send message after reconnection:', sendError);
              }
            } else {
              console.error('WebSocketContext - Reconnection succeeded but still not connected');
            }
          })
          .catch(error => {
            console.error('WebSocketContext - Failed to reconnect:', error);
          });
      }
      return;
    }
    
    try {
      websocketService.sendMessage(type, data);
    } catch (error) {
      console.error('WebSocketContext - Error sending message:', error);
    }
  }, [authState.token]);
  
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