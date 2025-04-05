import express from 'express';
import { 
  getAllRestaurants, 
  getRestaurantById, 
  createRestaurant, 
  updateRestaurant, 
  deleteRestaurant,
  getRandomRestaurant,
  voteForRestaurant,
  getCurrentRestaurant,
  getGroupRestaurants,
  addRestaurantToGroup,
  updateGroupRestaurant,
  removeRestaurantFromGroup
} from '../controllers/restaurant.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Create a separate router for group-related endpoints
const groupRouter = express.Router({mergeParams: true});
router.use('/group/:groupId', groupRouter);

// Group-specific routes (now using the group router)
groupRouter.get('/random', authenticateToken, getRandomRestaurant);
groupRouter.get('/current', authenticateToken, getCurrentRestaurant);
groupRouter.post('/vote', authenticateToken, voteForRestaurant);

// Group restaurant relationship management routes
groupRouter.get('/relationships', authenticateToken, getGroupRestaurants);
groupRouter.post('/relationships', authenticateToken, isAdmin, addRestaurantToGroup);
groupRouter.put('/relationships/:restaurantId', authenticateToken, isAdmin, updateGroupRestaurant);
groupRouter.delete('/relationships/:restaurantId', authenticateToken, isAdmin, removeRestaurantFromGroup);

/**
 * BASIC CRUD ROUTES
 */
// Root route for getting all restaurants
router.get('/', authenticateToken, getAllRestaurants);

// Create new restaurant
router.post('/', authenticateToken, isAdmin, createRestaurant);

/**
 * ID PARAMETER ROUTES - These must come last
 */
// Get restaurant by id
router.get('/:id', authenticateToken, getRestaurantById);

// Update restaurant
router.put('/:id', authenticateToken, isAdmin, updateRestaurant);

// Delete restaurant
router.delete('/:id', authenticateToken, isAdmin, deleteRestaurant);

export default router; 