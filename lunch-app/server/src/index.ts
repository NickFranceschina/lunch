import "reflect-metadata";
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { AppDataSource } from "./config/database";
import { seedDatabase } from "./seeds/initial.seed";

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import groupRoutes from './routes/group.routes';
import restaurantRoutes from './routes/restaurant.routes';

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/restaurants', restaurantRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to the Lunch App API',
    version: '1.0.0'
  });
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
        
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch((error) => console.log("Error during Data Source initialization:", error)); 

export default app; 