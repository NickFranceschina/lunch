import { io, Socket } from 'socket.io-client';

// Type for connection listener
type ConnectionListener = (isConnected: boolean) => void;
type MessageListener = (data: any) => void;

/**
 * Socket.IO service for handling real-time communication with the server
 */
class SocketIOService {
  private socket: Socket | null = null;
  private messageListeners: Map<string, Set<MessageListener>> = new Map();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionStatus: boolean = false;
  private apiUrl: string;
  private connectionAttempts: number = 0;

  constructor() {
    // Get API URL from environment or use window location
    // Socket.IO will run on the same host/port as the HTTP server
    const serverUrl = process.env.REACT_APP_API_URL || window.location.origin;
    
    // For development, use a fixed port (3001)
    // In production, we use the same origin
    this.apiUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001'
      : serverUrl;
    
    console.log('Socket.IO service initialized with API URL:', this.apiUrl);
  }

  /**
   * Connect to the Socket.IO server
   * @param token JWT authentication token
   */
  async connect(token: string): Promise<void> {
    // Reset connection attempts counter on new connection attempt
    this.connectionAttempts = 0;
    
    return new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          console.log('Socket already exists, disconnecting first');
          this.socket.disconnect();
          this.socket = null;
        }
        
        console.log('Connecting to Socket.IO server at:', this.apiUrl);
        
        // Initialize the socket with auth token in query parameter for compatibility
        this.socket = io(this.apiUrl, {
          auth: { token },
          query: { token }, // Use query parameter for compatibility
          reconnection: true,
          reconnectionAttempts: 10, // Increased from 5
          reconnectionDelay: 1000, // Decreased from 2000 for faster retry
          timeout: 20000, // Increased from 10000 to 20000
          transports: ['polling', 'websocket'] // Try polling first, then websocket for better compatibility
        });

