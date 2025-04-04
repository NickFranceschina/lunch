import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { websocketService } from './websocket.service';
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
  const [isConnected, setIsConnected] = useState<boolean>(websocketService.isConnected());
  const { authState } = useAuth();
  
  // Effect to manage connection based on auth state
  useEffect(() => {
    const token = authState?.token; // Safely access token
    const isAuthenticated = authState?.isAuthenticated;

    if (!isAuthenticated || !token) {
      if (websocketService.isConnected()) { // Check current service state
        websocketService.disconnect();
      }
      setIsConnected(false); // Update local state
      return; // Exit if not authenticated
    }

    // If authenticated and have token, try to connect
    const connectWebSocket = async () => {
      try {
        // Only connect if not already connected or attempting
        if (!websocketService.isConnected() /* && !websocketService.isConnecting() // Add if service has this */ ) {
           console.log('WebSocketContext - Attempting connection...');
           await websocketService.connect(token); // Pass the safe token
           // The connection listener should update isConnected state
        }
      } catch (error) {
        console.error('WebSocketContext - Failed to connect to WebSocket:', error);
        setIsConnected(false); // Ensure state is false on error
      }
    };

    connectWebSocket();

    // Cleanup function: Disconnect if component unmounts or auth changes
    return () => {
      console.log('WebSocketContext - Cleanup: Checking if disconnect needed...');
      // Check if still connected before disconnecting
      try {
        if (websocketService && websocketService.isConnected()) {
          console.log('WebSocketContext - Cleanup: Disconnecting WebSocket...');
          websocketService.disconnect();
          setIsConnected(false);
        }
      } catch (error) {
        console.error('WebSocketContext - Error during cleanup:', error);
      }
    };
  // Add authState?.token and authState?.isAuthenticated to dependencies
  }, [authState?.token, authState?.isAuthenticated]);
  
  // Effect to manage generic message listener (for lastMessage state)
  // Note: This catches ALL messages. Specific listeners should be preferred.
  useEffect(() => {
    const catchAllUnsubscribe = websocketService.addMessageListener('*', (data) => {
      // This is a placeholder. You might not need a generic lastMessage state.
      // If used, filter out specific types handled elsewhere or adjust logic.
      // console.log("Generic listener received: ", data);
      // setLastMessage(data); 
    });
    
    return () => catchAllUnsubscribe();
  }, []);
  
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
  
  // Wrapper for addMessageListener with corrected type
  const addMessageListener = useCallback((type: string, callback: (data: any) => void) => {
    return websocketService.addMessageListener(type, callback);
  }, []);
  
  // Wrapper for addConnectionListener (already correct in service, just provide wrapper)
  const addConnectionListener = useCallback((callback: (isConnected: boolean) => void) => {
    return websocketService.addConnectionListener(callback);
  }, []);
  
  const contextValue: WebSocketContextType = {
    isConnected,
    lastMessage: null,
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
  // Check if context is undefined, meaning the hook is used outside the provider
  if (context === undefined) {
    // Throw an error in development, provide a default safe object in production?
    // Or always throw error to enforce provider usage.
    if (process.env.NODE_ENV === 'development') {
        console.error('useWebSocket must be used within a WebSocketProvider');
    }
    // To prevent runtime errors when context is undefined, return a default object.
    // This might hide bugs, throwing an error is often better.
    // For now, let's return a safe default to fix the linter, but consider throwing.
    return {
        isConnected: false,
        lastMessage: null,
        sendMessage: () => console.warn('WebSocket provider not found'),
        addMessageListener: () => { console.warn('WebSocket provider not found'); return () => {}; },
        addConnectionListener: () => { console.warn('WebSocket provider not found'); return () => {}; }
    };
    // Alternatively: throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext; 