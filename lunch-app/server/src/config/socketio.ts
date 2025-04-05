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
import { DateTime } from 'luxon';

// Helper function for consistent logging with timestamps
const logWithTimestamp = (message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, ...args);
};

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
          
          logWithTimestamp(`User authenticated: ${socket.data.username} (ID: ${socket.data.userId})`);
          return next();
        } catch (err) {
          logWithTimestamp('Invalid token:', err);
          return next(new Error('Authentication failed'));
        }
      } catch (err) {
        logWithTimestamp('Error in authentication middleware:', err);
        return next(new Error('Server error during authentication'));
      }
    });

    // Handle connections
    this.io.on('connection', async (socket) => {
      logWithTimestamp(`Socket connected: ${socket.id}`);
      
      // Update user login status in the database
      if (socket.data.userId) {
        try {
          const user = await userRepository.findOne({ where: { id: socket.data.userId } });
          if (user) {
            user.isLoggedIn = true;
            await userRepository.save(user);
            logWithTimestamp(`Updated ${user.username}'s login status to true`);
            
            // Broadcast presence update to admins
            this.broadcastUserPresenceUpdate(user.id, user.username, true);
          }
        } catch (err) {
          logWithTimestamp('Error updating user login status:', err);
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
        logWithTimestamp(`User ${socket.data.username} joined group:${socket.data.groupId}`);
      }
      
      // If user is admin, join the admin room
      if (socket.data.isAdmin) {
        socket.join('admins');
        logWithTimestamp(`Admin ${socket.data.username} joined admin room`);
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
        logWithTimestamp('Received group message:', data);
        
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
        logWithTimestamp('Received vote:', data);
        
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
            logWithTimestamp('Error processing vote:', err);
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
          logWithTimestamp('Error processing random request:', err);
          socket.emit('error', { message: 'Error processing random request' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        logWithTimestamp(`Socket disconnected: ${socket.id}`);
        
        // Update user login status
        if (socket.data.userId) {
          try {
            const user = await userRepository.findOne({ where: { id: socket.data.userId } });
            if (user) {
              user.isLoggedIn = false;
              await userRepository.save(user);
              logWithTimestamp(`Updated ${user.username}'s login status to false`);
              
              // Broadcast presence update to admins
              this.broadcastUserPresenceUpdate(user.id, user.username, false);
            }
          } catch (err) {
            logWithTimestamp('Error updating user login status on disconnect:', err);
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
    logWithTimestamp(`Broadcasting to group:${groupId}:`, {
      type: message.type,
      data: message.data
    });
    
    // Check if we have clients in the room before broadcasting
    const room = this.io.sockets.adapter.rooms.get(`group:${groupId}`);
    const oldFormatRoom = this.io.sockets.adapter.rooms.get(`group_${groupId}`);
    
    logWithTimestamp(`Room for group:${groupId} has ${room ? room.size : 0} clients`);
    logWithTimestamp(`Old format room for group_${groupId} has ${oldFormatRoom ? oldFormatRoom.size : 0} clients`);
    
    // Make sure we're emitting to the correct room format
    // Emit directly to the rooms using the event type as the event name
    this.io.to(`group:${groupId}`).emit(message.type, message.data);
    
    // Also emit to the old format room for backward compatibility
    this.io.to(`group_${groupId}`).emit(message.type, message.data);
    
    // Also log that the event was sent
    logWithTimestamp(`Sent ${message.type} event to group:${groupId} with data:`, message.data);
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
  sendRestaurantSelection(groupId: number, restaurantName: string, confirmed: boolean, isScheduledEvent: boolean = false) {
    // Create payload with the scheduled flag
    const payload = {
      restaurant: restaurantName,
      confirmed,
      timestamp: new Date().toISOString(),
      isScheduledEvent: isScheduledEvent
    };
    
    // Log detailed information
    logWithTimestamp('SENDING RESTAURANT SELECTION:', {
      groupId,
      restaurantName,
      confirmed,
      isScheduledEvent,
      timestamp: new Date().toISOString(),
      fullPayload: payload
    });
    
    this.broadcastToGroup(groupId, {
      type: 'restaurant_selection',
      data: payload
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
  async processNewRandomRequest(groupId: number, isScheduledEvent: boolean = false): Promise<void> {
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
        false,
        isScheduledEvent
      );
      
      logWithTimestamp(`Selected random restaurant for group ${groupId}: ${selectedRestaurant.name}`);
    } catch (error) {
      logWithTimestamp(`Error processing random restaurant request for group ${groupId}:`, error);
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
      logWithTimestamp(`Error processing vote for group ${groupId}, user ${userId}:`, error);
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
      logWithTimestamp(`Error getting group info for ${groupId}:`, error);
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
      this.lunchTimeChecker = null;
    }
    
    logWithTimestamp('Starting lunch time checker');
    
    // Run an immediate check to see the state of notifications
    logWithTimestamp('Running immediate notification check on server startup');
    this.checkGroupLunchTimes(true)
      .catch(err => logWithTimestamp('Error in startup notification check:', err));
    
    // First, calculate the delay until the next minute starts (at :00 seconds)
    const now = new Date();
    const delayMs = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    // Wait until the start of the next minute to begin our interval
    setTimeout(() => {
      logWithTimestamp(`Lunch time checker aligned with global minute starting at ${new Date().toISOString()} (UTC)`);
      
      // Run an initial check
      this.checkGroupLunchTimes()
        .catch(err => logWithTimestamp('Error in initial lunch time check:', err));
      
      // Then set up the interval to run exactly every 60 seconds
      this.lunchTimeChecker = setInterval(() => {
        this.checkGroupLunchTimes()
          .catch(err => logWithTimestamp('Error checking lunch times:', err));
      }, 60000); // Run every minute
    }, delayMs);
  }

  /**
   * Stop the lunch time checker
   */
  stopLunchTimeChecker() {
    if (this.lunchTimeChecker) {
      clearInterval(this.lunchTimeChecker);
      this.lunchTimeChecker = null;
      logWithTimestamp('Lunch time checker stopped');
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
  async checkGroupLunchTimes(isStartupCheck: boolean = false) {
    try {
      // Get all groups
      const groups = await groupRepository.find();
      
      // Get current time in UTC using Luxon
      const nowUTC = DateTime.utc();
      
      if (isStartupCheck) {
        logWithTimestamp(`STARTUP CHECK: Server time is ${nowUTC.toISO()}`);
        logWithTimestamp(`STARTUP CHECK: Current time is ${nowUTC.toFormat('HH:mm:ss')} UTC / ${nowUTC.setZone('America/New_York').toFormat('HH:mm:ss')} EST`);
      } else {
        logWithTimestamp(`Checking lunch times at ${nowUTC.toFormat('HH:mm:ss')} UTC`);
      }
      
      // Sort groups by notification time for easier reading in logs
      const sortedGroups = [...groups].sort((a, b) => {
        if (!a.notificationTime) return 1;
        if (!b.notificationTime) return -1;
        return a.notificationTime.toString().localeCompare(b.notificationTime.toString());
      });
      
      let upcomingNotifications = [];
      
      for (const group of sortedGroups) {
        try {
          // Check if group has a notification time and timezone
          if (!group.notificationTime) {
            continue;
          }
          
          // Get group's timezone or default to EST
          const groupTimezone = group.timezone || 'America/New_York';
          
          let notificationDateTime: DateTime;
          
          // Parse notification time
          if (typeof group.notificationTime === 'string') {
            // Handle string format (e.g., "12:30:00" or "12:30")
            const timeParts = (group.notificationTime as string).split(':');
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            
            // Create a DateTime object in the group's timezone
            notificationDateTime = DateTime.now().setZone(groupTimezone).set({
              hour: hours,
              minute: minutes,
              second: 0,
              millisecond: 0
            });
            
            logWithTimestamp(`Group ${group.id} (${group.name}) notification time: ${notificationDateTime.toFormat('HH:mm')} ${groupTimezone} / ${notificationDateTime.toUTC().toFormat('HH:mm')} UTC`);
          } 
          else if (group.notificationTime instanceof Date) {
            // Handle Date object by converting to Luxon DateTime
            const dateObj = group.notificationTime;
            
            // Create DateTime in UTC from the date
            notificationDateTime = DateTime.fromJSDate(dateObj).setZone(groupTimezone);
            
            logWithTimestamp(`Group ${group.id} (${group.name}) notification time: ${notificationDateTime.toFormat('HH:mm')} ${groupTimezone} / ${notificationDateTime.toUTC().toFormat('HH:mm')} UTC (stored as Date)`);
          }
          else {
            // If format can't be determined, log and skip
            logWithTimestamp(`Group ${group.id} has invalid notification time format:`, group.notificationTime);
            continue;
          }
          
          // Convert notification time to UTC for comparison
          const notificationUTC = notificationDateTime.toUTC();
          
          // For startup check, calculate and log the time until notification
          if (isStartupCheck) {
            // Create notification time for today
            let targetNotificationTime = notificationUTC;
            
            // If the notification time is in the past for today, schedule for tomorrow
            if (targetNotificationTime < nowUTC) {
              targetNotificationTime = targetNotificationTime.plus({ days: 1 });
            }
            
            // Calculate difference in minutes
            const diff = targetNotificationTime.diff(nowUTC, ['hours', 'minutes']);
            const minutesUntil = Math.floor(diff.hours * 60 + diff.minutes);
            
            upcomingNotifications.push({
              groupId: group.id,
              groupName: group.name,
              localTime: notificationDateTime.toFormat('HH:mm'),
              timezone: groupTimezone,
              utcTime: notificationUTC.toFormat('HH:mm'),
              minutesUntil: minutesUntil
            });
          }
          
          // Only trigger notifications on regular checks, not the startup diagnostic check
          if (!isStartupCheck) {
            // Compare hours and minutes for matching the current time
            if (notificationUTC.hour === nowUTC.hour && notificationUTC.minute === nowUTC.minute) {
              logWithTimestamp(`It's lunch time for group ${group.name}! (UTC time: ${nowUTC.toFormat('HH:mm')}, Group timezone: ${notificationDateTime.toFormat('HH:mm')} ${groupTimezone})`);
              await this.processNewRandomRequest(group.id, true);
            }
          }
        } catch (error) {
          logWithTimestamp(`Error checking lunch time for group ${group.id}:`, error);
        }
      }
      
      // Log upcoming notifications if this is a startup check
      if (isStartupCheck && upcomingNotifications.length > 0) {
        // Sort by time until notification
        upcomingNotifications.sort((a, b) => a.minutesUntil - b.minutesUntil);
        
        logWithTimestamp('UPCOMING NOTIFICATIONS:');
        upcomingNotifications.forEach(notification => {
          const hoursUntil = Math.floor(notification.minutesUntil / 60);
          const minutesUntil = notification.minutesUntil % 60;
          logWithTimestamp(`  Group ${notification.groupName} (${notification.groupId}): ${notification.localTime} ${notification.timezone} / ${notification.utcTime} UTC - in ${hoursUntil}h ${minutesUntil}m`);
        });
      }
    } catch (error) {
      logWithTimestamp('Error checking group lunch times:', error);
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