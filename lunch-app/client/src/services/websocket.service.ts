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
        console.error('Error creating WebSocket:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Disconnecting');
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
   * Add event listener for a specific message type
   * @param type Message type to listen for
   * @param callback Function to call when message is received
   * @returns Function to remove the listener
   */
  addMessageListener(type: string, callback: Function): () => void {
    if (!this.messageListeners[type]) {
      this.messageListeners[type] = [];
    }
    
    this.messageListeners[type].push(callback);
    
    // Return a function to remove this listener
    return () => {
      // Check if the type and callback still exist before trying to find its index
      if (this.messageListeners && this.messageListeners[type]) {
        const index = this.messageListeners[type].indexOf(callback);
        if (index !== -1) {
          this.messageListeners[type].splice(index, 1);
        }
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   * @param message Parsed message from the server
   */
  private handleMessage(message: any): void {
    const { type, data } = message;
    
    if (!type) {
      console.warn('Received message without type:', message);
      return;
    }
    
    // Notify all listeners for this message type
    const listeners = this.messageListeners[type] || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in message listener for type "${type}":`, error);
      }
    });
    
    // Also notify "all" listeners
    const allListeners = this.messageListeners['all'] || [];
    allListeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in "all" message listener:', error);
      }
    });
  }

  /**
   * Check if WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
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

// Create a singleton instance
export const websocketService = new WebSocketService(); 