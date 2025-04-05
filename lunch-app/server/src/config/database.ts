import { DataSource } from "typeorm";
import { User } from "../models/User";
import { Group } from "../models/Group";
import { Restaurant } from "../models/Restaurant";
import { GroupRestaurant } from "../models/GroupRestaurant";
import { Chat } from "../models/Chat";
import { Setting } from "../models/Setting";
import * as path from "path";
import * as fs from 'fs';

// Determine database path based on environment
const isProduction = process.env.NODE_ENV === 'production';

// Determine if running in Docker (this is a common way to detect Docker)
const isDocker = fs.existsSync('/.dockerenv') || fs.existsSync('/proc/1/cgroup') && fs.readFileSync('/proc/1/cgroup', 'utf-8').includes('docker');

// Set the database directory
let dbDir;
if (isDocker) {
  // In Docker, use the path that matches our volume mount
  dbDir = '/app/database';
  console.log('Running in Docker environment, using /app/database');
} else {
  // For local development, use the relative path
  dbDir = path.resolve(__dirname, "../../../database");
  console.log('Running in local environment, using relative path');
}

// Use different database files for production and development
const dbName = isProduction ? "lunch-prod.db" : "lunch-dev.db";
const dbPath = path.join(dbDir, dbName);

// Ensure the directory exists (synchronously for initialization is okay here)
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Created database directory: ${dbDir}`);
    } catch (err) {
        console.error(`Error creating database directory ${dbDir}:`, err);
        // Don't fail initialization - the directory might have been created by Docker
        console.log(`Continuing anyway, will try to use database at: ${dbPath}`);
    }
}

console.log(`Using database at: ${dbPath} (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode)`);

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: dbPath,
    synchronize: true, // Set to false in production (after initial setup)
    logging: !isProduction, // Enable logging only in development
    entities: [User, Group, Restaurant, GroupRestaurant, Chat, Setting],
    subscribers: [],
    migrations: [path.join(__dirname, "..", "migrations", "*.{ts,js}")],
}); 