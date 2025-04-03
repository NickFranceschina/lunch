import "reflect-metadata";
import { AppDataSource } from "./config/database";
import { User } from "./models/User";
import * as bcrypt from 'bcrypt';

/**
 * Test script to directly interact with our repositories
 */
async function testApi() {
  try {
    // Initialize the data source
    await AppDataSource.initialize();
    console.log("Database connection initialized");
    
    // Get repositories
    const userRepository = AppDataSource.getRepository(User);
    
    // Test finding the LunchMaster user
    const user = await userRepository.findOne({
      where: { username: 'LunchMaster' },
      relations: ['groups']
    });
    
    if (user) {
      console.log("Found user:", {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        groups: user.groups.map(g => ({ id: g.id, name: g.name }))
      });
      
      // Test password verification
      const testPassword = 'password';
      const isPasswordValid = await bcrypt.compare(testPassword, user.password);
      console.log(`Password '${testPassword}' is valid:`, isPasswordValid);
    } else {
      console.log("User 'LunchMaster' not found");
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Close the connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run the test
testApi()
  .then(() => console.log("Test completed"))
  .catch(error => console.error("Error in test:", error)); 