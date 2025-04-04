import * as WebSocket from 'ws';
import * as http from 'http';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from './auth';
import { AppDataSource } from './database';
import { Group } from '../models/Group';
import { GroupRestaurant } from '../models/GroupRestaurant';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';

// Initialize repositories
const groupRepository = AppDataSource.getRepository(Group);
const groupRestaurantRepository = AppDataSource.getRepository(GroupRestaurant);
const restaurantRepository = AppDataSource.getRepository(Restaurant);
const userRepository = AppDataSource.getRepository(User);

/**
 * WebSocket connection client with associated data
 */
interface WebSocketClient extends WebSocket {
  userId?: number;
  username?: string;
  isAdmin?: boolean;
  groupId?: number;
}

/**
 * WebSocket server wrapper with typed clients
 */
class WebSocketServer {
  wss: WebSocket.Server;
  clients: Set<WebSocketClient> = new Set();

  constructor(server: http.Server) {
    // Add CORS support to WebSocket server
    this.wss = new WebSocket.Server({ 
      server,
      // Allow all origins
      verifyClient: (info, callback) => {
        // Log incoming connection attempts
        console.log('WebSocket connection attempt from origin:', info.origin);
        callback(true); // Accept all connections at this stage, we'll authenticate with token later
      }
    });
    this.init();
  }

