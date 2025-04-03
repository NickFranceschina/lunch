import { DataSource } from "typeorm";
import { User } from "../models/User";
import { Group } from "../models/Group";
import { Restaurant } from "../models/Restaurant";
import { GroupRestaurant } from "../models/GroupRestaurant";
import { Chat } from "../models/Chat";
import { Setting } from "../models/Setting";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "lunch.db",
    synchronize: true, // Set to false in production
    logging: true,
    entities: [User, Group, Restaurant, GroupRestaurant, Chat, Setting],
    subscribers: [],
    migrations: [],
}); 