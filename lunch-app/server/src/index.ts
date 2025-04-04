import "reflect-metadata";
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { AppDataSource } from "./config/database";
import { seedDatabase } from "./seeds/initial.seed";
import * as http from 'http';
import { initWebSocketServer } from './config/websocket';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import groupRoutes from './routes/group.routes';
import restaurantRoutes from './routes/restaurant.routes';
import chatRoutes from './routes/chat.routes';

const app: Express = express();
const port = process.env.PORT || 3001;

// Create HTTP server from Express app
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// WebSocket status endpoint for debugging
app.get('/ws-status', (req: Request, res: Response) => {
  const wsServer = require('./config/websocket').getWebSocketServer();
  const clientCount = wsServer ? wsServer.clients.size : 0;
  
  res.json({
    status: wsServer ? 'running' : 'not initialized', 
    clients: clientCount,
    serverTime: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/chat', chatRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to the Lunch App API',
    version: '1.0.0'
  });
});

// Test endpoint to manually trigger lunch time check (only for testing)
app.post('/api/test/trigger-lunch-check', (req: Request, res: Response) => {
  const wsServer = require('./config/websocket').getWebSocketServer();
  
  if (!wsServer) {
    return res.status(500).json({ 
      success: false, 
      message: 'WebSocket server not initialized' 
    });
  }
  
  try {
    wsServer.manualLunchTimeCheck()
      .then(() => {
        res.json({ 
          success: true, 
          message: 'Lunch time check triggered successfully' 
        });
      })
      .catch((error: any) => {
        console.error('Error in manual lunch time check:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error triggering lunch time check', 
          error: error.message 
        });
      });
  } catch (error: any) {
    console.error('Error triggering lunch time check:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error triggering lunch time check', 
      error: error.message 
    });
  }
});

// Test endpoint to check a specific group's notification time format
app.get('/api/test/group-time/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const AppDataSource = require('./config/database').AppDataSource;
    const groupRepository = AppDataSource.getRepository('Group');
    
    const group = await groupRepository.findOne({ 
      where: { id: parseInt(groupId) } 
    });
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }
    
    // Get current time for comparison
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
    
    // Analyze the notification time
    type TimeInfo = {
      rawValue: any;
      type: string;
      hasGetHours: boolean;
      currentTime: string;
      hours?: number;
      minutes?: number;
      formatted?: string;
      matchesCurrent?: boolean;
    };
    
    let notificationTimeInfo: TimeInfo = {
      rawValue: group.notificationTime,
      type: typeof group.notificationTime,
      hasGetHours: typeof group.notificationTime?.getHours === 'function',
      currentTime: currentTimeStr
    };
    
    // Try to extract hours and minutes if possible
    if (notificationTimeInfo.hasGetHours) {
      notificationTimeInfo.hours = group.notificationTime.getHours();
      notificationTimeInfo.minutes = group.notificationTime.getMinutes();
      notificationTimeInfo.formatted = `${group.notificationTime.getHours().toString().padStart(2, '0')}:${group.notificationTime.getMinutes().toString().padStart(2, '0')}`;
      notificationTimeInfo.matchesCurrent = group.notificationTime.getHours() === currentHours && 
                    group.notificationTime.getMinutes() === currentMinutes;
    }
    
    res.json({
      success: true,
      group: {
        id: group.id,
        name: group.name
      },
      notificationTime: notificationTimeInfo
    });
  } catch (error: any) {
    console.error('Error checking group notification time:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking group notification time',
      error: error.message
    });
  }
});

// Initialize TypeORM and start server
AppDataSource.initialize()
    .then(async () => {
        console.log("Data Source has been initialized!");
        
        // Seed the database with initial data
        try {
          await seedDatabase();
        } catch (error) {
          console.error("Error seeding database:", error);
        }
        
        // Initialize WebSocket server
        initWebSocketServer(server);
        console.log("WebSocket server initialized");
        
        // Use HTTP server instead of Express directly
        server.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log(`WebSocket server is available at ws://localhost:${port}`);
        });
    })
    .catch((error) => console.log("Error during Data Source initialization:", error)); 

export default app; 