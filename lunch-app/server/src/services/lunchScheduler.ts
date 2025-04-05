import { CronJob } from 'cron';
import { AppDataSource } from '../config/database';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { GroupRestaurant } from '../models/GroupRestaurant';

// Time when lunch voting should be triggered (11:45 AM)
const LUNCH_TIME_HOUR = 11;
const LUNCH_TIME_MINUTE = 45;

let lunchTimeJob: CronJob | null = null;

/**
 * Initialize the lunch scheduler
 */
export function initLunchScheduler(): void {
  // Stop any existing scheduler
  if (lunchTimeJob) {
    lunchTimeJob.stop();
  }

  // Create a new cron job to run at 11:45 AM every weekday
  lunchTimeJob = new CronJob(
    `0 ${LUNCH_TIME_MINUTE} ${LUNCH_TIME_HOUR} * * 1-5`, // Seconds, Minutes, Hours, Day of month, Month, Day of week (1-5 = Monday-Friday)
    async function() {
      console.log(`Lunch time check triggered by scheduler at ${new Date().toLocaleString()}`);
      
      if (global.socketIOServer) {
        try {
          await lunchTimeCheck(global.socketIOServer);
        } catch (error) {
          console.error('Error in scheduled lunch time check:', error);
        }
      } else {
        console.error('Socket.IO server not initialized for scheduled lunch time check');
      }
    },
    null, // onComplete
    true, // start automatically
    'America/New_York' // timezone
  );

  console.log(`Lunch scheduler initialized. Next run at: ${lunchTimeJob.nextDates()}`);
}

/**
 * Perform the lunch time check and trigger restaurant selection
 */
export async function lunchTimeCheck(socketIOServer: any): Promise<void> {
  try {
    if (!socketIOServer) {
      console.error('No socketIOServer provided to lunchTimeCheck');
      return;
    }

    console.log('Running lunch time check...');
    const groupRepository = AppDataSource.getRepository(Group);
    // Get all groups - no isActive property in Group
    const activeGroups = await groupRepository.find();

    for (const group of activeGroups) {
      console.log(`Processing lunch time for group: ${group.name} (ID: ${group.id})`);
      
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
    
    console.log('Lunch time check completed');
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
      message: `Today we're having lunch at ${restaurant.name}!`
    };
    
    // Emit to the group room
    socketIOServer.to(`group_${groupId}`).emit('group_announcement', message);
    
    // Also send as a group message for clients that might not handle announcements
    socketIOServer.to(`group_${groupId}`).emit('group_message', {
      groupId: groupId,
      message: `🍽️ Today's lunch pick: ${restaurant.name}`,
      userId: 'system',
      username: 'Lunch Bot',
      timestamp: new Date().toISOString(),
      messageId: `lunch_${Date.now()}`
    });
    
    console.log(`Announced restaurant selection to group ${groupId}: ${restaurant.name}`);
  } catch (error) {
    console.error(`Error announcing restaurant selection to group ${groupId}:`, error);
  }
}

/**
 * Resynchronize the lunch scheduler
 */
export async function resyncLunchScheduler(socketIOServer: any): Promise<void> {
  try {
    console.log('Resynchronizing lunch scheduler...');
    
    // Stop any existing job
    if (lunchTimeJob) {
      lunchTimeJob.stop();
      lunchTimeJob = null;
    }
    
    // Re-initialize the scheduler
    initLunchScheduler();
    
    console.log('Lunch scheduler resynced successfully');
  } catch (error) {
    console.error('Error resynchronizing lunch scheduler:', error);
    throw error;
  }
} 