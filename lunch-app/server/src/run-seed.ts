import { seedDatabase } from './seeds/initial.seed';

// Run the seed script
seedDatabase()
  .then(() => {
    console.log('Seed script executed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running seed script:', error);
    process.exit(1);
  }); 