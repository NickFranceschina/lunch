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
const dbDir = isProduction ? path.join("/app", "database") : path.join(__dirname, "..", "..");
const dbPath = path.join(dbDir, "lunch.db");

// Ensure the directory exists (synchronously for initialization is okay here)
// Note: TypeORM might handle this automatically with synchronize:true, but being explicit can help
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Created database directory: ${dbDir}`);
    } catch (err) {
        console.error(`Error creating database directory ${dbDir}:`, err);
        // Decide if you want to throw error or continue, maybe TypeORM handles it
    }
}

export const AppDataSource = new DataSource({
    type: "sqlite",
    // Use the dynamically determined path
    database: dbPath,
    synchronize: true, // Set to false in production (after initial setup)
    logging: !isProduction, // Enable logging only in development
    entities: [User, Group, Restaurant, GroupRestaurant, Chat, Setting],
    subscribers: [],
    migrations: [path.join(__dirname, "..", "migrations", "*.{ts,js}")],
}); 