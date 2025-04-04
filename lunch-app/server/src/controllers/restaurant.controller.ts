import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { Group } from '../models/Group';
import { GroupRestaurant, OccurrenceRating } from '../models/GroupRestaurant';
import { AuthRequest } from '../middleware/auth.middleware';
import { getWebSocketServer } from '../config/websocket';

const restaurantRepository = AppDataSource.getRepository(Restaurant);
const groupRepository = AppDataSource.getRepository(Group);
const groupRestaurantRepository = AppDataSource.getRepository(GroupRestaurant);

/**
 * Get all restaurants
 */
export const getAllRestaurants = async (req: Request, res: Response) => {
  try {
    const restaurants = await restaurantRepository.find({
      order: {
        name: 'ASC'
      }
    });
    
    res.status(200).json({
      success: true,
      restaurants
    });
  } catch (error) {
    console.error('Error getting restaurants:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving restaurants'
    });
  }
};

/**
 * Get restaurant by ID
 */
export const getRestaurantById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurant = await restaurantRepository.findOne({
      where: { id: parseInt(id) }
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    res.status(200).json({
      success: true,
      restaurant
    });
  } catch (error) {
    console.error('Error getting restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving restaurant'
    });
  }
};

/**
 * Create a new restaurant
 */
export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const { name, description, address, phone, website, groupId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant name is required'
      });
    }
    
    // Create the restaurant
    const restaurant = restaurantRepository.create({
      name,
      description,
      address,
      phone,
      website
    });
    
    await restaurantRepository.save(restaurant);
    
    // If a group ID was provided, create the association
    if (groupId) {
      const group = await groupRepository.findOne({
        where: { id: parseInt(groupId) }
      });
      
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      // Create the GroupRestaurant association
      const groupRestaurant = groupRestaurantRepository.create({
        group,
        restaurant
      });
      
      await groupRestaurantRepository.save(groupRestaurant);
    }
    
    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      restaurant
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating restaurant'
    });
  }
};

/**
 * Update a restaurant
 */
export const updateRestaurant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, address, phone, website } = req.body;
    
    const restaurant = await restaurantRepository.findOne({
      where: { id: parseInt(id) }
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    if (name) restaurant.name = name;
    if (description !== undefined) restaurant.description = description;
    if (address !== undefined) restaurant.address = address;
    if (phone !== undefined) restaurant.phone = phone;
    if (website !== undefined) restaurant.website = website;
    
    await restaurantRepository.save(restaurant);
    
    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      restaurant
    });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating restaurant'
    });
  }
};

/**
 * Delete a restaurant
 */
export const deleteRestaurant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const restaurant = await restaurantRepository.findOne({
      where: { id: parseInt(id) }
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    await restaurantRepository.remove(restaurant);
    
    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting restaurant'
    });
  }
};

/**
 * Get a random restaurant for a group
 */
export const getRandomRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    
    // Verify the group exists
    const group = await groupRepository.findOne({
      where: { id: parseInt(groupId) }
    });
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Get all restaurants for this group using GroupRestaurant
    const groupRestaurants = await groupRestaurantRepository.find({
      where: { groupId: parseInt(groupId) },
      relations: ['restaurant']
    });
    
    if (!groupRestaurants || groupRestaurants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No restaurants found for this group'
      });
    }
    
    // Select a random restaurant
    const randomIndex = Math.floor(Math.random() * groupRestaurants.length);
    const randomRestaurant = groupRestaurants[randomIndex].restaurant;
    
    // Reset votes for the group
    group.yesVotes = 0;
    group.noVotes = 0;
    group.currentRestaurant = randomRestaurant;
    group.isConfirmed = false;
    await groupRepository.save(group);
    
    // Broadcast the restaurant selection via WebSocket
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.sendRestaurantSelection(
        parseInt(groupId),
        randomRestaurant.name,
        false // not confirmed yet
      );
    }
    
    res.status(200).json({
      success: true,
      restaurant: randomRestaurant
    });
  } catch (error) {
    console.error('Error getting random restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving random restaurant'
    });
  }
};

/**
 * Vote for a restaurant
 */
export const voteForRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { vote } = req.body;
    const userId = req.userId;
    const username = req.body.username || 'User'; // Fallback to generic name if not provided
    
    if (!vote || (vote !== 'yes' && vote !== 'no')) {
      return res.status(400).json({
        success: false,
        message: 'Vote must be either "yes" or "no"'
      });
    }
    
    // Verify the group exists
    const group = await groupRepository.findOne({
      where: { id: parseInt(groupId) },
      relations: ['currentRestaurant']
    });
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    if (!group.currentRestaurant) {
      return res.status(400).json({
        success: false,
        message: 'No current restaurant to vote for'
      });
    }
    
    // Update vote count
    if (vote === 'yes') {
      group.yesVotes += 1;
    } else {
      group.noVotes += 1;
    }
    
    // Calculate total votes
    const totalVotes = group.yesVotes + group.noVotes;
    
    // Check if the restaurant is confirmed:
    // 1. More yes than no votes
    // 2. At least 2 total votes required for confirmation (prevent single vote confirmation)
    const isConfirmed = group.yesVotes > group.noVotes && totalVotes >= 2;
    const wasConfirmedBefore = group.isConfirmed;
    group.isConfirmed = isConfirmed;
    
    await groupRepository.save(group);
    
    // Broadcast the vote via WebSocket
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastToGroup(parseInt(groupId), {
        type: 'vote_update',
        data: {
          userId,
          username,
          vote: vote === 'yes',
          yesVotes: group.yesVotes,
          noVotes: group.noVotes,
          isConfirmed
        }
      });
      
      // If confirmation status changed, send restaurant selection update
      if (wasConfirmedBefore !== isConfirmed) {
        wsServer.sendRestaurantSelection(
          parseInt(groupId),
          group.currentRestaurant.name,
          isConfirmed
        );
        
        // Send notification if restaurant is now confirmed
        if (isConfirmed) {
          wsServer.sendGroupNotification(
            parseInt(groupId),
            `Restaurant "${group.currentRestaurant.name}" has been confirmed!`
          );
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Vote registered as ${vote}`,
      isConfirmed,
      yesVotes: group.yesVotes,
      noVotes: group.noVotes
    });
  } catch (error) {
    console.error('Error voting for restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Error voting for restaurant'
    });
  }
};

/**
 * Get the current restaurant selection for a group
 */
export const getCurrentRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    
    // Verify the group exists
    const group = await groupRepository.findOne({
      where: { id: parseInt(groupId) },
      relations: ['currentRestaurant']
    });
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // If there's no current restaurant selection
    if (!group.currentRestaurant) {
      return res.status(200).json({
        success: true,
        message: 'No current restaurant selection',
        restaurant: null,
        isConfirmed: false,
        yesVotes: 0,
        noVotes: 0
      });
    }
    
    // Return the current restaurant along with vote status
    res.status(200).json({
      success: true,
      restaurant: group.currentRestaurant,
      isConfirmed: group.isConfirmed,
      yesVotes: group.yesVotes,
      noVotes: group.noVotes
    });
  } catch (error) {
    console.error('Error getting current restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving current restaurant'
    });
  }
}; 