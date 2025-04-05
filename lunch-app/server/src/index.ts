import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { AppDataSource } from "./config/database";
import * as http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { initSocketIOServer } from './config/socketio';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import groupRoutes from './routes/group.routes';
import restaurantRoutes from './routes/restaurant.routes';
import chatRoutes from './routes/chat.routes';
import systemRoutes from './routes/system.routes';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Create HTTP server from Express app
const server = http.createServer(app);

// Setup global type
declare global {
  var socketIOServer: any;
}

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/system', systemRoutes);

// WebSocket status endpoint
app.get('/api/websocket/status', (req: Request, res: Response) => {
  try {
    const socketIO = global.socketIOServer;
    res.json({
      status: 'ok',
      connections: socketIO ? socketIO.getConnectedClients() : 0,
      uptime: socketIO ? socketIO.getUptime() : 0,
    });
  } catch (error: any) {
    console.error('Error in websocket status endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get websocket status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Serve API documentation if in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', express.static('./docs'));
}

// Start the server
AppDataSource.initialize()
  .then(() => {
    console.log("Database initialized successfully");
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Initialize Socket.IO server
      global.socketIOServer = initSocketIOServer(server);
      console.log(`Socket.IO server initialized and available at ws://${HOST}:${PORT}`);
      
      // Initialize lunch scheduler if needed
      try {
        const lunchScheduler = require('./services/lunchScheduler');
        lunchScheduler.initLunchScheduler();
        console.log('Lunch scheduler initialized');
      } catch (error) {
        console.warn('Lunch scheduler not available:', error);
      }
    });
  })
  .catch((error: any) => {
    console.error('Error starting server:', error);
  });

export default app; 