import { CronJob } from 'cron';
import { AppDataSource } from '../config/database';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { GroupRestaurant } from '../models/GroupRestaurant';

// Default lunch notification time (if not specified in group)
const DEFAULT_LUNCH_TIME_HOUR = 11;
const DEFAULT_LUNCH_TIME_MINUTE = 45;

// The cron job will run every minute to check all groups
let lunchTimeJob: CronJob | null = null;

/**
 * Initialize the lunch scheduler
 */
export function initLunchScheduler(): void {
  // Stop any existing scheduler
  if (lunchTimeJob) {
    lunchTimeJob.stop();
  }

  // Create a new cron job to run every minute on weekdays
  // We'll check all groups inside the job and trigger notifications based on their individual timezones
  lunchTimeJob = new CronJob(
    `0 * * * * 1-5`, // Run every minute, Monday-Friday
    async function() {
      console.log(`Lunch time check triggered at ${new Date().toISOString()} (UTC)`);
      
      if (global.socketIOServer) {
        try {
          await checkAllGroupLunchTimes(global.socketIOServer);
        } catch (error) {
          console.error('Error in scheduled lunch time check:', error);
        }
      } else {
        console.error('Socket.IO server not initialized for scheduled lunch time check');
      }
    },
    null, // onComplete
    false, // don't start automatically - we'll start it aligned to the global minute
    'UTC' // Use UTC as base timezone; we'll convert for each group
  );

  // Calculate the delay until the next minute starts (at :00 seconds)
  const now = new Date();
  const delayMs = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  
  // Start the cron job aligned with the global minute
  setTimeout(() => {
    console.log(`Starting lunch scheduler aligned with global minute at ${new Date().toISOString()} (UTC)`);
    lunchTimeJob?.start();
    console.log(`Lunch scheduler initialized. Next run at: ${lunchTimeJob?.nextDates()}`);
  }, delayMs);
}

/**
 * Check if it's lunch time for any groups based on their timezones
 */
async function checkAllGroupLunchTimes(socketIOServer: any): Promise<void> {
  try {
    console.log('Checking lunch times for all groups...');
    
    // Get the current UTC time
    const nowUtc = new Date();
    
    // Get all groups with their notification times and timezones
    const groupRepository = AppDataSource.getRepository(Group);
    const groups = await groupRepository.find();
    
    for (const group of groups) {
      if (!group.notificationTime) {
        continue; // Skip groups without notification time
      }
      
      // Get the group's notification time hours and minutes
      let notificationHour: number;
      let notificationMinute: number;
      
      // Parse notification time based on its format
      if (typeof group.notificationTime === 'string') {
        // If it's a string like "12:30:00"
        const timeParts = (group.notificationTime as string).split(':');
        notificationHour = parseInt(timeParts[0], 10);
        notificationMinute = parseInt(timeParts[1], 10);
      } else if (group.notificationTime instanceof Date) {
        // If it's a Date object
        notificationHour = group.notificationTime.getHours();
        notificationMinute = group.notificationTime.getMinutes();
      } else {
        // If it's stored in an unexpected format, try to convert it
        try {
          const dateObj = new Date(group.notificationTime as any);
          notificationHour = dateObj.getHours();
          notificationMinute = dateObj.getMinutes();
        } catch (error) {
          console.error(`Error parsing notification time for group ${group.name}:`, error);
          continue; // Skip this group if we can't parse the time
        }
      }
      
      // Get the group's timezone or use UTC as fallback
      const timezone = group.timezone || 'UTC';
      
      // Get current time in UTC hours/minutes
      const nowUtcHours = nowUtc.getUTCHours();
      const nowUtcMinutes = nowUtc.getUTCMinutes();
      
      // Calculate timezone offset based on the timezone
      let timezoneOffsetHours = 0; // Default to UTC
      
      // Map common timezones to their UTC offsets
      switch(timezone) {
        case 'America/New_York':
        case 'EST': 
          timezoneOffsetHours = -5; 
          break;
        case 'EDT': 
          timezoneOffsetHours = -4; 
          break;
        case 'America/Chicago':
        case 'CST': 
          timezoneOffsetHours = -6; 
          break;
        case 'CDT': 
          timezoneOffsetHours = -5; 
          break;
        case 'America/Denver':
        case 'MST': 
          timezoneOffsetHours = -7; 
          break;
        case 'MDT': 
          timezoneOffsetHours = -6; 
          break;
        case 'America/Los_Angeles':
        case 'PST': 
          timezoneOffsetHours = -8; 
          break;
        case 'PDT': 
          timezoneOffsetHours = -7; 
          break;
        // Add more timezone mappings as needed
        default:
          // For any other timezone, try to extract a numerical offset if it contains +/- format
          if (timezone.includes('+')) {
            const offsetStr = timezone.split('+')[1].split(':')[0];
            timezoneOffsetHours = parseInt(offsetStr, 10);
          } else if (timezone.includes('-')) {
            const offsetStr = timezone.split('-')[1].split(':')[0];
            timezoneOffsetHours = -parseInt(offsetStr, 10);
          }
          // Otherwise keep it as UTC (0)
      }
      
      console.log(`Group ${group.name} notification time: ${notificationHour}:${String(notificationMinute).padStart(2, '0')} ${notificationHour >= 12 ? 'PM' : 'AM'} (${timezone}), current UTC time: ${nowUtcHours}:${String(nowUtcMinutes).padStart(2, '0')} ${nowUtcHours >= 12 ? 'PM' : 'AM'} (UTC)`);
      
      // Convert notification time to UTC
      const notificationTimeUTCHours = (notificationHour - timezoneOffsetHours + 24) % 24;
      const notificationHourDisplay = notificationHour % 12 === 0 ? 12 : notificationHour % 12;
      const notificationUTCHourDisplay = notificationTimeUTCHours % 12 === 0 ? 12 : notificationTimeUTCHours % 12;
      
      console.log(`Group ${group.name}: Local time ${notificationHourDisplay}:${String(notificationMinute).padStart(2, '0')} ${notificationHour >= 12 ? 'PM' : 'AM'} (${timezone}) converts to UTC ${notificationUTCHourDisplay}:${String(notificationMinute).padStart(2, '0')} ${notificationTimeUTCHours >= 12 ? 'PM' : 'AM'} (offset: ${timezoneOffsetHours}h)`);
      
      // Then compare
      if (nowUtcHours === notificationTimeUTCHours && nowUtcMinutes === notificationMinute) {
        console.log(`LUNCH TIME MATCH! Group "${group.name}" at ${new Date().toISOString()} (UTC) - Selecting restaurant...`);
        await lunchTimeCheck(socketIOServer, group.id);
      }
    }
  } catch (error) {
    console.error('Error checking group lunch times:', error);
  }
}

