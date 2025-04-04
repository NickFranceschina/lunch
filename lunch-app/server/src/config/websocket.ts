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
          
          // Fix: Correctly extract user data from decoded token
          ws.userId = decoded.id || decoded.userId;
          ws.username = decoded.username;
          ws.isAdmin = decoded.isAdmin;
          
          // Fix: Ensure currentGroupId is properly extracted and set
          ws.groupId = decoded.currentGroupId;
          
          console.log('Client authenticated with:', {
            userId: ws.userId,
            username: ws.username,
            isAdmin: ws.isAdmin,
            groupId: ws.groupId
          });
          
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
        console.log('Received vote message:', {
          data: message.data,
          vote: message.data?.vote,
          clientId: client.userId,
          clientUsername: client.username,
          clientGroup: client.groupId
        });
        
        if (message.data && message.data.vote !== undefined && client.groupId) {
          // Process the vote in the database
          this.processVote(client.groupId, client.userId || 0, client.username || 'Unknown', message.data.vote)
            .then(async ({ yesVotes, noVotes, isConfirmed }) => {
              // Broadcast the updated vote counts to the group
              this.broadcastToGroup(client.groupId || 0, {
                type: 'vote_update',
                data: {
                  userId: client.userId,
                  username: client.username,
                  vote: message.data.vote,
                  yesVotes,
                  noVotes,
                  isConfirmed
                }
              });
              
              // If confirmation status changed, update restaurant selection
              const group = await this.getGroupInfo(client.groupId || 0);
              if (group && group.currentRestaurant && isConfirmed) {
                this.sendRestaurantSelection(
                  client.groupId || 0,
                  group.currentRestaurant,
                  isConfirmed
                );
                
                // Send a notification about confirmation
                this.sendGroupNotification(
                  client.groupId || 0,
                  `Restaurant "${group.currentRestaurant}" has been confirmed!`
                );
              }
            })
            .catch(error => {
              console.error('Error processing vote:', error);
              // Send error message back to client
              client.send(JSON.stringify({
                type: 'error',
                data: {
                  message: 'Failed to process your vote'
                }
              }));
            });
        } else {
          console.error('Invalid vote message format or missing group ID:', message.data);
          client.send(JSON.stringify({
            type: 'error',
            data: {
              message: 'Invalid vote format or you are not in a group'
            }
          }));
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
        console.log('Server received chat_message:', message.data);
        if (message.data && message.data.message && message.data.targetId) {
          // For group chat
          if (message.data.isGroupChat) {
            // Extract the group ID from the message - ensure it exists
            const groupId = message.data.groupId || message.data.targetId;
            
            console.log(`Broadcasting group chat message to group ${groupId} from ${client.username || message.data.username}`);
            
            // Log active clients in this group
            const groupClients = Array.from(this.clients).filter((c: WebSocketClient) => 
              c.readyState === WebSocket.OPEN && c.groupId === groupId
            );
            console.log(`Group ${groupId} has ${groupClients.length} active clients:`, 
              groupClients.map(c => ({ 
                userId: c.userId, 
                username: c.username,
                groupId: c.groupId
              }))
            );
            
            // Use client username/userId or provided ones as fallback
            const userId = client.userId || message.data.userId;
            const username = client.username || message.data.username || 'Unknown User';
            
            console.log(`Using user info: userId=${userId}, username=${username}, groupId=${groupId}`);
            
            // Broadcast the message
            this.broadcastToGroup(groupId, {
              type: 'chat_message',
              data: {
                message: message.data.message,
                username: username,
                userId: userId,
                groupId: groupId,
                isGroupChat: true,
                timestamp: message.data.timestamp || new Date().toISOString()
              }
            });
          } else {
            // For direct chat, send to specific user
            console.log(`Sending direct chat message to user ${message.data.targetId} from ${client.username}`);
            
            // Use client username/userId or provided ones as fallback
            const userId = client.userId || message.data.userId;
            const username = client.username || message.data.username || 'Unknown User';
            
            this.sendToUser(message.data.targetId, {
              type: 'chat_message',
              data: {
                message: message.data.message,
                username: username,
                userId: userId,
                timestamp: new Date().toISOString()
              }
            });
          }
        } else {
          console.error('Invalid chat message format:', message.data);
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
    if (!groupId) {
      console.error('Cannot broadcast to invalid groupId:', groupId);
      return;
    }
    
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    let skippedCount = 0;
    const sentTo: Array<{userId?: number, username?: string}> = [];
    const skipped: Array<{userId?: number, username?: string, reason: string}> = [];
    
    console.log(`Attempting to broadcast to group ${groupId}, message type: ${message.type}`);
    
    this.clients.forEach(client => {
      // Check if client is ready to receive messages
      if (client.readyState !== WebSocket.OPEN) {
        skippedCount++;
        skipped.push({
          userId: client.userId,
          username: client.username,
          reason: `Not ready: ${['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][client.readyState] || 'UNKNOWN'}`
        });
        return;
      }
      
      // Check if client is in the target group
      if (client.groupId !== groupId) {
        skippedCount++;
        skipped.push({
          userId: client.userId,
          username: client.username,
          reason: `Wrong group: ${client.groupId} (target: ${groupId})`
        });
        return;
      }
      
      // Client is ready and in the right group, send the message
      try {
        client.send(messageStr);
        sentCount++;
        sentTo.push({
          userId: client.userId,
          username: client.username
        });
      } catch (error) {
        console.error(`Error sending to client ${client.username || 'unknown'}:`, error);
        skippedCount++;
        skipped.push({
          userId: client.userId,
          username: client.username,
          reason: 'Send error'
        });
      }
    });
    
    console.log(`Broadcast to group ${groupId}: Sent to ${sentCount} clients, skipped ${skippedCount}`);
    
    if (sentCount > 0) {
      console.log('Message sent to:', sentTo);
    }
    
    if (skippedCount > 0 && skipped.length > 0) {
      console.log('Skipped clients:', skipped);
    }
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

  /**
   * Process a vote from a client
   * @param groupId The group ID
   * @param userId The user ID
   * @param username The username
   * @param vote True for yes, false for no
   */
  async processVote(groupId: number, userId: number, username: string, vote: boolean): Promise<{
    yesVotes: number,
    noVotes: number,
    isConfirmed: boolean
  }> {
    try {
      // Find the group
      const group = await groupRepository.findOne({
        where: { id: groupId },
        relations: ['currentRestaurant']
      });
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      if (!group.currentRestaurant) {
        throw new Error('No current restaurant to vote for');
      }
      
      // Update vote count
      if (vote) {
        group.yesVotes += 1;
      } else {
        group.noVotes += 1;
      }
      
      // Calculate total votes
      const totalVotes = group.yesVotes + group.noVotes;
      
      // Check if the restaurant is confirmed: 
      // 1. More yes than no votes 
      // 2. At least 2 total votes required for confirmation (prevent single vote confirmation)
      const isConfirmed = group.yesVotes > group.noVotes && totalVotes >= 2;
      const wasConfirmedBefore = group.isConfirmed;
      group.isConfirmed = isConfirmed;
      
      // Save the updated group
      await groupRepository.save(group);
      
      // Return the updated vote counts
      return {
        yesVotes: group.yesVotes,
        noVotes: group.noVotes,
        isConfirmed
      };
    } catch (error) {
      console.error('Error processing vote:', error);
      throw error;
    }
  }
  
  /**
   * Get information about a group
   * @param groupId The group ID
   */
  async getGroupInfo(groupId: number): Promise<{ currentRestaurant?: string } | null> {
    try {
      const group = await groupRepository.findOne({
        where: { id: groupId },
        relations: ['currentRestaurant']
      });
      
      if (!group) {
        return null;
      }
      
      return {
        currentRestaurant: group.currentRestaurant?.name
      };
    } catch (error) {
      console.error('Error getting group info:', error);
      return null;
    }
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