  /**
   * Initialize WebSocket server and set up connection handlers
   */
  private init() {
    this.wss.on('connection', (ws: WebSocketClient, req) => {
      console.log('WebSocket client connected', {
        address: req.socket.remoteAddress,
        headers: req.headers
      });
      this.clients.add(ws);

      // Handle authentication via URL params
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      console.log('WebSocket connection URL:', url.toString());
      console.log('Token present:', !!token);
      
      if (token) {
        try {
          const decoded: any = verify(token, JWT_SECRET);
          console.log('Token verified successfully for user:', decoded.username);
          ws.userId = decoded.userId;
          ws.username = decoded.username;
          ws.isAdmin = decoded.isAdmin;
          ws.groupId = decoded.currentGroupId;
          
          // Update user login status in the database
          if (ws.userId) {
            userRepository.findOne({ where: { id: ws.userId } })
              .then(user => {
                if (user) {
                  user.isLoggedIn = true;
                  userRepository.save(user)
                    .then(() => {
                      console.log(`Updated ${user.username}'s login status to true`);
                      // Broadcast presence update to admins
                      this.broadcastUserPresenceUpdate(user.id, user.username, true);
                    })
                    .catch(err => console.error('Error updating user login status:', err));
                }
              })
              .catch(err => console.error('Error finding user:', err));
          }
          
          // Send welcome message to authenticated client
          ws.send(JSON.stringify({
            type: 'connection_established',
            data: {
              message: 'Connected to lunch app server',
              userId: ws.userId,
              username: ws.username
            }
          }));
        } catch (err) {
          console.error('Invalid token:', err);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Authentication failed' }
          }));
          ws.close();
          return;
        }
      } else {
        console.log('Client without token');
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Authentication token required' }
        }));
        ws.close();
        return;
      }

      // Handle messages from clients
      ws.on('message', (message: WebSocket.Data) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          this.handleClientMessage(ws, parsedMessage);
        } catch (err) {
          console.error('Error parsing message:', err);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' }
          }));
        }
      });

      // Handle client disconnection
      ws.on('close', () => {
        console.log(`Client ${ws.username || 'unknown'} disconnected`);
        
        // Update user login status in the database when disconnected
        if (ws.userId) {
          userRepository.findOne({ where: { id: ws.userId } })
            .then(user => {
              if (user) {
                user.isLoggedIn = false;
                userRepository.save(user)
                  .then(() => {
                    console.log(`Updated ${user.username}'s login status to false`);
                    // Broadcast presence update to admins
                    this.broadcastUserPresenceUpdate(user.id, user.username, false);
                  })
                  .catch(err => console.error('Error updating user login status on disconnect:', err));
              }
            })
            .catch(err => console.error('Error finding user on disconnect:', err));
        }
        
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Handle messages received from clients
   */
  private handleClientMessage(client: WebSocketClient, message: any) {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'ping':
        client.send(JSON.stringify({ type: 'pong', data: { time: new Date().toISOString() } }));
        break;
        
      case 'vote':
        // Handle voting and broadcast to relevant clients
        if (message.data && message.data.vote !== undefined) {
          this.broadcastToGroup(client.groupId || 0, {
            type: 'vote_update',
            data: {
              userId: client.userId,
              username: client.username,
              vote: message.data.vote
            }
          });
        }
        break;
        
      case 'new_random':
        // Handle new random restaurant request
        if (client.groupId) {
          const groupId = client.groupId;
          
          // Notify the group that someone is requesting a new random
          this.broadcastToGroup(groupId, {
            type: 'notification',
            data: {
              message: `${client.username} is selecting a new random restaurant...`,
              timestamp: new Date().toISOString()
            }
          });
          
          // Process the random restaurant request
          this.processNewRandomRequest(groupId)
            .catch(error => console.error('Error in processNewRandomRequest:', error));
        }
        break;
        
      case 'chat_message':
        // Handle chat message
        if (message.data && message.data.message && message.data.targetId) {
          // For group chat
          if (message.data.isGroupChat) {
            this.broadcastToGroup(message.data.targetId, {
              type: 'chat_message',
              data: {
                message: message.data.message,
                username: client.username,
                userId: client.userId,
                groupId: message.data.targetId,
                timestamp: new Date().toISOString()
              }
            });
          } else {
            // For direct chat, send to specific user
            this.sendToUser(message.data.targetId, {
              type: 'chat_message',
              data: {
                message: message.data.message,
                username: client.username,
                userId: client.userId,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
        break;
        
      case 'notification':
        // Handle notification message from a client
        if (message.data && message.data.message) {
          if (message.data.groupId) {
            // Send to specific group
            this.sendGroupNotification(message.data.groupId, message.data.message);
          } else {
            // Send to all users if client is admin
            if (client.isAdmin) {
              this.sendGlobalNotification(message.data.message);
            }
          }
        }
        break;
        
      default:
        console.log(`Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcastAll(message: any) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Broadcast a message to all clients in a specific group
   */
  broadcastToGroup(groupId: number, message: any) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.groupId === groupId) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Send a message to a specific user
   */
  sendToUser(userId: number, message: any) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Send a restaurant selection update to a group
   */
  sendRestaurantSelection(groupId: number, restaurantName: string, confirmed: boolean) {
    this.broadcastToGroup(groupId, {
      type: 'restaurant_selection',
      data: {
        restaurantName,
        confirmed,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send a notification to a group
   */
  sendGroupNotification(groupId: number, message: string) {
    this.broadcastToGroup(groupId, {
      type: 'notification',
      data: {
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send a notification to all users
   */
  sendGlobalNotification(message: string) {
    this.broadcastAll({
      type: 'notification',
      data: {
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Process a request for a new random restaurant
   * This is similar to the getRandomRestaurant controller function
   * but adapted for WebSocket context
   */
  async processNewRandomRequest(groupId: number): Promise<void> {
    try {
      // Verify the group exists
      const group = await groupRepository.findOne({
        where: { id: groupId }
      });
      
      if (!group) {
        console.error(`Group with ID ${groupId} not found`);
        return;
      }
      
      // Get all restaurants for this group using GroupRestaurant
      const groupRestaurants = await groupRestaurantRepository.find({
        where: { groupId },
        relations: ['restaurant']
      });
      
      if (!groupRestaurants || groupRestaurants.length === 0) {
        console.error(`No restaurants found for group ${groupId}`);
        this.sendGroupNotification(groupId, "No restaurants available for this group");
        return;
      }
      
      // Select a random restaurant
      const randomIndex = Math.floor(Math.random() * groupRestaurants.length);
      const randomRestaurant = groupRestaurants[randomIndex].restaurant;
      
      // Reset votes for the group
      group.yesVotes = 0;
      group.noVotes = 0;
      group.currentRestaurant = randomRestaurant;
      group.isConfirmed = false;
      await groupRepository.save(group);
      
      // Broadcast the restaurant selection
      this.sendRestaurantSelection(groupId, randomRestaurant.name, false);
      
    } catch (error) {
      console.error('Error processing new random restaurant request:', error);
      this.sendGroupNotification(groupId, "Error selecting a random restaurant");
    }
  }

  /**
   * Broadcast a message to all admins
   */
  broadcastToAdmins(message: any) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.isAdmin) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Broadcast a user presence update to admin users
   */
  broadcastUserPresenceUpdate(userId: number, username: string, isLoggedIn: boolean) {
    this.broadcastToAdmins({
      type: 'user_presence_update',
      data: {
        userId,
        username,
        isLoggedIn,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Export singleton instance that will be initialized with server
let wsServer: WebSocketServer | null = null;

export const initWebSocketServer = (server: http.Server): WebSocketServer => {
  if (!wsServer) {
    wsServer = new WebSocketServer(server);
  }
  return wsServer;
};

export const getWebSocketServer = (): WebSocketServer | null => {
  return wsServer;
}; 