/**
 * Perform the lunch time check and trigger restaurant selection for a specific group
 */
export async function lunchTimeCheck(socketIOServer: any, groupId?: number): Promise<void> {
  try {
    if (!socketIOServer) {
      console.error('No socketIOServer provided to lunchTimeCheck');
      return;
    }

    console.log(`Running lunch time check for group ID: ${groupId || 'all'} at ${new Date().toISOString()} (UTC)`);
    const groupRepository = AppDataSource.getRepository(Group);
    
    // Get all groups or a specific group
    let groups: Group[];
    if (groupId) {
      const group = await groupRepository.findOne({ where: { id: groupId } });
      groups = group ? [group] : [];
    } else {
      groups = await groupRepository.find();
    }

    for (const group of groups) {
      console.log(`Processing lunch time for group: ${group.name} (ID: ${group.id}) at ${new Date().toISOString()} (UTC)`);
      
      try {
        // Get group restaurants with votes
        const groupRestaurantRepo = AppDataSource.getRepository(GroupRestaurant);
        const restaurants = await groupRestaurantRepo.find({
          where: { group: { id: group.id } },
          relations: ['restaurant']
        });

        if (restaurants.length === 0) {
          console.log(`No restaurants for group ${group.name}, skipping`);
          continue;
        }

        // Get users for this group
        const userRepository = AppDataSource.getRepository(User);
        const groupUsers = await userRepository.find({
          where: { currentGroupId: group.id }
        });

        if (groupUsers.length === 0) {
          console.log(`No active users for group ${group.name}, skipping`);
          continue;
        }

        // Get the weighted restaurants based on votes
        const weightedRestaurants = await getWeightedRestaurants(group.id);
        
        if (weightedRestaurants.length === 0) {
          console.log(`No weighted restaurants for group ${group.name}, using random selection`);
          // Use random selection if no votes
          const randomIndex = Math.floor(Math.random() * restaurants.length);
          const selectedRestaurant = restaurants[randomIndex].restaurant;
          
          // Announce the selection
          await announceRestaurantSelection(socketIOServer, group.id, selectedRestaurant);
          continue;
        }
        
        // Select a restaurant using weighted random selection
        const selectedRestaurant = weightedRandomSelection(weightedRestaurants);
        console.log(`Selected restaurant for group ${group.name}: ${selectedRestaurant.name}`);
        
        // Announce the selection to all users in the group
        await announceRestaurantSelection(socketIOServer, group.id, selectedRestaurant);
        
      } catch (error) {
        console.error(`Error processing lunch time for group ${group.name}:`, error);
      }
    }
    
    console.log('Lunch time check completed at ' + new Date().toISOString() + ' (UTC)');
  } catch (error) {
    console.error('Error in lunchTimeCheck:', error);
    throw error;
  }
}

