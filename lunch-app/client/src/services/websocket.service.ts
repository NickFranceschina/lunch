/**
 * WebSocket service for handling real-time communication with the server
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private messageListeners: Record<string, Function[]> = {};
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  /**
   * Connect to the WebSocket server
   * @param token JWT authentication token
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.REACT_APP_WS_HOST || window.location.hostname;
      const port = process.env.REACT_APP_WS_PORT || '3001';
      
      const url = `${protocol}//${host}:${port}?token=${token}`;
      
      // Log the WebSocket URL with token partially masked
      const maskedUrl = url.replace(/token=([^&]+)/, (match, token) => {
        return `token=${token.substring(0, 10)}...${token.substring(token.length - 5)}`;
      });
      console.log('Connecting to WebSocket server at:', maskedUrl);
      console.log('Using protocol:', protocol);
      console.log('Using host:', host);
      console.log('Using port:', port);
      
      try {
        this.socket = new WebSocket(url);
        console.log('WebSocket instance created, connection pending...');
        
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnecting = false;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
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
          this.isConnecting = false;
          reject(error);
        };
        
        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed: Code ${event.code} - ${event.reason || 'No reason provided'}`);
          console.log('Close event details:', {
            wasClean: event.wasClean,
            code: event.code,
            reason: event.reason || 'No reason provided',
            timestamp: new Date().toISOString()
          });
          this.isConnecting = false;
          this.socket = null;
          
          // Attempt to reconnect if not closed intentionally
          if (event.code !== 1000) {
            console.log('Unclean close, will attempt to reconnect');
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Close the WebSocket connection
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'User logout');
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Clear all message listeners
    this.messageListeners = {};
  }

  /**
   * Schedule an attempt to reconnect to the WebSocket server
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    console.log(`Scheduling reconnect in ${this.reconnectInterval}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Attempting to reconnect...');
        this.connect(token).catch(error => {
          console.error('Reconnect failed:', error);
          this.scheduleReconnect();
        });
      }
    }, this.reconnectInterval);
  }

  /**
   * Send a message to the WebSocket server
   * @param type Message type
   * @param data Message data
   */
  sendMessage(type: string, data: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket not connected');
      return;
    }
    
    const message = JSON.stringify({ type, data });
    this.socket.send(message);
  }

  /**
   * Handle incoming WebSocket messages
   * @param message The received message
   */
  private handleMessage(message: any): void {
    if (!message || !message.type) {
      console.error('Invalid message format:', message);
      return;
    }
    
    console.log('Received message:', message);
    
    // Notify all listeners for this message type
    const listeners = this.messageListeners[message.type] || [];
    listeners.forEach(listener => {
      try {
        listener(message.data);
      } catch (error) {
        console.error(`Error in message listener for type ${message.type}:`, error);
      }
    });
  }

  /**
   * Add a listener for a specific message type
   * @param type Message type to listen for
   * @param callback Function to call when message is received
   * @returns Function to remove the listener
   */
  addMessageListener(type: string, callback: Function): () => void {
    if (!this.messageListeners[type]) {
      this.messageListeners[type] = [];
    }
    
    this.messageListeners[type].push(callback);
    
    return () => {
      this.messageListeners[type] = this.messageListeners[type]?.filter(cb => cb !== callback) || [];
    };
  }

  /**
   * Send a ping message to keep the connection alive
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
   * Send a chat message to a user or group
   * @param message Message text
   * @param targetId User ID or group ID
   * @param isGroupChat Whether this is a group chat message
   */
  sendChatMessage(message: string, targetId: number, isGroupChat: boolean): void {
    this.sendMessage('chat_message', {
      message,
      targetId,
      isGroupChat
    });
  }
}

// Export singleton instance
export const websocketService = new WebSocketService(); 