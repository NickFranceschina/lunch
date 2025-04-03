import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Group } from '../models/Group';
import { Restaurant } from '../models/Restaurant';
import { GroupRestaurant } from '../models/GroupRestaurant';
import { OccurrenceRating } from '../models/GroupRestaurant';
import { Setting } from '../models/Setting';
import * as bcrypt from 'bcrypt';

/**
 * Initialize the database with seed data
 */
export const seedDatabase = async () => {
  try {
    // Make sure the database is initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    console.log('Seeding database with initial data...');

    // Create default settings
    await seedSettings();
    
    // Create default admin user
    const adminUser = await seedAdminUser();
    
    // Create default group
    const defaultGroup = await seedDefaultGroup();
    
    // Add admin user to default group
    await addUserToGroup(adminUser, defaultGroup);
    
    // Create sample restaurants
    await seedRestaurants(defaultGroup);

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

/**
 * Create default system settings
 */
const seedSettings = async () => {
  const settingsRepository = AppDataSource.getRepository(Setting);
  
  // Check if settings already exist
  const existingSettings = await settingsRepository.find();
  if (existingSettings.length > 0) {
    console.log('Settings already exist, skipping seed');
    return;
  }
  
  const defaultSettings = [
    {
      key: 'OftenMark',
      value: '50',
      description: 'Percentage threshold for "Often" occurrence rating'
    },
    {
      key: 'SeldomMark',
      value: '85',
      description: 'Percentage threshold for "Seldom" occurrence rating'
    },
    {
      key: 'VoteWait',
      value: '15',
      description: 'Minutes to wait for votes before confirming'
    },
    {
      key: 'ListenPort',
      value: '3001',
      description: 'Default server listening port'
    }
  ];
  
  await settingsRepository.save(defaultSettings);
  console.log('Default settings created');
};

/**
 * Create default admin user (LunchMaster)
 */
const seedAdminUser = async () => {
  const userRepository = AppDataSource.getRepository(User);
  
  // Check if admin user already exists
  const existingAdmin = await userRepository.findOne({ where: { username: 'LunchMaster' } });
  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed');
    return existingAdmin;
  }
  
  // Create a hashed password
  const hashedPassword = await bcrypt.hash('password', 10);
  
  const adminUser = userRepository.create({
    username: 'LunchMaster',
    password: hashedPassword,
    isAdmin: true
  });
  
  await userRepository.save(adminUser);
  console.log('Admin user created');
  return adminUser;
};

/**
 * Create default group
 */
const seedDefaultGroup = async () => {
  const groupRepository = AppDataSource.getRepository(Group);
  
  // Check if default group already exists
  const existingGroup = await groupRepository.findOne({ where: { name: 'Default' } });
  if (existingGroup) {
    console.log('Default group already exists, skipping seed');
    return existingGroup;
  }
  
  // Parse a time value for notification
  const notificationTime = new Date();
  notificationTime.setHours(11, 30, 0); // 11:30 AM
  
  const defaultGroup = groupRepository.create({
    name: 'Default',
    description: 'Default lunch group',
    notificationTime: notificationTime
  });
  
  await groupRepository.save(defaultGroup);
  console.log('Default group created');
  return defaultGroup;
};

/**
 * Add a user to a group and set it as their current group
 */
const addUserToGroup = async (user: User, group: Group) => {
  const userRepository = AppDataSource.getRepository(User);
  
  // Check if user already has groups
  const userWithGroups = await userRepository.findOne({
    where: { id: user.id },
    relations: ['groups']
  });
  
  if (userWithGroups) {
    // Check if user is already in this group
    const alreadyInGroup = userWithGroups.groups.some(g => g.id === group.id);
    if (alreadyInGroup) {
      console.log(`User ${user.username} is already in group ${group.name}`);
      return;
    }
    
    // Add group to user's groups
    userWithGroups.groups.push(group);
    userWithGroups.currentGroupId = group.id;
    await userRepository.save(userWithGroups);
  }
  
  console.log(`User ${user.username} added to group ${group.name}`);
};

/**
 * Create sample restaurants
 */
const seedRestaurants = async (defaultGroup: Group) => {
  const restaurantRepository = AppDataSource.getRepository(Restaurant);
  const groupRestaurantRepository = AppDataSource.getRepository(GroupRestaurant);
  
  // Check if restaurants already exist
  const existingRestaurants = await restaurantRepository.find();
  if (existingRestaurants.length > 0) {
    console.log('Restaurants already exist, skipping seed');
    return;
  }
  
  // Sample restaurant data with occurrence ratings
  const restaurantData = [
    { name: 'Burger King', occurrence: OccurrenceRating.OFTEN },
    { name: 'McDonalds', occurrence: OccurrenceRating.OFTEN },
    { name: 'Pizza Hut', occurrence: OccurrenceRating.OFTEN },
    { name: 'Subway', occurrence: OccurrenceRating.SOMETIMES },
    { name: 'Chipotle', occurrence: OccurrenceRating.SOMETIMES },
    { name: 'Olive Garden', occurrence: OccurrenceRating.SOMETIMES },
    { name: 'The Maisonette', occurrence: OccurrenceRating.SELDOM },
    { name: 'Ruth\'s Chris Steakhouse', occurrence: OccurrenceRating.SELDOM }
  ];
  
  // Create restaurants and add them to the default group
  for (const data of restaurantData) {
    // Create restaurant
    const restaurant = restaurantRepository.create({
      name: data.name,
      hasBeenSelected: false
    });
    
    await restaurantRepository.save(restaurant);
    
    // Create group-restaurant relationship with occurrence rating
    const groupRestaurant = groupRestaurantRepository.create({
      group: defaultGroup,
      groupId: defaultGroup.id,
      restaurant: restaurant,
      restaurantId: restaurant.id,
      occurrenceRating: data.occurrence
    });
    
    await groupRestaurantRepository.save(groupRestaurant);
  }
  
  console.log('Sample restaurants created');
};

// Export for direct execution if needed
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seed script failed:', error);
      process.exit(1);
    });
} 