/**
 * Get weighted restaurants based on votes
 */
async function getWeightedRestaurants(groupId: number): Promise<Array<{restaurant: Restaurant, weight: number}>> {
  try {
    const groupRestaurantRepo = AppDataSource.getRepository(GroupRestaurant);
    const restaurants = await groupRestaurantRepo.find({
      where: { group: { id: groupId } },
      relations: ['restaurant']
    });
    
    // The GroupRestaurant model doesn't have vote counts, so we'll use a simple weight
    // based on occurrence rating
    return restaurants.map(gr => {
      // Determine weight based on occurrence rating if it exists
      let weight = 1; // Default weight
      
      if (gr.occurrenceRating) {
        switch (gr.occurrenceRating) {
          case 'often':
            weight = 3;
            break;
          case 'sometimes':
            weight = 2;
            break;
          case 'seldom':
          default:
            weight = 1;
        }
      }
      
      return {
        restaurant: gr.restaurant,
        weight: weight
      };
    });
  } catch (error) {
    console.error(`Error getting weighted restaurants for group ${groupId}:`, error);
    return [];
  }
}

/**
 * Select a restaurant using weighted random selection
 */
function weightedRandomSelection(weightedRestaurants: Array<{restaurant: Restaurant, weight: number}>): Restaurant {
  const totalWeight = weightedRestaurants.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of weightedRestaurants) {
    random -= item.weight;
    if (random <= 0) {
      return item.restaurant;
    }
  }
  
  // Fallback to first restaurant if something goes wrong
  return weightedRestaurants[0].restaurant;
}

/**
 * Announce restaurant selection to all users in a group
 */
async function announceRestaurantSelection(
  socketIOServer: any, 
  groupId: number, 
  restaurant: Restaurant
): Promise<void> {
  try {
    // Prepare the announcement message
    const message = {
      type: 'lunch_selection',
      groupId: groupId,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        website: restaurant.website
      },
      timestamp: new Date().toISOString(),
      message: `Today we're having lunch at ${restaurant.name}!`,
      isScheduledEvent: true // Flag to indicate this came from the scheduler
    };
    
    // Emit to the group room
    socketIOServer.to(`group_${groupId}`).emit('group_announcement', message);
    
    // Also emit as restaurant_selection event to trigger client popups
    socketIOServer.to(`group_${groupId}`).emit('restaurant_selection', message);
    
    // Also send as a group message for clients that might not handle announcements
    socketIOServer.to(`group_${groupId}`).emit('group_message', {
      groupId: groupId,
      message: `🍽️ Today's lunch pick: ${restaurant.name}`,
      userId: 'system',
      username: 'Lunch Bot',
      timestamp: new Date().toISOString(),
      messageId: `lunch_${Date.now()}`
    });
    
    console.log(`Announced restaurant selection to group ${groupId}: ${restaurant.name} at ${new Date().toISOString()} (UTC)`);
  } catch (error) {
    console.error(`Error announcing restaurant selection to group ${groupId}:`, error);
  }
}

/**
 * Resynchronize the lunch scheduler
 */
export async function resyncLunchScheduler(socketIOServer: any): Promise<void> {
  try {
    console.log('Resynchronizing lunch scheduler at ' + new Date().toISOString() + ' (UTC)');
    
    // Stop any existing job
    if (lunchTimeJob) {
      lunchTimeJob.stop();
      lunchTimeJob = null;
    }
    
    // Re-initialize the scheduler
    initLunchScheduler();
    
    console.log('Lunch scheduler resynced successfully at ' + new Date().toISOString() + ' (UTC)');
  } catch (error) {
    console.error('Error resynchronizing lunch scheduler:', error);
    throw error;
  }
} 