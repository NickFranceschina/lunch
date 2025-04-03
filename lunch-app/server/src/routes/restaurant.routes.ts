import express from 'express';
import { 
  getAllRestaurants, 
  getRestaurantById, 
  createRestaurant, 
  updateRestaurant, 
  deleteRestaurant,
  getRandomRestaurant,
  voteForRestaurant
} from '../controllers/restaurant.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Get all restaurants
router.get('/', authenticateToken, getAllRestaurants);

// Get restaurant by id
router.get('/:id', authenticateToken, getRestaurantById);

// Create new restaurant
router.post('/', authenticateToken, isAdmin, createRestaurant);

// Update restaurant
router.put('/:id', authenticateToken, isAdmin, updateRestaurant);

// Delete restaurant
router.delete('/:id', authenticateToken, isAdmin, deleteRestaurant);

// Get random restaurant for a group
router.get('/group/:groupId/random', authenticateToken, getRandomRestaurant);

// Vote for a restaurant
router.post('/group/:groupId/vote', authenticateToken, voteForRestaurant);

export default router; 