/**
 * WebSocket service for handling real-time communication with the server
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private messageListeners: Record<string, Function[]> = {};
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private lastConnectionState: boolean = false;
  private processedMessageIds: Set<string> = new Set<string>();

  /**
   * Broadcast connection status change to all components
   */
  private broadcastConnectionStatus(connected: boolean): void {
    if (this.lastConnectionState !== connected) {
      console.log('WebSocketService - Broadcasting connection change:', { 
        from: this.lastConnectionState, 
        to: connected 
      });
      
      // Save the new state
      this.lastConnectionState = connected;
      
      // Dispatch a custom event that components can listen for
      window.dispatchEvent(new CustomEvent('websocket:connection_changed', {
        detail: connected
      }));
    }
  }

  /**
   * Connect to the WebSocket server
   * @param token JWT authentication token
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, just resolve
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected, reusing connection');
        this.broadcastConnectionStatus(true);
        resolve();
        return;
      }
      
      // If connecting, wait for it to complete
      if (this.isConnecting) {
        console.log('WebSocket connection already in progress, waiting...');
        
        // Add a listener for the connection event to resolve when connected
        const connectionListener = (event: CustomEvent) => {
          if (event.detail === true) {
            window.removeEventListener('websocket:connection_changed', connectionListener as EventListener);
            resolve();
          }
        };
        
        window.addEventListener('websocket:connection_changed', connectionListener as EventListener);
        
        // Also set a timeout in case the connection attempt fails
        setTimeout(() => {
          window.removeEventListener('websocket:connection_changed', connectionListener as EventListener);
          // Don't reject, just resolve to avoid blocking the UI
          resolve();
        }, 5000);
        
        return;
      }

      this.isConnecting = true;
      
      // Cleanup any existing socket that might be in a bad state
      if (this.socket) {
        try {
          console.log('Cleaning up existing socket in state:', 
            ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.socket.readyState]);
          this.socket.close();
          this.socket = null;
        } catch (e) {
          console.error('Error cleaning up existing socket:', e);
        }
      }
      
      // For combined server, use the same host and port as the client
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
      
      const url = `${protocol}//${host}:${port}?token=${token}`;
      
      // Log the WebSocket URL with token partially masked
      const maskedUrl = url.replace(/token=([^&]+)/, (match, token) => {
        return `token=${token.substring(0, 10)}...${token.substring(token.length - 5)}`;
      });
      console.log('Connecting to WebSocket server at:', maskedUrl);
      
      try {
        this.socket = new WebSocket(url);
        console.log('WebSocket instance created, connection pending...');
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.isConnecting) {
            console.error('WebSocket connection timeout after 10 seconds');
            this.isConnecting = false;
            if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
              this.socket.close();
              this.socket = null;
            }
            this.broadcastConnectionStatus(false);
            // Don't reject, just resolve to avoid blocking UI
            resolve();
          }
        }, 10000);
        
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnecting = false;
          clearTimeout(connectionTimeout);
          
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          
          // Broadcast connection success
          this.broadcastConnectionStatus(true);
          
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          // Try to provide more detailed information about the error
          console.error('Connection failed to:', maskedUrl);
          console.error('Error details:', {
            type: 'error',
            timestamp: new Date().toISOString(),
            browserInfo: navigator.userAgent
          });
          
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          
          // Broadcast connection failure
          this.broadcastConnectionStatus(false);
          
          // Don't reject, just resolve to avoid blocking UI
          resolve();
        };
        
        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed: Code ${event.code} - ${event.reason || 'No reason provided'}`);
          console.log('Close event details:', {
            wasClean: event.wasClean,
            code: event.code,
            reason: event.reason || 'No reason provided',
            timestamp: new Date().toISOString()
          });
          
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          this.socket = null;
          
          // Broadcast disconnection
          this.broadcastConnectionStatus(false);
          
          // Attempt to reconnect if not closed intentionally
          if (event.code !== 1000) {
            console.log('Unclean close, will attempt to reconnect');
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        this.isConnecting = false;
        
        // Broadcast connection failure
        this.broadcastConnectionStatus(false);
        
        // Don't reject, just resolve to avoid blocking UI
        resolve();
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    console.log('WebSocket disconnect requested');
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimer) {
      console.log('Clearing pending reconnect attempt');
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Clear connecting state if in progress
    if (this.isConnecting) {
      this.isConnecting = false;
    }
    
    if (this.socket) {
      try {
        console.log('Closing WebSocket connection');
        // Use code 1000 to indicate normal closure
        this.socket.close(1000, 'Disconnected by user');
        this.socket = null;
        this.broadcastConnectionStatus(false);
        console.log('WebSocket disconnected successfully');
      } catch (error) {
        console.error('Error during WebSocket disconnect:', error);
        // Ensure socket is nullified even if there was an error
        this.socket = null;
        this.broadcastConnectionStatus(false);
      }
    } else {
      console.log('No active WebSocket connection to disconnect');
    }
    
    // Clear all message listeners to prevent memory leaks
    this.messageListeners = {};
    
    // Clear the processed message IDs set
    this.processedMessageIds.clear();
    console.log('Cleared processed message tracking');
  }

  /**
   * Send a message to the WebSocket server
   * @param type Message type
   * @param data Message data
   */
  sendMessage(type: string, data: any = {}): void {
    if (!this.socket) {
      console.error('Cannot send message: Socket not connected');
      throw new Error('WebSocket not connected');
    }
    
    // Include current user ID and username from localStorage as a fallback
    if (!data.userId) {
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        data.userId = parseInt(storedUserId, 10);
      }
    }
    
    if (!data.username) {
      data.username = localStorage.getItem('username') || 'User';
    }
    
    try {
      const payload = {
        type,
        data: {
          ...data,
          timestamp: data.timestamp || new Date().toISOString()
        }
      };
      
      console.log('WebSocket sending message:', payload);
      this.socket.send(JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Add event listener for a specific message type
   * @param type Message type to listen for
   * @param callback Function to call when message is received
   * @returns Function to remove the listener
   */
  addMessageListener(type: string, callback: Function): () => void {
    if (!this.messageListeners[type]) {
      this.messageListeners[type] = [];
    }
    
    // Don't add duplicate listeners - check by stringifying the function
    const callbackStr = callback.toString();
    const isDuplicate = this.messageListeners[type].some(
      existing => existing.toString() === callbackStr
    );
    
    if (isDuplicate) {
      console.log(`Prevented adding duplicate listener for message type: ${type}`);
      // Return a no-op function for cleanup
      return () => {};
    }
    
    this.messageListeners[type].push(callback);
    
    console.log(`Added listener for ${type}, now has ${this.messageListeners[type].length} listeners`);
    
    // Return a function to remove this listener
    return () => {
      // Check if the type and callback still exist before trying to find its index
      if (this.messageListeners && this.messageListeners[type]) {
        const index = this.messageListeners[type].indexOf(callback);
        if (index !== -1) {
          this.messageListeners[type].splice(index, 1);
          console.log(`Removed listener for ${type}, now has ${this.messageListeners[type].length} listeners`);
        }
      }
    };
  }

  /**
   * Remove all listeners for a specific message type
   * @param type Message type to clear listeners for
   */
  clearMessageListeners(type: string): void {
    if (this.messageListeners[type]) {
      console.log(`Clearing all listeners for message type: ${type}`);
      this.messageListeners[type] = [];
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param message Parsed message from the server
   */
  private handleMessage(message: any): void {
    // Check for duplicate messages (in case of reconnection)
    if (message.id && this.processedMessageIds.has(message.id)) {
      console.log('Ignoring duplicate message:', message.id);
      return;
    }
    
    // Add message ID to processed set if it has one
    if (message.id) {
      this.processedMessageIds.add(message.id);
      
      // Limit the size of the processed IDs set to avoid memory issues
      if (this.processedMessageIds.size > 1000) {
        const idsToRemove = Array.from(this.processedMessageIds).slice(0, 500);
        idsToRemove.forEach(id => this.processedMessageIds.delete(id));
      }
    }
    
    // Log all incoming messages
    console.log('WebSocket message received:', message);
    
    // Handle different message types
    switch (message.type) {
      case 'connection_established':
        console.log('WebSocket connection established with server');
        break;
        
      case 'pong':
        console.log('Pong response received');
        break;
        
      case 'vote_update':
        console.log('Vote update received:', message.data);
        break;
        
      case 'restaurant_selection':
        console.log('Restaurant selection received:', message.data);
        break;
        
      case 'notification':
        console.log('Notification received:', message.data);
        
        // Show notifications using the browser's Notification API if permission granted
        if (Notification.permission === 'granted') {
          const notification = new Notification('Lunch App', {
            body: message.data.message,
            icon: '/logo192.png'
          });
          
          // Close notification after 5 seconds
          setTimeout(() => notification.close(), 5000);
        }
        break;
        
      case 'chat_message':
        console.log('Chat message received:', message.data);
        break;
        
      case 'user_presence_update':
        console.log('User presence update received:', message.data);
        break;
        
      case 'lunch_time_popup':
        console.log('Lunch time popup received:', message.data);
        
        // Display notification
        if (Notification.permission === 'granted') {
          const notification = new Notification('It\'s Lunch Time!', {
            body: `${message.data.message}\nToday's suggestion: ${message.data.restaurant}`,
            icon: '/logo192.png'
          });
          
          // Focus window when notification is clicked
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
        
        // Focus the window/tab to make the app "pop up"
        window.focus();
        
        // Dispatch a custom event to notify components about lunch time
        window.dispatchEvent(new CustomEvent('lunch:time', {
          detail: message.data
        }));
        break;
      
      case 'error':
        console.error('Error from WebSocket server:', message.data);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
    
    // Notify all listeners for this message type
    if (this.messageListeners[message.type]) {
      this.messageListeners[message.type].forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error(`Error in ${message.type} message listener:`, error);
        }
      });
    }
    
    // Also notify generic message listeners
    if (this.messageListeners['*']) {
      this.messageListeners['*'].forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in wildcard message listener:', error);
        }
      });
    }
  }

  /**
   * Check if WebSocket is currently connected
   */
  isConnected(): boolean {
    const connected = this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    
    // Debug log connection status but only at specific intervals to avoid console spam
    if (Date.now() % 5000 < 100) { // Log roughly every 5 seconds
      console.debug('WebSocket connection check:', { 
        connected, 
        socketExists: this.socket !== null,
        readyState: this.socket?.readyState,
        readyStateText: this.socket ? 
          ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.socket.readyState] : 'NO_SOCKET'
      });
    }
    
    // Broadcast any connection status change
    this.broadcastConnectionStatus(connected);
    
    return connected;
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect to WebSocket server...');
      // Need to get a fresh token here somehow
      // For now, just emit an event that the app can listen to
      window.dispatchEvent(new CustomEvent('websocket:reconnect_needed'));
    }, this.reconnectInterval);
  }

  /**
   * Send a ping to keep the connection alive
   */
  ping(): void {
    this.sendMessage('ping', { time: new Date().toISOString() });
  }

  /**
   * Send a vote (yes/no) for the current restaurant
   * @param vote True for yes, false for no
   */
  sendVote(vote: boolean): void {
    this.sendMessage('vote', { vote });
  }

  /**
   * Send a request for a new random restaurant for the current group
   * @param groupId The ID of the group
   */
  sendNewRandom(groupId: number): void {
    this.sendMessage('new_random', { groupId });
  }

  /**
   * Send a notification to a group or all users
   * @param message The notification message
   * @param groupId Optional group ID (if not provided, sends to all users)
   */
  sendNotification(message: string, groupId?: number): void {
    this.sendMessage('notification', { 
      message,
      groupId, 
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a chat message
   * @param message Message text
   * @param targetId Target user or group ID
   * @param isGroupChat Whether this is a group chat
   */
  sendChatMessage(message: string, targetId: number, isGroupChat = false): void {
    console.log('WEBSOCKET SERVICE - sendChatMessage called with:', {
      message,
      targetId,
      isGroupChat,
      socketConnected: this.socket !== null
    });
    
    if (!this.socket) {
      console.error('WEBSOCKET SERVICE - Cannot send chat message: Socket not connected');
      throw new Error('WebSocket not connected');
    }
    
    if (!message || message.trim() === '') {
      console.error('WEBSOCKET SERVICE - Cannot send empty message');
      throw new Error('Message cannot be empty');
    }
    
    if (!targetId) {
      console.error('WEBSOCKET SERVICE - Cannot send message: No target ID provided');
      throw new Error('Target ID is required');
    }
    
    // Get current user information
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (!userId) {
      console.error('WEBSOCKET SERVICE - Cannot send message: No user ID available');
      throw new Error('User ID is required');
    }
    
    console.log('WEBSOCKET SERVICE - User info for message:', {
      userId,
      username,
      targetId: targetId,
      isGroupChat
    });
    
    // Create unique timestamp for message
    const timestamp = new Date().toISOString();
    
    // Generate a message ID for deduplication
    const messageId = `${timestamp}-${userId}-${isGroupChat ? targetId : 'to-' + targetId}-${message.substring(0, 10)}`;
    
    try {
      const payload = {
        type: 'chat_message',
        data: {
          message: message.trim(),
          targetId: targetId,
          isGroupChat: isGroupChat,
          timestamp: timestamp,
          messageId: messageId,
          // Include sender info explicitly
          userId: parseInt(userId, 10),
          username: username || 'User',
          // FIXED: Always include the groupId explicitly when it's a group chat
          groupId: isGroupChat ? targetId : undefined
        }
      };
      
      console.log('WEBSOCKET SERVICE - Sending chat message:', payload);
      this.socket.send(JSON.stringify(payload));
      console.log('WEBSOCKET SERVICE - Message sent successfully');
    } catch (error) {
      console.error('WEBSOCKET SERVICE - Error sending chat message:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService(); 