        // Add connection attempt timeout
        const connectionTimeout = setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            console.warn('Socket.IO connection timeout, falling back to regular API');
            this.updateConnectionStatus(false);
            reject(new Error('Connection timeout'));
          }
        }, 25000); // Separate timeout for the overall connection process

        // Setup connection event handlers
        this.socket.on('connect', () => {
          console.log('Socket.IO connected!');
          clearTimeout(connectionTimeout);
          this.updateConnectionStatus(true);
          resolve();
        });

        // Debug handler to log all events
        this.socket.onAny((eventName, ...args) => {
          console.log(`DEBUG Socket.IO Event: ${eventName}`, args);
          
          // Special handling for random restaurant selection
          if (eventName === 'restaurant_selection' || 
              eventName === 'random_restaurant' || 
              eventName === 'restaurant_update') {
            console.log('RESTAURANT EVENT DETECTED:', eventName, args);
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          this.updateConnectionStatus(false);
          
          // Increment connection attempts
          this.connectionAttempts++;
          
          // Don't immediately reject - allow reconnection attempts
          if (!this.socket?.connected && this.connectionAttempts > 5) {
            clearTimeout(connectionTimeout);
            reject(error);
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected. Reason:', reason);
          this.updateConnectionStatus(false);
          
          // Auto-reconnect after a timeout if not rejected
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
          }
          
          this.reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect...');
            if (this.socket) {
              this.socket.connect();
            }
          }, 2000);
        });

        this.socket.on('error', (error) => {
          console.error('Socket.IO error:', error);
          this.updateConnectionStatus(false);
          
          // Increment connection attempts
          this.connectionAttempts++;
          
          // Don't immediately reject - allow reconnection attempts
          if (!this.socket?.connected && this.connectionAttempts > 5) {
            clearTimeout(connectionTimeout);
            reject(error);
          }
        });
        
        // Handle server messages
        this.socket.on('group_message', (data) => {
          this.triggerMessageListeners('group_message', data);
        });
        
        this.socket.on('connection_established', (data) => {
          console.log('Server confirmed connection:', data);
        });

        // Add listeners for restaurant selections and votes
        this.socket.on('restaurant_selection', (data) => {
          console.log('Received restaurant selection:', data);
          this.triggerMessageListeners('restaurant_selection', data);
        });

        this.socket.on('restaurant', (data) => {
          console.log('Received restaurant event:', data);
          // Also trigger restaurant_selection listeners with this data
          this.triggerMessageListeners('restaurant_selection', data);
        });

        this.socket.on('random', (data) => {
          console.log('Received random event:', data);
          // Also trigger restaurant_selection listeners with this data
          this.triggerMessageListeners('restaurant_selection', data);
        });

        this.socket.on('vote_update', (data) => {
          console.log('Received vote update:', data);
          this.triggerMessageListeners('vote_update', data);
        });

        this.socket.on('notification', (data) => {
          console.log('Received notification:', data);
          this.triggerMessageListeners('notification', data);
        });
        
        // Setup error event handler
        this.socket.on('error_message', (error) => {
          console.error('Server error:', error);
        });
      } catch (error) {
        console.error('Error connecting to Socket.IO:', error);
        this.updateConnectionStatus(false);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateConnectionStatus(false);
      console.log('Disconnected from Socket.IO server');
    }
    
    // Clear all listeners
    this.messageListeners.clear();
    this.connectionListeners.clear();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Check if the socket is currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Send a message to the server
   * @param type Event name/type
   * @param data Message data
   * @returns Message ID for tracking
   */
  sendMessage(type: string, data: any): string {
    if (!this.socket || !this.socket.connected) {
      console.error('Cannot send message, not connected to server');
      throw new Error('Not connected to server');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Add sender info
    const message = {
      ...data,
      messageId,
    };

    // Send to server
    this.socket.emit(type, message);
    return messageId;
  }

  /**
   * Send a chat message
   * @param message Message text
   * @param groupId Group ID
   * @returns Message ID for tracking
   */
  sendChatMessage(message: string, groupId: number): string {
    return this.sendMessage('group_message', {
      message,
      groupId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Register a callback for a specific message type
   * @param eventType Message type to listen for
   * @param listener Function to call when this message type is received
   * @returns Function to remove the listener
   */
  addMessageListener(eventType: string, listener: MessageListener): () => void {
    if (!this.messageListeners.has(eventType)) {
      this.messageListeners.set(eventType, new Set());
    }
    
    this.messageListeners.get(eventType)?.add(listener);
    
    // Return function to remove this listener
    return () => {
      const listeners = this.messageListeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  /**
   * Register a callback for connection status changes
   * @param listener Function to call when connection status changes
   * @returns Function to remove the listener
   */
  addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    
    // Immediately notify of current status
    listener(this.connectionStatus);
    
    // Return function to remove this listener
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Trigger message listeners for a specific type
   * @param type Message type to trigger listeners for
   * @param data Message data to pass to listeners
   */
  private triggerMessageListeners(type: string, data: any): void {
    const listeners = this.messageListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${type} listener:`, error);
        }
      });
    }
  }

  /**
   * Update and broadcast connection status changes
   * @param connected Whether the socket is connected
   */
  private updateConnectionStatus(connected: boolean): void {
    if (this.connectionStatus !== connected) {
      this.connectionStatus = connected;
      
      // Notify all connection listeners
      this.connectionListeners.forEach(listener => {
        try {
          listener(connected);
        } catch (error) {
          console.error('Error in connection listener:', error);
        }
      });
    }
  }

  /**
   * Send a ping to the server to check connection
   */
  sendPing(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('ping');
    }
  }

  /**
   * Request a new random restaurant for the current group
   * @param groupId Group ID to request restaurant for
   */
  requestRandomRestaurant(groupId: number): void {
    if (this.socket && this.socket.connected) {
      console.log('Requesting random restaurant for group:', groupId);
      this.socket.emit('request_random', { groupId });
    } else {
      console.error('Cannot request random restaurant, socket not connected');
    }
  }
}

// Export a singleton instance
export const socketIOService = new SocketIOService();

export default socketIOService; 