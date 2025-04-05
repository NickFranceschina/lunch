import { Server } from 'socket.io';
import * as http from 'http';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from './auth';
import { AppDataSource } from './database';
import { Group } from '../models/Group';
import { GroupRestaurant } from '../models/GroupRestaurant';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { Between, LessThanOrEqual, MoreThanOrEqual, Not, IsNull } from 'typeorm';

// Initialize repositories
const groupRepository = AppDataSource.getRepository(Group);
const groupRestaurantRepository = AppDataSource.getRepository(GroupRestaurant);
const restaurantRepository = AppDataSource.getRepository(Restaurant);
const userRepository = AppDataSource.getRepository(User);

/**
 * Socket.IO server wrapper with typed clients
 */
class SocketIOServer {
  io: Server;
  lunchTimeChecker: NodeJS.Timeout | null = null;

  constructor(server: http.Server) {
    this.io = new Server(server, {
      cors: {
        origin: '*', // Allow all origins (customize as needed)
        methods: ['GET', 'POST']
      }
    });
    this.init();
    this.startLunchTimeChecker();
  }

  /**
   * Initialize Socket.IO server and set up connection handlers
   */
  private init() {
    // Middleware for authentication
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        try {
          const decoded: any = verify(token as string, JWT_SECRET);
          
          // Add user data to socket
          socket.data.userId = decoded.id || decoded.userId;
          socket.data.username = decoded.username;
          socket.data.isAdmin = decoded.isAdmin;
          socket.data.groupId = decoded.currentGroupId;
          
          console.log(`User authenticated: ${socket.data.username} (ID: ${socket.data.userId})`);
          return next();
        } catch (err) {
          console.error('Invalid token:', err);
          return next(new Error('Authentication failed'));
        }
      } catch (err) {
        console.error('Error in authentication middleware:', err);
        return next(new Error('Server error during authentication'));
      }
    });

    // Handle connections
    this.io.on('connection', async (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Update user login status in the database
      if (socket.data.userId) {
        try {
          const user = await userRepository.findOne({ where: { id: socket.data.userId } });
          if (user) {
            user.isLoggedIn = true;
            await userRepository.save(user);
            console.log(`Updated ${user.username}'s login status to true`);
            
            // Broadcast presence update to admins
            this.broadcastUserPresenceUpdate(user.id, user.username, true);
          }
        } catch (err) {
          console.error('Error updating user login status:', err);
        }
      }
      
      // Send welcome message to the client
      socket.emit('connection_established', {
        message: 'Connected to lunch app server',
        userId: socket.data.userId,
        username: socket.data.username
      });

      // Join the user to their group's room if they have one
      if (socket.data.groupId) {
        socket.join(`group:${socket.data.groupId}`);
        console.log(`User ${socket.data.username} joined group:${socket.data.groupId}`);
      }
      
      // If user is admin, join the admin room
      if (socket.data.isAdmin) {
        socket.join('admins');
        console.log(`Admin ${socket.data.username} joined admin room`);
      }

      // Handle ping messages
      socket.on('ping', () => {
        socket.emit('pong', { time: new Date().toISOString() });
      });
      
      // Handle heartbeat messages
      socket.on('heartbeat', () => {
        socket.emit('heartbeat_ack', { time: new Date().toISOString() });
      });

      // Handle group chat messages
      socket.on('group_message', async (data) => {
        console.log('Received group message:', data);
        
        // Ensure the message has a unique ID
        const messageId = data.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        // Validate message
        if (!data.message || !data.groupId) {
          socket.emit('error', { message: 'Invalid message format' });
          return;
        }
        
        // Construct message with user data and timestamp
        const message = {
          messageId,
          message: data.message,
          groupId: data.groupId,
          userId: socket.data.userId,
          username: socket.data.username,
          timestamp: data.timestamp || new Date().toISOString()
        };
        
        // Broadcast to the group room (including sender for confirmation)
        this.io.to(`group:${data.groupId}`).emit('group_message', message);
      });

      // Handle voting
      socket.on('vote', async (data) => {
        console.log('Received vote:', data);
        
        if (data.vote !== undefined && socket.data.groupId) {
          try {
            // Process the vote
            const { yesVotes, noVotes, isConfirmed } = await this.processVote(
              socket.data.groupId, 
              socket.data.userId, 
              socket.data.username, 
              data.vote
            );
            
            // Broadcast vote update to group
            this.io.to(`group:${socket.data.groupId}`).emit('vote_update', {
              userId: socket.data.userId,
              username: socket.data.username,
              vote: data.vote,
              yesVotes,
              noVotes,
              isConfirmed
            });
            
            // If confirmation status changed, update restaurant selection
            const group = await this.getGroupInfo(socket.data.groupId);
            if (group && group.currentRestaurant && isConfirmed) {
              this.sendRestaurantSelection(
                socket.data.groupId,
                group.currentRestaurant,
                isConfirmed
              );
              
              // Send a notification about confirmation
              this.sendGroupNotification(
                socket.data.groupId,
                `Restaurant "${group.currentRestaurant}" has been confirmed!`
              );
            }
          } catch (err) {
            console.error('Error processing vote:', err);
            socket.emit('error', { message: 'Error processing vote' });
          }
        }
      });

      // Handle random restaurant requests
      socket.on('request_random', async () => {
        if (!socket.data.groupId) {
          socket.emit('error', { message: 'No group assigned' });
          return;
        }
        
        try {
          await this.processNewRandomRequest(socket.data.groupId);
        } catch (err) {
          console.error('Error processing random request:', err);
          socket.emit('error', { message: 'Error processing random request' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`Socket disconnected: ${socket.id}`);
        
        // Update user login status
        if (socket.data.userId) {
          try {
            const user = await userRepository.findOne({ where: { id: socket.data.userId } });
            if (user) {
              user.isLoggedIn = false;
              await userRepository.save(user);
              console.log(`Updated ${user.username}'s login status to false`);
              
              // Broadcast presence update to admins
              this.broadcastUserPresenceUpdate(user.id, user.username, false);
            }
          } catch (err) {
            console.error('Error updating user login status on disconnect:', err);
          }
        }
      });
    });
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcastAll(message: any) {
    this.io.emit(message.type, message.data);
  }

  /**
   * Broadcast a message to a specific group
   */
  broadcastToGroup(groupId: number, message: any) {
    this.io.to(`group:${groupId}`).emit(message.type, message.data);
  }

  /**
   * Send a message to a specific user
   */
  sendToUser(userId: number, message: any) {
    const sockets = this.io.sockets.sockets;
    
    for (const [id, socket] of sockets.entries()) {
      if (socket.data.userId === userId) {
        socket.emit(message.type, message.data);
      }
    }
  }

  /**
   * Send restaurant selection to a group
   */
  sendRestaurantSelection(groupId: number, restaurantName: string, confirmed: boolean) {
    this.broadcastToGroup(groupId, {
      type: 'restaurant_selection',
      data: {
        restaurant: restaurantName,
        confirmed,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send a notification message to a group
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
   * Send a global notification to all connected clients
   */
  sendGlobalNotification(message: string) {
    this.broadcastAll({
      type: 'notification',
      data: {
        message,
        timestamp: new Date().toISOString(),
        isGlobal: true
      }
    });
  }

  /**
   * Broadcast to all admin users
   */
  broadcastToAdmins(message: any) {
    this.io.to('admins').emit(message.type, message.data);
  }

  /**
   * Broadcast user presence update to admins
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
   * Process a new random restaurant request for a group
   */
  async processNewRandomRequest(groupId: number): Promise<void> {
    try {
      // Get the group
      const group = await groupRepository.findOne({ 
        where: { id: groupId },
        relations: ['currentRestaurant']
      });
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      // Get restaurants for this group
      const groupRestaurants = await groupRestaurantRepository.find({
        where: { group: { id: groupId } },
        relations: ['restaurant']
      });
      
      if (groupRestaurants.length === 0) {
        throw new Error(`No restaurants found for group ${groupId}`);
      }
      
      // Pick a random restaurant
      const randomIndex = Math.floor(Math.random() * groupRestaurants.length);
      const selectedRestaurant = groupRestaurants[randomIndex].restaurant;
      
      // Update the group's selected restaurant
      group.currentRestaurant = selectedRestaurant;
      group.isConfirmed = false;
      group.yesVotes = 0;
      group.noVotes = 0;
      await groupRepository.save(group);
      
      // Reset votes for all users in this group
      const groupUsers = await userRepository.find({
        where: { currentGroupId: groupId }
      });
      
      // Send the selection to the group
      this.sendRestaurantSelection(
        groupId,
        selectedRestaurant.name,
        false // Not confirmed initially
      );
      
      console.log(`Selected random restaurant for group ${groupId}: ${selectedRestaurant.name}`);
    } catch (error) {
      console.error(`Error processing random restaurant request for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Process a vote from a user
   */
  async processVote(
    groupId: number, 
    userId: number, 
    username: string, 
    vote: boolean
  ): Promise<{ yesVotes: number, noVotes: number, isConfirmed: boolean }> {
    try {
      // Get the user
      const user = await userRepository.findOne({ where: { id: userId } });
      
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Get the group to update vote counts
      const group = await groupRepository.findOne({ where: { id: groupId } });
      
      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }
      
      // Update group vote counts
      if (vote) {
        group.yesVotes += 1;
      } else {
        group.noVotes += 1;
      }
      
      // Get active user count for this group
      const activeUsers = await userRepository.find({
        where: { currentGroupId: groupId }
      });
      
      const activeUserCount = activeUsers.length;
      
      // Calculate if confirmed (more than 50% yes votes)
      const isConfirmed = group.yesVotes > Math.floor(activeUserCount / 2);
      group.isConfirmed = isConfirmed;
      
      await groupRepository.save(group);
      
      return { 
        yesVotes: group.yesVotes, 
        noVotes: group.noVotes, 
        isConfirmed 
      };
    } catch (error) {
      console.error(`Error processing vote for group ${groupId}, user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get information about a group
   */
  async getGroupInfo(groupId: number): Promise<{ currentRestaurant?: string, name?: string } | null> {
    try {
      const group = await groupRepository.findOne({ 
        where: { id: groupId },
        relations: ['currentRestaurant']
      });
      
      if (!group) {
        return null;
      }
      
      return {
        currentRestaurant: group.currentRestaurant?.name,
        name: group.name
      };
    } catch (error) {
      console.error(`Error getting group info for ${groupId}:`, error);
      return null;
    }
  }

  /**
   * Start the lunch time checker that periodically checks if it's time to send lunch notifications
   */
  startLunchTimeChecker() {
    // Clear any existing timer
    if (this.lunchTimeChecker) {
      clearInterval(this.lunchTimeChecker);
    }
    
    console.log('Starting lunch time checker');
    
    // Check lunch times every minute
    this.lunchTimeChecker = setInterval(() => {
      this.checkGroupLunchTimes()
        .catch(err => console.error('Error checking lunch times:', err));
    }, 60000); // Run every minute
  }

  /**
   * Stop the lunch time checker
   */
  stopLunchTimeChecker() {
    if (this.lunchTimeChecker) {
      clearInterval(this.lunchTimeChecker);
      this.lunchTimeChecker = null;
      console.log('Lunch time checker stopped');
    }
  }

  /**
   * Manually trigger a lunch time check
   */
  async manualLunchTimeCheck(): Promise<void> {
    await this.checkGroupLunchTimes();
  }

  /**
   * Check if it's lunch time for any groups
   */
  async checkGroupLunchTimes() {
    try {
      // Get all groups
      const groups = await groupRepository.find();
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      console.log(`Checking lunch times at ${currentHour}:${currentMinute}`);
      
      for (const group of groups) {
        try {
          // Check if group has a notification time
          if (!group.notificationTime) {
            continue;
          }
          
          // Check if it's time to notify this group
          // Handle different possible formats of notificationTime
          let notificationHour: number;
          let notificationMinute: number;

          if (typeof group.notificationTime === 'string') {
            // Handle string format (e.g., "12:30:00")
            const timeParts = (group.notificationTime as string).split(':');
            notificationHour = parseInt(timeParts[0], 10);
            notificationMinute = parseInt(timeParts[1], 10);
            
            console.log(`Group ${group.id} notification time (string): ${notificationHour}:${notificationMinute}`);
          } 
          else if (group.notificationTime instanceof Date) {
            // Handle Date object
            notificationHour = group.notificationTime.getHours();
            notificationMinute = group.notificationTime.getMinutes();
            
            console.log(`Group ${group.id} notification time (Date): ${notificationHour}:${notificationMinute}`);
          }
          else {
            // If format can't be determined, log and skip
            console.log(`Group ${group.id} has invalid notification time format:`, group.notificationTime);
            continue;
          }
          
          if (notificationHour === currentHour && notificationMinute === currentMinute) {
            console.log(`It's lunch time for group ${group.name}!`);
            await this.processNewRandomRequest(group.id);
          }
        } catch (error) {
          console.error(`Error checking lunch time for group ${group.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking group lunch times:', error);
    }
  }
}

// Singleton instance
let socketIOServer: SocketIOServer | null = null;

/**
 * Initialize the Socket.IO server
 */
export const initSocketIOServer = (server: http.Server): SocketIOServer => {
  socketIOServer = new SocketIOServer(server);
  return socketIOServer;
};

/**
 * Get the Socket.IO server instance
 */
export const getSocketIOServer = (): SocketIOServer | null => {
  return socketIOServer;
}; 