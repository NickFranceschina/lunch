import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { Group } from '../models/Group';
import { GroupRestaurant } from '../models/GroupRestaurant';
import { AuthRequest } from '../middleware/auth.middleware';

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
    await groupRepository.save(group);
    
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
    
    // Check if the restaurant is confirmed (more yes than no votes)
    const isConfirmed = group.yesVotes > group.noVotes;
    group.isConfirmed = isConfirmed;
    
    await groupRepository.save(group);
    
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