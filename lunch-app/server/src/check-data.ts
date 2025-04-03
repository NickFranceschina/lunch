import { AppDataSource } from './config/database';
import { User } from './models/User';
import { Group } from './models/Group';
import { Restaurant } from './models/Restaurant';
import { GroupRestaurant } from './models/GroupRestaurant';
import { Setting } from './models/Setting';

async function checkData() {
  try {
    // Initialize the database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Check users
    const users = await AppDataSource.getRepository(User).find();
    console.log('Users:', users.length);
    users.forEach(user => {
      console.log(`- ${user.username} (Admin: ${user.isAdmin})`);
    });

    // Check groups
    const groups = await AppDataSource.getRepository(Group).find();
    console.log('\nGroups:', groups.length);
    groups.forEach(group => {
      console.log(`- ${group.name}`);
    });

    // Check restaurants
    const restaurants = await AppDataSource.getRepository(Restaurant).find();
    console.log('\nRestaurants:', restaurants.length);
    restaurants.forEach(restaurant => {
      console.log(`- ${restaurant.name}`);
    });

    // Check group-restaurant relationships
    const groupRestaurants = await AppDataSource
      .getRepository(GroupRestaurant)
      .find({
        relations: ['restaurant', 'group']
      });
    
    console.log('\nGroup-Restaurant Relationships:', groupRestaurants.length);
    groupRestaurants.forEach(gr => {
      console.log(`- Group: ${gr.group.name}, Restaurant: ${gr.restaurant.name}, Rating: ${gr.occurrenceRating}`);
    });

    // Check settings
    const settings = await AppDataSource.getRepository(Setting).find();
    console.log('\nSettings:', settings.length);
    settings.forEach(setting => {
      console.log(`- ${setting.key}: ${setting.value}`);
    });

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    // Close the connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run the check
checkData()
  .then(() => {
    console.log('\nDatabase check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in check script:', error);
    process.exit(1);
  }); 