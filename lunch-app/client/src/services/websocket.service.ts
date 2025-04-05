/**
 * WebSocket service for handling real-time communication with the server
 */

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageListeners: { [key: string]: ((data: any) => void)[] } = {};
  private connectionListeners: ((isConnected: boolean) => void)[] = [];
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private lastConnectionState: boolean = false;
  private processedMessageIds: Set<string> = new Set<string>();
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPongReceived: number = 0;
  private connectionAttempt: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private lastHeartbeatResponse: number = 0;
  private sentMessageAcks: Map<string, boolean> = new Map(); // Track which messages were acknowledged
  private connectionStableTimeout: NodeJS.Timeout | null = null;
  private isConnectionStable: boolean = false;
  private sessionId: string = this.generateSessionId(); // Unique ID for this browser tab

  // Generate a unique session ID for this tab
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  constructor() {
    // When the service is created, set up cross-tab message handling
    this.setupCrossTabCommunication();

    // Load any previously seen message IDs from sessionStorage
    this.loadProcessedMessageIds();
  }

  // Set up communication between tabs for sharing processed message IDs
  private setupCrossTabCommunication(): void {
    // Listen for processed message IDs from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'ws_processed_message') {
        try {
          const data = JSON.parse(event.newValue || '{}');
          if (data.messageId && data.sessionId !== this.sessionId) {
            // Add this message ID to our processed set if from another tab
            this.processedMessageIds.add(data.messageId);
            console.log(`Added message ID ${data.messageId} from another tab`);
          }
        } catch (error) {
          console.error('Error parsing cross-tab message:', error);
        }
      }
    });
  }

  // Load previously processed message IDs from sessionStorage
  private loadProcessedMessageIds(): void {
    try {
      const savedIds = sessionStorage.getItem('processed_message_ids');
      if (savedIds) {
        const idArray = JSON.parse(savedIds);
        idArray.forEach((id: string) => this.processedMessageIds.add(id));
        console.log(`Loaded ${idArray.length} processed message IDs from storage`);
      }
    } catch (error) {
      console.error('Error loading processed message IDs:', error);
    }
  }

  // Save processed message IDs to sessionStorage
  private saveProcessedMessageIds(): void {
    try {
      if (this.processedMessageIds.size > 0) {
        const idArray = Array.from(this.processedMessageIds);
        // Only store the last 1000 IDs to avoid storage limits
        const trimmedArray = idArray.slice(-1000);
        sessionStorage.setItem('processed_message_ids', JSON.stringify(trimmedArray));
      }
    } catch (error) {
      console.error('Error saving processed message IDs:', error);
    }
  }

  // Share a processed message ID with other tabs
  private shareProcessedMessageId(messageId: string): void {
    try {
      localStorage.setItem('ws_processed_message', JSON.stringify({
        messageId,
        sessionId: this.sessionId,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error sharing processed message ID:', error);
    }
  }

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
    console.log("WebSocketService connect called");
    return new Promise((resolve, reject) => {
      // If already connected or connecting, just resolve
      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.isConnecting)) {
        console.log("WebSocket already open or connecting.");
        resolve();
        return;
      }

      // Clear previous reconnect timer if any
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.isConnecting = true;
      this.connectionAttempt++;
      console.log(`WebSocket connection attempt ${this.connectionAttempt}`);

      // Get the correct URL based on environment
      const url = this.getWebSocketURL(token);
      
      // Log the WebSocket URL with token partially masked
      const maskedUrl = url.replace(/token=([^&]+)/, (match, t) => {
        return `token=${t.substring(0, 5)}...${t.substring(t.length - 5)}`;
      });
      console.log('Connecting to WebSocket server at:', maskedUrl);
      
      try {
        this.socket = new WebSocket(url);
        console.log('WebSocket instance created, connection pending...');
        
        // Set a connection timeout (e.g., 10 seconds)
        const connectionTimeout = setTimeout(() => {
          if (this.isConnecting) {
            console.error(`WebSocket connection timeout after 10 seconds (Attempt ${this.connectionAttempt})`);
            this.isConnecting = false;
            if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
              this.socket.close(); // Close the attempt
              this.socket = null;  // Discard the instance
            }
            this.broadcastConnectionStatus(false);
            this.scheduleReconnect(token); // Schedule reconnect on timeout
            resolve(); // Resolve promise even on timeout to avoid blocking UI
          }
        }, 10000);
        
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnecting = false;
          this.connectionAttempt = 0; // Reset attempt counter on success
          clearTimeout(connectionTimeout);
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          this.broadcastConnectionStatus(true);
          this.startPing(); // Start sending pings
          this.startHeartbeat(); // Start heartbeat monitoring
          // Initialize heartbeat response time to now
          this.lastHeartbeatResponse = Date.now();
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'pong') {
                this.handlePong();
            } else {
                this.handleMessage(message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onerror = (event) => {
          console.error('WebSocket error:', event);
          // Log more details if available
          const errorDetails = {
             type: event.type,
             timestamp: new Date().toISOString(),
             browserInfo: navigator.userAgent // Basic browser info
          };
          console.error('Connection failed to:', url); // Log the URL it tried
          console.error('Error details:', errorDetails);
          // Don't clear timeout here, let the timeout handler or onclose handle it
        };

        this.socket.onclose = (event) => {
           console.warn(`WebSocket connection closed: Code ${event.code} - ${event.reason || 'No reason provided'}`);
           const closeDetails = {
              wasClean: event.wasClean,
              code: event.code,
              reason: event.reason || 'No reason provided',
              timestamp: new Date().toISOString()
           }
           console.log('Close event details:', closeDetails);

          this.isConnecting = false;
          clearTimeout(connectionTimeout); // Clear timeout if connection closes
          this.stopPing(); // Stop sending pings
          this.socket = null;
          this.broadcastConnectionStatus(false);

          // Schedule reconnect only if the close was unexpected (e.g., code 1006)
          if (!event.wasClean || event.code === 1006) { // 1006 is abnormal closure
              console.log('Unclean close, will attempt to reconnect');
              this.scheduleReconnect(token);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket instance:', error);
        this.isConnecting = false;
        this.scheduleReconnect(token);
        reject(error); // Reject promise if WebSocket constructor fails
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
    
    // Clear all message listeners to prevent memory leaks - reset to empty object instead of undefined
    this.messageListeners = {};
    
    // Clear connection listeners - reset to empty array instead of undefined
    this.connectionListeners = [];
    
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
  addMessageListener(type: string, callback: (data: any) => void): () => void {
    if (!this.messageListeners[type]) {
      this.messageListeners[type] = [];
    }
    this.messageListeners[type].push(callback);
    console.log(`Added listener for ${type}, now has ${this.messageListeners[type].length} listeners`);

    // Return an unsubscribe function
    return () => {
      // Add null/undefined check before filtering
      if (this.messageListeners && this.messageListeners[type]) {
        this.messageListeners[type] = this.messageListeners[type].filter(cb => cb !== callback);
        console.log(`Removed listener for ${type}, now has ${this.messageListeners[type].length} listeners`);
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
    // Update heartbeat timestamp for ANY message received
    this.updateHeartbeatResponse();
    
    // Handle message acknowledgments
    if (message.type === 'message_ack' && message.data?.messageId) {
      console.log(`Received acknowledgment for message ${message.data.messageId}`);
      if (this.sentMessageAcks.has(message.data.messageId)) {
        this.sentMessageAcks.set(message.data.messageId, true);
      }
      return; // Don't need further processing for acks
    }
    
    // For chat messages, use proper message ID tracking
    if (message.type === 'chat_message') {
      const messageId = message.data?.messageId || 
                        `${message.data?.userId}-${message.data?.message}-${message.data?.timestamp}`;
      
      // Check if we've already processed this exact message
      if (this.processedMessageIds.has(messageId)) {
        console.log('Ignoring already processed message:', messageId);
        return;
      }
      
      // Mark as processed and share with other tabs
      this.processedMessageIds.add(messageId);
      this.shareProcessedMessageId(messageId);
      this.saveProcessedMessageIds();
      
      // Send acknowledgment if requested
      if (message.data?.requestAck && this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({
            type: 'message_ack',
            data: {
              messageId: message.data.messageId,
              timestamp: Date.now()
            }
          }));
        } catch (e) {
          console.error('Failed to send message acknowledgment:', e);
        }
      }
    }
    
    // Legacy message ID handling
    if (message.id && this.processedMessageIds.has(message.id)) {
      console.log('Ignoring duplicate message by ID:', message.id);
      return;
    }
    
    // Add any message ID to processed set
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
            icon: '/favicon.ico'
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
            icon: '/favicon.ico'
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
   * Check if the WebSocket is currently connected
   */
  isConnected(): boolean {
    // First check if socket exists
    if (!this.socket) {
      return false;
    }
    
    // Then check readyState
    const connected = this.socket.readyState === WebSocket.OPEN;
    
    // If basic connection check failed, we're definitely not connected
    if (!connected) {
      // If we thought we were connected before, this is a state change
      if (this.lastConnectionState) {
        console.log('WebSocketService - Socket disconnected, no longer OPEN');
        this.lastConnectionState = false;
        this.broadcastConnectionStatus(false);
        this.isConnectionStable = false;
      }
      return false;
    }
    
    // Now check heartbeat - more forgiving timeout (20 seconds instead of 15)
    // This helps avoid flapping connections
    const hasRecentHeartbeat = (Date.now() - this.lastHeartbeatResponse) < 20000;
    
    // Only consider disconnected if we have an old connection AND we've had at least one heartbeat
    const isActuallyConnected = connected && 
      (this.lastHeartbeatResponse === 0 || hasRecentHeartbeat);
    
    // If our state suddenly changes, handle it
    if (this.lastConnectionState !== isActuallyConnected) {
      console.log(`WebSocketService - Connection state change detected: ${this.lastConnectionState} → ${isActuallyConnected}`);
      
      // Clear the stable connection timeout if we're disconnecting
      if (!isActuallyConnected && this.connectionStableTimeout) {
        clearTimeout(this.connectionStableTimeout);
        this.connectionStableTimeout = null;
        this.isConnectionStable = false;
      }
      
      // Start a timer for stable connection if we just connected
      if (isActuallyConnected && !this.isConnectionStable && !this.connectionStableTimeout) {
        console.log('Starting connection stability timer');
        this.connectionStableTimeout = setTimeout(() => {
          this.isConnectionStable = true;
          console.log('WebSocketService - Connection is now considered stable');
        }, 3000); // Wait 3 seconds to consider the connection stable
      }
      
      // Update last state and broadcast change
      this.lastConnectionState = isActuallyConnected;
      this.broadcastConnectionStatus(isActuallyConnected);
    }
    
    return isActuallyConnected;
  }

  /**
   * Check if the connection is stable (connected for at least 3 seconds)
   */
  isStableConnection(): boolean {
    return this.isConnected() && this.isConnectionStable;
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(token: string): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    // Exponential backoff for reconnect attempts
    const delay = Math.min(30000, Math.pow(2, this.connectionAttempt) * 1000);
    console.log(`Scheduling WebSocket reconnect attempt ${this.connectionAttempt + 1} in ${delay / 1000} seconds...`);
    
    this.reconnectTimer = setTimeout(() => {
       if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
           console.log('Attempting to reconnect to WebSocket server...');
           this.connect(token).catch(err => console.error("Reconnect attempt failed:", err));
       }
    }, delay);
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
   * @param message Message content
   * @param targetId User ID or Group ID
   * @param isGroupChat Whether this is a group chat
   * @returns The generated message ID for tracking
   */
  sendChatMessage(message: string, targetId: number, isGroupChat = false): string {
    if (!this.isConnected()) {
      console.error('Cannot send chat message: WebSocket not connected');
      throw new Error('WebSocket not connected');
    }
    
    if (!message || !targetId) {
      console.error('Cannot send chat message: Missing required data', { message, targetId });
      throw new Error('Missing required message data');
    }
    
    // Get the current authenticated user ID
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (!userId) {
      console.error('Cannot send chat message: User ID not available');
      throw new Error('User ID not available');
    }
    
    // Generate a unique message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    try {
      const timestamp = new Date().toISOString();
      
      const payload = {
        type: 'chat_message',
        data: {
          messageId: messageId,                 // Unique ID to prevent duplication
          message: message,                     // Content
          timestamp: timestamp,                 // ISO string timestamp
          userId: parseInt(userId, 10),         // Sender ID 
          username: username || 'Unknown',      // Sender name
          targetId: targetId,                   // Target user/group ID
          isGroupChat: isGroupChat,             // Flag for group vs direct
          groupId: isGroupChat ? targetId : undefined, // For group messages
          requestAck: true                      // Request server acknowledgment
        }
      };
      
      // Track this message ID to prevent duplicates if it comes back to us
      this.processedMessageIds.add(messageId);
      
      // Track that we're waiting for acknowledgment
      this.sentMessageAcks.set(messageId, false);
      
      // Set a timeout to retry if no acknowledgment received
      setTimeout(() => {
        if (this.sentMessageAcks.has(messageId) && !this.sentMessageAcks.get(messageId)) {
          console.warn(`No acknowledgment received for message ${messageId} after 5 seconds`);
          
          // Check if we're still connected
          if (this.isConnected()) {
            console.log('Still connected, marking message as potentially failed');
            // We could implement a retry mechanism here if needed
          } else {
            console.log('Connection lost, message delivery uncertain');
          }
        }
      }, 5000);
      
      // Log message with sensitive data masked
      console.log('Sending chat message:', {
        ...payload,
        data: {
          ...payload.data,
          message: message.length > 20 ? 
            `${message.substring(0, 20)}...` : message
        }
      });
      
      // Send the message
      this.socket?.send(JSON.stringify(payload));
      
      // Return the message ID for reference
      return messageId;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  // Get WebSocket URL based on environment
  private getWebSocketURL(token: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    let protocol: string;
    let host: string;
    let port: string;

    if (isProduction) {
      // In production (Docker combined server), use relative path
      protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      host = window.location.hostname;
      port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    } else {
      // In development (separate servers), explicitly target backend port
      protocol = 'ws:'; // Assuming non-HTTPS locally
      host = 'localhost';
      port = '3001'; // Backend server port
    }
    
    // Append token as query parameter
    return `${protocol}//${host}:${port}?token=${token}`;
  }

  private handlePong(): void {
    this.lastPongReceived = Date.now();
    // console.log("Pong received");
  }

  private startPing(): void {
    this.stopPing(); // Ensure no duplicate intervals
    this.lastPongReceived = Date.now(); // Initialize
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Check if pong was received recently (e.g., within 35 seconds)
        if (Date.now() - this.lastPongReceived > 35000) {
          console.warn("WebSocket pong timeout. Closing connection.");
          this.socket.close(1006, "Pong timeout"); // Trigger reconnect
          this.stopPing();
          return;
        }
        // Send ping
        this.sendMessage('ping', { timestamp: Date.now() });
      } else {
        this.stopPing(); // Stop if socket is not open
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop sending ping messages
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    // Also stop the heartbeat system
    this.stopHeartbeat();
  }

  // Add listener for connection status changes
  addConnectionListener(callback: (isConnected: boolean) => void): () => void {
      this.connectionListeners.push(callback);
      // Immediately notify the new listener of the current status
      callback(this.socket?.readyState === WebSocket.OPEN);

      return () => {
          // Add null/undefined check before filtering
          if (this.connectionListeners) {
              this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
          }
      };
  }

  /**
   * Start sending heartbeats to verify connection is alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    // Initialize last heartbeat time
    this.lastHeartbeatResponse = Date.now();
    
    // Send heartbeat every 5 seconds (less aggressive than 3s)
    this.heartbeatInterval = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      
      try {
        // Send a heartbeat ping with a unique ID
        const heartbeatId = Date.now().toString();
        this.socket.send(JSON.stringify({ 
          type: 'heartbeat', 
          data: { 
            timestamp: Date.now(),
            heartbeatId: heartbeatId,
            sessionId: this.sessionId // Include session ID for better tracking
          } 
        }));
        
        // Set a timeout to verify response
        this.heartbeatTimeout = setTimeout(() => {
          // If it's been more than 12 seconds since last response, connection is likely dead
          const timeSinceLastResponse = Date.now() - this.lastHeartbeatResponse;
          if (timeSinceLastResponse > 12000) {
            console.warn(`WebSocketService - No heartbeat response in ${timeSinceLastResponse}ms, connection may be dead`);
            
            // Don't immediately disconnect - try once more with a ping
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              try {
                this.socket.send(JSON.stringify({ 
                  type: 'ping', 
                  data: { timestamp: Date.now() } 
                }));
                
                // If still no response after another 3 seconds, then consider dead
                setTimeout(() => {
                  if (Date.now() - this.lastHeartbeatResponse > 15000) {
                    console.error('WebSocketService - Connection confirmed dead, closing');
                    this.broadcastConnectionStatus(false);
                    this.isConnectionStable = false;
                    
                    // Force close and reconnect
                    if (this.socket) {
                      try {
                        this.socket.close(4000, "Heartbeat timeout");
                      } catch (e) {
                        console.error("Error closing socket:", e);
                      }
                      this.socket = null;
                    }
                    
                    // Get token and attempt reconnection after a short delay
                    const token = localStorage.getItem('token');
                    if (token) {
                      setTimeout(() => {
                        this.connect(token).catch(err => {
                          console.error('Failed to reconnect after heartbeat failure:', err);
                        });
                      }, 2000); // Longer delay before reconnecting to avoid connection flapping
                    }
                  }
                }, 3000);
              } catch (pingError) {
                console.error('Error sending emergency ping:', pingError);
              }
            }
          }
        }, 7000); // Longer timeout for heartbeat response
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    }, 5000); // Every 5 seconds
  }
  
  /**
   * Stop sending heartbeats
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
  
  /**
   * Update the last heartbeat response time
   */
  private updateHeartbeatResponse(): void {
    this.lastHeartbeatResponse = Date.now();
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService(); 