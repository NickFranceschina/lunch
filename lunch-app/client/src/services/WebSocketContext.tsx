import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { socketIOService } from './socketio.service';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (type: string, data: any) => void;
  addMessageListener: (type: string, callback: (data: any) => void) => () => void;
  addConnectionListener: (callback: (isConnected: boolean) => void) => () => void;
}

const defaultContext: WebSocketContextType = {
  isConnected: false,
  lastMessage: null,
  sendMessage: () => {
    console.warn('WebSocketContext not initialized');
  },
  addMessageListener: () => {
    console.warn('WebSocketContext not initialized');
    return () => {};
  },
  addConnectionListener: () => {
    console.warn('WebSocketContext not initialized');
    return () => {};
  }
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(defaultContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(socketIOService.isConnected());
  const { authState } = useAuth();
  
  // Effect to manage connection based on auth state
  useEffect(() => {
    const token = authState?.token; // Safely access token
    const isAuthenticated = authState?.isAuthenticated;

    if (!isAuthenticated || !token) {
      if (socketIOService.isConnected()) { // Check current service state
        socketIOService.disconnect();
      }
      setIsConnected(false); // Update local state
      return; // Exit if not authenticated
    }

    // If authenticated and have token, try to connect
    const connectSocket = async () => {
      try {
        console.log('WebSocketContext - Attempting connection...');
        await socketIOService.connect(token);
        // Connection listener will update isConnected state
      } catch (error) {
        console.error('WebSocketContext - Failed to connect to Socket.IO:', error);
        setIsConnected(false); // Ensure state is false on error
      }
    };

    connectSocket();

    // Cleanup function: Disconnect if component unmounts or auth changes
    return () => {
      console.log('WebSocketContext - Cleanup: Checking if disconnect needed...');
      try {
        if (socketIOService.isConnected()) {
          console.log('WebSocketContext - Cleanup: Disconnecting Socket.IO...');
          socketIOService.disconnect();
          setIsConnected(false);
        }
      } catch (error) {
        console.error('WebSocketContext - Error during cleanup:', error);
      }
    };
  }, [authState?.token, authState?.isAuthenticated]);
  
  // Effect to listen for connection status changes
  useEffect(() => {
    const handleConnectionChange = (isConnected: boolean) => {
      setIsConnected(isConnected);
    };
    
    // Add connection listener
    const removeListener = socketIOService.addConnectionListener(handleConnectionChange);
    
    // Also listen for DOM events for broader notification
    const domListener = (event: any) => {
      setIsConnected(event.detail);
    };
    
    window.addEventListener('socket:connection_changed', domListener);
    
    return () => {
      removeListener();
      window.removeEventListener('socket:connection_changed', domListener);
    };
  }, []);
  
  // Wrapper for sendMessage
  const sendMessage = useCallback((type: string, data: any) => {
    console.log('WebSocketContext - sending message:', { type, data });
    
    // Force a direct connection check first
    const isConnected = socketIOService.isConnected();
    if (!isConnected) {
      console.error('WebSocketContext - Cannot send message: Socket.IO not connected');
      
      // Attempt reconnection if we have a token
      if (authState.token) {
        console.log('WebSocketContext - Attempting reconnection before sending...');
        socketIOService.connect(authState.token)
          .then(() => {
            if (socketIOService.isConnected()) {
              console.log('WebSocketContext - Reconnected successfully, now sending message');
              try {
                socketIOService.sendMessage(type, data);
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
      socketIOService.sendMessage(type, data);
    } catch (error) {
      console.error('WebSocketContext - Error sending message:', error);
    }
  }, [authState.token]);
  
  // Wrapper for addMessageListener
  const addMessageListener = useCallback((type: string, callback: (data: any) => void) => {
    return socketIOService.addMessageListener(type, callback);
  }, []);
  
  // Wrapper for addConnectionListener
  const addConnectionListener = useCallback((callback: (isConnected: boolean) => void) => {
    return socketIOService.addConnectionListener(callback);
  }, []);
  
  const contextValue: WebSocketContextType = {
    isConnected,
    lastMessage: null, // We don't store last message anymore, it's event-based
    sendMessage,
    addMessageListener,
    addConnectionListener
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.error('useWebSocket must be used within a WebSocketProvider');
    }
    return {
      isConnected: false,
      lastMessage: null,
      sendMessage: () => console.warn('WebSocket provider not found'),
      addMessageListener: () => { console.warn('WebSocket provider not found'); return () => {}; },
      addConnectionListener: () => { console.warn('WebSocket provider not found'); return () => {}; }
    };
  }
  return context;
};

export default WebSocketContext; 